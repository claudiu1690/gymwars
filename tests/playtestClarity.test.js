// Clarity fixes from the 31 Oct 2026 playtest (docs/playtest-2026-10-31).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../engine/careerEngine");

const load = (path) => import(`../frontend/src/${path}`);

test("the career menu grows with progress and never hides the open page", async () => {
  const { careerNav } = await load("careerGuide.mjs");
  const ids = (s, page) => careerNav(s, page).map((item) => item.id);
  const one = [{ id: "a" }];
  assert.deepEqual(ids({ boutsCompleted: 0, fighters: one }), [
    "home",
    "roster",
    "fights",
    "gym",
  ]);
  assert.deepEqual(ids({ boutsCompleted: 1, fighters: one }), [
    "home",
    "roster",
    "fights",
    "gym",
    "campaign",
  ]);
  assert.ok(
    ids({ boutsCompleted: 1, fighters: [...one, { id: "b" }] }).includes(
      "gym-wars",
    ),
  );
  assert.equal(ids({ boutsCompleted: 2, fighters: one }).length, 8);
  // A deep link to a locked page keeps its menu entry.
  assert.ok(ids({ boutsCompleted: 0, fighters: one }, "shop").includes("shop"));
  const fresh = careerNav({ boutsCompleted: 1, fighters: one });
  assert.equal(fresh.find((item) => item.id === "campaign").fresh, true);
  assert.equal(
    careerNav({ boutsCompleted: 9, fighters: one }).some((item) => item.fresh),
    false,
  );
});

test("a quiet week reads as one line of gains and readiness", async () => {
  const { weekSummary } = await load("trainingPlans.mjs");
  const report = {
    fighters: [
      {
        name: "Devon Reyes",
        outcome: "training",
        gains: { striking: 0.2, grappling: 1.1 },
        readiness: 91,
      },
      { name: "Ana Lu", outcome: "rest", gains: { striking: 0 }, readiness: 100 },
      { name: "Kim Ode", outcome: "rest", gains: {}, readiness: 80 },
    ],
  };
  assert.equal(
    weekSummary(report),
    "Devon +1.1 grappling · 91% ready | Ana 100% ready | +1 more",
  );
  assert.equal(weekSummary(null), "");
});

test("the camp check-in shows fight-night readiness and the bonus for each choice", async () => {
  const { campReviewOutcomes } = await load("trainingPlans.mjs");
  const s = engine.publicState(
    engine.createCareer({ seed: "check-in", name: "Check-in Gym" }),
  );
  const f = s.fighters[0];
  const preset = Object.keys(s.rules.presets).find(
    (id) => s.rules.presets[id].preparationValue > 0,
  );
  f.fatigue = 30;
  f.camp = {
    preset,
    weeks: 4,
    completed: 2,
    commitmentBonus: 1,
    scheduleVersion: 2,
    needsReview: true,
    allocations: s.rules.presets[preset].allocations,
  };
  s.fights.push({
    id: "booked",
    fighterId: f.id,
    status: "scheduled",
    eventWeek: s.week + 3,
  });
  const out = campReviewOutcomes(s, f);
  assert.equal(out.remaining, 2);
  assert.ok(out.keep.bonus > 0);
  assert.equal(out.stop.bonus, 0);
  // Stopping now recovers for longer, so it never arrives less ready.
  assert.ok(out.stop.readiness >= out.keep.readiness);
  assert.ok(out.keep.readiness > 0 && out.stop.readiness <= 100);
  s.fights.length = 0;
  assert.equal(campReviewOutcomes(s, f).keep.readiness, null);
});

test("signature text is plain for players while saved definitions keep their wording", async () => {
  const { plainSignatureText } = await load("careerIdentity.mjs");
  assert.equal(
    plainSignatureText("+4% standing attack contest"),
    "+4% standing attack chance",
  );
  assert.equal(
    plainSignatureText("Save up to 1 raw gas per round"),
    "Saves up to 1 gas each round",
  );
  assert.equal(
    plainSignatureText("+0.2 judging control per takedown"),
    "+0.2 scorecard control per takedown",
  );
  const json = require("../consts/signatures.json");
  assert.ok(JSON.stringify(json).includes("raw gas"));
});

test("an opponent never shows the same face as the fighter across the cage", async () => {
  const { fighterPortrait } = await load("fighterPortraits.mjs");
  const mine = { id: "mine", weightClass: "lightweight" };
  const own = fighterPortrait(mine);
  // Find an opponent identity whose fallback lands on the same art.
  let twin = null;
  for (let i = 0; i < 500 && !twin; i++) {
    const candidate = { id: `rival-${i}`, weightClass: "lightweight" };
    if (fighterPortrait(candidate) === own) twin = candidate;
  }
  assert.ok(twin, "expected a fallback collision in the portrait pool");
  assert.notEqual(fighterPortrait(twin, mine), own);
  // A saved portrait that matches the player's is swapped for display only.
  const saved = { id: "x", weightClass: "lightweight", portrait: own.id };
  assert.notEqual(fighterPortrait(saved, mine), own);
  assert.equal(saved.portrait, own.id);
  // Without a clash the opponent keeps their own face.
  let distinct = null;
  for (let i = 0; i < 500 && !distinct; i++) {
    const candidate = { id: `other-${i}`, weightClass: "lightweight" };
    if (fighterPortrait(candidate) !== own) distinct = candidate;
  }
  assert.equal(fighterPortrait(distinct, mine), fighterPortrait(distinct));
});

