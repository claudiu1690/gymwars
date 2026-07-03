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
const authMiddleware = require("./middleware/authMiddleware");
const scheduler = require("./modules/scheduler");

const app = express();

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
    message: { message: "Too many attempts — please wait a few minutes and try again." },
});

// ── Security headers ──
// JSON API consumed cross-origin by the separate frontend: CSP belongs on the
// frontend host; CORP must allow the other origin to consume responses.
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

/**
 * CORS allowlist. Same-origin (no Origin header — curl, health checks) is
 * always allowed. Browser-origin requests must match one of the values below.
 *   FRONTEND_URL — the deployed frontend, comma-separated for previews.
 *   localhost:5173 / 4173 — Vite dev / preview servers.
 */
const corsAllowlist = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:4173",
    ...(process.env.FRONTEND_URL || "").split(",").map((s) => s.trim()).filter(Boolean),
];
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (corsAllowlist.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not in allowlist`));
    },
    credentials: true,
}));
console.log(`[CORS] Allowlist: ${corsAllowlist.join(", ") || "(empty)"}`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// Public
app.get("/health", (req, res) => res.json({ ok: true }));
app.use("/auth", authLimiter, authRoutes);

// Protected — JWT required for all game routes
app.use("/gyms", authMiddleware, gymRoutes);
app.use("/scouting", authMiddleware, scoutingRoutes);
app.use("/fighters", authMiddleware, fighterRoutes);
app.use("/camps", authMiddleware, campRoutes);

// ── 404 ──
app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
});

// ── Global error handler (MUST be last; 4 args) ──
// Never leak internals: log full detail server-side, return a safe message.
// Client-fixable errors opt in via err.statusCode / err.expose.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const isBadJson = err.type === "entity.parse.failed";
    const isCors = typeof err.message === "string" && err.message.startsWith("CORS:");
    const status = isBadJson ? 400 : isCors ? 403 : (err.statusCode || err.status || 500);

    if (status >= 500) {
        console.error("[error]", req.method, req.originalUrl, "-", err.stack || err.message);
    } else {
        console.warn("[error]", req.method, req.originalUrl, "-", err.message);
    }

    let message = "Internal server error";
    if (isBadJson) message = "Invalid JSON in request body.";
    else if (isCors) message = "Origin not allowed.";
    else if (status < 500 && (err.expose || err.validation)) message = err.message;

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

mongoose.connect(config.database.url, config.database.options)
    .then(async () => {
        console.log("Connected to MongoDB");
        try {
            await scheduler.startSchedulers();
        } catch (err) {
            // Redis being down shouldn't stop local dev of the HTTP API — jobs
            // simply won't run until it's back. Deployed hosts always have Redis.
            console.error("[scheduler] Failed to start (continuing without jobs):", err.message);
        }
        app.listen(config.port, () => {
            console.log(`Gym Wars API running on port ${config.port}`);
        });
    })
    .catch((err) => {
        console.error("Database connection failed:", err);
        process.exit(1);
    });
