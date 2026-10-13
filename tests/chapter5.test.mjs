import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {flatten} from './logic-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['5.1','5.2'].map(async id=>[id,JSON.parse(await readFile(new URL('../data/lessons/'+id+'.json',import.meta.url),'utf8'))])));
const unit=(id,name)=>flatten(lessons[id].units.find(u=>u.id===name).blocks);
const math=(id,name)=>unit(id,name).filter(b=>b.type==='math').map(b=>b.notation);
const table=(id,name,header)=>unit(id,name).find(b=>b.type==='table'&&b.headers[0]===header);
// Parse the arithmetic actually printed in the proof, including implicit products
// and Unicode exponents. This is a finite arithmetic check, not an induction prover.
function arithmetic(expression,values={}){
  const sup={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','ᵏ':'k','ⁿ':'n','⁺':'+','⁻':'-'};
  const source=expression.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ᵏⁿ⁺⁻]+/g,s=>'^('+[...s].map(c=>sup[c]).join('')+')').replaceAll('−','-').replaceAll('·','*').replaceAll('[','(').replaceAll(']',')').replace(/\s/g,'');
  const tokens=source.match(/\d+(?:\.\d+)?|[a-z]|[()+*/^\-]/g)||[];assert.equal(tokens.join(''),source);let i=0;
  const atom=()=>{const t=tokens[i++];if(t==='('){const v=add();assert.equal(tokens[i++],')');return v;}if(t==='-')return -atom();if(/^\d/.test(t))return Number(t);assert.ok(t in values,'Unknown variable '+t);return values[t];};
  const power=()=>{let v=atom();if(tokens[i]==='^'){i++;v=v**power();}return v;};
  const product=()=>{let v=power();while(i<tokens.length){const t=tokens[i];if(t==='*'||t==='/'){i++;const r=power();v=t==='*'?v*r:v/r;}else if(t==='('||/^[a-z0-9]/.test(t))v*=power();else break;}return v;};
  const add=()=>{let v=product();while(tokens[i]==='+'||tokens[i]==='-'){const t=tokens[i++],r=product();v=t==='+'?v+r:v-r;}return v;};
  const result=add();assert.equal(i,tokens.length);return result;
}
const equalChain=(formula,values)=>{const results=formula.split('=').map(f=>arithmetic(f,values));for(const r of results)assert.ok(Math.abs(r-results[0])<=1e-10*Math.max(1,Math.abs(results[0])),formula);};
test('5.1: displayed sums and every algebraic row of the induction step agree',()=>{
  for(const [n,sum,result] of table('5.1','sum-proof','n').rows){const count=Number(n);assert.equal(Number(sum),Array.from({length:count},(_,i)=>3*(i+1)).reduce((a,b)=>a+b,0));assert.equal(Number(result),3*count*(count+1)/2);}
  const rows=table('5.1','sum-proof','Expression').rows.slice(1).map(r=>r[0]);
  for(let k=1;k<=100;k++){const next=3*(k+1)*(k+2)/2;for(const expression of rows)assert.equal(arithmetic(expression,{k}),next);assert.equal(k*k+2*k+1,(k+1)**2);}
});
test('5.1: geometric step and general geometric formula hold with correct term counts',()=>{
  for(let k=0;k<=14;k++){equalChain(math('5.1','geometric')[0],{k});assert.equal(Array.from({length:k+1},(_,j)=>2*3**j).reduce((a,b)=>a+b,0),3**(k+1)-1);}
  const general=math('5.1','geometric')[1].split('=')[1];
  for(const a of [-3,0,2])for(const r of [-2,0,2,3])for(let n=0;n<=9;n++)assert.equal(arithmetic(general,{a,r,n})+0,Array.from({length:n+1},(_,j)=>a*r**j).reduce((a,b)=>a+b,0));
});
test('5.1: inequality bases, bridge, and factorial bounds respect their ranges',()=>{
  assert.ok(3**2>2**3);assert.equal(4**2,2**4);
  let factorial=1n;for(let n=1;n<=50;n++){factorial*=BigInt(n);if(n>=7)assert.ok(3n**BigInt(n)<factorial);if(n>=4){assert.ok(2*n+1<=n*n);assert.ok(BigInt(n*n)<=2n**BigInt(n));assert.ok((n+1)**2<=2*n*n);}}
  assert.equal(3**7,2187);assert.equal(1*2*3*4*5*6*7,5040);
});
test('5.1: harmonic block counts and lower bounds hold with exact fractions',()=>{
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  for(let n=0;n<=8;n++){let numerator=0n,denominator=1n;for(let j=1;j<=2**n;j++){numerator=numerator*BigInt(j)+denominator;denominator*=BigInt(j);const g=gcd(numerator,denominator);numerator/=g;denominator/=g;}assert.ok(2n*numerator>=BigInt(2+n)*denominator);
    const block=Array.from({length:2**n},(_,i)=>2**n+i+1);assert.equal(block.length,2**n);assert.equal(block.at(-1),2**(n+1));assert.ok(block.every(d=>d<=2**(n+1)));
  }
});
test('5.1: printed divisibility identities expose valid multiples',()=>{
  for(let k=0;k<=16;k++)equalChain(math('5.1','divisibility')[0],{k,t:(5**k-1)/4});
  for(let k=1;k<=100;k++){equalChain(math('5.1','divisibility')[1],{k});assert.equal((k**3-k)%6,0);assert.equal((3*k*(k+1))%6,0);}
  for(let n=0n;n<=80n;n++)assert.equal((5n**n-1n)%4n,0n);
});
test('5.1: subset doubling and generalized set complements agree for finite universes',()=>{
  assert.equal(table('5.1','sets','Subset of {a, b}').rows.length,4);
  for(let n=0;n<=9;n++){const without=Array.from({length:2**n},(_,i)=>i),withNew=without.map(i=>i|(1<<n));assert.equal(new Set([...without,...withNew]).size,2**(n+1));}
  // Exhaust all triples of subsets of a three-element universe.
  for(let a=0;a<8;a++)for(let b=0;b<8;b++)for(let c=0;c<8;c++)assert.equal((~(a&b&c))&7,((~a)|(~b)|(~c))&7);
});
function greedy(talks){const sorted=talks.toSorted((a,b)=>a[1]-b[1]);let end=-Infinity,count=0;for(const [s,e] of sorted)if(s>=end){end=e;count++;}return count;}
function optimal(talks){let best=0;for(let mask=0;mask<2**talks.length;mask++){const selected=talks.filter((_,i)=>mask&(1<<i)).toSorted((a,b)=>a[0]-b[0]);if(selected.every((t,i)=>!i||selected[i-1][1]<=t[0]))best=Math.max(best,selected.length);}return best;}
test('5.1: earliest-finish scheduling matches exhaustive optimum on every small input',()=>{
  const example=table('5.1','scheduling','Talk').rows.map(r=>r.slice(1).map(Number));assert.equal(greedy(example),3);assert.equal(optimal(example),3);
  const universe=[];for(let s=0;s<4;s++)for(let e=s+1;e<=4;e++)universe.push([s,e]);
  for(let mask=0;mask<2**universe.length;mask++){const instance=universe.filter((_,i)=>mask&(1<<i));assert.equal(greedy(instance),optimal(instance));}
});
test('5.1: nearest-neighbor examples preserve the two-case survivor argument',()=>{
  let seed=17;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%1000;};let checked=0;
  for(const n of [3,5,7,9])for(let trial=0;trial<50;trial++){
    const points=Array.from({length:n},()=>[random(),random()]),distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
    const pairs=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)pairs.push([distance(points[i],points[j]),i,j]);if(new Set(pairs.map(p=>p[0])).size!==pairs.length||pairs.some(p=>p[0]===0))continue;
    const targets=points.map((p,i)=>points.map((q,j)=>[j===i?Infinity:distance(p,q),j]).sort((a,b)=>a[0]-b[0])[0][1]);assert.ok(new Set(targets).size<n);
    const [,a,b]=pairs.sort((x,y)=>x[0]-y[0])[0];assert.equal(targets[a],b);assert.equal(targets[b],a);
    const others=targets.filter((_,i)=>i!==a&&i!==b);if(others.some(t=>t===a||t===b))assert.ok(targets.filter(t=>t!==a&&t!==b).length<=n-3);else assert.ok(new Set(others).size<n-2);checked++;
  }assert.ok(checked>100);
});
function tile(x,y,size,hole){if(size===1)return [];const half=size/2,origins=[[x,y],[x+half,y],[x,y+half],[x+half,y+half]],centers=[[x+half-1,y+half-1],[x+half,y+half-1],[x+half-1,y+half],[x+half,y+half]];
  const missing=(hole[0]>=x+half?1:0)+(hole[1]>=y+half?2:0),central=centers.filter((_,i)=>i!==missing);
  return [central,...origins.flatMap(([qx,qy],i)=>tile(qx,qy,half,i===missing?hole:centers[i]))];}
