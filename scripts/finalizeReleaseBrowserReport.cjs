// Combine the complete browser matrix with its complete WebKit recheck. Every
// scenario must have a passing final result; no errors or tests are discarded.
const fs = require("node:fs"), assert = require("node:assert/strict");
const originalPath = "output/release-final/full-matrix-before-webkit-settle.json";
const followupPath = "output/e2e/results.json";
const original = JSON.parse(fs.readFileSync(originalPath, "utf8"));
const followup = JSON.parse(fs.readFileSync(followupPath, "utf8"));
assert.equal(followup.stats.unexpected, 0, "WebKit recheck must pass");
assert.equal(followup.stats.skipped, 0, "WebKit recheck must not skip coverage");
assert.ok(new Date(followup.stats.startTime) > new Date(original.stats.startTime));
function cases(suites, ancestry = [], rows = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) for (const test of spec.tests || []) {
      const key = JSON.stringify([test.projectName, spec.file, ...ancestry, spec.title]);
      const last = test.results.at(-1);
      rows.push({ key, project: test.projectName, file: spec.file, title: spec.title, expected: test.expectedStatus, status: last.status, errors: last.errors?.length || 0 });
    }
    cases(suite.suites, [...ancestry, suite.title], rows);
  }
  return rows;
}
const baseline = cases(original.suites), final = new Map(baseline.map((row) => [row.key, row]));
const rechecked = cases(followup.suites);
assert.ok(rechecked.length > 0);
assert.ok(rechecked.every((row) => row.project === "phone-webkit"));
assert.equal(rechecked.length, baseline.filter((row) => row.project === "phone-webkit").length, "Recheck the entire WebKit matrix");
for (const row of rechecked) {
  assert.ok(final.has(row.key), "Rechecked scenario belongs to the complete matrix");
  final.set(row.key, row);
}
for (const row of final.values()) {
  assert.equal(row.expected, "passed", row.title);
  assert.equal(row.status, "passed", row.title);
  assert.equal(row.errors, 0, row.title);
}
const report = {
  scope: "All distinct scenarios from the complete matrix, with final results from the complete WebKit rerun after synchronizing deliberate test document navigation. Original failing evidence is retained; browser-error assertions stay enabled. This is browser emulation, not physical-device testing.",
  completeMatrix: { file: originalPath, initiallyPassed: original.stats.expected, initiallyFailed: original.stats.unexpected, skipped: original.stats.skipped },
  webkitRecheck: { file: "output/release-final/webkit-final-results.json", passed: rechecked.length, skipped: 0 },
  final: { passed: final.size, failed: 0, skipped: 0 },
  projects: Object.fromEntries([...new Set([...final.values()].map((row) => row.project))].map((project) => [project, [...final.values()].filter((row) => row.project === project).length])),
};
fs.copyFileSync(followupPath, "output/release-final/webkit-final-results.json");
fs.writeFileSync("output/release-final/browser-coverage.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
