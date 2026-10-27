const Gym = require("../models/gymModel");
const Fighter = require("../models/fighterModel");
const PvpEvent = require("../models/pvpEventModel");
const aiGymService = require("./aiGymService");
const notificationService = require("./notificationService");
const lifecycleService = require("./lifecycleService");
const { resolveFight } = require("../engine/fightEngine");
const { newSeed, createRng } = require("../utils/rng");
const { PVP, eloDelta } = require("../consts/pvp");
const { utcDayStart } = require("../consts/calendar");
const { WEIGHT_CLASSES } = require("../consts/weightClasses");
const { FACILITY_TIERS } = require("../consts/facilities");

/**
 * PvP — Callouts & Gym Wars (GDD §9). Attacks resolve INSTANTLY against the
 * defender's standing lineup and saved gameplans — that's the async model:
 * the defender doesn't need to be online, their configuration fights for them.
 *
 * Stakes (GDD §9.6): rating, purse, and ranking position move. Fighter
 * records, health, and fatigue are never touched — this is the sparring/
 * exhibition layer, not the career layer.
 */

function err(message, statusCode = 400) {
    return Object.assign(new Error(message), { statusCode, expose: true });
}

/** Daily callout allowance — base plus the facility-tier bonus (GDD §4.3). */
function calloutAllowance(gym) {
    return PVP.calloutsPerDay + (FACILITY_TIERS[gym.facilityTier]?.calloutBonus ?? 0);
}

function ensurePvpDay(gym, now = new Date()) {
    const anchor = utcDayStart(now);
    if (!gym.pvp.dayAnchor || gym.pvp.dayAnchor.getTime() !== anchor.getTime()) {
        gym.pvp.dayAnchor = anchor;
        gym.pvp.calloutsToday = 0;
        gym.pvp.gymWarsToday = 0;
    }
}

/** Active roster grouped by weight class. */
async function rosterByClass(gymId) {
    const fighters = await Fighter.find({ gymId, retired: { $ne: true } });
    const map = {};
    for (const f of fighters) {
        (map[f.weightClass] = map[f.weightClass] || []).push(f);
    }
    return map;
}

/** The fighter who answers for a weight class: lineup pick if valid, else the
 *  best available (highest stat total). Null → the class forfeits. */
function defenseFighterFor(gym, byClass, weightClass) {
    const pool = byClass[weightClass] || [];
    if (pool.length === 0) return null;
    const lineupId = gym.defenseLineup?.[weightClass];
    if (lineupId) {
        const pick = pool.find((f) => String(f._id) === String(lineupId));
        if (pick) return pick;
    }
    return pool.reduce((best, f) => (statTotal(f) > statTotal(best) ? f : best), pool[0]);
}

function statTotal(f) {
    return f.stats.striking + f.stats.grappling + f.stats.submissions + f.stats.conditioning;
}

/** Find a target gym in the rating band (GDD §9.3). Real gyms preferred;
 *  AI fills the gaps. Shielded and recently-farmed gyms are skipped. */
async function findOpponentGym(myGym, { needsClass = null, now = new Date() } = {}) {
    const recentTargets = await PvpEvent.find({
        attackerGymId: myGym._id,
        createdAt: { $gte: new Date(now.getTime() - PVP.refarmHours * 3600000) },
    }).distinct("defenderGymId");

    const candidates = await Gym.find({
        _id: { $ne: myGym._id, $nin: recentTargets },
        isAi: false,
        rating: { $gte: myGym.rating - PVP.matchBand, $lte: myGym.rating + PVP.matchBand },
        $or: [{ shieldUntil: null }, { shieldUntil: { $lte: now } }],
    }).limit(20);

    const rng = createRng(`match:${newSeed()}`);
    for (const gym of rng.sample(candidates, candidates.length)) {
        if (needsClass) {
            const byClass = await rosterByClass(gym._id);
            if (!(byClass[needsClass]?.length > 0)) continue;
        }
        return gym;
    }

    // AI fallback — generate/reuse until one covers what we need.
    for (let attempt = 0; attempt < 4; attempt++) {
        const ai = await aiGymService.findOrCreateAiGym(myGym.rating, PVP.matchBand);
        if (String(ai._id) === String(myGym._id)) continue;
        if (recentTargets.some((id) => String(id) === String(ai._id))) continue;
        if (needsClass) {
            const byClass = await rosterByClass(ai._id);
            if (!(byClass[needsClass]?.length > 0)) {
                await aiGymService.generateAiGym(myGym.rating); // widen the pool
                continue;
            }
        }
        return ai;
    }
    throw err("No opponent gym available right now — try again shortly", 503);
}

