// Shares only the running web preview, on one LAN interface/subnet.
// The existing preview, its database, account saves and API bindings are unchanged.
const http = require("node:http"),
  net = require("node:net");
const { parseArgs } = require("node:util");

function createLanPreview({
  address,
  port = 5200,
  target = "http://127.0.0.1:5199",
  subnet,
}) {
  const upstream = new URL(target);
  const privateAddress = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
    address,
  );
  if (!net.isIPv4(address) || !privateAddress)
    throw new Error("Choose the PC’s private Wi-Fi IPv4 address.");
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("Invalid preview port.");
  if (
    upstream.protocol !== "http:" ||
    upstream.hostname !== "127.0.0.1" ||
    upstream.pathname !== "/" ||
    upstream.search ||
    upstream.hash ||
    upstream.username ||
    upstream.password
  )
    throw new Error(
      "The target must be an existing loopback HTTP web preview.",
    );
  const [network, prefix] = (subnet || "").split("/");
  if (
    !net.isIPv4(network) ||
    !/^\d+$/.test(prefix || "") ||
    +prefix < 8 ||
    +prefix > 32
  )
    throw new Error("Supply the Wi-Fi subnet as IPv4/prefix.");
  const allowed = new net.BlockList();
  allowed.addSubnet(network, Number(prefix), "ipv4");
  if (!allowed.check(address, "ipv4"))
    throw new Error("The Wi-Fi address is outside this subnet.");
  const server = http.createServer((req, res) => {
    const host = `${address}:${server.address().port}`;
    const origin = `http://${host}`;
    const client = req.socket.remoteAddress;
    if (
      !net.isIPv4(client) ||
      !allowed.check(client, "ipv4") ||
      req.headers.host !== host ||
      (req.headers.origin && req.headers.origin !== origin)
    ) {
      res.writeHead(403, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          message: "Use this preview’s Wi-Fi URL from the same local network.",
        }),
      );
    }
    if (!req.url.startsWith("/") || req.url.startsWith("//")) {
      res.writeHead(400);
      return res.end();
    }
    const headers = {
      ...req.headers,
      host: upstream.host,
      "x-forwarded-for": client,
      "x-forwarded-host": host,
      "x-forwarded-proto": "http",
    };
    // Validate the phone's origin above, then pass the preview's existing allowed origin.
    // This avoids restarting the save-owning server or broadening its CORS policy.
    if (headers.origin) headers.origin = upstream.origin;
    const proxy = http.request(
      {
        hostname: upstream.hostname,
        port: upstream.port || 80,
        method: req.method,
        path: req.url,
        headers,
      },
      (response) => {
        const responseHeaders = { ...response.headers };
        if (responseHeaders["access-control-allow-origin"] === upstream.origin)
          responseHeaders["access-control-allow-origin"] = origin;
        if (responseHeaders.location?.startsWith(upstream.origin + "/"))
          responseHeaders.location =
            origin + responseHeaders.location.slice(upstream.origin.length);
        res.writeHead(response.statusCode, responseHeaders);
        response.pipe(res);
      },
    );
    proxy.setTimeout(30000, () => proxy.destroy(new Error("Preview timeout")));
    proxy.on("error", () => {
      if (res.headersSent) return res.destroy();
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message:
            "The local preview is unavailable. Start it on the PC first.",
        }),
      );
    });
    req.on("aborted", () => proxy.destroy());
    res.on("close", () => {
      if (!res.writableEnded) proxy.destroy();
    });
    req.pipe(proxy);
  });
  return server;
}

if (require.main === module) {
  try {
    const { values } = parseArgs({
      options: {
        address: { type: "string" },
        port: { type: "string", default: "5200" },
        target: { type: "string", default: "http://127.0.0.1:5199" },
        subnet: { type: "string" },
      },
    });
    const server = createLanPreview({ ...values, port: Number(values.port) });
    server.on("error", (error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
    server.listen(Number(values.port), values.address, () =>
      console.log(
        JSON.stringify({
          event: "wifi-preview-ready",
          url: `http://${values.address}:${server.address().port}`,
          target: values.target,
          subnet: values.subnet,
        }),
      ),
    );
    const stop = () => server.close(() => process.exit(0));
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { createLanPreview };
