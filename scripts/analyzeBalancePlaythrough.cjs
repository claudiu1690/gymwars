// Read-only analysis of one continuous browser save, separate from game state.
const fs = require("node:fs"), path = require("node:path");
const { folder } = require("./playthroughConfig.cjs");
async function run() {
const save = JSON.parse(fs.readFileSync(path.join(folder, "current.json"))), s = save.career;
const bouts = s.fights.filter(b => b.status === "resolved");
const avg = stats => Object.values(stats).reduce((a,b)=>a+b,0)/4;
const profiles = bouts.map(b => {
  const a=b.preparation?.you?.effectiveStats, opp=b.preparation?.them?.effectiveStats;
  return { id:b.id, week:b.resolvedWeek, fighter:b.fighterId, opponent:b.opponentId,
    circuit:b.circuit?.id, challenge:b.challengeId, version:b.combatVersion,
    winner:b.result.winner, method:b.result.method, round:b.result.round,
    skillGap:a&&opp ? Math.round((avg(a)-avg(opp))*100)/100 : null,
    readiness:b.readiness?.you, show:b.show, winBonus:b.winBonus, purse:b.purse,
    trophyCash:b.rewards?.trophy?.cash||0,
    calls:b.decisions?.map(d=>d.a), snapshot:b.snapshot };
});
function group(list) {
  return { bouts:list.length, wins:list.filter(b=>b.winner==="A").length,
    losses:list.filter(b=>b.winner==="B").length, draws:list.filter(b=>b.winner==="draw").length,
    methods:list.reduce((a,b)=>(a[b.method]=(a[b.method]||0)+1,a),{}),
    roundOneFinishes:list.filter(b=>b.round===1&&!/DEC|DRAW/.test(b.method)).length,
    averageRounds:list.length ? list.reduce((a,b)=>a+b.round,0)/list.length : 0,
    purse:list.reduce((a,b)=>a+b.purse,0), trophyCash:list.reduce((a,b)=>a+b.trophyCash,0) };
}
let previous=null, minCash=Infinity, atGoal=null, returns=0, purchaseCommands=0, browserErrors=0;
const flows={}, camps={}, driverErrors=[], warCards=new Map(), calendarViolations=[];
let previousWeek=0, waivedUpkeep=0, quietWeeks=0, importantWeeks=0;
const {importantWeekReport}=await import("../frontend/src/trainingPlans.mjs");
const readline=require("node:readline");
for await(const line of readline.createInterface({input:fs.createReadStream(path.join(folder,"actions.jsonl")),crlfDelay:Infinity})) {
  const e=JSON.parse(line);
  if(e.kind==="return") returns++;
  if(e.kind==="browser-error") browserErrors++;
  if(e.kind==="driver-error") driverErrors.push(e.message);
  if(e.kind!=="mutation") continue;
  if(/purchase/.test(e.path)) purchaseCommands++;
  if(e.status<300 && e.path==="/api/career/wars/battle") warCards.set(e.result.id,e.result);
  if(e.status>=300||!e.result?.career) continue;
  const career=e.result.career, cash=career.cash, cmd=e.input?.command?.type||"start";
  if(previous!==null) flows[cmd]=(flows[cmd]||0)+cash-previous;
  previous=cash; minCash=Math.min(minCash,cash);
  if(cmd==="advance") {
    if(career.week!==previousWeek+1) calendarViolations.push({cmd,from:previousWeek,to:career.week});
    waivedUpkeep+=career.lastAdvance?.waived||0;
    if(importantWeekReport(e.result.acceptedAction?.lastAdvance||career.lastAdvance)) importantWeeks++; else quietWeeks++;
  } else if(career.week!==previousWeek) calendarViolations.push({cmd,from:previousWeek,to:career.week});
  previousWeek=career.week;
  if(career.journey.completion.complete&&!atGoal) atGoal={week:career.week,cash:career.cash,boutsCompleted:career.boutsCompleted,facilityTier:career.facilityTier};
  if(cmd==="camp") {const k=e.input.command.weeks;camps[k]=(camps[k]||0)+1;}
}
const summary={ scope:"One continuous randomly generated fresh browser career; normal resources, no purchases or outcome rerolls. Different roster/choices from the earlier run: descriptive comparison, not causal evidence.",
  final:{week:s.week,cash:s.cash,tier:s.facilityTier,coach:s.staff.coach?.rank,careerComplete:s.journey.completion.complete},
  returns,minCash,flows,combat:group(profiles),
  wars:{cards:warCards.size,wins:[...warCards.values()].filter(c=>c.outcome==="win").length,draws:[...warCards.values()].filter(c=>c.outcome==="draw").length,losses:[...warCards.values()].filter(c=>c.outcome==="loss").length,points:[...warCards.values()].reduce((n,c)=>n+c.pointsEarned,0),
    cups:[...warCards.values()].filter(c=>c.challenge).map(c=>({id:c.challenge.id,name:c.opponent,outcome:c.outcome}))},
  circuitGroups:Object.fromEntries([...new Set(profiles.map(b=>b.circuit))].map(k=>[k,group(profiles.filter(b=>b.circuit===k))])),
  gapGroups:Object.fromEntries([
    ["at-least-15-weaker",b=>b.skillGap<=-15],
    ["5-to-15-weaker",b=>b.skillGap>-15&&b.skillGap<-5],
    ["within-5",b=>Math.abs(b.skillGap)<=5],
    ["5-to-15-stronger",b=>b.skillGap>5&&b.skillGap<15],
    ["at-least-15-stronger",b=>b.skillGap>=15],
  ].map(([k,f])=>[k,group(profiles.filter(b=>b.skillGap!==null&&f(b)))])),
  challenges:profiles.filter(b=>b.challenge),
  firstCompletion:atGoal ? {week:atGoal.week,cash:atGoal.cash,bouts:atGoal.boutsCompleted,tier:atGoal.facilityTier} : null,
  earnings:{guarantees:profiles.reduce((n,b)=>n+b.show,0),winBonuses:profiles.reduce((n,b)=>n+(b.winner==="A"?b.winBonus:0),0),trophies:profiles.reduce((n,b)=>n+b.trophyCash,0)},
  postCareer:atGoal?group(profiles.filter(b=>b.week>atGoal.week)):null,
  camps, weeklyReports:{quietWeeks,importantWeeks},
  checks:{combatVersions:[...new Set(profiles.map(b=>b.version))],allWeeksFree:save.allowances.careerWeeks.extraAvailable===0,
    extraCards:save.allowances.leagueCards.extraAvailable,weekAccounting:8+4*returns-s.week===save.allowances.careerWeeks.freeAvailable,
    purchaseCommands, browserErrors, driverErrors, calendarViolations, waivedUpkeep,
    cashAccounting:1600+Object.values(flows).reduce((n,v)=>n+v,0)===s.cash,
    tokenAccounting:1+returns-warCards.size===save.allowances.leagueCards.freeAvailable},
  profiles};
fs.writeFileSync(path.join(folder,"balance-summary.json"),JSON.stringify(summary,null,2));
console.log(JSON.stringify({...summary,profiles:undefined,challenges:summary.challenges.map(b=>({id:b.id,week:b.week,challenge:b.challenge,winner:b.winner,gap:b.skillGap,prize:b.trophyCash}))},null,2));

}
run().catch(e=>{console.error(e);process.exitCode=1;});
