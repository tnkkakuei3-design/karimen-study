const ANSWER_REVISION=3;
const VERSION=3, STORE='karimen-study-v2', LEGACY='karimen-drill-miss';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS={road:'M5 3L3 21M19 3l2 18M12 3v4m0 4v3m0 4v3',play:'M8 5l11 7-11 7Z',book:'M12 5c-3-2-7-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Zm0 0v15',check:'M5 12l4 4L19 6',arrow:'M4 12h15m-6-6 6 6-6 6',back:'M20 12H5m6-6-6 6 6 6',clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',repeat:'M4 9a8 8 0 0 1 14-3l2 3M20 3v6h-6M20 15A8 8 0 0 1 6 18l-2-3m0 6v-6h6',search:'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3l-1 3-3 1-2 3 2 2v3l3 3 1 3h6l1-3 3-1 2-3-2-2V9l-3-3-1-3Z',flag:'M5 21V4c6-4 8 4 14 0v10c-6 4-8-4-14 0',info:'M12 11v6m0-11v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',park:'M6 21V3h7a6 6 0 0 1 0 12H6',turn:'M5 21V11a4 4 0 0 1 4-4h11m-5-5 5 5-5 5',sign:'M12 2l10 10-10 10L2 12ZM12 7v6m0 3v1',signal:'M7 2h10v20H7Zm5 3v2m0 4v2m0 4v2',person:'M12 9v7m-6-4 6-3 6 3m-6 4-5 6m5-6 5 6M15 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0',speed:'M3 19a10 10 0 1 1 18 0M12 13l5-5M5 16h2m10 0h2M12 4v2'};
Object.assign(ICONS,{chevron:'M9 5l7 7-7 7',passing:'M7 21V3m-4 4 4-4 4 4M17 3v18m-4-4 4 4 4-4',gear:'M7 3v18M7 7h10V3m0 4v10M7 13h10',license:'M3 4h18v16H3ZM8 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4M5 17c0-4 6-4 6 0m3-8h4m-4 4h4',crossing:'M5 3l14 12M19 3 5 15M12 11v11M4 18h16'});
function icon(k){return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[k]||ICONS.book}"/></svg>`}
const CATS=[{"k":"sign","label":"標識・補助標識","icon":"sign","topics":["標識","標識・標示","補助標識"]},{"k":"signal","label":"信号・合図","icon":"signal","topics":["信号","手信号","合図","進路変更","警音器"]},{"k":"inter","label":"交差点・緊急車","icon":"turn","topics":["交差点","環状交差点","緊急自動車"]},{"k":"pass","label":"追い越し・行き違い","icon":"passing","topics":["追い越し","行き違い"]},{"k":"ped","label":"歩行者・路面電車","icon":"person","topics":["歩行者保護","路面電車","安全地帯"]},{"k":"speed","label":"速度・徐行・距離","icon":"speed","topics":["速度","停止距離","徐行"]},{"k":"start","label":"発進・AT車","icon":"gear","topics":["発進","AT車","運転支援"]},{"k":"basic","label":"通行・免許・心得","icon":"license","topics":["通行の基本","運転者の心得","携帯電話","免許制度","車種","道路の心得"]},{"k":"hazard","label":"踏切・坂道","icon":"crossing","topics":["踏切","坂道・カーブ"]},{"k":"park","label":"駐停車・路側帯（補足）","icon":"park","topics":["駐停車","路側帯"],"extra":true}];
const SOURCES=[...new Set(Q.map(q=>q.practiceSet).filter(Number.isInteger))].sort((a,b)=>a-b).map(n=>({k:'s'+(n+9),number:n,label:'練習問題'+n,ordered:true,test:q=>q.practiceSet===n}));
const byId=new Map(BANK.map(q=>[q.id,q])), catFor=q=>CATS.find(c=>c.topics.includes(q.topic));
const DUP=[[1,92],[13,70],[80,188],[24,194],[27,120],[40,113],[17,132],[42,167],[87,89],[54,56],[61,64],[62,65],[45,160],[26,72],[22,31],[4,7],[30,47],[79,116],[35,166]];
const related=id=>DUP.flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);
const uniq=a=>[...new Set(a)];
const shuffle=arr=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function dedupe(a){const seen=new Set();return a.filter(q=>{const key=q.concept||String(q.id);if(seen.has(key))return false;seen.add(key);return true})}
let storageOK=true, storageProblem=false;
function readKey(key){try{return localStorage.getItem(key)}catch{storageOK=false;return null}}
function readJSON(key,fallback){const raw=readKey(key);if(raw===null)return fallback;try{return JSON.parse(raw)}catch{storageProblem=true;return fallback}}
const bounded=(x,max=1000000)=>typeof x==='number'&&Number.isFinite(x)?Math.min(max,Math.max(0,Math.floor(x))):0;
function cleanRecords(raw){
 const misses={},stats={};
 for(const {id} of BANK){
  if(id===366&&(raw?.answerRevision??0)<3)continue;
  const m=bounded(raw?.misses?.[id],9999);if(m)misses[id]=m;
  const x=raw?.stats?.[id];if(x&&typeof x==='object'){
   const total=bounded(x.total);if(total)stats[id]={total,correct:Math.min(total,bounded(x.correct)),last:typeof x.last==='boolean'?x.last:null,lastAt:bounded(x.lastAt,1e15),reviewAt:bounded(x.reviewAt,1e15),reviewPass:bounded(x.reviewPass,2),uncertain:Boolean(x.uncertain)};
  }
 }
 return {misses,stats};
}
function cleanSession(s,answerRevision=ANSWER_REVISION){
 if(!s||!['drill','exam'].includes(s.mode)||!Array.isArray(s.ids)||!s.ids.length||s.ids.length>BANK.length)return null;
 if(!s.ids.every(id=>Number.isInteger(id)&&byId.has(id))||new Set(s.ids).size!==s.ids.length)return null;
 if(s.mode==='exam'&&(s.ids.length!==50||!Number.isFinite(s.end)||!Number.isFinite(s.started)||s.end-s.started!==1800000))return null;
 const answers=s.ids.map((id,i)=>id===366&&answerRevision<3?null:typeof s.answers?.[i]==='boolean'?s.answers[i]:null),index=Math.min(s.ids.length-1,bounded(s.index));
 const kind=examKind(s);if(kind==='assessment'&&!formMatches(s.ids,s.form))return null;
 return {mode:s.mode,ids:[...s.ids],answers,index,uncertain:s.ids.map((_,i)=>Boolean(s.uncertain?.[i])),flags:s.ids.map((_,i)=>Boolean(s.flags?.[i])),label:s.mode==='drill'?(SOURCES.find(x=>x.k===s.pool)?.label||(String(s.pool||'').startsWith('s')?'分野別の練習':typeof s.label==='string'?s.label.slice(0,80):'練習')):typeof s.label==='string'?s.label.slice(0,80):'実力テスト',pool:typeof s.pool==='string'?s.pool.slice(0,30):'all',started:Number.isFinite(s.started)?s.started:Date.now(),end:s.mode==='exam'?s.end:null,examKind:kind,form:kind==='assessment'?s.form:null,firstAttempt:kind==='assessment'&&Boolean(s.firstAttempt),blueprint:s.blueprint===BLUEPRINT_VERSION?BLUEPRINT_VERSION:null};
}
function loadState(){
 const raw=readJSON(STORE,null);
 if(raw&&[2,VERSION].includes(raw.version)){
  const r=cleanRecords(raw),checks=cleanChecks(raw,r),session=cleanSession(raw.session,raw.answerRevision??0);
  if(session?.examKind==='assessment'&&!checks[session.form])checks[session.form]={startedAt:session.started,first:null};
  return {version:VERSION,answerRevision:ANSWER_REVISION,...r,checks,limit:[0,10,20].includes(raw.limit)?raw.limit:10,theme:['auto','light','dark'].includes(raw.theme)?raw.theme:'auto',sound:raw.sound!==false,history:cleanHistory(raw.history),session};
 }
 const misses=readJSON(LEGACY,{}),limitRaw=readKey('karimen-limit');
 return {version:VERSION,answerRevision:ANSWER_REVISION,...cleanRecords({misses}),checks:{},limit:limitRaw!==null&&[0,10,20].includes(Number(limitRaw))?Number(limitRaw):10,theme:'auto',sound:true,history:[],session:null};
}
let state=loadState(), timer=null, tab='drill', currentView='menu', lastResult=null, noteReturn=false, figureNumber=0, toastTimer=null, modalAction=null;
function storageWarning(){const show=!storageOK||storageProblem;$('storage-warning').hidden=!show;$('storage-warning').textContent=!storageOK?'この表示環境では記録を保存できません。設定から記録を書き出しておくと引き継げます。':'保存データの一部を読み込めなかったため、安全な初期値で開きました。問題は引き続き解けます。'}
let actx=null;
function sfx(ok){if(state.sound===false)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;actx=actx||new C();if(actx.state==='suspended')actx.resume();const t=actx.currentTime,g=actx.createGain();g.connect(actx.destination);
 const tone=(f,st,d,type,vol)=>{const o=actx.createOscillator(),v=actx.createGain();o.type=type;o.frequency.setValueAtTime(f,t+st);v.gain.setValueAtTime(0.0001,t+st);v.gain.exponentialRampToValueAtTime(vol,t+st+0.015);v.gain.exponentialRampToValueAtTime(0.0001,t+st+d);o.connect(v);v.connect(g);o.start(t+st);o.stop(t+st+d+0.02)};
 if(ok){tone(988,0,0.16,'sine',0.25);tone(1319,0.13,0.32,'sine',0.25)}else{tone(196,0,0.32,'square',0.09);tone(185,0.02,0.32,'sawtooth',0.06);try{navigator.vibrate&&navigator.vibrate(120)}catch{}}}catch{}}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(state));storageOK=true}catch{storageOK=false}storageWarning()}
