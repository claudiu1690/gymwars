// A named run owns its own folder, database, browser storage and synthetic account.
const path = require("node:path");
const runId = process.env.GYMWARS_PLAYTHROUGH_RUN || "playthrough-2026-10-14";
if (!/^playthrough-[a-z0-9-]+$/.test(runId))
  throw new Error("Use a named playthrough run; paths are not accepted.");
const legacy = runId === "playthrough-2026-10-14";
const port = Number(process.env.GYMWARS_PLAYTHROUGH_PORT || 5300);
if (![5300, 5301, 5302].includes(port))
  throw new Error("Playthrough ports must be dedicated 5300–5302.");
module.exports = {
  runId,
  folder: path.resolve(__dirname, "../output", runId),
  port,
  baseURL: "http://127.0.0.1:" + port,
  dbName: legacy ? "gymwars_organic_playthrough" : "gymwars_" + runId.replaceAll("-", "_"),
  email: legacy ? "organic-playthrough-20261014@gymwars.invalid" : runId + "@gymwars.invalid",
  password: "organic-playthrough-test-only-2026",
  gymName: legacy ? "Patient Corner" : "Resolute Corner",
};
