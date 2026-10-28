const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const path = require("node:path");

function productionWeb({
  api,
  siteDirectory,
  databaseReady,
  lifecycle = { draining: false },
}) {
  const web = express();
  web.disable("x-powered-by");
  web.set("trust proxy", 1);
  web.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
    }),
  );
  web.use(compression());
  web.get("/api/health", (_req, res) =>
    res.set("Cache-Control", "no-store").json({ ok: true }),
  );
  web.get("/api/ready", (_req, res) => {
    const ready = !lifecycle.draining && databaseReady();
    res
      .set("Cache-Control", "no-store")
      .status(ready ? 200 : 503)
      .json({
        ok: ready,
        database: ready ? "connected" : "unavailable",
        payments: "disconnected",
      });
  });
  web.use(
    "/api",
    (req, res, next) => {
      res.set("Cache-Control", "no-store");
      // Only the released career/account surface is exposed. No legacy realtime
      // economy, preview fixture controls or alternate write routes are public.
      if (
        /^\/(auth|career|account)(\/|$)/.test(req.path) ||
        ["/gyms/identity", "/site"].includes(req.path)
      )
        return next();
      return res.status(404).json({ message: "Not found" });
    },
    api,
  );
  web.use(
    express.static(siteDirectory, {
      index: false,
      dotfiles: "ignore",
      maxAge: "1h",
      setHeaders(res, file) {
        if (path.basename(file) === "index.html")
          res.set("Cache-Control", "no-store");
        else if (file.startsWith(path.join(siteDirectory, "assets") + path.sep))
          res.set("Cache-Control", "public, max-age=31536000, immutable");
      },
    }),
  );
  web.get("*", (req, res, next) => {
    const clientRoute =
      req.path === "/" ||
      /^\/(login|register|forgot-password|reset-password|support|privacy|terms)\/?$/.test(
        req.path,
      ) ||
      /^\/career(?:\/|$)/.test(req.path);
    if (!clientRoute || path.extname(req.path) || !req.accepts("html"))
      return next();
    res
      .set("Cache-Control", "no-store")
      .sendFile(path.join(siteDirectory, "index.html"));
  });
  web.use((_req, res) => res.status(404).json({ message: "Not found" }));
  web.use((err, _req, res, _next) => {
    console.error(
      JSON.stringify({ event: "web-error", type: err.name || "Error" }),
    );
    if (!res.headersSent)
      res.status(500).json({ message: "Internal server error" });
  });
  return web;
}
module.exports = { productionWeb };
