const { test } = require("node:test");
const assert = require("node:assert/strict");
const { DAY, materialize, publicAllowances, spend } = require("../services/careerAllowances");
const { repository } = require("../services/careerService");
const { createCareer, offers, applyCommand } = require("../engine/careerEngine");
const epoch = Date.parse("2026-10-09T12:00:00Z");
const copy = (v) => structuredClone(v);
function fixture(state = createCareer({ seed: "daily-budget", name: "Daily Gym", style: "boxing" })) {
  const doc = { gymId: "budget-test", revision: 0, state, receipts: [], daily: materialize(null, epoch) };
  const model = {
    findOne: () => ({ lean: async () => copy(doc) }),
    findOneAndUpdate: (filter, update) => ({ lean: async () => {
      if (doc.revision !== filter.revision) return null;
      Object.assign(doc, copy(update.$set));
      doc.revision += update.$inc.revision;
      doc.receipts.push(...copy(update.$push.receipts.$each));
      return copy(doc);
    } }),
  };
  return { doc, model };
}
test("fresh banks share one anchor and refill on exact elapsed 24-hour boundaries", () => {
  const initial = materialize(null, epoch);
  assert.equal(initial.careerWeeks.balance, 8);
  assert.equal(initial.leagueCards.balance, 1);
  assert.deepEqual(materialize(initial, epoch + DAY - 1), initial);
  const day = publicAllowances(initial, epoch + DAY);
  assert.equal(day.careerWeeks.available, 12);
  assert.equal(day.leagueCards.available, 2);
  assert.equal(day.careerWeeks.nextRefillAt, "2026-10-11T12:00:00.000Z");
});
test("full-bank overflow is discarded, including long absence and backward clocks", () => {
  const full = materialize(materialize(null, epoch), epoch + DAY * 100);
  assert.equal(full.careerWeeks.balance, 12);
  assert.equal(full.leagueCards.balance, 3);
  const spent = spend(spend(full, "careerWeeks", 12, epoch + DAY * 100), "leagueCards", 3, epoch + DAY * 100);
  assert.equal(materialize(spent, epoch + DAY * 100 + DAY - 1).careerWeeks.balance, 0);
  assert.equal(materialize(spent, epoch).leagueCards.balance, 0);
  assert.equal(materialize(spent, epoch + DAY * 101).careerWeeks.balance, 4);
  assert.equal(materialize(spent, epoch + DAY * 101).leagueCards.balance, 1);
});

