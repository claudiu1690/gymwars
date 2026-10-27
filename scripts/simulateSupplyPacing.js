// Supply availability over 100 elapsed server hours, not human playtime or retention.
const { repository } = require("../services/clubShopService"),
  { createCareer } = require("../engine/careerEngine"),
  {
    materialize,
    spend,
    publicAllowances,
    DAY,
  } = require("../services/careerAllowances"),
  assert = require("node:assert/strict");
const { CATALOG_VERSION } = require("../consts/clubShop");
async function simulate(policy) {
  const origin = Date.parse("2026-10-14T00:00:00Z");
  let now = origin,
    doc = {
      gymId: "supply-simulation",
      revision: 0,
      state: createCareer({
        seed: "supply-simulation",
        name: "Supply simulation",
      }),
      daily: materialize(null, origin),
    },
    weeksSpent = 0,
    tokensSpent = 0;
  const Model = {
    findOne: () => ({ lean: async () => structuredClone(doc) }),
    findOneAndUpdate: ({ revision }, u) => ({
      lean: async () => {
        if (doc.revision !== revision) return null;
        Object.assign(doc, structuredClone(u.$set));
        doc.revision += u.$inc.revision;
        return structuredClone(doc);
      },
    }),
  };
  const shop = repository(Model, { canPreview: () => true, now: () => now }),
    rows = [];
  for (let hour = 0; hour <= 100; hour++) {
    now = origin + hour * 3600000;
    doc.daily = materialize(doc.daily, now);
    if (hour % 24 === 0) {
      if (policy !== "free")
        for (const productId of policy === "separate"
          ? ["career-weeks", "gym-wars-token"]
          : policy === "adversarial"
            ? ["club-pack", "career-weeks", "gym-wars-token"]
            : ["club-pack"]) {
          try {
            await shop.purchasePreview(doc.gymId, {
              requestId: policy + "-" + productId + "-" + hour,
              productId,
              catalogVersion: CATALOG_VERSION,
            });
          } catch (e) {
            if (e.statusCode !== 409) throw e;
          }
        }
      if (policy !== "stockpile") {
        const supply = publicAllowances(doc.daily, now, { preview: true });
        weeksSpent += supply.careerWeeks.available;
        tokensSpent += supply.leagueCards.available;
        doc.daily = spend(
          doc.daily,
          "careerWeeks",
          supply.careerWeeks.available,
          now,
          { preview: true },
        );
        doc.daily = spend(
          doc.daily,
          "leagueCards",
          supply.leagueCards.available,
          now,
          { preview: true },
        );
      }
    }
    if (hour % 24 === 0 || hour === 100) {
      const supply = publicAllowances(doc.daily, now, { preview: true });
      assert.ok(supply.careerWeeks.available <= 20);
      assert.ok(supply.leagueCards.available <= 7);
      rows.push({
        policy,
        hour,
        weeksReady: supply.careerWeeks.available,
        tokensReady: supply.leagueCards.available,
        weeksSpent,
        tokensSpent,
        extraWeeks: supply.careerWeeks.extraAvailable,
        extraTokens: supply.leagueCards.extraAvailable,
        orders: doc.supplyShop?.preview?.orders.length || 0,
        displayedPriceMinor: (doc.supplyShop?.preview?.orders || []).reduce(
          (sum, order) => sum + order.priceMinor,
          0,
        ),
        chargedMinor: (doc.supplyShop?.preview?.orders || []).reduce(
          (sum, order) => sum + order.chargedMinor,
          0,
        ),
      });
    }
  }
  return rows;
}
async function run() {
  const rows = (
    await Promise.all(
      ["free", "separate", "bundle", "adversarial", "stockpile"].map(simulate),
    )
  ).flat();
  const last = Object.fromEntries(
    ["free", "separate", "bundle", "adversarial", "stockpile"].map((p) => [
      p,
      rows.filter((r) => r.policy === p).at(-1),
    ]),
  );
  assert.equal(last.free.weeksSpent, 24);
  for (const policy of ["separate", "bundle", "adversarial"]) {
    assert.equal(last[policy].weeksSpent, 44);
    assert.equal(last[policy].tokensSpent, 15);
    assert.equal(last[policy].chargedMinor, 0);
  }
  assert.equal(last.free.tokensSpent, 5);
  assert.equal(last.stockpile.weeksReady, 20);
  assert.equal(last.stockpile.tokensReady, 7);
  assert.equal(last.separate.displayedPriceMinor, 4990);
  assert.equal(last.bundle.displayedPriceMinor, 4495);
  assert.equal(last.adversarial.displayedPriceMinor, 4495);
  return rows;
}
if (require.main === module)
  run()
    .then((rows) => {
      const fields = Object.keys(rows[0]);
      console.log(
        fields.join(",") +
          "\n" +
          rows.map((r) => fields.map((k) => r[k]).join(",")).join("\n"),
      );
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    });
module.exports = { simulate, run };
