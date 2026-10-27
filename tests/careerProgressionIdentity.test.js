const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createCareer, applyCommand, publicState, offers, replay } = require("../engine/careerEngine");
const { CURRENT_FIGHT_VERSION } = require("../engine/fightEngine");
const { CAREER } = require("../consts/career");
const { STYLES, STYLE_FAMILIES } = require("../consts/styles");
const { RARITY_TIERS } = require("../consts/rarity");
const { createRng } = require("../utils/rng");
const keys = ["striking","grappling","submissions","conditioning"];
const clone = (s) => structuredClone(s);
const start = (seed="progression-identity") => createCareer({seed,name:"Corner Club"});
const cmd = (s,type,fields={}) => applyCommand(s,{type,...fields});
function advance(s,weeks) {
  for (let i=0;i<weeks;i++) {
    for (const f of s.fighters.filter((f) => f.camp?.needsReview)) s=cmd(s,"camp-review",{fighterId:f.id,choice:"continue"});
    s=cmd(s,"advance",{confirmCosts:true});
  }
  return s;
}
function deeds(s,ids) { for(const id of ids) s.gymGoals[id]={week:s.week,badge:id}; return s; }
function corner(s) {
  const first=s.fighters[0];
  for (const wc of ["featherweight","lightweight","middleweight","heavyweight"].filter((wc) => wc!==first.weightClass)) s.fighters.push({...clone(first),id:`owned-${wc}`,weightClass:wc});
  return s;
}
function book(s, offer=publicState(s).fighters[0].offers.find((o) => !o.title)) {
  return cmd(s,"accept-offer",{fighterId:"starter",offerId:offer.offerId});
}

test("future investigations assign the +6 primary bonus to the visible style without changing report identity",()=>{
  for(let n=0;n<30;n++) {
    const s=start(`primary-${n}`), report=s.board[0], identity=clone(report.fighter);
    const next=cmd(s,"investigate",{reportId:report.id}).board[0].fighter;
    const rng=createRng(`${identity.seed}:career`), order=RARITY_TIERS[next.rarity].order-1;
    const expected={};
    for(const key of keys) { expected[key]=rng.int(29+order*3,43+order*3); rng.int(58+order*4,74+order*4); }
    expected[STYLE_FAMILIES[STYLES[identity.style].family].primaryStat]+=6;
    assert.deepEqual(next.stats,expected);
    assert.equal(next.style,identity.style); assert.equal(next.weightClass,identity.weightClass);
    assert.deepEqual(s.board[0].fighter,identity,"a command never mutates its input");
  }
});

test("deeds promote contiguously before expansion and authored lower opponents keep their own purses",()=>{
  let s=corner(start()); s.cash=100000; s.boutsCompleted=1;
  s=cmd(s,"plan",{fighterId:"starter",plan:s.fighters[0].gameplan});
  let view=publicState(s);
  assert.equal(view.careerCircuit.id,"city"); assert.equal(s.facilityTier,1);
  const city=view.fighters[0].offers.filter((o)=>o.circuit.id==="city");
  assert.equal(city.length,2); assert.notDeepEqual(city[0].opponent.gameplan,city[1].opponent.gameplan);
  assert.equal(view.fighters[0].offers.find((o)=>o.circuit.id==="regional"&&!o.title).show,180);
  s=cmd(s,"upgrade"); s=advance(s,4);
  assert.equal(publicState(s).gymDevelopment.expansion.canUpgrade,false,"cash alone cannot buy Contender gym");
  deeds(s,["successor","team-trophy"]);
  view=publicState(s); assert.equal(view.careerCircuit.id,"city","later deeds wait for State defense");
  assert.equal(view.gymDevelopment.goals.find((g)=>g.id==="successor").waitingFor.id,"title-defense");
  deeds(s,["title-defense"]);
  view=publicState(s); assert.equal(view.careerCircuit.id,"champions");
  assert.equal(view.gymDevelopment.expansion.canUpgrade,true);
  const lower=view.fighters[0].offers.find((o)=>o.circuit.id==="city");
  assert.equal(lower.show,300); assert.equal(lower.winBonus,450);
});

