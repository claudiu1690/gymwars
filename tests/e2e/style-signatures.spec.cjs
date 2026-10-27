const {
  test,
  expect,
  fixture,
  login,
  goto,
  save,
  api,
  stored,
  publish,
  assertScreen,
} = require("./helpers.cjs");
const {
  signatureChoicesFor,
  SIGNATURE_BY_ID,
} = require("../../consts/signatures");
const crypto = require("node:crypto"),
  path = require("node:path"),
  fs = require("node:fs");
const capture = async (page, name) => {
  fs.mkdirSync("output/style-signatures", { recursive: true });
  await page.screenshot({
    path: path.resolve(
      `output/style-signatures/${name}-${test.info().project.name}.png`,
    ),
    fullPage: true,
  });
};
async function choose(page, name) {
  await page
    .locator("button.signature-ability-card")
    .filter({ hasText: name })
    .click();
  await page
    .getByRole("button", { name: "Confirm signature", exact: true })
    .click();
  await expect(page.locator("article.signature-ability-card")).toHaveCount(1);
}

test("six fighter styles show their two specialties and shared Pace Keeper with matching art and no inspection costs", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "signature-styles");
  await login(page, player);
  const before = await save(page);
  for (const fighter of before.career.fighters) {
    const styleName =
      fighter.style === "bjj"
        ? "BJJ"
        : fighter.style
            .replaceAll("-", " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    await goto(page, "/fighter/" + fighter.id);
    await expect(
      page.getByRole("heading", {
        name: `${styleName} specialties`,
        exact: true,
      }),
    ).toBeVisible();
    const choices = page.locator("button.signature-ability-card");
    await expect(choices).toHaveCount(3);
    expect(
      await choices.evaluateAll((cards) =>
        cards.map((card) => card.dataset.ability),
      ),
    ).toEqual(signatureChoicesFor(fighter.style));
    await expect(
      page.getByText("Every fighting style", { exact: true }),
    ).toBeVisible();
    for (const image of await choices.locator("img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (el) =>
              el.complete &&
              el.naturalWidth === 384 &&
              el.naturalHeight === 384,
          ),
        )
        .toBe(true);
    }
    await assertScreen(page);
    if (["judo", "sambo"].includes(fighter.style))
      await capture(page, "choices-" + fighter.style);
  }
  // Reproduce a broad catalog from an older/mismatched projection. The actual
  // network response is still read-only; the UI must intersect it with style.
  await page.route("**/api/career", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    for (const f of body.career.fighters)
      f.signatureAccess.choiceIds = Object.keys(SIGNATURE_BY_ID);
    await route.fulfill({ response, json: body });
  });
  for (const fighter of before.career.fighters) {
    await page.goto(`/career/fighter/${fighter.id}`);
    const choices = page.locator("button.signature-ability-card");
    await expect(choices).toHaveCount(3);
    expect(
      await choices.evaluateAll((cards) =>
        cards.map((card) => card.dataset.ability),
      ),
    ).toEqual(signatureChoicesFor(fighter.style));
  }
  await page.unroute("**/api/career");
  const after = await save(page);
  expect(after.career.fighters).toEqual(before.career.fighters);
  expect(after.career.week).toBe(before.career.week);
  expect(after.career.cash).toBe(before.career.cash);
  expect(after.allowances).toEqual(before.allowances);
});

