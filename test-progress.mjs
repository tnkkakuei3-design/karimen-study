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
 const clock={now:initialTime};let count=0,quota=false,seed=fixtureId;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const store={getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(quota)throw Error('quota');storage.set(k,v)}};
 const create=()=>M.create({storage:store,random,now:()=>clock.now,makeId:()=>`test-${fixtureId}-${clock.now}-${++count}`});
 return {model:create(),storage,clock,create,quota:()=>quota=true};
}
function score(a,n,kind='mock',set=1){
 const w=WORKSHEETS[set-1];a.model.begin({ids:w.orderedIds,kind,worksheet:set,label:`第${set}回`});
 for(let i=0;i<50;i++){a.model.state.session.index=i;a.model.answer(i<n?Q.find(q=>q.id===a.model.state.session.ids[i]).a:!Q.find(q=>q.id===a.model.state.session.ids[i]).a)}
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
a=app();a.model.begin({ids:WORKSHEETS[0].orderedIds,kind:'mock',worksheet:1});const end=a.model.state.session.endAt;a.model.answer(Q.find(q=>q.id===a.model.state.session.ids[0]).a);a.clock.now+=1000;a.model=a.create();assert.equal(a.model.state.session.endAt,end);a.clock.now=end;assert.equal(a.model.expired(),true);assert.equal(a.model.answer(Q[0].a),false);assert.equal(a.model.state.session,null);assert.equal(a.model.state.attempts.length,1);assert.equal(a.model.state.lastResult.scoreSnapshot,1);assert.equal(a.model.state.lastResult.timeout,true);a.model.finish(true);assert.equal(a.model.state.attempts.length,1);
// All-null completion and premature guided completion do not invent answered items.
a=app();a.model.begin({ids:WORKSHEETS[2].orderedIds,kind:'mock',worksheet:3});assert.equal(a.model.finish().scoreSnapshot,0);assert.equal(Object.keys(a.model.state.misses).length,0);
a=app();a.model.begin({ids:[301,302],kind:'study'});a.model.answer(Q[0].a);assert.equal(a.model.state.stats[301].total,1);a.model.finish();assert.equal(a.model.state.stats[301].total,1);assert.equal(a.model.state.stats[302],undefined);
// Immediate first review, exact 30-minute boundary, and reset on failure.
a=app();const id=311,q=Q.find(q=>q.id===id),interval=30*60*1000;
a.model.record(id,!q.a);assert.equal(a.model.state.stats[id].reviewAt,initialTime);assert.equal(a.model.due(id),true);
a.model.record(id,q.a);assert.equal(a.model.state.stats[id].reviewPass,1);
const dueAt=a.model.state.stats[id].reviewAt;assert.equal(dueAt,initialTime+interval);
a.clock.now=dueAt-1;a.model.record(id,q.a);assert.equal(a.model.state.stats[id].reviewPass,1);assert.equal(a.model.due(id),false);assert.equal(a.model.state.stats[id].reviewAt,dueAt);
a.clock.now=dueAt;assert.equal(a.model.due(id),true);a.model.record(id,q.a);assert.equal(a.model.weak(id),false);
a.model.record(id,!q.a);assert.equal(a.model.due(id),true);
a.model.record(id,!q.a);assert.equal(a.model.due(id),false);assert.equal(a.model.state.stats[id].reviewPass,0);
a.clock.now+=interval;a.model.record(id,q.a,true);assert.equal(a.model.due(id),false);assert.equal(a.model.state.stats[id].reviewPass,0);
a.clock.now+=interval;a.model.record(id,q.a);a.clock.now+=interval;a.model.record(id,q.a);assert.equal(a.model.weak(id),false);
a.model.record(id,!q.a);a.model.record(343,Q.find(q=>q.id===343).a);assert.equal(a.model.weak(id),true);
// Old schedules shorten once, retaining scores and first successful review.
const oldSchedule=a.model.exportData();delete oldSchedule.reviewPolicy;oldSchedule.stats[id].reviewPass=1;oldSchedule.stats[id].reviewAt=initialTime+day;
const migrated=M.normalize(oldSchedule);assert.equal(migrated.stats[id].reviewAt,initialTime+interval);assert.equal(migrated.stats[id].reviewPass,1);
assert.equal(migrated.stats[id].total,oldSchedule.stats[id].total);assert.deepEqual(toPlain(M.normalize(migrated)),toPlain(migrated));
// Review order differs between starts and survives save/reload.
a=app();a.model.begin({ids:[301,302,303,304],kind:'review'});const reviewOrder=toPlain(a.model.state.session.ids);
a.model.answer(Q.find(q=>q.id===reviewOrder[0]).a);const savedSession=toPlain(a.model.state.session);
a.model=a.create();assert.deepEqual(toPlain(a.model.state.session),savedSession);
a.model.finish();a.model.begin({ids:[301,302,303,304],kind:'review'});
assert.notDeepEqual(toPlain(a.model.state.session.ids),reviewOrder);assert.deepEqual(toPlain(a.model.state.session.ids).sort(),[301,302,303,304]);
// Changed content archives unfinished work; historical points are not recalculated.
a=app();r=score(a,48);const raw=a.model.exportData();raw.mockResults[1].best.scoreSnapshot=42;raw.mockResults[1].best.contentVersion='older';raw.attempts=[];raw.lastResult=null;raw.mockResults[1].recent=[];const b=app();b.model.importData(raw);assert.equal(b.model.state.mockResults[1].best.scoreSnapshot,42);assert.equal(score(b,45).previousScore,null);
a.model.begin({ids:[301],kind:'study'});const changed=a.model.exportData();changed.session.contentVersion='old-content';b.model.importData(changed);assert.equal(b.model.state.session,null);assert.ok(b.model.state.legacyArchive.sessions.length);
// Storage failures are surfaced without deleting old or corrupt raw data.
a=app({version:3,stats:{301:{total:1,correct:1}},misses:{}});const old=a.storage.get(M.OLD);a.quota();assert.equal(a.model.save(),false);assert.match(a.model.error,/保存できません/);assert.equal(a.storage.get(M.OLD),old);
const corrupt=new Map([[M.STORE,'{invalid']]);a=app(null,corrupt);assert.equal(a.model.state.legacyArchive.corruptRaw,'{invalid');assert.ok([...corrupt.keys()].some(k=>k.startsWith(M.STORE+'-recovery-')));
const brokenStore={getItem:k=>k===M.STORE?'{invalid':null,setItem:()=>{throw Error('quota')}};const blocked=M.create({storage:brokenStore,now:()=>initialTime});assert.equal(blocked.save(),false);assert.match(blocked.error,/上書きを止め/);
a=app();score(a,50);a.model.reset();assert.equal(a.model.state.attempts.length,0);assert.equal(a.model.state.session,null);assert.deepEqual(toPlain(a.model.state.mockResults),{});
// Repeated imports preserve earlier recovery snapshots even after a reload.
{
 const history=app();history.model.state.legacyArchive.history=[{score:41,at:initialTime}];
 const blank=app().model.exportData();history.model.importData(blank);history.model.importData(blank);
 history.model=history.create();
 const first=history.model.state.legacyArchive.importSnapshots[0].state.legacyArchive.importSnapshots[0].state;
 assert.equal(first.legacyArchive.history[0].score,41);
}
// Check before writing, even when a storage event has not reached a suspended tab.
{
 const first=app(),second=app(null,first.storage);
 first.model.begin({ids:[301],kind:'study'});first.model.answer(Q[0].a);
 const latest=first.storage.get(M.STORE);second.model.begin({ids:[302],kind:'study'});
 assert.equal(second.model.conflicted,true);assert.equal(first.storage.get(M.STORE),latest);
 assert.equal(second.model.save(),false);assert.throws(()=>second.model.importData(first.model.exportData()),/再読み込み/);
}
{
 const raw=app().model.exportData();raw.legacyArchive={history:[null,{score:42}],stats:{1:null,2:{total:3}},sessions:'broken',checks:null};
 const restored=M.normalize(raw);
 assert.equal(restored.legacyArchive.history[0].score,42);assert.equal(restored.legacyArchive.stats[2].total,3);
 assert.deepEqual(toPlain(restored.legacyArchive.sessions),[]);assert.equal(restored.legacyArchive.unreadableArchive.sessions,'broken');
}
// Skipping is never an answer: it cannot reduce accuracy or create a review item.
for(const kind of ['mock','guided','study','review']){
 a=app();const ids=['mock','guided'].includes(kind)?WORKSHEETS[0].orderedIds:[301,302,303];
 a.model.begin({ids,kind,worksheet:['mock','guided'].includes(kind)?1:null});
 const [firstId,wrongId,skippedId]=a.model.state.session.ids;
 a.model.answer(Q.find(q=>q.id===firstId).a);a.model.state.session.index=1;a.model.answer(!Q.find(q=>q.id===wrongId).a);
 const result=a.model.finish();assert.equal(M.partialAttempt(result),true);assert.equal(M.answeredCount(result),2);
 assert.equal(result.scoreSnapshot,1);assert.equal(Object.keys(a.model.state.stats).length,2);
 assert.equal(a.model.state.stats[skippedId],undefined);assert.equal(a.model.schedule().all.length,1);
 assert.equal(a.model.schedule().all[0].id,wrongId);
 const unchanged=JSON.stringify(a.model.state);a.model.record(skippedId,null,true);assert.equal(JSON.stringify(a.model.state),unchanged);
 if(['mock','guided'].includes(kind))assert.equal(a.model.state[kind==='mock'?'mockResults':'guidedResults'][1].best,null);
 a.model=a.create();assert.equal(a.model.state.stats[skippedId],undefined);
}
// Partial attempts stay in history but cannot change a complete score, comparison, or best score.
a=app();score(a,45);a.model.begin({ids:WORKSHEETS[0].orderedIds,kind:'mock',worksheet:1});a.model.answer(Q.find(q=>q.id===a.model.state.session.ids[0]).a);
r=a.model.finish();assert.equal(r.previousScore,null);assert.equal(r.newBest,false);assert.equal(a.model.state.mockResults[1].best.scoreSnapshot,45);
r=score(a,48);assert.equal(r.previousScore,45);assert.equal(r.newBest,true);assert.equal(a.model.state.attempts.length,3);
a=app();a.model.begin({ids:WORKSHEETS[0].orderedIds,kind:'mock',worksheet:1});
for(let i=0;i<49;i++){a.model.state.session.index=i;a.model.answer(Q.find(q=>q.id===a.model.state.session.ids[i]).a)}
r=a.model.finish();assert.equal(r.scoreSnapshot,49);assert.equal(M.partialAttempt(r),true);assert.equal(a.model.state.mockResults[1].best,null);
r=score(a,48);assert.equal(r.previousScore,null);assert.equal(r.bestScore,48);assert.equal(a.model.state.mockResults[1].best.scoreSnapshot,48);
// Timeouts keep the 50-question mock score while only actual answers affect learning statistics.
a=app();a.model.begin({ids:WORKSHEETS[0].orderedIds,kind:'mock',worksheet:1});a.model.answer(Q.find(q=>q.id===a.model.state.session.ids[0]).a);
a.clock.now=a.model.state.session.endAt;r=a.model.finish();assert.equal(M.partialAttempt(r),false);assert.equal(r.timeout,true);
assert.equal(r.total,50);assert.equal(r.scoreSnapshot,1);assert.equal(a.model.state.mockResults[1].best.scoreSnapshot,1);
assert.equal(Object.keys(a.model.state.stats).length,1);assert.equal(a.model.schedule().all.length,0);
// These synthetic records were produced by the actual pre-fix model, not by the migration being tested.
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'dev/fixtures/unanswered-stats-v4.json'),'utf8')).cases;
const expected={partialTen:[10,8,2],correctBeforeSkip:[51,51,0],wrongBeforeSkip:[51,50,1],abandonedDrill:[2,1,1],realWrongAfterGraduation:[150,149,1],timeout:[1,1,0]};
for(const [name,raw] of Object.entries(fixtures)){
 a=app(null,new Map([[M.STORE,JSON.stringify(raw)]]));
 const totals=Object.values(a.model.state.stats).reduce((r,s)=>[r[0]+s.total,r[1]+s.correct],[0,0]);
 assert.deepEqual([...totals,a.model.schedule().all.length],expected[name],name);
 assert.deepEqual(toPlain(a.model.state.attempts.map(v=>[v.attemptId,v.scoreSnapshot])),raw.attempts.map(v=>[v.attemptId,v.scoreSnapshot]),name+' saved scores');
 assert.equal(a.model.state.legacyArchive.unansweredStatsCorrections.length,1);
 assert.deepEqual(toPlain(a.model.state.legacyArchive.unansweredStatsCorrections[0].stats),raw.stats);
 const repaired=toPlain(a.model.state);a.model=a.create();assert.deepEqual(toPlain(a.model.state),repaired,name+' idempotent reload');
 const exported=a.model.exportData(),restored=app();restored.model.importData(exported);
 assert.deepEqual(toPlain(restored.model.state.stats),toPlain(a.model.state.stats),name+' export/import');
 if(name==='partialTen'){assert.equal(a.model.state.mockResults[1].best,null);assert.equal(a.model.state.stats[311],undefined);}
 if(name==='correctBeforeSkip'){assert.equal(a.model.state.stats[302].last,true);assert.equal(a.model.state.mockResults[1].best.scoreSnapshot,50);}
 if(name==='wrongBeforeSkip'||name==='realWrongAfterGraduation'){assert.equal(a.model.state.stats[302].last,false);assert.equal(a.model.state.misses[302],1);}
 if(name==='abandonedDrill')assert.equal(a.model.weak(303),true);
}
// Loading the same older backup twice must not subtract the skipped questions twice.
a=app();a.model.importData(fixtures.partialTen);const once=JSON.stringify(a.model.state.stats);a.model.importData(fixtures.partialTen);
assert.equal(JSON.stringify(a.model.state.stats),once);
// An incomplete/corrupt aggregate cannot justify removing known real mistakes.
const inconsistent=toPlain(fixtures.partialTen);inconsistent.stats[311]={total:0,correct:0,last:null,lastAt:0,reviewAt:0,reviewPass:0,uncertain:false};
const safe=M.normalize(inconsistent);assert.equal(safe.stats[311].total,0);assert.equal(safe.misses[311],1);
// Each round keeps exactly its own 50 IDs; a fresh mock changes order, while
// reload/import keep the chosen order and all position-bound answers together.
for(const w of WORKSHEETS){
 a=app();const original=toPlain(w.orderedIds);
 const session=a.model.begin({ids:w.orderedIds,kind:'mock',worksheet:w.worksheet});
 const order=toPlain(session.ids),wrongId=order[17];
 assert.deepEqual([...order].sort((a,b)=>a-b),[...original].sort((a,b)=>a-b));
 assert.notDeepEqual(order,original);assert.deepEqual(toPlain(w.orderedIds),original);
 a.model.answer(Q.find(q=>q.id===order[0]).a);session.index=17;session.flags[17]=true;
 a.model.answer(!Q.find(q=>q.id===wrongId).a);
 const suspended=toPlain(session),backup=a.model.exportData();a.model=a.create();
 assert.deepEqual(toPlain(a.model.state.session),suspended,`round ${w.worksheet} reload`);
 const imported=app();imported.model.importData(backup);
 assert.deepEqual(toPlain(imported.model.state.session),suspended,`round ${w.worksheet} import`);
 for(let i=0;i<50;i++){
  a.model.state.session.index=i;const value=Q.find(q=>q.id===order[i]).a;
  a.model.answer(i===17?!value:value);
 }
 const result=a.model.finish();assert.equal(result.scoreSnapshot,49);assert.equal(result.worksheet,w.worksheet);
 assert.deepEqual(toPlain(result.ids),order);assert.equal(result.flags[17],true);
 assert.equal(a.model.schedule().all.length,1);assert.equal(a.model.schedule().all[0].id,wrongId);
 const again=a.model.begin({ids:w.orderedIds,kind:'mock',worksheet:w.worksheet});
 assert.notDeepEqual(toPlain(again.ids),order,`round ${w.worksheet} new attempt`);
 assert.deepEqual(toPlain(again.ids).sort((a,b)=>a-b),[...original].sort((a,b)=>a-b));
 // Existing source-order mocks continue without being shuffled retroactively.
 const old=toPlain(a.model.exportData());old.session.ids=[...original];old.session.index=4;
 old.session.answers[4]=Q.find(q=>q.id===original[4]).a;
 const resumed=app(null,new Map([[M.STORE,JSON.stringify(old)]]));
 assert.deepEqual(toPlain(resumed.model.state.session),old.session);
 const invalid=toPlain(old);invalid.session.ids[0]=WORKSHEETS[w.worksheet%10].orderedIds[0];
 assert.equal(M.normalize(invalid).session,null);
 const practice=app();practice.model.begin({ids:w.orderedIds,kind:'guided',worksheet:w.worksheet});
 assert.deepEqual(toPlain(practice.model.state.session.ids),original);
 assert.throws(()=>app().model.begin({ids:invalid.session.ids,kind:'mock',worksheet:w.worksheet}),/50問/);
 assert.throws(()=>app().model.begin({ids:[...original.slice(1),original[1]],kind:'mock',worksheet:w.worksheet}),/問題が見つかりません/);
}
console.log('PASS: all ten shuffled mocks, stable resume/import, source-order migration, ID-bound grading/review, scoring, unanswered exclusion, historical repair, timer, stale-tab protection.');

// Waiting review IDs cannot start or answer even through an old restored session.
a=app();a.model.record(301,!Q.find(q=>q.id===301).a);a.model.record(301,Q.find(q=>q.id===301).a);
assert.throws(()=>a.model.begin({ids:[301],kind:'review'}),/次の復習時刻/);
a.model.state.session={attemptId:'old-review',kind:'review',mode:'drill',ids:[301],index:0,answers:[null],uncertain:[false],flags:[false],answeredAt:[null]};
const locked=JSON.stringify(a.model.state);
assert.equal(a.model.answer(Q.find(q=>q.id===301).a),false);assert.equal(JSON.stringify(a.model.state),locked);
a.clock.now+=30*60*1000;assert.equal(a.model.answer(Q.find(q=>q.id===301).a),true);assert.equal(a.model.weak(301),false);
