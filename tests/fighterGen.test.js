const { test } = require("node:test");
const assert = require("node:assert");
const { generateFighter, scoutStatRanges } = require("../services/fighterGenService");
const { RARITY_TIERS, PITY_THRESHOLDS } = require("../consts/rarity");
const { STYLES } = require("../consts/styles");
const { WEIGHT_CLASSES } = require("../consts/weightClasses");

const STAT_KEYS = ["striking", "grappling", "submissions", "conditioning"];

test("same seed produces the identical fighter", () => {
    const a = generateFighter({ seed: "determinism-check" });
    const b = generateFighter({ seed: "determinism-check" });
    assert.deepStrictEqual(a, b);
});

test("different seeds diverge", () => {
    const a = generateFighter({ seed: "seed-a" });
    const b = generateFighter({ seed: "seed-b" });
    assert.notDeepStrictEqual(a.stats, b.stats);
});

test("stats and potential respect rarity bands, potential >= current", () => {
    for (const [tier, band] of Object.entries(RARITY_TIERS)) {
        for (let i = 0; i < 200; i++) {
            const f = generateFighter({ seed: `band-${tier}-${i}`, rarity: tier });
            for (const key of STAT_KEYS) {
                assert.ok(f.stats[key] >= band.statRoll[0], `${tier} ${key} below band`);
                assert.ok(f.stats[key] <= band.statRoll[1], `${tier} ${key} above band`);
                assert.ok(f.potential[key] >= f.stats[key], `${tier} ${key} potential < current`);
                assert.ok(f.potential[key] <= band.potential[1], `${tier} ${key} potential above ceiling`);
            }
        }
    }
});

test("generated fields come from the defined vocabularies", () => {
    for (let i = 0; i < 100; i++) {
        const f = generateFighter({ seed: `vocab-${i}` });
        assert.ok(STYLES[f.style], `unknown style ${f.style}`);
        assert.ok(WEIGHT_CLASSES[f.weightClass], `unknown class ${f.weightClass}`);
        assert.ok(f.traits.length >= 1 && f.traits.length <= 3);
        assert.ok(f.age >= 18 && f.age <= 28);
    }
});

test("pity forces the overdue tier", () => {
    const f = generateFighter({ seed: "pity-check", pity: { contender: PITY_THRESHOLDS.contender, elite: 0, legend: 0 } });
    assert.ok(RARITY_TIERS[f.rarity].order >= RARITY_TIERS.contender.order, `pity ignored: got ${f.rarity}`);
});

test("higher-tier pity outranks lower", () => {
    const f = generateFighter({ seed: "pity-legend", pity: { contender: 999, elite: 999, legend: PITY_THRESHOLDS.legend } });
    assert.strictEqual(f.rarity, "legend");
});

test("scout ranges contain the true stat and stay in bounds", () => {
    for (let i = 0; i < 200; i++) {
        const f = generateFighter({ seed: `range-${i}` });
        const ranges = scoutStatRanges(f);
        for (const key of STAT_KEYS) {
            const [lo, hi] = ranges[key];
            assert.ok(lo <= f.stats[key] && f.stats[key] <= hi, `true value outside range for ${key}`);
            assert.ok(lo >= 1 && hi <= 99);
        }
        // Re-reading the report never re-rolls it.
        assert.deepStrictEqual(scoutStatRanges(f), ranges);
    }
});

test("rarity odds roughly match the config over a large sample", () => {
    const counts = { journeyman: 0, prospect: 0, contender: 0, elite: 0, legend: 0 };
    const N = 20000;
    for (let i = 0; i < N; i++) counts[generateFighter({ seed: `odds-${i}` }).rarity]++;
    assert.ok(Math.abs(counts.journeyman / N - 0.55) < 0.02, `journeyman ${counts.journeyman / N}`);
    assert.ok(Math.abs(counts.prospect / N - 0.30) < 0.02, `prospect ${counts.prospect / N}`);
    assert.ok(Math.abs(counts.contender / N - 0.11) < 0.015, `contender ${counts.contender / N}`);
    assert.ok(Math.abs(counts.elite / N - 0.035) < 0.01, `elite ${counts.elite / N}`);
    assert.ok(counts.legend > 0, "legend never rolled in 20k");
});
