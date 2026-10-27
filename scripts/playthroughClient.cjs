const fs = require("node:fs"),
  path = require("node:path"),
  readline = require("node:readline");
const { chromium } = require("playwright");
const { folder, baseURL, email, password } = require("./playthroughConfig.cjs");
const authFile = path.join(folder, "browser.json");
let page, context, browser;
const seqFile=path.join(folder,"sequence.txt");
let sequence=fs.existsSync(seqFile)?Number(fs.readFileSync(seqFile,"utf8")):(fs.existsSync(path.join(folder,"actions.jsonl"))?fs.readFileSync(path.join(folder,"actions.jsonl"),"utf8").trim().split("\n").length:0);
let cachedState = null;
const log = (kind, data) => {
  fs.appendFileSync(
    path.join(folder, "actions.jsonl"),
    JSON.stringify({
      sequence: ++sequence,
      kind,
      realAt: new Date().toISOString(),
      ...data,
    }) + "\n",
  );
  fs.writeFileSync(seqFile,String(sequence));
};
async function state() {
  if (cachedState) return cachedState;
  const value = await page.evaluate(async () => {
    const token = localStorage.getItem("gw_token");
    if (!token) return null;
    const r = await fetch("/api/career", {
      headers: { Authorization: "Bearer " + token },
    });
    return { status: r.status, ...(await r.json()) };
  });
  if (value?.status === 429)
    throw new Error(
      "Test-driver read rate exceeded normal API limit; pause and resume without changing resources.",
    );
  if (value?.career) cachedState = value;
  return value;
}
async function checkpoint(label, shot = false, verbose = false) {
  const s = await state();
  if (s?.career)
    fs.writeFileSync(
      path.join(folder, "current.json"),
      JSON.stringify(s, null, 2),
    );
  const text = await page.locator("body").innerText();
  fs.writeFileSync(path.join(folder, "current-ui.txt"), text);
  log("checkpoint", {
    label,
    url: page.url(),
    revision: s?.revision,
    week: s?.career?.week,
    cash: s?.career?.cash,
    allowances: s?.allowances,
    roster: s?.career?.fighters
      ?.filter((f) => !f.retired && !f.released)
      .map((f) => ({
        id: f.id,
        name: f.name,
        rarity: f.rarity,
        weightClass: f.weightClass,
        age: f.age,
        stats: f.stats,
        fatigue: f.fatigue,
        record: f.record,
        camp: f.camp,
        rankingPoints: f.rankingPoints,
      })),
  });
  if (shot)
    await page.screenshot({
      path: path.join(
        folder,
        String(sequence).padStart(4, "0") +
          "-" +
          label.replace(/[^a-z0-9-]/gi, "-") +
          ".png",
      ),
      fullPage: true,
    });
  await context.storageState({ path: authFile });
  return {
    url: page.url(),
    revision: s?.revision,
    week: s?.career?.week,
    cash: s?.career?.cash,
    weeks: s?.allowances?.careerWeeks?.available,
    cards: s?.allowances?.leagueCards?.available,
    text: verbose ? text : text.slice(-650),
  };
}
function locate(c) {
  let target = c.selector
    ? page.locator(c.selector)
    : c.op === "fill" && c.label
      ? page.getByLabel(c.label, { exact: c.exact !== false })
      : page.getByRole(c.role || "button", {
          name: c.name,
          exact: c.exact !== false,
        });
  if (c.text) target = target.filter({ hasText: c.text });
  if (c.nth !== undefined) target = target.nth(c.nth);
  return target;
}
async function act(c) {
  log("action", { input: c });
  if (c.op === "inspect")
    return checkpoint(c.label || "inspect", !!c.shot, true);
  if (c.op === "state") return state();
  if (c.op === "register") {
    await act({ op: "goto", path: "/" });
    await page.locator(".landing-hero").getByRole("link", { name: "Start your gym", exact: true }).click();
    await page.getByLabel("Gym name", { exact: true }).fill(require("./playthroughConfig.cjs").gymName);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Open your gym", exact: true }).click();
    await page.waitForURL(/\/career/);
    await mutation(() => page.getByRole("button", { name: "Begin career", exact: true }).click());
    return checkpoint("fresh-normal-career", true);
  }
  if (c.op === "play") {
    const file = require.resolve("./playthroughPolicy.cjs");
    delete require.cache[file];
    return require(file)(
      { page, context, state, checkpoint, mutation, train, book, log, act },
      c.weeks || 4,
    );
  }
  if (c.op === "end") {
    for (let i = 0; i < (c.count || 1); i++) {
      await mutation(() =>
        page
          .getByRole("button", {
            name: "End week: advance exactly seven days and use one career week",
            exact: true,
          })
          .click(),
      );
      const closeReport = page.getByRole("button", { name: "Close week results", exact: true });
      if (await closeReport.isVisible()) await closeReport.click();
      await checkpoint("week-end");
    }
    return checkpoint("ended");
  }
  if (c.op === "train") {
    await train(c);
    return checkpoint("camp-assigned");
  }
  if (c.op === "book") {
    await book(c);
    return checkpoint("bout-booked");
  }
  if (c.op === "finish") {
    await page.goto("/career/fight-night/" + c.id);
    await mutation(() =>
      page.getByRole("button", { name: "Finish fight", exact: true }).click(),
    );
    return checkpoint("fight-result", true);
  }
  if (c.op === "goto") {
    cachedState = null;
    await page.goto("/" + c.path.replace(/^\//, ""));
  } else if (c.op === "click") {
    cachedState = null;
    await locate(c).click();
  } else if (c.op === "fill") await locate(c).fill(c.value);
  else if (c.op === "press") await page.keyboard.press(c.key);
  else if (c.op === "return") {
    const meta = JSON.parse(
      fs.readFileSync(path.join(folder, "host.json"), "utf8"),
    );
    const r = await context.request.post("/__playthrough/return", {
      headers: { "X-Playthrough-Key": meta.key },
      data: {},
    });
    if (!r.ok()) throw new Error(await r.text());
    log("return", await r.json());
    cachedState = null;
    await page.reload();
    if ((await state())?.status === 401 || new URL(page.url()).pathname === "/login") {
      await page.goto("/login");
      await page
        .getByLabel("Email", { exact: true })
        .fill(email);
      await page
        .getByLabel("Password", { exact: true })
        .fill(password);
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page.waitForURL(/\/career/);
    }
  } else if (c.op === "close") {
    if (process.env.GYMWARS_PLAYTHROUGH_TRACE === "1")
      await context.tracing.stop({ path: path.join(folder, "trace-" + sequence + ".zip") });
    await browser.close();
    process.exit(0);
  } else if (!["goto", "click", "fill", "press"].includes(c.op))
    throw new Error("Unknown browser operation");
  await page.waitForLoadState("networkidle");
  return checkpoint(c.label || c.op, !!c.shot);
}
async function mutation(action) {
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/career/") &&
      r.request().method() === "POST" &&
      !r.url().includes("forecast"),
  );
  const [, r] = await Promise.all([action(), response]);
  if (!r.ok())
    throw new Error("UI mutation " + r.status() + ": " + (await r.text()));
  const value = await r.json();
  cachedState = value.career ? { status: 200, ...value } : null;
  await page.waitForTimeout(180);
  return value;
}
async function train(c) {
  await page.goto("/career/gym/training/" + c.fighterId);
  if (c.fit) {
    const fit = page.getByRole("button", { name: /^Prepare for this fight/ });
    if (await fit.isVisible()) {
      await fit.click();
      await page.waitForLoadState("networkidle");
      const assign = page.getByRole("button", { name: /^Assign [1-6]-week camp$/ });
      if (await assign.isVisible()) {
        await mutation(() => assign.click());
        log("decision", { reason: "Use the visible fight-fit camp preview", fighter: c.fighterId });
      } else log("decision", { reason: "Visible fight-fit preview recommends recovery", fighter: c.fighterId });
      return;
    }
  }
  await page
    .locator(".tw-plan")
    .filter({ hasText: c.preset || "All-round training" })
    .click();
  if ((c.weeks || 1) > 1)
    await page
      .getByRole("button")
      .filter({ has: page.locator(".tw-duration-length") })
      .filter({ hasText: c.weeks + " weeks" })
      .click();
  await mutation(() =>
    page
      .getByRole("button", {
        name: "Assign " + (c.weeks || 1) + "-week camp",
        exact: true,
      })
      .click(),
  );
}
async function book(c) {
  const s = await state(),
    f = s.career.fighters.find((f) => f.id === c.fighterId),
    o = f.offers.find((o) => o.offerId === c.offerId);
  if (!o) throw new Error("Offer is no longer visible");
  await page.goto("/career/booking/" + f.id);
  await page
    .getByRole("button", {
      name: "Review offer against " + o.opponent.name,
      exact: true,
    })
    .click();
  await mutation(() =>
    page
      .getByRole("button", {
        name: "Book fight against " + o.opponent.name,
        exact: true,
      })
      .click(),
  );
  await page.waitForURL(/\/career\/bout\//);
  if (c.approach) {
    await page.getByRole("button", { name: c.approach, exact: true }).click();
    const button = page.getByRole("button", {
      name: "Save tactics",
      exact: true,
    });
    if (await button.isEnabled()) await mutation(() => button.click());
  }
}
async function run() {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1000 },
    ...(fs.existsSync(authFile) ? { storageState: authFile } : {}),
  });
  let nextApiRequest = 0;
  await context.route("**/api/**", async (route) => {
    const slot = Math.max(Date.now(), nextApiRequest);
    nextApiRequest = slot + 275;
    await new Promise((resolve) => setTimeout(resolve, slot - Date.now()));
    await route.continue();
  });
  page = await context.newPage();
  const navigate = page.goto.bind(page);
  page.goto = async (...args) => {
    const response = await navigate(...args);
    await page.waitForLoadState("networkidle");
    return response;
  };
  page.setDefaultTimeout(20000);
  if (process.env.GYMWARS_PLAYTHROUGH_TRACE === "1")
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  page.on("pageerror", (e) => log("browser-error", { message: e.message }));
  page.on("response", async (r) => {
    if (r.url().includes("/api/") && r.request().method() !== "GET") {
      let body;
      try {
        body = await r.json();
      } catch {}
      log("mutation", {
        path: new URL(r.url()).pathname,
        status: r.status(),
        input: r.request().postDataJSON(),
        result: body?.career ? { ...body, career: { ...body.career,
          rules: undefined, rivals: undefined,
          fighters: body.career.fighters.map(f=>({...f, offers:undefined, history:f.history?.slice(-2)})),
          fights: body.career.fights.filter(b=>b.status!=="resolved"||b.resolvedWeek===body.career.week).map(b=>({...b, result:b.result?{...b.result,rounds:undefined}:undefined})),
        }} : body,
      });
    }
  });
  await page.goto("/login");
  console.log(JSON.stringify({ ready: true, url: page.url() }));
  for await (const line of readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  })) {
    try {
      const out = await act(JSON.parse(line));
      console.log(JSON.stringify(out));
    } catch (e) {
      log("driver-error", { message: e.message });
      console.log(JSON.stringify({ error: e.message, url: page.url() }));
    }
  }
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
