// Promotion dossiers reward sporting outcomes, never purchases or repeated reads.
const quest = (id, label, target, detail) => ({ id, label, target, detail });
const STAFF_DEVELOPMENT = {
  coach: {
    description:
      "Build fighters, then prove their preparation in the ring. A qualifying camp lasts at least three weeks and must finish in full while this coach is employed.",
    ranks: [
      [],
      [],
      [
        quest(
          "campFighters",
          "Prepare two different fighters",
          2,
          "Finish a camp of 3+ weeks with each fighter.",
        ),
        quest(
          "winningFighters",
          "Turn preparation into a win",
          1,
          "Win a career bout with a fighter after their qualifying camp.",
        ),
      ],
      [
        quest(
          "focuses",
          "Build a versatile training programme",
          3,
          "Finish qualifying camps with three different primary skills; balanced training counts as its own focus.",
        ),
        quest(
          "winningFighters",
          "Develop three winning fighters",
          3,
          "Three different coached fighters must win a career bout after camp.",
        ),
      ],
      [
        quest(
          "teamTrophies",
          "Coach an Invitational-winning team",
          1,
          "Win the Career Invitational with at least two fighters who finished qualifying camps before the event.",
        ),
        quest(
          "championDivisions",
          "Build champions in two divisions",
          2,
          "Win earned regional title bouts with coached fighters in different weight classes.",
        ),
      ],
      [
        quest(
          "championDivisions",
          "Build champions in three divisions",
          3,
          "Win earned regional title bouts with coached fighters in three weight classes.",
        ),
        quest(
          "defendingFighters",
          "Make two champions defend their belts",
          2,
          "Two different coached fighters must win a regional title defense after camp.",
        ),
      ],
    ],
  },
  scout: {
    description:
      "Find prospects across the divisions and prove your eye for talent through their careers. Only investigations and recruits made while this scout is employed count.",
    ranks: [
      [],
      [],
      [
        quest(
          "surveyDivisions",
          "Explore three weight classes",
          3,
          "Investigate prospects in three different divisions.",
        ),
        quest(
          "debutRecruits",
          "Get a recruit into the ring",
          1,
          "A fighter signed by this scout must complete a career debut.",
        ),
      ],
      [
        quest(
          "surveyDivisions",
          "Cover all four divisions",
          4,
          "Investigate at least one prospect in every weight class.",
        ),
        quest(
          "winningRecruits",
          "Find two winning recruits",
          2,
          "Two different fighters signed by this scout must win a career bout.",
        ),
      ],
      [
        quest(
          "surveyFamilies",
          "Build a complete scouting network",
          3,
          "Investigate striking, wrestling and submission specialists.",
        ),
        quest(
          "championDivisions",
          "Discover a regional champion",
          1,
          "A recruit signed by this scout must win an earned regional title bout.",
        ),
      ],
      [
        quest(
          "championDivisions",
          "Discover champions in two divisions",
          2,
          "Recruits signed by this scout must win earned regional belts in two weight classes.",
        ),
        quest(
          "defendingRecruits",
          "Discover a lasting champion",
          1,
          "A recruit signed by this scout must successfully defend a regional belt.",
        ),
      ],
    ],
  },
};

