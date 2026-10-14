import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {flatten} from './logic-oracle.mjs';

const lessons=Object.fromEntries(await Promise.all(['6.2','6.3'].map(async id=>[id,JSON.parse(await readFile(new URL(`../data/lessons/${id}.json`,import.meta.url),'utf8'))])));
const blocks=(id,unit)=>flatten(lessons[id].units.find(u=>u.id===unit).blocks);
const table=(id,unit)=>blocks(id,unit).find(b=>b.type==='table').rows;
const factorial=n=>n<2?1:n*factorial(n-1);
const choose=(n,r)=>r>n?0:factorial(n)/(factorial(r)*factorial(n-r));
function subsets(a,r){if(r===0)return [[]];if(a.length<r)return [];return a.flatMap((x,i)=>subsets(a.slice(i+1),r-1).map(rest=>[x,...rest]));}
function orders(a,r=a.length){if(r===0)return [[]];return a.flatMap((x,i)=>orders(a.filter((_,j)=>j!==i),r-1).map(rest=>[x,...rest]));}
function distributions(n,k){if(k===1)return [[n]];return Array.from({length:n+1},(_,i)=>distributions(n-i,k-1).map(t=>[i,...t])).flat();}
const numeric=s=>Number(s.replaceAll(',',''));

test('6.2: ceiling bounds and minimum thresholds are sharp over all small distributions',()=>{
  for(let k=1;k<=5;k++)for(let n=1;n<=14;n++){
    const maxima=distributions(n,k).map(a=>Math.max(...a));
    assert.equal(Math.min(...maxima),Math.ceil(n/k));
  }
  for(const [k,r,safe,forced] of table('6.2','minimum-guarantee').map(row=>row.map(Number))){
    assert.equal(safe,k*(r-1));assert.equal(forced,safe+1);
    assert.equal(Array(k).fill(r-1).reduce((a,b)=>a+b,0),safe);
    assert.ok(distributions(forced,k).every(a=>Math.max(...a)>=r));
  }
  const loads=table('6.2','generalized-bound').map(r=>Number(r[1]));assert.equal(loads.reduce((a,b)=>a+b,0),23);assert.equal(Math.max(...loads),5);
});

test('6.2: bead guarantees respect both category quantifiers and available supply',()=>{
  const draws=[];for(let r=0;r<=8;r++)for(let b=0;b<=7;b++)for(let g=0;g<=6;g++)draws.push([r,b,g]);
  const avoiding=predicate=>Math.max(...draws.filter(predicate).map(a=>a.reduce((x,y)=>x+y,0)));
  const results=[avoiding(a=>Math.max(...a)<3)+1,avoiding(a=>a[1]<3)+1];
  assert.deepEqual(table('6.2','some-versus-specific').map(r=>Number(r[2])),results);
  assert.equal(avoiding(a=>a[2]<2)+1,17);
  assert.ok(draws.every(a=>a[1]<8),'Eight blue beads cannot be guaranteed');
  assert.equal(Math.ceil(130/64),3);assert.equal(new Set(Array.from({length:130},(_,i)=>`${Math.floor(i/64)}:${(i%64).toString(2).padStart(6,'0')}`)).size,130);
});

test('6.2: every eligible workstation group can be matched in the twelve-cable construction',()=>{
  const adj=[[0],[1],[2],[3],[0,1,2,3],[0,1,2,3]],groups=[];
  function match(group,edges,used=new Set()){if(!group.length)return true;return edges[group[0]].some(s=>!used.has(s)&&match(group.slice(1),edges,new Set([...used,s])));}
  for(let size=0;size<=4;size++)groups.push(...subsets([0,1,2,3,4,5],size));
  assert.ok(groups.every(g=>match(g,adj)));assert.equal(adj.flat().length,12);
  assert.equal(Number(table('6.2','connection-design').at(-1)[2]),adj.flat().length);
  // Every single cable in this construction is needed; the lesson separately proves the general lower bound.
  for(let w=0;w<6;w++)for(const s of adj[w]){const reduced=adj.map((a,i)=>i===w?a.filter(v=>v!==s):a);assert.ok(groups.some(g=>!match(g,reduced)));}
  for(let missing=0;missing<4;missing++){const withoutServer=Array.from({length:4},()=>[0,1,2,3].filter(s=>s!==missing));assert.equal(match([0,1,2,3],withoutServer),false);}
});

test('6.2: repunit collisions create positive decimal zero-one multiples',()=>{
  for(let n=1;n<=50;n++){
    const seen=new Map();let rep=0n,found=false;
    for(let j=1;j<=n+1;j++){
      rep=rep*10n+1n;const rem=rep%BigInt(n);
      if(seen.has(rem)){const difference=rep-seen.get(rem);assert.ok(difference>0n);assert.equal(difference%BigInt(n),0n);assert.match(String(difference),/^1+0+$/);found=true;break;}
      seen.set(rem,rep);
    }
    assert.ok(found);
  }
  for(const [,value,remainder] of table('6.2','zero-one-multiple'))assert.equal(BigInt(value)%7n,BigInt(remainder));
  assert.equal(1111110n,7n*158730n);
});

