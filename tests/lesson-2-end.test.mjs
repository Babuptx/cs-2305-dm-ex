import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lesson=JSON.parse(await readFile('data/lessons/2-end.json','utf8'));
const blocks=id=>flatten(lesson.units.find(u=>u.id===id).blocks);
const tables=id=>blocks(id).filter(b=>b.type==='table');
const math=id=>blocks(id).filter(b=>b.type==='math').map(b=>b.notation);
const text=id=>JSON.stringify(blocks(id));
const range=n=>Array.from({length:n},(_,i)=>i);
const matrices=id=>Object.fromEntries(math(id).flatMap(s=>s.split('\n')).flatMap(line=>{const m=line.match(/^(.+?) = (\[\[.*\]\])$/);return m?[[m[1],JSON.parse(m[2])]]:[];}));
const mul=(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((s,x,k)=>s+x*B[k][j],0)));
const norm=x=>JSON.parse(JSON.stringify(x));
const bits=vm.runInNewContext(math('set-program-project')[0]+';setBits');
const invert=vm.runInNewContext(math('function-matrix-projects')[0]+';invertPermutation');

test('2-end: finite set table and inclusion-exclusion match membership sets',()=>{
 const U=[1,2,3,4,5,6],A=new Set([1,2,4]),B=new Set([2,3,4]);
 const expected=[U.filter(x=>A.has(x)||B.has(x)),U.filter(x=>A.has(x)&&B.has(x)),U.filter(x=>A.has(x)&&!B.has(x)),U.filter(x=>!A.has(x)),U.filter(x=>A.has(x)!==B.has(x))];
 tables('set-proof-review')[0].rows.forEach((r,i)=>assert.deepEqual(r[1].slice(1,-1).split(', ').map(Number),expected[i]));
 assert.equal(A.size+B.size-expected[1].length,expected[0].length);
});
test('2-end: displayed nested-set judgments preserve set versus scalar identity',()=>{
 // Canonical recursive set strings make {2}, 2, and {{2}} distinct objects.
 const canon=a=>'{'+[...a].sort().join(',')+'}',empty=canon([]),two='2',single=canon([two]);
 const S=new Set([empty,single,two]);
 const expected=[S.has(empty),true,S.has(single),S.has(two),S.has(single),S.has(canon([single]))];
 assert.deepEqual(tables('nested-set-review')[0].rows.map(r=>r[1]==='True'),expected);
});
test('2-end: set identities and stated nonassociative counterexample hold in all finite masks',()=>{
 const mask=7;
 for(let a=0;a<=mask;a++)for(let b=0;b<=mask;b++)for(let c=0;c<=mask;c++){
  assert.equal(a&~(a&~b)&mask,a&b);
  assert.equal((a&~b)&~c,(a&~c)&~b);
 }
 assert.notEqual((1&~1)&~1,1&~(1&~1));
});
test('2-end: function tables compute both composite orders from displayed maps',()=>{
 const [ft,gt]=tables('function-review'),f=new Map(ft.rows.map(([x,y])=>[x,y])),g=new Map(gt.rows.map(([y,x])=>[y,x]));
 for(const [x,y,z]of ft.rows)assert.equal(g.get(f.get(x)),z);
 for(const [y,x,z]of gt.rows)assert.equal(f.get(g.get(y)),z);
 assert.equal(new Set(f.values()).size,3);assert.equal(new Set(g.values()).size,2);
});
test('2-end: floor table and odd/even split include negative inputs',()=>{
 for(const [s,f,c]of tables('rounding-review')[0].rows){const x=Number(s.replace('−','-'));assert.equal(Math.floor(x),Number(f.replace('−','-')));assert.equal(Math.ceil(x),Number(c.replace('−','-')));}
 for(let n=-101;n<=101;n++)assert.equal(Math.floor(n/2)+Math.ceil(n/2),n);
});
test('2-end: recurrence and running totals agree with every displayed row',()=>{
 let a=2,sum=0;for(const [n,term,total]of tables('sequence-review')[0].rows){if(Number(n)>0)a=2*a+1;sum+=a;assert.equal(a,Number(term));assert.equal(sum,Number(total));assert.equal(a,3*2**Number(n)-1);assert.equal(sum,3*(2**(Number(n)+1)-1)-(Number(n)+1));}
 assert.equal(2*a+1,95);assert.equal(sum+95,183);
});
test('2-end: expanded sums and telescoping product match the displayed totals',()=>{
 const expected=[range(4).reduce((s,k)=>s+2*(k+2)+1,0),range(3).reduce((s,i)=>s+range(2).reduce((t,j)=>t+i+j+2,0),0),range(4).reduce((p,k)=>p*(k+3)/(k+2),1)];
 tables('sum-review')[0].rows.forEach((r,i)=>assert.equal(Number(r[2]),expected[i]));
 for(let n=0;n<=20;n++){const p=range(n).reduce((a,k)=>a*(k+3)/(k+2),1);assert.ok(Math.abs(p-(n+2)/2)<1e-10);}
 assert.equal(6+3+1.5+0.75,45/4);
});
test('2-end: finite-subset binary encoding round-trips every subset through ten positions',()=>{
 for(let code=0;code<1024;code++){const F=range(10).filter(k=>code&(2**k));assert.equal(F.reduce((s,k)=>s+2**k,0),code);}
 assert.equal([0,2,4].reduce((s,k)=>s+2**k,0),21);
 assert.match(text('infinity-review'),/does not assign a natural-number code to an arbitrary infinite subset/);
});
test('2-end: matrix examples and dimensions preserve multiplication order',()=>{
 const m=matrices('matrix-review');assert.deepEqual(mul(m.A,m.B),m.AB);assert.deepEqual(mul(m.B,m.A),m.BA);assert.notDeepEqual(m.AB,m.BA);
 for(const [a,b,ab,ba]of tables('matrix-review')[0].rows){const [i,k]=a.split(' × ').map(Number),[p,j]=b.split(' × ').map(Number);assert.equal(ab,k===p?`${i} × ${j}`:'Not defined');assert.equal(ba,j===i?`${p} × ${k}`:'Not defined');}
 const J=[[0,1],[-1,0]];assert.deepEqual(mul(J,J),[[-1,0],[0,-1]]);assert.deepEqual(mul(mul(J,J),mul(J,J)),[[1,0],[0,1]]);
});
test('2-end: capstone products count the routes actually drawn in the SVG',async()=>{
 const m=matrices('chapter-two-capstone'),svg=await readFile('assets/chapter-two-routes.svg','utf8');
 const edges=new Set([...svg.matchAll(/data-from="(.*?)" data-to="(.*?)"/g)].map(x=>x[1]+'>'+x[2]));assert.equal(edges.size,7);
 const learners=['Ava','Ben','Cy'],workshops=['P','Q'],skills=['X','Y'];
 const E=learners.map(a=>workshops.map(b=>Number(edges.has(a+'>'+b)))),K=workshops.map(a=>skills.map(b=>Number(edges.has(a+'>'+b))));
 assert.deepEqual(E,m.E);assert.deepEqual(K,m.K);assert.deepEqual(mul(E,K),m.EK);assert.deepEqual(m.EK.map(r=>r.map(x=>Number(x>0))),m['E ⊙ K']);
 assert.equal(new Set(E.map(r=>JSON.stringify(r))).size,3);assert.equal(E.some(r=>r.every(x=>x===0)),false);
});
test('2-end: displayed bit calculator outputs match the executable lesson code',()=>{
 for(const [a,b,...values]of tables('set-program-project')[0].rows)assert.deepEqual(Object.values(norm(bits(a,b))),values);
});
test('2-end: bit calculator matches independent finite sets through length five',()=>{
 for(let n=0;n<=5;n++)for(let i=0;i<2**n;i++)for(let j=0;j<2**n;j++){
  const str=k=>n?k.toString(2).padStart(n,'0'):'',a=str(i),b=str(j),A=new Set(range(n).filter(k=>a[k]==='1')),B=new Set(range(n).filter(k=>b[k]==='1'));
  const encode=predicate=>range(n).map(k=>Number(predicate(k))).join('');
  assert.deepEqual(norm(bits(a,b)),{complement:encode(k=>!A.has(k)),union:encode(k=>A.has(k)||B.has(k)),intersection:encode(k=>A.has(k)&&B.has(k)),difference:encode(k=>A.has(k)&&!B.has(k)),symmetric:encode(k=>A.has(k)!==B.has(k))});
 }
 assert.equal(bits('1'.repeat(80),'0'.repeat(80)).difference,'1'.repeat(80));
});
test('2-end: bit calculator rejects malformed inputs and preserves empty universes',()=>{
 for(const args of [[1,'1'],['1',null],['1','00'],['2','0'],['x','1'],['0\n','00']])assert.throws(()=>bits(...args));
 assert.deepEqual(norm(bits('','')),{complement:'',union:'',intersection:'',difference:'',symmetric:''});
});
function permutations(a){if(!a.length)return [[]];return a.flatMap((x,i)=>permutations(a.filter((_,j)=>i!==j)).map(p=>[x,...p]));}
test('2-end: inverse code passes both round trips for every permutation through six objects',()=>{
 for(let n=0;n<=6;n++)for(const p of permutations(range(n).map(i=>i+1))){const q=norm(invert(p));for(let i=0;i<n;i++){assert.equal(q[p[i]-1],i+1);assert.equal(p[q[i]-1],i+1);}}
 assert.deepEqual(norm(invert([3,1,4,2])),[2,4,1,3]);
});
test('2-end: inverse rejects duplicates, foreign targets, sparse arrays and nonarrays',()=>{
 for(const a of [[2,2],[1,3],[0],[-1],[1.5],['1'],[NaN],new Array(2),[1,,3],null,'12'])assert.throws(()=>invert(a));
 assert.deepEqual(norm(invert([])),[]);
});
test('2-end: exploration counts agree with independently enumerated functions',()=>{
 for(const row of tables('exploration-review')[0].rows){const [m,n,total,injective,onto]=row.map(Number);let inj=0,surj=0;for(let code=0;code<n**m;code++){let c=code;const outputs=range(m).map(()=>{const r=c%n;c=Math.floor(c/n);return r;});const used=new Set(outputs);inj+=Number(used.size===m);surj+=Number(used.size===n);}assert.equal(total,n**m);assert.equal(injective,inj);assert.equal(onto,surj);}
});
test('2-end: Ulam prefix uses distinct unordered earlier terms',()=>{
 const u=[1,2];for(let n=3;u.length<10;n++){let ways=0;for(let i=0;i<u.length;i++)for(let j=i+1;j<u.length;j++)ways+=Number(u[i]+u[j]===n);if(ways===1)u.push(n);}
 const prose=blocks('exploration-review').find(b=>b.type==='paragraph'&&b.text.includes('first ten terms'));assert.ok(prose);const shown=prose.text.match(/first ten terms are ([\d, ]+)\./)[1].split(', ').map(Number);assert.deepEqual(shown,u);
});
