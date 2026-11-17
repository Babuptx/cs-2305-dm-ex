import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten,evaluateBoolean} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['2.5','2.6'].map(async id=>[id,JSON.parse(await readFile(`data/lessons/${id}.json`,'utf8'))])));
const blocks=(id,u)=>flatten(lessons[id].units.find(x=>x.id===u).blocks);
const tables=(id,u)=>blocks(id,u).filter(b=>b.type==='table');
const maths=(id,u)=>blocks(id,u).filter(b=>b.type==='math').map(b=>b.notation);
const range=n=>Array.from({length:n},(_,i)=>i),num=s=>Number(s.replaceAll('−','-'));
const gcd=(a,b)=>b===0?a:gcd(b,a%b);
const position=(p,q)=>(p+q-2)*(p+q-1)/2+p;
const integerAt=n=>n===0?0:n%2?(n+1)/2:-n/2;
function matrices(u){return Object.fromEntries(maths('2.6',u).flatMap(s=>s.split('\n')).flatMap(line=>{const m=line.match(/^(.+?) = (\[\[.*\]\])$/);return m?[[m[1],JSON.parse(m[2].replaceAll('−','-'))]]:[];}));}
const mul=(A,B)=>A.map(row=>B[0].map((_,j)=>row.reduce((s,a,k)=>s+a*B[k][j],0)));
const bool=(A,B)=>mul(A,B).map(row=>row.map(x=>Number(x>0)));
const tr=A=>A[0].map((_,j)=>A.map(row=>row[j]));
const add=(A,B)=>A.map((row,i)=>row.map((x,j)=>x+B[i][j]));
const join=(A,B)=>A.map((row,i)=>row.map((x,j)=>Number(Boolean(x||B[i][j]))));
const meet=(A,B)=>A.map((row,i)=>row.map((x,j)=>Number(Boolean(x&&B[i][j]))));
const I=n=>range(n).map(i=>range(n).map(j=>Number(i===j)));
const allBits=(m,n)=>range(2**(m*n)).map(mask=>range(m).map(i=>range(n).map(j=>(mask>>(i*n+j))&1)));
test('2.5: integer listing matches every displayed position and explicit inverse positions',()=>{
 const values=tables('2.5','list-integers')[0].rows[0].slice(1).map(num);assert.deepEqual(values,range(values.length).map(integerAt));
 for(let z=-100;z<=100;z++){const index=z===0?0:z>0?2*z-1:-2*z;assert.equal(integerAt(index),z);}
 assert.equal(integerAt(23),12);assert.equal(integerAt(24),-12);
});
test('2.5: hotel assignment ranges are disjoint and their inverse assignments cover each room',()=>{
 for(let k=0;k<10;k++)for(let room=1;room<=60;room++){const old=room>k?room-k:null,newGuest=room<=k?room:null;assert.notEqual(old===null,newGuest===null);if(old!==null)assert.equal(old+k,room);}
 for(let room=1;room<=100;room++){if(room%2)assert.equal(2*((room+1)/2)-1,room);else assert.equal(2*(room/2),room);}
});
test('2.5: pair table and SVG ranks give contiguous finite diagonals with no missing positions',async()=>{
 for(const [s,pairs]of tables('2.5','diagonal-listing')[0].rows){const ps=[...pairs.matchAll(/\((\d+), (\d+)\)/g)].map(m=>m.slice(1).map(Number));assert.deepEqual(ps,range(Number(s)-1).map(i=>[i+1,Number(s)-i-1]));}
 const ranked=[];for(let s=2;s<=30;s++)for(let p=1;p<s;p++)ranked.push(position(p,s-p));assert.deepEqual(ranked,range(ranked.length).map(i=>i+1));
 const svg=await readFile('assets/countable-grid.svg','utf8'),cells=[...svg.matchAll(/data-p="(\d+)" data-q="(\d+)" data-position="(\d+)"/g)];assert.equal(cells.length,25);for(const [,p,q,n]of cells)assert.equal(position(Number(p),Number(q)),Number(n));
});
test('2.5: rational diagonals keep exactly the reduced fractions and eventually reach every bounded example',()=>{
 for(const [s,list]of tables('2.5','rational-list')[0].rows){const expected=range(Number(s)-1).map(i=>[i+1,Number(s)-i-1]).filter(([p,q])=>gcd(p,q)===1).map(x=>x.join('/'));assert.deepEqual(list.split(', '),expected);}
 const emitted=new Set();for(let s=2;s<=16;s++)for(let p=1;p<s;p++)if(gcd(p,s-p)===1)emitted.add(p+'/'+(s-p));
 for(let p=1;p<=8;p++)for(let q=1;q<=8;q++){const g=gcd(p,q);assert.ok(emitted.has((p/g)+'/'+(q/g)));}
});
test('2.5: finite-string table lists every word once in the declared length-first order',()=>{
 const rows=tables('2.5','finite-strings')[0].rows;assert.match(rows[0][1],/empty string/);
 for(const [length,list]of rows.slice(1)){const n=Number(length),words=list.split(', ');assert.deepEqual(words,range(2**n).map(x=>x.toString(2).padStart(n,'0')));}
});
test('2.5: binary diagonal construction differs from every row in all three-by-three bit tables',()=>{
 for(const rows of allBits(3,3)){const diagonal=rows.map((r,i)=>1-r[i]);rows.forEach((r,i)=>assert.notEqual(r[i],diagonal[i]));assert.ok(rows.every(r=>r.some((b,j)=>b!==diagonal[j])));}
});
test('2.5: decimal example and diagram select the stated diagonal digit and avoid zero/nine tails',async()=>{
 const rows=tables('2.5','real-diagonal')[0].rows,svg=await readFile('assets/real-diagonal.svg','utf8');let result='';
 rows.forEach(([index,prefix,digit,chosen])=>{const i=Number(index),digits=prefix.slice(2,6);assert.equal(digits[i-1],digit);assert.equal(chosen,digit==='1'?'2':'1');assert.notEqual(chosen,digit);result+=chosen;for(let j=0;j<4;j++)assert.ok(svg.includes(`data-row="${i}" data-col="${j+1}" data-digit="${digits[j]}"`));});assert.equal(result,'2112');assert.match(result,/^[12]+$/);
});
test('2.5: interval injections keep both closed endpoints inside the open target',()=>{
 for(let i=0;i<=100;i++){const y=i/100,x=(y+1)/3;assert.ok(0<x&&x<1);assert.ok(Math.abs(3*x-1-y)<1e-12);}
 assert.equal(0/2,0);
});
test('2.5: Cantor diagonal subset is missing from every map on finite sets through three members',()=>{
 for(let n=0;n<=3;n++){const base=2**n;for(let code=0;code<base**n;code++){let k=code;const outputs=range(n).map(()=>{const s=k%base;k=Math.floor(k/base);return s;});let D=0;outputs.forEach((mask,i)=>{if(!(mask&(1<<i)))D|=1<<i;});assert.ok(!outputs.includes(D));}}
});
test('2.6: entry table and addition preserve rows, columns, and signed values',()=>{
 const {A}=matrices('matrix-entries');assert.deepEqual(tables('2.6','matrix-entries')[0].rows.map(row=>row.slice(1).map(num)),A);assert.deepEqual(A.map(r=>r[1]),[-1,4]);assert.equal(A[1][2],1);
 const m=matrices('matrix-addition');assert.deepEqual(add(m.A,m.B),m['A + B']);
});
test('2.6: dimension table checks each multiplication order independently',()=>{
 for(const [a,b,ab,ba]of tables('2.6','product-shapes')[0].rows){const [m,k]=a.split(' × ').map(Number),[p,n]=b.split(' × ').map(Number);assert.equal(ab.startsWith('Defined'),k===p);assert.equal(ba.startsWith('Defined'),n===m);if(k===p)assert.equal(ab,`Defined: ${m} × ${n}`);if(n===m)assert.equal(ba,`Defined: ${p} × ${k}`);}
});
test('2.6: every row-column calculation and diagram entry matches the complete product',async()=>{
 const m=matrices('row-column'),product=mul(m.A,m.B);assert.deepEqual(product,m.AB);
 tables('2.6','row-column')[0].rows.forEach(([,expr,value],i)=>{const actual=vm.runInNewContext(expr.replaceAll('·','*').replaceAll('−','-'));assert.equal(actual,num(value));assert.equal(actual,product[Math.floor(i/2)][i%2]);});
 const svg=await readFile('assets/matrix-row-column.svg','utf8');for(const [,name,i,j,v]of svg.matchAll(/data-matrix="(A|B|AB)" data-row="(\d+)" data-col="(\d+)" data-value="(-?\d+)"/g))assert.equal(m[name][Number(i)-1][Number(j)-1],Number(v));
});
test('2.6: purchase totals keep intermediate categories aligned',()=>{
 const m=matrices('product-meaning');assert.deepEqual(mul(m.A,m.B),m.AB);assert.equal(m.AB[0][0],16);assert.notDeepEqual(mul(m.A,[m.B[1],m.B[0]]),m.AB);
});
test('2.6: noncommutativity and zero-product examples refute scalar shortcuts',()=>{
 const m=matrices('noncommutative');assert.deepEqual(mul(m.P,m.Q),m.PQ);assert.deepEqual(mul(m.Q,m.P),m.QP);assert.notDeepEqual(m.PQ,m.QP);
 assert.deepEqual(mul([[1,0],[0,0]],[[0,0],[0,1]]),[[0,0],[0,0]]);
 assert.deepEqual(mul(add(m.P,m.Q),add(m.P,m.Q)),add(add(mul(m.P,m.P),m.PQ),add(m.QP,mul(m.Q,m.Q))));
});
test('2.6: ordinary and Boolean associative products agree on every triple of two-by-two bit matrices',()=>{
 const all=allBits(2,2);for(const A of all)for(const B of all)for(const C of all){assert.deepEqual(mul(mul(A,B),C),mul(A,mul(B,C)));assert.deepEqual(bool(bool(A,B),C),bool(A,bool(B,C)));assert.deepEqual(mul(A,add(B,C)),add(mul(A,B),mul(A,C)));}
});
test('2.6: identity sizes, transpose order, and symmetric product work on rectangular inputs',()=>{
 const m=matrices('transpose'),A=m.A;assert.deepEqual(tr(A),m['Aᵀ']);assert.deepEqual(tr(tr(A)),A);assert.deepEqual(mul(I(2),A),A);assert.deepEqual(mul(A,I(3)),A);
 const B=[[1,4],[2,-1],[3,0]];assert.deepEqual(tr(mul(A,B)),mul(tr(B),tr(A)));assert.deepEqual(mul(A,tr(A)),[[6,1],[1,13]]);
 const {S}=matrices('symmetric');assert.deepEqual(S,tr(S));
});
test('2.6: displayed ordinary powers match repeated multiplication and the general shear formula',()=>{
 const m=matrices('matrix-powers');assert.deepEqual(mul(m.H,m.H),m['H²']);assert.deepEqual(mul(m['H²'],m.H),m['H³']);let power=I(2);for(let r=0;r<=20;r++){assert.deepEqual(power,[[1,3*r],[0,1]]);power=mul(power,m.H);}
});
test('2.6: bit truth table, join and meet agree without treating OR as addition',()=>{
 for(const [a,b,or,and]of tables('2.6','join-meet')[0].rows){assert.equal(Number(Boolean(Number(a)||Number(b))),Number(or));assert.equal(Number(Boolean(Number(a)&&Number(b))),Number(and));}
 const m=matrices('join-meet');assert.deepEqual(join(m.A,m.B),m['A ∨ B']);assert.deepEqual(meet(m.A,m.B),m['A ∧ B']);assert.notDeepEqual(add(m.A,m.B),m['A ∨ B']);
});
test('2.6: Boolean products test positive route counts, not parity',()=>{
 const m=matrices('boolean-product');assert.deepEqual(mul(m.A,m.B),m.AB);assert.deepEqual(bool(m.A,m.B),m['A ⊙ B']);assert.notDeepEqual(m.AB.map(r=>r.map(x=>x%2)),m['A ⊙ B']);
 for(const [,expr,value]of tables('2.6','boolean-product')[0].rows)assert.equal(Number(evaluateBoolean(expr,{'0':false,'1':true})),Number(value));
});
test('2.6: Boolean powers match independently enumerated walks of exactly each length',()=>{
 const m=matrices('boolean-powers');assert.deepEqual(bool(m.G,m.G),m['G[2]']);assert.deepEqual(bool(m['G[2]'],m.G),m['G[3]']);assert.deepEqual(m['G[3]'],I(3));let p=I(3);
 for(let r=0;r<=9;r++){for(let start=0;start<3;start++){let frontier=new Set([start]);for(let step=0;step<r;step++)frontier=new Set([...frontier].flatMap(v=>range(3).filter(w=>m.G[v][w])));assert.deepEqual(p[start],range(3).map(v=>Number(frontier.has(v))));}p=bool(p,m.G);}
 assert.deepEqual(join(join(I(3),m.G),m['G[2]']),[[1,1,1],[1,1,1],[1,1,1]]);
});
const booleanProduct=vm.runInNewContext(maths('2.6','matrix-code')[0]+'; booleanProduct');
const native=x=>JSON.parse(JSON.stringify(x));
test('2.6: actual displayed code matches all small rectangular bit products without mutation or row aliasing',()=>{
 for(const [m,k,n]of [[1,1,1],[2,2,2],[2,3,2],[1,3,2],[3,1,2]])for(const A of allBits(m,k))for(const B of allBits(k,n)){const before=JSON.stringify([A,B]),C=booleanProduct(A,B);assert.deepEqual(native(C),bool(A,B));assert.equal(JSON.stringify([A,B]),before);if(m>1){const old=C[1][0];C[0][0]=9;assert.equal(C[1][0],old);}}
});
test('2.6: actual code rejects empty, ragged, sparse, nonbit, and dimension-mismatched matrices',()=>{
 for(const bad of [null,[],[[]],[[0],[1,0]],[[2]],[[true]],[[NaN]],[Array(1)],Array(1)])assert.throws(()=>booleanProduct(bad,[[1]]),/matrix|bits/i);
 assert.throws(()=>booleanProduct([[1,0]],[[1]]),/dimensions/);assert.throws(()=>booleanProduct([[1]],[[0,1],[]]),/Ragged/);
});