test("server-issued cards above the refill cap remain spendable without extra refills", () => {
  const granted = materialize(null, epoch);
  granted.leagueCards.balance = 10;
  const later = materialize(granted, epoch + DAY * 100);
  assert.equal(publicAllowances(later, epoch + DAY * 100).leagueCards.available, 10);
  const spent = spend(later, "leagueCards", 1, epoch + DAY * 100);
  assert.equal(materialize(spent, epoch + DAY * 100).leagueCards.balance, 9);
  assert.equal(materialize(spent, epoch + DAY * 101).leagueCards.balance, 9);
  const empty = spend(spent, "leagueCards", 9, epoch + DAY * 101);
  assert.equal(materialize(empty, epoch + DAY * 101).leagueCards.balance, 0);
  assert.equal(materialize(empty, epoch + DAY * 102).leagueCards.balance, 1);
  assert.throws(() => spend(empty, "leagueCards", 1, epoch + DAY * 101), /No league cards/);
});
test("parallel End week, exact retry and failed commits charge only the accepted calendar change", async () => {
  const { doc, model } = fixture();
  const repo = repository(model, { now: () => epoch });
  const body = { id: "manual-week-once", revision: 0, command: { type: "advance", confirmCosts: true } };
  const failed = repository(model, { now: () => epoch, beforeCommit: async () => { throw new Error("disk failure"); } });
  await assert.rejects(failed.command(doc.gymId, body), /disk failure/);
  assert.equal(doc.daily.careerWeeks.balance, 8);
  const results = await Promise.all([repo.command(doc.gymId, body), repo.command(doc.gymId, body)]);
  assert.equal(doc.state.week, 1);
  assert.equal(doc.daily.careerWeeks.balance, 7);
  assert.equal(results.filter((r) => r.duplicate).length, 1);
  await repo.command(doc.gymId, body);
  assert.equal(doc.daily.careerWeeks.balance, 7);
  assert.equal(doc.daily.leagueCards.balance, 1);
});
test("multiweek commands spend actual permitted weeks and offline reads do no training or billing", async () => {
  const { doc, model } = fixture();
  doc.daily.careerWeeks.balance = 2;
  const repo = repository(model, { now: () => epoch });
  await repo.command(doc.gymId, { id: "bounded-multiweek", revision: 0, command: { type: "advance", untilEvent: true, confirmCosts: true } });
  assert.equal(doc.state.week, 2);
  assert.equal(doc.daily.careerWeeks.balance, 0);
  const before = copy(doc);
  await assert.rejects(repo.command(doc.gymId, { id: "empty-calendar-week", revision: 1, command: { type: "advance", confirmCosts: true } }), /No career weeks/);
  assert.deepEqual(doc, before);
  const later = await repository(model, { now: () => epoch + DAY * 7 }).get(doc.gymId);
  assert.equal(later.allowances.careerWeeks.available, 12);
  assert.deepEqual(doc, before);
});
test("a ready bout and planning remain playable with zero weeks", async () => {
  let state = createCareer({ seed: "daily-ready", name: "Ready Gym", style: "boxing" });
  state = applyCommand(state, { type: "book", fighterId: "starter", opponentId: offers(state, state.fighters[0])[0].id, weeks: 1 });
  state = applyCommand(state, { type: "advance", confirmCosts: true });
  const { doc, model } = fixture(state);
  doc.daily.careerWeeks.balance = 0;
  const result = await repository(model, { now: () => epoch }).command(doc.gymId, { id: "resolve-ready-bout", revision: 0, command: { type: "auto-fight", fightId: state.fights[0].id, expectedRound: 0 } });
  assert.equal(result.career.fights[0].status, "resolved");
  assert.equal(result.allowances.careerWeeks.available, 0);
});
test("legacy careers initialize once on a successful write without retroactive refills", async () => {
  const { doc, model } = fixture();
  delete doc.daily;
  const repo = repository(model, { now: () => epoch });
  await repo.command(doc.gymId, { id: "initialize-legacy", revision: 0, command: { type: "advance", confirmCosts: true } });
  assert.equal(doc.daily.anchorAt, new Date(epoch).toISOString());
  assert.equal(doc.daily.careerWeeks.balance, 7);
  const view = await repository(model, { now: () => epoch + DAY }).get(doc.gymId);
  assert.equal(view.allowances.careerWeeks.available, 11);
  assert.equal(view.allowances.leagueCards.available, 2);
  assert.equal(doc.state.week, 1);
});

test("delayed exact retries retain their original week report while returning the latest authoritative save", async () => {
  const { doc, model } = fixture();
  const repo = repository(model, { now: () => epoch });
  const first = { id: "original-week-report", revision: 0, command: { type: "advance", confirmCosts: true } };
  const original = await repo.command(doc.gymId, first);
  await repo.command(doc.gymId, { ...first, id: "subsequent-week-report", revision: 1 });
  const retry = await repo.command(doc.gymId, first);
  assert.equal(retry.career.week, 2);
  assert.equal(retry.allowances.careerWeeks.available, 6);
  assert.deepEqual(retry.acceptedAction, original.acceptedAction);
  assert.equal(retry.acceptedAction.lastAdvance.fromWeek, 0);
  assert.equal(retry.acceptedAction.lastAdvance.week, 1);
});
