const { createHash } = require("node:crypto");
const Career = require("../models/careerModel");
const {
  CATALOG_VERSION,
  PRODUCTS,
  productById,
  LIMITS,
  grantsOf,
} = require("../consts/clubShop");
const {
  materialize,
  publicAllowances,
  grant,
  DAY,
} = require("./careerAllowances");
const fail = (message, statusCode = 409) =>
  Object.assign(new Error(message), { statusCode, expose: true });
const previewEnabled = () =>
  process.env.LOCAL_MODE === "true" &&
  process.env.SHOP_PREVIEW_ENABLED === "true" &&
  process.env.NODE_ENV !== "production";
function availability(product, daily, orders, window, preview) {
  const quantities = Object.fromEntries(Object.keys(LIMITS).map((r) => [r, 0]));
  for (const order of orders)
    if (order.window === window && order.anchorAt === daily?.anchorAt)
      for (const g of grantsOf(order))
        if (LIMITS[g.resource]) quantities[g.resource] += g.quantity;
  const remaining = Math.max(
    0,
    Math.min(
      ...product.grants.map((g) =>
        Math.floor(
          (LIMITS[g.resource].perWindow - quantities[g.resource]) / g.quantity,
        ),
      ),
    ),
  );
  const storageFull = product.grants.some(
    (g) =>
      (daily?.[g.resource]?.[preview ? "extraPreview" : "extraLive"] || 0) +
        g.quantity >
      LIMITS[g.resource].maximumStored,
  );
  return { remaining, storageFull };
}
function repository(
  Model = Career,
  {
    now = Date.now,
    canPreview = previewEnabled,
    beforeCommit = async () => {},
  } = {},
) {
  function view(doc, at = now()) {
    const preview = canPreview(),
      mode = preview ? "preview" : "live",
      daily = doc ? materialize(doc.daily, at) : null;
    const data = doc?.supplyShop?.[mode] || { orders: [] },
      orders = data.orders || [];
    const window = daily
      ? Math.max(0, Math.floor((at - Date.parse(daily.anchorAt)) / DAY))
      : 0;
    return {
      mode: preview ? "preview" : "unavailable",
      catalogVersion: CATALOG_VERSION,
      currency: "USD",
      revision: doc?.revision || 0,
      paymentsConnected: false,
      limits: LIMITS,
      allowances: daily ? publicAllowances(daily, at, { preview }) : null,
      resetAt: daily
        ? new Date(
            Date.parse(daily.anchorAt) + (window + 1) * DAY,
          ).toISOString()
        : null,
      products: PRODUCTS.map((p) => {
        const { remaining, storageFull } = availability(
          p,
          daily,
          orders,
          window,
          preview,
        );
        return {
          ...p,
          remaining,
          canBuy: preview && !!doc && remaining > 0 && !storageFull,
          storageFull,
        };
      }),
      orders: [...orders].reverse(),
    };
  }
  return {
    async get(gymId) {
      return view(await Model.findOne({ gymId }).lean());
    },
    async purchasePreview(gymId, body) {
      if (!canPreview())
        throw fail("Payments are not connected. No purchase was made.", 503);
      const { requestId, productId, catalogVersion } = body || {};
      if (
        typeof requestId !== "string" ||
        !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId) ||
        typeof productId !== "string" ||
        !Number.isSafeInteger(catalogVersion)
      )
        throw fail(
          "Choose a supply pack and refresh the shop before checking out.",
          400,
        );
      const product = productById(productId);
      for (let attempt = 0; attempt < 4; attempt++) {
        const doc = await Model.findOne({ gymId }).lean();
        if (!doc) throw fail("Start your gym before buying supplies.", 404);
        const at = now(),
          shop = structuredClone(doc.supplyShop || {}),
          data = shop.preview || { orders: [] };
        const prior = data.orders.find((o) => o.requestId === requestId);
        if (prior) {
          if (
            prior.productId !== productId ||
            prior.catalogVersion !== catalogVersion
          )
            throw fail("That checkout ID belongs to another order.");
          return { ...view(doc, at), receipt: prior, duplicate: true };
        }
        if (!product)
          throw fail(
            "This item is not in the supply shop. Cosmetics are earned in Achievements.",
            400,
          );
        if (catalogVersion !== CATALOG_VERSION)
          throw fail(
            "The shop changed. Refresh to see the current price before buying.",
          );
        const daily = materialize(doc.daily, at),
          window = Math.max(
            0,
            Math.floor((at - Date.parse(daily.anchorAt)) / DAY),
          );
        const { storageFull, remaining } = availability(
          product,
          daily,
          data.orders,
          window,
          true,
        );
        if (storageFull)
          throw fail(
            "Your extra supply bank is full. Use some saved supplies before buying another pack. No purchase was made.",
          );
        if (!remaining)
          throw fail(
            "This pack shares a supply limit already used for the current 24-hour interval. Free refills continue normally.",
          );
        const receipt = {
          orderId:
            "preview-" +
            createHash("sha256")
              .update(String(gymId) + ":" + requestId)
              .digest("hex")
              .slice(0, 20),
          requestId,
          productId,
          catalogVersion,
          productName: product.name,
          priceMinor: product.priceMinor,
          chargedMinor: 0,
          currency: "USD",
          status: "preview-completed",
          resource: product.resource,
          quantity: product.quantity,
          grants: structuredClone(product.grants),
          window,
          anchorAt: daily.anchorAt,
          createdAt: new Date(at).toISOString(),
        };
        data.orders.push(receipt);
        shop.preview = data;
        const credited = product.grants.reduce(
          (saved, g) => grant(saved, g.resource, g.quantity, "preview", at),
          daily,
        );
        await beforeCommit({ daily: credited, supplyShop: shop });
        const saved = await Model.findOneAndUpdate(
          { gymId, revision: doc.revision },
          {
            $set: { daily: credited, supplyShop: shop },
            $inc: { revision: 1 },
          },
          { new: true },
        ).lean();
        if (saved) return { ...view(saved, at), receipt, duplicate: false };
      }
      throw fail(
        "Another action finished first. Refresh and retry the same checkout.",
      );
    },
  };
}
module.exports = { ...repository(), repository, previewEnabled };
