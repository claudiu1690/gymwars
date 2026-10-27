const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { repository, previewEnabled } = require("../services/clubShopService");
const { PRODUCTS, CATALOG_VERSION } = require("../consts/clubShop");
const { createCareer, applyCommand } = require("../engine/careerEngine");
const banks = require("../services/careerAllowances");
function fixture(options = {}) {
  const docs = new Map(),
    clock = { now: Date.parse("2026-10-14T12:00:00Z") };
  docs.set("a", {
    gymId: "a",
    revision: 0,
    state: createCareer({ seed: "supply-test", name: "Supply club" }),
    daily: banks.materialize(null, clock.now),
  });
  const Model = {
    findOne: ({ gymId }) => ({
      lean: async () => structuredClone(docs.get(gymId) || null),
    }),
    findOneAndUpdate: ({ gymId, revision }, update) => ({
      lean: async () => {
        const d = docs.get(gymId);
        if (!d || d.revision !== revision) return null;
        Object.assign(d, structuredClone(update.$set));
        d.revision += update.$inc.revision;
        if (update.$push?.receipts) {
          d.receipts ||= [];
          d.receipts.push(...structuredClone(update.$push.receipts.$each));
        }
        return structuredClone(d);
      },
    }),
  };
  return {
    docs,
    clock,
    Model,
    repo: repository(Model, {
      canPreview: () => true,
      now: () => clock.now,
      ...options,
    }),
  };
}
const checkout = (
  productId = "career-weeks",
  requestId = "supply-checkout-001",
) => ({ requestId, productId, catalogVersion: CATALOG_VERSION });
test("bundle grants both supplies atomically, shares both solo limits and cannot reopen them by spending", async () => {
  const { docs, repo, clock } = fixture(),
    before = structuredClone(docs.get("a").state);
  const result = await repo.purchasePreview("a", checkout("club-pack"));
  assert.equal(result.receipt.priceMinor, 899);
  assert.deepEqual(result.receipt.grants, [
    { resource: "careerWeeks", quantity: 4 },
    { resource: "leagueCards", quantity: 2 },
  ]);
  assert.equal(result.allowances.careerWeeks.available, 12);
  assert.equal(result.allowances.leagueCards.available, 3);
  assert.ok(result.products.every((p) => !p.canBuy));
  assert.deepEqual(docs.get("a").state, before);
  for (const resource of ["careerWeeks", "leagueCards"])
    docs.get("a").daily = banks.spend(
      docs.get("a").daily,
      resource,
      result.allowances[resource].available,
      clock.now,
      { preview: true },
    );
  for (const id of ["career-weeks", "gym-wars-token", "club-pack"])
    await assert.rejects(
      repo.purchasePreview("a", checkout(id, "after-spend-" + id)),
      /24-hour interval/,
    );
});
test("bundle versus solo checkout races never exceed shared supply quotas", async () => {
  const { docs, repo } = fixture();
  const outcomes = await Promise.allSettled(
    ["club-pack", "career-weeks", "gym-wars-token"].map((id) =>
      repo.purchasePreview("a", checkout(id, "race-" + id)),
    ),
  );
  assert.ok(outcomes.some((o) => o.status === "fulfilled"));
  const view = await repo.get("a");
  assert.equal(view.allowances.careerWeeks.extraAvailable, 4);
  assert.equal(view.allowances.leagueCards.extraAvailable, 2);
  assert.ok([1, 2].includes(docs.get("a").supplyShop.preview.orders.length));
  for (const outcome of outcomes.filter((o) => o.status === "rejected"))
    assert.equal(outcome.reason.statusCode, 409);
});
test("a full token bank or failed bundle commit grants neither resource", async () => {
  const { docs, repo, Model, clock } = fixture();
  docs.get("a").daily = banks.grant(
    docs.get("a").daily,
    "leagueCards",
    3,
    "preview",
    clock.now,
  );
  const before = structuredClone(docs.get("a"));
  const pack = (await repo.get("a")).products.find((p) => p.id === "club-pack");
  assert.equal(pack.storageFull, true);
  await assert.rejects(
    repo.purchasePreview("a", checkout("club-pack")),
    /bank is full/,
  );
  assert.deepEqual(docs.get("a"), before);
  docs.get("a").daily.leagueCards.extraPreview = 0;
  const beforeFailure = structuredClone(docs.get("a"));
  const failed = repository(Model, {
    canPreview: () => true,
    now: () => clock.now,
    beforeCommit: async () => {
      throw new Error("failed bundle storage");
    },
  });
  await assert.rejects(
    failed.purchasePreview("a", checkout("club-pack")),
    /failed bundle storage/,
  );
  assert.deepEqual(docs.get("a"), beforeFailure);
});
test("original catalog receipts recover unchanged and count toward shared limits", async () => {
  const { docs, repo, clock } = fixture(),
    d = docs.get("a");
  const receipt = {
    orderId: "old-order-001",
    requestId: "legacy-order-001",
    productId: "retired-supply-id",
    catalogVersion: 2,
    productName: "Original career weeks",
    priceMinor: 199,
    chargedMinor: 0,
    resource: "careerWeeks",
    quantity: 4,
    window: 0,
    anchorAt: d.daily.anchorAt,
    createdAt: new Date(clock.now).toISOString(),
  };
  d.supplyShop = { preview: { orders: [structuredClone(receipt)] } };
  const before = structuredClone(d);
  const recovered = await repo.purchasePreview("a", {
    requestId: receipt.requestId,
    productId: receipt.productId,
    catalogVersion: 2,
  });
  assert.equal(recovered.duplicate, true);
  assert.deepEqual(recovered.receipt, receipt);
  assert.deepEqual(docs.get("a"), before);
  await assert.rejects(
    repo.purchasePreview("a", checkout("club-pack", "legacy-limit-001")),
    /24-hour interval/,
  );
  await assert.rejects(
    repo.purchasePreview("a", { ...checkout(), catalogVersion: 2 }),
    /shop changed/,
  );
  await assert.rejects(
    repo.purchasePreview("a", {
      requestId: receipt.requestId,
      productId: receipt.productId,
      catalogVersion: 3,
    }),
    /another order/,
  );
});
test("supply catalog sells only bounded weeks/tokens; reads are pure and retired cosmetics cannot be bought", async () => {
  const { docs, repo } = fixture(),
    before = structuredClone(docs.get("a")),
    view = await repo.get("a");
  assert.deepEqual(docs.get("a"), before);
  assert.equal(PRODUCTS.length, 3);
  assert.ok(
    PRODUCTS.every(
      (p) => p.priceMinor >= 499 && p.grants.every((g) => g.quantity > 0),
    ),
  );
  assert.equal(view.paymentsConnected, false);
  assert.equal(view.allowances.careerWeeks.available, 8);
  await assert.rejects(
    repo.purchasePreview("a", checkout("redline")),
    /Cosmetics are earned/,
  );
  assert.equal(
    (await repo.get("missing")).products.every((p) => !p.canBuy),
    true,
  );
});
test("checkout credits authoritative supplies and receipt together without playing time, training or granting cosmetics", async () => {
  const { docs, repo } = fixture(),
    before = structuredClone(docs.get("a").state);
  const result = await repo.purchasePreview("a", {
    ...checkout(),
    quantity: 999,
    priceMinor: 0,
    resource: "cash",
  });
  assert.equal(result.receipt.quantity, 4);
  assert.equal(result.receipt.priceMinor, 499);
  assert.equal(result.receipt.chargedMinor, 0);
  assert.equal(result.allowances.careerWeeks.available, 12);
  assert.equal(result.allowances.careerWeeks.extraAvailable, 4);
  assert.equal(docs.get("a").revision, 1);
  assert.deepEqual(docs.get("a").state, before);
  const replay = await repo.purchasePreview("a", checkout());
  assert.equal(replay.duplicate, true);
  assert.equal(replay.revision, 1);
  assert.deepEqual(replay.receipt, result.receipt);
});
test("exact concurrent retries grant once and different packs cannot lose each other’s credits", async () => {
  const { docs, repo } = fixture();
  const answers = await Promise.all([
    repo.purchasePreview("a", checkout()),
    repo.purchasePreview("a", checkout()),
  ]);
  assert.equal(answers.filter((r) => r.duplicate).length, 1);
  await repo.purchasePreview(
    "a",
    checkout("gym-wars-token", "supply-token-002"),
  );
  assert.equal(docs.get("a").supplyShop.preview.orders.length, 2);
  assert.equal((await repo.get("a")).allowances.leagueCards.available, 3);
  await assert.rejects(
    repo.purchasePreview("a", checkout("gym-wars-token")),
    /another order/,
  );
});
test("server-owned 24-hour purchase limit survives spending, refuses forged resets and reopens only at its boundary", async () => {
  const { docs, repo, clock } = fixture();
  await repo.purchasePreview("a", checkout());
  const next = {
    ...checkout(),
    requestId: "second-pack-002",
    window: 999,
    createdAt: "2100-01-01",
  };
  await assert.rejects(repo.purchasePreview("a", next), /24-hour interval/);
  docs.get("a").daily = banks.spend(
    docs.get("a").daily,
    "careerWeeks",
    12,
    clock.now,
    { preview: true },
  );
  clock.now += banks.DAY - 1;
  await assert.rejects(repo.purchasePreview("a", next), /24-hour interval/);
  clock.now++;
  assert.equal(
    (await repo.purchasePreview("a", next)).allowances.careerWeeks.available,
    8,
  );
});
test("stored extras do not expire or absorb free refills; free supply is used first", async () => {
  const now = Date.parse("2026-10-14T00:00:00Z");
  let daily = banks.grant(null, "careerWeeks", 4, "preview", now);
  daily = banks.materialize(daily, now + 30 * banks.DAY);
  assert.equal(daily.careerWeeks.balance, 12);
  assert.equal(daily.careerWeeks.extraPreview, 4);
  assert.equal(
    banks.publicAllowances(daily, now + 30 * banks.DAY, { preview: true })
      .careerWeeks.available,
    16,
  );
  daily = banks.spend(daily, "careerWeeks", 12, now + 30 * banks.DAY, {
    preview: true,
  });
  assert.equal(daily.careerWeeks.extraPreview, 4);
  daily = banks.spend(daily, "careerWeeks", 1, now + 30 * banks.DAY, {
    preview: true,
  });
  assert.equal(daily.careerWeeks.extraPreview, 3);
});
test("failed commit grants nothing; accepted-but-lost response recovers the same receipt", async () => {
  const { docs, Model, repo, clock } = fixture(),
    before = structuredClone(docs.get("a"));
  const failed = repository(Model, {
    canPreview: () => true,
    now: () => clock.now,
    beforeCommit: async () => {
      throw new Error("storage unavailable");
    },
  });
  await assert.rejects(
    failed.purchasePreview("a", checkout()),
    /storage unavailable/,
  );
  assert.deepEqual(docs.get("a"), before);
  const result = await repo.purchasePreview("a", checkout());
  assert.deepEqual(
    (await repo.purchasePreview("a", checkout())).receipt,
    result.receipt,
  );
});
test("production ignores test supply credits and cannot fulfill preview orders", async () => {
  const { docs, Model, repo, clock } = fixture();
  await repo.purchasePreview("a", checkout());
  const live = repository(Model, {
    canPreview: () => false,
    now: () => clock.now,
  });
  assert.equal((await live.get("a")).allowances.careerWeeks.available, 8);
  assert.deepEqual((await live.get("a")).orders, []);
  await assert.rejects(
    live.purchasePreview("a", checkout("gym-wars-token")),
    /not connected/,
  );
  const daily = docs.get("a").daily;
  assert.throws(
    () => banks.spend(daily, "careerWeeks", 9, clock.now, { preview: false }),
    /No career weeks/,
  );
});
test("preview gate and malformed checkout payloads fail closed", async () => {
  const { repo } = fixture();
  for (const body of [
    null,
    {},
    checkout("__proto__"),
    { ...checkout(), requestId: "short" },
    { ...checkout(), catalogVersion: 999 },
  ])
    await assert.rejects(repo.purchasePreview("a", body));
  const original = { ...process.env };
  try {
    process.env.LOCAL_MODE = "true";
    process.env.SHOP_PREVIEW_ENABLED = "true";
    process.env.NODE_ENV = "production";
    assert.equal(previewEnabled(), false);
    process.env.NODE_ENV = "development";
    assert.equal(previewEnabled(), true);
  } finally {
    for (const key of ["LOCAL_MODE", "SHOP_PREVIEW_ENABLED", "NODE_ENV"])
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
  }
});
test("stored-purchase cap prevents stockpiling, while an old exact receipt remains recoverable", async () => {
  const { repo, clock } = fixture();
  const first = checkout();
  await repo.purchasePreview("a", first);
  clock.now += banks.DAY;
  await repo.purchasePreview(
    "a",
    checkout("career-weeks", "second-interval-001"),
  );
  clock.now += banks.DAY;
  assert.equal(
    (await repo.get("a")).products.find((p) => p.id === "career-weeks")
      .storageFull,
    true,
  );
  await assert.rejects(
    repo.purchasePreview("a", checkout("career-weeks", "third-interval-001")),
    /bank is full/,
  );
  assert.equal((await repo.purchasePreview("a", first)).duplicate, true);
});
test("different supply packs and a competing End week cannot overwrite each other", async () => {
  const parallel = fixture();
  await Promise.all([
    parallel.repo.purchasePreview("a", checkout()),
    parallel.repo.purchasePreview(
      "a",
      checkout("gym-wars-token", "parallel-token-001"),
    ),
  ]);
  const view = await parallel.repo.get("a");
  assert.equal(view.orders.length, 2);
  assert.equal(view.allowances.careerWeeks.available, 12);
  assert.equal(view.allowances.leagueCards.available, 3);
  const racing = fixture(),
    career = require("../services/careerService").repository(racing.Model, {
      now: () => racing.clock.now,
    });
  const outcomes = await Promise.allSettled([
    racing.repo.purchasePreview("a", checkout()),
    career.command("a", {
      id: "racing-end-week-001",
      revision: 0,
      command: { type: "advance", confirmCosts: true },
    }),
  ]);
  assert.equal(outcomes[0].status, "fulfilled");
  const saved = racing.docs.get("a");
  assert.ok([0, 1].includes(saved.state.week));
  assert.equal(
    (await racing.repo.get("a")).allowances.careerWeeks.available,
    12 - saved.state.week,
  );
});
