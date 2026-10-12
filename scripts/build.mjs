import {cp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const file of ['index.html','styles.css','js','data']) await cp(file,'dist/'+file,{recursive:true,filter:path=>!path.endsWith('.gitkeep')});
const hash=createHash('sha256');
async function fingerprint(directory){for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=directory+'/'+entry.name;if(entry.isDirectory())await fingerprint(path);else{hash.update(path);hash.update(await readFile(path));}}}
await fingerprint('dist');const version=hash.digest('hex').slice(0,12);
const html=(await readFile('dist/index.html','utf8')).replace('href="styles.css"',`href="styles.css?v=${version}"`).replace('src="js/app.js"',`src="js/app.js?v=${version}"`);
await writeFile('dist/index.html',html);
await writeFile('dist/js/app.js',(await readFile('dist/js/app.js','utf8')).replace("from './content.js'",`from './content.js?v=${version}'`));
console.log('Built public-file allowlist with asset version '+version+'.');
