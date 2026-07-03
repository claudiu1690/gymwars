const { test } = require("node:test");
const assert = require("node:assert");
const { coachGainMult, coachFightMult, scoutNoise, generateMarket } = require("../services/staffService");
const { evaluatePairing } = require("../services/mentoringService");
const { computeCampResults } = require("../services/campMath");
const { FACILITY_TIERS } = require("../consts/facilities");

test("facility tiers escalate: slots, recovery, cost", () => {
    for (let t = 2; t <= 4; t++) {
        assert.ok(FACILITY_TIERS[t].rosterSlots > FACILITY_TIERS[t - 1].rosterSlots);
        assert.ok(FACILITY_TIERS[t].cost > FACILITY_TIERS[t - 1].cost);
        assert.ok(FACILITY_TIERS[t].fatigueRecoveryMult >= FACILITY_TIERS[t - 1].fatigueRecoveryMult);
    }
    assert.ok(FACILITY_TIERS[4].winMilestone > 0, "tier 4 must be win-gated");
});

test("coach multipliers: motivation, prospect development, style chemistry", () => {
    const coach = { motivation: 80, tacticalIq: 60, prospectDev: 70, specialty: "wrestling" };
    const wrestler = { careerPhase: "Prime", style: "wrestling" };
    const risingWrestler = { careerPhase: "Rising", style: "judo" };
    const boxer = { careerPhase: "Prime", style: "boxing" };

    const inSpec = coachGainMult(coach, wrestler);
    const outSpec = coachGainMult(coach, boxer);
    assert.ok(inSpec > outSpec, "specialty chemistry should beat off-style");
    assert.ok(coachGainMult(coach, risingWrestler) > inSpec - 0.11, "Rising fighters get prospect-dev on top");
    assert.strictEqual(coachGainMult(null, wrestler), 1, "no coach → neutral");
    assert.ok(coachFightMult(coach) > 1 && coachFightMult(coach) < 1.1);
});

test("coach gainMult flows through camp results", () => {
    const fighter = {
        stats: { striking: 40, grappling: 40, submissions: 40, conditioning: 40 },
        potential: { striking: 90, grappling: 90, submissions: 90, conditioning: 90 },
        careerPhase: "Prime",
    };
    const alloc = { striking: 25, grappling: 25, submissions: 25, conditioning: 25 };
    const base = computeCampResults(fighter, alloc, 6, "coach-flow");
    const coached = computeCampResults(fighter, alloc, 6, "coach-flow", { gainMult: 1.2 });
    const sum = (r) => Object.values(r.gains).reduce((a, b) => a + b, 0);
    assert.ok(sum(coached) > sum(base), "coached camp should out-gain uncoached");
});

test("scout accuracy tightens report noise with a floor", () => {
    assert.strictEqual(scoutNoise(null, 18), 18);
    assert.ok(scoutNoise({ accuracy: 50 }, 18) < 18);
    assert.ok(scoutNoise({ accuracy: 100 }, 18) >= 6, "floor keeps some fog of war");
});

test("staff market is deterministic per gym+day and differs across gyms", () => {
    const now = new Date("2026-07-03T12:00:00Z");
    const a1 = generateMarket("gym-a", now);
    const a2 = generateMarket("gym-a", now);
    const b = generateMarket("gym-b", now);
    assert.deepStrictEqual(a1, a2);
    assert.notDeepStrictEqual(a1, b);
    assert.strictEqual(a1.filter((c) => c.role === "coach").length, 3);
});

test("mentoring pairing: transferable traits exclude owned and conflicting", () => {
    const mentor = { style: "wrestling", traits: ["killer-instinct", "iron-chin", "gym-rat"] };
    const junior = { style: "judo", traits: ["gym-rat", "suspect-chin"] };
    const evaluation = evaluatePairing(mentor, junior);
    // gym-rat owned; iron-chin conflicts with suspect-chin → only killer-instinct.
    assert.deepStrictEqual(evaluation.transferable, ["killer-instinct"]);
    assert.strictEqual(evaluation.compatible, true, "wrestling+judo are the same family");
    assert.strictEqual(evaluation.weeks, 8);
    assert.strictEqual(evaluation.successChance, 0.9);

    const crossFamily = evaluatePairing({ ...mentor, style: "boxing" }, junior);
    assert.strictEqual(crossFamily.compatible, false);
    assert.strictEqual(crossFamily.weeks, 12);
    assert.ok(crossFamily.successChance < 0.9);
});
