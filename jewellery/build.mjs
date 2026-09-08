import {mkdir,copyFile,cp,readFile,writeFile} from 'node:fs/promises';
await mkdir('out/vendor/three',{recursive:true});
for(const file of ['style.css','app.js','model.js'])await copyFile(file,'out/'+file);
const html=(await readFile('index.html','utf8')).replaceAll('./node_modules/three/','./vendor/three/');
await writeFile('out/index.html',html);
await cp('node_modules/three/build','out/vendor/three/build',{recursive:true});
await cp('node_modules/three/examples/jsm','out/vendor/three/examples/jsm',{recursive:true});
await copyFile('node_modules/three/LICENSE','out/vendor/three/LICENSE');
console.log('Static site built in out/');
