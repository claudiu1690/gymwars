const Fighter = require("../models/fighterModel");
const { generateFighter } = require("./fighterGenService");
const { beginFight, advanceRound, finishFight } = require("../engine/fightEngine");
const { newSeed, createRng } = require("../utils/rng");
const { AI_RARITY_BY_TIER, tierFor } = require("../consts/rankings");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");

/**
 * Live fights (Model B core) — a fight you play round by round. The engine
 * state (RNG closure + corner objects) can't be serialized, so a live fight
 * lives in memory keyed by id and is driven a round at a time. Between rounds
 * the manager makes a corner call that rewrites the fighter's game plan (or
 * buys back some gas); the engine reads the plan fresh each exchange, so the
 * decision swings the very next round.
 *
 * This is player-paced and self-contained: no scheduling, no purse, no
 * records touched. It's the fight moment, isolated — the Round-1 prototype.
 */

const SESSIONS = new Map();
const TTL_MS = 30 * 60 * 1000;

function err(message, statusCode = 400) {
    return Object.assign(new Error(message), { statusCode, expose: true });
}

function sweep(now = Date.now()) {
    for (const [id, s] of SESSIONS) if (now - s.touched > TTL_MS) SESSIONS.delete(id);
}

const STYLE_LABEL = (s) => STYLES[s]?.label ?? s;

/** A corner's read on the opponent — what a good cornerman would tell you. */
function opponentRead(them) {
    const fam = STYLES[them.style]?.family;
    const famLabel = fam ? STYLE_FAMILIES[fam].label : "";
    const s = them.stats;
    const ranked = Object.entries(s).sort((a, b) => b[1] - a[1]);
    const strong = ranked[0][0], weak = ranked[3][0];
    const label = { striking: "hands", grappling: "wrestling", submissions: "submission game", conditioning: "cardio" };
    return {
        style: STYLE_LABEL(them.style),
        family: famLabel,
        danger: `Best weapon: ${label[strong]}.`,
        opening: `Softest spot: ${label[weak]}.`,
        // the trinity tip — what beats their family
        counter: fam ? `A ${STYLE_FAMILIES[Object.keys(STYLE_FAMILIES).find((f) => STYLE_FAMILIES[f].beats === fam)]?.label ?? ""} game troubles ${famLabel} stylists.` : "",
    };
}

/**
 * Start a live fight for the gym's fighter vs a freshly generated opponent
 * scaled to the fighter's ladder tier. Returns the pre-fight card (both
 * corners + the opponent read) and the opening game-plan choice.
 */
async function start(gymId, fighterId) {
    sweep();
    const fighter = await Fighter.findOne({ _id: fighterId, gymId });
    if (!fighter) throw err("Fighter not found", 404);
    if (fighter.retired) throw err("Retired fighters don't fight", 409);

    const tier = tierFor(fighter.rankingPoints).key;
    const seed = newSeed();
    const rng = createRng(`liveopp:${seed}`);
    const rarity = rng.weighted(AI_RARITY_BY_TIER[tier] || AI_RARITY_BY_TIER.regional);
    const gen = generateFighter({ seed, weightClass: fighter.weightClass, rarity });
    const oppFights = rng.int(4, 18);
    const oppWins = Math.round(oppFights * (0.4 + rng() * 0.3));
    const them = {
        name: gen.name,
        style: gen.style,
        stats: gen.stats,
        traits: gen.traits,
        fatigue: 0,
        gameplan: pickAiPlan(gen, rng),
        record: { wins: oppWins, losses: oppFights - oppWins },
        rarity: gen.rarity,
        aiGymName: gen.regionLabel,
    };

    const you = {
        name: fighter.name,
        style: fighter.style,
        stats: fighter.stats,
        traits: fighter.traits,
        fatigue: fighter.fatigue.value,
        gameplan: { ...fighter.gameplan },
        record: fighter.record,
    };

    const id = newSeed();
    // Engine state built lazily on the first round call, once the opening plan
    // is locked — so we stash the raw corners here.
    SESSIONS.set(id, { gymId: String(gymId), you, them, seed: newSeed(), engine: null, rounds: 3, touched: Date.now() });

    return {
        fightId: id,
        rounds: 3,
        you: publicCorner(you),
        them: { ...publicCorner(them), read: opponentRead(them) },
    };
}

/** AI opening plan leans into its own strengths. */
function pickAiPlan(gen, rng) {
    const fam = STYLES[gen.style]?.family;
    const approach = fam === "wrestling" ? "grapple" : fam === "submission" ? "grapple" : "strike";
    return { approach, pace: rng.pick(["high", "measured", "measured"]), finish: rng.pick(["hunt-finish", "play-safe"]) };
}

