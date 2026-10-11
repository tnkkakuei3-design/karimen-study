import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const ctx={};vm.createContext(ctx);vm.runInContext(['questions.js','model.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+'\nthis.api={KarimenModel,Q,WORKSHEETS,CONTENT_VERSION};',ctx);
const {KarimenModel:M,Q,WORKSHEETS,CONTENT_VERSION}=ctx.api;
const day=86400000, initialTime=Date.parse('2026-10-11T12:00:00Z');
const toPlain=x=>JSON.parse(JSON.stringify(x));
let fixture=0;
function app(old=null,existing=null){
 const fixtureId=++fixture;
 const storage=existing||new Map();if(old)storage.set(M.OLD,JSON.stringify(old));
 const clock={now:initialTime};let count=0,quota=false;
 const store={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(quota)throw Error('quota');storage.set(k,v)}};
 const create=()=>M.create({storage:store,now:()=>clock.now,makeId:()=>`test-${fixtureId}-${clock.now}-${++count}`});
 return {model:create(),storage,clock,create,quota:()=>quota=true};
}
function score(a,n,kind='mock',set=1){
 const w=WORKSHEETS[set-1];a.model.begin({ids:w.orderedIds,kind,worksheet:set,label:`第${set}回`});
 for(let i=0;i<50;i++){a.model.state.session.index=i;a.model.answer(i<n?Q.find(q=>q.id===w.orderedIds[i]).a:!Q.find(q=>q.id===w.orderedIds[i]).a)}
 const result=a.model.finish();a.clock.now+=1000;return result;
}
let a=app();
for(const n of [0,44,45,48,49,50])assert.equal(score(a,n).scoreSnapshot,n);
assert.equal(a.model.state.mockResults[1].best.scoreSnapshot,50);
assert.equal(a.model.state.mockResults[1].recent.length,6);
let r=score(a,48);assert.equal(r.previousScore,50);assert.equal(r.bestScore,50);assert.equal(r.newBest,false);
for(let i=0;i<12;i++)score(a,44);
assert.equal(a.model.state.mockResults[1].recent.length,10);assert.equal(a.model.state.mockResults[1].best.scoreSnapshot,50);
r=score(a,50);assert.equal(r.newBest,false);
const before=a.model.state.attempts.length,totals=JSON.stringify(a.model.state.stats);
a.model.finish();a.model.finish();assert.equal(a.model.state.attempts.length,before);assert.equal(JSON.stringify(a.model.state.stats),totals);
a.model=a.create();assert.equal(a.model.state.attempts.length,before);assert.equal(a.model.state.mockResults[1].best.scoreSnapshot,50);
// Guided scores stay separate; previous score compares only the same mode, round and content.
a=app();score(a,50,'guided');r=score(a,44);assert.equal(r.previousScore,null);assert.equal(r.bestScore,44);r=score(a,48);assert.equal(r.newBest,true);assert.equal(r.previousScore,44);r=score(a,45,'mock',2);assert.equal(r.previousScore,null);
// v2/v3 migration preserves raw storage, archived IDs, unknown IDs, and historical score snapshots.
for(const version of [2,3]){
 const ids=toPlain(WORKSHEETS[0].orderedIds),old={kind:'karimen-progress',version,answerRevision:3,theme:'dark',sound:false,stats:{301:{total:2,correct:1,last:false,reviewAt:initialTime+day,reviewPass:1},1:{total:5,correct:4},99999:{total:7,correct:3}},misses:{301:1,1:2,99999:1},history:[{score:43,form:'A'}],checks:{A:{first:{score:43}}},practiceResults:{1:{best:{at:initialTime-1000,started:initialTime-2000,score:45,total:50,ids,answers:ids.map(id=>!Q.find(q=>q.id===id).a),answerRevision:3},recent:[]}},session:{mode:'drill',pool:'s10',ids,answers:ids.map((_,i)=>i===0?true:null),index:1,started:initialTime-5000,label:'練習問題1'}};
 a=app(old);assert.equal(a.storage.get(M.OLD),JSON.stringify(old));assert.equal(a.model.state.guidedResults[1].best.scoreSnapshot,45);assert.deepEqual(toPlain(a.model.state.mockResults),{});assert.equal(a.model.state.legacyArchive.stats[1].total,5);assert.equal(a.model.state.legacyArchive.stats[99999].total,7);assert.equal(a.model.state.session.worksheet,1);assert.equal(a.model.state.session.index,1);assert.equal(a.model.state.stats[301].reviewPass,1);assert.equal(a.model.state.sound,false);assert.equal(a.model.state.theme,'dark');
 const exported=a.model.exportData(),b=app();assert.ok(b.model.importData(exported));assert.equal(b.model.state.guidedResults[1].best.scoreSnapshot,45);assert.equal(b.model.state.legacyArchive.stats[99999].total,7);
}
a=app({version:3,answerRevision:3,session:{mode:'drill',ids:[301,1],answers:[true,null]}});assert.equal(a.model.state.session,null);assert.equal(a.model.state.legacyArchive.sessions.length,1);
a=app({version:2,answerRevision:2,stats:{366:{total:3,correct:3}},misses:{366:1},session:{mode:'drill',ids:[366],answers:[true],pool:'all'}});assert.equal(a.model.state.stats[366],undefined);assert.equal(a.model.state.legacyArchive.originalState.stats[366].total,3);assert.equal(a.model.state.session.answers[0],null);
// Timer keeps its deadline, late answers cannot change it, and timeout scores once.
a=app();a.model.begin({ids:WORKSHEETS[0].orderedIds,kind:'mock',worksheet:1});const end=a.model.state.session.endAt;a.model.answer(Q[0].a);a.clock.now+=1000;a.model=a.create();assert.equal(a.model.state.session.endAt,end);a.clock.now=end;assert.equal(a.model.expired(),true);assert.equal(a.model.answer(Q[0].a),false);assert.equal(a.model.state.session,null);assert.equal(a.model.state.attempts.length,1);assert.equal(a.model.state.lastResult.scoreSnapshot,1);assert.equal(a.model.state.lastResult.timeout,true);a.model.finish(true);assert.equal(a.model.state.attempts.length,1);
// All-null completion and premature guided completion do not invent answered items.
a=app();a.model.begin({ids:WORKSHEETS[2].orderedIds,kind:'mock',worksheet:3});assert.equal(a.model.finish().scoreSnapshot,0);assert.equal(Object.keys(a.model.state.misses).length,50);
a=app();a.model.begin({ids:[301,302],kind:'study'});a.model.answer(Q[0].a);assert.equal(a.model.state.stats[301].total,1);a.model.finish();assert.equal(a.model.state.stats[301].total,1);assert.equal(a.model.state.stats[302].total,1);
// 24-hour boundary, early practice, uncertainty and wrong answers, including supplemental IDs.
a=app();const id=311,q=Q.find(q=>q.id===id);a.model.record(id,!q.a);const dueAt=a.model.state.stats[id].reviewAt;assert.equal(dueAt,initialTime+day);assert.equal(a.model.schedule().later[0].id,id);
a.clock.now=dueAt-1;assert.equal(a.model.due(id),false);a.model.record(id,q.a);assert.equal(a.model.state.stats[id].reviewPass,0);assert.equal(a.model.state.stats[id].reviewAt,dueAt);
a.clock.now=dueAt;assert.equal(a.model.due(id),true);a.model.record(id,q.a);assert.equal(a.model.state.stats[id].reviewPass,1);assert.equal(a.model.state.stats[id].reviewAt,dueAt+day);
a.clock.now+=day;a.model.record(id,q.a,true);assert.equal(a.model.state.stats[id].reviewPass,0);a.clock.now+=day;a.model.record(id,q.a);a.clock.now+=day;a.model.record(id,q.a);assert.equal(a.model.weak(id),false);
a.model.record(id,!q.a);a.model.record(343,Q.find(q=>q.id===343).a);assert.equal(a.model.weak(id),true);
// Changed content archives unfinished work; historical points are not recalculated.
a=app();r=score(a,48);const raw=a.model.exportData();raw.mockResults[1].best.scoreSnapshot=42;raw.mockResults[1].best.contentVersion='older';raw.attempts=[];raw.mockResults[1].recent=[];const b=app();b.model.importData(raw);assert.equal(b.model.state.mockResults[1].best.scoreSnapshot,42);assert.equal(score(b,45).previousScore,null);
a.model.begin({ids:[301],kind:'study'});const changed=a.model.exportData();changed.session.contentVersion='old-content';b.model.importData(changed);assert.equal(b.model.state.session,null);assert.ok(b.model.state.legacyArchive.sessions.length);
// Storage failures are surfaced without deleting old or corrupt raw data.
a=app({version:3,stats:{301:{total:1,correct:1}},misses:{}});const old=a.storage.get(M.OLD);a.quota();assert.equal(a.model.save(),false);assert.match(a.model.error,/保存できません/);assert.equal(a.storage.get(M.OLD),old);
const corrupt=new Map([[M.STORE,'{invalid']]);a=app(null,corrupt);assert.equal(a.model.state.legacyArchive.corruptRaw,'{invalid');assert.ok([...corrupt.keys()].some(k=>k.startsWith(M.STORE+'-recovery-')));
const brokenStore={getItem:k=>k===M.STORE?'{invalid':null,setItem:()=>{throw Error('quota')}};const blocked=M.create({storage:brokenStore,now:()=>initialTime});assert.equal(blocked.save(),false);assert.match(blocked.error,/上書きを止め/);
a=app();score(a,50);a.model.reset();assert.equal(a.model.state.attempts.length,0);assert.equal(a.model.state.session,null);assert.deepEqual(toPlain(a.model.state.mockResults),{});
console.log('PASS: scoring 0/44/45/48/49/50; timed/guided separation; score snapshots; best beyond 10 attempts; idempotency; v2/v3/v4 migration; raw backups; unknown IDs; resume; timeout; 24h review; supplemental review; import/export; corruption/quota; reset.');
