const { test } = require("node:test");
const assert = require("node:assert");
const { computeCampResults, validateAllocations } = require("../services/campMath");
const { TRAINING } = require("../consts/training");

function fighter(overrides = {}) {
    return {
        stats: { striking: 40, grappling: 40, submissions: 40, conditioning: 40 },
        potential: { striking: 70, grappling: 70, submissions: 70, conditioning: 70 },
        careerPhase: "Prime",
        ...overrides,
    };
}

const EVEN = { striking: 25, grappling: 25, submissions: 25, conditioning: 25 };

test("allocation validation", () => {
    assert.strictEqual(validateAllocations(EVEN), null);
    assert.ok(validateAllocations({ striking: 100, grappling: 0, submissions: 0, conditioning: 0 }) === null);
    assert.ok(validateAllocations({ striking: 50, grappling: 30, submissions: 15, conditioning: 10 }) !== null); // 105
    assert.ok(validateAllocations({ striking: 25.5, grappling: 24.5, submissions: 25, conditioning: 25 }) !== null); // floats
    assert.ok(validateAllocations({ striking: 100 }) !== null);
    assert.ok(validateAllocations(null) !== null);
});

test("same seed → same results", () => {
    const a = computeCampResults(fighter(), EVEN, 6, "s1");
    const b = computeCampResults(fighter(), EVEN, 6, "s1");
    assert.deepStrictEqual(a, b);
    const c = computeCampResults(fighter(), EVEN, 6, "s2");
    assert.notDeepStrictEqual(a.gains, c.gains);
});

test("balanced camp gains in every trained stat, fatigue scales with weeks", () => {
    const r = computeCampResults(fighter(), EVEN, 6, "gains");
    for (const k of Object.keys(EVEN)) assert.ok(r.gains[k] > 0, `${k} did not gain`);
    assert.strictEqual(r.fatigueAdded, TRAINING.fatiguePerWeek * 6);
    const short = computeCampResults(fighter(), EVEN, 1, "gains");
    assert.ok(short.gains.striking < r.gains.striking, "short camp should gain less");
});

test("neglected stat (<15%) atrophies, harder the lower it is", () => {
    const alloc = { striking: 60, grappling: 30, submissions: 10, conditioning: 0 };
    const r = computeCampResults(fighter(), alloc, 6, "neglect");
    assert.ok(r.gains.submissions < 0, "10% should atrophy");
    assert.ok(r.gains.conditioning < 0, "0% should atrophy");
    assert.ok(r.gains.conditioning < r.gains.submissions, "0% should atrophy more than 10%");
    assert.ok(r.gains.striking > 0 && r.gains.grappling > 0);
});

test("gains cap at hidden potential", () => {
    const f = fighter({ potential: { striking: 41, grappling: 70, submissions: 70, conditioning: 70 } });
    const r = computeCampResults(f, { striking: 70, grappling: 15, submissions: 0, conditioning: 15 }, 8, "cap");
    assert.strictEqual(r.newStats.striking, 41);
    assert.ok(r.cappedAtPotential.includes("striking"));
});

test("career phase scales gains: Rising > Prime > Declining", () => {
    const rising = computeCampResults(fighter({ careerPhase: "Rising" }), EVEN, 6, "phase");
    const prime = computeCampResults(fighter({ careerPhase: "Prime" }), EVEN, 6, "phase");
    const declining = computeCampResults(fighter({ careerPhase: "Declining" }), EVEN, 6, "phase");
    const sum = (r) => Object.values(r.gains).reduce((a, b) => a + b, 0);
    assert.ok(sum(rising) > sum(prime));
    assert.ok(sum(prime) > sum(declining));
});

test("stats never exceed 99 or drop below 1", () => {
    const high = fighter({ stats: { striking: 98, grappling: 98, submissions: 98, conditioning: 98 }, potential: { striking: 99, grappling: 99, submissions: 99, conditioning: 99 } });
    const r = computeCampResults(high, EVEN, 8, "bounds");
    for (const v of Object.values(r.newStats)) assert.ok(v <= 99);
    const low = fighter({ stats: { striking: 1, grappling: 1, submissions: 1, conditioning: 1 } });
    const r2 = computeCampResults(low, { striking: 100, grappling: 0, submissions: 0, conditioning: 0 }, 8, "bounds2");
    for (const v of Object.values(r2.newStats)) assert.ok(v >= 1);
});
