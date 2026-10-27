const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const sharp = require(
  process.env.SHARP_MODULE ||
    "C:/Users/claud/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp",
);
const root = path.resolve(__dirname, "..");
const directory = path.join(
  root,
  "output/art-source/style-signatures-2026-10-15",
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(directory, "generation.json"), "utf8"),
);
(async () => {
  const layers = [];
  for (const [i, asset] of manifest.assets.entries()) {
    if (
      !/^[a-z-]+$/.test(asset.id) ||
      !asset.url?.startsWith("https://d8j0ntlcm91z4.cloudfront.net/")
    )
      throw new Error("Unexpected generated asset");
    const original = path.join(directory, asset.id + ".png"),
      target = path.join(root, asset.runtime);
    if (!fs.existsSync(original)) {
      const response = await fetch(asset.url);
      if (!response.ok)
        throw new Error("Art download failed: " + response.status);
      fs.writeFileSync(original, Buffer.from(await response.arrayBuffer()), {
        flag: "wx",
      });
    }
    await sharp(original)
      .resize(384, 384, { fit: "contain" })
      .webp({ quality: 87, effort: 6 })
      .toFile(target);
    const metadata = await sharp(original).metadata();
    asset.sourceSize = { width: metadata.width, height: metadata.height };
    asset.runtimeBytes = fs.statSync(target).size;
    asset.sha256 = crypto
      .createHash("sha256")
      .update(fs.readFileSync(target))
      .digest("hex");
    const left = (i % 3) * 280,
      top = Math.floor(i / 3) * 300;
    layers.push({
      input: await sharp(target).resize(256, 256).toBuffer(),
      left: left + 12,
      top,
    });
    const label = asset.id.replaceAll("-", " ");
    layers.push({
      input: Buffer.from(
        `<svg width="280" height="40"><text x="140" y="25" text-anchor="middle" fill="#fff8e9" font-size="17" font-family="sans-serif">${label}</text></svg>`,
      ),
      left,
      top: top + 256,
    });
  }
  fs.writeFileSync(
    path.join(directory, "generation.json"),
    JSON.stringify(manifest, null, 2),
  );
  await sharp({
    create: { width: 840, height: 900, channels: 4, background: "#12283e" },
  })
    .composite(layers)
    .png()
    .toFile(path.join(directory, "contact-sheet.png"));
  console.log(
    JSON.stringify({
      exported: manifest.assets.length,
      runtimeBytes: manifest.assets.reduce((n, a) => n + a.runtimeBytes, 0),
      distinctHashes: new Set(manifest.assets.map((a) => a.sha256)).size,
    }),
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
