// Native asset comparison, not a browser screenshot. Uses production cutouts
// and the CSS rarity palette, with no decorative border or portrait mat.
const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require(process.env.SHARP_MODULE || "sharp");
async function main() {
  const root = path.resolve(__dirname, "..");
  const tiers = ["journeyman", "prospect", "contender", "elite", "legend"];
  const css = await fs.readFile(path.join(root, "frontend/src/components/fighter-rarity-backings.css"), "utf8");
  const layers = [];
  for (const [index, tier] of tiers.entries()) {
    const x = 25 + index * 290;
    const rule = css.match(new RegExp('\\[data-rarity="' + tier + '"\\] \\{[^}]+\\}'))?.[0];
    const colors = rule?.match(/#[a-f0-9]{6}/gi);
    if (colors?.length !== 2) throw new Error("Missing CSS rarity palette: " + tier);
    const background = `<svg width="270" height="362"><defs><linearGradient id="g" x1="0.33" y1="0" x2="0.67" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="270" height="362" fill="url(#g)"/></svg>`;
    const portrait = await sharp(path.join(root, "frontend/public/art", `fighter-cutout-${index % 4}.webp`)).resize(270, 362, { fit: "contain", background: {r:0,g:0,b:0,alpha:0} }).png().toBuffer();
    layers.push({ input: await sharp(Buffer.from(background)).composite([{input:portrait}]).png().toBuffer(), left: x, top: 75 });
  }
  const labels = `<svg width="1500" height="510"><style>text{font-family:Arial,sans-serif;font-weight:bold;fill:#213645}</style><text x="25" y="40" font-size="25">GYM WARS · FIGHTER RARITY BACKGROUNDS</text>${tiers.map((tier,i)=>`<text x="${25+i*290}" y="471" font-size="19">${tier.toUpperCase()}</text>`).join("")}<text x="25" y="503" font-size="14">Transparent fighters over the rarity color · no decorative borders</text></svg>`;
  layers.push({ input: Buffer.from(labels), left: 0, top: 0 });
  const out = path.join(root, "output/rarity-background-fix/rarity-backgrounds.png");
  await fs.mkdir(path.dirname(out), { recursive: true });
  await sharp({ create: { width: 1500, height: 520, channels: 4, background: "#f7efdd" } }).composite(layers).png().toFile(out);
  console.log(out);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
