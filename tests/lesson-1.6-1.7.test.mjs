import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluateBoolean as bool,assignments,flatten} from './logic-oracle.mjs';
import {evaluateFormula as quantified} from './quantifier-oracle.mjs';
const lessons=Object.fromEntries(await Promise.all(['1.6','1.7'].map(async id=>[id,JSON.parse(await readFile(new URL(`../data/lessons/${id}.json`,import.meta.url),'utf8'))])));
const blocks=(id,unit)=>flatten(lessons[id].units.find(u=>u.id===unit).blocks);
const tables=(id,unit)=>blocks(id,unit).filter(b=>b.type==='table');
const maths=(id,unit)=>blocks(id,unit).filter(b=>b.type==='math').map(b=>b.notation);
const models=names=>assignments(names.split(''));
const counterexamples=(premises,conclusion,names)=>models(names).filter(a=>premises.every(p=>bool(p,a))&&!bool(conclusion,a));
const truth=s=>s==='T';
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
function unaryModels(n,names){return range(0,2**(n*names.length)-1).map(mask=>Object.fromEntries(names.map((name,j)=>[name,x=>Boolean(mask&(1<<(j*n+x)))])));}
// Small arithmetic parser for the actual displayed polynomial/rational expressions.
// It supports implicit products and superscript squares without executing content.
function arithmetic(source,values){
 const text=source.replaceAll('−','-').replaceAll('²','^2').replaceAll('³','^3').replace(/\s/g,'');
 const tokens=text.match(/\d+|[a-z]|[()+*\-/^]/g)||[];
 assert.equal(tokens.join(''),text);let pos=0;
 function atom(){let value;if(tokens[pos]==='-'){pos++;return -atom();}const t=tokens[pos++];if(t==='('){value=expression();assert.equal(tokens[pos++],')');}else {value=/^\d+$/.test(t)?Number(t):values[t];assert.equal(typeof value,'number',source+' needs '+t);}if(tokens[pos]==='^'){pos++;value**=Number(tokens[pos++]);}return value;}
 function product(){let v=atom();while(pos<tokens.length&&!['+', '-', ')'].includes(tokens[pos])){const t=tokens[pos];if(t==='*'||t==='/'){pos++;const b=atom();v=t==='*'?v*b:v/b;}else v*=atom();}return v;}
 function expression(){let v=product();while(['+','-'].includes(tokens[pos])){const op=tokens[pos++],b=product();v=op==='+'?v+b:v-b;}return v;}
 const result=expression();assert.equal(pos,tokens.length);return result;
}
function equation(chain,values){const parts=chain.split('=').map(x=>arithmetic(x,values));for(const v of parts)assert.ok(Math.abs(v-parts[0])<1e-10,chain);return parts[0];}

