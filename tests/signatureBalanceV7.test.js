const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const {
  SIGNATURES,
  signatureFor,
  signatureChoicesFor,
  signaturePlanFits,
} = require("../consts/signatures");
const {
  resolveFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const {
  createCareer,
  applyCommand,
  publicState,
  offers,
} = require("../engine/careerEngine");
const { publicWarResult } = require("../services/careerWarPresentation");
const changed = ["pressure-strikes", "escape-artist", "chain-wrestling"];

test("v7 tunes only the approved three bonuses; every accepted v6 fight remains identical", () => {
  assert.equal(CURRENT_FIGHT_VERSION, 8);
  assert.equal(signatureFor("pressure-strikes").value, 1.02);
  assert.equal(signatureFor("escape-artist").contestMultiplier, 1.12);
  assert.equal(signatureFor("chain-wrestling").contestMultiplier, 1.06);
  for (const id of changed) {
    assert.equal(
      signatureFor(id, 6).contestMultiplier || signatureFor(id, 6).value,
      1.04,
    );
    if (id !== "chain-wrestling")
      assert.deepEqual(
        signatureFor(id).conditions,
        signatureFor(id, 6).conditions,
      );
    assert.deepEqual(signatureFor(id).styles, signatureFor(id, 6).styles);
  }
  for (const def of SIGNATURES.filter((def) => !changed.includes(def.id)))
    assert.deepEqual(def, signatureFor(def.id, 6));
  const cases = require("./fixtures/signatureV6Cases.cjs")();
  const golden = require("./fixtures/combat-v6-signatures-hash.json");
  assert.equal(cases.length, golden.cases);
  assert.equal(
    createHash("sha256")
      .update(JSON.stringify(cases.map(resolveFight)))
      .digest("hex"),
    golden.sha256,
  );
});

test("v7 Chain Wrestling works at all grappling paces; v6 keeps the high-pace requirement", async () => {
  const ui = await import("../frontend/src/signatureChoices.mjs");
  const original = require("./fixtures/signatureV6Cases.cjs")()[0];
  for (const pace of ["high", "measured", "cautious"]) {
    const plan = { approach: "grapple", pace, finish: "play-safe" };
    assert.equal(signaturePlanFits("chain-wrestling", plan, 7), true);
    assert.equal(ui.signaturePlanFits("chain-wrestling", plan, 7), true);
    assert.equal(
      signaturePlanFits("chain-wrestling", plan, 6),
      pace === "high",
    );
    assert.equal(
      ui.signaturePlanFits("chain-wrestling", plan, 6),
      pace === "high",
    );
    let activations = 0;
    for (let i = 0; i < 25; i++) {
      const input = {
        ...original,
        seed: `v7-chain-pace:${pace}:${i}`,
        a: {
          ...original.a,
          style: "wrestling",
          signatureId: "chain-wrestling",
          gameplan: plan,
        },
        b: { ...original.b, signatureId: null },
      };
      const result = resolveFight({ ...input, engineVersion: 7 });
      activations += result.rounds
        .flatMap((r) => r.events)
        .filter(
          (e) => e.actor === "A" && e.signatureId === "chain-wrestling",
        ).length;
      if (pace !== "high")
        assert.deepEqual(
          resolveFight({ ...input, engineVersion: 6 }),
          resolveFight({
            ...input,
            engineVersion: 6,
            a: { ...input.a, signatureId: null },
          }),
        );
    }
    assert.ok(
      activations > 0,
      "Exercise actual entry opportunities at " + pace,
    );
  }
  for (const approach of ["strike", "balanced"])
    assert.equal(
      signaturePlanFits("chain-wrestling", { approach, pace: "high" }, 7),
      false,
    );
});

test("v7 retains previously selected IDs and old booked-bout effects without migrating a save", async () => {
  const ui = await import("../frontend/src/signatureChoices.mjs");
  const identity = await import("../frontend/src/careerIdentity.mjs");
  for (const id of changed) {
    const style = signatureFor(id).styles[0];
    let raw = createCareer({
      seed: `v7-kept:${id}`,
      style,
      name: "Keep choices",
    });
    raw.fighters[0].rarity = "elite";
    raw = applyCommand(raw, {
      type: "signature",
      fighterId: "starter",
      signatureId: id,
    });
    raw = applyCommand(raw, {
      type: "accept-offer",
      fighterId: "starter",
      offerId: offers(raw, raw.fighters[0]).find((o) => !o.blockedReason)
        .offerId,
    });
    raw.fights[0].combatVersion = 6;
    const before = JSON.stringify(raw);
    const shown = publicState(structuredClone(raw));
    assert.equal(shown.fighters[0].signatureId, id);
    assert.equal(shown.fighters[0].signatureAccess.combatVersion, 6);
    assert.equal(shown.fighters[0].signatureAccess.previousBalance, true);
    assert.equal(
      ui.signatureOptions(shown.fighters[0], shown.rules.signatures)[0][1]
        .effect,
      signatureFor(id, 6).effect,
    );
    assert.equal(
      identity.signatureDefinition(id, shown.rules.signatures, 6).effect,
      signatureFor(id, 6).effect,
    );
    assert.equal(JSON.stringify(raw), before);
    const retry = applyCommand(raw, {
      type: "signature",
      fighterId: "starter",
      signatureId: id,
    });
    assert.equal(retry.fighters[0].signatureId, id);
    assert.equal(
      retry.fighters[0].history.filter((h) => h.type === "signature").length,
      1,
    );
    assert.throws(
      () =>
        applyCommand(raw, {
          type: "signature",
          fighterId: "starter",
          signatureId: "pace-keeper",
        }),
      /permanent/,
    );
    assert.deepEqual(
      shown.fighters[0].signatureAccess.choiceIds,
      signatureChoicesFor(style),
    );
  }
});

test("historical 4v4 ability tooltips keep their accepted balance instead of today's values", async () => {
  const { signatureDefinition } =
    await import("../frontend/src/careerIdentity.mjs");
  const f = {
    id: "kept",
    name: "Kept choice",
    style: "bjj",
    signatureId: "escape-artist",
  };
  for (const version of [4, 5, 6, 7]) {
    const inputs = {
      attacker: { name: "A", combatVersion: version, lineup: [f] },
      defender: { name: "B", combatVersion: version, lineup: [f] },
    };
    const shown = publicWarResult({ combatVersion: version }, inputs).teams.A
      .lineup[0];
    assert.equal(shown.signatureId, "escape-artist");
    assert.equal(shown.signatureCombatVersion, version);
    assert.equal(
      signatureDefinition(
        shown.signatureId,
        undefined,
        shown.signatureCombatVersion,
      ).effect,
      signatureFor("escape-artist", version).effect,
    );
  }
});

test("unaffected abilities retain exact v6 outcomes under v7 and inactive tuned abilities add nothing", () => {
  const source = require("./fixtures/signatureV6Cases.cjs")()[0];
  for (const def of SIGNATURES)
    for (let i = 0; i < 15; i++) {
      const baseline = {
        ...source,
        seed: `v7-unchanged:${def.id}:${i}`,
        a: {
          ...source.a,
          style: def.styles[0] === "*" ? "boxing" : def.styles[0],
          signatureId: def.id,
          gameplan: changed.includes(def.id)
            ? { approach: "balanced", pace: "cautious", finish: "hunt-finish" }
            : def.conditions,
        },
        b: { ...source.b, signatureId: "pace-keeper" },
      };
      assert.deepEqual(
        resolveFight({ ...baseline, engineVersion: 7 }),
        resolveFight({ ...baseline, engineVersion: 6 }),
      );
    }
});
