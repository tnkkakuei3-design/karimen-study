import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of ['questions.js','learning-content.js','model.js','visuals.js','app.js'])new vm.Script(read(f),{filename:f});
const sandbox={};vm.createContext(sandbox);
vm.runInContext(read('questions.js')+'\n'+read('learning-content.js')+'\nthis.data={Q,ARCHIVED_Q,BANK,WORKSHEETS,ADDED_ART,NOTES,FIG};',sandbox);
const {Q,ARCHIVED_Q,BANK,WORKSHEETS,ADDED_ART,NOTES,FIG}=sandbox.data;
assert.equal(Q.length,500);assert.equal(ARCHIVED_Q.length,408);assert.equal(BANK.length,908);assert.equal(new Set(BANK.map(q=>q.id)).size,908);
assert.equal(Q.filter(q=>q.isReplacement).length,28);assert.equal(Q.filter(q=>q.isSupplemental).length,9);
assert.equal(NOTES.length,47);
for(const [i,w] of WORKSHEETS.entries()){
 assert.equal(w.worksheet,i+1);assert.equal(w.orderedIds.length,50);assert.equal(new Set(w.orderedIds).size,50);
 for(const [j,id] of w.orderedIds.entries()){const q=Q.find(q=>q.id===id);assert.equal(q.worksheet,i+1);assert.equal(q.number,j+1);assert.equal(id,301+i*50+j);}
 assert.equal(w.replacementCount,Q.filter(q=>q.worksheet===i+1&&q.isReplacement).length);
 assert.equal(w.supplementalCount,Q.filter(q=>q.worksheet===i+1&&q.isSupplemental).length);
}
for(const q of Q){
 for(const k of ['topic','q','ex','concept'])assert.equal(typeof q[k],'string',`Problem ${q.id}: ${k}`);
 assert.equal(typeof q.a,'boolean');assert.equal(q.practiceSet,q.worksheet);
 if(q.isReplacement)assert.ok(q.replacementSource?.url&&q.replacementSource?.relationship);
 if(q.fig)assert.ok(FIG[q.fig],`Missing figure ${q.fig}`);
}
const assets=new Set();assert.equal(Object.keys(ADDED_ART).length,104);
for(const [id,items] of Object.entries(ADDED_ART)){
 assert.ok(Q.some(q=>q.id===Number(id)));
 for(const a of items){assert.ok(a.alt);const bytes=fs.readFileSync(path.join(root,a.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);assets.add(a.file);}
}
assert.equal(assets.size,99);
for(const f of ['index.html','app.js','visuals.js','learning-content.js','styles.css'])for(const m of read(f).matchAll(/\.\/(image-[a-z0-9]+\.(?:png|jpg|webp|gif))/g))assert.ok(fs.existsSync(path.join(root,m[1])),`Missing asset ${m[1]}`);
for(const m of read('index.html').matchAll(/(?:src|href)="\.\/([^"?]+)(?:\?[^"?]+)?"/g))assert.ok(fs.existsSync(path.join(root,m[1])),`Missing entry ${m[1]}`);
console.log(`PASS: 500 active / 408 archived; 10 ordered sets; 28 replacements; 9 supplemental; 104 image questions / 99 verified assets; 47 notes.`);
