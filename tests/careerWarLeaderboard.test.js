const { test } = require("node:test");
const assert = require("node:assert/strict");
const { leaderboardFor } = require("../engine/careerWarStandings");

test("leaderboards preserve real global and league positions, including the player below the cutoff", () => {
  let bands = { 40: 0, 50: 0 };
  const ladder = Array.from({ length: 120 }, (_, index) => {
    const competitionBand = index % 2 ? 40 : 50;
    return {
      gymId: `gym-${index}`,
      name: `Gym ${index}`,
      points: 120 - index,
      competitionBand,
      rank: index + 1,
      bandRank: ++bands[competitionBand],
    };
  });
  const original = structuredClone(ladder);
  const boards = leaderboardFor(ladder, "gym-118", 50);
  assert.equal(boards.allGyms.total, 120);
  assert.equal(boards.allGyms.rows.length, 50);
  assert.equal(boards.allGyms.yourRank, 119);
  assert.equal(boards.allGyms.yourRow.position, 119);
  assert.equal(boards.allGyms.yourRow.isYou, true);
  assert.equal(boards.yourLeague.total, 60);
  assert.equal(boards.yourLeague.yourRank, 60);
  assert.equal(boards.yourLeague.yourRow.position, 60);
  assert.ok(boards.yourLeague.rows.every((row) => row.competitionBand === 50));
  assert.equal(boards.yourLeague.rows[1].position, 2);
  assert.deepEqual(
    ladder,
    original,
    "Presentation does not alter canonical scoring",
  );
  const top = leaderboardFor(ladder, "gym-2", 50);
  assert.equal(top.allGyms.yourRow, null);
  assert.equal(top.yourLeague.rows.filter((row) => row.isYou).length, 1);
});

test("an unplayed gym is unranked and empty seasons never invent competitors or points", () => {
  const ladder = [
    { gymId: "other", competitionBand: 40, rank: 1, bandRank: 1, points: 0 },
  ];
  const boards = leaderboardFor(ladder, "new-gym", 50);
  assert.equal(boards.allGyms.yourRank, null);
  assert.equal(boards.allGyms.yourRow, null);
  assert.equal(boards.yourLeague.total, 0);
  assert.deepEqual(boards.yourLeague.rows, []);
  assert.equal(leaderboardFor([], "new-gym", 50).allGyms.total, 0);
});