function theme(){const dark=state.theme==='dark'||(state.theme==='auto'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light'}
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500)}
function scrollTopPage(){window.scrollTo({top:0,behavior:'instant'})}
function setTab(k){
 if(state.session?.mode==='exam'&&k!=='drill'){toast('模擬テスト中は解答に集中しましょう。終了後に図解を開けます。');return}
 tab=k;document.body.dataset.view=k==='drill'?(lastResult&&currentView==='play'?'result':currentView):'menu';['drill','notes','tests'].forEach(t=>{$(t).hidden=t!==k;const b=$('tab-'+t);b.setAttribute('aria-selected',String(t===k));b.tabIndex=t===k?0:-1});
 if(k==='notes')renderNotes();if(k==='tests')renderTests();scrollTopPage();
}
function setExamLock(){const on=state.session?.mode==='exam';['notes','tests'].forEach(k=>$('tab-'+k).disabled=on);$('footer').hidden=on}
function showMenu(){document.body.dataset.view='menu';currentView='menu';$('menu').hidden=false;$('play').hidden=true;renderMenu();setTab('drill');setExamLock()}
function showPlay(){document.body.dataset.view='play';currentView='play';$('menu').hidden=true;$('play').hidden=false;setTab('drill');setExamLock()}
function ask(title,message,yes,action){modalAction=action;$('confirm-title').textContent=title;$('confirm-message').textContent=message;$('confirm-yes').textContent=yes;$('confirm').showModal()}
function weak(q){return (state.misses[q.id]||0)>0||Boolean(state.stats[q.id]?.reviewAt)}
function pool(k){
 if(k==='weak')return availablePractice().filter(q=>q.chapter&&weak(q));
 if(k==='mix'||k==='all')return Q.filter(q=>q.chapter);
 if(k==='extra')return Q.filter(q=>!q.chapter);
 if(k.startsWith('c-')){const c=CATS.find(x=>'c-'+x.k===k);return c?Q.filter(q=>q.chapter&&c.topics.includes(q.topic)):[]}
 const s=SOURCES.find(x=>x.k===k);return s?Q.filter(s.test):[];
}
function label(k){return k==='mix'?'仮免のおまかせ練習':k==='weak'?'仮免の苦手復習':k==='all'?'仮免範囲の全問題':k==='extra'?'補足問題の復習':CATS.find(x=>'c-'+x.k===k)?.label||SOURCES.find(x=>x.k===k)?.label||'復習ドリル'}
const DESIGN_MASCOTS="./image-155cadc1029a.png";
let categoryFilter='all';
function categoryItems(){return CATS.filter(c=>!c.extra).map(c=>{const list=pool('c-'+c.k);return {...c,total:list.length,attempted:list.filter(q=>state.stats[q.id]?.total).length,review:list.filter(weak).length,correct:list.filter(q=>state.stats[q.id]?.last===true).length}})}
function renderCategories(){
 const all=categoryItems(),items=all.filter(c=>categoryFilter==='weak'?c.review>0:categoryFilter==='new'?c.attempted===0&&c.review===0:true);
 $('category-count').textContent=items.length+'分野';
 $('category-grid').innerHTML=items.map(c=>{const fresh=!c.attempted&&!c.review;return `<button class="category-card" data-action="start" data-pool="c-${c.k}"><span class="category-card-top">${icon(c.icon)}${icon('chevron')}</span><strong>${c.label}</strong><span class="category-status"><span>${fresh?'全'+c.total+'問 · 未学習':'正解 '+c.correct+'/'+c.total+'問'}</span>${c.review?`<span class="category-review-badge">復習 ${c.review}問</span>`:''}</span><span class="category-progress ${fresh?'untouched':''}" aria-hidden="true"><i style="width:${c.total?c.correct/c.total*100:0}%"></i></span></button>`}).join('')||`<p class="category-empty">${categoryFilter==='weak'?'要復習の分野はありません。':'未学習の分野はありません。'}「すべて」から引き続き練習できます。</p>`;
}
function renderMenu(){
 const main=Q.filter(q=>q.chapter),answered=main.filter(q=>state.stats[q.id]?.total).length,weakCount=pool('weak').length;
 const totals=main.reduce((r,q)=>{const s=state.stats[q.id];return [r[0]+(s?.total||0),r[1]+(s?.correct||0)]},[0,0]);
 const session=state.session,ready=readiness(),visualCount=main.filter(q=>VISUALS[q.id]||IMGQ[q.id]).length;
 $('menu').innerHTML=`<div class="intro intro-illustrated"><div class="intro-copy"><h2>今日も、<br>一歩ずつ。</h2><p class="muted">${session?'まずは、前回の続きから。':'まずは10問、解いてみよう。'}</p></div><img class="intro-character" src="${DESIGN_MASCOTS}" alt="DON!DON!ドライブのプーリーくんとよりともさん" loading="eager" decoding="async"></div>
 ${session?`<div class="resume"><div><strong>${esc(session.label.replace('実際の',''))}</strong><p>${session.answers.filter(a=>a!==null).length} / ${session.ids.length}問 回答済み</p></div><div class="resume-track" aria-hidden="true"><i style="width:${session.answers.filter(a=>a!==null).length/session.ids.length*100}%"></i></div><button class="btn wide" data-action="resume">続きから解く ${icon('arrow')}</button></div>`:`<div class="resume"><div><strong>はじめの10問</strong><p>仮免の基本から、少しずつ。</p></div><button class="btn wide" data-action="quick-start">10問から始める ${icon('arrow')}</button></div>`}
 <div class="stats"><div class="stat"><span>解いた問題</span><b>${answered}<small>/ ${main.length}</small></b></div><div class="stat danger"><span>要復習</span><b>${weakCount}<small>問</small></b></div><div class="stat"><span>累計正答率</span><b>${totals[0]?Math.round(totals[1]/totals[0]*100):'—'}<small>${totals[0]?'%':''}</small></b></div></div>
 <section class="practice-list"><div class="section-heading"><h3>練習問題</h3><button class="textbtn" data-action="quick-start">10問だけ練習 ${icon('arrow')}</button></div><div class="practice-rows">${SOURCES.map((s,i)=>{const qs=pool(s.k),done=qs.filter(q=>state.stats[q.id]?.total).length;return `<button class="practice-row" data-action="start" data-pool="${s.k}"><span class="practice-no">${String(s.number).padStart(2,'0')}</span><span class="practice-name">${esc(s.label.replace('実際の','').replace(/（.*?）/g,''))}<small>${done} / ${qs.length}問 学習済み</small></span><span class="badge ${done===qs.length?'success':''}">${done===qs.length?'学習済み':done?'学習中':'未着手'}</span>${icon('arrow')}</button>`}).join('')}</div><button class="review-shortcut" data-action="start" data-pool="weak">${icon('repeat')}<strong>${weakCount?'要復習の'+weakCount+'問を解く':'苦手な問題を復習'}</strong>${icon('arrow')}</button></section>
 <div class="start-grid"><button class="hero" data-action="start" data-pool="mix"><span class="over">自分のペースで練習</span><strong>${state.limit===0?'全問を':state.limit+'問から'}、始めよう。</strong><span class="hint">仮免の範囲から、苦手を優先して練習。</span><span class="start">おまかせ練習 ${icon('arrow')}</span><img class="start-character" src="./image-135558241a20.png" alt="" loading="lazy" decoding="async"></button></div>
 <div class="mode-options"><label>1回の練習問題数</label><div class="seg" role="group" aria-label="1回の出題数">${[10,20,0].map(v=>`<button data-action="limit" data-value="${v}" aria-pressed="${state.limit===v}">${v||'全部'}${v?'問':''}</button>`).join('')}</div></div>
 <p class="hintline">苦手・自信なしは、24時間以上あけた自信のある正解を2回重ねると卒業。練習の正答率と初回判定は別に表示します。</p>

 <button class="visual-start" data-action="visual-drill"><span><strong>標識・手信号を、絵で確認</strong><small>設問用イラスト付き ${visualCount}問から練習</small></span><span aria-hidden="true">→</span></button>
 <section class="category-section" aria-labelledby="category-title"><div class="category-heading"><h3 id="category-title">分野別に練習</h3><p>気になる分野から、少しずつ。</p></div>
 ${weakCount?`<button class="category-review" data-action="start" data-pool="weak">${icon('repeat')}<strong>要復習の${weakCount}問を解く</strong>${icon('chevron')}</button>`:''}
 <div class="category-toolbar"><div class="category-filters" role="group" aria-label="分野の絞り込み">${[['all','すべて'],['new','未学習'],['weak','要復習']].map(([k,t])=>`<button data-action="category-filter" data-filter="${k}" aria-pressed="${categoryFilter===k}" aria-controls="category-grid">${t}</button>`).join('')}</div><span id="category-count" class="category-count" role="status" aria-live="polite"></span></div><div class="category-grid" id="category-grid"></div>
 </section>

 <details class="extra-panel"><summary>補足の学習</summary><p class="hintline">仮免の模試・実力テストに含めないテーマです。</p><button class="source-row" data-action="start" data-pool="extra">駐停車・交通公害など<span>${pool('extra').length}問 →</span></button></details>

 <div class="info-strip">${icon('info')}<span>記録はこのブラウザに保存されます。端末・ブラウザ・開き方を変える前に、設定から学習記録を書き出せます。</span></div>`;
 renderCategories();
}
function record(id,answer,uncertain=false){const q=byId.get(id),ok=q.a===answer,now=Date.now();const s=state.stats[id]||{total:0,correct:0,last:null};s.total++;s.correct+=ok?1:0;s.last=ok;s.lastAt=now;
 if(!ok||uncertain){state.misses[id]=Math.max(1,(state.misses[id]||0)+(!ok?1:0));s.reviewPass=0;s.reviewAt=now+86400000;s.uncertain=uncertain}
 else if(weak(q)){if(!s.reviewAt||now>=s.reviewAt){s.reviewPass=(s.reviewPass||0)+1;s.reviewAt=now+86400000;if(s.reviewPass>=2){delete state.misses[id];s.reviewAt=0;s.uncertain=false}}}
 state.stats[id]=s;return ok}
