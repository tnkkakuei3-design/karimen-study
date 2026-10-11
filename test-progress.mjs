import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const source=['questions.js','learning-content.js','app.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const day=86400000, start=Date.parse('2026-10-11T12:00:00Z');
function app(initial=null){
 const clock={now:start},nodes={},listeners={},storage=new Map(),downloads=[];
 if(initial)storage.set('karimen-study-v2',JSON.stringify(initial));
 const element=id=>nodes[id]??={innerHTML:'',textContent:'',value:'',hidden:false,open:false,style:{},dataset:{},events:{},
  setAttribute(){},addEventListener(k,fn){this.events[k]=fn},querySelectorAll(){return []},querySelector(){return null},
  focus(){},scrollIntoView(){},showModal(){this.open=true},close(){this.open=false},click(){},remove(){}};
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock.now]))}static now(){return clock.now}}
 class RecordBlob{constructor(parts){this.parts=parts}}
 const ctx={console,Date:ClockDate,Map,Set,Math,JSON,Blob:RecordBlob,
  URL:{createObjectURL(blob){downloads.push(JSON.parse(blob.parts.join('')));return 'blob:test'},revokeObjectURL(){}},
  document:{getElementById:element,documentElement:{dataset:{}},body:{dataset:{},append(){}},createElement:()=>element('download'),
   addEventListener(k,fn){(listeners[k]??=[]).push(fn)},querySelectorAll(){return []},querySelector(){return null}},
  window:{addEventListener(){},scrollTo(){}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
  matchMedia:()=>({matches:false,addEventListener(){}}),location:{hash:''},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},requestAnimationFrame(fn){fn()}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const run=code=>vm.runInContext(code,ctx),json=code=>JSON.parse(run(`JSON.stringify(${code})`));
 return {clock,nodes,storage,downloads,run,json,
  click(action){for(const fn of listeners.click||[])fn({target:{closest:selector=>selector==='[data-action]'?{dataset:{action},disabled:false}:null}})},
  confirm(){element('confirm-yes').events.click()}};
}
function finishSet(a,score){
 a.run(`state.session=null;beginDrill('s10');state.session.answers=state.session.ids.map((id,i)=>i<${score}?byId.get(id).a:!byId.get(id).a);state.session.ids.forEach((id,i)=>record(id,state.session.answers[i]));completeDrill();`);
 a.clock.now+=1000;
}

// Old records and an unfinished drill retain their meaning, with no inferred pass.
const baseline=app();
const ids=baseline.json("pool('s10').map(q=>q.id)");
const firstTest=baseline.json("({at:Date.now(),score:50,total:50,ids:ASSESSMENT_FORMS.A.map(q=>q.id),answers:ASSESSMENT_FORMS.A.map(q=>q.a),examKind:'assessment',form:'A',firstAttempt:true,blueprint:BLUEPRINT_VERSION})");
for(const version of [2,3]){
 const old={version,answerRevision:3,misses:{[ids[0]]:1},stats:{[ids[0]]:{total:2,correct:1,last:false,lastAt:start-1000,reviewAt:start+day,reviewPass:0}},
  checks:{A:{first:firstTest,startedAt:start-1000,completed:true}},history:[firstTest],theme:'dark',sound:false,limit:20,
  session:{mode:'drill',pool:'s10',label:'練習問題1',ids,answers:ids.map((_,i)=>i===0?true:null),index:1,started:start-2000}};
 const a=app(old);
 assert.equal(a.run('VERSION'),3);assert.equal(a.run('state.stats['+ids[0]+'].total'),2);
 assert.equal(a.run('state.session.index'),1);assert.equal(a.run('state.session.answers[0]'),true);
 assert.equal(a.run('state.checks.A.first.score'),50);assert.equal(a.run('state.history.length'),1);
 assert.equal(a.run('state.theme'),'dark');assert.equal(a.run('state.sound'),false);
 assert.deepEqual(a.json('state.practiceResults'),{});
 assert.ok(!a.run('practiceCardHTML(SOURCES[0])').includes('合格済み'));
}

// Whole-set results distinguish answering every question from earning a pass.
const scored=app();finishSet(scored,44);
assert.equal(scored.run('state.practiceResults[1].best.score'),44);
assert.ok(scored.run('practiceCardHTML(SOURCES[0])').includes('あと1点'));
assert.ok(!scored.run('practiceCardHTML(SOURCES[0])').includes('合格済み'));
finishSet(scored,45);assert.ok(scored.run('practiceCardHTML(SOURCES[0])').includes('合格済み'));
finishSet(scored,50);assert.ok(scored.run('practiceCardHTML(SOURCES[0])').includes('満点合格済み'));
for(let i=0;i<12;i++)finishSet(scored,40);
assert.equal(scored.run('state.practiceResults[1].best.score'),50);
assert.equal(scored.run('state.practiceResults[1].recent.length'),10);
assert.equal(scored.run('state.practiceResults[1].recent.at(-1).score'),40);
assert.ok(!scored.run('practiceCardHTML(SOURCES[1])').includes('合格済み'));
const saved=JSON.parse(scored.storage.get('karimen-study-v2'));
const reloaded=app(saved);assert.equal(reloaded.run('state.practiceResults[1].best.score'),50);
assert.equal(reloaded.run('state.practiceResults[1].recent.at(-1).score'),40);
reloaded.run('showPracticeResult(1)');assert.equal(reloaded.run('lastResult.answers.length'),50);
assert.ok(!reloaded.nodes.app.innerHTML.includes('result-confetti'));

