// Reproducible engine experiments, never a claim about human retention or fun.
const assert = require("node:assert/strict");
const {
  createCareer,
  applyCommand,
  offers,
  weeklyCost,
  publicState,
} = require("../engine/careerEngine");
const allowances = require("../services/careerAllowances");
const {
  divisions,
  snapshotFor,
  resolveWar,
} = require("../engine/careerWarEngine");
const { CAREER } = require("../consts/career");
function simulate(policy, seed, days = 14) {
  let state = createCareer({
      seed: `alpha-${seed}-${policy}`,
      name: "Pacing trial",
      style: "boxing",
    }),
    daily = null;
  const milestones = {
      secondFighter: null,
      team: null,
      debut: null,
      expansion: null,
      belt: null,
      coachPromotion: null,
    },
    visits = [];
  let minCash = state.cash,
    hardshipWeeks = 0;
  const active = () => state.fighters.filter((f) => !f.retired && !f.released);
  for (let day = 0; day < days; day++) {
    const now = Date.parse("2026-10-01T12:00:00Z") + day * allowances.DAY;
    daily = allowances.materialize(daily, now);
    const atArrival = state.week;
    const act = (type, fields = {}) => {
      const before = state.week;
      state = applyCommand(
        state,
        { type, ...fields },
        { maxAdvanceWeeks: daily.careerWeeks.balance },
      );
      if (state.week > before)
        daily = allowances.spend(
          daily,
          "careerWeeks",
          state.week - before,
          now,
        );
      return state;
    };
    const note = () => {
      if (active().length >= 2 && milestones.secondFighter == null)
        milestones.secondFighter = day;
      if (state.boutsCompleted && milestones.debut == null)
        milestones.debut = day;
      if (
        new Set(active().map((f) => f.weightClass)).size === 4 &&
        milestones.team == null
      )
        milestones.team = day;
      if (state.facilityTier > 1 && milestones.expansion == null)
        milestones.expansion = day;
      if (active().some((f) => f.isChampion) && milestones.belt == null)
        milestones.belt = day;
      if (state.staff.coach?.rank > 1 && milestones.coachPromotion == null)
        milestones.coachPromotion = day;
    };
    // Resolve ready fights and camp decisions even when the week bank is empty.
    for (let safety = 0; safety < 80; safety++) {
      for (const f of active().filter((f) => f.camp?.needsReview))
        act("camp-review", {
          fighterId: f.id,
          choice:
            policy === "recovery" && f.fatigue > 40 ? "taper" : "continue",
        });
      for (const b of state.fights.filter((b) =>
        ["ready", "live"].includes(b.status),
      ))
        act("auto-fight", { fightId: b.id, expectedRound: b.decisions.length });
      note();
      for (const r of [...state.board]) {
        if (
          new Set(active().map((f) => f.weightClass)).size === 4 ||
          state.scoutsUsed >= CAREER.scoutsPerWeek
        )
          break;
        if (
          r.signed ||
          r.investigated ||
          active().some((f) => f.weightClass === r.fighter.weightClass)
        )
          continue;
        act("investigate", { reportId: r.id });
        const revealed = state.board.find((x) => x.id === r.id);
        if (state.cash >= revealed.fee + weeklyCost(state) * 2)
          act("sign", { reportId: r.id });
      }
      if (
        state.boutsCompleted &&
        !state.staff.coach &&
        state.cash > CAREER.staff.coach.ranks[1].fee + weeklyCost(state) * 8
      )
        act("hire", { role: "coach" });
      for (const f of active()) {
        if (
          f.camp ||
          state.fights.some(
            (b) => b.fighterId === f.id && b.status !== "resolved",
          ) ||
          (policy === "recovery" && f.fatigue > 18)
        )
          continue;
        let options = offers(state, f).filter((o) => !o.unavailable);
        options.sort((a, b) => a.notice - b.notice || a.winBonus - b.winBonus);
        const offer =
          policy === "pressure"
            ? options[0]
            : policy === "balanced"
              ? [...options].sort(
                  (a, b) =>
                    Number(b.title) - Number(a.title) ||
                    (b.circuit?.level || 1) - (a.circuit?.level || 1) ||
                    b.notice - a.notice,
                )[0]
              : options.find((o) => o.notice >= 4) || options[0];
        if (!offer) continue;
        act("accept-offer", { fighterId: f.id, offerId: offer.offerId });
        if (policy !== "pressure" && offer.notice >= 4)
          act("camp", {
            fighterId: f.id,
            preset:
              policy === "recovery"
                ? "defense"
                : ["pressure", "defense", "balanced"][day % 3],
            weeks: 4,
          });
      }
      const view = publicState(state),
        next = CAREER.facilities[state.facilityTier + 1];
      if (
        next &&
        view.gymDevelopment.expansion.canUpgrade &&
        state.cash >= next.cost + weeklyCost(state) * 8
      )
        act("upgrade");
      if (view.staffOptions?.coach?.canUpgrade)
        act("upgrade-staff", { role: "coach" });
      note();
      if (!daily.careerWeeks.balance) break;
      const before = state.week;
      act("advance", { confirmCosts: true });
      assert.equal(
        state.week,
        before + 1,
        "each explicit end-week plays exactly one week",
      );
      minCash = Math.min(minCash, state.cash);
      if (state.lastAdvance?.waived > 0) hardshipWeeks++;
      if (safety === 79) throw new Error("Policy did not terminate.");
    }
    visits.push({
      day,
      weeks: state.week - atArrival,
      bouts: state.boutsCompleted,
      cash: state.cash,
    });
  }
  const final = publicState(state);
  return {
    policy,
    seed,
    days,
    week: state.week,
    bouts: state.boutsCompleted,
    wins: active().reduce((n, f) => n + f.record.wins, 0),
    cash: state.cash,
    minCash,
    hardshipWeeks,
    tier: state.facilityTier,
    coachRank: state.staff.coach?.rank || 0,
    milestones,
    visits,
    staffNext: final.staffOptions?.coach?.blockedReason || null,
  };
}
function matchedFairness(samples = 120) {
  return [35, 55, 75].map((level) => {
    const make = (gymId, prefix) =>
      snapshotFor({
        gymId,
        revision: 1,
        state: {
          name: prefix,
          week: 1,
          fighters: divisions.map((weightClass, i) => ({
            id: prefix + i,
            name: prefix + i,
            weightClass,
            style: ["boxing", "wrestling", "bjj", "boxing"][i],
            rarity: "prospect",
            traits: [],
            fatigue: 0,
            stats: {
              striking: level,
              grappling: level,
              submissions: level,
              conditioning: level,
            },
            gameplan: {
              approach: "balanced",
              pace: "measured",
              finish: "hunt-finish",
              conserveBelow: 30,
            },
          })),
        },
      });
    const a = make("aaaaaaaaaaaaaaaaaaaaaaaa", "Home"),
      b = make("bbbbbbbbbbbbbbbbbbbbbbbb", "Away");
    let wins = 0,
      losses = 0,
      draws = 0;
    for (let i = 0; i < samples; i++) {
      const r = resolveWar(a, b, `alpha-fair-${level}-${i}`);
      assert.equal(r.bouts.length, 4);
      assert.equal(r.careerRewards, 0);
      wins += r.outcome === "win";
      losses += r.outcome === "loss";
      draws += r.outcome === "draw";
    }
    const score = (wins + draws * 0.5) / samples;
    assert.ok(
      score > 0.3 && score < 0.7,
      "matched teams must not exhibit a large side bias",
    );
    return { level, samples, wins, losses, draws, scoreShare: score };
  });
}
function validate() {
  const runs = ["balanced", "recovery", "pressure"].flatMap((policy) =>
    Array.from({ length: 3 }, (_, seed) => simulate(policy, seed)),
  );
  for (const r of runs) {
    assert.ok(r.visits[0].weeks <= 8);
    assert.ok(r.visits.slice(1).every((v) => v.weeks <= 4));
    assert.ok(r.bouts > 0);
    assert.ok(r.minCash >= 0);
    assert.ok(
      r.tier < CAREER.facilities.length - 1,
      "opening fortnight cannot buy every expansion",
    );
  }
  const start = createCareer({
    seed: "hardship-alpha",
    name: "Restart corner",
    style: "boxing",
  });
  start.cash = 0;
  const recovered = applyCommand(start, {
    type: "advance",
    confirmCosts: true,
  });
  assert.equal(recovered.cash, 0);
  assert.equal(recovered.fighters.length, start.fighters.length);
  const now = Date.parse("2026-10-01T00:00:00Z"),
    bank = allowances.materialize(null, now);
  const capped = allowances.materialize(bank, now + 30 * allowances.DAY);
  assert.equal(capped.careerWeeks.balance, 12);
  assert.equal(capped.leagueCards.balance, 3);
  assert.equal(start.week, 0);
  assert.equal(start.cash, 0);
  return {
    scope:
      "Actual seeded engine policies across 14 daily visits, not human completion/retention estimates. No tuned win rates or injected rewards. Manual camps/bookings/recovery, authentic fight outcomes and current server bank rules. Conditional strategic choices are automated policies, not recommendations to players.",
    runs,
    matchedFairness: matchedFairness(),
    checks: {
      manualWeeks: true,
      offlineNoCareerChanges: true,
      bankCaps: true,
      zeroCashKeepsRoster: true,
    },
  };
}
if (require.main === module) console.log(JSON.stringify(validate(), null, 2));
module.exports = { simulate, matchedFairness, validate };