test('6.2: all twelve-day schedules with positive counts and total at most seventeen have a six-task interval',()=>{
  let checked=0;
  function visit(days,extra){
    if(days.length===12){checked++;let hasSix=false;for(let i=0;i<12;i++){let sum=0;for(let j=i;j<12;j++){sum+=days[j];if(sum===6)hasSix=true;}}assert.ok(hasSix);return;}
    for(let x=0;x<=extra;x++)visit([...days,1+x],extra-x);
  }
  visit([],5);assert.equal(checked,6188);
  let sum=0;for(const [,tasks,total] of table('6.2','prefix-totals')){sum+=Number(tasks);assert.equal(sum,Number(total));}
});

test('6.2: odd-part boxes force divisibility in all small selections',()=>{
  function oddPart(n){while(n%2===0)n/=2;return n;}
  for(let n=1;n<=7;n++)for(const selection of subsets(Array.from({length:2*n},(_,i)=>i+1),n+1)){
    assert.ok(selection.some((a,i)=>selection.some((b,j)=>i!==j&&b%a===0)));
    const groups=Map.groupBy(selection,oddPart);assert.ok([...groups.values()].some(a=>a.length>1));
    for(const group of groups.values())for(const a of group)for(const b of group)if(b>=a)assert.equal(b%a,0);
  }
  for(const [values,q] of table('6.2','odd-part-boxes'))for(const value of values.split(', ').map(Number))assert.equal(oddPart(value),Number(q));
});

test('6.2: longest-subsequence labels and sharpness examples match independent enumeration',()=>{
  function lengths(a){return a.map((_,i)=>{const remaining=a.slice(i+1);let inc=1,dec=1;for(let size=1;size<=remaining.length;size++)for(const tail of subsets(remaining,size)){const seq=[a[i],...tail];if(seq.every((x,j)=>!j||seq[j-1]<x))inc=Math.max(inc,seq.length);if(seq.every((x,j)=>!j||seq[j-1]>x))dec=Math.max(dec,seq.length);}return [inc,dec];});}
  const rows=table('6.2','monotone-subsequences');assert.deepEqual(lengths(rows.map(r=>Number(r[0]))),rows.map(r=>r.slice(1).map(Number)));
  for(const a of orders([1,2,3,4,5]))assert.ok(Math.max(...lengths(a).flat())>=3);
  const tight=lengths([3,2,1,6,5,4,9,8,7]);assert.equal(Math.max(...tight.map(r=>r[0])),3);assert.equal(Math.max(...tight.map(r=>r[1])),3);
});

test('6.2: every two-coloring on six vertices has a monochromatic triangle, and the five-vertex diagram has none',async()=>{
  const pairs=subsets([0,1,2,3,4,5],2),triples=subsets([0,1,2,3,4,5],3).map(t=>subsets(t,2).map(p=>pairs.findIndex(q=>q.join()==p.join())));
  for(let mask=0;mask<2**pairs.length;mask++)assert.ok(triples.some(edges=>edges.every(i=>((mask>>i)&1)===((mask>>edges[0])&1))));
  const svg=await readFile(new URL('../assets/ramsey-five.svg',import.meta.url),'utf8');
  const colors=new Map([...svg.matchAll(/data-edge="([A-E]-[A-E])" data-color="(red|blue)"/g)].map(m=>[m[1],m[2]]));assert.equal(colors.size,10);
  for(const t of subsets([...'ABCDE'],3)){const c=subsets(t,2).map(p=>colors.get(p.join('-')));assert.ok(c.every(Boolean));assert.equal(new Set(c).size,2);}
});

test('6.3: permutation and combination counts and uniform multiplicities match small exhaustive selections',()=>{
  for(let n=0;n<=7;n++)for(let r=0;r<=n+1;r++){
    const a=Array.from({length:n},(_,i)=>i),ordered=orders(a,r),unordered=subsets(a,r);
    assert.equal(ordered.length,r>n?0:factorial(n)/factorial(n-r));assert.equal(unordered.length,choose(n,r));
    const groups=Map.groupBy(ordered,p=>p.toSorted().join(','));assert.equal(groups.size,unordered.length);assert.ok([...groups.values()].every(g=>g.length===factorial(r)));
  }
  assert.deepEqual(table('6.3','factorial-boundaries').map(r=>Number(r[2])),[orders([0,1,2,3,4,5]).length,6,1,1]);
  assert.equal(subsets([0,1,2,3,4,5,6],3).length,35);
});

test('6.3: named roles, Ava restrictions, and fixed route endpoints keep distinct orders',()=>{
  const assignments=orders([...'ABCDEFGHI'],3),counts=[assignments.length,assignments.filter(a=>a[0]==='A').length,assignments.filter(a=>a.includes('A')).length,assignments.filter(a=>!a.includes('A')).length];
  assert.deepEqual(table('6.3','roles-and-restrictions').map(r=>Number(r[2])),counts);
  const routes=orders([0,1,2,3,4,5,6]);assert.equal(routes.filter(a=>a[0]===0).length,720);assert.equal(routes.filter(a=>a[0]===0&&a.at(-1)===6).length,120);
});