test("an empty week bank ends the session with what is waiting, not a dead end", async () => {
  const { sessionPause } = await load("careerGuide.mjs");
  const s = engine.publicState(
    engine.createCareer({ seed: "pause", name: "Pause Gym" }),
  );
  const f = s.fighters[0];
  const now = Date.parse("2026-10-31T12:00:00Z");
  const empty = {
    available: 0,
    refill: 4,
    maximum: 12,
    nextRefillAt: new Date(now + 18 * 3600000).toISOString(),
  };
  const advance = { kind: "advance", cta: "End week" };
  assert.equal(sessionPause(s, { ...empty, available: 2 }, advance, now), null);
  // Fights and check-ins never need weeks, so they keep the normal guide.
  assert.equal(sessionPause(s, empty, { kind: "fight" }, now), null);
  assert.equal(sessionPause(s, empty, { kind: "camp-review" }, now), null);

  let pause = sessionPause(s, empty, advance, now);
  assert.equal(pause.refill, "+4 weeks in 18 h");
  assert.equal(pause.fight, null);
  assert.equal(pause.gymWars.covered, 1);
  assert.equal(pause.gymWars.total, 4);
  assert.equal(pause.gymWars.missing.length, 3);
  assert.match(pause.next.label, /^Scout a /);
  assert.equal(pause.next.href, "/career/scouting");

  const rival = s.rivals[0];
  s.fights.push({ id: "b1", fighterId: f.id, opponentId: rival.id, status: "scheduled", eventWeek: 12 });
  s.scoutsUsed = s.rules.scoutsPerWeek;
  pause = sessionPause(s, empty, advance, now);
  assert.equal(pause.fight.text, `${f.name.split(" ")[0]} vs ${rival.name}`);
  assert.equal(pause.fight.when, "Week 13");
  assert.equal(pause.next.href, "/career/bout/b1/tactics");

  // Actions that need no weeks, like booking, stay the one thing to do.
  const book = { kind: "book", cta: "Book the next fight" };
  assert.equal(sessionPause(s, empty, book, now).next.guide, book);
});

test("every offer reads as Easier, Even or Harder from average skills", async () => {
  const { offerPurpose } = await load("careerOffers.mjs");
  const stats = (n) => ({ striking: n, grappling: n, submissions: n, conditioning: n });
  const f = { stats: stats(50), offers: [] };
  const s = { fights: [] };
  const offer = (n) => ({ opponent: { stats: stats(n) }, notice: 4 });
  assert.equal(offerPurpose(s, f, offer(40)).matchup, "Easier");
  assert.match(offerPurpose(s, f, offer(40)).matchupDetail, /10 lower/);
  assert.equal(offerPurpose(s, f, offer(53)).matchup, "Even");
  assert.equal(offerPurpose(s, f, offer(60)).matchup, "Harder");
});

test("a round replay uses only recorded exchanges, condition and the judges' card", async () => {
  const { roundPlayback } = await load("fightPresentation.mjs");
  const { resolveFight, ROUND_SCORING_VERSION } = require("../engine/fightEngine");
  const fighter = (name, style) => ({
    name,
    style,
    traits: [],
    fatigue: 0,
    stats: { striking: 50, grappling: 50, submissions: 50, conditioning: 50 },
    gameplan: { approach: "balanced", pace: "measured", finish: "hunt-finish", conserveBelow: 30 },
  });
  const names = { A: "Alex", B: "Jonas" };
  let checked = 0;
  for (let i = 0; i < 20; i++) {
    const result = resolveFight({
      a: fighter("Alex", "boxing"),
      b: fighter("Jonas", "wrestling"),
      seed: `replay-${i}`,
      engineVersion: ROUND_SCORING_VERSION,
    });
    const b = { result, roundSummaries: result.roundSummaries };
    for (let round = 1; round <= result.round; round++) {
      const play = roundPlayback(b, round, names);
      assert.ok(play.groups.length > 0);
      const summary = result.roundSummaries[round - 1];
      assert.deepEqual(play.condition.A.health, [summary.A.healthBefore, summary.A.healthAfter]);
      if (summary.finish) assert.equal(play.finish.method, result.method);
      else assert.equal(play.card.winner, summary.winner);
      const downs = result.rounds[round - 1].events.filter((e) => e.type === "knockdown").length;
      assert.equal(play.groups.filter((g) => g.moment === "KNOCKDOWN").length > 0, downs > 0);
      checked++;
    }
    assert.equal(roundPlayback(b, result.round + 1, names), null);
  }
  assert.ok(checked > 20);
  // A live bout replays its latest round from the events it just received.
  const live = { decisions: [{}], latestEvents: [
    { round: 1, time: "0:30", actor: "A", type: "strike", text: "x" },
  ] };
  assert.equal(roundPlayback(live, 1, names).groups.length, 1);
  assert.equal(roundPlayback(live, 1, names).condition, null);
});
