const { SIGNATURE_BY_ID } = require("./signatures");
const CAREER = {
  version: 3,
  engineVersion: "career-3",
  signatures: SIGNATURE_BY_ID,
  weeksPerYear: 52,
  // Covers a complete four-division corner even when both paid opening
  // recruits roll Legend ($700 each), plus eight Starter operating weeks.
  startingCash: 1600,
  scoutsPerWeek: 2,
  boardSize: 4,
  campLengths: [1, 2, 3, 4, 6],
  campCompletionBonus: { 1: 0, 2: 0, 3: 0, 4: 1, 6: 2 },
  campScheduleVersion: 2,
  fatiguePerWeek: 9,
  recoveryPerWeek: 18,
  boutTurnaroundWeeks: 4,
  titleShotPoints: 80,
  mentoring: {
    compatibleWeeks: 4,
    otherWeeks: 6,
    preparationValue: 2,
    preparationExpiresAfterWeeks: 8,
  },
  invitational: {
    name: "Career Invitational",
    teamSize: 3,
    winsRequired: 2,
    notice: 4,
    show: 200,
    winBonus: 250,
    reward: { cash: 3000, legacy: 100 },
    opponents: [
      {
        slot: 0,
        name: "Nico Silva",
        style: "boxing",
        description:
          "Pressure boxer. Dangerous hands; attack the weaker ground game.",
        stats: {
          striking: 62,
          grappling: 43,
          submissions: 40,
          conditioning: 53,
        },
        gameplan: {
          approach: "strike",
          pace: "high",
          finish: "hunt-finish",
          conserveBelow: 30,
        },
      },
      {
        slot: 1,
        name: "Dara Kovač",
        style: "wrestling",
        description:
          "Relentless wrestler. Strong takedowns; make the smaller gas tank work.",
        stats: {
          striking: 44,
          grappling: 62,
          submissions: 50,
          conditioning: 44,
        },
        gameplan: {
          approach: "grapple",
          pace: "high",
          finish: "play-safe",
          conserveBelow: 30,
        },
      },
      {
        slot: 2,
        name: "Alexis Reed",
        style: "bjj",
        description:
          "Patient submission specialist. Dangerous on the mat; keep the fight standing.",
        stats: {
          striking: 46,
          grappling: 54,
          submissions: 62,
          conditioning: 55,
        },
        gameplan: {
          approach: "grapple",
          pace: "measured",
          finish: "hunt-finish",
          conserveBelow: 20,
        },
      },
    ],
  },
  facilities: [
    null,
    {
      name: "Starter gym",
      slots: 4,
      upkeep: 20,
      cost: 0,
      weeks: 0,
      recovery: 1,
    },
    {
      name: "Neighborhood gym",
      slots: 5,
      upkeep: 45,
      cost: 3000,
      weeks: 4,
      recovery: 1.15,
    },
    {
      name: "Contender gym",
      slots: 7,
      upkeep: 90,
      cost: 8000,
      weeks: 6,
      recovery: 1.3,
    },
    {
      name: "Fight factory",
      slots: 10,
      upkeep: 160,
      cost: 18000,
      weeks: 8,
      recovery: 1.5,
    },
    {
      name: "Champions academy",
      slots: 12,
      upkeep: 200,
      cost: 24000,
      weeks: 8,
      recovery: 1.6,
    },
    {
      name: "Gym Wars HQ",
      slots: 14,
      upkeep: 240,
      cost: 32000,
      weeks: 10,
      recovery: 1.7,
    },
  ],
  staff: {
    coach: {
      fee: 450,
      upkeep: 20,
      ranks: [
        null,
        {
          rank: 1,
          name: "Assistant coach",
          fee: 450,
          upkeep: 20,
          facilityTier: 1,
          growthMultiplier: 1.15,
        },
        {
          rank: 2,
          name: "Head coach",
          fee: 1200,
          upkeep: 30,
          facilityTier: 2,
          growthMultiplier: 1.25,
        },
        {
          rank: 3,
          name: "Master coach",
          fee: 3000,
          upkeep: 45,
          facilityTier: 3,
          growthMultiplier: 1.35,
        },
        {
          rank: 4,
          name: "National coach",
          fee: 5000,
          upkeep: 60,
          facilityTier: 4,
          growthMultiplier: 1.45,
        },
        {
          rank: 5,
          name: "World-class coach",
          fee: 8000,
          upkeep: 80,
          facilityTier: 6,
          growthMultiplier: 1.55,
        },
      ],
    },
    scout: {
      fee: 350,
      upkeep: 15,
      ranks: [
        null,
        {
          rank: 1,
          name: "Local scout",
          fee: 350,
          upkeep: 15,
          facilityTier: 1,
          reportWidth: 6,
        },
        {
          rank: 2,
          name: "Regional scout",
          fee: 700,
          upkeep: 20,
          facilityTier: 2,
          reportWidth: 4,
        },
        {
          rank: 3,
          name: "National scout",
          fee: 1500,
          upkeep: 25,
          facilityTier: 3,
          reportWidth: 2,
        },
        {
          rank: 4,
          name: "International scout",
          fee: 2500,
          upkeep: 30,
          facilityTier: 4,
          reportWidth: 1,
        },
        {
          rank: 5,
          name: "Global network",
          fee: 4000,
          upkeep: 35,
          facilityTier: 6,
          reportWidth: 0,
        },
      ],
    },
  },
  departments: {
    strikingBay: {
      name: "Striking bay",
      description:
        "Improve striking growth for every valid allocation. Combination lab is a convenient preset; custom training stays available.",
      unlocks: ["combinations"],
      levels: [
        null,
        ...[1, 2, 3].map((level, i) => ({
          level,
          fee: [400, 1200, 2800][i],
          facilityTier: [1, 3, 5][i],
          effectLabel: `+${level * 10}% striking growth · pressure coaching drill`,
          skillBonuses: { striking: level * 0.1 },
        })),
      ],
    },
    grapplingLab: {
      name: "Grappling lab",
      description:
        "Dedicated mats and drilling stations for control and finishes.",
      unlocks: ["submissions"],
      levels: [
        null,
        ...[1, 2, 3].map((level, i) => ({
          level,
          fee: [400, 1200, 2800][i],
          facilityTier: [1, 3, 5][i],
          effectLabel: `+${level * 10}% grappling and submission growth · escape coaching drill`,
          skillBonuses: { grappling: level * 0.1, submissions: level * 0.1 },
        })),
      ],
    },
    conditioningStudio: {
      name: "Conditioning studio",
      description: "Build a team that can keep working in the final round.",
      unlocks: ["gas-tank"],
      levels: [
        null,
        ...[1, 2, 3].map((level, i) => ({
          level,
          fee: [400, 1200, 2800][i],
          facilityTier: [2, 4, 6][i],
          effectLabel: `+${level * 10}% conditioning growth · pacing coaching drill`,
          skillBonuses: { conditioning: level * 0.1 },
        })),
      ],
    },
    recoverySuite: {
      name: "Recovery suite",
      description:
        "Physio equipment helps resting fighters return to full readiness sooner.",
      unlocks: [],
      levels: [
        null,
        ...[1, 2, 3].map((level, i) => ({
          level,
          fee: [600, 1600, 3200][i],
          facilityTier: [2, 4, 6][i],
          effectLabel: `+${[5, 12, 24][i]} readiness recovered per rest week`,
          recoveryBonus: [5, 12, 24][i],
        })),
      ],
    },
    filmRoom: {
      name: "Film room",
      description:
        "Completed specialist camps earn stronger next-bout preparation. This room does not change scouting accuracy or reveal hidden combat information.",
      unlocks: [],
      levels: [
        null,
        ...[1, 2, 3].map((level, i) => ({
          level,
          fee: [500, 1400, 3000][i],
          facilityTier: [3, 5, 6][i],
          effectLabel: `+${level} temporary preparation after specialist camps`,
          preparationBonus: level,
        })),
      ],
    },
  },
  presets: {
    balanced: {
      name: "Balanced development",
      allocations: {
        striking: 25,
        grappling: 25,
        submissions: 25,
        conditioning: 25,
      },
      benefit: "Broad development; no specialized bout bonus.",
    },
    defense: {
      name: "Grappling drills",
      preparationStat: "grappling",
      preparationValue: 3,
      minAllocation: 40,
      allocations: {
        striking: 15,
        grappling: 45,
        submissions: 15,
        conditioning: 25,
      },
      benefit:
        "Build takedowns and ground control; less striking growth. +3 grappling for the next bout within 8 weeks.",
    },
    pressure: {
      name: "Striking pressure",
      preparationStat: "striking",
      preparationValue: 3,
      minAllocation: 40,
      allocations: {
        striking: 45,
        grappling: 15,
        submissions: 15,
        conditioning: 25,
      },
      benefit:
        "Sharpen striking; less ground development. +3 striking for the next bout within 8 weeks.",
    },
    combinations: {
      name: "Combination lab",
      departmentId: "strikingBay",
      preparationStat: "striking",
      preparationValue: 3,
      minAllocation: 40,
      allocations: {
        striking: 55,
        grappling: 15,
        submissions: 10,
        conditioning: 20,
      },
      benefit:
        "Chain attacks with focused striking drills. +3 striking for the next bout within 8 weeks.",
    },
    submissions: {
      name: "Submission chains",
      departmentId: "grapplingLab",
      preparationStat: "submissions",
      preparationValue: 3,
      minAllocation: 40,
      allocations: {
        striking: 10,
        grappling: 30,
        submissions: 50,
        conditioning: 10,
      },
      benefit:
        "Connect control to finishes. +3 submissions for the next bout within 8 weeks.",
    },
    "gas-tank": {
      name: "Five-round engine",
      departmentId: "conditioningStudio",
      preparationStat: "conditioning",
      preparationValue: 3,
      minAllocation: 40,
      allocations: {
        striking: 15,
        grappling: 15,
        submissions: 15,
        conditioning: 55,
      },
      benefit:
        "Build the endurance to keep your pace. +3 conditioning for the next bout within 8 weeks.",
    },
  },
  traits: {
    "iron-chin": "Takes less damage from clean shots.",
    "suspect-chin": "More vulnerable to clean shots.",
    "killer-instinct": "More dangerous when hunting a finish.",
    "cardio-machine": "Starts fights with a larger gas tank.",
    "slow-starter": "Slower opening, stronger late rounds.",
    "fast-starter": "Stronger opening round.",
    "big-fight-nerves": "Reduced effectiveness in title bouts.",
  },
  transferableTraits: {
    "iron-chin": {
      kind: "benefit",
      compatibleWeeks: 2,
      otherWeeks: 3,
      bestFor: "Surviving heavy hitters",
      effect:
        "About 23% less strike damage taken, with more resistance to knockdowns.",
    },
    "killer-instinct": {
      kind: "benefit",
      compatibleWeeks: 2,
      otherWeeks: 3,
      bestFor: "Turning openings into finishes",
      effect:
        "30% stronger finishing intent when a finish opportunity appears. It does not boost every attack.",
    },
    "cardio-machine": {
      kind: "benefit",
      bestFor: "Sustaining your pace",
      effect: "+15 gas at the start of each fight, with a larger maximum tank.",
    },
    "slow-starter": {
      kind: "situational",
      bestFor: "Fights that reach the later rounds",
      effect:
        "5% weaker in round one, then 8% stronger from round two. A fast finish can deny the payoff.",
    },
    "fast-starter": {
      kind: "situational",
      bestFor: "Taking the opening round",
      effect: "10% stronger in round one. Later rounds receive no trait bonus.",
    },
  },
  // These purses are earned by the existing gym chapters. There is no
  // offline income: each purse still requires a booked and resolved bout.
  circuits: [
    {
      id: "regional",
      name: "Regional circuit",
      goalId: "open-doors",
      show: 180,
      winBonus: 220,
      titleShow: 500,
      titleWinBonus: 900,
      requirement: "Complete your opening bout.",
    },
    {
      id: "city",
      name: "City circuit",
      goalId: "fight-team",
      show: 300,
      winBonus: 450,
      titleShow: 650,
      titleWinBonus: 1000,
      requirement:
        "Complete your debut and own one active fighter in every division.",
    },
    {
      id: "state",
      name: "State circuit",
      goalId: "title-defense",
      show: 500,
      winBonus: 650,
      titleShow: 850,
      titleWinBonus: 1200,
      requirement:
        "Earn City entry and defend a regional belt against a qualified challenger.",
    },
    {
      id: "national",
      name: "National circuit",
      purseVersion: 2,
      goalId: "team-trophy",
      show: 500,
      winBonus: 1100,
      titleShow: 1100,
      titleWinBonus: 1500,
      requirement: "Earn State entry and win the Career Invitational.",
    },
    {
      id: "champions",
      name: "Champions circuit",
      purseVersion: 2,
      goalId: "successor",
      show: 500,
      winBonus: 1800,
      titleShow: 1400,
      titleWinBonus: 1900,
      requirement:
        "Earn National entry and win with a fighter after their completed mentoring lesson.",
    },
    {
      id: "world",
      name: "World circuit",
      purseVersion: 2,
      goalId: "division-dynasty",
      show: 500,
      winBonus: 2700,
      titleShow: 1800,
      titleWinBonus: 2400,
      requirement:
        "Earn Champions entry and win earned regional belts in three divisions.",
    },
  ],
  // Fixed opposition changes the sporting problem, never scales to a purchase.
  circuitPacks: [
    {
      circuitId: "city",
      opponents: [
        {
          id: "pressure",
          names: ["Lena Voss", "Jules Cruz", "Kai Mercer", "Theo Lane"],
          style: "boxing",
          stats: {
            striking: 48,
            grappling: 35,
            submissions: 32,
            conditioning: 44,
          },
          gameplan: {
            approach: "strike",
            pace: "high",
            finish: "hunt-finish",
            conserveBelow: 30,
          },
          description:
            "Pushes striking at high pace and hunts the finish; eases off below 30% gas. The ground game is a weaker point.",
        },
        {
          id: "control",
          names: ["Tessa Park", "Rafa Stone", "Idris Bell", "Bruno West"],
          style: "wrestling",
          stats: {
            striking: 37,
            grappling: 49,
            submissions: 40,
            conditioning: 45,
          },
          gameplan: {
            approach: "grapple",
            pace: "measured",
            finish: "play-safe",
            conserveBelow: 30,
          },
          description:
            "Seeks takedowns at a measured pace and stays composed. Compare control, conditioning and your defensive preparation.",
        },
        {
          id: "capstone",
          capstone: true,
          names: ["Amara Holt", "Morgan Reed", "Dima Cole", "Leon Hart"],
          style: "sambo",
          stats: {
            striking: 50,
            grappling: 49,
            submissions: 45,
            conditioning: 48,
          },
          gameplan: {
            approach: "balanced",
            pace: "measured",
            finish: "hunt-finish",
            conserveBelow: 30,
          },
          description:
            "City proving night: a mixed attack with steady pace. Beat both City archetypes to earn this invitation.",
        },
      ],
    },
    {
      circuitId: "state",
      opponents: [
        {
          id: "counter",
          names: ["Eva Quinn", "Nolan Chase", "Sasha Wade", "Owen Grant"],
          style: "boxing",
          stats: {
            striking: 58,
            grappling: 49,
            submissions: 44,
            conditioning: 59,
          },
          gameplan: {
            approach: "strike",
            pace: "measured",
            finish: "play-safe",
            conserveBelow: 30,
          },
          description:
            "Durable measured striker. Stays composed instead of forcing a finish.",
        },
        {
          id: "rush",
          names: ["Mina Brooks", "Rory Webb", "Arlo Fox", "Victor Moss"],
          style: "wrestling",
          stats: {
            striking: 44,
            grappling: 61,
            submissions: 55,
            conditioning: 43,
          },
          gameplan: {
            approach: "grapple",
            pace: "high",
            finish: "hunt-finish",
            conserveBelow: 30,
          },
          description:
            "High-pace wrestler with limited endurance. Goes cautious below 30% gas; preparation still matters.",
        },
        {
          id: "capstone",
          capstone: true,
          names: ["Zara Vale", "Sam Porter", "Mika Shaw", "Eli North"],
          style: "muay-thai",
          stats: {
            striking: 61,
            grappling: 55,
            submissions: 49,
            conditioning: 60,
          },
          gameplan: {
            approach: "strike",
            pace: "measured",
            finish: "hunt-finish",
            conserveBelow: 40,
          },
          description:
            "State proving night: steady striking with an early gas conservation rule.",
        },
      ],
    },
    {
      circuitId: "national",
      opponents: [
        {
          id: "switch",
          names: ["Nia Frost", "Alex Finn", "Remy Blake", "Cole Rivers"],
          style: "sambo",
          stats: {
            striking: 63,
            grappling: 64,
            submissions: 58,
            conditioning: 62,
          },
          gameplan: {
            approach: "balanced",
            pace: "high",
            finish: "play-safe",
            conserveBelow: 40,
          },
          description:
            "Mixed attacks begin at high pace, then switch to cautious below 40% gas. Watch the recorded rounds before changing your call.",
        },
        {
          id: "patient",
          names: ["Inez Ross", "Ari Banks", "Casey Moon", "Drew Knox"],
          style: "bjj",
          stats: {
            striking: 51,
            grappling: 63,
            submissions: 68,
            conditioning: 64,
          },
          gameplan: {
            approach: "grapple",
            pace: "measured",
            finish: "hunt-finish",
            conserveBelow: 20,
          },
          description:
            "Patient grappler hunting submission openings. Measured pace preserves the late threat.",
        },
        {
          id: "capstone",
          capstone: true,
          names: ["Maya Shore", "Noah Finch", "Rene Wolfe", "Ivo Steele"],
          style: "sambo",
          stats: {
            striking: 66,
            grappling: 65,
            submissions: 61,
            conditioning: 67,
          },
          gameplan: {
            approach: "balanced",
            pace: "measured",
            finish: "play-safe",
            conserveBelow: 30,
          },
          description:
            "National proving night: a composed complete opponent with no single obvious weakness.",
        },
      ],
    },
    {
      circuitId: "champions",
      opponents: [
        {
          id: "hands",
          names: ["Lea Nash", "Jesse Drake", "Omar King", "Max Rowan"],
          style: "boxing",
          stats: {
            striking: 74,
            grappling: 56,
            submissions: 49,
            conditioning: 69,
          },
          gameplan: {
            approach: "strike",
            pace: "high",
            finish: "hunt-finish",
            conserveBelow: 30,
          },
          description:
            "Dangerous hands and high output, with a less developed ground game.",
        },
        {
          id: "chains",
          names: ["Sora James", "Rafa Dean", "Idris Kent", "Bruno Hale"],
          style: "bjj",
          stats: {
            striking: 58,
            grappling: 71,
            submissions: 76,
            conditioning: 65,
          },
          gameplan: {
            approach: "grapple",
            pace: "measured",
            finish: "hunt-finish",
            conserveBelow: 30,
          },
          description:
            "Ground specialist whose submission threat rewards a different preparation plan from the striking matchup.",
        },
        {
          id: "capstone",
          capstone: true,
          names: ["Alma York", "Taylor Swan", "Erin Pike", "Luca Gray"],
          style: "sambo",
          stats: {
            striking: 72,
            grappling: 71,
            submissions: 68,
            conditioning: 73,
          },
          gameplan: {
            approach: "balanced",
            pace: "measured",
            finish: "hunt-finish",
            conserveBelow: 40,
          },
          description:
            "Champions proving night: a complete attack that eases off before the tank empties.",
        },
      ],
    },
    {
      circuitId: "world",
      opponents: [
        {
          id: "precision",
          names: ["Amara Wynn", "Morgan Tate", "Dima Cross", "Leon Dax"],
          style: "muay-thai",
          stats: {
            striking: 80,
            grappling: 68,
            submissions: 63,
            conditioning: 78,
          },
          gameplan: {
            approach: "strike",
            pace: "measured",
            finish: "play-safe",
            conserveBelow: 30,
          },
          description:
            "World-level measured striker. Ground control offers a different problem from matching the standing attack.",
        },
        {
          id: "control",
          names: ["Nora Holt", "Emil Vale", "Kian Reed", "Pavel West"],
          style: "wrestling",
          stats: {
            striking: 68,
            grappling: 81,
            submissions: 77,
            conditioning: 70,
          },
          gameplan: {
            approach: "grapple",
            pace: "high",
            finish: "hunt-finish",
            conserveBelow: 40,
          },
          description:
            "World-level high-pace grappler with a visible 40% conservation rule. Strong control is not unlimited endurance.",
        },
        {
          id: "capstone",
          capstone: true,
          names: ["Ava Rook", "Jordan Frost", "Ren Cole", "Viktor Shore"],
          style: "sambo",
          stats: {
            striking: 81,
            grappling: 79,
            submissions: 77,
            conditioning: 82,
          },
          gameplan: {
            approach: "balanced",
            pace: "measured",
            finish: "hunt-finish",
            conserveBelow: 30,
          },
          description:
            "World proving night: complete skills and a steady mixed attack. This final invitation is earned through both World archetypes.",
        },
      ],
    },
  ],
  challenges: [
    {
      id: "national-showcase",
      name: "National Showcase",
      unlockGoal: "team-trophy",
      requiresInvitational: true,
      description:
        "Invitational winners earn a place against a composed national striker. Win one bout to raise your national pennant.",
      opponentNames: [
        "Lena Ortiz",
        "Jules Mercer",
        "Kai Bennett",
        "Theo Briggs",
      ],
      style: "muay-thai",
      stats: { striking: 72, grappling: 63, submissions: 58, conditioning: 72 },
      reward: { cash: 1500, legacy: 35, trophy: "National Showcase pennant" },
    },
    {
      id: "next-generation",
      name: "Next Generation",
      unlockGoal: "successor",
      requireMentoredFighter: true,
      description:
        "Bring a fighter who completed a mentoring lesson against a ground specialist. Your club's next generation gets its own proving night.",
      opponentNames: ["Sora Kim", "Rafa Duarte", "Idris Okoro", "Bruno Lima"],
      style: "bjj",
      stats: { striking: 61, grappling: 74, submissions: 76, conditioning: 69 },
      reward: { cash: 2500, legacy: 45, trophy: "Next Generation pennant" },
    },
    {
      id: "world-open",
      name: "World Open",
      unlockGoal: "division-dynasty",
      requiresChallenges: ["national-showcase", "next-generation"],
      description:
        "Win the National Showcase and Next Generation trophies, alongside your three-division title legacy. Then beat a complete world-level opponent in your club career’s final invitation.",
      opponentNames: [
        "Amara Cole",
        "Morgan Vale",
        "Dima Volkov",
        "Leon Becker",
      ],
      style: "sambo",
      stats: { striking: 81, grappling: 79, submissions: 78, conditioning: 82 },
      reward: { cash: 5000, legacy: 75, trophy: "World Open trophy" },
    },
  ],
};
for (const club of require("./lateGymChallenges").lateGymClubs)
  CAREER.facilities[club.minTier].warChallenge = {
    name: club.difficulty,
    rival: club.name,
    reward: club.rewardName,
  };
module.exports = { CAREER };
