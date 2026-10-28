const express = require("express");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const cors = require("cors");
const mongoose = require("mongoose");
const config = require("./config");
const authRoutes = require("./routes/authRoutes");
const gymRoutes = require("./routes/gymRoutes");
const scoutingRoutes = require("./routes/scoutingRoutes");
const fighterRoutes = require("./routes/fighterRoutes");
const campRoutes = require("./routes/campRoutes");
const fightRoutes = require("./routes/fightRoutes");
const rankingRoutes = require("./routes/rankingRoutes");
const pvpRoutes = require("./routes/pvpRoutes");
const liveFightRoutes = require("./routes/liveFightRoutes");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();
app.use((req, res, next) => {
  const started = Date.now();
  req.requestId = require("node:crypto").randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  res.on("finish", () => {
    const durationMs = Date.now() - started;
    if (res.statusCode >= 500 || durationMs >= 1000)
      console.warn(
        JSON.stringify({
          event: "http-request",
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          status: res.statusCode,
          durationMs,
        }),
      );
  });
  next();
});

// Behind the host's edge proxy (Railway etc.): trust the first hop so
// express-rate-limit and req.ip read the real client IP from X-Forwarded-For.
app.set("trust proxy", 1);

// ── Rate limiting ──
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX) || 300, // requests/min/IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests — slow down and try again shortly." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) || 50, // attempts/15min/IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    message: "Too many attempts — please wait a few minutes and try again.",
  },
});

// ── Security headers ──
// JSON API consumed cross-origin by the separate frontend: CSP belongs on the
// frontend host; CORP must allow the other origin to consume responses.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

/**
 * CORS allowlist. Same-origin (no Origin header — curl, health checks) is
 * always allowed. Browser-origin requests must match one of the values below.
 *   FRONTEND_URL — the deployed frontend, comma-separated for previews.
 *   localhost:5173 / 4173 — Vite dev / preview servers.
 */
const corsAllowlist = [
  ...(process.env.NODE_ENV === "production" && !config.localMode
    ? []
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:4173",
      ]),
  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (corsAllowlist.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not in allowlist`));
    },
    credentials: true,
  }),
);
console.log(`[CORS] Allowlist: ${corsAllowlist.join(", ") || "(empty)"}`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// Public
app.get("/site", (_req, res) =>
  res.set("Cache-Control", "no-store").json({
    localPreview: config.localMode,
    supportEmail: process.env.SUPPORT_EMAIL || null,
    securityEmailAvailable: !!process.env.RESEND_API_KEY,
    serviceDetails: process.env.PUBLIC_SERVICE_DETAILS || null,
    payments: "disconnected",
  }),
);
app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/ready", (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res
    .status(ready ? 200 : 503)
    .json({
      ok: ready,
      database: ready ? "connected" : "unavailable",
      payments: "disconnected",
    });
});
app.use("/auth", authLimiter, authRoutes);

// Protected — JWT required for all game routes
app.use("/gyms", authMiddleware, gymRoutes);
app.use("/scouting", authMiddleware, scoutingRoutes);
app.use("/fighters", authMiddleware, fighterRoutes);
app.use("/camps", authMiddleware, campRoutes);
app.use("/fights", authMiddleware, fightRoutes);
app.use("/rankings", authMiddleware, rankingRoutes);
app.use("/pvp", authMiddleware, pvpRoutes);
app.use("/livefight", authMiddleware, liveFightRoutes);
app.use("/career", authMiddleware, require("./routes/careerRoutes"));
app.use("/account", authMiddleware, require("./routes/accountRoutes"));

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// ── Global error handler (MUST be last; 4 args) ──
// Log correlation and error type, excluding bodies, tokens and query strings.
// Client-fixable errors opt in via err.statusCode / err.expose.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const isBadJson = err.type === "entity.parse.failed";
  const isCors =
    typeof err.message === "string" && err.message.startsWith("CORS:");
  const status = isBadJson
    ? 400
    : isCors
      ? 403
      : err.statusCode || err.status || 500;

  const log = status >= 500 ? console.error : console.warn;
  log(
    JSON.stringify({
      event: "http-error",
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status,
      type: err.name || "Error",
    }),
  );

  let message = "Internal server error";
  if (isBadJson) message = "Invalid JSON in request body.";
  else if (isCors) message = "Origin not allowed.";
  else if (err.expose || (status < 500 && err.validation))
    message = err.message;

  if (res.headersSent) return next(err);
  res.status(status).json({ message });
});

// ── Process-level safety nets ──
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err.stack || err.message);
  process.exit(1);
});

async function initializeDatabase({ legacy = true } = {}) {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.JWT_SECRET ||
      config.jwtSecret.length < 32 ||
      config.jwtSecret === "gymwars_dev_secret_change_in_prod")
  )
    throw new Error(
      "Production requires a private JWT_SECRET of at least 32 characters.",
    );
  await mongoose.connect(config.database.url, config.database.options);
  console.log("Connected to MongoDB");
  await require("./scripts/migrateOwnerIndex").migrate(mongoose.connection);
  // Do not accept a first request before the idempotency/ownership
  // indexes exist, including on a completely empty database.
  const { Snapshot, Exhibition } = require("./models/exhibitionModel");
  await Promise.all([
    require("./models/userModel").init(),
    require("./models/careerModel").init(),
    require("./models/clubShopModel").init(),
    require("./models/alphaModel").AlphaEvent.init(),
    require("./models/alphaModel").SupportReport.init(),
    Snapshot.init(),
    Exhibition.init(),
    ...Object.values(require("./models/careerWarModel")).map((Model) =>
      Model.init(),
    ),
  ]);
  if (!legacy) return;
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  const supportsLegacyTransactions =
    !!hello.setName || hello.msg === "isdbgrid";
  if (supportsLegacyTransactions) {
    await require("./lib/atomic").Fence.updateOne(
      { _id: "legacy" },
      { $setOnInsert: { revision: 0 } },
      { upsert: true },
    );
  }
  try {
    if (supportsLegacyTransactions && process.env.DISABLE_SCHEDULER !== "true")
      await require("./modules/scheduler").startSchedulers();
  } catch (err) {
    // Redis being down shouldn't stop local dev of the HTTP API — jobs
    // simply won't run until it's back. Deployed hosts always have Redis.
    console.error(
      "[scheduler] Failed to start (continuing without jobs):",
      err.message,
    );
  }
  // Every weight class has a champion from day one (GDD §8.3).
  if (supportsLegacyTransactions)
    await require("./services/aiOpponentService").ensureChampionsExist();
}
async function start() {
  try {
    await initializeDatabase();
    return app.listen(config.port, process.env.HOST || undefined, () => {
      console.log(`Gym Wars API running on port ${config.port}`);
    });
  } catch (err) {
    console.error("Database connection failed:", err);
    throw err;
  }
}
if (require.main === module) start().catch(() => process.exit(1));
module.exports = { app, start, initializeDatabase };
