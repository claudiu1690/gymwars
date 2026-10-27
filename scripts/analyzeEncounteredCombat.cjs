// Offline diagnostics only. Never connects to a server or changes a played outcome.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {BSON}=require("mongoose").mongo;
const {folder}=require("./playthroughConfig.cjs");
const {beginFight,advanceRound,finishFight}=require("../engine/fightEngine");
const {automatic}=require("../engine/careerEngine");
const backup=BSON.EJSON.parse(fs.readFileSync(path.join(folder,"final-database.ejson"),"utf8"));
const careers=backup.collections.careers.documents;
assert.equal(careers.length,1,"Exactly one isolated career required");
const played=careers[0].state.fights.filter(b=>b.status==="resolved");
// Production intentionally retains exact private replay inputs for only the latest 30 bouts.
// Do not reconstruct missing historic traits or manufacture an exact replay claim.
const bouts=played.filter(b=>b.inputs);
const clone=x=>JSON.parse(JSON.stringify(x));
const avg=x=>Object.values(x).reduce((n,v)=>n+v,0)/4;
function fight(b,version,seed) {
  const state=beginFight({...clone(b.inputs),seed,rounds:b.rounds,title:b.title,engineVersion:version});
  while(!state.outcome&&state.round<state.rounds) {
    const call=b.decisions[state.round]||b.decisions.at(-1);
    state.A.gameplan=clone(call?.a||automatic(b.inputs.a.gameplan,state.A));
    state.B.gameplan=clone(call?.b||automatic(b.inputs.b.gameplan,state.B));
    advanceRound(state);
  }
  return finishFight(state);
}
for(const b of bouts) {
  const actual=fight(b,b.combatVersion,b.seed);
  for(const k of ["winner","method","round","time"])
    assert.equal(actual[k],b.result[k],"Recorded fight replay mismatch: "+b.id+" "+k);
}
const rows=[];
for(const version of [4,5]) {
  const metrics={version,bouts:0,wins:0,losses:0,roundOneFinishes:0,finishes:0,totalRounds:0,largeUnderdogBouts:0,largeUnderdogWins:0};
  for(const b of bouts) for(let i=0;i<200;i++) {
    const result=fight(b,version,"encounter-diagnostic:"+b.id+":"+i);
    metrics.bouts++;metrics.wins+=result.winner==="A";metrics.losses+=result.winner==="B";
    const finished=!/DEC|DRAW/.test(result.method);
    metrics.roundOneFinishes+=finished&&result.round===1;metrics.finishes+=finished;metrics.totalRounds+=result.round;
    if(avg(b.inputs.a.stats)-avg(b.inputs.b.stats)<=-15) {metrics.largeUnderdogBouts++;metrics.largeUnderdogWins+=result.winner==="A";}
  }
  metrics.winRate=metrics.wins/metrics.bouts;
  metrics.roundOneRate=metrics.roundOneFinishes/metrics.bouts;
  metrics.finishRate=metrics.finishes/metrics.bouts;
  metrics.meanRounds=metrics.totalRounds/metrics.bouts;
  metrics.largeUnderdogWinRate=metrics.largeUnderdogBouts?metrics.largeUnderdogWins/metrics.largeUnderdogBouts:null;
  rows.push(metrics);
}
const report={scope:"Offline matched-input lab on the latest retained replay inputs, 200 shared seeds per contract and version. Production retains only the latest 30 exact inputs; this is a late-career subset of the full playthrough. Uses recorded round calls; if the alternate version lasts longer, holds the last recorded call. No outcomes were retried or changed in the actual account. Not a second career or causal retention estimate.",totalPlayedBouts:played.length,verifiedExactRecordedReplays:bouts.length,rows};
fs.writeFileSync(path.join(folder,"encountered-combat-comparison.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