function staffProgress(staff, role) {
  const metrics =
    role === "coach"
      ? ["trainingWeeks", "campsCompleted"]
      : ["investigations", "signings"];
  const baseline =
    role === "coach"
      ? [
          [0, 0],
          [0, 0],
          [4, 1],
          [12, 3],
          [24, 6],
          [40, 10],
        ]
      : [
          [0, 0],
          [0, 0],
          [4, 1],
          [10, 2],
          [20, 4],
          [36, 6],
        ];
  return Object.fromEntries(
    metrics.map((id, i) => [
      id,
      Math.max(
        0,
        Math.floor(
          Number(
            staff?.development?.[id] ??
              (staff && !staff.development ? baseline[staff.rank || 1][i] : 0),
          ) || 0,
        ),
      ),
    ]),
  );
}
const unique = (values) => new Set(values.filter(Boolean)).size;
const focusOf = (allocations) => {
  const entries = Object.entries(allocations || {}).sort((a, b) => b[1] - a[1]);
  return !entries.length || entries[0][1] === entries[1]?.[1]
    ? "balanced"
    : entries[0][0];
};
function recordedProof(staff, role, s) {
  const proof = staff?.development?.proof || {};
  const camps = [...(proof.camps || [])];
  const recruits = [...(proof.recruits || [])];
  // Old saves retain ranks. Recover only dated, verifiable work after hiring;
  // aggregate counters alone cannot establish a fighter's sporting achievement.
  for (const f of s?.fighters || []) {
    if (
      role === "coach" &&
      f.lastCamp?.weeks >= 3 &&
      f.lastCamp.completed >= f.lastCamp.weeks &&
      f.lastCamp.endedWeek > (staff?.hiredWeek ?? Infinity) &&
      !camps.some(
        (c) => c.fighterId === f.id && c.week === f.lastCamp.endedWeek,
      )
    )
      camps.push({
        fighterId: f.id,
        week: f.lastCamp.endedWeek,
        focus: focusOf(f.lastCamp.allocations),
      });
    if (
      role === "scout" &&
      f.history?.some(
        (h) => h.type === "signed" && h.week > (staff?.hiredWeek ?? Infinity),
      ) &&
      !recruits.includes(f.id)
    )
      recruits.push(f.id);
  }
  return { ...proof, camps, recruits };
}
function dossier(staff, role, s) {
  const proof = recordedProof(staff, role, s);
  const { camps, recruits } = proof;
  const fights = (s?.fights || []).filter(
    (b) =>
      b.status === "resolved" &&
      b.resolvedWeek >= (staff?.hiredWeek ?? Infinity),
  );
  const prepared = (b) =>
    camps.some(
      (c) =>
        c.fighterId === b.fighterId &&
        c.week <= (b.preparedWeek ?? b.resolvedWeek),
    );
  const recruited = (b) => recruits.includes(b.fighterId);
  const qualified = role === "coach" ? prepared : recruited;
  const wins = fights.filter((b) => b.result?.winner === "A" && qualified(b));
  const titles = wins.filter((b) => b.title && !b.vacantTitle);
  const division = (b) =>
    s.fighters.find((f) => f.id === b.fighterId)?.weightClass;
  return {
    campFighters: unique(camps.map((c) => c.fighterId)),
    focuses: unique(camps.map((c) => c.focus)),
    winningFighters: unique(wins.map((b) => b.fighterId)),
    championDivisions: unique(titles.map(division)),
    defendingFighters: unique(
      titles.filter((b) => b.wasChampion).map((b) => b.fighterId),
    ),
    teamTrophies: (s?.careerJourney?.attempts || []).filter(
      (a) =>
        a.status === "won" &&
        a.eventWeek >= (staff?.hiredWeek ?? Infinity) &&
        (a.fighterIds || []).filter((id) =>
          camps.some((c) => c.fighterId === id && c.week <= a.eventWeek),
        ).length >= 2,
    ).length,
    surveyDivisions: unique((proof.surveys || []).map((p) => p.division)),
    surveyFamilies: unique((proof.surveys || []).map((p) => p.family)),
    debutRecruits: unique(fights.filter(recruited).map((b) => b.fighterId)),
    winningRecruits: unique(wins.map((b) => b.fighterId)),
    defendingRecruits: unique(
      titles.filter((b) => b.wasChampion).map((b) => b.fighterId),
    ),
  };
}
function staffDevelopment(staff, role, s) {
  const spec = STAFF_DEVELOPMENT[role];
  const values = dossier(staff, role, s);
  const rank = staff ? staff.rank || 1 : 0;
  const ranks = spec.ranks.slice(1).map((requirements, i) => ({
    rank: i + 1,
    requirements: requirements.map((q) => ({
      ...q,
      current: values[q.id],
      complete: values[q.id] >= q.target,
    })),
  }));
  const requirements =
    ranks.find((r) => r.rank === rank + 1)?.requirements || [];
  return {
    progress: staffProgress(staff, role),
    description: spec.description,
    requirements,
    ranks,
    qualified: requirements.every((q) => q.complete),
  };
}
function creditStaffWork(s, role, metric, amount = 1, context) {
  const staff = s.staff[role];
  if (!staff) return;
  staff.development = { ...staff.development, ...staffProgress(staff, role) };
  staff.development[metric] += amount;
  if (staff.development.proof || context)
    staff.development.proof = recordedProof(staff, role, s);
  if (!context) return;
  const proof = (staff.development.proof ||= {
    camps: [],
    surveys: [],
    recruits: [],
  });
  if (metric === "campsCompleted" && context.camp.weeks >= 3) {
    proof.camps ||= [];
    if (
      !proof.camps.some(
        (c) => c.fighterId === context.fighter.id && c.week === s.week,
      )
    )
      proof.camps.push({
        fighterId: context.fighter.id,
        week: s.week,
        focus: focusOf(context.camp.allocations),
      });
  }
  if (metric === "investigations") {
    proof.surveys ||= [];
    if (!proof.surveys.some((p) => p.id === context.fighter.id))
      proof.surveys.push({
        id: context.fighter.id,
        division: context.fighter.weightClass,
        family: context.family,
      });
  }
  if (metric === "signings") {
    proof.recruits ||= [];
    if (!proof.recruits.includes(context.fighter.id))
      proof.recruits.push(context.fighter.id);
  }
}
module.exports = { STAFF_DEVELOPMENT, staffDevelopment, creditStaffWork };
