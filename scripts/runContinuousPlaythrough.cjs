// Supervises UI-only career segments; no database writes or gameplay API commands.
const fs = require("node:fs"), path = require("node:path"), { spawn } = require("node:child_process"), readline = require("node:readline");
const { folder, runId } = require("./playthroughConfig.cjs");
const child = spawn(process.execPath, [path.join(__dirname, "playthroughClient.cjs")], { cwd: path.resolve(__dirname, ".."), windowsHide: true, stdio: ["pipe", "pipe", "pipe"], env: process.env });
const output = fs.createWriteStream(path.join(folder, "client-output.jsonl"), { flags: "a" });
const errors = fs.createWriteStream(path.join(folder, "client-errors.log"), { flags: "a" });
child.stderr.pipe(errors);
let lastCommand = null, paused = false;
function status(value) { fs.writeFileSync(path.join(folder, "driver-status.json"), JSON.stringify({ runId, pid: process.pid, childPid: child.pid, at: new Date().toISOString(), ...value }, null, 2)); }
function send(command) { lastCommand = command; child.stdin.write(JSON.stringify(command) + "\n"); status({ status: "running", command }); }
readline.createInterface({ input: child.stdout }).on("line", (line) => {
  output.write(line + "\n");
  let value; try { value = JSON.parse(line); } catch { return; }
  if (value.progress) { status({ status: "running", ...value.progress }); return; }
  if (value.error) { paused = true; status({ status: "driver-error", command: lastCommand, error: value.error }); return; }
  if (value.ready) {
    send(fs.existsSync(path.join(folder, "browser.json")) ? { op: "goto", path: "/career" } : { op: "register" });
  } else if (["goto", "register"].includes(lastCommand?.op)) {
    send({ op: "play", weeks: 8 });
  } else if (lastCommand?.op === "play") {
    if (value.goalMet || value.save?.week >= 240) {
      status({ status: value.goalMet ? "completed" : "safety-limit", final: value });
      lastCommand = { op: "close" }; child.stdin.write(JSON.stringify(lastCommand) + "\n");
    } else if (!paused) send({ op: "play", weeks: 8 });
  }
});
// Explicit local controls resume the same save after an inspected driver error.
const controlFile = path.join(folder, "driver-control.json");
const timer = setInterval(() => {
  if (!fs.existsSync(controlFile)) return;
  const c = JSON.parse(fs.readFileSync(controlFile, "utf8")); fs.unlinkSync(controlFile);
  paused = false; send(c);
}, 1000);
child.on("exit", (code) => { clearInterval(timer); output.end(); errors.end(); if (code) status({ status: "client-exited", code }); process.exitCode = code || 0; });
process.on("SIGTERM", () => child.stdin.write('{"op":"close"}\n'));
