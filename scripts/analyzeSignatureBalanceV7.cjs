const fs = require("node:fs"),
  assert = require("node:assert/strict");
const folder = "output/signature-balance-v7";
const load = (file) => JSON.parse(fs.readFileSync(`${folder}/${file}`, "utf8"));
const comparisons = [];
let choiceFights = 0;
for (const build of ["broad", "specialist"]) {
  const old = load(`confirmed-${build}-v6.json`),
    now = load(`confirmed-${build}-v7.json`);
  assert.equal(old.combatVersion, 6);
  assert.equal(now.combatVersion, 7);
  for (const report of [old, now]) {
    assert.equal(report.matchups, 108);
    assert.equal(report.seedSalt, "v7-locked:");
    choiceFights += report.fights;
  }
  for (const current of now.summary) {
    const previous = old.summary.find((s) => s.style === current.style);
    const oldPace = previous.choices.find(
      (c) => c.signatureId === "pace-keeper",
    );
    const newPace = current.choices.find(
      (c) => c.signatureId === "pace-keeper",
    );
    for (const option of current.choices.filter(
      (c) => c.signatureId !== "pace-keeper",
    )) {
      const prior = previous.choices.find(
        (c) => c.signatureId === option.signatureId,
      );
      comparisons.push({
        build,
        style: current.style,
        id: option.signatureId,
        beforeVsPacePoints:
          (prior.meanHoldoutScoreShare - oldPace.meanHoldoutScoreShare) * 100,
        afterVsPacePoints:
          (option.meanHoldoutScoreShare - newPace.meanHoldoutScoreShare) * 100,
        uniqueBestBefore: prior.bestByMoreThanOnePoint,
        uniqueBestAfter: option.bestByMoreThanOnePoint,
        withinOnePointOfBest: option.withinOnePointOfBest,
      });
    }
  }
}
for (const row of comparisons.filter((r) => r.id === "pressure-strikes")) {
  assert.ok(
    row.afterVsPacePoints < 2.5 &&
      row.afterVsPacePoints < row.beforeVsPacePoints - 1,
  );
  assert.ok(row.uniqueBestAfter < row.uniqueBestBefore);
}
assert.ok(
  comparisons
    .filter((r) => r.id === "chain-wrestling")
    .every((r) => Math.abs(r.afterVsPacePoints) < 1.5),
);
assert.ok(
  comparisons
    .filter((r) => r.id === "escape-artist")
    .every((r) => Math.abs(r.afterVsPacePoints) < 1),
);
const roles = load("roles-free-chain-final.json"),
  balance = load("confirmed-balance.json");
