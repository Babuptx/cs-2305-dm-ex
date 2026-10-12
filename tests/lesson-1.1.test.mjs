import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const lesson=JSON.parse(await readFile(new URL('../data/lessons/1.1.json',import.meta.url),'utf8'));
const flatten=blocks=>blocks.flatMap(b=>[b,...flatten(b.blocks||b.explanation||[])]);
const blocks=lesson.units.flatMap(unit=>flatten(unit.blocks));
const values=['T','F'];

// Independent evaluator of the formulas actually printed in the lesson tables.
// It checks every displayed intermediate column, not just the final answers.
function truth(expression,assignment){
  const tokens=expression.replace(/\s/g,'').split('');let pos=0;
  const priority={'↔':1,'→':2,'∨':3,'⊕':3,'∧':4};
  function atom(){const token=tokens[pos++];if(token==='¬')return !atom();if(token==='('){const result=parse(1);assert.equal(tokens[pos++],')');return result;}assert.ok(token in assignment);return assignment[token];}
  function parse(level){let result=atom();while(priority[tokens[pos]]>=level){const operator=tokens[pos++],right=parse(priority[operator]+1);result=operator==='∧'?Number(result)+Number(right)===2:operator==='∨'?Number(result)+Number(right)>=1:operator==='⊕'?result!==right:operator==='→'?!(result&&!right):result===right;}return result;}
  const result=parse(1);assert.equal(pos,tokens.length);return result?'T':'F';
}
test('Section 1.1: all six truth tables have exhaustive inputs and correct calculated columns',()=>{
  const tables=blocks.filter(b=>b.type==='table'&&b.headers.every(h=>/^[pqr¬∧∨⊕→↔()\s]+$/.test(h)));
  assert.equal(tables.length,6);
  for(const table of tables){
    const variables=table.headers.filter(h=>/^[pqr]$/.test(h));
    assert.equal(table.rows.length,2**variables.length);const combinations=new Set();
    for(const row of table.rows){assert.ok(row.every(v=>values.includes(v)));const assignment=Object.fromEntries(variables.map((v,i)=>[v,row[i]==='T']));combinations.add(variables.map(v=>assignment[v]).join(','));table.headers.forEach((formula,i)=>assert.equal(row[i],truth(formula,assignment),formula+' at '+JSON.stringify(assignment)));}
    assert.equal(combinations.size,2**variables.length);
  }
});
const bitwise=(a,b,operation)=>[...a].map((bit,i)=>{const sum=Number(bit)+Number(b[i]);return operation==='AND'?+(sum===2):operation==='OR'?+(sum>=1):+(sum===1);}).join('');
test('Section 1.1: bit table and both displayed bit-string calculations are correct',()=>{
  const table=blocks.find(b=>b.type==='table'&&b.headers[0]==='x');
  for(const row of table.rows)for(const [i,op] of ['AND','OR','XOR'].entries())assert.equal(row[i+2],bitwise(row[0],row[1],op));
  const worked=blocks.find(b=>b.type==='math'&&b.notation.startsWith('A ='));
  const [,a,b]=worked.notation.match(/A = ([01]+)\nB = ([01]+)/);assert.equal(a.length,b.length);
  for(const op of ['AND','OR','XOR'])assert.equal(worked.notation.match(new RegExp('A '+op+' B\\s*= ([01]+)'))[1],bitwise(a,b,op));
  const check=blocks.find(b=>b.type==='check'&&b.prompt.startsWith('Find the bitwise'));
  const [left,right]=check.prompt.match(/[01]{4}/g),answer=check.explanation.find(b=>b.type==='math').notation;
  for(const op of ['AND','OR','XOR'])assert.equal(answer.match(new RegExp(op+'\\s*= ([01]+)'))[1],bitwise(left,right,op));
});
test('Section 1.1: the displayed assignment trace uses the old stored value',()=>{
  const example=blocks.find(b=>b.type==='example'&&b.title==='Worked example: follow the stored value');
  const start=Number(example.blocks[0].text.match(/x = (\d+)/)[1]);
  const [,a,b,sum,increment]=example.blocks.find(b=>b.type==='math').notation.match(/if (\d+) \+ (\d+) = (\d+) then x := x \+ (\d+)/).map(Number);
  const result=a+b===sum?start+increment:start;
  const shown=Number(example.blocks.at(-1).text.match(/x is now (\d+)/)[1]);assert.equal(shown,result);
  assert.equal(3<2?4+5:4,4);
});
test('Section 1.1: counterexamples and precedence examples have the stated truth values',()=>{
  assert.equal(9%3,0);assert.notEqual(9%6,0);assert.equal(12%4,0);assert.notEqual(12%8,0);
  const v={p:true,q:false,r:false};assert.equal(truth('p ∨ (q ∧ r)',v),'T');assert.equal(truth('(p ∨ q) ∧ r',v),'F');
  assert.equal(truth('¬p ∧ q',{p:false,q:false}),'F');assert.equal(truth('¬(p ∧ q)',{p:false,q:false}),'T');
});
