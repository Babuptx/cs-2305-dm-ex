import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['2.3','2.4'].map(async id=>[id,JSON.parse(await readFile(`data/lessons/${id}.json`,'utf8'))])));
const blocks=(id,u)=>flatten(lessons[id].units.find(x=>x.id===u).blocks);
const tables=(id,u)=>blocks(id,u).filter(b=>b.type==='table');
const maths=(id,u)=>blocks(id,u).filter(b=>b.type==='math').map(b=>b.notation);
const range=n=>Array.from({length:n},(_,i)=>i),sum=a=>a.reduce((s,x)=>s+x,0),nums=s=>s.split(',').map(x=>Number(x.trim().replaceAll('−','-')));
const fact=n=>range(n).reduce((a,i)=>a*(i+1),1);
const close=(a,b)=>assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
// Parse the displayed arithmetic rather than restating its numerical results.
function calc(source,env={}){
 const supers={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','ⁿ':'n','⁺':'+','⁻':'-'};
 const s=source.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+/g,x=>'^('+[...x].map(c=>supers[c]).join('')+')').replaceAll('−','-').replaceAll('·','*').replace(/\s/g,'');
 const ts=s.match(/\d+(?:\.\d+)?|[a-z]|[+\-*/^()⌊⌋⌈⌉]/g)||[];assert.equal(ts.join(''),s);let i=0;
 function atom(){const t=ts[i++];if(t==='-')return -power();if(t==='+')return power();if(['(','⌊','⌈'].includes(t)){const v=add();assert.equal(ts[i++],{'(':')','⌊':'⌋','⌈':'⌉'}[t]);return t==='⌊'?Math.floor(v):t==='⌈'?Math.ceil(v):v;}if(/^\d/.test(t))return Number(t);assert.ok(t in env,source+': '+t);return env[t];}
 function power(){let v=atom();if(ts[i]==='^'){i++;v=v**power();}return v;}
 function mul(){let v=power();while(i<ts.length){if(ts[i]==='*'||ts[i]==='/'){const op=ts[i++],r=power();v=op==='*'?v*r:v/r;}else if(/^(?:\d|[a-z]|\(|⌊|⌈)/.test(ts[i]))v*=power();else break;}return v;}
 function add(){let v=mul();while(ts[i]==='+'||ts[i]==='-'){const op=ts[i++],r=mul();v=op==='+'?v+r:v-r;}return v;}
 const v=add();assert.equal(i,ts.length,source);return v;
}
test('2.3: image table removes shared outputs while preserving every selected input',()=>{
 const f={p:2,q:4,r:2,s:1},parse=s=>s==='∅'?[]:s.slice(1,-1).split(',').map(x=>x.trim());
 for(const [input,,output]of tables('2.3','function-relations')[0].rows)assert.deepEqual([...new Set(parse(input).map(x=>f[x]))].sort(),parse(output).map(Number));
});
test('2.3: sums, products, and compositions are computed from the displayed rules',()=>{
 const rows=tables('2.3','function-arithmetic')[0].rows;
 for(const x of [-5,-1,0,0.5,3,8]){const expected=[x*x+x+2,(x+2)*x*x,x*x+2];rows.forEach((r,i)=>close(calc(r[1],{x}),expected[i]));}
 rows.forEach(r=>assert.equal(calc(r[1],{x:3}),Number(r[2])));
 for(const x of range(15).map(i=>i-7)){assert.equal(calc(tables('2.3','composition')[0].rows[0][2],{x}),2*(x-4)+1);assert.equal(calc(tables('2.3','composition')[0].rows[1][2],{x}),2*x+1-4);}
});
test('2.3: all classification rows and diagram arrows agree on injectivity and surjectivity',async()=>{
 const rows=tables('2.3','bijection')[0].rows,svg=await readFile('assets/function-mappings.svg','utf8');
 const panels=[...svg.matchAll(/data-outputs="([\d,]+)" data-codomain-size="(\d+)"/g)];assert.equal(panels.length,4);
 rows.forEach(([a,b,values,inj,onto],i)=>{const outputs=nums(values),distinct=new Set(outputs);assert.equal(outputs.length,Number(a));assert.ok(outputs.every(x=>x>=1&&x<=Number(b)));assert.equal(distinct.size===outputs.length,inj==='Yes');assert.equal(distinct.size===Number(b),onto==='Yes');assert.deepEqual(nums(panels[i][1]),outputs);assert.equal(panels[i][2],b);});
});
test('2.3: finite equal-size functions are injective exactly when onto and inverses undo both ways',()=>{
 for(let n=1;n<=4;n++)for(let code=0;code<n**n;code++){
  let k=code;const f=range(n).map(()=>{const y=k%n;k=Math.floor(k/n);return y;}),injective=f.every((v,i)=>f.indexOf(v)===i),onto=range(n).every(y=>f.includes(y));assert.equal(injective,onto);
  if(injective){const inverse=range(n).map(y=>f.indexOf(y));for(const x of range(n)){assert.equal(inverse[f[x]],x);assert.equal(f[inverse[x]],x);}}
 }
});
test('2.3: affine inverse and square-root restriction preserve domains and show collisions',()=>{
 for(const x of range(81).map(i=>(i-40)/4)){const f=t=>3*t-2,inv=y=>(y+2)/3;close(inv(f(x)),x);close(f(inv(x)),x);assert.equal(Math.sqrt(x*x),Math.abs(x));if(x>=0)close(Math.sqrt(x)**2,x);}
 assert.equal(3*(2/3)-2,0);assert.equal(Number.isInteger(2/3),false);assert.equal((-3)**2,3**2);
 assert.deepEqual(tables('2.3','inverse-function')[0].rows.map(r=>calc(r[2])),[2,0.1]);
});
test('2.3: floor and ceiling value table and SVG endpoint conventions include negative inputs',async()=>{
 for(const [x,f,c]of tables('2.3','floor-ceiling')[0].rows){assert.equal(Math.floor(calc(x)),Number(f.replace('−','-')));assert.equal(Math.ceil(calc(x))||0,Number(c.replace('−','-')));}
 const svg=await readFile('assets/floor-ceiling-steps.svg','utf8'),steps=[...svg.matchAll(/data-left="(-?\d+)" data-level="(-?\d+)" data-includes="(left|right)"/g)];assert.equal(steps.length,6);
 for(const [,l,v,end]of steps){const left=Number(l),level=Number(v),fn=end==='left'?Math.floor:Math.ceil;assert.equal(fn(left+0.5)||0,level);assert.equal(fn(end==='left'?left:left+1)||0,level);assert.notEqual(fn(end==='left'?left+1:left),level);}
});
test('2.3: printed reflection and integer-shift identities survive negative values and integer boundaries',()=>{
 const rules=tables('2.3','rounding-laws')[0].rows.slice(3).map(r=>r[0].split(' = '));
 for(const x of range(121).map(i=>(i-60)/8))for(const n of [-5,-1,0,1,5])for(const [a,b]of rules)close(calc(a,{x,n}),calc(b,{x,n}));
 for(const x of range(121).map(i=>(i-60)/8))assert.ok(x-1<Math.floor(x)&&Math.floor(x)<=x&&x<=Math.ceil(x)&&Math.ceil(x)<x+1);
});
test('2.3: fractional-part proof table covers each boundary and matches its stated floor formula',()=>{
 const formula=maths('2.3','fractional-parts')[0].split(' = '),rows=tables('2.3','fractional-parts')[0].rows;
 for(const m of [-5,-1,0,2])for(const eps of [0,0.25,0.499,0.5,0.75,0.999]){const x=m+eps,row=rows[eps<0.5?0:1];row.slice(1).forEach((expr,i)=>close(calc(expr,{m}),[Math.floor(2*x),Math.floor(x),Math.floor(x+0.5)][i]));close(calc(formula[0],{x}),calc(formula[1],{x}));}
});
test('2.3: capacity rounding is minimal or maximal as claimed, including zero and exact divisions',()=>{
 for(let n=0;n<=50;n++)for(let c=1;c<=10;c++){const boxes=Math.ceil(n/c),groups=Math.floor(n/c);assert.ok(boxes*c>=n);assert.ok(boxes===0||(boxes-1)*c<n);assert.ok(groups*c<=n&&(groups+1)*c>n);}
 assert.equal(Math.ceil(29/6),5);assert.equal(Math.floor(29/6),4);assert.equal(29%6,5);
});
test('2.3: factorial table matches products including the empty product',()=>{
 for(const [n,value]of tables('2.3','important-functions')[0].rows)assert.equal(fact(Number(n)),Number(value));assert.equal(fact(0),fact(1));
});
test('2.4: progression table evaluates the actual formulas at the displayed indices',()=>{
 const {headers,rows}=tables('2.4','progressions')[1];for(const row of rows)for(let j=1;j<4;j++)close(calc(headers[j],{n:Number(row[0])}),calc(row[j]));
});
test('2.4: recurrence trace and shifted starting index count exactly the required updates',()=>{
 const rows=tables('2.4','recurrence-start')[0].rows;let a=4;for(const row of rows){a+=5;assert.equal(a,Number(row[2]));}
 for(let n=0;n<=30;n++){let value=4;for(let i=0;i<n;i++)value+=5;assert.equal(value,4+5*n);if(n>=1){let b=4;for(let i=1;i<n;i++)b+=5;assert.equal(b,4+5*(n-1));}}
 let b=[2,5];while(b.length<6)b.push(b.at(-1)-b.at(-2));assert.deepEqual(b,[2,5,3,-2,-5,-3]);
});
test('2.4: Fibonacci and Lucas table uses one recurrence with different initial conditions',()=>{
 const rows=tables('2.4','fibonacci-factorial')[0].rows;
 for(const row of rows){const values=row.slice(1).map(Number);assert.deepEqual(values.slice(0,2),row[0]==='Fₙ'?[0,1]:[2,1]);for(let i=2;i<values.length;i++)assert.equal(values[i],values[i-1]+values[i-2]);}
});
test('2.4: recurrence candidates satisfy the rule separately from the initial values',()=>{
 const rows=tables('2.4','verify-recurrence')[0].rows;
 for(const [candidate,rule]of rows){const expr=candidate.split(' = ')[1],f=n=>calc(expr,{n});const holds=range(18).map(i=>i+2).every(n=>f(n)===2*f(n-1)-f(n-2));assert.equal(holds,rule==='Yes');if(candidate.includes('3n'))assert.deepEqual([f(0),f(1)],[2,5]);}
});
test('2.4: percentage-growth table compounds the current value rather than adding a fixed amount',()=>{
 let value=80;for(const [n,p]of tables('2.4','geometric-model')[0].rows){close(value,Number(p));close(80*1.25**Number(n),Number(p));value*=1.25;}
});
test('2.4: candidate continuations agree on all supplied terms and then disagree',()=>{
 const a=n=>3*n+1,b=n=>3*n+1+(n-1)*(n-2)*(n-3)*(n-4);assert.deepEqual(range(4).map(i=>a(i+1)),[4,7,10,13]);for(let n=1;n<=4;n++)assert.equal(a(n),b(n));assert.equal(a(5),16);assert.equal(b(5),40);
});
test('2.4: all listed library sequences use the declared index range',()=>{
 const fib=[0,1];for(let i=2;i<=5;i++)fib.push(fib[i-1]+fib[i-2]);
 for(const [rule,terms]of tables('2.4','sequence-library')[0].rows){const f=n=>rule==='Fₙ'?fib[n]:rule==='n!'?fact(n):calc(rule,{n});assert.deepEqual(range(5).map(i=>f(i+1)),nums(terms));}
});
test('2.4: summation expansions and constant-term multiplicities match every endpoint',()=>{
 const expected=[sum(range(4).map(i=>(i+2)**2)),sum(range(4).map(i=>(-1)**(i+3))),7,4*7];
 tables('2.4','read-sigma')[0].rows.forEach((r,i)=>{assert.equal(calc(r[1]),Number(r[2]));assert.equal(Number(r[2]),expected[i]);});
 assert.equal(sum(range(4).map(i=>3*(i+1)+2)),38);assert.equal(1*3+2*4,11);assert.equal((1+2)*(3+4),21);
});
test('2.4: reindexing diagram gives a bijection of indices and preserves every summand',async()=>{
 const svg=await readFile('assets/summation-reindex.svg','utf8'),pairs=[...svg.matchAll(/data-old="(\d+)" data-new="(\d+)" data-value="(\d+)"/g)].map(m=>m.slice(1).map(Number));assert.deepEqual(pairs.map(r=>r[0]),[3,4,5,6]);assert.deepEqual(pairs.map(r=>r[1]),[0,1,2,3]);for(const [j,k,v]of pairs){assert.equal(k,j-3);assert.equal(v,j*j);assert.equal(v,(k+3)**2);}assert.equal(sum(pairs.map(r=>r[2])),86);
});
test('2.4: geometric sums cover negative ratios, one term, and the exceptional ratio one',()=>{
 for(const a of [-3,0,2])for(const r of [-2,-1,-0.5,0.5,1,3])for(let n=0;n<9;n++){const direct=sum(range(n+1).map(j=>a*r**j)),closed=r===1?(n+1)*a:a*(r**(n+1)-1)/(r-1);close(direct,closed);}
 assert.equal(sum([2,6,18,54,162]),242);assert.equal(sum([5,5,5,5]),20);
});
test('2.4: printed finite-sum formulas agree with enumeration and satisfy the induction difference',()=>{
 const rows=tables('2.4','finite-formulas')[0].rows;
 rows.forEach((row,i)=>{for(let n=0;n<=40;n++){const closed=calc(row[1],{n});close(closed,sum(range(n).map(k=>(k+1)**(i+1))));if(n)close(closed-calc(row[1],{n:n-1}),n**(i+1));}});
 assert.equal(sum(range(5).map(k=>(k+4)**2)),190);assert.equal(sum([8,5,2,-1]),14);assert.equal(sum(range(4).map(i=>(i+1)**2+2*(i+1))),50);
});
test('2.4: double-sum table matches each pair and either order of finite addition',()=>{
 const rows=tables('2.4','double-sums')[0].rows;for(const row of rows){const i=Number(row[0]);row.slice(1,5).forEach((x,j)=>assert.equal(Number(x),i+j+1));assert.equal(sum(row.slice(1,5).map(Number)),Number(row[5]));}assert.equal(sum(rows.map(r=>Number(r[5]))),54);
 const forward=range(4).flatMap(i=>range(i+1).map(j=>`${i+1},${j+1}`)),reverse=range(4).flatMap(j=>range(4-j).map(k=>`${j+k+1},${j+1}`));assert.equal(forward.length,10);assert.deepEqual(forward.sort(),reverse.sort());
});
test('2.4: telescoping endpoints and geometric tails match finite partial sums',()=>{
 for(let n=1;n<=30;n++)close(sum(range(n).map(i=>1/((i+1)*(i+2)))),1-1/(n+1));close(sum(range(4).map(i=>1/(i+3)-1/(i+4))),4/21);
 for(const x of [-0.75,-0.5,0,0.5,0.75])for(let N=0;N<=15;N++){const partial=sum(range(N+1).map(k=>x**k));close(1/(1-x)-partial,x**(N+1)/(1-x));}
 assert.equal(sum(range(6).map(k=>0.5**k)),63/32);close(sum(range(100).map(i=>(i+1)*0.5**i)),4);
});
