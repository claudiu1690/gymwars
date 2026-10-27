// Read-only ledger/isolation audit and export, then stop only this named private host.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {MongoClient,BSON}=require('mongodb');const {folder,dbName,runId,baseURL}=require('./playthroughConfig.cjs');
(async()=>{
  assert.match(runId,/^playthrough-multiplayer-/);assert.ok(fs.existsSync(path.join(folder,'multiplayer-results.json')),'Finish the browser scenario before sealing evidence');
  const runtime=JSON.parse(fs.readFileSync(path.join(folder,'runtime.json'))),url=new URL(runtime.uri);
  assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/'+dbName);
  const client=await MongoClient.connect(runtime.uri);let audit;
  try{
    const db=client.db(dbName),users=await db.collection('users').find({}).toArray(),gyms=await db.collection('gyms').find({}).toArray();
    assert.equal(users.length,2);assert.deepEqual(users.map(x=>x.email).sort(),['north','south'].map(x=>`${runId}-${x}@gymwars.invalid`).sort());
    assert.equal(gyms.length,2);assert.deepEqual(gyms.map(x=>x.name).sort(),['Acceptance North','Acceptance South']);
    const collections={};for(const {name} of await db.listCollections().toArray())if(!name.startsWith('system.'))collections[name]={documents:await db.collection(name).find({}).toArray(),indexes:await db.collection(name).indexes()};
    const matchCollection=Object.keys(collections).find(name=>collections[name].documents.some(x=>x.result?.bouts?.length===4 && x.defenderGymId));assert.ok(matchCollection);
    const matches=collections[matchCollection].documents,actions=fs.readFileSync(path.join(folder,'multiplayer-actions.jsonl'),'utf8').trim().split('\n').map(JSON.parse),accepted=new Map(actions.filter(e=>e.kind==='accepted-ui-response'&&e.status===200&&e.value?.bouts?.length===4).map(e=>[e.value.id,e]));
    assert.equal(matches.length,accepted.size);let comparisons=0;
    for(const m of matches){const e=accepted.get(String(m._id));assert.ok(e,'Every committed result has its original accepted UI response');const original={...e.value};delete original.id;delete original.teams;assert.deepEqual(JSON.parse(JSON.stringify(m.result)),original);comparisons++;assert.ok(gyms.some(g=>String(g._id)===String(m.gymId)));assert.ok(gyms.some(g=>String(g._id)===String(m.defenderGymId)));assert.notEqual(String(m.gymId),String(m.defenderGymId));
      for(const [side,publicSide] of [['attacker','A'],['defender','B']]){const lineup=m.inputs[side].lineup;assert.equal(new Set(lineup.map(f=>f.id)).size,4);assert.deepEqual(lineup.map(f=>f.weightClass).sort(),['featherweight','heavyweight','lightweight','middleweight']);assert.ok(lineup.every(f=>f.gameplan?.approach));
        assert.equal(e.value.teams[publicSide].name,m.inputs[side].name);assert.deepEqual(e.value.teams[publicSide].lineup,lineup.map(({id,name,weightClass,portrait,rarity,style,gameplan})=>({id,name,weightClass,portrait,rarity,style,gameplan})));}
    }
    const accounting={};for(const id of ['north','south'])accounting[id]={tokens:1,weeks:8,calendar:0,cash:1600,attacks:0};
    for(const e of actions){if(e.kind==='normal-return'){for(const a of Object.values(accounting)){a.tokens=Math.min(3,a.tokens+1);a.weeks=Math.min(12,a.weeks+4);}}else if(e.kind==='accepted-ui-response'&&e.status===200){const a=accounting[e.actor];if(e.value?.bouts?.length===4){a.tokens--;a.attacks++;assert.ok(a.tokens>=0);}else if(e.value?.week!==undefined){const isEnd=e.request?.command?.type==='advance';assert.equal(e.value.week,a.calendar+(isEnd?1:0),'Only manual End week advances the career');if(isEnd)a.weeks--;assert.ok(a.weeks>=0);a.calendar=e.value.week;a.cash=e.value.cash;}}}
    for(const id of ['north','south']){const v=JSON.parse(fs.readFileSync(path.join(folder,id+'-final-career.json'))),a=accounting[id];assert.equal(v.allowances.leagueCards.freeAvailable,a.tokens);assert.equal(v.allowances.careerWeeks.freeAvailable,a.weeks);assert.equal(v.career.week,a.calendar);assert.equal(v.career.cash,a.cash);assert.equal(v.allowances.leagueCards.extraAvailable,0);assert.equal(v.allowances.careerWeeks.extraAvailable,0);}
    const manifest=JSON.parse(fs.readFileSync(path.join(folder,'source-manifest.json'))),crypto=require('node:crypto');assert.ok(manifest.files.every(f=>crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',f.file))).digest('hex')===f.sha256));
    audit={isolatedAccounts:2,committedCards:matches.length,immutableResultComparisons:comparisons,accounting,sourceUnchanged:true,fixtures:false,boosts:false,rejectedRequests:actions.filter(e=>e.kind==='accepted-ui-response'&&e.status>=400).map(e=>({actor:e.actor,route:e.route,status:e.status,message:e.value.message}))};
    fs.writeFileSync(path.join(folder,'multiplayer-ledger-audit.json'),JSON.stringify(audit,null,2));
    fs.writeFileSync(path.join(folder,'final-database.ejson'),BSON.EJSON.stringify({format:'gymwars-independent-multiplayer-v1',createdAt:new Date(),collections}),{flag:'wx'});
  }finally{await client.close();}
  const meta=JSON.parse(fs.readFileSync(path.join(folder,'host.json'))),stopped=await fetch(baseURL+'/__playthrough/stop',{method:'POST',headers:{'X-Playthrough-Key':meta.key}});assert.ok(stopped.ok);console.log(JSON.stringify(audit,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
