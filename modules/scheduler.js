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
    },
    { connection: QUEUE_CONNECTION, concurrency: 1 }
);

dailyTickWorker.on("error", (err) => console.error("[daily-tick] Worker error:", err));
dailyTickWorker.on("failed", (job, err) => console.error(`[daily-tick] Job ${job?.id} failed:`, err));

/** Register the repeatable daily tick. Safe to call on every boot — BullMQ
 *  dedupes repeatable jobs by their repeat options. */
async function startSchedulers() {
    await dailyTickQueue.add(
        "daily-tick",
        {},
        {
            repeat: { pattern: "0 0 * * *" }, // 00:00 UTC — the game-day boundary
            removeOnComplete: true,
            removeOnFail: 50,
        }
    );
    console.log("[scheduler] Daily calendar tick registered (00:00 UTC).");
}

/** Graceful shutdown — lets an in-flight job finish before the process exits. */
async function stopSchedulers() {
    await dailyTickWorker.close();
    await dailyTickQueue.close();
}

module.exports = { startSchedulers, stopSchedulers, QUEUE_CONNECTION };
