const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { target, backup, restore } = require("../scripts/stagingBackup");
test("backup tools reject unrelated or remote databases", () => {
  for (const uri of [
    "mongodb://example.com/gymwars_staging",
    "mongodb://127.0.0.1/ironGateCity",
    "mongodb://127.0.0.1/gymWars",
  ])
    assert.throws(() => target(uri));
});
test(
  "local staging backup restores documents and uniqueness, refusing populated targets",
  { skip: process.env.GYMWARS_DB_TESTS !== "1", timeout: 120000 },
  async () => {
    const { MongoMemoryServer } = require("mongodb-memory-server"),
      { MongoClient } = require("mongodb"),
      mongo = await MongoMemoryServer.create({ binary: { version: "7.0.14" } }),
      client = await MongoClient.connect(mongo.getUri());
    const file = path.join(
      os.tmpdir(),
      "gymwars-" + require("crypto").randomUUID() + ".ejson",
    );
    try {
      const source = mongo.getUri("gymwars_staging"),
        destination = mongo.getUri("gymwars_staging_restored"),
        db = client.db("gymwars_staging");
      await db
        .collection("fixtures")
        .createIndex({ receipt: 1 }, { unique: true });
      await db
        .collection("fixtures")
        .insertOne({ receipt: "accepted", date: new Date("2026-10-01") });
      await backup(source, file);
      assert.equal((await restore(destination, file)).collections, 1);
      const restored = client
        .db("gymwars_staging_restored")
        .collection("fixtures");
      assert.ok((await restored.findOne()).date instanceof Date);
      await assert.rejects(
        restored.insertOne({ receipt: "accepted" }),
        (e) => e.code === 11000,
      );
      await assert.rejects(restore(destination, file), /contains data/);
      await assert.rejects(backup(source, file), (e) => e.code === "EEXIST");
    } finally {
      fs.rmSync(file, { force: true });
      await client.close();
      await mongo.stop();
    }
  },
);
