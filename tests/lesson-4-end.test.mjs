import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['4.3','4.4','4-end'].map(async id=>[id,JSON.parse(await readFile(`data/lessons/${id}.json`,'utf8'))])));
const blocks=u=>flatten(lessons['4-end'].units.find(v=>v.id===u).blocks);
const code=(id,u)=>flatten(lessons[id].units.find(v=>v.id===u).blocks).find(b=>b.type==='math'&&b.notation.startsWith('function ')).notation;
const source=[['4.3','extended-euclid'],['4.4','inverse-code'],['4-end','crt-project'],['4-end','binary-gcd-project'],['4-end','autokey-project']].map(([id,u])=>code(id,u)).join('\n');
const f=vm.runInNewContext(source+';({mergeCongruences,binaryGcd,autokey})');
const range=n=>Array.from({length:n},(_,i)=>i);
const mod=(a,m)=>((a%m)+m)%m;
const bruteGcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);if(!a)return b;if(!b)return a;return Math.max(...range(Math.min(a,b)).map(i=>i+1).filter(d=>a%d===0&&b%d===0));};
const power=(a,e,n)=>{let v=1n;for(let i=0n;i<e;i++)v=v*a%n;return v;};
const factorial=n=>{let v=1n;for(let i=2n;i<=BigInt(n);i++)v*=i;return v;};

