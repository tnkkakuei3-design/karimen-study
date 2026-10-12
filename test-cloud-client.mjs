import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = name => fs.readFileSync(new URL(name,import.meta.url),'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
async function fixture({enabled=true,authenticated=true,remote=null,local=null}={}) {
  const dom=new JSDOM('<div id="settings-content"></div>',{url:'https://karimen-study.pages.dev/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window, ctx=dom.getInternalVMContext(); let pending=null, record=remote, revision=remote?1:0, writes=0, online=true, fail=false, lost=false, play=false;
  Object.defineProperty(w.navigator,'onLine',{get:()=>online});
  w.AbortSignal=AbortSignal; w.setTimeout=fn=>(pending=fn,1); w.clearTimeout=()=>{pending=null;};w.setInterval=()=>1;
  w.fetch=async (url,options={}) => {
    if (fail) throw new TypeError('network unavailable');
    if(url==='/api/cloud/config')return Response.json({enabled});
    if(url==='/api/auth/me')return Response.json({user:authenticated?{id:'owner',email:'owner@example.invalid'}:null});
    if(!authenticated)return Response.json({error:'ログインしてください。'},{status:401});
    if(url==='/api/progress'&&options.method==='PUT'){
      const data=JSON.parse(options.body);
      if(data.revision!==revision)return Response.json({error:'concurrent'},{status:409});
      record=data.state;revision++;writes++;
      if(lost){lost=false;throw new TypeError('response lost after commit');}
      return Response.json({revision});
    }
    if(url==='/api/progress')return Response.json({revision,state:record});
    throw Error('unexpected '+url);
  };
  for(const file of ['questions.js','cloud-record.js','model.js','cloud-sync.js'])vm.runInContext(read(file),ctx,{filename:file});
  const api=vm.runInContext('({M:KarimenModel,C:KarimenCloudRecord,cloud:KarimenCloud,Q})',ctx);
  if(local)w.localStorage.setItem(api.M.STORE,JSON.stringify(local));
  const storage={getItem:k=>w.localStorage.getItem(k),setItem:(k,v)=>{w.localStorage.setItem(k,v);w.dispatchEvent(new w.Event('karimen-storage-status'));},flush:async()=>{},status:{primarySaved:true,backupSaved:true}};
  const model=api.M.create({storage});
  const host={model,storage,canApply:()=>!play,changed:()=>{},beforeLogin:()=>{},settingsChanged:()=>{w.document.getElementById('settings-content').innerHTML=api.cloud.settingsMarkup();}};
  await api.cloud.init(host);
  return {dom,w,api,model,host,get record(){return record;},get writes(){return writes;},get status(){return w.document.getElementById('cloud-save-status')?.textContent;},get pending(){return pending;},setPlay:v=>play=v,setFailure:v=>fail=v,loseNext:()=>lost=true,expire:()=>authenticated=false,setOnline:v=>{online=v;w.dispatchEvent(new w.Event(v?'online':'offline'));},replaceRemote:v=>{record=plain(v);revision++;},tick:async()=>{const fn=pending;pending=null;if(fn)await fn();},retry:async()=>{w.document.querySelector('[data-cloud-action="retry"]').click();for(let n=0;n<20;n++)await new Promise(r=>setImmediate(r));}};
}
function solve(f,id,finish=true){f.model.begin({ids:[id]});f.model.answer(f.api.Q.find(q=>q.id===id).a);if(finish)f.model.finish();}
let f=await fixture(); assert.equal(f.status,'クラウドに保存済み');
// Upload new answers during play without replacing the active screen/session.
f.setPlay(true); solve(f,301,false); const active=f.model.state.session.attemptId;
await f.tick(); assert.equal(f.record.stats[301].total,1); assert.equal(f.model.state.session.attemptId,active);
assert.equal(f.status,'クラウドに保存済み');
f.model.finish(); f.setPlay(false);await f.tick();
// Offline answers survive and catch up automatically when connected.
f.setOnline(false);solve(f,302);await f.tick();assert.equal(f.record.stats[302],undefined);assert.match(f.status,/オフライン/);
f.setOnline(true);await f.tick();assert.equal(f.record.stats[302].total,1);
// Lost acknowledgement after a committed write does not double-count on retry.
f.loseNext();solve(f,303);await f.tick();assert.equal(f.record.stats[303].total,1);assert.match(f.status,/接続できません/);
await f.retry();assert.equal(f.model.state.stats[303].total,1);assert.equal(f.status,'クラウドに保存済み');
// Another device's result is not applied underneath an active question screen.
const remoteStorage={value:JSON.stringify(f.record),getItem(){return this.value;},setItem(k,v){this.value=v;}};
const other=f.api.M.create({storage:remoteStorage});other.begin({ids:[304]});other.answer(true);other.finish();
f.replaceRemote(other.exportData()); f.setPlay(true);await f.retry();assert.equal(f.model.state.stats[304],undefined);assert.match(f.status,/学習画面を閉じると/);
f.setPlay(false);await f.retry();assert.equal(f.model.state.stats[304].total,1);
const saved=plain(f.model.exportData());f.dom.window.close();
// Reload follows the same journal and resumes, without a file import.
f=await fixture({local:saved,remote:saved});assert.equal(f.model.state.stats[301].total,1);assert.equal(f.status,'クラウドに保存済み');
f.expire();solve(f,305);await f.tick();assert.match(f.status,/有効期限/);assert.equal(f.model.state.stats[305].total,1);f.dom.window.close();
// A different account cannot receive this device's history.
saved.sync.owner='another-owner';f=await fixture({local:saved});assert.equal(f.writes,0);assert.match(f.status,/別のアカウント/);f.dom.window.close();
// Configuration absent: no broken sign-in control and local study still works.
f=await fixture({enabled:false});assert.equal(f.w.document.querySelector('[data-cloud-action]'),null);solve(f,301);assert.equal(f.model.state.stats[301].total,1);f.dom.window.close();
f=await fixture({authenticated:false});assert.ok(f.w.document.querySelector('[data-cloud-action="login"]'));solve(f,301);await f.tick();assert.equal(f.writes,0);f.dom.window.close();
console.log('PASS: cloud client live-answer backup, offline recovery, lost acknowledgement, deferred remote apply, reload, logout expiry, account mismatch and disabled/guest behavior.');
