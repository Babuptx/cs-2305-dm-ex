import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['6.4','6.5'].map(async id=>[id,JSON.parse(await readFile(new URL(`../data/lessons/${id}.json`,import.meta.url),'utf8'))])));
const blocks=(id,unit)=>flatten(lessons[id].units.find(u=>u.id===unit).blocks);
const table=(id,unit)=>blocks(id,unit).find(b=>b.type==='table').rows;
const factorial=n=>n<2?1n:BigInt(n)*factorial(n-1);
const C=(n,k)=>k<0||k>n?0n:factorial(n)/(factorial(k)*factorial(n-k));
function strings(n,r){return r===0?[[]]:strings(n,r-1).flatMap(s=>Array.from({length:n},(_,i)=>[...s,i]));}
function subsets(n,k){return strings(2,n).filter(s=>s.reduce((a,b)=>a+b,0)===k).map(s=>s.flatMap((v,i)=>v?[i]:[]));}
function distributions(r,n){return n===1?[[r]]:Array.from({length:r+1},(_,i)=>distributions(r-i,n-1).map(t=>[i,...t])).flat();}
function orders(a){return a.length===0?[[]]:a.flatMap((x,i)=>orders(a.filter((_,j)=>j!==i)).map(p=>[x,...p]));}
function polynomial(factor,n){let p=new Map([['0,0',1n]]);for(let i=0;i<n;i++){const next=new Map();for(const [key,v] of p){const [x,y]=key.split(',').map(Number);for(const [dx,dy,c] of factor){const k=[x+dx,y+dy].join(',');next.set(k,(next.get(k)||0n)+v*c);}}p=next;}return p;}
const number=s=>Number(s.replaceAll('−','-').replaceAll(',',''));

test('6.4: factor-choice counts and the expansion table match independent polynomial multiplication',()=>{
  const p=polynomial([[1,0,1n],[0,1,1n]],5);
  for(const [j,coefficient,x,y] of table('6.4','expansion-table')){assert.equal(Number(x)+Number(y),5);assert.equal(Number(j),Number(y));assert.equal(p.get([x,y].join(',')),BigInt(coefficient));}
  for(let n=0;n<=9;n++){const actual=polynomial([[1,0,1n],[0,1,1n]],n);assert.equal(actual.size,n+1);for(let j=0;j<=n;j++)assert.equal(actual.get([n-j,j].join(',')),C(n,j));}
  assert.deepEqual([0,1,2,3].map(k=>subsets(3,k).length),[1,3,3,1]);
});

test('6.4: scaled signs and exponent-matching examples agree with exact polynomial coefficients',()=>{
  const p=polynomial([[1,0,2n],[0,1,-1n]],6);
  for(const [j,,,coefficient] of table('6.4','scaled-and-negative'))assert.equal(p.get([6-Number(j),Number(j)].join(',')),BigInt(number(coefficient)));
  assert.equal(polynomial([[1,0,3n],[0,1,-2n]],5).get('2,3'),-720n);
  const powers=polynomial([[2,0,1n],[0,0,3n]],5);assert.equal(powers.get('6,0'),90n);assert.equal(powers.get('5,0')||0n,0n);
  assert.equal(polynomial([[1,0,1n],[0,1,2n]],7).get('4,2')||0n,0n);
  assert.equal(polynomial([[0,0,1n],[1,0,2n]],5).get('3,0'),80n);
});

test('6.4: row sums count all subsets and toggling pairs even with odd exactly when n is positive',()=>{
  for(let n=0;n<=12;n++){
    const bits=strings(2,n),histogram=Array(n+1).fill(0n);for(const a of bits)histogram[a.reduce((x,y)=>x+y,0)]++;
    assert.equal(histogram.reduce((a,b)=>a+b,0n),2n**BigInt(n));assert.equal(histogram.reduce((a,b,k)=>a+(k%2?-b:b),0n),n?0n:1n);
    for(const a of bits)if(n){const b=[1-a[0],...a.slice(1)];assert.notEqual(a.reduce((x,y)=>x+y,0)%2,b.reduce((x,y)=>x+y,0)%2);assert.deepEqual([1-b[0],...b.slice(1)],a);}
  }
  assert.deepEqual(table('6.4','even-and-odd').map(r=>Number(r[2])),[16,16]);
});

