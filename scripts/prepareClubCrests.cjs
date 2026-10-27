const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const sharp = require(
  process.env.SHARP_MODULE ||
    "C:/Users/claud/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp",
);
const root = path.resolve(__dirname, "..");
const directory = path.join(root, "output/art-source/club-crests-2026-10-15");
const manifestPath = path.join(directory, "generation.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const targetDirectory = path.join(root, "frontend/public/art/club-crests");
const sha256 = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

async function silhouettes(source) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const visited = new Uint8Array(info.width * info.height);
  const queue = new Int32Array(visited.length),
    components = [];
  // Generated layout can drift slightly across ideal grid lines. Extract whole
  // connected alpha silhouettes rather than cutting a neighboring crest.
  for (let pixel = 0; pixel < visited.length; pixel++) {
    if (visited[pixel] || data[pixel * 4 + 3] <= 32) continue;
    let read = 0,
      write = 1,
      minX = info.width,
      minY = info.height,
      maxX = -1,
      maxY = -1;
    queue[0] = pixel;
    visited[pixel] = 1;
    while (read < write) {
      const current = queue[read++],
        x = current % info.width,
        y = Math.floor(current / info.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      for (const neighbor of [
        x ? current - 1 : -1,
        x < info.width - 1 ? current + 1 : -1,
        y ? current - info.width : -1,
        y < info.height - 1 ? current + info.width : -1,
      ]) {
        if (neighbor < 0 || visited[neighbor] || data[neighbor * 4 + 3] <= 32)
          continue;
        visited[neighbor] = 1;
        queue[write++] = neighbor;
      }
    }
    if (write > 5000)
      components.push({ minX, minY, maxX, maxY, pixels: write });
  }
  if (components.length !== 8)
    throw new Error(
      `Expected eight separate crests, found ${components.length}`,
    );
  components.sort((a, b) => a.minY + a.maxY - (b.minY + b.maxY));
  return [components.slice(0, 4), components.slice(4)].flatMap((row) =>
    row.sort((a, b) => a.minX - b.minX),
  );
}

(async () => {
  fs.mkdirSync(targetDirectory, { recursive: true });
  const assets = [],
    layers = [];
  for (const sheet of manifest.sheets) {
    if (!sheet.url.startsWith("https://d8j0ntlcm91z4.cloudfront.net/"))
      throw new Error("Unexpected source host");
    const source = path.join(directory, `sheet-${sheet.index}.png`);
    if (!fs.existsSync(source)) {
      const response = await fetch(sheet.url);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      fs.writeFileSync(source, Buffer.from(await response.arrayBuffer()), {
        flag: "wx",
      });
    }
    const metadata = await sharp(source).metadata();
    if (!metadata.hasAlpha)
      throw new Error("Generated sheet has no transparency");
    sheet.sourceSize = { width: metadata.width, height: metadata.height };
    sheet.sha256 = sha256(fs.readFileSync(source));
    const bounds = await silhouettes(source);
    for (const [position, asset] of sheet.assets.entries()) {
      if (
        !/^[a-z-]+$/.test(asset.id) ||
        asset.runtime !== `frontend/public/art/club-crests/${asset.id}.webp`
      )
        throw new Error("Unexpected asset target");
      const { minX, minY, maxX, maxY } = bounds[position];
      if (
        minX < 8 ||
        minY < 8 ||
        maxX >= metadata.width - 8 ||
        maxY >= metadata.height - 8
      )
        throw new Error(`Clipped crest: ${asset.id}`);
      const crop = {
        left: minX - 8,
        top: minY - 8,
        width: maxX - minX + 17,
        height: maxY - minY + 17,
      };
      const target = path.join(root, asset.runtime);
      await sharp(source)
        .extract(crop)
        .resize(312, 360, { fit: "contain", background: "#00000000" })
        .extend({
          top: 4,
          bottom: 4,
          left: 4,
          right: 4,
          background: "#00000000",
        })
        .webp({ quality: 85, alphaQuality: 100, effort: 5 })
        .toFile(target);
      const buffer = fs.readFileSync(target);
      Object.assign(asset, {
        sheet: sheet.index,
        crop,
        width: 320,
        height: 368,
        bytes: buffer.length,
        sha256: sha256(buffer),
      });
      const index = assets.length;
      layers.push({
        input: await sharp(target).resize(144, 166).toBuffer(),
        left: (index % 8) * 180 + 18,
        top: Math.floor(index / 8) * 220 + 8,
      });
      layers.push({
        input: Buffer.from(
          `<svg width="180" height="40"><text x="90" y="18" text-anchor="middle" fill="#fff3db" font-family="sans-serif" font-size="11">${asset.name.replaceAll("&", "&amp;")}</text></svg>`,
        ),
        left: (index % 8) * 180,
        top: Math.floor(index / 8) * 220 + 180,
      });
      assets.push(asset);
    }
    console.log(`Prepared sheet ${sheet.index + 1}/${manifest.sheets.length}`);
  }
  const looks = require("../consts/achievements").LOOKS;
  if (
    assets.length !== looks.length ||
    looks.some((look) => !assets.some((asset) => asset.id === look.id))
  )
    throw new Error("Incomplete reward coverage");
  if (new Set(assets.map((a) => a.sha256)).size !== assets.length)
    throw new Error("Duplicate crest exports");
  manifest.runtimeBytes = assets.reduce((n, asset) => n + asset.bytes, 0);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(
    path.join(targetDirectory, "SOURCES.json"),
    JSON.stringify(
      {
        provider: manifest.provider,
        model: manifest.model,
        generatedAt: manifest.generatedAt,
        assets: assets.map(({ id, sheet, sha256, bytes }) => ({
          id,
          job: manifest.sheets[sheet].job,
          sha256,
          bytes,
        })),
      },
      null,
      2,
    ),
  );
  await sharp({
    create: { width: 1440, height: 880, channels: 4, background: "#203543" },
  })
    .composite(layers)
    .png()
    .toFile(path.join(directory, "contact-sheet.png"));
  console.log(
    JSON.stringify({
      assets: assets.length,
      distinctImages: new Set(assets.map((a) => a.sha256)).size,
      runtimeBytes: manifest.runtimeBytes,
    }),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
