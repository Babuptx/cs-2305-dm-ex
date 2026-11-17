import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['3.1','3.2'].map(async id=>[id,JSON.parse(await readFile(`data/lessons/${id}.json`,'utf8'))])));
const blocks=(id,u)=>flatten(lessons[id].units.find(x=>x.id===u).blocks);
const tables=(id,u)=>blocks(id,u).filter(x=>x.type==='table');
const maths=(id,u)=>blocks(id,u).filter(x=>x.type==='math').map(x=>x.notation);
const num=s=>Number(s.replaceAll('−','-'));
const norm=x=>JSON.parse(JSON.stringify(x));
const range=n=>Array.from({length:n},(_,i)=>i);
const snippet=(u,name)=>vm.runInNewContext(maths('3.1',u)[0]+`;${name}`);
const maximum=snippet('maximum-trace','maximum'),linear=snippet('linear-search','linearSearch'),binary=snippet('binary-search','binarySearch');
const bubble=snippet('bubble-sort','bubbleSort'),insertion=snippet('insertion-sort','insertionSort'),match=snippet('string-matching','matchShifts');
const change=snippet('greedy-change','greedyChange'),schedule=snippet('interval-scheduling','scheduleTalks');
function arrays(n,alphabet){if(!n)return [[]];return arrays(n-1,alphabet).flatMap(a=>alphabet.map(v=>[...a,v]));}
const small=range(6).flatMap(n=>arrays(n,[-1,0,1]));

