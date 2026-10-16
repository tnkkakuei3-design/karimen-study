// Regression checks for the 2026-10-16 image/content audit.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const read=p=>readFile(new URL(p,import.meta.url));
const ctx=vm.createContext({});
vm.runInContext((await read('./honmen/questions.js')).toString()+';globalThis.bank=HONMEN_DATA.questions',ctx);
const bank=JSON.parse(JSON.stringify(ctx.bank)),get=id=>bank.find(q=>q.id===id);
const review=JSON.parse(await read('./dev/honmen/image-replacements.json')).items;
const ids='h2-018 h8-048 h3-009 h7-034 h10-057 h4-006 h5-049 h7-032 h5-084 h7-022 h5-048 h5-023 h5-036 h5-053 h7-012 h10-069'.split(' ');
for(const id of ids){
 const q=get(id),bytes=await read('./'+q.image);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),q.imageHash,id);
 assert.equal(q.imageHash,review[id].newHash,id);
 assert.notEqual(q.imageHash,review[id].oldHash,id);
 assert.ok(q.imageSources.length&&q.imageAlt,id);
 assert.ok(q.imageSources.every(s=>s.url.startsWith('https://')),id);
}
assert.equal(get('h10-069').imageHash,get('h8-069').imageHash,'same reviewed blue arrow');
assert.match(get('h10-069').imageAlt,/青/);
assert.match(get('h5-036').imageAlt,/二輪車/);
assert.match(get('h5-053').imageAlt,/交差する2本/);
assert.match(get('h7-012').imageAlt,/工事/);
assert.match(get('h5-048').imageAlt,/歩行者と自転車/);
assert.match(get('h3-018').explanation,/安全地帯/);
assert.match(get('h5-056').explanation,/黄信号/);
assert.match(get('h4-013').explanation,/横断歩道・自転車横断帯/);
assert.match(get('h4-025').text,/標識/);
assert.match(get('h5-029').text,/安全を確認せず/);
assert.match(get('h7-022').explanation,/左折する車/);
assert.doesNotMatch(get('h7-022').explanation,/直進/);
for(const id of ['h10-069','h5-053','h5-036','h7-012','h5-056','h7-022','h5-029'])assert.equal(get(id).answer,false,id);
assert.equal(bank.length,760);assert.equal(bank.filter(q=>q.type==='hazard').length,40);
console.log('PASS: 16 image replacements, 7 wording/explanation amendments, 21 unique questions; sources, hashes and critical semantics.');