/** Resolve a revenge target: must be the attacker of a recent event against us.
 *  Revenge bypasses shields and the refarm window (GDD §9.5). */
async function validateRevenge(myGymId, eventId) {
    const original = await PvpEvent.findOne({ _id: eventId, defenderGymId: myGymId });
    if (!original) throw err("No such attack to avenge", 404);
    const already = await PvpEvent.findOne({ revengeOf: original._id, attackerGymId: myGymId });
    if (already) throw err("You already took revenge for that attack", 409);
    const target = await Gym.findById(original.attackerGymId);
    if (!target) throw err("That gym no longer exists", 404);
    return { target, original };
}

function toEngineInput(fighter) {
    return {
        name: fighter.name,
        stats: {
            striking: fighter.stats.striking,
            grappling: fighter.stats.grappling,
            submissions: fighter.stats.submissions,
            conditioning: fighter.stats.conditioning,
        },
        style: fighter.style,
        traits: fighter.traits,
        fatigue: fighter.fatigue?.value ?? 0,
        gameplan: fighter.gameplan,
    };
}

function fighterSnapshot(f) {
    return f && { id: f._id, name: f.name, style: f.style, rarity: f.rarity, record: f.record };
}

/** Apply rating/purse/shield/notifications after an event resolves. */
async function applyStakes({ attacker, defender, event, attackerWon, defenderWon, k, purseWin, purseLoss, now }) {
    const score = attackerWon ? 1 : defenderWon ? 0 : 0.5;
    const dAtt = eloDelta(attacker.rating, defender.rating, score, k);
    attacker.rating += dAtt;
    defender.rating -= dAtt;
    event.ratingDelta = { attacker: dAtt, defender: -dAtt };

    const attPurse = attackerWon ? purseWin : defenderWon ? purseLoss : 0;
    const defPurse = defenderWon ? purseWin : attackerWon ? purseLoss : 0;
    attacker.purse = Math.max(0, attacker.purse + attPurse);
    defender.purse = Math.max(0, defender.purse + defPurse);
    event.purseDelta = { attacker: attPurse, defender: defPurse };

    // Defender gets the shield (GDD §9.4).
    defender.shieldUntil = new Date(now.getTime() + PVP.shieldHours * 3600000);

    await attacker.save();
    await defender.save();
    await event.save();

    if (!defender.isAi) {
        const won = defenderWon;
        await notificationService.notify(defender._id, "attacked",
            `You were attacked by ${attacker.name} — ${event.type === "gymwar" ? `Gym War ${event.tally.defender}–${event.tally.attacker}` : "Callout"} ${won ? "successfully defended." : "lost."} Review results and consider revenge.`,
            { eventId: event._id, attackerGymId: attacker._id, revengeAvailable: true });
    }
}

// ── Callout (GDD §9.1) ──────────────────────────────────────────────

