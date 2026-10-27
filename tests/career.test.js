const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
  offers,
  forecast,
  replay,
  automatic,
} = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");
const start = (seed = "career-tests") =>
  createCareer({ seed, name: "Test Gym", style: "boxing" });
const apply = (s, type, rest = {}) => applyCommand(s, { type, ...rest });
function ready(seed = "career-tests") {
  let s = start(seed);
  const f = s.fighters[0];
  s = apply(s, "book", {
    fighterId: f.id,
    opponentId: offers(s, f)[0].id,
    weeks: 1,
  });
  return apply(s, "advance", { confirmCosts: true });
}
test("career is deterministic, and reading never advances time or reveals hidden values", () => {
  const s = start(),
    before = JSON.stringify(s);
  assert.deepEqual(s, start());
  const view = publicState(s);
  assert.equal(JSON.stringify(s), before);
  assert.equal(view.week, 0);
  assert.equal(view.seed, undefined);
  assert.equal(view.fighters[0].potential, undefined);
  assert.equal(view.fighters[0].traits, undefined);
  assert.equal(view.board[0].fighter.stats, undefined);
  assert.equal(view.board[0].fighter.rarity, undefined);
});
test("scouting spends two investigations, signing is one-time and roster capped", () => {
  let s = start();
  const ids = s.board.map((r) => r.id);
  s = apply(s, "investigate", { reportId: ids[0] });
  s = apply(s, "sign", { reportId: ids[0] });
  assert.equal(s.cash, 1600);
  assert.throws(() => apply(s, "sign", { reportId: ids[0] }));
  s = apply(s, "investigate", { reportId: ids[1] });
  s = apply(s, "sign", { reportId: ids[1] });
  assert.throws(() => apply(s, "investigate", { reportId: ids[2] }));
  s = apply(s, "advance", { confirmCosts: true });
  s = apply(s, "investigate", { reportId: s.board[0].id });
  s = apply(s, "sign", { reportId: s.board[0].id });
  s = apply(s, "investigate", { reportId: s.board[1].id });
  assert.throws(
    () => apply(s, "sign", { reportId: s.board[1].id }),
    /roster is full/,
  );
});
test("weekly training and fatigue arrive together; camp-ending week includes no rest", () => {
  let s = start(),
    f = s.fighters[0],
    statsBefore = { ...f.stats };
  s = apply(s, "book", {
    fighterId: f.id,
    opponentId: offers(s, f)[0].id,
    weeks: 1,
  });
  const projected = forecast(
    s,
    s.fighters[0],
    CAREER.presets.balanced.allocations,
    1,
  );
  assert.equal(projected.restWeeks, 0);
  assert.equal(projected.readiness, 91);
  s = apply(s, "camp", { fighterId: f.id, preset: "balanced", weeks: 1 });
  s = apply(s, "advance", { confirmCosts: true });
  f = s.fighters[0];
  assert.equal(f.fatigue, 9);
  assert.equal(f.camp, null);
  assert.ok(f.stats.striking > statsBefore.striking);
  assert.equal(s.fights[0].readiness.you, 91);
  assert.equal(s.fights[0].status, "ready");
});
test("next event stops at camp midpoint, taper trades away remaining gains", () => {
  let s = apply(start(), "camp", {
    fighterId: "starter",
    preset: "defense",
    weeks: 6,
  });
  s = apply(s, "advance", { untilEvent: true, confirmCosts: true });
  assert.equal(s.week, 3);
  assert.ok(s.fighters[0].camp.needsReview);
  assert.throws(() => apply(s, "advance", { confirmCosts: true }), /midpoint/);
  const fatigue = s.fighters[0].fatigue,
    oldStats = { ...s.fighters[0].stats };
  s = apply(s, "camp-review", { fighterId: "starter", choice: "taper" });
  s = apply(s, "advance", { confirmCosts: true });
  assert.equal(s.fighters[0].fatigue, Math.max(0, fatigue - 18));
  assert.deepEqual(s.fighters[0].stats, oldStats);
  assert.equal(s.fighters[0].preparation, null);
});
test("invalid commands leave original state untouched and cannot overlap commitments", () => {
  const s = ready(),
    old = JSON.stringify(s);
  assert.throws(() =>
    apply(s, "camp", { fighterId: "starter", preset: "balanced", weeks: 1 }),
  );
  assert.throws(() => apply(s, "advance", { confirmCosts: true }));
  assert.equal(JSON.stringify(s), old);
  const f = start();
  assert.throws(() =>
    apply(f, "camp", {
      fighterId: "starter",
      preset: "defense",
      weeks: 1,
      allocations: CAREER.presets.balanced.allocations,
    }),
  );
});
test("automatic and attended identical instructions produce identical results and purses", () => {
  for (let i = 0; i < 30; i++) {
    let s = ready(`parity-${i}`);
    const auto = apply(s, "auto-fight", {
      fightId: s.fights[0].id,
      expectedRound: 0,
    });
    while (s.fights[0].status !== "resolved") {
      const b = s.fights[0],
        state = replay(b),
        p = automatic(b.inputs.a.gameplan, state.A);
      s = apply(s, "round", {
        fightId: b.id,
        expectedRound: b.decisions.length,
        plan: p,
      });
      s = JSON.parse(JSON.stringify(s)); // process restart: reconstruct from stored seed/history
    }
    assert.deepEqual(s.fights[0].result, auto.fights[0].result);
    assert.equal(s.cash, auto.cash);
    assert.deepEqual(s.fighters[0].record, auto.fighters[0].record);
  }
});
test("duplicate/stale round cannot pay twice or change an observed decision", () => {
  let s = ready();
  s = apply(s, "round", { fightId: s.fights[0].id, expectedRound: 0 });
  assert.throws(
    () => apply(s, "round", { fightId: s.fights[0].id, expectedRound: 0 }),
    /already played/,
  );
  if (s.fights[0].status !== "resolved")
    s = apply(s, "auto-fight", {
      fightId: s.fights[0].id,
      expectedRound: s.fights[0].decisions.length,
    });
  const cash = s.cash;
  assert.throws(() =>
    apply(s, "auto-fight", {
      fightId: s.fights[0].id,
      expectedRound: s.fights[0].decisions.length,
    }),
  );
  assert.equal(s.cash, cash);
  assert.equal(
    s.fighters[0].record.wins +
      s.fighters[0].record.losses +
      s.fighters[0].record.draws,
    1,
  );
});
test("specialized preparation is temporary and consumed by the next bout", () => {
  let s = start(),
    f = s.fighters[0];
  s = apply(s, "book", {
    fighterId: f.id,
    opponentId: offers(s, f)[0].id,
    weeks: 2,
  });
  s = apply(s, "camp", { fighterId: f.id, preset: "defense", weeks: 1 });
  s = apply(s, "advance", { confirmCosts: true });
  assert.equal(s.fighters[0].preparation.value, 3);
  s = apply(s, "advance", { confirmCosts: true });
  assert.equal(
    s.fights[0].inputs.a.stats.grappling,
    s.fighters[0].stats.grappling + 3,
  );
  s = apply(s, "auto-fight", { fightId: s.fights[0].id, expectedRound: 0 });
  assert.equal(s.fighters[0].preparation, null);
});
test("operating costs stop free calendar farming and cash cannot become negative", () => {
  let s = start();
  s.cash = 10;
  s = apply(s, "advance", { confirmCosts: true });
  assert.equal(s.cash, 0);
  assert.equal(s.lastAdvance.waived, 10);
  for (let i = 0; i < 52; i++) s = apply(s, "advance", { confirmCosts: true });
  assert.equal(s.cash, 0);
  assert.equal(s.scoutsUsed, 0);
  assert.ok(s.fighters[0].age > 24);
  assert.ok(s.rivals.some((r) => r.record.wins > 12));
  const f = s.fighters[0];
  s = apply(s, "book", {
    fighterId: f.id,
    opponentId: offers(s, f)[0].id,
    weeks: 1,
  });
  s = apply(s, "advance", { confirmCosts: true });
  s = apply(s, "auto-fight", { fightId: s.fights[0].id, expectedRound: 0 });
  assert.ok(s.cash >= 180);
});
test("veterans unlock after a bout and mentoring reserves both calendars", () => {
  assert.throws(() => apply(start(), "veteran"));
  let s = ready();
  s = apply(s, "auto-fight", { fightId: s.fights[0].id, expectedRound: 0 });
  s = apply(s, "veteran");
  s.fighters[0].traits = [];
  s.fighters[0].discoveredTraits = [];
  s = apply(s, "mentor", {
    mentorId: "veteran",
    juniorId: "starter",
    trait: "cardio-machine",
  });
  assert.equal(s.mentoring[0].endWeek, s.week + 4);
  assert.throws(() =>
    apply(s, "camp", { fighterId: "starter", weeks: 1, preset: "balanced" }),
  );
  assert.throws(() =>
    apply(s, "book", { fighterId: "veteran", opponentId: "unused", weeks: 1 }),
  );
  for (let i = 0; i < 4; i++) s = apply(s, "advance", { confirmCosts: true });
  assert.notEqual(s.mentoring[0].status, "active");
  if (s.mentoring[0].status === "succeeded")
    assert.equal(s.fighters[0].lineage[0].trait, "cardio-machine");
});
test("historical belts survive retirement and an empty gym can rebuild", () => {
  let s = start();
  s.fighters[0].age = 39.99;
  s.fighters[0].isChampion = true;
  s.fighters[0].championships = [{ wonWeek: 0, defenses: 2 }];
  s = apply(s, "advance", { confirmCosts: true });
  assert.ok(s.fighters[0].retired);
  assert.equal(s.lastAdvance.fighters.length, 1);
  assert.equal(s.lastAdvance.fighters[0].outcome, "retired");
  assert.equal(s.lastAdvance.fighters[0].activity, "rest");
  assert.equal(s.fighters[0].championships[0].defenses, 2);
  assert.equal(s.fighters[0].championships[0].endedWeek, 1);
  s = apply(s, "rebuild");
  assert.equal(s.fighters.filter((f) => !f.retired).length, 1);
  assert.equal(s.fighters[1].age, 21);
});
test("save round-trip and 52 weeks preserve distinct clocks and all roster aging", () => {
  let s = start();
  const age = s.fighters[0].age;
  for (let i = 0; i < 52; i++)
    s = JSON.parse(JSON.stringify(apply(s, "advance", { confirmCosts: true })));
  assert.ok(Math.abs(s.fighters[0].age - age - 1) < 1e-8);
  assert.equal(s.week, 52);
  assert.equal(s.cash, 560);
});

