import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { handleCloud, digest } from './server/cloud-api.mjs';
import * as oauth from './server/vendor/oauth4webapi.mjs';
import { schema } from './server/schema.mjs';
assert.deepEqual(schema,fs.readFileSync(new URL('migrations/0001_cloud.sql',import.meta.url),'utf8').split(';').map(s=>s.trim()).filter(Boolean));

const ctx = vm.createContext({ crypto });
for (const file of ['questions.js','cloud-record.js','model.js']) vm.runInContext(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), ctx);
const { M, C, Q, W } = vm.runInContext('({M:KarimenModel,C:KarimenCloudRecord,Q,W:WORKSHEETS})', ctx);
const plain = v => JSON.parse(JSON.stringify(v));
const storage = () => { const data = new Map(); return { getItem:k => data.get(k) ?? null, setItem:(k,v) => data.set(k,v) }; };
let clock = Date.now(), serial = 0;
function model(state) { const s = storage(); if (state) s.setItem(M.STORE, JSON.stringify(state)); return M.create({ storage:s, now:() => clock, makeId:() => 'attempt-' + (++serial) }); }
function answer(m, id, correct = true) { m.begin({ids:[id]}); m.answer(correct ? Q.find(q => q.id === id).a : !Q.find(q => q.id === id).a); m.finish(); clock += 1000; }

// Local-only history becomes a baseline exactly once, then event unions are idempotent.
let a = model(); answer(a,301); const owner = 'user-a'; a.mergeCloud(null, owner);
let b = model(a.exportData()); answer(a,302,false); answer(b,303); answer(b,301,false);
a.mergeCloud(b.exportData(), owner); b.mergeCloud(a.exportData(), owner);
assert.equal(a.state.stats[301].total,2); assert.equal(a.state.stats[301].correct,1);
assert.equal(a.state.stats[301].last,false); assert.equal(a.state.stats[302].last,false); assert.equal(a.state.stats[303].last,true);
assert.equal(a.state.attempts.length,4);
const stable = C.canonical(C.snapshot(a.exportData()));
a.mergeCloud(b.exportData(), owner); a.mergeCloud(b.exportData(), owner);
assert.equal(C.canonical(C.snapshot(a.exportData())),stable);
assert.equal(C.canonical(C.snapshot(a.exportData())),C.canonical(C.snapshot(b.exportData())));
assert.throws(() => a.mergeCloud(null,'another-account'),/別のアカウント/);
assert.throws(() => a.reset(),/クラウド/);
assert.throws(() => M.normalize({...plain(a.state),sync:{v:7}}),/形式/);

// An unupgraded historical record is preserved as a baseline, with no invented new answers.
let history = plain(a.state); delete history.sync;
let legacy = model(history); legacy.mergeCloud(null,owner);
assert.deepEqual(plain(legacy.state.stats),history.stats);
assert.equal(Object.keys(legacy.state.sync.events).length,0);
const mismatch=plain(history);mismatch.stats[301].total++;mismatch.stats[301].lastAt++;
const incompatible=model(mismatch), protectedState=JSON.stringify(incompatible.state);
assert.throws(()=>incompatible.mergeCloud(legacy.exportData(),owner),/異なる旧記録/);
assert.equal(JSON.stringify(incompatible.state),protectedState);
// Repeated device exchanges converge even when review order differs.
a.state.lastReviewOrder=[301,302];b.state.lastReviewOrder=[302,301];
a.mergeCloud(b.exportData(),owner);b.mergeCloud(a.exportData(),owner);
assert.equal(C.canonical(C.snapshot(a.exportData())),C.canonical(C.snapshot(b.exportData())));