test('6.3: consecutive, variable-order, disjoint, overlapping and impossible blocks match all seven-letter rows',()=>{
  const rows=orders([...'ABCDEFG']).map(a=>a.join(''));
  const counts=[rows.filter(s=>s.includes('CDE')).length,rows.filter(s=>orders([...'CDE']).some(p=>s.includes(p.join('')))).length,rows.filter(s=>s.includes('AB')&&s.includes('FG')).length,rows.filter(s=>s.includes('BCD')&&s.includes('CDE')).length,rows.filter(s=>s.includes('AB')&&s.includes('AC')).length];
  assert.deepEqual(table('6.3','consecutive-blocks').map(r=>Number(r[2])),counts);assert.equal(rows.filter(s=>s[0]==='A'&&s.includes('CDE')).length,24);
});

test('6.3: displayed groups, order illustration and cancel-first arithmetic count the intended subsets',async()=>{
  const groups=table('6.3','combination-definition').map(r=>r[0]);assert.deepEqual(groups,subsets([...'ABCDE'],3).map(a=>'{'+a.join(', ')+'}'));
  const pairs=table('6.3','order-test');assert.equal(pairs.length,6);assert.equal(new Set(pairs.map(r=>r[0])).size,6);assert.equal(pairs.flatMap(r=>r[1].match(/\([A-D], [A-D]\)/g)).length,12);
  const svg=await readFile(new URL('../assets/permutation-combination.svg',import.meta.url),'utf8');assert.deepEqual([...svg.matchAll(/<text[^>]*>([ABC]{3})<\/text>/g)].map(m=>m[1]).toSorted(),orders([...'ABC']).map(a=>a.join('')).toSorted());
  assert.equal(subsets(Array.from({length:15},(_,i)=>i),4).length,1365);assert.equal(subsets(Array.from({length:9},(_,i)=>i),2).length,36);
  assert.deepEqual(table('6.3','compute-combinations').map(r=>Number(r[2])),[1,1,15,1]);
});

test('6.3: complement maps are invertible for all small subsets, including empty and full',()=>{
  for(let n=0;n<=10;n++){const universe=Array.from({length:n},(_,i)=>i);for(let r=0;r<=n;r++){const selected=subsets(universe,r),complements=selected.map(a=>universe.filter(x=>!a.includes(x)));assert.equal(new Set(complements.map(a=>a.join(','))).size,choose(n,n-r));for(let i=0;i<selected.length;i++)assert.deepEqual(universe.filter(x=>!complements[i].includes(x)),selected[i]);}}
  assert.equal(choose(12,10),66);assert.equal(choose(15,11),1365);
});

test('6.3: bit-position subsets and exact, at-most, at-least counts agree with all 128 strings',()=>{
  const bits=Array.from({length:128},(_,i)=>i.toString(2).padStart(7,'0')),weight=s=>[...s].filter(c=>c==='1').length;
  const counts=[bits.filter(s=>weight(s)===3).length,bits.filter(s=>weight(s)<=2).length,bits.filter(s=>weight(s)>=3).length];assert.deepEqual(table('6.3','bit-positions').map(r=>Number(r[2])),counts);
  assert.equal(Array.from({length:7},(_,i)=>[2,4,7].includes(i+1)?'1':'0').join(''),'0101001');
});

test('6.3: disjoint committee categories and named jobs produce the published totals',()=>{
  const teams=subsets(Array.from({length:11},(_,i)=>i),5),designers=a=>a.filter(i=>i<5).length,exact=teams.filter(a=>designers(a)===2),any=teams.filter(a=>designers(a)>=1);
  const roles=new Set(exact.flatMap(a=>orders(a,2).map(p=>a.join(',')+'|'+p.join(','))));assert.deepEqual(table('6.3','committee-cases').map(r=>numeric(r[2])),[exact.length,any.length,roles.size]);
  assert.equal(subsets([0,1,2,3,4,5,6,7],3).filter(a=>a.includes(0)).length,21);
});

test('6.3: gap construction bijects to all and only rows with separated learners',()=>{
  const valid=orders([...'ABCDxyz']).filter(a=>a.every((c,i)=>!i||!('xyz'.includes(c)&&'xyz'.includes(a[i-1])))).map(a=>a.join(''));
  const constructed=[];for(const mentors of orders([...'ABCD']))for(const gaps of subsets([0,1,2,3,4],3))for(const learners of orders([...'xyz'])){let s='',j=0;for(let i=0;i<5;i++){if(gaps.includes(i))s+=learners[j++];if(i<4)s+=mentors[i];}constructed.push(s);}
  assert.equal(constructed.length,1440);assert.equal(new Set(constructed).size,constructed.length);assert.deepEqual(constructed.toSorted(),valid.toSorted());
});
