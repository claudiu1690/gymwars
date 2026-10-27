const { test } = require("node:test");
const assert = require("node:assert/strict");
const { botSnapshots, botSnapshot, leagueClubSnapshots } = require("../consts/careerExhibitionBots");
const { fighterStrength, snapshotFor, botDefense, combatIdentity, resolveWar, hash } = require("../engine/careerWarEngine");
const { TOTAL_POINTS, BEST_TEN, scoreSeasonCards } = require("../engine/careerWarStandings");
const { CURRENT_FIGHT_VERSION } = require("../engine/fightEngine");

test("fixed authored clubs provide at least six comparable choices across the playable power range", () => {
  const catalog = leagueClubSnapshots();
  assert.equal(catalog.length, 51);
  assert.equal(new Set(catalog.map((club) => club._id)).size, catalog.length);
  assert.equal(new Set(catalog.map((club) => club.name)).size, catalog.length);
  for (let power = 20; power <= 99; power++) {
    const comparable = catalog.filter((club) => Math.abs(club.lineup.reduce((sum, f) => sum + fighterStrength(f), 0) / 4 - power) <= 10);
    assert.ok(comparable.length >= 6, `power ${power}: ${comparable.length} comparable clubs`);
  }
  for (const club of catalog) {
    assert.equal(new Set(club.lineup.map((fighter) => fighter.weightClass)).size, 4);
    for (const fighter of club.lineup) assert.ok(Object.values(fighter.stats).every((value) => value >= 1 && value <= 99));
  }
  const pack = catalog.filter((club) => club.bracket === 70);
  assert.equal(new Set(pack.map((club) => JSON.stringify(club.lineup[0].gameplan))).size, 6);
  assert.equal(new Set(pack.map((club) => club.lineup[0].signatureId)).size, 5);
  catalog[0].lineup[0].stats.striking = 99;
  assert.notDeepEqual(catalog, leagueClubSnapshots());
  assert.deepEqual(leagueClubSnapshots().map(botDefense), leagueClubSnapshots().map(botDefense));
});

test("established club sheets and IDs remain compatible with original history", () => {
  assert.deepEqual(botSnapshots().map((club) => [club.name, club._id, club.gymId]), [
    ["Dockside Beginners", "a53fe335cfbdb41088138314", "7c5e36f60b57a7437bdc941f"],
    ["Redline Fight Club", "6f85538f50f92571e692f6ae", "31e1f60368113803a38abe90"],
    ["Iron Vale Grappling", "cfccda95bb2035ddf4f23278", "9e344d71d8b914537e29d9b6"],
  ]);
  for (const club of leagueClubSnapshots()) assert.deepEqual(botSnapshot(club._id), club);
});

test("signature-only changes are frozen in publication and versioned combat identity", () => {
  const bot = botSnapshots()[0];
  const career = { gymId: "111111111111111111111111", revision: 3, state: { week: 4, name: "Corner", fighters: bot.lineup } };
  const before = snapshotFor(career);
  career.state.fighters[0].signatureId = "clean-combinations";
  const after = snapshotFor(career);
  assert.notEqual(before.version, after.version);
  assert.equal(before.lineup[0].signatureId, null);
  assert.equal(after.lineup[0].signatureId, "clean-combinations");
  assert.notEqual(hash(combatIdentity({ ...before, combatVersion: 4 })), hash(combatIdentity({ ...after, combatVersion: 4 })));
  assert.deepEqual(combatIdentity({ ...before, combatVersion: 3 }), combatIdentity({ ...after, combatVersion: 3 }));
  const rival = { ...botDefense(botSnapshots()[1]), combatVersion: 3 };
  const old = { ...before, combatVersion: 3 };
  assert.deepEqual(resolveWar(old, rival, "frozen-old-card"), resolveWar({ ...after, combatVersion: 3 }, rival, "frozen-old-card"));
  assert.equal(resolveWar({ ...after, combatVersion: CURRENT_FIGHT_VERSION }, botDefense(botSnapshots()[1]), "new-card").combatVersion, CURRENT_FIGHT_VERSION);
});

test("best ten selects the strongest ten actual cards without attendance tie-breaks or lost lifetime points", () => {
  const cards = Array.from({ length: 13 }, (_, i) => ({ id: String(i), points: i < 10 ? 3 : 1,
    outcome: "win", createdAt: new Date(2026, 10, i + 1).toISOString() }));
  const total = scoreSeasonCards(cards, TOTAL_POINTS), best = scoreSeasonCards(cards, BEST_TEN);
  assert.equal(total.points, 33); assert.equal(total.countedCards, 13);
  assert.equal(best.points, 30); assert.equal(best.countedCards, 10);
  assert.equal(best.scoredWins, 10); assert.equal(best.matches, 13); assert.equal(best.wins, 13);
  assert.deepEqual(scoreSeasonCards(cards.slice(0, 10), BEST_TEN), { ...best, matches: 10, wins: 10 });
  assert.deepEqual(cards.map((card) => card.points), [...Array(10).fill(3), 1, 1, 1]);
});
