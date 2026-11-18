import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['4.3','4.4'].map(async id=>[id,JSON.parse(await readFile(`data/lessons/${id}.json`,'utf8'))])));
const blocks=(id,u)=>flatten(lessons[id].units.find(v=>v.id===u).blocks);
const table=(id,u)=>blocks(id,u).find(v=>v.type==='table');
const code=(id,u)=>blocks(id,u).find(v=>v.type==='math'&&v.notation.startsWith('function ')).notation;
const source=[['4.3','trial-primality'],['4.3','factor-algorithm'],['4.3','prime-sieve'],['4.3','euclid-code'],['4.3','extended-euclid'],['4.4','inverse-code'],['4.4','general-linear-congruence'],['4.4','crt-code'],['4.4','discrete-log-code']].map(([id,u])=>code(id,u)).join('\n');
const f=vm.runInNewContext(source+';({isPrime,primeFactors,primesThrough,gcd,extendedGcd,normalizedMod,inverseMod,solveLinear,chineseRemainder,powerLogTable})');
const num=s=>Number(s.replaceAll('−','-'));
const mod=(a,m)=>((a%m)+m)%m;
const range=n=>Array.from({length:n},(_,i)=>i);
const divisors=n=>range(Math.abs(n)).map(i=>i+1).filter(d=>n%d===0);
const brutePrime=n=>n>1&&divisors(n).length===2;
const bruteGcd=(a,b)=>{if(a===0)return Math.abs(b);if(b===0)return Math.abs(a);return Math.max(...divisors(a).filter(d=>b%d===0));};
const crt=rows=>f.chineseRemainder(rows.map(([residue,modulus])=>({residue:BigInt(residue),modulus:BigInt(modulus)})));