async function callout(gymId, fighterId, { revengeOfEventId = null } = {}, now = new Date()) {
    const attacker = await Gym.findById(gymId);
    if (!attacker) throw err("Gym not found", 404);
    ensurePvpDay(attacker, now);
    if (attacker.pvp.calloutsToday >= calloutAllowance(attacker)) throw err("No callouts left today", 429);

    const fighter = await Fighter.findOne({ _id: fighterId, gymId, retired: { $ne: true } });
    if (!fighter) throw err("Fighter not found", 404);
    await lifecycleService.ensureFresh(fighter, now);

    let defender, revengeOf = null;
    if (revengeOfEventId) {
        const r = await validateRevenge(gymId, revengeOfEventId);
        defender = r.target;
        revengeOf = r.original._id;
        const byClass = await rosterByClass(defender._id);
        if (!(byClass[fighter.weightClass]?.length > 0)) {
            throw err(`${defender.name} has no ${fighter.weightClass} to answer the callout — take revenge with a Gym War instead`, 409);
        }
    } else {
        defender = await findOpponentGym(attacker, { needsClass: fighter.weightClass, now });
    }

    const byClass = await rosterByClass(defender._id);
    const defFighter = defenseFighterFor(defender, byClass, fighter.weightClass);
    await lifecycleService.ensureFresh(defFighter, now);

    const seed = newSeed();
    const breakdown = resolveFight({
        a: toEngineInput(fighter),
        b: toEngineInput(defFighter),
        rounds: 3,
        seed: `${seed}:callout`,
    });
    const attackerWon = breakdown.winner === "A";
    const defenderWon = breakdown.winner === "B";

    attacker.pvp.calloutsToday += 1;

    const event = new PvpEvent({
        type: "callout",
        attackerGymId: attacker._id,
        defenderGymId: defender._id,
        attackerName: attacker.name,
        defenderName: defender.name,
        seed,
        bouts: [{
            weightClass: fighter.weightClass,
            attackerFighter: fighterSnapshot(fighter),
            defenderFighter: fighterSnapshot(defFighter),
            winner: attackerWon ? "attacker" : defenderWon ? "defender" : "draw",
            method: breakdown.method,
            round: breakdown.round,
            time: breakdown.time,
            breakdown,
        }],
        tally: { attacker: attackerWon ? 1 : 0, defender: defenderWon ? 1 : 0 },
        winner: attackerWon ? "attacker" : defenderWon ? "defender" : "draw",
        revengeOf,
    });

    await applyStakes({
        attacker, defender, event, attackerWon, defenderWon,
        k: PVP.kCallout,
        purseWin: PVP.purse.calloutWin,
        purseLoss: PVP.purse.calloutLoss,
        now,
    });

    // Ranking position moves a little (never the record — GDD §9.6).
    fighter.rankingPoints = Math.max(0, fighter.rankingPoints + (attackerWon ? PVP.rankingPoints.calloutWin : defenderWon ? PVP.rankingPoints.calloutLoss : 0));
    await fighter.save();

    return event;
}

// ── Gym War (GDD §9.2) ──────────────────────────────────────────────

