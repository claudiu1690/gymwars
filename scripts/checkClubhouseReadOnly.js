const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs");
const assert = require("assert/strict");
const ui = process.env.PREVIEW_UI_URL || "http://127.0.0.1:5188";
const api = process.env.PREVIEW_API_URL || "http://127.0.0.1:4108";
(async () => {
  const browser = await chromium.launch({ headless: true }),
    errors = [],
    checks = [],
    contrast = [];
  try {
    for (const email of ["preview@gymwars.local", "new@gymwars.local"]) {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/career/command", (r) => {
        errors.push("Unexpected career write");
        return r.abort();
      });
      await page.route("**/career/exhibitions/battle", (r) => {
        errors.push("Unexpected battle");
        return r.abort();
      });
      await page.goto(ui + "/login");
      await page.getByLabel("Email", { exact: true }).fill(email);
      await page
        .getByLabel("Password", { exact: true })
        .fill("gymwars-preview");
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await page.locator(".game-hud").waitFor();
      const read = () =>
        page.evaluate(
          async (api) =>
            (
              await fetch(api + "/career", {
                headers: {
                  Authorization: "Bearer " + localStorage.getItem("gw_token"),
                },
              })
            ).json(),
          api,
        );
      const before = await read(),
        s = before.career,
        fighter = s?.fighters.find((f) => !f.retired && !f.released),
        bout = s?.fights[0];
      const routes = s
        ? [
            "",
            "roster",
            "gym-wars",
            "gym",
            "gym/staff",
            "gym/facilities",
            "gym/mentoring",
            "gym/history",
            "fights",
            "rankings",
            "campaign",
            "scouting",
            "fighter/" + fighter.id,
            "gym/training/" + fighter.id,
            "booking/" + fighter.id,
            ...(s.lastAdvance ? ["gym/week-report/" + fighter.id] : []),
            ...(bout ? ["bout/" + bout.id, "fight-night/" + bout.id] : []),
          ]
        : [""];
      for (const route of routes.filter(
        (route) =>
          !process.env.SCREEN_ROUTES ||
          process.env.SCREEN_ROUTES.split(",").includes(route),
      )) {
        await page.goto(ui + "/career/" + route);
        await page.locator(".game-hud").waitFor();
        await page.waitForTimeout(120);
        assert.doesNotMatch(
          await page.locator("main").innerText(),
          /NaN|undefined/,
        );
        for (const width of [1440, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => {
            window.scrollTo(0, 0);
            return new Promise(requestAnimationFrame);
          });
          if (
            !(await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ))
          )
            errors.push(
              `${route} overflow ${width}: ` +
                JSON.stringify(
                  await page.evaluate(() =>
                    [...document.querySelectorAll("main *")]
                      .filter(
                        (e) => e.getBoundingClientRect().right > innerWidth,
                      )
                      .map((e) => [
                        e.className,
                        e.getBoundingClientRect().width,
                      ])
                      .slice(0, 10),
                  ),
                ),
            );
          if (width !== 320)
            await page.screenshot({
              path: `output/validation/clubhouse-${s ? "player" : "new"}-${route.replaceAll("/", "-") || "home"}-${width}.png`,
              fullPage: true,
            });
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
        const low = await page.evaluate(() => {
          const rgb = (x) => (x.match(/[\d.]+/g) || []).map(Number);
          const lum = (c) =>
            c
              .slice(0, 3)
              .map((v) => {
                v /= 255;
                return v <= 0.04045
                  ? v / 12.92
                  : Math.pow((v + 0.055) / 1.055, 2.4);
              })
              .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
          return [...document.querySelectorAll("main *")]
            .filter(
              (e) =>
                e.getClientRects().length &&
                [...e.childNodes].some(
                  (n) => n.nodeType === 3 && n.textContent.trim(),
                ) &&
                !e.closest("button:disabled"),
            )
            .flatMap((e) => {
              let p = e,
                bg;
              while (p) {
                let c = getComputedStyle(p);
                if (c.backgroundImage !== "none") return [];
                let v = rgb(c.backgroundColor);
                if (v.length === 3 || v[3] >= 0.95) {
                  bg = v;
                  break;
                }
                p = p.parentElement;
              }
              if (!bg) return [];
              let a = lum(rgb(getComputedStyle(e).color)),
                b = lum(bg),
                ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
              return ratio < 3
                ? [
                    {
                      text: e.textContent.trim().slice(0, 60),
                      class: e.className,
                      parent: e.parentElement.className,
                      ratio: +ratio.toFixed(2),
                    },
                  ]
                : [];
            });
        });
        contrast.push({ route, low });
        checks.push(`${email}:${route || "home"}`);
      }
      assert.deepEqual(await read(), before);
      console.log(
        JSON.stringify({
          email,
          revision: before.revision,
          week: s?.week,
          saveUnchanged: true,
        }),
      );
      await context.close();
    }
    fs.writeFileSync(
      `output/validation/clubhouse-readonly${process.env.SCREEN_ROUTES ? "-focused" : ""}.json`,
      JSON.stringify({ checks, errors, contrast }, null, 2),
    );
    console.log(
      JSON.stringify({
        checks: checks.length,
        errors,
        lowContrast: contrast.filter((x) => x.low.length),
      }),
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
