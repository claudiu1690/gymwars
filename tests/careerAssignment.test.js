const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createCareer, publicState } = require("../engine/careerEngine");
const helpers = import("../frontend/src/careerAssignment.mjs");
const start = () => publicState(createCareer({ seed: "assignment-design", name: "Clear Gym", style: "boxing" }));

test("readiness never implies a saved camp and fresh fighters can find their debut", async () => {
  const { assignmentFor, fighterNextAction } = await helpers;
  const s = start(), f = s.fighters[0];
  assert.equal(assignmentFor(s, f).label, "Resting this week");
  assert.equal(fighterNextAction(s, f).kind, "book");
  f.fatigue = 65;
  assert.equal(assignmentFor(s, f).kind, "rest");
  assert.equal(fighterNextAction(s, f).action, "Plan recovery");
});

test("due fight, camp checkpoint and mentoring have stable assignment priorities", async () => {
  const { assignmentFor, fighterNextAction } = await helpers;
  const s = start(), f = s.fighters[0];
  f.camp = { preset: "balanced", completed: 0, weeks: 4, endWeek: 4 };
  assert.equal(assignmentFor(s, f).label, "Camp assigned");
  f.camp.completed = 2;
  assert.equal(assignmentFor(s, f).label, "Camp 2/4 weeks");
  f.camp.needsReview = true;
  assert.equal(assignmentFor(s, f).label, "Check-in due");
  s.fights.push({ id: "due", fighterId: f.id, eventWeek: 0, status: "ready" });
  assert.equal(fighterNextAction(s, f).href, "/career/fight-night/due");
  s.fights[0].status = "scheduled";
  f.camp = null;
  assert.equal(fighterNextAction(s, f).action, "Review fight preparation");
  s.mentoring.push({ status: "active", mentorId: f.id, juniorId: "junior", endWeek: 6 });
  assert.equal(assignmentFor(s, f).href, "/career/gym/mentoring");
});

test("purchase runway uses remaining cash and new total upkeep without assumed income", async () => {
  const { investmentPreview } = await helpers;
  assert.deepEqual(investmentPreview({ cash: 1200, weeklyCost: 20 }, 450, 40), {
    cost: 450, cashAfterPurchase: 750, weeklyCostBefore: 20, weeklyCostAfter: 40, weeksCovered: 18,
  });
  assert.equal(investmentPreview({ cash: 80, weeklyCost: 20 }, 100).weeksCovered, 0);
});

test("matchup strip is factual and states a tied matchup without inventing an advantage", async () => {
  const { matchupRead } = await helpers;
  const s = start(), f = s.fighters[0];
  const equal = { stats: { ...f.stats } };
  assert.match(matchupRead(s, f, equal, 1).opening, /No current skill lead/);
  assert.match(matchupRead(s, f, equal, 1).time, /1 week until/);
  equal.stats.grappling += 10;
  assert.match(matchupRead(s, f, equal, 0).danger, /grappling/);
  assert.equal(matchupRead(s, f, equal, 0).time, "Fight night is here");
  assert.equal(matchupRead(s, f, equal, 0).danger, `grappling: ${f.stats.grappling} vs ${equal.stats.grappling}`);
});

test("career preparation counts weeks consistently, including this week and singular notice", async () => {
  const { daysUntil } = await import("../frontend/src/careerCalendar.mjs");
  const s = start();
  assert.equal(daysUntil(s, s.week), "This week");
  assert.equal(daysUntil(s, s.week + 1), "In 1 week");
  assert.equal(daysUntil(s, s.week + 4), "In 4 weeks");
});

test("all six starter disciplines have distinct short descriptions", async () => {
  const { starterStyles } = await import("../frontend/src/starterStyles.mjs");
  const { STYLES } = require("../consts/styles");
  assert.deepEqual(starterStyles.map((style) => style.id).sort(), Object.keys(STYLES).sort());
  assert.equal(new Set(starterStyles.map((style) => style.description)).size, 6);
  assert.ok(starterStyles.every((style) => style.description.length < 85));
});
