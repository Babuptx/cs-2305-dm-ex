import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=Number(process.env.TEST_PORT||8082),url=process.env.TEST_URL||'http://127.0.0.1:'+port+'/';
let server,browser;
if(!process.env.TEST_URL)server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe'});
try {
  for(let i=0;i<50;i++){try{if((await fetch(url)).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const lessonRequests=[];page.on('request',r=>{if(r.url().includes('/lessons/'))lessonRequests.push(r.url());});
  await page.goto(url);await page.getByRole('heading',{name:'Make sense of discrete mathematics.'}).waitFor();
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/home.png',fullPage:true});
  assert.equal(await page.locator('#contents > details').count(),16);assert.equal(await page.locator('#contents a').count(),96);
  assert.equal(lessonRequests.length,0,'Homepage must not preload lessons');
  await page.locator('[data-chapter="chapter-1"] summary').click();await page.locator('[data-entry="1.1"]').click();
  await page.locator('#unit-recap').waitFor();assert.equal(await page.locator('[aria-current="page"][data-entry]').getAttribute('data-entry'),'1.1');assert.equal(lessonRequests.length,1);assert.equal(await page.locator('.lesson-unit').count(),11);
  assert.equal(await page.locator('.check details[open]').count(),0);await page.locator('.check summary').first().click();assert.equal(await page.locator('.check details[open]').count(),1);
  await page.getByRole('button',{name:'A programming if-statement performs an action'}).click();assert.equal(await page.evaluate(()=>document.activeElement.textContent),'8. A programming if-statement performs an action');await page.screenshot({path:'test-results/lesson-desktop.png'});
  await page.reload();await page.getByRole('heading',{name:'Propositional Logic'}).waitFor();
  await page.goto(url+'#13.5');await page.getByRole('heading',{name:'Turing Machines'}).waitFor();assert.equal(await page.locator('[data-chapter="chapter-13"]').getAttribute('open'),'');
  assert.ok(await page.locator('[data-entry="13.5"]').evaluate(node=>{const rect=node.getBoundingClientRect();return rect.top>=88&&rect.bottom<=innerHeight;}));
  assert.ok(await page.evaluate(()=>{const side=document.querySelector('#sidebar');return side.scrollHeight>side.clientHeight&&getComputedStyle(side).overflowY==='auto';}));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  await page.goto(url+'#does-not-exist');await page.getByRole('heading',{name:'Section not found'}).waitFor();
  await page.setViewportSize({width:390,height:844});await page.goto(url+'#1.1');await page.getByRole('heading',{name:'Propositional Logic'}).waitFor();assert.equal(await page.locator('#sidebar').evaluate(e=>e.inert),true);
  await page.locator('#unit-recap').waitFor();await page.waitForFunction(()=>document.querySelector('#sidebar').getBoundingClientRect().right<=0);await page.getByRole('button',{name:'Build a compound truth table one column at a time'}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/lesson-mobile.png'});
  await page.locator('#unit-compound-tables .table-wrap').first().scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/lesson-mobile-table.png'});
  await page.locator('#unit-bits h2').scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#menu').click();assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#sidebar').evaluate(e=>e.inert),false);
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Reference material');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'close-menu');
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'menu');
  await page.locator('#menu').click();await page.locator('[data-entry="1.2"]').click();await page.getByRole('heading',{name:'Applications of Propositional Logic'}).waitFor();assert.equal(await page.locator('#menu').getAttribute('aria-expanded'),'false');
  await page.waitForFunction(()=>document.querySelector('#sidebar').getBoundingClientRect().right<=0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/mobile.png',fullPage:true});
  await page.locator('#menu').click();await page.waitForFunction(()=>document.querySelector('#sidebar').getBoundingClientRect().left>=0);await page.screenshot({path:'test-results/mobile-drawer.png'});await page.keyboard.press('Escape');
  // Intercepted fixtures test future lesson behavior without publishing lesson files.
  const manifest=JSON.parse(await readFile('data/manifest.json','utf8'));manifest.chapters.find(c=>c.id==='chapter-1').children[0].status='in-progress';manifest.chapters.find(c=>c.id==='chapter-1').children[0].path='data/lessons/1.1.json';
  await page.route('**/data/manifest.json',r=>r.fulfill({json:manifest}));let fail=true;
  await page.route('**/data/lessons/1.1.json',r=>fail?r.fulfill({status:503,body:'Unavailable'}):r.fulfill({json:{schemaVersion:1,id:'1.1',title:'Propositional Logic',status:'in-progress',references:['Test fixture'],units:[{id:'test',title:'Browser fixture',status:'in-progress',blocks:[{type:'math',notation:'p → q',description:'p implies q'},{type:'check',prompt:'Fixture check',explanation:[{type:'paragraph',text:'Fixture answer'}]}]}]}}));
  await page.goto(url+'#1.1');await page.reload();await page.getByText('This lesson could not be loaded. Please try again.').waitFor();fail=false;await page.getByRole('button',{name:'Try again'}).click();await page.getByRole('heading',{name:'Browser fixture'}).waitFor();await page.getByText('Show explanation').click();assert.equal(await page.getByText('Fixture answer').isVisible(),true);
  await page.unroute('**/data/manifest.json');await page.route('**/data/manifest.json',r=>r.fulfill({status:503,body:'Unavailable'}));await page.reload();await page.getByRole('heading',{name:'Something went wrong'}).waitFor();await page.unroute('**/data/manifest.json');await page.unroute('**/data/lessons/1.1.json');await page.getByRole('button',{name:'Try again'}).click();await page.locator('#unit-recap').waitFor();
  assert.deepEqual(errors,[]);console.log('Desktop/mobile, deep links, keyboard drawer, empty states, lazy loading, checks and error recovery passed.');
} finally {await browser?.close();server?.kill();}