async function gymWar(gymId, { revengeOfEventId = null } = {}, now = new Date()) {
    const attacker = await Gym.findById(gymId);
    if (!attacker) throw err("Gym not found", 404);
    ensurePvpDay(attacker, now);
    if (attacker.pvp.gymWarsToday >= PVP.gymWarsPerDay) throw err("Gym War already fought today — cooldown resets at the day boundary", 429);

    const myByClass = await rosterByClass(gymId);
    const myCoverage = Object.keys(myByClass).length;
    if (myCoverage < PVP.minClassesCovered) {
        throw err(`Gym Wars need at least ${PVP.minClassesCovered} weight classes covered — you have ${myCoverage}. Build depth with Callouts first.`, 409);
    }

    let defender, revengeOf = null;
    if (revengeOfEventId) {
        const r = await validateRevenge(gymId, revengeOfEventId);
        defender = r.target;
        revengeOf = r.original._id;
    } else {
        defender = await findOpponentGym(attacker, { now });
    }

    const theirByClass = await rosterByClass(defender._id);
    const seed = newSeed();
    const bouts = [];
    let tallyA = 0, tallyD = 0;

    for (const weightClass of Object.keys(WEIGHT_CLASSES)) {
        const mine = defenseFighterFor(attacker, myByClass, weightClass);
        const theirs = defenseFighterFor(defender, theirByClass, weightClass);
        if (!mine && !theirs) continue; // class dark on both sides — no bout

        if (!theirs) {
            tallyA += 1;
            bouts.push({ weightClass, forfeit: "defender", attackerFighter: fighterSnapshot(mine), defenderFighter: null, winner: "attacker", method: "FORFEIT" });
            continue;
        }
        if (!mine) {
            tallyD += 1;
            bouts.push({ weightClass, forfeit: "attacker", attackerFighter: null, defenderFighter: fighterSnapshot(theirs), winner: "defender", method: "FORFEIT" });
            continue;
        }

        await lifecycleService.ensureFresh(mine, now);
        await lifecycleService.ensureFresh(theirs, now);
        const breakdown = resolveFight({
            a: toEngineInput(mine),
            b: toEngineInput(theirs),
            rounds: 3,
            seed: `${seed}:${weightClass}`,
        });
        const winner = breakdown.winner === "A" ? "attacker" : breakdown.winner === "B" ? "defender" : "draw";
        if (winner === "attacker") tallyA += 1;
        else if (winner === "defender") tallyD += 1;
        bouts.push({
            weightClass,
            attackerFighter: fighterSnapshot(mine),
            defenderFighter: fighterSnapshot(theirs),
            winner,
            method: breakdown.method,
            round: breakdown.round,
            time: breakdown.time,
            breakdown,
        });

        // Ranking position nudges for the player's fighters (GDD §9.6).
        if (!attacker.isAi) {
            mine.rankingPoints = Math.max(0, mine.rankingPoints + (winner === "attacker" ? PVP.rankingPoints.warBoutWin : winner === "defender" ? PVP.rankingPoints.warBoutLoss : 0));
            await mine.save();
        }
    }

    const attackerWon = tallyA > tallyD;
    const defenderWon = tallyD > tallyA;
    attacker.pvp.gymWarsToday += 1;

    const event = new PvpEvent({
        type: "gymwar",
        attackerGymId: attacker._id,
        defenderGymId: defender._id,
        attackerName: attacker.name,
        defenderName: defender.name,
        seed,
        bouts,
        tally: { attacker: tallyA, defender: tallyD },
        winner: attackerWon ? "attacker" : defenderWon ? "defender" : "draw",
        revengeOf,
    });

    const margin = Math.abs(tallyA - tallyD);
    await applyStakes({
        attacker, defender, event, attackerWon, defenderWon,
        k: PVP.kGymWar,
        purseWin: PVP.purse.gymWarWinBase + PVP.purse.gymWarWinPerMargin * margin,
        purseLoss: PVP.purse.gymWarLoss,
        now,
    });

    return event;
}

// ── State & serialization ───────────────────────────────────────────

async function getState(gymId, now = new Date()) {
    const gym = await Gym.findById(gymId);
    if (!gym) throw err("Gym not found", 404);
    ensurePvpDay(gym, now);
    await gym.save();

    const byClass = await rosterByClass(gymId);
    const coverage = {};
    for (const weightClass of Object.keys(WEIGHT_CLASSES)) {
        const pick = defenseFighterFor(gym, byClass, weightClass);
        coverage[weightClass] = pick
            ? { fighterId: pick._id, name: pick.name, isLineupPick: String(gym.defenseLineup?.[weightClass]) === String(pick._id) }
            : null;
    }

    return {
        rating: gym.rating,
        shieldUntil: gym.shieldUntil && gym.shieldUntil > now ? gym.shieldUntil : null,
        calloutsLeft: Math.max(0, calloutAllowance(gym) - gym.pvp.calloutsToday),
        gymWarsLeft: Math.max(0, PVP.gymWarsPerDay - gym.pvp.gymWarsToday),
        classesCovered: Object.keys(byClass).length,
        minClassesForWar: PVP.minClassesCovered,
        coverage,
    };
}

