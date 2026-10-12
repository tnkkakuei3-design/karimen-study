import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const code=readFileSync('migration.js','utf8');
const OLD='https://tnkkakuei3-design.github.io', NEW='https://karimen-study.pages.dev';
const nonce='a'.repeat(48), key='progress';
async function target(current=null) {
 const elements=Object.fromEntries(['transfer-status','transfer-start','transfer-home'].map(k=>[k,{textContent:'',hidden:true}]));
 const listeners=new Set(), sent=[], timers=new Set(); let raw=current,writes=0;
 const parent={postMessage:(m,o)=>sent.push([m,o])};
 const store={getItem:()=>raw,setItem:(k,v)=>{raw=v;writes++},flush:async()=>{},status:{primarySaved:true},conflict:false};
 const ctx={document:{getElementById:k=>elements[k]},location:{origin:NEW,pathname:'/migration.html',hash:'#transfer='+nonce},URLSearchParams,
 KarimenStorage:{KEY:key,open:async()=>store},KarimenModel:{normalize:v=>{if(v.version!==5)throw Error('invalid');return v}},
 localStorage:{},indexedDB:{},history:{replaceState(){}},setInterval:f=>{timers.add(f);return f},clearInterval:f=>timers.delete(f),setTimeout:f=>{timers.add(f);return f},clearTimeout:f=>timers.delete(f)};
 ctx.window={opener:parent,addEventListener:(n,f)=>listeners.add(f),removeEventListener:(n,f)=>listeners.delete(f)};
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
