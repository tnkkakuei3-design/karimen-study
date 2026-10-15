import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {IDBFactory} from 'fake-indexeddb';
const require=createRequire(import.meta.url),M=require('./honmen/model.js');
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const context=vm.createContext({});vm.runInContext(await read('./honmen/questions.js')+'\nglobalThis.data=HONMEN_DATA',context);
const data=JSON.parse(JSON.stringify(context.data)),bank=data.questions,version=data.version;
const ordinary=bank.find(q=>q.type==='boolean'),hazard=bank.find(q=>q.type==='hazard');
const memory=()=>{const rows=new Map([['karimen-study-v4','existing-karimen-record']]);return {rows,getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};};
let clock=1000000;
const make=(storage=memory(),v=version)=>M.create({bank,storage,contentVersion:v,now:()=>clock,random:()=>0.3});
function answerAll(m,wrongBoolean=0,wrongHazard=0){
  const a=m.state.sessions.mock;
  for(let i=0;i<a.ids.length;i++){
    const key=a.keys[i];
    key.forEach((value,j)=>assert.ok(m.answer('mock',i,(key.length===1&&i<wrongBoolean)||(key.length===3&&i<90+wrongHazard&&j===0)?!value:value,j)));
  }
}
function exam(m,set=2){clock++;assert.ok(m.begin({ids:bank.filter(q=>q.set===set).map(q=>q.id),mode:'mock',set,label:'本免練習 '+set}));}
{
  const store=memory(),m=make(store);
  exam(m);answerAll(m);let result=m.finish('mock');assert.equal(result.score,100);assert.equal(result.maxScore,100);assert.equal(result.answered,95);assert.equal(result.partial,false);assert.equal(m.best(2).score,100);
  exam(m);answerAll(m,1,1);result=m.finish('mock');assert.equal(result.score,97,'one hazard error costs exactly two points');
  exam(m);answerAll(m,10);assert.equal(m.finish('mock').score,90);
  exam(m);answerAll(m,11);assert.equal(m.finish('mock').score,89);
  exam(m);m.answer('mock',90,m.state.sessions.mock.keys[90][0],0);result=m.finish('mock');assert.equal(result.score,0);assert.equal(result.answered,0);assert.ok(result.partial);assert.equal(m.best(2).score,100);
  assert.equal(make(store).best(2).score,100,'highest score survives reload');assert.equal(store.getItem('karimen-study-v4'),'existing-karimen-record');
  assert.equal(m.begin({ids:bank.slice(0,94).map(q=>q.id),mode:'mock',set:2}),false,'incomplete mocks are prohibited');
}
{
  const store=memory();let m=make(store);exam(m);clock+=65000;assert.ok(m.pause());assert.equal(m.remaining(),M.DURATION-65000);
  clock+=6000000;assert.equal(m.remaining(),M.DURATION-65000);m=make(store);assert.ok(m.resume('mock'));clock+=3000;assert.ok(m.resume('mock'));assert.equal(m.remaining(),M.DURATION-68000,'duplicate resume cannot add time');
  assert.ok(m.pause());m=make(store);assert.ok(m.resume('mock'));clock+=M.DURATION;assert.ok(m.tick());assert.equal(m.state.sessions.mock,null);assert.ok(m.state.attempts.at(-1).timeout);assert.equal(m.state.attempts.at(-1).partial,false);
  assert.equal(m.tick(),false);assert.equal(m.state.attempts.length,1,'timeout is recorded once');
}
{
  const m=make();
  const practice=(q,answer,mode='study')=>{clock++;assert.ok(m.begin({ids:[q.id],mode}));const slot=mode==='review'?'review':'study';const a=Array.isArray(answer)?answer:[answer];a.forEach((v,i)=>assert.ok(m.answer(slot,0,v,i)));if(q.type==='hazard')assert.ok(m.commitHazard(slot,0));return m.finish(slot);};
  practice(ordinary,!ordinary.answer);assert.ok(m.schedule().due.includes(ordinary.id));
  practice(ordinary,ordinary.answer,'review');assert.equal(m.state.stats[ordinary.id].passes,1);assert.ok(m.schedule().waiting.includes(ordinary.id));
  practice(ordinary,ordinary.answer);assert.equal(m.state.stats[ordinary.id].passes,1,'early repetition does not clear review');
  clock+=M.INTERVAL;practice(ordinary,ordinary.answer,'review');assert.ok(!m.schedule().due.includes(ordinary.id)&&!m.schedule().waiting.includes(ordinary.id));
  practice(hazard,[!hazard.answer[0],hazard.answer[1],hazard.answer[2]]);assert.ok(m.schedule().due.includes(hazard.id));
  practice(hazard,[!hazard.answer[0],hazard.answer[1],hazard.answer[2]],'review');assert.ok(m.schedule().waiting.includes(hazard.id),'repeated errors wait thirty minutes');
  assert.equal(m.state.stats[hazard.id].total,2,'hazard counts as one question');
}
{
  const store=memory(),a=make(store),b=make(store);assert.ok(a.begin({ids:[ordinary.id],mode:'study'}));
  assert.equal(b.begin({ids:[hazard.id],mode:'study'}),false);assert.ok(b.conflicted);assert.equal(a.state.sessions.study.ids[0],ordinary.id);
  const changed=make(store,'new-version');assert.equal(changed.resume('study'),false);assert.match(changed.error,/更新/);assert.ok(changed.finish('study'),'obsolete session can be closed without losing records');
  const original=store.getItem(M.KEY);assert.equal(changed.import('{broken'),false);assert.equal(store.getItem(M.KEY),original);
  assert.equal(changed.import(JSON.stringify({version:4})),false,'karimen cannot be imported into honmen');
  const failing=memory(),m=make(failing);failing.setItem=()=>{throw new Error('quota');};assert.equal(m.begin({ids:[ordinary.id]}),false);assert.equal(m.state.sessions.study,null);
}
{
  const m=make();clock++;assert.ok(m.begin({ids:[hazard.id],mode:'study'}));hazard.answer.forEach((v,i)=>m.answer('study',0,v,i));assert.equal(m.state.stats[hazard.id],undefined,'hazard must be submitted');
  m.finish('study');assert.equal(m.state.stats[hazard.id],undefined);assert.equal(m.state.attempts.at(-1).score,0);
  clock++;m.begin({ids:[hazard.id],mode:'study'});hazard.answer.forEach((v,i)=>m.answer('study',0,v,i));assert.ok(m.commitHazard('study',0));assert.equal(m.commitHazard('study',0),false);assert.equal(m.answer('study',0,!hazard.answer[0],0),false);assert.equal(m.finish('study').score,2);
}
{
  const storageCode=await read('./honmen/storage.js');
  const original=(await read('./progress-storage.js')).replaceAll('KarimenStorage','HonmenStorage').replaceAll('karimen-study-v4','honmen-study-v1').replaceAll('karimen-progress-backups','honmen-progress-backups').replace('data.version > 4','data.version > 1');
  assert.equal(storageCode,original,'same tested backup implementation with isolated names and version');
  const c=vm.createContext({setTimeout,clearTimeout});vm.runInContext(storageCode+'\nglobalThis.S=HonmenStorage',c);
  const store=memory(),idb=new IDBFactory();let adapter=await c.S.open({storage:store,indexedDB:idb,validate:M.normalize,build:version});
  let m=make(adapter);m.begin({ids:[ordinary.id]});m.answer('study',0,ordinary.answer);await adapter.flush();adapter.close();
  const saved=store.getItem(M.KEY);store.setItem(M.KEY,'{broken');adapter=await c.S.open({storage:store,indexedDB:idb,validate:M.normalize,build:version});
  assert.equal(adapter.getItem(M.KEY),saved);assert.ok(adapter.status.recovered);assert.equal(store.getItem('karimen-study-v4'),'existing-karimen-record');await adapter.flush();adapter.close();
}
{
  const visuals=await read('./visuals.js'),ui=await read('./honmen/ui.js');
  assert.ok(ui.includes(visuals.slice(0,visuals.indexOf('const CATS='))));
  assert.ok(ui.includes(visuals.slice(visuals.indexOf('function flowerStamp('),visuals.indexOf('function achievementHTML('))));
}
// DOM behavior checks; this does not substitute for a real browser layout check.
const html=await read('./honmen.html');
const dom=new JSDOM(html,{url:'https://example.test/honmen.html',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
let uiTime=Date.now();w.Date.now=()=>uiTime;
w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
w.matchMedia=()=>({matches:false,addEventListener(){}});
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
Object.defineProperty(w,'indexedDB',{value:new IDBFactory()});
w.localStorage.setItem('karimen-study-v4','keep-this-existing-progress');
for(const script of w.document.querySelectorAll('script[src]')){const file=script.getAttribute('src').split('?')[0];vm.runInContext(await read(file),dom.getInternalVMContext());}
assert.equal(await w.HonmenReady,true,w.document.getElementById('startup-status').textContent);
const doc=w.document,app=w.HonmenApp;
const click=selector=>{const el=doc.querySelector(selector);assert.ok(el,'missing '+selector);assert.ok(!el.disabled,'disabled '+selector);el.click();};
const settle=async()=>{await new Promise(resolve=>setTimeout(resolve,10));await app.storage.flush();};
assert.equal(doc.querySelectorAll('#mock .set-card').length,8);
assert.equal(doc.querySelector('.course-picker a[aria-current]').textContent.trim(),'本免95問・50分');
click('[data-h="set"][data-set="2"]');click('[data-h="start-set"][data-mode="mock"]');assert.equal(app.view,'play');
assert.ok(!doc.querySelector('#play .feedback'));assert.equal(doc.getElementById('timer').textContent,'残り 50:00');
const beforeBlur=app.model.remaining();w.dispatchEvent(new w.Event('blur'));uiTime+=60000;assert.equal(app.model.remaining(),beforeBlur,'blur pauses timer without hiding document');
w.dispatchEvent(new w.Event('focus'));uiTime+=1000;assert.equal(app.model.remaining(),beforeBlur-1000);
w.dispatchEvent(new w.Event('focus'));uiTime+=1000;assert.equal(app.model.remaining(),beforeBlur-2000,'duplicate focus must not add time');

click('#play [data-h="answer"][data-value="true"]');assert.ok(!doc.querySelector('#play .feedback'),'mock does not leak answers');
click('[data-h="jump"][data-index="90"]');assert.equal(doc.querySelectorAll('#play fieldset').length,3);assert.equal(doc.querySelectorAll('#play [data-h="answer"]').length,6);
click('#play [data-h="answer"][data-part="0"][data-value="true"]');click('[data-h="pause"]');assert.ok(doc.querySelector('[data-h="confirm-pause"]'));click('[data-h="confirm-pause"]');await settle();assert.equal(app.view,'mock');
click('[data-h="resume"][data-slot="mock"]');assert.equal(app.model.state.sessions.mock.index,90);assert.equal(doc.querySelector('#play [data-part="0"][data-value="true"]').getAttribute('aria-pressed'),'true');
click('[data-h="finish"]');assert.ok(doc.querySelector('#h-dialog .h-dialog-close').hidden,'confirmation has no duplicate close action');click('[data-h="confirm-finish"]');assert.equal(app.view,'result');assert.ok(app.model.state.attempts.at(-1).partial);
click('[data-h="tab"][data-tab="learn"]');click('[data-h="hazard"]');assert.equal(app.view,'play');assert.ok(doc.querySelector('[data-h="commit"]').disabled);
const current=app.model.state.sessions.study,q=app.model.byId.get(current.ids[0]);
assert.equal(new Set(current.ids.map(id=>app.model.byId.get(id).imageHash)).size,5,'hazard drill uses five different scenes');
q.answer.forEach((v,i)=>click(`#play [data-h="answer"][data-part="${i}"][data-value="${v}"]`));
assert.ok(!doc.querySelector('#play .feedback'));click('[data-h="commit"]');assert.match(doc.querySelector('#play .feedback').textContent,/正解です・2点/);
assert.equal(doc.querySelectorAll('#play [data-h="answer"]').length,0,'answered practice shows feedback instead of duplicate answer controls');
assert.equal(doc.querySelectorAll('#play .h-statement-reasons li').length,3);
assert.ok(doc.querySelector('#play .learning-points .point-main'));
assert.equal(doc.querySelector('#play .learning-points h3').textContent.trim(),'覚えるポイント');
assert.equal(doc.querySelectorAll('#play .question-links [data-h="answer-note"]').length,1);
assert.ok(doc.querySelector('#play .inline-figure'));
assert.ok(doc.querySelector('#play .question-visual .question-visual-head'));
assert.ok(!doc.querySelector('#play .question-links .btn'),'notebook link uses the shared text action');
const beforeNote=JSON.stringify(app.model.state.sessions.study);
click('#play [data-h="answer-note"]');assert.equal(app.view,'notes');assert.ok(doc.querySelector('#notes .h-note-flow'));assert.ok(!doc.getElementById('h-dialog').open);assert.match(doc.querySelector('#notes [data-h="note-return"]').textContent,/解いていた問題に戻る/);
assert.match(doc.querySelector('#notes details[open] .note-bottom [data-h="note-return"]').textContent,/解いていた問題に戻る/);click('#notes details[open] .note-bottom [data-h="note-return"]');assert.equal(app.view,'play');assert.equal(JSON.stringify(app.model.state.sessions.study),beforeNote,'note round trip preserves answer and position');
assert.ok(doc.querySelector('#play a.source-link[href^="https://"]'),'every explanation provides official reference');
click('[data-h="figure"]');assert.ok(doc.getElementById('figure-dialog').open);
const zoom=doc.getElementById('figure-zoom');zoom.value='200';zoom.dispatchEvent(new w.Event('input',{bubbles:true}));
assert.equal(doc.getElementById('figure-content').style.zoom,'2');click('[data-h="close-figure"]');
click('[data-h="figure"]');assert.equal(doc.getElementById('figure-content').style.zoom,'1');assert.equal(zoom.value,'100');click('[data-h="close-figure"]');
click('[data-h="pause"]');await settle();click('[data-h="settings"]');
click('[data-h="theme"][data-value="dark"]');assert.equal(doc.documentElement.dataset.theme,'dark');
assert.ok(doc.querySelector('[data-h="reset"]').disabled,'unfinished work protects reset');click('[data-h="close"]');click('[data-h="resume"][data-slot="study"]');click('[data-h="finish"]');click('[data-h="confirm-finish"]');click('[data-h="settings"]');click('[data-h="reset"]');click('[data-h="confirm-reset"]');await settle();assert.equal(Object.keys(app.model.state.stats).length,0);assert.equal(w.localStorage.getItem('karimen-study-v4'),'keep-this-existing-progress');
// Every hazard has three specific reasons; topic drills must respect the selected note.
for(const question of bank.filter(q=>q.type==='hazard'))assert.equal(w.HonmenTeaching[question.id].length,3);
click('[data-h="tab"][data-tab="learn"]');click('[data-h="learn-section"][data-value="notes"]');
assert.equal(doc.querySelectorAll('[data-h-note]').length,71);
for(const el of doc.querySelectorAll('[data-h-note]')){w.HonmenNotes.populate(el,bank);assert.ok(el.querySelector('.note-content').textContent.length>20);}
assert.ok(w.HonmenNotes.questions('n-rail',bank).every(q=>/踏切/.test(q.text)));
assert.equal(w.HonmenNotes.questions('h-hazard',bank).length,40);
click('[data-h="note-drill"][data-note="n-rail"]');
assert.ok(app.model.state.sessions.study.ids.every(id=>/踏切/.test(app.model.byId.get(id).text)));
assert.match(app.model.state.sessions.study.label,/踏切/);
const ids=[...doc.querySelectorAll('[id]')].map(el=>el.id);assert.equal(new Set(ids).size,ids.length);
// Only unanswered items are selected under the category's unlearned filter.
app.model.finish('study');assert.ok(app.model.reset());
const category=ordinary.category,categoryQuestions=bank.filter(q=>q.category===category),remaining=categoryQuestions.slice(0,3);
assert.ok(app.model.begin({ids:categoryQuestions.slice(3).map(q=>q.id),mode:'study'}));
categoryQuestions.slice(3).forEach((q,i)=>app.model.answer('study',i,q.answer,0));app.model.finish('study');
click('[data-h="tab"][data-tab="learn"]');click('[data-h="learn-section"][data-value="categories"]');click('[data-h="category-filter"][data-value="new"]');
click(`[data-h="category"][data-category="${category}"]`);
assert.equal(app.model.state.sessions.study.ids.length,3);
assert.deepEqual([...app.model.state.sessions.study.ids].sort(),remaining.map(q=>q.id).sort());
assert.match(app.model.state.sessions.study.label,/3問$/);
// A category result starts only currently due questions, then shows graduation progress.
let active=app.model.state.sessions.study;const first=app.model.byId.get(active.ids[0]);
click(`#play [data-h="answer"][data-value="${!first.answer}"]`);
assert.ok(doc.querySelector('#play .review-schedule-note.review-again-card'));
click('[data-h="finish"]');click('[data-h="confirm-finish"]');
assert.ok(doc.querySelector('#result .review-item .review-body'));
assert.ok(doc.querySelector('#result .weak-topic .topic-summary'));
click(`#result [data-h="result-category"][data-category="${category}"]`);
assert.equal(app.model.state.sessions.review.ids.length,1);
click(`#play [data-h="answer"][data-value="${first.answer}"]`);
click('[data-h="finish"]');click('[data-h="confirm-finish"]');
assert.match(doc.querySelector('#result .notice').textContent,/正解あと1回 1問/);
assert.ok(!doc.querySelector('#result [data-h="result-category"]:not(:disabled)'),'waiting questions cannot be immediately reviewed');
click('[data-h="result-filter"][data-value="all"]');
const openResult=doc.querySelector('#result .h-result-question');openResult.open=true;

uiTime+=31*60*1000;await new Promise(resolve=>setTimeout(resolve,1100));
assert.ok(doc.querySelector('#result [data-h="result-review"]:not(:disabled)'),'due review becomes available without leaving results');
assert.ok(doc.querySelector('#result [data-h="result-category"]'),'category review also refreshes');
assert.ok(doc.querySelector('#result .h-result-question').open,'refresh keeps explanation open');
click('#result [data-h="result-review"]');
click(`#play [data-h="answer"][data-value="${first.answer}"]`);
click('[data-h="finish"]');click('[data-h="confirm-finish"]');
assert.match(doc.querySelector('#result .notice').textContent,/今回復習した問題は卒業/);
// Historical comparisons stay at the time of the attempt; perfect results show all answers.
assert.ok(app.model.reset());
function recordExam(wrong=0,flag=false){uiTime++;app.model.begin({ids:bank.filter(q=>q.set===2).map(q=>q.id),mode:'mock',set:2});const a=app.model.state.sessions.mock;a.keys.forEach((key,i)=>key.forEach((v,j)=>app.model.answer('mock',i,i<wrong?!v:v,j)));if(flag)app.model.flag('mock',0);return app.model.finish('mock');}
const firstExam=recordExam(10),secondExam=recordExam(0),flaggedExam=recordExam(0,true);
assert.equal(firstExam.bestScoreAtCompletion,90);assert.equal(secondExam.bestScoreAtCompletion,100);assert.equal(secondExam.previousScoreAtCompletion,90);
click('[data-h="tab"][data-tab="mock"]');click('[data-h="set"][data-set="2"]');
click(`[data-h="history"][data-record="${firstExam.id}"]`);assert.match(doc.querySelector('#result .comparison').textContent,/今回までの最高点90/);assert.match(doc.querySelector('#result .result-character').src,/D004/);
click('[data-h="tab"][data-tab="mock"]');click('[data-h="set"][data-set="2"]');click(`[data-h="history"][data-record="${secondExam.id}"]`);
assert.equal(doc.querySelector('#result [data-h="result-filter"][aria-pressed="true"]').dataset.value,'all');assert.equal(doc.querySelectorAll('#result .h-result-question').length,95);assert.match(doc.querySelector('#result .result-character').src,/D006/);
const selectedResult=doc.querySelector('#result [data-h="answer-note"]').closest('details.review-item');selectedResult.open=true;
click('#result [data-h="answer-note"]');assert.equal(app.view,'notes');assert.match(doc.querySelector('#notes [data-h="note-return"]').textContent,/結果に戻る/);click('#notes [data-h="note-return"]');assert.equal(app.view,'result');assert.ok(selectedResult.open);
click('[data-h="tab"][data-tab="mock"]');click('[data-h="set"][data-set="2"]');click(`[data-h="history"][data-record="${flaggedExam.id}"]`);
assert.equal(doc.querySelector('#result [data-h="result-filter"][aria-pressed="true"]').dataset.value,'uncertain');
uiTime++;app.model.begin({ids:bank.filter(q=>q.set===2).map(q=>q.id),mode:'guided',set:2});app.model.finish('study');
click('[data-h="tab"][data-tab="mock"]');click('[data-h="set"][data-set="2"]');
const headings=[...doc.querySelectorAll('#h-dialog h3')].map(el=>el.textContent);assert.ok(headings.includes('50分模試の記録'));assert.ok(headings.includes('途中終了の記録'));
click('[data-h="close"]');click('[data-h="settings"]');assert.ok(!doc.querySelector('#h-dialog .h-dialog-close').hidden);
const snapshotBeforePreview=JSON.stringify(app.model.state);
click('[data-h="preview"][data-score="90"]');assert.ok(doc.querySelector('.result-confetti'));
click('[data-h="preview"][data-score="100"]');assert.ok(doc.querySelector('.result-confetti'),'second preview animates');
click('[data-h="preview"][data-score="90"]');assert.ok(doc.querySelector('.result-confetti'),'repeated preview animates');
assert.equal(JSON.stringify(app.model.state),snapshotBeforePreview,'preview does not alter learning records');click('#h-dialog [data-h="close"]');
function recordGuided(wrong=0){uiTime++;assert.ok(app.model.begin({ids:bank.filter(q=>q.set===2).map(q=>q.id),mode:'guided',set:2}));const a=app.model.state.sessions.study;a.keys.forEach((key,i)=>{key.forEach((v,j)=>assert.ok(app.model.answer('study',i,i<wrong?!v:v,j)));if(key.length===3)assert.ok(app.model.commitHazard('study',i));});return app.model.finish('study');}
const mockBest=app.model.best(2).id,guidedFirst=recordGuided(10),guidedSecond=recordGuided(0);
assert.equal(guidedFirst.previousScoreAtCompletion,null);assert.equal(guidedSecond.previousScoreAtCompletion,90);assert.equal(guidedSecond.bestScoreAtCompletion,100);
assert.equal(app.model.best(2).id,mockBest,'guided scores must not change mock pass records');
click('[data-h="tab"][data-tab="mock"]');click('[data-h="set"][data-set="2"]');click(`[data-h="history"][data-record="${guidedSecond.id}"]`);
assert.ok(doc.querySelector('#result .flower-stamp'));assert.match(doc.querySelector('#result .result-achievement').textContent,/合格の目安/);
assert.match(doc.querySelector('#result .comparison').textContent,/\+10点/);
click('[data-h="tab"][data-tab="mock"]');click('[data-h="set"][data-set="2"]');click(`[data-h="history"][data-record="${guidedFirst.id}"]`);
assert.match(doc.querySelector('#result .comparison').textContent,/今回までの最高点90/);
await app.storage.flush();app.storage.close();dom.window.close();
console.log('Honmen tests passed: weighted grading, boundaries, timer, resumes, spaced review, storage recovery/isolation, stale tabs, import protection, and UI flows.');