function replaceSession(action){if(!state.session){action();return}if(state.session.mode==='exam'){toast('進行中の模擬テストを再開します。');resume();return}ask('新しい練習を始めますか？','途中の出題は終了します。これまで答えた問題の学習記録は残ります。','新しく始める',action)}
document.addEventListener('click',e=>{if(e.target.closest('[data-action="quick-start"]')){beginDrill('mix',shuffle(pool('mix')).slice(0,10).map(q=>q.id),'10問の練習',true)}});
function beginDrill(k,custom=null,customLabel=null,all=false){
 replaceSession(()=>{let list=custom?custom.map(id=>byId.get(id)).filter(Boolean):pool(k);if(k==='mix')list=[...shuffle(list.filter(weak)),...shuffle(list.filter(q=>!weak(q)))];else if(k==='weak')list=[...list].sort((a,b)=>(state.stats[a.id]?.lastAt||0)-(state.stats[b.id]?.lastAt||0));else if(SOURCES.some(s=>s.k===k&&s.ordered)){list=[...list].sort((a,b)=>a.id-b.id);all=true}else list=shuffle(list);
 // All means literally all; finite sessions avoid known same-concept pairs.
 if(!all&&state.limit>0)list=(k==='weak'||custom?list:dedupe(list)).slice(0,state.limit);
 if(!list.length){showMenu();toast('苦手の記録はまだありません。まずはおまかせ練習をどうぞ。');return}
 state.session={mode:'drill',ids:list.map(q=>q.id),answers:list.map(()=>null),uncertain:list.map(()=>false),flags:[],index:0,label:customLabel||label(k),pool:k,started:Date.now(),end:null};lastResult=null;persist();showPlay();renderDrill();scrollTopPage();focusQuestion();});
}
// Exact shapes and meanings checked against NPA traffic rules, pp. 51–52, 95–108.
const VISUALS={};
function registerVisual(ids,v){ids.forEach(id=>VISUALS[id]={...v})}
registerVisual([13,38,70,71,93],{type:'sign',key:'entry',name:'車両進入禁止',tip:'この標識のある側から、車両は進入できません。自転車も対象です。',alt:'赤い円形で、中央に白い横棒がある標識。'});
registerVisual([14],{type:'sign',key:'stopslow',name:'左：一時停止 ／ 右：徐行',tip:'「止まれ」は一時停止。「徐行」は直ちに停止できる速度で進むことです。',alt:'2つの逆三角形の標識。左は赤地に白い「止まれ」、右は白地に赤い枠と青い「徐行」。'});
registerVisual([15,170],{type:'sign',key:'horn',name:'警笛鳴らせ',tip:'この標識がある場所では警音器を鳴らします。',alt:'青い円形に白い音を表す記号が描かれた標識。'});
registerVisual([26,121],{type:'sign',key:'parking',name:'駐車禁止',tip:'赤い斜線が1本。駐車を禁止する標識です。',alt:'青い円形に赤い枠と赤い斜線が1本ある標識。'});
registerVisual([27,120],{type:'sign',key:'warning',name:'警戒標識の例：十形道路交差点あり',tip:'黄色いひし形は、道路上の危険や注意すべき状況を予告します。',alt:'黄色いひし形に黒い十字の記号がある標識。'});
registerVisual([28],{type:'sign',key:'minimum',name:'最低速度',tip:'数字の下に青い横線があります。数字は最低速度を示します。',alt:'白地に赤い枠の円形。中央に青い数字50、その下に青い横線がある標識。'});
registerVisual([49,118],{type:'sign',key:'maximum',name:'最高速度',tip:'数字は指定された最高速度です。車種ごとの上限にも従います。',alt:'白地に赤い枠の円形。中央に青い数字40がある標識。'});
registerVisual([50],{type:'sign',key:'closed',name:'通行止め',tip:'歩行者も車両も通行できません。「車両通行止め」と区別します。',alt:'白い円形に赤い枠と交差した赤い帯があり、下部に「通行止」の文字がある標識。'});
registerVisual([63],{type:'sign',key:'beginner',name:'初心運転者標識',tip:'対象となる初心運転者は、車の前と後ろの両方の定められた位置に表示します。',alt:'左側が黄色、右側が緑色の、下端がとがったマーク。'});
registerVisual([89],{type:'sign',key:'bus',name:'路線バス等優先通行帯',tip:'路線バス等が近づいたら、速やかに他の通行帯へ移ります。',alt:'青い四角形に、白いバスの記号と「優先」の文字、下向きの矢印がある標識。'});
registerVisual([90],{type:'mark',key:'noarea',name:'立入り禁止部分',tip:'黄色い枠と白い斜線で示される部分には、車は入れません。',alt:'道路上に、黄色い枠と白い斜線で囲まれた部分がある。'});
registerVisual([157],{type:'mark',key:'nostoparea',name:'停止禁止部分',tip:'この中で停止するおそれがあるときは、入ってはいけません。',alt:'道路上に、白い枠の中に白い大きなバツ印がある。'});
registerVisual([66,67],{type:'sign',key:'truck',name:'大型貨物自動車等通行止め',tip:'大型貨物・特定中型貨物・大型特殊自動車が対象です。普通貨物・普通乗用車は対象外です。',alt:'白地に赤い枠の円形。青いトラックの記号に赤い斜線がある標識。'});
registerVisual([68],{type:'sign',key:'car',name:'二輪の自動車以外の自動車通行止め',tip:'二輪以外の自動車が対象です。自動二輪や原付は、この標識では禁止されません。',alt:'白地に赤い枠の円形。青い乗用車の記号に赤い斜線がある標識。'});
registerVisual([69],{type:'sign',key:'motorcycle',name:'二輪の自動車・一般原動機付自転車通行止め',tip:'二輪の自動車と一般原付が対象です。普通乗用車は対象外です。',alt:'白地に赤い枠の円形。青いオートバイの記号に赤い斜線がある標識。'});
registerVisual([72,122],{type:'sign',key:'stopping',name:'駐停車禁止',tip:'赤い斜線が2本で×形。駐車も停車も禁止します。',alt:'青い円形に赤い枠と、交差した2本の赤い斜線がある標識。'});
registerVisual([73],{type:'sign',key:'uturn',name:'転回禁止',tip:'Uターンを禁止する標識です。',alt:'白地に赤い枠の円形。折り返す青い矢印に赤い斜線がある標識。'});
registerVisual([76],{type:'sign',key:'stopline',name:'停止線',tip:'停止が必要な場合の位置を示す指示標識です。この標識だけで一時停止の義務は生じません。',alt:'青い四角形に、上部に白い横線、下部に白い「停止線」の文字がある標識。'});
registerVisual([119],{type:'sign',key:'stop',name:'一時停止',tip:'停止線がないときは、交差点の直前で一時停止します。',alt:'赤い逆三角形に白い「止まれ」の文字がある標識。'});
registerVisual([123],{type:'sign',key:'vehicles',name:'車両通行止め',tip:'車両の通行を禁止します。歩行者はこの標識の対象外です。',alt:'白い円形に赤い枠と、赤い斜線が1本ある標識。'});
registerVisual([124],{type:'sign',key:'oneway',name:'一方通行',tip:'矢印の方向に通行します。一方通行では、道路の右側部分も通行できます。',alt:'青い横長の長方形に、右向きの白い矢印がある標識。'});
registerVisual([177],{type:'sign',key:'learner',name:'仮免許練習標識',tip:'仮免許で練習するときは、車の前後の定められた位置に表示します。',alt:'白い長方形に黒文字で、上段「仮免許」、下段「練習中」と書かれている。'});
registerVisual([78],{type:'police',key:'vertical',approach:'side',name:'側面に向かう交通：黄色と同じ',tip:'この車は警察官の身体の正面に平行する方向。腕を垂直に上げているので黄色と同じ意味です。',alt:'警察官は右腕を真上に上げて正面を向いている。あなたの車は、警察官の左側から右へ、身体の正面に平行する方向に接近する。'});
registerVisual([79,116],{type:'police',key:'horizontal',approach:'front',name:'正面に向かう交通：赤色と同じ',tip:'水平の腕と平行する交通は青。身体の正面・背面に対面する交通は赤です。',alt:'警察官は両腕を左右に水平に伸ばしている。あなたの車は下側から、警察官の正面に向かって接近する。'});
registerVisual([117],{type:'police',key:'vertical',approach:'front',name:'正面に向かう交通：赤色と同じ',tip:'腕を上げても、正面・背面に対面する交通は赤。側面に向かう交通が黄です。',alt:'警察官は右腕を真上に上げている。あなたの車は下側から、警察官の正面に向かって接近する。'});
registerVisual([80,188],{type:'police',key:'lamp',approach:'side',name:'灯火を振る方向に進む交通：青色と同じ',tip:'灯火を振っている方向を基準に判断します。警察官の身体の向きだけでは決まりません。',alt:'警察官が灯火を左右に振っている。あなたの車は、灯火を振る方向と平行に、左から右へ接近する。'});
registerVisual([189],{type:'police',key:'lampup',approach:'side',name:'直前に灯火を振っていた方向：黄色と同じ',tip:'頭上へ上げる直前の灯火の振り方向が基準です。それと交差する交通は赤です。',alt:'直前は灯火を左右に振り、今は灯火を頭上へ上げている。あなたの車は、直前に振っていた方向と平行に、左から右へ接近する。'});
registerVisual([115],{type:'police',key:'horizontal',approach:'front',signal:true,name:'信号機より警察官の手信号が優先',tip:'信号機が青でも、この車に対する手信号は赤と同じ。警察官の手信号に従います。',alt:'青信号が表示されているが、正面の警察官は両腕を水平に上げている。あなたの車は警察官の正面に向かって接近する。'});
registerVisual([184],{type:'driver',key:'bend',name:'左折・左への進路変更',tip:'後ろから見た図です。右腕を出して、ひじを垂直に上へ曲げています。',alt:'後方から見た自動車。運転者は右腕を右側の窓から出し、ひじを直角に曲げて手を真上へ伸ばしている。'});
registerVisual([185],{type:'driver',key:'straight',name:'右折・転回・右への進路変更',tip:'右腕を車の右側の外に出して、水平に伸ばす合図です。',alt:'後方から見た自動車。運転者は右腕を右側の窓から出し、水平に伸ばしている。'});
registerVisual([186],{type:'driver',key:'down',name:'徐行・停止',tip:'斜め下に伸ばす合図は徐行・停止。後退では、さらに手のひらを後ろへ向け、腕を前後に動かします。',alt:'後方から見た自動車。運転者は右腕を右側の窓から出し、斜め下に伸ばして静止させている。'});
registerVisual([187],{type:'driver',key:'bikeleft',name:'左折・左への進路変更',tip:'二輪車で左腕を水平に伸ばす方法も、左折の合図になります。',alt:'後方から見た二輪車。運転者は左腕を左側へ水平に伸ばしている。'});


const EXTRA_VISUALS={
 'aux-time':{type:'aux',key:'entry',extra:'8–20',name:'車両進入禁止 · 8時〜20時',tip:'補助標識は、本標識の規制が適用される時間を補足します。',alt:'赤い円に白い横棒の標識。その下に、白い長方形で「8–20」と表示されている。'},
 'aux-except':{type:'aux',key:'entry',extra:'自転車を除く',name:'車両進入禁止 · 自転車を除く',tip:'自転車は対象外。普通自転車を対象外とする表示は特定小型原付にも適用されます。一般原付は除外されません。',alt:'赤い円に白い横棒の標識。その下に「自転車を除く」と表示されている。'},
 'direction':{type:'sign',key:'direction',name:'指定方向外進行禁止',tip:'図で指定された直進と左折の方向に進めます。右折はできません。',alt:'青い円に、上向きと左向きに分かれる白い矢印が描かれている。'}
};
for(const q of BANK){if(q.visual){const v=EXTRA_VISUALS[q.visual]||VISUALS[Number(q.visual)];if(v)registerVisual([q.id],v)}}