const escape = roles.summary.filter(
  (r) => r.id === "escape-artist" && r.combatVersion === 7,
);
assert.ok(
  escape.find((r) => r.opponentRole === "submission hunter").meanVsPacePoints >
    2,
);
assert.ok(
  escape
    .filter((r) => r.opponentRole !== "submission hunter")
    .every((r) => r.meanVsPacePoints < 0),
);
assert.deepEqual(balance.warnings, []);
assert.ok(balance.stronger.every((r) => r.developedScoreShare > 0.65));
const report = {
  combatVersion: 7,
  changes: {
    "pressure-strikes": "2% standing attack, Strike/high pace",
    "escape-artist": "12% submission defense, play-safe",
    "chain-wrestling": "6% takedown attack, Grapple at any pace",
    "pace-keeper": "unchanged",
  },
  comparisons,
  studies: {
    choiceFights,
    choiceScope:
      "Four before/after reports, all six styles, 108 authored opposing setups per report, all 18 plans searched on 100 training seeds; chosen plans checked on 500 held-out seeds with mirrored corners. Final v7-locked seed family was not used to choose values. Opponent tactics use frozen v6 conditions in both generations.",
    pairedEffectFights: balance.fights,
    roleFights: roles.fights,
    warCards: balance.totalWarCards,
    warBouts: balance.totalWarBouts,
  },
  roles: roles.summary,
  developedScoreShareRange: [
    Math.min(...balance.stronger.map((r) => r.developedScoreShare)),
    Math.max(...balance.stronger.map((r) => r.developedScoreShare)),
  ],
  matchedWarScoreShareRange: [
    Math.min(...balance.wars.map((r) => r.scoreShare)),
    Math.max(...balance.wars.map((r) => r.scoreShare)),
  ],
  limitations:
    "Score-share differences are deterministic diagnostic cohorts, with draws counting half; they are not live win-rate forecasts or exhaustive equilibrium. Role probes guided the trigger refinement; independent final choice seeds followed. Prepared feature fixtures do not test organic economy pacing. Phone checks use emulation.",
};
if (process.argv.includes("--final")) {
  assert.match(
    fs.readFileSync(`${folder}/full-rules-final.log`, "utf8"),
    /# pass 447\r?\n# fail 0\r?\n# cancelled 0\r?\n# skipped 0/,
  );
  const initial = load("browser-full-before-fixture-fix.json");
  const followup = JSON.parse(
    fs.readFileSync("output/e2e/results.json", "utf8"),
  );
  assert.equal(followup.stats.unexpected, 0);
  assert.equal(followup.stats.skipped, 0);
  assert.ok(
    new Date(followup.stats.startTime) > new Date(initial.stats.startTime),
  );
  const cases = (suites, ancestry = [], rows = []) => {
    for (const suite of suites || []) {
      for (const spec of suite.specs || [])
        for (const test of spec.tests || []) {
          const result = test.results.at(-1);
          rows.push({
            key: JSON.stringify([
              test.projectName,
              spec.file,
              ...ancestry,
              spec.title,
            ]),
            project: test.projectName,
            expected: test.expectedStatus,
            status: result.status,
            errors: result.errors?.length || 0,
          });
        }
      cases(suite.suites, [...ancestry, suite.title], rows);
    }
    return rows;
  };
  const final = new Map(cases(initial.suites).map((row) => [row.key, row]));
  assert.equal(final.size, 192);
  const rechecked = cases(followup.suites);
  for (const row of rechecked) {
    assert.ok(final.has(row.key));
    final.set(row.key, row);
  }
  for (const row of final.values()) {
    assert.equal(row.expected, "passed");
    assert.equal(row.status, "passed");
    assert.equal(row.errors, 0);
  }
  const coverage = {
    scope:
      "192 distinct original cases, with final signature/booking rechecks after registering the old-v6-contract fixture and ensuring scheduled posters use accepted bonus values. Original evidence is retained; no test is dropped or assertion relaxed. Phone testing is emulation.",
    initial: {
      passed: initial.stats.expected,
      failed: initial.stats.unexpected,
      skipped: initial.stats.skipped,
    },
    rechecked: rechecked.length,
    final: { passed: 192, failed: 0, skipped: 0 },
    projects: Object.fromEntries(
      [...new Set([...final.values()].map((r) => r.project))].map((p) => [
        p,
        [...final.values()].filter((r) => r.project === p).length,
      ]),
    ),
  };
  fs.writeFileSync(
    `${folder}/browser-coverage.json`,
    JSON.stringify(coverage, null, 2),
  );
  const receipt = JSON.parse(
    fs.readFileSync(
      "output/release-final/preview-signature-balance-v-seven-receipt.json",
      "utf8",
    ),
  );
  assert.equal(receipt.collectionsCompared, 21);
  assert.deepEqual(receipt.changedDocumentCollections, []);
  assert.ok(receipt.stableKeyRetained && receipt.samePersistentDirectory);
  fs.copyFileSync("output/e2e/results.json", `${folder}/browser-followup.json`);
  report.verification = {
    rules: 447,
    browser: 192,
    skipped: 0,
    failures: 0,
    savedCollectionsUnchanged: 21,
    playerAccountUsedForTesting: false,
  };
}
fs.writeFileSync(`${folder}/comparison.json`, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      changes: report.changes,
      comparisons: comparisons.filter((r) =>
        ["pressure-strikes", "escape-artist", "chain-wrestling"].includes(r.id),
      ),
      studies: report.studies,
      verification: report.verification,
    },
    null,
    2,
  ),
);