// Resume state carries order, flags, answers and paused remaining time across devices.
let exam = model(); exam.begin({ids:W[0].orderedIds,kind:'mock',worksheet:1}); exam.answer(true);
exam.state.session.flags[1] = true; clock += 6000; exam.pauseTimer();
const examBefore = plain(exam.state.session); exam.mergeCloud(null,owner);
let phone = model(); phone.mergeCloud(exam.exportData(),owner);
assert.deepEqual(plain(phone.sessionFor('mock').ids),examBefore.ids);
assert.equal(phone.sessionFor('mock').remainingMs,examBefore.remainingMs);
assert.equal(phone.sessionFor('mock').answers[0],true);
assert.equal(phone.sessionFor('mock').flags[1],true);
assert.equal(phone.sessionFor('mock').timerPaused,true);
// Concurrent edits of a shared attempt: retain non-conflicting answers; completion cannot resurrect.
phone.activate('mock'); phone.resumeTimer(); phone.state.session.index=1; phone.answer(false); phone.pauseTimer();
exam.mergeCloud(phone.exportData(),owner);
assert.equal(exam.sessionFor('mock').answers[1],false);
phone.finish(); exam.mergeCloud(phone.exportData(),owner);
assert.equal(exam.sessionFor('mock'),null);
assert.equal(exam.state.stats[examBefore.ids[0]].total,1);
assert.equal(Object.keys(exam.state.stats).length,2); // 48 unanswered questions excluded.

// Different unfinished sessions of the same kind remain recoverable in the archive.
let x=model(),y=model(); x.begin({ids:[301,302]}); x.answer(true); y.begin({ids:[303,304]}); y.answer(false);
x.mergeCloud(y.exportData(),owner);
assert.equal(x.state.legacyArchive.sessions.length,1);
assert.equal(Object.keys(x.state.stats).length,2);

// D1-compatible adapter runs the production SQL in actual SQLite transactions.
class D1 {
  constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec('PRAGMA foreign_keys=ON'); this.db.exec(fs.readFileSync(new URL('migrations/0001_cloud.sql',import.meta.url),'utf8')); }
  prepare(sql) { const db=this.db; return { bind(...args) { return { async first() { return db.prepare(sql).get(...args) || null; }, async run() { const r=db.prepare(sql).run(...args); return {success:true,meta:{changes:r.changes}}; }, async all() { return {results:db.prepare(sql).all(...args),success:true}; } }; } }; }
  async batch(statements) { this.db.exec('BEGIN'); try { const out=[]; for(const s of statements) out.push(await s.all()); this.db.exec('COMMIT'); return out; } catch(e) { this.db.exec('ROLLBACK'); throw e; } }
}
const db=new D1(), origin='https://karimen-study.pages.dev';
const env={DB:db,CLOUD_ENABLED:'true',GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'fake-test-secret'};
const context={waitUntil:p => p};
let apiTime=Date.now();
function req(path,method='GET',data,cookie='',extra={}) { return new Request(origin+path,{method,headers:{Origin:origin,'X-Karimen-Request':'1','Content-Type':'application/json',Cookie:cookie,...extra},...(data === undefined ? {} : {body:JSON.stringify(data)})}); }
const run=(request,extra={}) => handleCloud(request,env,context,{now:()=>apiTime,...extra});
let r=await handleCloud(req('/api/cloud/config'),{},context); assert.equal((await r.json()).enabled,false);
assert.equal((await handleCloud(new Request('https://preview.pages.dev/api/cloud/config'),env)).status,403);
assert.equal((await run(req('/api/progress'))).status,401);
assert.equal((await run(req('/api/auth/start','POST',{},'',{Origin:'https://evil.example'}))).status,403);
assert.equal((await run(req('/api/auth/start','POST',{},'',{'X-Karimen-Request':''}))).status,403);