const SVGC={red:'#d82132',blue:'#174896',ink:'#243b53',skin:'#efbb91'};
function svgText(x,y,t,size=16,fill=SVGC.ink,anchor='middle'){return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="700">${esc(t)}</text>`}
function signSymbol(k){const {red:r,blue:b}=SVGC;const ring=(bg='#fff')=>`<circle cx="100" cy="100" r="83" fill="${bg}" stroke="${r}" stroke-width="18"/>`;const slash='<path d="M44 43L157 157" stroke="'+r+'" stroke-width="17"/>';const square=`<rect x="14" y="14" width="172" height="172" rx="5" fill="${b}" stroke="#fff" stroke-width="5"/>`;
 if(k==='direction')return `<circle cx="100" cy="100" r="89" fill="${b}"/><path d="M102 162V45M102 107H42" fill="none" stroke="#fff" stroke-width="19" stroke-linejoin="round"/><path d="M74 65L102 31L130 65ZM62 79L28 107L62 135Z" fill="#fff"/>`;
 if(k==='entry')return `<circle cx="100" cy="100" r="89" fill="${r}"/><path d="M36 100H164" stroke="#fff" stroke-width="25"/>`;
 if(k==='parking'||k==='stopping')return ring(b)+slash+(k==='stopping'?`<path d="M43 157L157 43" stroke="${r}" stroke-width="17"/>`:'');
 if(k==='maximum'||k==='minimum')return ring()+svgText(100,k==='minimum'?119:131,k==='minimum'?'50':'40',76,b)+(k==='minimum'?`<path d="M61 140H139" stroke="${b}" stroke-width="10"/>`:'');
 if(k==='warning')return '<path d="M100 7L193 100L100 193L7 100Z" fill="#ffd640" stroke="#242424" stroke-width="5"/>'+ '<path d="M100 49V151M49 100H151" stroke="#242424" stroke-width="21"/>';
 if(k==='stop'||k==='slow')return `<path d="M10 26H190L100 184Z" fill="${k==='stop'?r:'#fff'}" stroke="${r}" stroke-width="9" stroke-linejoin="round"/>`+svgText(100,94,k==='stop'?'止まれ':'徐行',k==='stop'?35:42,k==='stop'?'#fff':b);
 if(k==='closed')return ring()+`<path d="M38 59L161 119M38 119L161 59" stroke="${r}" stroke-width="13"/>`+svgText(100,148,'通行止',24,b);
 if(k==='vehicles')return ring()+slash;
 if(k==='car')return ring()+`<path d="M49 99L61 66H136L151 99V140H49Z" fill="${b}"/><path d="M69 73H128L136 96H61Z" fill="#fff"/><path d="M98 73V96" stroke="${b}" stroke-width="5"/><circle cx="65" cy="115" r="7" fill="#fff"/><circle cx="135" cy="115" r="7" fill="#fff"/><path d="M58 133V147M143 133V147" stroke="${b}" stroke-width="12"/>`+slash;
 if(k==='truck')return ring()+`<path d="M39 71H113V118H39ZM116 84H143L163 103V124H116Z" fill="${b}"/><path d="M125 89H140L150 102H125Z" fill="#fff"/><circle cx="64" cy="125" r="15" fill="${b}"/><circle cx="142" cy="125" r="15" fill="${b}"/>`+slash;
 if(k==='motorcycle')return ring()+`<g fill="none" stroke="${b}" stroke-width="10"><circle cx="55" cy="122" r="20"/><circle cx="147" cy="122" r="20"/><path d="M55 122L81 89H124L147 122M83 90L103 120H148M127 91L119 69H104"/></g><path d="M72 83H104" stroke="${b}" stroke-width="12"/><circle cx="101" cy="48" r="10" fill="${b}"/><path d="M93 60L82 78L103 91L96 113M94 66L117 77" fill="none" stroke="${b}" stroke-width="12"/>`+slash;
 if(k==='uturn')return ring()+`<path d="M133 146V77C133 39 74 39 74 77V109" fill="none" stroke="${b}" stroke-width="13"/><path d="M49 99L74 132L98 99Z" fill="${b}"/>`+slash;
 if(k==='stopline')return square+`<path d="M41 62H159" stroke="#fff" stroke-width="26"/>`+svgText(100,135,'停止線',34,'#fff');
 if(k==='oneway')return `<rect x="4" y="48" width="192" height="104" rx="4" fill="${b}"/><path d="M26 84H119V67L172 100L119 133V116H26Z" fill="#fff"/>`;
 if(k==='horn')return `<circle cx="100" cy="100" r="89" fill="${b}"/><path d="M38 94Q25 100 38 107L49 114V88Z" fill="#fff"/><path d="M58 82L82 59L78 76L111 50L110 67L149 35V60L110 83L115 67L79 93L83 77Z M58 120L82 142L78 126L111 151L110 134L149 167V142L110 118L115 135L79 108L83 125Z" fill="#fff"/>`;
 if(k==='bus')return square+`<rect x="25" y="23" width="150" height="154" rx="4" fill="none" stroke="#fff" stroke-width="2"/><path d="M40 38V151M160 38V151" stroke="#fff" stroke-width="6" stroke-dasharray="18 12"/><path d="M62 54Q64 41 76 41H130Q140 41 141 54V75H59Z" fill="#fff"/><path d="M67 49H133V58H65Z" fill="${b}"/><path d="M77 48V59M93 48V59M109 48V59M123 48V59" stroke="#fff" stroke-width="4"/><circle cx="73" cy="76" r="9" fill="#fff" stroke="${b}" stroke-width="2"/><circle cx="127" cy="76" r="9" fill="#fff" stroke="${b}" stroke-width="2"/>`+svgText(100,110,'優先',26,'#fff')+'<path d="M91 121H109V140H127L100 167L73 140H91Z" fill="#fff"/>';
 if(k==='beginner')return '<path d="M100 48L45 10Q30 3 30 25V126Q30 140 43 150L100 192L157 150Q170 140 170 126V25Q170 3 155 10Z" fill="#16905b" stroke="#fff" stroke-width="5"/><path d="M100 48L45 10Q30 3 30 25V126Q30 140 43 150L100 192Z" fill="#ffdb38"/>';
 if(k==='learner')return '<rect x="5" y="28" width="190" height="144" fill="#fff" stroke="#222" stroke-width="3"/>'+svgText(100,90,'仮免許',38,'#111')+svgText(100,140,'練習中',38,'#111');
 return '';
}
function drawCar(x,y,rotation=0){return `<g transform="translate(${x} ${y}) rotate(${rotation})"><rect x="-15" y="-24" width="30" height="48" rx="8" fill="#496b8e" stroke="#fff" stroke-width="2"/><path d="M-11 -13H11L9 -5H-9Z" fill="#c9e5f4"/><path d="M-9 13H9L11 18H-11Z" fill="#a1c0d6"/><path d="M-12 -20H-7M7 -20H12" stroke="#fff0be" stroke-width="3"/></g>`}
function policeman(pose){const vertical=pose==='vertical'||pose==='lampup',lamp=pose==='lamp'||pose==='lampup';const right=vertical?'M157 103L139 103V24':'M157 103H93';const left='M201 103H267';return `<g><path d="M161 155L155 198M197 155L203 198" stroke="#263d57" stroke-width="16" stroke-linecap="round"/><path d="M153 197H164M199 197H210" stroke="#172a3d" stroke-width="10" stroke-linecap="round"/><path d="M156 91Q180 80 202 91L201 158H157Z" fill="#a6c9e3" stroke="#365975" stroke-width="2"/><path d="${right}" fill="none" stroke="#a6c9e3" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/>${!vertical?`<path d="${left}" stroke="#a6c9e3" stroke-width="14" stroke-linecap="round"/>`:'<path d="M201 101L212 148" stroke="#a6c9e3" stroke-width="14" stroke-linecap="round"/>'}<path d="M157 147H202" stroke="#263d57" stroke-width="7"/><path d="M181 91V146" stroke="#fff" stroke-width="5"/><path d="M177 90L181 111L185 90" fill="#263d57"/><circle cx="179" cy="63" r="22" fill="#efbb91"/><path d="M157 57Q179 33 202 57V64H157Z" fill="#263d57"/><path d="M153 58H205" stroke="#263d57" stroke-width="6"/><circle cx="179" cy="49" r="4" fill="#f4d06e"/><circle cx="172" cy="68" r="2" fill="#263d57"/><circle cx="186" cy="68" r="2" fill="#263d57"/><path d="M174 77Q179 81 184 77" fill="none" stroke="#9c6445" stroke-width="2"/>${vertical?'<rect x="132" y="12" width="14" height="19" rx="5" fill="#fff" stroke="#526b80"/>':'<rect x="80" y="96" width="18" height="14" rx="5" fill="#fff" stroke="#526b80"/>'}${!vertical?'<rect x="262" y="96" width="18" height="14" rx="5" fill="#fff" stroke="#526b80"/>':''}${lamp?`<path d="${vertical?'M139 20V0':'M90 100L78 78'}" stroke="#374151" stroke-width="6"/><circle cx="${vertical?139:77}" cy="${vertical?0:74}" r="9" fill="#f5b942" stroke="#8b691d" stroke-width="2"/>`:''}</g>`}
function sceneSVG(v){let body='',height=240;
 if(v.type==='aux'){height=285;body=`<g transform="translate(90 6) scale(.9)">${signSymbol(v.key)}</g><rect x="65" y="201" width="230" height="58" rx="3" fill="#fff" stroke="#263d57" stroke-width="2"/>`+svgText(180,239,v.extra,v.extra.length>6?25:32,'#172a3d')}
 else if(v.type==='sign'){if(v.key==='stopslow'){body=`<g transform="translate(7 18) scale(.82)">${signSymbol('stop')}</g><g transform="translate(188 18) scale(.82)">${signSymbol('slow')}</g>`;height=205}else{body=`<g transform="translate(90 10) scale(.9)">${signSymbol(v.key)}</g>`;height=200}}
 else if(v.type==='mark'){body='<rect x="16" y="15" width="328" height="200" rx="10" fill="#526273"/><path d="M41 22V208M319 22V208" stroke="#fff" stroke-width="3"/>';if(v.key==='noarea'){body+='<path d="M125 47H235V184H125Z" fill="#526273" stroke="#f5ce47" stroke-width="6"/>';for(let y=66;y<180;y+=26)body+=`<path d="M134 ${y}L226 ${y-12}" stroke="#fff" stroke-width="6"/>`}else body+='<path d="M112 46H248V184H112ZM112 46L248 184M248 46L112 184" fill="none" stroke="#fff" stroke-width="6"/>';height=230}
 else if(v.type==='police'){height=330;body='<rect x="12" y="115" width="336" height="100" fill="#e8edf3"/><rect x="124" y="15" width="112" height="292" fill="#e8edf3"/><path d="M19 165H87M273 165H341M180 240V295" stroke="#fff" stroke-width="3" stroke-dasharray="12 9"/>'+`<g transform="translate(0 26)">${policeman(v.key)}</g>`+svgText(180,251,'警察官の正面',16);
 if(v.approach==='side')body+=drawCar(52,181,90)+'<path d="M79 181H116M108 174L117 181L108 188" stroke="#496b8e" stroke-width="3" fill="none"/>'+svgText(53,234,'あなたの車',16);else body+=drawCar(180,294)+'<path d="M180 266V257M174 263L180 256L186 263" stroke="#496b8e" stroke-width="3" fill="none"/>'+svgText(260,297,'あなたの車',16);
 if(v.key==='lamp'||v.key==='lampup')body+='<path d="M20 64H113M20 64L28 58M20 64L28 70M113 64L105 58M113 64L105 70" stroke="#8b691d" stroke-width="2.5" fill="none"/>'+svgText(68,44,v.key==='lampup'?'直前の振り方向':'灯火を振る方向',14,'#715417');
 if(v.key==='lampup')body+=svgText(258,28,'今：頭上へ',13);
 if(v.signal)body+='<rect x="262" y="23" width="84" height="30" rx="12" fill="#263d57"/><circle cx="278" cy="38" r="9" fill="#22c997"/><circle cx="305" cy="38" r="9" fill="#5b6e79"/><circle cx="331" cy="38" r="9" fill="#5b6e79"/>';
 }
 else if(v.type==='driver'){height=256;body=svgText(180,22,'後ろから見た図',14)+`<path d="M180 43V64M173 51L180 42L187 51" stroke="#7c8e9f" stroke-width="2" fill="none"/>`+svgText(221,55,'進行方向',11,'#637b90');
 if(v.key==='bikeleft'){body+='<ellipse cx="180" cy="223" rx="11" ry="22" fill="#283f55"/><path d="M162 199V226M198 199V226" stroke="#283f55" stroke-width="10"/><rect x="158" y="183" width="44" height="31" rx="8" fill="#7192aa"/><circle cx="180" cy="95" r="23" fill="#d8e5ef" stroke="#526c85" stroke-width="3"/><path d="M164 116H196L202 173H157Z" fill="#4b789e"/><path d="M162 127H73" stroke="#efbb91" stroke-width="14" stroke-linecap="round"/><path d="M196 127L219 151" stroke="#4b789e" stroke-width="14" stroke-linecap="round"/>'+svgText(71,109,'左腕',16)}
 else{body+='<path d="M74 152L86 91H202L219 152V221H69Z" fill="#8aacc5" stroke="#3c607e" stroke-width="3"/><path d="M94 103H194L204 151H85Z" fill="#e4eef5"/><path d="M102 111H188L194 141H95Z" fill="#c0d5e5"/><circle cx="184" cy="118" r="13" fill="#efbb91"/><path d="M171 134H194V156H171Z" fill="#365f80"/><path d="M73 181H98M190 181H215" stroke="#b45358" stroke-width="9"/><rect x="124" y="190" width="42" height="18" rx="3" fill="#f8fafc"/><path d="M83 219V231M207 219V231" stroke="#263d57" stroke-width="14"/>';
 const arm=v.key==='bend'?'M195 140H265V78':v.key==='straight'?'M195 140H307':'M195 140L274 204';body+=`<path d="${arm}" fill="none" stroke="#365f80" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/><path d="${v.key==='bend'?'M239 140H265V80':v.key==='straight'?'M235 140H307':'M222 162L274 204'}" fill="none" stroke="#efbb91" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`+svgText(292,v.key==='down'?165:120,'右腕',16);if(v.key==='down')body+=svgText(288,235,'腕は静止',12,'#637b90');}
 }
 return `<svg class="question-svg" viewBox="0 0 360 ${height}" role="img" aria-label="${esc(v.alt)}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui,'Noto Sans CJK JP',sans-serif">${body}</svg>`;
}
const IMGQ={"305":"./image-e983ea806e4f.png","307":"./image-b0038f725f5c.png","309":"./image-709a3dd25201.png","313":"./image-c81ee7a28599.png","314":"./image-31d37e41c233.png","315":"./image-d98fd5846ec9.png","316":["./image-ab0667b46af0.png","./image-d1683db0556c.png"],"317":"./image-b6fc65013940.png","318":"./image-37291fd5ab79.png","330":"./image-af0a81668f39.png","339":"./image-6054b170c2b6.png","352":"./image-6028d71c3937.png","353":"./image-f66bd89db03f.png","359":"./image-d7aa6047b402.png","360":"./image-d98fd5846ec9.png","362":"./image-0099ceae1ac5.png","363":"./image-8950862ac005.png","364":"./image-d98fd5846ec9.png","365":"./image-ab0667b46af0.png","366":"./image-d04e022894be.png","367":"./image-24946ef9f8d0.png","368":"./image-7562b75403f5.png","370":"./image-1b2964732c7d.png","371":"./image-60e66a4754ae.png","379":"./image-979349c747a6.png","390":["./image-ab0667b46af0.png","./image-b0038f725f5c.png"]};

const OWNART={};
const IMAGE_SOURCES={"mlit":{"publisher":"国土交通省","title":"道路標識一覧","url":"https://www.mlit.go.jp/road/sign/sign/douro/ichiran.pdf","note":"図部分を抜粋"},"npa":{"publisher":"警察庁","title":"交通規制基準（令和8年3月16日改正）","url":"https://www.npa.go.jp/bureau/traffic/seibi2/kisei/mokuteki/kiseikijun/260316kiseikijun.pdf","note":"図版を抽出"},"hyogo":{"publisher":"兵庫県警察・加古川警察署","title":"加古川交通安全ニュース 令和5年第6号","url":"https://www.police.pref.hyogo.lg.jp/ps/30kakogawa/data/koutsunews202306.pdf","note":"信号機の図部分を抜粋"},"jaf":{"publisher":"JAF Mate Online","title":"交差点で正面を向いた警察官が腕を水平に上げていたらどうする?","url":"https://jafmate.jp/safety/licensetest_20260408.html","note":"腕を水平に上げた警察官の図を抜粋し、試験の図に合わせて矢印を追加"},"unten-lanes":{"publisher":"水原自動車学校","title":"項目１０ 対策問題（問4）","url":"https://www.unten.co.jp/gakka/item1-10/q1-10/","note":"教材に掲載された図を使用"},"unten-signal":{"publisher":"水原自動車学校","title":"項目９ 対策問題（問7）","url":"https://www.unten.co.jp/gakka/item1-9/q1-9/","note":"教材に掲載された図を使用"}};
const IMAGE_META={"366":{"source":"mlit","name":"車両（組合せ）通行止め：自動車と原付","alt":"赤い円と斜線の内側に、上に自動車、下に原付に乗った人の絵。","layout":"single"},"305":{"source":"mlit","name":"車両（組合せ）通行止め","alt":"赤い円の内側に、上に自動車、下に二輪車の絵。","layout":"single"},"307":{"source":"mlit","name":"車両横断禁止","alt":"赤い円と斜線の中に、右へ曲がる青い矢印。","layout":"single"},"313":{"source":"mlit","name":"その他の危険","alt":"黄色のひし形に黒い感嘆符。","layout":"single"},"314":{"source":"mlit","name":"優先道路","alt":"青い四角の中に、縦の道が太い白い交差の記号。","layout":"single"},"315":{"source":"mlit","name":"二輪の自動車以外の自動車通行止め","alt":"赤い円と斜線の中に、自動車を正面から見た青い絵。","layout":"single"},"316":{"source":"mlit","name":"転回禁止・区間内","alt":"赤い円と斜線の中にU字の青い矢印。その下に左右両向きの赤い矢印。","layout":"stacked"},"317":{"source":"mlit","name":"重量制限","alt":"赤い円の中に青色で5.5tと表示されている。","layout":"single"},"318":{"source":"mlit","name":"幅員減少","alt":"黄色いひし形に、左右から道幅が狭くなる黒い線。","layout":"single"},"330":{"source":"mlit","name":"通行止め","alt":"赤い円と交差した赤い帯、下部に通行止の文字。","layout":"single"},"353":{"source":"mlit","name":"横断歩道","alt":"上がとがった青い五角形に、歩行者と白いしまの絵。","layout":"single"},"360":{"source":"mlit","name":"二輪の自動車以外の自動車通行止め","alt":"赤い円と斜線の中に、自動車を正面から見た青い絵。","layout":"single"},"363":{"source":"mlit","name":"歩行者等専用","alt":"青い円の中に、大人と子どもの白い絵。","layout":"single"},"364":{"source":"mlit","name":"二輪の自動車以外の自動車通行止め","alt":"赤い円と斜線の中に、自動車を正面から見た青い絵。","layout":"single"},"365":{"source":"mlit","name":"転回禁止","alt":"赤い円と斜線の中に、U字に曲がる青い矢印。","layout":"single"},"367":{"source":"mlit","name":"横断歩道・自転車横断帯","alt":"上がとがった青い標識に、歩行者・自転車と白いしまの絵。","layout":"single"},"371":{"source":"mlit","name":"中央線","alt":"青い四角に、中央線の文字と白い下向き矢印。","layout":"single"},"390":{"source":"mlit","name":"左：転回禁止 ／ 右：車両横断禁止","alt":"赤い円と斜線の標識が2つ。左はU字の矢印、右は右へ曲がる矢印。","layout":"paired"},"359":{"source":"npa","name":"進行方向別通行区分","alt":"4つの車両通行帯に白い矢印。左から左折、直進、直進、右折。","page":"本文110ページ","layout":"single"},"362":{"source":"hyogo","name":"赤色の灯火の点滅","alt":"信号機の赤い灯火が点滅している。","page":"","layout":"single"},"368":{"source":"npa","name":"立入り禁止部分","alt":"灰色の路面に、黄色い縁線と白い斜線で囲まれた細長い部分。","page":"本文117ページ","layout":"single"},"379":{"source":"npa","name":"安全地帯","alt":"灰色の路面に、黄色い外枠と白い内枠の長方形。右側に軌道がある。","page":"本文120ページ","layout":"single"},"309":{"source":"mlit","name":"横断歩道","alt":"上がとがった青い五角形に、子ども2人と横断歩道の白いしまの絵。","layout":"single"},"370":{"source":"jaf","name":"腕を横に水平に上げた手信号（矢印の方向＝青、正面・背中側＝赤）","alt":"正面を向いた警察官が両腕を左右に水平に伸ばし、左右から警察官に向かう矢印がある。","layout":"single"},"339":{"source":"unten-lanes","name":"黄色の線で区画された車両通行帯","alt":"交差点の手前の3つの車両通行帯。左側の通行帯同士が黄色い実線で区切られ、その右側には白い中央線がある。","layout":"single"},"352":{"source":"unten-signal","name":"右腕を水平に伸ばす合図","alt":"車を後方から見た図。右側の運転席に座る人が、右腕を車外へ水平に伸ばしている。","layout":"single"}};
function questionArt(q,revealed=false,compact=false){
 const v=VISUALS[q.id];
 if(!v){
  const im=IMGQ[q.id];if(!im)return '';
  const m=IMAGE_META[q.id],src=m?IMAGE_SOURCES[m.source]:null,images=Array.isArray(im)?im:[im];
  const alt=m?.alt||`${q.src||'設問'}の図`;
  const caption=revealed?`<figcaption class="visual-answer">${m?`<b>${esc(m.name)}</b><p class="image-credit">出典：<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.publisher)}「${esc(src.title)}」 ↗</a><br>${esc(m.page||'')}${m.page?'・':''}${esc(src.note)}。</p>`:(OWNART[q.id]?`<b>${esc(OWNART[q.id])}</b><p class="image-credit">実際の試験の図（公的資料に同じ組合せの図がないため）。</p>`:'<p class="image-credit">提供された練習問題の図。</p>')}</figcaption>`:'';
  return `<figure class="question-visual ${compact?'compact':''}" data-question-visual="${q.id}" data-revealed="${revealed}" data-image-origin="${m?'public-source':'provided'}"><div class="question-visual-head"><span>問題の図</span>${compact?'':`<button class="textbtn" data-action="question-zoom" data-id="${q.id}" data-revealed="${revealed}" aria-label="設問の図を拡大">拡大 ↗</button>`}</div><div class="sourced-pictures ${m?.layout||'single'}">${images.map((url,i)=>`<img src="${url}" alt="${esc(images.length===1?alt:i===0?alt:'組み合わせた図の2枚目')}" decoding="async">`).join('')}</div>${caption}</figure>`;
 }
 return `<figure class="question-visual ${compact?'compact':''}" data-question-visual="${q.id}" data-revealed="${revealed}"><div class="question-visual-head"><span>${['sign','aux'].includes(v.type)?'標識・マーク':v.type==='mark'?'路面の図':'手信号の図'}</span>${compact?'':`<button class="textbtn" data-action="question-zoom" data-id="${q.id}" data-revealed="${revealed}" aria-label="設問のイラストを拡大">拡大 ↗</button>`}</div>${sceneSVG(v)}${revealed?`<figcaption class="visual-answer"><b>${esc(v.name)}</b><p>${esc(v.tip)}</p></figcaption>`:''}</figure>`}
function openQuestionArt(id,revealed=false){const q=byId.get(id);if(!q||(!VISUALS[id]&&!IMGQ[id]))return;if(state.session?.mode==='exam')revealed=false;$('figure-content').innerHTML=questionArt(q,revealed,false);$('figure-zoom').value='100';$('figure-content').style.width='100%';$('figure-dialog').showModal()}

function focusQuestion(){requestAnimationFrame(()=>$('question')?.focus({preventScroll:true}))}
function progress(s){const done=s.answers.filter(a=>a!==null).length;$('count').textContent=`${s.index+1} / ${s.ids.length}問`;$('bar').style.width=done/s.ids.length*100+'%';$('progress').setAttribute('aria-valuenow',String(done));$('progress').setAttribute('aria-valuemax',String(s.ids.length));$('play-title').textContent=s.label;if(s.mode==='drill')$('score').textContent=`正解 ${s.answers.filter((a,i)=>a!==null&&a===byId.get(s.ids[i]).a).length}問`}
function noteFor(q){return NOTES.find(n=>n.figs[0]===q.fig)||NOTES.find(n=>n.figs.includes(q.fig))}
function sourceFor(q){
 if(q.visual==='aux-except')return REFS.special;
 if(q.fig==='speed-2026'||q.id===57)return REFS.speed;
 if(q.fig==='cycle-gap')return REFS.bicycle;
 if(q.topic==='車種'||q.id===373)return REFS.moped;
 const v=VISUALS[q.id];if(v)return {url:REFS.rules.url+'#page='+(v.type==='driver'?51:v.type==='police'?95:v.type==='aux'?109:97)};
 return REFS.rules;
}
function figHTML(k){const f=FIG[k];if(!f)return '';const id='arw-'+(++figureNumber);const b=carify(f.b).replaceAll('url(#arrow)',`url(#${id})`);return `<figure class="fig"><figcaption class="fig-top">${esc(f.t)} <button class="textbtn" data-action="figure-open" data-fig="${k}">拡大 ↗</button></figcaption><svg viewBox="0 0 380 ${f.h}" role="img" aria-label="${esc(f.t)}"><defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#475b70" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>${b}</svg>${FIGK[k]?`<div class="figk"><b>覚えるポイント</b>${esc(FIGK[k])}</div>`:''}</figure>`}
function explain(q,chosen,withNote=true,nextControl=''){const n=noteFor(q),correct=chosen===q.a;return `<div class="feedback ${correct?'':'incorrect'}" role="status"><h3>${chosen===null?'未回答':correct?'正解です':'ここを覚え直そう'} · 答えは ${q.a?'○':'×'}</h3><p>${esc(q.ex)}</p></div>${nextControl}<div class="explanation">${FIG[q.fig]?`<p class="figure-summary"><b>図解の要点</b><br>${esc(FIGK[q.fig]||FIG[q.fig]?.t||'')}</p><details class="inline-figure" open><summary>この問題の図解を開く・拡大する</summary>${figHTML(q.fig)}</details>`:''}${n&&n.figs[0]===q.fig?`<p class="hintline">${esc(n.trap)}</p>`:''}<div class="question-links">${n&&withNote?`<button class="textbtn" data-action="note" data-id="${n.id}">図解ノートで確認 →</button>`:'<span></span>'}<a class="source-link" href="${sourceFor(q).url}" target="_blank" rel="noopener">公式資料 ↗</a></div></div>`}
function renderDrill(){const s=state.session;if(s?.mode!=='drill')return;progress(s);const q=byId.get(s.ids[s.index]),v=s.answers[s.index],answered=v!==null;const nextLabel=s.index===s.ids.length-1?'結果を見る':'次の問題へ';const nextControl=`<div class="answer-next"><button class="btn wide" id="next" data-action="next">${nextLabel} ${icon('arrow')}</button></div>`;
 $('app').innerHTML=`<article class="card question-card"><div class="tags"><span class="question-index">問題 ${String(s.index+1).padStart(2,'0')}</span><span class="badge">${q.topic}</span>${!q.chapter?'<span class="badge">補足・仮免模試対象外</span>':''}${weak(q)?`<span class="badge error">要復習</span>`:''}${q.revised?'<span class="badge">内容を更新</span>':''}<span class="qnumber">${q.src?esc(q.src):`No.${q.id}`}</span></div><h2 class="question" id="question" tabindex="-1">${esc(q.q)}</h2>${questionArt(q,answered)}${!answered?`<label class="confidence-control"><input type="checkbox" id="uncertain" ${s.uncertain?.[s.index]?'checked':''}> 自信なし・迷っている</label>`:s.uncertain?.[s.index]?'<p class="hintline">自信なし：正解でも復習に残しました。</p>':''}<p class="choose-label">正しければ ○、誤りなら ×</p><div class="choices">${[true,false].map(a=>`<button id="b-${a?'o':'x'}" class="answer-btn ${answered?(a===q.a?'right':a===v?'wrong':''):''}" data-action="answer" data-value="${a}" ${answered?'disabled':''} aria-label="${a?'正しい（○）':'誤り（×）'}"><span>${a?'○':'×'}</span><small>${a?'正しい':'誤り'}</small></button>`).join('')}</div>${answered?`${explain(q,v,true,nextControl)}<div class="answer-next"><button class="btn secondary wide" data-action="next">${nextLabel} ${icon('arrow')}</button></div>`:''}<div class="btnrow exam-nav"><button class="btn secondary" data-action="drill-prev" ${s.index===0?'disabled':''}>前の問題</button><button class="btn secondary" data-action="drill-skip" ${s.index===s.ids.length-1?'disabled':''}>次の問題</button></div></article><details class="exam-map drill-map"><summary>問題一覧 <span class="muted">番号をタップで移動</span></summary><div class="number-grid">${s.ids.map((id,i)=>{const a=s.answers[i],cls=a===null?'':(a===byId.get(id).a?'ok':'ng');return `<button class="${cls} ${i===s.index?'current':''}" data-action="drill-jump" data-index="${i}" aria-label="問${i+1} ${a===null?'未回答':(cls==='ok'?'正解':'不正解')}">${i+1}</button>`}).join('')}</div><p class="hintline">緑＝正解　赤＝不正解　白＝未回答</p></details>`;
}
function drillJump(i){const s=state.session;if(s?.mode!=='drill'||i<0||i>=s.ids.length)return;s.index=i;persist();renderDrill();scrollTopPage();focusQuestion()}
function answer(v){const s=state.session;if(s?.mode!=='drill'||s.answers[s.index]!==null)return;s.answers[s.index]=v;s.uncertain??=s.ids.map(()=>false);s.uncertain[s.index]=Boolean($('uncertain')?.checked);sfx(record(s.ids[s.index],v,s.uncertain[s.index]));persist();renderDrill();$('next')?.focus({preventScroll:true})}
function nextDrill(){const s=state.session;if(s?.mode!=='drill'||s.answers[s.index]===null)return;if(s.index===s.ids.length-1){completeDrill();return}s.index++;persist();renderDrill();scrollTopPage();focusQuestion()}
function completeDrill(){
 const s=state.session;if(s?.mode!=='drill')return;
 const unanswered=s.answers.filter(a=>a===null).length;
 const finish=()=>{if(state.session!==s)return;for(let i=0;i<s.ids.length;i++){if(s.answers[i]===null)record(s.ids[i],null,true)}reviewFilter='wrong';lastResult={...s,timeout:false};state.session=null;persist();setExamLock();renderResult();scrollTopPage()};
 if(unanswered)ask('未回答が'+unanswered+'問あります','練習を終えると、未回答も不正解として復習に追加します。続ける場合はキャンセルしてください。','結果を見る',finish);else finish();
}

function pickExam(){
 const result=[],seen=new Set();
 for(const {chapter,count} of EXAM_BLUEPRINT){
  const candidates=shuffle(Q.filter(q=>q.chapter===chapter)),chosen=[];
  const add=q=>{if(chosen.length<count&&!seen.has(q.concept)){chosen.push(q.id);seen.add(q.concept)}};
  // Cover each available section, then fill the remaining chapter quota.
  for(const section of shuffle([...new Set(candidates.map(q=>q.section))])){const q=candidates.find(q=>q.section===section&&!seen.has(q.concept));if(q)add(q)}
  for(const q of candidates)add(q);
  if(chosen.length!==count)throw new Error('章別の出題数を確保できません');
  result.push(...chosen);
 }
 return shuffle(result);
}
function startExam(form=null){
 if(form&&!ASSESSMENT_FORMS[form])return;
 replaceSession(()=>{
  const initial=Boolean(form&&!state.checks[form]),title=form?`判定テスト ${form} · ${initial?'初回':'再挑戦'}`:'50問の練習模試';
  const message=form?`50問・30分。${initial?'通常の練習と別の設問です。この最初の結果を判定に使います。':'再挑戦の記録です。初回の結果は上書きしません。'}解説は採点後。途中で終了すると未回答は不正解になり、画面を閉じても時間は進みます。`:'仮免の練習問題から、公式の章別配分で50問出題します。30分・45点が基準です。見たことのある問題を含むため、初回判定とは別の練習記録になります。';
  ask(title,message,'テストを開始',()=>{
   const ids=form?shuffle(ASSESSMENT_FORMS[form].map(q=>q.id)):pickExam(),now=Date.now();
   clearInterval(timer);
   if(form&&!state.checks[form])state.checks[form]={startedAt:now,first:null};
   state.session={mode:'exam',ids,answers:ids.map(()=>null),uncertain:ids.map(()=>false),flags:ids.map(()=>false),index:0,label:title,pool:'exam',started:now,end:now+1800000,examKind:form?'assessment':'practice',form,firstAttempt:initial,blueprint:BLUEPRINT_VERSION};
   lastResult=null;persist();showPlay();renderExam();startTimer();scrollTopPage();focusQuestion();
  });
 });
}
function startTimer(){clearInterval(timer);if(state.session?.mode==='exam'){timer=setInterval(tick,500);tick()}}
function tick(){const s=state.session;if(s?.mode!=='exam'){clearInterval(timer);return}const seconds=Math.ceil(Math.max(0,s.end-Date.now())/1000);$('score').innerHTML=`<span class="timer ${seconds<=300?'low':''}">残り ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}</span>`;if(seconds<=0)finishExam(true)}
function examExpired(){if(state.session?.mode==='exam'&&Date.now()>=state.session.end){finishExam(true);return true}return false}
function renderExam(){const s=state.session;if(s?.mode!=='exam'||examExpired())return;progress(s);const q=byId.get(s.ids[s.index]),v=s.answers[s.index],done=s.answers.filter(a=>a!==null).length;
 $('app').innerHTML=`<article class="card question-card"><div class="tags"><span class="question-index">問題 ${String(s.index+1).padStart(2,'0')}</span><span class="badge">${esc(examName(s))}</span><span class="qnumber">${done}問 回答済み</span></div><h2 class="question" id="question" tabindex="-1">${esc(q.q)}</h2>${questionArt(q,false)}<p class="choose-label">回答を選択して、次へ進んでください</p><div class="choices">${[true,false].map(a=>`<button class="answer-btn ${v===a?'selected':''}" id="b-${a?'o':'x'}" data-action="exam-answer" data-value="${a}" aria-pressed="${v===a}" aria-label="${a?'正しい（○）':'誤り（×）'}"><span>${a?'○':'×'}</span><small>${a?'正しい':'誤り'}</small></button>`).join('')}</div><div class="exam-tools"><button class="flag-btn" data-action="flag" aria-pressed="${Boolean(s.flags[s.index])}">${icon('flag')}あとで見直す</button><button class="textbtn" data-action="next-unanswered">未回答へ →</button></div><div class="btnrow exam-nav"><button class="btn secondary" data-action="exam-prev" ${s.index===0?'disabled':''}>前の問題</button><button class="btn" data-action="exam-next">${s.index===49?'回答を確認':'次の問題'} ${icon('arrow')}</button></div></article><details class="exam-map" id="exam-map"><summary>回答一覧 · 未回答 ${50-done}問 / 見直し ${s.flags.filter(Boolean).length}問</summary><div class="number-grid">${s.ids.map((_,i)=>`<button class="${s.answers[i]!==null?'done ':''}${i===s.index?'current ':''}${s.flags[i]?'flagged':''}" data-action="exam-jump" data-index="${i}" aria-label="問${i+1} ${s.answers[i]===null?'未回答':'回答済み'}${s.flags[i]?' 見直しあり':''}">${i+1}</button>`).join('')}</div><p class="hintline">青い背景＝回答済み　点＝あとで見直す</p></details><button class="textbtn" data-action="exam-submit">テストを終了して採点する</button><p class="muted">途中の回答は自動保存。解説は採点後に表示します。</p>`;tick();
}
function setExamAnswer(v){const s=state.session;if(s?.mode!=='exam'||examExpired())return;s.answers[s.index]=v;persist();renderExam();$('b-'+(v?'o':'x'))?.focus({preventScroll:true})}
function examJump(index){const s=state.session;if(s?.mode!=='exam'||examExpired())return;s.index=Math.max(0,Math.min(49,index));persist();renderExam();scrollTopPage();focusQuestion()}
function submitExam(){const s=state.session;if(s?.mode!=='exam'||examExpired())return;const left=s.answers.filter(a=>a===null).length;ask('テストを採点しますか？',left?`未回答が${left}問あります。未回答は不正解として採点し、復習にも追加します。`:'50問すべて回答済みです。採点すると回答は変更できません。','採点する',()=>finishExam(false))}
function finishExam(timeout){
 const s=state.session;if(s?.mode!=='exam')return;
 clearInterval(timer);timer=null;
 for(const id of ['confirm','settings','figure-dialog'])if($(id).open)$(id).close();modalAction=null;
 s.ids.forEach((id,i)=>record(id,s.answers[i]));
 const score=s.ids.filter((id,i)=>s.answers[i]===byId.get(id).a).length;
 const entry={at:Date.now(),score,total:50,ids:[...s.ids],answers:[...s.answers],timeout:Boolean(timeout),examKind:examKind(s),form:s.form,firstAttempt:s.firstAttempt,blueprint:s.blueprint};
 if(examKind(s)==='assessment'){
  const c=state.checks[s.form]||{startedAt:s.started,first:null};
  if(s.firstAttempt&&!c.first)c.first={...entry};c.completed=true;
  state.checks[s.form]=c;
 }
 state.history.push(entry);state.history=state.history.slice(-10);
 reviewFilter='wrong';lastResult={...s,...entry,timeout};state.session=null;persist();setExamLock();showPlay();renderResult();scrollTopPage();$('result-title')?.focus({preventScroll:true});
}
function renderReviewItem(id,v,index,exam=false){const q=byId.get(id),ok=v===q.a;return `<details class="review-item"><summary><span class="answer-status ${ok?'ok':''}">${v===null?'—':ok?'✓':'×'}</span><span><span class="muted">${exam?'問'+(index+1)+' · ':''}${q.topic}</span><br>${esc(q.q)}</span></summary><div class="review-body"><p class="answer-label">${v===null?'未回答':'あなたの回答：'+(v?'○':'×')} ／ 正解：${q.a?'○':'×'}</p><p>${esc(q.ex)}</p>${questionArt(q,true)}<div class="lazy-figure" data-fig="${q.fig}"></div><a class="source-link muted" href="${sourceFor(q).url}" target="_blank" rel="noopener">公式資料で確認 ↗</a></div></details>`}
function renderResult(){
 const r=lastResult;if(!r)return;
 const score=r.ids.filter((id,i)=>r.answers[i]===byId.get(id).a).length,wrong=r.ids.filter((id,i)=>r.answers[i]!==byId.get(id).a),unanswered=r.answers.filter(a=>a===null).length,exam=r.mode==='exam';
 const byCat=CATS.map(c=>({label:c.label,n:wrong.filter(id=>c.topics.includes(byId.get(id).topic)).length})).filter(x=>x.n).sort((a,b)=>b.n-a.n);
 document.body.dataset.view='result';$('play-title').textContent=exam?examName(r):r.label;$('count').textContent='結果';$('score').textContent='';$('bar').style.width='100%';$('progress').setAttribute('aria-valuenow',String(r.ids.length));$('progress').setAttribute('aria-valuemax',String(r.ids.length));
 $('app').innerHTML=`<article class="card result-card"><p class="result-greeting"><span aria-hidden="true">✓</span>おつかれさまでした！</p><div class="result-hero"><div><h2 class="result-label" id="result-title" tabindex="-1">${r.timeout?'制限時間になりました':exam?examName(r)+'の結果':'今回の練習結果'}</h2><div class="score">${score}<small> / ${r.ids.length}問 正解</small></div><p class="result-rate">正答率 <b>${Math.round(score/r.ids.length*100)}%</b></p></div><img class="result-character" src="${DESIGN_MASCOTS}" alt="プーリーくんとよりともさん"></div><span class="badge ${exam?(score>=45?'success':'error'):wrong.length?'error':'success'}">${exam?(score>=48?'学習目標48点に到達':score>=45?'基準点45点に到達':'基準点まであと'+(45-score)+'点'):(wrong.length?'あと'+wrong.length+'問を復習しよう':'全問正解！')}</span>${exam?`<p class="result-feedback">${resultFeedback(r,score)}</p><div class="chapter-results">${EXAM_BLUEPRINT.map(c=>{const ids=r.ids.filter(id=>byId.get(id).chapter===c.chapter);return `<div><span>${c.short}</span><b>${ids.filter(id=>r.answers[r.ids.indexOf(id)]===byId.get(id).a).length} / ${ids.length}</b></div>`}).join('')}</div>`:''}${unanswered?`<p class="hintline">未回答 ${unanswered}問も不正解として復習に追加しました。</p>`:''}<div class="result-review-intro"><h3>${wrong.length?'あと'+wrong.length+'問を、次の得点に。':'全問正解。その調子！'}</h3><p>${wrong.length?'間違い・未回答を振り返りましょう。':'ほかの問題にも挑戦してみましょう。'}</p></div>${byCat.length?`<div class="result-categories">${byCat.map(c=>`<div><span>${c.label}</span><b>${c.n}<small>問</small></b></div>`).join('')}</div>`:''}<div class="result-actions">${wrong.length?`<button class="btn" data-action="retry">${unanswered?'間違い・未回答':'間違えた'}${wrong.length}問を復習 ${icon('repeat')}</button>`:''}<button class="btn secondary" data-action="again">${exam?(examKind(r)==='assessment'?'同じセットを復習する':'別の50問で練習'):'同じ分野をもう一度'}</button><button class="textbtn" data-action="menu">学習トップへ戻る</button></div></article><h3 class="review-heading">回答を振り返る <span class="muted">タップで解説を表示</span></h3><div class="seg review-filters">${[['wrong','間違い・未回答'],['all','すべて']].map(([k,t])=>`<button data-action="review-filter" data-filter="${k}" aria-pressed="${reviewFilter===k}">${t}</button>`).join('')}</div>${r.ids.map((id,i)=>({id,i})).filter(({id,i})=>reviewFilter==='all'||r.answers[i]!==byId.get(id).a).sort((a,b)=>Number(r.answers[a.i]===byId.get(a.id).a)-Number(r.answers[b.i]===byId.get(b.id).a)).map(({id,i})=>renderReviewItem(id,r.answers[i],i,exam)).join('')||'<p class="empty">間違い・未回答はありません。「すべて」で正解した問題も確認できます。</p>'}`;
}
function resume(){if(!state.session)return showMenu();showPlay();if(state.session.mode==='exam'){if(examExpired())return;renderExam();startTimer()}else renderDrill();scrollTopPage()}
function leavePlay(){if(state.session?.mode==='exam'){submitExam();return}showMenu()}
function renderNotes(){const search=$('note-search').value.trim().toLowerCase(),category=$('note-filter').value;const chosen=CATS.find(c=>c.k===category);const visible=NOTES.filter(n=>(!search||[n.t,...n.pts,n.trap].join(' ').toLowerCase().includes(search))&&(!chosen||Q.some(q=>chosen.topics.includes(q.topic)&&n.figs.includes(q.fig))));
 $('note-return').hidden=!noteReturn;$('note-count').textContent=`${visible.length} / ${NOTES.length}テーマ`;
 $('note-list').innerHTML=visible.length?visible.map(n=>`<details class="note" id="${n.id}" data-note="${n.id}"><summary><span class="no">${String(NOTES.indexOf(n)+1).padStart(2,'0')}</span><strong>${esc(n.t)}</strong></summary><div class="note-content"></div></details>`).join(''):'<div class="empty"><h3>見つかりませんでした</h3><p>別の言葉、または「全分野」で探してください。</p><button class="btn ghost" data-action="clear-search">検索をリセット</button></div>';
}
function populateNote(el){if(el.dataset.loaded)return;const n=NOTES.find(n=>n.id===el.dataset.note);if(!n)return;el.querySelector('.note-content').innerHTML=`<ul>${n.pts.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>${n.figs.map(figHTML).join('')}<p class="trap">覚え違いに注意：${esc(n.trap)}</p><button class="btn ghost" data-action="note-drill" data-note="${n.id}">このテーマを練習する</button><a class="muted" href="${['n-speed','n-speed-new'].includes(n.id)?REFS.speed.url:n.id==='n-cycle-new'?REFS.bicycle.url:n.id==='n-veh'?REFS.moped.url:REFS.rules.url}" target="_blank" rel="noopener">公式資料で確認 ↗</a>`;el.dataset.loaded='true'}
function openNote(id){noteReturn=currentView==='play';$('note-search').value='';$('note-filter').value='';setTab('notes');const el=$(id);if(el){populateNote(el);el.open=true;requestAnimationFrame(()=>el.scrollIntoView({behavior:'instant',block:'start'}))}}
function renderTests(){const ready=readiness();$('tests').innerHTML=`<div class="tests-heading"><span class="badge">50問・30分</span><h2>実力テスト</h2><p class="muted">練習の成果を、初めて見る問題で確かめよう。</p></div> <section class="assessment-panel" aria-labelledby="assessment-title"><div class="assessment-heading"><div><span class="over">はじめての問題で確認</span><h3 id="assessment-title">初回の実力チェック</h3></div><span class="badge">初回 ${ready.done} / 3</span></div><p class="assessment-message"><strong>${ready.title}</strong><span>${ready.body}</span></p><div class="assessment-grid">${Object.keys(ASSESSMENT_FORMS).map(f=>{const c=state.checks[f],h=c?.first;return `<div class="assessment-card"><div class="assessment-card-top"><b>SET ${f}</b><span class="badge ${h?(h.score>=48?'success':h.score<45?'error':''):''}">${h?'初回 '+h.score+'点':c?'初回記録なし':'未受験'}</span></div><p>${h?(h.score>=48?'初回の学習目標を達成':h.score>=45?'基準点に到達・目標は48点':'結果から弱点を確認'):c?'開始済み。次は再挑戦扱いです。':'50問 · 30分 · 解説は採点後'}</p><button class="btn wide ${c?'secondary':''}" data-action="assessment" data-form="${f}">${c?'もう一度解く':'初回に挑戦する'} ${icon('arrow')}</button>${h?`<button class="textbtn" data-action="first-result" data-form="${f}">初回の回答を見る</button>`:''}</div>`}).join('')}</div><details class="exam-guide"><summary>判定の見方と出題範囲</summary><p>3セットは通常の練習・練習模試に出ない設問です。採点後に、間違えた判定問題を苦手復習で解けます。再挑戦しても初回点数は変わりません。</p><p>各セットと練習模試は、共通の心得12問・運転前の心得4問・運転方法33問・危険な場所等1問。駐停車の距離や時間の問題は含めません。</p><p>45点が本番の合格基準。48点以上を初回で3セット、がこのアプリの学習目標です。公式問題の再現や合格保証ではありません。記録を消すと受験済みの判別もできなくなります。</p><a href="${REFS.blueprint.url}" target="_blank" rel="noopener">公式の出題基準を確認 ↗</a></details></section><section class="mock-panel"><h3>繰り返し練習したいときに</h3><p class="muted">通常の練習問題から50問を出題します。初回判定とは別の記録です。</p><button class="btn secondary wide" data-action="exam">50問の練習模試 ${icon('arrow')}</button></section> ${state.history.length?`<section><div class="section-heading"><h3>最近のテスト</h3><span class="muted">直近10回</span></div>${state.history.slice().reverse().map((h,i)=>`<div class="history"><div><span class="history-kind">${examName(h)}</span><small>${new Date(h.at).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})}</small></div><span class="badge ${h.score>=45?'success':'error'}">${h.score>=48?'48点以上':h.score>=45?'45点以上':'要復習'}</span><b>${h.score}<span class="muted"> / 50</span></b>${validHistory(h)?`<button class="textbtn" data-action="history" data-index="${state.history.length-1-i}">回答を見る</button>`:'<small class="muted">点数のみ</small>'}</div>`).join('')}</section>`:''}`;}

function settings(){const active=state.session?.mode==='exam';$('settings-theme').innerHTML=['auto','light','dark'].map((t,i)=>`<button data-action="theme" data-theme="${t}" aria-pressed="${state.theme===t}">${['自動','ライト','ダーク'][i]}</button>`).join('');$('settings-sound').innerHTML=[[true,'オン'],[false,'オフ']].map(([v,l])=>`<button data-action="sound" data-sound="${v}" aria-pressed="${(state.sound!==false)===v}">${l}</button>`).join('');$('import-button').disabled=active;$('reset-button').disabled=Boolean(state.session);$('settings').showModal()}
function downloadRecord(){
 const data={kind:'karimen-progress',version:VERSION,answerRevision:ANSWER_REVISION,exportedAt:new Date().toISOString(),misses:state.misses,stats:state.stats,history:state.history,checks:state.checks,limit:state.limit,theme:state.theme,sound:state.sound!==false};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='仮免_学習記録_'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('初回判定を含む学習記録を書き出しました。途中のテストの回答は含みません。');
}
async function importRecord(file){
 if(!file)return;if(state.session?.mode==='exam'){toast('テストの終了後に読み込めます。');return}
 if(file.size>2000000){toast('ファイルが大きすぎます。学習記録のJSONを選んでください。');return}
 let raw;
 try{raw=JSON.parse(await file.text());if(raw.kind!=='karimen-progress'||![2,VERSION].includes(raw.version)||!raw.misses||!raw.stats||Array.isArray(raw.stats)||typeof raw.stats!=='object')throw new Error()}catch{toast('学習記録の形式が違います。このドリルから書き出したJSONを選んでください。');return}
 $('settings').close();ask('学習記録を読み込みますか？','現在の記録を選択したファイルの記録で置き換えます。旧版の記録も読み込めます。途中の練習は終了します。','読み込む',()=>{
  const clean=cleanRecords(raw);
  state={...state,version:VERSION,answerRevision:ANSWER_REVISION,...clean,checks:cleanChecks(raw,clean),session:null,history:cleanHistory(raw.history),limit:[0,10,20].includes(raw.limit)?raw.limit:state.limit,theme:['auto','light','dark'].includes(raw.theme)?raw.theme:state.theme,sound:typeof raw.sound==='boolean'?raw.sound:state.sound};
  lastResult=null;persist();theme();showMenu();toast('学習記録を読み込みました。');
 });
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;
 if(a==='category-filter'){categoryFilter=['all','new','weak'].includes(b.dataset.filter)?b.dataset.filter:'all';document.querySelectorAll('[data-action="category-filter"]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.filter===categoryFilter)));renderCategories()}else if(a==='assessment')startExam(b.dataset.form);else if(a==='first-result')showStoredResult(state.checks[b.dataset.form]?.first);else if(a==='visual-drill')beginDrill('review',Q.filter(q=>q.chapter&&(VISUALS[q.id]||IMGQ[q.id])).map(q=>q.id),'標識・手信号のイラスト練習');else if(a==='start')beginDrill(b.dataset.pool);else if(a==='limit'){state.limit=Number(b.dataset.value);persist();renderMenu()}else if(a==='exam')startExam();else if(a==='resume')resume();else if(a==='answer')answer(b.dataset.value==='true');else if(a==='next')nextDrill();else if(a==='drill-prev')drillJump((state.session?.index||0)-1);else if(a==='drill-skip')drillJump((state.session?.index||0)+1);else if(a==='drill-jump')drillJump(Number(b.dataset.index));else if(a==='menu')showMenu();else if(a==='back')leavePlay();else if(a==='note')openNote(b.dataset.id);else if(a==='note-return'){setTab('drill');scrollTopPage()}else if(a==='exam-answer')setExamAnswer(b.dataset.value==='true');else if(a==='exam-next'){if(state.session?.index===49){$('exam-map').open=true;$('exam-map').scrollIntoView({block:'center',behavior:'instant'})}else examJump((state.session?.index||0)+1)}else if(a==='exam-prev')examJump((state.session?.index||0)-1);else if(a==='exam-jump')examJump(Number(b.dataset.index));else if(a==='next-unanswered'){const s=state.session;if(s?.mode!=='exam')return;const order=[...s.ids.keys()].map(i=>(s.index+1+i)%s.ids.length),i=order.find(i=>s.answers[i]===null);if(i===undefined)toast('全問回答済みです。回答一覧から見直せます。');else examJump(i)}else if(a==='flag'){const s=state.session;if(s?.mode!=='exam'||examExpired())return;s.flags[s.index]=!s.flags[s.index];persist();renderExam()}else if(a==='exam-submit')submitExam();
 else if(a==='retry'){const r=lastResult;if(!r)return;beginDrill('review',r.ids.filter((id,i)=>r.answers[i]!==byId.get(id).a),'間違い・未回答の復習')}else if(a==='again'){if(lastResult?.mode==='exam')startExam(examKind(lastResult)==='assessment'?lastResult.form:null);else if(lastResult){const r=lastResult;beginDrill(r.pool,r.pool==='review'?r.ids:null,r.pool==='review'?r.label:null)}}
 else if(a==='note-drill'){const n=NOTES.find(n=>n.id===b.dataset.note);if(n)beginDrill('review',Q.filter(q=>n.figs.includes(q.fig)).map(q=>q.id),n.t)}else if(a==='clear-search'){$('note-search').value='';$('note-filter').value='';renderNotes()}
 else if(a==='review-filter'){reviewFilter=b.dataset.filter;renderResult()}else if(a==='history'){const h=state.history[Number(b.dataset.index)];if(state.session?.mode==='exam'){toast('テスト終了後に確認できます。');return}showStoredResult(h)}else if(a==='question-zoom'){openQuestionArt(Number(b.dataset.id),b.dataset.revealed==='true')}else if(a==='figure-open'){openFigure(b.dataset.fig)}else if(a==='settings')settings();else if(a==='theme'){state.theme=b.dataset.theme;persist();theme();$('settings-theme').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.theme===state.theme)))}else if(a==='sound'){state.sound=b.dataset.sound==='true';persist();$('settings-sound').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String((x.dataset.sound==='true')===(state.sound!==false))));if(state.sound)sfx(true)}else if(a==='export')downloadRecord();else if(a==='import')$('import-file').click();else if(a==='reset'){$('settings').close();ask('学習記録を初期化しますか？','苦手・解答履歴・初回判定・テスト履歴を消します。必要なら先に設定から記録を書き出してください。','初期化する',()=>{state.misses={};state.stats={};state.history=[];state.checks={};state.session=null;lastResult=null;persist();showMenu();toast('学習記録を初期化しました。')})}
});
document.addEventListener('toggle',e=>{if(e.target.matches?.('details.note')&&e.target.open)populateNote(e.target);if(e.target.matches?.('details.review-item')&&e.target.open){const el=e.target.querySelector('.lazy-figure');if(el&&!el.dataset.loaded){el.innerHTML=figHTML(el.dataset.fig);el.dataset.loaded='true'}}},true);
['drill','notes','tests'].forEach(k=>$('tab-'+k).addEventListener('click',()=>{if(k==='drill'&&currentView==='menu')renderMenu();setTab(k)}));
$('tabs').addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;const tabs=[...$('tabs').querySelectorAll('button:not(:disabled)')];let i=tabs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[i].click();tabs[i].focus()});
$('note-search').addEventListener('input',renderNotes);$('note-filter').addEventListener('change',renderNotes);
$('confirm-yes').addEventListener('click',()=>{const action=modalAction;modalAction=null;$('confirm').close();action?.()});$('confirm-no').addEventListener('click',()=>{$('confirm').close();modalAction=null});$('confirm').addEventListener('cancel',()=>modalAction=null);$('settings-close').addEventListener('click',()=>$('settings').close());
$('import-file').addEventListener('change',e=>{importRecord(e.target.files[0]);e.target.value=''});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.session?.mode==='exam')tick()});window.addEventListener('pageshow',()=>{if(state.session?.mode==='exam')tick()});
const media=matchMedia('(prefers-color-scheme:dark)');if(media.addEventListener)media.addEventListener('change',theme);

