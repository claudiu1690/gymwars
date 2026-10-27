const {
  test,
  expect,
  fixture,
  login,
  goto,
  save,
  assertScreen,
} = require("./helpers.cjs");
const fs = require("node:fs");
const directory = "output/release-candidate-2026-10-16/ui";
fs.mkdirSync(directory, { recursive: true });

async function inspectText(page) {
  return page.evaluate(() => {
    const issues = [];
    for (const node of document.querySelectorAll(
      "main button, .career-main button, .auth-card button, .public-info-button",
    )) {
      const box = node.getBoundingClientRect(),
        css = getComputedStyle(node);
      if (
        !box.width ||
        !box.height ||
        css.visibility === "hidden" ||
        node.closest('[aria-hidden="true"], [inert]')
      )
        continue;
      const text = node.innerText.trim();
      if (!text || text.length < 3) continue;
      if (/Arial/.test(css.fontFamily) && css.borderTopStyle === "outset")
        issues.push({ type: "native-control", text: text.slice(0, 100) });
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const leaf = walker.currentNode;
        if (
          !leaf.textContent.trim() ||
          leaf.parentElement.closest("svg, [aria-hidden=true]")
        )
          continue;
        const range = document.createRange();
        range.selectNodeContents(leaf);
        for (const rect of range.getClientRects()) {
          if (!rect.width || !rect.height) continue;
          if (
            rect.left < box.left + 3 ||
            rect.right > box.right - 3 ||
            rect.top < box.top + 2 ||
            rect.bottom > box.bottom - 2
          )
            issues.push({
              type: "control-text-edge",
              text: text.slice(0, 100),
              leaf: leaf.textContent.trim().slice(0, 100),
              box: { width: box.width, height: box.height },
              rect: {
                left: rect.left - box.left,
                right: box.right - rect.right,
                top: rect.top - box.top,
                bottom: box.bottom - rect.bottom,
              },
            });
        }
      }
    }
    for (const node of document.querySelectorAll(
      "main p, main h2, main h3, main h4, .career-main p, .career-main h2, .career-main h3, .career-main h4",
    )) {
      const box = node.getBoundingClientRect();
      if (
        !box.width ||
        !box.height ||
        node.closest('[aria-hidden="true"], [inert]')
      )
        continue;
      let panel = node.parentElement;
      while (
        panel &&
        panel !== document.body &&
        parseFloat(getComputedStyle(panel).borderLeftWidth) < 0.5
      )
        panel = panel.parentElement;
      if (!panel || panel === document.body) continue;
      const boundary = panel.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue;
        if (
          rect.left < boundary.left + 2 ||
          rect.right > boundary.right - 2 ||
          rect.top < boundary.top + 1 ||
          rect.bottom > boundary.bottom - 1
        )
          issues.push({
            type: "panel-text-edge",
            text: node.textContent.trim().slice(0, 120),
            panel: panel.className,
            rect: {
              left: rect.left - boundary.left,
              right: boundary.right - rect.right,
              top: rect.top - boundary.top,
              bottom: boundary.bottom - rect.bottom,
            },
          });
      }
    }
    return issues;
  });
}

test("public information is branded, reachable without an account and signup policy links preserve the form", async ({
  page,
  context,
}) => {
  await page.goto("/register");
  await page.getByLabel("Gym name", { exact: true }).fill("My Future Corner");
  const popupPromise = context.waitForEvent("page");
  await page.getByRole("link", { name: "Terms of play", exact: true }).click();
  const popup = await popupPromise;
  await expect(popup.getByRole("heading", { level: 1 })).toHaveText(
    "Terms of play",
  );
  await expect(page.getByLabel("Gym name", { exact: true })).toHaveValue(
    "My Future Corner",
  );
  await popup.close();
  for (const [path, title] of [
    ["support", "Need a hand?"],
    ["privacy", "Privacy notice"],
    ["terms", "Terms of play"],
  ]) {
    await page.goto("/" + path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page).toHaveTitle(
      new RegExp(title.replace(/[?]/g, "\\?") + " · Gym Wars"),
    );
    await expect(page.locator("main")).toContainText("Digital Olive");
    await assertScreen(page);
    expect(await inspectText(page)).toEqual([]);
    await page.screenshot({
      path: `${directory}/${path}-${test.info().project.name}.png`,
      fullPage: true,
      scale: "css",
    });
  }
  await page.goto("/forgot-password");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  const input = page.getByLabel("Email", { exact: true });
  expect(
    await input.evaluate((el) => getComputedStyle(el).borderRadius),
  ).not.toBe("0px");
  await expect(
    page.getByRole("button", { name: "Request reset link", exact: true }),
  ).toBeVisible();
  await assertScreen(page);
  expect(await inspectText(page)).toEqual([]);
  await page.screenshot({
    path: `${directory}/recovery-${test.info().project.name}.png`,
    fullPage: true,
    scale: "css",
  });
});

