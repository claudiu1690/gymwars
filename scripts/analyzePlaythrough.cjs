const fs = require("node:fs"),
  path = require("node:path"),
  readline = require("node:readline");
const { folder } = require("./playthroughConfig.cjs");
async function run() {
  const summary = {
    commands: {},
    flows: {},
    milestones: [],
    weekly: [],
    returns: 0,
    warCards: [],
    driverErrors: [],
    browserErrors: [],
    minCash: Infinity,
    totalEarned: 0,
    totalSpent: 0,
    firstCompletion: null,
  };
  let balance = null,
    anchor = null;
  const milestones = new Set();
  for await (const line of readline.createInterface({
    input: fs.createReadStream(path.join(folder, "actions.jsonl")),
    crlfDelay: Infinity,
  })) {
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e.kind === "return") summary.returns++;
    if (e.kind === "driver-error") summary.driverErrors.push(e.message);
    if (e.kind === "browser-error") summary.browserErrors.push(e.message);
    if (e.kind === "checkpoint" && e.label === "week-end")
      summary.weekly.push({
        week: e.week,
        cash: e.cash,
        days: summary.returns,
        revision: e.revision,
      });
    if (e.kind !== "mutation" || e.status >= 300) continue;
    if (e.path === "/api/career/wars/battle")
      summary.warCards.push({
        outcome: e.result.outcome,
        wins: e.result.wins,
        losses: e.result.losses,
        points: e.result.pointsEarned,
        day: summary.returns,
      });
    const s = e.result?.career;
    if (!s) continue;
    anchor ||= e.result.allowances?.anchorAt;
    const cmd =
      e.input?.command?.type ||
      (e.path === "/api/career/start" ? "start" : e.path);
    summary.commands[cmd] = (summary.commands[cmd] || 0) + 1;
    if (balance !== null) {
      const delta = s.cash - balance;
      summary.flows[cmd] = (summary.flows[cmd] || 0) + delta;
      if (delta > 0) summary.totalEarned += delta;
      else summary.totalSpent -= delta;
    }
    balance = s.cash;
    summary.minCash = Math.min(summary.minCash, balance);
    if (s.journey?.completion.complete && !summary.firstCompletion)
      summary.firstCompletion = {
        week: s.week,
        day: summary.returns,
        cash: s.cash,
        bouts: s.boutsCompleted,
        tier: s.facilityTier,
      };
    const items = [
      ...s.gymDevelopment.goals
        .filter((g) => g.complete)
        .map((g) => ({ id: g.id, week: g.earned?.week })),
      ...s.gymDevelopment.challenges
        .filter((g) => g.complete)
        .map((g) => ({ id: g.id, week: g.earned?.week })),
      ...s.fighters.flatMap((f) =>
        f.championships.map((c, i) => ({
          id: "belt-" + f.weightClass + "-" + f.id + "-" + i,
          week: c.wonWeek,
        })),
      ),
      { id: "gym-tier-" + s.facilityTier, week: s.week },
      ...(s.staff.coach
        ? [{ id: "coach-rank-" + s.staff.coach.rank, week: s.week }]
        : []),
      ...(s.mentoring || [])
        .filter((p) => p.status !== "active")
        .map((p) => ({ id: "mentoring-" + p.id, week: p.endWeek })),
    ];
    for (const m of items)
      if (!milestones.has(m.id)) {
        milestones.add(m.id);
        summary.milestones.push({ ...m, day: summary.returns, cash: s.cash });
      }
  }
  const current = JSON.parse(
    fs.readFileSync(path.join(folder, "current.json"), "utf8"),
  );
  summary.final = {
    week: current.career.week,
    cash: current.career.cash,
    tier: current.career.facilityTier,
    bouts: current.career.boutsCompleted,
    coach: current.career.staff.coach?.rank,
    careerComplete: current.career.journey.completion.complete,
    freeWeeks: current.allowances.careerWeeks.freeAvailable,
    extraWeeks: current.allowances.careerWeeks.extraAvailable,
    extraCards: current.allowances.leagueCards.extraAvailable,
  };
  summary.warPoints = summary.warCards.reduce((a, b) => a + b.points, 0);
  fs.writeFileSync(
    path.join(folder, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  fs.writeFileSync(
    path.join(folder, "economy.csv"),
    "week,cash,return_days,revision\n" +
      summary.weekly
        .map((r) => [r.week, r.cash, r.days, r.revision].join(","))
        .join("\n") +
      "\n",
  );
  console.log(
    JSON.stringify(
      {
        ...summary,
        weekly: undefined,
        warCards: undefined,
        driverErrors: summary.driverErrors.length,
      },
      null,
      2,
    ),
  );
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