test("competition turnaround blocks repeated weekly purse farming but allows preparation", () => {
  let s = ready();
  s = apply(s, "auto-fight", { fightId: s.fights[0].id, expectedRound: 0 });
  const f = s.fighters[0],
    opponentId = offers(s, f)[0].id;
  assert.throws(
    () => apply(s, "book", { fighterId: f.id, opponentId, weeks: 1 }),
    /turnaround/i,
  );
  s = apply(s, "book", { fighterId: f.id, opponentId, weeks: 4 });
  s = apply(s, "camp", { fighterId: f.id, preset: "balanced", weeks: 1 });
  assert.equal(s.fights[1].eventWeek, 5);
  assert.ok(s.fighters[0].camp);
});

test("event stops survive a full journal and the advance summary totals actual costs", () => {
  let s = start();
  s.journal = Array.from({ length: 300 }, () => ({
    week: 0,
    type: "old",
    text: "Old event",
  }));
  s = apply(s, "camp", { fighterId: "starter", preset: "balanced", weeks: 1 });
  s = apply(s, "advance", { untilEvent: true, confirmCosts: true });
  assert.equal(s.week, 1);
  assert.equal(s.lastAdvance.cost, 20);
  assert.equal(s.lastAdvance.fighters[0].readiness, 91);
  assert.ok(s.lastAdvance.events.some((e) => e.type === "camp-complete"));
  s = apply(s, "advance", { untilEvent: true, confirmCosts: true });
  assert.equal(s.lastAdvance.weeks, 8);
  assert.equal(s.lastAdvance.cost, 160);
});

