// Export and shut down only this task's explicitly named loopback test database.
const fs = require("node:fs"),
  path = require("node:path");
const { MongoClient, BSON } = require("mongodb");
const { folder, dbName, email, gymName, baseURL } = require("./playthroughConfig.cjs");
async function run() {
  const runtimeFile = path.join(folder, "runtime.json");
  const runtime = fs.existsSync(runtimeFile) ? JSON.parse(fs.readFileSync(runtimeFile, "utf8")) : null;
  const legacyLog = runtime ? "" : fs.readFileSync(path.resolve(__dirname, "../output/playthrough-server.log"), "utf8");
  const uri = runtime?.uri || legacyLog.match(/mongodb:\/\/127\.0\.0\.1:\d+\/gymwars_organic_playthrough/)?.[0];
  if (!uri || new URL(uri).hostname !== "127.0.0.1" || new URL(uri).pathname !== "/" + dbName)
    throw new Error("Isolated named test database was not identified.");
  const client = await MongoClient.connect(uri), db = client.db(dbName);
  try {
    if (
      (await db.collection("users").countDocuments()) !== 1 ||
      !(await db
        .collection("users")
        .findOne({ email }))
    )
      throw new Error("Test-account isolation check failed.");
    if (
      (await db.collection("gyms").countDocuments()) !== 1 ||
      !(await db.collection("gyms").findOne({ name: gymName }))
    )
      throw new Error("Test-gym isolation check failed.");
    const collections = {};
    for (const { name } of await db.listCollections().toArray())
      if (!name.startsWith("system."))
        collections[name] = {
          documents: await db.collection(name).find({}).toArray(),
          indexes: await db.collection(name).indexes(),
        };
    fs.writeFileSync(
      path.join(folder, "final-database.ejson"),
      BSON.EJSON.stringify({
        format: "gymwars-organic-playthrough-v1",
        createdAt: new Date(),
        collections,
      }),
      { flag: "wx" },
    );
    console.log(
      "Verified one isolated test account and saved " +
        Object.keys(collections).length +
        " collections.",
    );
  } finally {
    await client.close();
  }
  const meta = JSON.parse(fs.readFileSync(path.join(folder, "host.json"), "utf8"));
  const stopped = await fetch(baseURL + "/__playthrough/stop", { method: "POST", headers: { "X-Playthrough-Key": meta.key } });
  if (!stopped.ok) throw new Error("Export saved, but private test host did not acknowledge stop.");
  console.log("Isolated host stopping; persistent files and export retained.");
}
run().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
