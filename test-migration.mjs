import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync('migration.js','utf8');
const OLD='https://tnkkakuei3-design.github.io', NEW='https://karimen-study.pages.dev';
const nonce='a'.repeat(48), key='progress';
async function target(current=null, connected=true) {
 const elements=Object.fromEntries(['transfer-status','transfer-start','transfer-home','transfer-import','transfer-text','transfer-file','transfer-check','transfer-save','transfer-preview'].map(k=>[k,{textContent:'',value:'',files:[],hidden:true,handlers:{},addEventListener(n,f){this.handlers[n]=f}}]));
 const listeners=new Set(), sent=[], timers=new Set(); let raw=current,writes=0;
 const parent={postMessage:(m,o)=>sent.push([m,o])};
 const store={getItem:()=>raw,setItem:(k,v)=>{raw=v;writes++},flush:async()=>{},status:{primarySaved:true},conflict:false};
 const ctx={document:{getElementById:k=>elements[k]},location:{origin:NEW,pathname:'/migration.html',hash:'#transfer='+nonce},URLSearchParams,
 KarimenStorage:{KEY:key,open:async()=>store},KarimenModel:{normalize:v=>{if(v.version!==5)throw Error('invalid');return v}},
 localStorage:{},indexedDB:{},history:{replaceState(){}},setInterval:f=>{timers.add(f);return f},clearInterval:f=>timers.delete(f),setTimeout:f=>{timers.add(f);return f},clearTimeout:f=>timers.delete(f)};
 ctx.window={opener:connected ? parent : null,addEventListener:(n,f)=>listeners.add(f),removeEventListener:(n,f)=>listeners.delete(f)};
 vm.runInNewContext(code,ctx); await new Promise(r=>setImmediate(r));
 const send=async(data,origin=OLD,source=parent)=>{for(const f of [...listeners])await f({data,origin,source})};
 return {send,elements,sent,store,get raw(){return raw},get writes(){return writes}};
}
const progress=JSON.stringify({version:5,stats:{301:{total:1,last:true}},session:{kind:'study',index:1},suspended:{mock:{remainingMs:1000}}});
const msg={channel:'karimen-transfer-v1',type:'progress',nonce,raw:progress};
const a=await target();
await a.send(msg,'https://evil.example');assert.equal(a.writes,0);
await a.send({...msg,nonce:'b'.repeat(48)});assert.equal(a.writes,0);
await a.send(msg,OLD,{});assert.equal(a.writes,0);
await a.send(msg);assert.equal(a.raw,progress);assert.equal(a.writes,1);assert.ok(a.sent.some(([m])=>m.type==='saved'));
await a.send(msg);assert.equal(a.writes,1);
const b=await target(JSON.stringify({version:5,stats:{302:{total:2}}}));const before=b.raw;
await b.send(msg);assert.equal(b.raw,before);assert.equal(b.writes,0);assert.match(b.elements['transfer-status'].textContent,/上書きを止め/);
const c=await target();await c.send({...msg,raw:'invalid'});assert.equal(c.writes,0);
const d=await target();d.store.conflict=true;await d.send(msg);assert.equal(d.writes,0);
const e=await target();e.store.status.primarySaved=false;await e.send(msg);assert.ok(!e.sent.some(([m])=>m.type==='saved'));
console.log('PASS migration: origin/source/nonce guards; duplicate prevention; progress/session preservation; existing record protection; malformed/conflict/storage failure.');

// An opener-less iPhone window offers manual import instead of a link back to the source.
const manual=await target(null,false);
assert.equal(manual.elements['transfer-import'].hidden,false);
assert.notEqual(manual.elements['transfer-home'].href,OLD+'/karimen-study/migration.html');
manual.elements['transfer-text'].value=progress;
await manual.elements['transfer-check'].handlers.click();
assert.equal(manual.writes,0);assert.match(manual.elements['transfer-preview'].textContent,/回答済み 1問/);
await manual.elements['transfer-save'].handlers.click();
assert.equal(manual.writes,1);assert.equal(manual.elements['transfer-import'].hidden,true);
const file=await target(null,false);
file.elements['transfer-file'].files=[{size:progress.length,text:async()=>progress}];
await file.elements['transfer-check'].handlers.click();await file.elements['transfer-save'].handlers.click();assert.equal(file.raw,progress);
const invalid=await target(null,false);invalid.elements['transfer-text'].value='bad';await invalid.elements['transfer-check'].handlers.click();assert.equal(invalid.writes,0);assert.equal(invalid.elements['transfer-save'].hidden,true);
const changed=await target(null,false);changed.elements['transfer-text'].value=progress;await changed.elements['transfer-check'].handlers.click();changed.elements['transfer-text'].handlers.input();await changed.elements['transfer-save'].handlers.click();assert.equal(changed.writes,0);
const occupied=await target(before,false);occupied.elements['transfer-text'].value=progress;await occupied.elements['transfer-check'].handlers.click();await occupied.elements['transfer-save'].handlers.click();assert.equal(occupied.writes,0);
const failed=await target(null,false);failed.store.status.primarySaved=false;failed.elements['transfer-text'].value=progress;await failed.elements['transfer-check'].handlers.click();await failed.elements['transfer-save'].handlers.click();assert.match(failed.elements['transfer-status'].textContent,/保存を確認できません/);assert.equal(failed.elements['transfer-import'].hidden,false);
console.log('PASS manual migration: no-opener fallback, preview before save, file import, invalid input, edited preview, existing-record and save-failure guards.');
// Source copy denial and file export both preserve the original record.
{
 const {JSDOM}=await import('jsdom');
 const dom=new JSDOM(readFileSync('migration.html','utf8'),{url:OLD+'/karimen-study/migration.html',runScripts:'outside-only'});
 const w=dom.window, original=progress;let copied='',download='';
 w.KarimenStorage={KEY:key,open:async()=>({getItem:()=>original,conflict:false})};
 w.indexedDB={};w.KarimenModel={normalize:v=>v};w.setTimeout=()=>1;
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;throw Error('denied')}}});
 w.URL.createObjectURL=()=> 'blob:export';w.URL.revokeObjectURL=()=>{};
 w.HTMLAnchorElement.prototype.click=function(){download=this.download};
 w.eval(code);await new Promise(r=>setImmediate(r));
 w.document.getElementById('transfer-copy').click();await new Promise(r=>setImmediate(r));
 assert.equal(copied,original);assert.equal(w.document.getElementById('transfer-copy-fallback').hidden,false);
 assert.equal(w.document.getElementById('transfer-export-text').value,original);
 w.document.getElementById('transfer-download').click();assert.equal(download,'karimen-progress.json');
 dom.window.close();
}
console.log('PASS source fallback: clipboard denied, manual copy and downloadable record.');
