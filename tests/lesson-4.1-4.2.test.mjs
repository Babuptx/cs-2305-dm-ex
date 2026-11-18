import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['4.1','4.2'].map(async id=>[id,JSON.parse(await readFile(`data/lessons/${id}.json`,'utf8'))])));
const blocks=(id,u)=>flatten(lessons[id].units.find(x=>x.id===u).blocks);
const table=(id,u)=>blocks(id,u).find(x=>x.type==='table');
const code=(id,u)=>blocks(id,u).find(x=>x.type==='math'&&x.notation.startsWith('function ')).notation;
const snippet=(id,u,name)=>vm.runInNewContext(code(id,u)+`;${name}`);
const divMod=snippet('4.1','division-code','divMod');
const toBase=snippet('4.2','base-code','toBase'),fromBase=snippet('4.2','base-code','fromBase');
const add=snippet('4.2','binary-addition-code','addBinary');
const repeated=snippet('4.2','signed-division-algorithm','repeatedDivision');
const divide=snippet('4.2','binary-long-division','binaryDivision');
const pow=snippet('4.2','modular-power-code','modPower');
const num=s=>Number(s.replaceAll('−','-'));
const mod=(a,m)=>((a%m)+m)%m;
const congruent=(a,b,m)=>(a-b)%m===0;
const values=Array.from({length:21},(_,i)=>i-10);

