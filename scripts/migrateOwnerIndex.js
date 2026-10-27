// Explicit maintenance command: inspect first, then replace the old sparse index.
// Does not delete or rewrite any accounts or gyms.
require("dotenv").config();
const mongoose = require("mongoose");
async function migrate(connection) {
  const collection = connection.collection("gyms");
  await connection.db.createCollection("gyms").catch((e) => {
    if (e.code !== 48) throw e;
  });
  const duplicates = await collection
    .aggregate([
      { $match: { userId: { $type: "objectId" } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();
  if (duplicates.length)
    throw new Error(
      "Duplicate owned gyms exist. Resolve ownership before migrating.",
    );
  const indexes = await collection.indexes();
  const old = indexes.find(
    (i) => i.key.userId === 1 && Object.keys(i.key).length === 1,
  );
  if (old && !old.partialFilterExpression) await collection.dropIndex(old.name);
  await collection.createIndex(
    { userId: 1 },
    {
      unique: true,
      partialFilterExpression: { userId: { $type: "objectId" } },
    },
  );
  await collection.createIndex({ isAi: 1 });
  return { migrated: true };
}
if (require.main === module) {
  const config = require("../config");
  mongoose
    .connect(config.database.url)
    .then(() => migrate(mongoose.connection))
    .then(console.log)
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
module.exports = { migrate };
