// Controlled combat and opportunity-cost comparison; never opens a database.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  engineInput,
} = require("../engine/careerEngine");
const {
  resolveFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const { CAREER } = require("../consts/career");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");
const samples = Number(process.argv[2] || 400);
assert.ok(Number.isInteger(samples) && samples >= 100 && samples <= 5000);
const directory = path.resolve(
  __dirname,
  "../output/mentoring-rebalance-2026-10-19",
);
fs.mkdirSync(directory, { recursive: true });
const keys = ["striking", "grappling", "submissions", "conditioning"],
  traits = Object.keys(CAREER.transferableTraits);
const rows = [];
const advance = (s, n) => {
  for (let i = 0; i < n; i++) {
    for (const f of s.fighters.filter((f) => f.camp?.needsReview))
      s = applyCommand(s, {
        type: "camp-review",
        fighterId: f.id,
        choice: "continue",
      });
    s = applyCommand(s, {
      type: "advance",
      confirmCosts: true,
      untilEvent: false,
    });
  }
  return s;
};
const copy = (x) => structuredClone(x);
for (const style of ["boxing", "wrestling", "bjj"]) {
  const base = createCareer({
    seed: "mentoring-balance-study:" + style,
    name: "Design experiment",
    style,
  });
  const f = base.fighters[0];
  f.stats = Object.fromEntries(keys.map((k) => [k, 50]));
  f.potential = Object.fromEntries(keys.map((k) => [k, 99]));
  f.traits = [];
  f.discoveredTraits = [];
  f.fatigue = 0;
  f.signatureId = "pace-keeper";
  const initial = engineInput(base, f),
    primary = STYLE_FAMILIES[STYLES[style].family].primaryStat;
  const training = new Map();
  for (const weeks of [2, 3, 4, 6])
    for (const focus of ["balanced", "focused"]) {
      const done = advance(
        applyCommand(base, {
          type: "camp",
          fighterId: f.id,
          weeks,
          preset: "balanced",
          allocations: Object.fromEntries(
            keys.map((k) => [
              k,
              focus === "balanced" ? 25 : k === primary ? 70 : 10,
            ]),
          ),
        }),
        weeks,
      );
      const input = engineInput(done, done.fighters[0]),
        lasting = copy(input);
      lasting.stats = copy(done.fighters[0].stats);
      lasting.fatigue = 0;
      training.set(`training-${focus}-${weeks}`, { immediate: input, lasting });
    }
  for (const stage of ["next-career-bout", "lasting-effects"]) {
    const variants = { baseline: copy(initial) };
    for (const [id, data] of training)
      variants[id] = copy(
        stage === "next-career-bout" ? data.immediate : data.lasting,
      );
    for (const trait of traits) {
      const input = copy(initial);
      input.traits = [trait];
      if (stage === "next-career-bout") input.stats[primary] += 2;
      variants[trait] = input;
    }
    const failure = copy(initial);
    if (stage === "next-career-bout") failure.stats[primary] += 2;
    variants["mentor-no-transfer"] = failure;
    for (const opponentStyle of ["boxing", "wrestling", "bjj"])
      for (const rounds of [3, 5])
        for (const pace of ["measured", "high"])
          for (const finish of ["hunt-finish", "play-safe"]) {
            const plan = {
              approach: style === "boxing" ? "strike" : "grapple",
              pace,
              finish,
              conserveBelow: 30,
            };
            const opponent = {
              ...copy(initial),
              style: opponentStyle,
              gameplan: {
                ...plan,
                approach: opponentStyle === "boxing" ? "strike" : "grapple",
              },
            };
            for (const [variant, input] of Object.entries(variants)) {
              const fighter = { ...input, gameplan: plan };
              let wins = 0,
                draws = 0,
                losses = 0;
              for (let sample = 0; sample < samples; sample++)
                for (const side of ["A", "B"]) {
                  const result = resolveFight({
                    a: side === "A" ? fighter : opponent,
                    b: side === "A" ? opponent : fighter,
                    rounds,
                    title: rounds === 5,
                    engineVersion: CURRENT_FIGHT_VERSION,
                    seed: `mentoring-v8:${style}:${opponentStyle}:${rounds}:${pace}:${finish}:${sample}`,
                  });
                  if (result.winner === side) wins++;
                  else if (result.winner === "draw") draws++;
                  else losses++;
                }
              rows.push({
                stage,
                style,
                opponentStyle,
                rounds,
                pace,
                finish,
                variant,
                wins,
                draws,
                losses,
              });
            }
          }
  }
}
function share(data) {
  const count = data.reduce((n, r) => n + r.wins + r.draws + r.losses, 0);
  return {
    games: count,
    score: data.reduce((n, r) => n + r.wins + r.draws / 2, 0) / count,
  };
}
const summary = [];
for (const stage of ["next-career-bout", "lasting-effects"])
  for (const variant of [...new Set(rows.map((r) => r.variant))]) {
    const result = share(
      rows.filter((r) => r.stage === stage && r.variant === variant),
    );
    const failure = share(
      rows.filter(
        (r) => r.stage === stage && r.variant === "mentor-no-transfer",
      ),
    ).score;
    summary.push({
      stage,
      variant,
      ...result,
      ...(traits.includes(variant)
        ? {
            expectedSameFamilyScore: 0.9 * result.score + 0.1 * failure,
            expectedCrossFamilyScore:
              stage === "lasting-effects"
                ? 0.7 * result.score + 0.3 * failure
                : null,
            compatibleWeeks:
              CAREER.transferableTraits[variant].compatibleWeeks ||
              CAREER.mentoring.compatibleWeeks,
            otherWeeks:
              CAREER.transferableTraits[variant].otherWeeks ||
              CAREER.mentoring.otherWeeks,
          }
        : {}),
    });
  }
// Each trait must retain a useful context without becoming an unbeatable pick.
for (const trait of traits) {
  const row = summary.find(
    (r) => r.stage === "lasting-effects" && r.variant === trait,
  );
  assert.ok(
    row.score < 0.7,
    trait + " must not dominate the broad equal-stat cohort",
  );
}
const slowThree = share(
  rows.filter(
    (r) =>
      r.stage === "lasting-effects" &&
      r.variant === "slow-starter" &&
      r.rounds === 3,
  ),
).score;
const slowFive = share(
  rows.filter(
    (r) =>
      r.stage === "lasting-effects" &&
      r.variant === "slow-starter" &&
      r.rounds === 5,
  ),
).score;
assert.ok(
  slowThree > 0.52,
  "Slow Starter must have useful three-round outcomes",
);
assert.ok(
  slowFive > slowThree + 0.02,
  "Longer fights should retain Slow Starter's main payoff",
);
const report = {
  combatVersion: CURRENT_FIGHT_VERSION,
  samplesPerContext: samples * 2,
  totalSimulatedFights: rows.reduce(
    (n, r) => n + r.wins + r.draws + r.losses,
    0,
  ),
  scope:
    "Pure synthetic 50-stat, age-23 learners, no coach/rooms, three own/opponent style families, 3/5 rounds, measured/high pace, hunt/safe finish, paired A/B seeds and Pace Keeper. Training uses real camps for equal-duration comparison, including recovery. Lasting comparisons use fully recovered fighters after preparation expires; next-bout comparisons retain the camp fatigue. Draws count as half. Trait expectations include failure; only the learner's combat output is measured, not the mentor's missed growth/purses or human retention. Cross-family lasting scores exclude the temporary preparation bonus. No saved account accessed.",
  summary,
  rows,
};
fs.writeFileSync(
  path.join(directory, "balance.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
