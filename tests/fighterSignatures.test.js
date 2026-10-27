const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const {
  beginFight,
  advanceRound,
  finishFight,
  resolveFight,
  CURRENT_FIGHT_VERSION,
  SUPPORTED_FIGHT_VERSIONS,
} = require("../engine/fightEngine");
const { SIGNATURES, signatureFor } = require("../consts/signatures");
const { automatic } = require("../engine/careerEngine");

const fighter = (name, overrides = {}) => ({
  name,
  style: "boxing",
  stats: { striking: 50, grappling: 50, submissions: 50, conditioning: 50 },
  traits: [],
  fatigue: 0,
  gameplan: {
    approach: "strike",
    pace: "measured",
    finish: "play-safe",
    conserveBelow: 30,
  },
  ...overrides,
});
const input = (seed, a = {}, b = {}) => ({
  a: fighter("Alex", a),
  b: fighter("Sam", b),
  seed,
  engineVersion: CURRENT_FIGHT_VERSION,
});
const events = (result) => result.rounds.flatMap((round) => round.events);

test("version three fights replay their original golden results and all legacy versions remain supported", () => {
  assert.deepEqual(SUPPORTED_FIGHT_VERSIONS, [1, 2, 3, 4, 5, 6, 7, 8]);
  const a = {
    name: "Alex",
    style: "boxing",
    stats: { striking: 50, grappling: 50, submissions: 50, conditioning: 50 },
    gameplan: { finish: "hunt-finish" },
  };
  const b = { ...a, name: "Sam", style: "bjj" };
  const rows = Array.from({ length: 40 }, (_, i) =>
    resolveFight({ a, b, seed: `version-three-golden-${i}`, engineVersion: 3 }),
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
    "59099767f899206ee5608702a56d5d27674171d48bc7e4941c93401e85dbc8cc",
  );
  for (const engineVersion of [1, 2, 3])
    for (const signature of SIGNATURES) {
      const plain = input(`legacy-${signature.id}`);
      assert.deepEqual(
        resolveFight({ ...plain, engineVersion }),
        resolveFight({
          ...plain,
          a: { ...plain.a, signatureId: signature.id },
          engineVersion,
        }),
      );
    }
});

test("version four plain fights preserve version three; inactive signatures have no effect under current rules", () => {
  for (let i = 0; i < 30; i++) {
    const plain = input(`no-signature-${i}`);
    assert.deepEqual(
      resolveFight({ ...plain, engineVersion: 4 }),
      resolveFight({ ...plain, engineVersion: 3 }),
    );
    for (const signatureId of [
      "clean-combinations",
      "chain-wrestling",
      "escape-artist",
      "pace-keeper",
      "forged-signature",
    ]) {
      const inactive = {
        approach: "balanced",
        pace: "high",
        finish: "hunt-finish",
        conserveBelow: 0,
      };
      const baseline = { ...plain, a: { ...plain.a, gameplan: inactive } };
      assert.deepEqual(
        resolveFight(baseline),
        resolveFight({ ...baseline, a: { ...baseline.a, signatureId } }),
      );
    }
  }
});

test("contest signatures activate only on real eligible exchanges without mutating effective stats", () => {
  const cases = [
    [
      "clean-combinations",
      { approach: "strike", pace: "measured", finish: "play-safe" },
    ],
    [
      "chain-wrestling",
      { approach: "grapple", pace: "high", finish: "play-safe" },
    ],
    [
      "escape-artist",
      { approach: "grapple", pace: "measured", finish: "play-safe" },
    ],
  ];
  for (const [signatureId, gameplan] of cases) {
    let activations = 0;
    for (let i = 0; i < 30; i++) {
      const source = input(
        `active-${signatureId}-${i}`,
        { signatureId, gameplan },
        {
          style: "bjj",
          gameplan: {
            approach: "grapple",
            pace: "measured",
            finish: "hunt-finish",
          },
        },
      );
      const frozen = structuredClone(source);
      const state = beginFight(source);
      const effective = structuredClone(state.A.eff);
      while (!state.outcome && state.round < state.rounds) advanceRound(state);
      const result = finishFight(state);
      assert.deepEqual(state.A.eff, effective);
      assert.deepEqual(source, frozen);
      const active = events(result).filter(
        (event) => event.actor === "A" && event.type === "signature-active",
      );
      assert.ok(
        active.every(
          (event) =>
            event.signatureId === signatureId &&
            event.contestMultiplier ===
              signatureFor(signatureId).contestMultiplier,
        ),
      );
      assert.equal(
        new Set(active.map((event) => event.round)).size,
        active.length,
        "one factual activation notice per round",
      );
      activations += active.length;
      assert.deepEqual(
        result,
        resolveFight(source),
        "manual and automatic round driving must agree",
      );
    }
    assert.ok(
      activations > 0,
      `${signatureId} must affect actual opportunities`,
    );
  }
});

test("Pace Keeper saves at most one raw gas per played round, never refills an exhausted tank", () => {
  for (const rounds of [3, 5])
    for (let i = 0; i < 20; i++) {
      const result = resolveFight({
        ...input(`gas-saving-${rounds}-${i}`, { signatureId: "pace-keeper" }),
        rounds,
      });
      const saved = events(result).filter(
        (event) => event.actor === "A" && event.signatureId === "pace-keeper",
      );
      assert.ok(saved.length <= result.round);
      assert.equal(
        new Set(saved.map((event) => event.round)).size,
        saved.length,
      );
      assert.ok(
        saved.every(
          (event) => event.rawGasSaved >= 0 && event.rawGasSaved <= 1,
        ),
      );
      assert.ok(
        saved.reduce((sum, event) => sum + event.rawGasSaved, 0) <= rounds,
      );
    }
  const state = beginFight(input("empty-tank", { signatureId: "pace-keeper" }));
  state.A.gas = 0;
  const round = advanceRound(state);
  assert.equal(state.A.gas, 0);
  assert.equal(
    round.events.find(
      (event) => event.actor === "A" && event.signatureId === "pace-keeper",
    ).rawGasSaved,
    0,
  );
  assert.equal(round.summary.A.signature.rawGasSaved, 0);
});

test("signatures use the actual automatic conservation plan rather than the saved measured/high label", () => {
  for (const signatureId of ["clean-combinations", "pace-keeper"]) {
    const plan = {
      approach: signatureId === "chain-wrestling" ? "grapple" : "strike",
      pace: signatureId === "chain-wrestling" ? "high" : "measured",
      finish: "play-safe",
      conserveBelow: 30,
    };
    const state = beginFight(
      input(`conserve-${signatureId}`, { signatureId, gameplan: plan }),
    );
    state.A.gas = 5;
    state.A.gameplan = automatic(plan, state.A);
    assert.equal(state.A.gameplan.pace, "cautious");
    assert.equal(
      advanceRound(state).events.some(
        (event) => event.actor === "A" && event.type === "signature-active",
      ),
      false,
    );
  }
});

test("rarity itself has no combat multiplier and existing traits still combine deterministically", () => {
  for (const signature of SIGNATURES)
    for (let i = 0; i < 20; i++) {
      const plain = input(`label-only-${signature.id}-${i}`, {
        signatureId: signature.id,
        traits: [
          "iron-chin",
          "killer-instinct",
          "cardio-machine",
          "fast-starter",
        ],
      });
      const prospect = resolveFight({
        ...plain,
        a: { ...plain.a, rarity: "prospect" },
      });
      assert.deepEqual(
        prospect,
        resolveFight({ ...plain, a: { ...plain.a, rarity: "legend" } }),
      );
    }
});
