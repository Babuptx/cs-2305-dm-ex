import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {chromium} from 'playwright';

// A real cacheable HTTP origin: Playwright request interception would disable
// the browser cache and hide the returning-reader regression this checks.
const current=JSON.parse(await readFile('data/manifest.json','utf8'));
const old=structuredClone(current);
Object.assign(old.chapters.find(c=>c.id==='chapter-1').children[0],{status:'unavailable',path:null});
const lesson=JSON.parse(await readFile('data/lessons/1.1.json','utf8'));
let published=false,browser;
const requests=[];
const root=resolve('dist');
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
    res.setHeader('Cache-Control','public, max-age=600');
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[extname(file)]||'text/plain');
    const tag='"'+(published?'published':'shell')+'"';res.setHeader('ETag',tag);
    requests.push({pathname,conditional:req.headers['if-none-match']});
    if(req.headers['if-none-match']===tag){res.writeHead(304).end();return;}
    if(pathname==='/data/manifest.json'){res.end(JSON.stringify(published?current:old));return;}
    if(pathname==='/data/lessons/1.1.json'){
      const copy=structuredClone(lesson);
      if(published)copy.units[0].blocks[0].blocks[0].text='Updated lesson content from the server.';
      res.end(JSON.stringify(copy));return;
    }
    res.end(await readFile(file));
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  browser=await chromium.launch({headless:true});const page=await browser.newPage();
  const url='http://127.0.0.1:'+server.address().port+'/';
  await page.goto(url+'#1.1');await page.getByRole('heading',{name:'Not yet available.'}).waitFor();
  // Seed a previously visited draft in the normal browser HTTP cache too.
  await page.evaluate(()=>fetch('data/lessons/1.1.json').then(response=>response.json()));
  published=true;
  await page.getByRole('button',{name:'Check for updates'}).click();
  await page.getByText('Updated lesson content from the server.',{exact:true}).waitFor();
  assert.equal(await page.locator('.lesson-unit').count(),11);
  assert.ok(requests.filter(r=>r.pathname==='/data/manifest.json').length>=2);
  assert.ok(requests.filter(r=>r.pathname==='/data/lessons/1.1.json').length>=2);
  await page.reload();await page.getByText('Updated lesson content from the server.',{exact:true}).waitFor();
  // Same-tab navigation must also refresh an in-memory unavailable entry.
  published=false;await page.goto(url+'#1.4');await page.getByRole('heading',{name:'Not yet available.'}).waitFor();
  published=true;await page.goto(url+'#1.1');await page.getByText('Updated lesson content from the server.',{exact:true}).waitFor();
  const html=await readFile('dist/index.html','utf8'),app=await readFile('dist/js/app.js','utf8');
  const version=html.match(/js\/app\.js\?v=([a-f0-9]{12})/)[1];
  assert.ok(html.includes('styles.css?v='+version));assert.ok(app.includes('./content.js?v='+version));
  console.log('Returning-reader regression passed with a real 10-minute HTTP cache: availability, lesson data, reload, navigation, and versioned assets.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