test('6.4: weighted subsets biject to unused and colored states',()=>{
  const states=strings(3,4),histogram=Array(5).fill(0);for(const s of states)histogram[s.filter(v=>v!==0).length]++;
  assert.deepEqual(table('6.4','weighted-subsets').map(r=>Number(r[3])),histogram);assert.equal(states.length,81);
  for(let n=0;n<=9;n++){let sum=0n;for(let k=0;k<=n;k++)sum+=2n**BigInt(k)*C(n,k);assert.equal(sum,3n**BigInt(n));}
  assert.equal(strings(4,5).length,1024);
});

test('6.4: published Pascal rows and SVG coefficients follow the addition recurrence',async()=>{
  const rows=table('6.4','pascal-triangle').map(r=>r[1].split(', ').map(Number));
  assert.deepEqual(rows[0],[1]);for(let n=1;n<rows.length;n++){const prev=rows[n-1];assert.deepEqual(rows[n],[1,...prev.slice(1).map((v,k)=>v+prev[k]),1]);}
  const svg=await readFile(new URL('../assets/pascal-counts.svg',import.meta.url),'utf8');const entries=[...svg.matchAll(/data-n="(\d+)" data-k="(\d+)"[^>]*>(\d+)<\/text>/g)];assert.equal(entries.length,28);for(const [,n,k,value] of entries)assert.equal(Number(value),rows[Number(n)][Number(k)]);
  assert.equal(C(8,3),C(7,2)+C(7,3));assert.equal(C(9,4),126n);
});

test('6.4: Vandermonde counts all mixed subsets including impossible split cases',()=>{
  for(let m=0;m<=5;m++)for(let n=0;n<=5;n++)for(let r=0;r<=m+n;r++){
    const groups=Array(r+1).fill(0n);for(const team of subsets(m+n,r))groups[team.filter(i=>i>=m).length]++;
    for(let k=0;k<=r;k++)assert.equal(groups[k],C(m,r-k)*C(n,k));assert.equal(groups.reduce((a,b)=>a+b,0n),C(m+n,r));
  }
  assert.deepEqual(table('6.4','vandermonde').map(r=>Number(r[2])),[4,30,40,10]);assert.equal(C(9,3),84n);
});

test('6.4: square sums count teams from two equal-sized disjoint groups',()=>{
  for(let n=0;n<=9;n++){let sum=0n;for(let k=0;k<=n;k++)sum+=C(n,k)**2n;assert.equal(sum,C(2*n,n));}
  const teams=subsets(8,4),counts=Array(5).fill(0);for(const t of teams)counts[t.filter(x=>x>=4).length]++;assert.deepEqual(counts,[1,16,36,16,1]);assert.equal(teams.length,70);
});

test('6.4: final-one cases prove the diagonal sum without losing endpoints',()=>{
  const hist=Array(8).fill(0);for(const s of strings(2,7))if(s.reduce((a,b)=>a+b,0)===3)hist[s.lastIndexOf(1)+1]++;
  for(const [position,,count] of table('6.4','diagonal-sum'))assert.equal(hist[Number(position)],Number(count));
  for(let n=0;n<=14;n++)for(let r=0;r<=n;r++){let sum=0n;for(let j=r;j<=n;j++)sum+=C(j,r);assert.equal(sum,C(n+1,r+1));}
});

