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
const { CURRENT_FIGHT_VERSION } = require("../engine/fightEngine");

require.extensions[".css"] = () => {};
require.extensions[".jsx"] = (module, filename) => {
  module._compile(
    esbuild.transformSync(fs.readFileSync(filename, "utf8"), {
      loader: "jsx",
      format: "cjs",
      jsx: "automatic",
    }).code,
    filename,
  );
};
const FightNight =
  require("../frontend/src/components/CareerFightNight.jsx").default;
const noop = () => {};
const fixture = () => {
  let s = createCareer({
    seed: "fight-night-screen",
    name: "Test Corner",
    style: "boxing",
  });
  s = applyCommand(s, {
    type: "book",
    fighterId: s.fighters[0].id,
    opponentId: offers(s, s.fighters[0])[0].id,
    weeks: 1,
  });
  return applyCommand(s, { type: "advance", confirmCosts: true });
};
const propsFor = (raw, extra = {}) => {
  const s = publicState(raw);
  return {
    s,
    b: s.fights[0],
    command: noop,
    disabled: false,
    onDone: noop,
    onFight: noop,
    onRankings: noop,
    ...extra,
  };
};
const render = (props) =>
  renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location: "/career/fight-night" },
      React.createElement(FightNight, props),
    ),
  );

// A local hook dispatcher lets these tests call the real screen's handlers and
// retain their state. No DOM, network, player save or test-only production API.
function screen() {
  const slots = [];
  const dispatcher =
    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
      .ReactCurrentDispatcher;
  return (props) => {
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
      return FightNight(props);
    } finally {
      dispatcher.current = previous;
    }
  };
}
function elements(node, predicate) {
  if (Array.isArray(node))
    return node.flatMap((child) => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...elements(node.props.children, predicate),
  ];
}
const text = (node) =>
  Array.isArray(node)
    ? node.map(text).join("")
    : React.isValidElement(node)
      ? text(node.props.children)
      : node == null || typeof node === "boolean"
        ? ""
        : String(node);
const button = (tree, title) => {
  const found = elements(
    tree,
    (node) =>
      typeof node.props.onClick === "function" &&
      (node.props["aria-label"] === title || text(node) === title),
  )[0];
  assert.ok(found, `Missing action: ${title}`);
  return found;
};

test("opening screen leads with matchup, truthful condition and three calls before optional tactics", () => {
  const raw = fixture(),
    html = render(propsFor(raw));
  assert.equal(raw.fights[0].combatVersion, CURRENT_FIGHT_VERSION);
  assert.match(html, /Round 1/);
  assert.match(html, /Scored rounds won/);
  assert.match(html, /aria-valuenow="100"/);
  assert.equal((html.match(/class="fn-quick-call"/g) || []).length, 3);
  assert.match(html, /Less output · slower gas loss/);
  assert.match(html, /aria-haspopup="dialog"[^>]*>Set custom tactics/);
  assert.match(html, /<dialog class="gw-game-dialog"/);
  assert.doesNotMatch(html, /<details|<summary|<select|<dialog[^>]* open/);
  assert.ok(
    html.indexOf('class="fn-matchup"') < html.indexOf('class="fn-decision"'),
  );
  assert.ok(
    html.indexOf('class="fn-quick-calls"') <
      html.indexOf('class="fn-play-bar"'),
  );
  assert.match(html, /Play round 1/);
  assert.match(html, /Finish fight/);
  assert.match(html, /Career time stays here/);
});

test("quick calls and advanced choices feed exactly one current-version round, then retain the next-round call", async () => {
  let raw = fixture();
  const mount = screen(),
    accepted = [];
  const command = async (payload) => {
    accepted.push(structuredClone(payload));
    raw = applyCommand(raw, payload);
  };
  const props = () => propsFor(raw, { command });
  let tree = mount(props());
  const savedGasRule = raw.fights[0].savedPlan.conserveBelow;
  button(tree, "Work the feet").props.onClick();
  tree = mount(props());
  assert.equal(button(tree, "Work the feet").props["aria-pressed"], true);
  button(tree, "Set custom tactics").props.onClick();
  tree = mount(props());
  const fields = elements(tree, (node) => node.type?.name === "PlanFields")[0];
  assert.ok(fields, "all independent tactical choices remain available");
  assert.equal(
    fields.props.value.conserveBelow,
    savedGasRule,
    "quick calls preserve the saved coach gas rule",
  );
  const custom = {
    approach: "balanced",
    pace: "cautious",
    finish: "play-safe",
    conserveBelow: 40,
  };
  fields.props.onChange(custom);
  tree = mount(props());
  const play = button(tree, "Play round 1").props.onClick;
  await Promise.all([play(), play()]);
  assert.equal(
    accepted.length,
    1,
    "a second click cannot resolve a second round",
  );
  assert.deepEqual(accepted[0], {
    type: "round",
    fightId: raw.fights[0].id,
    expectedRound: 0,
    plan: custom,
  });
  assert.equal(raw.fights[0].decisions.length, 1);
  assert.equal(raw.fights[0].combatVersion, CURRENT_FIGHT_VERSION);
  assert.equal(raw.week, 1);
  tree = mount(props());
  assert.ok(button(tree, "Play round 2"));
  const html = render(props());
  assert.match(html, /Between rounds/);
  assert.match(html, /Switches to cautious pace below 40% gas/);
  assert.match(html, /Round 1 stats &amp; exchanges/);
  assert.match(html, /aria-valuenow="85"/);
  assert.match(html, /aria-valuenow="83"/);
  assert.equal(
    elements(tree, (node) => node.type?.name === "PlanFields")[0].props.value
      .conserveBelow,
    40,
  );
});

