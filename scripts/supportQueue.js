// Private local operator queue. Never feed free text into aggregate analytics.
const { MongoClient } = require("mongodb"),
  { target } = require("./stagingBackup");
async function queue(uri) {
  const name = target(uri),
    client = await MongoClient.connect(uri);
  try {
    return await client
      .db(name)
      .collection("supportreports")
      .find(
        { status: "received" },
        { projection: { _id: 0, gymId: 0, requestId: 0 } },
      )
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray();
  } finally {
    await client.close();
  }
}
if (require.main === module)
  queue(process.argv[2])
    .then((rows) => console.log(JSON.stringify(rows, null, 2)))
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    });
module.exports = { queue };
