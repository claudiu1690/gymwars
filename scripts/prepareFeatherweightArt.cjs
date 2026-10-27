const fs = require("node:fs");
const path = require("node:path");
const sharp = require(process.env.SHARP_MODULE || "C:/Users/claud/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

async function main() {
  const root = path.resolve(__dirname, "..");
  const source = path.join(root, "output/art-source/featherweight-2026-10-12");
  const target = path.join(root, "frontend/public/art/fighters");
  fs.mkdirSync(target, { recursive: true });
  const layers = [];
  const metrics = [];
  const keys = ["shaved", "redcrop", "moustache", "fringe"];
  for (const [i, key] of keys.entries()) {
    const input = path.join(source, `fw-${key}.png`);
    const output = path.join(target, `featherweight-${key}.webp`);
    const metadata = await sharp(input).metadata();
    if (!metadata.hasAlpha) throw new Error(`Missing transparency: ${key}`);
    await sharp(input).resize(600, 832, {
      fit: "contain", position: "top", background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(output);
    const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    for (let p = 3; p < data.length; p += info.channels) if (data[p] < 5) transparent++;
    metrics.push({ key, width: info.width, height: info.height, bytes: fs.statSync(output).size,
      transparentFraction: transparent / (info.width * info.height) });
    layers.push({ input: await sharp(output).resize(300, 416).png().toBuffer(), left: i * 300, top: 0 });
  }
  await sharp({ create: { width: 1200, height: 416, channels: 4, background: "#f3ebdc" } })
    .composite(layers).png().toFile(path.join(source, "featherweight-lineup.png"));
  fs.writeFileSync(path.join(source, "export-checks.json"), JSON.stringify(metrics, null, 2) + "\n");
  console.log(metrics);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
