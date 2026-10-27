const { test } = require("node:test");
const assert = require("node:assert/strict");
const { chooseLineup, snapshotFor, botDefense, publicDefense, resolveWar,
  leagueProgress, coverageFor, divisions } = require("../engine/careerWarEngine");
const { botSnapshots } = require("../consts/careerExhibitionBots");
const { seasonFor } = require("../services/careerWarService");
const fighter = (id, weightClass = "lightweight", level = 50) => ({ id, name: id,
  style: "boxing", weightClass, rarity: "prospect", portrait: 0, rankingPoints: 10,
  record: { wins: 1, losses: 0, draws: 0 }, traits: ["iron-chin"], fatigue: 90,
  stats: { striking: level, grappling: level, submissions: level, conditioning: level },
  gameplan: { approach: "balanced", pace: "measured", finish: "hunt-finish", conserveBelow: 30 } });
const team = (prefix = "alex", level = 50) => divisions.map((division) => fighter(`${prefix}-${division}`, division, level));
const career = (gymId = "aaaaaaaaaaaaaaaaaaaaaaaa", fighters = team()) => ({ gymId,
  revision: 4, state: { name: "Test Gym", week: 7, fighters, cash: 2000 } });

test("complete owned division coverage is required; reserves replace their division and defaults use strongest owned coverage", () => {
  const save = career(undefined, [...team(), { ...fighter("reserve", "lightweight", 80), rankingPoints: 0 }]);
  const original = structuredClone(save), ids = team().map((f) => f.id);
  assert.equal(chooseLineup(save)[1].id, "reserve");
  assert.equal(chooseLineup(save, ids)[1].id, "alex-lightweight");
  assert.equal(coverageFor(save).strength, 57.5);
  assert.throws(() => chooseLineup(save, ["reserve"]), /four different/);
  assert.throws(() => chooseLineup(save, ["outsider", ...ids.slice(1)]), /no longer active/);
  assert.throws(() => chooseLineup(save, [ids[0], ids[1], "reserve", ids[3]]), /one fighter per division/);
  assert.throws(() => chooseLineup(save, [ids[0], ids[0], ids[2], ids[3]]), /four different/);
  save.state.fighters[0].retired = true;
  assert.throws(() => chooseLineup(save, ids), /no longer active/);
  save.state.fighters[0].retired = false;
  save.state.fighters[0].released = true;
  assert.throws(() => chooseLineup(save, ids), /no longer active/);
  delete save.state.fighters[0].released;
  assert.deepEqual(save, { ...original, state: { ...original.state, fighters: original.state.fighters.map((f, i) => i ? f : { ...f, retired: false }) } });
});
test("incomplete lobby display is explicit and cannot be accepted as a full card", () => {
  const save = career(undefined, [fighter("starter")]);
  assert.deepEqual(coverageFor(save).missingDivisions, ["featherweight", "middleweight", "heavyweight"]);
  assert.equal(snapshotFor(save, undefined, { allowIncomplete: true }).lineup.length, 1);
  assert.throws(() => snapshotFor(save), /four different/);
});
test("publishing captures fresh immutable snapshots and hides private traits", () => {
  const save = career(), snapshot = snapshotFor(save), publicTeam = publicDefense(snapshot);
  assert.ok(snapshot.lineup.every((f) => f.fatigue === 0));
  assert.deepEqual(snapshot.lineup[0].traits, ["iron-chin"]);
  assert.equal(publicTeam.lineup[0].traits, undefined);
  save.state.fighters[0].stats.striking = 99;
  assert.equal(snapshot.lineup[0].stats.striking, 50);
});
test("Gym Wars plans validate every selected fighter without changing career fight instructions", () => {
  const save = career(), before = structuredClone(save);
  const custom = { approach: "grapple", pace: "cautious", finish: "play-safe", conserveBelow: 50 };
  const gameplans = Object.fromEntries(save.state.fighters.map((f) => [f.id, { ...custom, stats: { striking: 999 } }]));
  const snapshot = snapshotFor(save, undefined, { gameplans });
  assert.ok(snapshot.lineup.every((f) => JSON.stringify(f.gameplan) === JSON.stringify(custom)));
  assert.deepEqual(save, before);
  assert.notEqual(snapshot.version, snapshotFor(save).version);
  for (const gameplans of [null, [], {}, { outsider: custom }, Object.fromEntries(save.state.fighters.map((f) => [f.id, { ...custom, conserveBelow: 999 }]))])
    assert.throws(() => snapshotFor(save, undefined, { gameplans }), /tactics|threshold/);
  assert.throws(() => snapshotFor(save, undefined, { gameplans: { ...gameplans, [save.state.fighters[0].id]: { ...custom, approach: "cheat" } } }), /valid corner/);
});
test("authored named clubs are stable complete defenses with no database writes", () => {
  const a = botSnapshots().map(botDefense);
  assert.deepEqual(a, botSnapshots().map(botDefense));
  assert.equal(a.length, 3);
  assert.ok(a.every((s) => s.version.length === 64 && s.lineup.length === 4));
});
test("accepted cards always resolve all four bouts, remain deterministic and award no career progression", () => {
  const attacker = snapshotFor(career()), defender = snapshotFor(career("bbbbbbbbbbbbbbbbbbbbbbbb", team("rival")));
  const original = structuredClone({ attacker, defender });
  const result = resolveWar(attacker, defender, "server-card-1");
  assert.deepEqual(result, resolveWar(attacker, defender, "server-card-1"));
  assert.equal(result.bouts.length, 4);
  assert.equal(result.careerRewards, 0);
  assert.ok(result.bouts.every((b) => b.result.roundSummaries.length));
  assert.deepEqual({ attacker, defender }, original);
});
test("cosmetics, career weeks and publication revisions cannot reroll an accepted card", () => {
  const a = snapshotFor(career()), b = snapshotFor(career("bbbbbbbbbbbbbbbbbbbbbbbb", team("rival")));
  const original = resolveWar(a, b, "fixed-server-card");
  const changed = structuredClone(a);
  changed.week = 999; changed.version = "different"; changed.careerRevision = 555;
  changed.name = "Renamed gym";
  changed.lineup.forEach((f) => { f.name = "Renamed"; f.portrait = 5; });
  const result = resolveWar(changed, b, "fixed-server-card");
  assert.equal(result.outcome, original.outcome);
  assert.deepEqual(result.bouts.map((bout) => bout.result.totals), original.bouts.map((bout) => bout.result.totals));
});
test("partial defenses, self challenges and incompatible rules fail explicitly", () => {
  const a = snapshotFor(career()), b = snapshotFor(career("bbbbbbbbbbbbbbbbbbbbbbbb", team("rival")));
  b.lineup.pop();
  assert.throws(() => resolveWar(a, b, "card"), /four active/);
  assert.throws(() => resolveWar(a, a, "card"), /another gym/);
  b.combatVersion = 1;
  assert.throws(() => resolveWar(a, b, "card"), /older fight rules/);
});
test("team draws earn one base point; complete weak-opponent wins earn one", () => {
  const a = snapshotFor(career()), b = snapshotFor(career("bbbbbbbbbbbbbbbbbbbbbbbb", team("rival")));
  const powerful = snapshotFor(career(undefined, team("strong", 95))), weak = snapshotFor(career("bbbbbbbbbbbbbbbbbbbbbbbb", team("weak", 25)));
  let draws = 0, wins = 0;
  for (let card = 0; card < 80; card++) {
    const result = resolveWar(a, b, `card-${card}`);
    if (result.outcome === "draw") { draws++; assert.equal(result.pointsEarned, 1); }
    const easy = resolveWar(powerful, weak, `card-${card}`);
    if (easy.outcome === "win") { wins++; assert.equal(easy.pointsEarned, 1); }
  }
  assert.ok(draws && wins);
});
test("club honors remain permanent while standings use one bounded 28-day season", () => {
  assert.equal(leagueProgress(5).nextMilestone.points, 6);
  assert.equal(leagueProgress(6).nextMilestone.points, 15);
  assert.equal(leagueProgress(15).nextMilestone.points, 30);
  assert.ok(leagueProgress(30).milestones.every((item) => item.reached));
  const first = seasonFor(Date.parse("2026-10-09T00:00:00Z"));
  assert.equal(seasonFor(Date.parse(first.endsAt) - 1).id, first.id);
  assert.notEqual(seasonFor(Date.parse(first.endsAt)).id, first.id);
  assert.equal(Date.parse(first.endsAt) - Date.parse(first.startsAt), 28 * 86400000);
});