test('4.1: divisibility witnesses and positive-multiple counts respect signs and zero',()=>{
 for(const [claim,,result]of table('4.1','divides-definition').rows){const [a,b]=claim.split(' | ').map(num);assert.notEqual(a,0);assert.equal(b%a===0,result==='True');}
 for(let n=1;n<=100;n++)for(let d=1;d<=15;d++)assert.equal(Math.floor(n/d),Array.from({length:n},(_,i)=>i+1).filter(x=>x%d===0).length);
 assert.equal(Math.floor(50/7)-Math.floor(19/7),5);
});
test('4.1: displayed quotient table meets both division constraints',()=>{
 for(const row of table('4.1','negative-remainders').rows){const [a,d,q,r]=row.slice(0,4).map(num);assert.equal(a,d*q+r);assert.ok(r>=0&&r<d);assert.equal(q,Math.floor(a/d));const result=divMod(BigInt(a),BigInt(d));assert.equal(result.q,BigInt(q));assert.equal(result.r,BigInt(r));}
});
test('4.1: exact displayed division matches an independent floor oracle on signed inputs',()=>{
 for(let a=-240;a<=240;a++)for(let d=1;d<=21;d++){const actual=divMod(BigInt(a),BigInt(d)),q=Math.floor(a/d);assert.equal(actual.q,BigInt(q));assert.equal(actual.r,BigInt(a-d*q));}
 for(const a of [-(2n**180n)-17n,0n,2n**180n+17n])for(const d of [1n,5n,2n**64n+3n]){const {q,r}=divMod(a,d);assert.equal(d*q+r,a);assert.ok(r>=0n&&r<d);}
});
test('4.1: division contract rejects zero or negative divisor and mixed numeric types',()=>{
 for(const [a,d]of [[1n,0n],[1n,-2n],[1,2n],[1n,2],['1',2n],[null,1n]])assert.throws(()=>divMod(a,d));
});
test('4.1: remainder pair is unique across bounded candidate quotients',()=>{
 for(let a=-25;a<=25;a++)for(let d=1;d<=7;d++){const candidates=[];for(let q=-30;q<=30;q++){const r=a-d*q;if(r>=0&&r<d)candidates.push(q);}assert.deepEqual(candidates,[Math.floor(a/d)]);}
});
test('4.1: congruence agrees with equal canonical remainders, including modulus one',()=>{
 for(let m=1;m<=9;m++)for(const a of values)for(const b of values)assert.equal(congruent(a,b,m),mod(a,m)===mod(b,m));
});
test('4.1: bounded congruence classes satisfy sum, difference, product and fixed-power laws',()=>{
 for(let m=1;m<=9;m++)for(const a of values)for(const c of values){const b=mod(a,m),d=mod(c,m);assert.ok(congruent(a+c,b+d,m));assert.ok(congruent(a-c,b-d,m));assert.ok(congruent(a*c,b*d,m));for(let n=0;n<=4;n++)assert.ok(congruent(a**n,b**n,m));}
});
test('4.1: worked reductions and counterexamples have the advertised residues',()=>{
 assert.equal(mod(58*47+29,9),1);assert.equal(mod(-14*23+8,5),1);
 assert.equal(mod(mod(7**3,10)**2,9),0);assert.equal(mod(7**6,9),1);
 assert.equal(mod(38**4,7),4);assert.equal(mod(12**3,5),3);assert.equal(mod(12**8,5),1);
 assert.equal(mod(2,4),2);assert.equal(mod(2**5,4),0);assert.ok(congruent(1,5,4));
 assert.ok(congruent(2*1,2*4,6));assert.ok(!congruent(1,4,6));
 assert.deepEqual([0,1,2,3,4,5].filter(x=>congruent(2*x,2,6)),[1,4]);
 assert.deepEqual([0,1,2,3,4,5,6].filter(x=>congruent(3*x,6,7)),[2]);
});
test('4.1: residue addition table, identities and inverse claims are consistent',()=>{
 const t=table('4.1','arithmetic-on-residues');for(let i=0;i<4;i++)for(let j=0;j<4;j++)assert.equal(Number(t.rows[i][j+1]),(i+j)%4);
 for(let m=1;m<=9;m++)for(let a=0;a<m;a++){assert.equal(mod(a+mod(-a,m),m),0);assert.equal(mod(a*mod(1,m),m),a);}
 const invertible=[];for(let a=0;a<6;a++)for(let b=0;b<6;b++)if(a*b%6===1)invertible.push([a,b]);assert.deepEqual(invertible,[[1,1],[5,5]]);
});
test('4.2: base conversion matches independent native representations in all supported bases',()=>{
 const inputs=[0n,1n,2026n,2n**53n+1n,2n**257n+123456789n];
 for(let base=2;base<=36;base++)for(const n of [...inputs,BigInt(base)**8n-1n,BigInt(base)**8n]){const expected=n.toString(base).toUpperCase();assert.equal(toBase(n,base),expected);assert.equal(fromBase(expected,base),n);assert.equal(fromBase('000'+expected,base),n);}
 for(let n=0;n<=500;n++)for(const base of [2,8,10,16,36])assert.equal(fromBase(toBase(BigInt(n),base),base),BigInt(n));
});
test('4.2: conversion rejects malformed numerals and unsupported contracts',()=>{
 for(const base of [0,1,37,2.5,NaN,Infinity,'2']){assert.throws(()=>toBase(1n,base));assert.throws(()=>fromBase('1',base));}
 for(const [s,b]of [['',2],['2',2],['8',8],['G',16],['a',16],[' 1',2],['+1',2],['-1',2],['1.0',2],['１',2],[null,2]])assert.throws(()=>fromBase(s,b));
 for(const n of [-1n,1,'1',null])assert.throws(()=>toBase(n,2));
});
test('4.2: published conversion table and diagram reconstruct 2026',async()=>{
 const rows=table('4.2','repeated-base-division').rows;
 for(const [n,q,r,digit]of rows){assert.equal(Number(n),16*Number(q)+Number(r));assert.equal(Number(r).toString(16).toUpperCase(),digit);}
 assert.equal(rows.map(r=>r[3]).reverse().join(''),'7EA');
 const svg=await readFile('assets/base-conversion-2026.svg','utf8');assert.deepEqual([...svg.matchAll(/data-value="(\d+)" data-quotient="(\d+)" data-remainder="(\d+)"/g)].map(m=>m.slice(1).map(Number)),rows.map(r=>r.slice(0,3).map(Number)));
});
test('4.2: published bit groups and place values preserve integer value',()=>{
 const rows=table('4.2','group-bits').rows;
 for(const row of rows){const digits=row[1].replaceAll(' | ','');assert.equal(BigInt('0b'+digits),2026n);}
 assert.equal(fromBase('3752',8),2026n);assert.equal(fromBase('7EA',16),2026n);assert.equal(fromBase('105',16),fromBase('100000101',2));
 for(let n=1;n<=500;n++)for(let k=0;k<=7;k++){assert.equal(BigInt('0b'+n.toString(2)+'0'.repeat(k)),BigInt(n)*2n**BigInt(k));assert.equal(Math.floor(n/2**k),Number(BigInt(n)>>BigInt(k)));}
});
test('4.2: carry trace preserves each column and reconstructs its sum',()=>{
 const rows=table('4.2','binary-carries').rows;let carry=0,out='';
 for(const row of rows){const [j,a,b,incoming,total,digit,next]=row.map(Number);assert.equal(a,(23>>j)&1);assert.equal(b,(13>>j)&1);assert.equal(incoming,carry);assert.equal(total,a+b+carry);assert.equal(total,digit+2*next);out=digit+out;carry=next;}
 assert.equal(String(carry)+out,'100100');assert.equal(add('10111','1101'),'100100');
});
test('4.2: published addition agrees with exact sums, including carry chains and padding',()=>{
 for(let a=0;a<128;a++)for(let b=0;b<128;b++)assert.equal(add(a.toString(2),b.toString(2)),(a+b).toString(2));
 assert.equal(add('1'.repeat(200),'1'),'1'+'0'.repeat(200));assert.equal(add('000','0'),'0');assert.equal(add('00101','00011'),'1000');
 for(const [a,b]of [['','1'],['1',''],['2','1'],['1','10x'],[1,'1'],['1',null]])assert.throws(()=>add(a,b));
});
test('4.2: shifted partial products and their sum agree with multiplication',()=>{
 const rows=table('4.2','binary-products').rows;let sum=0;
 for(const [j,bit,binary,decimal]of rows.slice(0,-1)){const v=13*Number(bit)*2**Number(j);assert.equal(v,parseInt(binary,2));assert.equal(v,Number(decimal));sum+=v;}
 assert.equal(sum,13*11);assert.equal(parseInt(rows.at(-1)[2],2),sum);assert.equal(Number(rows.at(-1)[3]),sum);
});
test('4.2: repeated subtraction handles both negative branches and modulus one',()=>{
 for(let a=-100;a<=100;a++)for(let d=1;d<=15;d++){const {q,r}=repeated(BigInt(a),BigInt(d));assert.equal(q,BigInt(Math.floor(a/d)));assert.equal(BigInt(a),BigInt(d)*q+r);assert.ok(r>=0n&&r<BigInt(d));}
 assert.equal(repeated(-20n,5n).q,-4n);assert.equal(repeated(-20n,5n).r,0n);assert.equal(repeated(-17n,5n).q,-4n);assert.equal(repeated(-17n,5n).r,3n);
 for(const [a,d]of [[1n,0n],[1n,-1n],[1,2n],[1n,2]])assert.throws(()=>repeated(a,d));
});
test('4.2: binary long division agrees with native positive quotient and remainder',()=>{
 for(let n=0n;n<256n;n++)for(let d=1n;d<20n;d++){const {q,r}=divide(n,d);assert.equal(q,n/d);assert.equal(r,n%d);}
 const n=2n**500n+2n**123n+17n;for(const d of [1n,19n,2n**127n+1n,n,n+1n]){const {q,r}=divide(n,d);assert.equal(q,n/d);assert.equal(r,n%d);}
 for(const [n,d]of [[-1n,2n],[1n,0n],[1n,-2n],[1,2n],[1n,2]])assert.throws(()=>divide(n,d));
});
test('4.2: binary division prefix table satisfies the invariant at each step',()=>{
 for(const [prefix,value,q,r]of table('4.2','binary-long-division').rows){assert.equal(parseInt(prefix,2),Number(value));assert.equal(Number(value),5*Number(q)+Number(r));assert.ok(Number(r)>=0&&Number(r)<5);const pair=divide(BigInt(value),5n);assert.equal(pair.q,BigInt(q));assert.equal(pair.r,BigInt(r));}
});
test('4.2: modular power agrees with direct exponentiation for bounded signed bases',()=>{
 for(let b=-12n;b<=12n;b++)for(let n=0n;n<=15n;n++)for(let m=1n;m<=17n;m++)assert.equal(pow(b,n,m),mod(b**n,m));
 assert.equal(pow(0n,0n,7n),1n);assert.equal(pow(7n,0n,1n),0n);assert.equal(pow(-2n,3n,5n),2n);
});
test('4.2: modular power handles very large inputs and rejects invalid domains',()=>{
 const n=2n**300n;assert.equal(pow(-1n,n,97n),1n);assert.equal(pow(-1n,n+1n,97n),96n);assert.equal(pow(98n,n,97n),1n);assert.equal(pow(2n**250n+1n,n,1n),0n);
 for(const args of [[2n,-1n,7n],[2n,1n,0n],[2n,1n,-7n],[2,1n,7n],[2n,1,7n],[2n,1n,7]])assert.throws(()=>pow(...args));
});
test('4.2: modular exponent table and SVG agree with independently computed powers',async()=>{
 const rows=table('4.2','modular-power-trace').rows;let selected=1n;
 for(const row of rows){const [j,bit,power,result]=row.map(Number);assert.equal(bit,(13>>j)&1);assert.equal(BigInt(power),7n**(2n**BigInt(j))%19n);if(bit)selected=selected*BigInt(power)%19n;assert.equal(selected,BigInt(result));}
 assert.equal(selected,7n**13n%19n);assert.equal(pow(3n,10n,7n),4n);
 const svg=await readFile('assets/modular-power-bits.svg','utf8');assert.deepEqual([...svg.matchAll(/data-position="(\d+)" data-bit="(\d+)" data-power="(\d+)" data-result="(\d+)"/g)].map(m=>m.slice(1).map(Number)),rows.map(r=>r.map(Number)));
});
test('4.2: executable power loop preserves its invariant and advertised operation count',()=>{
 // Instrument only the displayed loop: assertions inspect every checkpoint.
 const instrumented=code('4.2','modular-power-code').replace('while (remaining > 0n) {','while (remaining > 0n) {\n    inspect(result, power, remaining, b, n, m);');
 let checkpoints=0;
 const instrumentedPower=vm.runInNewContext(instrumented+';modPower',{inspect:(r,p,e,b,n,m)=>{checkpoints++;assert.equal(mod(r*p**e,m),mod(b**n,m));}});
 assert.equal(instrumentedPower(7n,13n,19n),7n);assert.equal(checkpoints,4);
 for(let n=1;n<=255;n++){let e=n,iterations=0,products=0;while(e){iterations++;products+=1+(e%2);e=Math.floor(e/2);}const bits=n.toString(2);assert.equal(iterations,bits.length);assert.equal(products,bits.length+[...bits].filter(c=>c==='1').length);assert.ok(products<=2*bits.length);}
});
