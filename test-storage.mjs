import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { IDBFactory, IDBDatabase } from 'fake-indexeddb';
import { JSDOM, VirtualConsole } from 'jsdom';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const ctx = vm.createContext({ setTimeout, clearTimeout, crypto });
vm.runInContext(read('questions.js') + '\n' + read('cloud-record.js') + '\n' + read('model.js') + '\n' + read('progress-storage.js') + '\nthis.api={M:KarimenModel,S:KarimenStorage,Q,WORKSHEETS};', ctx);
const { M, S, Q, WORKSHEETS } = ctx.api;
const plain = value => JSON.parse(JSON.stringify(value));
let nextId = 0;
class MemoryStorage {
  map = new Map(); failPrimary = false; failAll = false;
  getItem(key) { return this.map.get(key) ?? null; }
  setItem(key, value) { if (this.failAll || (this.failPrimary && key === S.KEY)) throw new Error('quota'); this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}
const makeModel = storage => M.create({ storage, now: () => 1791806400000, makeId: () => 'p-' + ++nextId });
const setup = (storage = new MemoryStorage(), indexedDB = new IDBFactory(), build = 'one') => ({ storage, indexedDB, validate: M.normalize, build });
const open = options => S.open(options);
async function saved(adapter, model) { assert.equal(model.save(), true); await adapter.flush(); }
async function dbRecords(factory) {
  const db = await new Promise((resolve, reject) => { const r = factory.open(S.DATABASE,1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const data = await new Promise((resolve, reject) => { const tx = db.transaction('records'); const r = tx.objectStore('records').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  db.close(); return data;
}

// An existing installation needs no import or user interaction, even while a mock is unfinished.
let options = setup();
let original = makeModel(options.storage);
original.begin({ ids:[301,302],kind:'study' }); original.answer(Q[0].a); original.state.session.index=1; original.answer(!Q[1].a); original.finish();
original.begin({ ids:WORKSHEETS[0].orderedIds,kind:'mock',worksheet:1 });
original.answer(true);original.state.session.index=7;original.state.session.flags[7]=true;original.pauseTimer();
const legacyInput = options.storage.getItem(S.KEY);
let adapter = await open(options), model = makeModel(adapter);
await saved(adapter,model);
const expected=plain(model.state);
assert.equal(adapter.status.backupSaved,true);
assert.ok((await dbRecords(options.indexedDB)).some(s=>s.raw===legacyInput));
adapter.close();
adapter=await open({...options,build:'two'});model=makeModel(adapter);await saved(adapter,model);
assert.deepEqual(plain(model.state),expected);
assert.equal(model.state.session.index,7);assert.equal(model.state.stats[301].total,1);assert.equal(model.state.stats[302].correct,0);
adapter.close();

// Torn/invalid JSON restores automatically, retaining the unreadable original.
options.storage.setItem(S.KEY,'{broken');
adapter=await open(options);assert.equal(adapter.status.recovered,true);model=makeModel(adapter);await saved(adapter,model);
assert.deepEqual(plain(model.state),expected);
assert.ok((await dbRecords(options.indexedDB)).some(s=>s.corruptRaw==='{broken'));
adapter.close();

// IndexedDB recovers the latest answers if every localStorage copy is missing.
options.storage.map.clear();adapter=await open(options);model=makeModel(adapter);await saved(adapter,model);
assert.deepEqual(plain(model.state),expected);adapter.close();

// A parseable but modified backup fails its checksum and cannot replace the real record.
const damaged=JSON.parse(options.storage.getItem(S.LATEST));damaged.raw=damaged.raw.replace('"index":7','"index":39');damaged.seq+=1000;
options.storage.setItem(S.LATEST,JSON.stringify(damaged));options.storage.setItem(S.KEY,'invalid');
adapter=await open(options);model=makeModel(adapter);await saved(adapter,model);
assert.equal(model.state.session.index,7);adapter.close();

// Neither unreadable data nor a future schema may be replaced by an empty record.
for(const raw of ['{broken',JSON.stringify({kind:'karimen-progress',version:6,stats:{301:{total:99}}})]){
 const o=setup();o.storage.setItem(S.KEY,raw);
 await assert.rejects(open(o));assert.equal(o.storage.getItem(S.KEY),raw);
}
const newer=setup();let newerAdapter=await open(newer);makeModel(newerAdapter);await newerAdapter.flush();newerAdapter.close();
const futureCopy=JSON.parse(newer.storage.getItem(S.LATEST));futureCopy.v=2;
newer.storage.setItem(S.LATEST,JSON.stringify(futureCopy));const beforeFuture=newer.storage.getItem(S.KEY);
await assert.rejects(open(newer));assert.equal(newer.storage.getItem(S.KEY),beforeFuture);

// LocalStorage full: answers commit to the database, including after reload and another save.
options=setup();adapter=await open(options);model=makeModel(adapter);await adapter.flush();
options.storage.failPrimary=true;
model.begin({ids:[301,302],kind:'study'});model.answer(Q[0].a);await adapter.flush();
assert.equal(adapter.status.primarySaved,false);assert.equal(adapter.status.backupSaved,true);
assert.equal(model.error,'');adapter.close();
adapter=await open(options);model=makeModel(adapter);await adapter.flush();
assert.equal(model.state.stats[301].correct,1);assert.equal(model.state.session.answers[0],Q[0].a);
model.state.session.index=1;model.answer(!Q[1].a);await adapter.flush();adapter.close();
options.storage.failPrimary=false;adapter=await open(options);model=makeModel(adapter);await adapter.flush();
assert.equal(model.state.stats[302].total,1);assert.equal(model.state.stats[302].correct,0);assert.equal(adapter.status.primarySaved,true);
adapter.close();

// No database support still keeps synchronous copies; full failure is visible, not a fake success.
options=setup(new MemoryStorage(),undefined);options.indexedDB=undefined;
adapter=await open(options);model=makeModel(adapter);model.begin({ids:[301],kind:'study'});model.answer(Q[0].a);
const lastGood=options.storage.getItem(S.KEY);options.storage.failAll=true;
assert.equal(model.save(),false);assert.match(model.error,/保存できません/);assert.equal(options.storage.getItem(S.KEY),lastGood);
options.storage.failAll=false;assert.equal(model.save(),true);adapter.close();
options.storage.setItem(S.KEY,'broken');adapter=await open(options);model=makeModel(adapter);
assert.equal(model.state.stats[301].correct,1);adapter.close();
const unavailable=setup(new MemoryStorage(),{open(){throw new Error('denied')}});
await assert.rejects(open(unavailable),/元の記録を守る/);assert.equal(unavailable.storage.getItem(S.KEY),null);

// A database transaction failure must be reported and the in-memory answers retried automatically.
options=setup();adapter=await open(options);model=makeModel(adapter);await adapter.flush();
const durableBeforeFailure=options.storage.getItem(S.KEY),normalTransaction=IDBDatabase.prototype.transaction;
options.storage.failAll=true;let abortNext=true;
IDBDatabase.prototype.transaction=function(...args){
 const tx=normalTransaction.apply(this,args);
 if(args[1]==='readwrite'&&abortNext){abortNext=false;queueMicrotask(()=>tx.abort());}
 return tx;
};
try{
 model.begin({ids:[301],kind:'study'});model.answer(Q[0].a);await adapter.flush();
 assert.equal(adapter.status.backupSaved,false);assert.match(adapter.status.message,/保存が完了していません/);
 assert.equal(options.storage.getItem(S.KEY),durableBeforeFailure);
}finally{IDBDatabase.prototype.transaction=normalTransaction;}
options.storage.failAll=false;adapter.retry();await adapter.flush();
assert.equal(adapter.status.message,'');assert.equal(adapter.status.backupSaved,true);adapter.close();
adapter=await open(options);model=makeModel(adapter);assert.equal(model.state.stats[301].correct,1);await adapter.flush();adapter.close();

// A newer tab must win, including while startup is awaiting the backup database.
options=setup();const seedModel=makeModel(options.storage);const rawBefore=options.storage.getItem(S.KEY);
const starting=open(options);seedModel.begin({ids:[301],kind:'study'});seedModel.answer(Q[0].a);
const rawAfter=options.storage.getItem(S.KEY);assert.notEqual(rawAfter,rawBefore);
await assert.rejects(starting,/別の画面/);assert.equal(options.storage.getItem(S.KEY),rawAfter);
const first=await open(options),firstModel=makeModel(first);await first.flush();
const second=await open(options),secondModel=makeModel(second);await second.flush();
secondModel.state.session.index=0;secondModel.finish();await second.flush();const newerRaw=options.storage.getItem(S.KEY);
firstModel.save();await first.flush();assert.equal(firstModel.conflicted,true);assert.equal(options.storage.getItem(S.KEY),newerRaw);
first.close();second.close();

// The database transaction also arbitrates tabs when the primary store is full.
for(const primaryRecovers of [false,true]){
const quotaOptions=setup();makeModel(quotaOptions.storage);quotaOptions.storage.failPrimary=true;
const oldTab=await open(quotaOptions),oldModel=makeModel(oldTab);await oldTab.flush();
const newTab=await open(quotaOptions),newModel=makeModel(newTab);await newTab.flush();
newModel.begin({ids:[302],kind:'study'});newModel.answer(Q[1].a);await newTab.flush();
if(primaryRecovers)quotaOptions.storage.failPrimary=false;
oldModel.begin({ids:[301],kind:'study'});oldModel.answer(Q[0].a);
for(let i=0;i<20;i++)oldModel.save(); // Even a higher local sequence is not a committed backup.
await oldTab.flush();
assert.equal(oldTab.conflict,true);assert.equal(oldModel.save(),false);assert.equal(oldModel.conflicted,true);
oldTab.close();newTab.close();quotaOptions.storage.failPrimary=false;
const restoredTab=await open(quotaOptions),restoredModel=makeModel(restoredTab);await restoredTab.flush();
assert.equal(restoredModel.state.stats[302].correct,1);assert.equal(restoredModel.state.stats[301],undefined);restoredTab.close();
}

// Intentional reset is also saved. Recovery must not resurrect cleared answers.
adapter=await open(options);model=makeModel(adapter);model.reset();await adapter.flush();adapter.close();
options.storage.map.clear();adapter=await open(options);model=makeModel(adapter);await adapter.flush();
assert.deepEqual(plain(model.state.stats),{});assert.equal(model.state.session,null);assert.equal(model.state.attempts.length,0);
assert.equal(await adapter.protect({persisted:async()=>false,persist:async()=>false}),false);
assert.equal(await adapter.protect({persisted:async()=>false,persist:async()=>true}),true);adapter.close();

// Real startup order: restore before app.js is executed; a failed restore never starts the app.
async function startup(raw, shouldStart){
 const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(read('index.html'),{url:'https://tnkkakuei3-design.github.io/karimen-study/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window,context=dom.getInternalVMContext();
 w.document.hasFocus=()=>true;w.indexedDB=new IDBFactory();w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.scrollTo=()=>{};w.requestAnimationFrame=fn=>fn();w.setInterval=()=>0;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
 if(raw!==null)w.localStorage.setItem(S.KEY,raw);
 for(const name of ['questions.js','learning-content.js','cloud-record.js','model.js','visuals.js','notebook-content.js','question-guides.js','progress-storage.js'])vm.runInContext(read(name),context);
 const script=w.document.querySelector('script[data-app-src]');
 Object.defineProperty(w.document,'currentScript',{value:script,configurable:true});
 let loaded=false;
 const append=w.document.body.append.bind(w.document.body);
 w.document.body.append=element=>{
   if(element.tagName==='SCRIPT'){
     assert.ok(w.KarimenProgressStorage);loaded=true;vm.runInContext(read('app.js'),context);element.onload();
   }else append(element);
 };
 vm.runInContext(read('startup.js'),context);assert.equal(await w.KarimenStartup,shouldStart);assert.equal(loaded,shouldStart);
 if(shouldStart){assert.equal(w.document.getElementById('startup-status').hidden,true);await w.KarimenProgressStorage.flush();w.KarimenProgressStorage.close();}
 else{assert.equal(w.localStorage.getItem(S.KEY),raw);assert.equal(w.document.getElementById('startup-status').getAttribute('role'),'alert');}
 assert.equal(errors.length,0);dom.window.close();
}
await startup(legacyInput,true);await startup('{invalid',false);
console.log('PASS: automatic update/resume, two-store recovery, checksum rejection, future schema protection, quota fallback, unavailable storage, startup order, stale tabs, explicit reset and persistence policy.');

// Automatic database recovery retains all three independent unfinished modes.
{
 const o=setup();let backup=await open(o), m=makeModel(backup);
 m.begin({ids:WORKSHEETS[0].orderedIds,kind:'mock',worksheet:1});m.answer(true);
 m.begin({ids:[601,602],kind:'study'});m.answer(true);
 m.begin({ids:[701,702],kind:'review'});m.answer(false);
 await saved(backup,m);const snapshot=plain(m.state);backup.close();
 o.storage.map.clear();backup=await open({...o,build:'updated'});m=makeModel(backup);
 assert.deepEqual(plain(m.state),snapshot);
 for(const kind of ['mock','study','review'])assert.ok(m.sessionFor(kind));
 assert.equal(m.sessionFor('mock').timerPaused,true);backup.close();
}
console.log('PASS: all three saved modes recover automatically from the database backup.');
