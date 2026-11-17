import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['3.3','3-end'].map(async id=>[id,JSON.parse(await readFile(`data/lessons/${id}.json`,'utf8'))])));
const blocks=(id,u)=>flatten(lessons[id].units.find(x=>x.id===u).blocks);
const tables=(id,u)=>blocks(id,u).filter(x=>x.type==='table');
const maths=(id,u)=>blocks(id,u).filter(x=>x.type==='math').map(x=>x.notation);
const get=(id,u,name)=>vm.runInNewContext(maths(id,u)[0]+`;${name}`);
const linear=get('3.3','linear-cost','linearCounts'),closest=get('3.3','closest-pair-cost','closestPair');
const extrema=get('3-end','max-position-project','maxPositions'),paired=get('3-end','paired-extrema','pairMinMax');
const range=n=>Array.from({length:n},(_,i)=>i),norm=x=>JSON.parse(JSON.stringify(x));
function arrays(n,alphabet){return n?arrays(n-1,alphabet).flatMap(a=>alphabet.map(x=>[...a,x])):[[]];}
const small=range(6).flatMap(n=>arrays(n,[-1,0,1]));
test('3.3: maximum comparison table counts terminal loop checks',()=>{
 for(const [s,data,total]of tables('3.3','maximum-cost')[0].rows){const n=Number(s);let keys=0,bounds=0,i=1;while(true){bounds++;if(i>=n)break;keys++;i++;}assert.equal(keys,Number(data));assert.equal(keys+bounds,Number(total));}
});
test('3.3: actual instrumented linear code agrees with all first positions and absent cases',()=>{
 for(const a of small)for(let x=-2;x<=2;x++){const i=a.indexOf(x),r=norm(linear(a,x));assert.deepEqual(r,i<0?{position:0,keys:a.length,bounds:a.length+2,total:2*a.length+2}:{position:i+1,keys:i+1,bounds:i+2,total:2*(i+1)+1});}
 assert.equal(linear([4,9,2,7],9).total,5);assert.equal(linear([4,9,2,7],6).total,10);
});
test('3.3/end: numeric snippets reject malformed inputs without silently skipping holes',()=>{
 for(const a of [null,'12',[1.5],[NaN],[Infinity],['1'],[Number.MAX_SAFE_INTEGER+1],new Array(2),[1,,2]])for(const fn of [linear,extrema,paired])assert.throws(()=>fn(a,1));
 for(const x of [NaN,1.5,'1',Infinity])assert.throws(()=>linear([1],x));assert.throws(()=>extrema([]));assert.throws(()=>paired([]));
});
test('3.3: average formulas agree with weighted enumerated executions',()=>{
 for(let n=1;n<=40;n++){const a=range(n);const hits=a.map(x=>linear(a,x));assert.equal(hits.reduce((s,r)=>s+r.keys,0)/n,(n+1)/2);assert.equal(hits.reduce((s,r)=>s+r.total,0)/n,n+2);}
 assert.equal(.25*6+.75*(7/2),33/8);assert.equal(.5*8+.5*(9/2),25/4);
});
function binaryCounts(a,x){let lo=0,hi=a.length-1,keys=0,bounds=0;while(true){bounds++;if(!(lo<hi))break;const mid=Math.floor((lo+hi)/2);keys++;if(x>a[mid])lo=mid+1;else hi=mid;}keys++;return {position:a[lo]===x?lo+1:0,keys,total:keys+bounds};}
test('3.3: binary comparison bounds include singleton and non-power-of-two lengths',()=>{
 for(let n=1;n<=64;n++){const a=range(n).map(i=>2*i);let max=0;for(let x=-1;x<=2*n;x++){const r=binaryCounts(a,x);assert.equal(r.position,a.indexOf(x)+1);assert.ok(r.total<=2*Math.ceil(Math.log2(n))+2);max=Math.max(max,r.total);}assert.equal(max,2*Math.ceil(Math.log2(n))+2);}
 for(const [s,b,l]of tables('3.3','binary-cost')[0].rows){const n=Number(s);assert.equal(Number(b),2*Math.ceil(Math.log2(n))+2);assert.equal(Number(l),2*n+2);}
});
test('3-end: search review table counts matching algorithms under one convention',()=>{
 const a=[3,6,9,12,15,18,21,24];for(const [s,l,b,p]of tables('3-end','search-review')[0].rows){const x=Number(s);assert.equal(linear(a,x).keys,Number(l));assert.equal(binaryCounts(a,x).keys,Number(b));assert.equal(binaryCounts(a,x).position,Number(p));}
});
test('3.3: insertion comparison conventions differ by sentinel tests on increasing inputs',async()=>{
 for(let n=2;n<=30;n++){
  for(const reversed of [false,true]){let a=range(n);if(reversed)a.reverse();let comparisons=0,shifts=0;for(let j=1;j<n;j++){let i=0;while(true){comparisons++;if(!(a[j]>a[i]))break;i++;}const v=a[j];for(let k=j;k>i;k--){a[k]=a[k-1];shifts++;}a[i]=v;}
   assert.equal(comparisons,reversed?n-1:n*(n+1)/2-1);assert.equal(shifts,reversed?n*(n-1)/2:0);
  }
 }
 const prior=JSON.parse(await readFile('data/lessons/3.1.json','utf8'));
 const code=flatten(prior.units.find(u=>u.id==='insertion-sort').blocks).find(b=>b.type==='math').notation;
 const instrumented=code.replace('const b = a.slice();','const b = a.slice(); let comparisons = 0;').replace('i < j && value > b[i]','i < j && (++comparisons, value > b[i])').replace('return b;','return {b, comparisons};');
 const run=vm.runInNewContext(instrumented+';insertionSort');
 for(let n=2;n<=30;n++){assert.equal(run(range(n)).comparisons,n*(n-1)/2);assert.equal(run(range(n).reverse()).comparisons,n-1);}
});
test('3-end: bubble pass table preserves duplicates and reports per-pass counts',()=>{
 const a=[4,2,4,1],states=[];for(let end=3;end>0;end--){let count=0;for(let j=0;j<end;j++){count++;if(a[j]>a[j+1])[a[j],a[j+1]]=[a[j+1],a[j]];}states.push([a.slice(),count]);}
 tables('3-end','sorting-review')[0].rows.forEach((r,i)=>assert.deepEqual([JSON.parse(r[1]),Number(r[2])],states[i]));
});
test('3.3: triangular diagram enumerates each permitted pair exactly once',async()=>{
 const svg=await readFile('assets/triangular-loop-count.svg','utf8');const pairs=[...svg.matchAll(/data-i="(\d+)" data-j="(\d+)"/g)].map(m=>m.slice(1).map(Number));assert.equal(pairs.length,15);assert.equal(new Set(pairs.map(String)).size,15);for(let i=1;i<=5;i++)assert.deepEqual(pairs.filter(p=>p[0]===i).map(p=>p[1]),range(i).map(j=>j+1));
 for(const [s,count,ops]of tables('3-end','loop-review')[0].rows){const n=Number(s);let actual=0;for(let i=1;i<=n;i++)for(let j=1;j<=i;j++)actual++;assert.equal(actual,Number(count));assert.equal(Number(ops.split(' ')[0]),2*actual);}
});
test('3.3: matrix counts reconcile zero accumulation with first-product initialization',()=>{
 for(let m=1;m<=4;m++)for(let k=1;k<=4;k++)for(let n=1;n<=4;n++){let multiplications=0,adds=0,firstAdds=0;for(let i=0;i<m;i++)for(let j=0;j<n;j++)for(let q=0;q<k;q++){multiplications++;adds++;if(q>0)firstAdds++;}assert.equal(multiplications,m*n*k);assert.equal(adds,m*n*k);assert.equal(firstAdds,m*n*(k-1));}
 assert.equal(2*8**3,1024);assert.equal(2*3*4,24);assert.equal(2*4*(3-1),16);
});
test('3.3/end: matrix-chain tables and SVG costs match dimensions',async()=>{
 const rows=tables('3.3','matrix-chain-cost')[0].rows;assert.deepEqual(rows.map(r=>Number(r[3])),[12*5*20+12*20*3,5*20*3+12*5*3]);
 const svg=await readFile('assets/matrix-chain-cost.svg','utf8');assert.deepEqual([...svg.matchAll(/data-cost="(\d+)"/g)].map(m=>Number(m[1])),rows.map(r=>Number(r[3])));
 assert.deepEqual(tables('3-end','matrix-review-project')[0].rows.map(r=>Number(r[2].split(' = ')[1])),[8*2*10+8*10*4,2*10*4+8*2*4]);
});
test('3.3: closest-pair table matches exact coordinate distances and returned pair',()=>{
 const p=[[0,0],[3,0],[3,2],[8,2]];for(const [pair,d]of tables('3.3','closest-pair-cost')[0].rows){const [i,j]=pair.split(',').map(Number);assert.equal(Number(d),(p[j][0]-p[i][0])**2+(p[j][1]-p[i][1])**2);}
 assert.deepEqual(norm(closest(p)),{pair:[1,2],squaredDistance:4,pairs:6});
});
test('3.3: closest-pair code matches independent ordered-pair minima including duplicates',()=>{
 const grid=[[0,0],[0,1],[1,0],[1,1]];
 for(let n=2;n<=4;n++)for(const points of arrays(n,grid)){const before=norm(points),r=closest(points),distances=points.flatMap((a,i)=>points.flatMap((b,j)=>i===j?[]:[(b[0]-a[0])**2+(b[1]-a[1])**2]));assert.equal(r.squaredDistance,Math.min(...distances));assert.equal(r.pairs,n*(n-1)/2);assert.deepEqual(points,before);assert.ok(r.pair[0]<r.pair[1]);}
 assert.equal(closest([[-1000000,-1000000],[1000000,1000000]]).squaredDistance,8000000000000);
});
test('3.3: closest-pair rejects malformed or out-of-contract coordinates',()=>{
 for(const points of [null,[],[[0,0]],[null,[0,0]],[[1],[0,0]],[[1,2,3],[0,0]],[[NaN,0],[0,0]],[[1000001,0],[0,0]],[new Array(2),[0,0]],new Array(2)])assert.throws(()=>closest(points));
});
test('3.3: hypothetical time table uses exact factorial counts and explicit units',()=>{
 const rows=tables('3.3','scale-and-time')[0].rows;const fact=n=>range(n).reduce((s,i)=>s*BigInt(i+1),1n);const expected=n=>[BigInt(n),BigInt(n*n),2n**BigInt(n),fact(n)];
 for(const [column,n]of [[1,10],[2,20]])rows.forEach((r,i)=>assert.equal(BigInt(r[column].split(' ')[0]),expected(n)[i]));
 assert.equal(Math.round(Number(fact(20))*1e-6/(365*24*3600)),77147);assert.equal(Math.log2(1024),10);assert.equal(Math.sqrt(1024),32);
});
test('3.3: binary input-length bounds hold for representative integers',()=>{
 for(let n=1;n<=10000;n++){const L=n.toString(2).length;assert.equal(L,Math.floor(Math.log2(n))+1);assert.ok(2**(L-1)<=n&&n<2**L);}assert.equal(parseInt('10000000000',2),1024);
});
test('3-end: actual maximum-position code returns first and last occurrences',()=>{
 for(const a of small.filter(a=>a.length)){const m=Math.max(...a);assert.deepEqual(norm(extrema(a)),{maximum:m,first:a.indexOf(m)+1,last:a.lastIndexOf(m)+1});}
});
test('3-end: pair min/max code obtains correct extrema and exact even/odd counts',()=>{
 for(const a of small.filter(a=>a.length)){const before=a.slice();assert.deepEqual(norm(paired(a)),{min:Math.min(...a),max:Math.max(...a),comparisons:Math.ceil(3*a.length/2)-2});assert.deepEqual(a,before);}
 for(const [n,separate,pair]of tables('3-end','paired-extrema')[0].rows){assert.equal(Number(separate),2*(Number(n)-1));assert.equal(Number(pair),paired(range(Number(n))).comparisons);}
});
test('3-end: growth expansions and stated witness bounds agree on boundary samples',()=>{
 for(let n=2;n<=100;n++){const p=2*n**3+6*n+5;assert.ok(2*n**3<=p&&p<=13*n**3);assert.equal((n+1)**3-(n-1)**3,6*n*n+2);assert.ok(4*n*n<=4*n*n+3*n+2&&4*n*n+3*n+2<=9*n*n);}
});
test('3-end: subset capacity example reaches an independently enumerated optimum',()=>{
 const weights=[8,6,5],feasible=[];for(let mask=0;mask<8;mask++){const sum=weights.reduce((s,w,i)=>s+((mask>>i)&1)*w,0);if(sum<=11)feasible.push(sum);}assert.equal(Math.max(...feasible),11);
});
test('3-end: sorted adjacent gaps recover the line minimum but not the planar minimum',()=>{
 for(const a of small.filter(a=>a.length>=2)){const b=a.slice().sort((x,y)=>x-y),adj=b.slice(1).map((x,i)=>x-b[i]),all=a.flatMap((x,i)=>a.slice(i+1).map(y=>Math.abs(y-x)));assert.equal(Math.min(...adj),Math.min(...all));}
 assert.equal(closest([[0,0],[1,100],[2,0]]).squaredDistance,4);
});
function greedyLoads(jobs,p){const loads=range(p).fill(0);for(const t of jobs){const i=loads.indexOf(Math.min(...loads));loads[i]+=t;}return loads;}
function optimum(jobs,p){let best=Infinity;for(const assignment of arrays(jobs.length,range(p))){const loads=range(p).fill(0);jobs.forEach((t,i)=>loads[assignment[i]]+=t);best=Math.min(best,Math.max(...loads));}return best;}
test('3-end: load-balancing example and approximation bound match exhaustive tiny assignments',()=>{
 assert.deepEqual(greedyLoads([3,3,2,2,2],2),[7,5]);assert.equal(optimum([3,3,2,2,2],2),6);
 for(const p of [2,3])for(let n=1;n<=4;n++)for(const jobs of arrays(n,[1,2,3])){const opt=optimum(jobs,p),W=jobs.reduce((a,b)=>a+b,0);assert.ok(opt>=Math.max(...jobs)&&opt>=W/p);assert.ok(Math.max(...greedyLoads(jobs,p))<=(2-1/p)*opt+1e-10);}
});
test('3-end: matching preference table supports the stated unique stable assignment',()=>{
 const rows=tables('3-end','matching-exploration')[0].rows,prefs=Object.fromEntries(rows.map(([name,list])=>[name.split(' ')[1],list.split(', ')]));const stable=[];
 for(const targets of [['X','Y'],['Y','X']]){const match={A:targets[0],B:targets[1],[targets[0]]:'A',[targets[1]]:'B'};if(['A','B'].every(a=>['X','Y'].every(b=>match[a]===b||!(prefs[a].indexOf(b)<prefs[a].indexOf(match[a])&&prefs[b].indexOf(a)<prefs[b].indexOf(match[b])))))stable.push(targets);}
 assert.deepEqual(stable,[['Y','X']]);
});
