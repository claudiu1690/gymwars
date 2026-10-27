// Read-only API smoke check for the isolated preview; never logs a JWT.
const assert = require("node:assert/strict");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
async function check(uri) {
  const target = new URL(uri);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal(target.pathname, "/gymwars_preview");
  const client = await MongoClient.connect(uri);
  try {
    const db = client.db("gymwars_preview");
    const career = await db.collection("careers").findOne({});
    assert.ok(career, "A restored career is required.");
    const user = await db.collection("users").findOne({ gymId: career.gymId });
    assert.ok(user && !user.deleted);
    const matchCount = await db.collection("careerwarmatches").countDocuments();
    const defenseCount = await db
      .collection("careerwardefenses")
      .countDocuments();
    const token = jwt.sign(
      { id: String(user._id), epoch: user.sessionEpoch || 1 },
      "local-ui-review-only",
      { expiresIn: "1m" },
    );
    const get = async (path, authenticated = true) => {
      const response = await fetch("http://127.0.0.1:4108" + path, {
        headers: authenticated ? { Authorization: "Bearer " + token } : {},
      });
      assert.equal(response.status, 200, path + " must succeed.");
      return response.json();
    };
    const health = await get("/health", false);
    assert.equal(health.ok, true);
    const save = await get("/career");
    assert.equal(save.revision, career.revision);
    assert.equal(save.career.week, career.state.week);
    assert.equal(save.career.fighters.length, career.state.fighters.length);
    assert.ok(save.allowances.careerWeeks.available >= 0 && save.allowances.careerWeeks.available <= 12);
    assert.ok(save.allowances.leagueCards.available >= 0 && save.allowances.leagueCards.available <= 3);
    const league = await get("/career/wars/lobby");
    assert.equal(league.mine.revision, career.revision);
    assert.equal(league.mine.week, career.state.week);
    assert.ok(league.opponents.length >= 3);
    assert.equal(league.league.playedThisWeek, false);
    assert.ok(league.league.season.id);
    assert.ok(league.opponents.every((team) => team.lineup.length === 4));
    for (const team of [league.mine, ...league.opponents]) {
      for (const fighter of team.lineup)
        assert.equal(fighter.traits, undefined);
    }
    const practice = await get("/career/exhibitions/lobby");
    assert.equal(practice.mine.version, career.revision);
    assert.ok(practice.choices.length);
    assert.deepEqual(
      await db.collection("careers").findOne({ _id: career._id }),
      career,
    );
    assert.equal(
      await db.collection("careerwarmatches").countDocuments(),
      matchCount,
    );
    assert.equal(
      await db.collection("careerwardefenses").countDocuments(),
      defenseCount,
    );
    console.log(
      "PREVIEW_API_PASS — restored career, daily banks, seasonal league and practice lobby respond; no career/league documents changed.",
    );
  } finally {
    await client.close();
  }
}
check(process.argv[2]).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
