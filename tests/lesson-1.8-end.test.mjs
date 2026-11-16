import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {evaluateBoolean as ev,assignments,flatten} from './logic-oracle.mjs';
import {evaluateFormula as qe} from './quantifier-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['1.8','1-end'].map(async id=>[id,JSON.parse(await readFile(new URL(`../data/lessons/${id}.json`,import.meta.url),'utf8'))])));
const blocks=(id,u)=>flatten(lessons[id].units.find(x=>x.id===u).blocks);
const tables=(id,u)=>blocks(id,u).filter(b=>b.type==='table');
const math=(id,u)=>blocks(id,u).filter(b=>b.type==='math').map(b=>b.notation);
const range=n=>Array.from({length:n},(_,i)=>i),ints=range(41).map(i=>i-20),truth=s=>s==='T';
test('1.8: every row of the bounded exhaustive proof and its general identity checks',()=>{
 const rows=tables('1.8','finite-exhaustion')[0].rows;assert.deepEqual(rows.map(r=>Number(r[0])),[1,2,3,4,5]);
 for(const [s,l,r,t]of rows){const n=Number(s);assert.equal(n*n+4,Number(l));assert.equal(4*n,Number(r));assert.equal(Number(l)>=Number(r),truth(t));}
 for(const n of ints)assert.equal(n*n+4-4*n,(n-2)**2);
});
test('1.8: cases are exhaustive and justify the absolute-value and parity claims',()=>{
 for(const a of assignments(['p','q','r']))assert.equal(ev(math('1.8','cases-cover')[0],a),true);
 for(const n of ints){assert.ok(Math.abs(n)>=n);assert.equal(Math.abs((n*(n+1))%2),0);const k=Math.floor(n/2);assert.equal(n*(n+1),n%2===0?2*k*(2*k+1):2*(2*k+1)*(k+1));}
 assert.equal(0**2>0,false);
});
test('1.8: the complete last-digit table matches all ten remainder classes',()=>{
 const rows=tables('1.8','residue-cases')[0].rows;assert.deepEqual(rows.map(r=>Number(r[0])),range(10));
 for(const [b,s,d]of rows){assert.equal(Number(b)**2,Number(s));assert.equal(Number(s)%10,Number(d));}
 assert.deepEqual([...new Set(rows.map(r=>Number(r[2])))].sort((a,b)=>a-b),[0,1,4,5,6,9]);
 for(const a of ints)for(const b of range(10)){assert.equal((10*a+b)**2,10*(10*a*a+2*a*b)+b*b);assert.equal((10*a+b)**2%10,b*b%10);}
});
test('1.8: bounded integer search excludes all solutions and preserves sign cases',()=>{
 const rows=tables('1.8','bounded-search')[0].rows;
 for(const [ys,required]of rows){assert.equal(7-2*Number(ys),Number(required));assert.equal([0,1,4].includes(Number(required)),false);}
 for(let x=-10;x<=10;x++)for(let y=-10;y<=10;y++){assert.notEqual(x*x+2*y*y,7);if(Math.abs(x)>=3||Math.abs(y)>=2)assert.ok(x*x+2*y*y>7);}
});
test('1.8: symmetric parity and constructive square-sum witnesses meet every requirement',()=>{
 for(const x of ints)for(const y of ints)if(Math.abs(x%2)!==Math.abs(y%2)){assert.equal(Math.abs((x+y)%2),1);assert.equal(x+y,y+x);}
 const numbers=math('1.8','constructive-existence')[0].match(/\d+/g).map(Number);assert.deepEqual(numbers,[65,1,8,4,7]);assert.equal(numbers[0],numbers[1]**2+numbers[2]**2);assert.equal(numbers[0],numbers[3]**2+numbers[4]**2);
 for(const r of ints)for(const s of ints)if(r<s){const t=(r+s)/2;assert.ok(r<t&&t<s);}
});
test('1.8: nonconstructive sign alternatives and exponent identity support the case argument',()=>{
 for(const signs of assignments(['a','b','c']))assert.ok(signs.a===signs.b||signs.a===signs.c||signs.b===signs.c);
 const a=Math.sqrt(2);assert.ok(Math.abs((a**a)**a-2)<1e-12);
 // Numerical approximation is only an arithmetic check, never a rationality test.
 for(const k of ints)assert.equal((2*k+1)**2,2*(2*k*k+2*k)+1);
});
function gameCells(cells,memo=new Map()){
 const key=cells.map(([r,c])=>r+','+c).join(';');if(memo.has(key))return memo.get(key);
 const win=cells.some(([r,c])=>(r!==0||c!==0)&&!gameCells(cells.filter(([i,j])=>!(i>=r&&j>=c)),memo));memo.set(key,win);return win;
}
test('1.8: strategy stealing reaches the identical board on every small full rectangle',()=>{
 const memo=new Map();for(let h=1;h<=4;h++)for(let w=1;w<=4;w++){
  const cells=range(h).flatMap(r=>range(w).map(c=>[r,c]));assert.equal(gameCells(cells,memo),h*w>1);
  if(h*w===1)continue;const after=cells.filter(([r,c])=>r!==h-1||c!==w-1);
  for(const [r,c]of after.filter(([r,c])=>r||c))assert.deepEqual(after.filter(([i,j])=>!(i>=r&&j>=c)),cells.filter(([i,j])=>!(i>=r&&j>=c)));
 }
});
test('1.8: exactly-one formula tests existence as well as equality of all candidates',()=>{
 const formula=math('1.8','existence-uniqueness')[0];for(let n=0;n<=4;n++)for(let mask=0;mask<2**n;mask++){const domain=range(n),P=x=>Boolean(mask&(1<<x));assert.equal(qe(formula,{default:domain},{P}),domain.filter(P).length===1);}
 for(const a of ints.filter(Boolean))for(const b of ints)for(const c of [-4,0,7]){const x=(c-b)/a;assert.ok(Math.abs(a*x+b-c)<1e-10);}
 assert.equal(4*4+3,19);
});
test('1.8: inequality difference is a square and equality occurs exactly at equal inputs',()=>{
 for(const x of ints)for(const y of ints){const gap=2*(x*x+y*y)-(x+y)**2;assert.equal(gap,(x-y)**2);assert.ok(gap>=0);assert.equal(gap===0,x===y);}
 assert.equal((-3)**2,9);
});
test('1.8: displayed counter-removal replies beat every opponent continuation from eighteen',()=>{
 const rows=tables('1.8','backward-game')[0].rows;assert.deepEqual(rows.map(r=>Number(r[0])),[1,2,3,4]);
 const replies=new Map(rows.map(([k,r,total])=>{assert.equal(Number(k)+Number(r),Number(total));return [Number(k),Number(r)];}));
 function walk(n){for(const [k,response]of replies){assert.ok(k<=n&&response<=n-k&&response>=1&&response<=4);const next=n-k-response;assert.equal(next,n-5);if(next>0)walk(next);}}
 walk(18-3);const win=[false];for(let n=1;n<=30;n++)win[n]=[1,2,3,4].some(k=>k<=n&&!win[n-k]);assert.equal(win[18],true);assert.equal(win[20],false);
});
test('1.8: square counterexample and both tiling diagrams agree with independent color enumeration',async()=>{
 assert.equal([0,1,4].some(a=>[0,1,4].some(b=>[0,1,4].some(c=>a+b+c===7))),false);assert.equal(2*2%4,0);assert.notEqual(2%4,0);
 for(const [file,n,mod,expected]of [['domino-obstruction',6,2,[16,18]],['triomino-obstruction',5,3,[7,9,8]]]){
  const svg=await readFile(new URL(`../assets/${file}.svg`,import.meta.url),'utf8');const cells=[...svg.matchAll(/data-row="(\d+)" data-col="(\d+)" data-color="(\d+)" data-removed="(true|false)"/g)];assert.equal(cells.length,n*n);const counts=range(mod).fill(0);
  for(const [,r,c,k,removed]of cells){assert.equal((Number(r)+Number(c))%mod,Number(k));assert.equal(removed==='true',Number(r)===0&&Number(c)===0||(mod===2&&Number(r)===n-1&&Number(c)===n-1));if(removed==='false')counts[Number(k)]++;}
  assert.deepEqual(counts,expected);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)for(const [dr,dc]of [[1,0],[0,1]])if(r+(mod-1)*dr<n&&c+(mod-1)*dc<n)assert.equal(new Set(range(mod).map(i=>(r+i*dr+c+i*dc)%mod)).size,mod);
 }
 assert.deepEqual(tables('1.8','triomino-coloring')[0].rows.map(r=>r.slice(1).map(Number)),[[8,7,8],[9,9,8],[8,8,8]]);
});
test('1.8: the actual Collatz trace uses exact integer transitions and stops first at one',()=>{
 const trace=math('1.8','strategy-recap')[0].split('→').map(s=>BigInt(s.trim()));assert.equal(trace[0],9n);assert.equal(trace.at(-1),1n);
 for(let i=0;i<trace.length-1;i++){assert.notEqual(trace[i],1n);assert.equal(trace[i+1],trace[i]%2n===0n?trace[i]/2n:3n*trace[i]+1n);}
});
test('Chapter 1: displayed truth table, equivalence steps and inference chain are valid',()=>{
 for(const [p,q,...outputs]of tables('1-end','connective-retrieval')[0].rows){const a={p:truth(p),q:truth(q)};['p ∧ q','p ∨ q','p ⊕ q','p → q','p ↔ q'].forEach((f,i)=>assert.equal(ev(f,a),truth(outputs[i])));}
 for(const a of assignments(['p','q'])){const rows=tables('1-end','equivalence-practice')[0].rows;for(const [f]of rows)assert.equal(ev(f,a),a.p);}
 for(const a of assignments(['p','q','r']))if(ev('p → q',a)&&ev('q → r',a)&&!a.r)for(const [,f]of tables('1-end','inference-review')[0].rows)assert.equal(ev(f,a),true);
});
test('Chapter 1: consistency, puzzle, DNF and NAND constructions match their intended models',()=>{
 const models=assignments(['u','c','m']).filter(a=>['u → c','m → ¬c','m'].every(f=>ev(f,a)));assert.deepEqual(models,[{u:false,c:false,m:true}]);
 assert.deepEqual(assignments(['a','b']).filter(a=>ev('a ↔ b',a)&&ev('b ↔ (a ⊕ b)',a)),[{a:false,b:false}]);
 const nand=(p,q)=>!(p&&q);for(const [p,q,t]of tables('1-end','normal-forms')[0].rows){const a={p:truth(p),q:truth(q)};assert.equal(ev(math('1-end','normal-forms')[0],a),truth(t));assert.equal(nand(a.p,a.p),!a.p);assert.equal(nand(nand(a.p,a.q),nand(a.p,a.q)),a.p&&a.q);assert.equal(nand(nand(a.p,a.p),nand(a.q,a.q)),a.p||a.q);}
});
test('Chapter 1: quantified review formulas respect eligibility, empty domains and witness order',()=>{
 const rows=tables('1-end','single-quantifier-review')[0].rows;
 for(let n=0;n<=3;n++)for(let mask=0;mask<2**(2*n);mask++){const d=range(n),T=x=>Boolean(mask&(1<<x)),A=x=>Boolean(mask&(1<<(n+x))),expected=[d.every(x=>!T(x)||A(x)),d.some(x=>T(x)&&A(x)),d.every(x=>!T(x)||!A(x)),d.some(x=>T(x)&&!A(x))];rows.forEach(([,f],i)=>assert.equal(qe(f,{default:d},{T,A}),expected[i]));}
 const table=tables('1-end','nested-quantifier-review')[0].rows,R=(s,t)=>truth(table[s][t+1]);for(const [f,t]of tables('1-end','nested-quantifier-review')[1].rows)assert.equal(qe(f,{s:[0,1],t:[0,1]},{R}),truth(t));
});
test('Chapter 1: published JavaScript preserves bit lengths and rejects invalid inputs',()=>{
 const context=vm.createContext({});vm.runInContext(math('1-end','logic-program-project')[0],context);
 for(const p of [false,true])for(const q of [false,true]){const row=context.connectives(p,q);assert.deepEqual(JSON.parse(JSON.stringify(row)),{and:p&&q,or:p||q,xor:p!==q,implies:!p||q,iff:p===q});}
 for(let n=1;n<=4;n++)for(let a=0;a<2**n;a++)for(let b=0;b<2**n;b++){const aa=a.toString(2).padStart(n,'0'),bb=b.toString(2).padStart(n,'0'),r=context.bitwise(aa,bb);for(const [k,value]of [['and',a&b],['or',a|b],['xor',a^b]])assert.equal(r[k],value.toString(2).padStart(n,'0'));}
 const [input,...expected]=tables('1-end','logic-program-project')[0].rows[0],r=context.bitwise(...input.split(' and '));assert.deepEqual([r.and,r.or,r.xor],expected);
 for(const args of [['',''],['01','1'],['02','01'],[1,'1'],[null,'0']])assert.throws(()=>context.bitwise(...args));assert.throws(()=>context.connectives(1,true));
});
test('Chapter 1: exactly-one encoding and worked proof arithmetic include all cases',()=>{
 for(const a of assignments(['a','b','c']))assert.equal(ev('(a ∨ b ∨ c) ∧ (¬a ∨ ¬b) ∧ (¬a ∨ ¬c) ∧ (¬b ∨ ¬c)',a),Object.values(a).filter(Boolean).length===1);
 for(const a of ints)for(const b of ints)assert.equal((2*a+1)*(2*b+1),2*(2*a*b+a+b)+1);
 for(const x of ints)assert.equal(Math.abs(x),Math.abs(-x));assert.equal(3*4-2,10);
});
test('Chapter 1: proposed row-length Chomp recurrence agrees with an independent cell-set game',()=>{
 const memo=new Map();function rowsWin(rows){const key=rows.join(',');if(memo.has(key))return memo.get(key);const win=rows.some((length,r)=>range(length).some(c=>(r!==0||c!==0)&&!rowsWin(rows.map((n,i)=>i<r?n:Math.min(n,c)).filter(Boolean))));memo.set(key,win);return win;}
 const cellMemo=new Map();for(let a=1;a<=4;a++)for(let b=0;b<=a;b++)for(let c=0;c<=b;c++){const rows=[a,b,c].filter(Boolean),cells=rows.flatMap((n,r)=>range(n).map(c=>[r,c]));assert.equal(rowsWin(rows),gameCells(cells,cellMemo));}
 for(const [board,result]of [[[1],false],[[2],true],[[2,1],false],[[2,2],true]])assert.equal(rowsWin(board),result);
});