test('6.5: four selection models and ordered repetition examples keep different outcomes distinct',()=>{
  const seq=strings(4,3),distinct=seq.filter(s=>new Set(s).size===3),keys=a=>new Set(a.map(s=>s.toSorted().join(','))).size;
  assert.deepEqual(table('6.5','repetition-models').map(r=>Number(r[3])),[distinct.length,keys(distinct),seq.length,keys(seq)]);
  const codes=strings(4,5);assert.equal(codes.length,1024);assert.equal(codes.filter(s=>s.includes(0)).length,781);assert.equal(strings(4,4).filter(s=>s[0]!==0).length,192);
  const multisets=Map.groupBy(strings(3,5),s=>s.toSorted().join(','));assert.equal(multisets.size,21);assert.equal(multisets.get('0,0,0,0,0').length,1);assert.equal(multisets.get('0,0,0,1,1').length,10);
});

test('6.5: stars and bars encode every small occupancy tuple bijectively including zero entries',async()=>{
  for(let n=1;n<=5;n++)for(let r=0;r<=8;r++){
    const tuples=distributions(r,n),encodings=tuples.map(t=>t.map(v=>'*'.repeat(v)).join('|'));
    assert.equal(BigInt(new Set(encodings).size),C(n+r-1,n-1));assert.equal(encodings.length,tuples.length);
    for(let i=0;i<tuples.length;i++){assert.equal(encodings[i].length,n+r-1);assert.deepEqual(encodings[i].split('|').map(s=>s.length),tuples[i]);}
  }
  const svg=await readFile(new URL('../assets/stars-and-bars.svg',import.meta.url),'utf8'),encoding=svg.match(/data-encoding="stars-bars"[^>]*>([^<]+)</)[1];assert.equal(encoding,'**||***|**');assert.deepEqual(encoding.split('|').map(s=>s.length),[2,0,3,2]);assert.equal(distributions(7,4).length,120);
});

test('6.5: lower-bound substitution and upper-bound overlap correction agree with all solutions',()=>{
  const all=distributions(9,4),lower=all.filter(([a,b,c,d])=>a>=1&&b>=2&&c>=0&&d>=1);assert.equal(all.length,220);assert.equal(lower.length,56);
  assert.deepEqual(lower.map(([a,b,c,d])=>[a-1,b-2,c,d-1]),distributions(5,4));assert.equal(all.filter(a=>a.every(v=>v>=1)).length,56);
  const triples=distributions(8,3);assert.equal(triples.length,45);assert.equal(triples.filter(a=>a[0]>=3).length,21);assert.equal(triples.filter(a=>a[0]<=2).length,24);assert.deepEqual(triples.filter(a=>a.every(v=>v<=3)),[[2,3,3],[3,2,3],[3,3,2]]);
  assert.equal(distributions(8,5).filter(a=>a.every(v=>v>=1)).length,35);
});

test('6.5: the actual nested-loop snippet executes twenty increments with the displayed outer counts',()=>{
  const source=blocks('6.5','nested-selection-loops').find(b=>b.type==='math').notation;
  let code='let k,i,j,h; const counts=[0,0,0,0];\n',levels=[];
  for(const line of source.split('\n')){const indent=line.length-line.trimStart().length,s=line.trim();while(levels.length&&indent<=levels.at(-1)){code+='}\n';levels.pop();}if(s.startsWith('for ')){const m=s.match(/^for ([ijh]) from 1 through ([4ij]):$/);assert.ok(m,s);code+=`for(${m[1]}=1;${m[1]}<=${m[2]};${m[1]}++){\n`;levels.push(indent);}else {assert.match(s,/^k := (0|k \+ 1)$/);code+=s.replace(':=','=')+';\n';if(s.endsWith('k + 1'))code+='counts[i-1]++;\n';}}
  code+='}\n'.repeat(levels.length)+'JSON.stringify({k,counts})';const result=JSON.parse(vm.runInNewContext(code,{}, {timeout:1000}));assert.equal(result.k,20);assert.deepEqual(table('6.5','nested-selection-loops').map(r=>Number(r[1])),result.counts);
});

test('6.5: labeled copies erase to uniform multiplicity for fixed repeated-letter arrangements',()=>{
  const letters=[...'BANANA'],groups=Map.groupBy(orders([0,1,2,3,4,5]),p=>p.map(i=>letters[i]).join(''));assert.equal(groups.size,60);assert.ok([...groups.values()].every(g=>g.length===12));
  assert.equal(new Set(orders([...'AABBCC']).map(a=>a.join(''))).size,90);
});

