import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assignments,evaluateBoolean,flatten} from './logic-oracle.mjs';
const lesson=JSON.parse(await readFile(new URL('../data/lessons/1.3.json',import.meta.url),'utf8'));
const unit=id=>flatten(lesson.units.find(u=>u.id===id).blocks);
const all=lesson.units.flatMap(u=>flatten(u.blocks));
const evaluate=(formula,values)=>evaluateBoolean(formula,{...values,T:true,F:false});
const variables=formula=>[...new Set(formula.match(/[a-zA-Z]/g)||[])].filter(v=>v!=='T'&&v!=='F');
function equivalent(formulas){
  for(const values of assignments(variables(formulas.join('')))){
    const expected=evaluate(formulas[0],values);
    for(const formula of formulas.slice(1))assert.equal(evaluate(formula,values),expected,formula+' at '+JSON.stringify(values));
  }
}
test('1.3: three displayed truth tables cover every assignment with correct columns',()=>{
  const tables=all.filter(b=>b.type==='table'&&b.headers.every(h=>/^[a-z¬∧∨→↔()\s]+$/.test(h)));
  assert.equal(tables.length,3);
  for(const table of tables){const vars=table.headers.filter(h=>/^[a-z]$/.test(h)),seen=new Set();assert.equal(table.rows.length,2**vars.length);
    for(const row of table.rows){const values=Object.fromEntries(vars.map((v,i)=>[v,row[i]==='T']));seen.add(JSON.stringify(values));
      table.headers.forEach((formula,i)=>{assert.ok(['T','F'].includes(row[i]));assert.equal(evaluate(formula,values),row[i]==='T');});
    }assert.equal(seen.size,2**vars.length);
  }
});
test('1.3: every listed equivalence and displayed check chain holds for all inputs',()=>{
  const identities=all.filter(b=>b.type==='table'&&b.headers.includes('Equivalent forms')).flatMap(t=>t.rows.flat()).filter(cell=>cell.includes('≡'));
  assert.equal(identities.length,32);
  const chains=all.filter(b=>b.type==='math'&&b.notation.includes('≡')).map(b=>b.notation);assert.equal(chains.length,2);
  for(const identity of [...identities,...chains])equivalent(identity.split('≡').map(s=>s.trim()));
});
test('1.3: all four worked proof tables preserve meaning at every step',()=>{
  const proofs=all.filter(b=>b.type==='table'&&b.headers[0]==='Expression');assert.equal(proofs.length,4);
  for(const proof of proofs)equivalent(proof.rows.map(r=>r[0]));
});
test('1.3: counterexamples, extended negations, and the disagreement test are correct',()=>{
  assert.notEqual(evaluate('p → q',{p:true,q:false}),evaluate('q → p',{p:true,q:false}));
  assert.notEqual(evaluate('(p ∨ q) ∧ r',{p:true,q:false,r:false}),evaluate('p ∨ (q ∧ r)',{p:true,q:false,r:false}));
  assert.notEqual(evaluate('p ∧ q',{p:true,q:false}),evaluate('p',{p:true,q:false}));
  equivalent(['¬(p ∨ q ∨ r)','¬p ∧ ¬q ∧ ¬r']);equivalent(['¬(p ∧ q ∧ r)','¬p ∨ ¬q ∨ ¬r']);
  const disagreement=unit('solving').find(b=>b.type==='math').notation;
  for(const row of assignments(['A','B']))assert.equal(evaluate(disagreement,row),row.A!==row.B);
});
test('1.3: session constraints force the claimed unique witness and conflict',()=>{
  const formula=unit('satisfiability').find(b=>b.type==='math').notation;
  const rows=assignments(['a','b','c']);
  assert.deepEqual(rows.filter(v=>evaluate(formula,v)),[{a:true,b:false,c:true}]);
  assert.equal(rows.filter(v=>evaluate('('+formula+') ∧ ¬c',v)).length,0);
  assert.equal(rows.every(v=>evaluate('¬('+formula+')',v)),false);
  assert.equal(rows.every(v=>evaluate('¬(('+formula+') ∧ ¬c)',v)),true);
});
test('1.3: the displayed choice constraints mean at least, at most, and exactly one',()=>{
  const rows=unit('exactly-one').find(b=>b.type==='table').rows;
  for(const values of assignments(['a','b','c'])){const count=Object.values(values).filter(Boolean).length;
    [count>=1,count<=1,count===1].forEach((expected,i)=>assert.equal(evaluate(rows[i][1],values),expected));
  }
  assert.equal(evaluate('(a ⊕ b) ⊕ c',{a:true,b:true,c:true}),true);
});
test('1.3: queens encoding matches nonattacking placements across all 65,536 boards',()=>{
  const squares=Array.from({length:16},(_,n)=>[Math.floor(n/4)+1,n%4+1]);
  const attackingPairs=[];
  squares.forEach(([i,j],a)=>squares.slice(a+1).forEach(([k,l],offset)=>{if(i===k||j===l||i-j===k-l||i+j===k+l)attackingPairs.push([a,a+1+offset]);}));
  const solutions=[];
  for(let mask=0;mask<65536;mask++){
    const occupied=squares.filter((_,i)=>mask&(1<<i));
    const model=[1,2,3,4].every(row=>occupied.some(([i])=>i===row))&&attackingPairs.every(([a,b])=>!(mask&(1<<a))||!(mask&(1<<b)));
    const geometry=occupied.length===4&&occupied.every(([i,j],a)=>occupied.slice(a+1).every(([k,l])=>i!==k&&j!==l&&Math.abs(i-k)!==Math.abs(j-l)));
    assert.equal(model,geometry);if(model)solutions.push(occupied);
  }
  assert.equal(solutions.length,2);
  const placement=unit('queens').find(b=>b.type==='table'&&b.headers[0]==='Row').rows.map(r=>r.map(Number));
  assert.ok(solutions.some(s=>JSON.stringify(s)===JSON.stringify(placement)));
  const formulas=unit('queens').filter(b=>b.type==='math').map(b=>b.notation);
  for(const mask of [0,1,3,2,16]){const values=Object.fromEntries(squares.map(([i,j],n)=>[String.fromCharCode(97+n),Boolean(mask&(1<<n))]));
    const convert=f=>f.replace(/Q\((\d), (\d)\)/g,(_,i,j)=>String.fromCharCode(97+(Number(i)-1)*4+Number(j)-1));
    assert.equal(evaluate(convert(formulas[0]),values),Boolean(mask&15));
    assert.equal(evaluate(convert(formulas[1]),values),!((mask&1)&&(mask&2)));
  }
});
test('1.3: the Sudoku witness and alternative satisfy cells, rows, columns, blocks, and given',()=>{
  const board=unit('sudoku').find(b=>b.type==='table'&&b.headers[0]==='Row').rows.map(r=>r.slice(1).map(Number));
  const valid=grid=>{
    const groups=[...grid,...[0,1,2,3].map(c=>grid.map(row=>row[c]))];
    for(const i of [0,2])for(const j of [0,2])groups.push([grid[i][j],grid[i][j+1],grid[i+1][j],grid[i+1][j+1]]);
    return grid.flat().every(n=>Number.isInteger(n)&&n>=1&&n<=4)&&groups.every(g=>new Set(g).size===4)&&grid[0][1]===2;
  };
  assert.equal(valid(board),true);
  const alternative=board.map(row=>row.map(n=>n===3?4:n===4?3:n));assert.notDeepEqual(alternative,board);assert.equal(valid(alternative),true);
  const broken=structuredClone(board);broken[0][0]=2;assert.equal(valid(broken),false);
  const formulas=unit('sudoku').filter(b=>b.type==='math').map(b=>b.notation);
  for(const grid of [board,alternative,broken]){
    const values={};const convert=f=>f.replace(/S\((\d), (\d), (\d)\)/g,(_,i,j,d)=>{const key=String.fromCharCode(97+(Number(j)-1));values[key]=grid[Number(i)-1][Number(j)-1]===Number(d);return key;});
    const first=convert(formulas[0]);assert.equal(evaluate(first,values),grid[0].includes(2));
    const pair=convert(formulas[1]);assert.equal(evaluate(pair,values),!(grid[0][0]===2&&grid[0][1]===2));
  }
});
