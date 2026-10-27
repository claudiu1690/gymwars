// Authored, fixed clubs. Power never depends on the visiting manager. Each
// named club keeps its original sheet, tactics and identity across accounts.
const packs = [
  { power: 30, label: "Local", clubs: ["Oak Street Boxing", "Riverside Wrestling", "Moss Hill Jiu-Jitsu", "Elm Park Athletics", "Harbor Lights Combat", "Union Yard MMA"] },
  { power: 40, label: "City", clubs: ["Maple Corner", "Bridgeworks Wrestling", "Southbank Submissions", "Foundry Endurance", "Beacon Fight Club", "Cedar House Combat"] },
  { power: 50, label: "State", clubs: ["Copperline Boxing", "Granite Mat Club", "Bluewater Jiu-Jitsu", "Longview Athletics", "Canyon Fight Team", "North Pier Combat"] },
  { power: 60, label: "National", clubs: ["Westgate Combinations", "Ridgeway Wrestling", "Deepwell Grappling", "Pinecrest Athletics", "Firelight Combat", "Slate House MMA"] },
  { power: 70, label: "Champions", clubs: ["Silver Harbor Boxing", "Keystone Wrestling", "Blackwater Jiu-Jitsu", "Highland Endurance", "Orchard Fight Team", "Stonebridge Combat"] },
  { power: 80, label: "World", clubs: ["Summit Hands", "Anchor Point Wrestling", "Tidepool Grappling", "Horizon Athletics", "Crownfield Combat", "Meridian MMA"] },
  { power: 90, label: "Masters", clubs: ["Aurora Boxing Club", "Atlas Mat Team", "Obsidian Grappling", "Evergreen Athletics", "Ember Hall Combat", "Polaris Fight Club"] },
  { power: 98, label: "Legends", clubs: ["Golden Hour Boxing", "Iron Summit Wrestling", "Ocean Gate Grappling", "Last Mile Athletics", "Phoenix Corner", "Northstar Combat"] },
];
const archetypes = [
  { key: "combinations", styles: ["boxing", "muay-thai", "boxing", "muay-thai"], bias: [8, -5, -5, 2], signatureId: "clean-combinations",
    plan: { approach: "strike", pace: "measured", finish: "hunt-finish", conserveBelow: 30 }, description: "Measured combination strikers. Their hands are the threat; ground exchanges bypass their signature." },
  { key: "chain", styles: ["wrestling", "judo", "wrestling", "judo"], bias: [-6, 8, 1, -3], signatureId: "chain-wrestling",
    plan: { approach: "grapple", pace: "high", finish: "hunt-finish", conserveBelow: 20 }, description: "High-pressure chain wrestlers. Stuffed shots and their high pace can make the gas tank costly." },
  { key: "escapes", styles: ["bjj", "sambo", "bjj", "sambo"], bias: [-7, 1, 8, -2], signatureId: "escape-artist",
    plan: { approach: "grapple", pace: "cautious", finish: "play-safe", conserveBelow: 40 }, description: "Patient ground specialists with composed submission defense. Standing damage is their weaker exchange." },
  { key: "distance", styles: ["boxing", "wrestling", "bjj", "muay-thai"], bias: [-2, -2, -2, 6], signatureId: "pace-keeper",
    plan: { approach: "balanced", pace: "measured", finish: "play-safe", conserveBelow: 50 }, description: "A durable, measured team built for the final round. Pace Keeper saves ordinary gas once per round, not finish costs." },
  { key: "pressure", styles: ["muay-thai", "boxing", "muay-thai", "boxing"], bias: [9, -3, -4, -2], signatureId: null,
    plan: { approach: "strike", pace: "high", finish: "hunt-finish", conserveBelow: 0 }, description: "Fast, aggressive strikers who keep hunting. Weather their opening or bring the fight to the mat." },
  { key: "counters", styles: ["boxing", "muay-thai", "boxing", "muay-thai"], bias: [2, 2, -2, -2], signatureId: "escape-artist",
    plan: { approach: "strike", pace: "measured", finish: "play-safe", conserveBelow: 40 }, description: "Composed counter strikers with submission defense. They trade finishing commitment for a safer gas plan." },
];
const firstNames = ["Maya", "Jules", "Rafa", "Sora", "Leon", "Amara", "Theo", "Idris", "Lena", "Kai", "Morgan", "Dara", "Eli", "Nico", "Sam", "Alex"];
const lastNames = ["Hart", "Reed", "Cole", "Vale", "Moss", "Silva", "Ward", "Kim", "Fox", "Stone", "Lake", "Ortiz", "Cruz", "Mercer", "Becker", "Wolfe"];
const authoredClubDefinitions = packs.flatMap((pack, p) => pack.clubs.map((name, a) => ({
  key: `league-${pack.power}-${archetypes[a].key}`, name, difficulty: pack.label,
  bracket: pack.power, description: archetypes[a].description, styles: archetypes[a].styles,
  names: Array.from({ length: 4 }, (_, i) => `${firstNames[(p * 3 + a + i * 2) % firstNames.length]} ${lastNames[(p * 5 + a * 2 + i * 3) % lastNames.length]}`),
  stats: Object.fromEntries(["striking", "grappling", "submissions", "conditioning"].map((key, i) => [key, Math.max(1, Math.min(99, pack.power + archetypes[a].bias[i]))])),
  gameplan: { ...archetypes[a].plan }, signatureId: archetypes[a].signatureId, portrait: (p + a) % 6,
})));
module.exports = { authoredClubDefinitions };
