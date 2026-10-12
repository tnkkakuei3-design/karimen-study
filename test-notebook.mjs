import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const files = ['questions.js','learning-content.js','cloud-record.js','model.js','visuals.js','notebook-content.js','question-guides.js'];
const ctx = vm.createContext({crypto});
for (const name of files) vm.runInContext(read(name), ctx, { filename:name });
const {Q,FIG,NOTES,QUESTION_GUIDES,NOTE_QUESTION_IDS} = vm.runInContext('({Q,FIG,NOTES,QUESTION_GUIDES,NOTE_QUESTION_IDS})', ctx);
assert.equal(Q.length,500); assert.equal(NOTES.length,65); assert.equal(Object.keys(FIG).length,117);
assert.equal(Object.keys(QUESTION_GUIDES).length,500);
for (const q of Q) {
  const guide=QUESTION_GUIDES[q.id]; assert.ok(guide,`Question ${q.id} has no guide`);
  assert.ok(FIG[guide.figure]);
  for (const id of guide.noteIds) {
    assert.ok(NOTES.find(n=>n.id===id)?.figs.includes(guide.figure));
    assert.ok(NOTE_QUESTION_IDS.get(id).includes(q.id));
  }
}
for (const n of NOTES) {
  assert.ok(n.figs.every(k=>FIG[k]));
  for (const id of NOTE_QUESTION_IDS.get(n.id)) assert.ok(Q.some(q=>q.id===id));
}
for (const figure of ['naurinsa','licenses','stoppos']) assert.ok(NOTES.some(n=>n.figs.includes(figure)));
// Regressions from the full question/diagram audit, including the user's cart sign.
for (const [id,figure] of Object.entries({566:'ban-light',657:'ban-light',317:'weight-sign',612:'arrowsig',497:'naurinsa',530:'naurinsa',369:'stoppos',661:'stoppos',668:'stoppos',416:'moped-signs',559:'moped-signs',786:'handsig-left'})) {
  assert.equal(QUESTION_GUIDES[id].figure,figure,`Wrong teaching topic for ${id}`);
}
assert.match(FIG['ban-light'].cards[0].title,/自転車以外の軽車両/);
assert.match(FIG['ban-light'].cards[1].title,/自転車通行止め/);
assert.match(FIG['weight-sign'].cards[0].text,/総重量/);
assert.match(FIG.stoppos.table.rows[1][1],/横断歩道/);
for(const f of Object.values(FIG))for(const card of f.cards||[]){
  assert.ok(fs.existsSync(new URL(card.image,import.meta.url)),`Missing image ${card.image}`);
  assert.ok(card.alt && card.source?.url?.startsWith('https://'));
}

const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
const dom=new JSDOM(read('index.html'),{url:'https://tnkkakuei3-design.github.io/karimen-study/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
const w=dom.window,context=dom.getInternalVMContext();
w.document.hasFocus=()=>true;w.matchMedia=()=>({matches:false,addEventListener(){}});
w.scrollTo=()=>{};w.requestAnimationFrame=f=>f();w.setInterval=()=>0;
w.HTMLElement.prototype.scrollIntoView=function(){};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
for(const name of [...files,'app.js'])vm.runInContext(read(name),context,{filename:name});
const run=code=>vm.runInContext(code,context),query=s=>w.document.querySelector(s);
const click=s=>{const e=query(s);assert.ok(e,s);e.click();assert.equal(errors.length,0,errors[0]?.message)};
run("state.sound=false;startStudy([566,657],'荷車の標識');model.answer(activeQuestion(566).a);renderPlay();show('play')");
const saved=run('JSON.stringify(state)'),before=w.localStorage.getItem('karimen-study-v4');
assert.equal(query('#play .inline-figure').open,false);
assert.equal(query('#play [data-action="note"]').dataset.fig,'ban-light');
click('#play [data-action="note"]');
assert.equal(query('#n-close').open,true);
assert.equal(w.document.activeElement.dataset.guideFigure,'ban-light');
assert.equal(query('#n-close [data-guide-figure="ban-light"] .guide-cards').children.length,2);
click('#n-close [data-action="figure-open"][data-fig="ban-light"]');
assert.equal(query('#figure-dialog').open,true);
assert.equal(query('#figure-content').querySelectorAll('.guide-card').length,2);
click('[data-action="close-figure"]');click('#n-close [data-action="note-return"]');
assert.equal(query('#play').hidden,false);
assert.equal(run('JSON.stringify(state)'),saved);assert.equal(w.localStorage.getItem('karimen-study-v4'),before);
// Result -> exact diagram -> result retains both scoring and the result filter.
run("lastResult=model.finish();reviewFilter='all';renderResult();show('result')");
const result=run('JSON.stringify(lastResult)');
click('#result [data-action="note"]');click('#notes [data-action="note-return"]');
assert.equal(query('#result').hidden,false);assert.equal(run('JSON.stringify(lastResult)'),result);assert.equal(run('reviewFilter'),'all');
// Search must include the added figure descriptions, not just the old note heading.
run('openNotes()');
query('#note-search').value='二人乗り';query('#note-search').dispatchEvent(new w.Event('input',{bubbles:true}));
assert.ok(query('#n-close'));assert.ok(w.document.querySelectorAll('#notes details.note').length<65);
run("noteSearch='';openNotes('n-licenses','licenses')");
assert.equal(query('#n-licenses .guide-table tbody').children.length,9);
assert.equal(w.document.activeElement.dataset.guideFigure,'licenses');
run("openNotes('n-close','ban-light')");click('#n-close [data-action="note-drill"]');
assert.ok(run("state.session.ids.every(id=>NOTE_QUESTION_IDS.get('n-close').includes(id))"));
assert.equal(run('state.session.ids.length'),10);
// A timed mock must not expose the teaching layer before grading.
run("model.finish();startSet(6,'mock');jump(15)");
assert.equal(query('#play [data-guide-figure]'),null);assert.equal(query('#play [data-action="note"]'),null);
run("openNotes('n-close','ban-light');openFigure('ban-light')");
assert.equal(query('#notes').hidden,true);assert.equal(query('#figure-dialog').open,false);
assert.equal(errors.length,0);dom.window.close();
process.stdout.write('PASS: 500 explicit guide links, published orphan diagrams, reviewed image provenance, exact-figure navigation, unchanged progress, result return, search, note drill and exam isolation.\n');