test('5.1: central-L construction tiles every hole location through 16 by 16',()=>{
  for(const size of [2,4,8,16])for(let x=0;x<size;x++)for(let y=0;y<size;y++){
    const tiles=tile(0,0,size,[x,y]),seen=new Set();assert.equal(tiles.length,(size*size-1)/3);
    for(const cells of tiles){assert.equal(cells.length,3);assert.equal(Math.max(...cells.map(c=>c[0]))-Math.min(...cells.map(c=>c[0])),1);assert.equal(Math.max(...cells.map(c=>c[1]))-Math.min(...cells.map(c=>c[1])),1);
      for(const [a,b] of cells){assert.ok(a>=0&&a<size&&b>=0&&b<size);assert.notEqual(a+','+b,x+','+y);assert.ok(!seen.has(a+','+b));seen.add(a+','+b);}}
    assert.equal(seen.size,size*size-1);
  }
});
test('5.2: proper factors support prime products without using the target',()=>{
  const factors=n=>{for(let d=2;d*d<=n;d++)if(n%d===0){assert.ok(d>=2&&d<n&&n/d>=2&&n/d<n);return [...factors(d),...factors(n/d)];}return [n];};
  for(let n=2;n<=500;n++){const list=factors(n);assert.equal(list.reduce((a,b)=>a*b,1),n);assert.ok(list.every(p=>p>=2&&Array.from({length:Math.max(0,p-2)},(_,i)=>i+2).every(d=>p%d!==0)));}
  assert.equal(2*2*3*7,84);
});
test('5.2: equal-pile response is winning against every move in small games',()=>{
  const memo=new Map();function wins(a,b){const key=a+','+b;if(memo.has(key))return memo.get(key);const result=Array.from({length:a},(_,j)=>[j,b]).concat(Array.from({length:b},(_,j)=>[a,j])).some(([x,y])=>!wins(x,y));memo.set(key,result);return result;}
  for(let n=1;n<=16;n++){assert.equal(wins(n,n),false);for(let r=1;r<=n;r++){assert.equal(wins(n-r,n),true);assert.equal(wins(n-r,n-r),false);}}
});
test('5.2: displayed packing bases and both step constructions work',()=>{
  for(const [n,a,b] of table('5.2','packing','Quantity').rows)assert.equal(Number(n),3*Number(a)+7*Number(b));
  const possible=n=>Array.from({length:Math.floor(n/7)+1},(_,b)=>n-7*b).some(r=>r%3===0);
  assert.equal(possible(11),false);for(let n=12;n<=300;n++)assert.ok(possible(n));
  for(let k=14;k<=100;k++){assert.ok(k-2>=12&&k-2<=k);assert.equal(k-2+3,k+1);}
  for(let a=0;a<=15;a++)for(let b=0;b<=15;b++){const n=3*a+7*b;if(n<12)continue;const next=a>=2?[a-2,b+1]:[a+5,b-2];assert.ok(next.every(x=>x>=0));assert.equal(3*next[0]+7*next[1],n+1);}
});
test('5.2: polygon split arithmetic accounts for the diagonal twice',()=>{
  const formula=math('5.2','triangulation')[0];for(let n=4;n<=100;n++)for(let s=3;s<=n-1;s++){const t=n+2-s;assert.ok(t>=3&&t<=n-1);equalChain(formula,{s,t,k:n-1});}
  assert.equal((4-2)+(7-2),9-2);
});
test('5.2: division examples, nonempty-set witness, and uniqueness respect negative dividends',()=>{
  for(const row of table('5.2','division','a').rows){const [a,d,q,r]=row.map(Number);assert.equal(a,d*q+r);assert.ok(r>=0&&r<d);}
  for(let a=-70;a<=70;a++)for(let d=1;d<=15;d++){
    assert.ok(a+d*Math.abs(a)>=0);const q=Math.floor(a/d),r=a-d*q;assert.ok(r>=0&&r<d);
    const witnesses=[];for(let candidate=-80;candidate<=80;candidate++){const rem=a-d*candidate;if(rem>=0&&rem<d)witnesses.push([candidate,rem]);}assert.deepEqual(witnesses,[[q,r]]);
  }
});
test('5.2: every cyclic tournament through five vertices contains a three-cycle',()=>{
  for(let n=3;n<=5;n++){const pairs=[];for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)pairs.push([a,b]);
    for(let mask=0;mask<2**pairs.length;mask++){const edges=Array.from({length:n},()=>Array(n).fill(false));pairs.forEach(([a,b],i)=>{if(mask&(1<<i))edges[a][b]=true;else edges[b][a]=true;});
      const closure=edges.map(row=>[...row]);for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)closure[i][j] ||= closure[i][k]&&closure[k][j];
      const cyclic=closure.some((row,i)=>row[i]);let triangle=false;for(let a=0;a<n;a++)for(let b=0;b<n;b++)for(let c=0;c<n;c++)triangle ||= edges[a][b]&&edges[b][c]&&edges[c][a];assert.equal(cyclic,triangle);
    }
  }
});
