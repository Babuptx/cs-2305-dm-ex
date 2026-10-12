import assert from 'node:assert/strict';
export function evaluateBoolean(expression,assignment){
  const tokens=expression.replace(/\s/g,'').split('');let pos=0;
  const priority={'↔':1,'→':2,'∨':3,'⊕':3,'∧':4};
  function atom(){const token=tokens[pos++];if(token==='¬')return !atom();if(token==='('){const result=parse(1);assert.equal(tokens[pos++],')');return result;}assert.ok(token in assignment,'Unknown variable '+token);return assignment[token];}
  function parse(level){let result=atom();while(priority[tokens[pos]]>=level){const operator=tokens[pos++],right=parse(priority[operator]+1);result=operator==='∧'?Number(result)+Number(right)===2:operator==='∨'?Number(result)+Number(right)>=1:operator==='⊕'?result!==right:operator==='→'?!(result&&!right):result===right;}return result;}
  const result=parse(1);assert.equal(pos,tokens.length);return result;
}
export function assignments(variables){return Array.from({length:2**variables.length},(_,n)=>Object.fromEntries(variables.map((v,i)=>[v,Boolean(n&(1<<i))])));}
export const flatten=blocks=>blocks.flatMap(b=>[b,...flatten(b.blocks||b.explanation||[])]);
