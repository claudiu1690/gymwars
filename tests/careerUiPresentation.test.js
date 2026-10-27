const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const esbuild = require("../frontend/node_modules/esbuild");
const React = require("../frontend/node_modules/react");
const {
  renderToStaticMarkup,
} = require("../frontend/node_modules/react-dom/server");
const { StaticRouter } = require("../frontend/node_modules/react-router-dom");
const {
  createCareer,
  publicState,
  applyCommand,
  offers,
} = require("../engine/careerEngine");

// Render real components with isolated engine saves. This catches contracts and
// missing next actions without opening a browser or touching a player database.
require.extensions[".css"] = () => {};
require.extensions[".jsx"] = (module, filename) => {
  const code = esbuild.transformSync(fs.readFileSync(filename, "utf8"), {
    loader: "jsx",
    format: "cjs",
    jsx: "automatic",
  }).code;
  module._compile(code, filename);
};
require.cache[require.resolve("../frontend/src/api.js")] = {
  exports: {
    api: () => {
      throw new Error("Presentation tests must not call the API.");
    },
    getToken: () => null,
    setToken: () => {},
  },
};
require.cache[require.resolve("../frontend/src/auth.jsx")] = {
  exports: {
    useAuth: () => ({ gym: { _id: "presentation-gym" } }),
  },
};
const storage = new Map();
global.sessionStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};
const Home = require("../frontend/src/components/CareerHome.jsx").default;
const Fighter = require("../frontend/src/components/CareerFighter.jsx").default;
const Gym = require("../frontend/src/components/CareerGym.jsx").default;
const Development =
  require("../frontend/src/components/CareerDevelopment.jsx").default;
const {
  FightIntel,
  ContractFacts,
} = require("../frontend/src/components/FightMatchup.jsx");
const {
  CampPlanner,
} = require("../frontend/src/components/CareerTraining.jsx");
const TurnBar = require("../frontend/src/components/CareerTurnBar.jsx").default;
const {
  TeamCoverage,
  AllowanceLine,
} = require("../frontend/src/components/CareerAvailability.jsx");
const WarLineup = require("../frontend/src/components/WarLineup.jsx").default;
const WarResult = require("../frontend/src/components/WarResult.jsx").default;
const Scouting =
  require("../frontend/src/components/CareerScouting.jsx").default;
const Campaign =
  require("../frontend/src/components/CareerCampaign.jsx").default;
const Booking = require("../frontend/src/components/CareerBooking.jsx").default;
const CareerWars = require("../frontend/src/components/CareerWars.jsx").default;
const {
  AmbitionPanel,
  SignaturePicker,
} = require("../frontend/src/components/CareerIdentity.jsx");
const SignatureBadge =
  require("../frontend/src/components/SignatureBadge.jsx").default;
const CoachingPractice =
  require("../frontend/src/components/CareerCoachingPractice.jsx").default;
const { SIGNATURE_BY_ID } = require("../consts/signatures");
const {
  divisionCoverage,
  defenseMatches,
} = require("../frontend/src/careerCompetition.mjs");
const {
  TrainingDraftContext,
} = require("../frontend/src/TrainingDraftContext.jsx");
const { careerGuide } = require("../frontend/src/careerGuide.mjs");
const start = () =>
  createCareer({
    seed: "design-ui-presentation",
    name: "Plain Gym",
    style: "boxing",
  });
const render = (Component, props, draft = null, location = "/career") =>
  renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location },
      React.createElement(
        TrainingDraftContext.Provider,
        { value: { draft, setDraft: () => {} } },
        React.createElement(Component, props),
      ),
    ),
  );
const noop = () => {};

test("a fresh unblocked Home exposes the save-derived debut action", () => {
  const s = publicState(start());
  const html = render(Home, {
    s,
    guide: careerGuide(s),
    onAction: noop,
    onFighter: noop,
    onTraining: noop,
  });
  assert.equal(s.blocking, null);
  assert.match(html, /First, book your opening fight/);
  assert.match(html, /Choose my first opponent/);
  assert.match(html, /Resting this week/);
  assert.doesNotMatch(
    html,
    /Other gym activities|Team training →|Career circuit →|Daily ranked cards/,
  );
});

test("a saved zero-week camp is visibly assigned and keeps time manual", () => {
  let raw = start(),
    fighterId = raw.fighters[0].id;
  raw = applyCommand(raw, {
    type: "accept-offer",
    fighterId,
    offerId: offers(raw, raw.fighters[0])[0].offerId,
  });
  raw = applyCommand(raw, {
    type: "camp",
    fighterId,
    preset: "balanced",
    weeks: 1,
  });
  const s = publicState(raw),
    f = s.fighters[0];
  const html = render(Fighter, {
    s,
    f,
    onTraining: noop,
    onBook: noop,
    onFight: noop,
    onBrief: noop,
  });
  assert.match(html, /Camp assigned/);
  assert.match(html, /Review assigned camp/);
  assert.match(html, /End week to train/);
  assert.equal(raw.week, 0);
});

test("gym investment screen consumes real budget and room payoff contracts", () => {
  const raw = start();
  raw.boutsCompleted = 1;
  raw.cash = 10000;
  const s = publicState(raw);
  const html = render(Development, { s, command: noop });
  assert.match(html, /Cash remaining/);
  assert.match(html, /before future fight income/);
  assert.match(html, /What changes for/);
  assert.match(html, /estimated permanent gains/);
  assert.match(html, /CHALLENGE|CHAPTER/);
  const gym = render(Gym, {
    s,
    command: noop,
    openFighter: noop,
    onTraining: noop,
  });
  assert.match(gym, /Resting this week/);
});

test("resolved preparation comparison uses frozen fight values instead of later roster stats", () => {
  const s = publicState(start()),
    f = s.fighters[0],
    opponent = s.rivals[0];
  const b = {
    eventWeek: 0,
    status: "resolved",
    rounds: 3,
    readiness: { you: 55, them: 70 },
    preparation: {
      you: {
        effectiveStats: {
          striking: 77,
          grappling: 44,
          submissions: 33,
          conditioning: 55,
        },
        bonuses: [{ stat: "striking", value: 3, source: "camp" }],
      },
      them: {
        effectiveStats: {
          striking: 66,
          grappling: 22,
          submissions: 34,
          conditioning: 56,
        },
        bonuses: [],
      },
    },
  };
  const html =
    render(FightIntel, { s, f, opponent, bout: b }) +
    render(ContractFacts, {
      s,
      bout: { ...b, show: 250, winBonus: 250 },
      readiness: b.readiness.you,
    });
  assert.match(html, />77</);
  assert.match(html, /includes \+3 prep/);
  assert.match(html, /grappling: 44 vs 22/);
  assert.match(html, /55% ready/);
  assert.match(html, /FIGHT DATE/);
});

