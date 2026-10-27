// Keep every scenario from the full matrix, including its original failures.
// Replace affected flows with their final phone/result checks, then replace the
// LAN setup failures with the same four cases run with the verified subnet.
const fs = require("node:fs"),
  assert = require("node:assert/strict");
const folder = "output/style-signatures";
const paths = [
  `${folder}/browser-full-before-result-art.json`,
  `${folder}/browser-final-followup.json`,
  `${folder}/browser-lan-final.json`,
];
const reports = paths.map((file) => JSON.parse(fs.readFileSync(file, "utf8")));
function cases(suites, ancestry = [], rows = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || [])
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
    cases(suite.suites, [...ancestry, suite.title], rows);
  }
  return rows;
}
const original = cases(reports[0].suites);
const final = new Map(original.map((row) => [row.key, row]));
assert.equal(final.size, 182, "Preserve all distinct full-matrix scenarios");
assert.equal(cases(reports[1].suites).length, 47);
assert.equal(cases(reports[2].suites).length, 4);
for (let i = 1; i < reports.length; i++) {
  assert.ok(
    new Date(reports[i].stats.startTime) >
      new Date(reports[i - 1].stats.startTime),
  );
  for (const row of cases(reports[i].suites)) {
    assert.ok(
      final.has(row.key),
      "Follow-up must belong to the original matrix",
    );
    final.set(row.key, row);
  }
}
for (const row of final.values()) {
  assert.equal(row.expected, "passed", row.title);
  assert.equal(row.status, "passed", row.title);
  assert.equal(row.errors, 0, row.title);
}
const report = {
  scope:
    "182 distinct full-matrix cases with affected-flow rechecks after fixing persistent touch tooltips and accepted-result signature art, plus the four LAN cases rerun with the verified subnet. Original failure evidence remains. Browser phone emulation and actual LAN-origin tests are not physical-device testing.",
  runs: reports.map((r, i) => ({
    file: paths[i],
    initiallyPassed: r.stats.expected,
    initiallyFailed: r.stats.unexpected,
    skipped: r.stats.skipped,
    interrupted: r.stats.interrupted,
  })),
  final: { passed: final.size, failed: 0, skipped: 0 },
  projects: Object.fromEntries(
    [...new Set([...final.values()].map((r) => r.project))].map((project) => [
      project,
      [...final.values()].filter((r) => r.project === project).length,
    ]),
  ),
};
fs.writeFileSync(
  `${folder}/browser-coverage.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
