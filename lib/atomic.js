const mongoose = require("mongoose");
const { AsyncLocalStorage } = require("node:async_hooks");

// Legacy gameplay spans several collections. A shared write fence also guards
// predicate checks (capacity/allowances), which snapshot isolation alone cannot.
// This deliberately serializes legacy mutations during the comparison alpha.
mongoose.set("transactionAsyncLocalStorage", true);
const context = new AsyncLocalStorage();
const Fence =
  mongoose.models.GameWriteFence ||
  mongoose.model(
    "GameWriteFence",
    new mongoose.Schema({
      _id: String,
      revision: { type: Number, default: 0 },
    }),
  );

async function atomic(work) {
  if (context.getStore()) return work();
  try {
    let effects = [];
    const result = await mongoose.connection.transaction(async () => {
      effects = []; // a retried transaction discards the aborted attempt's effects
      await Fence.updateOne(
        { _id: "legacy" },
        { $inc: { revision: 1 } },
        { upsert: true },
      );
      return context.run({ effects }, work);
    });
    for (const effect of effects) {
      try {
        await effect();
      } catch (e) {
        console.error("[after-commit]", e.message);
      }
    }
    return result;
  } catch (error) {
    if (
      error.code === 20 ||
      /Transaction numbers are only allowed/.test(error.message)
    ) {
      throw Object.assign(
        new Error(
          "The real-time comparison mode requires MongoDB replica-set transactions. The player-paced career works on standalone MongoDB.",
        ),
        { statusCode: 503, expose: true },
      );
    }
    throw error;
  }
}
function afterCommit(effect) {
  const current = context.getStore();
  if (current) {
    current.effects.push(effect);
    return;
  }
  return effect();
}

function protect(exports) {
  return Object.fromEntries(
    Object.entries(exports).map(([key, fn]) => [
      key,
      typeof fn === "function" && fn.constructor.name === "AsyncFunction"
        ? function (...args) {
            return atomic(() => fn.apply(this, args));
          }
        : fn,
    ]),
  );
}
// Controllers respond only after commit. A handled error also rolls back any
// earlier writes, instead of accidentally committing a partially failed action.
function handler(fn) {
  return async (req, res, next) => {
    let status = 200,
      body;
    const response = {
      status(code) {
        status = code;
        return this;
      },
      json(value) {
        body = value;
        return this;
      },
    };
    try {
      await atomic(async () => {
        await fn(req, response);
        if (status >= 400)
          throw Object.assign(new Error("Handled response"), { handled: true });
      });
      return res.status(status).json(body);
    } catch (e) {
      if (e.handled) return res.status(status).json(body);
      return next(e);
    }
  };
}
module.exports = { atomic, protect, Fence, handler, afterCommit };