function publicCorner(c) {
    return { name: c.name, style: STYLE_LABEL(c.style), record: c.record, rarity: c.rarity, gym: c.aiGymName };
}

/** Corner-call options for the manager, contextual to the live fight state. */
function cornerOptions(engine) {
    const you = engine.A, them = engine.B;
    const opts = [];
    const gp = you.gameplan;

    // Finish the hurt man.
    if (them.health < 55) {
        opts.push({ id: "finish", label: "Go for the kill", detail: "He's hurt — open up, hunt the finish.", apply: { pace: "high", finish: "hunt-finish" } });
    }
    // Catch your breath if gassing.
    if (you.gas / you.gasMax < 0.5) {
        opts.push({ id: "breathe", label: "Catch your breath", detail: "Settle the pace, recover in the corner.", apply: { pace: "cautious" }, recoverGas: 0.25 });
    }
    // Change levels if losing the striking.
    if (you.roundDamage < them.roundDamage && gp.approach !== "grapple") {
        opts.push({ id: "wrestle", label: "Change levels", detail: "Take it to the mat, off his strikes.", apply: { approach: "grapple", pace: "measured" } });
    }
    // Open up the striking if grinding and even.
    if (gp.approach !== "strike") {
        opts.push({ id: "strike", label: "Let the hands go", detail: "Keep it standing, pressure forward.", apply: { approach: "strike", pace: "high" } });
    }
    // Lock it down if ahead.
    if (you.roundsWon > them.roundsWon) {
        opts.push({ id: "safe", label: "Protect the lead", detail: "You're up — stay tight, take no risks.", apply: { pace: "cautious", finish: "play-safe" } });
    }
    // Always allow staying the course.
    opts.push({ id: "hold", label: "Stick to the plan", detail: "Keep doing what's working.", apply: {} });

    // De-dupe by id, cap at 3 (plus hold), keep the most contextual first.
    const seen = new Set();
    return opts.filter((o) => !seen.has(o.id) && seen.add(o.id)).slice(0, 3);
}

/**
 * Run the next round. `openingPlan` is applied before round 1; `decisionId`
 * (from the previously offered options) is applied before later rounds.
 */
async function round(gymId, fightId, { openingPlan, decisionId } = {}) {
    sweep();
    const s = SESSIONS.get(fightId);
    if (!s || s.gymId !== String(gymId)) throw err("Live fight not found — it may have expired", 404);
    s.touched = Date.now();

    // First call builds the engine with the locked-in opening plan.
    if (!s.engine) {
        if (openingPlan) s.you.gameplan = { ...s.you.gameplan, ...sanitizePlan(openingPlan) };
        s.engine = beginFight({ a: s.you, b: s.them, rounds: s.rounds, seed: s.seed });
    } else if (decisionId) {
        applyDecision(s, decisionId);
    }

    const res = advanceRound(s.engine);

    if (res.ended) {
        const final = finishFight(s.engine);
        SESSIONS.delete(fightId);
        return {
            round: res.round,
            events: res.events,
            snapshot: res.snapshot,
            ended: true,
            result: {
                winner: final.winner === "A" ? "you" : final.winner === "B" ? "them" : "draw",
                method: final.method,
                round: final.round,
                time: final.time,
                totals: { you: final.totals.A, them: final.totals.B },
            },
        };
    }

    return {
        round: res.round,
        events: res.events,
        snapshot: res.snapshot,
        ended: false,
        options: cornerOptions(s.engine),
    };
}

function sanitizePlan(p) {
    const out = {};
    if (["strike", "balanced", "grapple"].includes(p.approach)) out.approach = p.approach;
    if (["high", "measured", "cautious"].includes(p.pace)) out.pace = p.pace;
    if (["hunt-finish", "play-safe"].includes(p.finish)) out.finish = p.finish;
    return out;
}

/** Apply a chosen corner call to the player's engine corner. */
function applyDecision(s, decisionId) {
    const opts = cornerOptions(s.engine);
    const chosen = opts.find((o) => o.id === decisionId);
    if (!chosen) return; // stale/invalid — hold the plan
    Object.assign(s.engine.A.gameplan, chosen.apply);
    if (chosen.recoverGas) {
        s.engine.A.gas = Math.min(s.engine.A.gasMax, s.engine.A.gas + s.engine.A.gasMax * chosen.recoverGas);
    }
}

module.exports = { start, round };
