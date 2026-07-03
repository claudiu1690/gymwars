/**
 * Monte Carlo balance harness — DEVELOPMENT_PLAN Phase 3.
 *
 * Runs seeded fight batches across style matchups, stat gaps, fatigue, and
 * traits; prints win-rate matrices and finish distributions. This is how the
 * GDD's "draft, needs playtesting" numbers actually get tuned.
 *
 * Usage:  node scripts/simulate.js [N-per-cell]     (default 1000)
 */
const { resolveFight } = require("../engine/fightEngine");

const N = Number(process.argv[2]) || 1000;

function mk(name, style, level = 50, extra = {}) {
    return {
        name,
        style,
        stats: { striking: level, grappling: level, submissions: level, conditioning: level },
        traits: [],
        fatigue: 0,
        gameplan: { approach: "balanced", pace: "measured", finish: "hunt-finish" },
        ...extra,
    };
}

function batch(a, b, prefix) {
    let winsA = 0, draws = 0;
    const methods = {};
    for (let i = 0; i < N; i++) {
        const r = resolveFight({ a, b, seed: `${prefix}-${i}` });
        if (r.winner === "A") winsA += 1;
        else if (r.winner === "draw") draws += 1;
        methods[r.method] = (methods[r.method] || 0) + 1;
    }
    return { wrA: (winsA + draws / 2) / N, methods };
}

function pct(x) { return `${(x * 100).toFixed(1)}%`; }

console.log(`\n=== Gym Wars balance harness — ${N} fights per cell ===\n`);

// ── 1. Style matrix at equal stats ──────────────────────────────────
console.log("1) Style-family matrix, equal stats (row fighter's win rate):");
const styles = ["boxing", "wrestling", "bjj"];
const header = ["          ", ...styles.map((s) => s.padEnd(10))].join("");
console.log(header);
for (const rowS of styles) {
    const cells = styles.map((colS) => {
        if (rowS === colS) return "—".padEnd(10);
        const { wrA } = batch(mk("R", rowS), mk("C", colS), `mx-${rowS}-${colS}`);
        return pct(wrA).padEnd(10);
    });
    console.log(rowS.padEnd(10) + cells.join(""));
}
console.log("   target: favorable ≈ 55–65%\n");

// ── 2. Stat gaps, same style ────────────────────────────────────────
console.log("2) Stat-gap ladder (A=50+gap vs B=50, same style):");
for (const gap of [5, 10, 15, 20]) {
    const { wrA } = batch(mk("A", "boxing", 50 + gap), mk("B", "boxing", 50), `gap-${gap}`);
    console.log(`   +${String(gap).padEnd(3)} → ${pct(wrA)}`);
}
console.log("   target: +10 ≈ 65–75%, upsets stay possible\n");

// ── 3. Underdog with favorable style vs bigger stats ────────────────
console.log("3) Upset check — favorable style vs stat deficit (wrestler vs boxer):");
for (const gap of [5, 10, 15]) {
    const { wrA } = batch(mk("A", "wrestling", 50), mk("B", "boxing", 50 + gap), `upset-${gap}`);
    console.log(`   style edge vs +${String(gap).padEnd(3)} → wrestler ${pct(wrA)}`);
}
console.log("   target: style edge ≈ cancels ~5–8 stat points\n");

// ── 4. Finish distribution across varied matchups ───────────────────
console.log("4) Finish distribution (mixed styles/levels):");
{
    const agg = {};
    let total = 0;
    const pool = [
        [mk("A", "boxing", 60), mk("B", "wrestling", 55)],
        [mk("A", "bjj", 55), mk("B", "boxing", 60)],
        [mk("A", "muay-thai", 65), mk("B", "sambo", 60)],
        [mk("A", "judo", 45), mk("B", "boxing", 45)],
    ];
    pool.forEach(([a, b], idx) => {
        const { methods } = batch(a, b, `fin-${idx}`);
        for (const [m, c] of Object.entries(methods)) { agg[m] = (agg[m] || 0) + c; total += c; }
    });
    for (const [m, c] of Object.entries(agg).sort((x, y) => y[1] - x[1])) {
        console.log(`   ${m.padEnd(10)} ${pct(c / total)}`);
    }
    console.log("   target: finishes (KO+TKO+SUB) ≈ 35–60%, draws rare\n");
}

// ── 5. Fatigue + gameplan levers ────────────────────────────────────
console.log("5) Levers:");
{
    const { wrA: fat } = batch(mk("A", "boxing"), mk("B", "boxing", 50, { fatigue: 60 }), "lever-fatigue");
    console.log(`   fresh vs 60-fatigue           → ${pct(fat)}   (target 60–75%)`);
    const { wrA: safe } = batch(
        mk("A", "boxing", 50, { gameplan: { approach: "balanced", pace: "measured", finish: "hunt-finish" } }),
        mk("B", "boxing", 50, { gameplan: { approach: "balanced", pace: "measured", finish: "play-safe" } }),
        "lever-finish"
    );
    console.log(`   hunt-finish vs play-safe      → ${pct(safe)}   (informational)`);
    const { wrA: chin } = batch(
        mk("A", "boxing", 60),
        mk("B", "boxing", 50, { traits: ["iron-chin"] }),
        "lever-chin-iron"
    );
    const { wrA: sus } = batch(
        mk("A", "boxing", 60),
        mk("B", "boxing", 50, { traits: ["suspect-chin"] }),
        "lever-chin-sus"
    );
    console.log(`   +10 striker vs iron-chin      → ${pct(chin)}`);
    console.log(`   +10 striker vs suspect-chin   → ${pct(sus)}   (should exceed iron-chin line)`);
}
console.log();
