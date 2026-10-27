const { test } = require("node:test");
const assert = require("node:assert/strict");
const { publicWarResult } = require("../services/careerWarPresentation");
const art = import("../frontend/src/warPresentation.mjs");

test("historic war portraits come from accepted inputs and never expose private fighter data", async () => {
  const fighter = {
    id: "old-1",
    name: "Accepted fighter",
    weightClass: "middleweight",
    portrait: 12,
    rarity: "elite",
    style: "boxing",
    traits: ["private-trait"],
    stats: { striking: 90 },
    hiddenPotential: 99,
  };
  const inputs = {
    attacker: { name: "A", lineup: [fighter] },
    defender: { name: "B", lineup: [{ ...fighter, id: "opponent" }] },
  };
  const result = { yourGym: "A", opponent: "B", wins: 1, losses: 0, bouts: [] };
  const before = structuredClone({ inputs, result });
  const displayed = publicWarResult(result, inputs);
  assert.equal(displayed.teams.A.lineup[0].portrait, 12);
  assert.equal(JSON.stringify(displayed).includes("private-trait"), false);
  assert.equal(displayed.teams.A.lineup[0].hiddenPotential, undefined);
  const { boutFighter } = await art;
  const bout = {
    youId: "old-1",
    themId: "opponent",
    you: "Accepted fighter",
    them: "Rival",
    weightClass: "middleweight",
  };
  assert.equal(
    boutFighter(displayed, bout, "A", [{ ...fighter, portrait: 15 }]).portrait,
    12,
  );
  assert.deepEqual({ inputs, result }, before);
  assert.equal(
    publicWarResult(result, {}),
    result,
    "legacy cards without inputs remain readable",
  );
  assert.equal(
    boutFighter(result, bout, "B", []).missingPortrait,
    true,
    "unknown historic art is not invented",
  );
});

test("four-bout reveal scores include only revealed results and invert correctly for the defender", async () => {
  const { warView } = await art;
  const card = {
    yourGym: "Attacker",
    opponent: "Defender",
    wins: 1,
    losses: 2,
    bouts: ["A", "draw", "B", "B"].map((winner) => ({ result: { winner } })),
  };
  for (const [shown, wins, losses] of [
    [0, 0, 0],
    [1, 1, 0],
    [2, 1, 0],
    [3, 1, 1],
    [4, 1, 2],
  ]) {
    const a = warView(card, shown),
      b = warView({ ...card, direction: "defense" }, shown);
    assert.equal(a.wins, wins);
    assert.equal(a.losses, losses);
    assert.equal(b.wins, losses);
    assert.equal(b.losses, wins);
    assert.equal(b.yourGym, "Defender");
    assert.equal(b.theirGym, "Attacker");
    assert.equal(a.complete, shown === 4);
  }
});

test("historical result ability art comes from accepted signatures and respects the recorded combat generation", async () => {
  const fighter = {
    id: "old-1",
    name: "Accepted fighter",
    style: "sambo",
    weightClass: "middleweight",
    signatureId: "transition-trap",
  };
  const inputs = {
    attacker: { name: "A", combatVersion: 6, lineup: [fighter] },
    defender: {
      name: "B",
      combatVersion: 6,
      lineup: [{ ...fighter, id: "other", signatureId: "pace-keeper" }],
    },
  };
  const displayed = publicWarResult({ combatVersion: 6 }, inputs);
  assert.equal(displayed.teams.A.lineup[0].signatureId, "transition-trap");
  const { boutFighter } = await art;
  const bout = { youId: "old-1", weightClass: "middleweight" };
  assert.equal(
    boutFighter(displayed, bout, "A", [
      { ...fighter, signatureId: "combat-sambo" },
    ]).signatureId,
    "transition-trap",
  );
  inputs.attacker.combatVersion = 5;
  assert.equal(
    publicWarResult({ combatVersion: 5 }, inputs).teams.A.lineup[0].signatureId,
    null,
  );
  inputs.attacker.lineup[0].signatureId = "chain-wrestling";
  assert.equal(
    publicWarResult({ combatVersion: 5 }, inputs).teams.A.lineup[0].signatureId,
    "chain-wrestling",
  );
  inputs.attacker.combatVersion = 3;
  assert.equal(
    publicWarResult({ combatVersion: 3 }, inputs).teams.A.lineup[0].signatureId,
    null,
  );
});
