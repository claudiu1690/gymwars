// Read-only snapshots of actual accepted late cup cards in the isolated run.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const {MongoClient}=require('mongodb');
const {folder,dbName}=require('./playthroughConfig.cjs');
(async()=>{const runtime=JSON.parse(fs.readFileSync(path.join(folder,'runtime.json'))),url=new URL(runtime.uri);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/'+dbName);const c=await MongoClient.connect(runtime.uri);
try{const db=c.db(dbName);for(const {name} of await db.listCollections().toArray()){
  if(!/warmatch/i.test(name))continue;const cards=await db.collection(name).find({'result.challenge.id':{$exists:true}}).sort({createdAt:-1}).limit(6).toArray();
  const avg=f=>Math.round(Object.values(f.stats).reduce((n,x)=>n+x,0)/4*10)/10;
  const summaries=cards.map(m=>({id:String(m._id),week:m.week,challenge:m.result.challenge.id,outcome:m.result.outcome,wins:m.result.wins,losses:m.result.losses,bouts:m.result.bouts.map((b,i)=>({weight:m.inputs.attacker.lineup[i].weightClass,ours:avg(m.inputs.attacker.lineup[i]),theirs:avg(m.inputs.defender.lineup[i]),oursPlan:m.inputs.attacker.lineup[i].gameplan,theirsPlan:m.inputs.defender.lineup[i].gameplan,winner:b.result.winner,method:b.result.method}))}));fs.writeFileSync(path.join(folder,'late-cup-diagnostic.json'),JSON.stringify(summaries,null,2));console.log(JSON.stringify(summaries,null,2));
}}finally{await c.close();}})().catch(e=>{console.error(e);process.exitCode=1});
