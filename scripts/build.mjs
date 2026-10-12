import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const file of ['index.html','styles.css','js','data']) await cp(file,'dist/'+file,{recursive:true});
console.log('Built static site from explicit public-file allowlist.');
