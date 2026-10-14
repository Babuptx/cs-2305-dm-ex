import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['5.5','5-end'].map(async id=>[id,JSON.parse(await readFile(new URL('../data/lessons/'+id+'.json',import.meta.url),'utf8'))])));
const blocks=(id,name)=>flatten(lessons[id].units.find(u=>u.id===name).blocks);
const math=(id,name)=>blocks(id,name).filter(b=>b.type==='math').map(b=>b.notation);
const table=(id,name,index=0)=>blocks(id,name).filter(b=>b.type==='table')[index].rows;
const integer=s=>Number(s.replaceAll('−','-'));
const factorial=n=>{let value=1;for(let i=2;i<=n;i++)value*=i;return value;};
// Execute the published assignment/branch/loop snippets, capturing every loop
// head (including the final false guard) to check invariants and variants.
// Inputs are trusted repository content, isolated with a timeout and step cap.
const expression=s=>s.replaceAll('×','*').replaceAll('−','-').replaceAll('≥','>=').replaceAll('≤','<=').replace(/(?<![<>=!])=(?!=)/g,'===');
function run(source,input={},limit=1000){
  const assigned=[...source.matchAll(/^\s*(\w+) :=/gm)].map(m=>m[1]);
  const variables=[...new Set([...Object.keys(input),...assigned])];
  const locals=[...new Set(assigned)].filter(v=>!(v in input));
  let js=(locals.length?'let '+locals.join(',')+';\n':''),levels=[],snapshots=[];
  for(const line of source.split('\n')){
    const indent=line.length-line.trimStart().length,s=line.trim();
    while(levels.length&&indent<=levels.at(-1)){js+='}\n';levels.pop();}
    if(s.startsWith('if ')||s.startsWith('while ')){
      const m=s.match(/^(if|while) (.+):$/);assert.ok(m,s);
      const condition=expression(m[2]);
      js+=m[1]==='while'?`while ((record({${variables.join(',')}}), ${condition})) {\n`:`if (${condition}) {\n`;
      levels.push(indent);
    }else if(s==='else:'){js+='else {\n';levels.push(indent);}
    else {const m=s.match(/^(\w+) := (.+)$/);assert.ok(m,s);js+=`${m[1]} = ${expression(m[2])};\n`;}
  }
  js+='}\n'.repeat(levels.length)+`result={${variables.join(',')}};`;
  const context=vm.createContext({...input,record:state=>{if(snapshots.length>=limit)throw new Error('Step cap reached');snapshots.push({...state});}});
  vm.runInContext(js,context,{timeout:1000});
  return {result:{...context.result},snapshots};
}
test('5.5: published assignment and composition examples use the current stored value',()=>{
  assert.equal(run(math('5.5','assignment')[0],{x:3}).result.z,7);
  const source=math('5.5','composition')[1],result=run(source,{x:4}).result;
  assert.deepEqual(result,{x:7,y:14});
  assert.deepEqual(run(source.split('\n').reverse().join('\n'),{x:4}).result,{x:7,y:8});
  for(let x=-20;x<=30;x++){const next=x+5;if(x>=7)assert.ok(next>=12);if(x>=9)assert.ok(next>=12);}assert.ok(0+5<12);assert.ok(7+5<20);
});
test('5.5: both paths of the no-else statement establish the bound',()=>{
  const source=math('5.5','if-without-else')[1];
  for(let x=-30;x<=30;x++){const result=run(source,{x}).result.x;assert.equal(result,Math.max(x,10));assert.ok(result>=10);}
});
test('5.5: published two-branch gap program matches absolute difference including equality',()=>{
  const source=math('5.5','if-else')[1];
  for(let a=-15;a<=15;a++)for(let b=-15;b<=15;b++)assert.equal(run(source,{a,b}).result.gap,Math.abs(a-b));
  for(const [a,b,,gap] of table('5.5','if-else'))assert.equal(run(source,{a:integer(a),b:integer(b)}).result.gap,integer(gap));
});
test('5.5: actual factorial loop preserves every checkpoint and decreases its variant',()=>{
  const source=math('5.5','factorial-invariant')[0];
  for(let n=0;n<=18;n++){const {result,snapshots}=run(source,{n});assert.equal(result.f,factorial(n));assert.equal(snapshots.length,n+1);
    snapshots.forEach((s,i)=>{assert.equal(s.i,i);assert.equal(s.f,factorial(i));assert.ok(s.i>=0&&s.i<=n);if(i)assert.equal(n-s.i,n-snapshots[i-1].i-1);});}
  const {snapshots}=run(source,{n:4});
  table('5.5','factorial-invariant').forEach(([,i,f,v],index)=>{assert.equal(snapshots[index].i,Number(i));assert.equal(snapshots[index].f,Number(f));assert.equal(4-snapshots[index].i,Number(v));});
  const swapped=source.replace('  i := i + 1\n  f := f × i','  f := f × i\n  i := i + 1');assert.equal(run(swapped,{n:4}).result.f,0);
});
test('5.5: counterexample loops hit the step cap instead of producing an answer',()=>{
  assert.throws(()=>run(math('5.5','hoare-triples')[1],{},50),/Step cap/);
  assert.throws(()=>run(math('5.5','termination')[0],{n:1},50),/Step cap/);
  assert.equal(run(math('5.5','termination')[0],{n:0}).result.s,0);
});
test('5.5: signed repeated addition preserves the invariant for all sign combinations',()=>{
  const source=math('5.5','signed-multiply')[0];
  for(let m=-12;m<=12;m++)for(let n=-12;n<=12;n++){const {result,snapshots}=run(source,{m,n});assert.equal(result.product+0,m*n+0);assert.equal(result.a,Math.abs(n));assert.equal(snapshots.length,Math.abs(n)+1);
    snapshots.forEach((s,i)=>{assert.equal(s.k,i);assert.equal(s.x+0,m*i+0);assert.ok(s.k>=0&&s.k<=s.a);assert.equal(s.a,Math.abs(n));});}
  const {result,snapshots}=run(source,{m:-4,n:-3});assert.equal(result.product,12);
  table('5.5','signed-multiply',1).slice(0,-1).forEach(([,k,x],i)=>{assert.equal(snapshots[i].k,integer(k));assert.equal(snapshots[i].x,integer(x));});
});
test('Chapter 5 review: sum, inequality, and divisibility practice calculations hold',()=>{
  for(const [n,s,result] of table('5-end','sum-workshop')){let actual=0;for(let j=1;j<=Number(n);j++)actual+=2*j+3;assert.equal(actual,Number(s));assert.equal(actual,Number(result));}
  for(let n=1;n<=100;n++){let sum=0;for(let j=1;j<=n;j++)sum+=2*j+3;assert.equal(sum,n*(n+4));assert.equal(n*(n+4)+2*n+5,(n+1)*(n+5));if(n>=4)assert.ok(2n**BigInt(n)>=3n*BigInt(n));assert.equal((8n**BigInt(n)-1n)%7n,0n);}
  assert.equal((8n**0n-1n)%7n,0n);assert.ok(2**3<3*3);
});
test('Chapter 5 review: all bundle bases are correct and the step covers the stated range',()=>{
  for(const [n,a,b] of table('5-end','strong-practice'))assert.equal(5*Number(a)+8*Number(b),Number(n));
  const possible=Array(401).fill(false);possible[0]=true;for(let n=1;n<=400;n++)possible[n]=(n>=5&&possible[n-5])||(n>=8&&possible[n-8]);
  assert.equal(possible[27],false);for(let n=28;n<=400;n++)assert.equal(possible[n],true);for(let k=32;k<400;k++){assert.ok(k-4>=28);assert.equal(k-4+5,k+1);}
});
test('Chapter 5 review: full-tree leaf formula holds over all small generated shapes',()=>{
  const shapes=new Map([[1,[null]]]);for(let n=3;n<=11;n+=2){const list=[];for(let left=1;left<n-1;left+=2)for(const l of shapes.get(left))for(const r of shapes.get(n-left-1))list.push([l,r]);shapes.set(n,list);}
  const counts=t=>{if(t===null)return {l:1,i:0};const a=counts(t[0]),b=counts(t[1]);return {l:a.l+b.l,i:a.i+b.i+1};};
  for(const [n,list] of shapes)for(const t of list){const {l,i}=counts(t);assert.equal(l,i+1);assert.equal(n,2*i+1);}
});
test('Chapter 5 review: division capstone code preserves the equation and reaches the correct remainder',()=>{
  const source=math('5-end','division-capstone')[0];
  for(let A=0;A<=100;A++)for(let d=1;d<=12;d++){const {result,snapshots}=run(source,{A,d});assert.equal(result.q,Math.floor(A/d));assert.equal(result.r,A%d);
    snapshots.forEach((s,i)=>{assert.equal(d*s.q+s.r,A);assert.ok(s.q>=0&&s.r>=0);assert.ok(Number.isInteger(s.q)&&Number.isInteger(s.r));if(i)assert.equal(s.r,snapshots[i-1].r-d);});}
  const {snapshots}=run(source,{A:29,d:6});table('5-end','division-capstone').forEach(([,q,r,total],i)=>{assert.equal(snapshots[i].q,Number(q));assert.equal(snapshots[i].r,Number(r));assert.equal(6*Number(q)+Number(r),Number(total));});
  assert.throws(()=>run(source,{A:3,d:0},30),/Step cap/);
});
test('Chapter 5 review: exploration digit checkpoints and Fibonacci parity cycle are exact',()=>{
  const facts=new Map([[0,1n]]);let f=1n;for(let n=1;n<=21;n++){f*=BigInt(n);facts.set(n,f);}
  for(const [n,value,digits] of table('5-end','computational-explorations')){assert.equal(facts.get(Number(n)),BigInt(value));assert.equal(value.length,Number(digits));}
  for(const [digits,maximum] of [[10,12],[20,20]]){assert.ok(facts.get(maximum).toString().length<digits);assert.ok(facts.get(maximum+1).toString().length>=digits);}
  let a=0n,b=1n;for(let n=0;n<=300;n++){assert.equal(a%2n===0n,n%3===0);[a,b]=[b,a+b];}
  assert.equal(Number(2n**11n%5n),3);const reverse=s=>s.length?s.at(-1)+reverse(s.slice(0,-1)):'';assert.equal(reverse('cab'),'bac');assert.equal(reverse(''),'');
});
