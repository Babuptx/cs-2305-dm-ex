import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['5.3','5.4'].map(async id=>[id,JSON.parse(await readFile(new URL('../data/lessons/'+id+'.json',import.meta.url),'utf8'))])));
const blocks=(id,name)=>flatten(lessons[id].units.find(u=>u.id===name).blocks);
const table=(id,name,index=0)=>blocks(id,name).filter(b=>b.type==='table')[index].rows;
const fib=n=>{let a=0,b=1;for(let i=0;i<n;i++)[a,b]=[b,a+b];return a;};
// Translate only the small, stated pseudocode language, so tests execute the
// published procedures rather than a separately maintained algorithm copy.
const procedures=['factorial-calls','power-proof','euclidean-recursion','modular-power','linear-search','binary-search','fibonacci-work','iteration'];
const expr=s=>s.replace(/(\w+) is even/g,'($1 % 2 === 0)').replaceAll('floor(','Math.floor(').replaceAll('×','*').replaceAll('−','-').replaceAll('≤','<=').replaceAll(' mod ',' % ').replace(/(?<![<>=!])=(?!=)/g,'===');
function translate(source){
  const [head,...lines]=source.split('\n'),m=head.match(/^(\w+)\(([^)]*)\):$/);assert.ok(m,head);
  const parameters=m[2].split(/,\s*/),locals=[...source.matchAll(/^\s*(\w+) :=/gm)].map(m=>m[1]).filter(x=>!parameters.includes(x));
  let result=`function ${m[1]}(${m[2]}) {\n${locals.length?'let '+[...new Set(locals)].join(',')+';':''}\n`,stack=[];
  for(const line of lines){const indent=line.length-line.trimStart().length,s=line.trim();while(stack.length&&indent<=stack.at(-1)){result+='}\n';stack.pop();}
    if(s.startsWith('if ')){const [condition,action]=s.slice(3).split(':');result+=`if (${expr(condition)}) {`;if(action?.trim()){assert.ok(action.trim().startsWith('return '));result+=`return ${expr(action.trim().slice(7))};}\n`;}else {result+='\n';stack.push(indent);}}
    else if(s.startsWith('for ')){const m=s.match(/^for (\w+) from (.+) through (.+):$/);assert.ok(m,s);result+=`for(let ${m[1]}=${expr(m[2])};${m[1]}<=${expr(m[3])};${m[1]}++){\n`;stack.push(indent);}
    else if(s.startsWith('return '))result+=`return ${expr(s.slice(7))};\n`;
    else {const m=s.match(/^(\w+) := (.+)$/);assert.ok(m,s);result+=`${m[1]} = ${expr(m[2])};\n`;}
  }
  return result+'}\n'.repeat(stack.length+1);
}
const context=vm.createContext({});
const code=procedures.map(name=>translate(blocks('5.4',name).find(b=>b.type==='math').notation)).join('\n');
vm.runInContext(code,context,{timeout:1000});
const call=(name,args)=>{context.args=args;return vm.runInContext(`${name}(...args)`,context,{timeout:1000});};

