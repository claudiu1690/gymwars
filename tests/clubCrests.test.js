const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { LOOKS, ACHIEVEMENTS } = require("../consts/achievements");
const crests = require("../consts/clubCrests.json");

test("every current and legacy club reward has a distinct, transparent, optimized crest", () => {
  assert.deepEqual(
    Object.keys(crests).sort(),
    LOOKS.map((look) => look.id).sort(),
  );
  for (const achievement of ACHIEVEMENTS) assert.ok(crests[achievement.lookId]);
  const hashes = new Set();
  let totalBytes = 0;
  for (const look of LOOKS) {
    const buffer = fs.readFileSync(
      path.join(__dirname, "../frontend/public", crests[look.id]),
    );
    assert.equal(buffer.toString("ascii", 0, 4), "RIFF", look.id);
    assert.equal(buffer.toString("ascii", 8, 12), "WEBP", look.id);
    assert.equal(buffer.toString("ascii", 12, 16), "VP8X", look.id);
    assert.ok(buffer[20] & 0x10, `${look.id} must preserve alpha transparency`);
    assert.equal(buffer.readUIntLE(24, 3) + 1, 320, look.id);
    assert.equal(buffer.readUIntLE(27, 3) + 1, 368, look.id);
    hashes.add(crypto.createHash("sha256").update(buffer).digest("hex"));
    totalBytes += buffer.length;
  }
  assert.equal(hashes.size, LOOKS.length);
  assert.ok(
    totalBytes < 1000000,
    `Whole collection must stay under 1 MB: ${totalBytes}`,
  );
});

test("crest art resolves saved look IDs without changing their data and keeps unknown club looks on the vector fallback", async () => {
  const { clubCrestArt } = await import("../frontend/src/clubCrests.mjs");
  const before = structuredClone(LOOKS);
  for (const look of LOOKS)
    assert.equal(clubCrestArt(look.id), crests[look.id]);
  assert.deepEqual(LOOKS, before);
  for (const id of [
    undefined,
    null,
    "unknown",
    "constructor",
    "__proto__",
    "../../other",
  ])
    assert.equal(clubCrestArt(id), null);
});