test('4.3: actual primality code agrees with full divisor enumeration',()=>{
 for(let n=-10;n<=1000;n++)assert.equal(f.isPrime(BigInt(n)),brutePrime(n));
 for(const n of [49n,121n,169n,289n,9409n])assert.equal(f.isPrime(n),false);
 for(const n of [1,'2',null,2.5])assert.throws(()=>f.isPrime(n));
});
test('4.3: factors are prime, ordered, and reconstruct the exact input',()=>{
 for(let n=1;n<=1000;n++){const factors=Array.from(f.primeFactors(BigInt(n)));assert.equal(factors.reduce((p,v)=>p*v,1n),BigInt(n));factors.forEach((p,i)=>{assert.ok(brutePrime(Number(p)));if(i)assert.ok(factors[i-1]<=p);});}
 assert.deepEqual(Array.from(f.primeFactors(1386n)),[2n,3n,3n,7n,11n]);assert.deepEqual(Array.from(f.primeFactors(2n**100n)),Array(100).fill(2n));assert.deepEqual(Array.from(f.primeFactors(1n)),[]);
 for(const n of [0n,-1n,2,'2'])assert.throws(()=>f.primeFactors(n));
});
test('4.3: sieve agrees with independent primality and respects inclusive limits',()=>{
 for(const limit of [0,1,2,3,4,49,50,121,500])assert.deepEqual(Array.from(f.primesThrough(limit)),range(limit+1).filter(brutePrime));
 for(const limit of [-1,1.5,NaN,Infinity,'5',5n,1000001])assert.throws(()=>f.primesThrough(limit));
});
test('4.3: sieve diagram labels every survivor and smallest factor correctly',async()=>{
 const svg=await readFile('assets/prime-sieve-50.svg','utf8'),cells=[...svg.matchAll(/data-n="(\d+)" data-factor="(\d+)" data-prime="(true|false)"/g)];assert.equal(cells.length,50);
 for(const [,n,factor,prime]of cells){const v=Number(n),ds=divisors(v).filter(d=>d>1&&d<v);assert.equal(Number(factor),ds[0]||0);assert.equal(prime==='true',brutePrime(v));}
});
test('4.3: prime-form examples and polynomial counterexample are correct',()=>{
 assert.equal(2*3*5*7*11*13+1,59*509);assert.ok(brutePrime(59)&&brutePrime(509));assert.equal(2**11-1,23*89);assert.equal((2**15-1)%7,0);
 for(let n=0;n<=15;n++)assert.ok(brutePrime(n*n+n+17));assert.equal(16*16+16+17,17*17);
});
test('4.3: prime-count table uses counts rather than equating an estimate',()=>{
 for(const [x,count,estimate]of table('4.3','prime-distribution').rows){assert.equal(range(Number(x)+1).filter(brutePrime).length,Number(count));assert.equal((Number(x)/Math.log(Number(x))).toFixed(1),estimate);}
});
test('4.3: pairwise coprimality is stronger than a shared gcd of one',()=>{
 assert.equal(bruteGcd(bruteGcd(6,10),15),1);assert.deepEqual([[6,10],[6,15],[10,15]].map(([a,b])=>bruteGcd(a,b)),[2,3,5]);
 for(const [a,b]of [[8,9],[8,25],[9,25]])assert.equal(bruteGcd(a,b),1);
});
test('4.3: exponent table reconstructs gcd, lcm, and both inputs',()=>{
 let a=1,b=1,g=1,l=1;for(const row of table('4.3','gcd-lcm-exponents').rows){const [p,u,v,lo,hi]=row.map(Number);assert.equal(lo,Math.min(u,v));assert.equal(hi,Math.max(u,v));a*=p**u;b*=p**v;g*=p**lo;l*=p**hi;}assert.deepEqual([a,b,g,l],[360,168,24,2520]);assert.equal(a*b,g*l);
 for(let a=1;a<=25;a++)for(let b=1;b<=25;b++){const g=bruteGcd(a,b);let l=Math.max(a,b);while(l%a||l%b)l++;assert.equal(a*b,g*l);}
});
test('4.3: Euclidean table and SVG preserve their original gcd and range',async()=>{
 const rows=table('4.3','euclid-trace').rows.map(r=>r.map(Number));rows.forEach(([a,b,q,r],i)=>{assert.equal(a,b*q+r);assert.ok(r>=0&&r<b);assert.equal(bruteGcd(a,b),6);if(i)assert.deepEqual([a,b],[rows[i-1][1],rows[i-1][3]]);});
 const svg=await readFile('assets/euclid-remainders.svg','utf8');assert.deepEqual([...svg.matchAll(/data-a="(\d+)" data-b="(\d+)" data-q="(\d+)" data-r="(\d+)"/g)].map(m=>m.slice(1).map(Number)),rows);
});
test('4.3: gcd and extended gcd agree with independent divisor enumeration for signs and zeros',()=>{
 for(let a=-35;a<=35;a++)for(let b=-35;b<=35;b++){if(!a&&!b)continue;const g=BigInt(bruteGcd(a,b));assert.equal(f.gcd(BigInt(a),BigInt(b)),g);const result=f.extendedGcd(BigInt(a),BigInt(b));assert.equal(result.g,g);assert.equal(result.s*BigInt(a)+result.t*BigInt(b),g);}
 for(const fn of [f.gcd,f.extendedGcd])for(const args of [[0n,0n],[1,2n],[1n,2],[null,1n]])assert.throws(()=>fn(...args));
});
test('4.3: Bezout table and back substitution produce the displayed identities',()=>{
 for(const [r,s,t]of table('4.3','extended-euclid').rows.map(r=>r.map(num)))assert.equal(240*s+174*t,r);
 assert.equal(37*240-51*174,6);assert.equal(-5*150+9*84,6);
 const big=2n**400n;const {g,s,t}=f.extendedGcd(13n*big,21n*big);assert.equal(g,big);assert.equal(s*13n*big+t*21n*big,g);
});
test('4.3: actual extended algorithm maintains both coefficient invariants at every step',()=>{
 const tracked=code('4.3','extended-euclid').replace('while (r !== 0n) {','while (r !== 0n) { inspect(oldR,r,oldS,s,oldT,t,a,b);');let count=0;
 const fn=vm.runInNewContext(tracked+';extendedGcd',{inspect:(R,r,S,s,T,t,a,b)=>{count++;a=a<0n?-a:a;b=b<0n?-b:b;assert.equal(R,S*a+T*b);assert.equal(r,s*a+t*b);}});
 assert.equal(fn(-240n,174n).g,6n);assert.equal(count,6);
});
test('4.3: coprime cancellation and prime-product claims hold in bounded independent checks',()=>{
 for(let m=2;m<=15;m++)for(let c=1;c<=15;c++)if(bruteGcd(c,m)===1)for(let a=0;a<15;a++)for(let b=0;b<15;b++)if(mod(c*(a-b),m)===0)assert.equal(mod(a-b,m),0);
 for(const p of [2,3,5,7,11])for(let a=1;a<=25;a++)for(let b=1;b<=25;b++)if(a*b%p===0)assert.ok(a%p===0||b%p===0);
});
test('4.4: inverse function matches exhaustive residues, including negative coefficients',()=>{
 for(let m=2;m<=30;m++)for(let a=-35;a<=35;a++){const solutions=range(m).filter(x=>mod(a*x,m)===1),actual=f.inverseMod(BigInt(a),BigInt(m));assert.equal(actual,solutions.length?BigInt(solutions[0]):null);assert.ok(solutions.length<=1);}
 assert.equal(f.inverseMod(17n,43n),38n);assert.equal(f.inverseMod(-17n,43n),5n);assert.equal(17*27%43,29);
 for(const args of [[1n,1n],[1n,0n],[1n,-2n],[1,2n],[1n,2]])assert.throws(()=>f.inverseMod(...args));
});
test('4.4: normalized remainder enforces exact positive-modulus inputs',()=>{
 for(let a=-20n;a<=20n;a++)for(let m=1n;m<=9n;m++)assert.equal(f.normalizedMod(a,m),mod(a,m));
 for(const args of [[1n,0n],[1n,-1n],[1,2n],[1n,2]])assert.throws(()=>f.normalizedMod(...args));
});
test('4.4: linear solver returns every residue solution and no extra solutions',()=>{
 for(let m=1;m<=20;m++)for(let a=-12;a<=12;a++)for(let b=-12;b<=12;b++){
  const expected=range(m).filter(x=>mod(a*x-b,m)===0),actual=f.solveLinear(BigInt(a),BigInt(b),BigInt(m));
  if(!expected.length){assert.equal(actual,null);continue;}
  assert.notEqual(actual,null);assert.equal(actual.count,BigInt(expected.length));const reconstructed=range(Number(actual.count)).map(k=>Number(actual.base+BigInt(k)*actual.period));assert.deepEqual(reconstructed,expected);
 }
});
test('4.4: linear solver contracts and large exact arithmetic preserve solutions',()=>{
 for(const args of [[1n,2n,0n],[1n,2n,-3n],[1,2n,3n],[1n,2,3n],[1n,2n,3]])assert.throws(()=>f.solveLinear(...args));
 const m=2n**150n,a=3n,b=2n**130n+9n,r=f.solveLinear(a,b,m);assert.equal(mod(a*r.base-b,m),0n);assert.equal(r.period,m);assert.equal(r.count,1n);
 const all=f.solveLinear(0n,5n,5n);assert.deepEqual([all.base,all.period,all.count],[0n,1n,5n]);assert.equal(f.solveLinear(0n,1n,5n),null);
});
test('4.4: CRT construction table and diagram isolate each remainder correctly',async()=>{
 const rows=table('4.4','crt-construction').rows.map(r=>r.map(Number));let sum=0;
 for(const [m,a,M,y,E,term]of rows){assert.equal(m*M,140);assert.equal(M*y%m,1);assert.equal(E,M*y);assert.equal(term,a*E);sum+=term;for(const [other]of rows)assert.equal(E%other,other===m?1:0);}
 assert.equal(sum,611);assert.equal(sum%140,51);
 const svg=await readFile('assets/crt-residue-clocks.svg','utf8');const tracks=[...svg.matchAll(/data-modulus="(\d+)" data-residue="(\d+)"/g)].map(m=>m.slice(1).map(Number));assert.deepEqual(tracks,[[4,3],[5,1],[7,2]]);for(const [m,r]of tracks)assert.equal(51%m,r);
});
test('4.4: CRT implementation agrees with independent exhaustive searches',()=>{
 for(const moduli of [[2,3],[4,5],[3,4,5],[4,5,7]]){
  const M=moduli.reduce((p,m)=>p*m,1);for(let target=0;target<M;target++){
   const rows=moduli.map(m=>[target%m-m,m]),r=crt(rows),solutions=range(M).filter(x=>rows.every(([a,m])=>mod(x-a,m)===0));assert.deepEqual(solutions,[Number(r.residue)]);assert.equal(r.modulus,BigInt(M));
  }
 }
 assert.equal(crt([[3,4],[1,5],[2,7]]).residue,51n);
});
test('4.4: CRT rejects shared moduli and malformed rows without mutating inputs',()=>{
 for(const rows of [[[0,6],[0,9]],[[0,5],[0,5]],[[0,6],[0,10],[0,15]],[[1,1]],[[0,-2]]])assert.throws(()=>crt(rows));
 for(const rows of [[],null,[null],[{residue:1,modulus:3n}],new Array(2)])assert.throws(()=>f.chineseRemainder(rows));
 const rows=[{residue:-1n,modulus:4n},{residue:1n,modulus:5n}];const before=structuredClone(rows);f.chineseRemainder(rows);assert.deepEqual(rows,before);
 const big=f.chineseRemainder([{residue:123456789n,modulus:2n**100n},{residue:987654321n,modulus:3n**70n}]);assert.equal(big.residue%(2n**100n),123456789n);assert.equal(big.residue%(3n**70n),987654321n);
});
test('4.4: shared-modulus compatibility and period match exhaustive pairs',()=>{
 for(let m=1;m<=10;m++)for(let n=1;n<=10;n++)for(let a=0;a<m;a++)for(let b=0;b<n;b++){const g=bruteGcd(m,n),period=m*n/g,solutions=range(period).filter(x=>x%m===a&&x%n===b);assert.equal(solutions.length,mod(b-a,g)===0?1:0);}
 assert.deepEqual(range(54).filter(x=>x%6===2&&x%9===5),[14,32,50]);assert.deepEqual(range(54).filter(x=>x%6===2&&x%9===4),[]);
});
test('4.4: residue arithmetic table distinguishes exact answers from wraparound',()=>{
 for(const [label,tuple,result]of table('4.4','residue-arithmetic').rows){const actual={'23':23,'16':16,'23 + 16':39,'23·16':368}[label];const residues=tuple.slice(1,-1).split(',').map(Number);assert.deepEqual(residues,[4,5,7].map(m=>actual%m));assert.equal(Number(result),actual%140);}
 assert.equal(bruteGcd(3,7),1);assert.equal(bruteGcd(3,31),1);assert.equal(bruteGcd(7,31),1);
});
test('4.4: Fermat formulas and reduction examples retain prime and base conditions',()=>{
 for(const p of [2n,3n,5n,7n,11n,13n])for(let a=-15n;a<=15n;a++){assert.equal(mod(a**p-a,p),0n);if(a%p!==0n)assert.equal(mod(a**(p-1n),p),1n);}
 assert.equal(5n**123n%13n,8n);assert.equal(4n**50n%7n,2n);assert.notEqual(13n**12n%13n,13n**0n%13n);
});
test('4.4: pseudoprime and Carmichael examples pass exactly the claimed tests',()=>{
 assert.equal(11n*31n,341n);assert.equal(2n**340n%341n,1n);assert.equal(3n**340n%341n,56n);
 assert.equal(5*13*17,1105);for(const p of [5,13,17])assert.equal(1104%(p-1),0);
 for(let a=1;a<1105;a++)if(bruteGcd(a,1105)===1)assert.equal(BigInt(a)**1104n%1105n,1n);assert.notEqual(5n**1104n%1105n,1n);
});
test('4.4: power table and diagram visit each nonzero residue exactly once',async()=>{
 const rows=table('4.4','primitive-roots').rows.map(r=>r.map(Number));for(const [e,r]of rows)assert.equal(2**e%13,r);assert.deepEqual(rows.map(r=>r[1]).sort((a,b)=>a-b),range(12).map(i=>i+1));
 const svg=await readFile('assets/primitive-root-cycles.svg','utf8');assert.deepEqual([...svg.matchAll(/data-base="2" data-exponent="(\d+)" data-residue="(\d+)"/g)].map(m=>m.slice(1).map(Number)),rows);
 assert.deepEqual(range(4).map(e=>3**e%13),[1,3,9,1]);assert.equal(2**12%13,1);
});
test('4.4: discrete-log implementation verifies primitive roots and exponent boundaries',()=>{
 for(const p of [2,3,5,7,11,13,17,19])for(let r=1;r<p;r++){
  const powers=range(p-1).map(e=>Number(BigInt(r)**BigInt(e)%BigInt(p))),primitive=new Set(powers).size===p-1;
  if(!primitive){assert.throws(()=>f.powerLogTable(BigInt(p),BigInt(r)));continue;}
  const logs=f.powerLogTable(BigInt(p),BigInt(r));assert.equal(logs.size,p-1);for(const [value,e]of logs){assert.ok(e>=0n&&e<BigInt(p-1));assert.equal(BigInt(r)**e%BigInt(p),value);}assert.equal(logs.get(1n),0n);
 }
 const logs=f.powerLogTable(13n,2n);assert.equal(logs.get(5n),9n);assert.equal(logs.get(12n),6n);assert.equal(logs.get(7n),11n);assert.equal(logs.get(10n),10n);assert.equal(logs.get(8n),mod(logs.get(5n)+logs.get(12n),12n));
 for(const [p,r]of [[1n,1n],[4n,1n],[13n,0n],[13n,13n],[10001n,2n],[13,2n],[13n,2]])assert.throws(()=>f.powerLogTable(p,r));
});
