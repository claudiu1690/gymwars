// Back up only the isolated local playtest DB before a code-reload restart.
const { MongoClient, BSON } = require("mongodb");
const fs = require("node:fs"),
  path = require("node:path");
async function snapshot(uri, destination) {
  const parsed = new URL(uri);
  if (parsed.hostname !== "127.0.0.1" || parsed.pathname !== "/gymwars_preview")
    throw new Error(
      "Snapshots are restricted to the local gymwars_preview database.",
    );
  const client = await MongoClient.connect(uri);
  try {
    const db = client.db("gymwars_preview"),
      collections = {};
    for (const { name } of await db.listCollections().toArray()) {
      if (!name.startsWith("system."))
        collections[name] = await db.collection(name).find({}).toArray();
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(
      destination,
      BSON.EJSON.stringify(
        { previewSnapshot: 1, collections },
        { relaxed: false },
      ),
    );
    console.log(
      `Preview snapshot saved (${Object.keys(collections).length} collections).`,
    );
  } finally {
    await client.close();
  }
}
snapshot(process.argv[2], process.argv[3]).catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
