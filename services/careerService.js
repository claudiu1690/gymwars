const { CAREER } = require("../consts/career");
const { createHash, randomUUID } = require("node:crypto");
const Career = require("../models/careerModel");
const {
  materialize,
  publicAllowances,
  spend,
  availableBalance,
} = require("./careerAllowances");
const {
  createCareer,
  applyCommand,
  publicState,
  forecast,
} = require("../engine/careerEngine");
const fail = (message, statusCode = 409) =>
  Object.assign(new Error(message), { statusCode, expose: true });
const serialize = (doc, nowMs = Date.now()) => ({
  career: publicState(doc.state),
  revision: doc.revision,
  allowances: publicAllowances(doc.daily, nowMs),
});

// Dependency injection supports failure/concurrency tests against the exact
// same repository boundary used by MongoDB, without a second implementation.
function repository(
  Model = Career,
  { beforeCommit = async () => {}, now = Date.now } = {},
) {
  return {
    async get(gymId) {
      const doc = await Model.findOne({ gymId }).lean();
      return doc ? serialize(doc, now()) : { career: null, revision: 0 };
    },
    async start(gymId, { name, style }) {
      let doc = await Model.findOne({ gymId }).lean();
      if (doc) return serialize(doc, now());
      const state = createCareer({ seed: randomUUID(), name, style });
      const startedAt = now();
      for (const flow of state.economyLedger || [])
        flow.occurredAt = new Date(startedAt).toISOString();
      try {
        doc = await Model.create({
          gymId,
          state,
          daily: materialize(null, startedAt),
          revision: 0,
          receipts: [],
        });
      } catch (e) {
        if (e.code !== 11000) throw e;
        doc = await Model.findOne({ gymId }).lean();
      }
      return serialize(doc, now());
    },
    async command(gymId, { id, revision, command }) {
      if (
        typeof id !== "string" ||
        !/^[a-zA-Z0-9_-]{8,100}$/.test(id) ||
        !Number.isSafeInteger(revision) ||
        revision < 0
      )
        throw fail("A command ID and current save revision are required.", 400);
      if (
        !command ||
        typeof command !== "object" ||
        Array.isArray(command) ||
        typeof command.type !== "string"
      )
        throw fail("A career action is required.", 400);
      const hash = createHash("sha256")
        .update(JSON.stringify(command))
        .digest("hex");
      const doc = await Model.findOne({ gymId }).lean();
      if (!doc) throw fail("Start a career first.", 404);
      const receipt = (doc.receipts || []).find((r) => r.id === id);
      if (receipt) {
        if (receipt.hash !== hash)
          throw fail("That command ID belongs to a different action.");
        return {
          ...serialize(doc, now()),
          duplicate: true,
          acceptedAction: receipt.result || null,
        };
      }
      if (doc.revision !== revision)
        throw fail(
          "Your career changed in another request. Refresh to continue.",
        );
      const acceptedAt = now();
      let daily = materialize(doc.daily, acceptedAt);
      if (
        command.type === "advance" &&
        availableBalance(daily.careerWeeks) === 0
      )
        spend(daily, "careerWeeks", 1, acceptedAt);
      const state = applyCommand(doc.state, command, {
        maxAdvanceWeeks: availableBalance(daily.careerWeeks),
      });
      const weeksSpent = state.week - doc.state.week;
      if (weeksSpent > 0)
        daily = spend(daily, "careerWeeks", weeksSpent, acceptedAt);
      state.telemetry.at(-1).occurredAt = new Date(acceptedAt).toISOString();
      for (const flow of state.economyLedger || [])
        if (flow.id > (doc.state.economyFlowCount || 0))
          flow.occurredAt = new Date(acceptedAt).toISOString();
      const acceptedAction = {
        type: command.type,
        revision: revision + 1,
        week: state.week,
        weeksSpent,
        ...(weeksSpent > 0
          ? { lastAdvance: structuredClone(state.lastAdvance) }
          : {}),
      };
      await beforeCommit(state); // injected failure leaves the original save untouched
      const saved = await Model.findOneAndUpdate(
        { gymId, revision },
        {
          $set: { state, daily },
          $inc: { revision: 1 },
          $push: {
            receipts: {
              $each: [
                { id, hash, revision: revision + 1, result: acceptedAction },
              ],
              $slice: -1000,
            },
          },
        },
        { new: true },
      ).lean();
      if (!saved) {
        const latest = await Model.findOne({ gymId }).lean();
        const committed = latest?.receipts?.find((r) => r.id === id);
        if (committed?.hash === hash)
          return {
            ...serialize(latest, now()),
            duplicate: true,
            acceptedAction: committed.result || null,
          };
        throw fail(
          "Another action finished first. Refresh to see the saved result.",
        );
      }
      return { ...serialize(saved, now()), acceptedAction };
    },
    async forecast(gymId, { fighterId, allocations, weeks }) {
      const doc = await Model.findOne({ gymId }).lean();
      if (!doc) throw fail("Career not found.", 404);
      const f = doc.state.fighters.find(
        (f) => f.id === fighterId && !f.retired && !f.released,
      );
      if (!f) throw fail("Fighter not found.", 404);
      const invalid = require("./campMath").validateAllocations(allocations);
      if (invalid || !CAREER.campLengths.includes(weeks))
        throw fail(invalid || "Choose 1, 2, 3, 4, or 6 weeks.", 400);
      return forecast(doc.state, f, allocations, weeks);
    },
  };
}
module.exports = { ...repository(), repository };