test("qualified regional defense is distinct from an ordinary champion appearance and has a legal fallback",()=>{
  let s=start("real-defense"), f=s.fighters[0];
  f.isChampion=true; f.championships=[{wonWeek:0,defenses:0}];
  for(const r of s.rivals.filter((r)=>!r.circuitChallenge&&!r.circuitOpponentId)) {r.isChampion=false;r.rankingPoints=0;}
  const view=publicState(s), ordinary=view.fighters[0].offers.find((o)=>!o.title), title=view.fighters[0].offers.find((o)=>o.title);
  assert.ok(ordinary); assert.equal(ordinary.show,180); assert.equal(ordinary.qualifiedDefense,false);
  assert.ok(title); assert.ok(title.opponent.rankingPoints>=80); assert.equal(title.qualifiedDefense,true);
  s=book(s,ordinary); assert.equal(s.fights[0].rounds,3); assert.equal(s.fights[0].title,false);
  const independent=start("actual-defense"), champion=independent.fighters[0];
  champion.isChampion=true;champion.championships=[{wonWeek:0,defenses:0}];champion.stats=Object.fromEntries(keys.map((k)=>[k,99]));
  for(const r of independent.rivals.filter((r)=>!r.circuitChallenge&&!r.circuitOpponentId)) {r.isChampion=false;r.rankingPoints=80;r.stats=Object.fromEntries(keys.map((k)=>[k,1]));}
  const defense=publicState(independent).fighters[0].offers.find((o)=>o.title);
  let resolved=advance(book(independent,defense),defense.notice); resolved=cmd(resolved,"auto-fight",{fightId:resolved.fights[0].id,expectedRound:0});
  assert.equal(resolved.fights[0].result.winner,"A");assert.equal(resolved.fighters[0].championships[0].defenses,1);
  assert.ok(resolved.fights[0].rewards.progression.deeds.includes("title-defense"));
});

test("legacy promotion, owned buildings, construction and accepted purses survive migration",()=>{
  let s=book(start("legacy-contract"));
  delete s.progression; s.version=2; s.facilityTier=4; s.upgrade={tier:5,endWeek:10};
  deeds(s,["successor"]); const terms={show:s.fights[0].show,winBonus:s.fights[0].winBonus};
  const before=clone(s), view=publicState(s);
  assert.deepEqual(s,before);assert.equal(view.careerCircuit.id,"champions");assert.equal(view.facilityTier,4);
  s=cmd(s,"plan",{fighterId:"starter",plan:s.fighters[0].gameplan});
  assert.equal(s.progression.grandfatherExpansionTier,5);assert.deepEqual(s.upgrade,before.upgrade);
  assert.deepEqual({show:s.fights[0].show,winBonus:s.fights[0].winBonus},terms);
});

test("capstone requires both authored archetypes and awards recognition only once",()=>{
  let s=deeds(start("capstone"),["open-doors","fight-team"]);
  assert.equal(publicState(s).fighters[0].offers.filter((o)=>o.circuit.id==="city").length,2);
  for(const profile of CAREER.circuitPacks[0].opponents.filter((p)=>!p.capstone)) s.fights.push({id:`win-${profile.id}`,fighterId:"starter",status:"resolved",result:{winner:"A"},circuit:{id:"city"},circuitOpponentId:profile.id});
  const capstone=publicState(s).fighters[0].offers.find((o)=>o.capstone);
  assert.ok(capstone);assert.equal(capstone.circuit.id,"city");
  s.fighters[0].stats=Object.fromEntries(keys.map((k)=>[k,99]));s.rivals.find((r)=>r.id===capstone.id).stats=Object.fromEntries(keys.map((k)=>[k,1]));
  s=advance(book(s,capstone),4);const fight=s.fights.at(-1);s=cmd(s,"auto-fight",{fightId:fight.id,expectedRound:0});
  assert.equal(s.fights.at(-1).result.winner,"A");assert.equal(s.circuitHonors.city.fightId,fight.id);
  assert.equal(s.fights.at(-1).purse,750,"honor adds no bonus currency");
});

test("authored opponents recover between appearances without aging, stat drift or regional simulation",()=>{
  let s=start("fixed-opponent-recovery");
  const opponent=s.rivals.find((r)=>r.circuitOpponentId), original=clone(opponent);
  opponent.fatigue=54;
  s=advance(s,3);
  const recovered=s.rivals.find((r)=>r.id===opponent.id);
  assert.equal(recovered.fatigue,0);
  assert.deepEqual(recovered.stats,original.stats);assert.equal(recovered.age,original.age);
  assert.deepEqual(recovered.record,original.record);assert.equal(recovered.rankingPoints,original.rankingPoints);
});

