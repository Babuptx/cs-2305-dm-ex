import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['4.2','4.3','4.4','4.5','4.6'].map(async id=>[id,JSON.parse(await readFile(`data/lessons/${id}.json`,'utf8'))])));
const blocks=(id,u)=>flatten(lessons[id].units.find(v=>v.id===u).blocks);
const code=(id,u)=>blocks(id,u).find(v=>v.type==='math'&&v.notation.startsWith('function ')).notation;
const dependencies=[['4.2','modular-power-code'],['4.3','trial-primality'],['4.3','extended-euclid'],['4.4','inverse-code']].map(([id,u])=>code(id,u));
const snippets=['4.5','4.6'].flatMap(id=>lessons[id].units.flatMap(u=>flatten(u.blocks).filter(b=>b.type==='math'&&b.notation.startsWith('function ')).map(b=>b.notation)));
const f=vm.runInNewContext([...dependencies,...snippets].join('\n')+';({probeTable,lcg,appendEvenParity,validEvenParity,retailCheckDigit,validRetailCode,isbn10CheckDigit,validIsbn10,affineCipher,permuteBlocks,encodePairs,decodePairs,toyRsaKey,rsaBlock})');
const mod=(x,m)=>((x%m)+m)%m;
const range=n=>Array.from({length:n},(_,i)=>i);
const gcd=(a,b)=>b?gcd(b,a%b):Math.abs(a);
const power=(a,e,n)=>{let out=1n;for(let i=0n;i<e;i++)out=out*a%n;return out;};
const swap=(s,i,j)=>{const a=[...s];[a[i],a[j]]=[a[j],a[i]];return a.join('');};
const replace=(s,i,v)=>s.slice(0,i)+v+s.slice(i+1);

