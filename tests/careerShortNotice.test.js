const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createCareer, offers, applyCommand } = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");
const { SHORT_NOTICE_PREMIUM } = require("../consts/careerEconomy");
const start = () => createCareer({ seed: "replacement-contract", name: "Quick Corner" });
const baseWin = (s, o) => CAREER.circuits[0].winBonus + (s.rivals.find(r => r.id === o.id).rankingPoints >= 50 ? 130 : 0);

test("one- and two-week replacement calls pay a guaranteed and conditional premium for the same opponent", () => {
  for (const week of [0, 1]) {
    const s = start(); s.week = week;
    const o = offers(s, s.fighters[0]).find(o => o.shortNotice);
    assert.ok(o);
    assert.equal(o.notice, week + 1);
    assert.equal(o.show, CAREER.circuits[0].show + SHORT_NOTICE_PREMIUM.show);
    assert.equal(o.winBonus, baseWin(s, o) + SHORT_NOTICE_PREMIUM.winBonus);
    const booked = applyCommand(s, { type: "accept-offer", fighterId: "starter", offerId: o.offerId });
    assert.equal(booked.week, s.week);
    assert.equal(booked.cash, s.cash);
    assert.equal(booked.fights[0].show, o.show);
    assert.equal(booked.fights[0].winBonus, o.winBonus);
    assert.equal(booked.fights[0].eventWeek, o.eventWeek);
    assert.deepEqual(booked.fights[0].shortNoticePremium, SHORT_NOTICE_PREMIUM);
  }
});

test("legacy booking dates recalculate premium once and cannot keep it with a longer preparation window", () => {
  const s = start();
  for (const o of offers(s, s.fighters[0]).filter(o => !o.title)) {
    for (const weeks of [1, 2, 4, 8]) {
      const bout = applyCommand(s, { type: "book", fighterId: "starter", opponentId: o.id, weeks }).fights[0];
      assert.equal(bout.show, CAREER.circuits[0].show + (weeks <= 2 ? SHORT_NOTICE_PREMIUM.show : 0));
      assert.equal(bout.winBonus, baseWin(s, o) + (weeks <= 2 ? SHORT_NOTICE_PREMIUM.winBonus : 0));
      assert.equal(bout.shortNotice, weeks <= 2);
    }
  }
});

test("existing signed purses remain intact and title fights never become replacement contracts", () => {
  let s = start();
  const regular = offers(s, s.fighters[0]).find(o => !o.shortNotice);
  s = applyCommand(s, { type: "accept-offer", fighterId: "starter", offerId: regular.offerId });
  const fees = [s.fights[0].show, s.fights[0].winBonus];
  s = applyCommand(s, { type: "camp", fighterId: "starter", preset: "balanced", weeks: 1 });
  assert.deepEqual([s.fights[0].show, s.fights[0].winBonus], fees);
  s = start(); s.fighters[0].rankingPoints = CAREER.titleShotPoints;
  const title = offers(s, s.fighters[0]).find(o => o.title);
  assert.ok(title);
  assert.equal(title.shortNotice, false);
  assert.equal(title.shortNoticePremium, null);
  assert.equal(title.winBonus, CAREER.circuits[0].titleWinBonus);
});
