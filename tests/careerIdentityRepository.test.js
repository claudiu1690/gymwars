const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createCareer } = require("../engine/careerEngine");
const { repository } = require("../services/careerService");
const clone = (value) => structuredClone(value);

test("signature and ambition commands retain the atomic revision, exact retry and failed-storage boundary", async () => {
  const doc = {
    gymId: "identity-retries",
    revision: 0,
    receipts: [],
    state: createCareer({
      seed: "identity-retries",
      name: "Identity Gym",
      style: "wrestling",
    }),
  };
  doc.state.fighters[0].rarity = "elite";
  const model = {
    findOne() {
      return { lean: async () => clone(doc) };
    },
    findOneAndUpdate(filter, update) {
      return {
        lean: async () => {
          if (doc.revision !== filter.revision) return null;
          Object.assign(doc, clone(update.$set));
          doc.revision += update.$inc.revision;
          doc.receipts.push(...clone(update.$push.receipts.$each));
          return clone(doc);
        },
      };
    },
  };
  const now = () => Date.parse("2026-10-09T15:00:00Z");
  const repo = repository(model, { now });
  const action = {
    id: "equip-signature-atomic",
    revision: 0,
    command: {
      type: "signature",
      fighterId: "starter",
      signatureId: "chain-wrestling",
    },
  };
  const before = clone(doc);
  const failed = repository(model, {
    now,
    beforeCommit: async () => {
      throw new Error("storage interrupted");
    },
  });
  await assert.rejects(
    failed.command(doc.gymId, action),
    /storage interrupted/,
  );
  assert.deepEqual(doc, before);
  const results = await Promise.all([
    repo.command(doc.gymId, action),
    repo.command(doc.gymId, action),
  ]);
  assert.equal(results.filter((r) => r.duplicate).length, 1);
  assert.equal(doc.revision, 1);
  assert.equal(doc.state.fighters[0].signatureId, "chain-wrestling");
  assert.equal(
    doc.state.fighters[0].history.filter((h) => h.type === "signature").length,
    1,
  );
  assert.equal(
    results[0].allowances.careerWeeks.available,
    8,
    "planning never spends career weeks",
  );
  assert.equal(doc.state.cash, before.state.cash);
  const chosen = clone(doc);
  for (const signatureId of ["pace-keeper", null]) {
    await assert.rejects(
      repo.command(doc.gymId, {
        id: `cannot-change-${signatureId}`,
        revision: 1,
        command: { type: "signature", fighterId: "starter", signatureId },
      }),
      /permanent|available signatures/,
    );
    assert.deepEqual(
      doc,
      chosen,
      "rejected changes leave the chosen signature and save revision intact",
    );
  }
  await assert.rejects(
    repo.command(doc.gymId, { ...action, id: "other-stale-signature" }),
    /another request/,
  );
  const ambition = {
    id: "select-ambition-atomic",
    revision: 1,
    command: {
      type: "select-ambition",
      goalId: "first-belt",
      fighterId: "starter",
      completedWeek: 0,
      progress: { current: 1, target: 1 },
    },
  };
  const selected = await repo.command(doc.gymId, ambition);
  assert.equal(
    selected.career.ambition.status,
    "active",
    "client supplied completion is ignored",
  );
  const original = clone(doc.state.selectedAmbition);
  const cleared = await repo.command(doc.gymId, {
    id: "clear-ambition-atomic",
    revision: 2,
    command: { type: "clear-ambition" },
  });
  assert.equal(cleared.career.ambition, null);
  const oldRetry = await repo.command(doc.gymId, ambition);
  assert.equal(oldRetry.duplicate, true);
  assert.equal(
    oldRetry.career.ambition,
    null,
    "retry never restores an old chosen goal",
  );
  assert.equal(oldRetry.acceptedAction.revision, 2);
  assert.equal(doc.revision, 3);
  assert.deepEqual(doc.state.ambitionHistory.at(-1), {
    ...original,
    status: "cleared",
    endedWeek: 0,
  });
});
