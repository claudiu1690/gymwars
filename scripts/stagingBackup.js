const { MongoClient, BSON } = require("mongodb"),
  fs = require("node:fs"),
  crypto = require("node:crypto");
function target(uri) {
  const url = new URL(uri);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !/^\/gymwars_(staging(?:_[a-z0-9_-]+)?|preview)$/.test(url.pathname)
  )
    throw new Error(
      "Only an explicitly named loopback GymWars staging/preview database is supported.",
    );
  return url.pathname.slice(1);
}
async function backup(uri, file) {
  const name = target(uri),
    client = await MongoClient.connect(uri);
  try {
    const db = client.db(name),
      collections = {};
    for (const { name: collection } of await db.listCollections().toArray()) {
      if (collection.startsWith("system.")) continue;
      const documents = await db.collection(collection).find({}).toArray();
      collections[collection] = {
        documents,
        indexes: await db.collection(collection).indexes(),
      };
    }
    const content = BSON.EJSON.stringify({
      format: "gymwars-local-backup-v1",
      createdAt: new Date(),
      collections,
    });
    fs.writeFileSync(file, content, { flag: "wx" });
    return {
      collections: Object.keys(collections).length,
      checksum: crypto.createHash("sha256").update(content).digest("hex"),
    };
  } finally {
    await client.close();
  }
}
async function restore(uri, file) {
  const name = target(uri),
    saved = BSON.EJSON.parse(fs.readFileSync(file, "utf8"));
  if (saved.format !== "gymwars-local-backup-v1" || !saved.collections)
    throw new Error("Invalid staging backup.");
  const client = await MongoClient.connect(uri);
  try {
    const db = client.db(name);
    for (const c of await db.listCollections().toArray())
      if (await db.collection(c.name).countDocuments())
        throw new Error(
          "Restore refused: target contains data. Choose a new empty staging database.",
        );
    for (const [collection, data] of Object.entries(saved.collections)) {
      if (
        !/^[a-zA-Z0-9_-]+$/.test(collection) ||
        !Array.isArray(data.documents) ||
        !Array.isArray(data.indexes)
      )
        throw new Error("Invalid backup collection.");
    }
    for (const [collection, data] of Object.entries(saved.collections)) {
      const c = db.collection(collection);
      if (data.documents.length) await c.insertMany(data.documents);
      else if (!(await db.listCollections({ name: collection }).hasNext()))
        await db.createCollection(collection);
      for (const index of data.indexes) {
        if (index.name === "_id_") continue;
        const { key, v, ns, background, ...options } = index;
        await c.createIndex(key, options);
      }
    }
    return { collections: Object.keys(saved.collections).length };
  } finally {
    await client.close();
  }
}
if (require.main === module) {
  const [mode, uri, file] = process.argv.slice(2);
  (mode === "backup"
    ? backup(uri, file)
    : mode === "restore"
      ? restore(uri, file)
      : Promise.reject(
          new Error(
            "Usage: stagingBackup.js backup|restore <loopback-uri> <file.ejson>",
          ),
        )
  )
    .then((x) => console.log(JSON.stringify(x)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
}
module.exports = { backup, restore, target };