test('5.3: published recurrence values agree with direct formula and iteration',()=>{
  let value=2;for(const [label,,answer] of table('5.3','evaluate-recursion')){const n=Number(label.match(/\d+/)[0]);assert.equal(Number(answer),value);assert.equal(value,(5*3**n-1)/2);value=3*value+1;}
  for(let n=0;n<20;n++)assert.equal(3*((5*3**n-1)/2)+1,(5*3**(n+1)-1)/2);
});
test('5.3: Fibonacci bound and displayed Euclidean trace satisfy Lame bound',()=>{
  const alpha=(1+Math.sqrt(5))/2;assert.ok(Math.log10(alpha)>1/5);for(let n=3;n<=70;n++)assert.ok(fib(n)>alpha**(n-2));
  let [a,b]=[89,55];for(const [equation,remainder] of table('5.3','lame')){const [x,q,y,r]=equation.match(/\d+/g).map(Number);assert.equal(x,a);assert.equal(y,b);assert.equal(x,q*y+r);assert.equal(r,Number(remainder));assert.equal(r,a%b);[a,b]=[b,r];}assert.equal(b,0);
  for(let a=1;a<=200;a++)for(let b=1;b<=a;b++){let x=a,y=b,count=0;while(y){[x,y]=[y,x%y];count++;}assert.ok(count<=5*String(b).length);}
});
test('5.3: generated set and string constructions preserve the claimed properties',()=>{
  const set=new Set([4]);let changed=true;while(changed){changed=false;for(const x of [...set])for(const y of [...set])if(x+y<=100&&!set.has(x+y)){set.add(x+y);changed=true;}}
  assert.deepEqual([...set].sort((a,b)=>a-b),Array.from({length:25},(_,i)=>4*(i+1)));
  let strings=[''];for(let n=1;n<=5;n++)strings.push(...strings.filter(s=>s.length===n-1).flatMap(s=>['a','b'].map(c=>s+c)));
  for(const u of strings)for(const v of strings)assert.equal((u+v).length,u.length+v.length);
  let formulas=['T','F','p'];for(let step=0;step<2;step++){const prior=formulas;formulas=[...prior,...prior.map(p=>`(¬${p})`),...prior.flatMap(p=>prior.flatMap(q=>['∧','∨','→','↔'].map(op=>`(${p} ${op} ${q})`)))];}
  for(const f of formulas)assert.equal([...f].filter(c=>c==='(').length,[...f].filter(c=>c===')').length);
});
test('5.3: all full binary shapes through eleven vertices obey size/height bound',()=>{
  const trees=new Map([[1,[null]]]);for(let n=3;n<=11;n+=2){const list=[];for(let left=1;left<n-1;left+=2)for(const l of trees.get(left))for(const r of trees.get(n-1-left))list.push([l,r]);trees.set(n,list);}
  const measure=t=>{if(t===null)return {n:1,h:0};const l=measure(t[0]),r=measure(t[1]);return {n:1+l.n+r.n,h:1+Math.max(l.h,r.h)};};
  for(const [n,list] of trees)for(const t of list){const result=measure(t);assert.equal(result.n,n);assert.ok(n<=2**(result.h+1)-1);}
  assert.deepEqual(measure([null,[null,null]]),{n:5,h:2});
});
test('5.3: recursive array formula and both lexicographic dependencies agree',()=>{
  const a=[];for(let m=0;m<=20;m++){a[m]=[];for(let n=0;n<=20;n++){a[m][n]=n>0?a[m][n-1]+2*n-1:m>0?a[m-1][0]+2:0;assert.equal(a[m][n],2*m+n*n);}}
  assert.deepEqual(a[2].slice(0,4),[4,5,8,13]);
});
test('5.4: displayed factorial and power procedures match independent products',()=>{
  let product=1;for(let n=0;n<=18;n++){if(n)product*=n;assert.equal(call('Factorial',[n]),product);}
  for(const [label,,answer] of table('5.4','factorial-calls'))assert.equal(call('Factorial',[Number(label.match(/\d+/)[0])]),Number(answer));
  for(const a of [-3,-2,-1,0.5,1,2,3])for(let n=0;n<=12;n++)assert.equal(call('Power',[a,n]),a**n);
});
test('5.4: published GCD procedure matches common-divisor enumeration including zero',()=>{
  for(let b=1;b<=80;b++)for(let a=0;a<b;a++){const expected=Array.from({length:b},(_,i)=>i+1).filter(d=>a%d===0&&b%d===0).at(-1);assert.equal(call('GCD',[a,b]),expected);}
  for(const [label] of table('5.4','euclidean-recursion'))assert.equal(call('GCD',label.match(/\d+/g).map(Number)),6);
});
test('5.4: published modular-power branches match exact integer exponentiation',()=>{
  for(let m=2;m<=15;m++)for(let b=1;b<=10;b++)for(let n=0;n<=30;n++)assert.equal(call('ModPower',[b,n,m]),Number(BigInt(b)**BigInt(n)%BigInt(m)));
  for(const [n,,answer] of table('5.4','modular-power'))assert.equal(call('ModPower',[3,Number(n),7]),Number(answer));
});
const arrays=(length,alphabet)=>length===0?[[]]:arrays(length-1,alphabet).flatMap(a=>alphabet.map(x=>[...a,x]));
test('5.4: displayed searches handle absent values, duplicates, subranges, and empty arrays',()=>{
  for(let n=0;n<=5;n++)for(const a of arrays(n,[1,2,3]))for(const x of [0,1,2,3,4]){
    assert.equal(call('LinearSearch',[[undefined,...a],1,n,x]),a.indexOf(x)+1);
    const sorted=a.toSorted((a,b)=>a-b),found=call('BinarySearch',[[undefined,...sorted],1,n,x]);assert.equal(found===0,!sorted.includes(x));if(found)assert.equal(sorted[found-1],x);
  }
  assert.equal(call('LinearSearch',[[undefined,8,3,6,3,9],3,5,3]),4);
  const a=[undefined,2,5,8,12,16,23,31];assert.equal(call('BinarySearch',[a,1,7,16]),5);assert.equal(call('BinarySearch',[a,1,7,15]),0);
});
test('5.4: both published Fibonacci procedures agree and printed work counts are exact',()=>{
  for(let n=0;n<=20;n++){assert.equal(call('Fib',[n]),fib(n));assert.equal(call('IterativeFib',[n]),fib(n));}
  const count=n=>n<2?0:count(n-1)+count(n-2)+1;
  for(const [n,result,additions] of table('5.4','fibonacci-work')){assert.equal(Number(result),fib(Number(n)));assert.equal(Number(additions),count(Number(n)));assert.equal(Number(additions),fib(Number(n)+1)-1);}
  let x=0,y=1;for(const [,a,b] of table('5.4','iteration')){assert.equal(Number(a),x);assert.equal(Number(b),y);[x,y]=[y,x+y];}
});
// Independent merge oracle checks the lesson's trace, duplicate preservation,
// stability, and comparison bounds; it is not a deployed site implementation.
function merge(left,right){let i=0,j=0,comparisons=0,result=[];while(i<left.length&&j<right.length){comparisons++;result.push(left[i].key<=right[j].key?left[i++]:right[j++]);}return {result:[...result,...left.slice(i),...right.slice(j)],comparisons};}
function sort(a){if(a.length<2)return {result:a,comparisons:0};const m=Math.floor(a.length/2),l=sort(a.slice(0,m)),r=sort(a.slice(m)),merged=merge(l.result,r.result);return {...merged,comparisons:merged.comparisons+l.comparisons+r.comparisons};}
test('5.4: merge examples preserve order, multiplicity and stable identity',()=>{
  const result=merge([2,7].map(key=>({key})),[1,5].map(key=>({key})));assert.deepEqual(result.result.map(x=>x.key),[1,2,5,7]);assert.equal(result.comparisons,3);
  const rows=table('5.4','merge');for(let i=0;i<rows.length;i++)assert.deepEqual(JSON.parse(rows[i][2]),result.result.slice(0,i+1).map(x=>x.key));
  for(let n=0;n<=6;n++)for(const a of arrays(n,[0,1,2])){const tagged=a.map((key,id)=>({key,id})),actual=sort(tagged).result;assert.deepEqual(actual,tagged.toSorted((a,b)=>a.key-b.key));}
});
test('5.4: merge levels sum to the stated bound and exhaustive power-of-two cases attain it',()=>{
  let sum=0;for(const [,number,cost,total] of table('5.4','merge-cost').slice(0,-1)){assert.equal(Number(number)*Number(cost),Number(total));sum+=Number(total);}assert.equal(sum,17);
  const permutations=a=>a.length===0?[[]]:a.flatMap((x,i)=>permutations(a.filter((_,j)=>i!==j)).map(p=>[x,...p]));
  for(const n of [1,2,4,8]){let maximum=0;for(const a of permutations(Array.from({length:n},(_,i)=>i))){const {comparisons}=sort(a.map(key=>({key})));assert.ok(comparisons<=n*Math.log2(n)-n+1);maximum=Math.max(maximum,comparisons);}assert.equal(maximum,n*Math.log2(n)-n+1);}
});
