import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['6.6','6-end'].map(async id=>[id,JSON.parse(await readFile(new URL(`../data/lessons/${id}.json`,import.meta.url),'utf8'))])));
const blocks=(id,u)=>flatten(lessons[id].units.find(v=>v.id===u).blocks);
const table=(id,u)=>blocks(id,u).find(b=>b.type==='table').rows;
const snippets=['permutation-code','list-permutations','binary-successor','combination-code'].map(u=>blocks('6.6',u).find(b=>b.type==='math').notation).join('\n');
const context=vm.createContext({});vm.runInContext(snippets+`
function walk(first, step, limit) {
  const out = []; let current = first;
  while (current !== null) {
    if (out.length >= limit) throw new Error('Generator did not stop');
    out.push(current); current = step(current);
  }
  return out;
}`,context,{timeout:1000});
function run(expression){return JSON.parse(vm.runInContext(`JSON.stringify(${expression})`,context,{timeout:5000}));}
const fact=n=>n<2?1:n*fact(n-1),C=(n,r)=>r<0||r>n?0:fact(n)/(fact(r)*fact(n-r));
const lex=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;};
function perms(a){return a.length?a.flatMap((x,i)=>perms(a.filter((_,j)=>j!==i)).map(p=>[x,...p])):[[]];}
function strings(a,r){return r===0?[[]]:strings(a,r-1).flatMap(s=>a.map(x=>[...s,x]));}
const subsets=(n,r)=>strings([0,1],n).filter(s=>s.reduce((a,b)=>a+b,0)===r).map(s=>s.flatMap((v,i)=>v?[i+1]:[])).sort(lex);
function distributions(n,k){return k===1?[[n]]:Array.from({length:n+1},(_,i)=>distributions(n-i,k-1).map(a=>[i,...a])).flat();}
const list=s=>s.split(', ').map(Number);