test("new style signatures reject forged cross-style picks, save permanently and show the short art tooltip", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "signature-styles");
  await login(page, player);
  const before = await save(page),
    fighter = before.career.fighters[0];
  const forged = await api(page, "/career/command", {
    id: crypto.randomUUID(),
    revision: before.revision,
    command: {
      type: "signature",
      fighterId: fighter.id,
      signatureId: "combat-sambo",
    },
  });
  expect(forged.status).toBe(409);
  expect(forged.value.error || forged.value.message).toMatch(/fighter's style/);
  expect((await save(page)).revision).toBe(before.revision);
  await goto(page, "/fighter/" + fighter.id);
  await page
    .locator("button.signature-ability-card[data-ability='slippery-guard']")
    .click();
  await page
    .getByRole("button", { name: "Keep choosing", exact: true })
    .click();
  expect((await save(page)).career.fighters[0].signatureId).toBeNull();
  await choose(page, "Slippery Guard");
  await page.reload();
  await expect(page.locator("article.signature-ability-card")).toHaveAttribute(
    "data-ability",
    "slippery-guard",
  );
  await expect(page.locator("button.signature-ability-card")).toHaveCount(0);
  await goto(page, "/roster");
  const badge = page.getByRole("button", {
    name: `${fighter.name} signature: Slippery Guard`,
    exact: true,
  });
  await badge.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  if (test.info().project.use.hasTouch) await badge.tap();
  else await badge.click();
  await expect(page.getByRole("tooltip")).toBeVisible();
  // A tap must stay readable beyond the mouse-leave hide delay.
  await page.waitForTimeout(300);
  await expect(page.getByRole("tooltip").locator("strong")).toHaveText(
    "Slippery Guard",
  );
  await expect(page.getByRole("tooltip").locator("span")).toHaveText(
    "+4% standing defense contest",
  );
  await capture(page, "chosen-style-tooltip");
  await page.keyboard.press("Escape");
  const after = await save(page);
  expect(after.career.fighters[0].signatureId).toBe("slippery-guard");
  expect(
    after.career.fighters[0].history.filter((h) => h.type === "signature"),
  ).toHaveLength(1);
  expect(after.career.cash).toBe(before.career.cash);
  expect(after.career.week).toBe(before.career.week);
  expect(after.allowances).toEqual(before.allowances);
  await assertScreen(page);
});

test("existing cross-style choices survive reload and explicit defense updates without changing fighters", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "signature-kept");
  await login(page, player);
  const before = await save(page),
    original = await stored(request, player);
  expect(original.defense.snapshot.combatVersion).toBe(5);
  await goto(page, "/fighter/featherweight");
  await expect(
    page.getByText(/Chosen before style specialties were introduced/),
  ).toBeVisible();
  await expect(page.locator("article.signature-ability-card")).toHaveAttribute(
    "data-ability",
    "chain-wrestling",
  );
  await expect(page.locator("button.signature-ability-card")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("article.signature-ability-card")).toHaveAttribute(
    "data-ability",
    "chain-wrestling",
  );
  await goto(page, "/gym-wars");
  await page
    .getByRole("button", { name: "Update team for new rules", exact: true })
    .click();
  const current = await stored(request, player),
    after = await save(page);
  expect(current.defense.snapshot.combatVersion).toBe(8);
  expect(
    current.defense.snapshot.lineup.map((f) => [
      f.id,
      f.signatureId,
      f.gameplan,
    ]),
  ).toEqual(
    original.defense.snapshot.lineup.map((f) => [
      f.id,
      f.signatureId,
      f.gameplan,
    ]),
  );
  expect(after.career.fighters).toEqual(before.career.fighters);
  expect(after.career.week).toBe(before.career.week);
  expect(after.career.cash).toBe(before.career.cash);
  expect(after.allowances).toEqual(before.allowances);
  await assertScreen(page);
});

test("new abilities are saved in four-fighter defense and accepted battle inputs with their art on the result", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "signature-equipped");
  await login(page, player);
  const before = await save(page);
  await publish(page);
  const published = (await stored(request, player)).defense.snapshot;
  await goto(page, "/gym-wars");
  await expect(
    page.locator(".gw-arena-team:not(.is-rival) .fighter-signature-badge"),
  ).toHaveCount(4);
  await page
    .getByRole("button", { name: "Play 4v4 · 1 token", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Gym Wars result", exact: true }),
  ).toBeVisible();
  const db = await stored(request, player),
    match = db.matches.at(-1);
  expect(match.result.combatVersion).toBe(8);
  expect(match.inputs.attacker.lineup.map((f) => f.signatureId)).toEqual(
    published.lineup.map((f) => f.signatureId),
  );
  expect(match.result.bouts).toHaveLength(4);
  const first = published.lineup.find(
    (f) => f.weightClass === match.result.bouts[0].weightClass,
  );
  const resultArt = page
    .getByRole("region", { name: "Gym Wars result", exact: true })
    .locator(".gw-recap-athlete:not(.is-rival) .fighter-signature-badge img");
  await expect(resultArt).toHaveAttribute(
    "src",
    `/art/abilities/${first.signatureId}.webp`,
  );
  await resultArt.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      resultArt.evaluate((el) => el.complete && el.naturalWidth === 384),
    )
    .toBe(true);
  await capture(page, "new-ability-war-result");
  await assertScreen(page);
});

