// Normalize approved/generated Higgsfield PNGs into responsive, local assets.
// Uses the bundled runtime's sharp when SHARP_MODULE is supplied.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require(process.env.SHARP_MODULE || "sharp");
async function run() {
  const root = path.resolve(__dirname, "../frontend/public/art");
  const source = path.resolve(__dirname, "../output/art-source");
  const prefix = process.argv[2] || "";
  for (const name of fs
    .readdirSync(source)
    .filter(
      (n) =>
        /^(cartoon-)?(fighter|gym)-.*\.png$/.test(n) && n.startsWith(prefix),
    )) {
    const width = name.includes("fighter") ? 600 : 1400;
    await sharp(path.join(source, name))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(path.join(root, name.replace(".png", ".webp")));
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
