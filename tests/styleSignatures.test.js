const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
const {
  SIGNATURES,
  SIGNATURE_BY_ID,
  LEGACY_SIGNATURE_IDS,
  signatureChoicesFor,
} = require("../consts/signatures");
const { STYLES } = require("../consts/styles");
const {
  resolveFight,
  beginFight,
  advanceRound,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const {
  createCareer,
  applyCommand,
  publicState,
  offers,
} = require("../engine/careerEngine");
const newAbilities = SIGNATURES.filter((def) => def.minCombatVersion === 6);
const fighter = (style, plan = {}, extra = {}) => ({
  name: "Fighter",
  style,
  stats: { striking: 60, grappling: 60, submissions: 60, conditioning: 60 },
  traits: [],
  fatigue: 0,
  gameplan: {
    approach: "balanced",
    pace: "measured",
    finish: "play-safe",
    conserveBelow: 0,
    ...plan,
  },
  ...extra,
});
const input = (def, i = 0, extra = {}) => ({
  a: fighter(def.styles[0], def.conditions, { signatureId: def.id }),
  b: fighter(
    "bjj",
    { approach: "grapple", pace: "high", finish: "hunt-finish" },
    { name: "Opponent" },
  ),
  seed: `style-signature:${def.id}:${i}`,
  engineVersion: CURRENT_FIGHT_VERSION,
  rounds: 5,
  ...extra,
});
const withNoSignature = (source) => ({
  ...source,
  a: { ...source.a, signatureId: null },
});

test("each of six styles gets two specialties and common Pace Keeper; every rarity has the same choice capacity", async () => {
  const { signatureOptions, signaturePlanFits } =
    await import("../frontend/src/signatureChoices.mjs");
  assert.equal(SIGNATURES.length, 13);
  assert.equal(newAbilities.length, 9);
  for (const style of Object.keys(STYLES)) {
    const ids = signatureChoicesFor(style);
    assert.equal(ids.length, 3);
    assert.equal(ids.at(-1), "pace-keeper");
    for (const rarity of [
      "journeyman",
      "prospect",
      "contender",
      "elite",
      "legend",
    ]) {
      const f = { style, rarity };
      assert.deepEqual(
        signatureOptions(f).map(([id]) => id),
        ids,
      );
    }
    for (const id of ids)
      assert.equal(signaturePlanFits(id, SIGNATURE_BY_ID[id].conditions), true);
  }
  assert.deepEqual(signatureChoicesFor("unknown-style"), ["pace-keeper"]);
});

test("frontend never broadens style choices from an unrestricted or malformed projected catalog", async () => {
  const { signatureOptions } =
    await import("../frontend/src/signatureChoices.mjs");
  const allIds = SIGNATURES.map((def) => def.id);
  for (const style of Object.keys(STYLES)) {
    const native = signatureChoicesFor(style);
    for (const choiceIds of [allIds, [...allIds].reverse(), "all", null]) {
      assert.deepEqual(
        signatureOptions(
          { style, signatureAccess: { choiceIds } },
          SIGNATURE_BY_ID,
        ).map(([id]) => id),
        native,
      );
    }
    assert.deepEqual(
      signatureOptions({
        style,
        signatureAccess: { choiceIds: ["pace-keeper"] },
      }).map(([id]) => id),
      ["pace-keeper"],
    );
    assert.deepEqual(
      signatureOptions({ style, signatureAccess: { choiceIds: [] } }),
      [],
    );
    // The director explicitly asked to keep already selected abilities.
    for (const signatureId of LEGACY_SIGNATURE_IDS) {
      assert.deepEqual(
        signatureOptions({
          style,
          signatureId,
          signatureAccess: { choiceIds: native },
        }).map(([id]) => id),
        [signatureId],
      );
    }
  }
});

test("first choices reject cross-style IDs atomically while all existing signatures remain permanent and usable", () => {
  for (const style of Object.keys(STYLES)) {
    const s = createCareer({
      seed: `style-choice:${style}`,
      style,
      name: "Style Test",
    });
    s.fighters[0].rarity = "elite";
    const before = JSON.stringify(s);
    for (const def of SIGNATURES) {
      const select = () =>
        applyCommand(s, {
          type: "signature",
          fighterId: "starter",
          signatureId: def.id,
        });
      if (signatureChoicesFor(style).includes(def.id))
        assert.equal(select().fighters[0].signatureId, def.id);
      else assert.throws(select, /fighter's style/);
    }
    assert.equal(JSON.stringify(s), before);
    for (const signatureId of LEGACY_SIGNATURE_IDS) {
      const retained = structuredClone(s);
      retained.fighters[0].signatureId = signatureId;
      assert.equal(publicState(retained).fighters[0].signatureId, signatureId);
      assert.equal(
        applyCommand(retained, {
          type: "signature",
          fighterId: "starter",
          signatureId,
        }).fighters[0].signatureId,
        signatureId,
      );
      const alternate = signatureChoicesFor(style).find(
        (id) => id !== signatureId,
      );
      assert.throws(
        () =>
          applyCommand(retained, {
            type: "signature",
            fighterId: "starter",
            signatureId: alternate,
          }),
        /permanent/,
      );
    }
  }
});

test("version five golden results and all old signatures are unchanged; new effects never leak into old fights", () => {
  const cases = require("./fixtures/signatureLegacyCases.cjs")();
  const fixture = require("./fixtures/combat-v5-signatures-hash.json");
  const old = cases.map(resolveFight);
  assert.equal(
    createHash("sha256").update(JSON.stringify(old)).digest("hex"),
    fixture.sha256,
  );
  assert.equal(CURRENT_FIGHT_VERSION, 8);
  for (const source of cases)
    assert.deepEqual(
      resolveFight({ ...source, engineVersion: 6 }),
      resolveFight(source),
    );
  for (const def of newAbilities)
    for (const engineVersion of [1, 2, 3, 4, 5]) {
      const source = input(def, 0, { engineVersion });
      assert.deepEqual(
        resolveFight(source),
        resolveFight(withNoSignature(source)),
      );
    }
});

test("every new signature activates on actual opportunities, respects its plan/style and never mutates stats", () => {
  for (const def of newAbilities) {
    let activations = 0;
    for (let i = 0; i < 50; i++) {
      const source = input(def, i),
        original = structuredClone(source);
      const state = beginFight(source),
        effective = structuredClone(state.A.eff);
      while (!state.outcome && state.round < state.rounds) {
        const step = advanceRound(state);
        activations += state.A.signatureActivations;
        assert.deepEqual(state.A.eff, effective);
        if (def.oncePerRound) assert.ok(state.A.signatureActivations <= 1);
        const announced = step.events.filter(
          (e) => e.actor === "A" && e.type === "signature-active",
        );
        for (const event of announced) {
          assert.equal(event.signatureId, def.id);
          assert.equal(event.effectChannel, def.channel);
          assert.equal(event.value, def.value);
        }
        if (def.id === "mat-control")
          assert.equal(
            state.A.signatureActivations,
            step.events.filter((e) => e.actor === "A" && e.type === "takedown")
              .length,
          );
      }
      assert.deepEqual(source, original);
      const first = Object.keys(def.conditions)[0],
        alternatives = {
          approach: ["strike", "balanced", "grapple"],
          pace: ["high", "measured", "cautious"],
          finish: ["hunt-finish", "play-safe"],
        };
      const inactive = {
        ...source,
        a: {
          ...source.a,
          gameplan: {
            ...source.a.gameplan,
            [first]: alternatives[first].find(
              (value) => value !== def.conditions[first],
            ),
          },
        },
      };
      assert.deepEqual(
        resolveFight(inactive),
        resolveFight(withNoSignature(inactive)),
      );
      const wrongStyle = {
        ...source,
        a: {
          ...source.a,
          style: Object.keys(STYLES).find(
            (style) => !def.styles.includes(style),
          ),
        },
      };
      assert.deepEqual(
        resolveFight(wrongStyle),
        resolveFight(withNoSignature(wrongStyle)),
      );
    }
    assert.ok(
      activations > 0,
      def.id + " must produce actual eligible opportunities",
    );
  }
});

test("control signatures grant only their stated score and never increase damage, health or gas", () => {
  for (const id of ["mat-control", "heavy-landing"]) {
    const def = SIGNATURE_BY_ID[id];
    let multiple = false;
    for (let i = 0; i < 60; i++) {
      const source = input(def, i),
        active = beginFight(source),
        plain = beginFight(withNoSignature(source));
      advanceRound(active);
      advanceRound(plain);
      const attempts = active.A.takedowns;
      multiple ||= attempts > 1;
      const expected = def.oncePerRound
        ? attempts > 0
          ? def.value
          : 0
        : attempts * def.value;
      assert.ok(
        Math.abs(active.A.roundControl - plain.A.roundControl - expected) <
          1e-8,
      );
      assert.equal(active.A.totalDamage, plain.A.totalDamage);
      assert.equal(active.B.totalDamage, plain.B.totalDamage);
      assert.equal(active.A.gas, plain.A.gas);
      assert.equal(active.B.gas, plain.B.gas);
    }
    assert.equal(multiple, true, "Exercise repeated takedowns within a round");
  }
});

test("old booked fights retain their rules and postpone new abilities; new contracts accept style signatures", () => {
  let s = createCareer({
    seed: "legacy-booking-style",
    style: "boxing",
    name: "Contract Test",
  });
  s.fighters[0].rarity = "elite";
  const offer = offers(s, s.fighters[0]).find((o) => !o.blockedReason);
  s = applyCommand(s, {
    type: "accept-offer",
    fighterId: "starter",
    offerId: offer.offerId,
  });
  assert.equal(s.fights[0].combatVersion, CURRENT_FIGHT_VERSION);
  assert.equal(
    applyCommand(s, {
      type: "signature",
      fighterId: "starter",
      signatureId: "slippery-guard",
    }).fighters[0].signatureId,
    "slippery-guard",
  );
  s.fights[0].combatVersion = 5;
  const original = structuredClone(s.fights[0]);
  assert.match(
    publicState(s).fighters[0].signatureAccess.choiceBlocks["slippery-guard"],
    /booked fight/,
  );
  assert.throws(
    () =>
      applyCommand(s, {
        type: "signature",
        fighterId: "starter",
        signatureId: "slippery-guard",
      }),
    /booked fight/,
  );
  const common = applyCommand(s, {
    type: "signature",
    fighterId: "starter",
    signatureId: "pace-keeper",
  });
  assert.deepEqual(common.fights[0], original);
});

test("automatic low-gas conservation uses the actual new-signature trigger instead of the saved pace or finish", () => {
  const { automatic } = require("../engine/careerEngine");
  for (const id of [
    "pressure-strikes",
    "submission-hunter",
    "slippery-guard",
    "timed-entry",
  ]) {
    const def = SIGNATURE_BY_ID[id];
    let activated = 0;
    for (let i = 0; i < 50; i++) {
      const source = input(def, i);
      source.a.gameplan.conserveBelow = 30;
      const state = beginFight(source);
      state.A.gas = 1;
      state.A.gameplan = automatic(source.a.gameplan, state.A);
      assert.equal(state.A.gameplan.pace, "cautious");
      assert.equal(state.A.gameplan.finish, source.a.gameplan.finish);
      advanceRound(state);
      activated += state.A.signatureActivations;
    }
    if (id === "pressure-strikes") assert.equal(activated, 0);
    else assert.ok(activated > 0);
  }
});

test("Transition Trap never boosts off-the-back attempts when no top-position takedown happened", () => {
  let checked = 0;
  for (let i = 0; i < 100; i++) {
    const source = input(SIGNATURE_BY_ID["transition-trap"], i);
    source.a.stats.grappling = 1;
    source.b.stats.grappling = 99;
    const state = beginFight(source),
      step = advanceRound(state);
    if (
      !state.A.takedowns &&
      step.events.some(
        (e) => e.actor === "A" && ["sub-attempt", "sub"].includes(e.type),
      )
    ) {
      checked++;
      assert.equal(state.A.signatureActivations, 0);
    }
  }
  assert.ok(checked > 0, "Exercise actual submission attempts from the back");
});
