const Fight = require("../models/fightModel");
const Fighter = require("../models/fighterModel");
const Gym = require("../models/gymModel");
const aiOpponentService = require("./aiOpponentService");
const lifecycleService = require("./lifecycleService");
const { resolveFight } = require("../engine/fightEngine");
const { newSeed } = require("../utils/rng");
const { gameWeeksToMs } = require("../consts/calendar");
const { FIGHT } = require("../consts/fightConfig");
const { POINTS, TITLE_SHOT_THRESHOLD, tierFor } = require("../consts/rankings");
const { PURSES } = require("../consts/economy");
const { AGING } = require("../consts/training");

/**
 * Fights — booking and resolution (GDD §7, §8). Booking picks an AI opponent
 * at the fighter's ladder tier and schedules the bout N game-weeks out — the
 * manager's job between now and then is the camp and the gameplan. Resolution
 * is atomic/idempotent with the same three paths as camps: delayed job, lazy
 * on-read, daily sweep.
 */

async function bookFight(gymId, fighterId, weeks) {
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 8) {
        throw Object.assign(new Error("Notice period must be 1–8 game-weeks"), { statusCode: 400, expose: true });
    }
    const fighter = await Fighter.findOne({ _id: fighterId, gymId });
    if (!fighter) throw Object.assign(new Error("Fighter not found"), { statusCode: 404 });
    if (fighter.retired) throw Object.assign(new Error("Retired fighters don't take fights"), { statusCode: 409, expose: true });

    const existing = await Fight.findOne({ fighterId, status: "scheduled" });
    if (existing) throw Object.assign(new Error("This fighter already has a fight booked"), { statusCode: 409, expose: true });

    // Title shot when eligible; champions defend against contender-tier blood.
    const title = fighter.isChampion || fighter.rankingPoints >= TITLE_SHOT_THRESHOLD;
    const tier = title ? "title" : tierFor(fighter.rankingPoints).key;

    let opponent;
    if (title && !fighter.isChampion) {
        opponent = await aiOpponentService.getChampion(fighter.weightClass);
        if (!opponent) {
            await aiOpponentService.ensureChampionsExist();
            opponent = await aiOpponentService.getChampion(fighter.weightClass);
        }
    } else {
        opponent = await aiOpponentService.generateOpponent(fighter.weightClass, title ? "contender" : tier);
    }

    const now = new Date();
    const fight = await Fight.create({
        gymId,
        fighterId,
        opponentId: opponent._id,
        seed: newSeed(),
        weightClass: fighter.weightClass,
        rounds: title ? 5 : 3,
        title,
        tier,
        bookedAt: now,
        scheduledAt: new Date(now.getTime() + gameWeeksToMs(weeks)),
    });

    // Delayed resolution job; lazy resolve is the safety net.
    try {
        const { fightQueue } = require("../modules/scheduler");
        const enqueue = fightQueue.add(
            "resolve-fight",
            { fightId: String(fight._id) },
            { delay: Math.max(0, fight.scheduledAt.getTime() - Date.now()), removeOnComplete: true, removeOnFail: 50 }
        );
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Redis unreachable")), 3000));
        await Promise.race([enqueue, timeout]);
    } catch (err) {
        console.error("[fight] Failed to enqueue resolve job (lazy resolve will catch it):", err.message);
    }

    return fight;
}

