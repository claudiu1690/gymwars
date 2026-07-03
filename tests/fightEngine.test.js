const { test } = require("node:test");
const assert = require("node:assert");
const { resolveFight } = require("../engine/fightEngine");

function fighter(overrides = {}) {
    return {
        name: "Test Fighter",
        stats: { striking: 50, grappling: 50, submissions: 50, conditioning: 50 },
        style: "boxing",
        traits: [],
        fatigue: 0,
        gameplan: { approach: "balanced", pace: "measured", finish: "hunt-finish" },
        ...overrides,
    };
}

/** Win rate of A over N seeded fights (draws count half). */
function winRate(a, b, n, prefix = "wr") {
    let wins = 0;
    for (let i = 0; i < n; i++) {
        const r = resolveFight({ a, b, seed: `${prefix}-${i}` });
        if (r.winner === "A") wins += 1;
        else if (r.winner === "draw") wins += 0.5;
    }
    return wins / n;
}

test("same seed replays the identical fight", () => {
    const a = fighter({ name: "A" });
    const b = fighter({ name: "B", style: "wrestling" });
    const r1 = resolveFight({ a, b, seed: "replay" });
    const r2 = resolveFight({ a, b, seed: "replay" });
    assert.deepStrictEqual(r1, r2);
});

test("output shape: winner, method, rounds with events, totals", () => {
    const r = resolveFight({ a: fighter({ name: "A" }), b: fighter({ name: "B" }), seed: "shape" });
    assert.ok(["A", "B", "draw"].includes(r.winner));
    assert.ok(["KO", "TKO", "SUB", "DEC", "SPLIT-DEC", "DRAW"].includes(r.method));
    assert.ok(r.rounds.length >= 1 && r.rounds.length <= 3);
    assert.ok(r.rounds[0].events.length > 0);
    assert.ok(typeof r.totals.A.damage === "number");
});

test("all finish types occur across many seeds", () => {
    const methods = new Set();
    const a = fighter({ name: "A", stats: { striking: 70, grappling: 55, submissions: 65, conditioning: 60 }, style: "bjj" });
    const b = fighter({ name: "B", stats: { striking: 55, grappling: 60, submissions: 40, conditioning: 55 }, style: "wrestling" });
    for (let i = 0; i < 400; i++) {
        methods.add(resolveFight({ a, b, seed: `methods-${i}` }).method);
    }
    for (const m of ["KO", "TKO", "SUB"]) assert.ok(methods.has(m), `${m} never occurred in 400 fights`);
    assert.ok(methods.has("DEC") || methods.has("SPLIT-DEC"), "no decisions in 400 fights");
});

test("higher stats win clearly more often", () => {
    const strong = fighter({ name: "Strong", stats: { striking: 65, grappling: 65, submissions: 65, conditioning: 65 } });
    const weak = fighter({ name: "Weak", stats: { striking: 45, grappling: 45, submissions: 45, conditioning: 45 } });
    const wr = winRate(strong, weak, 300, "stats");
    assert.ok(wr > 0.75, `+20 stats should dominate, got ${wr}`);
});

test("favorable style matchup wins at equal stats, but not overwhelmingly", () => {
    const wrestler = fighter({ name: "Wrestler", style: "wrestling" });
    const striker = fighter({ name: "Striker", style: "boxing" });
    const wr = winRate(wrestler, striker, 600, "matchup");
    assert.ok(wr > 0.52 && wr < 0.72, `wrestling over striking should be a modest edge, got ${wr}`);
});

test("the trinity cycles: wrestling > striking > bjj > wrestling", () => {
    const mk = (style) => fighter({ name: style, style });
    assert.ok(winRate(mk("wrestling"), mk("boxing"), 400, "t1") > 0.5, "wrestling should beat striking");
    assert.ok(winRate(mk("boxing"), mk("bjj"), 400, "t2") > 0.5, "striking should beat bjj");
    assert.ok(winRate(mk("bjj"), mk("wrestling"), 400, "t3") > 0.5, "bjj should beat wrestling");
});

test("entering fatigued costs real win probability", () => {
    const fresh = fighter({ name: "Fresh" });
    const gassed = fighter({ name: "Gassed", fatigue: 80 });
    const wr = winRate(fresh, gassed, 300, "fatigue");
    assert.ok(wr > 0.62, `fresh vs 80-fatigue should be a clear edge, got ${wr}`);
});

test("a knockout artist's KO rate responds to the opponent's chin trait", () => {
    const banger = fighter({ name: "Banger", stats: { striking: 75, grappling: 40, submissions: 40, conditioning: 60 } });
    const koRateVs = (traits, prefix) => {
        let kos = 0;
        const chin = fighter({ name: "Chin", traits, stats: { striking: 50, grappling: 50, submissions: 50, conditioning: 55 } });
        for (let i = 0; i < 300; i++) {
            const r = resolveFight({ a: banger, b: chin, seed: `${prefix}-${i}` });
            if (r.winner === "A" && (r.method === "KO" || r.method === "TKO")) kos += 1;
        }
        return kos / 300;
    };
    const vsSuspect = koRateVs(["suspect-chin"], "chin-sus");
    const vsIron = koRateVs(["iron-chin"], "chin-iron");
    assert.ok(vsSuspect > vsIron, `suspect chin (${vsSuspect}) should get finished more than iron chin (${vsIron})`);
});
