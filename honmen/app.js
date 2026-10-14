/* 本免 UI: a separate model and storage namespace, with the existing app's visual language. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mark = value => value === true ? '○' : value === false ? '×' : '未回答';
  const btn = (action,label,extra='',secondary=false) => `<button class="btn${secondary?' secondary':''}" data-h="${action}" ${extra}>${label}</button>`;
  const date = value => new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(value);
  const categories = ['標識・標示','信号・合図','交差点・通行','歩行者保護','速度・車間距離','駐停車','高速道路','二輪車','危険予測','運転・点検','免許・心得'];
  const symbols = ['sign','signal','junction','person','speed','park','road','carStart','flag','gear','license'];
  let model, storage, view='mock', slot=null, returnTab='mock', lastResult=null, toastTimer, pendingImport=null, checkpoint=0;
  let bank, sets, version, reviewSchedule='';
  const dialog = $('h-dialog');
  function toast(message) { $('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500); }
  function warn() {
    if(!model||!storage)return;
    const message=model.conflicted?'別の画面で本免の記録が更新されました。再読み込みして続けてください。':model.error||storage.status.message;
    $('storage-warning').hidden=!message;
    $('storage-warning').textContent=message||'';
    if(model.conflicted) { $('main').inert=true;$('tabs').inert=true;$('settings-button').disabled=true; }
  }
  function checked(ok) { if(!ok) {warn();toast(model.error||'操作できませんでした。途中の記録を確認してください。');}return ok; }
  function open(title,body) { $('h-dialog-title').textContent=title;$('h-dialog-body').innerHTML=body;if(!dialog.open)dialog.showModal(); }
  function close() { dialog.close(); }
  function focusQuestion() { $('question-title')?.focus({preventScroll:true}); }
  function top() { window.scrollTo({top:0,behavior:'instant'}); }
  function applySettings() {
    const s=model.state.settings;
    const dark=s.theme==='dark'||(s.theme==='auto'&&window.matchMedia?.('(prefers-color-scheme:dark)').matches);
    document.documentElement.dataset.theme=dark?'dark':'light';
    document.body.dataset.reduceMotion=String(s.reduceMotion);
  }
  function changeView(next) {
    view=next;
    for(const id of ['mock','learn','review','play','result'])$(id).hidden=id!==next;
    for(const id of ['mock','learn','review']) { const selected=id===next;$('tab-'+id).setAttribute('aria-selected',String(selected));$('tab-'+id).tabIndex=selected?0:-1; }
    document.body.classList.toggle('play-active',next==='play');
    document.body.classList.toggle('focused-view',next==='play'||next==='result');
    $('footer').hidden=next==='play'||next==='result';
    $('settings-button').disabled=next==='play';
    $('tabs').hidden=next==='play';
    if(next==='play')renderPlay();else if(next==='result')renderResult(lastResult);else renderHome(next);
    top();
  }
  function intro(title,copy,robot=false) { return `<div class="home-intro"><div><h2>${title}</h2><p>${copy}</p></div><img class="home-character" src="./${robot?'image-a5b30a44fd43.png':'image-155cadc1029a.png'}" alt="" width="175" height="99"></div>`; }
  function resumes(which) {
    return which.map(key=>{
      const a=model.state.sessions[key];if(!a)return '';
      return `<div class="h-resume"><h3>${esc(a.label)}の続き</h3><p class="muted">${a.answers.filter(HonmenModel.answered).length} / ${a.ids.length}問 回答済み${key==='mock'?'・残り '+time(a.remainingMs):''}</p><div class="btnrow">${btn('resume','続きから',`data-slot="${key}"`)}${btn('end-session','ここまでで終了',`data-slot="${key}"`,true)}</div></div>`;
    }).join('');
  }
  function renderHome(tab) {
    const schedule=model.schedule();$('review-dot').hidden=!schedule.due.length;
    reviewSchedule=JSON.stringify(schedule);
    if(tab==='mock') {
      const passed=sets.filter(set=>model.best(set)?.score>=90).length;
      $('mock').innerHTML=intro('本免に、挑戦。','文章も、危険予測も。ひとつずつ確実に。')+
        `<div class="h-overview"><div><strong>95<small>問 / 1回</small></strong></div><div><strong>50<small>分の模試</small></strong></div><div><strong>${passed}<small>/ ${sets.length}回 合格</small></strong></div></div>`+
        resumes(['mock','study'])+
        `<div class="section-heading"><h3>本免練習問題</h3><small>${bank.length}問</small></div><div class="mock-grid">${sets.map(set=>{
          const best=model.best(set),latest=model.latest(set);
          return `<button class="set-card" data-h="set" data-set="${set}"><span><b>本免練習 ${set}</b><small>${best?'最高 '+best.score+' / 100点':'文章90問＋危険予測5問'}</small>${latest?`<small>前回 ${latest.score}点</small>`:''}</span><span class="h-set-mark" aria-hidden="true">${best?.score>=90?flowerStamp(best.score===100?'満点':'合格'):icon('exam')}</span></button>`;
        }).join('')}</div><p class="hintline" style="margin-top:12px">教材の回番号に合わせて掲載しています。</p><div class="h-rules"><strong>90点以上で合格の目安。</strong><br>文章問題は1問1点。危険予測は3つの正誤がすべて合っていると2点、部分点はありません。<br>模試では採点後に解説を確認できます。</div>`;
    } else if(tab==='learn') {
      const done=bank.filter(q=>model.state.stats[q.id]?.total>0).length;
      $('learn').innerHTML=intro('少しずつ、身につく。','解説を読みながら、自分のペースで。',true)+resumes(['study'])+
        `<div class="h-feature"><div><h3>危険予測を練習</h3><p>図を見て、3つの判断に○・×で回答。<br>まずは5問に取り組みましょう。</p>${btn('hazard','危険予測 5問 '+icon('arrow'))}</div>${icon('flag')}</div>`+
        `<div class="section-heading"><h3>分野別に10問</h3><small>${done} / ${bank.length}問 学習済み</small></div><div class="category-grid">${categories.map((cat,i)=>{
          const qs=bank.filter(q=>q.category===cat);if(!qs.length)return '';
          return `<button class="h-category" data-h="category" data-category="${esc(cat)}">${icon(symbols[i])}<span><b>${esc(cat)}</b><small>${qs.length}問から出題</small></span></button>`;
        }).join('')}</div><div class="stack">${btn('random','全分野から10問', '', true)}</div><div class="h-rules">1問ごとに解説を表示します。危険予測は3つ回答してから「答え合わせ」を押してください。</div>`;
    } else {
      const waiting=schedule.waiting, next=waiting.length?Math.max(1,Math.ceil((model.state.stats[waiting[0]].reviewAt-Date.now())/60000)):0;
      $('review').innerHTML=intro('間違いを、得点に。','間隔をあけて、もう一度。',true)+resumes(['review'])+
        `<div class="h-overview"><div><strong>${schedule.due.length}<small>いま復習できる</small></strong></div><div><strong>${waiting.length}<small>時間をあけて復習</small></strong></div><div><strong>${Object.values(model.state.stats).filter(s=>s.total>0).length}<small>問に取り組んだ</small></strong></div></div>`+
        (schedule.due.length?`<div class="stack">${btn('review-start',`復習を始める（${Math.min(10,schedule.due.length)}問）`)}</div>`:`<div class="empty"><h3>${waiting.length?'少し時間をあけましょう':'いま復習する問題はありません'}</h3><p>${waiting.length?'次の復習は約'+next+'分後です。':'学習や模試で間違えた問題がここに集まります。'}</p></div>`)+
        `<div class="h-rules">最初の間違いはすぐ復習できます。その後は30分以上あけ、2回正解すると復習を卒業します。危険予測は3つ全部の正解で1回に数えます。</div>`+
        `<div class="section-heading"><h3>最近の記録</h3><small>直近60件</small></div>`+
        (model.state.attempts.length?[...model.state.attempts].reverse().map(a=>`<button class="h-history-row" data-h="history" data-record="${esc(a.id)}"><span>${esc(a.label)}<small>${date(a.completedAt)}${a.partial?'・途中終了':''}${a.timeout?'・時間終了':''}${a.contentVersion!==version?'・以前の問題版':''}</small></span><strong>${a.score}<small>/ ${a.maxScore}点</small></strong></button>`).join(''):'<p class="muted">学習が終わると記録されます。</p>');
    }
  }
  function time(ms) { const seconds=Math.ceil(ms/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`; }
  function image(q) { return q.image?`<button class="h-figure" data-h="figure" data-id="${q.id}" aria-label="問題の図を拡大"><img src="./${esc(q.image)}" alt="${esc(q.imageAlt||'問題の図')}" decoding="async"><small>タップして拡大</small></button>`:''; }
  function source(q) {
    const review=q.editorial;
    return review?`<details><summary>原資料からの補正について</summary><p class="muted">${esc(review.reason)}</p>${(review.sourceUrls||[]).map((url,i)=>`<a class="source-link" href="${esc(url)}" target="_blank" rel="noopener">確認資料${i+1} ↗</a>`).join(' ')}</details>`:'';
  }
  function answerLines(keys,answers) { return keys.map((v,i)=>`<div class="h-answer-line"><b>${keys.length===3?['①','②','③'][i]:''} 正解 ${mark(v)}</b><span>あなたの回答 ${mark(answers[i])}</span></div>`).join(''); }
  function feedback(q,keys,answers) {
    const ok=HonmenModel.correct(keys,answers);
    return `<div class="feedback ${ok?'':'incorrect'}" role="status" tabindex="-1"><h3>${ok?'正解です':'ここを確認しましょう'}${q.type==='hazard'?(ok?'・2点':'・0点'):''}</h3>${answerLines(keys,answers)}<p class="h-explanation">${esc(q.explanation)}</p>${source(q)}</div>`;
  }
  function choices(a,index,part,locked) {
    return `<div class="choices" role="group" aria-label="${a.keys[index].length===3?(part+1)+'つ目の':'問題の'}正誤">${[true,false].map(value=>{
      const chosen=a.answers[index][part]===value, right=locked&&a.keys[index][part]===value, wrong=locked&&chosen&&!right;
      return `<button class="answer-btn ${right?'right':wrong?'wrong':chosen?'selected':''}" data-h="answer" data-value="${value}" data-part="${part}" aria-label="${value?'○ 正しい':'× 誤り'}" aria-pressed="${chosen}" ${locked?'disabled':''}><span aria-hidden="true">${mark(value)}</span><small>${value?'正しい':'誤り'}</small></button>`;
    }).join('')}</div>`;
  }
  function renderPlay() {
    const a=model.state.sessions[slot];
    if(!a) { lastResult=model.state.attempts.at(-1);if(lastResult)changeView('result');else changeView(returnTab);return; }
    const q=model.byId.get(a.ids[a.index]);if(!q)return;
    const exam=a.mode==='mock', locked=!exam&&a.committed[a.index], count=a.answers.filter(HonmenModel.answered).length;
    $('play').innerHTML=`<div class="playhead"><div><p class="eyebrow">${exam?'HONMEN MOCK TEST':'HONMEN PRACTICE'}</p><h2>${esc(a.label)}</h2></div>${btn('pause','中断', '', true)}</div>`+
      `<div class="play-meta"><span>${a.index+1} / ${a.ids.length}問</span>${exam?`<span class="timer" id="timer" aria-label="残り時間">${time(model.remaining())}</span>`:`<span class="muted">解説付き</span>`}</div>`+
      `<div class="progress play-progress" role="progressbar" aria-label="回答済み" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${a.ids.length}"><i style="width:${count/a.ids.length*100}%"></i></div>`+
      `<p class="h-question-source">本免練習 ${q.set}・問${q.number} / ${esc(q.category)}${q.type==='hazard'?' / 2点':' / 1点'}</p>`+
      `<h3 class="question" id="question-title" tabindex="-1">${esc(q.text)}</h3>${image(q)}`+
      (q.type==='hazard'?`<p class="h-hazard-note">3つすべて正解で2点です。それぞれ○・×を選んでください。</p>${q.statements.map((text,i)=>`<fieldset class="h-statement"><legend>${['①','②','③'][i]} ${esc(text)}</legend>${choices(a,a.index,i,locked)}</fieldset>`).join('')}${!exam&&!locked?btn('commit','3つの答えを確認する',HonmenModel.answered(a.answers[a.index])?'':'disabled'):''}`:
        `<p class="choose-label">正しければ○、誤っていれば×</p>${choices(a,a.index,0,locked)}`)+
      (locked?feedback(q,a.keys[a.index],a.answers[a.index]):'')+
      (exam?`<div class="exam-tools"><button class="flag-btn" data-h="flag" aria-pressed="${a.flags[a.index]}">${icon('flag')}あとで見直す</button><small class="muted">${count}問 回答済み</small></div>`:'')+
      `<div class="btnrow">${btn('prev',icon('back')+'前へ',a.index===0?'disabled':'',true)}${a.index<a.ids.length-1?btn('next','次へ'+icon('arrow'),!exam&&!locked?'disabled':''):btn('finish','採点する',!exam&&!locked?'disabled':'')}</div>`+
      (exam?`<details class="exam-map"><summary>回答状況と見直し（${count} / ${a.ids.length}問）</summary><p class="muted">青：回答済み / ●：見直す</p><div class="number-grid">${a.ids.map((id,i)=>`<button data-h="jump" data-index="${i}" class="${HonmenModel.answered(a.answers[i])?'done ':''}${a.flags[i]?'flagged ':''}${i===a.index?'current':''}" aria-label="${i+1}問目 ${HonmenModel.answered(a.answers[i])?'回答済み':'未回答'}${a.flags[i]?' 見直す':''}">${i+1}</button>`).join('')}</div>${btn('finish','ここまでで採点', '', true)}</details>`:'');
    warn();
  }
  function start(ids,mode,label,set=null) {
    const target=mode==='mock'?'mock':mode==='review'?'review':'study';
    if(model.state.sessions[target]) {open('途中の記録があります',`<p>${esc(model.state.sessions[target].label)}を再開するか、ここまでで終了してから新しく始めてください。</p><div class="btnrow">${btn('resume','続きから',`data-slot="${target}"`)}${btn('end-session','ここまでで終了',`data-slot="${target}"`,true)}</div>`);return;}
    if(!checked(model.begin({ids,mode,label,set})))return;
    slot=target;returnTab=['mock','learn','review'].includes(view)?view:returnTab;close();checkpoint=Date.now();changeView('play');focusQuestion();
  }
  function resume(key) { if(!checked(model.resume(key)))return;slot=key;returnTab=key==='study'?'learn':key==='review'?'review':'mock';close();changeView('play');focusQuestion(); }
  function endConfirm(key) {
    const a=model.state.sessions[key];if(!a)return;
    const unanswered=a.answers.filter(v=>!HonmenModel.answered(v)).length;
    open('ここまでで採点しますか？',`<p>${unanswered?`未回答が${unanswered}問あります。未回答は0点です。`:'すべての問題に回答しました。'}${a.mode==='mock'&&unanswered?'途中終了の記録は最高点・合格回数に含めません。':''}${a.mode!=='mock'?'答え合わせ前の危険予測は未回答として扱います。':''}</p><div class="btnrow">${btn('close','戻る','',true)}${btn('confirm-finish','採点する',`data-slot="${key}"`)}</div>`);
  }
  function resultQuestion(a,index) {
    const q=model.byId.get(a.ids[index]),ok=a.correctness[index];if(!q)return '';
    return `<details class="h-result-question"><summary><span class="badge ${ok===true?'success':ok===false?'error':''}">${ok===true?'正解':ok===false?'不正解':'未回答'}</span><span>${index+1}問目 / 本免${q.set}・問${q.number}<br>${esc(q.text)}</span></summary>${image(q)}${q.statements?`<ol>${q.statements.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:''}${answerLines(a.keys[index],a.answers[index])}<p class="h-explanation">${esc(q.explanation)}</p>${source(q)}</details>`;
  }
  function renderResult(a) {
    if(!a) {changeView('review');return;}
    const full=a.mode==='mock'&&!a.partial&&a.maxScore===100,passed=full&&a.score>=90,current=a.contentVersion===version;
    const title=passed?(a.score===100?'満点、おめでとう！':'合格ラインに届きました！'):full?'次は、90点を目指そう。':a.partial?'ここまで、おつかれさま。':'おつかれさまでした。';
    $('result').innerHTML=`<div class="h-result-heading"><p class="eyebrow">HONMEN RESULT</p><h2>${title}</h2><p class="muted">${esc(a.label)}${a.timeout?'・時間終了':''}${a.partial?'・途中終了':''}</p>${passed?`<div class="h-result-stamp">${flowerStamp(a.score===100?'満点':'合格')}</div>`:''}<div class="h-result-score"><strong>${a.score}</strong><span>/ ${a.maxScore}点</span></div><p>${a.correctness.filter(v=>v===true).length} / ${a.ids.length}問 正解</p><p class="muted">${full?'このアプリ内の判定：100点中90点以上で合格':'練習・途中終了の記録は模試の最高点に含めません'}</p></div>`+
      `<div class="btnrow">${btn('home','ホームに戻る','',true)}${current&&a.correctness.some(v=>v!==true)?btn('retry','間違い・未回答を練習'):btn('tab','復習と記録へ','data-tab="review"')}</div>`+
      `<div class="section-heading"><h3>回答と解説</h3><small>${date(a.completedAt)}</small></div>`+
      (current?`<div class="h-results">${a.ids.map((id,i)=>resultQuestion(a,i)).join('')}</div>`:'<div class="h-rules">以前の問題版での成績です。問題内容が更新されたため、当時の回答・正解のみ表示します。</div><div class="h-results">'+a.ids.map((id,i)=>`<div class="card"><b>${i+1}問目（${esc(id)}）</b>${answerLines(a.keys[i],a.answers[i])}</div>`).join('')+'</div>');
  }
  function settings() {
    const s=model.state.settings;
    open('表示と本免の学習記録',`<label class="h-setting">表示テーマ<select id="theme"><option value="auto" ${s.theme==='auto'?'selected':''}>端末に合わせる</option><option value="light" ${s.theme==='light'?'selected':''}>明るい</option><option value="dark" ${s.theme==='dark'?'selected':''}>暗い</option></select></label><label class="h-setting">動きを控える<input id="reduce-motion" type="checkbox" ${s.reduceMotion?'checked':''}></label><p class="muted">本免の記録はこの端末・ブラウザに保存します。クラウド同期はありません。仮免の記録とは別です。</p><div class="stack">${btn('export','本免の記録を書き出す','',true)}${btn('import','本免の記録を読み込む','',true)}${btn('reset','本免の記録をリセット','',true)}</div>`);
  }
  function sources() { open('内容の補正と確認資料',`<p class="muted">原資料の正誤や文面が現行ルールと合わない問題は、条件・答え・解説を補正しています。判読が不確かな箇所は、同じテーマの明確な設問に置き換えています。</p><ul class="h-source-list">${HONMEN_DATA.rules.map(r=>`<li><b>${esc(r.title)}</b><p>${esc(r.summary)}</p><a href="${esc(r.url)}" target="_blank" rel="noopener">確認資料 ↗</a></li>`).join('')}</ul>`); }
  async function action(b) {
    const key=b.dataset.h;
    if(!model)return;
    if(key==='close'){close();return;}
    if(key==='close-figure'){$('figure-dialog').close();return;}
    if(model.conflicted){warn();return;}
    if(key==='tab'||key==='home'){close();changeView(key==='home'?returnTab:b.dataset.tab);return;}
    if(key==='settings'){settings();return;}
    if(key==='sources'){sources();return;}
    if(key==='set') {const set=Number(b.dataset.set);open('本免練習 '+set,`<p>文章90問・危険予測5問、100点満点です。</p><div class="stack">${btn('start-set','模試を始める（50分）',`data-set="${set}" data-mode="mock"`)}${btn('start-set','解説付きで95問を練習',`data-set="${set}" data-mode="guided"`,true)}</div><p class="muted" style="margin-top:16px">模試は終了後に採点。解説付き練習は1問ずつ答え合わせします。どちらも中断・再開できます。</p>`);return;}
    if(key==='start-set'){const set=Number(b.dataset.set),mode=b.dataset.mode;start(bank.filter(q=>q.set===set).map(q=>q.id),mode,'本免練習 '+set+(mode==='mock'?'・模試':'・解説付き'),set);return;}
    if(['random','category','hazard'].includes(key)){const qs=bank.filter(q=>key==='random'||(key==='hazard'?q.type==='hazard':q.category===b.dataset.category));const n=key==='hazard'?5:10;start(model.sample(qs.map(q=>q.id),n),'study',key==='random'?'全分野10問':key==='hazard'?'危険予測5問':b.dataset.category+'・10問');return;}
    if(key==='review-start'){start(model.schedule().due.slice(0,10),'review','間違いの復習');return;}
    if(key==='resume'){resume(b.dataset.slot);return;}
    if(key==='end-session'){endConfirm(b.dataset.slot);return;}
    if(key==='pause'){if(!checked(model.pause()))return;await storage.flush();changeView(returnTab);return;}
    if(key==='finish'){endConfirm(slot);return;}
    if(key==='confirm-finish'){const result=model.finish(b.dataset.slot);if(!checked(!!result))return;lastResult=result;close();changeView('result');return;}
    if(key==='history'){lastResult=model.state.attempts.find(a=>a.id===b.dataset.record);returnTab='review';changeView('result');return;}
    if(key==='retry'){start(lastResult.ids.filter((id,i)=>lastResult.correctness[i]!==true&&model.byId.has(id)),'study','間違い・未回答の練習');return;}
    if(key==='figure'){const q=model.byId.get(b.dataset.id);if(!q?.image)return;$('figure-content').innerHTML=`<img src="./${esc(q.image)}" alt="${esc(q.imageAlt||'問題の図')}">`;$('figure-zoom').value='100';$('figure-content').style.width='100%';$('figure-dialog').showModal();return;}
    if(key==='export'){const blob=new Blob([model.export()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='honmen-progress-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('本免の記録を書き出しました');return;}
    if(key==='import'){$('import-file').click();return;}
    if(key==='confirm-import'){if(!pendingImport)return;if(!checked(model.import(pendingImport)))return;pendingImport=null;await storage.flush();applySettings();close();changeView('review');toast('本免の記録を読み込みました');return;}
    if(key==='reset'){open('本免の記録をリセットしますか？','<p>本免の成績・復習・途中経過をすべて消します。必要な場合は、先に記録を書き出してください。仮免の記録は変わりません。</p><div class="btnrow">'+btn('settings','戻る','',true)+btn('confirm-reset','本免の記録を消す')+'</div>');return;}
    if(key==='confirm-reset'){if(!checked(model.reset()))return;await storage.flush();applySettings();close();changeView('mock');toast('本免の記録をリセットしました');return;}
    const a=model.state.sessions[slot];if(!a)return;
    if(key==='answer'){if(checked(model.answer(slot,a.index,b.dataset.value==='true',Number(b.dataset.part)))){renderPlay();const active=document.querySelector(`#play [data-h="answer"][data-part="${Number(b.dataset.part)}"][data-value="${b.dataset.value==='true'}"]`);if(active&&!active.disabled)active.focus({preventScroll:true});else document.querySelector('#play .feedback')?.focus({preventScroll:true});}return;}
    if(key==='commit'){if(checked(model.commitHazard(slot,a.index))){renderPlay();document.querySelector('#play .feedback')?.focus({preventScroll:true});document.querySelector('#play .feedback')?.scrollIntoView({block:'nearest'});}return;}
    if(key==='flag'){if(checked(model.flag(slot,a.index))){renderPlay();document.querySelector('#play [data-h="flag"]')?.focus({preventScroll:true});}return;}
    if(['next','prev','jump'].includes(key)){const index=key==='next'?a.index+1:key==='prev'?a.index-1:Number(b.dataset.index);if(checked(model.move(slot,index))){renderPlay();top();focusQuestion();}}
  }
  document.addEventListener('click',event=>{const b=event.target.closest('[data-h]');if(b&&!b.disabled)action(b).catch(error=>{toast(error.message||'操作を完了できませんでした。');warn();});});
  document.addEventListener('change',event=>{
    if(!model)return;
    if(event.target.id==='theme'||event.target.id==='reduce-motion'){const values=event.target.id==='theme'?{theme:event.target.value}:{reduceMotion:event.target.checked};if(checked(model.settings(values)))applySettings();}
  });
  $('figure-zoom').addEventListener('input',event=>$('figure-content').style.width=event.target.value+'%');
  $('import-file').addEventListener('change',async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try {
      if(file.size>10*1024*1024)throw new Error('記録ファイルが大きすぎます。');
      const text=await file.text(),incoming=HonmenModel.normalize(JSON.parse(text));pendingImport=text;
      open('本免の記録を読み込みますか？',`<p>${Object.keys(incoming.stats).length}問分の回答記録を読み込み、現在の本免の記録を置き換えます。必要なら先に現在の記録を書き出してください。</p><div class="btnrow">${btn('settings','戻る','',true)}${btn('confirm-import','読み込む')}</div>`);
    } catch(error) { pendingImport=null;toast(error.message||'本免の記録ファイルを読み込めませんでした。'); }
  });
  $('tabs').addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    const tabs=['mock','learn','review'],i=tabs.indexOf(view);if(i<0)return;event.preventDefault();
    const index=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;changeView(tabs[index]);$('tab-'+tabs[index]).focus();
  });
  document.addEventListener('visibilitychange',()=>{
    if(!model||view!=='play')return;
    if(document.hidden){model.pause();storage.flush();}
    else if(checked(model.resume(slot))){renderPlay();checkpoint=Date.now();}
    warn();
  });
  window.addEventListener('pagehide',()=>{if(model&&view==='play')model.pause();storage?.flush();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&model&&view==='play'){if(checked(model.resume(slot)))renderPlay();}});
  window.addEventListener('storage',()=>warn());
  window.matchMedia?.('(prefers-color-scheme:dark)').addEventListener?.('change',()=>model&&applySettings());
  window.HonmenReady=(async()=>{
    try {
      bank=HONMEN_DATA.questions;sets=HONMEN_DATA.sets;version=HONMEN_DATA.version;
      storage=await HonmenStorage.open({storage:localStorage,indexedDB:window.indexedDB,validate:HonmenModel.normalize,build:version,onChange:warn});
      model=HonmenModel.create({bank,storage,contentVersion:version});
      window.HonmenApp={model,storage,get view(){return view;}};
      $('brandmark').innerHTML=icon('road');$('settings-button').innerHTML=icon('settings');
      ['mock','learn','review'].forEach((key,i)=>$('nav-'+key).innerHTML=icon(['exam','book','review'][i]));
      $('startup-status').hidden=true;$('main').inert=false;$('tabs').inert=false;$('settings-button').disabled=false;
      applySettings();changeView('mock');warn();storage.protect(navigator.storage);
      setInterval(()=>{
        if(!model||document.hidden)return;
        if(view==='play'&&slot==='mock') {
          if(!model.state.sessions.mock)return;
          if(model.remaining()===0||Date.now()-checkpoint>=15000){const expired=model.tick();checkpoint=Date.now();if(expired){lastResult=model.state.attempts.at(-1);close();$('figure-dialog').close();changeView('result');return;}warn();}
          if($('timer')){$('timer').textContent=time(model.remaining());$('timer').classList.toggle('low',model.remaining()<5*60000);}
        } else if(view==='review'&&!dialog.open&&reviewSchedule!==JSON.stringify(model.schedule()))renderHome('review');
      },1000);
      return true;
    } catch(error) { $('startup-status').textContent=(error.message||'本免の画面を読み込めませんでした。')+' ページを再読み込みしてください。';$('startup-status').setAttribute('role','alert');return false; }
  })();
})();
