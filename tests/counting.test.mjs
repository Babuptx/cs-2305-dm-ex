import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lesson=JSON.parse(await readFile(new URL('../data/lessons/6.1.json',import.meta.url),'utf8'));
const blocks=name=>flatten(lesson.units.find(u=>u.id===name).blocks);
const table=(name,index=0)=>blocks(name).filter(b=>b.type==='table')[index].rows;
const strings=(alphabet,n)=>n===0?['']:strings(alphabet,n-1).flatMap(s=>[...alphabet].map(c=>s+c));
const permutations=a=>a.length===0?[[]]:a.flatMap((x,i)=>permutations(a.filter((_,j)=>i!==j)).map(p=>[x,...p]));
test('6.1: meal pairs and named office assignments are distinct outcomes',()=>{
  const meals=table('counting-outcomes').flatMap(r=>r.slice(1));assert.equal(meals.length,6);assert.equal(new Set(meals).size,6);
  const assignments=[];for(let a=1;a<=7;a++)for(let b=1;b<=7;b++)if(a!==b)assignments.push([a,b]);assert.equal(assignments.length,42);assert.ok(assignments.some(([a,b])=>a===1&&b===2));assert.ok(assignments.some(([a,b])=>a===2&&b===1));
});
test('6.1: all badge restrictions and the leading-zero integer distinction match enumeration',()=>{
  const counts=[0,0,0];for(const letters of strings('ABCDEF',2))for(const digits of strings('0123456789',3)){counts[0]++;if(letters[0]!==letters[1]){counts[1]++;if(new Set(digits).size===3)counts[2]++;}}
  assert.deepEqual(table('restrictions').map(r=>Number(r[2])),counts);
  assert.equal(strings('0123456789',3).filter(s=>s[0]!=='0'&&new Set(s).size===3).length,648);
});
test('6.1: function and injection formulas agree with all small assignments',()=>{
  for(let n=1;n<=5;n++)for(let m=0;m<=5;m++){const all=strings('ABCDE'.slice(0,n),m),injections=all.filter(s=>new Set(s).size===s.length);assert.equal(all.length,n**m);let expected=1;for(let i=0;i<m;i++)expected*=n-i;assert.equal(injections.length,m>n?0:expected);}
  assert.equal(strings('ABCD',3).length,64);assert.equal(strings('ABCD',3).filter(s=>new Set(s).size===3).length,24);
});
test('6.1: displayed bit-to-subset table is a bijection',()=>{
  const rows=table('sets-and-bits');assert.deepEqual(rows.map(r=>r[0]),strings('01',3));assert.equal(new Set(rows.map(r=>r[1])).size,8);
  for(const [bits,subset] of rows){const chosen=[...'abc'].filter((_,i)=>bits[i]==='1');assert.equal(subset,chosen.length?'{'+chosen.join(', ')+'}':'∅');}
  assert.equal(strings('ACGT',3).length,64);assert.deepEqual(strings('01',0),['']);
});
test('6.1: published nested and consecutive loop snippets execute six and five increments',()=>{
  function execute(source){let output='let k,i,j;\n',levels=[];for(const line of source.split('\n')){const indent=line.length-line.trimStart().length,s=line.trim();while(levels.length&&indent<=levels.at(-1)){output+='}\n';levels.pop();}if(s.startsWith('for ')){const m=s.match(/^for (\w+) from (\d+) through (\d+):$/);assert.ok(m,s);output+=`for(${m[1]}=${m[2]};${m[1]}<=${m[3]};${m[1]}++){\n`;levels.push(indent);}else{assert.match(s,/^k := (0|k \+ 1)$/);output+=s.replace(':=','=')+';\n';}}output+='}\n'.repeat(levels.length)+'k';return vm.runInNewContext(output,{}, {timeout:1000});}
  assert.deepEqual(blocks('loops').filter(b=>b.type==='math').map(b=>execute(b.notation)),[6,5]);
  let varying=0;for(let i=1;i<=4;i++)for(let j=1;j<=i;j++)varying++;assert.equal(varying,10);
});
test('6.1: fictional variable names exclude only names already counted',()=>{
  const one=[...'ABC'],two=strings('ABC01',2).filter(s=>'ABC'.includes(s[0])),allowed=two.filter(s=>!['AB','C0'].includes(s));
  const rows=table('mixed-cases');assert.equal(Number(rows[0][3]),one.length);assert.equal(Number(rows[1][3]),allowed.length);assert.equal(Number(rows[2][3]),one.length+allowed.length);assert.equal(two.includes('0A'),false);
});
test('6.1: password complement counts agree with independent exact-digit case sums',()=>{
  const choose=(n,k)=>{let c=1n;for(let j=1;j<=k;j++)c=c*BigInt(n-j+1)/BigInt(j);return c;};let total=0n;
  for(const [length,all,forbidden,allowed] of table('complement')){const n=Number(length);let exactSum=0n;for(let k=1;k<=n;k++)exactSum+=choose(n,k)*10n**BigInt(k)*26n**BigInt(n-k);assert.equal(BigInt(all),36n**BigInt(n));assert.equal(BigInt(forbidden),26n**BigInt(n));assert.equal(BigInt(allowed),exactSum);assert.equal(BigInt(all)-BigInt(forbidden),exactSum);total+=exactSum;}
  assert.equal(total,49807440n);assert.equal(4*10*26**3,703040);
  const small=strings('AB01',4),valid=small.filter(s=>/[01]/.test(s));assert.equal(valid.length,4**4-2**4);
  const descriptions=new Map();for(let i=0;i<4;i++)for(const s of small)if('01'.includes(s[i]))descriptions.set(s,(descriptions.get(s)||0)+1);
  assert.equal(descriptions.get('A0B1'),2);assert.equal(descriptions.get('AAAA'),undefined);assert.ok(new Set(descriptions.values()).size>1);
});
test('6.1: invented address fields and overlapping bit conditions match exhaustive bit strings',()=>{
  const codes=strings('01',8),a=codes.filter(s=>s[0]==='0'&&s.slice(1,3)!=='11'&&!['00000','11111'].includes(s.slice(3))),b=codes.filter(s=>s.startsWith('10')&&!['000','111'].includes(s.slice(5)));
  assert.deepEqual(table('structured-codes').map(r=>Number(r[4])),[a.length,b.length]);assert.equal(new Set([...a,...b]).size,138);assert.ok(a.every(s=>!b.includes(s)));
  const bits=strings('01',6),A=s=>s[0]==='1',B=s=>s.endsWith('00');const counts=[bits.filter(A).length,bits.filter(B).length,bits.filter(s=>A(s)&&B(s)).length,bits.filter(s=>A(s)||B(s)).length];assert.deepEqual(table('inclusion-exclusion').map(r=>Number(r[3])),counts);assert.equal(bits.filter(s=>A(s)!==B(s)).length,32);
});
test('6.1: language survey regions preserve both reported totals and the universe',()=>{
  const numbers=table('neither').map(r=>Number(r[2]));assert.deepEqual(numbers,[27,18,12,23]);assert.equal(numbers.reduce((a,b)=>a+b,0),80);assert.equal(numbers[0]+numbers[1],45);assert.equal(numbers[1]+numbers[2],30);assert.equal(numbers.slice(0,3).reduce((a,b)=>a+b,0),57);
});
test('6.1: pair and circle division factors are uniform, while repeated pairs are not',()=>{
  const groups=new Map();for(let a=0;a<6;a++)for(let b=0;b<6;b++)if(a!==b){const key=[a,b].sort().join(',');groups.set(key,(groups.get(key)||0)+1);}assert.equal(groups.size,15);assert.ok([...groups.values()].every(n=>n===2));
  const rotations=new Map();for(const p of permutations([0,1,2,3,4])){const i=p.indexOf(0),key=[...p.slice(i),...p.slice(0,i)].join(',');rotations.set(key,(rotations.get(key)||0)+1);}assert.equal(rotations.size,24);assert.ok([...rotations.values()].every(n=>n===5));assert.ok(rotations.has('0,1,2,3,4')&&rotations.has('0,4,3,2,1'));
  const repeats=new Map();for(const s of strings('AB',2)){const key=[...s].sort().join('');repeats.set(key,(repeats.get(key)||0)+1);}assert.equal(repeats.size,3);assert.deepEqual([...repeats.values()].sort(),[1,1,2]);
});
test('6.1: restricted-string leaves and stopped game sequences cover exactly the legal outcomes',async()=>{
  const leaves=strings('01',3).filter(s=>!s.includes('11'));assert.deepEqual(leaves,['000','001','010','100','101']);const svg=await readFile(new URL('../assets/counting-tree.svg',import.meta.url),'utf8');assert.deepEqual([...svg.matchAll(/<text[^>]*>([01]{3})<\/text>/g)].map(m=>m[1]),leaves);
  const counts=[];for(let n=0;n<=12;n++){counts[n]=strings('01',n).filter(s=>!s.includes('11')).length;if(n>=2)assert.equal(counts[n],counts[n-1]+counts[n-2]);}assert.equal(counts[5],13);
  function games(target,s='',a=0,b=0){if(a===target||b===target)return [s];return [...games(target,s+'A',a+1,b),...games(target,s+'B',a,b+1)];}
  const short=games(2);assert.equal(short.length,6);for(const [length,sequences,count] of table('stopping-rules').slice(0,2)){const n=parseInt(length),actual=short.filter(s=>s.length===n);assert.equal(actual.length,Number(count));assert.deepEqual(actual.toSorted(),sequences.split(', ').toSorted());}
  const longer=games(3);assert.deepEqual([3,4,5].map(n=>longer.filter(s=>s.length===n).length),[2,6,12]);assert.equal(longer.length,20);
});
