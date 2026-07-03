const { Queue, Worker } = require("bullmq");
const config = require("../config");

/**
 * BullMQ scheduler — same wiring pattern as Ground & Pound.
 *
 * Phase 0 registers a single repeatable job: the daily calendar tick at
 * 00:00 UTC (a stub for now — aging, scout refresh, and cooldown resets hook
 * in here in Phases 1–2). Per-entity delayed jobs (camp completion, fight
 * resolution) get their own queues in later phases.
 *
 * maxRetriesPerRequest: null and enableReadyCheck: false are required by
 * BullMQ (workers block forever on BRPOP; ioredis would time them out).
 * Returning a plain config object lets BullMQ create a fresh connection per
 * Queue/Worker, which is what it recommends.
 */
const BULLMQ_BASE_OPTS = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

function buildQueueConnection() {
    const u = new URL(config.redis.url);
    return {
        ...BULLMQ_BASE_OPTS,
        host: u.hostname,
        port: Number(u.port) || 6379,
        username: u.username ? decodeURIComponent(u.username) : undefined,
        password: u.password ? decodeURIComponent(u.password) : undefined,
        // rediss:// (TLS) — required by Railway's public Redis proxy / Upstash.
        tls: u.protocol === "rediss:" ? {} : undefined,
    };
}

const QUEUE_CONNECTION = buildQueueConnection();

console.log(
    `[scheduler] BullMQ Redis target: ${QUEUE_CONNECTION.host}:${QUEUE_CONNECTION.port}` +
    `${QUEUE_CONNECTION.tls ? " (TLS)" : ""}` +
    `${QUEUE_CONNECTION.password ? " (auth)" : ""}`
);

const dailyTickQueue = new Queue("daily-tick", { connection: QUEUE_CONNECTION });
const campQueue = new Queue("camp-complete", { connection: QUEUE_CONNECTION });
const fightQueue = new Queue("fight-resolve", { connection: QUEUE_CONNECTION });

/** Per-fight delayed resolution — same idempotent claim pattern as camps. */
const fightWorker = new Worker(
    "fight-resolve",
    async (job) => {
        const fightService = require("../services/fightService");
        await fightService.resolveFightIfDue(job.data.fightId);
    },
    { connection: QUEUE_CONNECTION, concurrency: 1 }
);
fightWorker.on("error", (err) => console.error("[fight-resolve] Worker error:", err));
fightWorker.on("failed", (job, err) => console.error(`[fight-resolve] Job ${job?.id} failed:`, err));

/** Per-camp delayed resolution. Idempotent — the lazy on-read check and the
 *  daily sweep can also claim the camp; whoever gets there first wins. */
const campWorker = new Worker(
    "camp-complete",
    async (job) => {
        const campService = require("../services/campService");
        await campService.resolveCampIfDue(job.data.campId);
    },
    { connection: QUEUE_CONNECTION, concurrency: 1 }
);
campWorker.on("error", (err) => console.error("[camp-complete] Worker error:", err));
campWorker.on("failed", (job, err) => console.error(`[camp-complete] Job ${job?.id} failed:`, err));

const dailyTickWorker = new Worker(
    "daily-tick",
    async () => {
        // Wire in, as they land:
        //   Phase 2 — aging tick, Declining-phase stat erosion, retirement checks
        //   Phase 4 — Gym War / Callout cooldown resets
        // Every handler hooked here must be idempotent — a missed or doubled
        // tick can never corrupt state (lazy-check on read is the backstop).

        // Scouting refresh: bulk-advance every gym's day anchor. The lazy
        // per-read reset in scoutingService is the source of truth; this keeps
        // the DB warm so dashboards read fresh counts without a save.
        const Gym = require("../models/gymModel");
        const { utcDayStart } = require("../consts/calendar");
        const anchor = utcDayStart();
        const result = await Gym.updateMany(
            { "scouting.dayAnchor": { $ne: anchor } },
            { $set: { "scouting.dayAnchor": anchor, "scouting.usedToday": 0 } }
        );
        console.log(`[daily-tick] Scout allotments refreshed for ${result.modifiedCount} gym(s).`);

        // Lifecycle sweep: resolve stranded camps, age fighters, recover
        // fatigue, retire the over-the-hill (Phase 2). Lazy on-read logic is
        // the source of truth; this keeps offline gyms advancing too.
        const lifecycle = require("../services/lifecycleService");
        const sweep = await lifecycle.runDailySweep();
        console.log(`[daily-tick] Lifecycle sweep: ${sweep.camps} camp(s) resolved, ${sweep.fighters} fighter(s) aged.`);

        // Fights whose delayed job went missing.
        const Fight = require("../models/fightModel");
        const fightService = require("../services/fightService");
        const dueFights = await Fight.find({ status: "scheduled", scheduledAt: { $lte: new Date() } });
        for (const fight of dueFights) {
            await fightService.resolveFightIfDue(fight._id);
        }
        if (dueFights.length > 0) console.log(`[daily-tick] Resolved ${dueFights.length} stranded fight(s).`);

        // A retired champion abdicates; keep every belt occupied.
        await require("../services/aiOpponentService").ensureChampionsExist();
    },
    { connection: QUEUE_CONNECTION, concurrency: 1 }
);

dailyTickWorker.on("error", (err) => console.error("[daily-tick] Worker error:", err));
dailyTickWorker.on("failed", (job, err) => console.error(`[daily-tick] Job ${job?.id} failed:`, err));

/** Register the repeatable daily tick. Safe to call on every boot — BullMQ
 *  dedupes repeatable jobs by their repeat options.
 *
 *  Guarded by a timeout: with Redis down, ioredis retries forever
 *  (maxRetriesPerRequest: null is required by BullMQ), which would otherwise
 *  hang boot and keep the HTTP API from ever listening. Lazy on-read logic
 *  covers gameplay until Redis returns. */
async function startSchedulers() {
    const register = dailyTickQueue.add(
        "daily-tick",
        {},
        {
            repeat: { pattern: "0 0 * * *" }, // 00:00 UTC — the game-day boundary
            removeOnComplete: true,
            removeOnFail: 50,
        }
    );
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis unreachable — schedulers not registered")), 5000)
    );
    await Promise.race([register, timeout]);
    console.log("[scheduler] Daily calendar tick registered (00:00 UTC).");
}

/** Graceful shutdown — lets an in-flight job finish before the process exits. */
async function stopSchedulers() {
    await dailyTickWorker.close();
    await dailyTickQueue.close();
    await campWorker.close();
    await campQueue.close();
    await fightWorker.close();
    await fightQueue.close();
}

module.exports = { startSchedulers, stopSchedulers, campQueue, fightQueue, QUEUE_CONNECTION };
