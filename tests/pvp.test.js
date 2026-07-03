const { test } = require("node:test");
const assert = require("node:assert");
const { eloDelta, PVP } = require("../consts/pvp");

test("elo: equal ratings, win → +K/2", () => {
    assert.strictEqual(eloDelta(1000, 1000, 1, 32), 16);
    assert.strictEqual(eloDelta(1000, 1000, 0, 32), -16);
    assert.strictEqual(eloDelta(1000, 1000, 0.5, 32), 0);
});

test("elo: beating a stronger gym pays more", () => {
    const upset = eloDelta(1000, 1150, 1, 32);
    const expected = eloDelta(1150, 1000, 1, 32);
    assert.ok(upset > expected, `upset ${upset} should exceed expected ${expected}`);
    assert.ok(upset >= 20, `+150 upset should pay well, got ${upset}`);
});

test("elo: symmetric zero-sum", () => {
    const dA = eloDelta(1100, 950, 1, 32);
    const dB = eloDelta(950, 1100, 0, 32);
    assert.strictEqual(dA, -dB);
});

test("config sanity: stakes never touch fighter records (documented invariant)", () => {
    // The PvP layer moves rating/purse/ranking only (GDD 9.6). This test pins
    // the config surface — if someone adds record stakes, they must come here.
    assert.ok(PVP.purse.calloutWin > 0);
    assert.ok(PVP.purse.gymWarLoss < 0);
    assert.ok(PVP.rankingPoints.calloutWin > 0);
    assert.ok(!("recordStakes" in PVP));
});
