const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createCareer, publicState } = require("../engine/careerEngine");
const { previewUri, makeClub } = require("../scripts/seedPreviewLeaderboard");
const pathModule = import("../frontend/src/careerPath.mjs");
const start = () => publicState(createCareer({ seed: "career-path-tests", name: "Path Gym" }));

test("Career Path prioritizes due fights and check-ins without advancing or mutating the career", async () => {
  const { careerPathFocus } = await pathModule;
  const s = start();
  assert.equal(careerPathFocus(s).action.href, "/career/booking/starter");
  s.fights.push({ id: "due", fighterId: "starter", status: "live" });
  const before = structuredClone(s);
  assert.equal(careerPathFocus(s).action.href, "/career/fight-night/due");
  assert.equal(careerPathFocus(s).action.label, "Resume fight");
  assert.deepEqual(s, before);
  s.fights[0].status = "scheduled";
  s.fighters[0].camp = { needsReview: true };
  assert.equal(careerPathFocus(s).action.href, "/career/gym/training/starter");
});

test("an active Invitational points to its card and its trophy does not imply career completion", async () => {
  const { careerPathFocus } = await pathModule;
  const s = start();s.journey.currentStageId = "invitational";
  s.journey.invitational.attempt = { status: "active" };
  assert.equal(careerPathFocus(s).action.href, "#campaign-scorecard");
  s.journey.complete = true;
  s.journey.postInvitationalChallenge = { name: "National Showcase", description: "Beat the invited champion.", actionLabel: "Prepare challenger", href: "/career/booking/starter", reward: { trophy: "National pennant", legacy: 35 } };
  assert.equal(careerPathFocus(s).title, "National Showcase");
  assert.match(careerPathFocus(s).reward, /National pennant/);
  assert.notEqual(careerPathFocus(s).status, "CAREER COMPLETE");
  s.journey.completion.complete = true;
  assert.equal(careerPathFocus(s).status, "CAREER COMPLETE");
});

test("leaderboard seeding is restricted to the isolated local preview and creates reproducible four-division gyms", () => {
  assert.match(previewUri("mongodb://127.0.0.1:58273/gymwars_preview?directConnection=true"), /gymwars_preview/);
  for (const uri of ["mongodb://remote.example/gymwars_preview", "mongodb://127.0.0.1/production", "mongodb+srv://remote.example/gymwars_preview"])
    assert.throws(() => previewUri(uri));
  const names = new Set();
  for (let i = 0; i < 20; i++) {
    const club = makeClub(i, 45);names.add(club.name);
    assert.deepEqual(club, makeClub(i, 45));
    assert.deepEqual(club.fighters.map(f => f.weightClass), ["featherweight", "lightweight", "middleweight", "heavyweight"]);
    assert.equal(new Set(club.fighters.map(f => f.id)).size, 4);
    assert.ok(club.fighters.every(f => Object.values(f.stats).every(value => value >= 1 && value <= 99)));
  }
  assert.equal(names.size, 20);
});
