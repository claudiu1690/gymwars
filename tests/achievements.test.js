const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { ACHIEVEMENTS, LOOKS } = require("../consts/achievements");
const { project } = require("../engine/achievements"),
  {
    createCareer,
    applyCommand,
    publicState,
  } = require("../engine/careerEngine");
const initial = () =>
    createCareer({ seed: "achievements-test", name: "Earned Corner" }),
  act = (s, type, body = {}) => applyCommand(s, { type, ...body });
test("every achievement has a distinct cosmetic, a description and a useful action; no look has a price", () => {
  assert.equal(ACHIEVEMENTS.length, 31);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 31);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.lookId)).size, 31);
  assert.ok(
    ACHIEVEMENTS.every(
      (a) =>
        a.description &&
        a.href &&
        a.target > 0 &&
        LOOKS.some((l) => l.id === a.lookId),
    ),
  );
  assert.ok(
    LOOKS.every((l) => l.priceMinor === undefined && l.cost === undefined),
  );
});
test("cosmetic rewards follow the actual Career Path deeds and challenge trophies, without claiming them twice", () => {
  let s = initial();
  assert.equal(project(s).earnedCount, 0);
  s.gymGoals = {
    "title-defense": { week: 3 },
    "team-trophy": { week: 6 },
    successor: { week: 8 },
    "division-dynasty": { week: 9 },
  };
  s.careerChallenges = {
    "national-showcase": { week: 10 },
    "next-generation": { week: 11 },
    "world-open": { week: 12 },
  };
  const before = structuredClone(s),
    view = project(s);
  assert.deepEqual(s, before);
  for (const a of view.achievements.filter((a) =>
    [
      "quest-title-defense",
      "quest-team-trophy",
      "quest-successor",
      "world-stage",
      "trophy-national-showcase",
      "trophy-next-generation",
      "trophy-world-open",
    ].includes(a.id),
  ))
    assert.equal(a.earned, true, a.id);
  s = act(s, "plan", { fighterId: "starter", plan: s.fighters[0].gameplan });
  const earned = structuredClone(s.achievements.earned);
  s.gymGoals = {};
  s.careerChallenges = {};
  s = act(s, "plan", { fighterId: "starter", plan: s.fighters[0].gameplan });
  for (const id of Object.keys(earned)) assert.ok(s.achievements.earned[id]);
  assert.equal(
    publicState(s).achievementRewards.filter((a) => a.questId).length,
    6,
  );
  assert.equal(
    publicState(s).achievementRewards.filter((a) => a.challengeId).length,
    3,
  );
});
test("only full camps count and counters survive repeat camps and cancellation", () => {
  let s = initial();
  for (let i = 0; i < 3; i++) {
    s = act(s, "camp", { fighterId: "starter", preset: "balanced", weeks: 1 });
    assert.equal(
      project(s).achievements.find((a) => a.id === "three-camps").earned,
      false,
    );
    s = act(s, "advance", { confirmCosts: true });
  }
  assert.equal(s.achievementStats.camps, 3);
  assert.equal(
    project(s).achievements.find((a) => a.id === "three-camps").earned,
    true,
  );
  s = act(s, "camp", { fighterId: "starter", preset: "pressure", weeks: 4 });
  s = act(s, "cancel-camp", { fighterId: "starter" });
  assert.equal(s.achievementStats.camps, 3);
});
test("legacy looks are preserved without fabricating completed achievements; immutable war records count across seasons", () => {
  const s = initial(),
    wars = Array.from({ length: 3 }, (_, i) => ({
      id: "card-" + i,
      result: {
        outcome: "win",
        opponentId: "rival-" + i,
        strengthGap: 0,
        pointsEarned: 3,
      },
    }));
  const view = project(s, wars, ["lotus"]);
  assert.equal(view.looks.find((l) => l.id === "lotus").legacy, true);
  assert.equal(view.achievements.find((a) => a.id === "mentor").earned, false);
  assert.equal(
    view.achievements.find((a) => a.id === "close-rivals").earned,
    true,
  );
  const weak = project(
    s,
    wars.map((w) => ({ ...w, result: { ...w.result, strengthGap: -20 } })),
  );
  assert.equal(
    weak.achievements.find((a) => a.id === "close-rivals").earned,
    false,
  );
});
