// Small test-only evaluator for the symbolic formulas displayed in these lessons.
// Quantifiers bind one unary expression; parentheses explicitly widen that scope.
export function parseFormula(input) {
  const tokens=input.match(/∀|∃|¬|∧|∨|→|↔|≠|=|\(|\)|,|[A-Za-z]+/g)||[];
  if(tokens.join('')!==input.replace(/\s/g,''))throw Error('Unsupported formula: '+input);
  let at=0;
  const take=expected=>{const got=tokens[at++];if(expected&&got!==expected)throw Error(`Expected ${expected}, got ${got}: ${input}`);return got;};
  const binary=(next,ops)=>()=>{let left=next();while(ops.includes(tokens[at])){const op=take();left={op,left,right:next()};}return left;};
  function atom(){
    if(tokens[at]==='('){take('(');const node=expression();take(')');return node;}
    const name=take();if(!name)throw Error('Missing expression');
    if(tokens[at]==='('){take('(');const args=[take()];while(tokens[at]===','){take(',');args.push(take());}take(')');return {op:'predicate',name,args};}
    const op=take();if(!['=','≠'].includes(op))throw Error('Expected equality');return {op,left:name,right:take()};
  }
  function unary(){
    if(tokens[at]==='¬'){take();return {op:'not',body:unary()};}
    if(['∀','∃'].includes(tokens[at])){const op=take(),name=take();return {op,name,body:unary()};}
    return atom();
  }
  const and=binary(unary,['∧']),or=binary(and,['∨']);
  function implies(){const left=or();return tokens[at]==='→'?(take(),{op:'→',left,right:implies()}):left;}
  const expression=binary(implies,['↔']);
  const root=expression();if(at!==tokens.length)throw Error('Unconsumed tokens: '+input);return root;
}
export function evaluateFormula(formula,domains,predicates,values={}) {
  const root=typeof formula==='string'?parseFormula(formula):formula;
  function walk(node,env){
    if(node.op==='predicate')return Boolean(predicates[node.name](...node.args.map(k=>env[k])));
    if(node.op==='='||node.op==='≠')return node.op==='='?env[node.left]===env[node.right]:env[node.left]!==env[node.right];
    if(node.op==='not')return !walk(node.body,env);
    if(node.op==='∀'||node.op==='∃'){
      const domain=domains[node.name]??domains.default;
      if(!domain)throw Error('Missing domain: '+node.name);
      return domain[node.op==='∀'?'every':'some'](value=>walk(node.body,{...env,[node.name]:value}));
    }
    const a=walk(node.left,env),b=walk(node.right,env);
    return {'∧':a&&b,'∨':a||b,'→':!a||b,'↔':a===b}[node.op];
  }
  return walk(root,values);
}
export function freeVariables(formula){
  const free=new Set();
  function walk(n,bound){
    if(n.op==='predicate'){for(const a of n.args)if(!bound.has(a))free.add(a);return;}
    if(n.op==='='||n.op==='≠'){for(const a of [n.left,n.right])if(!bound.has(a))free.add(a);return;}
    if(['∀','∃'].includes(n.op)){walk(n.body,new Set([...bound,n.name]));return;}
    if(n.body)walk(n.body,bound);else {walk(n.left,bound);walk(n.right,bound);}
  }
  walk(parseFormula(formula),new Set());return [...free].sort();
}
