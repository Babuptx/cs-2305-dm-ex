import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assignments,evaluateBoolean,flatten} from './logic-oracle.mjs';
const lesson=JSON.parse(await readFile(new URL('../data/lessons/1.2.json',import.meta.url),'utf8'));
const unit=id=>flatten(lesson.units.find(u=>u.id===id).blocks);
const all=lesson.units.flatMap(u=>flatten(u.blocks));
test('1.2: every column of four truth/bit tables is correct for exhaustive assignments',()=>{
  const tables=all.filter(b=>b.type==='table'&&b.headers.every(h=>/^[a-z¬∧∨⊕→↔()\s]+$/.test(h)));
  assert.equal(tables.length,4);
  for(const table of tables){const variables=table.headers.filter(h=>/^[a-z]$/.test(h)),seen=new Set();assert.equal(table.rows.length,2**variables.length);
    for(const row of table.rows){const values=Object.fromEntries(variables.map((v,i)=>[v,['T','1'].includes(row[i])]));seen.add(JSON.stringify(values));
      table.headers.forEach((formula,i)=>{assert.ok(['T','F','0','1'].includes(row[i]));assert.equal(evaluateBoolean(formula,values),['T','1'].includes(row[i]),formula+' at '+JSON.stringify(values));});
    }assert.equal(seen.size,2**variables.length);
  }
});
test('1.2: translations reject precisely the forbidden cases',()=>{
  const translation=unit('translation').filter(b=>b.type==='math');
  for(const row of assignments(['u','t','s']))assert.equal(evaluateBoolean(translation[0].notation,row),!row.u||row.t||row.s);
  for(const row of assignments(['d','a','c']))assert.equal(evaluateBoolean(translation[1].notation,row),!row.d||(row.a&&row.c));
  const exception=unit('exceptions').find(b=>b.type==='math').notation;
  for(const row of assignments(['o','a','r']))assert.equal(evaluateBoolean(exception,row),!(row.o&&!row.a&&row.r));
});
test('1.2: consistency examples have exactly the stated working assignments',()=>{
  const formula=unit('specifications').find(b=>b.type==='math').notation;
  assert.deepEqual(assignments(['p','q']).filter(v=>evaluateBoolean(formula,v)),[{p:true,q:true}]);
  assert.equal(assignments(['p','q']).filter(v=>evaluateBoolean('('+formula+') ∧ ¬q',v)).length,0);
  assert.deepEqual(assignments(['p','q']).filter(v=>evaluateBoolean('(q → p) ∧ ¬p',v)),[{p:false,q:false}]);
});
test('1.2: the displayed search query produces every stated catalog match',()=>{
  const query=unit('boolean-search').find(b=>b.type==='math').notation;
  const expression=query.replace('"solar power"','p').replace(/\bwind\b/g,'w').replace(/\bstorage\b/g,'s').replace(/\btoy\b/g,'t').replace(/AND/g,'∧').replace(/OR/g,'∨').replace(/NOT/g,'¬');
  const classify=title=>{const text=title.toLowerCase();return evaluateBoolean(expression,{p:/\bsolar power\b/.test(text),w:/\bwind\b/.test(text),s:/\bstorage\b/.test(text),t:/\btoy\b/.test(text)});};
  const table=unit('boolean-search').find(b=>b.type==='table'&&b.headers[0]==='Record title');
  for(const [title,expected] of table.rows)assert.equal(classify(title),expected==='Yes',title);
  assert.equal(classify('Wind storage without toy parts'),false);
});
test('1.2: location puzzle counts and unique solution agree with every displayed row',()=>{
  const rows=unit('location-puzzle').find(b=>b.type==='table').rows;
  for(const [location,...values] of rows){const truth=[location==='Green',location==='Red',location!=='Red'];assert.deepEqual(values.slice(0,3),truth.map(v=>v?'T':'F'));assert.equal(Number(values[3]),truth.filter(Boolean).length);}
  assert.deepEqual(rows.filter(r=>r[4]==='2').map(r=>r[0]),['Green']);
  assert.deepEqual(rows.filter(r=>r[4]==='1').map(r=>r[0]),['Blue','Red']);
});
test('1.2: speaker-type constraints have one solution; mutual endorsement has two',()=>{
  const table=unit('truth-tellers').find(b=>b.type==='table');
  const constraints=table.headers.slice(-2);
  assert.deepEqual(assignments(['a','b']).filter(v=>constraints.every(f=>evaluateBoolean(f,v))),[{a:false,b:true}]);
  assert.deepEqual(assignments(['a','b']).filter(v=>evaluateBoolean('(a ↔ b) ∧ (b ↔ a)',v)),[{a:false,b:false},{a:true,b:true}]);
});
test('1.2: shared-information rounds follow from observation and public answers',()=>{
  const worlds=assignments(['a','b']).filter(v=>v.a||v.b);
  const knows=(world,who,possible)=>{const other=who==='a'?'b':'a';const compatible=possible.filter(w=>w[other]===world[other]);return new Set(compatible.map(w=>w[who])).size===1;};
  const rows=unit('shared-information').find(b=>b.type==='table').rows;
  for(const [a,b,answerA,answerB] of rows){const world={a:a==='T',b:b==='T'};assert.equal(knows(world,'a',worlds),answerA==='Yes');assert.equal(knows(world,'b',worlds),answerB==='Yes');}
  const afterNoNo=worlds.filter(w=>!knows(w,'a',worlds)&&!knows(w,'b',worlds));assert.deepEqual(afterNoNo,[{a:true,b:true}]);
  assert.equal(knows(afterNoNo[0],'a',afterNoNo),true);assert.equal(knows(afterNoNo[0],'b',afterNoNo),true);
});
test('1.2: gate-network evaluation matches the displayed output table and check',()=>{
  const table=unit('building-circuits').find(b=>b.type==='table');
  for(const [p,q,r,...rest] of table.rows){const or=Number(p)|Number(q),not=1-Number(r),output=or&not;assert.deepEqual(rest,[or,not,output].map(String));}
  assert.equal(evaluateBoolean('(p ∧ q) ∨ ¬r',{p:false,q:false,r:false}),true);
  assert.equal(evaluateBoolean('(p ∨ q) ∧ ¬r',{p:false,q:false,r:false}),false);
});