let reviewFilter='wrong';
function validHistory(h){return Boolean(h&&Array.isArray(h.ids)&&h.ids.length===50&&new Set(h.ids).size===50&&h.ids.every(id=>byId.has(id))&&Array.isArray(h.answers)&&h.answers.length===50&&h.answers.every(v=>v===null||typeof v==='boolean'))}
function openFigure(k){if(!FIG[k])return;const d=$('figure-dialog');$('figure-content').innerHTML=figHTML(k);$('figure-content').querySelector('button')?.remove();$('figure-zoom').value='150';$('figure-content').style.width='150%';d.showModal();}
document.addEventListener('change',e=>{if(e.target.id==='uncertain'&&state.session?.mode==='drill'){const s=state.session;s.uncertain??=s.ids.map(()=>false);s.uncertain[s.index]=e.target.checked;persist()}});
$('figure-close').addEventListener('click',()=>$('figure-dialog').close());
$('figure-zoom').addEventListener('input',e=>$('figure-content').style.width=e.target.value+'%');


function examKind(s){return s?.examKind==='assessment'?'assessment':s?.examKind==='practice'&&s.blueprint===BLUEPRINT_VERSION?'practice':'legacy'}
function formMatches(ids,form){const qs=ASSESSMENT_FORMS[form];return Boolean(qs&&ids?.length===50&&new Set(ids).size===50&&ids.every(id=>qs.some(q=>q.id===id)))}
function cleanHistory(raw){
 if(!Array.isArray(raw))return [];
 return raw.filter(h=>h&&Number.isFinite(h.at)&&h.total===50&&Number.isInteger(h.score)&&h.score>=0&&h.score<=50).slice(-10).map(h=>{
  if(!validHistory(h))return {at:h.at,score:h.score,total:50,examKind:'legacy'};
  const kind=examKind(h),form=kind==='assessment'&&formMatches(h.ids,h.form)?h.form:null;
  return {at:h.at,score:h.ids.filter((id,i)=>h.answers[i]===byId.get(id).a).length,total:50,ids:[...h.ids],answers:[...h.answers],timeout:Boolean(h.timeout),examKind:kind==='assessment'&&!form?'legacy':kind,form,firstAttempt:Boolean(form&&h.firstAttempt),blueprint:h.blueprint===BLUEPRINT_VERSION?BLUEPRINT_VERSION:null};
 });
}
function cleanChecks(raw,records){
 const checks={};
 for(const form of Object.keys(ASSESSMENT_FORMS)){
  const x=raw?.checks?.[form],h=x?.first;
  const startedAt=bounded(x?.startedAt,1e15);
  const first=validHistory(h)&&formMatches(h.ids,form)?cleanHistory([{...h,total:50,examKind:'assessment',form,firstAttempt:true,blueprint:BLUEPRINT_VERSION}])[0]:null;
  const exposed=ASSESSMENT_FORMS[form].some(q=>records.stats[q.id]?.total);
  if(startedAt||first||exposed)checks[form]={startedAt:startedAt||first?.at||Date.now(),first:first||null,completed:Boolean(first||x?.completed||exposed)};
 }
 return checks;
}
function availablePractice(){return [...Q,...ASSESSMENT_Q.filter(q=>state.checks[q.form]?.completed||state.checks[q.form]?.first)]}
function readiness(){
 const firsts=Object.keys(ASSESSMENT_FORMS).map(f=>state.checks[f]?.first).filter(Boolean),high=firsts.filter(h=>h.score>=48).length;
 if(firsts.length===3&&high===3)return {title:'初回の学習目標を3セット達成',body:'3セットとも48点以上。間違えた理由を確認し、別の未見問題でも理解を確かめましょう。',done:firsts.length,high};
 if(firsts.some(h=>h.score<45))return {title:'初回で45点未満のセットがあります',body:'結果から苦手を復習しましょう。再挑戦の点数と、初回の記録は分けて残ります。',done:firsts.length,high};
 if(firsts.length===3)return {title:'初回3セットの結果がそろいました',body:'48点以上は'+high+'セット。45点は本番の基準点、48点は余裕を持たせた学習目標です。',done:firsts.length,high};
 return {title:firsts.length?'初回判定はあと'+(3-firsts.length)+'セット':'練習のあと、初めて見る問題で確認',body:'各50問・30分。普段の練習とは別の設問で、最初の結果を残します。',done:firsts.length,high};
}
function examName(r){return examKind(r)==='assessment'?`判定テスト ${r.form} · ${r.firstAttempt?'初回':'再挑戦'}`:examKind(r)==='practice'?'配分準拠の練習模試':'旧版の模擬テスト'}
function resultFeedback(r,score){
 if(examKind(r)==='legacy')return '旧版の出題配分による記録です。改善版の初回判定には含めません。';
 if(examKind(r)==='practice')return '通常の練習から出題した模試です。初見への対応は、未受験の判定テストで確認できます。';
 if(!r.firstAttempt)return '再挑戦の結果です。初回 '+(state.checks[r.form]?.first?.score??'記録なし')+(state.checks[r.form]?.first?'点':'')+' はそのまま残ります。';
 return score>=48?'初回の学習目標48点に到達しました。ほかの未受験セットでも確認しましょう。':score>=45?'基準点45点に到達。余裕を持つため、間違いを復習して別の未受験セットに挑戦しましょう。':'45点まであと'+(45-score)+'点。間違えた分野と、迷った理由を確認してから次のセットへ進みましょう。';
}
function showStoredResult(h){
 if(state.session?.mode==='exam'){toast('テスト終了後に確認できます。');return}
 if(!validHistory(h))return;
 lastResult={...h,mode:'exam',label:examName(h),pool:'exam'};reviewFilter='wrong';showPlay();renderResult();scrollTopPage();
}
theme();storageWarning();$('note-filter').innerHTML='<option value="">全分野</option>'+CATS.map(c=>`<option value="${c.k}">${c.label}</option>`).join('');
$('brandmark').innerHTML=icon('road');$('settings-button').innerHTML=icon('settings');$('tab-drill').innerHTML=icon('play')+'練習';$('tab-notes').innerHTML=icon('book')+'図解ノート';$('tab-tests').innerHTML=icon('check')+'実力テスト';$('search-icon').innerHTML=icon('search');
renderMenu();setTab('drill');setExamLock();if(state.session?.mode==='exam')resume();else if(location.hash==='#notes')setTab('notes');else if(location.hash==='#tests')setTab('tests');

$('bank-count').textContent='練習 '+Q.filter(q=>q.chapter).length+'問 · 実力テスト '+ASSESSMENT_Q.length+'問 · 補足 '+Q.filter(q=>!q.chapter).length+'問';
