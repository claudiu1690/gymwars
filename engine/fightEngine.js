const { createRng } = require("../utils/rng");
const { FIGHT } = require("../consts/fightConfig");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");
const { commentary } = require("./commentary");

/**
 * Fight engine — GDD §7. Pure and fully seeded: no DB, no Date.now, no
 * Math.random. The same inputs + seed always replay the identical fight,
 * which is what makes stored fights replayable and the Monte Carlo harness
 * possible. Structure follows Ground & Pound's engine (round loop → event
 * log → outcome), re-parameterized for the 4-stat / style-trinity model.
 *
 * Corners are 'A' and 'B'; the caller maps them to you/them.
 *
 * @param {object} input
 * @param {object} input.a  fighter A: { name, stats{striking,grappling,submissions,conditioning},
 *                          style, traits?, fatigue?, gameplan?{approach,pace,finish} }
 * @param {object} input.b  fighter B, same shape
 * @param {number} [input.rounds=3]
 * @param {boolean} [input.title=false]
 * @param {string} input.seed
 */
function resolveFight({ a, b, rounds = 3, title = false, seed }) {
    if (!seed) throw new Error("resolveFight requires a seed");
    const rng = createRng(`fight:${seed}`);

    const A = buildCorner(a, b, title);
    const B = buildCorner(b, a, title);

    const log = [];
    let outcome = null;

    for (let round = 1; round <= rounds && !outcome; round++) {
        A.roundDamage = 0; B.roundDamage = 0;
        A.roundControl = 0; B.roundControl = 0;
        pushEvent(log, round, 0, null, "round-start", commentary.roundStart(rng, round));

        for (let ex = 0; ex < FIGHT.exchangesPerRound && !outcome; ex++) {
            const time = exchangeTime(round, ex);
            outcome = runExchange({ rng, A, B, round, time, log });
            drainGas(A); drainGas(B);
        }

        if (!outcome) {
            scoreRound(A, B, round);
            pushEvent(log, round, FIGHT.roundMinutes * 60, null, "round-end", commentary.roundEnd(rng, round));
        }
    }

    if (!outcome) outcome = judgeDecision(rng, A, B, rounds);

    return {
        winner: outcome.winner,           // 'A' | 'B' | 'draw'
        method: outcome.method,           // 'KO' | 'TKO' | 'SUB' | 'DEC' | 'SPLIT-DEC' | 'DRAW'
        round: outcome.round ?? rounds,
        time: outcome.time ?? `${FIGHT.roundMinutes}:00`,
        detail: outcome.detail || null,
        rounds: groupRounds(log, rounds, outcome),
        totals: {
            // damage = dealt to the opponent (totalDamage accumulates absorbed).
            A: { damage: r1(B.totalDamage), takedowns: A.takedowns, knockdowns: A.knockdowns, subAttempts: A.subAttempts, roundsWon: A.roundsWon },
            B: { damage: r1(A.totalDamage), takedowns: B.takedowns, knockdowns: B.knockdowns, subAttempts: B.subAttempts, roundsWon: B.roundsWon },
        },
    };
}

// ── Corner state ────────────────────────────────────────────────────

function buildCorner(f, opp, title) {
    const gameplan = { approach: "balanced", pace: "measured", finish: "hunt-finish", ...(f.gameplan || {}) };
    const traits = f.traits || [];
    const t = (name) => (traits.includes(name) ? FIGHT.traits[name] : null);

    // Effective stats: base × fatigue, with the style-matchup modifier scoped
    // to the family's PRIMARY stat only — "the relevant exchanges" (GDD §3.2).
    // Applying it to all four stats makes favorable matchups near-unloseable.
    const famSelf = STYLES[f.style]?.family;
    const famOpp = STYLES[opp.style]?.family;
    let matchup = 1;
    if (famSelf && famOpp && famSelf !== famOpp) {
        if (STYLE_FAMILIES[famSelf].beats === famOpp) matchup = FIGHT.matchupFavorable;
        else if (STYLE_FAMILIES[famSelf].losesTo === famOpp) matchup = FIGHT.matchupUnfavorable;
    }
    const primaryStat = famSelf ? STYLE_FAMILIES[famSelf].primaryStat : null;
    const fatigue = f.fatigue || 0;
    const fatigueMult = 1 - Math.max(0, fatigue - FIGHT.fatigueGrace) * FIGHT.fatiguePenaltyPerPoint;
    const titleMult = title && t("big-fight-nerves") ? FIGHT.traits["big-fight-nerves"].titleMult : 1;

    const base = fatigueMult * titleMult;
    const eff = {};
    for (const k of ["striking", "grappling", "submissions", "conditioning"]) {
        eff[k] = f.stats[k] * base * (k === primaryStat ? matchup : 1);
    }

    return {
        name: f.name,
        style: f.style,
        family: famSelf,
        gameplan,
        eff,
        chinMult: t("iron-chin")?.chinMult ?? t("suspect-chin")?.chinMult ?? 1,
        finishMult: (t("killer-instinct")?.finishMult ?? 1) * (gameplan.finish === "hunt-finish" ? FIGHT.finishHunterMult : FIGHT.playSafeMult),
        round1Mult: t("fast-starter")?.round1Mult ?? t("slow-starter")?.round1Mult ?? 1,
        lateMult: t("slow-starter")?.lateMult ?? 1,
        gas: FIGHT.gasBase + f.stats.conditioning * FIGHT.gasPerConditioning + (t("cardio-machine")?.gasBonus ?? 0),
        gasMax: FIGHT.gasBase + f.stats.conditioning * FIGHT.gasPerConditioning + (t("cardio-machine")?.gasBonus ?? 0),
        health: 100,
        totalDamage: 0, roundDamage: 0, roundControl: 0,
        takedowns: 0, knockdowns: 0, subAttempts: 0, roundsWon: 0,
        scorecard: [],
    };
}

