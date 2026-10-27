const fs = require("node:fs");
const path = require("node:path");
const sharp = require(process.env.SHARP_MODULE || "C:/Users/claud/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");

async function main() {
  const root = path.resolve(__dirname, "..");
  const source = path.resolve(root, process.argv[2]);
  const provenance = JSON.parse(fs.readFileSync(path.join(source, "provenance.json"), "utf8"));
  const target = path.join(root, "frontend/public/art/fighters");
  fs.mkdirSync(target, { recursive: true });
  const layers = [], metrics = [];
  for (const [i, asset] of provenance.assets.entries()) {
    if (!/^[a-z0-9-]+$/.test(asset.key) || !/^[a-z0-9-]+\.webp$/.test(asset.filename))
      throw new Error("Portrait names must be plain asset filenames.");
    const sourceFile = asset.sourceFile || `${asset.key}.png`;
    if (!/^[a-z0-9-]+\.png$/.test(sourceFile))
      throw new Error("Portrait sources must be plain PNG filenames.");
    const input = path.join(source, sourceFile);
    const output = path.join(target, asset.filename);
    if (!(await sharp(input).metadata()).hasAlpha) throw new Error(`Missing transparency: ${asset.key}`);
    await sharp(input).resize(600, 832, {
      fit: "contain", position: "top", background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(output);
    const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    for (let p = 3; p < data.length; p += info.channels) if (data[p] < 5) transparent++;
    const transparentFraction = transparent / (info.width * info.height);
    if (transparentFraction < 0.3) throw new Error(`Background is not sufficiently transparent: ${asset.key}`);
    metrics.push({ key: asset.key, filename: asset.filename, width: info.width, height: info.height,
      bytes: fs.statSync(output).size, transparentFraction });
    layers.push({ input: await sharp(output).resize(300, 416).png().toBuffer(), left: i * 300, top: 0 });
  }
  await sharp({ create: { width: layers.length * 300, height: 416, channels: 4, background: "#f3ebdc" } })
    .composite(layers).png().toFile(path.join(source, `${provenance.weightClass}-lineup.png`));
  fs.writeFileSync(path.join(source, "export-checks.json"), JSON.stringify(metrics, null, 2) + "\n");
  console.log(metrics);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
