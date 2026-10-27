const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
  engineInput,
} = require("../engine/careerEngine");
const {
  beginFight,
  resolveFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const { createRng } = require("../utils/rng");
function start(trait = "iron-chin", seed = "mentoring-v3") {
  let s = createCareer({ seed, name: "Lesson test", style: "boxing" });
  s.boutsCompleted = 1;
  s = applyCommand(s, { type: "veteran" });
  s.fighters[0].traits = s.fighters[0].discoveredTraits = [];
  const m = s.fighters.find((f) => f.id === "veteran");
  m.traits = [trait];
  m.discoveredTraits = [trait];
  return s;
}
const command = (s, type, fields = {}) => applyCommand(s, { type, ...fields });
const lesson = (s) =>
  publicState(s).mentoringOptions.find((o) => o.juniorId === "starter");
function advance(s, n) {
  for (let i = 0; i < n; i++) s = command(s, "advance", { confirmCosts: true });
  return s;
}

test("specialist lessons cost two or three weeks while the stronger general lessons retain their terms", () => {
  for (const trait of [
    "iron-chin",
    "killer-instinct",
    "slow-starter",
    "fast-starter",
    "cardio-machine",
  ]) {
    const short = ["iron-chin", "killer-instinct"].includes(trait);
    let s = start(trait),
      option = lesson(s);
    assert.equal(option.weeks, short ? 2 : 4);
    assert.equal(option.chance, 0.9);
    assert.equal(
      option.budget.commitmentCost,
      option.weeks * publicState(s).weeklyCost,
    );
    assert.ok(option.trainingAlternative.estimatedTotalGrowth >= 0);
    assert.ok(option.effect && option.bestFor);
    const paired = command(s, "mentor", option);
    assert.equal(paired.mentoring[0].weeks, option.weeks);
    assert.equal(paired.mentoring[0].endWeek, option.weeks);
    assert.equal(paired.mentoring[0].lessonVersion, 3);
    assert.throws(
      () =>
        command(paired, "camp", {
          fighterId: "starter",
          weeks: 2,
          preset: "balanced",
        }),
      /existing training commitment/,
    );
    s.fighters[0].style = "bjj";
    option = lesson(s);
    assert.equal(option.weeks, short ? 3 : 6);
    assert.equal(option.chance, 0.7);
  }
});

test("an interrupted or failed specialist lesson does not grant an unearned trait or permanent stat growth", () => {
  let seed;
  for (let i = 0; i < 100; i++)
    if (createRng(`failed-specialist:${i}:mentor:pair-0`)() >= 0.9) {
      seed = `failed-specialist:${i}`;
      break;
    }
  assert.ok(seed);
  const s = start("iron-chin", seed),
    stats = structuredClone(s.fighters[0].stats);
  const paired = command(s, "mentor", lesson(s)),
    done = advance(paired, 2);
  assert.equal(done.mentoring[0].status, "completed");
  assert.deepEqual(done.fighters[0].stats, stats);
  assert.equal(done.fighters[0].traits.includes("iron-chin"), false);
  assert.equal(done.fighters[0].mentoringPreparation.value, 2);
  assert.equal(
    engineInput(done, done.fighters[0]).stats.striking,
    stats.striking + 2,
  );
  const empty = structuredClone(paired);
  empty.cash = 0;
  const interrupted = advance(empty, 2);
  assert.equal(interrupted.mentoring[0].status, "interrupted");
  assert.equal(interrupted.fighters[0].mentoringPreparation, undefined);
});

test("saved lessons retain their original duration, chance and completion reward", () => {
  let s = start();
  s = command(s, "mentor", lesson(s));
  Object.assign(s.mentoring[0], {
    weeks: 4,
    endWeek: 4,
    lessonVersion: 2,
    chance: 0.7,
    preparation: { stat: "grappling", value: 3, expiresAfterWeeks: 6 },
  });
  s = advance(s, 2);
  assert.equal(s.mentoring[0].status, "active");
  assert.equal(s.mentoring[0].endWeek, 4);
  assert.equal(s.mentoring[0].chance, 0.7);
  s = advance(s, 2);
  assert.deepEqual(s.fighters[0].mentoringPreparation, {
    stat: "grappling",
    value: 3,
    expiresWeek: 10,
    source: "mentoring",
  });
});

test("training comparisons use observed growth limits without disclosing hidden potential", () => {
  const s = start(),
    hidden = structuredClone(s);
  for (const key of Object.keys(hidden.fighters[0].potential))
    hidden.fighters[0].potential[key] = hidden.fighters[0].stats[key];
  assert.deepEqual(
    lesson(s).trainingAlternative,
    lesson(hidden).trainingAlternative,
  );
  for (const key of Object.keys(hidden.fighters[0].stats))
    hidden.fighters[0].growthKnowledge = {
      ...(hidden.fighters[0].growthKnowledge || {}),
      [key]: { plateau: true, observedAt: hidden.fighters[0].stats[key] },
    };
  assert.equal(lesson(hidden).trainingAlternative.estimatedTotalGrowth, 0);
});

test("new Slow Starter keeps an opening weakness and rallies from round two; accepted v7 fights keep old timing", () => {
  assert.equal(CURRENT_FIGHT_VERSION, 8);
  const fighter = {
    name: "Learner",
    style: "boxing",
    stats: { striking: 50, grappling: 50, submissions: 50, conditioning: 50 },
    traits: ["slow-starter"],
    signatureId: "pace-keeper",
  };
  const input = {
    a: fighter,
    b: { ...fighter, traits: [] },
    seed: "round-timing",
  };
  const old = beginFight({ ...input, engineVersion: 7 }),
    next = beginFight({ ...input, engineVersion: 8 });
  assert.equal(old.A.round1Mult, 0.9);
  assert.equal(old.A.lateMult, 1.06);
  assert.equal(old.A.lateStartRound, undefined);
  assert.equal(next.A.round1Mult, 0.95);
  assert.equal(next.A.lateMult, 1.08);
  assert.equal(next.A.lateStartRound, 2);
  const saved = resolveFight({ ...input, engineVersion: 7 });
  assert.deepEqual(resolveFight({ ...input, engineVersion: 7 }), saved);
  assert.notDeepEqual(resolveFight({ ...input, engineVersion: 8 }), saved);
  for (let i = 0; i < 40; i++) {
    const unchanged = {
      ...input,
      seed: `no-slow-starter:${i}`,
      a: { ...fighter, traits: ["iron-chin"] },
    };
    assert.deepEqual(
      resolveFight({ ...unchanged, engineVersion: 8 }),
      resolveFight({ ...unchanged, engineVersion: 7 }),
    );
  }
});

test("a learned-trait change enables defense publication without exposing the trait itself", async () => {
  const { defenseMatches, warDivisions } =
    await import("../frontend/src/careerCompetition.mjs");
  const fighters = warDivisions.map((weightClass, i) => ({
    id: `f-${i}`,
    weightClass,
    stats: { striking: 50 },
    gameplan: { pace: "measured" },
    defenseTraitsCurrent: true,
  }));
  const saved = { lineup: structuredClone(fighters) };
  assert.equal(defenseMatches(saved, fighters), true);
  fighters[0].defenseTraitsCurrent = false;
  assert.equal(defenseMatches(saved, fighters), false);
  fighters[0].defenseTraitsCurrent = true;
  assert.equal(defenseMatches(saved, fighters), true);
});
