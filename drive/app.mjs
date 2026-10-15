import {SCENES,Drive,clamp} from './engine.mjs?v=090';
import {Renderer} from './renderer.mjs?v=090';
import {ArcadeDrive} from './arcade.mjs?v=090';
import {DriveAudio} from './audio.mjs?v=090';
const drivingAudio=new DriveAudio();let seenImpacts=0;
const $=id=>document.getElementById(id),icon=id=>`<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
const STORAGE='dondora-hazard-drive-v1';
let saved={},storageOK=true;try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))saved=raw;}catch{storageOK=false;}
let guided=true,drive=null,screen='home',last=0,resultShown=false,hintShown=false,panning=0,panUntil=0,toastUntil=0,soundEnabled=true,audioContext=null;
const renderer=new Renderer($('road'));const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let three=null,threePromise=null,threeError=false,threeEnabled=true,lightQuality=false,preview3d=null;
function using3D(){return !!(drive&&three&&!three.failed&&threeEnabled&&!threeError);}
function refresh3DUI(){const first=!!drive;$('view-toolbar').hidden=!first;$('road3d').hidden=!using3D();$('road').hidden=using3D();$('view-controls').hidden=!(using3D()&&!drive?.arcade&&drive?.phase==='running');$('compare-view').disabled=threeError||!three;$('quality').disabled=!using3D();$('compare-view').setAttribute('aria-pressed',String(using3D()));$('compare-view').textContent=using3D()?'3D表示':'2D表示';$('render-label').textContent=threeError?'3Dを利用できないため、2Dで表示':three?(using3D()?'3D · ドラッグで左右を見る':'比較用の2D表示'):'3Dを準備しています…';}
function fallback3D(){threeError=true;threeEnabled=false;if(screen==='game'&&drive){pause();refresh3DUI();toast('3D描画が中断したため、2D表示に切り替えました',5);}}
async function get3D(){if(threePromise)return threePromise;threePromise=(async()=>{try{const {Renderer3D}=await import('./renderer3d.mjs?v=090');three=new Renderer3D($('road3d'),{onContextLost:fallback3D});return three;}catch(error){threeError=true;console.warn('3D unavailable; using the 2D renderer.',error?.message);return null;}})();return threePromise;}
function previewDrive(index){const d=new Drive(index);d.z=d.scene.hazard-25;d.eventTime=2.5;d.actorX=index===2?1.8:-2.8;return d;}
function fill3DPreviews(){if(!preview3d)return;const hero=$('hero-3d');hero.src=preview3d.hero;hero.hidden=false;$('hero').hidden=true;for(let i=0;i<SCENES.length;i++){const thumb=$('thumb-'+i);if(!thumb)continue;thumb.hidden=true;let img=thumb.parentNode.querySelector('img');if(!img){img=document.createElement('img');img.alt='3Dコース：'+SCENES[i].title;thumb.parentNode.prepend(img);}img.src=preview3d.thumbs[i];}}
async function load3DPreviews(){const r=await get3D();if(!r||r.failed)return;try{preview3d={hero:r.snapshot(previewDrive(0),1000,420),thumbs:SCENES.map((s,i)=>r.snapshot(previewDrive(i),420,320))};if(screen==='home')fill3DPreviews();}catch{fallback3D();}}
function show3DReview(){if(!three||three.failed||!drive||!threeEnabled||threeError)return;try{const d=previewDrive(drive.index);d.detected={};const canvas=$('review-canvas');const img=document.createElement('img');img.alt='3Dの振り返り：'+drive.scene.title;img.src=three.snapshot(d,760,480);canvas.hidden=true;canvas.parentNode.insertBefore(img,canvas);}catch{}}

function bestKey(index){return `${guided?'guided':'challenge'}-${SCENES[index].id}`;}
function validBest(key){const value=saved[key];return value&&Number.isFinite(value.score)&&value.score>=0&&value.score<=100?value:null;}
function tone(type){if(!soundEnabled)return;try{audioContext??=drivingAudio.ctx||new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=type==='success'?660:type==='mark'?520:290;g.gain.setValueAtTime(.06,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.18);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.2);}catch{}}
function toast(message,seconds=2.5){$('toast').textContent=message;$('toast').hidden=false;toastUntil=performance.now()+seconds*1000;}
function show(which){screen=which;for(const id of ['home','game','result'])$(id).hidden=id!==which;document.body.classList.toggle('in-game',which==='game');$('footer').hidden=which==='game';window.scrollTo({top:0,behavior:'instant'});}
function renderHome(){
 let count=0;
 $('course-list').innerHTML=SCENES.map((s,i)=>{const best=validBest(bestKey(i));if(best?.safe)count++;return `<button class="course" data-course="${i}" aria-label="コース${s.number} ${s.title} ${s.duration}"><div class="course-thumb"><canvas id="thumb-${i}" aria-hidden="true"></canvas><span class="course-number">${s.number}</span><span class="course-level">${s.level}</span></div><div class="course-info"><small>${s.area}<span class="badge-3d">3D</span></small><h3>${s.name}</h3><div class="course-bottom"><span>${best?`<b>ベスト ${best.score}点</b>`:s.duration+' · 停止まで'}</span>${icon('arrow')}</div></div></button>`;}).join('');
 $('completed').textContent=`${count} / 3 クリア`;
 for(let i=0;i<SCENES.length;i++){const d=new Drive(i);d.z=d.scene.hazard-23;d.eventTime=i===0?1.1:0;d.actorX=i===2?2.4:-3.5;new Renderer($(`thumb-${i}`)).render(d,{thumbnail:true});}
 const hd=new Drive(0);hd.z=51;hd.actorX=-4.3;new Renderer($('hero')).render(hd,{hero:true});fill3DPreviews();
 if(!storageOK&&!document.querySelector('.storage-note')){const p=document.createElement('p');p.className='storage-note';p.textContent='このブラウザでは成績を保存できません。ゲームはそのまま遊べます。';$('home').append(p);}
}
function choose(index){
 drive=index===3?new ArcadeDrive():new Drive(index,guided);seenImpacts=0;$('combo-hud').hidden=index!==3;$('impact-fx').classList.remove('hit');$('steering-controls').hidden=false;$('steering-label').textContent='手動操舵';$('start-tip-copy').innerHTML=index===3?'3場面を続けて走ります。<br>接触コンボはこのゲームモードだけの記録です。':'危険がありそうな場所をタップ。<br>ブレーキ長押しで、完全に止まろう。';drag=null;if(three){three.yaw=0;three.currentYaw=0;}$('view-left').textContent='← 左を見る';$('view-right').textContent='右を見る →';for(const id of ['view-left','view-front','view-right'])$(id).classList.toggle('active',id==='view-front');resultShown=false;hintShown=false;panning=0;panUntil=0;toastUntil=0;
 $('scene-number').textContent=`COURSE ${drive.scene.number} · ${guided?'ガイドあり':'チャレンジ'}`;$('scene-title').textContent=drive.scene.title;$('zone-badge').textContent=drive.scene.area;
 $('start-title').textContent=drive.scene.name;$('start-description').textContent=drive.scene.desc;
 $('start-overlay').hidden=false;$('pause-overlay').hidden=true;$('look-controls').hidden=true;$('toast').hidden=true;
 $('look-left').classList.remove('checked');$('look-right').classList.remove('checked');$('look-left').textContent='← 左を見る';$('look-right').textContent='右を見る →';
 $('instruction').textContent='危険がありそうな場所を、画面でタップ。';show('game');controls(false);updateHUD();renderRoad(drive);$('start').focus({preventScroll:true});
 refresh3DUI();if(!threeError){const selected=drive;$('start').disabled=true;get3D().then(()=>{if(drive!==selected||screen!=='game')return;$('start').disabled=false;if(three)three.yaw=0;refresh3DUI();});}else $('start').disabled=false;
}
function controls(active){$('brake').disabled=!active;$('gas').disabled=!active;$('pause').disabled=!active;for(const side of ['left','right'])$('steer-'+side).disabled=!active;}
function release(){drivingAudio.silence();if(drive)drive.release();$('brake').classList.remove('pressed');$('gas').classList.remove('pressed');}
function pause(){if(!drive||drive.phase!=='running')return;drive.pause();release();controls(false);$('pause-overlay').hidden=false;$('resume').focus({preventScroll:true});}
function resume(){if(!drive)return;drivingAudio.unlock();drive.resume();last=performance.now();controls(true);$('pause-overlay').hidden=true;$(using3D()?'road3d':'road').focus({preventScroll:true});}
function home(){release();drive=null;show('home');renderHome();}
function updateHUD(){
 if(!drive)return;
 for(const side of ['left','right'])$('steer-'+side).setAttribute('aria-pressed',String(drive.lane===(side==='right'?1:0)));
 if(drive.arcade){$('speed').textContent=Math.round(drive.speed);$('progress').style.width=`${clamp(drive.z/255*100,0,100)}%`;const a=drive.actors.find(x=>!x.passed);$('zone-badge').textContent=a?`${a.index+1}/3 · ${SCENES[a.index].area}`:'ゴール';$('drive-status').textContent=drive.input.brake?'ブレーキ':drive.speed<1?'アクセルで進もう':'連続ドライブ';$('instruction').textContent='左右ボタンで車線変更。アクセル・ブレーキは長押し。';$('combo-hud').textContent=`${drive.points} pt`;$('view-controls').hidden=true;$('look-controls').hidden=true;return;}
$('speed').textContent=Math.round(drive.speed);$('progress').style.width=`${clamp(drive.z/drive.scene.hazard*100,0,100)}%`;
 const stopped=drive.stopped&&drive.v<.25,inter=drive.scene.id==='intersection';
 let status='周囲をよく見て走ろう';
 if(drive.input.brake)status='ブレーキをかけています';else if(drive.input.gas)status='アクセルを踏んでいます';
 if(drive.v<.25)status=stopped?'停止しています':'止まっています';
 if(inter&&drive.cueVisible&&!drive.stopped)status=`停止線まで ${Math.max(0,Math.round(drive.distance-drive.scene.line))} m`;
 if(stopped)status=inter&&(!drive.checks.left||!drive.checks.right)?'左右の安全を確認しよう':drive.actorClear?'安全を確認できました':'横断が終わるまで待とう';
 $('drive-status').textContent=status;
 $('look-controls').hidden=!(inter&&stopped&&!using3D());$('view-controls').hidden=!(using3D()&&drive.phase==='running');
 let text='危険がありそうな場所を、画面でタップ。';
 if(drive.detected)text='発見できたね。ブレーキ長押しで、余裕を持って停止。';
 if(drive.guided&&drive.cueVisible&&!drive.detected)text=drive.scene.clue;
 if(drive.v<.25&&drive.idle>2&&!drive.stopZone)text=inter&&drive.cueVisible?'停止線の手前まで、ゆっくり進もう。':'アクセルを長押しして、ゆっくり前へ。';
 if(stopped)text=inter&&(!drive.checks.left||!drive.checks.right)?'停止できました。「左を見る」「右を見る」で確認。':'止まれました。そのまま、横断が終わるまで待とう。';
 $('instruction').textContent=text;
 if(drive.guided&&drive.cueVisible&&!hintShown){hintShown=true;toast('周りに、危険の手がかりが見えてきました',3);}
}
function markAt(e){if(!drive||drive.arcade||drive.phase!=='running')return;const b=$('road').getBoundingClientRect();const x=e.clientX-b.left,y=e.clientY-b.top;
 if(!drive.cueVisible){toast('もう少し進んで、周囲を観察しよう');return;}
 if(renderer.hit(x,y,drive.scene.target)){if(drive.mark()){tone('mark');toast('危険を発見！ 次は、早めに減速。');}else toast('発見済みです。運転に集中しよう');}
 else toast('車や人、見通しの悪い場所をよく見てみよう');
}
function showResult(){
 if(drive.arcade){showArcadeResult();return;}
 resultShown=true;release();controls(false);tone(drive.outcome.safe?'success':'miss');const out=drive.outcome,s=drive.scene,key=bestKey(drive.index);let best=validBest(key);
 if(!best||out.score>best.score||(out.safe&&!best.safe)){saved[key]={score:out.score,safe:out.safe,at:new Date().toISOString()};try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{storageOK=false;}}
 const early=drive.detected?.beforeAppearance,earlyBrake=drive.firstBrake?.beforeAppearance;
 const timeline=out.events.map(e=>`<li><time>${e.time.toFixed(1)}秒</time><span>${e.label}</span><small>危険の手前 ${Math.round(e.distance)}m</small></li>`).join('');
 const rows=[['危険の発見',out.detection,30,drive.detected?(early?'早い段階で気づけました':'発見できました。次はもう少し早く'):'危険箇所をタップして記録しよう'],['早めの減速',out.anticipation,30,drive.firstBrake?(earlyBrake?'余裕を持ってブレーキを開始':'次は、危険が近づく前に減速'):'ブレーキで速度を落とそう'],['安全な停止',out.stopping,30,out.safe?`危険の手前 ${Math.round(out.stopDistance)}m で停止`:drive.stopped?'いったん停止しました':'停止の余裕を残して速度を落とそう'],['安全確認',out.confirmation,10,s.id==='intersection'?(drive.checks.left&&drive.checks.right?'左右を確認しました':'停止してから左右を確認しよう'):(out.safe?'横断が終わるまで待てました':'横断が終わるまで待とう')]];
 $('result').innerHTML=`<div class="result-top"><div><span class="eyebrow">COURSE ${s.number} · ${guided?'ガイドあり':'チャレンジ'}</span><h1>${out.safe?'安全に止まれたね。':'次は、もう少し早く。'}</h1><p>${out.safe?'気づいたことを、次の運転にも。':out.reason+'。'}</p></div><div class="score-circle"><b>${out.score}</b><small>/ 100 POINTS</small></div></div><div class="result-layout"><div><div class="replay-scene"><canvas id="review-canvas" aria-label="危険箇所を示した振り返りイラスト"></canvas><span class="replay-tag">この場面のポイント</span></div><div class="lesson"><h2>${s.point}</h2><p>${s.lesson}</p></div></div><div><div class="score-breakdown">${rows.map(r=>`<div class="score-row"><span><strong>${r[0]}</strong><small>${r[3]}</small></span><b>${r[1]} <small>/ ${r[2]}</small></b></div>`).join('')}</div><div class="timeline"><h3>今回の運転を振り返る</h3>${timeline?`<ol>${timeline}</ol>`:'<p class="hint-note">危険がありそうな場所をタップし、早めにブレーキをかけてみよう。</p>'}</div>${storageOK?'<p class="best-note">このブラウザに成績を保存しました。</p>':'<p class="storage-note">成績を保存できませんでした。ゲームは続けられます。</p>'}</div></div><div class="result-actions"><button class="secondary" id="retry">${icon('reset')}もう一度</button><button class="primary" id="next">${drive.index<2?'次のコースへ':'コース一覧へ'}${icon('arrow')}</button></div><button class="result-back" id="result-home">コース選択に戻る</button><p class="disclaimer">採点はゲーム独自の基準です。実際の運転の安全性や合否を判定するものではありません。</p>`;
 show('result');const rd=new Drive(drive.index);rd.z=s.hazard-22;rd.eventTime=2.5;rd.actorX=s.actor==='bike'?1.5:-2.9;new Renderer($('review-canvas')).render(rd,{highlight:true,hero:true});
 $('retry').onclick=()=>choose(drive.index);$('next').onclick=()=>drive.index<2?choose(drive.index+1):home();$('result-home').onclick=home;
 show3DReview();$('result').setAttribute('tabindex','-1');$('result').focus({preventScroll:true});
}
function bindPedal(id,key){const b=$(id);b.addEventListener('pointerdown',e=>{if(!drive||drive.phase!=='running')return;e.preventDefault();b.setPointerCapture(e.pointerId);drive.input[key]=true;b.classList.add('pressed');});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>{if(drive)drive.input[key]=false;b.classList.remove('pressed');});b.addEventListener('contextmenu',e=>e.preventDefault());}
bindPedal('brake','brake');bindPedal('gas','gas');
$('road').addEventListener('pointerup',markAt);
let drag=null;
$('road3d').addEventListener('pointerdown',e=>{if(!using3D()||drive.phase!=='running')return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:three.yaw,moved:false};$('road3d').setPointerCapture(e.pointerId);});
$('road3d').addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x;if(Math.hypot(dx,e.clientY-drag.y)>9)drag.moved=true;if(drag.moved)three.yaw=clamp(drag.yaw+dx/$('road3d').getBoundingClientRect().width*.9,-.6,.6);});
$('road3d').addEventListener('pointerup',e=>{if(!drag)return;const wasDrag=drag.moved;drag=null;if(wasDrag||!using3D()||drive.arcade||drive.phase!=='running')return;if(!drive.cueVisible){toast('もう少し進んで、周囲を観察しよう');return;}if(three.hit(e.clientX,e.clientY)){if(drive.mark()){tone('mark');toast('危険を発見！ 次は、早めに減速。');}else toast('発見済みです。運転に集中しよう');}else toast(drive.scene.clue);});
$('road3d').addEventListener('pointercancel',()=>drag=null);
$('road3d').addEventListener('contextmenu',e=>e.preventDefault());
function observeSide(side){if(!drive?.observe(side))return;$('look-'+side).classList.add('checked');$('look-'+side).textContent=side==='left'?'✓ 左を確認':'✓ 右を確認';$('view-'+side).textContent=side==='left'?'✓ 左を確認':'✓ 右を確認';panning=side==='left'?1:-1;panUntil=performance.now()+650;tone('mark');}
for(const [id,yaw] of [['view-left',.85],['view-front',0],['view-right',-.85]])$(id).onclick=()=>{if(three)three.yaw=yaw;if(id!=='view-front')observeSide(id==='view-left'?'left':'right');for(const name of ['view-left','view-front','view-right'])$(name).classList.toggle('active',name===id);};
$('compare-view').onclick=()=>{if(!three||threeError)return;threeEnabled=!threeEnabled;three.yaw=0;refresh3DUI();};
$('quality').onclick=()=>{if(!three)return;lightQuality=!lightQuality;three.quality(lightQuality);$('quality').setAttribute('aria-pressed',String(lightQuality));};

$('course-list').onclick=e=>{const b=e.target.closest('[data-course]');if(b)choose(Number(b.dataset.course));};
for(const mode of ['guided','challenge'])$(mode).onclick=()=>{guided=mode==='guided';for(const m of ['guided','challenge']){$(m).classList.toggle('selected',m===mode);$(m).setAttribute('aria-pressed',String(m===mode));}renderHome();};
$('arcade-start').onclick=()=>choose(3);
$('sound').setAttribute('aria-pressed','true');$('sound').setAttribute('aria-label','音をオフにする');$('sound').querySelector('.slash').hidden=true;
$('start').onclick=()=>{drivingAudio.setEnabled(soundEnabled);drivingAudio.unlock();drive.start();$('start-overlay').hidden=true;controls(true);last=performance.now();tone('mark');$(using3D()?'road3d':'road').focus({preventScroll:true});};
$('pause').onclick=pause;$('resume').onclick=resume;$('restart').onclick=()=>choose(drive.index);$('leave').onclick=home;
$('home-button').onclick=()=>drive?.phase==='running'?pause():home();
$('sound').onclick=()=>{soundEnabled=!soundEnabled;drivingAudio.setEnabled(soundEnabled);$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'音をオフにする':'音をオンにする');$('sound').querySelector('.slash').hidden=soundEnabled;tone('mark');};
for(const side of ['left','right'])$('look-'+side).onclick=()=>observeSide(side);
let resumeAfterHelp=false;
$('help').onclick=()=>{resumeAfterHelp=drive?.phase==='running';if(resumeAfterHelp)pause();$('help-dialog').showModal();};
const closeHelp=()=>{$('help-dialog').close();if(resumeAfterHelp)resume();resumeAfterHelp=false;};
document.querySelector('.close-dialog').onclick=closeHelp;document.querySelector('.close-help').onclick=closeHelp;
$('help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp();});
for(const side of ['left','right'])$('steer-'+side).addEventListener('pointerdown',e=>{e.preventDefault();drive?.steer?.(side==='right'?1:-1);});
for(const side of ['left','right'])$('steer-'+side).addEventListener('click',()=>drive?.steer?.(side==='right'?1:-1));
const activeKeys=new Set();
window.addEventListener('keydown',e=>{
 if(screen!=='game'||$('help-dialog').open)return;
 if(e.key==='Escape'){e.preventDefault();if(drive?.phase==='running')pause();else if(drive?.phase==='paused')resume();return;}
 if(drive?.phase==='running'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();drive.steer(e.key==='ArrowRight'?1:-1);return;}
 if(!drive||drive.phase!=='running'||!['ArrowUp','ArrowDown',' '].includes(e.key))return;
 e.preventDefault();activeKeys.add(e.key);const key=e.key==='ArrowUp'?'gas':'brake';drive.input[key]=true;$(key).classList.add('pressed');
});
window.addEventListener('keyup',e=>{activeKeys.delete(e.key);if(!drive)return;if(e.key==='ArrowUp'){drive.input.gas=false;$('gas').classList.remove('pressed');}if(['ArrowDown',' '].includes(e.key)&&!activeKeys.has('ArrowDown')&&!activeKeys.has(' ')){drive.input.brake=false;$('brake').classList.remove('pressed');}});
window.addEventListener('blur',()=>{activeKeys.clear();pause();release();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){activeKeys.clear();pause();release();}});
window.addEventListener('resize',()=>{if(screen==='home')renderHome();else if(screen==='result'&&drive&&!drive.arcade){const d=new Drive(drive.index);d.z=d.scene.hazard-22;d.eventTime=2.5;d.actorX=d.scene.actor==='bike'?1.5:-2.9;new Renderer($('review-canvas')).render(d,{highlight:true,hero:true});}});
function renderRoad(d,options={}){
 if(!d.arcade){renderer.render(d,options);if(d.impact){const t=d.time-d.impact.at,c=renderer.ctx,w=renderer.w,h=renderer.h;c.save();c.translate(w*.5+t*w*.12,h*.5-Math.sin(Math.min(t,2.2)/2.2*Math.PI)*h*.33);c.rotate(t*3);c.fillStyle='#e9b452';c.beginPath();c.arc(0,-14,7,0,Math.PI*2);c.fill();c.fillRect(-7,-7,14,24);c.fillStyle='#334c65';c.fillRect(-8,17,6,16);c.fillRect(2,17,6,16);c.restore();}return;}
 const a=d.actors.find(x=>!x.passed)||d.actors[2],local=new Drive(a.index);local.phase=d.phase;local.z=d.z-a.z+local.scene.hazard;local.v=d.v;local.x=d.x;local.input=d.input;local.eventTime=a.started===null?null:a.elapsed;local.actorX=a.index===0?(a.x+3.7)/.86-5.05:a.index===1?(a.x+4.3)/.91-5.05:a.x;local.actorClear=!!a.hit;renderer.render(local,options);
 if(a.hit){const t=d.time-a.hit.at,c=renderer.ctx,w=renderer.w,h=renderer.h;if(t<2.5){c.save();c.translate(w*.5+t*w*.12,h*.5-Math.sin(Math.min(t,2.2)/2.2*Math.PI)*h*.33);c.rotate(t*3);c.fillStyle='#e9b452';c.beginPath();c.arc(0,-14,7,0,Math.PI*2);c.fill();c.fillRect(-7,-7,14,24);c.fillStyle='#334c65';c.fillRect(-8,17,6,16);c.fillRect(2,17,6,16);c.restore();}}
}
function showArcadeResult(){
 resultShown=true;release();controls(false);const out=drive.outcome;let best=0;try{best=Math.max(out.points,Number(localStorage.getItem('dondora-drive-arcade-best'))||0);localStorage.setItem('dondora-drive-arcade-best',String(best));}catch{}
 $('result').innerHTML=`<div class="result-top"><div><span class="eyebrow">FREE DRIVE · ゲームモード</span><h1>3つの場面を走りきった！</h1><p>接触 ${out.hits} 回 · 最大 ${out.maxCombo} コンボ · ${out.seconds.toFixed(1)} 秒</p></div><div class="score-circle"><b>${out.points}</b><small>GAME POINTS</small></div></div><p class="arcade-note">ゲーム専用のコンボ記録です。学習コースの安全運転スコアとは別です。</p><p>この端末のベスト：${best} pt</p><div class="result-actions"><button class="primary" id="arcade-retry">もう一度走る</button><button class="secondary" id="arcade-home">コース一覧へ</button></div>`;show('result');$('arcade-retry').onclick=()=>choose(3);$('arcade-home').onclick=home;
}
function frame(now){const dt=last?(now-last)/1000:0;last=now;if(screen==='game'&&drive){if(dt>.3&&drive.phase==='running')pause();else drive.step(dt);updateHUD();if(now>toastUntil)$('toast').hidden=true;const pan=now<panUntil&&!reduceMotion?panning:0;if(using3D()){try{three.render(drive,{reducedMotion:reduceMotion});}catch{fallback3D();renderRoad(drive,{pan});}}else renderRoad(drive,{pan});drivingAudio.update(drive);const impacts=drive.events.filter(e=>e.type==='impact');if(impacts.length>seenImpacts){seenImpacts=impacts.length;drivingAudio.impact(drive.combo||1);if(drive.arcade){$('impact-count').textContent=drive.combo===1?'HIT':`×${drive.combo}`;$('impact-points').textContent=`+${100*drive.combo}`;const fx=$('impact-fx');fx.classList.remove('hit');void fx.offsetWidth;fx.classList.add('hit');}else toast('接触しました',1.5);}if(drive.phase==='result'&&!resultShown)showResult();}requestAnimationFrame(frame);}
renderHome();requestAnimationFrame(frame);load3DPreviews();

window.addEventListener('pagehide',()=>{activeKeys.clear();pause();release();});
