const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
} = require("../engine/careerEngine");
const { RARITY_TIERS, PITY_THRESHOLDS } = require("../consts/rarity");
const { CAREER } = require("../consts/career");
const start = (seed = "rarity-career") =>
  createCareer({ seed, name: "Rarity Gym", style: "boxing" });
const investigate = (s, index = 0) =>
  applyCommand(s, { type: "investigate", reportId: s.board[index].id });

test("scouting can naturally reveal every tier, including Legend", () => {
  const base = start();
  const found = new Set();
  for (let i = 0; i < 2000 && found.size < 5; i++) {
    const s = { ...base, seed: `rarity-natural-${i}` };
    const result = investigate(s);
    found.add(result.board[0].fighter.rarity);
    assert.equal(result.scouting.investigations, 1);
    assert.equal(
      result.board[0].fee,
      100 + (RARITY_TIERS[result.board[0].fighter.rarity].order - 1) * 150,
    );
  }
  assert.deepEqual([...found].sort(), Object.keys(RARITY_TIERS).sort());
});

test("guarantees trigger on the investigation after the miss limit, with higher-tier precedence", () => {
  for (const tier of ["contender", "elite", "legend"]) {
    const s = start();
    for (const key of Object.keys(PITY_THRESHOLDS))
      s.scouting.pity[key] =
        RARITY_TIERS[key].order <= RARITY_TIERS[tier].order
          ? PITY_THRESHOLDS[key]
          : 4;
    const view = publicState(s);
    assert.equal(
      view.scouting.guarantees.find((g) => g.tier === tier).remaining,
      1,
    );
    const result = investigate(s);
    assert.equal(result.board[0].fighter.rarity, tier);
    for (const key of Object.keys(PITY_THRESHOLDS))
      assert.equal(
        result.scouting.pity[key],
        RARITY_TIERS[key].order <= RARITY_TIERS[tier].order ? 0 : 5,
      );
    assert.deepEqual(result, investigate(s));
  }
});

test("a miss at the boundary makes the next investigation guaranteed", () => {
  const s = start();
  s.scouting.pity.contender = PITY_THRESHOLDS.contender - 1;
  // Choose a deterministic natural miss, without depending on a fixed seed's outcome.
  let result;
  for (let i = 0; i < 30; i++) {
    result = investigate({ ...s, seed: `boundary-${i}` });
    if (
      RARITY_TIERS[result.board[0].fighter.rarity].order <
      RARITY_TIERS.contender.order
    )
      break;
  }
  assert.equal(result.scouting.pity.contender, PITY_THRESHOLDS.contender);
  assert.equal(publicState(result).scouting.guarantees[0].remaining, 1);
  result = investigate(result, 1);
  assert.equal(result.board[1].fighter.rarity, "contender");
});

test("week changes, reading and signing preserve guarantee progress; repeat investigation fails atomically", () => {
  let s = investigate(start());
  const before = JSON.stringify(s);
  publicState(s);
  assert.equal(JSON.stringify(s), before);
  assert.throws(() => investigate(s), /uninvestigated/);
  assert.equal(JSON.stringify(s), before);
  const progress = structuredClone(s.scouting);
  s = applyCommand(s, { type: "sign", reportId: s.board[0].id });
  assert.deepEqual(s.scouting, progress);
  s = applyCommand(s, { type: "advance", confirmCosts: true });
  assert.deepEqual(s.scouting, progress);
  assert.equal(s.scoutsUsed, 0);
});

test("unrevealed cards expose neither rarity nor a price hint; investigation preserves public identity", () => {
  const s = start();
  // A non-free signing would previously reveal the rarity through its price.
  s.fighters.push({ ...s.fighters[0], id: "second" });
  const view = publicState(s);
  const identity = view.board[0].fighter;
  assert.equal(identity.rarity, undefined);
  assert.equal(identity.stats, undefined);
  assert.equal(view.board[0].fee, null);
  const result = publicState(investigate(s));
  for (const key of Object.keys(identity))
    assert.deepEqual(result.board[0].fighter[key], identity[key]);
  assert.equal(result.board[0].fighter.potential, undefined);
  assert.equal(result.board[0].fighter.stats, undefined);
  assert.ok(result.board[0].fighter.statRanges);
  assert.equal(typeof result.board[0].fee, "number");
});

test("version-one saves upgrade without rerolling signed fighters or revealed reports", () => {
  let s = investigate(start());
  s = applyCommand(s, { type: "sign", reportId: s.board[0].id });
  s.version = 1;
  delete s.scouting;
  const before = structuredClone(s);
  const view = publicState(s);
  assert.equal(view.version, CAREER.version);
  assert.deepEqual(s, before);
  const next = investigate(s, 1);
  assert.equal(next.version, CAREER.version);
  assert.deepEqual(next.fighters, before.fighters);
  assert.deepEqual(next.board[0], before.board[0]);
  assert.equal(next.scouting.investigations, 1);
});
