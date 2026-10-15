import {impactMotion} from './impact-motion.mjs?v=20261015-fx1';
import {SCENES,Drive,clamp,HAZARD_REVIEWS} from './engine.mjs?v=20261015-review1';
import {Renderer} from './renderer.mjs?v=20261015-crowd1';
import {ArcadeDrive,visibleCrowd} from './arcade.mjs?v=20261015-crowd1';
import {DriveAudio} from './audio.mjs?v=20261015-fx1';
const drivingAudio=new DriveAudio();let seenEvents=0;
const $=id=>document.getElementById(id),icon=id=>`<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
const STORAGE='dondora-hazard-drive-v1';
let saved={},storageOK=true;try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))saved=raw;}catch{storageOK=false;}
let guided=true,drive=null,screen='home',last=0,resultShown=false,hintShown=false,panning=0,panUntil=0,soundEnabled=true,audioContext=null;
let frameId=0,dirty=true,lastDraw=-Infinity,lastHUD=-Infinity,lastAudio=-Infinity,toastTimer=0,resizeTimer=0,arcadePreview=null;
function queueFrame(){if(!frameId&&screen==='game'&&drive&&!document.hidden)frameId=requestAnimationFrame(frame);}
function requestFrame(){dirty=true;queueFrame();}
function stopFrames(){if(frameId)cancelAnimationFrame(frameId);frameId=0;last=0;lastDraw=lastHUD=lastAudio=-Infinity;}
const renderer=new Renderer($('road'),{observe:true,onResize:requestFrame});const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let three=null,threePromise=null,threeError=false,threeEnabled=true,lightQuality=false,preview3d=null;
function using3D(){return !!(drive&&three&&!three.failed&&threeEnabled&&!threeError);}
function refresh3DUI(){$('view-toolbar').hidden=false;$('road3d').hidden=!using3D();$('road').hidden=using3D();$('view-controls').hidden=!(using3D()&&!drive?.arcade&&drive?.phase==='running');$('compare-view').disabled=threeError||!three;$('quality').disabled=!three||threeError||!threeEnabled;$('compare-view').setAttribute('aria-pressed',String(threeEnabled&&!threeError));$('compare-view').textContent=threeEnabled&&!threeError?'3D表示':'2D表示';$('render-label').textContent=threeError?'3Dを利用できないため、2Dで表示':three?(threeEnabled?'3D表示。ドラッグで左右を見られます。':'2Dで表示しています。'):'3Dを準備しています…';renderer.invalidateSize();three?.invalidateSize();requestFrame();}
function fallback3D(){threeError=true;threeEnabled=false;if(screen==='game'&&drive){pause();refresh3DUI();toast('3D描画が中断したため、2D表示に切り替えました',5);}}
async function get3D(){if(threePromise)return threePromise;threePromise=(async()=>{try{const {Renderer3D}=await import('./renderer3d.mjs?v=20261015-crowd1');three=new Renderer3D($('road3d'),{onContextLost:fallback3D,onResize:requestFrame});return three;}catch(error){threeError=true;console.warn('3D unavailable; using the 2D renderer.',error?.message);return null;}})();return threePromise;}
function previewDrive(index){const d=new Drive(index);d.z=d.scene.hazard-25;d.eventTime=2.5;d.actorX=index===2?1.8:-2.8;return d;}
function fill3DPreviews(){if(!preview3d)return;for(let i=0;i<SCENES.length;i++){const thumb=$('thumb-'+i);if(!thumb||!preview3d.thumbs[i])continue;thumb.hidden=true;let img=thumb.parentNode.querySelector('img');if(!img){img=document.createElement('img');img.alt='';thumb.parentNode.prepend(img);}if(img.src!==preview3d.thumbs[i])img.src=preview3d.thumbs[i];}}
let previewLoading=false;
async function load3DPreviews(){
 if(previewLoading||screen!=='home'||document.hidden||threeError)return;
 previewLoading=true;
 try{
  const r=await get3D();refresh3DUI();if(!r||r.failed)return;
  preview3d??={thumbs:[]};
  for(let i=0;i<SCENES.length;i++){
   if(preview3d.thumbs[i])continue;
   // Build one preview in idle time; choosing a course takes priority.
   await new Promise(resolve=>window.requestIdleCallback?window.requestIdleCallback(resolve,{timeout:1500}):setTimeout(resolve,32));
   if(screen!=='home'||document.hidden||r.failed)return;
   preview3d.thumbs[i]=r.snapshot(previewDrive(i),420,320);fill3DPreviews();
  }
 }catch{fallback3D();}finally{previewLoading=false;}
}
function show3DReview(){if(!three||three.failed||!drive||!threeEnabled||threeError)return;try{const d=previewDrive(drive.index);d.detected={};const canvas=$('review-canvas');const img=document.createElement('img');img.alt='3Dの振り返り：'+drive.scene.title;img.src=three.snapshot(d,760,480);canvas.hidden=true;canvas.parentNode.insertBefore(img,canvas);}catch{}}

function bestKey(index){return `${guided?'guided':'challenge'}-${SCENES[index].id}`;}
function validBest(key){const value=saved[key];return value&&Number.isFinite(value.score)&&value.score>=0&&value.score<=100?value:null;}
function tone(type){if(!soundEnabled)return;try{audioContext??=drivingAudio.ctx||new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=type==='success'?660:type==='mark'?520:290;g.gain.setValueAtTime(.06,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.18);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.2);}catch{}}
function toast(message,seconds=2.5){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>{$('toast').hidden=true;},seconds*1000);}
function show(which){screen=which;stopFrames();for(const id of ['home','game','result'])$(id).hidden=id!==which;document.body.classList.toggle('in-game',which==='game');$('footer').hidden=which==='game';document.querySelector('.skip-link').href='#'+which;window.scrollTo({top:0,behavior:'instant'});renderer.invalidateSize();three?.invalidateSize();requestFrame();}
function renderHome(){
 let count=0;
 $('course-list').innerHTML=SCENES.map((s,i)=>{const best=validBest(bestKey(i)),cleared=best?.safe||best?.legacyBest?.safe;if(cleared)count++;return `<button class="course" data-course="${i}" aria-label="コース${s.number} ${s.title} ${s.duration}${cleared?' クリア':''}"><div class="course-thumb"><canvas id="thumb-${i}" aria-hidden="true"></canvas></div><div class="course-info"><small>コース ${s.number} · ${s.level}</small><h3>${s.title}</h3><div class="course-bottom"><span>${s.duration}${best?` · ${best.scoreVersion===2?'ベスト':'旧採点'} ${best.score}点`:''}</span><span class="course-state ${cleared?'is-clear':''}">${cleared?icon('check')+'クリア':icon('arrow')}</span></div></div></button>`;}).join('');
 $('completed').textContent=`${count} / 3 クリア`;
 for(let i=0;i<SCENES.length;i++){if(preview3d?.thumbs[i])continue;const d=new Drive(i);d.z=d.scene.hazard-23;d.eventTime=i===0?1.1:0;d.actorX=i===2?2.4:-3.5;new Renderer($(`thumb-${i}`)).render(d,{thumbnail:true});}
 fill3DPreviews();
 if(!storageOK&&!document.querySelector('.storage-note')){const p=document.createElement('p');p.className='storage-note';p.textContent='このブラウザでは成績を保存できません。ゲームはそのまま遊べます。';$('home').append(p);}
 load3DPreviews();
}
function choose(index){
 drive=index===3?new ArcadeDrive():new Drive(index,guided);seenEvents=0;arcadePreview=null;$('combo-hud').hidden=index!==3;$('impact-fx').classList.remove('hit');$('steering-controls').hidden=false;$('steering-label').textContent='ハンドルで操作';$('start-tip-copy').innerHTML=index===3?'左右から48人が飛び出すボーナスステージ。<br>連続ヒットでコンボを伸ばそう。':'周囲を見て、早めにブレーキ。<br>走行後に、危険だった場所を振り返ります。';drag=null;if(three){three.yaw=0;three.currentYaw=0;}$('view-left').textContent='← 左を見る';$('view-right').textContent='右を見る →';for(const id of ['view-left','view-front','view-right'])$(id).classList.toggle('active',id==='view-front');resultShown=false;hintShown=false;panning=0;panUntil=0;clearTimeout(toastTimer);
 $('scene-number').textContent=index===3?'ゲームモード':`コース ${drive.scene.number} · ${guided?'ガイドあり':'チャレンジ'}`;$('scene-title').textContent=index===3?'連続ドライブ':drive.scene.title;$('zone-badge').textContent=drive.scene.area;
 $('start-title').textContent=index===3?'連続ドライブ':drive.scene.title;$('start-description').textContent=index===3?'左右から次々と人が飛び出す、全8ウェーブのラッシュ。':drive.scene.desc;
 $('start-overlay').hidden=false;$('pause-overlay').hidden=true;$('look-controls').hidden=true;$('toast').hidden=true;
 $('look-left').classList.remove('checked');$('look-right').classList.remove('checked');$('look-left').textContent='← 左を見る';$('look-right').textContent='右を見る →';
 $('instruction').textContent='周囲を見ながら、余裕を持って減速しよう。';show('game');controls(false);updateHUD();requestFrame();$('start').focus({preventScroll:true});
 refresh3DUI();if(!threeError){const selected=drive;$('start').disabled=true;get3D().then(()=>{if(drive!==selected||screen!=='game')return;$('start').disabled=false;if(three)three.yaw=0;refresh3DUI();});}else $('start').disabled=false;
}
function controls(active){$('steering-wheel').setAttribute('aria-disabled',String(!active));$('steering-wheel').tabIndex=active?0:-1;$('brake').disabled=!active;$('gas').disabled=!active;$('pause').disabled=!active;for(const side of ['left','right'])$('steer-'+side).disabled=!active;}
function release(){activeKeys.clear();pedalPointers.gas.clear();pedalPointers.brake.clear();steerPointers.clear();wheelDrag=null;drivingAudio.silence();if(drive)drive.release();$('brake').classList.remove('pressed');$('gas').classList.remove('pressed');}
function pause(){if(!drive||drive.phase!=='running')return;drive.pause();release();controls(false);$('pause-overlay').hidden=false;$('resume').focus({preventScroll:true});stopFrames();requestFrame();}
function resume(){if(!drive)return;drivingAudio.unlock();drive.resume();last=performance.now();controls(true);$('pause-overlay').hidden=true;requestFrame();$(using3D()?'road3d':'road').focus({preventScroll:true});}
function home(){release();drive=null;show('home');renderHome();}
function setText(id,value){const el=$(id),text=String(value);if(el.textContent!==text)el.textContent=text;}
function setHidden(id,value){const el=$(id);if(el.hidden!==value)el.hidden=value;}
function setPressed(id,value){const el=$(id),text=String(value);if(el.getAttribute('aria-pressed')!==text)el.setAttribute('aria-pressed',text);}
function setProgress(value){const el=$('progress'),width=`${clamp(value*100,0,100).toFixed(1)}%`;if(el.style.width!==width)el.style.width=width;}
function updateHUD(){
 if(!drive)return;
 for(const side of ['left','right'])setPressed('steer-'+side,side==='right'?drive.steering>.05:drive.steering<-.05);
 if(drive.arcade){setText('speed',Math.round(drive.speed));setProgress(drive.z/255);const a=drive.actors.find(x=>!x.passed);setText('zone-badge',a?`WAVE ${a.wave+1} / 8`:'ゴール');setText('drive-status',drive.input.brake?'ブレーキ':drive.speed<1?'アクセルで進もう':'連続ドライブ');setText('instruction','ハンドルを左右にドラッグ。ペダルは長押し。');setText('combo-hud',`${drive.points} pt · ${drive.combo} COMBO`);setHidden('view-controls',true);setHidden('look-controls',true);return;}
setText('speed',Math.round(drive.speed));setProgress(drive.z/drive.scene.hazard);
 const stopped=drive.stopped&&drive.v<.25,inter=drive.scene.id==='intersection';
 let status='周囲をよく見て走ろう';
 if(drive.input.brake)status='ブレーキをかけています';else if(drive.input.gas)status='アクセルを踏んでいます';
 if(drive.v<.25)status=stopped?'停止しています':'止まっています';
 if(inter&&drive.cueVisible&&!drive.stopped)status=`停止線まで ${Math.max(0,Math.round(drive.distance-drive.scene.line))} m`;
 if(stopped)status=inter&&(!drive.checks.left||!drive.checks.right)?'左右の安全を確認しよう':drive.actorClear?'安全を確認できました':'横断が終わるまで待とう';
 setText('drive-status',status);
 setHidden('look-controls',!(inter&&stopped&&!using3D()));setHidden('view-controls',!(using3D()&&drive.phase==='running'));
 let text='周囲を見ながら、余裕を持って減速しよう。';
 if(drive.guided&&drive.cueVisible&&!drive.detected)text=drive.scene.clue;
 if(drive.v<.25&&drive.idle>2&&!drive.stopZone)text=inter&&drive.cueVisible?'停止線の手前まで、ゆっくり進もう。':'アクセルを長押しして、ゆっくり前へ。';
 if(stopped)text=inter&&(!drive.checks.left||!drive.checks.right)?'停止できました。「左を見る」「右を見る」で確認。':'止まれました。そのまま、横断が終わるまで待とう。';
 setText('instruction',text);
 if(drive.guided&&drive.cueVisible&&!hintShown){hintShown=true;toast('周りに、危険の手がかりが見えてきました',3);}
}
function resultCharacter(safe){
 if(!safe)return '<img class="result-mascot" src="../assets/characters/D047.png" width="310" height="460" alt="ロボット教官">';
 const points=Array.from({length:145},(_,i)=>{const t=i/144*Math.PI*2,r=44+4*Math.cos(12*t);return (60+Math.cos(t)*r).toFixed(2)+','+(60+Math.sin(t)*r).toFixed(2)}).join(' ');
 return `<img class="result-mascot result-friends" src="../assets/characters/D004.png" width="1400" height="792" alt="プーリーくんとよりともさん"><svg class="flower-stamp" viewBox="0 0 120 120" role="img" aria-label="クリア"><polygon points="${points}"/><circle cx="60" cy="60" r="33"/><text x="60" y="66" text-anchor="middle">クリア</text><path d="M44 82q16 8 32-1"/></svg>`;
}
function showHazardReview(){
 resultShown=true;release();controls(false);const q=HAZARD_REVIEWS[drive.index];
 $('result').innerHTML=`<div class="hazard-review"><span class="eyebrow">コース ${drive.scene.number} · 運転後の振り返り</span><h1>どんな危険があった？</h1><p>運転は終了しました。時間制限はありません。</p><div class="replay-scene"><canvas id="hazard-review-canvas" aria-label="走った場面の振り返り"></canvas></div><fieldset><legend>${q.question}</legend><div class="hazard-choices">${q.options.map((label,i)=>`<button type="button" data-answer="${i}"><span>${i+1}</span>${label}</button>`).join('')}</div></fieldset><p class="hint-note">回答後に、運転の結果と解説を表示します。</p></div>`;
 show('result');const preview=new Drive(drive.index);preview.z=preview.scene.hazard-25;new Renderer($('hazard-review-canvas')).render(preview,{hero:true});
 for(const b of $('result').querySelectorAll('[data-answer]'))b.onclick=()=>{if(drive.answerReview(Number(b.dataset.answer)))showResult();};
 $('result').setAttribute('tabindex','-1');$('result').focus({preventScroll:true});
}
function showResult(){
 if(drive.arcade){showArcadeResult();return;}
 if(!drive.outcome.reviewAnswered){showHazardReview();return;}
 resultShown=true;release();controls(false);tone(drive.outcome.safe?'success':'miss');const out=drive.outcome,s=drive.scene,key=bestKey(drive.index);let best=validBest(key);
 if(!best||best.scoreVersion!==2||out.score>best.score||(out.safe&&!best.safe)){saved[key]={score:out.score,safe:out.safe,scoreVersion:2,legacyBest:best?.scoreVersion!==2?best:best?.legacyBest,at:new Date().toISOString()};try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{storageOK=false;}}
 const earlyBrake=drive.firstBrake?.beforeAppearance;
 const timeline=out.events.map(e=>`<li><time>${e.time.toFixed(1)}秒</time><span>${e.label}</span><small>危険の手前 ${Math.round(e.distance)}m</small></li>`).join('');
 const rows=[['危険の理解',out.detection,30,out.reviewCorrect?'振り返りで、危険を正しく選べました':'この場面の危険を、解説で確認しよう'],['早めの減速',out.anticipation,30,drive.firstBrake?(earlyBrake?'余裕を持ってブレーキを開始':'次は、危険が近づく前に減速'):'ブレーキで速度を落とそう'],['安全な停止',out.stopping,30,out.safe?`危険の手前 ${Math.round(out.stopDistance)}m で停止`:drive.stopped?'いったん停止しました':'停止の余裕を残して速度を落とそう'],['安全確認',out.confirmation,10,s.id==='intersection'?(drive.checks.left&&drive.checks.right?'左右を確認しました':'停止してから左右を確認しよう'):(out.safe?'横断が終わるまで待てました':'横断が終わるまで待とう')]];
 $('result').innerHTML=`<div class="result-top"><div><span class="eyebrow">コース ${s.number} · ${guided?'ガイドあり':'チャレンジ'}</span><h1>${out.safe?'安全に止まれたね。':'次は、もう少し早く。'}</h1><p>${out.safe?'気づいたことを、次の運転にも。':out.reason+'。'}</p></div><div class="result-achievement"><div class="score-circle"><b>${out.score}</b><small>/ 100 点</small></div>${resultCharacter(out.safe)}</div></div><div class="result-layout"><div><div class="replay-scene"><canvas id="review-canvas" aria-label="危険箇所を示した振り返りイラスト"></canvas><span class="replay-tag">この場面のポイント</span></div><div class="lesson"><p class="review-answer"><strong>${out.reviewCorrect?'正解':'振り返りの答え'}</strong>：${HAZARD_REVIEWS[drive.index].options[HAZARD_REVIEWS[drive.index].correct]}</p><h2>${s.point}</h2><p>${s.lesson}</p></div></div><div><div class="score-breakdown">${rows.map(r=>`<div class="score-row"><span><strong>${r[0]}</strong><small>${r[3]}</small></span><b>${r[1]} <small>/ ${r[2]}</small></b></div>`).join('')}</div><details class="timeline"><summary>運転の経過を見る</summary>${timeline?`<ol>${timeline}</ol>`:'<p class="hint-note">周囲の危険に備えて、早めにブレーキをかけてみよう。</p>'}</details>${storageOK?'<p class="best-note">このブラウザに成績を保存しました。</p>':'<p class="storage-note">成績を保存できませんでした。ゲームは続けられます。</p>'}</div></div><div class="result-actions"><button class="secondary" id="retry">${icon('reset')}もう一度</button><button class="primary" id="next">${drive.index<2?'次のコースへ':'コース一覧へ'}${icon('arrow')}</button></div><button class="result-back" id="result-home">コース選択に戻る</button><p class="disclaimer">採点はゲーム独自の基準です。実際の運転の安全性や合否を判定するものではありません。</p>`;
 show('result');const rd=new Drive(drive.index);rd.z=s.hazard-22;rd.eventTime=2.5;rd.actorX=s.actor==='bike'?1.5:-2.9;new Renderer($('review-canvas')).render(rd,{highlight:true,hero:true});
 $('retry').onclick=()=>choose(drive.index);$('next').onclick=()=>drive.index<2?choose(drive.index+1):home();$('result-home').onclick=home;
 show3DReview();$('result').setAttribute('tabindex','-1');$('result').focus({preventScroll:true});
}
const pedalPointers={gas:new Set(),brake:new Set()},steerPointers=new Map();let wheelDrag=null;
function syncControls(){
 if(!drive||drive.phase!=='running')return;
 for(const key of ['gas','brake']){const held=pedalPointers[key].size>0||(key==='gas'?activeKeys.has('ArrowUp'):activeKeys.has('ArrowDown')||activeKeys.has(' '));drive.input[key]=held;$(key).classList.toggle('pressed',held);}
 const buttons=[...steerPointers.values()].reduce((a,b)=>a+b,0),keys=Number(activeKeys.has('ArrowRight'))-Number(activeKeys.has('ArrowLeft'));
 drive.steer(wheelDrag?.value??clamp(buttons+keys,-1,1));
}
function bindPedal(id,key){const b=$(id);b.addEventListener('pointerdown',e=>{if(!drive||drive.phase!=='running')return;e.preventDefault();b.setPointerCapture(e.pointerId);pedalPointers[key].add(e.pointerId);syncControls();});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{pedalPointers[key].delete(e.pointerId);syncControls();});b.addEventListener('contextmenu',e=>e.preventDefault());}
bindPedal('brake','brake');bindPedal('gas','gas');
const wheel=$('steering-wheel');
wheel.addEventListener('pointerdown',e=>{if(!drive||drive.phase!=='running'||wheelDrag)return;e.preventDefault();wheel.setPointerCapture(e.pointerId);wheelDrag={id:e.pointerId,x:e.clientX,value:drive.input.steer||0,start:drive.input.steer||0,travel:Math.max(45,wheel.getBoundingClientRect().width*.65)};});
wheel.addEventListener('pointermove',e=>{if(!wheelDrag||wheelDrag.id!==e.pointerId)return;wheelDrag.value=clamp(wheelDrag.start+(e.clientX-wheelDrag.x)/wheelDrag.travel,-1,1);syncControls();});
for(const type of ['pointerup','pointercancel','lostpointercapture'])wheel.addEventListener(type,e=>{if(wheelDrag?.id!==e.pointerId)return;wheelDrag=null;syncControls();});
wheel.addEventListener('contextmenu',e=>e.preventDefault());
function updateWheel(){const amount=drive?.steering||0,transform=`rotate(${(amount*110).toFixed(1)}deg)`;if($('wheel-art').style.transform!==transform)$('wheel-art').style.transform=transform;const value=String(Math.round(amount*100));if(wheel.getAttribute('aria-valuenow')!==value)wheel.setAttribute('aria-valuenow',value);}
let drag=null;
$('road3d').addEventListener('pointerdown',e=>{if(!using3D()||drive.phase!=='running')return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:three.yaw,moved:false};$('road3d').setPointerCapture(e.pointerId);});
$('road3d').addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;if(Math.hypot(dx,e.clientY-drag.y)>9)drag.moved=true;if(drag.moved)three.yaw=clamp(drag.yaw+dx/$('road3d').getBoundingClientRect().width*.9,-.6,.6);});
$('road3d').addEventListener('pointerup',()=>{drag=null;});
$('road3d').addEventListener('pointercancel',()=>drag=null);
$('road3d').addEventListener('contextmenu',e=>e.preventDefault());
function observeSide(side){if(!drive?.observe(side))return;$('look-'+side).classList.add('checked');$('look-'+side).textContent=side==='left'?'✓ 左を確認':'✓ 右を確認';$('view-'+side).textContent=side==='left'?'✓ 左を確認':'✓ 右を確認';panning=side==='left'?1:-1;panUntil=performance.now()+650;tone('mark');}
for(const [id,yaw] of [['view-left',.85],['view-front',0],['view-right',-.85]])$(id).onclick=()=>{if(three)three.yaw=yaw;if(id!=='view-front')observeSide(id==='view-left'?'left':'right');for(const name of ['view-left','view-front','view-right'])$(name).classList.toggle('active',name===id);};
$('compare-view').onclick=()=>{if(!three||threeError)return;threeEnabled=!threeEnabled;three.yaw=0;refresh3DUI();};
$('quality').onclick=()=>{if(!three)return;lightQuality=!lightQuality;three.quality(lightQuality);$('quality').setAttribute('aria-pressed',String(lightQuality));requestFrame();};

$('course-list').onclick=e=>{const b=e.target.closest('[data-course]');if(b)choose(Number(b.dataset.course));};
for(const mode of ['guided','challenge'])$(mode).onclick=()=>{guided=mode==='guided';for(const m of ['guided','challenge']){$(m).classList.toggle('selected',m===mode);$(m).setAttribute('aria-pressed',String(m===mode));}renderHome();};
$('arcade-start').onclick=()=>choose(3);
$('sound').setAttribute('aria-pressed','true');$('sound').setAttribute('aria-label','音をオフにする');$('sound').querySelector('.slash').hidden=true;
$('start').onclick=()=>{drivingAudio.setEnabled(soundEnabled);drivingAudio.unlock();drive.start();$('start-overlay').hidden=true;controls(true);last=performance.now();tone('mark');requestFrame();$(using3D()?'road3d':'road').focus({preventScroll:true});};
$('pause').onclick=pause;$('resume').onclick=resume;$('restart').onclick=()=>choose(drive.index);$('leave').onclick=home;
$('home-button').onclick=()=>drive?.phase==='running'?pause():home();
$('sound').onclick=()=>{soundEnabled=!soundEnabled;drivingAudio.setEnabled(soundEnabled);$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'音をオフにする':'音をオンにする');$('sound').querySelector('.slash').hidden=soundEnabled;$('sound-state').textContent=soundEnabled?'オン':'オフ';tone('mark');};
for(const side of ['left','right'])$('look-'+side).onclick=()=>observeSide(side);
let resumeAfterHelp=false;
$('help').onclick=()=>{resumeAfterHelp=drive?.phase==='running';if(resumeAfterHelp)pause();$('help-dialog').showModal();};
const closeHelp=()=>{$('help-dialog').close();if(resumeAfterHelp)resume();resumeAfterHelp=false;};
document.querySelector('.close-dialog').onclick=closeHelp;document.querySelector('.close-help').onclick=closeHelp;
$('help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp();});
for(const side of ['left','right']){const b=$('steer-'+side);b.addEventListener('pointerdown',e=>{if(!drive||drive.phase!=='running')return;e.preventDefault();b.setPointerCapture(e.pointerId);steerPointers.set(e.pointerId,side==='right'?1:-1);syncControls();});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{steerPointers.delete(e.pointerId);syncControls();});b.addEventListener('contextmenu',e=>e.preventDefault());}
const activeKeys=new Set();
window.addEventListener('keydown',e=>{
 if(screen!=='game'||$('help-dialog').open||$('drive-settings').open)return;
 if(e.key==='Escape'){e.preventDefault();if(drive?.phase==='running')pause();else if(drive?.phase==='paused')resume();return;}
 if(!drive||drive.phase!=='running'||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))return;
 e.preventDefault();activeKeys.add(e.key);syncControls();
});
window.addEventListener('keyup',e=>{activeKeys.delete(e.key);syncControls();});
// Browser chrome can steal focus while the page remains visible (especially in-app iOS browsers).
// Release held inputs, but reserve automatic pause for actual visibility/page changes.
window.addEventListener('blur',()=>{activeKeys.clear();release();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){activeKeys.clear();pause();release();stopFrames();}else{requestFrame();if(screen==='home')load3DPreviews();}});
window.addEventListener('resize',()=>{
 renderer.invalidateSize();three?.invalidateSize();requestFrame();clearTimeout(resizeTimer);
 resizeTimer=setTimeout(()=>{
  if(screen==='home')renderHome();
  else if(screen==='result'&&drive&&!drive.arcade&&$('review-canvas')&&!$('review-canvas').hidden){const d=new Drive(drive.index);d.z=d.scene.hazard-22;d.eventTime=2.5;d.actorX=d.scene.actor==='bike'?1.5:-2.9;new Renderer($('review-canvas')).render(d,{highlight:true,hero:true});}
 },120);
});
function renderRoad(d,options={}){
 if(!d.arcade){renderer.render(d,options);if(d.impact){const t=d.time-d.impact.at,c=renderer.ctx,w=renderer.w,h=renderer.h;c.save();const f=impactMotion(t,d.impact.speed);c.translate(w*.5+f.x*w*.045,h*.6-f.y*h*.14);c.rotate(f.roll);c.fillStyle='#e9b452';c.beginPath();c.arc(0,-14,7,0,Math.PI*2);c.fill();c.fillRect(-7,-7,14,24);c.fillStyle='#334c65';c.fillRect(-8,17,6,16);c.fillRect(2,17,6,16);c.restore();}return;}
 if(!arcadePreview)arcadePreview=new Drive(0);const local=arcadePreview;local.phase=d.phase;local.z=d.z;local.v=d.v;local.x=d.x;local.heading=d.heading;local.time=d.time;local.input=d.input;local.actorClear=true;local.eventTime=null;local.crowd=visibleCrowd(d);renderer.render(local,options);
}

function showArcadeResult(){
 resultShown=true;release();controls(false);const out=drive.outcome;let best=0;try{best=Math.max(out.points,Number(localStorage.getItem('dondora-drive-bonus-best'))||0);localStorage.setItem('dondora-drive-bonus-best',String(best));}catch{}
 $('result').innerHTML=`<div class="result-top"><div><span class="eyebrow">連続ドライブ · ゲームモード</span><h1>ラッシュ完走！</h1><p>ヒット ${out.hits} / ${out.total} 人 · 最大 ${out.maxCombo} コンボ · ${out.seconds.toFixed(1)} 秒</p></div><div class="result-achievement"><div class="score-circle"><b>${out.points}</b><small>ゲームポイント</small></div><img class="result-mascot" src="../assets/characters/motedora02.png" width="310" height="440" alt="モテドラ師"></div></div><p class="arcade-note">ゲーム専用のコンボ記録です。学習コースの安全運転スコアとは別です。</p><p>この端末のベスト：${best} pt</p><div class="result-actions"><button class="primary" id="arcade-retry">もう一度走る</button><button class="secondary" id="arcade-home">コース一覧へ</button></div>`;show('result');$('result').setAttribute('tabindex','-1');$('result').focus({preventScroll:true});$('arcade-retry').onclick=()=>choose(3);$('arcade-home').onclick=home;
}
// Physics consumes every display interval. Expensive drawing is capped separately.
function frame(now){
 frameId=0;
 if(screen!=='game'||!drive||document.hidden)return;
 const dt=last?(now-last)/1000:0;last=now;
 // A foreground rendering stall is not a request to pause. Bound catch-up work
 // so a slow device neither opens the pause dialog nor jumps down the road.
 drive.step(Math.min(dt,.1));
 if(dirty||now-lastHUD>=100-.01){updateHUD();lastHUD=now;}
 const interval=1000/(lightQuality?30:60);
 if(dirty||now-lastDraw>=interval-.01){
  const forced=dirty;dirty=false;updateWheel();
  const pan=now<panUntil&&!reduceMotion?panning:0;
  if(using3D()){try{three.render(drive,{reducedMotion:reduceMotion});}catch{fallback3D();renderRoad(drive,{pan});}}
  else renderRoad(drive,{pan});
  lastDraw=forced||!Number.isFinite(lastDraw)?now:lastDraw+interval*Math.max(1,Math.floor((now-lastDraw+.01)/interval));
 }
 if(now-lastAudio>=50-.01){drivingAudio.update(drive);lastAudio=now;}
 // Consume each new event once, without allocating a filtered array every frame.
 while(seenEvents<drive.events.length){
  const event=drive.events[seenEvents++];if(event.type!=='impact')continue;
  drivingAudio.impact(event.combo||drive.combo||1,event.speed??drive.impact?.speed??24);
  if(drive.arcade){$('impact-count').textContent=event.combo===1?'HIT':`×${event.combo}`;$('impact-points').textContent=`+${event.points??100*event.combo}`;const fx=$('impact-fx');fx.classList.remove('hit');void fx.offsetWidth;fx.classList.add('hit');}
  else toast('接触しました',1.5);
 }
 if(drive.phase==='result'&&!resultShown)showResult();
 if(screen==='game'&&drive?.phase==='running')queueFrame();
}
renderHome();

window.addEventListener('pagehide',()=>{activeKeys.clear();pause();release();stopFrames();});
window.addEventListener('pageshow',()=>{renderer.invalidateSize();three?.invalidateSize();requestFrame();if(screen==='home')load3DPreviews();});

// Display settings pause the simulation without changing the active course.
let resumeAfterSettings=false;
for(const id of ['settings-button','game-settings'])$(id).onclick=()=>{
 resumeAfterSettings=drive?.phase==='running';if(resumeAfterSettings)pause();
 refresh3DUI();$('drive-settings').showModal();
};
const closeSettings=()=>{$('drive-settings').close();if(resumeAfterSettings)resume();resumeAfterSettings=false;};
$('close-settings').onclick=closeSettings;
$('drive-settings').addEventListener('cancel',e=>{e.preventDefault();closeSettings();});
$('drive-home').onclick=e=>{e.preventDefault();home();};
