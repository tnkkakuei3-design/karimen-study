let actx = null, soundRequest = 0;
// Recreate on the next answer gesture after leaving the page. iOS can keep an
// interrupted (or even apparently running) context silent after returning.
function releaseSound() {
  soundRequest++;
  const previous = actx;
  actx = null;
  if (previous && previous.state !== 'closed') {
    try { Promise.resolve(previous.close()).catch(() => {}); } catch {}
  }
}
async function sfx(ok) {
  if (state.sound === false || document.hidden) return;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    if (actx && (actx.state === 'interrupted' || actx.state === 'closed')) releaseSound();
    const ctx = actx || (actx = new C());
    const request = ++soundRequest, requestedAt = Date.now();
    if (ctx.state !== 'running') await ctx.resume();
    // Never play an old answer after a delayed unlock, backgrounding, or mute.
    if (ctx !== actx || request !== soundRequest || ctx.state !== 'running' ||
        document.hidden || state.sound === false || Date.now() - requestedAt > 800) return;
    const t = ctx.currentTime, g = ctx.createGain();
    g.connect(ctx.destination);
    let remaining = 2;
    const tone = (f, st, d, type, vol) => {
      const o = ctx.createOscillator(), v = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t + st);
      v.gain.setValueAtTime(0.0001, t + st);
      v.gain.exponentialRampToValueAtTime(vol, t + st + 0.015);
      v.gain.exponentialRampToValueAtTime(0.0001, t + st + d);
      o.connect(v); v.connect(g);
      o.onended = () => { o.disconnect(); v.disconnect(); if (--remaining === 0) g.disconnect(); };
      o.start(t + st); o.stop(t + st + d + 0.02);
    };
    if (ok) { tone(988, 0, 0.16, 'sine', 0.25); tone(1319, 0.13, 0.32, 'sine', 0.25); }
    else {
      tone(196, 0, 0.32, 'square', 0.09); tone(185, 0.02, 0.32, 'sawtooth', 0.06);
      try { navigator.vibrate && navigator.vibrate(120); } catch {}
    }
  } catch { releaseSound(); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseSound(); });
