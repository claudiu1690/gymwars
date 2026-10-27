// Download this room set's generated originals and make small local WebP assets.
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require(process.env.SHARP_MODULE || "sharp");

async function main() {
  const source = path.resolve(__dirname, "../output/art-source/rooms");
  const target = path.resolve(__dirname, "../frontend/public/art/rooms");
  const record = JSON.parse(
    await fs.readFile(path.join(source, "generation.json"), "utf8"),
  );
  await fs.mkdir(target, { recursive: true });
  for (const asset of record.assets) {
    const original = path.join(source, `${asset.key}.png`);
    try {
      await fs.access(original);
    } catch {
      const response = await fetch(asset.url);
      if (!response.ok)
        throw new Error(`${asset.key}: HTTP ${response.status}`);
      await fs.writeFile(original, Buffer.from(await response.arrayBuffer()));
    }
    const metadata = await sharp(original).metadata();
    if (!metadata.width || !metadata.height)
      throw new Error(`Invalid image: ${asset.key}`);
    await sharp(original)
      .resize({ width: 1100, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(target, `${asset.key}.webp`));
    await sharp(original)
      .resize({ width: 440, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(target, `${asset.key}-thumb.webp`));
    console.log(
      `${asset.key}: ${metadata.width}x${metadata.height}, hero + thumbnail ready`,
    );
  }
  const manifestPath = path.resolve(target, "../SOURCES.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  manifest.roomAssets = {
    provider: record.provider,
    model: record.model,
    generatedAt: record.generatedAt,
    referenceJob: record.referenceJob,
    promptRecord: "output/art-source/rooms/generation.json",
    assets: record.assets.map(({ key, title, job }) => ({
      file: `rooms/${key}.webp`,
      thumbnail: `rooms/${key}-thumb.webp`,
      role: `${title} room illustration`,
      job,
    })),
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
