const { test } = require("node:test");
const assert = require("node:assert/strict");
const { windowLimiter } = require("../lib/windowLimiter");

test("security email limits stay bounded, cannot evict active limits, and reopen after expiry", () => {
  let time = 1000;
  const allow = windowLimiter({
    limit: 3,
    windowMs: 100,
    maxKeys: 2,
    now: () => time,
  });
  assert.equal(allow("one"), true);
  assert.equal(allow("one"), true);
  assert.equal(allow("one"), true);
  assert.equal(allow("one"), false);
  assert.equal(allow("two"), true);
  assert.equal(allow("third"), false);
  assert.equal(allow("one"), false);
  time = 1100;
  assert.equal(allow("third"), true);
  assert.equal(allow("one"), true);
  assert.equal(allow("one"), true);
  assert.equal(allow("one"), true);
  assert.equal(allow("one"), false);
});