test('4-end: displayed Euclidean and Bezout certificates reconstruct the inputs',()=>{
 const rows=blocks('bezout-review').find(b=>b.type==='table').rows;
 for(const [,equation]of rows){const [,a,q,b,r]=equation.match(/^(\d+) = (\d+)·(\d+) \+ (\d+)$/).map(Number);assert.equal(a,q*b+r);assert.ok(r>=0&&r<b);assert.equal(bruteGcd(a,b),3);}
 assert.equal(19*252-29*165,3);assert.equal(19*84-29*55,1);assert.equal(252*38+165*(-58),6);assert.equal(13860,252*165/3);
 assert.equal(bruteGcd(bruteGcd(10,15),21),1);assert.equal(bruteGcd(10,15),5);assert.equal(bruteGcd(15,21),3);
});
test('4-end: representation, division, and modular-power examples use the stated conventions',()=>{
 for(const [a,d,q,r]of [[-83,12,-7,1],[-84,12,-7,0],[-109,8,-14,3]]){assert.equal(a,d*q+r);assert.equal(q,Math.floor(a/d));assert.ok(r>=0&&r<d);}
 assert.equal(parseInt('2D5',16),725);assert.equal(parseInt('1011010101',2),725);assert.equal(parseInt('1325',8),725);assert.equal(parseInt('3B',16),59);assert.equal(parseInt('111011',2),59);assert.equal(power(7n,123n,13n),5n);
 let q=47;for(const [base,next,digit]of [[2,23,1],[3,7,2],[4,1,3],[5,0,1]]){assert.equal(Math.floor(q/base),next);assert.equal(q%base,digit);assert.ok(digit<base);q=next;}assert.equal(1+2*2+3*6+24,47);
});
test('4-end: linear and paired congruence examples enumerate the complete solution sets',()=>{
 assert.deepEqual(range(30).filter(x=>mod(12*x-18,30)===0),[4,9,14,19,24,29]);assert.deepEqual(range(30).filter(x=>mod(12*x-19,30)===0),[]);
 assert.deepEqual(range(20).filter(x=>mod(8*x-12,20)===0),[4,9,14,19]);assert.deepEqual(range(18).filter(x=>x%6===2&&x%9===5),[14]);assert.deepEqual(range(18).filter(x=>x%6===2&&x%9===4),[]);assert.deepEqual(range(12).filter(x=>x%4===3&&x%6===1),[7]);
});
test('4-end: actual generalized CRT agrees with every small residue pair, including modulus one',()=>{
 for(let m=1;m<=12;m++)for(let n=1;n<=12;n++)for(let a=0;a<m;a++)for(let b=0;b<n;b++){
  const l=m*n/bruteGcd(m,n);const expected=range(l).filter(x=>x%m===a&&x%n===b);const result=f.mergeCongruences(BigInt(a),BigInt(m),BigInt(b),BigInt(n));
  if(!expected.length)assert.equal(result,null);else{assert.equal(expected.length,1);assert.equal(result.residue,BigInt(expected[0]));assert.equal(result.modulus,BigInt(l));}
 }
});
test('4-end: CRT normalizes signed residues, composes rows, and handles huge compatible moduli exactly',()=>{
 const x=f.mergeCongruences(-4n,6n,23n,9n);assert.equal(x.residue,14n);assert.equal(x.modulus,18n);
 let combined={residue:0n,modulus:1n};for(const [b,n]of [[2n,6n],[5n,9n],[4n,5n]])combined=f.mergeCongruences(combined.residue,combined.modulus,b,n);assert.equal(combined.residue,14n);assert.equal(combined.modulus,90n);
 const m=2n**100n,n=3n*m,a=-(2n**150n)+17n;const result=f.mergeCongruences(a,m,a,n);assert.equal(result.modulus,n);assert.equal((result.residue-a)%n,0n);assert.ok(result.residue>=0n&&result.residue<n);
 for(const args of [[0,2n,1n,3n],[0n,0n,1n,3n],[0n,2n,1n,-3n],[0n,2n,null,3n]])assert.throws(()=>f.mergeCongruences(...args));
});
test('4-end: binary gcd agrees with independent divisor enumeration for signs and zeros',()=>{
 for(let a=-80;a<=80;a++)for(let b=-80;b<=80;b++){if(!a&&!b)continue;assert.equal(f.binaryGcd(BigInt(a),BigInt(b)),BigInt(bruteGcd(a,b)));}
 assert.equal(f.binaryGcd(84n,30n),6n);assert.equal(f.binaryGcd(13n*2n**400n,21n*2n**400n),2n**400n);assert.equal(f.binaryGcd(7n,7n),7n);
 for(const args of [[0n,0n],[1,2n],[1n,2],[null,2n]])assert.throws(()=>f.binaryGcd(...args));
});
test('4-end: actual binary gcd preserves its invariant and decreases its loop measure',()=>{
 const tracked=code('4-end','binary-gcd-project').replace('while (b !== 0n) {','while (b !== 0n) { inspect(a,b,scale);');
 for(const [originalA,originalB]of [[84n,30n],[252n,165n],[96n,160n],[55n,89n]]){
  let last=null,iterations=0;const expected=BigInt(bruteGcd(Number(originalA),Number(originalB)));
  const fn=vm.runInNewContext(tracked+';binaryGcd',{inspect:(a,b,scale)=>{assert.equal(scale*BigInt(bruteGcd(Number(a),Number(b))),expected);assert.equal(a%2n,1n);if(last!==null)assert.ok(a+b<last);last=a+b;iterations++;}});
  assert.equal(fn(originalA,originalB),expected);assert.ok(iterations>0);
 }
});
const expectedCipher=(text,seed,feedback)=>{
 const plain=[...text].map(ch=>ch.charCodeAt(0)-65),cipher=[];
 plain.forEach((value,i)=>cipher.push((value+(i===0?seed:feedback==='plaintext'?plain[i-1]:cipher[i-1]))%26));
 return String.fromCharCode(...cipher.map(v=>v+65));
};
test('4-end: autokey matches independently constructed keystreams for every seed and two-letter word',()=>{
 for(const feedback of ['plaintext','ciphertext'])for(let seed=0;seed<26;seed++)for(let a=0;a<26;a++)for(let b=0;b<26;b++){
  const word=String.fromCharCode(65+a,65+b),cipher=expectedCipher(word,seed,feedback);assert.equal(f.autokey(word,seed,feedback),cipher);assert.equal(f.autokey(cipher,seed,feedback,true),word);
 }
 for(const text of ['','A','MATH','AZZZAAA','ABCDEFGHIJKLMNOPQRSTUVWXYZ'])for(const mode of ['plaintext','ciphertext']){const cipher=expectedCipher(text,3,mode);assert.equal(f.autokey(text,3,mode),cipher);assert.equal(f.autokey(cipher,3,mode,true),text);}
});
test('4-end: autokey worked table names the actual prior-symbol feedback and rejects malformed inputs',()=>{
 const rows=blocks('autokey-project').find(b=>b.type==='table').rows;
 for(const [variant,plain,keys,cipher]of rows){const mode=variant.startsWith('Plaintext')?'plaintext':'ciphertext';assert.equal(f.autokey(plain,3,mode),cipher);assert.equal(keys,'D'+(mode==='plaintext'?plain:cipher).slice(0,-1));}
 assert.equal(f.autokey('PMTA',3,'plaintext',true),'MATH');assert.equal(f.autokey('PPIP',3,'ciphertext',true),'MATH');assert.notEqual(f.autokey('PPIP',3,'plaintext',true),'MATH');
 for(const args of [['math',3],['MATH\n',3],['MA TH',3],[null,3],['MATH',-1],['MATH',26],['MATH',1.5],['MATH',3n],['MATH',3,'unknown'],['MATH',3,'plaintext',1]])assert.throws(()=>f.autokey(...args));
});
test('4-end: residue impossibility and divisibility proofs agree with complete residue enumeration',()=>{
 const squares=new Set(range(4).map(x=>x*x%4));assert.deepEqual([...squares],[0,1]);for(const x of squares)for(const y of squares)assert.notEqual((x+y)%4,3);
 for(let n=-60n;n<=60n;n++)assert.equal((n**5n-n)%30n,0n);assert.equal(12%4,0);assert.equal(12%6,0);assert.notEqual(12%24,0);
 assert.equal(power(3n,90n,91n),1n);assert.equal(91,7*13);assert.equal(2**11-1,23*89);
});
test('4-end: weighted checksum example and complete single/swap error classes agree',()=>{
 const row=blocks('checksum-lab').find(b=>b.type==='table').rows[0];const payload=row[0];const sum=s=>[...s].reduce((v,d,i)=>v+Number(d)*[3,7,1][i%3],0);assert.equal(sum(payload),Number(row[2]));assert.equal(mod(-sum(payload),10),Number(row[3]));
 const valid=payload+row[3];assert.equal(sum(valid)%10,0);
 for(let i=0;i<9;i++)for(const d of '0123456789')if(d!==valid[i])assert.notEqual(sum(valid.slice(0,i)+d+valid.slice(i+1))%10,0);
 for(let i=0;i<9;i++)for(let j=i+1;j<9;j++){const chars=[...valid];[chars[i],chars[j]]=[chars[j],chars[i]];assert.equal(sum(chars.join(''))%10===0,i%3===j%3||Math.abs(Number(valid[i])-Number(valid[j]))%5===0);}
});
test('4-end: toy cryptography examples and prime-modulus limitation check independently',()=>{
 assert.equal(11*17,187);assert.equal(10*16,160);assert.equal(7*23%160,1);assert.equal(power(42n,7n,187n),15n);assert.equal(power(15n,23n,187n),42n);assert.equal(power(power(11n,7n,187n),23n,187n),11n);
 assert.equal(power(2n,4n,11n),5n);assert.equal(power(2n,7n,11n),7n);assert.equal(power(7n,4n,11n),3n);assert.equal(power(5n,7n,11n),3n);
 // With public prime modulus 23, inverse of public e=5 modulo 22 is 9.
 for(let m=0n;m<23n;m++)assert.equal(power(power(m,5n,23n),9n,23n),m);
 assert.equal((7*6+3)%26,19);assert.equal(15*(19-3)%26,6);
});
test('4-end: factorial and prime-count explorations respect their exact bounds',()=>{
 assert.equal(factorial(5)+1n,11n**2n);assert.equal(factorial(6)+1n,7n*103n);
 for(let n=1;n<=35;n++){let value=factorial(n),zeros=0;while(value%2n===0n){value/=2n;zeros++;}let sum=0;for(let p=2;p<=n;p*=2)sum+=Math.floor(n/p);assert.equal(zeros,sum);}
 assert.equal(factorial(12)%1024n,0n);assert.notEqual(factorial(12)%2048n,0n);
 const primes=range(12).filter(n=>n>1&&range(n-2).every(i=>n%(i+2)!==0));assert.deepEqual(primes,[2,3,5,7,11]);assert.equal(primes.filter(p=>p<11).length,4);
});
