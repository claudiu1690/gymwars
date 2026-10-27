const { test } = require('node:test');
const assert = require('node:assert/strict');

test('team tactics prefer the published Gym Wars plan and survive reserve and division changes', async () => {
  const { teamPlanDrafts, selectedTeam } = await import('../frontend/src/warTeamDrafts.mjs');
  const careerPlan = { approach: 'balanced', pace: 'measured', finish: 'hunt-finish', conserveBelow: 30 };
  const publishedPlan = { ...careerPlan, approach: 'grapple', pace: 'high' };
  const fighters = ['featherweight', 'lightweight', 'middleweight', 'heavyweight'].map((weightClass) => ({ id: weightClass, weightClass, gameplan: careerPlan }));
  const reserve = { ...fighters[1], id: 'reserve' };
  const mine = { lineup: fighters, choices: [...fighters, reserve], defense: { lineup: fighters.map((f) => ({ ...f, gameplan: publishedPlan })) } };
  const before = structuredClone(mine);
  let drafts = teamPlanDrafts(mine);
  assert.deepEqual(drafts.lightweight, publishedPlan);
  assert.deepEqual(drafts.reserve, careerPlan);
  drafts.lightweight = { ...drafts.lightweight, finish: 'play-safe' };
  drafts.reserve = { ...drafts.reserve, conserveBelow: 50 };
  const swap = selectedTeam(mine, { lightweight: 'reserve' }, drafts);
  assert.equal(swap[1].id, 'reserve');
  assert.equal(swap[1].gameplan.conserveBelow, 50);
  drafts = teamPlanDrafts(mine, drafts);
  assert.equal(selectedTeam(mine, {}, drafts)[1].gameplan.finish, 'play-safe');
  assert.deepEqual(mine, before);
  assert.deepEqual(teamPlanDrafts({ ...mine, choices: fighters }, drafts).reserve, undefined);
  const benchedPlan = { ...careerPlan, pace: 'cautious', conserveBelow: 50 };
  const reloaded = { ...mine, gameplans: { reserve: benchedPlan } };
  assert.deepEqual(teamPlanDrafts(reloaded).reserve, benchedPlan, 'Reload prefers the saved reserve plan over career instructions');
});
