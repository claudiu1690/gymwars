// Read-only acceptance audit of the continuous UI action log.
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline'),crypto=require('node:crypto');
const {folder}=require('./playthroughConfig.cjs');
(async()=>{
  let before=null;const violations=[],entries=[],titles=[],honors=[],immutable=new Map();let compares=0;
  const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
  for await(const line of readline.createInterface({input:fs.createReadStream(path.join(folder,'actions.jsonl')),crlfDelay:Infinity})){
    const e=JSON.parse(line);if(e.kind!=='mutation'||e.status>=300||!e.result?.career)continue;
    const c=e.result.career,previousIds=new Set(before?.fights.map(f=>f.id)||[]);
    for(const b of c.fights){
      if(!previousIds.has(b.id)&&before){
        const f=before.fighters.find(f=>f.id===b.fighterId),minimum=['city','state'].includes(b.circuit?.id)?2:['national','champions','world'].includes(b.circuit?.id)?4:0;
        // Circuit challenges have their own explicit entry rules; ordinary newly signed offers use individual qualification.
        if(!b.challengeId&&minimum){const item={id:b.id,circuit:b.circuit.id,fighterId:b.fighterId,wins:f.record.wins,minimum,week:before.week};entries.push(item);if(item.wins<minimum)violations.push({type:'individual-qualification',...item});}
        if(b.challengeId==='world-open'&&!['national-showcase','next-generation'].every(id=>before.gymDevelopment.challenges.find(x=>x.id===id)?.complete))violations.push({type:'finale-order',id:b.id});
        if(b.title){titles.push({id:b.id,week:before.week,show:b.show,winBonus:b.winBonus,...b.titlePurse});const development=b.titlePurse.skillGap>12||b.titlePurse.wins>=2;if(development!==b.titlePurse.development||b.show!==(development?300:500)||b.winBonus!==(development?450:900))violations.push({type:'title-quote',id:b.id});}
      }
      if(b.status==='resolved'){
        const stable={result:b.result,preparation:b.preparation,show:b.show,winBonus:b.winBonus,honorReward:b.honorReward,rewards:b.rewards,combatVersion:b.combatVersion},hash=digest(stable);
        if(immutable.has(b.id)){compares++;if(immutable.get(b.id)!==hash)violations.push({type:'changed-terminal-bout',id:b.id,week:c.week});}
        else {immutable.set(b.id,hash);if(b.rewards?.honor?.completed)honors.push({id:b.id,circuit:b.circuit.id,cash:b.rewards.honor.reward.cash,week:b.resolvedWeek});}
      }
    }
    before=c;
  }
  const byCircuit={};for(const h of honors){byCircuit[h.circuit]=(byCircuit[h.circuit]||0)+1;if(byCircuit[h.circuit]>1)violations.push({type:'repeated-honor-cash',circuit:h.circuit});}
  const manifest=JSON.parse(fs.readFileSync(path.join(folder,'source-manifest.json')));
  // Hash bytes directly to match the manifest; never write gameplay files.
  const changedSource=manifest.files.filter(f=>crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',f.file))).digest('hex')!==f.sha256).map(f=>f.file);
  const result={qualifiedBookings:entries.length,entries,titleBookings:titles.length,competitiveTitles:titles.filter(t=>!t.development).length,developmentTitles:titles.filter(t=>t.development).length,titles,honorAwards:honors,terminalBouts:immutable.size,terminalComparisons:compares,violations,changedSource};
  fs.writeFileSync(path.join(folder,'acceptance-audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,entries:undefined,titles:undefined},null,2));
  if(violations.length||changedSource.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