/** Momentary effectiveness for a stat, applying gas + round-timing traits. */
function effNow(c, stat, round) {
    const gasMult = FIGHT.gasFloor + (1 - FIGHT.gasFloor) * (c.gas / c.gasMax);
    const roundMult = round === 1 ? c.round1Mult : round >= 3 ? c.lateMult : 1;
    return c.eff[stat] * gasMult * roundMult;
}

function drainGas(c) {
    c.gas = Math.max(0, c.gas - FIGHT.gasDrain[c.gameplan.pace]);
}

// ── Exchanges ───────────────────────────────────────────────────────

function runExchange({ rng, A, B, round, time, log }) {
    // Who initiates a takedown attempt this exchange?
    for (const [me, them] of rng() < 0.5 ? [[A, B], [B, A]] : [[B, A], [A, B]]) {
        let intent = FIGHT.takedownIntent[me.gameplan.approach];
        if (me.family === "wrestling") intent += FIGHT.takedownIntentWrestlingBonus;
        if (rng() < intent) {
            return groundExchange({ rng, top: me, bottom: them, round, time, log, A });
        }
    }
    return strikingExchange({ rng, A, B, round, time, log });
}

function strikingExchange({ rng, A, B, round, time, log }) {
    for (const [me, them] of [[A, B], [B, A]]) {
        // Contested rolls — each exchange is genuinely uncertain, so small
        // stat edges tilt fights without deciding them (upset potential).
        const offense = effNow(me, "striking", round) * FIGHT.paceOutput[me.gameplan.pace] * (0.35 + 1.3 * rng());
        const defense = (effNow(them, "striking", round) * 0.6 + effNow(them, "conditioning", round) * 0.4) * (0.35 + 1.3 * rng());
        const edge = Math.max(0, offense - defense * 0.72);
        let dmg = (edge * FIGHT.strikeDamageScale) / 4;
        // Power-shot tail: the clean connect that creates knockdowns and
        // keeps every striking exchange live (GDD upset potential).
        if (rng() < FIGHT.powerShotChance) dmg *= FIGHT.powerShotMult;
        if (dmg <= 0.3) continue;

        applyDamage(them, dmg);
        me.roundDamage += dmg;

        if (dmg >= FIGHT.knockdownThreshold * them.chinMult) {
            me.knockdowns += 1;
            pushEvent(log, round, time, corner(me, A), "knockdown", commentary.knockdown(rng, me.name, them.name));
            const koChance = FIGHT.koChanceOnKnockdown * me.finishMult * (them.health < FIGHT.koHealthThreshold ? 1.6 : 1);
            if (rng() < koChance) {
                pushEvent(log, round, time, corner(me, A), "ko", commentary.ko(rng, me.name, them.name), { finish: true });
                return { winner: corner(me, A), method: "KO", round, time: fmt(time), detail: "knockout" };
            }
            if (them.health < FIGHT.tkoHealthThreshold && rng() < FIGHT.tkoChanceHurt * me.finishMult) {
                pushEvent(log, round, time, corner(me, A), "tko", commentary.tko(rng, me.name, them.name), { finish: true });
                return { winner: corner(me, A), method: "TKO", round, time: fmt(time), detail: "strikes" };
            }
        } else if (dmg >= 4.5) {
            pushEvent(log, round, time, corner(me, A), "strike", commentary.bigStrike(rng, me.name, them.name));
        }
    }
    return null;
}

