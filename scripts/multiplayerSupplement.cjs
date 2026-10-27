// Two-tab optimistic concurrency and empty-token UI checks on the same earned accounts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,expect}=require('@playwright/test');const {folder,runId,baseURL}=require('./playthroughConfig.cjs');
const resultFile=path.join(folder,'multiplayer-results.json'),day=Math.floor(JSON.parse(fs.readFileSync(path.join(folder,'host.json'))).offset/86400000);
const balances=v=>({weeks:v.allowances.careerWeeks,tokens:v.allowances.leagueCards,anchor:v.allowances.anchorAt});
const record=e=>fs.appendFileSync(path.join(folder,'multiplayer-actions.jsonl'),JSON.stringify({at:new Date().toISOString(),day,...e})+'\n');
(async()=>{assert.match(runId,/^playthrough-multiplayer-/);const results=JSON.parse(fs.readFileSync(resultFile));const browser=await chromium.launch({headless:true});let next=0;
try{
  const contexts=[];for(let n=0;n<2;n++){const c=await browser.newContext({baseURL,storageState:path.join(folder,'north-browser.json'),viewport:{width:1440,height:1000},reducedMotion:'reduce'});await c.route('**/api/**',async r=>{const at=Math.max(Date.now(),next);next=at+300;await new Promise(resolve=>setTimeout(resolve,at-Date.now()));await r.continue();});contexts.push(c);}
  const pages=await Promise.all(contexts.map(c=>c.newPage())),[main,stale]=pages;
  const get=async(p,route='/api/career')=>p.evaluate(async route=>{const r=await fetch(route,{headers:{Authorization:'Bearer '+localStorage.getItem('gw_token')}});if(!r.ok)throw new Error(await r.text());return r.json()},route);
  const post=async(p,action,expected)=>{const pending=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/api/career/wars/defense'));const [,r]=await Promise.all([action(),pending]);const value=await r.json();record({kind:'accepted-ui-response',actor:'north',route:'/api/career/wars/defense',status:r.status(),request:r.request().postDataJSON(),value});assert.equal(r.status(),expected,JSON.stringify(value));await p.waitForLoadState('networkidle');return value;};
  for(const p of pages){await p.goto('/career/gym-wars');await p.waitForLoadState('networkidle');}
  const before=await get(main),lobby=await get(main,'/api/career/wars/lobby');assert.equal(before.allowances.leagueCards.available,0);
  await expect(main.getByRole('button',{name:'No Gym Wars tokens available',exact:true})).toBeDisabled();record({kind:'empty-token-ui',actor:'north',tokens:0,disabled:true});
  for(const p of pages)await p.getByRole('tab',{name:'Team',exact:true}).click();
  const plans=[['strike','high','hunt-finish'],['grapple','cautious','play-safe'],['balanced','measured','hunt-finish'],['strike','cautious','play-safe']];
  const approaches={strike:'Keep it standing',grapple:'Take it to the ground',balanced:'Mix it up'},paces={high:'Push the pace',measured:'Stay measured',cautious:'Slow it down'},finishes={'hunt-finish':'Hunt the finish','play-safe':'Stay composed'};
  for(const [i,f] of lobby.mine.defense.lineup.entries()){
    await main.getByRole('button',{name:`Set ${f.name}'s tactics`,exact:true}).click();
    for(const label of [approaches[plans[i][0]],paces[plans[i][1]],finishes[plans[i][2]]])await main.getByRole('button',{name:label,exact:true}).click();
  }
  const f=lobby.mine.defense.lineup.find(f=>f.weightClass==='lightweight');await stale.getByRole('button',{name:`Set ${f.name}'s tactics`,exact:true}).click();await stale.getByRole('button',{name:f.gameplan.approach==='strike'?'Take it to the ground':'Keep it standing',exact:true}).click();
  const hold=r=>r.request().method()==='GET'?r.abort():r.continue();await stale.route('**/api/career/wars/lobby*',hold);
  try{await post(main,()=>main.getByRole('button',{name:'Save team & tactics',exact:true}).click(),200);await expect(main.getByText('Ready for your next ranked card.',{exact:true})).toBeVisible();const saved=await get(main,'/api/career/wars/lobby');
    assert.deepEqual(saved.mine.defense.lineup.map(f=>[f.gameplan.approach,f.gameplan.pace,f.gameplan.finish]),plans);await main.reload();await main.waitForLoadState('networkidle');assert.deepEqual((await get(main,'/api/career/wars/lobby')).mine.defense,saved.mine.defense);
    const rejection=await post(stale,()=>stale.getByRole('button',{name:'Save team & tactics',exact:true}).click(),409);assert.match(rejection.message,/changed|stale|refresh/i);assert.deepEqual(balances(await get(main)),balances(before));assert.deepEqual((await get(main,'/api/career/wars/lobby')).mine.defense,saved.mine.defense);
    await stale.screenshot({path:path.join(folder,'north-stale-own-save.png'),fullPage:true});results.notes.push('Two real browser tabs: an outdated own-team save is rejected with 409, preserving the accepted defense and all resources. Zero-token Play control is disabled.');
  }finally{await stale.unroute('**/api/career/wars/lobby*',hold);}
  fs.writeFileSync(path.join(folder,'north-final-career.json'),JSON.stringify(await get(main),null,2));fs.writeFileSync(path.join(folder,'north-final-wars.json'),JSON.stringify(await get(main,'/api/career/wars/lobby'),null,2));
  results.supplemental={staleOwnTeam:true,emptyTokenUI:true,fourIndividualPlans:true};fs.writeFileSync(resultFile,JSON.stringify(results,null,2));console.log(JSON.stringify(results.supplemental));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
