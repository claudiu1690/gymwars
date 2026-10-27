const Fight = require("../models/fightModel");
const Fighter = require("../models/fighterModel");
const Gym = require("../models/gymModel");
const aiOpponentService = require("./aiOpponentService");
const lifecycleService = require("./lifecycleService");
const { resolveFight } = require("../engine/fightEngine");
const { newSeed } = require("../utils/rng");
const { gameWeeksToMs, gameWeekMs, utcDayStart } = require("../consts/calendar");
const { FIGHT, OFFERS, EXHIBITIONS } = require("../consts/fightConfig");
const { POINTS, TITLE_SHOT_THRESHOLD, tierFor } = require("../consts/rankings");
const { PURSES } = require("../consts/economy");
const { AGING } = require("../consts/training");

/**
 * Fights — offers, booking, and resolution (GDD §7, §8). Matchmaking is a
 * two-step negotiation: `makeOffer` proposes an opponent at the fighter's
 * ladder tier, and nothing is committed until the manager signs via
 * `bookFight`, which schedules the bout N game-weeks out — the manager's job
 * between now and then is the camp and the gameplan. Passing on an offer is
 * rationed per day so nobody re-rolls into a soft matchup. Resolution is
 * atomic/idempotent with the same three paths as camps: delayed job, lazy
 * on-read, daily sweep.
 */

/** Winner/loser purse for a tier — what's on the table before the bout. */
function pursePreview(tier, title) {
    const win = title
        ? PURSES.title.base + PURSES.title.ppvBonus
        : (PURSES.base[tier] ?? 0) + (PURSES.gateBonus[tier] ?? 0);
    return { win, lose: Math.round(win * PURSES.loserShare) };
}

function offerPassesLeft(fighter, now = new Date()) {
    const anchor = utcDayStart(now);
    const sameDay = fighter.offerPasses?.dayAnchor && fighter.offerPasses.dayAnchor.getTime() === anchor.getTime();
    return Math.max(0, OFFERS.passesPerDay - (sameDay ? fighter.offerPasses.used : 0));
}

/** Drop the fighter's offer. The AI opponent generated solely for it is
 *  deleted too — champions and anyone with fight history stay. Doesn't save. */
async function clearOffer(fighter) {
    const opponentId = fighter.fightOffer?.opponentId;
    fighter.fightOffer = { opponentId: null, tier: null, title: false, expiresAt: null };
    if (!opponentId) return;
    const opp = await Fighter.findById(opponentId);
    if (opp && opp.gymId === null && !opp.isChampion) {
        const referenced = await Fight.exists({ opponentId: opp._id });
        if (!referenced) await Fighter.deleteOne({ _id: opp._id });
    }
}

/** Client shape — offer terms plus a scouting-level look at the opponent. */
function offerToPublic(fighter, opponent, now = new Date()) {
    return {
        offer: opponent
            ? {
                opponent: {
                    name: opponent.name,
                    gym: opponent.aiGymName,
                    record: opponent.record,
                    age: Math.floor(opponent.age),
                    style: opponent.style,
                    weightClass: opponent.weightClass,
                    isChampion: opponent.isChampion,
                },
                tier: fighter.fightOffer.tier,
                title: fighter.fightOffer.title,
                rounds: fighter.fightOffer.title ? 5 : 3,
                purse: pursePreview(fighter.fightOffer.tier, fighter.fightOffer.title),
                expiresAt: fighter.fightOffer.expiresAt,
            }
            : null,
        passesLeft: offerPassesLeft(fighter, now),
    };
}

/** The fighter's standing offer, or null. Lazily expires stale ones. */
async function getOffer(gymId, fighterId, now = new Date()) {
    const fighter = await Fighter.findOne({ _id: fighterId, gymId });
    if (!fighter) throw Object.assign(new Error("Fighter not found"), { statusCode: 404 });
    if (!fighter.fightOffer?.opponentId) return offerToPublic(fighter, null, now);

    const opponent = await Fighter.findById(fighter.fightOffer.opponentId);
    if (!opponent || opponent.retired || (fighter.fightOffer.expiresAt && fighter.fightOffer.expiresAt <= now)) {
        await clearOffer(fighter);
        await fighter.save();
        return offerToPublic(fighter, null, now);
    }
    return offerToPublic(fighter, opponent, now);
}

