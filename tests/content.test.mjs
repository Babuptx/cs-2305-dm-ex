import {test} from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {readFile} from 'node:fs/promises';
import {entries,validateLesson} from '../js/content.js';
const schema=JSON.parse(await readFile(new URL('../data/lesson.schema.json',import.meta.url)));
const check=new Ajv().compile(schema);
const entry={id:'1.1',title:'Propositional Logic',status:'in-progress'};
const fixture=()=>({schemaVersion:1,...entry,references:['Rosen, eighth edition, §1.1'],units:[{id:'fixture',title:'Validation fixture',status:'in-progress',blocks:[{type:'paragraph',text:'Test data, never published.'}]}]});
test('schema and runtime agree on a valid partial lesson',()=>{const lesson=fixture();assert.ok(check(lesson));assert.equal(validateLesson(lesson,entry),lesson);});
test('reject inconsistent IDs, status, unfinished complete units, ragged tables and unsupported blocks',()=>{
  for(const mutate of [x=>x.id='1.2',x=>x.status='complete',x=>x.units[0].blocks=[{type:'table',headers:['A','B'],rows:[['A']]}],x=>x.units[0].blocks=[{type:'script',text:'bad'}],x=>x.units.push(structuredClone(x.units[0]))]){const lesson=fixture();mutate(lesson);assert.throws(()=>validateLesson(lesson,entry));}
  const lesson=fixture();lesson.status='complete';assert.throws(()=>validateLesson(lesson,{...entry,status:'complete'}));
});
test('strict JSON schema rejects extra fields and missing math descriptions',()=>{const lesson=fixture();lesson.extra=true;assert.equal(check(lesson),false);delete lesson.extra;lesson.units[0].blocks=[{type:'math',notation:'p → q'}];assert.equal(check(lesson),false);});
test('recursive navigation retains stable entries and parent chapter',()=>{const chapter={id:'chapter-1',children:[{id:'1.1',children:[{id:'1.1-child',children:[]}]}]};const all=entries({chapters:[chapter]});assert.deepEqual(all.map(e=>e.id),['1.1','1.1-child']);assert.equal(all[1].chapter,chapter);});
