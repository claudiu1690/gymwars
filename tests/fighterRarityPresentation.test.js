const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  publicState,
} = require("../engine/careerEngine");
const { PITY_THRESHOLDS } = require("../consts/rarity");
const presentation = import("../frontend/src/fighterRarity.mjs");

test("rarity copy respects earned, permanent and bout-locked signature access without reading hidden limits", async () => {
  const { rarityBenefits } = await presentation;
  const f = {
    rarity: "prospect",
    signatureAccess: { eligible: false, campComplete: true },
  };
  assert.match(rarityBenefits(f).signature, /one career bout$/);
  assert.equal(
    rarityBenefits({ ...f, signatureAccess: { eligible: true } }).signature,
    "Signature choice earned · ready now",
  );
  assert.match(
    rarityBenefits({ ...f, signatureAccess: { eligible: true, locked: true } })
      .signature,
    /after this bout/,
  );
  assert.match(
    rarityBenefits(
      { ...f, signatureId: "escape-artist" },
      { "escape-artist": { name: "Escape Artist" } },
    ).signature,
    /^Escape Artist · chosen$/,
  );
  assert.match(rarityBenefits({ rarity: "elite" }).signature, /immediately/);
  assert.match(rarityBenefits({ rarity: "legend" }).potential, /^Highest/);
  assert.equal(
    rarityBenefits({ rarity: "unknown", potential: { striking: 99 } }),
    null,
  );
  const plain = rarityBenefits(f);
  assert.deepEqual(
    rarityBenefits({
      ...f,
      potential: { striking: 99 },
      stats: { striking: 100 },
    }),
    plain,
  );
  assert.match(
    rarityBenefits({ rarity: "elite", retired: true }).signature,
    /former fighter/,
  );
});

test("rare discovery comes only from a new acknowledged report, never hidden rarity, duplicate receipt or another report", async () => {
  const { rarityDiscovery, rarityBenefits } = await presentation;
  let s = createCareer({
    seed: "rarity-presentation",
    name: "Rarity Test",
    style: "boxing",
  });
  s.scouting.pity.legend = PITY_THRESHOLDS.legend;
  const before = JSON.stringify(s);
  const hidden = publicState(s);
  const id = hidden.board[0].id;
  assert.equal(rarityDiscovery({ career: hidden }, id), null);
  assert.equal(rarityBenefits(hidden.board[0].fighter), null);
  assert.equal(JSON.stringify(s), before);
  s = applyCommand(s, { type: "investigate", reportId: id });
  const result = { career: publicState(s) };
  assert.deepEqual(rarityDiscovery(result, id), {
    reportId: id,
    rarity: "legend",
    label: "Legend",
  });
  assert.equal(rarityDiscovery({ ...result, duplicate: true }, id), null);
  assert.equal(rarityDiscovery(result, "another-report"), null);
  assert.equal(result.career.board[0].fighter.potential, undefined);
  assert.equal(result.career.week, hidden.week);
  assert.equal(result.career.cash, hidden.cash);
  assert.deepEqual(result.career.fighters, hidden.fighters);
});
