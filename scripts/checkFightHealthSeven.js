// Read-only presentation fixtures. All identity and career reads are mocked;
// every career mutation is blocked, so this never changes a preview save.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const engine = require("../engine/careerEngine");
const url = process.env.PREVIEW_UI_URL || "http://127.0.0.1:5190";
const out = path.resolve(__dirname, "../output/validation");
const fighter = (name) => ({
  name,
  style: "boxing",
  stats: { striking: 65, grappling: 50, submissions: 45, conditioning: 60 },
  gameplan: { approach: "strike", pace: "measured", finish: "hunt-finish" },
});
function scenario(seed) {
  let s = engine.createCareer({ seed: "health-ui", name: "Fight Health QA" });
  s = engine.applyCommand(s, {
    type: "book",
    fighterId: "starter",
    opponentId: engine.offers(s, s.fighters[0])[0].id,
    weeks: 1,
  });
  s = engine.applyCommand(s, { type: "advance", confirmCosts: true });
  const fight = s.fights[0];
  fight.seed = seed;
  fight.inputs = { a: fighter("Alex"), b: fighter("Jonas") };
  s = engine.applyCommand(s, {
    type: "auto-fight",
    fightId: fight.id,
    expectedRound: 0,
  });
  return engine.publicState(s);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    checked = [];
  let view;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("gw_token", "read-only-ui-fixture"),
  );
  await page.route("**/gyms/identity", (route) =>
    route.fulfill({
      json: { gym: { _id: "health-ui", name: "Fight Health QA" } },
    }),
  );
  await page.route("**/career", (route) =>
    route.request().resourceType() === "fetch"
      ? route.fulfill({ json: { career: view, revision: 0 } })
      : route.continue(),
  );
  await page.route("**/career/command", (route) => {
    errors.push("Unexpected career mutation");
    return route.abort();
  });
  async function inspect(name, seed, amend = () => {}) {
    view = scenario(seed);
    amend(view.fights[0]);
    await page.goto(`${url}/career/fight-night/${view.fights[0].id}`);
    await page.getByLabel("Fight night", { exact: true }).waitFor();
    checked.push(name);
    return view.fights[0];
  }
  const corner = (side) =>
    page.getByRole("article", {
      name: side === "A" ? "Your corner" : "Opponent corner",
      exact: true,
    });
  async function health(side, expected) {
    assert.equal(
      await corner(side)
        .getByRole("meter", { name: "Health", exact: true })
        .getAttribute("aria-valuenow"),
      String(expected),
    );
  }
  try {
    fs.mkdirSync(out, { recursive: true });
    const legacy = await inspect(
      "Historical winning KO: opponent health 93 becomes 0",
      "terminal-0",
      (b) => {
        b.snapshot.B.health = 93;
      },
    );
    assert.equal(legacy.result.winner, "A");
    await health("B", 0);
    await health("A", 55);
    await corner("B").getByText("Knocked out · KO", { exact: true }).waitFor();
    assert.equal(
      await corner("A").getByText("Knocked out · KO", { exact: true }).count(),
      0,
    );
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `KO corner overflow at ${width}`,
      );
      if ([1440, 390].includes(width))
        await page
          .locator(".fight-night-corners")
          .screenshot({
            path: path.join(out, `review7-ko-corners-${width}.png`),
          });
    }
    assert.equal(
      legacy.snapshot.B.health,
      93,
      "Historical fixture must not be mutated",
    );
    await inspect(
      "Losing KO: your health 0, opponent health remains 96",
      "terminal-15",
    );
    await health("A", 0);
    await health("B", 96);
    await corner("A").getByText("Knocked out · KO", { exact: true }).waitFor();
    for (const [name, seed, value, status] of [
      ["TKO retains health", "terminal-31", 14, "Referee stoppage · TKO"],
      ["Submission retains health", "terminal-3", 72, "Submitted"],
      ["Decision retains health", "terminal-2", 45, null],
    ]) {
      await inspect(name, seed);
      await health("A", value);
      assert.equal(
        await page.getByText("Knocked out · KO", { exact: true }).count(),
        0,
      );
      if (status)
        await corner("A").getByText(status, { exact: true }).waitFor();
    }
    await inspect(
      "Missing historical snapshot: known KO state, unknown other meters",
      "terminal-0",
      (b) => {
        delete b.snapshot;
      },
    );
    await health("B", 0);
    await corner("A")
      .getByText("Health not recorded", { exact: true })
      .waitFor();
    assert.equal(
      await page.getByText("Gas not recorded", { exact: true }).count(),
      2,
    );
    assert.deepEqual(errors, []);
    const report = {
      checked,
      widths: [320, 390, 768, 1024, 1440],
      commands: 0,
      errors,
    };
    fs.writeFileSync(
      path.join(out, "review7-fight-health-check.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
