const crypto = require("node:crypto");
const { CAREER } = require("../../consts/career");
const {
  createCareer,
  applyCommand,
  offers,
  publicState,
} = require("../../engine/careerEngine");
const { materialize } = require("../../services/careerAllowances");
const Career = require("../../models/careerModel"),
  User = require("../../models/userModel"),
  Gym = require("../../models/gymModel");
const divisions = [
  "featherweight",
  "lightweight",
  "middleweight",
  "heavyweight",
];
const cmd = (s, type, fields = {}) => applyCommand(s, { type, ...fields });
function team(s, power = 50, reserve = false) {
  const base = structuredClone(s.fighters[0]);
  s.fighters = divisions.map((weightClass, i) => ({
    ...structuredClone(base),
    id: i === 1 ? "starter" : weightClass,
    name: ["Arlo Vale", "Alex Marin", "Noah Silva", "Sam Costa"][i],
    weightClass,
    stats: Object.fromEntries(Object.keys(base.stats).map((k) => [k, power])),
    potential: Object.fromEntries(Object.keys(base.stats).map((k) => [k, 99])),
  }));
  if (reserve) {
    s.facilityTier = 2;
    s.fighters.push({
      ...structuredClone(s.fighters[1]),
      id: "reserve",
      name: "Marco Reed",
      stats: { ...s.fighters[1].stats, striking: 49 },
    });
  }
  return s;
}
function titleWin(s) {
  const f = s.fighters.find((f) => f.id === "starter");
  f.rankingPoints = 80;
  for (const key of Object.keys(f.stats)) f.stats[key] = 95;
  for (const r of s.rivals)
    for (const key of Object.keys(r.stats)) r.stats[key] = 5;
  const offer = offers(s, f).find((o) => o.opponent.isChampion);
  if (!offer) throw new Error("Fixture has no real title offer");
  s = cmd(s, "book", { fighterId: f.id, opponentId: offer.id, weeks: 4 });
  for (let i = 0; i < 4; i++) s = cmd(s, "advance", { confirmCosts: true });
  s = cmd(s, "auto-fight", { fightId: s.fights.at(-1).id, expectedRound: 0 });
  if (s.fights.at(-1).result.winner !== "A")
    throw new Error("Deterministic title checkpoint failed");
  return s;
}
async function createFixture(preset, label = "") {
  const allowed = [
    "career",
    "training",
    "team",
    "reserves",
    "power",
    "contender",
    "invited",
    "development",
    "staff-ready",
    "mentor",
    "mentor-refresh",
    "elite",
    "exhausted",
    "late",
    "war-duel",
    "headquarters",
    "legacy-team",
    "qualification",
    "post-career",
    "mentor-blocked",
    "honor",
    "ceilings",
    "partial-ceiling",
    "war-discovery",
    "profile",
    "late-grind",
    "rarity-elite",
    "rarity-legend",
    "rarity-lineup",
    "signature-styles",
    "signature-equipped",
    "signature-kept",
    "signature-old-booking",
    "signature-v6-booking",
  ];
  if (!allowed.includes(preset)) throw new Error("Unknown E2E checkpoint");
  const nonce = crypto.randomUUID().slice(0, 8),
    email = "player-" + nonce + "@e2e.gymwars.invalid",
    password = "e2e-test-password";
  const user = await User.create({
    email,
    passwordHash: await require("bcryptjs").hash(password, 4),
    emailConfirmed: true,
  });
  const gym = await Gym.create({
    userId: user._id,
    name: ("E2E " + (label || preset) + " " + nonce).slice(0, 30),
  });
  user.gymId = gym._id;
  await user.save();
  let s = createCareer({
    seed: "e2e-" + preset,
    name: gym.name,
    style: "boxing",
  });
  if (preset !== "career" && preset !== "exhausted") {
    s.cash = 100000;
    s.boutsCompleted = 1;
  }
  if (
    [
      "team",
      "reserves",
      "invited",
      "development",
      "staff-ready",
      "mentor",
      "mentor-refresh",
      "late",
      "mentor-blocked",
      "post-career",
      "profile",
      "late-grind",
      "rarity-lineup",
    ].includes(preset)
  )
    s = team(
      s,
      preset === "invited" || preset === "late" ? 95 : 50,
      preset === "reserves" || preset === "rarity-lineup",
    );
  if (preset === "war-duel") s = team(s, 88);
  if (preset === "war-discovery") s = team(s, 20);
  if (preset === "profile") {
    s.cosmeticLookId = "redline";
    s.fighters.forEach((f, i) => {
      f.rarity = ["elite", "prospect", "contender", "legend"][i];
    });
    s.fighters[0].signatureId = "clean-combinations";
  }
  if (preset === "rarity-lineup") {
    s.fighters.forEach((f, i) => {
      f.rarity = ["journeyman", "prospect", "contender", "elite", "legend"][i];
    });
  }
  if (["signature-styles", "signature-equipped"].includes(preset)) {
    const styles = ["boxing", "muay-thai", "wrestling", "judo", "bjj", "sambo"];
    const {
      signatureChoicesFor,
      signatureFor,
    } = require("../../consts/signatures");
    const base = structuredClone(s.fighters[0]);
    s.facilityTier = 3;
    s.fighters = styles.map((style, i) => {
      const signatureId =
        preset === "signature-equipped"
          ? signatureChoicesFor(style).find(
              (id) =>
                ![
                  "pace-keeper",
                  "clean-combinations",
                  "chain-wrestling",
                  "escape-artist",
                ].includes(id),
            )
          : null;
      return {
        ...structuredClone(base),
        id: `style-${style}`,
        name: `${style === "bjj" ? "BJJ" : style.replaceAll("-", " ")} Test Fighter`,
        style,
        weightClass: divisions[i % 4],
        rarity: "elite",
        stats: {
          striking: 55,
          grappling: 55,
          submissions: 55,
          conditioning: 55,
        },
        signatureId,
        gameplan: {
          ...base.gameplan,
          ...(signatureFor(signatureId)?.conditions || {}),
        },
      };
    });
  }
  if (preset === "signature-kept") {
    s = team(s, 55);
    s.fighters[0].style = "boxing";
    s.fighters[0].rarity = "elite";
    s.fighters[0].signatureId = "chain-wrestling";
    s.fighters[0].gameplan = {
      approach: "grapple",
      pace: "high",
      finish: "play-safe",
      conserveBelow: 30,
    };
    s.fighters[0].history.push({
      type: "signature",
      week: 0,
      text: "Chose Chain Wrestling before the style-specific pool.",
    });
  }
  if (preset === "signature-old-booking") {
    s.fighters[0].rarity = "elite";
    const offer = offers(s, s.fighters[0]).find((o) => !o.blockedReason);
    s = cmd(s, "accept-offer", {
      fighterId: "starter",
      offerId: offer.offerId,
    });
    s.fights[0].combatVersion = 5;
  }
  if (preset === "signature-v6-booking") {
    const f = s.fighters[0];
    f.rarity = "elite";
    f.style = "wrestling";
    s = cmd(s, "signature", {
      fighterId: f.id,
      signatureId: "chain-wrestling",
    });
    s = cmd(s, "accept-offer", {
      fighterId: f.id,
      offerId: offers(s, s.fighters[0]).find((o) => !o.blockedReason).offerId,
    });
    s.fights[0].combatVersion = 6;
  }
  // Declared reveal checkpoints use the real guarantee path. These are visual
  // feature tests, never evidence of natural acquisition odds or pacing.
  if (["rarity-elite", "rarity-legend"].includes(preset)) {
    const { RARITY_TIERS, PITY_THRESHOLDS } = require("../../consts/rarity");
    const tier = preset.slice(7);
    for (const key of Object.keys(PITY_THRESHOLDS))
      s.scouting.pity[key] =
        RARITY_TIERS[key].order <= RARITY_TIERS[tier].order
          ? PITY_THRESHOLDS[key]
          : 0;
  }
  if (["ceilings", "partial-ceiling"].includes(preset)) {
    s = team(s, 60);
    const f = s.fighters.find((f) => f.id === "starter");
    f.growthKnowledge = {};
    for (const key of Object.keys(f.stats)) {
      if (preset === "ceilings" || key === "striking") {
        f.potential[key] = f.stats[key];
        f.growthKnowledge[key] = {
          plateau: true,
          observedWeek: 0,
          observedAt: f.stats[key],
        };
      }
    }
  }
  if (["power", "contender"].includes(preset)) {
    for (const key of Object.keys(s.fighters[0].stats)) {
      s.fighters[0].stats[key] = 95;
      s.fighters[0].potential[key] = 99;
    }
    for (const r of s.rivals)
      for (const key of Object.keys(r.stats)) r.stats[key] = 5;
    if (preset === "contender") s.fighters[0].rankingPoints = 80;
  }
  if (preset === "invited") s = titleWin(s);
  if (["development", "staff-ready"].includes(preset)) s.facilityTier = 2;
  if (preset === "staff-ready") {
    s = cmd(s, "hire", { role: "coach" });
    s = cmd(s, "hire", { role: "scout" });
    for (let i = 0; i < 3; i++) {
      s = cmd(s, "camp", {
        fighterId: s.fighters[i].id,
        preset: ["pressure", "defense", "balanced"][i],
        weeks: 4,
      });
      for (let w = 0; w < 4; w++) {
        if (s.fighters[i].camp?.needsReview)
          s = cmd(s, "camp-review", {
            fighterId: s.fighters[i].id,
            choice: "continue",
          });
        s = cmd(s, "advance", { confirmCosts: true });
      }
    }
    // Rank two also requires a real win after a qualifying camp.
    const f = s.fighters[0];
    for (const k of Object.keys(f.stats)) f.stats[k] = 95;
    for (const r of s.rivals)
      for (const k of Object.keys(r.stats)) r.stats[k] = 5;
    const o = offers(s, f).find(
      (o) => !o.blockedReason && !o.opponent.isChampion,
    );
    s = cmd(s, "book", { fighterId: f.id, opponentId: o.id, weeks: 4 });
    for (let i = 0; i < 4; i++) s = cmd(s, "advance", { confirmCosts: true });
    s = cmd(s, "auto-fight", { fightId: s.fights.at(-1).id, expectedRound: 0 });
  }
  if (["mentor", "mentor-refresh"].includes(preset)) {
    s.fighters[0].age = preset === "mentor-refresh" ? 32 : 35;
    s.fighters[0].traits = ["iron-chin"];
    s.fighters[0].discoveredTraits = ["iron-chin"];
    s.fighters[1].age = 22;
    s.fighters[1].traits = [];
    s.fighters[1].discoveredTraits = [];
    s.fighters[0].style = s.fighters[1].style = "boxing";
    if (preset === "mentor-refresh") {
      s.seed = "mentoring-sync";
      s.fighters[1].gameplan = {
        ...s.fighters[1].gameplan,
        approach: "grapple",
        pace: "cautious",
      };
    }
  }
  if (preset === "elite") s.fighters[0].rarity = "elite";
  if (preset === "late") {
    for (const f of s.fighters) f.record.wins = 4; // Declared endgame qualification.
    s.facilityTier = 6;
    s.legacy = 600;
    s.careerJourney.completedWeek = 0;
    for (const id of ["national-showcase", "next-generation"])
      s.careerChallenges[id] = { week: 0, trophy: id };
    for (const id of [
      "open-doors",
      "fight-team",
      "title-defense",
      "team-trophy",
      "successor",
      "division-dynasty",
    ])
      s.gymGoals[id] = { week: s.week, badge: id };
    s.careerJourney.attempts = [
      {
        id: "checkpoint-trophy",
        status: "won",
        eventWeek: 0,
        fighterIds: s.fighters.slice(0, 3).map((f) => f.id),
        fightIds: [],
        opponentIds: [],
        resolved: 3,
        wins: 3,
        losses: 0,
        draws: 0,
        reward: { cash: 3000, legacy: 100 },
      },
    ];
    for (const f of s.fighters.slice(0, 3))
      f.championships = [{ wonWeek: 0, defenses: 1 }];
  }
  s = cmd(s, "plan", {
    fighterId: s.fighters[0].id,
    plan: s.fighters[0].gameplan,
  });
  if (preset === "late") {
    for (const f of s.fighters) f.record.wins = 4; // Declared endgame qualification.
    // A declared endgame feature checkpoint, separate from unboosted economy/balance runs.
    // Use a developed roster; this tests trophy fulfillment, not a 50-skill upset against 80s.
    for (const fighter of s.fighters)
      for (const skill of Object.keys(fighter.stats)) fighter.stats[skill] = 80;
    // Pick a reproducible success branch without changing the World Open's rules or stats.
    // Combat can legitimately upset a stronger fighter; this checkpoint tests trophy fulfillment.
    let selected = false;
    for (let i = 0; i < 30; i++) {
      s.seed = "e2e-world-success-" + i;
      const f = s.fighters.find((f) => f.id === "starter");
      const offer = offers(s, f).find((o) => o.challengeId === "world-open");
      let probe = cmd(s, "accept-offer", {
        fighterId: f.id,
        offerId: offer.offerId,
      });
      const b = probe.fights.at(-1);
      while (probe.week < b.eventWeek)
        probe = cmd(probe, "advance", { confirmCosts: true });
      probe = cmd(probe, "auto-fight", { fightId: b.id, expectedRound: 0 });
      if (probe.fights.at(-1).result.winner === "A") {
        selected = true;
        break;
      }
    }
    if (!selected) throw new Error("No World Open success checkpoint found");
  }
  if (preset === "legacy-team") s = team(s, 60);
  if (preset === "headquarters") {
    s = team(s, 95);
    s.facilityTier = 6;
  }
  // Explicit feature checkpoints. They are not used as evidence of organic pacing.
  if (["qualification", "post-career", "late-grind"].includes(preset)) {
    for (const c of CAREER.circuits)
      s.gymGoals[c.goalId] = { week: 0, badge: c.goalId };
  }
  if (["post-career", "late-grind"].includes(preset)) {
    s.facilityTier = 4;
    s.careerJourney.completedWeek = 0;
    for (const f of s.fighters) f.record.wins = 4;
    for (const c of CAREER.challenges)
      s.careerChallenges[c.id] = { week: 0, trophy: c.reward.trophy };
  }
  if (preset === "late-grind") {
    s = cmd(s, "plan", { fighterId: "starter", plan: s.fighters[0].gameplan });
    for (const f of s.fighters) {
      f.growthKnowledge = {};
      for (const key of Object.keys(f.stats)) {
        f.stats[key] = f.potential[key] = 60;
        f.growthKnowledge[key] = {
          plateau: true,
          observedAt: 60,
          observedWeek: 0,
        };
      }
    }
    s.circuitHonors.city = { week: 0 };
    for (const r of s.rivals.filter((r) => r.circuitId === "city")) {
      s.fights.push({
        id: "proof-" + r.id,
        fighterId: "starter",
        opponentId: r.id,
        status: "resolved",
        result: { winner: "A" },
        circuit: { id: "city" },
        circuitOpponentId: r.circuitOpponentId,
        eventWeek: 0,
      });
    }
  }
  if (preset === "mentor-blocked") {
    for (const f of s.fighters) {
      f.age = 22;
      f.traits = [];
      f.discoveredTraits = [];
      f.style = "boxing";
    }
    s.fighters[0].age = 35;
    for (const f of s.fighters.slice(0, 2))
      f.traits = f.discoveredTraits = ["cardio-machine"];
  }
  if (preset === "honor") {
    for (const id of ["open-doors", "fight-team"])
      s.gymGoals[id] = { week: 0, badge: id };
    s.fighters[0].record.wins = 2;
    for (const k of Object.keys(s.fighters[0].stats))
      s.fighters[0].stats[k] = 99;
    for (const p of CAREER.circuitPacks[0].opponents.filter((p) => !p.capstone))
      s.fights.push({
        id: "proof-" + p.id,
        fighterId: "starter",
        status: "resolved",
        result: { winner: "A" },
        circuit: { id: "city" },
        circuitOpponentId: p.id,
        eventWeek: 0,
      });
    for (const r of s.rivals.filter((r) => r.capstone))
      for (const k of Object.keys(r.stats)) r.stats[k] = 1;
  }
  const daily = materialize(null, Date.now());
  if (preset === "exhausted") {
    daily.careerWeeks.balance = 0;
    daily.leagueCards.balance = 0;
  }
  await Career.create({ gymId: gym._id, revision: 0, state: s, daily });
  if (["legacy-team", "signature-kept"].includes(preset)) {
    const { snapshotFor, hash } = require("../../engine/careerWarEngine");
    const snapshot = snapshotFor({ gymId: gym._id, revision: 0, state: s });
    delete snapshot.version;
    snapshot.combatVersion = preset === "signature-kept" ? 5 : 4;
    snapshot.version = hash(snapshot);
    await require("../../models/careerWarModel").Defense.create({
      gymId: gym._id,
      careerRevision: 0,
      version: snapshot.version,
      snapshot,
      gameplans: Object.fromEntries(
        snapshot.lineup.map((f) => [f.id, f.gameplan]),
      ),
    });
  }
  return {
    email,
    password,
    gymId: String(gym._id),
    name: gym.name,
    preset,
    checkpoint: preset !== "career",
    summary: { week: s.week, stage: publicState(s).journey.currentStageId },
  };
}
module.exports = { createFixture };
