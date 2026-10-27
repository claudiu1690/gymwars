// Launch only a newly named isolated audit host; never restore another save.
const fs = require("node:fs"), path = require("node:path"), { spawn } = require("node:child_process");
const { folder, runId, port } = require("./playthroughConfig.cjs");
if (fs.existsSync(path.join(folder, "host.json")) || fs.existsSync(path.join(folder, "runtime.json"))) throw new Error("This audit already has host state; inspect/resume it instead of starting another host.");
fs.mkdirSync(folder, { recursive: true });
const log = fs.openSync(path.join(folder, "server.log"), "a");
const child = spawn(process.execPath, [path.join(__dirname, "playthroughServer.cjs")], { cwd: path.resolve(__dirname, ".."), windowsHide: true, detached: true, stdio: ["ignore", log, log], env: { ...process.env, GYMWARS_PLAYTHROUGH_FRESH: "1" } });
child.unref();
fs.writeFileSync(path.join(folder, "launcher.json"), JSON.stringify({ runId, pid: child.pid, port, userAccountConnected: false }, null, 2), { flag: "wx" });
console.log(JSON.stringify({ runId, port, pid: child.pid }));
