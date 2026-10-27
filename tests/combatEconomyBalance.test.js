const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { createHash } = require("node:crypto");
const {
  resolveFight,
  beginFight,
  advanceRound,
  finishFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const {
  createCareer,
  applyCommand,
  offers,
  publicState,
  replay,
} = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");
const fighter = (name, stats = 60, fields = {}) => ({
  name,
  style: "boxing",
  stats: {
    striking: stats,
    grappling: stats,
    submissions: stats,
    conditioning: stats,
  },
  traits: [],
  fatigue: 0,
  gameplan: { approach: "strike", pace: "high", finish: "hunt-finish" },
  ...fields,
});
function sample(version, gap, n = 1000, fields = {}) {
  let wins = 0,
    round1 = 0,
    finishes = 0;
  const methods = new Set();
  for (let i = 0; i < n; i++)
    for (const reverse of [false, true]) {
      const a = fighter("A", 60, fields),
        b = fighter("B", 60 + gap);
      const r = resolveFight({
        a: reverse ? b : a,
        b: reverse ? a : b,
        seed: "prototype-" + i,
        engineVersion: version,
      });
      wins += r.winner === (reverse ? "B" : "A");
      round1 += r.round === 1;
      finishes += !["DEC", "SPLIT-DEC", "DRAW"].includes(r.method);
      methods.add(r.method);
    }
  return {
    wins: wins / (2 * n),
    round1: round1 / (2 * n),
    finishes: finishes / (2 * n),
    methods,
  };
}
test("all four accepted combat generations retain exact golden results, including active signatures", () => {
  const expected = JSON.parse(
    require("node:fs").readFileSync(
      require("node:path").join(
        __dirname,
        "fixtures/combat-legacy-hashes.json",
      ),
      "utf8",
    ),
  );
  for (const { version, hash } of expected) {
    const fights = Array.from({ length: 80 }, (_, i) => {
      const a = {
        name: "A",
        style: ["boxing", "wrestling", "bjj", "sambo"][i % 4],
        stats: {
          striking: 40 + (i % 30),
          grappling: 52,
          submissions: 60,
          conditioning: 58,
        },
        fatigue: i % 31,
        traits: i % 3 ? [] : ["iron-chin"],
        signatureId: [
          "clean-combinations",
          "chain-wrestling",
          "escape-artist",
          "pace-keeper",
        ][i % 4],
        gameplan: {
          approach: ["strike", "grapple", "balanced"][i % 3],
          pace: ["high", "measured", "cautious"][i % 3],
          finish: i % 2 ? "hunt-finish" : "play-safe",
        },
      };
      const b = {
        ...structuredClone(a),
        name: "B",
        style: "bjj",
        traits: ["suspect-chin"],
        signatureId: null,
      };
      return resolveFight({
        a,
        b,
        seed: "balance-replay-" + i,
        engineVersion: version,
        rounds: i % 2 ? 3 : 5,
      });
    });
    assert.equal(
      createHash("sha256").update(JSON.stringify(fights)).digest("hex"),
      hash,
    );
  }
  assert.equal(CURRENT_FIGHT_VERSION, 8);
});
test("large skill gaps matter more without eliminating upsets or making close matches deterministic", () => {
  const old = sample(4, 20),
    strong = sample(5, 20),
    stretch = sample(5, 30),
    close = sample(5, 5);
  assert.ok(strong.wins >= 0.07 && strong.wins <= 0.18);
  assert.ok(strong.wins < old.wins - 0.06);
  assert.ok(stretch.wins >= 0.025 && stretch.wins <= 0.1);
  assert.ok(close.wins >= 0.3 && close.wins <= 0.46);
  const equal = sample(5, 0);
  assert.equal(equal.wins, 0.5);
  assert.ok(equal.round1 < 0.25);
  assert.ok(equal.finishes > 0.3 && equal.finishes < 0.7);
});
test("equal-skill high ratings do not bypass full submission defense and specialist allocation still matters", () => {
  function rate(skill, defense) {
    let subs = 0;
    for (let i = 0; i < 1200; i++) {
      const a = fighter("A", 60, {
          style: "bjj",
          stats: {
            striking: 40,
            grappling: 65,
            submissions: skill,
            conditioning: 65,
          },
          gameplan: {
            approach: "grapple",
            pace: "measured",
            finish: "hunt-finish",
          },
        }),
        b = fighter("B", 60, {
          style: "wrestling",
          stats: {
            striking: 40,
            grappling: 60,
            submissions: defense,
            conditioning: 65,
          },
          gameplan: {
            approach: "grapple",
            pace: "measured",
            finish: "play-safe",
          },
        });
      const r = resolveFight({
        a,
        b,
        seed: "sub-defense-" + i,
        engineVersion: 5,
      });
      subs += r.winner === "A" && r.method === "SUB";
    }
    return subs / 1200;
  }
  assert.ok(rate(70, 40) > rate(70, 80) + 0.12);
});
test("new bouts keep round driving, automatic conservation and immutable source inputs", () => {
  const source = {
    a: fighter("A", 60, {
      signatureId: "clean-combinations",
      gameplan: { approach: "strike", pace: "measured", finish: "play-safe" },
    }),
    b: fighter("B", 65),
    seed: "balanced-rounds",
    engineVersion: 5,
  };
  const frozen = structuredClone(source);
  const state = beginFight(source);
  while (!state.outcome && state.round < state.rounds) advanceRound(state);
  assert.deepEqual(finishFight(state), resolveFight(source));
  assert.deepEqual(source, frozen);
});
test("upper purses reward winning while preserving full-win totals and early recovery terms", () => {
  for (const [id, show, total] of [
    ["national", 500, 1600],
    ["champions", 500, 2300],
    ["world", 500, 3200],
  ]) {
    const c = CAREER.circuits.find((c) => c.id === id);
    assert.equal(c.show, show);
    assert.equal(c.show + c.winBonus, total);
    assert.equal(c.purseVersion, 2);
    assert.ok(c.winBonus > c.show);
  }
  assert.equal(CAREER.circuits[0].show, 180);
  assert.equal(CAREER.circuits[0].titleShow, 500);
  assert.equal(CAREER.circuits[1].show, 300);
  assert.equal(CAREER.circuits[2].show, 500);
});
test("signed old purses and combat inputs remain pinned; stale unsigned price IDs require a fresh quote", () => {
  let s = createCareer({ seed: "purse-compatibility", name: "Contract gym" });
  s.gymGoals = Object.fromEntries(
    CAREER.circuits.map((c) => [c.goalId, { week: 0 }]),
  );
  // Declared promoted-contract checkpoint: individual wins and prior challenge trophies.
  s.fighters[0].record.wins = 4;
  for (const id of ["national-showcase", "next-generation"])
    s.careerChallenges[id] = { week: 0, trophy: id };
  s = applyCommand(s, {
    type: "plan",
    fighterId: "starter",
    plan: s.fighters[0].gameplan,
  });
  const quote = offers(s, s.fighters[0]).find(
    (o) => o.circuit?.id === "world" && !o.challengeId,
  );
  assert.equal(quote.show, 500);
  assert.equal(quote.winBonus, 2700);
  assert.match(quote.offerId, /-p2$/);
  assert.throws(
    () =>
      applyCommand(s, {
        type: "accept-offer",
        fighterId: "starter",
        offerId: quote.offerId.replace(/-p2$/, ""),
      }),
    /offer|expired|available/i,
  );
  s = applyCommand(s, {
    type: "accept-offer",
    fighterId: "starter",
    offerId: quote.offerId,
  });
  assert.equal(s.fights[0].combatVersion, CURRENT_FIGHT_VERSION);
  assert.equal(s.fights[0].purseVersion, 2);
  // Explicit legacy signed-contract checkpoint, never an account mutation.
  s.fights[0].combatVersion = 4;
  s.fights[0].purseVersion = 1;
  s.fights[0].show = 1400;
  s.fights[0].winBonus = 1800;
  for (let i = 0; i < 4; i++)
    s = applyCommand(s, { type: "advance", confirmCosts: true });
  assert.equal(s.fights[0].combatVersion, 4);
  assert.equal(replay(s.fights[0]).engineVersion, 4);
  const publicBout = publicState(s).fights[0];
  assert.equal(publicBout.show, 1400);
  assert.equal(publicBout.winBonus, 1800);
  const original = structuredClone(s.fights[0].inputs);
  s = applyCommand(s, {
    type: "auto-fight",
    fightId: s.fights[0].id,
    expectedRound: 0,
  });
  assert.equal(
    s.fights[0].rewards.purse,
    1400 + (s.fights[0].result.winner === "A" ? 1800 : 0),
  );
  assert.deepEqual(s.fights[0].inputs, original);
});
test("missing combat version on an old signature-era contract never upgrades its accepted rules", () => {
  let s = createCareer({ seed: "missing-v4", name: "Legacy contract" });
  const o = offers(s, s.fighters[0])[0];
  s = applyCommand(s, {
    type: "accept-offer",
    fighterId: "starter",
    offerId: o.offerId,
  });
  delete s.fights[0].combatVersion;
  while (s.week < o.eventWeek)
    s = applyCommand(s, { type: "advance", confirmCosts: true });
  assert.equal(s.fights[0].combatVersion, 4);
});

test("career first-victory cash is visible, signed, paid once and keeps purse accounting separate", () => {
  let s = createCareer({ seed: "challenge-prize", name: "Prize gym" });
  s.gymGoals = Object.fromEntries(
    CAREER.circuits.map((c) => [c.goalId, { week: 0 }]),
  );
  // Declared promoted-contract checkpoint: individual wins and prior challenge trophies.
  s.fighters[0].record.wins = 4;
  for (const id of ["national-showcase", "next-generation"])
    s.careerChallenges[id] = { week: 0, trophy: id };
  s = applyCommand(s, {
    type: "plan",
    fighterId: "starter",
    plan: s.fighters[0].gameplan,
  });
  for (const k of Object.keys(s.fighters[0].stats)) s.fighters[0].stats[k] = 95;
  const o = offers(s, s.fighters[0]).find(
    (o) => o.challengeId === "world-open",
  );
  assert.equal(o.challengeReward.cash, 5000);
  s = applyCommand(s, {
    type: "accept-offer",
    fighterId: "starter",
    offerId: o.offerId,
  });
  assert.deepEqual(s.fights[0].challengeReward, o.challengeReward);
  for (let i = 0; i < 4; i++)
    s = applyCommand(s, { type: "advance", confirmCosts: true });
  const before = s.cash;
  s = applyCommand(s, {
    type: "auto-fight",
    fightId: s.fights[0].id,
    expectedRound: 0,
  });
  const b = s.fights[0];
  assert.equal(b.result.winner, "A");
  assert.equal(b.rewards.purse, o.show + o.winBonus);
  assert.equal(b.rewards.trophy.cash, 5000);
  assert.equal(b.rewards.trophyEarnings.cash, 5000);
  assert.equal(s.cash - before, b.rewards.purse + 5000);
  assert.equal(s.economyTotals.byReason["career-challenge-trophy"], 5000);
  assert.ok(
    !offers(s, s.fighters[0]).some((o) => o.challengeId === "world-open"),
  );
  const saved = structuredClone(s);
  assert.throws(
    () =>
      applyCommand(s, {
        type: "auto-fight",
        fightId: b.id,
        expectedRound: b.decisions.length,
      }),
    /not ready|already|resolved/i,
  );
  assert.deepEqual(s, saved);
});
test("legacy signed challenge promises never acquire new first-victory cash", () => {
  let s = createCareer({
    seed: "legacy-challenge-prize",
    name: "Old prize gym",
  });
  s.gymGoals = Object.fromEntries(
    CAREER.circuits.map((c) => [c.goalId, { week: 0 }]),
  );
  // Declared promoted-contract checkpoint: individual wins and prior challenge trophies.
  s.fighters[0].record.wins = 4;
  for (const id of ["national-showcase", "next-generation"])
    s.careerChallenges[id] = { week: 0, trophy: id };
  s = applyCommand(s, {
    type: "plan",
    fighterId: "starter",
    plan: s.fighters[0].gameplan,
  });
  for (const k of Object.keys(s.fighters[0].stats)) s.fighters[0].stats[k] = 95;
  const o = offers(s, s.fighters[0]).find(
    (o) => o.challengeId === "world-open",
  );
  s = applyCommand(s, {
    type: "accept-offer",
    fighterId: "starter",
    offerId: o.offerId,
  });
  delete s.fights[0].challengeReward;
  s.fights[0].purseVersion = 1;
  s.fights[0].combatVersion = 4;
  for (let i = 0; i < 4; i++)
    s = applyCommand(s, { type: "advance", confirmCosts: true });
  const before = s.cash;
  s = applyCommand(s, {
    type: "auto-fight",
    fightId: s.fights[0].id,
    expectedRound: 0,
  });
  assert.equal(s.fights[0].result.winner, "A");
  assert.equal(s.cash - before, s.fights[0].rewards.purse);
  assert.equal(s.fights[0].rewards.trophy.cash, 0);
});

test("completed legacy trophies show their actual award without advertising retroactive cash", () => {
  const s = createCareer({
    seed: "legacy-trophy-read",
    name: "Trophy history",
  });
  s.careerChallenges["world-open"] = {
    week: 0,
    fighterId: "starter",
    fightId: "old-bout",
    trophy: "World Open trophy",
  };
  const original = structuredClone(s);
  const c = publicState(s).gymDevelopment.challenges.find(
    (c) => c.id === "world-open",
  );
  assert.equal(c.complete, true);
  assert.equal(c.reward.cash, undefined);
  assert.deepEqual(s, original);
});

test("parallel division entries share one gym-wide first-victory prize and keep every signed purse", () => {
  let s = createCareer({ seed: "parallel-prize", name: "Shared trophy gym" });
  s.gymGoals = Object.fromEntries(
    CAREER.circuits.map((c) => [c.goalId, { week: 0 }]),
  );
  // Declared promoted-contract checkpoint: individual wins and prior challenge trophies.
  s.fighters[0].record.wins = 4;
  for (const id of ["national-showcase", "next-generation"])
    s.careerChallenges[id] = { week: 0, trophy: id };
  s.fighters.push({
    ...structuredClone(s.fighters[0]),
    id: "other",
    weightClass: "featherweight",
  });
  for (const f of s.fighters)
    for (const k of Object.keys(f.stats)) f.stats[k] = 95;
  s = applyCommand(s, {
    type: "plan",
    fighterId: "starter",
    plan: s.fighters[0].gameplan,
  });
  for (const id of ["starter", "other"]) {
    const f = s.fighters.find((f) => f.id === id),
      o = offers(s, f).find((o) => o.challengeId === "world-open");
    s = applyCommand(s, {
      type: "accept-offer",
      fighterId: id,
      offerId: o.offerId,
    });
  }
  for (let i = 0; i < 4; i++)
    s = applyCommand(s, { type: "advance", confirmCosts: true });
  for (const b of [...s.fights])
    s = applyCommand(s, {
      type: "auto-fight",
      fightId: b.id,
      expectedRound: 0,
    });
  assert.ok(s.fights.every((b) => b.result.winner === "A"));
  assert.equal(s.economyTotals.byReason["career-challenge-trophy"], 5000);
  assert.equal(s.fights[0].rewards.trophy.cash, 5000);
  assert.equal(s.fights[1].rewards.challenge.alreadyEarned, true);
  assert.equal(s.fights[1].rewards.purse, 3200);
});
