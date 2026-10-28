const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--out-dir"))
  throw Error("Usage: npm run build:production -- --out-dir <directory>");
const out = args.length
  ? path.resolve(root, args[1])
  : path.join(root, "frontend/dist");
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "frontend/node_modules/vite/bin/vite.js"),
    "build",
    "--outDir",
    out,
    "--emptyOutDir",
  ],
  {
    cwd: path.join(root, "frontend"),
    windowsHide: true,
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_API_URL: "/api",
      VITE_ENABLE_REALTIME_COMPARISON: "false",
    },
  },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