test("game destinations keep styled controls and text inside their borders", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "team", "Wide WWWWWWWWWWWWWWWWW");
  await login(page, player);
  const before = await save(page);
  const findings = [];
  for (const path of [
    "",
    "/roster",
    "/fighter/starter",
    "/fights",
    "/booking/starter",
    "/gym/training/starter",
    "/gym/facilities",
    "/gym/staff",
    "/campaign",
    "/profile",
    "/gym-wars",
    "/achievements",
    "/shop",
    "/help",
  ]) {
    await goto(page, path);
    await page.evaluate(() => document.fonts.ready);
    await assertScreen(page);
    findings.push(
      ...(await inspectText(page)).map((issue) => ({
        path: path || "/home",
        ...issue,
      })),
    );
    const name = path ? path.slice(1).replaceAll("/", "-") : "home";
    await page.screenshot({
      path: `${directory}/${name}-${test.info().project.name}.png`,
      fullPage: true,
      scale: "css",
    });
  }
  fs.writeFileSync(
    `${directory}/findings-${test.info().project.name}.json`,
    JSON.stringify(findings, null, 2),
  );
  expect((await save(page)).career).toEqual(before.career);
  expect(findings).toEqual([]);
});

test("late-game panels, signature choices and booking dialogs keep readable text padding", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "late-grind");
  await login(page, player);
  const findings = [];
  for (const path of [
    "",
    "/fighter/starter",
    "/gym/training/starter",
    "/campaign",
    "/gym/staff",
    "/gym-wars?tab=club",
    "/gym-wars?tab=leaderboard",
    "/booking/starter?circuit=city",
  ]) {
    await goto(page, path);
    await assertScreen(page);
    findings.push(
      ...(await inspectText(page)).map((issue) => ({ path, ...issue })),
    );
    const name = path ? path.slice(1).replaceAll(/[^a-z-]/g, "-") : "home";
    await page.screenshot({
      path: `${directory}/late-${name}-${test.info().project.name}.png`,
      fullPage: true,
      scale: "css",
    });
  }
  await page.getByRole("button", { name: /^Book fight against / }).click();
  await expect(page).toHaveURL(/\/career\/bout\//);
  await assertScreen(page);
  findings.push(
    ...(await inspectText(page)).map((issue) => ({
      path: "/preparation",
      ...issue,
    })),
  );
  await page.screenshot({
    path: `${directory}/preparation-${test.info().project.name}.png`,
    fullPage: true,
    scale: "css",
  });
  fs.writeFileSync(
    `${directory}/late-findings-${test.info().project.name}.json`,
    JSON.stringify(findings, null, 2),
  );
  expect(findings).toEqual([]);
});

test("Digital Olive reports and privacy settings remain useful without configured mail", async ({
  page,
  request,
}) => {
  const player = await fixture(request);
  await login(page, player);
  await page.goto("/support");
  await page
    .getByRole("link", { name: "Open the report form", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tell us what needs work", exact: true }),
  ).toBeInViewport();
  await page
    .getByLabel("Your message", { exact: true })
    .fill(
      "Privacy request: please explain my stored game records. Reference detail: " +
        "W".repeat(90),
    );
  await page.getByRole("button", { name: "Save report", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved for Digital Olive" }),
  ).toBeVisible();
  await expect(page.locator(".help-reports")).toContainText("Privacy request:");
  await expect(page.locator(".career-help")).not.toContainText(
    "alpha review queue",
  );
  await assertScreen(page);
});
