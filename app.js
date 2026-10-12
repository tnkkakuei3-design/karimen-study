let actx=null;
function sfx(ok){if(state.sound===false)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;actx=actx||new C();if(actx.state==='suspended')actx.resume();const t=actx.currentTime,g=actx.createGain();g.connect(actx.destination);
 const tone=(f,st,d,type,vol)=>{const o=actx.createOscillator(),v=actx.createGain();o.type=type;o.frequency.setValueAtTime(f,t+st);v.gain.setValueAtTime(0.0001,t+st);v.gain.exponentialRampToValueAtTime(vol,t+st+0.015);v.gain.exponentialRampToValueAtTime(0.0001,t+st+d);o.connect(v);v.connect(g);o.start(t+st);o.stop(t+st+d+0.02)};
 if(ok){tone(988,0,0.16,'sine',0.25);tone(1319,0.13,0.32,'sine',0.25)}else{tone(196,0,0.32,'square',0.09);tone(185,0.02,0.32,'sawtooth',0.06);try{navigator.vibrate&&navigator.vibrate(120)}catch{}}}catch{}}
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId = new Map(BANK.map(q => [q.id, q]));
const model = KarimenModel.create({ storage: { getItem: k => window.localStorage.getItem(k), setItem: (k, v) => window.localStorage.setItem(k, v) } });
let state = model.state, tab = 'mock', view = 'mock', mockFilter = 'all', categoryFilter = 'all', learnSection = 'categories';
let lastResult = null, reviewFilter = 'wrong', noteReturn = null, toastTimer = null, modalAction = null;
let noteSearch = '', noteFilter = '', noteComposing = false, reviewMore = false, externalChange = false;
let windowFocused = document.hasFocus(), pageActive = true, lastTimerCheckpoint = 0;
const shuffle = arr => { const out = [...arr]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
const activeQuestion = id => model.active.get(Number(id));
const dateLabel = at => at ? new Date(at).toLocaleString('ja-JP', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '今すぐ';
const pct = (n, total) => total ? Math.round(n / total * 100) : 0;
const answeredCount = KarimenModel.answeredCount;
const partialAttempt = KarimenModel.partialAttempt;
const weak = q => model.weak(q.id);
// Decorative artwork: learning status is always communicated in adjacent text.
const characterArt = (id, className = '') => `<img class="placement-character ${className}" src="./assets/characters/${id}.png" alt="" aria-hidden="true" decoding="async">`;
function completedReviewToday() {
  const day = new Date().toDateString();
  return state.attempts.some(a => a.mode === 'review' && !partialAttempt(a) && answeredCount(a) > 0 && a.completedAt && new Date(a.completedAt).toDateString() === day);
}

const bankCount = '500問';
function toast(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
function save() { const ok = model.save(); updateChrome(); return ok; }
function theme() { document.documentElement.dataset.theme = state.theme === 'dark' || (state.theme === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches) ? 'dark' : 'light'; document.documentElement.dataset.reduceMotion = String(state.reduceMotion); }
function ask(title, message, yes, action) { modalAction = action; $('confirm-title').textContent = title; $('confirm-message').textContent = message; $('confirm-yes').textContent = yes; $('confirm').showModal(); }
function closeDialogs() { for (const el of document.querySelectorAll('dialog[open]')) el.close(); modalAction = null; }
function updateChrome() {
  state = model.state; externalChange ||= model.conflicted;
  $('storage-warning').hidden = !model.error && !externalChange;
  $('storage-warning').textContent = externalChange ? '別のタブで記録が更新されました。重複を防ぐため操作を止めています。再読み込みして続けてください。' : model.error;
  const locked = state.session?.mode === 'exam';
  const focusedExam = locked && view === 'play';
  $('tabs').hidden = view === 'play';
  document.body.classList.toggle('play-active', view === 'play');
  document.body.classList.toggle('focused-view', ['play','result'].includes(view));
  document.body.classList.toggle('exam-active', focusedExam);
  for (const k of ['mock', 'learn', 'review']) { const b = $('tab-' + k); b.disabled = focusedExam && k !== 'mock'; b.setAttribute('aria-selected', String(k === tab)); b.tabIndex = k === tab ? 0 : -1; }
  $('review-dot').hidden = model.schedule().due.length === 0;
  $('footer').hidden = locked || ['play','result','notes'].includes(view);
  $('migration-notice').hidden = locked || !state.notices.length || !['mock','learn','review'].includes(view);
  $('migration-notice').innerHTML = state.notices.map(t => `<p>${esc(t)}</p>`).join('') + '<button class="textbtn" data-action="dismiss-notice">確認しました</button>';
  window.KarimenHomeInstall?.sync();
}
function show(name, top = true) {
  view = name; for (const k of ['mock','learn','review','play','result','notes','archive']) $(k).hidden = k !== name;
  updateTimer(); updateChrome(); if (top) { window.scrollTo({ top: 0, behavior:'instant' }); $('main').focus({ preventScroll: true }); }
}
function gradeBeforeLeaving(label, action) {
  const s = state.session;
  if (s?.mode !== 'exam') { action(); return; }
  if (model.expired()) { finish(true); if (!state.session && !externalChange) action(); return; }
  const left = s.answers.filter(a => a === null).length;
  const actionLabel = left ? '途中終了して' : '採点して';
  ask(`模試を${actionLabel}${label}へ進みますか？`, `第${s.worksheet}回の回答を保存して、${label}を開きます。${left ? `未回答${left}問は正答率・復習に含めず、合否は判定しません。` : '50問すべて回答済みです。採点して成績に記録します。'}続きから解く場合はキャンセルしてください。`, `${actionLabel}${label}へ`, () => {
    if (state.session?.attemptId !== s.attemptId) return;
    finish(false); if (!state.session && !externalChange) action();
  });
}
function navigate(k) {
  if (!['mock','learn','review'].includes(k)) return;
  if (state.session?.mode === 'exam' && k !== 'mock') { gradeBeforeLeaving(k === 'learn' ? '学習' : '復習', () => navigate(k)); return; }
  tab = k; if (k === 'mock') renderMock(); if (k === 'learn') renderLearn(); if (k === 'review') renderReview(); show(k);
}
function resultsFor(n, kind, currentOnly = true) {
  const target = kind === 'mock' ? state.mockResults : state.guidedResults;
  const row = target[n], w = model.worksheet(n);
  const candidates = [...state.attempts, ...(row?.recent || []), row?.best].filter(a => a && a.mode === kind && a.worksheet === n && (!currentOnly || a.contentVersion === w.contentVersion));
  const list = [...new Map(candidates.map(a => [a.attemptId, a])).values()].sort((a, b) => a.completedAt - b.completedAt);
  const scored = list.filter(a => !partialAttempt(a));
  return { list, last: scored.at(-1), best: [...scored].sort((a, b) => b.scoreSnapshot - a.scoreSnapshot)[0], partial: list.filter(partialAttempt) };
}
function filters(action, value, choices) { return `<div class="seg" role="group" aria-label="表示を絞り込む">${choices.map(([k, label]) => `<button data-action="${action}" data-filter="${k}" aria-pressed="${value === k}">${label}</button>`).join('')}</div>`; }
function entryCard(action, title, description, glyph = 'play') {
  return `<button class="recommend${action === 'resume' ? ' resume-card' : ''}" data-action="${action}">${icon(glyph)}<span class="recommend-copy"><strong>${esc(title)}</strong><small>${esc(description)}</small></span>${icon('chevron')}</button>`;
}
function renderMock() {
  const passed = WORKSHEETS.filter(w => (resultsFor(w.worksheet, 'mock').best?.scoreSnapshot ?? -1) >= 45).length;
  const s = state.session, list = WORKSHEETS.filter(w => { const r = resultsFor(w.worksheet, 'mock'); return mockFilter === 'all' || (mockFilter === 'new' ? !r.last : (r.best?.scoreSnapshot ?? -1) < 45); });
  $('mock').innerHTML = `<div class="home-intro"><div><h2>今日も、<br>一歩ずつ。</h2><p class="muted">${s?.mode === 'exam' ? '続きから、取り組もう。' : '50問・30分で、力だめし。'}</p></div><img class="home-character" src="./image-155cadc1029a.png" width="1400" height="792" alt="プーリーくんとよりともさん"></div><div class="page-heading mock-heading"><h3>教習問題ベースの模試</h3><p class="inline muted">10回・各50問 <span class="badge">毎回ランダム順</span></p></div>
    <div class="home-overview"><div class="achievement-progress"><div class="inline"><span><b>${passed}</b><small> / 10回 合格</small></span><small class="muted">達成率 ${passed * 10}%</small></div><div class="progress" role="progressbar" aria-label="模試の合格回数" aria-valuenow="${passed}" aria-valuemin="0" aria-valuemax="10"><i style="width:${passed * 10}%"></i></div></div></div>
    ${s?.mode === 'exam' ? entryCard('resume', `第${s.worksheet}回の続きへ`, `${s.answers.filter(a => a !== null).length} / 50問 回答済み · タイマー停止中`) : ''}
    ${filters('mock-filter', mockFilter, [['all','すべて'],['new','未受験'],['unpassed','未合格']])}
    <div class="mock-grid">${list.map(w => { const r = resultsFor(w.worksheet, 'mock'), on = s?.mode === 'exam' && s.worksheet === w.worksheet, score = r.best?.scoreSnapshot;
      return `<button class="set-card ${on ? 'in-progress' : ''} ${score === 50 ? 'perfect' : ''}" data-action="detail" data-set="${w.worksheet}" aria-label="第${w.worksheet}回 ${on ? '受験中' : r.last ? `前回${r.last.scoreSnapshot}点 最高${score}点` : '未受験'}"><span><b>第${w.worksheet}回</b>${r.last ? `<small>前回 ${r.last.scoreSnapshot}点</small><small>最高 ${score}点</small>` : `<span class="badge ${on ? 'blue' : ''}">${on ? '受験中' : '未受験'}</span>`}${on && r.last ? '<small>受験中</small>' : ''}</span>${score >= 45 ? flowerStamp(score === 50 ? '満点' : '合格') : `<span class="chevron">${icon('chevron')}</span>`}</button>`; }).join('')}</div>
    ${!list.length ? '<div class="empty"><h3>この条件の回はありません</h3><p>「すべて」から各回の記録を確認できます。</p></div>' : ''}
    <p class="legacy-label">50問・30分。解説は採点後に表示します。以前の解説付き練習の記録は、各回の詳細に残っています。</p>`;
}
function attemptRows(list, label) {
  return list.slice(-10).reverse().map(a => { const partial = partialAttempt(a), total = partial ? answeredCount(a) : a.total;
    return `<div class="history-row"><div>${label}<small>${dateLabel(a.completedAt)}${a.legacy ? ' · 旧版の記録' : partial ? ' · 途中終了' : ''}</small></div><b>${total ? `${a.scoreSnapshot}<small> / ${total}${partial ? '問' : '点'}</small>` : '回答なし'}</b><button class="textbtn" data-action="stored-result" data-id="${esc(a.attemptId)}">回答を見る</button></div>`;
  }).join('');
}
function detail(n) {
  const w = model.worksheet(n); if (!w) return;
  if (state.session?.mode === 'exam') {
    if (state.session.worksheet === w.worksheet) resume();
    else gradeBeforeLeaving(`第${w.worksheet}回`, () => detail(w.worksheet));
    return;
  }
  const mock = resultsFor(w.worksheet, 'mock'), guided = resultsFor(w.worksheet, 'guided', false);
  const olderMocks = resultsFor(w.worksheet, 'mock', false).list.filter(a => a.contentVersion !== w.contentVersion);
  $('detail-content').innerHTML = `<span class="badge">教習問題ベース</span><h2 id="detail-title">第${w.worksheet}回</h2><div class="details-list"><div><b>50問</b><span>毎回ランダムな順番で出題</span></div><div><b>30分</b><span>採点後に解説</span></div></div><p class="detail-pass">45点以上で、このアプリ内の合格です。</p><p class="detail-timer muted">${icon('clock')}中断中や別アプリを開いている間は、タイマーが止まります。</p><div class="stack"><button class="btn wide" data-action="start-mock" data-set="${w.worksheet}">30分模試を始める ${icon('arrow')}</button><button class="btn secondary wide" data-action="start-guided" data-set="${w.worksheet}">この回を解説付きで練習</button></div><details class="detail-rules"><summary>模試のルール・問題の内訳</summary><div class="detail-rules-body"><h3>出題の順番</h3><p>この回の50問を、開始するたびに並べ替えます。途中再開では同じ順番です。解説付き練習は教材の順番で進みます。</p><h3>途中終了・時間切れ</h3><p>途中終了は回答分だけで集計し、合否・最高点の対象外です。時間切れは50問で採点しますが、未回答は学習の正答率・復習に含めません。</p><h3>問題の内訳</h3><p>代替問題 ${w.replacementCount}問・補足問題 ${w.supplementalCount}問を含む50問です。</p></div></details><h3>30分模試の記録</h3>${mock.best ? `<p class="inline"><span class="badge ${mock.best.scoreSnapshot >= 45 ? 'success' : ''}">最高 ${mock.best.scoreSnapshot}点</span></p>${attemptRows(mock.list.filter(a => !partialAttempt(a)), '30分模試')}` : '<p class="muted">まだ受験していません。</p>'}${mock.partial.length ? `<h3>模試の途中終了</h3>${attemptRows(mock.partial, '30分模試')}` : ''}${guided.partial.length ? `<h3>練習の途中終了</h3>${attemptRows(guided.partial, '解説付き練習')}` : ''}${olderMocks.length ? `<h3>以前の内容版の模試記録</h3><p class="muted">当時の得点を保持しています。現在の内容版の合格数・最高点とは分けて表示します。</p>${attemptRows(olderMocks, '30分模試・以前の内容版')}` : ''}${guided.best ? `<h3>解説付き練習の記録</h3><div class="guided-record ${guided.best.scoreSnapshot === 50 ? 'perfect' : ''}">${guided.best.scoreSnapshot >= 45 ? flowerStamp(guided.best.scoreSnapshot === 50 ? '満点' : '合格') : ''}<div><strong>最高 ${guided.best.scoreSnapshot}点</strong><p class="muted">${guided.best.scoreSnapshot >= 45 ? '解説付き練習で合格の目安を達成' : '解説付き練習の成績'}</p></div></div>${attemptRows(guided.list.filter(a => !partialAttempt(a)), '解説付き練習')}<p class="muted">この成績は30分模試の合格数には含めません。</p>` : ''}`;
  $('detail').showModal();
}
function replaceStudy(action) {
  if (state.session?.mode === 'exam') { resume(); return; }
  const previous = state.session;
  if (previous) ask('新しい学習を始めますか？', '途中の学習を終了して始めます。答えた問題の記録は残ります。続きから解く場合はキャンセルしてください。', '新しく始める', () => {
    if (state.session?.attemptId !== previous.attemptId) return;
    model.finish(); state = model.state;
    if (model.conflicted) { updateChrome(); return; }
    action();
  });
  else action();
}
function startSet(n, kind) {
  const w = model.worksheet(n); if (!w) return; $('detail').close();
  replaceStudy(() => { model.begin({ ids:w.orderedIds, kind, worksheet:w.worksheet, label:`第${w.worksheet}回${kind === 'guided' ? '・解説付き練習' : ''}` }); state = model.state; tab = kind === 'mock' ? 'mock' : 'learn'; lastResult = null; renderPlay(); show('play'); focusQuestion(); });
}
function categorized(c) { return Q.filter(q => c.extra ? q.isSupplemental : !q.isSupplemental && c.topics.includes(q.topic)); }
function studySelection(list, count = 10) {
  const pending = shuffle(list.filter(q => !state.stats[q.id]?.total)), other = shuffle(list.filter(q => state.stats[q.id]?.total));
  const ordered = [...pending, ...other], concepts = new Set(), selected = [], deferred = [];
  for (const q of ordered) { const concept = q.concept || q.id; if (concepts.has(concept)) deferred.push(q); else { selected.push(q); concepts.add(concept); } }
  return [...selected, ...deferred].slice(0, count).map(q => q.id);
}
function startStudy(ids, label, kind = 'study') {
  const clean = [...new Set(ids)].filter(id => activeQuestion(id) && (kind !== 'review' || !model.weak(id) || model.due(id))); if (!clean.length) { toast(kind === 'review' ? '次の復習時刻までお待ちください。' : '対象の問題はありません。'); return; }
  replaceStudy(() => { model.begin({ ids:clean, kind, label }); state = model.state; tab = kind === 'review' ? 'review' : 'learn'; lastResult = null; renderPlay(); show('play'); focusQuestion(); });
}
function renderLearn() {
  const schedule = model.schedule(), session = state.session, unfinished = session?.mode === 'drill', freshCount = Q.filter(q => !state.stats[q.id]?.total).length;
  const answeredCount = Q.length - freshCount, totals = Q.reduce((sum,q) => { const s=state.stats[q.id]; sum.total += s?.total || 0; sum.correct += s?.correct || 0; return sum; }, {total:0,correct:0});
  const resumeSub = unfinished ? `${session.label} · ${session.answers.filter(a => a !== null).length} / ${session.ids.length}問 回答済み` : '';
  const studySub = freshCount ? 'まだ学んでいない問題を優先' : '模試と同じ500問から出題';
  const studyActions = `<div class="learn-actions${unfinished ? ' has-resume' : ''}" role="group" aria-label="学習を始める">${unfinished ? entryCard('resume', '途中から続ける', resumeSub) : ''}${entryCard('quick-study', '10問学ぶ', studySub, 'book')}</div>`;
  const cats = CATS.map(c => ({...c, list:categorized(c)})).filter(c => c.list.length).filter(c => categoryFilter === 'all' || (categoryFilter === 'new' ? c.list.some(q => !state.stats[q.id]?.total) : c.list.some(weak)));
  $('learn').innerHTML = `<div class="page-heading character-heading"><div><h2>問題と図解で、理解を深める。</h2></div>${characterArt('D047','learn-guide')}</div>${studyActions}<dl class="learning-overview" aria-label="学習状況"><div><dt>回答済み</dt><dd>${answeredCount}<small> / ${Q.length}問</small></dd></div><div><dt>累積正答率</dt><dd>${totals.total ? pct(totals.correct,totals.total) : '—'}<small>${totals.total ? '%' : ''}</small></dd></div><div><dt>要復習</dt><dd>${schedule.all.length}<small>問</small></dd></div></dl><div class="learn-switch" role="tablist" aria-label="学び方">${[['categories','分野から学ぶ'],['notes','図解ノート']].map(([key,label]) => `<button id="learn-tab-${key}" role="tab" aria-selected="${learnSection === key}" aria-controls="learn-${key}" tabindex="${learnSection === key ? 0 : -1}" data-action="learn-section" data-section="${key}">${label}</button>`).join('')}</div><section id="learn-categories" role="tabpanel" aria-labelledby="learn-tab-categories" ${learnSection !== 'categories' ? 'hidden' : ''}><p class="learn-count muted">共通の${bankCount}</p>${filters('category-filter', categoryFilter, [['all','すべて'],['new','未学習'],['weak','要復習']])}<div class="category-grid">${cats.map(c => { const correct = c.list.filter(q => state.stats[q.id]?.last === true).length, weakCount = c.list.filter(weak).length, learned = c.list.filter(q => state.stats[q.id]?.total).length; return `<button class="category-card" data-action="category" data-cat="${c.k}">${icon(c.icon)}<span class="category-copy"><strong>${esc(c.extra ? '補足の学習' : c.label)}</strong><span class="category-status"><small>${learned ? `正解 ${correct}/${c.list.length}問` : `未学習 · ${c.list.length}問`}</small>${weakCount ? `<span class="category-review-badge">復習 ${weakCount}</span>` : ''}</span><span class="progress"><i style="width:${pct(correct,c.list.length)}%"></i></span></span><span class="card-chevron">${icon('chevron')}</span></button>`; }).join('')}</div>${!cats.length ? '<div class="empty">この条件の分野はありません。</div>' : ''}<div class="info-strip">${icon('info')}<span>補足問題も500問に含まれます。各回を50問通して練習するときは、模試の詳細から始められます。</span></div></section><section id="learn-notes" role="tabpanel" aria-labelledby="learn-tab-notes" ${learnSection !== 'notes' ? 'hidden' : ''}></section>`;
  if (learnSection === 'notes') renderNotes('learn-notes');
}
function reviewWait(at) {
  const minutes = Math.max(0, Math.ceil(((at || 0) - Date.now()) / 60000));
  return minutes ? `あと${minutes}分` : '今すぐ復習';
}
function reviewWaitHTML(at) {
  return `<span data-review-at="${Number(at) || 0}">${reviewWait(at)}</span>`;
}
function reviewRow(q, early = false) {
  const s = state.stats[q.id], left = Math.max(1, 2 - (s?.reviewPass || 0));
  return `<button class="review-row" data-action="review-one" data-id="${q.id}" ${early ? 'disabled' : ''}>${icon('book')}<span class="row-copy"><strong>${esc(q.topic)}${q.isSupplemental ? '・補足' : ''}</strong><small>第${q.worksheet}回・問${q.number}</small>${early ? `<small>次の復習まで ${reviewWaitHTML(s.reviewAt)}</small>` : ''}</span><span class="badge ${early ? '' : 'blue'}">あと${left}回</span>${icon('chevron')}</button>`;
}
function renderReview() {
  const { all, due, later } = model.schedule();
  const session = state.session, unfinished = session?.kind === 'review';
  const completed = !unfinished && !all.length && completedReviewToday();
  const reviewArt = all.length || unfinished ? 'D051' : completed ? 'D011' : 'D012';
  $('review').innerHTML = `<div class="page-heading character-heading"><div><h2>復習</h2><p class="muted">${completed ? '今日の復習は完了です。' : '初回はすぐに。次は30分あけて。'}</p></div>${characterArt(reviewArt,'review-guide')}</div>
    ${unfinished ? entryCard('resume', '途中の復習を続ける', `途中の復習があります · ${session.answers.filter(a => a !== null).length} / ${session.ids.length}問 回答済み`) : ''}
    <section class="review-now-card" aria-labelledby="review-now-title"><h3 id="review-now-title">今すぐ復習</h3><p class="review-now-count">${due.length}<small>問</small></p>${due.length ? `<button class="btn wide" data-action="review-ready">${due.length}問を復習する ${icon('arrow')}</button>` : `<p class="muted">${unfinished ? '未回答の問題は「途中の復習を続ける」から確認できます。' : all.length ? '今すぐの復習は完了です。' : '今すぐ復習する問題はありません。'}${later.length ? ` 次は${reviewWaitHTML(state.stats[later[0].id]?.reviewAt)}です。` : ''}</p>`}</section>
    <section class="review-timing${later.length ? '' : ' is-empty'}" aria-labelledby="review-later-title"><div class="review-timing-heading"><h3 id="review-later-title">${icon('clock')}次の復習待ち</h3><p class="review-wait-count">${later.length}<small>問</small></p></div>${later.length ? `<p class="review-next-time">最短 ${reviewWaitHTML(state.stats[later[0].id]?.reviewAt)}</p><p class="hintline">30分たつと「今すぐ復習」に移ります。待機中の問題は解けません。</p>` : ''}</section>
    ${all.length ? `<div class="section-heading"><h3>復習する問題</h3><small>${all.length}問</small></div>${[...due,...later].slice(0,reviewMore ? all.length : 10).map(q => reviewRow(q,!model.due(q.id))).join('')}${all.length > 10 && !reviewMore ? '<button class="textbtn wide" data-action="review-more">すべての問題を見る</button>' : ''}` : `<div class="empty"><p>間違い・自信なしの問題がここに集まります。</p><button class="btn secondary" data-action="tab" data-tab="learn">学習へ進む ${icon('arrow')}</button></div>`}
    <details class="review-graduation"><summary>復習リストから卒業するには？</summary><p>初回の間違いはすぐ復習できます。1回正解したら30分後にもう一度。自信をもって2回正解すると卒業します。間違い・自信なしは回数をリセットし、30分後に再挑戦です。</p></details>`;
}
function questionArt(q, revealed = false, compact = false) {
  const assets = ADDED_ART[q.id]; if (!assets) return originalQuestionArt(q, revealed, compact);
  return `<figure class="question-visual" data-question-visual="${q.id}" data-revealed="${revealed}"><div class="question-visual-head"><span>問題の図</span>${!compact ? `<button class="textbtn" data-action="question-zoom" data-id="${q.id}" data-revealed="${revealed}" aria-label="設問の図を拡大">拡大 ↗</button>` : ''}</div><div class="sourced-pictures ${assets.length > 1 ? 'paired' : 'single'}">${assets.map(a => `<img src="./${esc(a.file)}" alt="${esc(a.alt)}" decoding="async">`).join('')}</div>${revealed ? `<figcaption class="visual-answer">${assets.map(a => `<p class="image-credit">${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.credit)} ↗</a>` : esc(a.credit)}</p>`).join('')}</figcaption>` : ''}</figure>`;
}
function replacementNote(q) {
  const r = q.replacementSource; if (!q.isReplacement || !r) return '';
  return `<div class="replacement-note"><strong>参考問題をもとに作成した代替問題</strong><p>${esc(r.relationship || '')}</p><a class="source-link" href="${esc(r.url)}" target="_blank" rel="noopener">参考問題：${esc(r.name)} ↗</a></div>`;
}
function explanationExtras(q, withNote = true) {
  const n = noteFor(q);
  return `<div class="explanation">${q.fig && FIG[q.fig] ? `<details class="inline-figure" open><summary>図で確認する</summary>${figHTML(q.fig)}</details>` : ''}${replacementNote(q)}<div class="question-links">${n && withNote ? `<button class="textbtn" data-action="note" data-id="${n.id}">図解ノートで確認 ${icon('arrow')}</button>` : ''}<a class="source-link" href="${esc(sourceFor(q).url)}" target="_blank" rel="noopener">公式の根拠資料 ↗</a></div></div>`;
}
function reviewSchedule(q) {
  if (!weak(q)) return '';
  const stat = state.stats[q.id];
  return `<section class="review-schedule-note review-again-card"><h3>次の復習：${reviewWaitHTML(stat?.reviewAt)}</h3><small>卒業まであと${Math.max(1,2-(stat?.reviewPass||0))}回。復習後は30分あけて、もう一度取り組みましょう。</small></section>`;

}
function explanation(q, answer, withNote = true) {
  const ok = answer === q.a, text = q.ex || '', split = text.indexOf('。'), brief = split >= 0 ? text.slice(0, split + 1) : text, rest = split >= 0 ? text.slice(split + 1) : '';
  return `<div class="feedback ${ok ? '' : 'incorrect'}" role="status" tabindex="-1"><h3>${answer === null ? '未回答' : ok ? '正解です' : 'ここを覚え直そう'} · 答えは ${q.a ? '○' : '×'}</h3><p>${esc(brief)}</p>${rest ? `<details open><summary>詳しい解説</summary><p>${esc(rest)}</p></details>` : ''}</div>${withNote ? reviewSchedule(q) : ''}${explanationExtras(q, withNote)}`;
}
function learningPoints(q) {
  // Reuse the reviewed explanation verbatim. Only these reviewed, explicit
  // contrasts are split into labelled rules; do not infer exceptions by keyword.
  const sentences = (q.ex || '').match(/[^。]+(?:。|$)/g) || [];
  let first = sentences.shift() || '', second = '', rule = false;
  const contrast = [304,444,654,710,727].includes(q.id) && first.match(/^(.*?)(?:だが、|が、)(.+)$/);
  if (contrast) { first = contrast[1] + '。'; second = contrast[2]; rule = true; }
  else if ([302,512,517,674].includes(q.id) && first.includes('原則') && sentences[0] && /例外|限られる/.test(sentences[0])) {
    second = sentences.shift(); rule = true;
  }
  const points = rule ? `<dl class="point-rules"><div><dt>原則</dt><dd>${esc(first)}</dd></div><div class="point-exception"><dt>例外</dt><dd>${esc(second)}</dd></div></dl>` : `<p class="point-main">${esc(first)}</p>`;
  return `<section class="learning-points" aria-labelledby="learning-points-title"><h3 id="learning-points-title">${icon('book')}覚えるポイント</h3>${points}${sentences.length ? `<div class="point-detail"><h4>補足</h4>${sentences.map(text => `<p>${esc(text)}</p>`).join('')}</div>` : ''}</section>`;
}
function learningAnswer(q, answer, uncertain) {
  const ok = answer === q.a;
  return `<div class="feedback answer-result ${ok ? '' : 'incorrect'}" role="status" tabindex="-1" aria-labelledby="answer-result-title"><p class="answer-state">${icon(ok ? 'check' : 'book')}${ok ? '正解です' : 'ここを覚え直そう'}</p><h2 id="answer-result-title" class="answer-result-title">正解は <strong>${q.a ? '○' : '×'}</strong><span class="sr-only">（${q.a ? '正しい' : '誤り'}）</span></h2><p class="answer-choice">あなたの回答 <strong>${answer ? '○' : '×'}</strong></p>${uncertain ? '<p class="answer-uncertain">自信なし：正解でも復習に残しました。</p>' : ''}</div>${learningPoints(q)}<details class="answered-question" open><summary>${icon('search')}問題文を確認<span class="question-chevron" aria-hidden="true">⌄</span></summary><div class="answered-question-body"><h3 class="question" id="question" tabindex="-1">${esc(q.q)}</h3>${questionArt(q, true)}</div></details>${explanationExtras(q)}${reviewSchedule(q)}`;
}
function focusQuestion() { requestAnimationFrame(() => ($('play').querySelector('.answer-result') || $('question'))?.focus({ preventScroll: true })); }
function renderPlay() {
  const s = state.session; if (!s) return;
  if (model.expired()) { finish(true); return; }
  const q = activeQuestion(s.ids[s.index]), value = s.answers[s.index], exam = s.mode === 'exam', answered = value !== null, done = s.answers.filter(a => a !== null).length;
  const revealed = !exam && answered;
  const waiting = s.kind === 'review' && !answered && model.weak(q.id) && !model.due(q.id);
  const nextText = s.index === s.ids.length - 1 ? (exam ? '採点する' : '結果を見る') : '次の問題へ';
  const prompt = `<h2 class="question" id="question" tabindex="-1">${esc(q.q)}</h2>${questionArt(q)}${!exam ? `<label class="confidence-control"><input type="checkbox" id="uncertain" ${s.uncertain[s.index] ? 'checked' : ''}>自信なし・迷っている</label>` : ''}<p class="choose-label">正しければ ○、誤りなら ×</p><div class="choices">${[true,false].map(v => `<button class="answer-btn ${value === v ? 'selected' : ''}" data-action="answer" data-value="${v}" aria-label="${v ? '正しい（○）' : '誤り（×）'}" ${exam ? `aria-pressed="${value === v}"` : ''}><span>${v ? '○' : '×'}</span><small>${v ? '正しい' : '誤り'}</small></button>`).join('')}</div>${exam ? `<div class="exam-tools"><button class="flag-btn" data-action="flag" aria-pressed="${s.flags[s.index]}">${icon('flag')}自信なし・見直す</button><button class="textbtn" data-action="unanswered">未回答へ ${icon('arrow')}</button></div>` : ''}`;
  $('play').innerHTML = `<div class="playhead"><button class="btn secondary compact" data-action="pause">${icon('back')}${exam ? '中断' : s.kind === 'review' ? '復習トップ' : '学習トップ'}</button><h2>${esc(s.label)}</h2></div><div class="play-meta"><span>問題 <strong>${s.index + 1}</strong> / ${s.ids.length}</span>${exam ? '<span class="timer" id="timer" role="timer"></span>' : `<span class="muted">正解 ${s.ids.filter((id,i) => s.answers[i] === activeQuestion(id).a).length}問</span>`}</div><div class="progress play-progress" role="progressbar" aria-label="回答済み" aria-valuemin="0" aria-valuemax="${s.ids.length}" aria-valuenow="${done}"><i style="width:${pct(done,s.ids.length)}%"></i></div>
    <article class="card question-card ${revealed ? 'answer-layout' : ''}"><div class="tags"><span class="badge">${exam ? '元の問題：' : ''}第${q.worksheet}回・問${q.number}</span>${!exam ? `<span class="badge">${esc(q.topic)}</span>` : ''}${q.isReplacement ? '<span class="badge">代替問題</span>' : ''}${q.isSupplemental ? '<span class="badge">補足</span>' : ''}</div>
    ${waiting ? `<h2 id="question" tabindex="-1">次の復習待ち</h2><p>${reviewWaitHTML(state.stats[q.id]?.reviewAt)}で復習できます。</p><button class="btn secondary" data-action="pause">復習トップへ</button>` : revealed ? learningAnswer(q, value, s.uncertain[s.index]) : prompt}
    <div class="btnrow ${revealed ? 'learning-next-bar' : ''}"><button class="btn secondary" data-action="prev" ${s.index === 0 ? 'disabled' : ''}>前へ</button>${exam || answered ? `<button class="btn" id="next" data-action="next">${nextText} ${icon('arrow')}</button>` : `<button class="btn secondary" data-action="skip">${s.index === s.ids.length - 1 ? '回答一覧へ' : 'あとで解く'}</button>`}</div></article>
    <details class="exam-map" id="answer-map"><summary>回答一覧を開く <span class="muted">未回答 ${s.ids.length - done}問</span></summary><div class="number-grid">${s.ids.map((id,i) => { const a = s.answers[i], cls = a === null ? '' : exam ? 'done' : a === activeQuestion(id).a ? 'ok' : 'ng'; return `<button class="${cls} ${i === s.index ? 'current' : ''} ${s.flags[i] ? 'flagged' : ''}" data-action="jump" data-index="${i}" aria-label="問${i + 1} ${a === null ? '未回答' : exam ? '回答済み' : cls === 'ok' ? '正解' : '不正解'}${s.flags[i] ? '・見直し' : ''}">${i + 1}</button>`; }).join('')}</div><p class="hintline">${exam ? '番号は今回の出題順です。青＝回答済み · 点＝自信なし・見直し' : '緑＝正解 · 赤＝不正解'}</p></details><button class="textbtn wide" data-action="submit">${exam ? '模試を終了して採点する' : 'ここで学習を終了する'}</button><p class="muted">${exam ? '途中の回答は自動保存。別アプリ・別タブへの切り替えや中断中は、タイマーが止まります。' : '途中で戻っても、続きから再開できます。'}</p>`;
  updateTimer(); updateChrome();
}
function jump(i) {
  const s = state.session; if (!s) return; if (model.expired()) return finish(true);
  s.index = Math.max(0, Math.min(s.ids.length - 1, i)); save(); renderPlay(); window.scrollTo({top:0,behavior:'instant'}); focusQuestion();
}
function openMap() { $('answer-map').open = true; $('answer-map').scrollIntoView({block:'center',behavior:'instant'}); }
function submit() {
  const s = state.session; if (!s) return; if (model.expired()) return finish(true);
  const left = s.answers.filter(a => a === null).length;
  ask(s.mode === 'exam' ? left ? '模試を途中終了しますか？' : '模試を採点しますか？' : '学習を終了しますか？', left ? `未回答が${left}問あります。回答した問題だけで正答率を出し、未回答は復習に追加しません。${s.worksheet ? '合否・最高点の対象外として保存します。' : ''}` : 'すべての回答を保存し、結果と解説を表示します。', '結果を見る', () => { if (state.session?.attemptId === s.attemptId) finish(false); });
}
function finish(timeout = false) {
  if (!state.session || externalChange) return;
  closeDialogs(); lastResult = model.finish(timeout); state = model.state; reviewFilter = 'wrong';
  tab = lastResult.mode === 'mock' ? 'mock' : lastResult.mode === 'review' ? 'review' : 'learn';
  renderResult(true); show('result'); $('result-title')?.focus({preventScroll:true});
}
function updateTimer() {
  const s = state.session; if (s?.mode !== 'exam' || externalChange) return;
  const active = view === 'play' && !document.hidden && windowFocused && pageActive;
  if (active) model.resumeTimer(); else model.pauseTimer();
  if (model.conflicted) { updateChrome(); return; }
  if (model.expired()) { finish(true); return; }
  if (active && Date.now() - lastTimerCheckpoint >= 5000) { lastTimerCheckpoint = Date.now(); model.save(); updateChrome(); }
  const sec = Math.ceil(model.remaining() / 1000), el = $('timer');
  if (el) { el.textContent = `残り ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2,'0')}${s.timerPaused ? ' · 停止中' : ''}`; el.classList.toggle('low', sec <= 300); }
}
function resume() { if (!state.session) return navigate(tab); tab = state.session.mode === 'exam' ? 'mock' : state.session.kind === 'review' ? 'review' : 'learn'; lastResult = null; renderPlay(); if (state.session) show('play'); }
function reviewItem(id, value, i, uncertain = false) {
  const q = byId.get(id); if (!q) return `<p class="muted">問題ID ${esc(id)}の旧記録は書き出しに含まれています。</p>`;
  const ok = value === q.a;
  return `<details class="review-item"><summary><span class="answer-status ${ok ? 'ok' : ''}">${value === null ? '—' : ok ? '✓' : '×'}</span><span><span class="muted">出題${i + 1} · ${esc(q.topic)}${uncertain ? ' · 自信なし・見直し' : ''}</span>${q.worksheet && q.number ? `<br><small class="muted">元の問題：第${q.worksheet}回・問${q.number}</small>` : ''}<br>${esc(q.q)}</span></summary><div class="review-body"><p>あなたの回答：${value === null ? '未回答' : value ? '○' : '×'}</p>${questionArt(q, true)}${explanation(q, value, false)}</div></details>`;
}
// Weak-topic summaries are for the same saved content version only. Historical
// scores and their percentages always use the recorded scoreSnapshot.
function resultWeakGroups(r) {
  if (!r || r.legacy || (r.worksheet ? r.contentVersion !== model.worksheet(r.worksheet)?.contentVersion : r.contentVersion !== CONTENT_VERSION)) return [];
  const groups = new Map();
  r.ids.forEach((id,i) => {
    const q = activeQuestion(id); if (!q || typeof r.answers[i] !== 'boolean' || r.answers[i] === q.a) return;
    const c = CATS.find(c => c.extra ? q.isSupplemental : !q.isSupplemental && c.topics.includes(q.topic)) || {k:'other',label:'その他の基本',icon:'book'};
    if (!groups.has(c.k)) groups.set(c.k,{...c,ids:[]});
    groups.get(c.k).ids.push(id);
  });
  return [...groups.values()].sort((a,b) => b.ids.length - a.ids.length);
}
function resultComparison(r) {
  if (!r.worksheet || partialAttempt(r)) return r;
  const list = resultsFor(r.worksheet,r.mode,false).list.filter(a => a.contentVersion === r.contentVersion && !partialAttempt(a));
  const index = list.findIndex(a => a.attemptId === r.attemptId); if (index < 0) return r;
  const previous = list.slice(0,index), highest = previous.length ? Math.max(...previous.map(a => a.scoreSnapshot)) : null;
  return { previousScore: previous.at(-1)?.scoreSnapshot ?? null, bestScore: Math.max(r.scoreSnapshot,highest ?? 0), newBest: highest !== null && r.scoreSnapshot > highest };
}
function renderResult(animate = false) {
  const r = lastResult; if (!r) return;
  const wrong = r.ids.filter((id,i) => byId.has(id) && typeof r.answers[i] === 'boolean' && r.answers[i] !== byId.get(id).a), uncertain = r.ids.filter((id,i) => activeQuestion(id) && typeof r.answers[i] === 'boolean' && (r.flags?.[i] || r.uncertain?.[i]));
  const unanswered = r.ids.filter((id,i) => r.answers[i] === null), partial = partialAttempt(r), total = partial ? answeredCount(r) : r.total;
  const outdated = r.legacy || (r.worksheet ? r.contentVersion !== model.worksheet(r.worksheet)?.contentVersion : r.contentVersion !== CONTENT_VERSION);
  const canRetry = r.ids.every(id => activeQuestion(id));
  const practice50 = r.mode === 'guided', label = r.mode === 'mock' ? `第${r.worksheet}回・30分模試` : practice50 ? `第${r.worksheet}回・解説付き練習` : r.label || '学習';
  const groups = resultWeakGroups(r);
  const resultArt = !answeredCount(r) ? null : !partial && r.total > 0 && r.scoreSnapshot === r.total ? 'D006' : !partial && r.total === 50 && r.scoreSnapshot >= 45 ? 'D004' : 'D013';
  const comparison = resultComparison(r);
  const diff = comparison.previousScore === null || comparison.previousScore === undefined ? null : r.scoreSnapshot - comparison.previousScore;
  $('result').innerHTML = `<div class="playhead"><button class="btn secondary compact" data-action="tab" data-tab="${tab}">${icon('back')}一覧へ</button><span class="muted">${dateLabel(r.completedAt)}</span></div><article class="result-card"><h2 class="result-label" id="result-title" tabindex="-1">${esc(label)}の結果</h2><p class="result-greeting">おつかれさまでした！</p><div class="result-hero"><div><div class="score">${total ? `${r.scoreSnapshot}<small>/ ${total}問</small>` : '回答なし'}</div><p class="accuracy">${partial ? '回答した問題の正答率' : '正答率'} <strong>${total ? `${pct(r.scoreSnapshot,total)}<small>%</small>` : '—'}</strong></p></div>${resultArt ? characterArt(resultArt, `result-character${resultArt === 'D013' ? ' result-character-solo' : ''}`) : ''}</div>${r.timeout ? '<p class="muted">制限時間になったため50問で採点しました。未回答は0点ですが、学習の正答率・復習には含めません。</p>' : ''}${partial ? `<div class="notice partial-result">途中終了 · ${total} / ${r.total}問に回答。未回答${unanswered.length}問は正答率・復習に含めません。${r.worksheet ? '合否・最高点の対象外です。' : ''}</div>` : achievementHTML(r.scoreSnapshot, r.total, animate, r.mode === 'mock', ['mock','guided'].includes(r.mode))}${practice50 ? '<p class="muted">解説付き練習の成績です。30分模試とは別の記録になります。</p>' : ''}${['mock','guided'].includes(r.mode) && !outdated && !partial ? `<div class="comparison"><div><span>${diff === null ? '前回との比較' : '前回 ' + comparison.previousScore + '点から'}</span><b>${diff === null ? '<small>はじめての記録</small>' : diff === 0 ? '±0点' : (diff > 0 ? '+' : '') + diff + '点'}</b></div><div><span>${comparison.newBest ? '最高点を更新' : '今回までの最高点'}</span><b>${comparison.bestScore ?? r.scoreSnapshot}<small> / 50点</small></b></div></div>` : ''}${outdated ? '<div class="notice">得点は当時の保存値です。下の解説は現在の内容で、当時の採点と異なる場合があります。</div>' : ''}${groups.length ? `<section class="result-weak"><h3>あと${wrong.length}問を、次の得点に。</h3><p class="muted">分野を選んで、間違えた問題を復習。</p><div class="weak-topics">${groups.map(g => `<button class="weak-topic" data-action="result-topic" data-cat="${g.k}">${icon(g.icon)}<span>${esc(g.extra ? '補足の学習' : g.label)}</span><strong>${g.ids.length}<small>問</small></strong>${icon('chevron')}</button>`).join('')}</div></section>` : ''}<div class="result-actions">${canRetry && (wrong.length || uncertain.length) ? `<button class="btn" data-action="result-retry">${wrong.length ? `間違えた${wrong.length}問を復習` : `自信なし・見直しの${uncertain.length}問を復習`} ${icon('repeat')}</button>` : `<button class="btn" data-action="tab" data-tab="${tab}">${tab === 'mock' ? '模試一覧へ' : '学習を続ける'} ${icon('arrow')}</button>`}${canRetry && unanswered.length ? `<button class="btn secondary" data-action="result-unanswered">未回答の${unanswered.length}問を学ぶ ${icon('book')}</button>` : ''}${r.worksheet && canRetry ? `<button class="btn secondary" data-action="start-guided" data-set="${r.worksheet}">この回を解説付きで練習</button>` : ''}${canRetry && (wrong.length || uncertain.length) ? `<button class="btn secondary" data-action="tab" data-tab="${tab}">${icon('back')}一覧へ戻る</button>` : ''}</div></article><div class="section-heading"><h3>回答を振り返る</h3></div>${filters('result-filter', reviewFilter, [['wrong','間違い'],['unanswered','未回答'],['uncertain','自信なし'],['all','すべて']])}${r.ids.map((id,i) => ({id,i})).filter(({id,i}) => reviewFilter === 'all' || (reviewFilter === 'unanswered' ? r.answers[i] === null : typeof r.answers[i] === 'boolean' && (reviewFilter === 'uncertain' ? r.flags?.[i] || r.uncertain?.[i] : byId.has(id) && r.answers[i] !== byId.get(id).a))).map(({id,i}) => reviewItem(id,r.answers[i],i,r.flags?.[i] || r.uncertain?.[i])).join('') || '<div class="empty">該当する問題はありません。「すべて」で全回答を確認できます。</div>'}`;
}
function findAttempt(id) { return [...state.attempts, ...Object.values(state.guidedResults).flatMap(r => [...r.recent,r.best]), ...Object.values(state.mockResults).flatMap(r => [...r.recent,r.best])].find(a => a?.attemptId === id); }
function noteIds(n) { return Q.filter(q => n.figs.includes(q.fig)).map(q => q.id); }
function renderNotes(target = view === 'learn' && learnSection === 'notes' ? 'learn-notes' : 'notes') {
  if (target === 'learn-notes') $('notes').innerHTML = '';
  else if ($('learn-notes')) $('learn-notes').innerHTML = '';
  const search = noteSearch.trim().toLowerCase(), visible = NOTES.filter(n => (!search || [n.t,...n.pts,n.trap].join(' ').toLowerCase().includes(search)) && (!noteFilter || noteCategory(n).k === noteFilter)).sort((a,b) => Number(noteIds(b).length > 0) - Number(noteIds(a).length > 0));
  const groups = [...CATS,{k:'other',label:'その他の基本',icon:'book'}].map(c => ({...c,notes:visible.filter(n => noteCategory(n).k === c.k)})).filter(c => c.notes.length);
  $(target).innerHTML = `${target === 'notes' ? `<button class="btn secondary compact" data-action="note-return">${icon('back')}${noteReturn?.view === 'play' ? '解いていた問題に戻る' : noteReturn?.view === 'result' ? '結果に戻る' : '学習に戻る'}</button><div class="page-heading notes-heading"><div><h2>図解ノート</h2><p class="muted">要点をつかんで、問題で確かめよう。</p></div><img class="section-character" src="./image-a5b30a44fd43.png" width="332" height="380" alt="DON!DON!ドライブのロボット教官" loading="lazy" decoding="async"></div>` : '<p class="muted learn-notes-intro">重要なポイントを、図で整理。</p>'}<div class="toolbar"><label class="sr-only" for="note-search">図解ノートを検索</label><input id="note-search" type="search" placeholder="例：横断歩道、徐行" value="${esc(noteSearch)}"><label class="sr-only" for="note-filter">分野</label><select id="note-filter"><option value="">全分野</option>${CATS.map(c => `<option value="${c.k}" ${noteFilter === c.k ? 'selected' : ''}>${esc(c.extra ? '補足' : c.label)}</option>`).join('')}</select></div><p class="muted">${visible.length} / ${NOTES.length}テーマ</p><div class="note-groups">${groups.map(c => `<section class="note-group"><h3 class="note-group-title">${icon(c.icon)}${esc(c.extra ? '補足' : c.label)}<small>${c.notes.length}テーマ</small></h3><div class="note-grid">${c.notes.map(n => `<details class="note" id="${n.id}" data-note="${n.id}"><summary>${noteThumbnail(n)}<span class="note-summary-copy"><strong>${esc(n.t)}</strong><small>図解 ${n.figs.length}点 · 要点 ${n.pts.length}つ</small><small>${noteIds(n).length ? `対応 ${noteIds(n).length}問` : '参考ノート'}</small></span></summary><div class="note-content"></div></details>`).join('')}</div></section>`).join('') || '<div class="empty note-empty"><p>見つかりませんでした。別の言葉で探してください。</p><button class="textbtn" data-action="note-reset">検索と分野をリセット</button></div>'}</div>`;
}
function populateNote(el) {
  if (el.dataset.loaded) return; const n = NOTES.find(n => n.id === el.dataset.note); if (!n) return;
  const ids = noteIds(n);
  el.querySelector('.note-content').innerHTML = `<div class="note-keypoints"><h3>押さえるポイント</h3><ul>${n.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>${n.figs.map(figHTML).join('')}<div class="note-caution"><div class="caution-heading"><h3>間違えやすいところ</h3>${characterArt('D042','caution-guide')}</div><p>${esc(n.trap)}</p></div><div class="note-bottom">${ids.length ? `<button class="btn" data-action="note-drill" data-note="${n.id}">対応する${Math.min(10,ids.length)}問を学ぶ ${icon('arrow')}</button>` : '<p class="muted">参考用のノートです。現在の500問に対応する設問はありません。</p>'}<a class="source-link" href="${esc(['n-speed','n-speed-new'].includes(n.id) ? REFS.speed.url : n.id === 'n-cycle-new' ? REFS.bicycle.url : n.id === 'n-veh' ? REFS.moped.url : REFS.rules.url)}" target="_blank" rel="noopener">公式資料で確認 ↗</a></div>`;
  el.dataset.loaded = 'true';
}
function openNotes(id = null) {
  if (state.session?.mode === 'exam') { toast('模試を採点してから開けます。'); return; }
  if (view !== 'notes') noteReturn = { view, tab, scroll: window.scrollY };
  noteSearch = ''; noteFilter = ''; noteComposing = false; tab = 'learn'; renderNotes('notes'); show('notes');
  if (id && $(id)) { populateNote($(id)); $(id).open = true; $(id).scrollIntoView({block:'start',behavior:'instant'}); }
}
function settings() {
  const exam = state.session?.mode === 'exam';
  $('settings-content').innerHTML = `<div class="settings-group"><h3>画面の明るさ</h3><div class="seg">${[['auto','自動'],['light','ライト'],['dark','ダーク']].map(([k,t]) => `<button data-action="theme" data-value="${k}" aria-pressed="${state.theme === k}">${t}</button>`).join('')}</div></div><div class="settings-group"><h3>効果音</h3><div class="seg">${[[true,'オン'],[false,'オフ']].map(([v,t]) => `<button data-action="sound" data-value="${v}" aria-pressed="${state.sound === v}">${t}</button>`).join('')}</div><p class="muted">学習で答えたときに鳴ります。模試中は鳴りません。</p></div><div class="settings-group"><label class="confidence-control"><input id="reduce-motion" type="checkbox" ${state.reduceMotion ? 'checked' : ''}>動きを抑える</label><p class="muted">端末の「視差効果を減らす」設定にも対応します。</p><button class="textbtn" data-action="preview" data-score="45">花丸の見本を見る ${icon('arrow')}</button></div><div class="settings-group"><h3>学習記録を引き継ぐ</h3><p class="muted">成績・復習予定・途中の回答・以前の記録をJSONで保管できます。</p><div class="btnrow"><button class="btn secondary" data-action="export">書き出す</button><button class="btn secondary" data-action="import" ${exam ? 'disabled' : ''}>読み込む</button></div></div><div class="settings-group"><button class="textbtn" data-action="archive" ${exam ? 'disabled' : ''}>以前の学習記録を見る ${icon('arrow')}</button><p class="muted">旧50問練習、判定A〜C、以前の問題の回答を保管しています。</p></div><div class="settings-group"><button class="textbtn danger" data-action="reset" ${state.session ? 'disabled' : ''}>現在の学習記録を初期化する</button>${state.session ? '<p class="muted">途中の学習を終えると初期化できます。</p>' : ''}</div>`;
  $('settings-content').insertAdjacentHTML('afterbegin', window.KarimenHomeInstall?.settingsMarkup() || '');
  if (!$('settings').open) $('settings').showModal();
}
function renderArchive() {
  const a = state.legacyArchive, records = Object.entries(a.stats || {}), history = [...(a.history || []), ...Object.values(a.checks || {}).map(c => c?.first).filter(Boolean)];
  $('archive').innerHTML = `<button class="btn secondary compact" data-action="tab" data-tab="learn">${icon('back')}学習に戻る</button><div class="page-heading"><h2>以前の学習記録</h2><p class="muted">当時の記録を保管しています。新しい模試の合格数には含めません。</p></div><div class="card"><h3>解説付き50問練習</h3>${WORKSHEETS.map(w => { const r = resultsFor(w.worksheet,'guided',false); return r.best ? `<div class="history-row"><span>第${w.worksheet}回</span><b>最高 ${r.best.scoreSnapshot}点</b><button class="textbtn" data-action="detail" data-set="${w.worksheet}">記録を見る</button></div>` : ''; }).join('') || '<p class="muted">以前の50問練習の記録はありません。</p>'}</div><h3 class="section-heading">以前のテスト</h3>${history.length ? history.map(h => `<details class="review-item"><summary>${esc(h.form ? '判定テスト ' + h.form : '以前のランダム模試')} · ${esc(h.score ?? h.scoreSnapshot ?? '—')}点 <span class="muted">${dateLabel(h.at || h.completedAt)}</span></summary><div class="review-body"><p class="muted">得点は当時の保存値です。解説は現在保管されている内容です。</p>${Array.isArray(h.ids) ? h.ids.map((id,i) => reviewItem(id,h.answers?.[i] ?? null,i)).join('') : '<p>得点のみの記録です。</p>'}</div></details>`).join('') : '<p class="muted">以前のテスト記録はありません。</p>'}<h3 class="section-heading">以前の問題への回答</h3><p class="muted">${records.length}問の回答記録を保管しています。</p>${records.length ? `<details class="review-item"><summary>回答記録を開く</summary>${records.map(([id,s]) => `<div class="history-row"><span>${esc(byId.get(Number(id))?.q || '問題ID ' + id)}<small>回答 ${esc(s.total ?? 0)}回 · 正解 ${esc(s.correct ?? 0)}回</small></span></div>`).join('')}</details>` : ''}<h3 class="section-heading">保管した途中記録</h3>${(a.sessions || []).length ? a.sessions.map(s => `<div class="card"><p>${esc(s.label || '以前の出題')}</p><p class="muted">${(Array.isArray(s.answers) ? s.answers : []).filter(v => v !== null).length} / ${s.ids?.length || 0}問 回答済み</p><p class="muted">出題内容が変わったため、自動的に採点・差し替えはしていません。</p></div>`).join('') : '<p class="muted">保管した途中記録はありません。</p>'}<div class="stack"><button class="btn secondary" data-action="export">以前の記録も含めて書き出す</button></div>`;
}
function downloadRecord() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(model.exportData(),null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = '仮免_学習記録_' + new Date().toISOString().slice(0,10) + '.json'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  toast('記録の書き出しを開始しました。ダウンロードを確認してください。');
}
async function importRecord(file) {
  if (!file || state.session?.mode === 'exam') return;
  if (file.size > 20000000) { toast('20MB以下の学習記録JSONを選んでください。'); return; }
  let raw; try { raw = JSON.parse(await file.text()); if (raw.kind !== 'karimen-progress') throw new Error(); model.validateImport(raw); } catch { toast('このドリルから書き出した学習記録JSONを選んでください。'); return; }
  if (externalChange || state.session?.mode === 'exam') { toast('画面の状態が変わりました。模試の終了後、または再読み込み後に読み込んでください。'); return; }
  $('settings').close(); ask('学習記録を読み込みますか？','表示する記録をこのファイルに切り替えます。現在の記録も保管され、書き出しに含まれます。途中の模試は、書き出した時点の残り時間を引き継ぎます。','読み込む',() => { const ok = model.importData(raw); state = model.state; lastResult = null; theme(); navigate('mock'); updateTimer(); toast(ok ? '学習記録を読み込みました。' : '読み込みましたが保存できませんでした。書き出して保管してください。'); });
}
function preview(score) {
  const n = [44,45,48,50].includes(Number(score)) ? Number(score) : 45;
  $('settings').close(); $('achievement-preview-body').innerHTML = `<div class="score">${n}<small>/ 50問</small></div>${achievementHTML(n,50,true,true)}`;
  $('achievement-preview').querySelectorAll('[data-action="preview"]').forEach(b => b.setAttribute('aria-pressed',String(Number(b.dataset.score) === n)));
  if (!$('achievement-preview').open) $('achievement-preview').showModal();
}
function openQuestionArt(id, revealed) {
  const q = byId.get(id); if (!q) return;
  if (state.session?.mode === 'exam') revealed = false;
  $('figure-content').innerHTML = questionArt(q,revealed,true); $('figure-zoom').value = '100'; $('figure-content').style.width = '100%'; $('figure-dialog').showModal();
}
function openFigure(k) { if (state.session?.mode === 'exam' || !FIG[k]) return; $('figure-content').innerHTML = figHTML(k); $('figure-content').style.width = '100%'; $('figure-zoom').value = '100'; $('figure-dialog').showModal(); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b || b.disabled || externalChange) return;
  const a = b.dataset.action, s = state.session;
  if (a === 'tab') navigate(b.dataset.tab);
  else if (a === 'mock-filter') { mockFilter = b.dataset.filter; renderMock(); }
  else if (a === 'category-filter') { categoryFilter = b.dataset.filter; renderLearn(); }
  else if (a === 'detail') detail(Number(b.dataset.set));
  else if (a === 'close-detail') $('detail').close();
  else if (a === 'start-mock' || a === 'start-guided') startSet(Number(b.dataset.set),a === 'start-mock' ? 'mock' : 'guided');
  else if (a === 'resume') resume();
  else if (a === 'quick-study') startStudy(studySelection(Q), '10問の学習');
  else if (a === 'category') { const c = CATS.find(c => c.k === b.dataset.cat); if (c) { let list = categorized(c); if (categoryFilter === 'new') list = list.filter(q => !state.stats[q.id]?.total); if (categoryFilter === 'weak') list = list.filter(weak); startStudy(studySelection(list), c.extra ? '補足の学習' : c.label, categoryFilter === 'weak' ? 'review' : 'study'); } }
  else if (a === 'due') startStudy(model.schedule().due.slice(0,10).map(q => q.id),'今日の復習','review');
  else if (a === 'review-ready') startStudy(model.schedule().due.map(q => q.id),'今すぐ復習','review');
  else if (a === 'review-one') { const q = activeQuestion(b.dataset.id); if (q && model.due(q.id)) startStudy([q.id],'今すぐ復習','review'); }
  else if (a === 'review-more') { reviewMore = true; renderReview(); }
  else if (a === 'answer') { const exam = s?.mode === 'exam', ok = model.answer(b.dataset.value === 'true',Boolean($('uncertain')?.checked)); if (!model.state.session) { lastResult = model.state.lastResult; renderResult(true); show('result'); } else { if (ok && !exam) sfx(activeQuestion(s.ids[s.index]).a === (b.dataset.value === 'true')); renderPlay(); if (!exam && ok) requestAnimationFrame(() => { const feedback = $('play').querySelector('.feedback'); feedback?.focus({preventScroll:true}); ($('play').querySelector('.answer-layout') || feedback)?.scrollIntoView({block:'start',behavior:'instant'}); }); } }
  else if (a === 'next' && s) { if (s.index === s.ids.length - 1) submit(); else jump(s.index + 1); }
  else if (a === 'prev' && s) jump(s.index - 1);
  else if (a === 'skip' && s) s.index === s.ids.length - 1 ? openMap() : jump(s.index + 1);
  else if (a === 'jump') jump(Number(b.dataset.index));
  else if (a === 'flag' && s?.mode === 'exam') { if (model.expired()) return finish(true); s.flags[s.index] = !s.flags[s.index]; save(); renderPlay(); }
  else if (a === 'unanswered' && s) { const i = s.ids.map((_,i) => (s.index + i + 1) % s.ids.length).find(i => s.answers[i] === null); if (i === undefined) openMap(); else jump(i); }
  else if (a === 'submit') submit();
  else if (a === 'pause') { if (s?.mode === 'exam') ask('模試を中断しますか？','回答と残り時間を保存して、タイマーを止めます。「続きへ」から同じ問題・残り時間で再開できます。','保存して一覧へ',() => navigate('mock')); else navigate(tab); }
  else if (a === 'result-filter') { reviewFilter = b.dataset.filter; renderResult(); }
  else if (a === 'result-topic' && lastResult) { const group = resultWeakGroups(lastResult).find(g => g.k === b.dataset.cat); if (group) startStudy(group.ids,group.label + 'の復習','review'); }
  else if (a === 'result-retry' && lastResult) { const r = lastResult, wrong = r.ids.filter((id,i) => activeQuestion(id) && typeof r.answers[i] === 'boolean' && r.answers[i] !== activeQuestion(id).a), ids = wrong.length ? wrong : r.ids.filter((id,i) => activeQuestion(id) && typeof r.answers[i] === 'boolean' && (r.flags?.[i] || r.uncertain?.[i])); startStudy(ids,'今回の回答の復習','review'); }
  else if (a === 'result-unanswered' && lastResult) startStudy(lastResult.ids.filter((id,i) => activeQuestion(id) && lastResult.answers[i] === null),'未回答の問題');
  else if (a === 'stored-result') { if (s?.mode === 'exam') return; const r = findAttempt(b.dataset.id); if (r) { $('detail').close(); lastResult = r; reviewFilter = 'wrong'; tab = r.mode === 'mock' ? 'mock' : 'learn'; renderResult(); show('result'); } }
  else if (a === 'learn-section') { learnSection = b.dataset.section; renderLearn(); $('learn-tab-' + learnSection).focus({preventScroll:true}); }
  else if (a === 'notes') openNotes();
  else if (a === 'note') openNotes(b.dataset.id);
  else if (a === 'note-reset') { noteSearch = ''; noteFilter = ''; renderNotes(); $('note-search').focus(); }
  else if (a === 'note-return') { const ret = noteReturn; if (ret && ['play','result'].includes(ret.view)) { tab = ret.tab; show(ret.view,false); window.scrollTo({top:ret.scroll,behavior:'instant'}); } else navigate('learn'); }
  else if (a === 'note-drill') { const n = NOTES.find(n => n.id === b.dataset.note); if (n) startStudy(studySelection(noteIds(n).map(id => activeQuestion(id))),n.t); }
  else if (a === 'question-zoom') openQuestionArt(Number(b.dataset.id),b.dataset.revealed === 'true');
  else if (a === 'figure-open') openFigure(b.dataset.fig);
  else if (a === 'close-figure') $('figure-dialog').close();
  else if (a === 'settings') settings();
  else if (a === 'close-settings') $('settings').close();
  else if (a === 'theme') { state.theme = b.dataset.value; save(); theme(); settings(); }
  else if (a === 'sound') { state.sound = b.dataset.value === 'true'; save(); settings(); if (state.sound) sfx(true); }
  else if (a === 'preview') preview(b.dataset.score);
  else if (a === 'close-preview') { $('achievement-preview').close(); settings(); }
  else if (a === 'export') downloadRecord();
  else if (a === 'import') $('import-file').click();
  else if (a === 'archive') { if (s?.mode === 'exam') return; $('settings').close(); tab = 'learn'; renderArchive(); show('archive'); }
  else if (a === 'dismiss-notice') { state.notices = []; save(); }
  else if (a === 'reset') { $('settings').close(); ask('現在の学習記録を初期化しますか？','新しい模試・練習の成績、復習予定、アプリ内に保管した以前の記録を初期化します。必要な記録は先に書き出してください。移行前の元データには触れません。','初期化する',() => { const ok = model.reset(); state = model.state; lastResult = null; theme(); navigate('mock'); toast(ok ? '現在の学習記録を初期化しました。' : '初期化を保存できませんでした。'); }); }
});
document.addEventListener('toggle', e => { if (e.target.matches?.('details.note') && e.target.open) populateNote(e.target); },true);
document.addEventListener('change', e => {
  if (externalChange) return;
  if (e.target.id === 'uncertain' && state.session?.mode === 'drill') { state.session.uncertain[state.session.index] = e.target.checked; save(); }
  if (e.target.id === 'reduce-motion') { state.reduceMotion = e.target.checked; save(); theme(); }
  if (e.target.id === 'note-filter') { noteFilter = e.target.value; renderNotes(); }
  if (e.target.id === 'import-file') { importRecord(e.target.files[0]); e.target.value = ''; }
});
function searchNotes(input) {
  const start = input.selectionStart, end = input.selectionEnd;
  noteSearch = input.value; renderNotes(); $('note-search').focus({preventScroll:true});
  try { $('note-search').setSelectionRange(start,end); } catch {}
}
document.addEventListener('compositionstart', e => { if (e.target.id === 'note-search') noteComposing = true; });
document.addEventListener('compositionend', e => {
  if (e.target.id === 'note-search') { noteComposing = false; searchNotes(e.target); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'figure-zoom') $('figure-content').style.width = e.target.value + '%';
  if (e.target.id === 'note-search' && !noteComposing && !e.isComposing) searchNotes(e.target);
});
$('confirm-yes').addEventListener('click', () => { const action = modalAction; modalAction = null; $('confirm').close(); if (!externalChange) action?.(); });
$('confirm-no').addEventListener('click', () => { $('confirm').close(); modalAction = null; });
$('confirm').addEventListener('cancel', () => modalAction = null);
$('tabs').addEventListener('keydown', e => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return; const buttons = [...$('tabs').querySelectorAll('button:not(:disabled)')]; let i = buttons.indexOf(document.activeElement); if (i < 0) return; e.preventDefault(); i = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length; buttons[i].click(); buttons[i].focus(); });
function refreshAfterReturn() { if (externalChange) return; updateTimer(); if (view === 'review') renderReview(); if (view === 'learn') renderLearn(); updateChrome(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) updateTimer(); else { windowFocused = document.hasFocus(); refreshAfterReturn(); } });
window.addEventListener('blur', () => { windowFocused = false; updateTimer(); });
window.addEventListener('focus', () => { windowFocused = true; refreshAfterReturn(); });
window.addEventListener('pagehide', () => { pageActive = false; updateTimer(); });
window.addEventListener('pageshow', () => { pageActive = true; windowFocused = document.hasFocus(); refreshAfterReturn(); });
window.addEventListener('storage', e => { if ((e.key === KarimenModel.STORE || e.key === null) && e.newValue !== JSON.stringify(state)) { externalChange = true; closeDialogs(); updateChrome(); } });
matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',theme);
$('brandmark').innerHTML = icon('road'); $('settings-button').innerHTML = icon('settings');
$('nav-mock').innerHTML = icon('license'); $('nav-learn').innerHTML = icon('book'); $('nav-review').innerHTML = icon('repeat');
theme(); navigate('mock'); updateTimer(); setInterval(updateTimer,500);
window.KarimenHomeInstall?.init({
  canPrompt: () => view === 'mock' && !state.session && !externalChange,
  canGuide: () => view !== 'play' && state.session?.mode !== 'exam' && !externalChange,
  hasProgress: () => Boolean(state.session || state.attempts.length || Object.keys(state.stats).length),
  openSettings: settings,
  exportRecord: downloadRecord
});

let displayedReviewDue = '';
setInterval(() => {
  if (document.hidden || externalChange) return;
  document.querySelectorAll('[data-review-at]').forEach(el => {
    const label = reviewWait(Number(el.dataset.reviewAt));
    if (el.textContent !== label) el.textContent = label;
  });
  if (view === 'play' && state.session?.kind === 'review' && $('play').querySelector('[data-review-at]') && !$('play').querySelector('[data-action="answer"]') && state.session.answers[state.session.index] === null && model.due(state.session.ids[state.session.index])) renderPlay();
  if (view !== 'review') return;
  const signature = model.schedule().due.map(q => q.id).join(',');
  if (signature !== displayedReviewDue) {
    const focused = document.activeElement, action = focused?.dataset?.action, id = focused?.dataset?.id;
    const inside = $('review').contains(focused), open = $('review').querySelector('.review-graduation')?.open;
    displayedReviewDue = signature; renderReview();
    if (open) $('review').querySelector('.review-graduation').open = true;
    if (inside) {
      const target = [...$('review').querySelectorAll('[data-action]')].find(el => el.dataset.action === action && el.dataset.id === id);
      (target || $('review').querySelector('.review-graduation summary'))?.focus({preventScroll:true});
    }
    updateChrome();
  }
},1000);

document.addEventListener('keydown', e => {
  if (!e.target.matches('.learn-switch [role="tab"]') || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
  e.preventDefault();
  const key = e.key === 'Home' ? 'categories' : e.key === 'End' ? 'notes' : learnSection === 'notes' ? 'categories' : 'notes';
  $('learn-tab-' + key).click();
});
