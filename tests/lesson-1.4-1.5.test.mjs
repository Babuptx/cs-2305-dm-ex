import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {flatten} from './logic-oracle.mjs';
import {evaluateFormula as evaluate,parseFormula,freeVariables} from './quantifier-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['1.4','1.5'].map(async id=>[id,JSON.parse(await readFile(new URL(`../data/lessons/${id}.json`,import.meta.url),'utf8'))])));
const blocks=(id,unit)=>flatten(lessons[id].units.find(u=>u.id===unit).blocks);
const tables=(id,unit)=>blocks(id,unit).filter(b=>b.type==='table');
const math=(id,unit)=>blocks(id,unit).filter(b=>b.type==='math').map(b=>b.notation);
const truth=s=>s==='T';
const range=n=>Array.from({length:n},(_,i)=>i);
const bit=(mask,i)=>Boolean(mask&(2**i));
function unaryModels(n,names){return range(2**(n*names.length)).map(mask=>Object.fromEntries(names.map((name,j)=>[name,i=>bit(mask,j*n+i)])));}
function binaryModels(nx,ny){return range(2**(nx*ny)).map(mask=>(x,y)=>bit(mask,x*ny+y));}

test('1.4: substitution and multi-argument tables evaluate the stated inequalities',()=>{
  for(const [expr,,value] of tables('1.4','predicate-slots')[0].rows){const n=Number(expr.slice(2,-1).replace('−','-'));assert.equal(n>5,truth(value));}
  for(const [expr,,value] of tables('1.4','predicate-arguments')[0].rows){const [x,y]=expr.slice(2,-1).split(',').map(Number);assert.equal(x>=2*y,truth(value));}
});
test('1.4: program traces distinguish old and new values, including the branch boundary',()=>{
  for(const [before,,after]of tables('1.4','predicates-in-programs')[0].rows){const [score,bonus]=before.split(',').map(Number);assert.deepEqual(after.split(',').map(Number),[score,score>=10?bonus+2:bonus]);}
  for(let n=-30;n<=30;n++){let count=n;count++;const doubled=2*count;assert.equal(count,n+1);assert.equal(doubled,2*(n+1));}
});
test('1.4: domain witnesses, equality boundaries and finite quantified results are correct',()=>{
  assert.equal((1/2)**2>=1,false);assert.equal(0**2>=1,false);assert.equal(2*(5/2),5);
  assert.deepEqual(range(15).map(i=>i-7).filter(x=>x*x===9),[-3,3]);
  const rows=tables('1.4','finite-quantifiers')[0].rows;
  const results=rows.map(([x,square,result])=>{const n=Number(x.replace('−','-'));assert.equal(n*n,Number(square));assert.equal(n*n>=4,truth(result));return truth(result);});
  assert.equal(results.every(Boolean),false);assert.equal(results.some(Boolean),true);
  assert.equal([].every(Boolean),true);assert.equal([].some(Boolean),false);
  assert.ok(3>2&&3*3<=10);assert.equal(!(2*2>4),2*2<=4);
});
test('1.4: restricted-domain table and both wrong translations have distinguishing models',()=>{
  const rows=tables('1.4','restricted-domains')[0].rows;
  for(const [,s,l,imp,both]of rows){assert.equal(!truth(s)||truth(l),truth(imp));assert.equal(truth(s)&&truth(l),truth(both));}
  const [all,some]=math('1.4','restricted-domains')[0].split('\n');
  const predicates={S:i=>truth(rows[i][1]),L:i=>truth(rows[i][2])};
  assert.equal(evaluate(all,{default:range(3)},predicates),false);assert.equal(evaluate(some,{default:range(3)},predicates),true);
  const onlyNonstudent={S:()=>false,L:()=>false};assert.equal(evaluate('∃x (S(x) → L(x))',{default:[0]},onlyNonstudent),true);assert.equal(evaluate(some,{default:[0]},onlyNonstudent),false);
  const mixed={S:i=>i===0,L:()=>true};assert.equal(evaluate(all,{default:[0,1]},mixed),true);assert.equal(evaluate('∀x (S(x) ∧ L(x))',{default:[0,1]},mixed),false);
});
test('1.4: scope, fresh-name renaming and capture preserve the intended free occurrences',()=>{
  assert.deepEqual(freeVariables('(∀x P(x)) ∨ Q(x)'),['x']);assert.deepEqual(freeVariables('∀x (P(x) ∨ Q(x))'),[]);
  assert.deepEqual(freeVariables('∀x (R(x, y) → ∃z S(y, z))'),['y']);
  const domains={default:[0,1]},pred={P:x=>x===0,Q:x=>x===0};
  assert.equal(evaluate('(∀x P(x)) ∨ Q(x)',domains,pred,{x:0}),true);assert.equal(evaluate('∀x (P(x) ∨ Q(x))',domains,pred),false);
  for(const y of [0,1]){const sum={R:(a,b)=>a+b===1};assert.equal(evaluate('∃x R(x, y)',domains,sum,{y}),evaluate('∃z R(z, y)',domains,sum,{y}));assert.equal(evaluate('∃y R(y, y)',domains,sum),false);}
});
test('1.4: displayed distribution laws hold and the two forbidden distributions fail as shown',()=>{
  const laws=math('1.4','quantified-equivalences')[0].split('\n').map(s=>s.split('≡').map(parseFormula));
  for(let n=0;n<=4;n++)for(const pred of unaryModels(n,['P','Q']))for(const [a,b]of laws)assert.equal(evaluate(a,{default:range(n)},pred),evaluate(b,{default:range(n)},pred));
  const rows=tables('1.4','quantified-equivalences')[0].rows,pred={P:i=>truth(rows[i][1]),Q:i=>truth(rows[i][2])};
  for(const [,p,q,or,and]of rows){assert.equal(truth(or),truth(p)||truth(q));assert.equal(truth(and),truth(p)&&truth(q));}
  assert.equal(evaluate('∀x (P(x) ∨ Q(x))',{default:[0,1]},pred),true);assert.equal(evaluate('(∀x P(x)) ∨ (∀x Q(x))',{default:[0,1]},pred),false);
  assert.equal(evaluate('∃x (P(x) ∧ Q(x))',{default:[0,1]},pred),false);assert.equal(evaluate('(∃x P(x)) ∧ (∃x Q(x))',{default:[0,1]},pred),true);
});
test('1.4: both De Morgan laws and every universal-rule negation step agree in all finite models',()=>{
  const laws=math('1.4','negating-quantifiers')[0].split('\n').map(s=>s.split('≡').map(parseFormula));
  const chain=tables('1.4','negating-universal-rules')[0].rows.map(r=>parseFormula(r[0]));
  for(let n=0;n<=4;n++){
    for(const pred of unaryModels(n,['P']))for(const [a,b]of laws)assert.equal(evaluate(a,{default:range(n)},pred),evaluate(b,{default:range(n)},pred));
    for(const pred of unaryModels(n,['S','L'])){const actual=chain.map(f=>evaluate(f,{default:range(n)},pred));assert.ok(actual.every(v=>v===actual[0]));}
  }
});
test('1.4: English translations distinguish all, some, none, not all and only',()=>{
  const formulas=tables('1.4','english-with-one-quantifier')[0].rows.map(r=>parseFormula(r[1]));
  for(let n=0;n<=4;n++)for(const pred of unaryModels(n,['T','E'])){
    const people=range(n),trained=people.filter(pred.T),entering=people.filter(pred.E);
    const expected=[trained.every(pred.E),trained.some(pred.E),trained.every(x=>!pred.E(x)),trained.some(x=>!pred.E(x)),entering.every(pred.T)];
    assert.deepEqual(formulas.map(f=>evaluate(f,{default:people},pred)),expected);
  }
});
test('1.4: availability truth table and quantified argument preserve their stated meaning',()=>{
  const formula=math('1.4','quantified-specifications')[1];
  for(const [active,available,result]of tables('1.4','quantified-specifications')[0].rows)assert.equal(evaluate(formula,{u:[0],l:[0]},{Active:()=>truth(active),Available:()=>truth(available)}),truth(result));
  const argument=tables('1.4','quantified-arguments')[0].rows.map(r=>parseFormula(r[2]));
  for(let n=0;n<=3;n++)for(const pred of unaryModels(n,['R','C','W'])){const values=argument.map(f=>evaluate(f,{default:range(n)},pred));if(values[0]&&values[1])assert.equal(values[2],true);}
});
test('1.4: finite logic-programming query answers follow only from shared workshop facts',()=>{
  const code=math('1.4','logic-programming')[0],leads=[...code.matchAll(/^leads\((\w+), (\w+)\)\./gm)].map(m=>m.slice(1)),attends=[...code.matchAll(/^attends\((\w+), (\w+)\)\./gm)].map(m=>m.slice(1));
  const pairs=leads.flatMap(([mentor,workshop])=>attends.filter(([,w])=>w===workshop).map(([student])=>[mentor,student]));
  assert.deepEqual(attends.filter(([,w])=>w==='logic').map(([s])=>s),['ava','ben']);
  assert.deepEqual(pairs.filter(([,s])=>s==='ava').map(([m])=>m),['lee','omar']);assert.equal(pairs.some(([m,s])=>m==='omar'&&s==='ben'),false);
});
test('1.5: all six displayed grid quantifications match their actual relation data',()=>{
  const [grid,claims]=tables('1.5','relation-grid'),students=grid.rows.map(r=>r[0]),modules=grid.headers.slice(1);
  const Completed=(s,m)=>truth(grid.rows[students.indexOf(s)][modules.indexOf(m)+1]);
  for(const [formula,,expected]of claims.rows)assert.equal(evaluate(formula,{s:students,m:modules},{Completed}),truth(expected));
});
test('1.5: displayed executable searches match independent pair-set coverage, including empty domains',()=>{
  const context=vm.createContext({});new vm.Script(math('1.5','finite-nested-search')[0]).runInContext(context,{timeout:1000});
  for(let nx=0;nx<=3;nx++)for(let ny=0;ny<=3;ny++)for(const P of binaryModels(nx,ny)){
    const xs=range(nx),ys=range(ny),pairs=xs.flatMap(x=>ys.map(y=>[x,y])).filter(([x,y])=>P(x,y));
    const covered=new Set(pairs.map(([x])=>x));const common=ys.filter(y=>pairs.filter(([,v])=>v===y).length===nx);
    assert.equal(context.everySome(xs,ys,P),covered.size===nx);assert.equal(context.commonWitness(xs,ys,P),common.length>0);
  }
});
test('1.5: like quantifiers commute, mixed ones need not, and a common witness implies per-input witnesses',()=>{
  const laws=math('1.5','quantifier-order')[0].split('\n').map(s=>s.split('≡').map(parseFormula));let differing=false;
  for(let nx=0;nx<=3;nx++)for(let ny=0;ny<=3;ny++)for(const P of binaryModels(nx,ny)){
    const domains={x:range(nx),y:range(ny)};
    for(const [a,b]of laws)assert.equal(evaluate(a,domains,{P}),evaluate(b,domains,{P}));
    const common=evaluate('∃y∀x P(x, y)',domains,{P}),each=evaluate('∀x∃y P(x, y)',domains,{P});if(common)assert.equal(each,true);if(each&&!common&&nx&&ny)differing=true;
  }assert.ok(differing);
  for(const [x,y]of tables('1.5','dependent-witness')[0].rows)assert.equal(Number(y.replace('−','-')),Number(x.replace('−','-'))+2);
});
test('1.5: reading from the inside preserves the direction of the helper relationship',()=>{
  const formula=math('1.5','nested-to-english')[0];
  for(const Cmodel of unaryModels(3,['C']))for(const H of binaryModels(3,3)){
    const C=Cmodel.C,expected=range(3).filter(x=>!C(x)).every(x=>range(3).filter(C).some(y=>H(y,x)));
    assert.equal(evaluate(formula,{default:range(3)},{C,H}),expected);
  }
});
test('1.5: active-user specifications and their full negation chain handle access and empty servers',()=>{
  const [each,shared]=math('1.5','english-to-nested').map(parseFormula),chain=tables('1.5','negating-nested-rules')[0].rows.map(r=>parseFormula(r[0]));
  for(let nu=0;nu<=2;nu++)for(let ns=0;ns<=2;ns++)for(const {Active}of unaryModels(nu,['Active']))for(const {Available}of unaryModels(ns,['Available']))for(const CanAccess of binaryModels(nu,ns)){
    const users=range(nu),servers=range(ns),active=users.filter(Active),available=servers.filter(Available),pred={Active,Available,CanAccess},domains={u:users,s:servers};
    const expected=active.every(u=>available.some(s=>CanAccess(u,s)));
    assert.equal(evaluate(each,domains,pred),expected);assert.equal(evaluate(shared,domains,pred),available.some(s=>active.every(u=>CanAccess(u,s))));
    for(const f of chain)assert.equal(evaluate(f,domains,pred),!expected);
  }
  assert.equal(evaluate('∀u (Active(u) → ∃s (Available(s) ∧ CanAccess(u, s)))',{u:[0],s:[]},{Active:()=>false}),true);
  assert.equal(evaluate('∀u∃s (Active(u) → (Available(s) ∧ CanAccess(u, s)))',{u:[0],s:[]},{Active:()=>false}),false);
});
test('1.5: distinctness and the three-person relationship have the stated vacuous cases',()=>{
  const [other,neighborhood]=math('1.5','distinct-objects').map(parseFormula);
  for(const F of binaryModels(3,3)){
    const expected=range(3).every(x=>range(3).filter(y=>y!==x).some(y=>F(x,y)));
    const isolated=range(3).some(x=>{const followed=range(3).filter(y=>F(x,y));return followed.every(y=>followed.every(z=>z===y||!F(y,z)));});
    assert.equal(evaluate(other,{default:range(3)},{F}),expected);assert.equal(evaluate(neighborhood,{default:range(3)},{F}),isolated);
  }
  assert.equal(evaluate(other,{default:[0]},{F:()=>true}),false);assert.equal(evaluate(neighborhood,{default:[0]},{F:()=>false}),true);
});
test('1.5: exactly-one ownership is one satisfying person per document, not one common owner',()=>{
  const formula=parseFormula(math('1.5','exactly-one-nested')[0]);
  for(let nd=0;nd<=3;nd++)for(let np=0;np<=3;np++)for(const Owns of binaryModels(nd,np)){
    const expected=range(nd).every(d=>range(np).filter(p=>Owns(d,p)).length===1);
    assert.equal(evaluate(formula,{d:range(nd),p:range(np),q:range(np)},{Owns}),expected);
  }
  const diagonal=(d,p)=>d===p;assert.equal(evaluate(formula,{d:[0,1],p:[0,1],q:[0,1]},{Owns:diagonal}),true);assert.equal(evaluate('∃p∀d Owns(d, p)',{d:[0,1],p:[0,1]},{Owns:diagonal}),false);
});
test('1.5: three-quantifier project witnesses and the edited countermodels are correct',()=>{
  const formula=parseFormula(math('1.5','three-quantifiers')[0]);
  const rows=tables('1.5','three-quantifiers')[0].rows;
  function model(data){return evaluate(formula,{s:['Ana','Ben'],m:['Logic','Coding'],p:data.map(r=>r[0])},{Submitted:(s,p)=>data.some(r=>r[0]===p&&r[1]===s),Covers:(p,m)=>data.some(r=>r[0]===p&&r[2]===m)});}
  assert.equal(model(rows),true);const edited=rows.filter(r=>r[0]!=='p2').concat([['p4','Ben','Coding']]);assert.equal(model(edited),true);assert.equal(model(edited.filter(r=>r[0]!=='p3')),false);
});
test('1.5: all displayed nested negations are exact complements in exhaustive finite models',()=>{
  const pairs=tables('1.5','negating-nested')[0].rows.map(r=>r.map(parseFormula));
  for(let nx=0;nx<=3;nx++)for(let ny=0;ny<=3;ny++)for(const P of binaryModels(nx,ny))for(const [a,b]of pairs)assert.equal(evaluate(b,{x:range(nx),y:range(ny)},{P}),!evaluate(a,{x:range(nx),y:range(ny)},{P}));
  const triple=math('1.5','negating-nested-rules')[0].split('≡').map(parseFormula);
  for(const Submitted of binaryModels(2,2))for(const Covers of binaryModels(2,2))assert.equal(evaluate(triple[0],{default:[0,1]},{Submitted,Covers}),evaluate(triple[1],{default:[0,1]},{Submitted,Covers}));
});
test('1.5: optional limit witness and failed-candidate bounds check at varied exact rational scales',()=>{
  // Integer-scaled rational arithmetic: epsilon=3/k, delta=1/k and h=j/(10k).
  // 3h < epsilon iff 3j < 30, with h nonzero and j from 1 through 9.
  for(const k of [1n,2n,10n,1000000n])for(let j=1n;j<10n;j++){
    assert.ok(j*k<10n*k);assert.ok(3n*j*k<30n*k);
  }
  // For a failed L=7: h=min(delta/2,1/12). Check h<delta and 1-3h>=3/4.
  for(const [dn,dd]of [[1n,1000n],[1n,10n],[1n,1n],[100n,1n]]){
    const [hn,hd]=dn*12n<=dd*2n?[dn,dd*2n]:[1n,12n];
    assert.ok(hn>0n&&hn*dd<dn*hd);assert.ok(4n*(hd-3n*hn)>=3n*hd);
  }
  assert.equal(3*2,6);assert.notEqual(6,7);
});
