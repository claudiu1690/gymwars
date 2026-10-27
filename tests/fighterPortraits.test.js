const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createCareer, publicState } = require("../engine/careerEngine");
const { botSnapshots, leagueClubSnapshots } = require("../consts/careerExhibitionBots");
const artModule = import("../frontend/src/fighterPortraits.mjs");
const divisions = ["featherweight", "lightweight", "middleweight", "heavyweight"];
const newPortraits = {
  featherweight: [4, 5, 6, 7],
  lightweight: [8, 9, 10, 11],
  middleweight: [12, 13, 14, 15],
  heavyweight: [16, 17, 18, 19],
};

test("legacy portraits and missing IDs always resolve to existing weight-appropriate art without editing the fighter", async () => {
  const { fighterPortrait, fighterPortraitCatalog } = await artModule;
  for (const weightClass of divisions) for (const portrait of [undefined, null, -1, ...fighterPortraitCatalog.map((art) => art.id), 99]) {
    const fighter = { id: "legacy-2", name: "Legacy Fighter", age: 25, weightClass, portrait };
    const before = structuredClone(fighter);
    const art = fighterPortrait(fighter);
    assert.ok(art.weightClasses.includes(weightClass));
    assert.ok(fs.existsSync(path.join(__dirname, "../frontend/public", art.src)));
    assert.deepEqual(fighter, before);
  }
  assert.equal(new Set(fighterPortraitCatalog.map((art) => art.id)).size, fighterPortraitCatalog.length);
  for (const [division, ids] of Object.entries(newPortraits)) {
    const portraits = fighterPortraitCatalog.filter((art) => ids.includes(art.id));
    assert.equal(new Set(portraits.map((art) => art.src)).size, 4);
    for (const art of portraits) assert.deepEqual(art.weightClasses, [division]);
  }
});

test("a fighter keeps their selected face in full cards, previews and published snapshots regardless of rarity or training", async () => {
  const { fighterPortrait } = await artModule;
  for (const [weightClass, ids] of Object.entries(newPortraits)) for (const portrait of ids) {
    const fighter = { id: "portrait-1", name: "Same Fighter", weightClass, portrait, age: 24 };
    assert.equal(fighterPortrait(fighter).id, portrait);
    for (const rarity of ["journeyman", "prospect", "contender", "elite", "legend"]) {
      assert.equal(fighterPortrait({ ...fighter, rarity, fatigue: 90, stats: { striking: 99 } }).id, portrait);
      assert.equal(fighterPortrait({ ...fighter, age: 45, name: "Renamed" }).id, portrait);
    }
  }
  const legacy = { id: "legacy-fixed", name: "Legacy", weightClass: "featherweight", portrait: 1 };
  assert.equal(fighterPortrait(legacy).id, fighterPortrait({ ...legacy, name: "Renamed", rarity: "legend", fatigue: 100 }).id);
  assert.equal(fighterPortrait({ name: "Coach", portrait: 3 }).id, 3);
  for (const weightClass of divisions) {
    const old = { id: "age-stability", name: "Same Fighter", weightClass, age: 18, portrait: 99 };
    assert.equal(fighterPortrait(old).id, fighterPortrait({ ...old, age: 45 }).id);
  }
  assert.equal(fighterPortrait({ id: "veteran", weightClass: "middleweight", portrait: 3, age: 32 }).id, 3);
  assert.ok(fighterPortrait({ portrait: 999 }).src);
});

test("new career recruits and rivals select portraits from their own division", async () => {
  const { fighterPortraitCatalog } = await artModule;
  const seen = Object.fromEntries(divisions.map((division) => [division, new Set()]));
  for (let i = 0; i < 40; i++) {
    const s = createCareer({ seed: `portrait-catalog-${i}`, name: "Portrait Gym", style: "boxing" });
    for (const fighter of [...s.fighters, ...s.rivals, ...s.board.map((r) => r.fighter)]) {
      const art = fighterPortraitCatalog.find((a) => a.id === fighter.portrait);
      assert.ok(art, `missing portrait ${fighter.portrait}`);
      assert.ok(art.weightClasses.includes(fighter.weightClass));
      assert.ok(!art.minAge || fighter.age >= art.minAge);
      seen[fighter.weightClass].add(art.id);
    }
    assert.deepEqual(publicState(s), publicState(s));
  }
  for (const [division, ids] of Object.entries(newPortraits)) for (const id of ids)
    assert.ok(seen[division].has(id), `new ${division} ${id} appears in generation`);
});

test("existing rival club snapshots display class-correct art while retaining their immutable inputs", async () => {
  const { fighterPortrait } = await artModule;
  const clubs = [...botSnapshots(), ...leagueClubSnapshots()];
  const before = structuredClone(clubs);
  for (const club of clubs) for (const fighter of club.lineup) {
    assert.ok(fighterPortrait(fighter).weightClasses.includes(fighter.weightClass));
  }
  assert.deepEqual(clubs, before);
});
