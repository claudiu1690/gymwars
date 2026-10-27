const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { repository, reasonFor } = require("../services/alphaAnalytics");
const { summarize } = require("../scripts/alphaReport");
test("opt-in analytics deduplicate accepted receipts and exclude free text and private fields", async () => {
  const saved = new Map(),
    Model = {
      async create(value) {
        const key = value.gymId + value.eventId;
        if (saved.has(key)) throw { code: 11000 };
        saved.set(key, value);
      },
    };
  const repo = repository(Model, {
      consent: async () => true,
      now: () => Date.parse("2026-10-13T12:00:00Z"),
    }),
    actor = { gymId: "gym", analyticsEnabled: false };
  await repo.visit(actor);
  assert.equal(saved.size, 0);
  actor.analyticsEnabled = true;
  await repo.visit(actor);
  await repo.visit(actor);
  assert.equal(saved.size, 1);
  const result = {
    acceptedAction: { type: "camp" },
    career: {
      week: 3,
      boutsCompleted: 0,
      facilityTier: 1,
      fighters: [{ weightClass: "lightweight" }],
    },
  };
  await repo.accepted(
    actor,
    { id: "saved-camp-123", command: { type: "camp" } },
    result,
  );
  await repo.accepted(
    actor,
    { id: "saved-camp-123", command: { type: "camp" } },
    { ...result, duplicate: true },
  );
  assert.equal(saved.size, 2);
  await repo.record(actor, "safe-test", "blocked", {
    reason: "budget",
    email: "secret@example.test",
    message: "secret",
    token: "secret",
    stats: { striking: 99 },
    action: "untrusted",
    week: Infinity,
  });
  assert.deepEqual(saved.get("gymsafe-test").details, { reason: "budget" });
  await repo.blocked(
    actor,
    { id: "blocked-123", command: { type: "advance" } },
    new Error("No career weeks ready"),
  );
  assert.equal([...saved.values()].at(-1).details.reason, "allowance");
  assert.equal(
    reasonFor(new Error("Your career changed in another request")),
    "save-conflict",
  );
});
test("return reports count eligible observed opt-in UTC cohorts without claiming retention for new gyms", () => {
  const event = (gymId, date, kind = "visit") => ({
    gymId,
    createdAt: new Date(date + "T12:00:00Z"),
    kind,
  });
  const report = summarize(
    [
      event("a", "2026-10-01"),
      event("a", "2026-10-02"),
      event("a", "2026-10-08"),
      event("b", "2026-10-13"),
      event("a", "2026-10-01", "first-result"),
    ],
    Date.parse("2026-10-13T13:00:00Z"),
  );
  assert.deepEqual(report.returnCohorts, [
    { day: 1, eligible: 1, returned: 1, rate: 100 },
    { day: 7, eligible: 1, returned: 1, rate: 100 },
    { day: 30, eligible: 0, returned: 0, rate: null },
  ]);
  assert.equal(report.funnel.find((x) => x.stage === "first-result").gyms, 1);
});
test("result lessons use saved readiness, preparation and each side’s recorded decisions; old missing fields stay missing", async () => {
  const { fightLessons } =
    await import("../frontend/src/fightPresentation.mjs");
  const bout = {
    status: "resolved",
    readiness: { you: 65, them: 100 },
    preparation: {
      you: { bonuses: [{ stat: "striking", value: 4 }] },
      them: { bonuses: [] },
    },
    decisions: [
      {
        a: { approach: "strike", pace: "high", finish: "hunt-finish" },
        b: { approach: "grapple", pace: "cautious", finish: "play-safe" },
      },
    ],
    roundSummaries: [{ A: { gasAfter: 15 }, B: { gasAfter: 60 } }],
    result: { winner: "B" },
  };
  const a = fightLessons(bout),
    b = fightLessons(bout, "B");
  assert.equal(a.length, 3);
  assert.match(a[0].value, /65/);
  assert.match(a[1].value, /\+4 striking/);
  assert.match(a[2].detail, /15%/);
  assert.match(b[2].value, /Grappling.*cautious/);
  assert.deepEqual(
    fightLessons({ status: "resolved", result: { winner: "A" } }),
    [],
  );
  assert.deepEqual(fightLessons({ ...bout, status: "live" }), []);
});
test("optional audio starts muted, persists controls, respects motion and stays silent on duplicate results", async () => {
  const previous = { window: global.window, localStorage: global.localStorage },
    data = new Map();
  let contexts = 0,
    oscillators = 0;
  global.localStorage = {
    getItem: (k) => data.get(k),
    setItem: (k, v) => data.set(k, v),
  };
  class Audio {
    constructor() {
      contexts++;
      this.state = "running";
      this.currentTime = 1;
    }
    createOscillator() {
      oscillators++;
      return {
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    }
  }
  global.window = {
    AudioContext: Audio,
    dispatchEvent() {},
    matchMedia: () => ({ matches: false }),
  };
  try {
    const s = await import("../frontend/src/gameExperience.mjs");
    assert.equal(s.experienceSettings().sound, false);
    s.unlockSound();
    s.playSound("win");
    assert.equal(contexts, 0);
    s.saveExperience({ sound: true, reduceMotion: true });
    assert.equal(contexts, 1);
    assert.equal(s.reducedMotion(), true);
    s.acceptedSound({ command: { type: "advance" } }, { duplicate: true });
    assert.equal(oscillators, 0);
    assert.equal(s.playSound("win"), true);
    assert.equal(oscillators, 3);
      s.acceptedSound({command:{type:'advance'}},{duplicate:false});
      assert.equal(oscillators,6,'a quick accepted action must not lose its week cue to click throttling');
    s.saveExperience({ sound: false });
    assert.equal(s.playSound("loss"), false);
    assert.equal(s.experienceSettings().sound, false);
  } finally {
    global.window = previous.window;
    global.localStorage = previous.localStorage;
  }
});
test("production email fails without logging tokens, and verification ignores optional email opt-out", async () => {
  const email = require("../lib/email"),
    prior = {
      node: process.env.NODE_ENV,
      key: process.env.RESEND_API_KEY,
      log: console.log,
      send: email.sendEmail,
      account: email.sendAccountEmail,
    };
  const logs = [];
  try {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "";
    console.log = (...args) => logs.push(args.join(" "));
    await assert.rejects(
      email.sendEmail({
        to: "private@example.test",
        subject: "private-token",
        html: "private-token",
      }),
      (e) => e.code === "email_unavailable",
    );
    assert.deepEqual(logs, []);
    let delivered = 0;
    email.sendEmail = async () => {
      delivered++;
      return { id: "fixture" };
    };
    email.sendAccountEmail = async () => {
      throw new Error("Verification must use security delivery");
    };
    await require("../services/accountService").sendVerifyEmail({
      email: "fixture@example.test",
      notifications: { emailEnabled: false },
      save: async () => {},
    });
    assert.equal(delivered, 1);
  } finally {
    console.log = prior.log;
    email.sendEmail = prior.send;
    email.sendAccountEmail = prior.account;
    if (prior.node === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prior.node;
    if (prior.key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prior.key;
  }
});
test("Gym Wars takeaways receive only frozen public tactics, with no hidden values", () => {
  const { publicWarResult } = require("../services/careerWarPresentation");
  const fighter = {
    id: "owned",
    name: "Fighter",
    stats: { striking: 99 },
    traits: ["hidden"],
    gameplan: {
      approach: "grapple",
      pace: "measured",
      finish: "play-safe",
      conserveBelow: 30,
      secret: "hidden",
    },
  };
  const result = publicWarResult(
    { id: "accepted" },
    {
      attacker: { name: "Own", lineup: [fighter] },
      defender: { name: "Rival", lineup: [fighter] },
    },
  );
  fighter.gameplan.approach = "strike";
  assert.equal(result.teams.A.lineup[0].gameplan.approach, "grapple");
  assert.ok(!JSON.stringify(result).includes("hidden"));
  assert.ok(!JSON.stringify(result).includes("striking"));
});
test("revoking analytics during an in-flight write removes the late event", async () => {
  let consent = true,
    stored = false,
    deleted = 0;
  const Model = {
    async create() {
      stored = true;
      consent = false;
    },
    async deleteMany() {
      stored = false;
      deleted++;
    },
  };
  const repo = repository(Model, { consent: async () => consent });
  await repo.record(
    { id: "user", gymId: "gym", analyticsEnabled: true },
    "racing-event",
    "visit",
  );
  assert.equal(stored, false);
  assert.equal(deleted, 1);
});
