const Career = require("../models/careerModel");
const {
  beginFight,
  advanceRound,
  finishFight,
  liveSnapshot,
  CURRENT_FIGHT_VERSION,
  SUPPORTED_FIGHT_VERSIONS,
} = require("../engine/fightEngine");
const { automatic } = require("../engine/careerEngine");
const { normalizeSignature } = require("../consts/signatures");
const fail = (message, statusCode = 409) =>
  Object.assign(new Error(message), { statusCode, expose: true });
const clone = (value) => structuredClone(value);
const planKeys = ["approach", "pace", "finish", "conserveBelow"];

function validateCalls(calls, rounds) {
  if (calls === undefined) return [];
  if (!Array.isArray(calls) || calls.length > rounds)
    throw fail(`Choose at most ${rounds} round plans.`, 400);
  return calls.map((plan) => {
    if (
      !plan ||
      typeof plan !== "object" ||
      Array.isArray(plan) ||
      Object.keys(plan).some((key) => !planKeys.includes(key))
    )
      throw fail("Choose a valid round plan.", 400);
    if (
      (plan.approach !== undefined &&
        !["strike", "balanced", "grapple"].includes(plan.approach)) ||
      (plan.pace !== undefined &&
        !["high", "measured", "cautious"].includes(plan.pace)) ||
      (plan.finish !== undefined &&
        !["hunt-finish", "play-safe"].includes(plan.finish)) ||
      (plan.conserveBelow !== undefined &&
        ![0, 20, 30, 40, 50].includes(plan.conserveBelow))
    )
      throw fail("Choose a valid round plan.", 400);
    return clone(plan);
  });
}
function requireRevision(career, revision) {
  if (!career) throw fail("Start a career first.", 404);
  if (!Number.isSafeInteger(revision) || revision < 0)
    throw fail("Your current career revision is required.", 400);
  if (career.revision !== revision)
    throw fail("Your career changed. Refresh before practicing.");
}
function visibleInput(input) {
  const { traits, ...visible } = clone(input);
  return visible;
}
function playScenario(inputs, seed, combatVersion, calls, decisions = []) {
  const state = beginFight({
    ...clone(inputs),
    seed,
    engineVersion: combatVersion,
  });
  while (!state.outcome && state.round < state.rounds) {
    const index = state.round;
    const recorded = decisions[index];
    state.A.gameplan = calls[index]
      ? automatic({ ...inputs.a.gameplan, ...calls[index] }, state.A)
      : recorded?.a
        ? clone(recorded.a)
        : automatic(inputs.a.gameplan, state.A);
    state.B.gameplan = recorded?.b
      ? clone(recorded.b)
      : automatic(inputs.b.gameplan, state.B);
    advanceRound(state);
  }
  return { result: finishFight(state), snapshot: liveSnapshot(state) };
}
function observations(result, snapshot) {
  return [
    `Your fighter finished round ${snapshot.round} with ${snapshot.A.gas}% gas and ${snapshot.A.health}% health.`,
    `Takedowns: your fighter ${result.totals.A.takedowns}, opponent ${result.totals.B.takedowns}.`,
    "Compare a different pace or approach using the same scenario. One result does not establish a guaranteed tactic.",
  ];
}
function roomScenario(career, body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw fail("Choose a coaching drill.", 400);
  requireRevision(career, body.revision);
  const drills = {
    striking: {
      department: "strikingBay",
      name: "Pressure sparring partner",
      style: "boxing",
      stats: { striking: 48, grappling: 35, submissions: 32, conditioning: 44 },
      plan: {
        approach: "strike",
        pace: "high",
        finish: "hunt-finish",
        conserveBelow: 30,
      },
      title: "Handle the pressure",
      description:
        "Test measured pacing or a ground approach against an aggressive striker.",
    },
    grappling: {
      department: "grapplingLab",
      name: "Chain wrestling partner",
      style: "wrestling",
      stats: { striking: 34, grappling: 50, submissions: 44, conditioning: 38 },
      plan: {
        approach: "grapple",
        pace: "high",
        finish: "hunt-finish",
        conserveBelow: 20,
      },
      title: "Escape the chain",
      description:
        "Test defensive preparation, standing attacks and gas management against repeated takedowns.",
    },
    conditioning: {
      department: "conditioningStudio",
      name: "Distance sparring partner",
      style: "boxing",
      stats: { striking: 43, grappling: 40, submissions: 36, conditioning: 58 },
      plan: {
        approach: "balanced",
        pace: "measured",
        finish: "play-safe",
        conserveBelow: 40,
      },
      title: "Win the late rounds",
      description:
        "Compare high, measured and cautious pacing against a durable partner. Watch your gas after each round.",
    },
  };
  const drill = drills[body.roomId];
  if (!drill) throw fail("Choose an available coaching room.", 400);
  if (!(career.state.departments?.[drill.department] > 0))
    throw fail("Build this room to open its coaching drill.");
  const f = career.state.fighters.find(
    (fighter) =>
      fighter.id === body.fighterId && !fighter.retired && !fighter.released,
  );
  if (!f) throw fail("Choose an active fighter in your gym.", 400);
  const inputs = {
    rounds: 3,
    title: false,
    a: {
      name: f.name,
      style: f.style,
      stats: clone(f.stats),
      traits: clone(f.traits || []),
      fatigue: 0,
      signatureId: normalizeSignature(f.signatureId),
      gameplan: clone(f.gameplan),
    },
    b: {
      name: drill.name,
      style: drill.style,
      stats: clone(drill.stats),
      traits: [],
      fatigue: 0,
      gameplan: clone(drill.plan),
    },
  };
  const seed = `${body.roomId}-drill-v1:${career.gymId}:${f.id}`;
  const calls = validateCalls(body.roundCalls, inputs.rounds);
  const played = playScenario(inputs, seed, CURRENT_FIGHT_VERSION, calls);
  return {
    kind: "room-drill",
    roomId: body.roomId,
    fighterId: f.id,
    seed,
    combatVersion: CURRENT_FIGHT_VERSION,
    inputs: { ...inputs, a: visibleInput(inputs.a), b: visibleInput(inputs.b) },
    ...played,
    rewardless: true,
    lesson: {
      title: drill.title,
      description: `${drill.description} Fresh, isolated fighters; your career readiness, cash and record stay untouched.`,
      observations: observations(played.result, played.snapshot),
    },
  };
}
function canReplay(fight) {
  return (
    fight?.status === "resolved" &&
    !!fight.seed &&
    !!fight.inputs?.a &&
    !!fight.inputs?.b &&
    SUPPORTED_FIGHT_VERSIONS.includes(fight.combatVersion) &&
    [3, 5].includes(fight.rounds) &&
    Array.isArray(fight.decisions)
  );
}
function replayScenario(career, body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw fail("Choose a saved encounter.", 400);
  requireRevision(career, body.revision);
  if (!(career.state.departments?.filmRoom > 0))
    throw fail("Build the Film room to compare saved encounters.");
  const fight = career.state.fights.find((entry) => entry.id === body.fightId);
  if (!canReplay(fight))
    throw fail(
      "This encounter does not retain the original inputs, seed and fight rules needed for a faithful replay.",
    );
  const inputs = {
    a: clone(fight.inputs.a),
    b: clone(fight.inputs.b),
    rounds: fight.rounds,
    title: !!fight.title,
  };
  const calls = validateCalls(body.roundCalls, inputs.rounds);
  const played = playScenario(
    inputs,
    fight.seed,
    fight.combatVersion,
    calls,
    fight.decisions,
  );
  return {
    kind: "film-replay",
    fightId: fight.id,
    fighterId: fight.fighterId,
    seed: fight.seed,
    combatVersion: fight.combatVersion,
    inputs: { ...inputs, a: visibleInput(inputs.a), b: visibleInput(inputs.b) },
    ...played,
    rewardless: true,
    originalResult: clone(fight.result),
    lesson: {
      title: calls.length
        ? "Try another corner call"
        : "Your recorded encounter",
      description:
        "Original fighters, readiness, seed and combat rules. Alternative calls are practice; your recorded result and rewards stay unchanged.",
      observations: observations(played.result, played.snapshot),
    },
  };
}
function repository(Model = Career) {
  return {
    async room(gymId, body) {
      return roomScenario(await Model.findOne({ gymId }).lean(), body);
    },
    async replay(gymId, body) {
      return replayScenario(await Model.findOne({ gymId }).lean(), body);
    },
  };
}
module.exports = {
  ...repository(),
  repository,
  roomScenario,
  replayScenario,
  canReplay,
  validateCalls,
};
