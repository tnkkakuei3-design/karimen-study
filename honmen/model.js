/* Honmen records never read or write the karimen progress keys. */
(function (root) {
  'use strict';
  const KEY = 'honmen-study-v1', INTERVAL = 30 * 60 * 1000, DURATION = 50 * 60 * 1000;
  const clone = x => JSON.parse(JSON.stringify(x));
  const object = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const bool = x => typeof x === 'boolean';
  const finite = x => Number.isFinite(x) && x >= 0;
  const arity = q => q.type === 'hazard' ? 3 : 1;
  const keyFor = q => q.type === 'hazard' ? [...q.answer] : [q.answer];
  const answered = a => Array.isArray(a) && a.length > 0 && a.every(bool);
  const correct = (key, a) => answered(a) && key.length === a.length && key.every((v, i) => v === a[i]);
  const weight = key => key.length === 3 ? 2 : 1;
  const signature = q => JSON.stringify([q.text, q.statements || [], q.answer, q.image]);
  const fresh = () => ({kind: 'honmen-progress', version: 1, revision: 0, updatedAt: 0,
    stats: {}, sessions: {mock: null, study: null, review: null}, attempts: [], bestRecords: {},
    settings: {theme: 'auto', sound: true, reduceMotion: false}});
  function normalize(raw) {
    if (!object(raw) || raw.kind !== 'honmen-progress' || raw.version !== 1 || !object(raw.stats) ||
        !object(raw.sessions) || !Array.isArray(raw.attempts) || !object(raw.settings) ||
        !Number.isSafeInteger(raw.revision) || raw.revision < 0 || !finite(raw.updatedAt))
      throw new Error('本免の保存記録を読み込めません。元の記録を保護して停止しています。');
    const s = clone(raw);
    for (const v of Object.values(s.stats)) {
      if (!object(v) || !['total','correct','lastAt','reviewAt','passes','misses'].every(k => finite(v[k])) ||
          v.correct > v.total || v.passes > 2 || !bool(v.last)) throw new Error('本免の回答記録を確認できません。元の記録は保持しています。');
    }
    function validateRow(a, session) {
      if (!object(a) || typeof a.id !== 'string' || !['mock','study','review','guided'].includes(a.mode) ||
          typeof a.contentVersion !== 'string' || !Array.isArray(a.ids) || !a.ids.length || a.ids.length > 95 ||
          new Set(a.ids).size !== a.ids.length || !a.ids.every(id => /^h\d+-\d{3}$/.test(id)) ||
          !Array.isArray(a.answers) || !Array.isArray(a.keys) || a.answers.length !== a.ids.length || a.keys.length !== a.ids.length ||
          !a.keys.every(k => Array.isArray(k) && [1,3].includes(k.length) && k.every(bool)) ||
          !a.answers.every((v, i) => Array.isArray(v) && v.length === a.keys[i].length && v.every(x => x === null || bool(x))))
        throw new Error('本免の途中記録を確認できません。元の記録は保持しています。');
      if (a.uncertain == null) a.uncertain = a.ids.map(() => false);
      if (!Array.isArray(a.uncertain) || a.uncertain.length !== a.ids.length || !a.uncertain.every(bool)) throw new Error('自信の記録を確認できません。');
      if (session && (!Number.isInteger(a.index) || a.index < 0 || a.index >= a.ids.length || !finite(a.remainingMs) ||
          a.remainingMs > DURATION || !Array.isArray(a.flags) || a.flags.length !== a.ids.length || !a.flags.every(bool) ||
          !Array.isArray(a.committed) || a.committed.length !== a.ids.length || !a.committed.every(bool) ||
          !Array.isArray(a.signatures) || a.signatures.length !== a.ids.length || !a.signatures.every(v=>typeof v==='string') ||
          !Array.isArray(a.answerAt) || a.answerAt.length!==a.ids.length || !a.answerAt.every(finite) || !finite(a.startedAt))) throw new Error('本免の途中記録が不完全です。記録は上書きしていません。');
      if (!session && (!finite(a.score) || !finite(a.maxScore) || a.score > a.maxScore || !finite(a.completedAt) || !bool(a.partial) ||
          !bool(a.timeout) || !Array.isArray(a.correctness) || a.correctness.length !== a.ids.length || !a.correctness.every(v => v === null || bool(v))))
        throw new Error('本免の成績記録を確認できません。元の記録は保持しています。');
    }
    for (const slot of ['mock','study','review']) if (s.sessions[slot] != null) validateRow(s.sessions[slot], true);
    s.attempts.forEach(a => validateRow(a, false));
    s.bestRecords ||= {};
    if (!object(s.bestRecords)) throw new Error('本免の最高点記録を確認できません。');
    Object.values(s.bestRecords).forEach(a=>validateRow(a,false));
    s.settings.theme = ['auto','light','dark'].includes(s.settings.theme) ? s.settings.theme : 'auto';
    s.settings.sound = s.settings.sound !== false;
    s.settings.reduceMotion = !!s.settings.reduceMotion;
    return s;
  }
  function create({bank, storage, contentVersion, now = Date.now, random = Math.random}) {
    const byId = new Map(bank.filter(q => q.status === 'ready').map(q => [q.id, q]));
    let raw = storage.getItem(KEY), state = raw === null ? fresh() : normalize(JSON.parse(raw));
    let error = '', conflict = false, running = null, tickAt = now();
    const shuffle = values => { const a = [...values]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
    function transaction(change) {
      if (conflict) return false;
      try {
        if (storage.getItem(KEY) !== raw || storage.conflict) {
          conflict = true; throw new Error('別の画面で本免の記録が更新されました。再読み込みして続けてください。');
        }
        const draft = clone(state);
        if (change(draft) === false) return false;
        draft.revision++; draft.updatedAt = now(); normalize(draft);
        const next = JSON.stringify(draft); storage.setItem(KEY, next);
        state = draft; raw = next; error = ''; return true;
      } catch (e) { error = e.message || '記録を保存できませんでした。空き容量を確認してください。'; return false; }
    }
    function outcome(s, id, ok, at, uncertain=false) {
      const p = s.stats[id] || {total:0, correct:0, last:false, lastAt:0, reviewAt:0, passes:0, misses:0};
      p.total++; if (ok) p.correct++;
      if (at < p.lastAt) { s.stats[id] = p; return; }
      const weak = p.misses > 0 || p.reviewAt > 0;
      p.last = ok; p.lastAt = at; p.uncertain = uncertain;
      if (!ok || uncertain) { p.misses++; p.passes = 0; p.reviewAt = weak ? at + INTERVAL : at; }
      else if (weak && at >= p.reviewAt) {
        p.passes++; p.reviewAt = at + INTERVAL;
        if (p.passes >= 2) { p.misses = 0; p.reviewAt = 0; p.passes = 0; }
      }
      s.stats[id] = p;
    }
    function consume(s, at) {
      if (running === 'mock' && s.sessions.mock) s.sessions.mock.remainingMs = Math.max(0, s.sessions.mock.remainingMs - Math.max(0, at - tickAt));
    }
    function grade(s, slot, timeout = false) {
      const a = s.sessions[slot]; if (!a) return null;
      const count = a.answers.filter(answered).length;
      const correctness = a.keys.map((k,i) => answered(a.answers[i]) ? correct(k,a.answers[i]) : null);
      const score = a.keys.reduce((n,k,i) => n + (correctness[i] === true ? weight(k) : 0),0);
      const maxScore = a.keys.reduce((n,k) => n + weight(k),0);
      if (a.mode === 'mock') a.ids.forEach((id,i) => { if (correctness[i] !== null) outcome(s,id,correctness[i],a.answerAt[i] || now(),!!a.flags[i] || !!a.uncertain?.[i]); });
      const record = {id:a.id, mode:a.mode, set:a.set, label:a.label, contentVersion:a.contentVersion,
        ids:a.ids, answers:a.answers, keys:a.keys, flags:a.flags, uncertain:a.uncertain, correctness, score, maxScore, answered:count,
        partial:count < a.ids.length && !timeout, timeout, completedAt:now()};
      s.attempts.push(record); s.attempts = s.attempts.slice(-60); s.sessions[slot] = null;
      if (record.mode==='mock'&&!record.partial) {
        const key=record.contentVersion+':'+record.set, previous=s.bestRecords[key];
        if(!previous||record.score>=previous.score)s.bestRecords[key]=clone(record);
      }
      return record;
    }
    function validSession(slot) {
      const s = state.sessions[slot];
      if (!s) return false;
      if (s.contentVersion !== contentVersion || s.ids.some((id,i) => !byId.has(id) || signature(byId.get(id)) !== s.signatures[i])) {
        error = '問題の内容が更新されました。この途中記録を終了して、新しく始めてください。'; return false;
      }
      return true;
    }
    function schedule() {
      const due = [], waiting = [];
      for (const [id,s] of Object.entries(state.stats)) if (byId.has(id) && (s.misses > 0 || s.reviewAt > 0)) (s.reviewAt <= now() ? due : waiting).push(id);
      const sort = (a,b) => state.stats[a].reviewAt - state.stats[b].reviewAt || a.localeCompare(b, 'ja', {numeric:true});
      return {due:due.sort(sort), waiting:waiting.sort(sort)};
    }
    const api = {
      get state(){ return state; }, get error(){return error;}, get conflicted(){return conflict || !!storage.conflict;}, byId, schedule,
      save: () => transaction(() => {}),
      begin({ids,mode='study',set=null,label='10問学習'}) {
        const slot = mode === 'mock' ? 'mock' : mode === 'review' ? 'review' : 'study';
        let list = [...new Set(ids)].filter(id => byId.has(id));
        if (!list.length || list.length !== ids.length || list.length > 95 || state.sessions[slot]) return false;
        if (mode === 'mock') {
          const qs = list.map(id => byId.get(id));
          if (qs.length !== 95 || qs.some(q => q.set !== set) || qs.filter(q=>q.type==='boolean').length!==90 || qs.filter(q=>q.type==='hazard').length!==5) return false;
          list = [...shuffle(qs.filter(q=>q.type==='boolean')).map(q=>q.id), ...shuffle(qs.filter(q=>q.type==='hazard')).map(q=>q.id)];
        }
        if (mode === 'review' && list.some(id=>!schedule().due.includes(id))) return false;
        const at = now();
        const ok = transaction(s => { s.sessions[slot] = {id:'h-'+at+'-'+random().toString(36).slice(2), mode,set,label,contentVersion,
          ids:list,answers:list.map(id=>Array(arity(byId.get(id))).fill(null)),keys:list.map(id=>keyFor(byId.get(id))),
          signatures:list.map(id=>signature(byId.get(id))),flags:list.map(()=>false),uncertain:list.map(()=>false),committed:list.map(()=>false),
          answerAt:list.map(()=>0),index:0,remainingMs:DURATION,startedAt:at}; });
        if (ok) { running=slot; tickAt=at; } return ok;
      },
      resume(slot) { if (!validSession(slot) || conflict || storage.conflict) return false; if(running!==slot){running=slot; tickAt=now();} return true; },
      pause() { const at=now(),ok=transaction(s=>consume(s,at)); if(ok){running=null;tickAt=at;} return ok; },
      tick() {
        if (running !== 'mock' || !state.sessions.mock) return false;
        const at=now(); let expired=false;
        const ok=transaction(s=>{consume(s,at); if(s.sessions.mock.remainingMs===0){grade(s,'mock',true);expired=true;}});
        if(ok){tickAt=at;if(expired)running=null;} return ok&&expired;
      },
      remaining() { return Math.max(0,(state.sessions.mock?.remainingMs || 0) - (running==='mock'?Math.max(0,now()-tickAt):0)); },
      answer(slot,index,value,part=0) {
        if(!bool(value)||!validSession(slot))return false;
        const a=state.sessions[slot];
        if(!Number.isInteger(index)||index<0||index>=a.ids.length||!Number.isInteger(part)||part<0||part>=a.keys[index].length||
            (a.mode!=='mock'&&a.committed[index]))return false;
        const at=now();
        const ok=transaction(s=>{
          consume(s,at); const row=s.sessions[slot];
          if(row.mode==='mock'&&row.remainingMs===0){grade(s,slot,true);return;}
          row.answers[index][part]=value;row.answerAt[index]=at;
          // Ordinary practice gives immediate feedback; hazards require an explicit submit.
          if(row.mode!=='mock'&&row.keys[index].length===1){row.committed[index]=true;outcome(s,row.ids[index],correct(row.keys[index],row.answers[index]),at,!!row.uncertain?.[index]);}
        });
        if(ok){tickAt=at;if(!state.sessions[slot])running=null;} return ok;
      },
      commitHazard(slot,index) {
        const a=state.sessions[slot];
        if(!a||a.mode==='mock'||a.committed[index]||!answered(a.answers[index])||!validSession(slot))return false;
        return transaction(s=>{const row=s.sessions[slot];row.committed[index]=true;outcome(s,row.ids[index],correct(row.keys[index],row.answers[index]),now(),!!row.uncertain?.[index]);});
      },
      confidence(slot,index,value) { const a=state.sessions[slot];if(!a||!bool(value)||!Number.isInteger(index)||index<0||index>=a.ids.length||a.committed[index])return false;return transaction(s=>{s.sessions[slot].uncertain ||= a.ids.map(()=>false);s.sessions[slot].uncertain[index]=value;}); },
      move(slot,index) { const a=state.sessions[slot];if(!a||!Number.isInteger(index)||index<0||index>=a.ids.length)return false;return transaction(s=>{s.sessions[slot].index=index;}); },
      flag(slot,index) { const a=state.sessions[slot];if(!a||!Number.isInteger(index)||index<0||index>=a.ids.length)return false;return transaction(s=>{s.sessions[slot].flags[index]=!s.sessions[slot].flags[index];}); },
      finish(slot,timeout=false) {
        if(!state.sessions[slot])return null;let record;
        const at=now(),ok=transaction(s=>{
          consume(s,at);
          // An unsubmitted hazard in practice is not an evaluated answer.
          const a=s.sessions[slot];if(a.mode!=='mock')a.answers=a.answers.map((v,i)=>a.committed[i]?v:v.map(()=>null));
          record=grade(s,slot,timeout||(a.mode==='mock'&&a.remainingMs===0));
        });
        if(ok){if(running===slot)running=null;tickAt=at;return record;}return null;
      },
      settings(values) { return transaction(s=>{s.settings={...s.settings,...values};}); },
      reset() { const ok=transaction(s=>{const base=fresh();Object.assign(s,base);});if(ok)running=null;return ok; },
      export() {return JSON.stringify(state,null,2);},
      import(text) { let incoming;try{incoming=normalize(JSON.parse(text));}catch(e){error=e.message;return false;} const ok=transaction(s=>Object.assign(s,incoming));if(ok)running=null;return ok; },
      sample(ids,n=10){return shuffle(ids).slice(0,n);},
      best(set) { return state.bestRecords[contentVersion+':'+set]||null; },
      latest(set){return [...state.attempts].reverse().find(a=>a.mode==='mock'&&a.set===set&&!a.partial&&a.contentVersion===contentVersion)||null;}
    };
    return api;
  }
  const api = {KEY,INTERVAL,DURATION,create,normalize,fresh,answered,correct,weight,keyFor,signature};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.HonmenModel=api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
