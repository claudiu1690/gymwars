// Final read-only browser/API evidence for the named synthetic account.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {folder,baseURL,gymName}=require("./playthroughConfig.cjs");
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const context=await browser.newContext({baseURL,storageState:path.join(folder,"browser.json"),viewport:{width:1440,height:1000}});
    const page=await context.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.goto("/career");await page.waitForLoadState("networkidle");
    assert((await page.locator("body").innerText()).includes(gymName),"Expected synthetic gym identity");
    const token=await page.evaluate(()=>localStorage.getItem("gw_token"));
    const data={};
    for(const [name,route] of [["career","/api/career"],["achievements","/api/career/achievements"],["wars","/api/career/wars/lobby"]]) {
      const response=await context.request.get(route,{headers:{Authorization:"Bearer "+token}});
      assert.equal(response.status(),200,route);
      data[name]=await response.json();
      fs.writeFileSync(path.join(folder,"final-"+name+".json"),JSON.stringify(data[name],null,2));
    }
    for(const [name,route] of [["home","/career"],["career-path","/career/campaign"],["achievements","/career/achievements"],["wars","/career/gym-wars"]]) {
      await page.goto(route);await page.waitForLoadState("networkidle");
      if(name==="wars") await page.getByRole("tab",{name:"Leaderboard",exact:true}).click();
      fs.writeFileSync(path.join(folder,"final-"+name+"-ui.txt"),await page.locator("body").innerText());
      await page.screenshot({path:path.join(folder,"final-"+name+"-desktop.png"),fullPage:true});
    }
    await page.setViewportSize({width:390,height:844});
    await page.goto("/career/gym-wars");await page.waitForLoadState("networkidle");
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"No phone horizontal overflow");
    await page.screenshot({path:path.join(folder,"final-wars-mobile.png"),fullPage:true});
    fs.writeFileSync(path.join(folder,"final-browser-errors.json"),JSON.stringify(errors));
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({week:data.career.career.week,cash:data.career.career.cash,earned:data.achievements.earnedCount,total:data.achievements.total,cups:data.wars.challenges.map(c=>({name:c.name,complete:c.complete})),browserErrors:errors.length}));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
