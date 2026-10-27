const { MongoClient } = require("mongodb"),
  { target } = require("./stagingBackup");
const stages = [
  "career-start",
  "booked-fight",
  "assigned-training",
  "end-week",
  "first-result",
  "complete-team",
  "gym-war",
];
function summarize(events, now = Date.now()) {
  const gyms = new Map();
  for (const event of events) {
    const id = String(event.gymId);
    if (!gyms.has(id)) gyms.set(id, []);
    gyms.get(id).push(event);
  }
  const funnel = stages.map((kind) => ({
    stage: kind,
    gyms: [...gyms.values()].filter((rows) => rows.some((r) => r.kind === kind))
      .length,
  }));
  const returns = [1, 7, 30].map((day) => {
    let eligible = 0,
      returned = 0;
    for (const rows of gyms.values()) {
      const visits = rows
        .filter((r) => r.kind === "visit")
        .map((r) => Date.parse(r.createdAt))
        .sort((a, b) => a - b);
      if (!visits.length) continue;
      const origin = Math.floor(visits[0] / 86400000),
        current = Math.floor(now / 86400000);
      if (current - origin < day) continue;
      eligible++;
      if (visits.some((t) => Math.floor(t / 86400000) - origin === day))
        returned++;
    }
    return {
      day,
      eligible,
      returned,
      rate: eligible ? Math.round((returned / eligible) * 1000) / 10 : null,
    };
  });
  const blocked = {};
  for (const event of events.filter((r) => r.kind === "blocked")) {
    const key = event.details?.reason || "unknown";
    blocked[key] = (blocked[key] || 0) + 1;
  }
  return {
    scope:
      "Consenting gyms only; return cohorts start on first observed opt-in visit. Observational, not a causal retention result.",
    gyms: gyms.size,
    funnel,
    returnCohorts: returns,
    blocked,
  };
}
async function report(uri) {
  const name = target(uri),
    client = await MongoClient.connect(uri);
  try {
    const events = await client
      .db(name)
      .collection("alphaevents")
      .find({})
      .toArray();
    return summarize(events);
  } finally {
    await client.close();
  }
}
if (require.main === module)
  report(process.argv[2])
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
module.exports = { summarize, report };