/** Matchmaking proposes an opponent. Idempotent while an offer stands. */
async function makeOffer(gymId, fighterId, now = new Date()) {
    const fighter = await Fighter.findOne({ _id: fighterId, gymId });
    if (!fighter) throw Object.assign(new Error("Fighter not found"), { statusCode: 404 });
    if (fighter.retired) throw Object.assign(new Error("Retired fighters don't take fights"), { statusCode: 409, expose: true });

    const existing = await Fight.findOne({ fighterId, status: "scheduled" });
    if (existing) throw Object.assign(new Error("This fighter already has a fight booked"), { statusCode: 409, expose: true });

    // A standing valid offer is returned as-is — matchmaking already spoke.
    if (fighter.fightOffer?.opponentId) {
        const current = await Fighter.findById(fighter.fightOffer.opponentId);
        if (current && !current.retired && fighter.fightOffer.expiresAt > now) {
            return offerToPublic(fighter, current, now);
        }
        await clearOffer(fighter);
    }

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

    fighter.fightOffer = {
        opponentId: opponent._id,
        tier,
        title,
        expiresAt: new Date(now.getTime() + OFFERS.ttlHours * 60 * 60 * 1000),
    };
    await fighter.save();
    return offerToPublic(fighter, opponent, now);
}

/** Pass on the table offer — rationed per UTC day. */
async function passOffer(gymId, fighterId, now = new Date()) {
    const fighter = await Fighter.findOne({ _id: fighterId, gymId });
    if (!fighter) throw Object.assign(new Error("Fighter not found"), { statusCode: 404 });
    if (!fighter.fightOffer?.opponentId) throw Object.assign(new Error("No offer on the table"), { statusCode: 409, expose: true });

    const anchor = utcDayStart(now);
    if (!fighter.offerPasses?.dayAnchor || fighter.offerPasses.dayAnchor.getTime() !== anchor.getTime()) {
        fighter.offerPasses = { dayAnchor: anchor, used: 0 };
    }
    if (fighter.offerPasses.used >= OFFERS.passesPerDay) {
        throw Object.assign(new Error("No passes left today — this matchup stands until tomorrow"), { statusCode: 429, expose: true });
    }
    fighter.offerPasses.used += 1;
    await clearOffer(fighter);
    await fighter.save();
    return offerToPublic(fighter, null, now);
}

/** Sign the standing offer — this is the commitment step. `rush` books an
 *  amateur-circuit "small hall show" resolving in hours instead of days. */