// Exercise the real OAuth library: signed ID token, nonce, PKCE, state-cookie and one-time code flow.
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key',use:'sig',alg:'RS256'};
const base64 = v => Buffer.from(typeof v==='string' ? v : JSON.stringify(v)).toString('base64url');
let claimsOverride={};
const oauthOptions={ [oauth.customFetch]:async (url,options) => {
  if(String(url)=== 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({keys:[jwk]});
  assert.equal(String(url),'https://oauth2.googleapis.com/token');
  const form=new URLSearchParams(options.body); assert.equal(form.get('code_verifier').length>=43,true);
  assert.equal(form.get('client_secret'),env.GOOGLE_CLIENT_SECRET);
  const claims={iss:'https://accounts.google.com',sub:'google-a',aud:env.GOOGLE_CLIENT_ID,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,nonce:currentFlow.nonce,email_verified:true,email:'test@example.invalid',...claimsOverride};
  const text=base64({alg:'RS256',kid:'test-key'})+'.'+base64(claims);
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(text));
  return Response.json({access_token:'fake-access',token_type:'Bearer',id_token:text+'.'+Buffer.from(signature).toString('base64url')});
}};
let currentFlow;
async function start() {
  const response=await run(req('/api/auth/start','POST',{})); assert.equal(response.status,200);
  const target=new URL((await response.json()).url), state=target.searchParams.get('state');
  currentFlow=db.db.prepare('SELECT * FROM cloud_oauth WHERE state_hash=?').get(await digest(state));
  assert.equal(target.searchParams.get('code_challenge'),await oauth.calculatePKCECodeChallenge(currentFlow.verifier));
  return {state,cookie:response.headers.getSetCookie()[0].split(';')[0]};
}
let flow=await start();
assert.equal((await run(req('/api/auth/callback?state='+flow.state+'&code=test','GET',undefined,''),{oauthOptions})).status,400);
claimsOverride={nonce:'wrong'};
assert.equal((await run(req('/api/auth/callback?state='+flow.state+'&code=test','GET',undefined,flow.cookie),{oauthOptions})).status,503);
claimsOverride={}; flow=await start();
r=await run(req('/api/auth/callback?state='+flow.state+'&code=test','GET',undefined,flow.cookie),{oauthOptions}); assert.equal(r.status,303);
const sessionCookie=r.headers.getSetCookie().find(c=>c.startsWith('__Host-karimen-session=')).split(';')[0];
assert.match(r.headers.getSetCookie()[0],/Secure; HttpOnly; SameSite=Lax/);
assert.equal((await run(req('/api/auth/callback?state='+flow.state+'&code=test','GET',undefined,flow.cookie),{oauthOptions})).status,400);
const user=(await (await run(req('/api/auth/me','GET',undefined,sessionCookie))).json()).user;
assert.ok(user.id); assert.equal(user.email,'test@example.invalid');
assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM cloud_users').get().n,1);

const cloudModel=model(); answer(cloudModel,301); cloudModel.mergeCloud(null,user.id);
const snapshot=plain(C.snapshot(cloudModel.exportData()));
assert.equal((await run(req('/api/progress','PUT',{revision:0,state:snapshot},sessionCookie))).status,200);
let saved=await (await run(req('/api/progress','GET',undefined,sessionCookie))).json(); assert.equal(saved.revision,1);
assert.equal((await run(req('/api/progress','PUT',{revision:0,state:snapshot},sessionCookie))).status,409);
answer(cloudModel,302); const snapshot2=plain(C.snapshot(cloudModel.exportData()));
assert.equal((await run(req('/api/progress','PUT',{revision:1,state:snapshot2},sessionCookie))).status,200);
saved=await (await run(req('/api/progress','GET',undefined,sessionCookie))).json(); assert.equal(saved.revision,2); assert.ok(saved.state.stats[302]);
assert.equal(db.db.prepare('SELECT COUNT(*) AS n FROM cloud_history').get().n,2);
const impostor=plain(snapshot); impostor.sync.owner='other-user';
assert.equal((await run(req('/api/progress','PUT',{revision:2,state:impostor},sessionCookie))).status,400);
assert.equal((await run(req('/api/progress','PUT',{revision:2,state:snapshot,extra:'x'.repeat(900000)},sessionCookie))).status,413);
assert.match((await run(req('/api/progress','GET',undefined,sessionCookie))).headers.get('Cache-Control'),/no-store/);
// Another authenticated user can only see their own empty record.
const token=oauth.generateRandomState();
db.db.prepare('INSERT INTO cloud_users VALUES(?,?,?,?)').run('user-b','google-b','b@example.invalid',apiTime);
db.db.prepare('INSERT INTO cloud_sessions VALUES(?,?,?)').run(await digest(token),'user-b',apiTime+60000);
assert.equal((await (await run(req('/api/progress','GET',undefined,'__Host-karimen-session='+token))).json()).state,null);
assert.equal((await run(req('/api/progress','PUT',{revision:3,state:{...snapshot,sync:{...snapshot.sync,owner:'user-b'}}},'__Host-karimen-session='+token))).status,409);
assert.equal((await run(req('/api/auth/logout','POST',{},sessionCookie))).status,200);
assert.equal((await run(req('/api/progress','GET',undefined,sessionCookie))).status,401);
apiTime+=60001;
assert.equal((await run(req('/api/progress','GET',undefined,'__Host-karimen-session='+token))).status,401);
console.log('PASS: cloud event union, offline convergence, paused resume, partial stats, account isolation, real signed OAuth/nonce/PKCE, CSRF, SQLite CAS/history, limits and session expiry.');
