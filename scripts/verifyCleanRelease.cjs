// Verify lockfile installs and a production build in a fresh, isolated folder.
// Never copies .env, saved databases or private preview keys.
const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const directory = path.join(
  root,
  "output/release-candidate-2026-10-16/clean-install",
);
const refresh = process.argv.includes("--refresh-source");
if (fs.existsSync(directory) && !refresh)
  throw new Error(
    "Preserve the previous clean-install evidence; use --refresh-source only with the same verified lockfiles.",
  );
if (refresh)
  for (const file of ["package-lock.json", "frontend/package-lock.json"]) {
    if (
      !fs
        .readFileSync(path.join(root, file))
        .equals(fs.readFileSync(path.join(directory, file)))
    )
      throw new Error("Lockfile changed after the clean install");
  }
fs.mkdirSync(path.join(directory, "frontend"), { recursive: true });
for (const file of [
  "package.json",
  "package-lock.json",
  "frontend/package.json",
  "frontend/package-lock.json",
  "frontend/index.html",
  "frontend/vite.config.js",
])
  fs.copyFileSync(path.join(root, file), path.join(directory, file));
for (const folder of ["consts", "frontend/src", "frontend/public"])
  fs.cpSync(path.join(root, folder), path.join(directory, folder), {
    recursive: true,
  });
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
function run(args) {
  const result = spawnSync(npm, args, {
    cwd: directory,
    shell: process.platform === "win32",
    windowsHide: true,
    stdio: "inherit",
    env: { ...process.env, VITE_API_URL: "/api" },
  });
  if (result.status !== 0)
    throw new Error(`Clean release command failed: npm ${args.join(" ")}`);
}
if (!refresh) {
  run(["ci"]);
  run(["ci", "--prefix", "frontend"]);
}
run(["audit", "--audit-level=low"]);
run(["audit", "--prefix", "frontend", "--audit-level=low"]);
run(["run", "build", "--prefix", "frontend"]);
const receipt = {
  version: require("../package.json").version,
  cleanBackendInstall: true,
  cleanFrontendInstall: true,
  auditsPassed: true,
  productionBuild: true,
  copiedSecrets: false,
  lockfiles: Object.fromEntries(
    ["package-lock.json", "frontend/package-lock.json"].map((file) => [
      file,
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(directory, file)))
        .digest("hex"),
    ]),
  ),
};
fs.writeFileSync(
  path.join(directory, "receipt.json"),
  JSON.stringify(receipt, null, 2),
);
console.log(JSON.stringify(receipt, null, 2));