test("fresh training opens on the current rest plan and leaves every camp choice available", () => {
  storage.clear();
  const raw = start(),
    s = publicState(raw),
    f = s.fighters[0];
  const html = render(CampPlanner, {
    s,
    f,
    revision: 0,
    command: noop,
    onTraining: noop,
    onBook: noop,
  });
  assert.doesNotMatch(html, /PREVIEW — NOT ASSIGNED|No camp assigned/);
  assert.match(html, /Rest &amp; recover is set/);
  assert.match(html, /Current plan/);
  assert.match(html, /This week: Resting this week/);
  const turn = render(TurnBar, { s, onEndWeek: noop });
  assert.match(turn, /0<\/b> training/);
  assert.match(turn, /1<\/b> resting/);
  assert.doesNotMatch(turn, /camp is a preview/);
  assert.equal(raw.week, 0);
  assert.equal(raw.fighters[0].camp, null);
  const planButtons = [
    ...html.matchAll(/<button[^>]*class="tw-plan[^>]*>/g),
  ].map((match) => match[0]);
  assert.ok(planButtons.length >= 4);
  assert.ok(
    planButtons.filter((button) => button.includes('aria-pressed="true"'))
      .length === 1,
  );
  assert.ok(
    html.indexOf('class="tw-summary"') <
      html.indexOf('class="tw-panel tw-specialist-panel"'),
  );
});

test("assigned training view commits its state while End week stays available", () => {
  storage.clear();
  let raw = start();
  raw = applyCommand(raw, {
    type: "camp",
    fighterId: raw.fighters[0].id,
    preset: "pressure",
    weeks: 4,
  });
  const s = publicState(raw),
    f = s.fighters[0];
  const html = render(CampPlanner, {
    s,
    f,
    revision: 1,
    command: noop,
    onTraining: noop,
    onBook: noop,
  });
  assert.match(html, /This week: Camp assigned/);
  assert.match(html, /ASSIGNED · TIME PAUSED/);
  assert.match(html, /aria-label="Training choices"/);
  assert.match(html, /aria-label="Camp growth preview"/);
  assert.match(html, /Expected skill gains · full camp/);
  assert.match(html, /Change camp/);
  assert.match(html, /Rest instead/);
  assert.doesNotMatch(
    html,
    /Gains earned so far|0 \/ 4 weeks complete|READY FOR FIRST WEEK/,
  );
  assert.doesNotMatch(html, /PREVIEW — NOT ASSIGNED/);
  const turn = render(TurnBar, { s, onEndWeek: noop });
  assert.match(turn, /1<\/b> training/);
  assert.match(turn, /id="career-end-week"/);
  assert.doesNotMatch(turn, /class="career-turn-end" disabled/);
});

test("saved custom assignments retain allocations and duration on the floor; earned progress appears only after a played week", () => {
  storage.clear();
  const allocations = {
    striking: 40,
    grappling: 30,
    submissions: 20,
    conditioning: 10,
  };
  let raw = applyCommand(start(), {
    type: "camp",
    fighterId: "starter",
    preset: "pressure",
    weeks: 4,
    allocations,
  });
  let s = publicState(raw);
  let html = render(CampPlanner, {
    s,
    f: s.fighters[0],
    revision: 1,
    command: noop,
    onTraining: noop,
  });
  assert.match(html, /Custom training/);
  assert.match(html, /Striking <strong>40%/);
  assert.match(html, /<input(?=[^>]*value="40")(?=[^>]*disabled="")[^>]*>/);
  assert.match(html, /ASSIGNED · TIME PAUSED/);
  assert.match(html, /Estimated permanent gains/);
  assert.doesNotMatch(html, /Gains earned so far/);
  raw = applyCommand(raw, { type: "advance", confirmCosts: true });
  s = publicState(raw);
  html = render(CampPlanner, {
    s,
    f: s.fighters[0],
    revision: 2,
    command: noop,
    onTraining: noop,
  });
  assert.match(html, /Gains earned so far/);
  assert.match(html, /1 \/ 4 weeks complete/);
  assert.doesNotMatch(html, /ASSIGNED · TIME PAUSED/);
});

test("locker exposes management and history directly and signature requirements have actionable, independent completion states", () => {
  let raw = start();
  raw = applyCommand(raw, { type: "investigate", reportId: raw.board[0].id });
  raw = applyCommand(raw, { type: "sign", reportId: raw.board[0].id });
  const s = publicState(raw);
  for (const [campComplete, boutComplete] of [
    [false, false],
    [true, false],
    [false, true],
  ]) {
    const f = {
      ...s.fighters[0],
      signatureAccess: { eligible: false, campComplete, boutComplete },
    };
    const html = render(Fighter, {
      s,
      f,
      command: noop,
      onTraining: noop,
      onBook: noop,
    });
    assert.doesNotMatch(
      html,
      /<details|<summary|<select|debut remaining|Signature training:/,
    );
    assert.match(html, /<h3>Boxing specialties/);
    assert.match(html, /<h3>Career story &amp; history/);
    assert.match(html, /<h3>Roster management/);
    assert.match(html, /Finish one training camp/);
    assert.match(html, /Finish one career fight/);
    assert.match(html, /Win or lose. Practice fights do not count/);
    assert.equal(
      (html.match(/<b>Done<\/b>/g) || []).length,
      Number(campComplete) + Number(boutComplete),
    );
    const unlocks = html.match(
      /<ul class="gw-signature-unlocks">[\s\S]*?<\/ul>/,
    )[0];
    assert.equal(
      unlocks.includes('href="/career/gym/training/starter"'),
      !campComplete,
    );
    assert.equal(
      unlocks.includes('href="/career/booking/starter"'),
      !boutComplete,
    );
  }
});

test("completed booked camp defaults to recovery while keeping all training choices", () => {
  storage.clear();
  let raw = start(),
    fighterId = raw.fighters[0].id;
  raw = applyCommand(raw, {
    type: "accept-offer",
    fighterId,
    offerId: offers(raw, raw.fighters[0])[0].offerId,
  });
  raw = applyCommand(raw, {
    type: "camp",
    fighterId,
    preset: "pressure",
    weeks: 1,
  });
  raw = applyCommand(raw, {
    type: "advance",
    untilEvent: false,
    confirmCosts: true,
  });
  const s = publicState(raw),
    f = s.fighters[0];
  const html = render(CampPlanner, {
    s,
    f,
    revision: 2,
    command: noop,
    onTraining: noop,
    onBook: noop,
  });
  assert.match(html, /RESTING THIS WEEK/);
  assert.match(html, /Readiness after End week/);
  assert.match(html, /91%/);
  assert.match(html, /100%/);
  assert.match(html, /Striking drills/);
  assert.match(html, /Grappling drills/);
  assert.match(html, /Custom training/);
  assert.match(html, /BOOKED FIGHT/);
  assert.match(html, /Training and fight timeline/);
  assert.match(html, /Rest starts/);
  assert.match(html, /ready after recovery/);
});

test("a restored custom draft keeps exact allocations and remains a preview", () => {
  storage.clear();
  const s = publicState(start()),
    f = s.fighters[0];
  const draft = {
    week: s.week,
    weeks: 4,
    selected: "custom",
    edited: true,
    custom: {
      preset: "pressure",
      allocations: {
        striking: 50,
        grappling: 10,
        submissions: 20,
        conditioning: 20,
      },
    },
  };
  sessionStorage.setItem(
    `gw-camp-draft:presentation-gym:${f.id}`,
    JSON.stringify(draft),
  );
  const html = render(CampPlanner, {
    s,
    f,
    revision: 0,
    command: noop,
    onTraining: noop,
    onBook: noop,
  });
  assert.match(html, /Custom training/);
  assert.match(html, /Striking <strong>50%/);
  assert.match(html, /Grappling <strong>10%/);
  assert.match(html, /PREVIEW — NOT ASSIGNED/);
  assert.match(html, /Use preset allocation/);
  assert.equal(f.camp, null);
  storage.clear();
});

test("specialist duration previews show the total next-fight skill bonus for every length", () => {
  const s = publicState(start()),
    f = s.fighters[0];
  for (const [preset, skill] of [
    ["pressure", "Striking"],
    ["defense", "Grappling"],
  ]) {
    storage.clear();
    sessionStorage.setItem(
      `gw-camp-draft:presentation-gym:${f.id}`,
      JSON.stringify({
        week: s.week,
        weeks: 4,
        selected: preset,
        edited: true,
      }),
    );
    const html = render(CampPlanner, {
      s,
      f,
      revision: 0,
      command: noop,
      onTraining: noop,
    });
    for (const total of [3, 4, 5])
      assert.ok(
        html.includes(
          `class="tw-duration-payoff">+${total} ${skill} for next fight`,
        ),
      );
    assert.match(html, /including \+1 for finishing 4 weeks/);
    assert.match(html, /apply once, within 8 game weeks/);
    assert.doesNotMatch(html, /extra prep ·/);
    assert.equal(f.camp, null);
  }
  storage.clear();
});

test("allowance copy distinguishes ready weeks from bank capacity", () => {
  const allowance = {
    available: 8,
    maximum: 12,
    refill: 4,
    nextRefillAt: "2026-10-10T08:00:00.000Z",
  };
  const full = render(AllowanceLine, { allowance });
  assert.match(full, /8 career weeks ready/);
  assert.match(full, /Free weeks bank up to 12/);
  assert.match(full, /Real-time refill: \+4 weeks on/);
  assert.doesNotMatch(full, /8\/12/);
  const compact = render(AllowanceLine, { allowance, compact: true });
  assert.match(compact, />8 weeks ready<\/strong>/);
  assert.match(compact, /aria-label="8 career weeks ready/);
  assert.doesNotMatch(compact, /<small>/);
});

test("turn bar resolves only an intentional draft and suppresses it during due blockers", () => {
  storage.clear();
  const s = publicState(start()),
    f = s.fighters[0];
  const draft = {
    name: f.name,
    fighterId: f.id,
    canAssign: false,
    onAssign: noop,
  };
  const html = render(TurnBar, { s, onEndWeek: noop, onRestWeek: noop }, draft);
  assert.match(html, /camp is a preview/);
  assert.match(html, /disabled="">Assign camp/);
  assert.match(html, /Rest &amp; end week/);
  assert.match(html, /Review camp/);
  assert.match(html, /class="gw-plans-button" aria-haspopup="dialog"/);
  assert.match(html, /<dialog class="gw-game-dialog"/);
  assert.doesNotMatch(html, /<details|<summary|<select|<dialog[^>]* open/);
  s.fights.push({
    id: "due-ui",
    fighterId: f.id,
    status: "ready",
    eventWeek: 0,
  });
  const blocked = render(
    TurnBar,
    { s, onEndWeek: noop, onResolve: noop },
    draft,
  );
  assert.doesNotMatch(blocked, /camp is a preview/);
  assert.doesNotMatch(blocked, /id="career-end-week"/);
  assert.match(blocked, /class="career-turn-resolve">Fight night/);
  assert.match(blocked, /Finish fight night before/);
});

test("empty real-time week bank keeps team planning visible without permitting a turn", () => {
  const s = publicState(start());
  const allowance = {
    available: 0,
    maximum: 12,
    refill: 4,
    nextRefillAt: "2026-10-10T08:00:00.000Z",
  };
  const html = render(TurnBar, { s, allowance, onEndWeek: noop });
  assert.match(html, /0 weeks ready/);
  assert.match(html, /\+4 weeks on/);
  assert.match(html, /Real-time refill:/);
  assert.doesNotMatch(html, /id="career-end-week"/);
  assert.match(html, /class="gw-turn-free-play"/);
  assert.match(html, /Review your team while weeks refill/);
  assert.doesNotMatch(html, /mode=practice|Free practice|Spar now/);
  assert.match(html, /This week/);
  const home = render(Home, {
    s,
    allowances: { careerWeeks: allowance },
    guide: { kind: "advance", title: "End week", cta: "End week" },
    onAction: noop,
  });
  assert.match(home, /Your team plans are saved/);
  assert.match(home, /Review your team/);
  assert.doesNotMatch(home, />End week →<\/button>/);
});

test("four fighter coverage requires four distinct divisions and provides each missing recruitment route", () => {
  const s = publicState(start()),
    first = s.fighters[0];
  const duplicateDivision = Array.from({ length: 4 }, (_, index) => ({
    ...first,
    id: `same-${index}`,
  }));
  assert.equal(divisionCoverage(duplicateDivision).complete, false);
  assert.equal(divisionCoverage(duplicateDivision).covered, 1);
  const html = render(TeamCoverage, { fighters: duplicateDivision });
  assert.match(html, /1\/4/);
  assert.match(html, /scouting\?division=featherweight/);
  assert.match(html, /scouting\?division=middleweight/);
  assert.match(html, /scouting\?division=heavyweight/);
  assert.match(html, /Any rarity qualifies/);
  assert.doesNotMatch(html, /Find a missing division|Recruit this division/);
  assert.match(html, /Recruit for this weight class/);
  const lineup = render(WarLineup, {
    fighters: [first],
    choices: [first],
    selected: {},
    onChange: noop,
  });
  assert.equal((lineup.match(/Division missing/g) || []).length, 3);
});

test("scouting weight-class routes filter both cards and the active report without rerolling", () => {
  const s = publicState(start()),
    before = structuredClone(s);
  for (const division of [
    "featherweight",
    "lightweight",
    "middleweight",
    "heavyweight",
  ]) {
    const matches = s.board.filter(
      (report) => report.fighter.weightClass === division,
    );
    const html = render(
      Scouting,
      { s, command: noop },
      null,
      `/career/scouting?division=${division}`,
    );
    assert.equal(
      (html.match(/class="scout-prospect-card"/g) || []).length,
      matches.length,
    );
    for (const report of s.board.filter(
      (report) => report.fighter.weightClass !== division,
    ))
      assert.ok(
        !html.includes(`View ${report.fighter.name}`),
        "off-class prospect is excluded",
      );
    if (matches.length)
      assert.match(
        html,
        new RegExp(`${matches[0].fighter.name} scouting report`),
      );
    else assert.match(html, /No .* prospects on this week’s board/);
    assert.doesNotMatch(html, /<details|<summary/);
  }
  assert.deepEqual(
    s,
    before,
    "filtering is free and never changes reports or investigations",
  );
  assert.equal(
    (
      render(
        Scouting,
        { s, command: noop },
        null,
        "/career/scouting?division=invalid",
      ).match(/class="scout-prospect-card"/g) || []
    ).length,
    s.board.length,
  );
});

test("scouting compares only active teammates in the prospect's weight class", () => {
  let raw = start();
  const report = raw.board.find(
    (entry) => entry.fighter.weightClass !== raw.fighters[0].weightClass,
  );
  raw = applyCommand(raw, { type: "investigate", reportId: report.id });
  const s = publicState(raw),
    division = report.fighter.weightClass;
  const view = () =>
    render(
      Scouting,
      { s, command: noop },
      null,
      `/career/scouting?division=${division}`,
    );
  let html = view();
  let comparison = html
    .split('class="scout-comparison"')[1]
    .split('class="scout-decision"')[0];
  assert.match(comparison, /No .* teammate to compare yet/);
  assert.doesNotMatch(
    comparison,
    /Compare with your fighter|Above your fighter|Below your fighter/,
  );
  const same = {
    ...structuredClone(s.fighters[0]),
    id: "same-class",
    name: "Same Class Sam",
    weightClass: division,
  };
  s.fighters.push(same, {
    ...same,
    id: "retired-same",
    name: "Retired Wrong",
    retired: true,
  });
  comparison = view()
    .split('class="scout-comparison"')[1]
    .split('class="scout-decision"')[0];
  assert.match(comparison, /Same Class Sam/);
  assert.ok(!comparison.includes(s.fighters[0].name));
  assert.doesNotMatch(comparison, /Retired Wrong/);
});

test("booked training exposes the existing fight and rest remains a positive current plan", () => {
  storage.clear();
  let raw = start();
  raw = applyCommand(raw, {
    type: "accept-offer",
    fighterId: raw.fighters[0].id,
    offerId: offers(raw, raw.fighters[0])[0].offerId,
  });
  const s = publicState(raw),
    f = s.fighters[0];
  storage.set(
    `gw-camp-draft:presentation-gym:${f.id}`,
    JSON.stringify({
      week: s.week,
      selected: "recover",
      weeks: 1,
      edited: true,
    }),
  );
  const html = render(CampPlanner, {
    s,
    f,
    revision: 1,
    command: noop,
    onTraining: noop,
    onBook: noop,
  });
  assert.match(html, /Rest &amp; recover is set/);
  assert.match(html, /Current plan/);
  assert.match(html, /View booked fight/);
  assert.doesNotMatch(html, /Find a fight|No camp assigned|<details|<summary/);
  assert.equal(raw.week, 0);
  assert.equal(raw.fighters[0].camp, null);
  storage.clear();
});

test("End week presents every fighter's frozen work and readiness in a dedicated result screen", () => {
  let raw = start();
  raw = applyCommand(raw, { type: "investigate", reportId: raw.board[0].id });
  raw = applyCommand(raw, { type: "sign", reportId: raw.board[0].id });
  raw.fighters[1].fatigue = 55;
  raw = applyCommand(raw, {
    type: "camp",
    fighterId: raw.fighters[0].id,
    preset: "pressure",
    weeks: 1,
  });
  raw = applyCommand(raw, { type: "advance", confirmCosts: true });
  const s = publicState(raw);
  const html = render(TurnBar, {
    s,
    showResults: true,
    onEndWeek: noop,
    onDismissResults: noop,
  });
  assert.match(
    html,
    /<dialog class="career-week-screen"[^>]*aria-labelledby="career-week-result-title"/,
  );
  assert.equal(
    (html.match(/class="career-turn-result-fighter"/g) || []).length,
    2,
  );
  assert.match(html, /Striking drills/);
  assert.match(html, /Rest &amp; recover/);
  assert.match(html, /45% → 63%/); // readiness, not fatigue
  assert.match(html, /Continue planning/);
  assert.doesNotMatch(html, /<details class="career-turn-result-events"/);
  // A later camp assignment must not rewrite what that fighter did last week.
  const restingRow = s.lastAdvance.fighters.find(
    (row) => row.id === s.fighters[1].id,
  );
  s.fighters[1].camp = {
    preset: "defense",
    allocations: s.rules.presets.defense.allocations,
    weeks: 4,
    completed: 0,
    endWeek: 5,
  };
  const again = render(TurnBar, { s, showResults: true });
  assert.equal(restingRow.activity, "rest");
  assert.match(again, /Rest &amp; recover/);
});

test("Career Path is a permanent navigation destination and its milestone details are visible", () => {
  const Chrome = require("../frontend/src/components/CareerChrome.jsx").default;
  const s = publicState(start());
  const nav = render(Chrome, {
    s,
    activePage: "campaign",
    go: noop,
    logout: noop,
  });
  assert.match(nav, /aria-current="page"[^>]*>.*?<span>Career Path<\/span>/);
  assert.doesNotMatch(nav, /aria-current="page"[^>]*>.*?<span>Home<\/span>/);
  const path = render(Campaign, { s });
  assert.ok(
    path.indexOf('class="career-path-hero"') <
      path.indexOf('class="campaign-roadmap"'),
  );
  assert.doesNotMatch(path, /campaign-stage-detail|Details &amp; reward/);
});

test("published state compares actual saved gameplans and skill inputs", () => {
  const s = publicState(start());
  const fighters = [
    "featherweight",
    "lightweight",
    "middleweight",
    "heavyweight",
  ].map((weightClass, index) => ({
    ...s.fighters[0],
    id: `division-${index}`,
    weightClass,
  }));
  const defense = { lineup: structuredClone(fighters) };
  assert.equal(defenseMatches(defense, fighters), true);
  const changedTactics = structuredClone(fighters);
  changedTactics[0].gameplan = { ...changedTactics[0].gameplan, tempo: "fast" };
  assert.equal(defenseMatches(defense, changedTactics), false);
  const changedSkills = structuredClone(fighters);
  changedSkills[0].stats.striking += 1;
  assert.equal(defenseMatches(defense, changedSkills), false);
});

test("Gym areas use reloadable routes and recruitment capacity exposes its resolution", () => {
  const s = publicState(start());
  const gym = render(Gym, {
    s,
    section: "facilities",
    command: noop,
    openFighter: noop,
    onTraining: noop,
  });
  assert.match(gym, /aria-current="page" href="\/career\/gym\/facilities"/);
  assert.match(gym, /href="\/career\/gym\/staff"/);
  assert.match(gym, /href="\/career\/gym\/mentoring"/);
  s.fighters = Array.from({ length: 4 }, (_, index) => ({
    ...s.fighters[0],
    id: `full-${index}`,
  }));
  const scouting = render(Scouting, { s, command: noop });
  assert.match(scouting, /Manage roster/);
  assert.match(scouting, /Expand gym/);
  const fighter = render(Fighter, { s, f: s.fighters[0] });
  assert.doesNotMatch(fighter, /your only lightweight fighter/);
  s.fighters[1].weightClass = "heavyweight";
  s.fighters = s.fighters.slice(0, 2);
  const last = render(Fighter, { s, f: s.fighters[0] });
  assert.match(last, /your only lightweight fighter/);
  assert.match(last, /Find a replacement/);
});

test("mentoring excludes pure drawbacks and labels situational commitment and funding", () => {
  const s = publicState(start()),
    mentor = s.fighters[0];
  const junior = {
    ...structuredClone(mentor),
    id: "lesson-junior",
    name: "Learning Fighter",
    age: 22,
  };
  mentor.age = 32;
  s.fighters.push(junior);
  const base = {
    mentorId: mentor.id,
    juniorId: junior.id,
    canStart: true,
    weeks: 4,
    chance: 0.6,
    budget: {
      commitmentCost: 80,
      availableCash: 20,
      bookedShowIncome: 0,
      funded: false,
      shortfall: 60,
    },
  };
  s.mentoringOptions = [
    { ...base, trait: "suspect-chin" },
    { ...base, trait: "fast-starter", traitKind: "situational" },
  ];
  const html = render(Gym, {
    s,
    section: "mentoring",
    command: noop,
    openFighter: noop,
    onTraining: noop,
  });
  assert.doesNotMatch(html, /Suspect chin/);
  assert.match(html, /Situational · changes how they fight/);
  assert.match(html, /Budget short by \$60/);
  assert.match(html, /Your other fighters can keep earning/);
  assert.match(html, /Their skills do not grow during the lesson/);
  assert.match(html, /Gym Wars remains available/);
});

test("defense verdict uses the owner's score and club labels immediately", () => {
  const s = publicState(start());
  const html = render(WarResult, {
    s,
    result: {
      direction: "defense",
      yourGym: "Attacking Club",
      opponent: "My Club",
      wins: 1,
      losses: 3,
      bouts: [],
    },
  });
  assert.match(html, /Your gym wins!/);
  assert.match(html, /My Club 3–1 Attacking Club/);
  assert.doesNotMatch(html, /Attacking Club 3–1 My Club/);
});

test("an old card's result distinguishes earned points from current club honors before bout details", () => {
  const s = publicState(start());
  const html = render(WarResult, {
    s,
    result: {
      yourGym: "My Club",
      opponent: "Rival Club",
      wins: 3,
      losses: 1,
      pointsEarned: 3,
      bouts: [
        {
          weightClass: "featherweight",
          you: "Alex",
          them: "Sam",
          result: { winner: "A", method: "KO" },
        },
      ],
    },
    clubProgress: {
      points: 17,
      nextMilestone: { points: 30, title: "Regional Power" },
    },
  });
  assert.match(html, /\+3 club points/);
  assert.match(html, /Current club honors:/);
  assert.match(html, /17\/30 permanent points · next: Regional Power/);
  assert.ok(
    html.indexOf("Current club honors:") <
      html.indexOf('class="war-bout-reveal"'),
  );
});

test("winning the Career Invitational leaves a concrete next challenge and reward", () => {
  const s = publicState(start());
  s.journey.complete = true;
  s.journey.postInvitationalChallenge = {
    name: "Academy Trophy",
    description: "Defeat the academy champion.",
    href: "/career/booking/starter",
    actionLabel: "Prepare the academy challenger",
    reward: { legacy: 40, trophy: "Academy Cup" },
  };
  const html = render(Campaign, { s, command: noop });
  assert.match(html, /Academy Trophy/);
  assert.match(html, /Defeat the academy champion/);
  assert.match(html, /Academy Cup · \+40 reputation/);
  assert.match(html, /Prepare the academy challenger/);
  assert.match(html, /3 fighters · 2 wins to claim the trophy/);
});

test("recovered week reports use the accepted receipt rather than a later team's turn", () => {
  let raw = start();
  raw = applyCommand(raw, {
    type: "camp",
    fighterId: raw.fighters[0].id,
    preset: "pressure",
    weeks: 1,
  });
  raw = applyCommand(raw, {
    type: "advance",
    untilEvent: false,
    confirmCosts: true,
  });
  const accepted = structuredClone(raw.lastAdvance);
  raw = applyCommand(raw, {
    type: "advance",
    untilEvent: false,
    confirmCosts: true,
  });
  const s = publicState(raw);
  const html = render(TurnBar, {
    s,
    reportOverride: accepted,
    showResults: true,
    onEndWeek: noop,
  });
  assert.match(html, /Previously saved week/);
  assert.match(html, /Camp complete/);
  assert.doesNotMatch(html, /Recovered this week/);
  assert.ok(html.includes(`+${accepted.fighters[0].gains.striking} Striking`));
  const legacyReport = structuredClone(accepted);
  delete legacyReport.fighters[0].outcome;
  const legacyHtml = render(TurnBar, {
    s,
    reportOverride: legacyReport,
    showResults: true,
  });
  assert.match(legacyHtml, /Result from this saved week/);
  assert.doesNotMatch(legacyHtml, /Recovered this week/);
});

test("booking keeps every opponent comparable and shows one selected contract and booking action", () => {
  const s = publicState(start()),
    f = s.fighters[0];
  const html = render(Booking, { s, f, command: noop });
  const cards =
    html.match(/<button[^>]+class="fight-offer-choice"[\s\S]*?<\/button>/g) ||
    [];
  assert.equal(cards.length, f.offers.length);
  for (const offer of f.offers) {
    const card = cards.find((candidate) =>
      candidate.includes("Review offer against " + offer.opponent.name),
    );
    assert.ok(card);
    assert.match(card, /<svg[^>]+career-face-crop/);
    assert.ok(
      card.includes(
        offer.notice +
          " " +
          (offer.notice === 1 ? "week" : "weeks") +
          " to prepare",
      ),
    );
    assert.ok(card.includes("$" + offer.show.toLocaleString("en-US")));
    assert.ok(card.includes("$" + offer.winBonus.toLocaleString("en-US")));
    if (offer.shortNotice) assert.match(card, /Short notice/);
  }
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((html.match(/aria-label="Book fight against/g) || []).length, 1);
  assert.match(html, /GUARANTEED PAY/);
  assert.match(html, /3 rounds/);
  assert.match(html, /Time moves only when you End week/);
  assert.doesNotMatch(html, /<select|<details|<summary|Book fight →/);
  f.offers = [f.offers.find((offer) => offer.shortNotice)];
  assert.match(
    render(Booking, { s, f, command: noop }),
    /Short-notice premium included/,
  );
});

test("booking presents a repeated scouting description once and preserves distinct story information", () => {
  const s = publicState(start()),
    f = s.fighters[0],
    offer = f.offers[0];
  offer.story =
    "Pushes striking at high pace.   The ground game is a weaker point.";
  offer.opponent.description =
    "Pushes striking at high pace. The ground game is a weaker point.";
  let html = render(Booking, { s, f, command: noop });
  assert.equal((html.match(/Pushes striking at high pace/g) || []).length, 1);
  assert.match(html, /The ground game is a weaker point/);
  offer.story = "A promoted circuit test against a local veteran.";
  html = render(Booking, { s, f, command: noop });
  assert.match(html, /A promoted circuit test against a local veteran/);
  assert.match(html, /Pushes striking at high pace/);
});

test("booking compares all skills once with your fighter always in the left value column", () => {
  const s = publicState(start()),
    f = s.fighters[0];
  f.stats = { striking: 48, grappling: 40, submissions: 38, conditioning: 45 };
  f.offers = [f.offers[0]];
  f.offers[0].opponent.stats = {
    striking: 51,
    grappling: 34,
    submissions: 38,
    conditioning: 46,
  };
  const html = render(Booking, { s, f, command: noop });
  assert.match(html, /<th scope="col">You<\/th><th scope="col">Opponent<\/th>/);
  assert.match(html, /Striking<\/th><td><b>48<\/b>[\s\S]*?<td><b>51<\/b>/);
  assert.match(html, /Grappling<\/th><td><b>40<\/b>[\s\S]*?<td><b>34<\/b>/);
  assert.equal((html.match(/>Striking<\/th>/g) || []).length, 1);
  assert.doesNotMatch(html, /Their danger|Your opening|Opponent details/);
});

test("booking keeps multi-fighter choice available without a redundant single-fighter chooser", () => {
  const s = publicState(start()),
    f = s.fighters[0];
  assert.doesNotMatch(
    render(Booking, { s, f, command: noop }),
    /Choose your fighter/,
  );
  s.fighters.push({
    ...structuredClone(f),
    id: "reserve",
    name: "Reserve Fighter",
  });
  const html = render(Booking, { s, f, command: noop });
  assert.match(html, /Choose your fighter/);
  assert.match(html, /Reserve Fighter/);
});

test("ranked results append sentence punctuation only when the scoring reason needs it", () => {
  const result = {
    yourGym: "My Club",
    opponent: "Rival Club",
    wins: 2,
    losses: 2,
    pointsEarned: 1,
    bouts: [],
  };
  for (const reason of [
    "Equal bout wins: team draw, 1 point",
    "Equal bout wins: team draw, 1 point.",
    "Equal bout wins: team draw, 1 point. ",
  ]) {
    const html = render(WarResult, {
      result: { ...result, pointsReason: reason },
    });
    assert.match(html, /Equal bout wins: team draw, 1 point\.<\/p>/);
    assert.doesNotMatch(html, /1 point\.\./);
  }
});

test("booking keeps blocked offers, title length and earned challenge prizes truthful", () => {
  const recovering = start();
  recovering.fighters[0].nextBoutWeek = 3;
  let s = publicState(recovering),
    f = s.fighters[0];
  const blocked = f.offers.find((offer) => offer.unavailable);
  assert.ok(blocked);
  const all = render(Booking, { s, f, command: noop });
  assert.match(all, /Unavailable · review why/);
  assert.match(all, /Next fight from/);
  assert.match(all, /sign a later fight now/);
  assert.doesNotMatch(
    all,
    /disabled="" aria-label="Book fight against/,
    "valid later offer is initially selected",
  );
  f.offers = [blocked];
  const blockedHtml = render(Booking, { s, f, command: noop });
  assert.match(blockedHtml, /Too soon after the last fight/);
  assert.match(blockedHtml, /disabled="" aria-label="Book fight against/);
  const earned = start();
  earned.fighters[0].record.wins = 4;
  earned.careerJourney.completedWeek = 0;
  earned.fighters[0].rankingPoints = 80;
  s = publicState(earned);
  f = s.fighters[0];
  const challenge = f.offers.find((offer) => offer.challengeReward);
  assert.ok(challenge);
  const title = f.offers.find((offer) => offer.title);
  assert.ok(title);
  const earnedHtml = render(Booking, { s, f, command: noop });
  assert.equal(
    (earnedHtml.match(/class="fight-offer-choice"/g) || []).length,
    3,
  );
  const challengeHtml = render(Booking, {
    s,
    f: { ...f, offers: [challenge] },
    command: noop,
  });
  assert.ok(
    challengeHtml.includes(
      "Challenge trophy: " + challenge.challengeReward.trophy,
    ),
  );
  assert.ok(
    challengeHtml.includes(
      "+" + challenge.challengeReward.legacy + " career reputation for a win",
    ),
  );
  f.offers = [title];
  assert.match(
    render(Booking, { s, f, command: noop }),
    /Championship bout · 5 rounds/,
  );
});

test("one Book fight action accepts the chosen contract and opens preparation without advancing time", async () => {
  const raw = start(),
    s = publicState(raw),
    f = s.fighters[0],
    offer = f.offers[1];
  let bookedId = null,
    saved = null;
  const props = {
    s,
    f,
    command: async (cmd) => {
      saved = applyCommand(raw, cmd);
      return { career: publicState(saved) };
    },
    onBooked: (id) => {
      bookedId = id;
    },
    onSelect: noop,
  };
  const slots = [];
  const dispatcher =
    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
      .ReactCurrentDispatcher;
  function screen() {
    let index = 0;
    const previous = dispatcher.current;
    dispatcher.current = {
      useState(initial) {
        const i = index++;
        if (!(i in slots)) slots[i] = initial;
        return [
          slots[i],
          (v) => {
            slots[i] = v;
          },
        ];
      },
      useRef(initial) {
        const i = index++;
        if (!(i in slots)) slots[i] = { current: initial };
        return slots[i];
      },
    };
    try {
      return Booking(props);
    } finally {
      dispatcher.current = previous;
    }
  }
  function find(node, label) {
    if (Array.isArray(node))
      return node.map((child) => find(child, label)).find(Boolean);
    if (!React.isValidElement(node)) return null;
    if (node.props["aria-label"] === label) return node;
    return React.Children.toArray(node.props.children)
      .map((child) => find(child, label))
      .find(Boolean);
  }
  find(screen(), "Review offer against " + offer.opponent.name).props.onClick();
  const button = find(screen(), "Book fight against " + offer.opponent.name);
  assert.ok(button, "selected opponent owns the single booking action");
  await button.props.onClick();
  assert.equal(saved.week, raw.week);
  assert.equal(saved.fights.length, 1);
  assert.equal(saved.fights[0].offerId, offer.offerId);
  assert.equal(saved.fights[0].eventWeek, offer.eventWeek);
  assert.equal(bookedId, saved.fights[0].id);
});

test("Gym Wars offers ranked gym competition without any individual or team practice entry point", () => {
  const s = publicState(start());
  const html = render(
    CareerWars,
    { s, revision: 0 },
    null,
    "/career/gym-wars?mode=practice",
  );
  assert.match(html, /RANKED · 4V4/);
  assert.doesNotMatch(html, /sparring|friendly|Free practice|Gym Wars mode/);
});

test("an unavailable chosen fighter ambition preserves history and offers only server-provided next actions", () => {
  const s = {
    ambition: {
      goalId: "first-belt",
      fighterId: "retired-alex",
      label: "Get Alex his first belt",
      status: "unavailable",
      progress: {
        current: 0,
        target: 1,
        label: "Alex retired before winning the belt",
      },
    },
    ambitionOptions: [
      {
        goalId: "first-belt",
        fighterId: "active-sam",
        label: "Get Sam his first belt",
        canSelect: true,
        progress: {
          current: 0,
          target: 1,
          label: "Sam is working toward a title",
        },
      },
    ],
  };
  const html = render(AmbitionPanel, { s, command: noop });
  assert.match(html, /Get Alex his first belt/);
  assert.match(html, /Choose another subject or goal/);
  assert.match(html, /Get Sam his first belt/);
  assert.doesNotMatch(html, /href=.*retired-alex|Claim|ACHIEVED/);
});

test("the selected ambition and every chooser option visibly explain the goal and payoff", () => {
  const raw = applyCommand(start(), {
    type: "select-ambition",
    goalId: "first-belt",
    fighterId: "starter",
  });
  const s = publicState(raw),
    html = render(AmbitionPanel, { s, command: noop });
  assert.equal(
    (html.match(/class="gw-ambition-description"/g) || []).length,
    s.ambitionOptions.length + 1,
  );
  assert.equal(
    (html.match(/class="gw-ambition-payoff"/g) || []).length,
    s.ambitionOptions.length + 1,
  );
  assert.match(html, /title-eligibility points/);
  assert.match(html, /book and win a regional championship bout/);
  assert.match(html, /0 \/ 1 belts won/);
  assert.match(html, /Featherweight, Lightweight, Middleweight, Heavyweight/);
  assert.match(html, /National Showcase pennant and \+35 reputation/);
});

test("all rarities use the same three style signature choices; scheduled fighters can equip and ready fighters cannot", () => {
  const f = {
    id: "fighter",
    name: "Alex",
    style: "boxing",
    signatureId: null,
    signatureAccess: {
      eligible: true,
      boutComplete: true,
      campComplete: true,
      locked: false,
    },
  };
  const s = {
    fights: [{ fighterId: f.id, status: "scheduled" }],
    rules: { signatures: SIGNATURE_BY_ID },
  };
  for (const rarity of [
    "journeyman",
    "prospect",
    "contender",
    "elite",
    "legend",
  ]) {
    const html = render(SignaturePicker, {
      s,
      f: { ...f, rarity },
      command: noop,
    });
    assert.equal((html.match(/aria-pressed="false"/g) || []).length, 3);
    assert.doesNotMatch(html, /disabled=""/);
    assert.match(html, /Finish attempts still cost the full amount/);
  }
  s.fights[0].status = "ready";
  const frozen = render(SignaturePicker, {
    s,
    f: { ...f, signatureAccess: { ...f.signatureAccess, locked: true } },
    command: noop,
  });
  assert.equal((frozen.match(/disabled=""/g) || []).length, 3);
  assert.match(frozen, /This bout keeps its saved signature/);
});

test("a chosen signature is one permanent illustrated card without clear or switching controls", () => {
  const s = publicState(start());
  const f = { ...s.fighters[0], signatureId: "escape-artist" };
  const html = render(SignaturePicker, { s, f, command: noop });
  assert.equal((html.match(/class="signature-ability-card"/g) || []).length, 1);
  assert.match(html, /<article[^>]*class="signature-ability-card"/);
  assert.match(html, /escape-artist.webp/);
  assert.match(html, /Permanent choice/);
  assert.match(html, /can’t change or remove/);
  assert.doesNotMatch(
    html,
    /Use no signature|Equip ability|Choose ability|Switching is free|can choose again/,
  );
});

test("full fighter cards show signature art only for a chosen valid ability", () => {
  const s = publicState(start());
  const f = { ...s.fighters[0], signatureId: "pace-keeper" };
  const html = render(SignatureBadge, {
    fighter: f,
    definitions: s.rules.signatures,
  });
  assert.match(html, /pace-keeper.webp/);
  assert.match(html, /signature: Pace Keeper/);
  assert.equal(
    render(SignatureBadge, { fighter: { ...f, signatureId: null } }),
    "",
  );
  assert.equal(
    render(SignatureBadge, {
      fighter: { ...f, signatureId: "forged-signature" },
    }),
    "",
  );
  const fighter = render(Fighter, {
    s: { ...s, fighters: [f] },
    f,
    command: noop,
  });
  assert.match(fighter, /class="fighter-signature-badge/);
});

test("film room refuses to offer a fabricated replay when the recorded inputs were pruned", () => {
  const s = {
    fighters: [{ id: "alex", name: "Alex", gameplan: {} }],
    fights: [{ id: "old-bout", status: "resolved", replayAvailable: false }],
  };
  const html = render(CoachingPractice, { s, revision: 1, roomId: "film" });
  assert.match(
    html,
    /older or pruned encounters cannot be recreated with current roster stats/,
  );
  assert.doesNotMatch(html, /Play film replay/);
  assert.match(
    html,
    /No career time, cash, permanent skills, records or ranked points change/,
  );
});

test("ambition choices close after an accepted selection or clear and stay open when saving fails", async () => {
  const option = {
    goalId: "first-belt",
    fighterId: "alex",
    label: "Win Alex a belt",
    canSelect: true,
  };
  const dispatcher =
    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
      .ReactCurrentDispatcher;
  const slots = [];
  const mount = (props) => {
    let index = 0;
    const previous = dispatcher.current;
    dispatcher.current = {
      useState(initial) {
        const slot = index++;
        if (!(slot in slots))
          slots[slot] = typeof initial === "function" ? initial() : initial;
        return [
          slots[slot],
          (value) => {
            slots[slot] =
              typeof value === "function" ? value(slots[slot]) : value;
          },
        ];
      },
      useRef(initial) {
        const slot = index++;
        if (!(slot in slots)) slots[slot] = { current: initial };
        return slots[slot];
      },
    };
    try {
      return AmbitionPanel(props);
    } finally {
      dispatcher.current = previous;
    }
  };
  const elements = (node, predicate) =>
    Array.isArray(node)
      ? node.flatMap((entry) => elements(entry, predicate))
      : React.isValidElement(node)
        ? [
            ...(predicate(node) ? [node] : []),
            ...elements(node.props.children, predicate),
          ]
        : [];
  const accepted = [];
  let response = { career: { ambition: option } };
  const props = {
    s: { ambition: { ...option, status: "active" }, ambitionOptions: [option] },
    command: async (payload) => {
      accepted.push(payload);
      if (response instanceof Error) throw response;
      return response;
    },
  };
  let tree = mount(props);
  const picker = (tree) =>
    elements(tree, (node) => node.type?.name === "GameDialog")[0];
  const openPicker = () => {
    tree = mount(props);
    elements(
      tree,
      (node) =>
        node.type === "button" && node.props.children === "Change club goal",
    )[0].props.onClick();
    tree = mount(props);
    assert.equal(picker(tree).props.open, true);
  };
  openPicker();
  await elements(
    tree,
    (node) => node.type === "button" && node.props["aria-pressed"] === true,
  )[0].props.onClick();
  assert.equal(picker(mount(props)).props.open, false);
  assert.deepEqual(accepted[0], {
    type: "select-ambition",
    goalId: "first-belt",
    fighterId: "alex",
  });
  openPicker();
  await elements(
    tree,
    (node) =>
      node.type === "button" && node.props.children === "Unpin club goal",
  )[0].props.onClick();
  assert.equal(picker(mount(props)).props.open, false);
  assert.deepEqual(accepted[1], { type: "clear-ambition" });
  response = false;
  openPicker();
  await elements(
    tree,
    (node) => node.type === "button" && node.props["aria-pressed"] === true,
  )[0].props.onClick();
  tree = mount(props);
  assert.equal(picker(tree).props.open, true);
  assert.match(
    elements(tree, (node) => node.props.role === "alert")[0].props.children,
    /Save not confirmed/,
  );
  response = new Error("Your career changed. Refresh before choosing.");
  await elements(
    tree,
    (node) => node.type === "button" && node.props["aria-pressed"] === true,
  )[0].props.onClick();
  assert.equal(picker(mount(props)).props.open, true);
  assert.equal(
    elements(mount(props), (node) => node.props.role === "alert")[0].props
      .children,
    response.message,
  );
});
