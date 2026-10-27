const { test } = require("node:test");
const assert = require("node:assert/strict");
const identity = import("../frontend/src/careerIdentity.mjs");
const competition = import("../frontend/src/careerCompetition.mjs");

test("signature tooltip fallback names and short effects match authoritative rules", async () => {
  const { signatureDefinition } = await identity;
  const { SIGNATURES } = require("../consts/signatures");
  for (const ability of SIGNATURES) {
    assert.deepEqual(signatureDefinition(ability.id), { name: ability.name, effect: ability.effect });
  }
  assert.equal(signatureDefinition("unknown"), null);
});

test("a signature-only edit marks the published defense as changed, including removing a signature", async () => {
  const { defenseMatches, warDivisions } = await competition;
  const fighters = warDivisions.map((weightClass, i) => ({ id: `fighter-${i}`, weightClass, stats: { striking: 40 }, gameplan: { pace: "measured" }, signatureId: null }));
  const published = { lineup: structuredClone(fighters) };
  assert.equal(defenseMatches(published, fighters), true);
  fighters[0].signatureId = "chain-wrestling";
  assert.equal(defenseMatches(published, fighters), false);
  published.lineup[0].signatureId = "chain-wrestling";
  assert.equal(defenseMatches(published, fighters), true);
  fighters[0].signatureId = null;
  assert.equal(defenseMatches(published, fighters), false);
  delete published.lineup[0].signatureId;
  assert.equal(defenseMatches(published, fighters), true, "legacy absence and an unequipped slot are equivalent");
});

test("ambition identity retains its fighter/challenge subject and sends only the choice, not earned progress", async () => {
  const { ambitionCommand, ambitionKey } = await identity;
  const option = { goalId: "club-challenge", fighterId: "junior-1", challengeId: "next-generation", progress: { current: 99, target: 1 }, status: "complete" };
  assert.deepEqual(ambitionCommand(option), { type: "select-ambition", goalId: "club-challenge", fighterId: "junior-1", challengeId: "next-generation" });
  assert.notEqual(ambitionKey(option), ambitionKey({ ...option, fighterId: "junior-2" }));
  assert.notEqual(ambitionKey(option), ambitionKey({ ...option, challengeId: "world-open" }));
});

test("signature summaries distinguish earned access, recorded requirements and a frozen unselected slot", async () => {
  const { signatureSummary } = await identity;
  assert.equal(signatureSummary({ signatureId: "clean-combinations" }), "Signature: Clean Combinations");
  assert.equal(signatureSummary({ signatureId: "future-unknown" }), null);
  assert.equal(signatureSummary({ signatureAccess: { eligible: false, campComplete: true, boutComplete: false } }), "Signature locked · finish one career fight");
  assert.equal(signatureSummary({ signatureAccess: { eligible: false, campComplete: false, boutComplete: true } }), "Signature locked · finish one training camp");
  assert.equal(signatureSummary({ signatureAccess: { eligible: false, campComplete: false, boutComplete: false } }), "Signature locked · finish a camp and a career fight");
  assert.equal(signatureSummary({ signatureAccess: { eligible: true, locked: true } }), "Signature choice available after this bout");
});
