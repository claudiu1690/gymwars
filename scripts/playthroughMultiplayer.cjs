// Two organically registered gyms, separate browser storage, UI mutations only.
// The only non-UI mutation is the authorized private host's normal +24h return.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const { chromium, expect } = require("@playwright/test");
const { folder, baseURL, runId } = require("./playthroughConfig.cjs");
const divisions = ["featherweight", "lightweight", "middleweight", "heavyweight"];
const checkpointFile = path.join(folder, "multiplayer-checkpoint.json");
const checkpoint = fs.existsSync(checkpointFile) ? JSON.parse(fs.readFileSync(checkpointFile, "utf8")) : { phase: 0, notes: [] };
const notes = checkpoint.notes, results = [];
if (fs.existsSync(path.join(folder, "multiplayer-actions.jsonl"))) for (const line of fs.readFileSync(path.join(folder, "multiplayer-actions.jsonl"), "utf8").trim().split("\n")) {
  if (!line) continue; const e = JSON.parse(line);
  if (e.kind === "accepted-ui-response" && e.status === 200 && e.value?.bouts?.length === 4) results.push({ actor: e.actor, day: e.day, result: e.value });
}
let browser, nextRequest = 0, day = Math.floor(JSON.parse(fs.readFileSync(path.join(folder, "host.json"), "utf8")).offset / 86400000);
function completePhase(phase, detail = {}) { Object.assign(checkpoint, detail, { phase, notes }); fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2)); }
const balances = (v) => { const { serverNow, ...value } = v.allowances; return value; };
function record(kind, value) { fs.appendFileSync(path.join(folder, "multiplayer-actions.jsonl"), JSON.stringify({ at: new Date().toISOString(), day, kind, ...value }) + "\n"); }
function progress(stage, detail = {}) { fs.writeFileSync(path.join(folder, "multiplayer-status.json"), JSON.stringify({ stage, day, at: new Date().toISOString(), ...detail }, null, 2)); console.log(JSON.stringify({ stage, day, ...detail })); }
const team = (v) => v.career.fighters.filter((f) => !f.retired && !f.released);
async function get(a, route = "/career", retry = true) {
  const value = await a.page.evaluate(async (route) => { const r = await fetch("/api" + route, { headers: { Authorization: "Bearer " + localStorage.getItem("gw_token") } }); return { status: r.status, value: await r.json() }; }, route);
  if (value.status === 401 && retry) { await login(a); return get(a, route, false); }
  assert.equal(value.status, 200, JSON.stringify(value.value)); return value.value;
}
async function go(a, route) { await a.page.goto(route); await a.page.waitForLoadState("networkidle"); }
async function login(a) {
  await go(a, "/career"); await expect(a.page.getByLabel("Email", { exact: true })).toBeVisible();
  await a.page.getByLabel("Email", { exact: true }).fill(a.email); await a.page.getByLabel("Password", { exact: true }).fill(a.password);
  await a.page.getByRole("button", { name: "Log in", exact: true }).click(); await a.page.waitForURL(/\/career/); await a.page.waitForLoadState("networkidle");
  await a.context.storageState({ path: path.join(folder, a.id + "-browser.json") }); record("normal-login", { actor: a.id });
}
async function mutate(a, action, expected = 200) {
  const waiting = a.page.waitForResponse((r) => r.url().includes("/api/career/") && r.request().method() === "POST" && !r.url().includes("forecast"));
  const [, r] = await Promise.all([action(), waiting]);
  const value = await r.json(); record("accepted-ui-response", { actor: a.id, route: new URL(r.url()).pathname, status: r.status(), request: r.request().postDataJSON(), value: value.career ? { revision: value.revision, week: value.career.week, cash: value.career.cash } : value });
  assert.equal(r.status(), expected, JSON.stringify(value)); await a.page.waitForLoadState("networkidle"); return value;
}
async function checkScreen(a, label) {
  assert.equal(await a.page.locator("select,details,summary").count(), 0);
  assert.equal(await a.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await a.page.screenshot({ path: path.join(folder, a.id + "-" + label + ".png"), fullPage: true });
}
async function register(id, name, mobile) {
  const storageFile = path.join(folder, id + "-browser.json");
  const context = await browser.newContext({ baseURL, viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce", ...(fs.existsSync(storageFile) ? { storageState: storageFile } : {}) });
  await context.route("**/api/**", async (route) => { const slot = Math.max(Date.now(), nextRequest); nextRequest = slot + 650; await new Promise((r) => setTimeout(r, slot - Date.now())); await route.continue(); });
  const page = await context.newPage(), a = { id, name, context, page, email: `${runId}-${id}@gymwars.invalid`, password: "independent-multiplayer-test-only" };
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => record("browser-error", { actor: id, message: e.message }));
  if (fs.existsSync(storageFile)) {
    await go(a, "/career"); if (new URL(page.url()).pathname === "/login") await login(a);
    const v = await get(a); a.gymId = (await get(a,"/career/wars/lobby")).mine.id; record("resume-existing-account", { actor: id, week: v.career.week, cash: v.career.cash }); return a;
  }
  await go(a, "/"); await page.locator(".landing-hero").getByRole("link", { name: "Start your gym", exact: true }).click();
  await page.getByLabel("Gym name", { exact: true }).fill(name); await page.getByLabel("Email", { exact: true }).fill(a.email); await page.getByLabel("Password", { exact: true }).fill(a.password);
  await page.getByRole("button", { name: "Open your gym", exact: true }).click(); await page.waitForURL(/\/career/);
  await mutate(a, () => page.getByRole("button", { name: "Begin career", exact: true }).click());
  const v = await get(a); assert.equal(v.career.cash, 1600); assert.equal(v.career.week, 0); assert.equal(team(v).length, 1); assert.equal(v.allowances.careerWeeks.available, 8); assert.equal(v.allowances.leagueCards.available, 1);
  a.gymId = v.career.gymId; record("fresh-start", { actor: id, name, cash: 1600, fighters: 1, weeks: 8, tokens: 1 });
  await context.storageState({ path: path.join(folder, id + "-browser.json") }); return a;
}
async function camp(a, id) {
  const before = await get(a); await go(a, "/career/gym/training/" + id);
  const fit = a.page.getByRole("button", { name: /^Prepare for this fight/ });
  if (await fit.isVisible()) await fit.click();
  else await a.page.locator(".tw-plan").filter({ hasText: "All-round training" }).click();
  const assign = a.page.getByRole("button", { name: /^Assign [1-6]-week camp$/ });
  if (await assign.isVisible()) { await mutate(a, () => assign.click()); assert.equal((await get(a)).career.week, before.career.week); }
}
async function book(a, f, o) {
  await go(a, "/career/booking/" + f.id); await a.page.getByRole("button", { name: "Review offer against " + o.opponent.name, exact: true }).click();
  await mutate(a, () => a.page.getByRole("button", { name: "Book fight against " + o.opponent.name, exact: true }).click()); await a.page.waitForURL(/\/career\/bout\//);
  await a.page.getByRole("button", { name: ["wrestling", "judo", "bjj", "sambo"].includes(f.style) ? "Take it to the ground" : "Keep it standing", exact: true }).click();
  const save = a.page.getByRole("button", { name: "Save tactics", exact: true }); if (await save.isEnabled()) await mutate(a, () => save.click());
  await camp(a, f.id);
}
async function commitments(a) {
  let v = await get(a);
  for (const b of v.career.fights.filter((b) => ["ready", "live"].includes(b.status))) {
    await go(a, "/career/fight-night/" + b.id); await mutate(a, () => a.page.getByRole("button", { name: "Finish fight", exact: true }).click());
  }
  v = await get(a);
  for (const f of team(v).filter((f) => f.camp?.needsReview)) { await go(a, "/career/gym/training/" + f.id); await mutate(a, () => a.page.getByRole("button", { name: "Continue camp", exact: true }).click()); }
}
async function end(a) {
  await commitments(a); const before = await get(a); assert.ok(before.allowances.careerWeeks.available > 0);
  await go(a, "/career");
  const value = await mutate(a, () => a.page.getByRole("button", { name: "End week: advance exactly seven days and use one career week", exact: true }).click());
  const { importantWeekReport } = await import("../frontend/src/trainingPlans.mjs");
  if (importantWeekReport(value.acceptedAction?.lastAdvance || value.career.lastAdvance)) await a.page.getByRole("button", { name: "Close week results", exact: true }).click();
  assert.equal((await get(a)).career.week, before.career.week + 1);
}
async function recruit(a, reserve = false) {
  let v = await get(a); if (team(v).length >= v.career.rules.facilities[v.career.facilityTier].slots) return;
  const wanted = reserve ? [v.career.fighters[0].weightClass] : divisions.filter((d) => !team(v).some((f) => f.weightClass === d));
  for (const division of wanted) {
    v = await get(a); const r = v.career.board.find((r) => !r.signed && r.fighter.weightClass === division && (r.investigated || v.career.scoutsUsed < v.career.rules.scoutsPerWeek));
    if (!r) continue;
    await go(a, "/career/scouting"); await a.page.locator(".scout-prospect-card").filter({ hasText: r.fighter.name }).click();
    if (!r.investigated) await mutate(a, () => a.page.getByRole("button", { name: /^Investigate / }).click());
    v = await get(a); const quote = v.career.board.find((b) => b.id === r.id);
    if (quote.fee > v.career.cash - v.career.weeklyCost * 2) continue;
    await a.page.getByRole("button", { name: /^Offer a place/ }).click(); await mutate(a, () => a.page.getByRole("button", { name: /^Confirm signing/ }).click());
  }
}
async function develop(a, expand = false) {
  await commitments(a); let v = await get(a);
  if (v.career.boutsCompleted) await recruit(a, expand && team(v).length === 4 && v.career.facilityTier >= 2);
  v = await get(a);
  if (expand && v.career.facilityTier === 1 && v.career.gymDevelopment.expansion.canUpgrade && v.career.cash >= 3400) {
    await go(a, "/career/gym/facilities"); await a.page.getByRole("button", { name: /^Inspect tier 2:/ }).click(); await a.page.getByRole("button", { name: /^Expand gym/ }).click(); await mutate(a, () => a.page.getByRole("button", { name: "Confirm expansion", exact: true }).click());
  }
  v = await get(a);
  for (const f of team(v)) {
    if (f.camp || v.career.fights.some((b) => b.fighterId === f.id && b.status !== "resolved")) continue;
    const choices = f.offers.filter((o) => !o.unavailable && o.notice >= 4);
    choices.sort((a,b) => Object.values(a.opponent.stats).reduce((n,x)=>n+x,0) - Object.values(b.opponent.stats).reduce((n,x)=>n+x,0));
    if (choices[0]) await book(a, f, choices[0]);
  }
  await end(a);
}
async function normalReturn(actors) {
  const before = await Promise.all(actors.map((a) => get(a)));
  const meta = JSON.parse(fs.readFileSync(path.join(folder, "host.json"), "utf8"));
  const r = await actors[0].context.request.post("/__playthrough/return", { headers: { "X-Playthrough-Key": meta.key }, data: {} }); assert.ok(r.ok()); day++; record("normal-return", await r.json());
  for (let i = 0; i < actors.length; i++) { const after = await get(actors[i]); assert.deepEqual(after.career, before[i].career); assert.equal(after.allowances.careerWeeks.available, Math.min(12, before[i].allowances.careerWeeks.available + 4)); assert.equal(after.allowances.leagueCards.available, Math.min(3, before[i].allowances.leagueCards.available + 1)); }
}
async function saveTeam(a, variation = 0, reserveId = null) {
  await go(a, "/career/gym-wars"); await a.page.getByRole("tab", { name: "Team", exact: true }).click();
  const v = await get(a), reserve = reserveId && team(v).find((f) => f.id === reserveId), f = team(v).find((f) => f.weightClass === (reserve?.weightClass || "lightweight")) || team(v)[0];
  await a.page.getByRole("button", { name: `Set ${f.name}'s tactics`, exact: true }).click();
  if (reserveId) {
    const reserve = team(v).find((f) => f.id === reserveId);
    await a.page.getByRole("group", { name: `Choose ${reserve.weightClass[0].toUpperCase()+reserve.weightClass.slice(1)} fighter`, exact: true }).getByRole("button").filter({ hasText: reserve.name }).click();
  }
  await a.page.getByRole("button", { name: variation % 2 ? "Take it to the ground" : "Keep it standing", exact: true }).click();
  await a.page.getByRole("button", { name: variation % 2 ? "Slow it down" : "Stay measured", exact: true }).click();
  await a.page.getByRole("button", { name: variation % 2 ? "Stay composed" : "Hunt the finish", exact: true }).click();
  const before = await get(a), save = a.page.getByRole("button", { name: /^(Save team & tactics|Update trained fighters|Update team for new rules)$/ });
  if (await save.isEnabled()) {
    await mutate(a, () => save.click()); await expect(a.page.getByText("Ready for your next ranked card.", { exact: true })).toBeVisible();
  } else record("unchanged-team-already-saved", { actor:a.id });
  assert.deepEqual((await get(a)).career, before.career); assert.deepEqual(balances(await get(a)), balances(before));
  const lobby = await get(a, "/career/wars/lobby"); a.gymId = lobby.mine.gymId || lobby.mine.id; assert.equal(lobby.mine.defense.lineup.length, 4);
  await a.page.reload(); await a.page.waitForLoadState("networkidle");
  assert.deepEqual((await get(a, "/career/wars/lobby")).mine.defense.lineup.map((f) => [f.id,f.gameplan]), lobby.mine.defense.lineup.map((f) => [f.id,f.gameplan])); return lobby;
}
async function selectRival(a, other) {
  await go(a, "/career/gym-wars"); await a.page.getByRole("tab", { name: "Battle", exact: true }).click();
  const row = a.page.locator(".war-league-rivals > button").filter({ hasText: other.name });
  if (await row.isVisible()) await row.click();
  else {
    const l=await get(a,"/career/wars/lobby"); assert.equal(l.rivalry?.opponent?.name,other.name,"Independent rival missing from shortlist and followed club");
    await a.page.getByRole("tab",{name:"Club",exact:true}).click(); await a.page.getByRole("button",{name:"Challenge this rival",exact:true}).click();
  }
  await expect(a.page.locator(".gw-arena")).toContainText(other.name);
}
async function follow(a,other) {
  const l=await get(a,"/career/wars/lobby"); if(l.rivalry?.opponent?.name===other.name) return;
  await selectRival(a,other); await a.page.getByRole("tab",{name:"Club",exact:true}).click();
  await mutate(a,()=>a.page.getByRole("button",{name:"Follow "+other.name,exact:true}).click());
}
async function surfaceIndependentRivals(actors) {
  for(let n=0;n<=16;n++) {
    const views=await Promise.all(actors.map(p=>get(p,"/career/wars/lobby")));
    if(views.every((v,i)=>v.opponents.some(o=>o.name===actors[1-i].name))) return;
    assert.ok(n<16,"Independent rivals did not become mutually visible within 16 normal development weeks");
    const average=v=>v.mine.defense.lineup.reduce((sum,f)=>sum+Object.values(f.stats).reduce((s,x)=>s+x,0)/4,0)/4;
    const index=average(views[0])<average(views[1])?0:1,p=actors[index];
    record("shortlist-discovery-blocker",{actor:p.id,opponents:views[index].opponents.map(o=>o.name),gap:average(views[1-index])-average(views[index])});
    if(!(await get(p)).allowances.careerWeeks.available) await normalReturn(actors);
    await develop(p); await saveTeam(p,index); progress("normal development to surface independent rival",{actor:p.id,week:(await get(p)).career.week});
  }
}
async function playCard(a, other, stale = false) {
  const before = await get(a), otherBefore = await get(other);
  const value = await mutate(a, () => a.page.getByRole("button", { name: "Play 4v4 · 1 token", exact: true }).click(), stale ? 409 : 200);
  if (stale) { assert.match(value.message, /defense changed|Refresh/); assert.deepEqual(balances(await get(a)), balances(before)); assert.deepEqual(balances(await get(other)), balances(otherBefore)); notes.push("Stale rival rejected visibly without spending either gym's token."); return value; }
  await expect(a.page.getByRole("region", { name: "Gym Wars result", exact: true })).toBeVisible(); assert.equal(value.bouts.length, 4);
  assert.equal((await get(a)).allowances.leagueCards.available, before.allowances.leagueCards.available - 1); assert.deepEqual((await get(a)).career, before.career); assert.deepEqual(balances(await get(other)), balances(otherBefore));
  results.push({ actor: a.id, day, result: value }); await checkScreen(a, "card-" + results.length);
  await a.page.getByRole("button", { name: "Back to gyms", exact: true }).click(); return value;
}
async function leaderboards(actors, label) {
  for (const a of actors) {
    await go(a, "/career/gym-wars"); const lobby = await get(a, "/career/wars/lobby");
    await a.page.getByRole("tab", { name: "Leaderboard", exact: true }).click(); await a.page.getByRole("button", { name: "All gyms", exact: true }).click();
    for (const p of actors) await expect(a.page.locator(".gw-leaderboard-table")).toContainText(p.name);
    await checkScreen(a, label); record("league-snapshot", { actor: a.id, label, league: lobby.league, history: lobby.history });
  }
}
async function run() {
  assert.match(runId, /^playthrough-multiplayer-/); browser = await chromium.launch({ headless: true });
  const a = await register("north", "Acceptance North", false), b = await register("south", "Acceptance South", true), actors = [a,b];
  progress(results.length ? "resuming existing independent accounts" : "fresh accounts registered");
  // Build each real roster from its own recruitment board and career purses.
  for (let n = 0; n < 24 && actors.some((a) => !a.covered); n++) {
    for (const p of actors) { const v = await get(p); p.covered = divisions.every((d) => team(v).some((f) => f.weightClass === d)); if (!p.covered) { if (!v.allowances.careerWeeks.available) await normalReturn(actors); await develop(p); } }
    progress("organic recruitment", { careers: await Promise.all(actors.map(async (p)=>{const v=await get(p);return {actor:p.id,week:v.career.week,cash:v.career.cash,fighters:team(v).length};})) });
  }
  assert.ok(actors.every((a) => a.covered), "Both gyms must organically recruit all four divisions");
  if (checkpoint.phase < 1) {
    await saveTeam(a,0); await saveTeam(b,1); const firstSeason = (await get(a,"/career/wars/lobby")).league.season;
    const prior=results.find(x=>x.actor===a.id && x.result.seasonId===firstSeason.id);
    if(!prior) await selectRival(a,b); const first=prior?.result || await playCard(a,b);
    await surfaceIndependentRivals(actors); await follow(a,b); await follow(b,a);
    if(!results.some(x=>x.actor===b.id&&x.result.seasonId===firstSeason.id)) { await selectRival(b,a); await playCard(b,a); }
    await leaderboards(actors,"first-pvp-leaderboard");
    completePhase(1, { firstSeason, firstId: first.id, oldResult: (await get(a,"/career/wars/lobby")).history.find((h)=>h.id===first.id) });
  }
  const firstSeason = checkpoint.firstSeason;
  if (checkpoint.phase < 2) {
    await normalReturn(actors); await selectRival(a,b);
    // Keep this tab's displayed rival snapshot old while the other real player republishes.
    // No response or game state is supplied; only lobby GETs are temporarily withheld.
    const hold = (route) => route.request().method() === "GET" ? route.abort() : route.continue();
    await a.page.route("**/api/career/wars/lobby*", hold);
    try { await saveTeam(b,0); await playCard(a,b,true); } finally { await a.page.unroute("**/api/career/wars/lobby*", hold); }
    await selectRival(a,b); await playCard(a,b); await selectRival(b,a); await playCard(b,a);
    assert.deepEqual((await get(a,"/career/wars/lobby")).history.find((h)=>h.id===checkpoint.firstId), checkpoint.oldResult);
    progress("reciprocal battles and stale rival passed"); completePhase(2);
  }
  // Genuine career development creates a stale trained team; updating it costs no token.
  if (checkpoint.phase < 3) {
    await commitments(a); const start=await get(a), f=team(start)[0];
    if (!f.camp && !start.career.fights.some((x)=>x.fighterId===f.id&&x.status!=="resolved")) await camp(a,f.id);
    await end(a); await go(a,"/career/gym-wars");
    const update=a.page.getByRole("button",{name:"Update trained fighters",exact:true}); await expect(update).toBeVisible();
    const oldDefense=await get(a,"/career/wars/lobby"), resource=await get(a);
    await mutate(a,()=>update.click()); const newDefense=await get(a,"/career/wars/lobby");
    assert.notEqual(newDefense.mine.defenseVersion,oldDefense.mine.defenseVersion); assert.deepEqual(newDefense.mine.defense.lineup.map(f=>[f.id,f.gameplan]),oldDefense.mine.defense.lineup.map(f=>[f.id,f.gameplan])); assert.deepEqual(balances(await get(a)),balances(resource));
    notes.push("Real career training makes defense stale; free update preserves calls and tokens."); completePhase(3);
  }
  // A normal paid expansion and reserve, if earned within a bounded development phase.
  if (checkpoint.phase < 4) {
    for(let n=0;n<32 && team(await get(a)).length<5;n++) { const v=await get(a); if(!v.allowances.careerWeeks.available) await normalReturn(actors); await develop(a,true); if(n%4===0)progress("organic reserve development",{week:(await get(a)).career.week,cash:(await get(a)).career.cash}); }
    const av=await get(a), chosen=(await get(a,"/career/wars/lobby")).mine.defense.lineup.map(f=>f.id), reserve=team(av).find(f=>!chosen.includes(f.id));
    if(reserve) { await saveTeam(a,1,reserve.id); assert.ok((await get(a,"/career/wars/lobby")).mine.defense.lineup.some(f=>f.id===reserve.id)); notes.push("Normal expansion/recruitment unlocks a reserve that saves in the 4v4 team."); }
    else notes.push("Organic reserve was not earned within 32 extra career weeks; no checkpoint supplied.");
    completePhase(4);
  }
  // Confirm three inactive returns fill caps without advancing either career.
  if (checkpoint.phase < 5) {
    for(let n=0;n<3;n++) await normalReturn(actors);
    for(const p of actors) { const v=await get(p); assert.equal(v.allowances.careerWeeks.available,12); assert.equal(v.allowances.leagueCards.available,3); }
    while((await get(a,"/career/wars/lobby")).league.season.id===firstSeason.id) await normalReturn(actors);
    const rolled=await get(a,"/career/wars/lobby"); assert.equal(rolled.league.matches,0); assert.ok(rolled.league.seasonArchive.some(s=>s.seasonId===firstSeason.id));
    assert.equal(rolled.league.season.scoring.mode,"best-ten");
    await go(a,"/career/gym-wars"); await a.page.getByRole("tab",{name:"Club",exact:true}).click(); await expect(a.page.getByRole("heading",{name:"Past seasons",exact:true})).toBeVisible(); await checkScreen(a,"season-rollover");
    progress("normal season rollover passed",{season:rolled.league.season.id}); completePhase(5);
  }
  // Eleven accepted attacking cards in the new season, all funded by normal tokens.
  let cards=0;
  while(cards<11) {
    for(const p of actors) {
      if((await get(p)).allowances.leagueCards.available>0) { await selectRival(p,p===a?b:a); await playCard(p,p===a?b:a); }
    }
    cards=(await get(a,"/career/wars/lobby")).league.matches;
    if(cards<11 && !(await get(a)).allowances.leagueCards.available) await normalReturn(actors);
  }
  await leaderboards(actors,"season-two-leaderboard");
  for(const p of actors) {
    const v=await get(p),l=await get(p,"/career/wars/lobby"), own=results.filter(x=>x.actor===p.id).map(x=>x.result), current=own.filter(x=>x.seasonId===l.league.season.id);
    assert.equal(l.league.matches,current.length); assert.equal(l.league.countedCards,Math.min(10,current.length)); assert.equal(l.league.points,current.map(x=>x.pointsEarned).sort((x,y)=>y-x).slice(0,10).reduce((n,x)=>n+x,0));
    assert.equal(l.league.lifetimePoints,own.reduce((n,x)=>n+x.pointsEarned,0));
    assert.equal(l.league.seasonArchive.find(s=>s.seasonId===firstSeason.id).points,own.filter(x=>x.seasonId===firstSeason.id).reduce((n,x)=>n+x.pointsEarned,0));
    const row=l.league.leaderboard.allGyms.rows.find(x=>x.gymId===p.gymId); assert.ok(row); assert.equal(row.points,l.league.points); assert.equal(row.matches,l.league.matches);
    assert.ok(l.history.some(x=>x.direction==="attack") && l.history.some(x=>x.direction==="defense"));
    fs.writeFileSync(path.join(folder,p.id+"-final-career.json"),JSON.stringify(v,null,2)); fs.writeFileSync(path.join(folder,p.id+"-final-wars.json"),JSON.stringify(l,null,2)); await p.context.storageState({path:path.join(folder,p.id+"-browser.json")});
  }
  notes.push("Eleven attacks per gym reconcile to best ten, archived season and lifetime totals; defense history does not award attacker points.");
  fs.writeFileSync(path.join(folder,"multiplayer-results.json"),JSON.stringify({runId,day,notes,results,actors:actors.map(({id,name,email,gymId})=>({id,name,email,gymId})),preparedCheckpoints:false,boosts:false},null,2));
  progress("completed",{acceptedCards:results.length,notes}); await browser.close();
}
run().catch(async(e)=>{record("driver-error",{message:e.stack}); progress("driver-error",{error:e.message}); console.error(e); if(browser)await browser.close();process.exitCode=1;});
