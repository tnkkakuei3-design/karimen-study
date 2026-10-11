import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of ['questions.js','learning-content.js','app.js'])new vm.Script(read(f),{filename:f});
const sandbox={};vm.createContext(sandbox);vm.runInContext(read('questions.js')+'\nthis.bank=BANK;this.practice=Q;this.forms=ASSESSMENT_FORMS;',sandbox);
for(const q of sandbox.bank){
 for(const k of ['topic','q','ex','concept'])if(typeof q[k]!=='string'||!q[k].trim())throw Error(`Problem ${q.id}: missing ${k}`);
 if(q.practiceSet!==undefined&&(!Number.isInteger(q.practiceSet)||q.practiceSet<1))throw Error(`Problem ${q.id}: invalid practiceSet`);
}
for(const [name,qs] of Object.entries(sandbox.forms))if(qs.length!==50)throw Error(`Test ${name}: expected 50 questions`);
for(const f of ['index.html','app.js','learning-content.js','styles.css'])for(const m of read(f).matchAll(/\.\/(image-[a-z0-9]+\.(?:png|jpg|webp|gif))/g))if(!fs.existsSync(path.join(root,m[1])))throw Error(`Missing asset ${m[1]}`);
console.log(`OK: ${sandbox.bank.length} unique questions; ${new Set(sandbox.practice.map(q=>q.practiceSet).filter(Boolean)).size} practice sets; ${Object.keys(sandbox.forms).length} assessment forms; linked images available.`);
