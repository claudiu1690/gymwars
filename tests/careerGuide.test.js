const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
} = require("../engine/careerEngine");
const guideModule = import("../frontend/src/careerGuide.mjs");
const start = () =>
  createCareer({
    seed: "onboarding-test",
    name: "Guided Gym",
    style: "boxing",
  });
test("coach takes a fresh save through booking, training, recovery and the opening fight", async () => {
  const { careerGuide, bookingWeeks, advanceEstimate } = await guideModule;
  let s = start(),
    view = publicState(s);
  assert.equal(careerGuide(view).kind, "book");
  assert.equal(bookingWeeks(view, view.fighters[0]), 2);
  s = applyCommand(s, {
    type: "book",
    fighterId: "starter",
    opponentId: view.fighters[0].offers[0].id,
    weeks: 2,
  });
  assert.equal(careerGuide(publicState(s)).kind, "train");
  s = applyCommand(s, {
    type: "camp",
    fighterId: "starter",
    weeks: 1,
    preset: "balanced",
  });
  assert.equal(careerGuide(publicState(s)).kind, "advance");
  assert.equal(careerGuide(publicState(s)).step, 1);
  assert.equal(advanceEstimate(publicState(s)), 1);
  s = applyCommand(s, {
    type: "advance",
    untilEvent: true,
    confirmCosts: true,
  });
  assert.equal(careerGuide(publicState(s)).step, 2);
  assert.equal(advanceEstimate(publicState(s)), 1);
  s = applyCommand(s, {
    type: "advance",
    untilEvent: true,
    confirmCosts: true,
  });
  assert.equal(careerGuide(publicState(s)).kind, "fight");
  const saved = JSON.parse(JSON.stringify(s));
  assert.deepEqual(
    careerGuide(publicState(saved)),
    careerGuide(publicState(s)),
  );
});
test("coach prioritizes blocking fights/reviews and respects unfunded and mentoring saves", async () => {
  const { careerGuide, advanceEstimate } = await guideModule;
  let s = start();
  s = applyCommand(s, {
    type: "camp",
    fighterId: "starter",
    weeks: 4,
    preset: "balanced",
  });
  assert.equal(advanceEstimate(publicState(s)), 2);
  s = applyCommand(s, {
    type: "advance",
    untilEvent: true,
    confirmCosts: true,
  });
  assert.equal(careerGuide(publicState(s)).kind, "camp-review");
  let v = publicState(start());
  v.cash = 0;
  v.fights = [
    { id: "due", status: "scheduled", fighterId: "starter", eventWeek: 4 },
  ];
  assert.equal(careerGuide(v).step, 2);
  assert.equal(advanceEstimate(v), 1);
  v.fights = [];
  v.mentoring = [
    { status: "active", mentorId: "starter", juniorId: "other", endWeek: 8 },
  ];
  assert.equal(careerGuide(v).kind, "advance");
  v.fights = [{ id: "ready", status: "ready" }];
  assert.equal(careerGuide(v).kind, "fight");
});
test("a completed camp does not send the player back into endless training", async () => {
  const { careerGuide, bookingWeeks } = await guideModule;
  const v = publicState(start());
  v.week = 5;
  v.fighters[0].lastCamp = { endedWeek: 5 };
  v.fights = [
    { id: "bout-1", fighterId: "starter", status: "resolved", resolvedWeek: 2 },
    { id: "bout-2", fighterId: "starter", status: "scheduled", eventWeek: 8 },
  ];
  assert.equal(careerGuide(v).step, 2);
  v.fights = [];
  v.fighters[0].fatigue = 45;
  v.boutsCompleted = 1;
  assert.equal(careerGuide(v).untilEvent, false);
  v.fighters[0].nextBoutWeek = 9;
  assert.equal(bookingWeeks(v, v.fighters[0]), 4);
});

test("coach introduces the team finale after a regional title without replacing blocking fights", async () => {
  const { careerGuide } = await guideModule;
  const s = start();
  s.fighters[0].championships = [{ wonWeek: 0, defenses: 0 }];
  let view = publicState(s);
  assert.equal(careerGuide(view).kind, "journey");
  assert.equal(careerGuide(view).href, "/career/scouting");
  for (let i = 1; i <= 2; i++)
    s.fighters.push({ ...structuredClone(s.fighters[0]), id: `teammate-${i}` });
  view = publicState(s);
  assert.equal(careerGuide(view).href, "/career/campaign");
  view.fights.push({ id: "ready", status: "ready", fighterId: "starter" });
  assert.equal(careerGuide(view).kind, "fight");
});

test("after the debut the main objective builds missing divisions without hiding due fights or spending scouts automatically", async () => {
  const { careerGuide } = await guideModule;
  const s = publicState(start());
  s.boutsCompleted = 1;
  const guide = careerGuide(s);
  assert.equal(guide.kind, "recruit-team");
  assert.match(guide.href, /^\/career\/scouting\?division=/);
  assert.match(guide.body, /any rarity qualifies/);
  s.scoutsUsed = s.rules.scoutsPerWeek;
  assert.equal(careerGuide(s).kind, "advance");
  s.fighters = Array.from({ length: 4 }, (_, i) => ({ ...structuredClone(s.fighters[0]), id: `same-class-${i}` }));
  assert.equal(careerGuide(s).href, "/career/roster");
  s.fights.push({ id: "due", status: "ready" });
  assert.equal(careerGuide(s).kind, "fight");
});

test("unaffordable investigated teammates point to a purse rather than falsely exhausting scouts", async () => {
  const { careerGuide } = await guideModule;
  const s = publicState(start());
  s.boutsCompleted = 1;
  s.cash = 10;
  s.board.forEach((report) => { report.investigated = true; report.fee = 400; });
  assert.ok(s.scoutsUsed < s.rules.scoutsPerWeek);
  const guide = careerGuide(s);
  assert.equal(guide.kind, "book");
  assert.equal(guide.id, s.fighters[0].id);
  assert.match(guide.body, /career purse/);
  assert.doesNotMatch(guide.body, /investigations are used/);
  s.fighters[0].offers = [];
  assert.equal(careerGuide(s).kind, "advance");
  assert.doesNotMatch(careerGuide(s).body, /investigations are used/);
});