window.addEventListener('pagehide', releaseSound);
window.addEventListener('blur', releaseSound);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId = new Map(BANK.map(q => [q.id, q]));
const progressStorage = window.KarimenProgressStorage || { getItem: k => window.localStorage.getItem(k), setItem: (k, v) => window.localStorage.setItem(k, v) };
const model = KarimenModel.create({ storage: progressStorage });
let state = model.state, tab = 'mock', view = 'mock', mockFilter = 'all', categoryFilter = 'all', categorySort = 'default', learnSection = 'categories';
let lastResult = null, reviewFilter = 'wrong', noteReturn = null, toastTimer = null, modalAction = null;
let noteSearch = '', noteFilter = '', noteComposing = false, reviewMore = false, externalChange = false;
let windowFocused = document.hasFocus(), pageActive = true, lastTimerCheckpoint = 0;
let displayedReviewSignature = '';
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
  state = model.state; externalChange ||= model.conflicted || Boolean(progressStorage.conflict);
  const saving = progressStorage.status;
  const saveWarning = model.error || saving?.message || (saving && !saving.primarySaved && !saving.backupSaved && saving.pending ? '学習記録を自動保存しています。完了までこの画面を開いてお待ちください。' : '');
  $('storage-warning').hidden = !saveWarning && !externalChange;
  $('storage-warning').textContent = externalChange ? '別のタブで記録が更新されました。重複を防ぐため操作を止めています。再読み込みして続けてください。' : saveWarning;
  if ($('save-status')) $('save-status').textContent = saveWarning || (saving?.backupSaved ? '自動保存・バックアップ済み' : '自動保存済み');
  const locked = state.session?.mode === 'exam';
  const focusedExam = locked && view === 'play';
  $('tabs').hidden = view === 'play';
  document.body.classList.toggle('play-active', view === 'play');
  document.body.classList.toggle('focused-view', ['play','result'].includes(view));
  document.body.classList.toggle('exam-active', focusedExam);
  for (const k of ['mock', 'learn', 'review']) { const b = $('tab-' + k); b.disabled = focusedExam && k !== 'mock'; b.setAttribute('aria-selected', String(k === tab)); b.tabIndex = k === tab ? 0 : -1; }
  $('review-dot').hidden = model.schedule().due.length === 0;
  $('footer').hidden = locked || ['play','result','notes','town'].includes(view);
  $('migration-notice').hidden = locked || !state.notices.length || !['mock','learn','review'].includes(view);
  $('migration-notice').innerHTML = state.notices.map(t => `<p>${esc(t)}</p>`).join('') + '<button class="textbtn" data-action="dismiss-notice">確認しました</button>';
  window.KarimenHomeInstall?.sync();
}
function show(name, top = true) {
  document.body.classList.toggle('town-active',name==='town');
  view = name; for (const k of ['mock','learn','review','play','result','notes','archive','town']) $(k).hidden = k !== name;
  window.KarimenTown?.onView(name);
  updateTimer(); updateChrome(); if (top) { window.scrollTo({ top: 0, behavior:'instant' }); $('main').focus({ preventScroll: true }); }
}
function navigate(k) {
  if (!['mock','learn','review'].includes(k)) return;
  if (state.session?.mode === 'exam' && k !== 'mock' && !model.suspend()) { updateChrome(); return; }
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
function entryCard(action, title, description, glyph = 'play', mode = '') {
  return `<button class="recommend${action === 'resume' ? ' resume-card' : ''}" data-action="${action}"${mode ? ` data-mode="${mode}"` : ''}>${icon(glyph)}<span class="recommend-copy"><strong>${esc(title)}</strong><small>${esc(description)}</small></span>${icon('arrow')}</button>`;
}
function recentMockSummary(r) {
  const recent = r.list.filter(a => !partialAttempt(a)).slice(-3);
  return recent.length ? `直近${recent.length}回：${recent.map(a => a.scoreSnapshot + '点').join(' → ')}` : '';
}
function renderMock() {
  const passed = WORKSHEETS.filter(w => (resultsFor(w.worksheet, 'mock').best?.scoreSnapshot ?? -1) >= 45).length;
  const s = model.sessionFor('mock'), list = WORKSHEETS.filter(w => { const r = resultsFor(w.worksheet, 'mock'); return mockFilter === 'all' || (mockFilter === 'new' ? !r.last : (r.best?.scoreSnapshot ?? -1) < 45); });
  $('mock').innerHTML = `<div class="home-intro"><div><h2>仮免模試</h2><p class="muted">${s?.mode === 'exam' ? '中断した模試を再開できます。' : '50問・30分で、力だめし。'}</p></div><img class="home-character" src="./image-155cadc1029a.png" width="1400" height="792" alt="プーリーくんとよりともさん"></div><div class="page-heading mock-heading"><h3>教習問題ベースの模試</h3><p class="inline muted">10回・各50問 <span class="badge">毎回ランダム順</span></p></div>
    <div class="home-overview"><div class="achievement-progress"><div class="inline"><span><b>${passed}</b><small> / 10回 合格</small></span><small class="muted">達成率 ${passed * 10}%</small></div><div class="progress" role="progressbar" aria-label="模試の合格回数" aria-valuenow="${passed}" aria-valuemin="0" aria-valuemax="10"><i style="width:${passed * 10}%"></i></div></div></div>${window.KarimenTown?.teaser() || ''}
    ${s?.mode === 'exam' ? entryCard('resume', `第${s.worksheet}回の続きへ`, `${s.answers.filter(a => a !== null).length} / 50問 回答済み · タイマー停止中`, 'play', 'mock') : ''}
    ${filters('mock-filter', mockFilter, [['all','すべて'],['new','未受験'],['unpassed','未合格']])}
    <div class="mock-grid">${list.map(w => { const r = resultsFor(w.worksheet, 'mock'), on = s?.mode === 'exam' && s.worksheet === w.worksheet, score = r.best?.scoreSnapshot;
      return `<button class="set-card ${on ? 'in-progress' : ''} ${score === 50 ? 'perfect' : ''}" data-action="detail" data-set="${w.worksheet}" aria-label="第${w.worksheet}回 ${on ? '受験中 ' : ''}${r.last ? `直近${r.last.scoreSnapshot}点 ${r.last.scoreSnapshot >= 45 ? '合格' : '未合格'} 最高${score}点` : '未受験'}"><span class="mock-card-heading"><b>第${w.worksheet}回</b>${score >= 45 ? flowerStamp(score === 50 ? '満点' : '合格') : `<span class="chevron">${icon('chevron')}</span>`}</span>${r.last ? `<span class="mock-latest"><small>直近</small><strong>${r.last.scoreSnapshot}<span>点</span></strong><small class="mock-outcome ${r.last.scoreSnapshot >= 45 ? 'is-pass' : ''}">${r.last.scoreSnapshot >= 45 ? '合格' : '未合格'}</small></span><small class="mock-best">最高 ${score}点${on ? ' · 受験中' : ''}</small>` : `<span class="mock-unanswered">${on ? '受験中' : '未受験'}</span>`}</button>`; }).join('')}</div>
    ${!list.length ? '<div class="empty"><h3>この条件の回はありません</h3><p>「すべて」から各回の記録を確認できます。</p></div>' : ''}
    <details class="score-note"><summary>成績の見方</summary><p class="legacy-label">花丸・合格数は最高点の実績です。直近の成績には途中終了を含みません。解説は採点後に表示します。以前の解説付き練習の記録は、各回の詳細で確認できます。</p></details>`;
}
function attemptRows(list, label) {
  return list.slice(-10).reverse().map(a => { const partial = partialAttempt(a), total = partial ? answeredCount(a) : a.total;
    return `<div class="history-row"><div>${label}<small>${dateLabel(a.completedAt)}${a.legacy ? ' · 旧版の記録' : partial ? ' · 途中終了' : ''}</small></div><b>${total ? `${a.scoreSnapshot}<small> / ${total}${partial ? '問' : '点'}</small>` : '回答なし'}</b><button class="textbtn" data-action="stored-result" data-id="${esc(a.attemptId)}">回答を見る</button></div>`;
  }).join('');
}
function detail(n) {
  const w = model.worksheet(n); if (!w) return;
  const savedMock = model.sessionFor('mock');
  if (savedMock?.worksheet === w.worksheet) { resume('mock'); return; }
  const mock = resultsFor(w.worksheet, 'mock'), guided = resultsFor(w.worksheet, 'guided', false);
  const olderMocks = resultsFor(w.worksheet, 'mock', false).list.filter(a => a.contentVersion !== w.contentVersion);
  $('detail-content').innerHTML = `<span class="badge">教習問題ベース</span><h2 id="detail-title">第${w.worksheet}回</h2><div class="details-list"><div><b>50問</b><span>毎回ランダムな順番で出題</span></div><div><b>30分</b><span>採点後に解説</span></div></div><p class="detail-pass">45点以上で、このアプリ内の合格です。</p><p class="detail-timer muted">${icon('clock')}中断中や別アプリを開いている間は、タイマーが止まります。</p><div class="stack"><button class="btn wide" data-action="start-mock" data-set="${w.worksheet}">30分模試を始める ${icon('arrow')}</button><button class="btn secondary wide" data-action="start-guided" data-set="${w.worksheet}">この回を解説付きで練習</button></div><details class="detail-rules"><summary>模試のルール・問題の内訳</summary><div class="detail-rules-body"><h3>出題の順番</h3><p>この回の50問を、開始するたびに並べ替えます。途中再開では同じ順番です。解説付き練習は教材の順番で進みます。</p><h3>途中終了・時間切れ</h3><p>途中終了は回答分だけで集計し、合否・最高点の対象外です。時間切れは50問で採点しますが、未回答は学習の正答率・復習に含めません。</p><h3>問題の内訳</h3><p>代替問題 ${w.replacementCount}問・補足問題 ${w.supplementalCount}問を含む50問です。</p></div></details><h3>30分模試の記録</h3>${mock.best ? `<p class="inline"><span class="badge ${mock.best.scoreSnapshot >= 45 ? 'success' : ''}">最高 ${mock.best.scoreSnapshot}点</span></p><p class="recent-mock">${recentMockSummary(mock)}</p>${attemptRows(mock.list.filter(a => !partialAttempt(a)), '30分模試')}` : '<p class="muted">まだ受験していません。</p>'}${mock.partial.length ? `<h3>模試の途中終了</h3>${attemptRows(mock.partial, '30分模試')}` : ''}${guided.partial.length ? `<h3>練習の途中終了</h3>${attemptRows(guided.partial, '解説付き練習')}` : ''}${olderMocks.length ? `<h3>以前の内容版の模試記録</h3><p class="muted">当時の得点を保持しています。現在の内容版の合格数・最高点とは分けて表示します。</p>${attemptRows(olderMocks, '30分模試・以前の内容版')}` : ''}${guided.best ? `<h3>解説付き練習の記録</h3><div class="guided-record ${guided.best.scoreSnapshot === 50 ? 'perfect' : ''}">${guided.best.scoreSnapshot >= 45 ? flowerStamp(guided.best.scoreSnapshot === 50 ? '満点' : '合格') : ''}<div><strong>最高 ${guided.best.scoreSnapshot}点</strong><p class="muted">${guided.best.scoreSnapshot >= 45 ? '解説付き練習で合格の目安を達成' : '解説付き練習の成績'}</p></div></div>${attemptRows(guided.list.filter(a => !partialAttempt(a)), '解説付き練習')}<p class="muted">この成績は30分模試の合格数には含めません。</p>` : ''}`;
  $('detail').showModal();
}
function replaceStudy(action, kind = 'study') {
  const previous = model.sessionFor(kind);
  if (previous) ask('新しい学習を始めますか？', 'このモードの途中記録を終了して始めます。答えた問題は成績に残ります。他のモードの途中記録は残ります。続きから解く場合はキャンセルしてください。', '終了して新しく始める', () => {
    if (model.sessionFor(kind)?.attemptId !== previous.attemptId || !model.activate(kind)) return;
    model.finish(); state = model.state;
    if (model.conflicted) { updateChrome(); return; }
    action();
  });
  else action();
}
function startSet(n, kind) {
  const w = model.worksheet(n); if (!w) return; $('detail').close();
  replaceStudy(() => { if (!model.begin({ ids:w.orderedIds, kind, worksheet:w.worksheet, label:`第${w.worksheet}回${kind === 'guided' ? '・解説付き練習' : ''}` })) { updateChrome(); return; } state = model.state; tab = kind === 'mock' ? 'mock' : 'learn'; lastResult = null; renderPlay(); show('play'); focusQuestion(); }, kind);
}
function categorized(c) { return Q.filter(q => c.extra ? q.isSupplemental : !q.isSupplemental && c.topics.includes(q.topic)); }
function categoryDifficulty(c) {
  const answered = c.list.filter(q => state.stats[q.id]?.total > 0), count = answered.length;
  return { bucket: count >= 5 ? 0 : count ? 1 : 2, rate: count ? answered.filter(q => state.stats[q.id].last === true).length / count : 1 };
}
function compareDifficulty(a,b) {
  const x = categoryDifficulty(a), y = categoryDifficulty(b);
  return x.bucket - y.bucket || x.rate - y.rate;
}
function categoryReviewState(c) {
  const ids = c.list.filter(weak).map(q => q.id);
  const {ready, waiting} = reviewAvailability(ids);
  const at = waiting.length ? Math.min(...waiting.map(id => state.stats[id].reviewAt)) : 0;
  const label = ids.length ? (ready.length ? `要復習 ${ids.length}問 · 今すぐ ${ready.length}問` : `復習待ち ${waiting.length}問`) : '';
  return {disabled: categoryFilter === 'weak' && ids.length > 0 && !ready.length,
    html: label + (waiting.length ? `<span class="category-wait-time">${ready.length ? '待機中 ' + waiting.length + '問 · ' : ''}最短 ${reviewWaitHTML(at)}</span>` : '')};
}
function refreshCategoryReview() {
  if (view !== 'learn' || learnSection !== 'categories') return;
  for (const card of $('learn').querySelectorAll('.category-card')) {
    const c = CATS.find(c => c.k === card.dataset.cat); if (!c) continue;
    const status = categoryReviewState({...c,list:categorized(c)});
    card.querySelector('.category-entry').disabled = status.disabled;
    const badge = card.querySelector('.category-review-badge');
    if (badge.innerHTML !== status.html) badge.innerHTML = status.html;
  }
}
function categoryCard(c) {
  const answered = c.list.filter(q => state.stats[q.id]?.total > 0);
  const correct = answered.filter(q => state.stats[q.id].last === true).length;
  const accuracy = pct(correct, answered.length), review = categoryReviewState(c);
  return `<article class="category-card" data-cat="${c.k}"><button class="category-entry" data-action="category" data-cat="${c.k}" ${review.disabled ? 'disabled' : ''}>${icon(c.icon)}<span class="category-copy"><strong>${esc(c.extra ? '補足の学習' : c.label)}</strong><span class="category-accuracy">${answered.length ? `正解率 <b>${accuracy}<span>%</span></b>` : '未学習'}</span><small class="category-coverage">学習進捗 ${answered.length} / ${c.list.length}問</small><span class="category-review-badge">${review.html}</span></span><span class="card-chevron">${icon('chevron')}</span></button><details class="category-metrics"><summary>成績を見る</summary><small class="category-answer-count">${answered.length ? `正解 ${correct} / 回答済み ${answered.length}問` : `回答済み 0 / ${c.list.length}問`}</small><span class="progress" aria-hidden="true"><i style="width:${accuracy}%"></i></span>${answered.length > 0 && answered.length < 5 ? '<small class="category-sample-note">まだ回答少なめ（5問未満）</small>' : ''}</details></article>`;
}
function studySelection(list, count = 10) {
  const pending = shuffle(list.filter(q => !state.stats[q.id]?.total)), other = shuffle(list.filter(q => state.stats[q.id]?.total));
  const ordered = [...pending, ...other], concepts = new Set(), selected = [], deferred = [];
  for (const q of ordered) { const concept = q.concept || q.id; if (concepts.has(concept)) deferred.push(q); else { selected.push(q); concepts.add(concept); } }
  return [...selected, ...deferred].slice(0, count).map(q => q.id);
}
function startStudy(ids, label, kind = 'study') {
  const clean = [...new Set(ids)].filter(id => activeQuestion(id) && (kind !== 'review' || !model.weak(id) || model.due(id))); if (!clean.length) { toast(kind === 'review' ? '次の復習時刻までお待ちください。' : '対象の問題はありません。'); return; }
  replaceStudy(() => { if (!model.begin({ ids:clean, kind, label })) { updateChrome(); return; } state = model.state; tab = kind === 'review' ? 'review' : 'learn'; lastResult = null; renderPlay(); show('play'); focusQuestion(); }, kind);
}
function renderLearn() {
  const schedule = model.schedule(), session = model.sessionFor('study'), unfinished = !!session, freshCount = Q.filter(q => !state.stats[q.id]?.total).length;
  const answeredCount = Q.length - freshCount, totals = Q.reduce((sum,q) => { const s=state.stats[q.id]; sum.total += s?.total || 0; sum.correct += s?.correct || 0; return sum; }, {total:0,correct:0});
  const currentCorrect = Q.filter(q => state.stats[q.id]?.total > 0 && state.stats[q.id].last === true).length;
  const resumeSub = unfinished ? `${session.label} · ${session.answers.filter(a => a !== null).length} / ${session.ids.length}問 回答済み` : '';
  const studySub = freshCount ? 'まだ学んでいない問題を優先' : '模試と同じ500問から出題';
  const studyActions = `<div class="learn-actions${unfinished ? ' has-resume' : ''}" role="group" aria-label="学習を始める">${unfinished ? entryCard('resume', '続きから学ぶ', resumeSub, 'play', 'study') : ''}${entryCard('quick-study', unfinished ? '新しく10問学ぶ' : '10問学ぶ', studySub, 'book')}</div>`;
  const cats = CATS.map(c => ({...c, list:categorized(c)})).filter(c => c.list.length).filter(c => categoryFilter === 'all' || (categoryFilter === 'new' ? c.list.some(q => !state.stats[q.id]?.total) : c.list.some(weak)));
  if (categorySort === 'weak') cats.sort(compareDifficulty);
  $('learn').innerHTML = `<div class="page-heading character-heading"><div><h2>${learnSection === 'notes' ? '図解ノート' : '分野別学習'}</h2></div>${characterArt('D047','learn-guide')}</div><div class="learn-switch" role="tablist" aria-label="学び方">${[['categories','分野から学ぶ'],['notes','図解ノート']].map(([key,label]) => `<button id="learn-tab-${key}" role="tab" aria-selected="${learnSection === key}" aria-controls="learn-${key}" tabindex="${learnSection === key ? 0 : -1}" data-action="learn-section" data-section="${key}">${label}</button>`).join('')}</div><section id="learn-categories" role="tabpanel" aria-labelledby="learn-tab-categories" ${learnSection !== 'categories' ? 'hidden' : ''}>${studyActions}<dl class="learning-overview" aria-label="学習状況"><div><dt>回答済み</dt><dd>${answeredCount}<small> / ${Q.length}問</small></dd></div><div><dt>現在の正解率</dt><dd>${answeredCount ? pct(currentCorrect,answeredCount) : '—'}<small>${answeredCount ? '%' : ''}</small></dd></div><div><dt>要復習</dt><dd>${schedule.all.length}<small>問</small></dd></div></dl><details class="learning-cumulative"><summary>成績の詳細</summary><p>現在の正解率は、回答済みの各問題の直近の回答で計算します。未回答は含めません。</p><p>苦手順では5問以上回答した分野を優先し、回答の少ない分野・未学習は後ろに表示します。</p><p>累積正答率 ${totals.total ? pct(totals.correct,totals.total) + '%' : '—'} · 正解 ${totals.correct} / 回答 ${totals.total}回</p><p class="muted">解き直しを含む、これまでの全回答で集計しています。</p></details><div class="learn-controls">${filters('category-filter', categoryFilter, [['all','すべて'],['new','未学習'],['weak','要復習']])}<label class="category-sort-control"><span class="sr-only">分野の並び順</span><select id="category-sort"><option value="default" ${categorySort === 'default' ? 'selected' : ''}>標準</option><option value="weak" ${categorySort === 'weak' ? 'selected' : ''}>苦手順</option></select></label></div><div class="category-grid">${cats.map(categoryCard).join('')}</div>${!cats.length ? '<div class="empty">この条件の分野はありません。</div>' : ''}<div class="info-strip">${icon('info')}<span>補足問題も500問に含まれます。各回を50問通して練習するときは、模試の詳細から始められます。</span></div></section><section id="learn-notes" role="tabpanel" aria-labelledby="learn-tab-notes" ${learnSection !== 'notes' ? 'hidden' : ''}></section>`;
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
  return `<button class="review-row" data-action="review-one" data-id="${q.id}" ${early ? 'disabled' : ''}>${icon('book')}<span class="row-copy"><strong>${esc(q.topic)}${q.isSupplemental ? '・補足' : ''}</strong><small>第${q.worksheet}回・問${q.number}</small><small class="review-progress">卒業まで正解あと${left}回</small></span><span class="review-row-status badge ${early ? '' : 'blue'}">${early ? `${icon('clock')}<span class="sr-only">次の復習まで</span>${reviewWaitHTML(s.reviewAt)}` : '今すぐ'}</span>${early ? '' : icon('chevron')}</button>`;
}
function reviewSignature(due) { return new Date().toDateString() + '|' + due.map(q => q.id).join(','); }
function renderReview() {
  const { all, due, later } = model.schedule();
  displayedReviewSignature = reviewSignature(due);
  const session = model.sessionFor('review'), unfinished = !!session;
  const completed = !unfinished && !all.length && completedReviewToday();
  const reviewArt = all.length || unfinished ? 'D051' : completed ? 'master01' : 'D051';
  $('review').innerHTML = `<div class="page-heading character-heading"><div><h2>復習</h2><p class="muted">${completed ? '今日の復習は完了です。' : '初回はすぐに。次は30分あけて。'}</p></div>${characterArt(reviewArt,'review-guide')}</div>
    ${unfinished ? entryCard('resume', '途中の復習を続ける', `途中の復習があります · ${session.answers.filter(a => a !== null).length} / ${session.ids.length}問 回答済み`, 'play', 'review') : ''}
    ${all.length || unfinished ? `<section class="review-now-card" aria-labelledby="review-now-title"><h3 id="review-now-title">今すぐ復習</h3><p class="review-now-count">${due.length}<small>問</small></p>${due.length ? `<button class="btn wide" data-action="review-ready">${due.length}問を復習する ${icon('arrow')}</button>` : `<p class="muted">${unfinished ? '未回答の問題は「途中の復習を続ける」から確認できます。' : all.length ? '今すぐの復習は完了です。' : '今すぐ復習する問題はありません。'}${later.length ? ` 次は${reviewWaitHTML(state.stats[later[0].id]?.reviewAt)}です。` : ''}</p>`}</section>
    <section class="review-timing${later.length ? '' : ' is-empty'}" aria-labelledby="review-later-title"><div class="review-timing-heading"><h3 id="review-later-title">${icon('clock')}次の復習待ち</h3><p class="review-wait-count">${later.length}<small>問</small></p></div>${later.length ? `<p class="review-next-time">最短 ${reviewWaitHTML(state.stats[later[0].id]?.reviewAt)}</p><p class="hintline">30分たつと「今すぐ復習」に移ります。待機中の問題は解けません。</p>` : ''}</section>` : ''}
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
  const n = noteFor(q), figure = guideFigureFor(q), f = FIG[figure];
  return `<div class="explanation">${f ? `<details class="inline-figure"${figure === q.fig && !f.cards && !f.table ? ' open' : ''}><summary>図で確認する：${esc(f.t)}</summary>${figHTML(figure)}</details>` : ''}${replacementNote(q)}<div class="question-links">${n ? `<button class="textbtn" data-action="note" data-id="${n.id}" data-fig="${esc(figure)}">図解ノートで確認 ${icon('chevron')}</button>` : ''}<a class="source-link" href="${esc(sourceFor(q).url)}" target="_blank" rel="noopener">公式の根拠資料 ↗</a></div></div>`;
}
function reviewSchedule(q) {
  if (!weak(q)) return '';
  const stat = state.stats[q.id];
  const left = Math.max(1, 2 - (stat?.reviewPass || 0));
  const waiting = stat?.reviewAt > Date.now();
  const reset = waiting && !stat?.reviewPass && (stat?.last === false || stat?.uncertain);
  const message = reset ? `${stat?.uncertain ? '自信なしのため' : '不正解のため'}、卒業に向けた正解回数をリセットしました。` : '';
  return `<section class="review-schedule-note review-again-card"><h3>次の復習：${reviewWaitHTML(stat?.reviewAt)}</h3>${message ? `<p>${message}</p>` : ''}<small>卒業まで正解あと${left}回。${waiting ? '表示の時間が過ぎたら、もう一度挑戦しましょう。' : '今すぐ復習できます。'}自信をもって答えられた正解が対象です。</small></section>`;

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
  return `<div class="feedback answer-result ${ok ? '' : 'incorrect'}" role="status" tabindex="-1" aria-labelledby="answer-result-title"><p class="answer-state">${icon(ok ? 'check' : 'book')}${ok ? '正解です' : 'ここを覚え直そう'}</p><h2 id="answer-result-title" class="answer-result-title">正解は <strong>${q.a ? '○' : '×'}</strong><span class="sr-only">（${q.a ? '正しい' : '誤り'}）</span></h2><p class="answer-choice${ok ? ' sr-only' : ''}">あなたの回答 <strong>${answer ? '○' : '×'}</strong></p>${uncertain ? '<p class="answer-uncertain">自信なし：正解でも復習に残しました。</p>' : ''}</div>${learningPoints(q)}<details class="answered-question" open><summary>${icon('search')}問題文を確認<span class="question-chevron" aria-hidden="true">⌄</span></summary><div class="answered-question-body"><h3 class="question" id="question" tabindex="-1">${esc(q.q)}</h3>${questionArt(q, true)}</div></details>${explanationExtras(q)}${reviewSchedule(q)}`;
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
  closeDialogs(); lastResult = model.finish(timeout); state = model.state; reviewFilter = defaultResultFilter(lastResult);
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
function resume(mode) { if (mode && !model.activate(mode)) { updateChrome(); return; } if (!state.session) return navigate(tab); tab = state.session.mode === 'exam' ? 'mock' : state.session.kind === 'review' ? 'review' : 'learn'; lastResult = null; renderPlay(); if (state.session) show('play'); }
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
    const q = activeQuestion(id); if (!q || typeof r.answers[i] !== 'boolean') return;
    const c = CATS.find(c => c.extra ? q.isSupplemental : !q.isSupplemental && c.topics.includes(q.topic)) || {k:'other',label:'その他の基本',icon:'book'};
    if (!groups.has(c.k)) groups.set(c.k,{...c,ids:[],answered:0,correct:0});
    const group = groups.get(c.k); group.answered++;
    if (r.answers[i] === q.a) group.correct++;
    if (r.answers[i] !== q.a || r.flags?.[i] || r.uncertain?.[i]) group.ids.push(id);
  });
  return [...groups.values()].sort((a,b) => a.correct / a.answered - b.correct / b.answered || b.answered - a.answered);
}
function resultReviewIds(r) {
  if (!r || r.legacy || (r.worksheet ? r.contentVersion !== model.worksheet(r.worksheet)?.contentVersion : r.contentVersion !== CONTENT_VERSION)) return [];
  return [...new Set(r.ids.filter((id,i) => activeQuestion(id) && typeof r.answers[i] === 'boolean' && (r.answers[i] !== activeQuestion(id).a || r.flags?.[i] || r.uncertain?.[i])))];
}
function reviewAvailability(ids) {
  const ready = [], waiting = [];
  for (const id of ids) (model.weak(id) && !model.due(id) ? waiting : ready).push(id);
  return { ready, waiting };
}
function resultReviewPlan(r) {
  const ids = resultReviewIds(r); if (!ids.length) return '';
  const { ready, waiting } = reviewAvailability(ids);
  const nextAt = waiting.length ? Math.min(...waiting.map(id => state.stats[id].reviewAt)) : 0;
  return `<p class="result-review-count">不正解・自信なし ${ids.length}問</p><button class="btn wide" data-action="result-retry" ${ready.length ? '' : 'disabled'}>${ready.length ? `今すぐ${ready.length}問を復習する` : '次の復習待ち'} ${icon('review')}</button>${waiting.length ? `<p class="hintline">復習待ち${waiting.length}問 · 次は${reviewWaitHTML(nextAt)}。</p>` : ''}`;
}
function resultTopicCard(g) {
  const { ready, waiting } = reviewAvailability(g.ids);
  return `<article class="weak-topic" data-result-category="${g.k}"><div class="topic-summary"><span class="topic-name">${icon(g.icon)}${esc(g.extra ? '補足の学習' : g.label)}</span><b class="topic-accuracy">正解率 ${pct(g.correct,g.answered)}<small>%</small></b></div>${g.ids.length ? `<button class="textbtn" data-action="result-topic" data-cat="${g.k}" ${ready.length ? '' : 'disabled'}>${ready.length ? `${ready.length}問を復習` : '次の復習待ち'}</button>` : ''}<details class="topic-metrics"><summary>内訳</summary><small class="topic-answer-count">正解 ${g.correct} / 回答済み ${g.answered}問</small>${g.answered < 5 ? '<small class="topic-sample-note">まだ回答少なめ（5問未満）</small>' : ''}${g.ids.length ? `<small class="topic-review-count">今すぐ ${ready.length}問 · 待機中 ${waiting.length}問</small>` : ''}</details></article>`;
}
function refreshResultReview() {
  if (view !== 'result' || !lastResult) return;
  const ids = resultReviewIds(lastResult), availability = reviewAvailability(ids);
  const signature = availability.ready.join(',') + '|' + availability.waiting.join(',');
  const plan = $('result-review-plan');
  if (!plan || plan.dataset.availability === signature) return;
  plan.innerHTML = resultReviewPlan(lastResult); plan.dataset.availability = signature;
  for (const g of resultWeakGroups(lastResult)) {
    const card = [...$('result').querySelectorAll('[data-result-category]')].find(el => el.dataset.resultCategory === g.k);
    const button = card?.querySelector('[data-action="result-topic"]'); if (!button) continue;
    const { ready, waiting } = reviewAvailability(g.ids);
    button.disabled = !ready.length;
    button.textContent = ready.length ? `この分野の${ready.length}問を復習` : '次の復習待ち';
    card.querySelector('.topic-review-count').textContent = `今すぐ ${ready.length}問 · 待機中 ${waiting.length}問`;
  }
}
function resultComparison(r) {
  if (!r.worksheet || partialAttempt(r)) return r;
  const list = resultsFor(r.worksheet,r.mode,false).list.filter(a => a.contentVersion === r.contentVersion && !partialAttempt(a));
  const index = list.findIndex(a => a.attemptId === r.attemptId); if (index < 0) return r;
  const previous = list.slice(0,index), highest = previous.length ? Math.max(...previous.map(a => a.scoreSnapshot)) : null;
  return { previousScore: previous.at(-1)?.scoreSnapshot ?? null, bestScore: Math.max(r.scoreSnapshot,highest ?? 0), newBest: highest !== null && r.scoreSnapshot > highest };
}
function defaultResultFilter(r) {
  if (!r) return 'all';
  if (r.ids.some((id,i) => typeof r.answers[i] === 'boolean' && byId.has(id) && r.answers[i] !== byId.get(id).a)) return 'wrong';
  if (r.ids.some((id,i) => typeof r.answers[i] === 'boolean' && (r.flags?.[i] || r.uncertain?.[i]))) return 'uncertain';
  return 'all';
}
function resultReviewProgress(r) {
  if (r.mode !== 'review' && r.kind !== 'review') return '';
  const answered = r.ids.filter((id,i) => typeof r.answers[i] === 'boolean');
  if (!answered.length) return '';
  const pending = answered.filter(id => model.weak(id));
  if (!pending.length) return '<p class="notice">今回復習した問題は卒業しました。</p>';
  const at = Math.min(...pending.map(id => state.stats[id].reviewAt));
  const counts = [1,2].map(left => { const n = pending.filter(id => Math.max(0,2-(state.stats[id].reviewPass||0)) === left).length; return n ? `あと${left}回の正解で卒業：${n}問` : ''; }).filter(Boolean);
  return `<div class="notice"><p>次の復習：${reviewWaitHTML(at)}（${pending.length}問）</p><p>${counts.join(' ／ ')}</p></div>`;
}
function renderResult(animate = false) {
  const r = lastResult; if (!r) return;
  const unanswered = r.ids.filter((id,i) => r.answers[i] === null), partial = partialAttempt(r), total = partial ? answeredCount(r) : r.total;
  const outdated = r.legacy || (r.worksheet ? r.contentVersion !== model.worksheet(r.worksheet)?.contentVersion : r.contentVersion !== CONTENT_VERSION);
  const canRetry = r.ids.every(id => activeQuestion(id));
  const practice50 = r.mode === 'guided', label = r.mode === 'mock' ? `第${r.worksheet}回・30分模試` : practice50 ? `第${r.worksheet}回・解説付き練習` : r.label || '学習';
  const groups = resultWeakGroups(r);
  const resultArt = !answeredCount(r) ? null : !partial && r.total > 0 && r.scoreSnapshot === r.total ? 'D006' : !partial && r.total === 50 && r.scoreSnapshot >= 45 ? 'D004' : 'D013';
  const comparison = resultComparison(r);
  const diff = comparison.previousScore === null || comparison.previousScore === undefined ? null : r.scoreSnapshot - comparison.previousScore;
  $('result').innerHTML = `<div class="playhead"><button class="btn secondary compact" data-action="tab" data-tab="${tab}">${icon('back')}一覧へ</button><span class="muted">${dateLabel(r.completedAt)}</span></div><article class="result-card"><h2 class="result-label" id="result-title" tabindex="-1">${esc(label)}の結果</h2><div class="result-hero"><div><div class="score">${total ? `${r.scoreSnapshot}<small>/ ${total}問</small>` : '回答なし'}</div></div>${resultArt ? characterArt(resultArt, `result-character${resultArt === 'D013' ? ' result-character-solo' : ''}`) : ''}</div>${r.timeout ? '<p class="muted">制限時間になったため50問で採点しました。未回答は0点ですが、学習の正答率・復習には含めません。</p>' : ''}${partial ? `<div class="notice partial-result">途中終了 · ${total} / ${r.total}問に回答。未回答${unanswered.length}問は正答率・復習に含めません。${r.worksheet ? '合否・最高点の対象外です。' : ''}</div>` : achievementHTML(r.scoreSnapshot, r.total, animate, r.mode === 'mock', ['mock','guided'].includes(r.mode))}${practice50 ? '<p class="muted">解説付き練習の成績です。30分模試とは別の記録になります。</p>' : ''}<details class="result-score-details"><summary>成績の詳細</summary><p class="accuracy">${partial ? '回答した問題の正答率' : '正答率'} <strong>${total ? `${pct(r.scoreSnapshot,total)}<small>%</small>` : '—'}</strong></p>${['mock','guided'].includes(r.mode) && !outdated && !partial ? `<div class="comparison"><div><span>${diff === null ? '前回との比較' : '前回 ' + comparison.previousScore + '点から'}</span><b>${diff === null ? '<small>はじめての記録</small>' : diff === 0 ? '±0点' : (diff > 0 ? '+' : '') + diff + '点'}</b></div><div><span>${comparison.newBest ? '最高点を更新' : '今回までの最高点'}</span><b>${comparison.bestScore ?? r.scoreSnapshot}<small> / 50点</small></b></div></div>` : ''}</details>${outdated ? '<div class="notice">得点は当時の保存値です。下の解説は現在の内容で、当時の採点と異なる場合があります。</div>' : ''}${resultReviewProgress(r)}<div class="result-actions">${resultReviewIds(r).length ? `<div id="result-review-plan">${resultReviewPlan(r)}</div>` : `<button class="btn" data-action="tab" data-tab="${tab}">${tab === 'mock' ? '模試一覧へ' : tab === 'review' ? '復習一覧へ' : '学習を続ける'} ${icon('arrow')}</button>`}${canRetry && unanswered.length ? `<button class="btn secondary" data-action="result-unanswered">未回答の${unanswered.length}問を学ぶ ${icon('book')}</button>` : ''}${r.worksheet && canRetry ? `<button class="btn secondary" data-action="start-guided" data-set="${r.worksheet}">この回を解説付きで練習</button>` : ''}${resultReviewIds(r).length ? `<button class="btn secondary" data-action="tab" data-tab="${tab}">${icon('back')}一覧へ戻る</button>` : ''}</div>${groups.length ? `<section class="result-weak"><h3>分野別の成績</h3><p class="muted">回答済みの問題を、正解率の低い順に表示。</p><div class="weak-topics">${groups.map(resultTopicCard).join('')}</div></section>` : ''}</article><div class="section-heading"><h3>回答を振り返る</h3></div>${filters('result-filter', reviewFilter, [['wrong','間違い'],['unanswered','未回答'],['uncertain','自信なし'],['all','すべて']])}${r.ids.map((id,i) => ({id,i})).filter(({id,i}) => reviewFilter === 'all' || (reviewFilter === 'unanswered' ? r.answers[i] === null : typeof r.answers[i] === 'boolean' && (reviewFilter === 'uncertain' ? r.flags?.[i] || r.uncertain?.[i] : byId.has(id) && r.answers[i] !== byId.get(id).a))).map(({id,i}) => reviewItem(id,r.answers[i],i,r.flags?.[i] || r.uncertain?.[i])).join('') || '<div class="empty">該当する問題はありません。「すべて」で全回答を確認できます。</div>'}`;
  const plan = $('result-review-plan');
  if (plan) { const {ready,waiting} = reviewAvailability(resultReviewIds(r)); plan.dataset.availability = ready.join(',') + '|' + waiting.join(','); }
}
function findAttempt(id) { return [...state.attempts, ...Object.values(state.guidedResults).flatMap(r => [...r.recent,r.best]), ...Object.values(state.mockResults).flatMap(r => [...r.recent,r.best])].find(a => a?.attemptId === id); }
function noteIds(n) { return NOTE_QUESTION_IDS.get(n.id) || []; }
function renderNotes(target = view === 'learn' && learnSection === 'notes' ? 'learn-notes' : 'notes') {
  if (target === 'learn-notes') $('notes').innerHTML = '';
  else if ($('learn-notes')) $('learn-notes').innerHTML = '';
  const search = noteSearch.trim().toLowerCase(), visible = NOTES.filter(n => (!search || noteSearchText(n).includes(search)) && (!noteFilter || noteCategory(n).k === noteFilter)).sort((a,b) => Number(noteIds(b).length > 0) - Number(noteIds(a).length > 0));
  const recommendations = !search && !noteFilter ? NOTES.map(n => ({n, count:noteIds(n).filter(id => model.weak(id)).length})).filter(x => x.count).sort((a,b) => b.count - a.count).slice(0,3) : [];
  const groups = [...CATS,{k:'other',label:'その他の基本',icon:'book'}].map(c => ({...c,notes:visible.filter(n => noteCategory(n).k === c.k)})).filter(c => c.notes.length);
  $(target).innerHTML = `${target === 'notes' ? `<button class="btn secondary compact" data-action="note-return">${icon('back')}${noteReturn?.view === 'play' ? '解いていた問題に戻る' : noteReturn?.view === 'result' ? '結果に戻る' : '学習に戻る'}</button><div class="page-heading notes-heading"><div><h2>図解ノート</h2><p class="muted">要点をつかんで、問題で確かめよう。</p></div><img class="section-character" src="./image-a5b30a44fd43.png" width="332" height="380" alt="DON!DON!ドライブのロボット教官" loading="lazy" decoding="async"></div>` : '<p class="muted learn-notes-intro">重要なポイントを、図で整理。</p>'}${recommendations.length ? `<section class="note-recommendations"><h3>今の苦手に関連する図解</h3>${recommendations.map(({n,count}) => `<button class="note-recommendation" data-action="note" data-id="${n.id}"><span>${esc(n.t)}</span><small>要復習 ${count}問</small>${icon('chevron')}</button>`).join('')}</section>` : ''}<div class="toolbar"><label class="sr-only" for="note-search">図解ノートを検索</label><input id="note-search" type="search" placeholder="例：横断歩道、徐行" value="${esc(noteSearch)}"><label class="sr-only" for="note-filter">分野</label><select id="note-filter"><option value="">全分野</option>${CATS.map(c => `<option value="${c.k}" ${noteFilter === c.k ? 'selected' : ''}>${esc(c.extra ? '補足' : c.label)}</option>`).join('')}</select></div><p class="muted">${visible.length} / ${NOTES.length}テーマ</p><div class="note-groups">${groups.map(c => `<section class="note-group"><h3 class="note-group-title">${icon(c.icon)}${esc(c.extra ? '補足' : c.label)}<small>${c.notes.length}テーマ</small></h3><div class="note-grid">${c.notes.map(n => `<details class="note" id="${n.id}" data-note="${n.id}"><summary>${noteThumbnail(n)}<span class="note-summary-copy"><strong>${esc(n.t)}</strong><small>図解 ${n.figs.length}点 · 要点 ${n.pts.length}つ</small><small>${noteIds(n).length ? `対応 ${noteIds(n).length}問` : '参考ノート'}</small></span></summary><div class="note-content"></div></details>`).join('')}</div></section>`).join('') || '<div class="empty note-empty"><p>見つかりませんでした。別の言葉で探してください。</p><button class="textbtn" data-action="note-reset">検索と分野をリセット</button></div>'}</div>`;
}
function populateNote(el) {
  if (el.dataset.loaded) return; const n = NOTES.find(n => n.id === el.dataset.note); if (!n) return;
  const ids = noteIds(n);
  el.querySelector('.note-content').innerHTML = `${n.figs.map(figHTML).join('')}<div class="note-keypoints"><h3>押さえるポイント</h3><ul>${n.pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div><div class="note-caution"><div class="caution-heading"><h3>間違えやすいところ</h3>${characterArt('D042','caution-guide')}</div><p>${esc(n.trap)}</p></div><div class="note-bottom">${ids.length ? `<button class="btn" data-action="note-drill" data-note="${n.id}">対応する${Math.min(10,ids.length)}問を学ぶ ${icon('arrow')}</button>` : '<p class="muted">参考用のノートです。現在の500問に対応する設問はありません。</p>'}<a class="source-link" href="${esc(n.source?.url || (['n-speed','n-speed-new'].includes(n.id) ? REFS.speed.url : n.id === 'n-cycle-new' ? REFS.bicycle.url : n.id === 'n-veh' ? REFS.moped.url : REFS.rules.url))}" target="_blank" rel="noopener">公式資料で確認 ↗</a>${view === 'notes' && ['play','result'].includes(noteReturn?.view) ? `<button class="btn secondary" data-action="note-return">${icon('back')}${noteReturn.view === 'play' ? '解いていた問題に戻る' : '結果に戻る'}</button>` : ''}</div>`;
  el.dataset.loaded = 'true';
}
function openNotes(id = null, figure = null) {
  if (state.session?.mode === 'exam') { toast('模試を採点してから開けます。'); return; }
  if (view !== 'notes') noteReturn = { view, tab, scroll: window.scrollY };
  noteSearch = ''; noteFilter = ''; noteComposing = false; tab = 'learn'; renderNotes('notes'); show('notes');
  if (id && $(id)) {
    const el = $(id); populateNote(el); el.open = true;
    const target = [...el.querySelectorAll('[data-guide-figure]')].find(f => f.dataset.guideFigure === figure) || el;
    target.scrollIntoView({block:'start',behavior:'instant'});
    if (target !== el) target.focus({preventScroll:true});
  }
}
function settings() {
  const exam = state.session?.mode === 'exam', hasSessions = !!state.session || Object.keys(state.suspended).length > 0;
  $('settings-content').innerHTML = `<div class="settings-group"><h3>画面の明るさ</h3><div class="seg">${[['auto','自動'],['light','ライト'],['dark','ダーク']].map(([k,t]) => `<button data-action="theme" data-value="${k}" aria-pressed="${state.theme === k}">${t}</button>`).join('')}</div></div><div class="settings-group"><h3>効果音</h3><div class="seg">${[[true,'オン'],[false,'オフ']].map(([v,t]) => `<button data-action="sound" data-value="${v}" aria-pressed="${state.sound === v}">${t}</button>`).join('')}</div><p class="muted">学習で答えたときに鳴ります。模試中は鳴りません。</p></div><div class="settings-group"><label class="confidence-control"><input id="reduce-motion" type="checkbox" ${state.reduceMotion ? 'checked' : ''}>動きを抑える</label><p class="muted">端末の「視差効果を減らす」設定にも対応します。</p><button class="textbtn" data-action="preview" data-score="45">花丸の見本を見る ${icon('chevron')}</button></div><div class="settings-group"><h3>学習記録の保存</h3><p class="muted">回答・成績・復習予定は自動で保存します。同じ端末・ブラウザでのサイト更新後も、そのまま続けられます。</p><p id="save-status" role="status"></p><details><summary>予備の書き出し・読み込み</summary><p class="muted">通常の更新では操作不要です。別の端末へ記録を渡す場合などに使用できます。</p><div class="btnrow"><button class="btn secondary" data-action="export">書き出す</button><button class="btn secondary" data-action="import" ${exam ? 'disabled' : ''}>読み込む</button></div></details></div><div class="settings-group"><button class="textbtn" data-action="archive" ${exam ? 'disabled' : ''}>以前の学習記録を見る ${icon('chevron')}</button><p class="muted">旧50問練習、判定A〜C、以前の問題の回答を保管しています。</p></div><div class="settings-group"><button class="textbtn danger" data-action="reset" ${hasSessions || state.sync?.owner ? 'disabled' : ''}>現在の学習記録を初期化する</button>${hasSessions ? '<p class="muted">各モードの途中の学習を終えると初期化できます。</p>' : ''}</div>`;
  $('settings-content').insertAdjacentHTML('afterbegin', (window.KarimenHomeInstall?.settingsMarkup() || '') + (typeof KarimenCloud !== 'undefined' ? KarimenCloud.settingsMarkup() : ''));
  if (!$('settings').open) $('settings').showModal(); updateChrome();
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
function resetFigureZoom() {
  $('figure-content').style.zoom = '1';
  $('figure-content').style.width = '100%';
}
function setFigureZoom(percent) {
  const width = $('figure-dialog').querySelector('.figure-scroll').clientWidth;
  if (width) $('figure-content').style.width = width + 'px';
  $('figure-content').style.zoom = String(percent / 100);
}
window.addEventListener('resize', () => { if ($('figure-dialog').open) setFigureZoom(Number($('figure-zoom').value)); });
function openQuestionArt(id, revealed) {
  const q = byId.get(id); if (!q) return;
  if (state.session?.mode === 'exam') revealed = false;
  $('figure-content').innerHTML = questionArt(q,revealed,true); $('figure-zoom').value = '100'; resetFigureZoom(); $('figure-dialog').showModal();
}
function openFigure(k) { if (state.session?.mode === 'exam' || !FIG[k]) return; $('figure-content').innerHTML = figHTML(k); resetFigureZoom(); $('figure-zoom').value = '100'; $('figure-dialog').showModal(); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b || b.disabled || externalChange) return;
  const a = b.dataset.action, s = state.session;
  if (model.readOnly && !['settings','close-settings','export','archive','tab','close-detail','close-figure','close-preview'].includes(a)) { toast(model.error); return; }
  if (a === 'tab') navigate(b.dataset.tab);
  else if (a === 'mock-filter') { mockFilter = b.dataset.filter; renderMock(); }
  else if (a === 'category-sort') { categorySort = b.dataset.filter; renderLearn(); }
  else if (a === 'category-filter') { categoryFilter = b.dataset.filter; renderLearn(); }
  else if (a === 'detail') detail(Number(b.dataset.set));
  else if (a === 'close-detail') $('detail').close();
  else if (a === 'start-mock' || a === 'start-guided') startSet(Number(b.dataset.set),a === 'start-mock' ? 'mock' : 'guided');
  else if (a === 'resume') resume(b.dataset.mode);
  else if (a === 'quick-study') startStudy(studySelection(Q), '10問の学習');
  else if (a === 'category') { const c = CATS.find(c => c.k === b.dataset.cat); if (c) { let list = categorized(c); if (categoryFilter === 'new') list = list.filter(q => !state.stats[q.id]?.total); if (categoryFilter === 'weak') list = list.filter(q => weak(q) && model.due(q.id)); startStudy(studySelection(list), c.extra ? '補足の学習' : c.label, categoryFilter === 'weak' ? 'review' : 'study'); } }
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
  else if (a === 'result-topic' && lastResult) { const group = resultWeakGroups(lastResult).find(g => g.k === b.dataset.cat); if (group) startStudy(reviewAvailability(group.ids).ready,group.label + 'の復習','review'); }
  else if (a === 'result-retry' && lastResult) startStudy(reviewAvailability(resultReviewIds(lastResult)).ready,'不正解・自信なしの復習','review');
  else if (a === 'result-unanswered' && lastResult) startStudy(lastResult.ids.filter((id,i) => activeQuestion(id) && lastResult.answers[i] === null),'未回答の問題');
  else if (a === 'stored-result') { if (s?.mode === 'exam') return; const r = findAttempt(b.dataset.id); if (r) { $('detail').close(); lastResult = r; reviewFilter = defaultResultFilter(r); tab = r.mode === 'mock' ? 'mock' : 'learn'; renderResult(); show('result'); } }
  else if (a === 'learn-section') { learnSection = b.dataset.section; renderLearn(); $('learn-tab-' + learnSection).focus({preventScroll:true}); }
  else if (a === 'notes') openNotes();
  else if (a === 'note') openNotes(b.dataset.id,b.dataset.fig);
  else if (a === 'note-reset') { noteSearch = ''; noteFilter = ''; renderNotes(); $('note-search').focus(); }
  else if (a === 'note-return') { const ret = noteReturn; if (ret && ['play','result'].includes(ret.view)) { tab = ret.tab; show(ret.view,false); window.scrollTo({top:ret.scroll,behavior:'instant'}); } else navigate('learn'); }
  else if (a === 'note-drill') { const n = NOTES.find(n => n.id === b.dataset.note); if (n) startStudy(studySelection(noteIds(n).map(id => activeQuestion(id))),n.t); }
  else if (a === 'question-zoom') openQuestionArt(Number(b.dataset.id),b.dataset.revealed === 'true');
  else if (a === 'figure-open') openFigure(b.dataset.fig);
  else if (a === 'close-figure') $('figure-dialog').close();
  else if (a === 'settings') settings();
  else if (a === 'close-settings') $('settings').close();
  else if (a === 'theme') { state.theme = b.dataset.value; save(); theme(); settings(); }
  else if (a === 'sound') { state.sound = b.dataset.value === 'true'; if (!state.sound) releaseSound(); save(); settings(); if (state.sound) sfx(true); }
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
  if (e.target.id === 'category-sort') {
    categorySort = e.target.value === 'weak' ? 'weak' : 'default';
    renderLearn(); $('category-sort')?.focus({preventScroll:true});
    return;
  }
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
  if (e.target.id === 'figure-zoom') setFigureZoom(Number(e.target.value));
  if (e.target.id === 'note-search' && !noteComposing && !e.isComposing) searchNotes(e.target);
});
$('confirm-yes').addEventListener('click', () => { const action = modalAction; modalAction = null; $('confirm').close(); if (!externalChange) action?.(); });
$('confirm-no').addEventListener('click', () => { $('confirm').close(); modalAction = null; });
$('confirm').addEventListener('cancel', () => modalAction = null);
$('tabs').addEventListener('keydown', e => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return; const buttons = [...$('tabs').querySelectorAll('button:not(:disabled)')]; let i = buttons.indexOf(document.activeElement); if (i < 0) return; e.preventDefault(); i = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length; buttons[i].click(); buttons[i].focus(); });
// Focus can arrive between pointer-down and click. Keep unchanged controls in
// place so the first click works and expanded notes retain their position.
function refreshAfterReturn() { if (externalChange) return; updateTimer(); refreshReviewSchedule(); updateChrome(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) updateTimer(); else { windowFocused = document.hasFocus(); refreshAfterReturn(); } });
window.addEventListener('blur', () => { windowFocused = false; updateTimer(); });
window.addEventListener('focus', () => { windowFocused = true; refreshAfterReturn(); });
window.addEventListener('pagehide', () => { pageActive = false; updateTimer(); });
window.addEventListener('pageshow', () => { pageActive = true; windowFocused = document.hasFocus(); refreshAfterReturn(); });
window.addEventListener('storage', e => { if ((e.key === KarimenModel.STORE || e.key === null) && e.newValue !== JSON.stringify(state)) { externalChange = true; closeDialogs(); updateChrome(); } });
window.addEventListener('karimen-storage-status', updateChrome);
setInterval(() => { try { progressStorage.retry?.(); } catch {} }, 10000);
matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',theme);
$('brandmark').innerHTML = icon('road'); $('settings-button').innerHTML = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9.5 3.8 10 2h4l.5 1.8 1.6.9 1.8-.5 2 3.5-1.3 1.3v2l1.3 1.3-2 3.5-1.8-.5-1.6.9L14 18h-4l-.5-1.8-1.6-.9-1.8.5-2-3.5L5.4 11V9L4.1 7.7l2-3.5 1.8.5Z" transform="translate(0 2)"/><circle cx="12" cy="12" r="3.2"/></svg><span>設定</span>';
$('nav-mock').innerHTML = icon('exam'); $('nav-learn').innerHTML = icon('book'); $('nav-review').innerHTML = icon('review');
theme(); navigate('mock'); updateTimer(); setInterval(updateTimer,500);
window.KarimenHomeInstall?.init({
  canPrompt: () => view === 'mock' && !state.session && !externalChange,
  canGuide: () => view !== 'play' && state.session?.mode !== 'exam' && !externalChange,
  hasProgress: () => Boolean(state.session || state.attempts.length || Object.keys(state.stats).length),
  openSettings: settings,
  exportRecord: downloadRecord
});

function refreshReviewSchedule() {
  if (document.hidden || externalChange) return;
  document.querySelectorAll('[data-review-at]').forEach(el => {
    const label = reviewWait(Number(el.dataset.reviewAt));
    if (el.textContent !== label) el.textContent = label;
  });
  if (view === 'play' && state.session?.kind === 'review' && $('play').querySelector('[data-review-at]') && !$('play').querySelector('[data-action="answer"]') && state.session.answers[state.session.index] === null && model.due(state.session.ids[state.session.index])) renderPlay();
  refreshResultReview();
  refreshCategoryReview();
  if (view !== 'review') return;
  const signature = reviewSignature(model.schedule().due);
  if (signature !== displayedReviewSignature) {
    const focused = document.activeElement, action = focused?.dataset?.action, id = focused?.dataset?.id;
    const inside = $('review').contains(focused), open = $('review').querySelector('.review-graduation')?.open;
    renderReview();
    if (open) $('review').querySelector('.review-graduation').open = true;
    if (inside) {
      const target = [...$('review').querySelectorAll('[data-action]')].find(el => el.dataset.action === action && el.dataset.id === id);
      (target || $('review').querySelector('.review-graduation summary'))?.focus({preventScroll:true});
    }
    updateChrome();
  }
}
setInterval(refreshReviewSchedule,1000);

document.addEventListener('keydown', e => {
  if (!e.target.matches('.learn-switch [role="tab"]') || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
  e.preventDefault();
  const key = e.key === 'Home' ? 'categories' : e.key === 'End' ? 'notes' : learnSection === 'notes' ? 'categories' : 'notes';
  $('learn-tab-' + key).click();
});

// The restaurant guide is independent of every study session and progress store.
let townReturn = null;
window.KarimenTown?.init({
  canOpen: () => view !== 'play',
  open: () => { if (view !== 'town') townReturn = { view, tab, scroll:window.scrollY }; show('town'); },
  back: () => {
    const previous = townReturn; townReturn = null;
    if (previous && !['play','town'].includes(previous.view)) { tab=previous.tab; show(previous.view,false); window.scrollTo({top:previous.scroll,behavior:'instant'}); }
    else navigate('mock');
  },
  notify: toast
});

// Cloud records use the same model/storage path as local answers. Never replace a live question screen.
if (typeof KarimenCloud !== 'undefined') KarimenCloud.init({
  model, storage: progressStorage, canApply: () => view !== 'play' && !externalChange,
  beforeLogin: () => { if (!model.suspend()) throw new Error(model.error); state = model.state; },
  changed: () => { state = model.state; if (['mock','learn','review'].includes(view)) navigate(tab); updateChrome(); },
  settingsChanged: () => { if ($('settings').open) settings(); }
});
