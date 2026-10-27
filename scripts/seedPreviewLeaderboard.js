// Explicit local playtest tool. Never seed a configured or production database.
const mongoose = require("mongoose");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { createCareer } = require("../engine/careerEngine");
const { hash, divisions, coverageFor } = require("../engine/careerWarEngine");
const { createRng } = require("../utils/rng");
const { materialize } = require("../services/careerAllowances");
const portraits = require("../consts/fighterPortraits.json");
const PREFIX = "preview-leaderboard-v1";
const names = [
  "Redwood Fight Club",
  "Harbor Wolves",
  "Eastside Strikers",
  "Iron Valley MMA",
  "Golden Bear Gym",
  "Summit Combat",
  "Blue Coast Academy",
  "Cedar Street Fighters",
  "Lionheart Athletics",
  "Riverside Grapplers",
  "Falcon Fight House",
  "Southgate Boxing",
  "Granite City MMA",
  "Copperhead Combat",
  "West End Warriors",
  "Silver Fox Academy",
  "Oakwood Fight Team",
  "North Star Athletics",
  "Blackwater Gym",
  "Sunrise Combat Club",
];
const idFor = (kind, index) =>
  new mongoose.Types.ObjectId(hash(`${PREFIX}:${kind}:${index}`).slice(0, 24));
function previewUri(value) {
  const uri = new URL(value);
  assert.equal(uri.protocol, "mongodb:", "Use the isolated MongoDB preview");
  assert.equal(
    uri.hostname,
    "127.0.0.1",
    "Only the local preview can be seeded",
  );
  assert.equal(
    uri.pathname,
    "/gymwars_preview",
    "Only gymwars_preview can be seeded",
  );
  return uri.href;
}
function makeClub(index, baseStrength = 45) {
  const rng = createRng(`${PREFIX}:${index}`);
  const state = createCareer({
    seed: `${PREFIX}:${index}`,
    name: names[index],
    style: "boxing",
  });
  const starter = state.fighters[0];
  const level = Math.max(
    26,
    Math.min(78, baseStrength + [-5, 0, 3, 7, 12][index % 5]),
  );
  const first = [
    "Alex",
    "Maya",
    "Ivan",
    "Nina",
    "Leo",
    "Omar",
    "Lena",
    "Hugo",
    "Tara",
    "Andre",
    "Rosa",
    "Nico",
  ];
  const last = [
    "Marin",
    "Costa",
    "Reed",
    "Silva",
    "Vargas",
    "Kovac",
    "Hale",
    "Park",
    "Navarro",
    "Cole",
  ];
  state.fighters = divisions.map((weightClass, slot) => ({
    ...structuredClone(starter),
    id: `club-${index}-fighter-${slot}`,
    weightClass,
    name: `${first[(index * 3 + slot) % first.length]} ${last[(index + slot * 2) % last.length]}`,
    style: ["boxing", "wrestling", "bjj", "sambo"][(index + slot) % 4],
    portrait: portraits.filter(
      (art) => art.weightClasses.includes(weightClass) && !art.minAge,
    )[rng.int(0, 3)].id,
    rarity: ["prospect", "contender", "elite"][rng.int(0, 2)],
    stats: Object.fromEntries(
      ["striking", "grappling", "submissions", "conditioning"].map((key) => [
        key,
        level + rng.int(-3, 3),
      ]),
    ),
    gameplan: {
      approach: ["strike", "balanced", "grapple"][rng.int(0, 2)],
      pace: ["measured", "high", "cautious"][rng.int(0, 2)],
      finish: rng.int(0, 1) ? "play-safe" : "hunt-finish",
      conserveBelow: 30,
    },
  }));
  state.boutsCompleted = 1;
  return state;
}
async function seed(uri) {
  await mongoose.connect(previewUri(uri));
  try {
    const Career = require("../models/careerModel"),
      Gym = require("../models/gymModel"),
      User = require("../models/userModel");
    const { Defense, Match } = require("../models/careerWarModel");
    const { repository, seasonFor } = require("../services/careerWarService");
    const ids = names.map((_, i) => idFor("gym", i));
    const originals = await Career.find({ gymId: { $nin: ids } })
      .sort({ _id: 1 })
      .lean();
    const player =
      originals.find((doc) => doc.state.name === "KEK MMA") || originals[0];
    const strength = player ? Math.round(coverageFor(player).strength) : 45;
    const repo = repository(),
      now = Date.now();
    const passwordHash = await bcrypt.hash("gymwars-preview-test", 10);
    await Promise.all([
      Career.init(),
      Defense.init(),
      Match.init(),
      User.init(),
    ]);
    for (let i = 0; i < names.length; i++) {
      const gymId = ids[i],
        userId = idFor("user", i);
      const existing = await Career.findOne({ gymId }).lean();
      if (existing)
        assert.equal(
          existing.state.seed,
          `${PREFIX}:${i}`,
          "Test identity collision",
        );
      await User.updateOne(
        { _id: userId },
        {
          $setOnInsert: {
            email: `leaderboard-test-${i}@gymwars.local`,
            passwordHash,
            gymId,
            emailConfirmed: true,
          },
        },
        { upsert: true },
      );
      await Gym.updateOne(
        { _id: gymId },
        { $setOnInsert: { userId, name: names[i], isAi: false } },
        { upsert: true },
      );
      if (!existing) {
        const daily = materialize(null, now);
        daily.leagueCards.balance = 10; // Explicit test grant to these new gyms only.
        await Career.create({
          gymId,
          state: makeClub(i, strength),
          revision: 0,
          receipts: [],
          daily,
        });
      }
      const save = await Career.findOne({ gymId }).lean();
      const defense = await Defense.findOne({ gymId }).lean();
      await repo.publishDefense(gymId, {
        revision: save.revision,
        fighterIds: save.state.fighters.map((f) => f.id),
        expectedDefenseVersion: defense?.version || null,
      });
    }
    let cardsCreated = 0;
    for (let i = 0; i < names.length; i++) {
      for (let card = 0; card < 3 + (i % 7); card++) {
        const requestId = `${PREFIX}-${i}-${card}`;
        if (await Match.exists({ gymId: ids[i], requestId })) continue;
        const rivalId = ids[(i + 1 + card * 3) % ids.length];
        const save = await Career.findOne({ gymId: ids[i] }).lean();
        const rival = await Defense.findOne({ gymId: rivalId }).lean();
        await repo.battle(ids[i], {
          requestId,
          revision: save.revision,
          opponentId: String(rivalId),
          opponentType: "player",
          opponentRevision: rival.version,
          fighterIds: save.state.fighters.map((f) => f.id),
        });
        cardsCreated++;
      }
    }
    assert.deepEqual(
      await Career.find({ gymId: { $nin: ids } })
        .sort({ _id: 1 })
        .lean(),
      originals,
      "Existing player saves must remain unchanged",
    );
    const ladder = await repo.standings(seasonFor(Date.now()));
    assert.equal(
      ladder.filter((row) => ids.some((id) => String(id) === row.gymId)).length,
      names.length,
    );
    console.log(
      JSON.stringify(
        {
          gyms: names.length,
          cardsCreated,
          season: seasonFor(Date.now()).id,
          existingPlayerSavesUnchanged: true,
          sample: ladder
            .slice(0, 5)
            .map(({ name, points, wins, losses, draws }) => ({
              name,
              points,
              wins,
              losses,
              draws,
            })),
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}
if (require.main === module)
  seed(process.argv[2]).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { previewUri, makeClub };
