const { test } = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../engine/careerEngine");
const fresh = () =>
  engine.createCareer({ seed: "review-four", name: "Calendar Gym" });
const accept = (s, f, offer) =>
  engine.applyCommand(s, {
    type: "accept-offer",
    fighterId: f.id,
    offerId: offer.offerId,
  });

test("calendar dates are stable through DST, month/year boundaries and old saves", async () => {
  const { calendarDate, careerDay, calendarText } =
    await import("../frontend/src/careerCalendar.mjs");
  const s = fresh();
  assert.equal(calendarDate(s), "5 Oct 2026");
  assert.equal(calendarDate(s, 4), "2 Nov 2026");
  assert.equal(calendarDate(s, 13), "4 Jan 2027");
  assert.equal(
    careerDay({ week: 0, calendarStart: "2028-02-28" }, 1)
      .toISOString()
      .slice(0, 10),
    "2028-03-06",
  );
  delete s.calendarStart;
  const original = structuredClone(s);
  assert.equal(calendarDate(engine.publicState(s)), "5 Oct 2026");
  assert.deepEqual(s, original);
  assert.equal(calendarText(s, "Booked in week 4."), "Booked in 2 Nov 2026.");
});

test("promoter offers keep dates and terms fixed; stale and edited contracts fail atomically", () => {
  const s = fresh(),
    f = s.fighters[0];
  const offers = engine.offers(s, f);
  assert.deepEqual(engine.offers(s, f), offers);
  assert.ok(offers.some((o) => o.notice >= 4));
  assert.ok(offers.some((o) => o.notice <= 2));
  const picked = offers[0];
  const next = accept(s, f, picked);
  assert.equal(next.fights[0].eventWeek, picked.eventWeek);
  assert.equal(next.fights[0].show, picked.show);
  assert.equal(next.fights[0].opponentId, picked.id);
  assert.throws(
    () =>
      engine.applyCommand(s, {
        type: "accept-offer",
        fighterId: f.id,
        offerId: picked.offerId,
        weeks: 8,
      }),
    /promoter sets/,
  );
  const later = engine.applyCommand(s, { type: "advance", confirmCosts: true });
  assert.throws(() => accept(later, f, picked), /no longer available/);
  assert.equal(s.week, 0);
  assert.equal(s.fights.length, 0);
});

test("short-notice offers respect recovery and existing camps", () => {
  let s = fresh(),
    f = s.fighters[0];
  f.nextBoutWeek = 4;
  let offer = engine.offers(s, f).find((o) => o.shortNotice);
  assert.ok(offer.unavailable);
  assert.throws(() => accept(s, f, offer), /recovery period/);
  f.nextBoutWeek = 0;
  s = engine.applyCommand(s, {
    type: "camp",
    fighterId: f.id,
    preset: "balanced",
    weeks: 6,
  });
  f = s.fighters[0];
  offer = engine.offers(s, f).find((o) => o.shortNotice);
  assert.throws(() => accept(s, f, offer), /camp ends/);
  assert.equal(engine.offers(s, f)[0].notice, 4);
  assert.ok(
    engine.offers(s, f)[0].unavailable,
    "A camp cannot move the promoter's fixed date",
  );
});

test("two fighters share one calendar that stops at the earliest bout", async () => {
  let s = fresh();
  s = engine.applyCommand(s, { type: "investigate", reportId: s.board[0].id });
  s = engine.applyCommand(s, { type: "sign", reportId: s.board[0].id });
  const f1 = s.fighters[0],
    f2 = s.fighters[1];
  s = accept(s, f1, engine.offers(s, f1)[0]);
  const second = engine.offers(s, f2).find((o) => o.shortNotice);
  s = accept(s, f2, second);
  s = engine.applyCommand(s, {
    type: "camp",
    fighterId: f1.id,
    preset: "balanced",
    weeks: 1,
  });
  s = engine.applyCommand(s, {
    type: "camp",
    fighterId: f2.id,
    preset: "balanced",
    weeks: 1,
  });
  assert.equal(
    s.week,
    0,
    "Assigning two camps must not advance either fighter",
  );
  const { gymWeekPreview } = await import("../frontend/src/trainingPlans.mjs");
  const preview = gymWeekPreview(
    engine.publicState(s),
    engine.publicState(s).fighters[0],
    null,
    true,
  );
  const before = structuredClone(s);
  s = engine.applyCommand(s, {
    type: "advance",
    untilEvent: true,
    confirmCosts: true,
  });
  assert.equal(s.week, second.eventWeek);
  assert.equal(s.fights[0].status, "scheduled");
  assert.equal(s.fights[1].status, "ready");
  assert.equal(before.cash - s.cash, preview.cost);
  assert.ok(s.fighters.every((f) => f.lastCamp));
  assert.throws(
    () => engine.applyCommand(s, { type: "advance", confirmCosts: true }),
    /fight/i,
  );
});

test("key moments use the exact full-log exchange with resets and the submission setup", async () => {
  const { fightReport } = await import("../frontend/src/fightPresentation.mjs");
  const event = (time, type, actor) => ({
    round: 1,
    time,
    type,
    actor,
    text: type,
  });
  const events = [
    event("0:30", "takedown", "A"),
    event("0:30", "sub-attempt", "B"),
    event("1:00", "takedown", "A"),
    event("1:00", "sub", "B"),
  ];
  const b = {
    result: {
      winner: "B",
      method: "SUB",
      round: 1,
      time: "1:00",
      totals: { A: {}, B: {} },
      rounds: [{ round: 1, events }],
    },
  };
  const original = structuredClone(b);
  const report = fightReport(b, { A: "Alex", B: "Sam" });
  assert.equal(report.momentGroups.length, 1);
  assert.deepEqual(report.momentGroups[0], report.groups[1]);
  assert.match(report.momentGroups[0].lines[0].text, /Sam has stood up/);
  assert.match(
    report.momentGroups[0].lines.at(-1).text,
    /Sam secures the submission from the bottom/,
  );
  assert.equal(
    new Set(
      report.groups.flatMap((g) =>
        g.lines.filter((l) => l.id).map((l) => l.id),
      ),
    ).size,
    4,
  );
  assert.deepEqual(b, original);
});
