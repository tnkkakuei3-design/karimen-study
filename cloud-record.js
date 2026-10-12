/* Idempotent union of answer events. Private cloud records are not ranking scores. */
const KarimenCloudRecord = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (object(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  const newer = (a, b, field) => !a ? b : !b ? a : (a[field] || 0) > (b[field] || 0) ? a : (a[field] || 0) < (b[field] || 0) ? b : canonical(a) > canonical(b) ? a : b;
  function seed(state) {
    if (!state.sync) state.sync = { v: 1, owner: null, baselines: { [crypto.randomUUID()]: { stats: clone(state.stats), misses: clone(state.misses) } }, events: {} };
    return state.sync;
  }
  function validate(sync) {
    if (!object(sync) || sync.v !== 1 || !(sync.owner === null || typeof sync.owner === 'string') || !object(sync.baselines) || !object(sync.events)) throw new Error('クラウド記録の形式を確認できません。元の記録は保護しています。');
    for (const [key, baseline] of Object.entries(sync.baselines)) {
      if (!/^[\w:-]{1,160}$/.test(key) || !object(baseline) || !object(baseline.stats) || !object(baseline.misses)) throw new Error('保存記録の基準値が不正です。');
      for (const [id, stat] of Object.entries(baseline.stats)) {
        if (!/^\d+$/.test(id) || !object(stat) || !Number.isSafeInteger(stat.total) || stat.total < 0 || !Number.isSafeInteger(stat.correct) || stat.correct < 0 || stat.correct > stat.total || !Number.isFinite(stat.lastAt)) throw new Error('保存記録の基準値が不正です。');
      }
    }
    for (const [key, event] of Object.entries(sync.events)) {
      if (!/^[\w:.-]{1,200}$/.test(key) || !object(event) || !Number.isInteger(event.id) || !Number.isSafeInteger(event.at) || event.at < 0 || typeof event.ok !== 'boolean' || typeof event.uncertain !== 'boolean') throw new Error('回答履歴の形式が不正です。');
    }
    return clone(sync);
  }
  function unionArrays(a = [], b = [], key = canonical) {
    return [...new Map([...a, ...b].map(v => [key(v), v])).entries()].sort(([x],[y]) => x.localeCompare(y)).map(([,v]) => v);
  }
  function merge(local, remote, owner, recordOutcome) {
    const a = clone(local), sa = seed(a), b = clone(remote || a), sb = seed(b);
    if ([sa.owner, sb.owner].some(value => value && value !== owner)) throw new Error('この端末の記録は別のアカウントに紐づいています。元のアカウントでログインしてください。');
    const out = clone(a);
    out.lastReviewOrder = canonical(a.lastReviewOrder) > canonical(b.lastReviewOrder) ? a.lastReviewOrder : b.lastReviewOrder;
    out.sync = { v: 1, owner, baselines: { ...sa.baselines, ...sb.baselines }, events: { ...sa.events } };
    for (const [id, event] of Object.entries(sb.events)) out.sync.events[id] = newer(out.sync.events[id], event, 'at');
    validate(out.sync);
    out.stats = {}; out.misses = {};
    // Old pre-journal backups have no answer IDs. If overlapping histories differ,
    // preserve both stores and stop: neither blind addition nor max counts is exact.
    for (const [, baseline] of Object.entries(out.sync.baselines).sort(([x], [y]) => x.localeCompare(y))) {
      for (const [id, stat] of Object.entries(baseline.stats)) {
        const old = out.stats[id], latest = newer(old, stat, 'lastAt');
        if (old && (canonical(old) !== canonical(stat) || (out.misses[id] || 0) !== (baseline.misses[id] || 0))) throw new Error('この端末とクラウドに異なる旧記録があります。正確に合算できないため同期を止め、両方の記録を保持しています。');
        out.stats[id] = { ...clone(latest), total: Math.max(old?.total || 0, stat.total), correct: Math.max(old?.correct || 0, stat.correct) };
        if (latest === stat) { delete out.misses[id]; if (baseline.misses[id]) out.misses[id] = baseline.misses[id]; }
      }
      for (const [id, count] of Object.entries(baseline.misses)) if (!baseline.stats[id]) out.misses[id] = Math.max(out.misses[id] || 0, count);
    }
    for (const [, event] of Object.entries(out.sync.events).sort(([ia, ea], [ib, eb]) => ea.at - eb.at || ia.localeCompare(ib))) recordOutcome(out, event.id, event.ok, event.uncertain, event.at);
    const attempts = new Map();
    for (const attempt of [...a.attempts, ...b.attempts]) attempts.set(attempt.attemptId, newer(attempts.get(attempt.attemptId), attempt, 'completedAt'));
    out.attempts = [...attempts.values()].sort((x,y) => x.completedAt - y.completedAt || x.attemptId.localeCompare(y.attemptId));
    out.completed = { ...a.completed, ...b.completed };
    out.lastResult = newer(a.lastResult, b.lastResult, 'completedAt') || null;
    for (const name of ['mockResults', 'guidedResults']) {
      out[name] = {};
      for (const id of new Set([...Object.keys(a[name]), ...Object.keys(b[name])])) {
        const rows = [a[name][id], b[name][id]].filter(Boolean);
        const recent = unionArrays(rows.flatMap(r => r.recent), [], r => r.attemptId).map(r => attempts.get(r.attemptId) || r).sort((x,y) => x.completedAt - y.completedAt || x.attemptId.localeCompare(y.attemptId)).slice(-10);
        const best = rows.map(r => r.best).filter(Boolean).sort((x,y) => y.scoreSnapshot - x.scoreSnapshot || y.completedAt - x.completedAt || x.attemptId.localeCompare(y.attemptId))[0] || null;
        out[name][id] = { recent, best };
      }
    }
    out.legacyArchive = { ...b.legacyArchive, ...a.legacyArchive };
    const conflicts = unionArrays(a.legacyArchive.cloudArchiveConflicts, b.legacyArchive.cloudArchiveConflicts);
    for (const key of new Set([...Object.keys(a.legacyArchive), ...Object.keys(b.legacyArchive)])) {
      if (['stats','misses','checks','history','sessions','importSnapshots','cloudArchiveConflicts'].includes(key)) continue;
      const left = a.legacyArchive[key], right = b.legacyArchive[key];
      if (left !== undefined && right !== undefined && canonical(left) !== canonical(right)) {
        conflicts.push({ key, value:left }, { key, value:right });
        out.legacyArchive[key] = canonical(left) > canonical(right) ? left : right;
      }
    }
    if (conflicts.length) out.legacyArchive.cloudArchiveConflicts = unionArrays(conflicts);
    for (const name of ['stats','misses','checks']) out.legacyArchive[name] = { ...b.legacyArchive[name], ...a.legacyArchive[name] };
    for (const name of ['history','sessions','importSnapshots']) out.legacyArchive[name] = unionArrays(a.legacyArchive[name], b.legacyArchive[name]);
    const sessions = new Map();
    for (const session of [a.session, b.session, ...Object.values(a.suspended), ...Object.values(b.suspended)].filter(Boolean)) {
      if (out.completed[session.attemptId]) continue;
      const previous = sessions.get(session.attemptId);
      if (!previous) { sessions.set(session.attemptId, clone(session)); continue; }
      if (canonical(previous.ids) !== canonical(session.ids)) { out.legacyArchive.sessions.push(clone(session)); continue; }
      session.ids.forEach((_, i) => {
        if (session.answers[i] !== null && (previous.answers[i] === null || (session.answeredAt[i] || 0) > (previous.answeredAt[i] || 0) || (session.answeredAt[i] === previous.answeredAt[i] && session.answers[i] === true))) {
          for (const key of ['answers','answeredAt']) previous[key][i] = session[key][i];
        }
        previous.flags[i] ||= session.flags[i]; previous.uncertain[i] ||= session.uncertain[i];
      });
      if (session.mode === 'exam') previous.remainingMs = Math.min(previous.remainingMs, session.remainingMs);
      previous.index = Math.max(previous.index, session.index);
    }
    out.session = null; out.suspended = {};
    for (const session of [...sessions.values()].sort((x,y) => x.startedAt - y.startedAt || x.attemptId.localeCompare(y.attemptId))) {
      if (session.mode === 'exam') Object.assign(session, { timerPaused: true, endAt: null });
      const slot = session.mode === 'exam' ? 'mock' : session.kind === 'review' ? 'review' : 'study';
      if (out.suspended[slot]) out.legacyArchive.sessions.push(out.suspended[slot]);
      out.suspended[slot] = session;
    }
    out.legacyArchive.sessions = unionArrays(out.legacyArchive.sessions);
    out.notices = unionArrays(a.notices, b.notices);
    return out;
  }
  function snapshot(state) {
    const out = clone(state);
    // Device preferences and wall-clock deadlines do not belong to a shared record.
    Object.assign(out, { theme: 'auto', sound: true, reduceMotion: false, limit: 10 });
    delete out.exportedAt;
    if (out.session) {
      const s = out.session, slot = s.mode === 'exam' ? 'mock' : s.kind === 'review' ? 'review' : 'study';
      out.suspended[slot] = s; out.session = null;
    }
    for (const session of Object.values(out.suspended)) if (session.mode === 'exam') Object.assign(session, { timerPaused: true, endAt: null });
    return out;
  }
  return { seed, validate, merge, snapshot, canonical };
})();
