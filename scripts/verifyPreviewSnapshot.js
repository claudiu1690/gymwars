const { MongoClient, BSON } = require("mongodb");
const assert = require("node:assert/strict"),
  fs = require("node:fs");
(async () => {
  const uri = new URL(process.argv[2]);
  assert.equal(uri.hostname, "127.0.0.1");
  assert.equal(uri.pathname, "/gymwars_preview");
  const saved = BSON.EJSON.parse(fs.readFileSync(process.argv[3], "utf8"));
  const client = await MongoClient.connect(uri.href);
  try {
    const sort = (docs) =>
      docs.sort((a, b) => String(a._id).localeCompare(String(b._id)));
    for (const [name, documents] of Object.entries(saved.collections)) {
      const actual = await client
        .db("gymwars_preview")
        .collection(name)
        .find({})
        .toArray();
      assert.deepEqual(
        sort(actual),
        sort(documents),
        `${name} changed across restart`,
      );
    }
    console.log(
      "PREVIEW_RESTORE_PASS — all account, career and receipt documents unchanged",
    );
  } finally {
    await client.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