// Non-set practice, partial sets and untrusted score fields cannot grant badges.
assert.equal(scored.run("savePracticeAttempt({pool:'mix',ids:pool('s10').map(q=>q.id),answers:pool('s10').map(q=>q.a)})"),false);
assert.equal(scored.run("savePracticeAttempt({pool:'s10',ids:pool('s10').slice(0,10).map(q=>q.id),answers:pool('s10').slice(0,10).map(q=>q.a)})"),false);
assert.equal(scored.run("cleanPracticeEntry({...state.practiceResults[1].best,ids:Array(50).fill(SOURCES[0].number)},SOURCES[0])"),null);
assert.equal(scored.run("cleanPracticeEntry({...state.practiceResults[1].recent.at(-1),score:50},SOURCES[0]).score"),40);
assert.equal(scored.run("cleanPracticeEntry({...state.practiceResults[1].best,at:1e30},SOURCES[0])"),null);

// Due time is inclusive; early correct answers do not bypass spaced review.
const review=app();const id=ids[0];
review.run(`record(${id},!byId.get(${id}).a)`);
assert.equal(review.run('reviewSchedule().due.length'),0);assert.equal(review.run('reviewSchedule().later.length'),1);
review.clock.now+=day-1;assert.equal(review.run('reviewSchedule().due.length'),0);
review.clock.now+=1;assert.equal(review.run('reviewSchedule().due.length'),1);
review.run(`record(${id},byId.get(${id}).a)`);
assert.equal(review.run(`state.stats[${id}].reviewPass`),1);
assert.ok(review.run(`reviewProgressHTML(byId.get(${id}))`).includes('あと1回'));
review.run(`record(${id},byId.get(${id}).a)`);
assert.equal(review.run(`state.stats[${id}].reviewPass`),1);
review.clock.now+=day;review.run(`record(${id},byId.get(${id}).a)`);
assert.equal(review.run('reviewSchedule().all.length'),0);
review.run(`record(${id},byId.get(${id}).a,true)`);
assert.equal(review.run(`state.stats[${id}].reviewPass`),0);
assert.ok(review.run(`reviewProgressHTML(byId.get(${id}))`).includes('あと2回'));
review.run(`state.misses[${ids[1]}]=1;state.stats[${ids[1]}]={total:1,correct:0,last:false,lastAt:0,reviewAt:Date.now()-1};beginDrill('due')`);
assert.deepEqual(review.json('state.session.ids'),[ids[1]]);
review.run('leavePlay()');assert.deepEqual(review.json('state.session.ids'),[ids[1]]);
review.run('lastResult={mode:"drill"};resume()');assert.equal(review.run('document.body.dataset.view'),'play');assert.deepEqual(review.json('state.session.ids'),[ids[1]]);

// Export/import includes badge records and re-computes scores from saved answers.
scored.run('downloadRecord()');const exported=scored.downloads.at(-1);
assert.equal(exported.version,3);assert.equal(exported.practiceResults[1].best.score,50);
const imported=app();const data=JSON.stringify(exported);
await imported.run(`importRecord({size:${data.length},text:async()=>${JSON.stringify(data)}})`);
assert.deepEqual(imported.json('state.practiceResults'),{});imported.confirm();
assert.equal(imported.run('state.practiceResults[1].best.score'),50);
assert.equal(imported.run('state.practiceResults[1].recent.at(-1).score'),40);
const oldExport={...exported,version:3};delete oldExport.practiceResults;
const oldData=JSON.stringify(oldExport);
await imported.run(`importRecord({size:${oldData.length},text:async()=>${JSON.stringify(oldData)}})`);imported.confirm();
assert.deepEqual(imported.json('state.practiceResults'),{});assert.ok(imported.run('Object.keys(state.stats).length')>0);
const reset=app(saved);reset.click('reset');reset.confirm();
assert.deepEqual(reset.json('state.practiceResults'),{});assert.deepEqual(reset.json('state.stats'),{});
console.log('PASS: v2/v3 migration; unfinished drills; 44/45/50-point set badges; highest score beyond 10 attempts; reload; review time boundaries; export/import; record reset.');
