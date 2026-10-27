// Operator-only recovery; no public endpoint. Reuses transactional resolvers.
// Run without --apply for an inventory. Never guesses effects of old partial saves.
const mongoose = require("mongoose");
async function recover({ apply = false, now = new Date() } = {}) {
  const Fight = require("../models/fightModel"),
    Camp = require("../models/campModel"),
    Pair = require("../models/mentorPairModel");
  const fights = await Fight.find({
    status: "scheduled",
    scheduledAt: { $lte: now },
  }).sort({ scheduledAt: 1 });
  const camps = await Camp.find({
    status: "active",
    endsAt: { $lte: now },
  }).sort({ endsAt: 1 });
  const pairs = await Pair.find({ status: "active", endsAt: { $lte: now } });
  const legacyIncomplete = await Fight.find({
    status: "resolved",
    breakdown: null,
  })
    .select("_id gymId")
    .lean();
  const legacyCamps = await Camp.find({ status: "completed", results: null })
    .select("_id gymId")
    .lean();
  if (apply) {
    const timeline = [
      ...fights.map((x) => ({
        at: x.scheduledAt,
        run: () =>
          require("../services/fightService").resolveFightIfDue(x._id, now),
      })),
      ...camps.map((x) => ({
        at: x.endsAt,
        run: () =>
          require("../services/campService").resolveCampIfDue(x._id, now),
      })),
    ].sort((a, b) => a.at - b.at);
    for (const e of timeline) await e.run();
    for (const p of pairs)
      await require("../services/mentoringService").resolvePairIfDue(
        p._id,
        now,
      );
  }
  return {
    applied: apply,
    dueFights: fights.length,
    dueCamps: camps.length,
    dueMentoring: pairs.length,
    needsHistoricalAudit: { fights: legacyIncomplete, camps: legacyCamps },
  };
}
if (require.main === module) {
  const config = require("../config");
  mongoose
    .connect(config.database.url)
    .then(() => recover({ apply: process.argv.includes("--apply") }))
    .then((x) => console.log(JSON.stringify(x, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
module.exports = { recover };