test("a previously booked fight keeps its original rules and postpones only newly introduced choices", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "signature-old-booking");
  await login(page, player);
  const before = await save(page);
  expect(before.career.fights[0].combatVersion).toBe(5);
  await goto(page, "/fighter/starter");
  await expect(
    page.locator(
      "button.signature-ability-card[data-ability='slippery-guard']",
    ),
  ).toBeDisabled();
  await expect(
    page.locator("button.signature-ability-card[data-ability='pace-keeper']"),
  ).toBeEnabled();
  await expect(
    page.getByText(
      "Your booked fight keeps its original abilities. New specialties become available after fight night.",
      { exact: true },
    ),
  ).toBeVisible();
  await choose(page, "Pace Keeper");
  const after = await save(page);
  expect(after.career.fights).toEqual(before.career.fights);
  expect(after.career.fighters[0].signatureId).toBe("pace-keeper");
  expect(after.career.week).toBe(before.career.week);
  await assertScreen(page);
});

test("v7 bonuses show on permanent native choices and concise roster tooltips", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "signature-styles");
  await login(page, player);
  const before = await save(page);
  for (const [style, id, name, effect] of [
    [
      "muay-thai",
      "pressure-strikes",
      "Pressure Strikes",
      "+2% standing attack contest",
    ],
    [
      "wrestling",
      "chain-wrestling",
      "Chain Wrestling",
      "+6% takedown attack contest",
    ],
    [
      "bjj",
      "escape-artist",
      "Escape Artist",
      "+12% submission defense contest",
    ],
  ]) {
    const f = before.career.fighters.find((f) => f.style === style);
    await goto(page, "/fighter/" + f.id);
    await expect(
      page.locator(`[data-ability='${id}'] .signature-card-effect`),
    ).toHaveText(effect);
    await choose(page, name);
    await goto(page, "/roster");
    const badge = page.getByRole("button", {
      name: `${f.name} signature: ${name}`,
      exact: true,
    });
    await badge.scrollIntoViewIfNeeded();
    if (test.info().project.use.hasTouch) await badge.tap();
    else await badge.click();
    await expect(page.getByRole("tooltip").locator("span")).toHaveText(effect);
    await page.keyboard.press("Escape");
  }
  const after = await save(page);
  expect(after.career.week).toBe(before.career.week);
  expect(after.career.cash).toBe(before.career.cash);
  expect(after.allowances).toEqual(before.allowances);
});

test("a v6 booked signature keeps its original bonus and permanent ID after the v7 update", async ({
  page,
  request,
}) => {
  const player = await fixture(request, "signature-v6-booking");
  await login(page, player);
  const before = await save(page);
  await goto(page, "/fighter/starter");
  await expect(
    page.locator(
      "article.signature-ability-card[data-ability='chain-wrestling'] .signature-card-effect",
    ),
  ).toHaveText("+4% takedown attack contest");
  await expect(
    page.getByText(/Your booked fight keeps its original signature bonuses/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator("article.signature-ability-card .signature-card-effect"),
  ).toHaveText("+4% takedown attack contest");
  const after = await save(page);
  expect(after.career.fights).toEqual(before.career.fights);
  expect(after.career.fighters[0].signatureId).toBe("chain-wrestling");
  expect(
    after.career.fighters[0].history.filter((h) => h.type === "signature"),
  ).toHaveLength(1);
  expect(after.career.week).toBe(before.career.week);
  expect(after.allowances).toEqual(before.allowances);
  await assertScreen(page);
});