test('1.6: displayed truth table and conditional exactly characterize modus ponens',()=>{
 for(const [p,q,conditional,both,result] of tables('1.6','truth-table-validity')[0].rows){const a={p:truth(p),q:truth(q)};assert.equal(bool('p → q',a),truth(conditional));assert.equal(bool('(p → q) ∧ p',a),truth(both));assert.equal(a.q,truth(result));assert.equal(bool(maths('1.6','truth-table-validity')[0],a),true);}
 assert.equal(counterexamples(['p','¬p'],'q','pq').length,0);
});
test('1.6: every rule in the published toolkit is valid under all Boolean assignments',()=>{
 for(const [name,premises,conclusion]of tables('1.6','inference-reference')[0].rows)assert.deepEqual(counterexamples(premises.split(';').map(s=>s.trim()),conclusion,'pqr'),[],name);
 for(const formula of maths('1.6','chains-and-alternatives'))for(const a of models('pqr'))assert.equal(bool(formula,a),true);
 assert.deepEqual(counterexamples(['(a ∧ b) → c','¬c'],'¬a ∨ ¬b','abc'),[]);
 assert.ok(counterexamples(['p ∨ q','p'],'¬q','pq').length>0);
});
test('1.6: each repair-process proof line follows from the preceding lines',()=>{
 const rows=tables('1.6','annotated-argument')[0].rows,known=[];
 for(const [,formula,reason]of rows){if(reason!=='Premise')assert.deepEqual(counterexamples(known,formula,'pqrst'),[],formula);known.push(formula);}
 const missingS={p:false,q:true,r:true,s:false,t:false};
 const premises=rows.filter(r=>r[2]==='Premise').map(r=>r[1]);
 assert.equal(premises.filter(p=>p!=='s').every(p=>bool(p,missingS)),true);assert.equal(bool(rows.at(-1)[1],missingS),false);
});
test('1.6: displayed clause rewrites and the resolution derivation preserve truth',()=>{
 for(const [before,after]of tables('1.6','resolution-clauses')[0].rows)for(const a of models('pqr'))assert.equal(bool(before,a),bool(after,a));
 const known=[];for(const [,formula,reason]of tables('1.6','resolution-clauses')[1].rows){if(reason!=='Premise')assert.deepEqual(counterexamples(known,formula,'pqr'),[]);known.push(formula);}
 for(const a of models('pqr'))assert.equal(bool(maths('1.6','resolution-clauses')[0],a),true);
});
test('1.6: the displayed conditional fallacies have true-premise false-conclusion countermodels',()=>{
 for(const [,premises,conclusion,description]of tables('1.6','conditional-fallacies')[0].rows){const a=Object.fromEntries([...description.matchAll(/([pq]) = ([TF])/g)].map(([,k,v])=>[k,truth(v)]));assert.equal(premises.split(';').every(p=>bool(p,a)),true);assert.equal(bool(conclusion,a),false);}
 assert.deepEqual(counterexamples(['p ↔ q','q'],'p','pq'),[]);assert.deepEqual(counterexamples(['p ↔ q','¬p'],'¬q','pq'),[]);
});
test('1.6: universal instantiation and both universal modus rules hold for every named domain member',()=>{
 const rows=tables('1.6','universal-instantiation')[0].rows;
 for(let n=1;n<=3;n++)for(const predicates of unaryModels(n,['A','L']))for(let d=0;d<n;d++){
  const ev=f=>quantified(f,{default:range(0,n-1)},predicates,{d});
  if(ev(rows[0][1])&&ev(rows[1][1]))for(const row of rows.slice(2))assert.equal(ev(row[1]),true);
  if(ev(rows[0][1])&&!predicates.L(d))assert.equal(predicates.A(d),false);
 }
});
test('1.6: existential proof conclusion is entailed and every eligible witness supports its local steps',()=>{
 const rows=tables('1.6','combined-witness-proof')[0].rows;
 for(let n=0;n<=3;n++)for(const predicates of unaryModels(n,['D','C','B'])){
  const domain=range(0,n-1),ev=(f,w)=>quantified(f,{default:domain},predicates,{w});
  if(ev(rows[0][1])&&ev(rows[1][1])){
   assert.equal(ev(rows.at(-1)[1]),true);
   for(const w of domain.filter(x=>predicates.D(x)&&predicates.C(x)))for(const [,formula]of rows.slice(2))assert.equal(ev(formula,w),true,formula);
  }
 }
 const p={D:x=>x===1,C:x=>x===0,B:x=>x===1};
 assert.equal(quantified('∃x C(x)',{default:[0,1]},p),true);assert.equal(quantified(rows[1][1],{default:[0,1]},p),true);assert.equal(quantified(rows.at(-1)[1],{default:[0,1]},p),false);
});
test('1.6: universal chaining works on empty and nonempty domains without establishing existence',()=>{
 const rows=tables('1.6','universal-chain')[0].rows;
 for(let n=0;n<=3;n++)for(const predicates of unaryModels(n,['C','I','L'])){
  const domain=range(0,n-1),ev=(f,a)=>quantified(f,{default:domain},predicates,{a});
  if(ev(rows[0][1])&&ev(rows[1][1])){assert.equal(ev(rows.at(-1)[1]),true);for(const a of domain)for(const row of rows.slice(2,-1))assert.equal(ev(row[1],a),true);}
 }
});
test('1.6: the actual two-object table refutes all three quantified fallacies',()=>{
 const rows=tables('1.6','quantifier-fallacies')[0].rows,domain=rows.map(r=>r[0]);
 const predicates=Object.fromEntries(['P','Q'].map((p,i)=>[p,x=>truth(rows.find(r=>r[0]===x)[i+1])]));
 for(const [claim] of tables('1.6','quantifier-fallacies')[1].rows){const [premises,conclusion]=claim.split('⇒'),ev=f=>quantified(f.trim(),{default:domain},predicates,{a:'a'});assert.equal(premises.split(';').every(ev),true);assert.equal(ev(conclusion),false);}
 assert.equal(quantified('∀x P(x)',{default:[]},predicates),true);assert.equal(quantified('∃x P(x)',{default:[]},predicates),false);
});
test('1.7: direct parity proof equations use integer witnesses for positive, zero and negative parameters',()=>{
 const rows=tables('1.7','direct-parity')[0].rows;
 const chain=rows[2][1].replace(/\.$/,'');const factored=rows[3][1].replace(/\.$/,'');
 for(const k of range(-100,100)){const n=2*k+1;assert.equal(equation(chain,{n,k}),3*n+5);equation(factored,{n,k});assert.equal(Math.abs((3*n+5)%2),0);assert.equal(Number.isInteger(3*k+4),true);}
});
test('1.7: independent parity and square witnesses check the displayed identities',()=>{
 for(const a of range(-12,12))for(const b of range(-12,12)){
  const m=2*a,n=2*b+1;assert.equal(equation(maths('1.7','independent-witnesses')[0],{m,n,a,b}),m+n);
  assert.equal(4*(a*a)*(b*b),(2*a*b)**2);
  assert.equal((2*a+1)-(2*b+1),2*(a-b));
 }
 assert.equal(8+15,23);assert.equal(15===8+1,false);
});
test('1.7: displayed rational-difference formula handles independent nonzero denominators',()=>{
 for(const a of range(-4,4))for(const b of range(-4,4).filter(Boolean))for(const c of range(-4,4))for(const d of range(-4,4).filter(Boolean)){
  equation(maths('1.7','rational-direct')[0],{r:a/b,s:c/d,a,b,c,d});
  assert.notEqual(b*d,0);assert.equal(BigInt(a*d-b*c),BigInt(a)*BigInt(d)-BigInt(b)*BigInt(c));
 }
});
test('1.7: contraposition, conditional contradiction and biconditional templates are tautologies',()=>{
 for(const unit of ['contraposition-proof','compare-proof-methods','biconditional-proof'])for(const a of models('pq'))assert.equal(bool(maths('1.7',unit)[0],{...a,F:false}),true);
 for(const n of range(-200,200)){
  assert.equal(Math.abs((5*n+4)%2),Math.abs(n%2));
  assert.equal((7*n+2)%2===0,n%2===0);
  assert.equal(n*n%2===0,n%2===0);
 }
 for(const k of range(-30,30)){assert.equal(5*(2*k)+4,2*(5*k+2));assert.equal(7*(2*k+1)+2,2*(7*k+4)+1);assert.equal((2*k+1)**2,2*(2*k*k+2*k)+1);}
});
test('1.7: compound inequality boundaries and vacuous/trivial examples are correct',()=>{
 for(const x of range(-20,20).map(n=>n/2))for(const y of range(-20,20).map(n=>n/2)){
  assert.equal(!((x>=5)||(y>=5)),x<5&&y<5);
  if(x+y>=10)assert.equal(x>=5||y>=5,true);
 }
 assert.ok(12+(-2)>=10&&-2<5);assert.equal(5+5<10,false);
 assert.equal(range(-10,10).some(x=>x*x>=5&&x*x<=8),false);
 for(const x of range(-100,100))assert.ok(x*x+1>0);
});
test('1.7: folder contradiction excludes every capacity-three distribution and the boundary is sharp',()=>{
 const totals=[];for(const a of range(0,3))for(const b of range(0,3))for(const c of range(0,3))for(const d of range(0,3))totals.push(a+b+c+d);
 assert.equal(Math.max(...totals),12);assert.equal(totals.includes(13),false);assert.equal([3,3,3,3].reduce((a,b)=>a+b),12);
});
test('1.7: every row in the square-divisibility lemma checks its identity and residue',()=>{
 for(const [form,square,remainder]of tables('1.7','irrationality-proof')[0].rows)for(const k of range(-100,100)){
  const a=arithmetic(form,{k}),value=arithmetic(square,{k});assert.equal(value,a*a);assert.equal(((value%3)+3)%3,Number(remainder));
 }
 // Algebra in the contradiction: a=3c and a²=3b² implies b²=3c².
 for(const c of range(-100,100))assert.equal((3*c)**2/3,3*c*c);
 // Finite checks support, but do not replace, the general proof in the lesson.
});
test('1.7: the published equivalence cycle is correct and the open chain is insufficient',()=>{
 for(const a of models('ABC'))assert.equal(bool(maths('1.7','equivalence-cycle')[0],a),true);
 assert.ok(counterexamples(['A → B','B → C'],'A ↔ C','ABC').length>0);
 for(const n of range(-100,100)){const odd=x=>Math.abs(x%2)===1;assert.equal(odd(n),odd(n+2));assert.equal(odd(n+2),odd(3*n));}
 for(const k of range(-100,100)){assert.equal(3*(2*k-1),2*(3*k-2)+1);assert.equal((2*k+1)+2,2*(k+1)+1);}
});
test('1.7: displayed counterexamples and algebra-error repairs satisfy their original conditions',()=>{
 const prime=n=>n>=2&&!range(2,Math.floor(Math.sqrt(n))).some(d=>n%d===0);
 for(const [n,value,classification]of tables('1.7','counterexample-proof')[0].rows){assert.equal(Number(n)**2+Number(n)+11,Number(value));assert.equal(prime(Number(value)),classification==='Prime');}
 assert.equal(121,11*11);
 assert.deepEqual(range(-5,5).filter(x=>x*(x-2)===0),[0,2]);
 assert.deepEqual(range(-6,6).filter(x=>x*x===x+6),[-2,3]);
 assert.deepEqual(range(-6,6).filter(x=>Math.sqrt(x+6)===x),[3]);
 assert.ok((-3)**2>4&&-3<=2);
});
