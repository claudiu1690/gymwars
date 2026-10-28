// Public production entry. Uses an external database; never starts embedded
// Mongo, seeds preview accounts, advances time or connects a payment provider.
require("dotenv").config();
const {
  productionConfig,
  applyProductionEnvironment,
} = require("./lib/productionConfig");

async function startProduction({ siteDirectory, port } = {}) {
  process.env.NODE_ENV ||= "production";
  const config = productionConfig(process.env, { siteDirectory });
  applyProductionEnvironment(config);
  const { app, initializeDatabase } = require("./app");
  const mongoose = require("mongoose");
  const { productionWeb } = require("./lib/productionWeb");
  await initializeDatabase({ legacy: false });
  const lifecycle = { draining: false };
  const web = productionWeb({
    api: app,
    siteDirectory: config.siteDirectory,
    lifecycle,
    databaseReady: () => mongoose.connection.readyState === 1,
  });
  const server = await new Promise((resolve, reject) => {
    const http = web.listen(port ?? config.port, "0.0.0.0", () =>
      resolve(http),
    );
    http.once("error", reject);
  });
  let stopping;
  const stop = () =>
    (stopping ||= (async () => {
      lifecycle.draining = true;
      const timeout = setTimeout(() => server.closeAllConnections(), 10000);
      timeout.unref();
      try {
        await new Promise((resolve, reject) =>
          server.close((err) => (err ? reject(err) : resolve())),
        );
        await mongoose.disconnect();
      } finally {
        clearTimeout(timeout);
      }
    })());
  console.log(
    JSON.stringify({
      event: "production-ready",
      origin: config.origin,
      port: server.address().port,
      payments: "disconnected",
    }),
  );
  return { server, stop, lifecycle };
}

if (require.main === module)
  startProduction()
    .then(({ stop }) => {
      for (const signal of ["SIGTERM", "SIGINT"])
        process.once(signal, () =>
          stop()
            .then(() => process.exit(0))
            .catch(() => process.exit(1)),
        );
    })
    .catch((err) => {
      console.error(
        JSON.stringify({
          event: "production-start-failed",
          type: err.name || "Error",
          message:
            err.code === "production_configuration"
              ? err.message
              : "Check database connectivity and server configuration.",
        }),
      );
      process.exit(1);
    });
module.exports = { startProduction };
