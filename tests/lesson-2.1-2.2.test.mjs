import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten, evaluateBoolean, assignments} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['2.1','2.2'].map(async id=>[id,JSON.parse(await readFile(`data/lessons/${id}.json`,'utf8'))])));
const blocks=(id,unit)=>flatten(lessons[id].units.find(u=>u.id===unit).blocks);
const tables=(id,u)=>blocks(id,u).filter(b=>b.type==='table');
const maths=(id,u)=>blocks(id,u).filter(b=>b.type==='math').map(b=>b.notation);
const range=n=>Array.from({length:n},(_,i)=>i);
const canonical=s=>JSON.stringify([...s].sort());
const union=(a,b)=>new Set([...a,...b]),inter=(a,b)=>new Set([...a].filter(x=>b.has(x))),diff=(a,b)=>new Set([...a].filter(x=>!b.has(x)));
const equal=(a,b)=>assert.equal(canonical(a),canonical(b));
// Structural keys distinguish an atom, a tuple, and a set containing either.
function literal(text){
 let i=0;const s=text.replace(/\s/g,'');
 function read(){
  if(s[i]==='∅'){i++;return new Set();}
  if(s[i]==='{'){i++;const result=new Set();while(s[i]!=='}'){result.add(key(read()));if(s[i]!==',')break;i++;}assert.equal(s[i++],'}');return result;}
  if(s[i]==='('){i++;const items=[];while(s[i]!==')'){items.push(key(read()));if(s[i]!==',')break;i++;}assert.equal(s[i++],')');return 'tuple:'+JSON.stringify(items);}
  const start=i;while(i<s.length&&!'{},()'.includes(s[i]))i++;assert.ok(i>start);return 'atom:'+s.slice(start,i);
 }
 const value=read();assert.equal(i,s.length);return value;
}
const key=x=>x instanceof Set?'set:'+canonical(x):x;
const subsets=s=>{const a=[...s];return range(2**a.length).map(mask=>new Set(a.filter((_,i)=>mask&(1<<i))));};
function calc(source,env){
 const s=source.replace(/\s/g,'');let i=0;
 function atom(){let a;if(s[i]==='('){i++;a=expr();assert.equal(s[i++],')');}else{const name=s[i++];a=name==='∅'?new Set():env[name];assert.ok(a instanceof Set,name);}while(s[i]==='ᶜ'){i++;a=diff(env.U,a);}return a;}
 function expr(){let a=atom();while(['∪','∩','∖','△'].includes(s[i])){const op=s[i++],b=atom();a=op==='∪'?union(a,b):op==='∩'?inter(a,b):op==='∖'?diff(a,b):union(diff(a,b),diff(b,a));}return a;}
 const a=expr();assert.equal(i,s.length,source);return a;
}
const running={U:literal('{1,2,3,4,5,6,7,8}'),A:literal('{1,2,3,5}'),B:literal('{3,4,5,6}')};
test('2.1: nested set tables count distinct outer members',()=>{
 for(const [s,,n]of tables('2.1','empty-and-nested')[0].rows)assert.equal(literal(s).size,Number(n));
 for(const [s,n]of tables('2.1','cardinality')[0].rows)assert.equal(literal(s).size,Number(n));
 assert.equal(literal('{{∅}}').has(key(literal('∅'))),false);
});
test('2.1: displayed membership and subset claims preserve object levels',()=>{
 for(const [claim,truth]of tables('2.1','subset-versus-member')[0].rows){const [a,op,b]=claim.split(/\s(⊆|∈)\s/),left=literal(a),right=literal(b);assert.equal(op==='∈'?right.has(key(left)):[...left].every(x=>right.has(x)),truth==='T');}
});
test('2.1: the displayed power-set roster contains every subset exactly once',()=>{
 const [input,output]=maths('2.1','power-set')[1].split(' = ');const base=literal(input.slice(2,-1)),actual=literal(output);
 equal(actual,new Set(subsets(base).map(key)));assert.equal(actual.size,8);
 for(const [size,list]of tables('2.1','power-set')[0].rows)for(const s of list.split(';')){assert.equal(literal(s).size,Number(size));assert.ok(actual.has(key(literal(s))));}
});
test('2.1: power sets of empty and nested singleton inputs match enumeration',()=>{
 for(const [s,p,n]of tables('2.1','empty-power-sets')[0].rows){const actual=literal(p);equal(actual,new Set(subsets(literal(s)).map(key)));assert.equal(actual.size,Number(n));}
});
test('2.1: interval endpoint flags match the actual bracket notation',()=>{
 for(const [interval,,lo,hi]of tables('2.1','interval-endpoints')[0].rows){assert.equal(interval.startsWith('['),lo==='T');assert.equal(interval.endsWith(']'),hi==='T');}
});
test('2.1: Cartesian product and relation rosters match their defining rules',()=>{
 const product=blocks('2.1','cartesian-product').find(b=>b.text?.includes('Then A × B')).text.match(/Then A × B = (\{.*?\})\./)[1];
 equal(literal(product),new Set(['2','4'].flatMap(a=>['p','q','r'].map(b=>literal(`(${a},${String(b).replace('-','−')})`)))));
 const relation=blocks('2.1','relations-as-subsets').find(b=>b.text?.includes('less than or equal')).text.match(/R = (\{.*\})\./)[1];
 equal(literal(relation),new Set([-1,0,2].flatMap(a=>[-1,0,2].filter(b=>a<=b).map(b=>literal(`(${String(a).replace('-','−')},${String(b).replace('-','−')})`)))));
});
test('2.1: truth-set examples satisfy their predicates over stated domains',()=>{
 const rows=tables('2.1','truth-sets')[1].rows;
 const expected=[range(11).map(i=>i-5).filter(x=>x*x===4),[],['1/2'],range(11).map(i=>i-5).filter(x=>x*x<4)];
 rows.forEach((r,i)=>equal(literal(r[2]),literal('{'+expected[i].map(x=>String(x).replace('-','−')).join(',')+'}')));
});
test('2.2: running union, intersection, and directed differences agree with member lists',()=>{
 for(const [expr,,result]of tables('2.2','union-intersection')[0].rows)equal(calc(expr,running),literal(result));
 for(const [expr,result]of tables('2.2','set-difference')[0].rows)equal(calc(expr,running),literal(result));
});
test('2.2: all four displayed membership rows match their operations',()=>{
 const rows=tables('2.2','membership-operations')[0].rows;assert.equal(new Set(rows.map(r=>r.slice(0,2).join(''))).size,4);
 for(const row of rows){const [a,b]=row.map(Number);assert.deepEqual(row.slice(2).map(Number),[a||b,a&&b,a&&!b,!a,a!==b].map(Number));}
});
test('2.2: all nineteen printed identities hold for every subset of universes up to three objects',()=>{
 const identities=tables('2.2','set-identity-toolkit')[0].rows.map(r=>r[1].split(' = '));assert.equal(identities.length,19);
 for(let n=0;n<=3;n++){const U=new Set(range(n)),ss=subsets(U);for(const A of ss)for(const B of ss)for(const C of ss)for(const [left,right]of identities)equal(calc(left,{U,A,B,C}),calc(right,{U,A,B,C}));}
});
test('2.2: elementwise equivalence and full distributive table exhaust all membership patterns',()=>{
 for(const a of assignments(['a','b','c']))assert.equal(evaluateBoolean(maths('2.2','elementwise-proof')[0],a),true);
 const table=tables('2.2','membership-table-proof')[0];assert.equal(new Set(table.rows.map(r=>r.slice(0,3).join(''))).size,8);
 for(const row of table.rows){const env=Object.fromEntries(['a','b','c'].map((k,i)=>[k,row[i]==='1']));for(let i=3;i<5;i++)assert.equal(evaluateBoolean(table.headers[i],env),row[i]==='1');}
});
test('2.2: every step of the displayed simplification preserves membership',()=>{
 const U=new Set([0,1,2]);for(const A of subsets(U))for(const B of subsets(U))for(const [expr]of tables('2.2','identity-chain')[0].rows)equal(calc(expr,{U,A,B}),A);
});
test('2.2: counterexamples actually refute commutativity and associativity of difference',()=>{
 const rows=tables('2.2','set-counterexamples')[0].rows;
 for(let i=0;i<2;i++){const [left,right]=rows[i][0].split(' = '),env={U:literal('{1,2}'),A:literal('{1}'),B:literal(i===0?'{2}':'{1}'),C:literal('{1}')};const results=rows[i][2].split(' versus ');equal(calc(left,env),literal(results[0]));equal(calc(right,env),literal(results[1]));assert.notEqual(canonical(calc(left,env)),canonical(calc(right,env)));}
});
test('2.2: union and difference cardinality formulas cover empty, nested, and disjoint cases',()=>{
 const U=new Set(range(4));for(const A of subsets(U))for(const B of subsets(U)){assert.equal(union(A,B).size,A.size+B.size-inter(A,B).size);assert.equal(diff(A,B).size,A.size-inter(A,B).size);}
});
test('2.2: bit-encoding and decoded result tables use the same universe ordering',()=>{
 const rows=tables('2.2','bit-encoding')[0].rows,U=rows[0].slice(1);
 for(const row of rows.slice(1)){const source=literal(row[0].split(' = ')[1]);equal(new Set(U.filter((_,i)=>row[i+1]==='1').map(x=>'atom:'+x)),source);}
 for(const [expr,,bits,decoded]of tables('2.2','bit-operations')[0].rows){equal(calc(expr,running),literal(decoded));equal(new Set(U.filter((_,i)=>bits[i]==='1').map(x=>'atom:'+x)),literal(decoded));}
});
const setBits=vm.runInNewContext(maths('2.2','bit-operations')[0]+'; setBits');
test('2.2: actual displayed code matches independent set operations for every pair through width five',()=>{
 for(let n=0;n<=5;n++){const U=new Set(range(n)),ss=subsets(U);for(const A of ss)for(const B of ss){const encode=s=>[...U].map(x=>s.has(x)?'1':'0').join(''),got=setBits(encode(A),encode(B)),expected={union:union(A,B),intersection:inter(A,B),difference:diff(A,B),complement:diff(U,A),symmetric:union(diff(A,B),diff(B,A))};for(const [k,s]of Object.entries(expected))assert.equal(got[k],encode(s));}}
});
test('2.2: displayed code rejects invalid inputs and preserves long encodings',()=>{
 for(const [a,b]of [[1,'1'],['1',null],['2','0'],['1','01'],[' 1','00'],['1\n','00']])assert.throws(()=>setBits(a,b),/Matching bit strings required/);
 const a='0'.repeat(70)+'1',b='1'+'0'.repeat(70);assert.equal(setBits(a,b).union,'1'+'0'.repeat(69)+'1');
});
