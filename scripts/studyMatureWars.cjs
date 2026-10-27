// Synthetic, in-memory competition audit. No database, account or saved outcome.
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const { divisions, resolveWar } = require("../engine/careerWarEngine");
const { CURRENT_FIGHT_VERSION } = require("../engine/fightEngine");
const { BEST_TEN, scoreSeasonCards } = require("../engine/careerWarStandings");
const styles = ["boxing", "wrestling", "bjj", "sambo"];
const signatures = [
  "clean-combinations",
  "chain-wrestling",
  "escape-artist",
  "pace-keeper",
];
function team(id, power, approach = null) {
  return {
    id,
    name: "Lab " + id,
    type: "player",
    week: 160,
    combatVersion: CURRENT_FIGHT_VERSION,
    lineup: divisions.map((weightClass, i) => ({
      id: id + "-" + i,
      name: id + " fighter " + i,
      weightClass,
      style: styles[i],
      traits: [],
      signatureId: signatures[i],
      stats: {
        striking: power,
        grappling: power,
        submissions: power,
        conditioning: power,
      },
      gameplan: {
        approach: approach || (i === 0 ? "strike" : "grapple"),
        pace: "measured",
        finish: "play-safe",
        conserveBelow: 30,
      },
    })),
  };
}
function sample(a, b, prefix, n = 250) {
  const result = { cards: 0, wins: 0, draws: 0, losses: 0, bouts: 0 };
  const before = structuredClone({ a, b });
  for (let i = 0; i < n; i++) {
    for (const reversed of [false, true]) {
      const card = reversed
        ? resolveWar(b, a, prefix + i)
        : resolveWar(a, b, prefix + i);
      const outcome = reversed
        ? { win: "loss", loss: "win", draw: "draw" }[card.outcome]
        : card.outcome;
      result.cards++;
      result[
        outcome === "win" ? "wins" : outcome === "loss" ? "losses" : "draws"
      ]++;
      result.bouts += card.bouts.length;
      assert.equal(card.bouts.length, 4);
      assert.equal(card.careerRewards, 0);
    }
  }
  assert.deepEqual({ a, b }, before);
  result.scoreShare = (result.wins + result.draws / 2) / result.cards;
  return result;
}
const matched = [65, 80, 95].map((power) => ({
  power,
  ...sample(
    team("a", power),
    team("b", power),
    "mature-matched-" + power + "-",
  ),
}));
for (const row of matched)
  assert.ok(
    row.scoreShare > 0.4 && row.scoreShare < 0.6,
    "No large positional bias at mature power",
  );
const stronger = sample(team("a", 85), team("b", 70), "mature-gap-");
assert.ok(stronger.scoreShare > 0.75, "Developed skills retain value");
const tactics = ["strike", "grapple", "balanced"].map((approach) => ({
  approach,
  ...sample(
    team("a", 80, approach),
    team("b", 80),
    "mature-tactics-" + approach + "-",
  ),
}));
const cards = Array.from({ length: 30 }, (_, i) => ({
  id: "card-" + i,
  points: 3,
  outcome: "win",
  strengthGap: 0,
  opponentStrength: 80,
  opponentId: "rival-" + i,
  competitionBand: 80,
  createdAt: new Date(2026, 9, i + 1),
}));
const standings = scoreSeasonCards(cards, BEST_TEN);
assert.equal(standings.points, 30);
assert.equal(standings.countedCards, 10);
const report = {
  scope:
    "Synthetic equal-stat, mixed-style four-division teams with permanent signatures; 250 accepted IDs in both attack directions per scenario. No real accounts, population or human-retention claim. Scoring/anti-repeat server cases are covered separately by the database regression suite.",
  combatVersion: CURRENT_FIGHT_VERSION,
  matched,
  stronger,
  tactics,
  bestTen: {
    played: cards.length,
    counted: standings.countedCards,
    points: standings.points,
  },
  totalCards: [...matched, stronger, ...tactics].reduce(
    (sum, row) => sum + row.cards,
    0,
  ),
};
fs.mkdirSync("output/release-final", { recursive: true });
fs.writeFileSync(
  "output/release-final/mature-wars-study.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