test("optional ambitions save subjects, complete from deeds, and survive switching or subject departure",()=>{
  let s=start("ambition"), cash=s.cash;
  s=cmd(s,"select-ambition",{goalId:"first-belt",fighterId:"starter"});
  assert.equal(publicState(s).ambition.status,"active");assert.equal(s.cash,cash);
  s.fighters[0].released=true;
  assert.equal(publicState(s).ambition.status,"unavailable");assert.equal(publicState(s).ambition.nextAction.href,"/career/campaign#club-goals");
  s=cmd(s,"select-ambition",{goalId:"complete-corner"});assert.equal(s.ambitionHistory[0].status,"switched");
  s.fighters[0].released=false;corner(s);s=cmd(s,"plan",{fighterId:"starter",plan:s.fighters[0].gameplan});
  assert.equal(publicState(s).ambition.status,"complete");
  s=cmd(s,"clear-ambition");assert.equal(publicState(s).ambition,null);assert.ok(s.ambitionHistory.some((a)=>a.status==="complete"));
  assert.ok(!publicState(s).journey.careerComplete);
  deeds(s,CAREER.circuits.map((c)=>c.goalId));for(const c of CAREER.challenges)s.careerChallenges[c.id]={week:0,trophy:c.reward.trophy};
  assert.equal(publicState(s).journey.careerComplete,true);assert.equal(publicState(s).journey.completion.nextAction.href,"/career/gym-wars");
});

test("every ambition explains its completion and normal payoff, including named fighters and challenge rewards",()=>{
  let s=start("ambition-descriptions");
  const options=publicState(s).ambitionOptions;
  for(const option of options) {
    assert.ok(option.description?.length>30, `${option.label} needs a completion description`);
    assert.ok(option.payoff?.length>20, `${option.label} needs an honest payoff`);
    assert.match(option.progress.label, /\d+ \/ \d+ [a-z]/, "progress names what is counted");
  }
  const cornerGoal=options.find((option)=>option.goalId==="complete-corner");
  for(const division of ["Featherweight","Lightweight","Middleweight","Heavyweight"]) assert.ok(cornerGoal.description.includes(division));
  for(const challenge of CAREER.challenges) {
    const option=options.find((entry)=>entry.challengeId===challenge.id);
    assert.ok(option.payoff.includes(challenge.reward.trophy));
    assert.ok(option.payoff.includes(`+${challenge.reward.legacy}`));
  }
  s=cmd(s,"select-ambition",{goalId:"first-belt",fighterId:"starter"});
  const chosen=publicState(s).ambition;
  assert.ok(chosen.description.includes(s.fighters[0].name));
  assert.ok(chosen.description.includes(String(CAREER.titleShotPoints)));
  s.fighters[0].released=true;
  assert.equal(publicState(s).ambition.description,chosen.description,"subject departure keeps the goal understandable");
});

