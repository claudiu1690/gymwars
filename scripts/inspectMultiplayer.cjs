// Read-only diagnostics for the two named synthetic acceptance accounts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {folder,runId,baseURL}=require('./playthroughConfig.cjs');
const {chromium}=require('@playwright/test');
(async()=>{assert.match(runId,/^playthrough-multiplayer-/);const browser=await chromium.launch({headless:true});try{
  for(const id of ['north','south']){
    const context=await browser.newContext({baseURL,storageState:path.join(folder,id+'-browser.json')});const page=await context.newPage();await page.goto('/career/gym-wars');await page.waitForLoadState('networkidle');
    const values=await page.evaluate(async()=>{const headers={Authorization:'Bearer '+localStorage.getItem('gw_token')};return Promise.all(['/api/career','/api/career/wars/lobby'].map(async p=>(await fetch(p,{headers})).json()));});
    const [v,l]=values;fs.writeFileSync(path.join(folder,id+'-diagnostic.json'),JSON.stringify({career:v,lobby:l},null,2));
    console.log(JSON.stringify({id,gymId:l.mine.id,week:v.career.week,cash:v.career.cash,weeks:v.allowances.careerWeeks.available,tokens:v.allowances.leagueCards.available,power:l.mine.strength,ready:l.mine.defenseReady,fighters:v.career.fighters.map(f=>({id:f.id,stats:f.stats,weight:f.weightClass,camp:f.camp?.weeksRemaining,record:f.record})),rivals:l.opponents.map(o=>({name:o.name,gap:o.strengthGap})),history:l.history.map(h=>({id:h.id,direction:h.direction,name:h.opponent,score:[h.wins,h.losses]}))}));await context.close();
  }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
