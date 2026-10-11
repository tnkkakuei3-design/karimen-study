/* State and scoring are independent of the UI. Old storage is never overwritten. */
const KarimenModel = (() => {
  const STORE = 'karimen-study-v4', OLD = 'karimen-study-v2', DAY = 86400000;
  const active = new Map(Q.map(q => [q.id, q]));
  const number = (v, max = 1e15) => Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
  const copy = value => JSON.parse(JSON.stringify(value));
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  const worksheet = n => WORKSHEETS.find(w => w.worksheet === Number(n));
  const emptyArchive = () => ({ stats: {}, misses: {}, history: [], checks: {}, sessions: [], importSnapshots: [] });
  function normalizeArchive(raw) {
    const archive = { ...emptyArchive(), ...(object(raw) ? copy(raw) : {}) };
    let damaged = raw != null && !object(raw);
    for (const key of ['stats', 'misses', 'checks']) {
      if (!object(archive[key])) { damaged = true; archive[key] = {}; }
    }
    for (const key of ['history', 'sessions', 'importSnapshots']) {
      if (!Array.isArray(archive[key])) { damaged = true; archive[key] = []; }
      else { const valid = archive[key].filter(object); damaged ||= valid.length !== archive[key].length; archive[key] = valid; }
    }
    const stats = Object.fromEntries(Object.entries(archive.stats).filter(([, value]) => object(value)));
    damaged ||= Object.keys(stats).length !== Object.keys(archive.stats).length;
    archive.stats = stats;
    if (damaged) archive.unreadableArchive = copy(raw);
    return archive;
  }
  const fresh = () => ({ kind: 'karimen-progress', version: 4, answerRevision: 3,
    stats: {}, misses: {}, guidedResults: {}, mockResults: {}, attempts: [], completed: {},
    session: null, lastResult: null, legacyArchive: emptyArchive(), notices: [],
    theme: 'auto', sound: true, reduceMotion: false, limit: 10 });
  function records(raw) {
    const stats = {}, misses = {}, archivedStats = {}, archivedMisses = {};
    for (const [id, value] of Object.entries(object(raw.stats) ? raw.stats : {})) {
      if (!active.has(Number(id))) { archivedStats[id] = copy(value); continue; }
      if (!object(value)) continue;
      const total = number(value.total, 1e9);
      stats[id] = { total, correct: Math.min(total, number(value.correct, 1e9)),
        last: typeof value.last === 'boolean' ? value.last : null, lastAt: number(value.lastAt),
        reviewAt: number(value.reviewAt), reviewPass: number(value.reviewPass, 2), uncertain: !!value.uncertain };
    }
    for (const [id, value] of Object.entries(object(raw.misses) ? raw.misses : {})) {
      if (!active.has(Number(id))) archivedMisses[id] = copy(value);
      else if (number(value)) misses[id] = number(value, 99999);
    }
    return { stats, misses, archivedStats, archivedMisses };
  }
  function settings(raw) {
    return { theme: ['auto', 'light', 'dark'].includes(raw.theme) ? raw.theme : 'auto',
      sound: raw.sound !== false, reduceMotion: !!raw.reduceMotion, limit: [10, 20, 0].includes(raw.limit) ? raw.limit : 10 };
  }
  function validAttempt(a) {
    // A stored score is a snapshot, never regraded with today's answer key.
    return object(a) && typeof a.attemptId === 'string' && Array.isArray(a.ids) &&
      a.ids.length > 0 && Array.isArray(a.answers) && a.ids.length === a.answers.length &&
      Number.isInteger(a.scoreSnapshot) && a.scoreSnapshot >= 0 && a.scoreSnapshot <= a.ids.length &&
      a.total === a.ids.length && typeof a.contentVersion === 'string';
  }
  function sanitizeResults(results) {
    const out = {};
    for (const w of WORKSHEETS) {
      const row = results?.[w.worksheet]; if (!row) continue;
      const recent = (Array.isArray(row.recent) ? row.recent : []).filter(validAttempt).slice(-10).map(copy);
      const best = [row.best, ...recent].filter(validAttempt).sort((a, b) => b.scoreSnapshot - a.scoreSnapshot)[0];
      if (best) out[w.worksheet] = { best: copy(best), recent };
    }
    return out;
  }
  function normalizeSession(s, legacy = false) {
    if (!object(s) || !['drill', 'exam'].includes(s.mode) || !Array.isArray(s.ids) || !s.ids.length ||
        s.ids.length > 500 || !s.ids.every(id => active.has(id)) || new Set(s.ids).size !== s.ids.length) return null;
    const legacyWorksheet = ({ s10: 1, s11: 2 })[s.pool];
    const w = worksheet(legacy ? legacyWorksheet : s.worksheet);
    const fullSet = w && s.ids.length === 50 && w.orderedIds.every((id, i) => id === s.ids[i]);
    if (legacy && s.mode === 'exam') return null; // Old random / assessment tests keep their original rules in the archive.
    if (!legacy && s.contentVersion !== (fullSet ? w.contentVersion : CONTENT_VERSION)) return null;
    const startedAt = number(s.startedAt ?? s.started), endAt = number(s.endAt ?? s.end);
    if (s.mode === 'exam' && (!fullSet || !startedAt || endAt - startedAt !== 1800000)) return null;
    return { ...copy(s), attemptId: typeof s.attemptId === 'string' ? s.attemptId : 'migrated-' + startedAt,
      mode: s.mode, kind: s.mode === 'exam' ? 'mock' : fullSet ? 'guided' : s.kind === 'review' ? 'review' : 'study',
      worksheet: fullSet ? w.worksheet : null, contentVersion: fullSet ? w.contentVersion : CONTENT_VERSION,
      ids: [...s.ids], answers: s.ids.map((_, i) => typeof s.answers?.[i] === 'boolean' ? s.answers[i] : null),
      flags: s.ids.map((_, i) => !!s.flags?.[i]), uncertain: s.ids.map((_, i) => !!s.uncertain?.[i]),
      index: number(s.index, s.ids.length - 1), startedAt, endAt: s.mode === 'exam' ? endAt : null,
      label: typeof s.label === 'string' ? s.label.slice(0, 120) : fullSet ? `第${w.worksheet}回・解説付き練習` : '引き継いだ学習' };
  }
  function normalize(raw) {
    if (!object(raw) || ![2, 3, 4].includes(raw.version)) throw new Error('対応していない学習記録です。');
    const s = fresh(), r = records(raw);
    Object.assign(s, settings(raw), { stats: r.stats, misses: r.misses });
    if (raw.version === 4) {
      s.legacyArchive = normalizeArchive(raw.legacyArchive);
      s.guidedResults = sanitizeResults(raw.guidedResults); s.mockResults = sanitizeResults(raw.mockResults);
      s.attempts = (Array.isArray(raw.attempts) ? raw.attempts : []).filter(validAttempt).map(copy);
      s.completed = Object.fromEntries(Object.entries(object(raw.completed) ? raw.completed : {}).filter(([k, v]) => typeof k === 'string' && v === true));
      s.notices = (Array.isArray(raw.notices) ? raw.notices : []).filter(v => typeof v === 'string');
      s.lastResult = validAttempt(raw.lastResult) ? copy(raw.lastResult) : null;
    } else {
      s.legacyArchive.originalState = copy(raw);
      s.legacyArchive.history = copy(Array.isArray(raw.history) ? raw.history : []);
      s.legacyArchive.checks = copy(object(raw.checks) ? raw.checks : {});
      s.notices.push('これまでの記録を引き継ぎました。以前の50問練習の成績は「解説付き練習」に残っています。');
      for (const n of [1, 2]) {
        const row = raw.practiceResults?.[n]; if (!row) continue;
        const convert = a => {
          if (!a || a.total !== 50 || !Array.isArray(a.ids) || a.ids.length !== 50 ||
              !Array.isArray(a.answers) || a.answers.length !== 50 || !Number.isFinite(a.score)) return null;
          return { ...copy(a), attemptId: `legacy-guided-${n}-${a.at}`, mode: 'guided', worksheet: n,
            contentVersion: 'legacy-answer-' + (a.answerRevision ?? raw.answerRevision ?? 0),
            scoreSnapshot: number(a.score, 50), total: 50, startedAt: number(a.started), completedAt: number(a.at), legacy: true };
        };
        const recent = (Array.isArray(row.recent) ? row.recent : []).map(convert).filter(Boolean);
        const best = [convert(row.best), ...recent].filter(Boolean).sort((a, b) => b.scoreSnapshot - a.scoreSnapshot)[0];
        if (best) s.guidedResults[n] = { best, recent };
      }
      if ((raw.answerRevision ?? 0) < 3 && (raw.stats?.[366] || raw.misses?.[366])) {
        delete s.stats[366]; delete s.misses[366];
        s.notices.push('第2回・問16は過去に正答を訂正しています。旧記録を保管し、この問題は再確認できる状態にしました。');
      }
    }
    s.legacyArchive.stats = { ...s.legacyArchive.stats, ...r.archivedStats };
    s.legacyArchive.misses = { ...s.legacyArchive.misses, ...r.archivedMisses };
    s.legacyArchive.sessions = Array.isArray(s.legacyArchive.sessions) ? s.legacyArchive.sessions : [];
    s.session = normalizeSession(raw.session, raw.version < 4);
    if (s.session && raw.version < 4 && (raw.answerRevision ?? 0) < 3) {
      const i = s.session.ids.indexOf(366); if (i >= 0) s.session.answers[i] = null;
    }
    if (raw.session && !s.session) {
      s.legacyArchive.sessions.push(copy(raw.session));
      s.notices.push('以前の問題や内容版を含む途中記録は保管しました。設定から確認・書き出しできます。');
    }
    if (raw.version === 4 && (Object.keys(r.archivedStats).length || Object.keys(r.archivedMisses).length)) {
      s.legacyArchive.unrecognizedImport = copy(raw);
    }
    s.legacyArchive = normalizeArchive(s.legacyArchive);
    return s;
  }
  function create({ storage, now = () => Date.now(), makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}` }) {
    let state, error = '', blocked = false, conflicted = false;
    const read = k => { try { return storage.getItem(k); } catch { error = 'この環境では記録を読み書きできません。設定から書き出して保管してください。'; blocked = true; return null; } };
    const rawV4 = read(STORE);
    let persistedRaw = rawV4;
    if (rawV4 !== null) {
      try { state = normalize(JSON.parse(rawV4)); }
      catch {
        state = fresh();
        state.notices.push('保存データを読み込めませんでした。壊れた元データを保管し、新しい記録を開始しています。');
        state.legacyArchive.corruptRaw = rawV4;
        try { storage.setItem(STORE + '-recovery-' + now(), rawV4); }
        catch { blocked = true; error = '保存データを読み込めません。元の記録を守るため上書きを止めています。設定から書き出してください。'; }
      }
    } else {
      const oldRaw = read(OLD);
      if (oldRaw !== null) {
        try { state = normalize(JSON.parse(oldRaw)); }
        catch { state = fresh(); state.legacyArchive.corruptRaw = oldRaw; state.notices.push('以前の保存データを読み込めませんでした。元のデータは削除せず保管しています。'); }
      } else {
        state = fresh();
        const oldest = read('karimen-drill-miss');
        if (oldest) {
          try { const r = records({ misses: JSON.parse(oldest) }); state.misses = r.misses; state.legacyArchive.misses = r.archivedMisses; state.legacyArchive.oldestRaw = oldest; }
          catch { state.legacyArchive.corruptRaw = oldest; }
        }
      }
    }
    function save() {
      if (blocked) return false;
      try {
        // A storage event may not have reached a suspended tab yet. Check again
        // immediately before writing so its stale state cannot replace newer work.
        if (storage.getItem(STORE) !== persistedRaw) {
          blocked = true; conflicted = true;
          error = '別のタブで記録が更新されました。上書きを止めています。再読み込みして続けてください。';
          return false;
        }
        const serialized = JSON.stringify(state);
        storage.setItem(STORE, serialized); persistedRaw = serialized; error = ''; return true;
      }
      catch { error = '記録を保存できませんでした。容量やブラウザ設定を確認し、設定から記録を書き出してください。'; return false; }
    }
    const weak = id => (state.misses[id] || 0) > 0 || !!state.stats[id]?.reviewAt;
    const due = (id, at = now()) => weak(id) && (state.stats[id]?.reviewAt || 0) <= at;
    function schedule(at = now()) {
      const all = Q.filter(q => weak(q.id)).sort((a, b) => (state.stats[a.id]?.reviewAt || 0) - (state.stats[b.id]?.reviewAt || 0));
      return { all, due: all.filter(q => due(q.id, at)), later: all.filter(q => !due(q.id, at)) };
    }
    function record(id, answer, uncertain = false) {
      const q = active.get(id); if (!q) return false;
      const ok = answer === q.a, at = now();
      const s = state.stats[id] || { total: 0, correct: 0, last: null, reviewAt: 0, reviewPass: 0, uncertain: false };
      s.total++; s.correct += ok ? 1 : 0; s.last = ok; s.lastAt = at;
      if (!ok || uncertain) {
        state.misses[id] = Math.max(1, (state.misses[id] || 0) + (ok ? 0 : 1));
        s.reviewPass = 0; s.reviewAt = at + DAY; s.uncertain = uncertain;
      } else if (weak(id) && (!s.reviewAt || at >= s.reviewAt)) {
        s.reviewPass = (s.reviewPass || 0) + 1; s.reviewAt = at + DAY; s.uncertain = false;
        if (s.reviewPass >= 2) { delete state.misses[id]; s.reviewAt = 0; }
      }
      state.stats[id] = s; return ok;
    }
    function begin({ ids, kind = 'study', worksheet: n = null, label = '10問の学習' }) {
      if (state.session?.mode === 'exam') throw new Error('進行中の模試があります。');
      if (!ids.length || !ids.every(id => active.has(id)) || new Set(ids).size !== ids.length) throw new Error('出題する問題が見つかりません。');
      const w = worksheet(n), fullSet = w && ids.length === 50 && w.orderedIds.every((id, i) => id === ids[i]);
      if (['mock', 'guided'].includes(kind) && !fullSet) throw new Error('この回の50問がそろっていません。');
      const at = now();
      state.session = { attemptId: makeId(), mode: kind === 'mock' ? 'exam' : 'drill', kind, worksheet: fullSet ? w.worksheet : null,
        contentVersion: fullSet ? w.contentVersion : CONTENT_VERSION, ids: [...ids], answers: ids.map(() => null),
        uncertain: ids.map(() => false), flags: ids.map(() => false), index: 0, label,
        startedAt: at, endAt: kind === 'mock' ? at + 1800000 : null };
      state.lastResult = null; save(); return state.session;
    }
    const expired = () => state.session?.mode === 'exam' && now() >= state.session.endAt;
    function answer(value, uncertain = false) {
      const s = state.session; if (!s || typeof value !== 'boolean') return false;
      if (expired()) { finish(true); return false; }
      if (s.mode === 'drill' && s.answers[s.index] !== null) return false;
      s.answers[s.index] = value; s.uncertain[s.index] = uncertain;
      if (s.mode === 'drill') record(s.ids[s.index], value, uncertain);
      save(); return true;
    }
    function finish(timeout = false) {
      const s = state.session; if (!s || state.completed[s.attemptId]) return state.lastResult;
      const a = { ...copy(s), mode: s.kind, total: s.ids.length, completedAt: now(),
        timeout: s.mode === 'exam' && (timeout || expired()), scoreSnapshot: s.ids.filter((id, i) => s.answers[i] === active.get(id).a).length };
      // Set the completion guard before any presentation, and persist all mutations together.
      state.completed[s.attemptId] = true;
      s.ids.forEach((id, i) => { if (s.mode === 'exam' || s.answers[i] === null) record(id, s.answers[i], !!s.uncertain[i] || !!s.flags[i]); });
      if (['mock', 'guided'].includes(s.kind)) {
        const target = s.kind === 'mock' ? state.mockResults : state.guidedResults;
        const previous = target[s.worksheet] || { best: null, recent: [] };
        const comparable = [...state.attempts, ...previous.recent, previous.best].filter(x => x && x.mode === a.mode && x.worksheet === a.worksheet && x.contentVersion === a.contentVersion);
        const last = comparable.sort((x, y) => y.completedAt - x.completedAt)[0];
        const highest = comparable.length ? Math.max(...comparable.map(x => x.scoreSnapshot)) : null;
        a.previousScore = last?.scoreSnapshot ?? null; a.newBest = highest !== null && a.scoreSnapshot > highest;
        a.bestScore = Math.max(a.scoreSnapshot, highest ?? 0);
        target[s.worksheet] = { best: !previous.best || a.scoreSnapshot > previous.best.scoreSnapshot ? a : previous.best, recent: [...previous.recent, a].slice(-10) };
      }
      state.attempts.push(a); state.lastResult = a; state.session = null; save(); return a;
    }
    function importData(raw) {
      if (conflicted) throw new Error('別のタブで記録が更新されました。再読み込みしてください。');
      if (state.session?.mode === 'exam') throw new Error('模試の終了後に読み込めます。');
      const next = normalize(raw), previous = copy(state);
      next.legacyArchive.importSnapshots = [...(Array.isArray(next.legacyArchive.importSnapshots) ? next.legacyArchive.importSnapshots : []), { at: now(), state: previous }];
      state = next; blocked = false; return save();
    }
    function reset() {
      if (state.session) throw new Error('途中の学習を終えてから初期化してください。');
      state = { ...fresh(), ...settings(state) }; return save();
    }
    save();
    return { get state() { return state; }, get error() { return error; }, get conflicted() { return conflicted; }, save, weak, due, schedule, record, begin, answer, finish, expired,
      importData, reset, exportData: () => ({ ...copy(state), exportedAt: new Date(now()).toISOString() }),
      validateImport: normalize, worksheet, active };
  }
  return { create, normalize, validAttempt, STORE, OLD, DAY };
})();
