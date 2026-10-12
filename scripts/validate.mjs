import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {entries,validateLesson,statuses} from '../js/content.js';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const manifest=await json('data/manifest.json'),ids=new Set(),paths=new Set();
assert.equal(manifest.schemaVersion,1);assert.ok(Array.isArray(manifest.chapters));
function identity(entry){assert.match(entry.id,/^[a-z0-9][a-z0-9.-]*$/);assert.ok(!ids.has(entry.id),'Duplicate ID '+entry.id);ids.add(entry.id);assert.ok(typeof entry.title==='string'&&entry.title.trim());assert.ok(entry.number===null||typeof entry.number==='string');assert.ok(Array.isArray(entry.children));}
function check(entry){identity(entry);assert.ok(statuses.includes(entry.status));if(entry.status==='unavailable')assert.equal(entry.path,null);else {assert.equal(entry.path,'data/lessons/'+entry.id+'.json');assert.ok(!paths.has(entry.path));paths.add(entry.path);}entry.children.forEach(check);}
manifest.chapters.forEach(chapter=>{identity(chapter);chapter.children.forEach(check);});
const ajv=new Ajv({allErrors:true}),validate=ajv.compile(await json('data/lesson.schema.json'));
for(const entry of entries(manifest).filter(e=>e.path)){const lesson=await json(entry.path);assert.ok(validate(lesson),JSON.stringify(validate.errors));validateLesson(lesson,entry);}
const files=await readdir('data/lessons');for(const file of files){if(file!=='.gitkeep')assert.ok(paths.has('data/lessons/'+file),'Unregistered lesson '+file);}
async function audit(path){for(const file of await readdir(path,{withFileTypes:true})){const next=path+'/'+file.name;if(file.isDirectory())await audit(next);else {assert.ok(!/\.(pdf|txt|png)$/i.test(file.name),'Source material in public data');const text=await readFile(next,'utf8');assert.ok(!/[A-Z]:[\\/]|\.local[\\/]|refer[\\/]|\ufffd/.test(text),'Private path or invalid UTF-8 in '+next);}}}
await audit('data');await audit('js');
console.log('Validated '+manifest.chapters.length+' navigation groups, '+entries(manifest).length+' entries, '+paths.size+' lessons; public sources contain no private paths.');