function groundExchange({ rng, top, bottom, round, time, log, A }) {
    // Entry: the takedown itself is contested; a stuffed shot eats a counter.
    const tdOffense = effNow(top, "grappling", round);
    const tdDefense = effNow(bottom, "grappling", round) * 0.5 + effNow(bottom, "striking", round) * 0.35 + effNow(bottom, "conditioning", round) * 0.15;
    if (rng() * (tdOffense + tdDefense) >= tdOffense) {
        pushEvent(log, round, time, corner(bottom, A), "td-stuffed", commentary.takedownStuffed(rng, top.name, bottom.name));
        const counter = (effNow(bottom, "striking", round) * FIGHT.stuffedCounterScale) / 4;
        applyDamage(top, counter);
        bottom.roundDamage += counter;
        return null;
    }

    top.takedowns += 1;
    top.roundControl += FIGHT.takedownControl;
    pushEvent(log, round, time, corner(top, A), "takedown", commentary.takedown(rng, top.name, bottom.name));

    // Ground and pound.
    const gnp = (effNow(top, "striking", round) * 0.5 + effNow(top, "grappling", round) * 0.5) * FIGHT.groundStrikeScale / 4;
    applyDamage(bottom, gnp);
    top.roundDamage += gnp;
    if (bottom.health < FIGHT.koHealthThreshold && rng() < FIGHT.tkoChanceHurt * 0.6 * top.finishMult) {
        pushEvent(log, round, time, corner(top, A), "tko", commentary.tkoGround(rng, top.name, bottom.name), { finish: true });
        return { winner: corner(top, A), method: "TKO", round, time: fmt(time), detail: "ground strikes" };
    }

    // Submission hunt from top...
    if (rng() < FIGHT.subAttemptBase * (top.finishMult)) {
        top.subAttempts += 1;
        const sub = trySubmission(rng, top, bottom, round);
        pushEvent(log, round, time, corner(top, A), sub ? "sub" : "sub-attempt",
            sub ? commentary.submission(rng, top.name, bottom.name) : commentary.subEscape(rng, top.name, bottom.name),
            sub ? { finish: true } : undefined);
        if (sub) return { winner: corner(top, A), method: "SUB", round, time: fmt(time), detail: "submission" };
    }

    // ...and the BJJ-family threat off the back (GDD §7.2). An active guard
    // also neutralizes control on the cards — being on top of a submission
    // stylist is work, not rest.
    if (bottom.family === "submission") {
        bottom.roundControl += 1;
    }
    if (bottom.family === "submission" && rng() < FIGHT.subOffBackChance * bottom.finishMult) {
        bottom.subAttempts += 1;
        const sub = trySubmission(rng, bottom, top, round);
        pushEvent(log, round, time, corner(bottom, A), sub ? "sub" : "sub-attempt",
            sub ? commentary.submissionOffBack(rng, bottom.name, top.name) : commentary.subEscape(rng, bottom.name, top.name),
            sub ? { finish: true } : undefined);
        if (sub) return { winner: corner(bottom, A), method: "SUB", round, time: fmt(time), detail: "submission off the back" };
    }

    return null;
}

function trySubmission(rng, attacker, defender, round) {
    const edge = effNow(attacker, "submissions", round) - effNow(defender, "submissions", round) * 0.5;
    return rng() < Math.max(0.02, edge * FIGHT.subSuccessScale);
}

function applyDamage(c, dmg) {
    const absorbed = dmg / c.chinMult;
    c.health = Math.max(0, c.health - absorbed);
    c.totalDamage += absorbed;
    // Taking damage drains the tank too.
    c.gas = Math.max(0, c.gas - absorbed * 0.25);
}

// ── Scoring ─────────────────────────────────────────────────────────

function scoreRound(A, B, round) {
    const scoreA = A.roundDamage + A.roundControl;
    const scoreB = B.roundDamage + B.roundControl;
    if (scoreA >= scoreB) A.roundsWon += 1; else B.roundsWon += 1;
    A.scorecard.push(scoreA >= scoreB ? 10 : 9);
    B.scorecard.push(scoreB > scoreA ? 10 : 9);
}

function judgeDecision(rng, A, B, rounds) {
    if (A.roundsWon === B.roundsWon) {
        // Even card — damage DEALT breaks it (totalDamage stores absorbed, so
        // the fighter who took less wins); genuinely level is a draw.
        const diff = B.totalDamage - A.totalDamage;
        if (Math.abs(diff) < 2) return { winner: "draw", method: "DRAW", round: rounds };
        return { winner: diff > 0 ? "A" : "B", method: "SPLIT-DEC", round: rounds };
    }
    const winner = A.roundsWon > B.roundsWon ? "A" : "B";
    const margin = Math.abs(A.roundsWon - B.roundsWon);
    const split = margin === 1 && rng() < 0.35;
    return { winner, method: split ? "SPLIT-DEC" : "DEC", round: rounds };
}

// ── Log helpers ─────────────────────────────────────────────────────

function corner(c, A) { return c === A ? "A" : "B"; }

function pushEvent(log, round, seconds, actor, type, text, extra = {}) {
    log.push({ round, time: fmt(seconds), actor, type, text, ...extra });
}

function exchangeTime(round, ex) {
    // Spread exchanges across the round with a stable stagger.
    return Math.floor(((ex + 0.5) / FIGHT.exchangesPerRound) * FIGHT.roundMinutes * 60);
}

function fmt(seconds) {
    if (typeof seconds === "string") return seconds;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function groupRounds(log, totalRounds, outcome) {
    const rounds = [];
    const last = outcome.round ?? totalRounds;
    for (let r = 1; r <= last; r++) {
        rounds.push({ round: r, events: log.filter((e) => e.round === r) });
    }
    return rounds;
}

function r1(n) { return Math.round(n * 10) / 10; }

module.exports = { resolveFight };