test('6.5: distinct cards in labeled boxes with fixed occupancies match the multinomial count',()=>{
  const assignments=strings(3,8),fixed=assignments.filter(s=>[0,1,2].map(i=>s.filter(v=>v===i).length).join(',')==='2,3,3');assert.equal(assignments.length,6561);assert.equal(fixed.length,560);assert.equal(BigInt(fixed.length),factorial(8)/(factorial(2)*factorial(3)*factorial(3)));
  const tokens=distributions(7,4);assert.deepEqual(table('6.5','identical-labeled').map(r=>Number(r[2])),[tokens.length,tokens.filter(t=>t.every(v=>v>0)).length,tokens.filter(t=>t.join(',')==='2,0,3,2').length]);
});

const partitionKey=s=>[...Map.groupBy(s.map((box,i)=>[box,i]),v=>v[0]).values()].map(a=>a.map(v=>v[1]).join(',')).toSorted().join('|');
test('6.5: the four box models discard only the intended identities',()=>{
  const assignments=strings(2,3),occupancies=new Set(assignments.map(s=>[s.filter(v=>v===0).length,s.filter(v=>v===1).length].join(','))),partitions=new Set(assignments.map(partitionKey)),sizes=new Set([...occupancies].map(s=>s.split(',').map(Number).sort((a,b)=>b-a).join(',')));
  assert.deepEqual(table('6.5','four-box-models').map(r=>Number(r[2])),[assignments.length,occupancies.size,partitions.size,sizes.size]);
});

function setPartitions(n){let partitions=[[]];for(let x=0;x<n;x++){const next=[];for(const groups of partitions){next.push([...groups,[x]]);for(let i=0;i<groups.length;i++)next.push(groups.map((g,j)=>j===i?[...g,x]:g));}partitions=next;}return partitions;}
test('6.5: set partitions, Stirling recurrence and inclusion-exclusion agree including empty boundaries',()=>{
  const rows=[];for(let n=0;n<=8;n++){const partitions=setPartitions(n),counts=Array(n+1).fill(0n);for(const p of partitions)counts[p.length]++;rows.push(counts);for(let j=1;j<=n;j++){assert.equal(counts[j],(rows[n-1][j-1]||0n)+BigInt(j)*(rows[n-1][j]||0n));let sum=0n;for(let i=0;i<j;i++)sum+=(i%2?-1n:1n)*C(j,i)*BigInt(j-i)**BigInt(n);assert.equal(counts[j],sum/factorial(j));assert.equal(sum%factorial(j),0n);}}
  assert.deepEqual(rows[0],[1n]);assert.deepEqual(rows[5].slice(1,4),[1n,15n,25n]);
  const sizes=new Map();for(const p of setPartitions(5).filter(p=>p.length<=3)){const key=p.map(g=>g.length).sort((a,b)=>b-a).join(' + ');sizes.set(key,(sizes.get(key)||0)+1);}for(const [pattern,,count] of table('6.5','set-partitions'))assert.equal(sizes.get(pattern),Number(count));
  const assignments=Map.groupBy(strings(3,3),partitionKey);assert.equal(assignments.size,5);assert.deepEqual([...assignments.values()].map(a=>a.length).toSorted((a,b)=>a-b),[3,6,6,6,6]);
});

test('6.5: integer partitions list each unlabeled size pattern once',()=>{
  const patterns=new Set(distributions(7,3).map(t=>t.filter(v=>v>0).sort((a,b)=>b-a).join(' + '))),published=table('6.5','integer-partitions').map(r=>r[0]);assert.equal(new Set(published).size,8);assert.deepEqual([...patterns].toSorted(),published.toSorted());assert.equal(published.filter(s=>s.split(' + ').length===3).length,4);
  assert.equal(new Set(distributions(7,2).map(t=>t.sort((a,b)=>b-a).join(','))).size,4);
});