test('3.1: maximum trace and displayed implementation handle negative values and ties',()=>{
 const rows=tables('3.1','maximum-trace')[0].rows,values=rows.map(r=>num(r[1]));
 rows.forEach((r,i)=>assert.equal(num(r[2]),Math.max(...values.slice(0,i+1))));
 for(const a of small.filter(a=>a.length))assert.equal(maximum(a),Math.max(...a));assert.throws(()=>maximum([]));
});
test('3.1: numeric examples reject sparse, noninteger and unsafe arrays',()=>{
 const bad=[null,'123',[NaN],[Infinity],[1.5],['1'],[Number.MAX_SAFE_INTEGER+1],new Array(2),[1,,2]];
 for(const fn of [maximum,linear,binary,bubble,insertion])for(const a of bad)assert.throws(()=>fn(a,1));
 for(const fn of [linear,binary])for(const x of [null,NaN,Infinity,1.5,'1'])assert.throws(()=>fn([1],x));
});
test('3.1: linear and binary search match independent first-position scans',()=>{
 for(const a of small){for(let x=-2;x<=2;x++)assert.equal(linear(a,x),a.findIndex(v=>v===x)+1);const sorted=[...a].sort((a,b)=>a-b);for(let x=-2;x<=2;x++)assert.equal(binary(sorted,x),sorted.findIndex(v=>v===x)+1);}
 for(const [target,compared,result]of tables('3.1','linear-search')[0].rows){assert.equal(linear([8,3,8,6],Number(target)),Number(result));const stop=[8,3,8,6].indexOf(Number(target));assert.equal(compared,[8,3,8,6].slice(0,stop<0?4:stop+1).join(', '));}
 assert.throws(()=>binary([12,3,8],12));assert.equal(linear([12,3,8],12),1);
});
test('3.1: binary trace and diagram match shrinking intervals in original positions',async()=>{
 const a=[2,5,9,12,16,21,27,31],rows=tables('3.1','binary-search')[0].rows,trace=[];let lo=1,hi=8;
 while(lo<hi){const mid=Math.floor((lo+hi)/2);trace.push([lo,hi,mid,a[mid-1]]);if(21>a[mid-1])lo=mid+1;else hi=mid;}
 rows.slice(0,-1).forEach((r,i)=>assert.deepEqual(r.slice(0,4).map(Number),trace[i]));assert.equal(binary(a,21),6);assert.equal(binary(a,20),0);
 const svg=await readFile('assets/binary-search-window.svg','utf8');const ranges=[...svg.matchAll(/data-lo="(\d+)" data-hi="(\d+)"/g)].map(m=>m.slice(1).map(Number));assert.deepEqual(ranges,[...trace.map(r=>r.slice(0,2)),[lo,hi]]);
});
test('3.1: bubble sort matches each published pass and preserves all entries',()=>{
 let a=[6,2,5,1];const states=[a.slice()];for(let end=a.length-1;end>0;end--){for(let j=0;j<end;j++)if(a[j]>a[j+1])[a[j],a[j+1]]=[a[j+1],a[j]];states.push(a.slice());}
 assert.deepEqual(tables('3.1','bubble-sort')[0].rows.map(r=>JSON.parse(r[1])),states);
 for(const input of small){const original=input.slice();assert.deepEqual(norm(bubble(input)),input.slice().sort((a,b)=>a-b));assert.deepEqual(input,original);}
});
test('3.1: insertion prefixes match publication and output preserves multiplicities',()=>{
 const input=[6,2,5,1],rows=tables('3.1','insertion-sort')[0].rows;
 rows.forEach((r,i)=>{const prefix=input.slice(0,i+1).sort((a,b)=>a-b);assert.deepEqual(JSON.parse(r[2]),prefix);assert.deepEqual(JSON.parse(r[1]),prefix.concat(input.slice(i+1)));});
 for(const a of small){const original=a.slice();assert.deepEqual(norm(insertion(a)),a.slice().sort((a,b)=>a-b));assert.deepEqual(a,original);}
});
test('3.1: published insertion comparison explains instability of labeled equal keys',()=>{
 const code=maths('3.1','insertion-sort')[0];assert.match(code,/value > b\[i\]/);
 const a=[{key:2,id:'A'},{key:2,id:'B'},{key:1,id:'C'}];
 for(let j=1;j<a.length;j++){const v=a[j];let i=0;while(i<j&&v.key>a[i].key)i++;a.splice(j,1);a.splice(i,0,v);}
 assert.deepEqual(a.map(x=>x.id),['C','B','A']);
});
test('3.1: naive matcher finds all overlapping occurrences against substring enumeration',()=>{
 for(let n=0;n<=6;n++)for(const t of arrays(n,['0','1']).map(a=>a.join('')))for(let m=1;m<=4;m++)for(const p of arrays(m,['0','1']).map(a=>a.join(''))){const expected=range(Math.max(0,t.length-p.length+1)).filter(s=>t.slice(s,s+p.length)===p);assert.deepEqual(norm(match(t,p)),expected);}
 const rows=tables('3.1','string-matching')[0].rows;for(const [s,window,yes]of rows){assert.equal('1010101'.slice(Number(s),Number(s)+3),window);assert.equal(yes==='Yes',window==='101');}
 assert.deepEqual(norm(match('0000','00')),[0,1,2]);
});
test('3.1: matcher explicitly excludes empty patterns and nonbinary inputs',()=>{
 for(const [t,p]of [['1',''],['x','1'],['1','x'],[null,'1'],['1',1]])assert.throws(()=>match(t,p));
 assert.deepEqual(norm(match('','1')),[]);assert.deepEqual(norm(match('1','11')),[]);
});
function optimalCoins(n,coins){const best=Array(n+1).fill(Infinity);best[0]=0;for(let amount=1;amount<=n;amount++)for(const c of coins)if(c<=amount)best[amount]=Math.min(best[amount],best[amount-c]+1);return best[n];}
test('3.1: canonical greedy counts equal a separate minimum-coin dynamic program',()=>{
 for(let n=0;n<=250;n++){const r=change(n,[25,10,5,1]);assert.equal(r.remainder,0);assert.equal(r.counts.reduce((s,x)=>s+x,0),optimalCoins(n,[25,10,5,1]));assert.equal(r.counts.reduce((s,x,i)=>s+x*[25,10,5,1][i],0),n);}
 assert.deepEqual(norm(change(68,[25,10,5,1])),{counts:[2,1,1,3],remainder:0});
});
test('3.1: greedy counterexamples distinguish feasibility from optimality',()=>{
 assert.deepEqual(norm(change(6,[4,3,1])),{counts:[1,0,2],remainder:0});assert.equal(optimalCoins(6,[4,3,1]),2);
 assert.deepEqual(norm(change(6,[4,3])),{counts:[1,0],remainder:2});assert.equal(optimalCoins(6,[4,3]),2);
 for(const [n,c]of [[-1,[1]],[1.5,[1]],[1,[]],[1,[0]],[1,[1,2]],[1,[2,2]],[1,new Array(2)],[1,[1.5]]])assert.throws(()=>change(n,c));
});
function bestSchedule(talks){let best=0;for(let mask=0;mask<2**talks.length;mask++){const s=talks.filter((_,i)=>mask&(2**i));const compatible=s.every((a,i)=>s.slice(i+1).every(b=>a.end<=b.start||b.end<=a.start));if(compatible)best=Math.max(best,s.length);}return best;}
test('3.1: schedule table and diagram preserve paired endpoints and choose B C D',async()=>{
 const rows=tables('3.1','interval-scheduling')[0].rows,talks=rows.map(([,s,e])=>({start:Number(s),end:Number(e)}));
 assert.deepEqual(norm(schedule(talks)),[1,2,3]);assert.equal(bestSchedule(talks),3);
 const svg=await readFile('assets/earliest-finish-schedule.svg','utf8');for(const [,label,start,end,chosen]of svg.matchAll(/data-talk="(\w)" data-start="(\d+)" data-end="(\d+)" data-selected="(true|false)"/g)){const i=rows.findIndex(r=>r[0]===label);assert.deepEqual([start,end],rows[i].slice(1));assert.equal(chosen==='true',[1,2,3].includes(i));}
});
test('3.1: earliest finish is optimal for every subset of a bounded interval universe',()=>{
 const universe=[];for(let s=0;s<4;s++)for(let e=s+1;e<=4;e++)universe.push({start:s,end:e});
 for(let mask=0;mask<2**universe.length;mask++){const input=universe.filter((_,i)=>mask&(2**i)),before=norm(input),ids=norm(schedule(input));assert.equal(ids.length,bestSchedule(input));assert.equal(new Set(ids).size,ids.length);ids.slice(1).forEach((id,i)=>assert.ok(input[ids[i]].end<=input[id].start));assert.deepEqual(input,before);}
});
test('3.1: scheduling handles ties, negative times and invalid intervals',()=>{
 assert.deepEqual(norm(schedule([{start:-4,end:-1},{start:-3,end:-1},{start:-1,end:2}])),[0,2]);assert.deepEqual(norm(schedule([])),[]);
 for(const t of [null,[null],[{start:2,end:2}],[{start:3,end:1}],new Array(2),[{start:0,end:Infinity}]])assert.throws(()=>schedule(t));
 assert.equal(bestSchedule([{start:0,end:4},{start:3,end:5},{start:4,end:8}]),2);
});
test('3.1: halting case table reverses each possible prediction',()=>{
 const rows=tables('3.1','halting-problem')[0].rows;assert.deepEqual(rows.map(r=>r.slice(0,2)),[['Halts','Loops forever'],['Does not halt','Halts']]);
 assert.match(JSON.stringify(blocks('3.1','halting-problem')),/always finishes/);
});
test('3.2: crossover table matches actual counts and comparison labels',()=>{
 for(const [s,a,b,which]of tables('3.2','growth-recap')[0].rows){const n=Number(s);assert.equal(Number(a),40*n+200);assert.equal(Number(b),n*n);assert.equal(which,Number(a)<Number(b)?'A':'B');}
});
test('3.2: witness diagram uses the published polynomial and valid sampled upper bounds',async()=>{
 const svg=await readFile('assets/growth-witness-bounds.svg','utf8');const rows=[...svg.matchAll(/data-n="(\d+)" data-g="(\d+)" data-f="(\d+)" data-upper="(\d+)"/g)];assert.equal(rows.length,4);
 for(const r of rows){const [n,g,f,upper]=r.slice(1).map(Number);assert.equal(g,n*n);assert.equal(f,3*n*n+5*n+7);assert.equal(upper,15*g);assert.ok(f<=upper);}
 for(let n=2;n<=500;n++){const f=3*n*n+5*n+7;assert.ok(3*n*n<=f&&f<=15*n*n);if(n>5)assert.ok(f<=5*n*n);}
});
test('3.2: arbitrary sample witnesses are defeated by the stated not-O constructions',()=>{
 for(const C of [0.1,1,7,100,10000])for(const k of [-3,0,5,1000]){const n=Math.floor(Math.max(k,C,0))+1;assert.ok(n>k&&n*n>C*n);const m=Math.floor(Math.max(k,C/5,0))+1;assert.ok(m>k&&5*m*m+1>C*m);}
});
test('3.2: logarithm table distinguishes squared argument from squared logarithm',()=>{
 for(const row of tables('3.2','logarithm-growth')[0].rows){const [n,l,arg,out]=row.map(Number);assert.equal(l,Math.log2(n));assert.equal(arg,Math.log2(n*n));assert.equal(out,l*l);}
 for(const base of [2,3,10])for(let n=2;n<=100;n++)assert.ok(Math.abs(Math.log(n)/Math.log(base)-Math.log2(n)/Math.log2(base))<1e-12);
});
test('3.2: factorial logarithm bounds include odd sizes and the threshold',()=>{
 let logFact=0;for(let n=1;n<=300;n++){logFact+=Math.log2(n);assert.ok(logFact<=n*Math.log2(n)+1e-9);if(n>=4)assert.ok(logFact>=(n/4)*Math.log2(n));}
});
test('3.2: compound-expression bounds and practice estimates hold at boundary samples',()=>{
 let logFact=0;for(let n=1;n<=500;n++){logFact+=Math.log2(n);if(n>2){const F=(n+2)*Math.log2(n*n+3)+4*n*n;assert.ok(F>=4*n*n&&F<=10*n*n);}if(n>3){const H=2*n*logFact+(n*n+5)*Math.log2(n);assert.ok(H>=n*n*Math.log2(n)&&H<=4*n*n*Math.log2(n));}if(n>1){assert.ok(8*n+12<=20*n);assert.ok((n+1)*(n*n+3)>=n**3&&(n+1)*(n*n+3)<=8*n**3);}if(n>6)assert.ok(Math.floor(n/3)>=n/6&&Math.floor(n/3)<=n/3);}
});
test('3.2: signed leading-term bounds, cancellation and oscillation examples are consistent',()=>{
 for(let n=7;n<=300;n++){const p=Math.abs(-4*n**3+9*n-2);assert.ok(2*n**3<=p&&p<=15*n**3);assert.equal((5*n**3+2*n*n)-(5*n**3-7*n+1),2*n*n+7*n-1);const f=n*(2+(-1)**n);assert.ok(n<=f&&f<=3*n);}
});
test('3.2: retained-sum table and both general bounds agree on odd and even inputs',()=>{
 for(const [s,terms,partial,total]of tables('3.2','sum-theta')[0].rows){const n=Number(s),kept=range(n-Math.ceil(n/2)+1).map(i=>i+Math.ceil(n/2));assert.deepEqual(terms.split(', ').map(Number),kept);assert.equal(Number(partial),kept.reduce((s,x)=>s+x,0));assert.equal(Number(total),n*(n+1)/2);}
 for(let n=1;n<=500;n++){const sum=n*(n+1)/2;assert.ok(n*n/4<=sum&&sum<=n*n);}
});
