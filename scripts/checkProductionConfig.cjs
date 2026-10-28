require("dotenv").config();
process.env.NODE_ENV ||= "production";
try {
  const config = require("../lib/productionConfig").productionConfig(
    process.env,
  );
  console.log(
    JSON.stringify({
      configurationValid: true,
      origin: config.origin,
      port: config.port,
      payments: "disconnected",
      liveServicesVerified: false,
    }),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
