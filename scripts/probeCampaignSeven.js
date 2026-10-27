// Deterministic, in-memory progression smoke probe. No API, MongoDB or player saves.
// This policy tests reachability, not optimal play or balance: choose a title
// offer when qualified, otherwise the lowest total-stat available opponent;
// train a four-week balanced camp when the calendar allows it.
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../engine/careerEngine");

const results = [];
for (let seed = 0; seed < 10; seed++) {
  let s = engine.createCareer({
    seed: `journey-natural-${seed}`,
    name: "Journey Probe",
    style: "boxing",
  });
  let decisions = 0;
  const command = (type, fields = {}) => {
    s = engine.applyCommand(s, { type, ...fields });
    decisions++;
  };
  while (
    !engine.publicState(s).journey.invitational.unlocked &&
    s.boutsCompleted < 80 &&
    s.week < 520
  ) {
    for (const b of s.fights.filter((fight) =>
      ["ready", "live"].includes(fight.status),
    )) {
      command("auto-fight", {
        fightId: b.id,
        expectedRound: b.decisions.length,
      });
    }
    if (engine.publicState(s).journey.invitational.unlocked) break;
    const f = s.fighters[0];
    if (f.retired) break;
    if (!s.staff.coach && s.boutsCompleted > 0 && s.cash > 600) {
      command("hire", { role: "coach" });
    }
    if (
      !s.fights.some((b) => b.status !== "resolved" && b.fighterId === f.id)
    ) {
      const available = engine
        .offers(s, f)
        .filter((offer) => !offer.unavailable);
      const total = (offer) =>
        Object.values(offer.opponent.stats).reduce(
          (sum, value) => sum + value,
          0,
        );
      const offer =
        available.find((item) => item.title) ||
        available.sort((a, b) => total(a) - total(b))[0];
      if (offer) {
        command("accept-offer", { fighterId: f.id, offerId: offer.offerId });
        command("plan", {
          fighterId: f.id,
          plan: {
            approach:
              offer.opponent.stats.grappling < offer.opponent.stats.striking
                ? "grapple"
                : "strike",
            pace: "measured",
            finish: "hunt-finish",
            conserveBelow: 30,
          },
        });
        if (offer.notice >= 4 && s.cash > 200) {
          command("camp", { fighterId: f.id, preset: "balanced", weeks: 4 });
        }
      }
    }
    for (const fighter of s.fighters.filter((item) => item.camp?.needsReview)) {
      command("camp-review", { fighterId: fighter.id, choice: "continue" });
    }
    if (!s.fights.some((b) => ["ready", "live"].includes(b.status))) {
      command("advance", { confirmCosts: true });
    }
  }
  results.push({
    seed: `journey-natural-${seed}`,
    week: s.week,
    bouts: s.boutsCompleted,
    commands: decisions,
    record: s.fighters[0].record,
    invitationEarned: engine.publicState(s).journey.invitational.unlocked,
    cash: s.cash,
    stats: s.fighters[0].stats,
  });
}
const report = {
  purpose:
    "Reachability smoke check through earned regional championship; not a balance claim or a full Invitational simulation.",
  runs: results.length,
  invitationsEarned: results.filter((result) => result.invitationEarned).length,
  boutRange: [
    Math.min(...results.map((result) => result.bouts)),
    Math.max(...results.map((result) => result.bouts)),
  ],
  weekRange: [
    Math.min(...results.map((result) => result.week)),
    Math.max(...results.map((result) => result.week)),
  ],
  results,
};
const file = path.resolve(
  __dirname,
  "../output/validation/review7-campaign-probe.json",
);
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify({ ...report, results: undefined, output: file }, null, 2),
);
if (report.invitationsEarned !== report.runs) process.exitCode = 1;
