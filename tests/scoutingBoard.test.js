const { test } = require("node:test");
const assert = require("node:assert");
const { generateProspectIdentity, completeProspect } = require("../services/fighterGenService");
const { RARITY_TIERS, PITY_THRESHOLDS } = require("../consts/rarity");
const { STYLES } = require("../consts/styles");
const { WEIGHT_CLASSES } = require("../consts/weightClasses");

const STAT_KEYS = ["striking", "grappling", "submissions", "conditioning"];

test("identity is deterministic per seed — the board never drifts", () => {
    const a = generateProspectIdentity({ seed: "board:g1:2026-07-03:0" });
    const b = generateProspectIdentity({ seed: "board:g1:2026-07-03:0" });
    assert.deepStrictEqual(a, b);
});

test("identities differ across slots, days, and gyms", () => {
    const base = generateProspectIdentity({ seed: "board:g1:2026-07-03:0" });
    const otherSlot = generateProspectIdentity({ seed: "board:g1:2026-07-03:1" });
    const otherDay = generateProspectIdentity({ seed: "board:g1:2026-07-04:0" });
    const otherGym = generateProspectIdentity({ seed: "board:g2:2026-07-03:0" });
    for (const other of [otherSlot, otherDay, otherGym]) {
        assert.notDeepStrictEqual({ n: base.name, w: base.weightClass, s: base.style, a: base.age },
            { n: other.name, w: other.weightClass, s: other.style, a: other.age });
    }
});

test("identity carries only shallow fields — no stats, rarity, or traits", () => {
    const identity = generateProspectIdentity({ seed: "shallow-check" });
    assert.ok(!("stats" in identity) && !("rarity" in identity) && !("traits" in identity) && !("potential" in identity));
    assert.ok(STYLES[identity.style] && WEIGHT_CLASSES[identity.weightClass]);
    assert.ok(identity.age >= 18 && identity.age <= 28);
});

test("completion preserves the identity and respects rarity bands", () => {
    for (let i = 0; i < 100; i++) {
        const identity = generateProspectIdentity({ seed: `complete-${i}` });
        const full = completeProspect(identity, { pity: { contender: 0, elite: 0, legend: 0 } });
        assert.strictEqual(full.name, identity.name);
        assert.strictEqual(full.weightClass, identity.weightClass);
        assert.strictEqual(full.style, identity.style);
        const band = RARITY_TIERS[full.rarity];
        for (const key of STAT_KEYS) {
            assert.ok(full.stats[key] >= band.statRoll[0] && full.stats[key] <= band.statRoll[1]);
            assert.ok(full.potential[key] >= full.stats[key] && full.potential[key] <= band.potential[1]);
        }
        assert.ok(full.traits.length >= 1 && full.traits.length <= 3);
    }
});

test("completion is deterministic given the same pity state", () => {
    const identity = generateProspectIdentity({ seed: "det-complete" });
    const a = completeProspect(identity, { pity: { contender: 3, elite: 0, legend: 0 } });
    const b = completeProspect(identity, { pity: { contender: 3, elite: 0, legend: 0 } });
    assert.deepStrictEqual(a, b);
});

test("pity forces the overdue tier at investigation time", () => {
    const identity = generateProspectIdentity({ seed: "pity-board" });
    const full = completeProspect(identity, { pity: { contender: PITY_THRESHOLDS.contender, elite: 0, legend: 0 } });
    assert.ok(RARITY_TIERS[full.rarity].order >= RARITY_TIERS.contender.order, `pity ignored: ${full.rarity}`);
});
