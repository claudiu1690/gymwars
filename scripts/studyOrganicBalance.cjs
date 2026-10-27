// Reproducible lab, no databases or user accounts. Starting resources and refills are unchanged.
const fs = require("node:fs");
const {
  createCareer,
  applyCommand,
  publicState,
  offers,
  weeklyCost,
} = require("../engine/careerEngine");
const { CAREER } = require("../consts/career");
const allowance = require("../services/careerAllowances");
const {
  resolveFight,
  CURRENT_FIGHT_VERSION,
} = require("../engine/fightEngine");
const studySeeds = Number(process.env.GYMWARS_STUDY_SEEDS || 3),
  studyDays = Number(process.env.GYMWARS_STUDY_DAYS || 28);
const studyPolicies = (
  process.env.GYMWARS_STUDY_POLICIES || "sporting,guarantee,development"
).split(",");
if (
  studyPolicies.some(
    (policy) =>
      !["sporting", "guarantee", "development", "recommended"].includes(policy),
  )
)
  throw new Error("Unknown study policy");
const avg = (f) => Object.values(f.stats).reduce((a, b) => a + b, 0) / 4;
async function careers() {
  const { fightPreparationPlan } =
    await import("../frontend/src/trainingPlans.mjs");
  const { offerPurpose } = await import("../frontend/src/careerOffers.mjs");
  const rows = [];
  for (const policy of studyPolicies)
    for (let seed = 0; seed < studySeeds; seed++) {
      let s = createCareer({
          seed: "organic-study-" + seed,
          name: "Lab corner",
          style: "boxing",
        }),
        daily = null;
      const start = s.cash;
      let minCash = start,
        hardship = 0,
        firstTier = {},
        completion = null,
        repeats = 0,
        noGrowthTrainingWeeks = 0;
      const act = (type, data = {}) => {
        s = applyCommand(s, { type, ...data });
        if (type === "advance")
          noGrowthTrainingWeeks += (s.lastAdvance?.fighters || []).filter(
            (row) =>
              row.activity === "training" &&
              Object.values(row.gains || {}).every((gain) => gain === 0),
          ).length;
        minCash = Math.min(minCash, s.cash);
      };
      const active = () => s.fighters.filter((f) => !f.retired && !f.released);
      const committed = (f) =>
        f.camp ||
        s.mentoring.some(
          (p) =>
            p.status === "active" && [p.mentorId, p.juniorId].includes(f.id),
        ) ||
        s.fights.some((b) => b.fighterId === f.id && b.status !== "resolved");
      for (let day = 0; day < studyDays; day++) {
        const now = Date.UTC(2026, 9, 1) + day * allowance.DAY;
        daily = allowance.materialize(daily, now);
        for (let step = 0; step < 12; step++) {
          for (const f of active().filter((f) => f.camp?.needsReview))
            act("camp-review", { fighterId: f.id, choice: "continue" });
          for (const b of s.fights.filter((b) =>
            ["ready", "live"].includes(b.status),
          ))
            act("auto-fight", {
              fightId: b.id,
              expectedRound: b.decisions.length,
            });
          let view = publicState(s);
          if (view.journey.careerComplete && completion == null)
            completion = s.week;
          for (const report of view.board.filter(
            (r) => !r.signed && !r.investigated,
          )) {
            if (s.scoutsUsed >= CAREER.scoutsPerWeek || active().length >= 4)
              break;
            if (
              active().some((f) => f.weightClass === report.fighter.weightClass)
            )
              continue;
            act("investigate", { reportId: report.id });
            const r = s.board.find((r) => r.id === report.id);
            // Development policy also checks the next report rather than buying the first face.
            if (
              policy === "development" &&
              avg(r.fighter) > 40 &&
              active().length > 1
            )
              continue;
            const fee = s.fighters.length === 1 ? 0 : r.fee;
            if (s.cash >= fee + weeklyCost(s) * 6)
              act("sign", { reportId: r.id });
          }
          view = publicState(s);
          if (
            s.boutsCompleted &&
            !s.staff.coach &&
            s.cash > CAREER.staff.coach.ranks[1].fee + weeklyCost(s) * 8
          )
            act("hire", { role: "coach" });
          if (
            view.gymDevelopment.expansion.canUpgrade &&
            s.cash >
              view.gymDevelopment.expansion.next.cost + weeklyCost(s) * 12
          )
            act("upgrade");
          view = publicState(s);
          if (
            view.staffOptions.coach.canUpgrade &&
            s.cash > view.staffOptions.coach.next.fee + weeklyCost(s) * 8
          )
            act("upgrade-staff", { role: "coach" });
          if (
            s.facilityTier >= 2 &&
            active().some((f) => f.isChampion) &&
            !active().some((f) => f.age >= 30) &&
            active().length < CAREER.facilities[s.facilityTier].slots &&
            s.cash > 500
          )
            act("veteran");
          view = publicState(s);
          const lesson = view.mentoringOptions.find((p) => p.canStart);
          if (
            !s.mentoring.some((p) =>
              ["active", "completed", "succeeded"].includes(p.status),
            ) &&
            lesson
          )
            act("mentor", {
              mentorId: lesson.mentorId,
              juniorId: lesson.juniorId,
              trait: lesson.trait,
            });
          view = publicState(s);
          const invitational = view.journey.invitational;
          if (invitational.canEnter) {
            const eligible = invitational.fighters
              .filter((f) => f.eligible)
              .sort(
                (a, b) =>
                  avg(s.fighters.find((f) => f.id === b.id)) -
                  avg(s.fighters.find((f) => f.id === a.id)),
              )
              .slice(0, 3);
            if (eligible.length === 3)
              act("enter-invitational", {
                fighterIds: eligible.map((f) => f.id),
              });
          }
          view = publicState(s);
          const reserveForCup =
            view.journey.invitational.unlocked &&
            !view.journey.complete &&
            !["scheduled", "live"].includes(view.journey.invitational.status);
          for (const fighter of active().filter((f) => f.age < 30)) {
            if (committed(fighter) || reserveForCup) continue;
            const choices = offers(s, fighter).filter((o) => !o.unavailable);
            const rank = (o) =>
              policy === "recommended"
                ? offerPurpose(view, fighter, o).score
                : policy === "guarantee"
                  ? o.show
                  : policy === "development"
                    ? -Math.abs(avg(o.opponent) - avg(fighter))
                    : (o.challengeId ? 20000 : 0) +
                      (o.title ? 10000 : 0) +
                      (o.rematch ? 0 : 500) -
                      Math.abs(avg(o.opponent) - avg(fighter)) * 20;
            choices.sort(
              (a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id),
            );
            const o = choices[0];
            if (!o) continue;
            repeats += s.fights.some((b) => b.opponentId === o.id);
            act("accept-offer", { fighterId: fighter.id, offerId: o.offerId });
            const publicSave = publicState(s),
              f = publicSave.fighters.find((f) => f.id === fighter.id),
              plan = fightPreparationPlan(publicSave, f);
            if (plan?.type === "camp" && s.cash >= weeklyCost(s))
              act("camp", {
                fighterId: f.id,
                preset: plan.preset,
                weeks: plan.weeks,
                allocations: plan.allocations,
              });
          }
          for (const f of active().filter(
            (f) =>
              !f.camp &&
              s.fights.some(
                (b) =>
                  b.fighterId === f.id &&
                  b.status === "scheduled" &&
                  b.competition === "invitational",
              ),
          )) {
            const v = publicState(s),
              p = fightPreparationPlan(
                v,
                v.fighters.find((x) => x.id === f.id),
              );
            if (p?.type === "camp")
              act("camp", {
                fighterId: f.id,
                preset: p.preset,
                weeks: p.weeks,
                allocations: p.allocations,
              });
          }
          if (!daily.careerWeeks.balance) break;
          act("advance", { confirmCosts: true });
          daily = allowance.spend(daily, "careerWeeks", 1, now);
          hardship += s.lastAdvance.waived > 0;
          firstTier[s.facilityTier] ??= s.week;
        }
      }
      console.log("Completed policy", policy, seed, "week", s.week);
      rows.push({
        policy,
        seed,
        week: s.week,
        bouts: s.boutsCompleted,
        wins: active().reduce((n, f) => n + f.record.wins, 0),
        cash: s.cash,
        minCash,
        hardship,
        firstTier,
        completion,
        repeats,
        noGrowthTrainingWeeks,
        circuitHonors: Object.keys(s.circuitHonors || {}),
        circuits: Object.fromEntries(
          CAREER.circuits.map((circuit) => {
            const bouts = s.fights.filter(
              (bout) =>
                bout.status === "resolved" && bout.circuit?.id === circuit.id,
            );
            return [
              circuit.id,
              {
                bouts: bouts.length,
                wins: bouts.filter((bout) => bout.result.winner === "A").length,
              },
            ];
          }),
        ),
        netPerFourWeeks: Math.round(((s.cash - start) / s.week) * 4),
        totalEarned: s.economyTotals?.earned || 0,
        totalSpent: s.economyTotals?.spent || 0,
        byReason: s.economyTotals?.byReason || {},
        challengePrizes: Object.values(s.careerChallenges || {}).reduce(
          (n, c) => n + (c.reward?.cash || 0),
          0,
        ),
      });
    }
  return rows;
}
function combat() {
  const rows = [];
  const samples = 500;
  for (const gap of [-30, -20, -10, 0, 10, 20, 30])
    for (const variant of [
      "matched",
      "alternate-plan",
      "tired",
      "iron-chin",
      "suspect-chin",
    ]) {
      const a = {
        name: "A",
        style: "boxing",
        fatigue: variant === "tired" ? 35 : 0,
        traits: ["iron-chin", "suspect-chin"].includes(variant)
          ? [variant]
          : [],
        stats: {
          striking: 60,
          grappling: 60,
          submissions: 60,
          conditioning: 60,
        },
        gameplan: {
          approach: variant === "alternate-plan" ? "grapple" : "strike",
          pace: variant === "alternate-plan" ? "measured" : "high",
          finish: "hunt-finish",
        },
      };
      const b = {
        ...structuredClone(a),
        name: "B",
        traits: [],
        fatigue: 0,
        gameplan: { approach: "strike", pace: "high", finish: "hunt-finish" },
        stats: {
          striking: 60 + gap,
          grappling: 60 + gap,
          submissions: 60 + gap,
          conditioning: 60 + gap,
        },
      };
      let wins = 0,
        draws = 0,
        finishes = 0;
      for (let i = 0; i < samples; i++) {
        const r = resolveFight({
          a,
          b,
          seed: "organic-combat-" + i,
          engineVersion: CURRENT_FIGHT_VERSION,
        });
        wins += r.winner === "A";
        draws += r.winner === "draw";
        finishes +=
          r.winner === "A" && !["DEC", "SPLIT-DEC"].includes(r.method);
      }
      rows.push({
        opponentSkillGap: gap,
        variant,
        samples,
        wins,
        draws,
        winPercent: Math.round((wins / samples) * 1000) / 10,
        finishes,
      });
    }
  return rows;
}
(async () => {
  const report = {
    scope:
      "Automated engine policies from genuine createCareer defaults, shared seeds, normal daily returns, no purchases/grants/save injection. This measures rule incentives, not human behaviour or retention. Synthetic combat profiles are separate balance experiments.",
    parameters: {
      seeds: studySeeds,
      days: studyDays,
      policies: studyPolicies,
      combatVersion: CURRENT_FIGHT_VERSION,
      purses: CAREER.circuits.map((c) => ({
        id: c.id,
        show: c.show,
        winBonus: c.winBonus,
      })),
      challengePrizes: CAREER.challenges.map((c) => ({
        id: c.id,
        cash: c.reward.cash || 0,
      })),
    },
    careers: await careers(),
    combat: process.env.GYMWARS_STUDY_SKIP_COMBAT === "1" ? [] : combat(),
  };
  const output =
    process.env.GYMWARS_STUDY_OUTPUT || "output/organic-improvements";
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(
    require("node:path").join(output, "balance-study.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        careers: report.careers.map(({ cashFlow, ...r }) => r),
        combat: report.combat,
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
