// Vendor the existing Google Fonts assets and their upstream OFL licenses.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const directory = path.resolve(__dirname, "../frontend/public/fonts");
const cssUrl =
  "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
async function get(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) throw new Error("Font source returned " + response.status);
  return Buffer.from(await response.arrayBuffer());
}
(async () => {
  fs.mkdirSync(directory, { recursive: true });
  let css = (await get(cssUrl)).toString("utf8");
  const sources = [];
  for (const url of new Set(
    [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(
      (match) => match[1],
    ),
  )) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "fonts.gstatic.com" ||
      !parsed.pathname.endsWith(".woff2")
    )
      throw new Error("Unexpected font asset");
    const filename = parsed.pathname.split("/").at(-1),
      bytes = await get(url);
    fs.writeFileSync(path.join(directory, filename), bytes);
    css = css.replaceAll(url, "/fonts/" + filename);
    sources.push({
      source: url,
      file: filename,
      bytes: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    });
  }
  if (!sources.length || /https?:/.test(css))
    throw new Error("Unresolved external font source");
  const licenses = [];
  for (const family of ["archivoblack", "inter", "ibmplexmono"]) {
    const url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`;
    const bytes = await get(url),
      file = family + "-OFL.txt";
    fs.writeFileSync(path.join(directory, file), bytes);
    licenses.push({ family, file, source: url });
  }
  fs.writeFileSync(path.join(directory, "gymwars.css"), css);
  fs.writeFileSync(
    path.join(directory, "SOURCES.json"),
    JSON.stringify(
      {
        cssSource: cssUrl,
        note: "Unmodified upstream WOFF2 files. CSS URLs changed to same-origin assets; font-display: swap and Unicode ranges retained.",
        sources,
        licenses,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      files: sources.length,
      bytes: sources.reduce((sum, file) => sum + file.bytes, 0),
      licenses: licenses.length,
    }),
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