test('6.6: actual permutation generator equals the independent complete sorted family through n seven',()=>{
  for(let n=0;n<=7;n++){const actual=run(`Array.from(permutations(${n}))`),expected=perms(Array.from({length:n},(_,i)=>i+1)).sort(lex);assert.equal(actual.length,fact(n));assert.deepEqual(actual,expected);}
  assert.deepEqual(run('Array.from(permutations(3))'),table('6.6','list-permutations').map(r=>list(r[0])));
});
test('6.6: permutation trace changes the correct pivot and successor functions preserve callers',()=>{
  const rows=table('6.6','permutation-trace'),start=list(rows[0][1]),end=list(rows[3][1]);assert.deepEqual(run(`nextPermutation(${JSON.stringify(start)})`),end);
  assert.deepEqual(run(`(()=>{const a=[3,2,1], b=[1], c=[];return [nextPermutation(a),a,nextPermutation(b),b,nextPermutation(c),c];})()`),[null,[3,2,1],null,[1],null,[]]);
  assert.deepEqual(run(`(()=>{const a=[1,3,2];const next=nextPermutation(a);next[0]=99;return a;})()`),[1,3,2]);
  assert.deepEqual(run(`(()=>{const g=permutations(3);const first=g.next().value;first[0]=99;return g.next().value;})()`),[1,3,2]);
});
test('6.6: actual binary successor lists exactly each fixed-width string and stops without overflow',()=>{
  for(let n=0;n<=11;n++){const actual=run(`walk(Array(${n}).fill(0), nextBits, ${2**n+1})`),expected=strings([0,1],n);assert.deepEqual(actual,expected);}
  assert.deepEqual(run('nextBits([0,1,0,1,1,1])'),[0,1,1,0,0,0]);assert.deepEqual(run('nextBits([0,0,1,1,1])'),[0,1,0,0,0]);
  assert.deepEqual(run('(()=>{const a=[1,1,1];return [nextBits(a),a];})()'),[null,[1,1,1]]);
});
test('6.6: published membership table is a bijection and the subset search has the stated match',()=>{
  const names=['red','green','blue'];for(const [bits,subset] of table('6.6','subset-bit-map')){const chosen=names.filter((_,i)=>bits[i]==='1');assert.equal(subset,chosen.length?'{'+chosen.join(', ')+'}':'∅');}
  const matches=strings([0,1],4).map(bits=>[4,7,11,16].filter((_,i)=>bits[i])).filter(a=>a.reduce((x,y)=>x+y,0)===18);assert.deepEqual(matches,[[7,11]]);
});
test('6.6: actual combination successor covers every size including empty and full through n ten',()=>{
  for(let n=0;n<=10;n++)for(let r=0;r<=n;r++){const first=Array.from({length:r},(_,i)=>i+1),actual=run(`walk(${JSON.stringify(first)}, a=>nextCombination(a,${n}), ${C(n,r)+1})`);assert.deepEqual(actual,subsets(n,r));assert.equal(actual.length,C(n,r));}
  assert.deepEqual(run('(()=>{const a=[3,4,5];return [nextCombination(a,5),a];})()'),[null,[3,4,5]]);
});
test('6.6: displayed combination trace and contrasting subset orders match the algorithms',()=>{
  const rows=table('6.6','combination-trace');assert.deepEqual(run(`nextCombination(${JSON.stringify(list(rows[0][1]))},8)`),list(rows[3][1]));
  const tupleOrder=run('walk([1,2],a=>nextCombination(a,4),7)').map(a=>a.join(''));
  const bitOrder=run('walk([0,0,0,0],nextBits,17)').filter(a=>a.reduce((x,y)=>x+y,0)===2).map(a=>a.flatMap((v,i)=>v?[i+1]:[]).join(''));
  assert.deepEqual(table('6.6','different-list-orders').map(r=>r[1].split(', ')),[tupleOrder,bitOrder]);
  assert.deepEqual(run('nextCombination([1,5,6],6)'),[2,3,4]);
});
test('Chapter 6 review: four selection models and overlapping bit conditions agree with enumeration',()=>{
  const seq=strings([0,1,2,3,4],3),distinct=seq.filter(s=>new Set(s).size===3),unique=a=>new Set(a.map(s=>s.toSorted().join(','))).size;
  assert.deepEqual(table('6-end','four-selection-practice').map(r=>Number(r[2])),[distinct.length,unique(distinct),seq.length,unique(seq)]);
  const bits=strings([0,1],8).map(a=>a.join('')),union=bits.filter(s=>s.startsWith('01')||s.endsWith('10'));assert.equal(union.length,112);assert.equal(bits.length-union.length,144);
  assert.equal(strings([...'ABCDE'],4).filter(a=>a.includes('A')).length,369);
});
test('Chapter 6 review: prefix-remainder proof works for all small signed sequences',()=>{
  for(let m=1;m<=5;m++)for(const seq of strings([-2,-1,0,1,2],m)){let found=false;for(let i=0;i<m;i++){let sum=0;for(let j=i;j<m;j++){sum+=seq[j];if(sum%m===0)found=true;}}assert.ok(found);}
  const seq=[3,-1,4,2,6];let sum=0;for(const [index,total,remainder] of table('6-end','guarantee-practice')){if(Number(index))sum+=seq[Number(index)-1];assert.equal(sum,Number(total));assert.equal((sum%5+5)%5,Number(remainder));}
  assert.equal(12*(4-1)+1,37);assert.equal(Array(12).fill(3).reduce((a,b)=>a+b,0),36);
});
test('Chapter 6 review: distinguished-member counts and coefficient extraction are correct',()=>{
  const teams=subsets(9,4);assert.equal(teams.length,126);assert.equal(teams.flatMap(a=>a.map(chair=>[a,chair])).length,504);assert.equal(teams.filter(a=>a.includes(1)).length,56);
  for(let n=1;n<=10;n++){let marked=0;for(let k=1;k<=n;k++)marked+=subsets(n,k).length*k;assert.equal(marked,n*2**(n-1));}
  const coefficient=strings([0,1],7).filter(s=>s.reduce((a,b)=>a+b,0)===2).reduce((sum,s)=>sum+s.reduce((p,v)=>p*(v?1:2),1),0);assert.equal(coefficient,672);
});
test('Chapter 6 review: bounded quantities and repeated-letter arrangements match direct outcomes',()=>{
  assert.equal(distributions(10,4).filter(a=>a[0]>=2&&a[1]<=3).length,130);
  const words=new Set(perms([...'LEVEL']).map(a=>a.join('')));assert.equal(words.size,30);assert.equal([...words].filter(s=>s[0]==='L').length,12);
});
test('Chapter 6 review: all four box models match the same four-object two-box universe',()=>{
  const assignments=strings([0,1],4),partition=s=>[0,1].map(box=>s.flatMap((v,i)=>v===box?[i]:[]).join('')).filter(Boolean).sort().join('|');
  const counts=[];for(const nonempty of [false,true]){const eligible=assignments.filter(s=>!nonempty||new Set(s).size===2),occ=distributions(4,2).filter(a=>!nonempty||a.every(v=>v>0));counts.push([eligible.length,occ.length,new Set(eligible.map(partition)).size,new Set(occ.map(a=>a.toSorted().join(','))).size]);}
  assert.deepEqual(table('6-end','box-review').map(r=>r.slice(2).map(Number)),counts[0].map((v,i)=>[v,counts[1][i]]));
});
test('Chapter 6 review: generated capstone candidates and final product count match independent enumeration',()=>{
  const actual=run('walk([1,2,3],a=>nextCombination(a,5),11)');assert.deepEqual(table('6-end','generation-capstone').map(r=>list(r[0])),actual);
  for(const [values,total,keep] of table('6-end','generation-capstone')){const sum=list(values).reduce((a,b)=>a+b,0);assert.equal(sum,Number(total));assert.equal(keep,sum===9?'Yes':'No');}
  assert.deepEqual(run('nextPermutation([3,1,4,2])'),[3,2,1,4]);assert.deepEqual(run('nextBits([1,0,1,1,1])'),[1,1,0,0,0]);
  const leaders=strings([1,2,3,4,5,6,7],2).filter(a=>a[0]!==a[1]),snacks=distributions(4,3);assert.equal(leaders.length*snacks.length,630);
});
test('Chapter 6 review: series stop at the first winner and match each length case',()=>{
  function series(t,a=0,b=0,s=''){if(a===t||b===t)return [s];return [...series(t,a+1,b,s+'A'),...series(t,a,b+1,s+'B')];}
  for(let t=1;t<=7;t++){const sequences=series(t);assert.equal(sequences.length,2*C(2*t-1,t-1));for(let losses=0;losses<t;losses++)assert.equal(sequences.filter(s=>s.length===t+losses).length,2*C(t+losses-1,losses));for(const s of sequences){const prefix=s.slice(0,-1);assert.ok([...prefix].filter(c=>c==='A').length<t);assert.ok([...prefix].filter(c=>c==='B').length<t);}}
  for(const [target,count] of table('6-end','counting-explorations'))assert.equal(series(Number(target)).length,Number(count));
});
test('Chapter 6 review: Pascal parity and central-coefficient exploration checkpoints use exact integers',()=>{
  const choose=(n,k)=>{let value=1n;for(let i=1;i<=k;i++)value=value*BigInt(n-i+1)/BigInt(i);return value;};
  const odd=[];for(let n=0;n<=64;n++){let count=0;for(let k=0;k<=n;k++)if(choose(n,k)%2n)count++;assert.equal(count,2**[...n.toString(2)].filter(c=>c==='1').length);odd.push(count);}assert.deepEqual(odd.slice(0,8),[1,2,2,4,2,4,4,8]);
  assert.deepEqual([1,2,3,4,5].map(n=>choose(2*n,n)),[2n,6n,20n,70n,252n]);
});
test('Chapter 6 review: cycle-decomposition interpretation supports the first-kind Stirling recurrence',()=>{
  const rows=[[1]];for(let n=1;n<=6;n++){const counts=Array(n+1).fill(0);for(const p of perms(Array.from({length:n},(_,i)=>i))){const seen=new Set();let cycles=0;for(let i=0;i<n;i++)if(!seen.has(i)){cycles++;let j=i;while(!seen.has(j)){seen.add(j);j=p[j];}}counts[cycles]++;}for(let k=1;k<=n;k++)assert.equal(counts[k],(rows[n-1][k-1]||0)+(n-1)*(rows[n-1][k]||0));assert.equal(counts.reduce((a,b)=>a+b,0),fact(n));rows.push(counts);}
});