/** Resolve a fight if due — atomic status claim, all effects applied once. */
async function resolveFightIfDue(fightId, now = new Date()) {
    const fight = await Fight.findOneAndUpdate(
        { _id: fightId, status: "scheduled", scheduledAt: { $lte: now } },
        { $set: { status: "resolved", resolvedAt: now } },
        { new: true }
    );
    if (!fight) return null;

    const fighter = await Fighter.findById(fight.fighterId);
    const opponent = await Fighter.findById(fight.opponentId);
    if (!fighter || !opponent) return fight;

    // Freshen the player's fighter so camp results / fatigue / age are current.
    await lifecycleService.ensureFresh(fighter, now);

    const toEngine = (f, fatigue) => ({
        name: f.name,
        stats: { striking: f.stats.striking, grappling: f.stats.grappling, submissions: f.stats.submissions, conditioning: f.stats.conditioning },
        style: f.style,
        traits: f.traits,
        fatigue,
        gameplan: f.gameplan,
    });

    const breakdown = resolveFight({
        a: toEngine(fighter, fighter.fatigue.value),
        b: toEngine(opponent, 0),
        rounds: fight.rounds,
        title: fight.title,
        seed: fight.seed,
    });

    const won = breakdown.winner === "A";
    const lost = breakdown.winner === "B";
    const finish = ["KO", "TKO", "SUB"].includes(breakdown.method);

    // Records.
    const applyRecord = (f, didWin, didLose) => {
        if (didWin) {
            f.record.wins += 1;
            if (breakdown.method === "SUB") f.record.subs += 1;
            else if (finish) f.record.kos += 1;
        } else if (didLose) {
            f.record.losses += 1;
        } else {
            f.record.draws += 1;
        }
    };
    applyRecord(fighter, won, lost);
    applyRecord(opponent, lost, won);

    // Ranking points (player fighter only).
    let pointsDelta = 0;
    if (won) pointsDelta = POINTS.win[fight.tier] ?? POINTS.win.regional;
    else if (lost) pointsDelta = POINTS.loss[fight.tier] ?? POINTS.loss.regional;
    fighter.rankingPoints = Math.max(0, fighter.rankingPoints + pointsDelta);

    // Purse → gym.
    const base = fight.title
        ? PURSES.title.base + PURSES.title.ppvBonus
        : (PURSES.base[fight.tier] ?? PURSES.base.regional) + (PURSES.gateBonus[fight.tier] ?? 0);
    const purse = Math.round(won ? base : base * PURSES.loserShare);
    await Gym.updateOne({ _id: fight.gymId }, { $inc: { purse } });

    // Title transfer (GDD §8.3 — one champion per class).
    let titleChanged = false;
    if (fight.title) {
        if (won && !fighter.isChampion) {
            fighter.isChampion = true;
            opponent.isChampion = false;
            titleChanged = true;
        } else if (lost && fighter.isChampion) {
            fighter.isChampion = false;
            opponent.isChampion = true;
            titleChanged = true;
        }
    }

    // Post-fight fatigue.
    fighter.fatigue.value = Math.min(100, fighter.fatigue.value + FIGHT.postFightFatigue);
    fighter.fatigue.syncedAt = now;

    // Trait discovery (GDD §3.4 — revealed through play).
    const discovered = [];
    const reveal = (trait) => {
        if (fighter.traits.includes(trait) && !fighter.discoveredTraits.includes(trait)) {
            fighter.discoveredTraits.push(trait);
            discovered.push(trait);
        }
    };
    if (breakdown.totals.B.knockdowns > 0) { reveal("suspect-chin"); reveal("iron-chin"); }
    if (won && finish) reveal("killer-instinct");
    if (!finish) reveal("cardio-machine");

    // Loss-triggered retirement window (GDD §3.5): 38+ retires on a loss.
    if (lost && fighter.age >= 38 && !fighter.retired) {
        fighter.retired = true;
        fighter.retiredAt = now;
        fighter.isChampion = false;
        console.log(`[fight] ${fighter.name} retires after the loss at age ${Math.floor(fighter.age)}.`);
    }

    await fighter.save();
    await opponent.save();

    fight.result = {
        winner: won ? "you" : lost ? "them" : "draw",
        method: breakdown.method,
        round: breakdown.round,
        time: breakdown.time,
    };
    fight.breakdown = breakdown;
    fight.purse = purse;
    fight.pointsDelta = pointsDelta;
    fight.titleChanged = titleChanged;
    fight.traitsDiscovered = discovered;
    await fight.save();

    console.log(`[fight] ${fighter.name} vs ${opponent.name}: ${fight.result.winner} by ${breakdown.method} (R${breakdown.round}) — purse $${purse}`);
    return fight;
}

/** All fights for a gym, lazily resolving any that came due. */
async function listFights(gymId, now = new Date()) {
    const due = await Fight.find({ gymId, status: "scheduled", scheduledAt: { $lte: now } });
    for (const f of due) await resolveFightIfDue(f._id, now);
    return Fight.find({ gymId }).sort({ scheduledAt: -1 }).limit(30);
}

async function getFight(gymId, fightId, now = new Date()) {
    await resolveFightIfDue(fightId, now).catch(() => {});
    return Fight.findOne({ _id: fightId, gymId });
}

/** Client shape: corners mapped to you/them, opponent card data attached. */
async function toPublic(fight) {
    const [fighter, opponent] = await Promise.all([
        Fighter.findById(fight.fighterId),
        Fighter.findById(fight.opponentId),
    ]);
    const mapActor = (a) => (a === "A" ? "you" : a === "B" ? "them" : null);
    return {
        id: fight._id,
        status: fight.status,
        title: fight.title,
        tier: fight.tier,
        weightClass: fight.weightClass,
        rounds: fight.rounds,
        scheduledAt: fight.scheduledAt,
        resolvedAt: fight.resolvedAt,
        you: fighter && {
            fighterId: fighter._id,
            name: fighter.name,
            record: fighter.record,
            style: fighter.style,
            rarity: fighter.rarity,
        },
        them: opponent && {
            name: opponent.name,
            record: opponent.record,
            style: opponent.style,
            rarity: opponent.rarity,
            gym: opponent.aiGymName,
            isChampion: opponent.isChampion,
        },
        result: fight.status === "resolved" ? fight.result : null,
        purse: fight.purse,
        pointsDelta: fight.pointsDelta,
        titleChanged: fight.titleChanged,
        traitsDiscovered: fight.traitsDiscovered,
        breakdown: fight.status === "resolved" && fight.breakdown
            ? {
                totals: { you: fight.breakdown.totals.A, them: fight.breakdown.totals.B },
                rounds: fight.breakdown.rounds.map((r) => ({
                    round: r.round,
                    events: r.events.map((e) => ({ ...e, actor: mapActor(e.actor) })),
                })),
            }
            : null,
    };
}

module.exports = { bookFight, resolveFightIfDue, listFights, getFight, toPublic };
