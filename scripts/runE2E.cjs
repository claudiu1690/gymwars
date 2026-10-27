const { spawnSync } = require("node:child_process"),
  path = require("node:path"),
  fs = require("node:fs");
const root = path.resolve(__dirname, "..");
fs.mkdirSync(path.join(root, "output/e2e"), { recursive: true });
const build = spawnSync(
  process.execPath,
  [
    path.join(root, "frontend/node_modules/vite/bin/vite.js"),
    "build",
    "--outDir",
    "../output/e2e/site",
    "--emptyOutDir",
  ],
  {
    cwd: path.join(root, "frontend"),
    env: { ...process.env, VITE_API_URL: "/api" },
    stdio: "inherit",
    windowsHide: true,
  },
);
if (build.status !== 0) process.exit(build.status || 1);
const result = spawnSync(
  process.execPath,
  [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)],
  { cwd: root, env: process.env, stdio: "inherit", windowsHide: true },
);
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