test('4.5: linear probing stores collisions, wraps, and preserves full signed keys',()=>{
 const input=[19n,26n,33n,12n];assert.deepEqual(Array.from(f.probeTable(input,7)),[33n,12n,null,null,null,19n,26n]);assert.deepEqual(input,[19n,26n,33n,12n]);
 assert.deepEqual(Array.from(f.probeTable([...input,40n],7)),[33n,12n,40n,null,null,19n,26n]);
 assert.deepEqual(Array.from(f.probeTable([-1n,0n,4n],5)),[0n,4n,null,null,-1n]);
 assert.deepEqual(Array.from(f.probeTable([0n,0n],1)),[0n]);assert.throws(()=>f.probeTable([0n,1n],1));
 const huge=2n**200n;assert.equal(f.probeTable([huge],7)[Number(huge%7n)],huge);
});
test('4.5: probing rejects invalid keys and sizes and handles a full table finitely',()=>{
 for(const size of [0,-1,1.2,1001,NaN,'7',7n])assert.throws(()=>f.probeTable([],size));
 for(const keys of [[1],['1'],[null],Array(1),null])assert.throws(()=>f.probeTable(keys,7));
 for(let size=1;size<=12;size++){const keys=range(size).map(i=>BigInt(i*size+size-1));const slots=Array.from(f.probeTable(keys,size));assert.equal(new Set(slots).size,size);for(let i=0;i<size;i++)assert.equal(slots[(size-1+i)%size],keys[i]);assert.throws(()=>f.probeTable([...keys,BigInt(size*size+size-1)],size));assert.deepEqual(Array.from(f.probeTable([...keys,keys[0]],size)),slots);}
});
test('4.5: hashing SVG agrees with the stored table and wrapped probe path',async()=>{
 const svg=await readFile('assets/hash-linear-probing.svg','utf8');const values=[...svg.matchAll(/data-slot="(\d+)" data-key="([^"]+)"/g)];assert.equal(values.length,7);const slots=f.probeTable([19n,26n,33n,12n],7);for(const [,i,v]of values)assert.equal(v,slots[i]===null?'empty':String(slots[i]));
});
test('4.5: LCG examples distinguish a full period, short cycle, and transient states',async()=>{
 const full=[3n,0n,1n,6n,15n,12n,13n,2n,11n,8n,9n,14n,7n,4n,5n,10n,3n];assert.deepEqual(Array.from(f.lcg(16n,5n,1n,3n,16)),full);assert.equal(new Set(full.slice(0,-1)).size,16);
 assert.deepEqual(Array.from(f.lcg(8n,4n,0n,3n,4)),[3n,4n,0n,0n,0n]);assert.deepEqual(Array.from(f.lcg(7n,2n,0n,1n,3)),[1n,2n,4n,1n]);assert.deepEqual(Array.from(f.lcg(7n,3n,0n,1n,6)),[1n,3n,2n,6n,4n,5n,1n]);
 const svg=await readFile('assets/lcg-state-cycles.svg','utf8');assert.deepEqual([...svg.matchAll(/data-step="(\d+)" data-state="(\d+)"/g)].map(m=>BigInt(m[2])),full.slice(0,-1));
});
test('4.5: LCG obeys the recurrence over all small parameters and exact large integers',()=>{
 for(let m=3;m<=10;m++)for(let a=2;a<m;a++)for(let c=0;c<m;c++)for(let seed=0;seed<m;seed++){
  const seq=Array.from(f.lcg(BigInt(m),BigInt(a),BigInt(c),BigInt(seed),m+1));assert.equal(seq.length,m+2);assert.equal(seq[0],BigInt(seed));seq.slice(1).forEach((x,i)=>{assert.equal(Number(x),(a*Number(seq[i])+c)%m);assert.ok(x>=0n&&x<BigInt(m));});assert.ok(new Set(seq).size<=m);
 }
 const m=2n**100n+3n,a=2n**60n+1n;const seq=f.lcg(m,a,7n,m-1n,3);for(let i=1;i<seq.length;i++)assert.equal(seq[i],(a*seq[i-1]+7n)%m);
 assert.deepEqual(Array.from(f.lcg(7n,3n,0n,0n,2)),[0n,0n,0n]);assert.deepEqual(Array.from(f.lcg(7n,3n,0n,2n,0)),[2n]);
});
test('4.5: LCG rejects invalid parameter ranges, types, and transition counts',()=>{
 for(const args of [[2n,2n,0n,0n,2],[7n,1n,0n,0n,2],[7n,7n,0n,0n,2],[7n,3n,-1n,0n,2],[7n,3n,7n,0n,2],[7n,3n,0n,7n,2],[7n,3n,0n,-1n,2],[7,3n,0n,0n,2],[7n,3n,0n,0n,1n],[7n,3n,0n,0n,10001],[7n,3n,0n,0n,-1],[7n,3n,0n,0n,1.5]])assert.throws(()=>f.lcg(...args));
});
test('4.5: parity detects exactly the odd-weight changes in exhaustive short words',()=>{
 for(let length=0;length<=5;length++)for(let value=0;value<2**length;value++){
  const bits=length?value.toString(2).padStart(length,'0'):'';const valid=f.appendEvenParity(bits);assert.ok(f.validEvenParity(valid));
  for(let mask=0;mask<2**valid.length;mask++){const changed=[...valid].map((b,i)=>String(Number(b)^((mask>>i)&1))).join('');const flips=mask.toString(2).replaceAll('0','').length;assert.equal(f.validEvenParity(changed),flips%2===0);}
 }
 assert.equal(f.appendEvenParity('10110'),'101101');assert.equal(f.validEvenParity('011101'),true);for(const s of ['',null,12,'12','0 1','01\n'])assert.equal(f.validEvenParity(s),false);
 for(const s of [null,12,'12','01\n'])assert.throws(()=>f.appendEvenParity(s));
});
test('4.5: retail check digits match independent positional weights and preserve zeros',()=>{
 for(const payload of ['01234567890','978123456789','00000000000','000000000000','05000000000','50000000000','99999999999','999999999999']){
  const weights=payload.length===11?[3,1]:[1,3];const sum=[...payload].reduce((s,d,i)=>s+Number(d)*weights[i%2],0);assert.equal(f.retailCheckDigit(payload),String(mod(-sum,10)));assert.ok(f.validRetailCode(payload+f.retailCheckDigit(payload)));
 }
 assert.equal(f.retailCheckDigit('01234567890'),'5');assert.equal(f.retailCheckDigit('978123456789'),'7');
});
test('4.5: retail single substitutions fail, but adjacent difference five can pass',()=>{
 for(const code of ['012345678905','9781234567897','050000000005']){
  for(let i=0;i<code.length;i++)for(const digit of '0123456789')if(digit!==code[i])assert.equal(f.validRetailCode(replace(code,i,digit)),false);
  for(let i=0;i<code.length-1;i++)if(code[i]!==code[i+1])assert.equal(f.validRetailCode(swap(code,i,i+1)),Math.abs(Number(code[i])-Number(code[i+1]))===5);
 }
 assert.ok(f.validRetailCode('500000000005'));assert.ok(f.validRetailCode(swap('012345678905',0,2)));
});
test('4.5: ISBN-10 weighted sums, X, single substitutions, and unequal swaps',()=>{
 for(const payload of ['123456789','000000000','013110362','999999999']){
  const code=payload+f.isbn10CheckDigit(payload);const values=[...code].map(x=>x==='X'?10:Number(x));assert.equal(values.reduce((s,v,i)=>s+(i+1)*v,0)%11,0);assert.ok(f.validIsbn10(code));
  for(let i=0;i<10;i++)for(const digit of '0123456789X')if(digit!==code[i])assert.equal(f.validIsbn10(replace(code,i,digit)),false);
  for(let i=0;i<10;i++)for(let j=i+1;j<10;j++)if(code[i]!==code[j])assert.equal(f.validIsbn10(swap(code,i,j)),false);
 }
 assert.equal(f.isbn10CheckDigit('123456789'),'X');
 // Two coordinated changes can cancel: weights 1 and 2 contribute 2 - 2 = 0.
 assert.ok(f.validIsbn10('123456789X'));assert.ok(f.validIsbn10('313456789X'));
});
test('4.5: check-digit APIs reject malformed formats without claiming allocation validity',()=>{
 for(const s of [123456789,null,'12345678','1234567890','12345678X','123456789\n'])assert.throws(()=>f.isbn10CheckDigit(s));
 for(const s of [null,'123456789x','X234567891','123-456789X','123456789X\n'])assert.equal(f.validIsbn10(s),false);
 for(const s of [null,12345678901,'1234567890','1234567890123','1234567890X','01234567890\n'])assert.throws(()=>f.retailCheckDigit(s));
 for(const s of [null,123456789012,'01234567890','01234567890X','012345678905\n','012-345678905'])assert.equal(f.validRetailCode(s),false);
});
test('4.6: all invertible affine keys permute the alphabet and round trip',()=>{
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ';for(let a=0;a<26;a++)for(let b=0;b<26;b++){
  if(gcd(a,26)!==1){assert.throws(()=>f.affineCipher(alphabet,a,b));continue;}
  const cipher=f.affineCipher(alphabet,a,b);assert.equal(new Set(cipher).size,26);for(let i=0;i<26;i++)assert.equal(cipher.charCodeAt(i)-65,(a*i+b)%26);assert.equal(f.affineCipher(cipher,a,b,true),alphabet);
 }
 assert.equal(f.affineCipher('HASH',5,8),'RIUR');assert.equal(f.affineCipher('STUDY',1,5),'XYZID');assert.equal(f.affineCipher('A Z',1,0),'A Z');assert.equal(f.affineCipher('',1,0),'');assert.equal(f.affineCipher('A',-1,-1),'Z');
 const key=Number.MAX_SAFE_INTEGER;const cipher=f.affineCipher('MATH',key,key);assert.equal(f.affineCipher(cipher,key,key,true),'MATH');
});
test('4.6: affine input contracts prevent silent character loss and invalid inverse use',()=>{
 for(const args of [['abc',1,5],['A\n',1,5],['É',1,5],[null,1,5],['A',2,5],['A',13,5],['A',1.2,5],['A',1,Infinity],['A',1n,5],['A',1,2**53],['A',1,0,1]])assert.throws(()=>f.affineCipher(...args));
});
function* permutations(values){if(!values.length){yield [];return;}for(let i=0;i<values.length;i++)for(const rest of permutations(values.filter((_,j)=>i!==j)))yield [values[i],...rest];}
test('4.6: transposition convention and inverse hold for all permutations through width five',()=>{
 for(let width=1;width<=5;width++)for(const order of permutations(range(width).map(i=>i+1))){const text='ABCDE'.slice(0,width)+'EEEEE'.slice(0,width);const expected=order.map(i=>text[i-1]).join('')+'E'.repeat(width);assert.equal(f.permuteBlocks(text,order),expected);assert.equal(f.permuteBlocks(expected,order,true),text);}
 assert.equal(f.permuteBlocks('MATHREAD',[2,4,1,3]),'AHMTEDRA');assert.equal(f.permuteBlocks('AHMT',[3,1,4,2]),'MATH');assert.equal(f.permuteBlocks('',[1]),'');
 for(const order of [[],[2,2,1,3],[0,1],[1,3],[1.5,2],Array(2),null])assert.throws(()=>f.permuteBlocks('MATH',order));
 for(const text of ['CAT','MATH\n','math','MA H',null])assert.throws(()=>f.permuteBlocks(text,[2,4,1,3]));assert.throws(()=>f.permuteBlocks('MATH',[2,4,1,3],1));
});
test('4.6: transposition SVG follows the stated read-from direction',async()=>{
 const svg=await readFile('assets/transposition-read-from.svg','utf8');const rows=[...svg.matchAll(/data-row="(\d+)" data-index="(\d+)" data-source="(\d+)" data-letter="([A-Z])"/g)];assert.equal(rows.length,12);const texts=['MATH','AHMT','MATH'];for(const [,r,i,src,ch]of rows){assert.equal(ch,texts[r][i-1]);if(Number(r)>0)assert.equal(ch,texts[r-1][src-1]);}
});
test('4.6: pair encoding preserves every two-letter block and leading zeros',()=>{
 for(let a=0;a<26;a++)for(let b=0;b<26;b++){const text=String.fromCharCode(65+a,65+b);const encoded=f.encodePairs(text);assert.equal(encoded[0],BigInt(100*a+b));assert.equal(f.decodePairs(encoded),text);}
 assert.deepEqual(Array.from(f.encodePairs('MATH')),[1200n,1907n]);assert.equal(f.decodePairs([0n,23n]),'AAAX');assert.equal(f.decodePairs(f.encodePairs('CATX')),'CATX');assert.equal(f.decodePairs([]),'');
 for(const text of ['A','abc','AB\n','A B',null])assert.throws(()=>f.encodePairs(text));for(const blocks of [[-1n],[2526n],[1275n],[2600n],[0],[null],Array(1),null])assert.throws(()=>f.decodePairs(blocks));
});
test('4.6: toy RSA key contracts reject invalid primes and noninvertible exponents',()=>{
 const key=f.toyRsaKey(61n,53n,17n);assert.equal(key.n,3233n);assert.equal(key.phi,3120n);assert.equal(key.d,2753n);assert.equal(key.e*key.d%key.phi,1n);
 for(const args of [[61n,61n,17n],[1n,53n,17n],[49n,53n,17n],[10001n,53n,17n],[61n,53n,12n],[61n,53n,1n],[61n,53n,3120n],[61,53n,17n],[2n,3n,2n]])assert.throws(()=>f.toyRsaKey(...args));
});
test('4.6: textbook RSA round trips every residue for the displayed key, including nonunits',()=>{
 const key=f.toyRsaKey(61n,53n,17n);for(let m=0n;m<key.n;m++){const c=f.rsaBlock(m,key.e,key.n);assert.equal(c,power(m,key.e,key.n));assert.equal(f.rsaBlock(c,key.d,key.n),m);}
 for(const [m,c]of [[42n,2557n],[61n,610n],[53n,1802n],[1200n,2406n],[1907n,317n],[0n,0n]]){assert.equal(f.rsaBlock(m,key.e,key.n),c);assert.equal(f.rsaBlock(c,key.d,key.n),m);}
});
test('4.6: correctness extends to other small prime pairs, including prime two',()=>{
 for(const [p,q]of [[2,5],[3,7],[5,11],[7,13]]){const phi=(p-1)*(q-1);for(let e=2;e<phi;e++)if(gcd(e,phi)===1){const k=f.toyRsaKey(BigInt(p),BigInt(q),BigInt(e));for(let m=0n;m<k.n;m++)assert.equal(f.rsaBlock(f.rsaBlock(m,k.e,k.n),k.d,k.n),m);}}
 assert.equal(power(7n,3n,55n),13n);assert.equal(power(13n,27n,55n),7n);
});
test('4.6: RSA range checks exclude modulus and prevent silent lossy reduction',()=>{
 for(const args of [[3233n,17n,3233n],[-1n,17n,3233n],[42n,0n,3233n],[42n,-1n,3233n],[0n,1n,1n],[42,17n,3233n]])assert.throws(()=>f.rsaBlock(...args));
 const trace=[2n,4n,8n,16n].map(e=>power(42n,e,3233n));assert.deepEqual(trace,[1764n,1550n,381n,2909n]);assert.equal(2909n*42n%3233n,2557n);
});
test('4.6: Diffie-Hellman example and shared-power identity are checked independently',()=>{
 const p=23n,g=5n;assert.equal(new Set(range(22).map(e=>String(power(g,BigInt(e),p)))).size,22);assert.equal(power(g,6n,p),8n);assert.equal(power(g,15n,p),19n);assert.equal(power(19n,6n,p),2n);assert.equal(power(8n,15n,p),2n);
 for(let x=1n;x<22n;x++)for(let y=1n;y<22n;y++)assert.equal(power(power(g,x,p),y,p),power(power(g,y,p),x,p));
});
test('4.6: raw signature verification can pass without a private-key signing operation',()=>{
 assert.equal(power(42n,2753n,3233n),3065n);assert.equal(power(3065n,17n,3233n),42n);assert.equal(power(2n,17n,3233n),1752n);
});
test('4.6: raw RSA is multiplicative modulo n, not additive',()=>{
 const n=3233n,e=17n;const a=power(2n,e,n),b=power(3n,e,n);assert.equal(a,1752n);assert.equal(b,1211n);assert.equal(a*b%n,824n);assert.equal(power(6n,e,n),824n);assert.equal((a+b)%n,2963n);assert.equal(power(5n,e,n),3086n);assert.notEqual((a+b)%n,power(5n,e,n));
 for(const [x,y]of [[0n,5n],[2n,3n],[61n,53n],[123n,321n],[3232n,3232n]])assert.equal(power(x,e,n)*power(y,e,n)%n,power(x*y%n,e,n));
});
