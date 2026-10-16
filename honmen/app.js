/* 本免 UI: a separate model and storage namespace, with the existing app's visual language. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mark = value => value === true ? '○' : value === false ? '×' : '未回答';
  const btn = (action,label,extra='',secondary=false,compact=false) => `<button class="btn${secondary?' secondary':''}${compact||['pause','note-return'].includes(action)?' compact':''}" data-h="${action}" ${extra}>${label}</button>`;
  const date = value => new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(value);
  const categories = ['標識・標示','信号・合図','交差点・通行','歩行者保護','速度・車間距離','駐停車','高速道路','二輪車','危険予測','運転・点検','免許・心得'];
  const symbols = ['sign','signal','junction','person','speed','park','road','carStart','flag','gear','license'];
  let model, storage, view='mock', slot=null, returnTab='mock', lastResult=null, toastTimer, pendingImport=null, checkpoint=0, resultSchedule='', windowFocused=true, pageActive=true;
  let bank, sets, version, reviewSchedule='';
  const displaySet = set => { const index=sets.indexOf(Number(set)); return index < 0 ? set : index+1; };
  const displayLabel = record => record.set && ['mock','guided'].includes(record.mode) ? `第${displaySet(record.set)}回・${record.mode==='mock'?'模試':'解説付き'}` : record.label;
  const dialog = $('h-dialog');
  function statementReasons(q) {
    const reasons=window.HonmenTeaching?.[q.id];
    return reasons?`<ol class="h-statement-reasons">${reasons.map((reason,i)=>`<li><strong>${mark(q.answer[i])} ${esc(q.statements[i])}</strong><p>${esc(reason)}</p></li>`).join('')}</ol>`:'';
  }
  function toast(message) { $('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4500); }
  function warn() {
    if(!model||!storage)return;
    const message=model.conflicted?'別の画面で本免の記録が更新されました。再読み込みして続けてください。':model.error||storage.status.message;
    $('storage-warning').hidden=!message;
    $('storage-warning').textContent=message||'';
    if(model.conflicted) { $('main').inert=true;$('tabs').inert=true;$('settings-button').disabled=true; }
  }
  function checked(ok) { if(!ok) {warn();toast(model.error||'操作できませんでした。途中の記録を確認してください。');}return ok; }
  function open(title,body) { $('h-dialog-title').textContent=title;$('h-dialog-body').innerHTML=body;dialog.querySelector('.h-dialog-close').hidden=!!$('h-dialog-body').querySelector('[data-h="close"],[data-h="settings"]');if(!dialog.open)dialog.showModal(); }
  function close() { dialog.close(); }
  function focusQuestion() { requestAnimationFrame(()=>($('play').querySelector('.answer-result')||$('question-title'))?.focus({preventScroll:true})); }
  function top() { window.scrollTo({top:0,behavior:'instant'}); }
  function applySettings() {
    const s=model.state.settings;
    const dark=s.theme==='dark'||(s.theme==='auto'&&window.matchMedia?.('(prefers-color-scheme:dark)').matches);
    document.documentElement.dataset.theme=dark?'dark':'light';
    document.body.dataset.reduceMotion=String(s.reduceMotion);
  }
  function changeView(next,preserve=false) {
    if(next!=='notes'&&next!=='town')$('notes').replaceChildren();
    view=next;
    document.body.classList.toggle('town-active',next==='town');
    window.KarimenTown?.onView(next);
    for(const id of ['mock','learn','review','play','result','town','notes'])$(id).hidden=id!==next;
    for(const id of ['mock','learn','review']) { const selected=id===(['play','result','town','notes'].includes(next)?(next==='town'?(['mock','learn','review'].includes(townReturn)?townReturn:townReturn==='notes'?'learn':returnTab):next==='notes'?'learn':returnTab):next);$('tab-'+id).setAttribute('aria-selected',String(selected));$('tab-'+id).tabIndex=selected?0:-1; }
    document.body.classList.toggle('play-active',next==='play');
    document.body.classList.toggle('focused-view',next==='play'||next==='result'||next==='notes');
    $('footer').hidden=next==='play'||next==='result'||next==='town'||next==='notes';
    $('settings-button').disabled=next==='play';
    $('tabs').hidden=next==='play';
    if(preserve){}else if(next==='notes')renderNotes();else if(next==='play')renderPlay();else if(next==='result'){resultFilter=defaultResultFilter(lastResult);renderResult(lastResult);}else if(next!=='town')renderHome(next);
    window.KarimenHomeInstall?.sync();
    top();$('main').focus({preventScroll:true});
  }
  const pct = (n,total) => total ? Math.round(n / total * 100) : 0;
  const characterArt = (id,cls='') => `<img class="placement-character ${cls}" src="./assets/characters/${id}.png" alt="" aria-hidden="true" decoding="async">`;
  let mockFilter='all',categoryFilter='all',categorySort='default',learnSection='categories',reviewMore=false,resultFilter='wrong',townReturn='mock';
  let noteSearch='',noteFilter='',noteReturn=null,pendingStart=null;
  const celebrated=new Set();
  const filters = (action,current,items) => `<div class="seg" role="group" aria-label="表示を絞り込む">${items.map(([value,label])=>`<button data-h="${action}" data-value="${value}" aria-pressed="${value===current}">${label}</button>`).join('')}</div>`;
  function entryCard(action,title,description,glyph='book',extra='') {return `<button class="recommend${action==='resume'?' resume-card':''}" data-h="${action}" ${extra}>${icon(glyph)}<span class="recommend-copy"><strong>${esc(title)}</strong><small>${esc(description)}</small></span>${icon('arrow')}</button>`;}
  function resumes(which) {
    return which.map(key=>{const a=model.state.sessions[key];return a?entryCard('resume',key==='mock'?`第${displaySet(a.set)}回の続きへ`:key==='review'?'途中の復習を続ける':'続きから学ぶ',`${esc(displayLabel(a))} · ${a.answers.filter(HonmenModel.answered).length} / ${a.ids.length}問 回答済み${key==='mock'?' · タイマー停止中':''}`,'play',`data-slot="${key}"`):'';}).join('');
  }
  const waitLabel = at => `あと${Math.max(1,Math.ceil((at-Date.now())/60000))}分`;
  const waitHTML = at => `<span data-review-at="${at}">${waitLabel(at)}</span>`;
  function studySample(qs,n=10) {
    const ordered=[...model.sample(qs.filter(q=>!model.state.stats[q.id]?.total).map(q=>q.id),qs.length),...model.sample(qs.filter(q=>model.state.stats[q.id]?.total).map(q=>q.id),qs.length)];
    const seen=new Set(),selected=[],deferred=[];
    for(const id of ordered){const q=model.byId.get(id),concept=q.imageHash||q.concept||window.HonmenNotes?.related(q)[0]?.id||q.text.replace(/\s/g,'');if(seen.has(concept))deferred.push(id);else{seen.add(concept);selected.push(id);}}
    return [...selected,...deferred].slice(0,n);
  }
  function explanationExtras(q) {
    const n=window.HonmenNotes?.related(q)[0];
    return `<div class="explanation">${window.HonmenNotes?.inline(q)||''}<div class="question-links"><button class="textbtn" data-h="answer-note" data-note="${n?esc(n.id):''}">${n?'図解ノートで確認':'図解ノートを開く'} ${icon('chevron')}</button><a class="source-link" href="${esc(REFS.rules.url)}" target="_blank" rel="noopener">公式の根拠資料 ↗</a></div>${source(q)}</div>`;
  }
  function learningPoints(q) {
    const sentences=(q.explanation||'').match(/[^。]+(?:。|$)/g)||[],first=sentences.shift()||'';
    return `<section class="learning-points" aria-labelledby="learning-points-title"><h3 id="learning-points-title">${icon('book')}覚えるポイント</h3><p class="point-main">${esc(first)}</p>${sentences.length?`<div class="point-detail"><h4>補足</h4>${sentences.map(t=>`<p>${esc(t)}</p>`).join('')}</div>`:''}</section>`;
  }
  function reviewNote(q) {
    const s=model.state.stats[q.id],schedule=model.schedule(),waiting=schedule.waiting.includes(q.id);if(!waiting&&!schedule.due.includes(q.id))return '';
    const reset=waiting&&!s.passes&&(s.last===false||s.uncertain);
    return `<section class="review-schedule-note review-again-card"><h3>次の復習：${waiting?waitHTML(s.reviewAt):'今すぐ復習'}</h3>${reset?`<p>${s.uncertain?'自信なしのため':'不正解のため'}、卒業に向けた正解回数をリセットしました。</p>`:''}<small>卒業まで正解あと${Math.max(1,2-s.passes)}回。${waiting?'表示の時間が過ぎたら、もう一度挑戦しましょう。':'今すぐ復習できます。'}自信をもって答えられた正解が対象です。</small></section>`;
  }
  function reviewProgress(a) {
    if(a.mode!=='review'||a.contentVersion!==version)return '';
    const rows=a.ids.filter((id,i)=>a.correctness[i]!==null).map(id=>model.state.stats[id]).filter(Boolean);
    if(!rows.length)return '';
    const pending=rows.filter(s=>s.reviewAt),one=pending.filter(s=>s.passes===1).length;
    return pending.length?`<div class="notice"><p>次の復習：${pending.some(s=>s.reviewAt<=Date.now())?'今すぐ復習':waitHTML(Math.min(...pending.map(s=>s.reviewAt)))}</p><small>卒業 ${rows.length-pending.length}問 · 正解あと1回 ${one}問 · あと2回 ${pending.length-one}問</small></div>`:'<p class="notice">今回復習した問題は卒業しました。</p>';
  }
  function topicResult(g,a,current) {
    const schedule=model.schedule(),ids=a.ids.filter(id=>model.byId.get(id)?.category===g.cat),due=ids.filter(id=>schedule.due.includes(id)),waiting=ids.filter(id=>schedule.waiting.includes(id));
    return `<article class="weak-topic"><div class="topic-summary"><span class="topic-name">${icon(symbols[categories.indexOf(g.cat)]||'book')}${esc(g.cat)}</span><b class="topic-accuracy">正解率 ${pct(g.correct,g.total)}<small>%</small></b></div>${current&&(due.length||waiting.length)?`<button class="textbtn" data-h="result-category" data-category="${esc(g.cat)}" ${due.length?'':'disabled'}>${due.length?due.length+'問を復習':'次の復習待ち'}</button>`:''}<details class="topic-metrics"><summary>内訳</summary><small class="topic-answer-count">正解 ${g.correct} / 回答済み ${g.total}問</small>${g.total<5?'<small class="topic-sample-note">まだ回答少なめ（5問未満）</small>':''}${current&&(due.length||waiting.length)?`<small>今すぐ ${due.length}問 · 待機中 ${waiting.length}問</small>`:''}</details></article>`;
  }
  function categoryCard(cat,i) {
    const qs=bank.filter(q=>q.category===cat),answered=qs.filter(q=>model.state.stats[q.id]?.total),correct=answered.filter(q=>model.state.stats[q.id].last),schedule=model.schedule();
    const due=qs.filter(q=>schedule.due.includes(q.id)),waiting=qs.filter(q=>schedule.waiting.includes(q.id)),weak=due.length+waiting.length;
    return `<article class="category-card"><button class="category-entry" data-h="category" data-category="${esc(cat)}" ${categoryFilter==='weak'&&!due.length?'disabled':''}>${icon(symbols[i])}<span class="category-copy"><strong>${esc(cat)}</strong><span class="category-accuracy">${answered.length?`正解率 <b>${pct(correct.length,answered.length)}<span>%</span></b>`:'未学習'}</span><small class="category-coverage">学習進捗 ${answered.length} / ${qs.length}問</small><span class="category-review-badge">${due.length?`要復習 ${weak}問 · 今すぐ ${due.length}問`:waiting.length?`復習待ち ${waiting.length}問`:''}${waiting.length?`<span class="category-wait-time">${due.length?'待機中 '+waiting.length+'問 · ':''}最短 ${waitHTML(Math.min(...waiting.map(q=>model.state.stats[q.id].reviewAt)))}</span>`:''}</span></span><span class="card-chevron">${icon('chevron')}</span></button><details class="category-metrics"><summary>成績を見る</summary><small class="category-answer-count">${answered.length?`正解 ${correct.length} / 回答済み ${answered.length}問`:`回答済み 0 / ${qs.length}問`}</small><span class="progress" aria-hidden="true"><i style="width:${pct(correct.length,answered.length)}%"></i></span>${answered.length&&answered.length<5?'<small class="category-sample-note">まだ回答少なめ（5問未満）</small>':''}</details></article>`;
  }
  function reviewRow(id,waiting=false) {const q=model.byId.get(id),s=model.state.stats[id];return `<button class="review-row" data-h="review-one" data-id="${id}" ${waiting?'disabled':''}>${icon('book')}<span class="row-copy"><strong>${esc(q.category)}</strong><small>第${displaySet(q.set)}回・問${q.number}</small><small class="review-progress">卒業まで正解あと${Math.max(1,2-s.passes)}回</small></span><span class="review-row-status badge ${waiting?'':'blue'}">${waiting?icon('clock')+waitHTML(s.reviewAt):'今すぐ'}</span>${waiting?'':icon('chevron')}</button>`;}
  const homeScheduleKey = (schedule=model.schedule()) => JSON.stringify([new Date().toDateString(),schedule]);
  function renderHome(tab) {
    const schedule=model.schedule(),all=[...schedule.due,...schedule.waiting];$('review-dot').hidden=!schedule.due.length;reviewSchedule=homeScheduleKey(schedule);
    if(tab==='mock') {
      const passed=sets.filter(set=>model.best(set)?.score>=90).length;
      const list=sets.filter(set=>mockFilter==='all'||(mockFilter==='new'?!model.latest(set):(model.best(set)?.score??-1)<90));
      $('mock').innerHTML=`<div class="home-intro"><div><h2>本免模試</h2><p class="muted">${model.state.sessions.mock?'中断した模試を再開できます。':'95問・50分で、力だめし。'}</p></div><img class="home-character" src="./image-155cadc1029a.png" width="1400" height="792" alt="プーリーくんとよりともさん"></div><div class="page-heading mock-heading"><h3>教習問題ベースの模試</h3><p class="inline muted">${sets.length}回・各95問 <span class="badge">毎回ランダム順</span></p></div>
      <div class="home-overview"><div class="achievement-progress"><div class="inline"><span><b>${passed}</b><small> / ${sets.length}回 合格</small></span><small class="muted">達成率 ${pct(passed,sets.length)}%</small></div><div class="progress" role="progressbar" aria-label="模試の合格回数" aria-valuenow="${passed}" aria-valuemin="0" aria-valuemax="${sets.length}"><i style="width:${pct(passed,sets.length)}%"></i></div></div></div>${window.KarimenTown?.teaser() || ''}${resumes(['mock'])}${filters('mock-filter',mockFilter,[['all','すべて'],['new','未受験'],['unpassed','未合格']])}
      <div class="mock-grid">${list.map(set=>{const best=model.best(set),latest=model.latest(set),on=model.state.sessions.mock?.set===set;return `<button class="set-card ${on?'in-progress':''} ${best?.score===100?'perfect':''}" data-h="set" data-set="${set}" aria-label="第${displaySet(set)}回 ${on?'受験中 ':''}${latest?`直近${latest.score}点 ${latest.score>=90?'合格':'未合格'} 最高${best?.score??latest.score}点`:'未受験'}"><span class="mock-card-heading"><b>第${displaySet(set)}回</b>${best?.score>=90?flowerStamp(best.score===100?'満点':'合格'):`<span class="chevron">${icon('chevron')}</span>`}</span>${latest?`<span class="mock-latest"><small>直近</small><strong>${latest.score}<span>点</span></strong><small class="mock-outcome ${latest.score>=90?'is-pass':''}">${latest.score>=90?'合格':'未合格'}</small></span><small class="mock-best">最高 ${best?.score??latest.score}点${on?' · 受験中':''}</small>`:`<span class="mock-unanswered">${on?'受験中':'未受験'}</span>`}</button>`;}).join('')}</div>${!list.length?'<div class="empty"><h3>この条件の回はありません</h3><p>「すべて」から各回の記録を確認できます。</p></div>':''}<details class="score-note"><summary>成績の見方</summary><p>花丸・合格数は最高点の実績です。直近の成績には途中終了を含みません。文章90問は各1点、危険予測5問は各2点です。解説は採点後に表示します。</p></details>`;
    } else if(tab==='learn') {
      const done=bank.filter(q=>model.state.stats[q.id]?.total),correct=done.filter(q=>model.state.stats[q.id].last),totals=done.reduce((s,q)=>({total:s.total+model.state.stats[q.id].total,correct:s.correct+model.state.stats[q.id].correct}),{total:0,correct:0});
      let cats=categories.map((cat,i)=>({cat,i,qs:bank.filter(q=>q.category===cat)})).filter(c=>categoryFilter==='all'||(categoryFilter==='new'?c.qs.some(q=>!model.state.stats[q.id]?.total):c.qs.some(q=>all.includes(q.id))));
      if(categorySort==='weak')cats.sort((a,b)=>{const metric=c=>{const answered=c.qs.filter(q=>model.state.stats[q.id]?.total);return {bucket:answered.length>=5?0:answered.length?1:2,rate:answered.length?answered.filter(q=>model.state.stats[q.id].last).length/answered.length:1};};const x=metric(a),y=metric(b);return x.bucket-y.bucket||x.rate-y.rate;});
      $('learn').innerHTML=`<div class="page-heading character-heading"><div><h2>${learnSection === 'notes' ? '図解ノート' : '分野別学習'}</h2></div>${characterArt('D047','learn-guide')}</div><div class="learn-switch" role="tablist" aria-label="学び方">${[['categories','分野から学ぶ'],['notes','図解ノート']].map(([key,label])=>`<button id="learn-tab-${key}" role="tab" aria-selected="${learnSection===key}" aria-controls="learn-${key}" tabindex="${learnSection===key?0:-1}" data-h="learn-section" data-value="${key}">${label}</button>`).join('')}</div><section id="learn-categories" role="tabpanel" aria-labelledby="learn-tab-categories" ${learnSection==='categories'?'':'hidden'}><div class="learn-actions${model.state.sessions.study?' has-resume':''}" role="group" aria-label="学習を始める">${resumes(['study'])}${entryCard('random',model.state.sessions.study?'新しく10問学ぶ':'10問学ぶ',done.length<bank.length?'まだ学んでいない問題を優先':`模試と同じ${bank.length}問から出題`)}</div><dl class="learning-overview" aria-label="学習状況"><div><dt>回答済み</dt><dd>${done.length}<small> / ${bank.length}問</small></dd></div><div><dt>現在の正解率</dt><dd>${done.length?pct(correct.length,done.length):'—'}<small>${done.length?'%':''}</small></dd></div><div><dt>要復習</dt><dd>${all.length}<small>問</small></dd></div></dl><details class="learning-cumulative"><summary>成績の詳細</summary><p>現在の正解率は、回答済みの各問題の直近の回答で計算します。未回答は含めません。危険予測は3つすべて正解で1問の正解と数えます。</p><p>苦手順では5問以上回答した分野を優先し、回答の少ない分野・未学習は後ろに表示します。</p><p>累積正答率 ${totals.total?pct(totals.correct,totals.total)+'%':'—'} · 正解 ${totals.correct} / 回答 ${totals.total}回</p><p class="muted">解き直しを含む、これまでの全回答で集計しています。</p></details><div class="learn-controls">${filters('category-filter',categoryFilter,[['all','すべて'],['new','未学習'],['weak','要復習']])}<label class="category-sort-control"><span class="sr-only">分野の並び順</span><select id="category-sort"><option value="default" ${categorySort==='default'?'selected':''}>標準</option><option value="weak" ${categorySort==='weak'?'selected':''}>苦手順</option></select></label></div><div class="category-grid">${cats.map(c=>categoryCard(c.cat,c.i)).join('')}</div>${cats.length?'':'<div class="empty">この条件の分野はありません。</div>'}<div class="h-hazard-entry"><button class="hazard-preview" data-h="hazard"><img src="./honmen/assets/h2-091.jpg" width="144" height="96" alt="" loading="lazy"><span><strong>危険予測</strong><small>イラスト問題を5問</small></span><span class="hazard-preview-link">学ぶ ${icon('arrow')}</span></button><p class="hazard-scoring">1問につき、3つすべて正解で2点。</p></div></section><section id="learn-notes" role="tabpanel" aria-labelledby="learn-tab-notes" ${learnSection==='notes'?'':'hidden'}></section>`;
      if(learnSection==='notes')renderNotes();
    } else if(tab==='review') {
      const completed=!all.length&&!model.state.sessions.review&&model.state.attempts.some(a=>a.mode==='review'&&!a.partial&&new Date(a.completedAt).toDateString()===new Date().toDateString());
      $('review').innerHTML=`<div class="page-heading character-heading"><div><h2>復習</h2><p class="muted">${completed?'今日の復習は完了です。':'初回はすぐに。次は30分あけて。'}</p></div>${characterArt(all.length||model.state.sessions.review?'D051':completed?'master01':'D051','review-guide')}</div>${resumes(['review'])}${all.length||model.state.sessions.review?`<section class="review-now-card" aria-labelledby="review-now-title"><h3 id="review-now-title">今すぐ復習</h3><p class="review-now-count">${schedule.due.length}<small>問</small></p>${schedule.due.length?btn('review-start',`${schedule.due.length}問を復習する ${icon('arrow')}`):`<p class="muted">${model.state.sessions.review?'途中の復習に未回答があります。上の「途中の復習を続ける」から再開できます。':'今すぐの復習は完了です。'}${schedule.waiting.length?' 次は'+waitHTML(model.state.stats[schedule.waiting[0]].reviewAt)+'です。':''}</p>`}</section><section class="review-timing${schedule.waiting.length?'':' is-empty'}" aria-labelledby="review-timing-title"><div class="review-timing-heading"><h3 id="review-timing-title">${icon('clock')}次の復習待ち</h3><p class="review-wait-count">${schedule.waiting.length}<small>問</small></p></div>${schedule.waiting.length?`<p class="review-next-time">最短 ${waitHTML(model.state.stats[schedule.waiting[0]].reviewAt)}</p><p class="hintline">30分たつと「今すぐ復習」に移ります。待機中の問題は解けません。</p>`:''}</section>`:''}${all.length?`<div class="section-heading"><h3>復習する問題</h3><small>${all.length}問</small></div>${all.slice(0,reviewMore?all.length:10).map(id=>reviewRow(id,schedule.waiting.includes(id))).join('')}${all.length>10&&!reviewMore?'<button class="textbtn wide" data-h="review-more">すべての問題を見る</button>':''}`:`<div class="empty"><p>間違い・自信なしの問題がここに集まります。</p>${btn('tab','学習へ進む '+icon('arrow'),'data-tab="learn"',true)}</div>`}<details class="review-graduation"><summary>復習リストから卒業するには？</summary><p>初回の間違いはすぐ復習できます。1回正解したら30分後にもう一度。自信をもって2回正解すると卒業します。間違い・自信なしは回数をリセットし、30分後に再挑戦です。危険予測は3つすべての正解で1回に数えます。</p></details>`;
    }
  }
  function refreshHomeSchedule() {
    // Notes do not depend on review timing: preserve their input, selection and lazy content.
    if(view==='learn'&&learnSection==='notes'){reviewSchedule=homeScheduleKey();return;}
    const root=$(view),opened=[...root.querySelectorAll('details')].map(el=>el.open),active=document.activeElement,y=window.scrollY;
    const hadFocus=root.contains(active),action=active?.dataset.h,category=active?.dataset.category,id=active?.id,rowId=active?.dataset.id;
    const summaryIndex=active?.tagName==='SUMMARY'?[...root.querySelectorAll('details')].indexOf(active.parentElement):-1;
    renderHome(view);
    root.querySelectorAll('details').forEach((el,i)=>el.open=!!opened[i]);
    const replacement=summaryIndex>=0?root.querySelectorAll('details')[summaryIndex]?.querySelector('summary'):id?$(id):[...root.querySelectorAll('[data-h]')].find(el=>el.dataset.h===action&&el.dataset.category===category&&el.dataset.id===rowId);
    if(hadFocus)replacement?.focus({preventScroll:true});
    window.scrollTo({top:y,behavior:'instant'});
  }
  function historyGroups(records) {
    const groups=[['50分模試',a=>a.contentVersion===version&&a.mode==='mock'&&!a.partial],['解説付き練習',a=>a.contentVersion===version&&a.mode==='guided'&&!a.partial],['途中終了',a=>a.contentVersion===version&&a.partial],['以前の問題版',a=>a.contentVersion!==version]];
    return groups.map(([title,test])=>{const rows=records.filter(test).slice(-10).reverse();return rows.length?`<section class="h-history-group">${title==='50分模試'?'':`<h3>${title}の記録</h3>`}${rows.map(a=>`<div class="history-row"><div>${a.mode==='mock'?'50分模試':'解説付き練習'}<small>${date(a.completedAt)}${a.partial?' · 途中終了':''}</small></div><b>${a.score}<small> / ${a.maxScore}点</small></b><button class="textbtn" data-h="history" data-record="${a.id}">回答を見る</button></div>`).join('')}</section>`:'';}).join('');
  }
  function defaultResultFilter(a) {
    if(a?.correctness.some(v=>v===false))return 'wrong';
    if(a?.ids.some((id,i)=>a.correctness[i]!==null&&(a.flags?.[i]||a.uncertain?.[i])))return 'uncertain';
    return 'all';
  }
  function refreshResultReview() {
    if(view!=='result'||!lastResult||dialog.open||$('figure-dialog').open||resultSchedule===JSON.stringify(model.schedule()))return;
    const root=$('result'),opened=[...root.querySelectorAll('details')].map(el=>el.open),active=document.activeElement,buttons=[...root.querySelectorAll('button')],focusIndex=buttons.indexOf(active),y=window.scrollY;
    renderResult(lastResult);
    root.querySelectorAll('details').forEach((el,i)=>el.open=!!opened[i]);
    if(focusIndex>=0){const replacement=[...root.querySelectorAll('button')].find(el=>el.dataset.h===active.dataset.h&&el.dataset.category===active.dataset.category&&el.dataset.value===active.dataset.value);(replacement||$('result-title')).focus({preventScroll:true});}
    window.scrollTo({top:y,behavior:'instant'});
  }
  function setDetail(set) {
    if(model.state.sessions.mock?.set===set){resume('mock');return;}
    const records=model.state.attempts.filter(a=>a.set===set),best=model.best(set),recent=records.filter(a=>a.mode==='mock'&&!a.partial&&a.contentVersion===version).slice(-3);
    open(`第${displaySet(set)}回`,`<span class="badge">教習問題ベース</span><div class="details-list"><div><b>95問</b><span>文章90問＋危険予測5問</span></div><div><b>50分</b><span>採点後に解説</span></div></div><p class="detail-pass">90点以上で、このアプリ内の合格です。</p><p class="detail-timer muted">${icon('clock')}中断中や別アプリを開いている間は、タイマーが止まります。</p><div class="stack">${btn('start-set','50分模試を始める '+icon('arrow'),`data-set="${set}" data-mode="mock"`)}${btn('start-set','この回を解説付きで練習',`data-set="${set}" data-mode="guided"`,true)}</div><details class="detail-rules"><summary>模試のルール・問題の内訳</summary><div class="detail-rules-body"><h3>出題の順番</h3><p>文章問題90問、危険予測5問の順で、それぞれ毎回並べ替えます。途中再開では同じ順番です。解説付き練習は教材の順番で進みます。</p><h3>配点</h3><p>文章は1問1点。危険予測は3つすべて正解で2点、部分点はありません。</p><h3>途中終了・時間切れ</h3><p>途中終了は合否・最高点の対象外です。時間切れは100点満点で採点します。未回答は学習の正解率・復習に含めません。</p></div></details><h3>50分模試の記録</h3>${best?`<p class="inline"><span class="badge${best.score>=90?' success':''}">最高 ${best.score}点</span></p>`:''}${recent.length?`<p class="recent-mock">直近${recent.length}回：${recent.map(a=>a.score+'点').join(' → ')}</p>`:'<p class="muted">まだ受験していません。</p>'}${historyGroups(records)}`);
  }
  function renderNotes() {
    const dedicated=view==='notes',root=dedicated?$('notes'):$('learn-notes');
    const schedule=model.schedule();
    HonmenNotes.render(root,{search:noteSearch,filter:noteFilter,bank,weak:[...schedule.due,...schedule.waiting]});
    if(dedicated){
      const label=noteReturn?.view==='play'?'解いていた問題に戻る':noteReturn?.view==='result'?'結果に戻る':'学習に戻る';
      root.insertAdjacentHTML('afterbegin',`${btn('note-return',icon('back')+label,'',true)}<div class="page-heading notes-heading"><div><h2>図解ノート</h2><p class="muted">要点をつかんで、問題で確かめよう。</p></div><img class="section-character" src="./image-a5b30a44fd43.png" width="332" height="380" alt="DON!DON!ドライブのロボット教官"></div>`);
      root.querySelector('.learn-notes-intro')?.remove();
      root.dataset.returnLabel=label;
    }
  }
  function time(ms) { const seconds=Math.ceil(ms/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`; }
  function image(q) { return q.image?`<figure class="question-visual"><div class="question-visual-head"><span>問題の図</span><button class="textbtn" data-h="figure" data-id="${q.id}" aria-label="問題の図を拡大">拡大 ↗</button></div><div class="sourced-pictures single"><img src="./${esc(q.image)}?v=${esc(q.imageHash||'')}" alt="${esc(q.imageAlt||'問題の図')}" decoding="async"></div></figure>`:''; }
  function source(q) {
    const review=q.editorial;
    const imageCredit=q.imageSources?.length?`<details><summary>画像の出典</summary>${q.imageSources.map(s=>`<a class="source-link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher)} ↗</a>`).join('<br>')}</details>`:'';
    return imageCredit+(review?`<details><summary>原資料からの補正について</summary><p class="muted">${esc(review.reason)}</p>${(review.sourceUrls||[]).map((url,i)=>`<a class="source-link" href="${esc(url)}" target="_blank" rel="noopener">確認資料${i+1} ↗</a>`).join(' ')}</details>`:'');
  }
  function answerLines(keys,answers) { return keys.map((v,i)=>`<div class="h-answer-line"><b>${keys.length===3?['①','②','③'][i]:''} 正解 ${mark(v)}</b><span>あなたの回答 ${mark(answers[i])}</span></div>`).join(''); }
  function feedback(q,keys,answers,uncertain=false) {
    const ok=HonmenModel.correct(keys,answers),s=model.state.stats[q.id],schedule=model.schedule(),waiting=schedule.waiting.includes(q.id),due=schedule.due.includes(q.id);
    return `<div class="feedback answer-result ${ok?'':'incorrect'}" role="status" tabindex="-1" aria-labelledby="answer-result-title"><p class="answer-state">${icon(ok?'check':'book')}${ok?'正解です':'ここを覚え直そう'}${q.type==='hazard'?(ok?'・2点':'・0点'):''}</p><h2 id="answer-result-title" class="answer-result-title">正解は <strong>${keys.map(mark).join('・')}</strong><span class="sr-only">（${keys.map(v=>v?'正しい':'誤り').join('・')}）</span></h2><p class="answer-choice${ok?' sr-only':''}">あなたの回答 <strong>${answers.map(mark).join('・')}</strong></p>${uncertain?'<p class="answer-uncertain">自信なし：正解でも復習に残しました。</p>':''}</div>${learningPoints(q)}<details class="answered-question" open><summary>${icon('search')}問題文を確認<span class="question-chevron" aria-hidden="true">⌄</span></summary><div class="answered-question-body"><h3 class="question" id="question-title" tabindex="-1">${esc(q.text)}</h3>${image(q)}${statementReasons(q)}</div></details>${explanationExtras(q)}${reviewNote(q)}`;
  }
  function choices(a,index,part,locked) {
    return `<div class="choices" role="group" aria-label="${a.keys[index].length===3?(part+1)+'つ目の':'問題の'}正誤">${[true,false].map(value=>{
      const chosen=a.answers[index][part]===value;
      return `<button class="answer-btn ${chosen?'selected':''}" data-h="answer" data-value="${value}" data-part="${part}" aria-label="${value?'正しい（○）':'誤り（×）'}" aria-pressed="${chosen}" ${locked?'disabled':''}><span aria-hidden="true">${mark(value)}</span><small>${value?'正しい':'誤り'}</small></button>`;
    }).join('')}</div>`;
  }
  function renderPlay() {
    const a=model.state.sessions[slot];
    if(!a) {lastResult=model.state.attempts.at(-1);if(lastResult)changeView('result');else changeView(returnTab);return;}
    const q=model.byId.get(a.ids[a.index]);if(!q)return;
    const exam=a.mode==='mock',locked=!exam&&a.committed[a.index],count=a.answers.filter(HonmenModel.answered).length;
    const waiting=a.mode==='review'&&!locked&&model.schedule().waiting.includes(q.id);
    const prompt=`<h2 class="question" id="question-title" tabindex="-1">${esc(q.text)}</h2>${image(q)}${!exam?`<label class="confidence-control"><input id="uncertain" type="checkbox" ${a.uncertain?.[a.index]?'checked':''}>自信なし・迷っている</label>`:''}`+
      (q.type==='hazard'?`<p class="h-hazard-note">3つすべて正解で2点です。それぞれ○・×を選んでください。</p>${q.statements.map((text,i)=>`<fieldset class="h-statement"><legend>${['①','②','③'][i]} ${esc(text)}</legend>${choices(a,a.index,i,false)}</fieldset>`).join('')}${!exam?btn('commit','3つの答えを確認する',HonmenModel.answered(a.answers[a.index])?'':'disabled'):''}`:`<p class="choose-label">正しければ ○、誤りなら ×</p>${choices(a,a.index,0,false)}`)+
      (exam?`<div class="exam-tools"><button class="flag-btn" data-h="flag" aria-pressed="${a.flags[a.index]}">${icon('flag')}自信なし・見直す</button><button class="textbtn" data-h="unanswered">未回答へ ${icon('arrow')}</button></div>`:'');
    $('play').innerHTML=`<div class="playhead">${btn('pause',icon('back')+(exam?'中断':a.mode==='review'?'復習トップ':'学習トップ'),' ',true)}<h2>${esc(displayLabel(a))}</h2></div><div class="play-meta"><span>問題 <strong>${a.index+1}</strong> / ${a.ids.length}</span>${exam?`<span class="timer${model.remaining()<=5*60000?' low':''}" id="timer" role="timer" aria-label="残り時間">残り ${time(model.remaining())}</span>`:`<span class="muted">正解 ${a.keys.filter((k,i)=>a.committed[i]&&HonmenModel.correct(k,a.answers[i])).length}問</span>`}</div><div class="progress play-progress" role="progressbar" aria-label="回答済み" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${a.ids.length}"><i style="width:${pct(count,a.ids.length)}%"></i></div><article class="card question-card ${locked?'answer-layout':''}"><div class="tags"><span class="badge">第${displaySet(q.set)}回・問${q.number}</span>${!exam?`<span class="badge">${esc(q.category)}</span>`:''}<span class="badge">${q.type==='hazard'?'2':'1'}点</span></div>${waiting?`<h2 id="question-title" tabindex="-1">次の復習待ち</h2><p>${waitHTML(model.state.stats[q.id].reviewAt)}で復習できます。</p>${btn('pause','復習トップへ','',true)}`:locked?feedback(q,a.keys[a.index],a.answers[a.index],!!a.uncertain?.[a.index]):prompt}<div class="btnrow ${locked?'learning-next-bar':''}">${btn('prev','前へ',a.index===0?'disabled':'',true)}${!exam&&!locked?btn('skip',a.index===a.ids.length-1?'回答一覧へ':'あとで解く','',true):a.index<a.ids.length-1?btn('next','次の問題へ '+icon('arrow')):btn('finish',exam?'採点する':'結果を見る')}</div></article><details class="exam-map" id="answer-map"><summary>回答一覧を開く <span class="muted">未回答 ${a.ids.length-count}問</span></summary><div class="number-grid">${a.ids.map((id,i)=>{const answered=HonmenModel.answered(a.answers[i]),status=answered?(exam?'done':a.committed[i]?(HonmenModel.correct(a.keys[i],a.answers[i])?'ok':'ng'):''):'';return `<button data-h="jump" data-index="${i}" class="${status} ${a.flags[i]?'flagged':''} ${i===a.index?'current':''}" aria-label="問${i+1} ${answered?(exam?'回答済み':status==='ok'?'正解':status==='ng'?'不正解':'答え合わせ前'):'未回答'}${a.flags[i]?'・見直し':''}">${i+1}</button>`;}).join('')}</div><p class="hintline">${exam?'番号は今回の出題順です。青＝回答済み · 点＝自信なし・見直し':'緑＝正解 · 赤＝不正解'}</p></details><button class="textbtn wide" data-h="finish">${exam?'模試を終了して採点する':'ここで学習を終了する'}</button><p class="muted">${exam?'途中の回答は自動保存。別アプリ・別タブへの切り替えや中断中は、タイマーが止まります。':'途中で戻っても、続きから再開できます。'}</p>`;
    warn();
  }
  function start(ids,mode,label,set=null) {
    const target=mode==='mock'?'mock':mode==='review'?'review':'study';
    if(model.state.sessions[target]) {pendingStart={ids,mode,label,set,target,id:model.state.sessions[target].id};open('新しい学習を始めますか？',`<p>このモードの途中記録を終了して始めます。答えた問題は成績に残ります。他のモードの途中記録は残ります。続きから解く場合はキャンセルしてください。</p><div class="btnrow">${btn('close','キャンセル','',true)}${btn('replace-start','終了して新しく始める')}</div>`);return;}
    if(!checked(model.begin({ids,mode,label,set})))return;
    slot=target;returnTab=target==='study'?'learn':target;close();checkpoint=Date.now();changeView('play');focusQuestion();
  }
  function resume(key) { if(!checked(model.resume(key)))return;slot=key;returnTab=key==='study'?'learn':key==='review'?'review':'mock';close();changeView('play');focusQuestion(); }
  function endConfirm(key) {
    const a=model.state.sessions[key];if(!a)return;
    const unanswered=a.answers.filter(v=>!HonmenModel.answered(v)).length;
    open('ここまでで採点しますか？',`<p>${unanswered?`未回答が${unanswered}問あります。未回答は0点です。`:'すべての問題に回答しました。'}${a.mode==='mock'&&unanswered?'途中終了の記録は最高点・合格回数に含めません。':''}${a.mode!=='mock'&&a.keys.some(k=>k.length===3)?'答え合わせ前の危険予測は未回答として扱います。':''}</p><div class="btnrow">${btn('close','戻る','',true)}${btn('confirm-finish','採点する',`data-slot="${key}"`)}</div>`);
  }
  function resultQuestion(a,index) {
    const q=model.byId.get(a.ids[index]),ok=a.correctness[index];if(!q)return '';
    const text=q.explanation||'',split=text.indexOf('。'),brief=split<0?text:text.slice(0,split+1),rest=split<0?'':text.slice(split+1);
    return `<details class="review-item h-result-question"><summary><span class="answer-status ${ok===true?'ok':''}">${ok===null?'—':ok?'✓':'×'}</span><span><span class="muted">出題${index+1} · ${esc(q.category)}${a.flags?.[index]||a.uncertain?.[index]?' · 自信なし・見直し':''}</span><br><small class="muted">元の問題：第${displaySet(q.set)}回・問${q.number}</small><br>${esc(q.text)}</span></summary><div class="review-body"><p>あなたの回答：${a.answers[index].map(mark).join('・')}</p>${image(q)}<div class="feedback ${ok?'':'incorrect'}" role="status" tabindex="-1"><h3>${ok===null?'未回答':ok?'正解です':'ここを覚え直そう'} · 答えは ${a.keys[index].map(mark).join('・')}</h3><p>${esc(brief)}</p>${rest?`<details open><summary>詳しい解説</summary><p>${esc(rest)}</p></details>`:''}${statementReasons(q)}</div>${explanationExtras(q)}</div></details>`;
  }
  function renderResult(a) {
    if(!a){changeView('review');return;}
    resultSchedule=JSON.stringify(model.schedule());
    const current=a.contentVersion===version,full=['mock','guided'].includes(a.mode)&&!a.partial&&a.maxScore===100,passed=full&&a.score>=90;
    const index=model.state.attempts.findIndex(r=>r.id===a.id),earlier=model.state.attempts.slice(0,Math.max(0,index)).filter(r=>r.mode===a.mode&&r.set===a.set&&!r.partial&&r.contentVersion===a.contentVersion);
    const previousScore=a.previousScoreAtCompletion??earlier.at(-1)?.score,diff=previousScore==null?null:a.score-previousScore,bestScore=a.bestScoreAtCompletion??Math.max(a.score,...earlier.map(r=>r.score));
    const schedule=model.schedule(),due=a.ids.filter(id=>schedule.due.includes(id)),waiting=a.ids.filter(id=>schedule.waiting.includes(id)),unanswered=a.ids.filter((id,i)=>a.correctness[i]===null);
    const groups=categories.map(cat=>{const rows=a.ids.map((id,i)=>({q:model.byId.get(id),i})).filter(x=>x.q?.category===cat&&a.correctness[x.i]!==null);return {cat,total:rows.length,correct:rows.filter(x=>a.correctness[x.i]).length};}).filter(x=>x.total).sort((x,y)=>x.correct/x.total-y.correct/y.total);
    const visible=a.ids.map((id,i)=>i).filter(i=>resultFilter==='all'||(resultFilter==='wrong'?a.correctness[i]===false:resultFilter==='unanswered'?a.correctness[i]===null:!!a.flags?.[i]||!!a.uncertain?.[i]));
    $('result').innerHTML=`<div class="playhead">${btn('home',icon('back')+'一覧へ','',true,true)}<span class="muted">${date(a.completedAt)}</span></div><article class="result-card"><h2 class="result-label" id="result-title" tabindex="-1">${esc(displayLabel(a))}の結果</h2><div class="result-hero"><div><div class="score">${a.answered?`${a.score}<small>/ ${a.maxScore}点</small>`:'<span class="no-score">回答なし</span>'}</div></div>${a.answered?characterArt(!a.partial&&a.score===a.maxScore?'D006':passed?'D004':'D013',!a.partial&&(passed||a.score===a.maxScore)?'result-character':'result-character result-character-solo'):''}</div>${a.timeout?'<p class="muted">制限時間になったため100点満点で採点しました。未回答は0点ですが、学習の正解率・復習には含めません。</p>':''}${a.partial?`<div class="notice partial-result">途中終了 · ${a.answered} / ${a.ids.length}問に回答。未回答は学習の正解率・復習に含めません。合否・最高点の対象外です。</div>`:achievement(a)}<details class="result-score-details"><summary>成績の詳細</summary><p class="accuracy">回答した問題の正解率 <strong>${a.answered?pct(a.correctness.filter(v=>v===true).length,a.answered)+'%':'—'}</strong></p><p>${a.correctness.filter(v=>v===true).length} / ${a.ids.length}問 正解。危険予測は3つすべて正解で2点です。</p>${full?`<div class="comparison"><div><span>前回との比較</span><b>${diff===null?'<small>はじめての記録</small>':(diff>0?'+':diff===0?'±':'')+diff+'点'}</b></div><div><span>${a.bestScoreAtCompletion==null?'保存記録内の最高点':'今回までの最高点'}</span><b>${bestScore}<small> / 100点</small></b></div></div>`:''}</details>${reviewProgress(a)}<div class="result-actions">${current&&(due.length||waiting.length)?`<div id="result-review-plan"><p class="result-review-count">要復習 ${due.length+waiting.length}問</p>${btn('result-review',due.length?`今すぐ${due.length}問を復習する ${icon('arrow')}`:'次の復習待ち',due.length?'':'disabled')}</div>`:btn('home',returnTab==='mock'?'模試一覧へ':returnTab==='review'?'復習一覧へ':'学習を続ける')}${waiting.length?`<p class="muted">次の復習待ち ${waiting.length}問 · 最短 ${waitHTML(Math.min(...waiting.map(id=>model.state.stats[id].reviewAt)))}</p>`:''}${unanswered.length&&current?btn('result-unanswered',`未回答の${unanswered.length}問を学ぶ ${icon('book')}`,'',true):''}${a.set&&current?btn('start-set','この回を解説付きで練習',`data-set="${a.set}" data-mode="guided"`,true):''}${due.length||waiting.length?btn('home',icon('back')+'一覧へ戻る','',true):''}</div>${groups.length?`<section class="result-weak"><h3>分野別の成績</h3><p class="muted">回答済みの問題を、正解率の低い順に表示。</p><div class="weak-topics">${groups.map(g=>topicResult(g,a,current)).join('')}</div></section>`:''}</article><div class="section-heading"><h3>回答を振り返る</h3></div>${filters('result-filter',resultFilter,[['wrong','間違い'],['unanswered','未回答'],['uncertain','自信なし'],['all','すべて']])}${current?`<div class="h-results">${visible.map(i=>resultQuestion(a,i)).join('')||'<div class="empty">該当する問題はありません。「すべて」で全回答を確認できます。</div>'}</div>`:'<div class="notice">以前の問題版での成績です。当時の回答・正解を表示します。</div>'+visible.map(i=>`<div class="card"><b>${i+1}問目</b>${answerLines(a.keys[i],a.answers[i])}</div>`).join('')}`;
  }
  function settings() {
    const s=model.state.settings,hasSessions=Object.values(model.state.sessions).some(Boolean);
    open('表示と学習記録',`${window.KarimenHomeInstall?.settingsMarkup()||''}<div class="settings-group"><h3>画面の明るさ</h3><div class="seg">${[['auto','自動'],['light','ライト'],['dark','ダーク']].map(([key,label])=>`<button data-h="theme" data-value="${key}" aria-pressed="${s.theme===key}">${label}</button>`).join('')}</div></div><div class="settings-group"><h3>効果音</h3><div class="seg">${[[true,'オン'],[false,'オフ']].map(([v,label])=>`<button data-h="sound" data-value="${v}" aria-pressed="${s.sound===v}">${label}</button>`).join('')}</div><p class="muted">学習で答えたときに鳴ります。模試中は鳴りません。</p></div><div class="settings-group"><label class="confidence-control"><input id="reduce-motion" type="checkbox" ${s.reduceMotion?'checked':''}>動きを抑える</label><p class="muted">端末の「視差効果を減らす」設定にも対応します。</p><button class="textbtn" data-h="preview" data-score="90">花丸の見本を見る ${icon('chevron')}</button></div><div class="settings-group"><h3>学習記録の保存</h3><p class="muted">回答・成績・復習予定は自動で保存します。同じ端末・ブラウザでのサイト更新後も、そのまま続けられます。本免の記録は仮免とは別に、この端末内に保存します。</p><p id="save-status" role="status">${storage.status.message|| (storage.status.pending?'バックアップ中…':storage.status.backupSaved?'自動保存・バックアップ済み':'自動保存済み')}</p><details><summary>予備の書き出し・読み込み</summary><p class="muted">通常の更新では操作不要です。別の端末へ記録を渡す場合などに使用できます。</p><div class="btnrow">${btn('export','書き出す','',true)}${btn('import','読み込む','',true)}</div></details></div><div class="settings-group"><button class="textbtn" data-h="records">これまでの学習記録を見る ${icon('chevron')}</button></div><div class="settings-group"><button class="textbtn danger" data-h="reset" ${hasSessions?'disabled':''}>現在の学習記録を初期化する</button>${hasSessions?'<p class="muted">各モードの途中の学習を終えると初期化できます。</p>':''}</div>`);
  }
  function achievement(a,preview=false) {
    const full=['mock','guided'].includes(a.mode)&&!a.partial&&a.maxScore===100,passed=full&&a.score>=90,perfect=passed&&a.score===100;
    const kind=perfect?'perfect':passed?(a.score>=96?'excellent':'pass'):full?'retry':a.score===a.maxScore?'complete':'practice';
    const title=perfect?'満点合格！':kind==='excellent'?'合格！目標も達成':passed?'合格！よくできました':full?'合格まであと'+(90-a.score)+'点！':kind==='complete'?'全問正解！':'おつかれさまでした';
    const motion=passed&&(preview||!celebrated.has(a.id))&&!model.state.settings.reduceMotion&&!window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
    if(!preview&&a.id)celebrated.add(a.id);
    const pieces=motion?`<span class="result-confetti" aria-hidden="true">${Array.from({length:perfect?32:20},(_,i)=>`<i style="--x:${(i*37+7)%100}%;--delay:${(i%5)*35}ms;--spin:${i%2?'-':'+'}${150+i*13}deg;--color:${['#dc6577','#e2b751','#5c9dd6','#82b39d'][i%4]}"></i>`).join('')}</span>`:'';
    return `<section class="result-achievement ${kind} ${motion?'celebrate':''}" aria-label="${esc(title)}">${pieces}${passed?flowerStamp(perfect?'満点':'合格'):`<span class="achievement-symbol" aria-hidden="true">${icon(full?'flag':a.score===a.maxScore?'check':'book')}</span>`}<div class="achievement-copy"><h3>${title.split('！').map((part,i)=>`<span>${esc(part)}${i===0&&title.includes('！')?'！':''}</span>`).join('')}</h3>${passed?'':`<p>${full?'間違えた問題を、次の得点に。':kind==='complete'?'その調子で、次の練習へ。':'間違えた問題から、少しずつ。'}</p>`}${full?`<small>${a.mode==='guided'?'解説付き95問練習：90点以上で合格の目安（模試とは別記録）':'このアプリ内の判定：100点中90点以上で合格'}</small>`:''}</div></section>`;
  }
  function sources() { open('内容の補正と確認資料',`<p class="muted">原資料の正誤や文面が現行ルールと合わない問題は、条件・答え・解説を補正しています。判読が不確かな箇所は、同じテーマの明確な設問に置き換えています。</p><ul class="h-source-list">${HONMEN_DATA.rules.map(r=>`<li><b>${esc(r.title)}</b><p>${esc(r.summary)}</p><a href="${esc(r.url)}" target="_blank" rel="noopener">確認資料 ↗</a></li>`).join('')}</ul>`); }
  async function action(b) {
    const key=b.dataset.h;
    if(!model)return;
    if(key==='close'){pendingStart=null;close();return;}
    if(key==='replace-start'){const p=pendingStart;if(!p||model.state.sessions[p.target]?.id!==p.id)return;if(!checked(!!model.finish(p.target)))return;pendingStart=null;start(p.ids,p.mode,p.label,p.set);return;}
    if(key==='close-figure'){$('figure-dialog').close();return;}
    if(model.conflicted){warn();return;}
    if(key==='tab'||key==='home'){close();changeView(key==='home'?returnTab:b.dataset.tab);return;}
    if(key==='settings'){settings();return;}
    if(key==='sources'){sources();return;}
    if(key==='mock-filter'){mockFilter=b.dataset.value;renderHome('mock');return;}
    if(key==='category-filter'){categoryFilter=b.dataset.value;renderHome('learn');return;}
    if(key==='learn-section'){learnSection=b.dataset.value;renderHome('learn');$('learn-tab-'+learnSection).focus({preventScroll:true});return;}
    if(key==='review-more'){reviewMore=true;renderHome('review');return;}
    if(key==='review-one'){if(!model.schedule().due.includes(b.dataset.id))return;start([b.dataset.id],'review','間違いの復習');return;}
    if(key==='answer-note'){
      if(view!=='notes')noteReturn={view,y:window.scrollY,focus:b,filter:resultFilter};
      noteSearch='';noteFilter='';
      $('learn-notes')?.replaceChildren();
      changeView('notes');
      const el=$('notes').querySelector(`[data-h-note="${b.dataset.note}"]`);
      if(el){el.open=true;HonmenNotes.populate(el,bank);el.scrollIntoView?.({block:'start'});}
      return;
    }
    if(key==='note-return'){
      const previous=noteReturn||{view:'learn',y:0};
      $('notes').replaceChildren();
      changeView(previous.view,previous.view==='play'||previous.view==='result');
      window.scrollTo({top:previous.y,behavior:'instant'});previous.focus?.focus({preventScroll:true});
      noteReturn=null;return;
    }
    if(key==='result-category'){const due=model.schedule().due;start(lastResult.ids.filter(id=>due.includes(id)&&model.byId.get(id)?.category===b.dataset.category),'review',b.dataset.category+'の復習');return;}
    if(key==='result-review'){start(lastResult.ids.filter(id=>model.schedule().due.includes(id)),'review','間違いの復習');return;}
    if(key==='result-unanswered'){start(lastResult.ids.filter((id,i)=>lastResult.correctness[i]===null&&model.byId.has(id)),'study','未回答の練習');return;}
    if(key==='result-filter'){resultFilter=b.dataset.value;renderResult(lastResult);return;}
    if(key==='theme'||key==='sound'){if(checked(model.settings(key==='theme'?{theme:b.dataset.value}:{sound:b.dataset.value==='true'}))){applySettings();settings();if(key==='sound'){window.HonmenSound?.release();if(b.dataset.value==='true')window.HonmenSound?.play(true);}}return;}
    if(key==='preview'){const score=Number(b.dataset.score);open('花丸の見本',`<p class="muted">見本です。学習記録には保存されません。</p><div class="seg">${[89,90,96,100].map(n=>`<button data-h="preview" data-score="${n}">${n}点</button>`).join('')}</div><div class="score">${score}<small>/ 100点</small></div>${achievement({mode:'mock',partial:false,maxScore:100,score},true)}<button class="btn secondary" data-h="settings">設定に戻る</button>`);return;}
    if(key==='records'){open('これまでの学習記録',model.state.attempts.length?[...model.state.attempts].reverse().map(a=>`<button class="h-history-row" data-h="history" data-record="${a.id}"><span>${esc(displayLabel(a))}<small>${date(a.completedAt)}${a.partial?' · 途中終了':''}</small></span><strong>${a.score}<small>/ ${a.maxScore}点</small></strong></button>`).join(''):'<p class="muted">学習が終わると記録されます。</p>');return;}
    if(key==='note-reset'){noteSearch='';noteFilter='';renderNotes();$('note-search')?.focus({preventScroll:true});return;}
    if(key==='note-drill'){const qs=HonmenNotes.questions(b.dataset.note,bank);if(!qs.length){toast('このテーマの対応問題はありません。');return;}const ids=studySample(qs);start(ids,'study',HonmenNotes.title(b.dataset.note)+'・'+ids.length+'問');return;}
    if(key==='note-figure'){$('figure-content').innerHTML=HonmenNotes.figure(b.dataset.fig);resetFigureZoom();$('figure-dialog').showModal();return;}

    if(key==='set') {setDetail(Number(b.dataset.set));return;}
    if(key==='start-set'){const set=Number(b.dataset.set),mode=b.dataset.mode;start(bank.filter(q=>q.set===set).map(q=>q.id),mode,'本免練習 '+set+(mode==='mock'?'・模試':'・解説付き'),set);return;}
    if(['random','category','hazard'].includes(key)){const qs=bank.filter(q=>(key==='random'||(key==='hazard'?q.type==='hazard':q.category===b.dataset.category))&&!(key==='category'&&categoryFilter==='new'&&model.state.stats[q.id]?.total));const n=key==='hazard'?5:10;start(categoryFilter==='weak'&&key==='category'?model.schedule().due.filter(id=>qs.some(q=>q.id===id)).slice(0,10):studySample(qs,n),categoryFilter==='weak'&&key==='category'?'review':'study',key==='random'?'全分野10問':key==='hazard'?'危険予測5問':b.dataset.category+'・'+Math.min(10,qs.length)+'問');return;}
    if(key==='review-start'){start(model.schedule().due,'review','間違いの復習');return;}
    if(key==='resume'){resume(b.dataset.slot);return;}
    if(key==='end-session'){endConfirm(b.dataset.slot);return;}
    if(key==='pause'&&slot==='mock'){open('模試を中断しますか？',`<p>回答と残り時間を保存して、タイマーを止めます。「続きへ」から同じ問題・残り時間で再開できます。</p><div class="btnrow">${btn('close','キャンセル','',true)}${btn('confirm-pause','保存して一覧へ')}</div>`);return;}
    if(key==='pause'||key==='confirm-pause'){if(!checked(model.pause()))return;await storage.flush();close();changeView(returnTab);return;}
    if(key==='finish'){endConfirm(slot);return;}
    if(key==='confirm-finish'){const result=model.finish(b.dataset.slot);if(!checked(!!result))return;lastResult=result;resultFilter='wrong';close();changeView('result');return;}
    if(key==='history'){close();lastResult=model.state.attempts.find(a=>a.id===b.dataset.record);returnTab=['mock','learn','review'].includes(view)?view:returnTab;resultFilter='wrong';changeView('result');return;}
    if(key==='retry'){start(lastResult.ids.filter((id,i)=>lastResult.correctness[i]!==true&&model.byId.has(id)),'study','間違い・未回答の練習');return;}
    if(key==='figure'){const q=model.byId.get(b.dataset.id);if(!q?.image)return;$('figure-content').innerHTML=`<img src="./${esc(q.image)}?v=${esc(q.imageHash||'')}" alt="${esc(q.imageAlt||'問題の図')}">`;resetFigureZoom();$('figure-dialog').showModal();return;}
    if(key==='export'){const blob=new Blob([model.export()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='honmen-progress-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('本免の記録を書き出しました');return;}
    if(key==='import'){$('import-file').click();return;}
    if(key==='confirm-import'){if(!pendingImport)return;if(!checked(model.import(pendingImport)))return;pendingImport=null;await storage.flush();applySettings();close();changeView('review');toast('本免の記録を読み込みました');return;}
    if(key==='reset'){if(Object.values(model.state.sessions).some(Boolean))return;open('本免の記録をリセットしますか？','<p>本免の成績・復習・途中経過をすべて消します。必要な場合は、先に記録を書き出してください。仮免の記録は変わりません。</p><div class="btnrow">'+btn('settings','戻る','',true)+btn('confirm-reset','本免の記録を消す')+'</div>');return;}
    if(key==='confirm-reset'){if(Object.values(model.state.sessions).some(Boolean))return;if(!checked(model.reset()))return;await storage.flush();applySettings();close();changeView('mock');toast('本免の記録をリセットしました');return;}
    const a=model.state.sessions[slot];if(!a)return;
    if(key==='skip'){if(a.index===a.ids.length-1){$('answer-map').open=true;$('answer-map').scrollIntoView({block:'center'});}else if(checked(model.move(slot,a.index+1))){renderPlay();top();focusQuestion();}return;}
    if(key==='unanswered'){const next=a.ids.findIndex((id,i)=>i>a.index&&!HonmenModel.answered(a.answers[i]));const index=next>=0?next:a.answers.findIndex(v=>!HonmenModel.answered(v));if(index>=0&&checked(model.move(slot,index))){renderPlay();focusQuestion();}else toast('すべて回答済みです');return;}
    if(key==='answer'){if(a.mode==='review'&&!a.committed[a.index]&&model.schedule().waiting.includes(a.ids[a.index])){renderPlay();return;}if(checked(model.answer(slot,a.index,b.dataset.value==='true',Number(b.dataset.part)))){if(a.mode!=='mock'&&a.keys[a.index].length===1)window.HonmenSound?.play(HonmenModel.correct(a.keys[a.index],model.state.sessions[slot].answers[a.index]));renderPlay();const active=document.querySelector(`#play [data-h="answer"][data-part="${Number(b.dataset.part)}"][data-value="${b.dataset.value==='true'}"]`);if(active&&!active.disabled)active.focus({preventScroll:true});else {document.querySelector('#play .feedback')?.focus({preventScroll:true});document.querySelector('#play .answer-layout')?.scrollIntoView({block:'start',behavior:'instant'});}}return;}
    if(key==='commit'){if(checked(model.commitHazard(slot,a.index))){window.HonmenSound?.play(HonmenModel.correct(a.keys[a.index],a.answers[a.index]));renderPlay();document.querySelector('#play .feedback')?.focus({preventScroll:true});document.querySelector('#play .answer-layout')?.scrollIntoView({block:'start',behavior:'instant'});}return;}
    if(key==='flag'){if(checked(model.flag(slot,a.index))){renderPlay();document.querySelector('#play [data-h="flag"]')?.focus({preventScroll:true});}return;}
    if(['next','prev','jump'].includes(key)){const index=key==='next'?a.index+1:key==='prev'?a.index-1:Number(b.dataset.index);if(checked(model.move(slot,index))){renderPlay();top();focusQuestion();}}
  }
  document.addEventListener('click',event=>{const b=event.target.closest('[data-h]');if(b&&!b.disabled)action(b).catch(error=>{toast(error.message||'操作を完了できませんでした。');warn();});});
  document.addEventListener('change',event=>{
    if(!model)return;
    if(event.target.id==='category-sort'){categorySort=event.target.value;renderHome('learn');return;}
    if(event.target.id==='note-filter'){noteFilter=event.target.value;renderNotes();$('note-filter')?.focus({preventScroll:true});return;}
    if(event.target.id==='uncertain'){const a=model.state.sessions[slot];if(a)checked(model.confidence(slot,a.index,event.target.checked));return;}
    if(event.target.id==='theme'||event.target.id==='reduce-motion'){const values=event.target.id==='theme'?{theme:event.target.value}:{reduceMotion:event.target.checked};if(checked(model.settings(values)))applySettings();}
  });
  document.addEventListener('toggle',event=>{if(event.target.matches?.('[data-h-note]')&&event.target.open)HonmenNotes.populate(event.target,bank);},true);
  let noteComposing=false;
  function updateNoteSearch(target){noteSearch=target.value;const pos=target.selectionStart;renderNotes();const input=$(view==='notes'?'notes':'learn-notes').querySelector('#note-search');input.focus({preventScroll:true});try{input.setSelectionRange(pos,pos);}catch{}}
  document.addEventListener('compositionstart',e=>{if(e.target.id==='note-search')noteComposing=true;});
  document.addEventListener('compositionend',e=>{if(e.target.id==='note-search'){noteComposing=false;updateNoteSearch(e.target);}});
  document.addEventListener('input',e=>{if(e.target.id==='note-search'&&!noteComposing)updateNoteSearch(e.target);});
  function resetFigureZoom(){ $('figure-zoom').value='100';$('figure-content').style.zoom='1';$('figure-content').style.width='100%'; }
  function setFigureZoom(percent){
    const width=$('figure-dialog').querySelector('.figure-scroll').clientWidth;
    if(width)$('figure-content').style.width=width+'px';
    $('figure-content').style.zoom=String(percent/100);
  }
  $('figure-zoom').addEventListener('input',event=>setFigureZoom(Number(event.target.value)));
  window.addEventListener('resize',()=>{if($('figure-dialog').open)setFigureZoom(Number($('figure-zoom').value));});
  $('import-file').addEventListener('change',async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try {
      if(file.size>10*1024*1024)throw new Error('記録ファイルが大きすぎます。');
      const text=await file.text(),incoming=HonmenModel.normalize(JSON.parse(text));pendingImport=text;
      open('本免の記録を読み込みますか？',`<p>${Object.keys(incoming.stats).length}問分の回答記録を読み込み、現在の本免の記録を置き換えます。必要なら先に現在の記録を書き出してください。</p><div class="btnrow">${btn('settings','戻る','',true)}${btn('confirm-import','読み込む')}</div>`);
    } catch(error) { pendingImport=null;toast(error.message||'本免の記録ファイルを読み込めませんでした。'); }
  });
  document.addEventListener('keydown',event=>{if(!event.target.closest('.learn-switch')||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();learnSection=event.key==='Home'?'categories':event.key==='End'?'notes':learnSection==='notes'?'categories':'notes';renderHome('learn');$('learn-tab-'+learnSection).focus();});
  $('tabs').addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    const tabs=['mock','learn','review'],i=tabs.findIndex(id=>$('tab-'+id).getAttribute('aria-selected')==='true');if(i<0)return;event.preventDefault();
    const index=event.key==='Home'?0:event.key==='End'?2:(i+(event.key==='ArrowRight'?1:2))%3;changeView(tabs[index]);$('tab-'+tabs[index]).focus();
  });
  function syncActivity() {
    if(!model||view!=='play')return;
    if(document.hidden||!windowFocused||!pageActive){model.pause();storage.flush();}
    else if(checked(model.resume(slot))){renderPlay();checkpoint=Date.now();}
    warn();
  }
  document.addEventListener('visibilitychange',syncActivity);
  window.addEventListener('blur',()=>{windowFocused=false;syncActivity();});
  window.addEventListener('focus',()=>{windowFocused=true;syncActivity();refreshResultReview();});
  window.addEventListener('pagehide',()=>{pageActive=false;syncActivity();storage?.flush();});
  window.addEventListener('pageshow',()=>{pageActive=true;syncActivity();refreshResultReview();});
  window.addEventListener('storage',()=>warn());
  window.matchMedia?.('(prefers-color-scheme:dark)').addEventListener?.('change',()=>model&&applySettings());
  window.HonmenReady=(async()=>{
    try {
      bank=HONMEN_DATA.questions;sets=HONMEN_DATA.sets;version=HONMEN_DATA.version;
      storage=await HonmenStorage.open({storage:localStorage,indexedDB:window.indexedDB,validate:HonmenModel.normalize,build:version,onChange:warn});
      model=HonmenModel.create({bank,storage,contentVersion:version});
      window.HonmenApp={model,storage,get view(){return view;}};
      $('brandmark').innerHTML=icon('road');$('settings-button').innerHTML='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.5 3.8 10 2h4l.5 1.8 1.6.9 1.8-.5 2 3.5-1.3 1.3v2l1.3 1.3-2 3.5-1.8-.5-1.6.9L14 18h-4l-.5-1.8-1.6-.9-1.8.5-2-3.5L5.4 11V9L4.1 7.7l2-3.5 1.8.5Z" transform="translate(0 2)"/><circle cx="12" cy="12" r="3.2"/></svg><span>設定</span>';
      ['mock','learn','review'].forEach((key,i)=>$('nav-'+key).innerHTML=icon(['exam','book','review'][i]));
      $('startup-status').hidden=true;$('main').inert=false;$('tabs').inert=false;$('settings-button').disabled=false;
      window.KarimenHomeInstall?.init({canPrompt:()=>false,canGuide:()=>view!=='play',hasProgress:()=>Object.keys(model.state.stats).length>0,openSettings:settings,exportRecord:()=>action({dataset:{h:'export'}})});
      applySettings();changeView('mock');warn();storage.protect(navigator.storage);
      window.KarimenTown?.init({canOpen:()=>view!=='play',open:()=>{if(view!=='town')townReturn=view;changeView('town');},back:()=>changeView(townReturn,['play','result','notes'].includes(townReturn)),notify:toast});
      setInterval(()=>{
        if(!model||document.hidden)return;
        refreshResultReview();
        document.querySelectorAll('[data-review-at]').forEach(el=>{const at=Number(el.dataset.reviewAt);el.textContent=at<=Date.now()?'今すぐ復習':waitLabel(at);});
        if(view==='play'&&slot==='mock') {
          if(!model.state.sessions.mock)return;
          if(model.remaining()===0||Date.now()-checkpoint>=15000){const expired=model.tick();checkpoint=Date.now();if(expired){lastResult=model.state.attempts.at(-1);close();$('figure-dialog').close();changeView('result');return;}warn();}
          if($('timer')){$('timer').textContent='残り '+time(model.remaining());$('timer').classList.toggle('low',model.remaining()<=5*60000);}
        } else if(['review','learn'].includes(view)&&!dialog.open&&reviewSchedule!==homeScheduleKey())refreshHomeSchedule();
      },1000);
      return true;
    } catch(error) { $('startup-status').textContent=(error.message||'本免の画面を読み込めませんでした。')+' ページを再読み込みしてください。';$('startup-status').setAttribute('role','alert');return false; }
  })();
})();