async function bookFight(gymId, fighterId, weeks, { rush = false } = {}, now = new Date()) {
    if(await require('./mentoringService').isInActivePair(fighterId)) throw Object.assign(new Error('This fighter is committed to a mentoring arc.'),{statusCode:409,expose:true});
    let rookie = null;
    if (rush) {
        const facilityService = require("./facilityService");
        rookie = await facilityService.rookieState(gymId);
        if (!rookie.active) {
            throw Object.assign(new Error("Small hall shows are an amateur-circuit perk — the pro game runs on notice"), { statusCode: 409, expose: true });
        }
    } else if (!Number.isInteger(weeks) || weeks < 1 || weeks > 8) {
        throw Object.assign(new Error("Notice period must be 1–8 game-weeks"), { statusCode: 400, expose: true });
    }
    const fighter = await Fighter.findOne({ _id: fighterId, gymId });
    if (!fighter) throw Object.assign(new Error("Fighter not found"), { statusCode: 404 });
    if (fighter.retired) throw Object.assign(new Error("Retired fighters don't take fights"), { statusCode: 409, expose: true });

    const existing = await Fight.findOne({ fighterId, status: "scheduled" });
    if (existing) throw Object.assign(new Error("This fighter already has a fight booked"), { statusCode: 409, expose: true });

    if (!fighter.fightOffer?.opponentId) {
        throw Object.assign(new Error("No opponent on the table — find an opponent first, then sign"), { statusCode: 409, expose: true });
    }
    if (fighter.fightOffer.expiresAt && fighter.fightOffer.expiresAt <= now) {
        await clearOffer(fighter);
        await fighter.save();
        throw Object.assign(new Error("The offer expired — matchmaking moved on. Find a new opponent"), { statusCode: 409, expose: true });
    }
    const opponent = await Fighter.findById(fighter.fightOffer.opponentId);
    if (!opponent || opponent.retired) {
        await clearOffer(fighter);
        await fighter.save();
        throw Object.assign(new Error("That opponent is no longer available — find a new one"), { statusCode: 409, expose: true });
    }

    const { tier, title } = fighter.fightOffer;
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
        scheduledAt: rush
            ? new Date(now.getTime() + rookie.rushFightHours * 60 * 60 * 1000)
            : new Date(now.getTime() + gameWeeksToMs(weeks)),
    });

    // The offer is consumed — the opponent now belongs to the booked fight,
    // so clearOffer's reference check keeps the doc.
    await clearOffer(fighter);
    await fighter.save();
    await require("./onboardingService").complete(gymId, "book");

    // Delayed resolution job; lazy resolve is the safety net.
    try {
        if (process.env.DISABLE_SCHEDULER === 'true') return fight;
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

/** Sparring sessions remaining today (lazy UTC-day reset, computed on read). */
function sparsLeft(gym, now = new Date()) {
    const anchor = utcDayStart(now);
    const sameDay = gym.spar?.dayAnchor && gym.spar.dayAnchor.getTime() === anchor.getTime();
    return Math.max(0, EXHIBITIONS.perDay - (sameDay ? gym.spar.usedToday : 0));
}

/**
 * Spar an exhibition — the always-available instant lane (genre: Hattrick
 * friendlies, Torn energy spends). Resolves on the spot against a tier-matched
 * AI opponent. No record, ranking, or title stakes; small purse, fatigue, and
 * a chance to reveal traits. Rationed per UTC day.
 */
async function sparExhibition(gymId, fighterId, now = new Date()) {
    const fighter = await Fighter.findOne({ _id: fighterId, gymId });
    if (!fighter) throw Object.assign(new Error("Fighter not found"), { statusCode: 404 });
    if (fighter.retired) throw Object.assign(new Error("Retired fighters don't spar"), { statusCode: 409, expose: true });

    const gym = await Gym.findById(gymId);
    if (!gym) throw Object.assign(new Error("Gym not found"), { statusCode: 404 });

    const anchor = utcDayStart(now);
    if (!gym.spar?.dayAnchor || gym.spar.dayAnchor.getTime() !== anchor.getTime()) {
        gym.spar = { dayAnchor: anchor, usedToday: 0 };
    }
    if (gym.spar.usedToday >= EXHIBITIONS.perDay) {
        throw Object.assign(new Error("No sparring sessions left today — the gym reopens at midnight UTC"), { statusCode: 429, expose: true });
    }
    gym.spar.usedToday += 1;
    await gym.save();

    const tier = tierFor(fighter.rankingPoints).key;
    const opponent = await aiOpponentService.generateOpponent(fighter.weightClass, tier);
    const fight = await Fight.create({
        gymId,
        fighterId,
        opponentId: opponent._id,
        seed: newSeed(),
        weightClass: fighter.weightClass,
        rounds: 3,
        title: false,
        tier,
        exhibition: true,
        bookedAt: now,
        scheduledAt: now,
    });

    await resolveFightIfDue(fight._id, now);
    await require("./onboardingService").complete(gymId, "spar");
    return Fight.findById(fight._id);
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
    if (!fighter || !opponent) throw new Error('Fight participant missing; outcome not committed');

    // Freshen the player's fighter so camp results / fatigue / age are current.
    await lifecycleService.ensureFresh(fighter, fight.scheduledAt);
    await lifecycleService.ensureFresh(opponent, fight.scheduledAt);

    // The coach works the corner: Tactical IQ translates instructions into
    // execution (GDD §4.4) — a small effectiveness multiplier.
    const Staff = require("../models/staffModel");
    const staffService = require("./staffService");
    const coach = await Staff.findOne({ gymId: fight.gymId, role: "coach" });
    const cornerMult = staffService.coachFightMult(coach);

    const toEngine = (f, fatigue, mult = 1) => ({
        name: f.name,
        stats: {
            striking: f.stats.striking * mult,
            grappling: f.stats.grappling * mult,
            submissions: f.stats.submissions * mult,
            conditioning: f.stats.conditioning * mult,
        },
        style: f.style,
        traits: f.traits,
        fatigue,
        gameplan: f.gameplan,
    });

    const breakdown = resolveFight({
        a: toEngine(fighter, fighter.fatigue.value, cornerMult),
        b: toEngine(opponent, opponent.fatigue.value),
        rounds: fight.rounds,
        title: fight.title,
        seed: fight.seed,
    });

    const won = breakdown.winner === "A";
    const lost = breakdown.winner === "B";
    const finish = ["KO", "TKO", "SUB"].includes(breakdown.method);

    // Records — exhibitions never touch the career ledger.
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
    if (!fight.exhibition) {
        applyRecord(fighter, won, lost);
        applyRecord(opponent, lost, won);
    }

    // Ranking points (player fighter only; exhibitions carry none).
    let pointsDelta = 0;
    if (!fight.exhibition) {
        if (won) pointsDelta = POINTS.win[fight.tier] ?? POINTS.win.regional;
        else if (lost) pointsDelta = POINTS.loss[fight.tier] ?? POINTS.loss.regional;
        fighter.rankingPoints = Math.max(0, fighter.rankingPoints + pointsDelta);
    }

    // Purse → gym. Exhibitions pay flat sparring money.
    const base = fight.title
        ? PURSES.title.base + PURSES.title.ppvBonus
        : (PURSES.base[fight.tier] ?? PURSES.base.regional) + (PURSES.gateBonus[fight.tier] ?? 0);
    const purse = fight.exhibition
        ? (won ? EXHIBITIONS.purse.win : EXHIBITIONS.purse.lose)
        : Math.round(won ? base : base * PURSES.loserShare);
    await Gym.updateOne({ _id: fight.gymId }, { $inc: { purse } });

    // Title transfer (GDD §8.3 — one champion per class) + Legacy (GDD §11.3).
    const legacyService = require("./legacyService");
    let titleChanged = false;
    if (fight.title) {
        if (won && !fighter.isChampion) {
            fighter.isChampion = true;
            fighter.championshipHistory.push({ wonAt: fight.scheduledAt, defenses: 0 });
            if (opponent.championshipHistory.length) opponent.championshipHistory.at(-1).endedAt = fight.scheduledAt;
            opponent.isChampion = false;
            titleChanged = true;
            await legacyService.award(fight.gymId, "title-win", `${fighter.name} takes the ${fight.weightClass} belt`);
        } else if (won && fighter.isChampion) {
            if (!fighter.championshipHistory.length) fighter.championshipHistory.push({ wonAt: fight.bookedAt, defenses: 0 });
            fighter.championshipHistory.at(-1).defenses += 1;
            await legacyService.award(fight.gymId, "title-defense", fighter.name);
        } else if (lost && fighter.isChampion) {
            if (!fighter.championshipHistory.length) fighter.championshipHistory.push({ wonAt: fight.bookedAt, defenses: 0 });
            fighter.championshipHistory.at(-1).endedAt = fight.scheduledAt;
            opponent.championshipHistory.push({ wonAt: fight.scheduledAt, defenses: 0 });
            fighter.isChampion = false;
            opponent.isChampion = true;
            titleChanged = true;
        }
    }

    // Win streaks feed the Legacy track (career fights only).
    if (!fight.exhibition) {
        if (won) {
            fighter.winStreak = (fighter.winStreak ?? 0) + 1;
            if (fighter.winStreak === 5) {
                await legacyService.award(fight.gymId, "win-streak-5", fighter.name);
            }
        } else if (lost) {
            fighter.winStreak = 0;
        }
    }

    // Post-fight fatigue — sparring is a workout, not a war.
    fighter.fatigue.value = Math.min(100, fighter.fatigue.value + (fight.exhibition ? EXHIBITIONS.fatigue : FIGHT.postFightFatigue));
    fighter.fatigue.syncedAt = fight.scheduledAt;

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
    // A bad sparring day never ends a career.
    if (!fight.exhibition && lost && fighter.age >= 38 && !fighter.retired) {
        fighter.retired = true;
        fighter.retiredAt = now;
        fighter.isChampion = false;
        await legacyService.award(fight.gymId, "retirement", `${fighter.name} hangs up the gloves at ${Math.floor(fighter.age)}`);
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
    const fighter = await Fighter.findById(fight.fighterId);
    const opponent = await Fighter.findById(fight.opponentId);
    const mapActor = (a) => (a === "A" ? "you" : a === "B" ? "them" : null);
    return {
        id: fight._id,
        status: fight.status,
        title: fight.title,
        tier: fight.tier,
        exhibition: fight.exhibition ?? false,
        weightClass: fight.weightClass,
        rounds: fight.rounds,
        scheduledAt: fight.scheduledAt,
        /** Game-weeks of prep left before the bout — the camp-planning window. */
        noticeWeeksLeft: fight.status === "scheduled"
            ? Math.max(0, (fight.scheduledAt.getTime() - Date.now()) / gameWeekMs())
            : null,
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

module.exports = { makeOffer, getOffer, passOffer, bookFight, sparExhibition, sparsLeft, resolveFightIfDue, listFights, getFight, toPublic };

// All database changes commit together; retryable transaction failures roll back.
module.exports = require("../lib/atomic").protect(module.exports);
