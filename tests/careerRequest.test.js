const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isDefiniteRejection } = require("../frontend/src/careerRequest.mjs");
const { requestId } = require("../frontend/src/careerRequest.mjs");

test("action receipts work on LAN HTTP without randomUUID and keep UUID v4 entropy", () => {
  const { webcrypto } = require("node:crypto");
  const insecureContextCrypto = {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  };
  const ids = Array.from({ length: 100 }, () =>
    requestId(insecureContextCrypto),
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(
    ids.every((id) =>
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
        id,
      ),
    ),
  );
});

test("an uncertain accepted write retains its receipt identity after network and server failures", () => {
  // These errors can occur after a server commits the card. A current-bank
  // refresh cannot determine whether the original request was accepted.
  const original = {
    requestId: "accepted-card-123",
    revision: 7,
    fighterIds: ["a", "b", "c", "d"],
  };
  for (const error of [
    new TypeError("Failed to fetch"),
    { status: 500, message: "Ledger unavailable" },
    { status: 502 },
    { status: 503 },
    { status: 504 },
  ]) {
    const pending = isDefiniteRejection(error) ? null : original;
    assert.equal(
      pending,
      original,
      "Recovery must preserve the exact body and ID, even if the bank is now empty.",
    );
  }
});

test("explicitly rejected stale or invalid actions can release the pending request for a new decision", () => {
  for (const status of [400, 401, 403, 404, 409, 422, 429]) {
    assert.equal(isDefiniteRejection({ status }), true);
  }
});