test("weekly work is frozen when a camp finishes and later assignments leave the recap intact", () => {
  let s = start("week-report-history");
  s = apply(s, "camp", { fighterId: "starter", preset: "pressure", weeks: 1 });
  const allocations = { ...s.fighters[0].camp.allocations };
  s = apply(s, "advance", { confirmCosts: true });
  const savedReport = structuredClone(s.lastAdvance);
  assert.equal(savedReport.fighters[0].activity, "training");
  assert.equal(savedReport.fighters[0].outcome, "camp-complete");
  assert.deepEqual(savedReport.fighters[0].training, {
    preset: "pressure",
    allocations,
  });
  s = apply(s, "camp", { fighterId: "starter", preset: "defense", weeks: 4 });
  assert.deepEqual(s.lastAdvance, savedReport);
  const view = publicState(s);
  assert.deepEqual(view.lastAdvance, savedReport);
});

test("hardship keeps recovery and earning available without granting free camp growth", () => {
  let s = start();
  s.cash = 20;
  s = apply(s, "camp", { fighterId: "starter", preset: "defense", weeks: 4 });
  s = apply(s, "advance", { confirmCosts: true });
  const trained = { ...s.fighters[0].stats };
  s = apply(s, "advance", { confirmCosts: true });
  assert.deepEqual(s.fighters[0].stats, trained);
  assert.equal(s.fighters[0].camp, null);
  assert.equal(s.fighters[0].preparation, null);
  assert.equal(s.fighters[0].fatigue, 0);
  assert.throws(
    () =>
      apply(s, "camp", { fighterId: "starter", preset: "balanced", weeks: 1 }),
    /operating costs/,
  );
  const offer = offers(s, s.fighters[0])[0];
  s = apply(s, "book", {
    fighterId: "starter",
    opponentId: offer.id,
    weeks: 1,
  });
  s = apply(s, "advance", { confirmCosts: true });
  s = apply(s, "auto-fight", { fightId: s.fights[0].id, expectedRound: 0 });
  assert.ok(s.cash >= 180);
  assert.ok(
    apply(s, "camp", { fighterId: "starter", preset: "balanced", weeks: 1 })
      .fighters[0].camp,
  );
});
