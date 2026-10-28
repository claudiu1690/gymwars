const path = require("node:path");
const fs = require("node:fs");

const emailAddress = (value) =>
  /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value || "");

function productionConfig(
  env,
  {
    siteDirectory = path.resolve(__dirname, "../frontend/dist"),
    checkBuild = true,
  } = {},
) {
  const problems = [];
  const requireValue = (name) => {
    if (!env[name]?.trim()) problems.push(`${name} is required`);
    return env[name]?.trim() || "";
  };
  let origin;
  const publicUrl = requireValue("PUBLIC_URL");
  try {
    const url = new URL(publicUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      /^(localhost|127\.|\[?::1)/i.test(url.hostname)
    )
      throw Error();
    origin = url.origin;
  } catch {
    problems.push(
      "PUBLIC_URL must be an HTTPS origin, without a path or credentials",
    );
  }
  if (env.NODE_ENV !== "production")
    problems.push("NODE_ENV must be production");
  if (env.LOCAL_MODE && env.LOCAL_MODE !== "false")
    problems.push("LOCAL_MODE must be false or unset");
  const jwt = requireValue("JWT_SECRET");
  if (
    jwt.length < 32 ||
    /^(change_me|replace|your_|gymwars_dev_secret)/i.test(jwt)
  )
    problems.push(
      "JWT_SECRET must be a private stable value of at least 32 characters",
    );
  const mongoUri = requireValue("MONGODB_URI");
  if (
    !/^mongodb(?:\+srv)?:\/\/[^\s/?#]+:[^\s/?#]+@[^\s/?#]+\/[^\s/?#]+(?:\?[^#\s]*)?$/.test(
      mongoUri,
    ) ||
    /[?&](tls|ssl)=false/i.test(mongoUri)
  )
    problems.push(
      "MONGODB_URI must name an authenticated database and must not disable TLS",
    );
  requireValue("RESEND_API_KEY");
  const sender = requireValue("EMAIL_FROM");
  const senderAddress = sender.match(/<([^<>]+)>$/)?.[1] || sender;
  if (
    !emailAddress(senderAddress) ||
    /@(?:example\.com|yourdomain\.com)$/i.test(senderAddress)
  )
    problems.push("EMAIL_FROM must be a real verified sender address");
  const supportEmail = requireValue("SUPPORT_EMAIL");
  if (
    !emailAddress(supportEmail) ||
    /@(?:example\.com|yourdomain\.com)$/i.test(supportEmail)
  )
    problems.push("SUPPORT_EMAIL must be a real support address");
  const serviceDetails = requireValue("PUBLIC_SERVICE_DETAILS");
  if (serviceDetails.length > 4000)
    problems.push(
      "PUBLIC_SERVICE_DETAILS must be no longer than 4000 characters",
    );
  if (env.SHOP_PREVIEW_ENABLED && env.SHOP_PREVIEW_ENABLED !== "false")
    problems.push("SHOP_PREVIEW_ENABLED must be false");
  if (env.DISABLE_SCHEDULER && env.DISABLE_SCHEDULER !== "true")
    problems.push(
      "DISABLE_SCHEDULER must be true for the manual-week production game",
    );
  if (env.TIME_WARP) problems.push("TIME_WARP must be unset");
  const port = Number(env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    problems.push("PORT must be an integer between 1 and 65535");
  if (checkBuild && !fs.existsSync(path.join(siteDirectory, "index.html")))
    problems.push("Frontend build missing; run npm run build:production");
  if (problems.length)
    throw Object.assign(
      new Error("Production configuration errors:\n- " + problems.join("\n- ")),
      { code: "production_configuration" },
    );
  return {
    origin,
    port,
    siteDirectory: path.resolve(siteDirectory),
    supportEmail,
  };
}

function applyProductionEnvironment(config, env = process.env) {
  Object.assign(env, {
    NODE_ENV: "production",
    LOCAL_MODE: "false",
    DISABLE_SCHEDULER: "true",
    SHOP_PREVIEW_ENABLED: "false",
    APP_URL: config.origin,
    FRONTEND_URL: config.origin,
    BACKEND_URL: config.origin + "/api",
  });
}
module.exports = { productionConfig, applyProductionEnvironment };