test("Finish fight keeps the current plan, expected round and coach gas rule", async () => {
  let raw = fixture();
  const mount = screen(),
    accepted = [];
  const command = async (payload) => {
    accepted.push(structuredClone(payload));
    raw = applyCommand(raw, payload);
  };
  let tree = mount(propsFor(raw, { command }));
  button(tree, "Save your gas").props.onClick();
  tree = mount(propsFor(raw, { command }));
  await button(tree, "Finish fight").props.onClick();
  assert.equal(accepted[0].type, "auto-fight");
  assert.equal(accepted[0].expectedRound, 0);
  assert.equal(accepted[0].plan.pace, "cautious");
  assert.equal(accepted[0].plan.finish, "play-safe");
  assert.equal(
    accepted[0].plan.conserveBelow,
    raw.fights[0].savedPlan.conserveBelow,
  );
  assert.equal(raw.fights[0].status, "resolved");
  assert.equal(raw.week, 1);
});

test("resolved screen uses recorded earnings, leads with verdict and routes to the next ready fighter", async () => {
  let raw = fixture();
  raw = applyCommand(raw, {
    type: "auto-fight",
    fightId: raw.fights[0].id,
    expectedRound: 0,
    plan: raw.fighters[0].gameplan,
  });
  const next = {
    ...structuredClone(raw.fighters[0]),
    id: "next-fighter",
    name: "Maya Next",
  };
  raw.fighters.push(next);
  raw.fights.push({
    ...structuredClone(raw.fights[0]),
    id: "next-bout",
    fighterId: next.id,
    status: "ready",
    decisions: [],
    result: null,
  });
  const routed = [];
  const props = propsFor(raw, { onFight: (id) => routed.push(id) });
  const html = render(props),
    before = structuredClone(raw);
  assert.match(
    html,
    new RegExp(`\\$${raw.fights[0].rewards.purse.toLocaleString("en-US")}`),
  );
  assert.ok(
    html.indexOf('aria-label="Fight result"') <
      html.indexOf('aria-label="Matchup and current condition"'),
  );
  assert.match(html, /Next fight · Maya Next/);
  assert.match(html, /id="fn-report-title"[^>]*>Fight stats/);
  assert.doesNotMatch(html, /<details|<summary/);
  assert.equal((html.match(/aria-label="Fight timeline"/g) || []).length, 1);
  assert.doesNotMatch(html, /All recorded exchanges|’s key moments/);
  const { fightReport } = require("../frontend/src/fightPresentation.mjs");
  const report = fightReport(props.b, {
    A: props.s.fighters[0].name,
    B: props.s.rivals.find((f) => f.id === props.b.opponentId).name,
  });
  const timeline = html.slice(html.indexOf('aria-label="Fight timeline"'));
  assert.equal(
    (timeline.match(/<time>/g) || []).length,
    report.groups.length,
    "every recorded exchange appears exactly once",
  );
  assert.equal(
    (timeline.match(/class="fn-key-moment"/g) || []).length,
    report.momentGroups.length,
  );
  assert.doesNotMatch(html, /class="fn-decision"/);
  const tree = screen()(props);
  button(tree, "Next fight · Maya Next").props.onClick();
  assert.deepEqual(routed, ["next-bout"]);
  assert.deepEqual(
    raw,
    before,
    "viewing a recorded result never replays combat or rewards",
  );
});

test("historical results do not invent condition, entry readiness, rewards or a turnaround date", () => {
  let raw = fixture();
  raw = applyCommand(raw, {
    type: "auto-fight",
    fightId: raw.fights[0].id,
    expectedRound: 0,
    plan: raw.fighters[0].gameplan,
  });
  const b = raw.fights[0];
  delete b.snapshot;
  delete b.readiness;
  delete b.preparation;
  delete b.rewards;
  delete b.purse;
  delete b.resolvedWeek;
  delete b.roundSummaries;
  delete b.result.roundSummaries;
  delete b.result.rounds;
  b.combatVersion = 1;
  const before = structuredClone(raw),
    html = render(propsFor(raw));
  assert.match(html, /Not recorded/);
  assert.match(html, /Entry readiness was not recorded/);
  assert.match(
    html,
    /Prepared skills were not recorded. Current roster skills shown/,
  );
  assert.match(html, /older result did not record a ranking delta/);
  assert.match(
    html,
    /Check your fighter’s current availability before booking again/,
  );
  assert.match(html, /The career result remains saved/);
  assert.doesNotMatch(html, /NaN|Invalid Date|undefined/);
  assert.deepEqual(raw, before);
});

test("fight night reads its frozen public signature instead of the fighter's current choice", () => {
  const raw = fixture();
  raw.fights[0].preparation.you.signatureId = "clean-combinations";
  raw.fights[0].preparation.them.signatureId = null;
  raw.fighters[0].signatureId = "pace-keeper";
  const props = propsFor(raw);
  assert.equal(
    Object.hasOwn(props.b, "inputs"),
    false,
    "private combat inputs are not part of the UI contract",
  );
  const html = render(props);
  assert.match(html, /Signature: Clean Combinations/);
  assert.doesNotMatch(html, /Signature: Pace Keeper/);
});
