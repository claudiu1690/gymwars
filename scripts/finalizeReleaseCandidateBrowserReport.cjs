// Retain the complete matrix and replace only cases explicitly rechecked on a
// fresh disposable host. Every distinct release case must finish with a pass.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const directory = "output/release-candidate-2026-10-16";
const originalFile = `${directory}/browser-full-initial.json`;
const followupFile = `${directory}/browser-followup.json`;
const original = JSON.parse(fs.readFileSync(originalFile, "utf8"));
const followup = JSON.parse(fs.readFileSync("output/e2e/results.json", "utf8"));
assert.equal(followup.stats.unexpected, 0, "The fresh recheck must pass");
assert.equal(
  followup.stats.skipped,
  0,
  "The fresh recheck must not skip cases",
);
assert.equal(followup.errors.length, 0, "No browser runner errors");
assert.ok(
  new Date(followup.stats.startTime) > new Date(original.stats.startTime),
);

function cases(suites, ancestry = [], rows = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const last = test.results.at(-1);
        rows.push({
          key: JSON.stringify([
            test.projectName,
            spec.file,
            ...ancestry,
            spec.title,
          ]),
          project: test.projectName,
          file: spec.file,
          title: spec.title,
          expected: test.expectedStatus,
          status: last.status,
          errors: last.errors?.length || 0,
        });
      }
    }
    cases(suite.suites, [...ancestry, suite.title], rows);
  }
  return rows;
}

const baseline = cases(original.suites);
const final = new Map(baseline.map((row) => [row.key, row]));
assert.equal(
  final.size,
  baseline.length,
  "Release case identifiers must be unique",
);
const rechecked = cases(followup.suites);
assert.equal(
  rechecked.length,
  26,
  "Recheck all 20 visual cases and 6 selector/LAN cases",
);
for (const row of rechecked) {
  assert.ok(
    final.has(row.key),
    "Every rechecked case belongs to the full matrix",
  );
  final.set(row.key, row);
}
for (const row of final.values()) {
  assert.equal(row.expected, "passed", row.title);
  assert.equal(row.status, "passed", row.title);
  assert.equal(row.errors, 0, row.title);
}
const report = {
  scope:
    "Complete release matrix plus fresh targeted verification. No test or browser-error assertions removed. Phone results are browser emulation, not physical-device testing.",
  completeMatrix: {
    file: originalFile,
    passed: original.stats.expected,
    failed: original.stats.unexpected,
    skipped: original.stats.skipped,
  },
  findings: [
    "The old HQ descendant-image selector also matched the new crest; it now targets the HQ image directly, preserving its artwork assertion.",
    "The WebKit full-page screenshot exceeded the 32767-pixel image limit at device scale 2. All visual cases now capture at CSS resolution; layout assertions still inspect every element.",
    "LAN cases require explicit Wi-Fi address/subnet. All four now run through interface-bound HTTP proxies against isolated accounts.",
  ],
  recheck: {
    file: followupFile,
    passed: rechecked.length,
    failed: 0,
    skipped: 0,
  },
  final: { passed: final.size, failed: 0, skipped: 0 },
  projects: Object.fromEntries(
    [...new Set([...final.values()].map((row) => row.project))].map(
      (project) => [
        project,
        [...final.values()].filter((row) => row.project === project).length,
      ],
    ),
  ),
  finalCases: [...final.values()].map(({ key, ...row }) => row),
};
fs.copyFileSync("output/e2e/results.json", followupFile);
fs.writeFileSync(
  `${directory}/browser-coverage.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify({ ...report, finalCases: undefined }, null, 2));