async function setDefenseLineup(gymId, lineup) {
    const gym = await Gym.findById(gymId);
    if (!gym) throw err("Gym not found", 404);
    for (const [weightClass, fighterId] of Object.entries(lineup || {})) {
        if (!(weightClass in WEIGHT_CLASSES)) continue;
        if (fighterId === null) {
            gym.defenseLineup[weightClass] = null;
            continue;
        }
        const fighter = await Fighter.findOne({ _id: fighterId, gymId, weightClass, retired: { $ne: true } });
        if (!fighter) throw err(`Invalid defense pick for ${weightClass}`, 400);
        gym.defenseLineup[weightClass] = fighter._id;
    }
    await gym.save();
    return gym.defenseLineup;
}

/** Event as seen by one gym: perspectives mapped to you/them. */
function eventToPublic(event, viewerGymId) {
    const youAreAttacker = String(event.attackerGymId) === String(viewerGymId);
    const map = (side) => (side === "attacker" ? (youAreAttacker ? "you" : "them") : side === "defender" ? (youAreAttacker ? "them" : "you") : "draw");
    const mapActor = (a) => (a === "A" ? (youAreAttacker ? "you" : "them") : a === "B" ? (youAreAttacker ? "them" : "you") : null);
    return {
        id: event._id,
        type: event.type,
        role: youAreAttacker ? "attacker" : "defender",
        you: youAreAttacker ? event.attackerName : event.defenderName,
        them: youAreAttacker ? event.defenderName : event.attackerName,
        themGymId: youAreAttacker ? event.defenderGymId : event.attackerGymId,
        winner: map(event.winner),
        tally: {
            you: youAreAttacker ? event.tally.attacker : event.tally.defender,
            them: youAreAttacker ? event.tally.defender : event.tally.attacker,
        },
        ratingDelta: youAreAttacker ? event.ratingDelta.attacker : event.ratingDelta.defender,
        purseDelta: youAreAttacker ? event.purseDelta.attacker : event.purseDelta.defender,
        revengeOf: event.revengeOf,
        createdAt: event.createdAt,
        bouts: event.bouts.map((b) => ({
            weightClass: b.weightClass,
            forfeit: b.forfeit ? map(b.forfeit) : null,
            you: youAreAttacker ? b.attackerFighter : b.defenderFighter,
            them: youAreAttacker ? b.defenderFighter : b.attackerFighter,
            winner: map(b.winner),
            method: b.method,
            round: b.round,
            time: b.time,
            log: b.breakdown
                ? b.breakdown.rounds.flatMap((r) => r.events.map((e) => ({ round: r.round, time: e.time, actor: mapActor(e.actor), text: e.text, finish: e.finish })))
                : [],
        })),
    };
}

async function listEvents(gymId, limit = 20) {
    const events = await PvpEvent.find({
        $or: [{ attackerGymId: gymId }, { defenderGymId: gymId }],
    }).sort({ createdAt: -1 }).limit(limit);
    return events.map((e) => {
        const pub = eventToPublic(e, gymId);
        delete pub.bouts; // list view stays light
        return pub;
    });
}

async function getEvent(gymId, eventId) {
    const event = await PvpEvent.findOne({
        _id: eventId,
        $or: [{ attackerGymId: gymId }, { defenderGymId: gymId }],
    });
    if (!event) throw err("Event not found", 404);
    return eventToPublic(event, gymId);
}

module.exports = { callout, gymWar, getState, setDefenseLineup, listEvents, getEvent };

// All database changes commit together; retryable transaction failures roll back.
module.exports = require("../lib/atomic").protect(module.exports);