test("signature access credits real owned history, requires full camps, and freezes new bouts at readiness",()=>{
  let s=start("signature-access");
  assert.throws(()=>cmd(s,"signature",{fighterId:"starter",signatureId:"pace-keeper"}),/one career bout and one full camp/);
  s.fighters[0].record.draws=1;
  s=cmd(s,"camp",{fighterId:"starter",preset:"balanced",weeks:1});s=advance(s,1);
  assert.equal(publicState(s).fighters[0].signatureAccess.eligible,true);
  s=cmd(s,"signature",{fighterId:"starter",signatureId:"clean-combinations"});
  s=book(s);const id=s.fights[0].id, frozenOpponent=clone(s.fights[0].opponentSnapshot);
  assert.throws(()=>cmd(s,"signature",{fighterId:"starter",signatureId:"pace-keeper"}),/permanent/);
  assert.throws(()=>cmd(s,"signature",{fighterId:"starter",signatureId:null}),/permanent/);
  s.rivals.find((r)=>r.id===s.fights[0].opponentId).gameplan.approach="grapple";
  s=advance(s,s.fights[0].eventWeek-s.week);
  assert.equal(s.fights[0].combatVersion,CURRENT_FIGHT_VERSION);assert.equal(s.fights[0].inputs.a.signatureId,"clean-combinations");
  assert.deepEqual(s.fights[0].inputs.b.gameplan,frozenOpponent.gameplan);
  assert.throws(()=>cmd(s,"signature",{fighterId:"starter",signatureId:"pace-keeper"}),/permanent/);
  s=cmd(s,"auto-fight",{fightId:id,expectedRound:0});const historic=clone(s.fights[0]);
  assert.throws(()=>cmd(s,"signature",{fighterId:"starter",signatureId:"pace-keeper"}),/permanent/);
  s=cmd(s,"signature",{fighterId:"starter",signatureId:"clean-combinations"});assert.deepEqual(s.fights[0],historic);
  assert.equal(s.fighters[0].history.filter((h)=>h.type==="signature").length,1);
  assert.equal(publicState(s).fighters[0].signatureAccess.chosen,true);
  assert.equal(publicState(s).fighters[0].signatureAccess.locked,true);
  assert.equal(s.fighters[0].history.findLast((h)=>h.type==="bout").signatureId,"clean-combinations");
  assert.equal(publicState(s).fights[0].preparation.you.signatureId,"clean-combinations");
  assert.equal(publicState(s).fights[0].replayAvailable,true);assert.ok(!publicState(s).fights[0].inputs);
  const interrupted=start("interrupted");interrupted.fighters[0].record.wins=1;interrupted.fighters[0].lastCamp={weeks:4,completed:1,interrupted:true};
  assert.equal(publicState(interrupted).fighters[0].signatureAccess.eligible,false);
  interrupted.fighters[0].rarity="elite";assert.equal(publicState(interrupted).fighters[0].signatureAccess.eligible,true);
});

test("an unchosen signature waits for fight night, then can be chosen once without changing recorded inputs",()=>{
  let s=start("permanent-after-fight");s.fighters[0].rarity="elite";
  s=book(s);s=advance(s,s.fights[0].eventWeek);
  assert.throws(()=>cmd(s,"signature",{fighterId:"starter",signatureId:"pace-keeper"}),/Fight inputs are locked/);
  s=cmd(s,"auto-fight",{fightId:s.fights[0].id,expectedRound:0});
  const historic=clone(s.fights[0]), week=s.week, cash=s.cash;
  s=cmd(s,"signature",{fighterId:"starter",signatureId:"pace-keeper"});
  assert.deepEqual(s.fights[0],historic);
  assert.equal(s.week,week);assert.equal(s.cash,cash);
  assert.throws(()=>cmd(s,"signature",{fighterId:"starter",signatureId:"escape-artist"}),/permanent/);
});

test("existing signature choices remain permanent across migration and every rarity",()=>{
  for(const rarity of ["journeyman","prospect","contender","elite","legend"]) {
    const s=start(`permanent-${rarity}`);s.version=2;
    s.fighters[0].rarity=rarity;s.fighters[0].signatureId="escape-artist";
    const before=clone(s), view=publicState(s);
    assert.deepEqual(s,before,"reading does not rewrite a save");
    assert.equal(view.fighters[0].signatureId,"escape-artist");
    assert.equal(view.fighters[0].signatureAccess.chosen,true);
    assert.throws(()=>cmd(s,"signature",{fighterId:"starter",signatureId:"chain-wrestling"}),/permanent/);
    assert.throws(()=>cmd(s,"signature",{fighterId:"starter",signatureId:null}),/permanent/);
    const advanced=cmd(s,"plan",{fighterId:"starter",plan:s.fighters[0].gameplan});
    assert.equal(advanced.fighters[0].signatureId,"escape-artist");
  }
});

test("old scheduled bouts pin combat3 and exclude signatures, while missing historical rules disable faithful film",()=>{
  let s=book(start("old-signature"));delete s.progression;s.version=2;
  delete s.fights[0].combatVersion;delete s.fights[0].signatureVersion;delete s.fights[0].engineVersion;delete s.fights[0].opponentSnapshot;
  s.fighters[0].rarity="legend";s=cmd(s,"signature",{fighterId:"starter",signatureId:"pace-keeper"});s=advance(s,s.fights[0].eventWeek);
  const b=s.fights[0];assert.equal(b.combatVersion,3);assert.equal(b.signatureVersion,0);assert.ok(!Object.hasOwn(b.inputs.a,"signatureId"));
  assert.equal(replay(b).engineVersion,3);
  s=cmd(s,"auto-fight",{fightId:b.id,expectedRound:0});delete s.fights[0].combatVersion;
  assert.equal(publicState(s).fights[0].replayAvailable,false);
});
