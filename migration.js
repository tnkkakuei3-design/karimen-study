/* Only the two production origins may exchange progress. No progress in URLs or requests. */
(() => {
  'use strict';
  const OLD = 'https://tnkkakuei3-design.github.io';
  const NEW = 'https://karimen-study.pages.dev';
  const OLD_PATH = '/karimen-study/migration.html';
  const KEY = KarimenStorage.KEY;
  const status = document.getElementById('transfer-status');
  const start = document.getElementById('transfer-start');
  const home = document.getElementById('transfer-home');
  const show = text => { status.textContent = text; };
  const meaningful = s => Object.keys(s.stats || {}).length || s.session || Object.keys(s.suspended || {}).length ||
    s.attempts?.length || Object.keys(s.mockResults || {}).length || Object.keys(s.guidedResults || {}).length ||
    Object.keys(s.legacyArchive?.stats || {}).length || s.legacyArchive?.history?.length || s.legacyArchive?.sessions?.length;
  const normalize = raw => KarimenModel.normalize(JSON.parse(raw));
  const nonce = new URLSearchParams(location.hash.slice(1)).get('transfer');
  const message = (type, id, extra = {}) => ({ channel: 'karimen-transfer-v1', type, nonce: id, ...extra });
  async function openStore() {
    return KarimenStorage.open({storage: localStorage, indexedDB, validate: KarimenModel.normalize, build: 'transfer-v1'});
  }
  const el = id => document.getElementById(id);
  const LIMIT = 8 * 1024 * 1024;
  function prepare(raw) {
    if (typeof raw !== 'string' || raw.length > LIMIT) throw new Error('記録の形式・サイズを確認してください。');
    const state = normalize(raw);
    if (!meaningful(state)) throw new Error('引き継ぐ学習記録がありません。');
    for (const session of [state.session, ...Object.values(state.suspended || {})]) {
      if (session?.mode === 'exam') { session.timerPaused = true; session.endAt = null; }
    }
    return state;
  }
  function summary(state) {
    const answered = Object.values(state.stats || {}).filter(s => s.total > 0).length;
    const sessions = [state.session, ...Object.values(state.suspended || {})].filter(Boolean).length;
    return `回答済み ${answered}問・途中の学習 ${sessions}件`;
  }
  async function saveRecord(store, state) {
    const raw = JSON.stringify(state), current = store.getItem(KEY);
    if (current && meaningful(normalize(current)) && JSON.stringify(normalize(current)) !== raw) {
      throw new Error('新サイトにも別の学習記録があるため、上書きを止めました。両方の記録は残っています。');
    }
    if (store.conflict) throw new Error('別の画面で記録が更新されました。再読み込みしてください。');
    if (current !== raw) store.setItem(KEY, raw);
    await store.flush();
    if (store.conflict || store.status.message || !(store.status.primarySaved || store.status.backupSaved) || store.getItem(KEY) !== raw) {
      throw new Error('保存を確認できませんでした。旧サイトの記録は残っています。');
    }
    show(`学習記録を引き継ぎました。${summary(state)}。`);
    home.textContent = 'この記録で学習を始める'; home.href = './';
    el('transfer-import').hidden = true;
    history.replaceState(null, '', location.pathname);
  }
  function setupExport(store) {
    el('transfer-export').hidden = false;
    const snapshot = () => {
      if (store.conflict) throw new Error('別の画面で記録が更新されました。再読み込みしてください。');
      return JSON.stringify(prepare(store.getItem(KEY) || localStorage.getItem(KarimenModel.OLD)));
    };
    el('transfer-copy').addEventListener('click', async () => {
      try {
        const raw = snapshot();
        el('transfer-export-text').value = raw;
        try { await navigator.clipboard.writeText(raw); el('transfer-export-status').textContent = 'コピーしました。新サイトを開いて貼り付けてください。'; }
        catch { el('transfer-copy-fallback').hidden = false; el('transfer-export-text').focus(); el('transfer-export-text').select(); el('transfer-export-status').textContent = '下の記録を手動でコピーするか、ファイルに保存してください。'; }
      } catch (error) { show(error.message); }
    });
    el('transfer-download').addEventListener('click', () => {
      try {
        const url = URL.createObjectURL(new Blob([snapshot()], {type:'application/json'}));
        const a = document.createElement('a'); a.href = url; a.download = 'karimen-progress.json';
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        el('transfer-export-status').textContent = '保存画面が開いたら「ファイルに保存」を選んでください。新サイトでそのファイルを取り込みます。';
      } catch (error) { show(error.message); }
    });
  }
  function setupImport(store, cancelAuto) {
    el('transfer-import').hidden = false;
    let pending = null;
    const invalidate = () => { pending = null; el('transfer-save').hidden = true; el('transfer-preview').textContent = ''; };
    el('transfer-text').addEventListener('input', invalidate);
    el('transfer-file').addEventListener('change', invalidate);
    el('transfer-check').addEventListener('click', async () => {
      cancelAuto(); invalidate(); el('transfer-check').disabled = true;
      try {
        const file = el('transfer-file').files?.[0], pasted = el('transfer-text').value.trim();
        if (file && pasted) throw new Error('貼り付けとファイルのどちらか一方を選んでください。');
        if (file?.size > LIMIT) throw new Error('ファイルが大きすぎます。学習記録のJSONファイルを選んでください。');
        const state = prepare(file ? await file.text() : pasted);
        pending = state; el('transfer-preview').textContent = summary(state) + '。この内容で保存します。';
        el('transfer-save').hidden = false;
      } catch (error) { el('transfer-preview').textContent = error instanceof SyntaxError ? '記録を読み取れません。コピーした内容全体、または学習記録のJSONファイルを指定してください。' : error.message; }
      finally { el('transfer-check').disabled = false; }
    });
    el('transfer-save').addEventListener('click', async () => {
      if (!pending) return;
      el('transfer-save').disabled = true;
      try { await saveRecord(store, pending); pending = null; }
      catch (error) { show(error.message); }
      finally { el('transfer-save').disabled = false; }
    });
  }
  async function source() {
    const store = await openStore();
    let raw = store.getItem(KEY);
    if (!raw) raw = localStorage.getItem(KarimenModel.OLD);
    if (!raw || !meaningful(normalize(raw))) {
      show('このブラウザには引き継ぐ学習記録がありません。これまで学習したブラウザから開いてください。');
      return;
    }
    show('記録を確認しました。自動で引き継ぐか、下のコピー・ファイルで引き継いでください。');
    setupExport(store);
    start.hidden = false;
    start.addEventListener('click', () => {
      const id = Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
      let child, sent = false;
      const timer = setTimeout(() => {
        cleanup(); start.disabled = false;
        show('引き継ぎを確認できませんでした。下のコピー・ファイルで引き継いでください。旧サイトの記録は残っています。');
      }, 120000);
      function cleanup() { clearTimeout(timer); window.removeEventListener('message', receive); }
      async function receive(e) {
        if (e.origin !== NEW || e.source !== child || e.data?.channel !== 'karimen-transfer-v1' || e.data.nonce !== id) return;
        if (e.data.type === 'ready' && !sent) {
          sent = true;
          try {
            if (store.conflict) throw new Error('別の画面で記録が更新されました。この画面を再読み込みしてください。');
            const latest = store.getItem(KEY) || localStorage.getItem(KarimenModel.OLD);
            const state = normalize(latest);
            for (const s of [state.session, ...Object.values(state.suspended || {})]) {
              if (s?.mode === 'exam') { s.timerPaused = true; s.endAt = null; }
            }
            child.postMessage(message('progress', id, {raw: JSON.stringify(state)}), NEW);
          } catch (error) { cleanup(); show(error.message); start.disabled = false; }
        }
        if (e.data.type === 'saved') {
          cleanup(); show('新サイトへの保存が完了しました。新しく開いた画面で学習を続けられます。');
          home.href = NEW + '/'; home.textContent = '新サイトを開く';
        }
        if (e.data.type === 'error') {
          cleanup(); start.disabled = false;
          show('引き継ぎは完了していません。新しく開いた画面の案内をご確認ください。旧サイトの記録は保持しています。');
        }
      }
      window.addEventListener('message', receive);
      child = window.open(NEW + '/migration.html#transfer=' + id, '_blank');
      if (!child) { cleanup(); show('新しい画面を開けませんでした。下のコピー・ファイルで引き継いでください。'); return; }
      start.disabled = true; show('新サイトに記録を引き継いでいます…');
    });
  }
  async function target() {
    const store = await openStore();
    const parent = window.opener;
    let busy = false, interval, timeout;
    function cleanup() { clearInterval(interval); clearTimeout(timeout); window.removeEventListener('message', receive); }
    setupImport(store, () => { busy = true; cleanup(); });
    if (!/^[a-f0-9]{48}$/.test(nonce || '') || !parent) {
      show('この開き方では自動引き継ぎができません。旧アプリで記録をコピー・保存し、下の欄から取り込んでください。');
      return;
    }
    show('旧サイトから記録を受け取っています。つながらない場合は下の欄から取り込めます。');
    const ping = () => parent.postMessage(message('ready', nonce), OLD);
    interval = setInterval(ping, 500);
    timeout = setTimeout(() => { busy = true; cleanup(); show('自動接続を確認できませんでした。下の欄に記録を貼り付けるか、保存したファイルを選んでください。'); }, 15000);
    async function receive(e) {
      if (busy || e.origin !== OLD || e.source !== parent || e.data?.channel !== 'karimen-transfer-v1' || e.data.nonce !== nonce || e.data.type !== 'progress') return;
      busy = true; cleanup();
      el('transfer-check').disabled = true;
      try {
        await saveRecord(store, prepare(e.data.raw));
        parent.postMessage(message('saved', nonce), OLD);
      } catch (error) {
        show(error.message); parent.postMessage(message('error', nonce), OLD);
      } finally { el('transfer-check').disabled = false; }
    }
    window.addEventListener('message', receive); ping();
  }
  (async () => {
    if (location.origin === OLD && location.pathname === OLD_PATH) await source();
    else if (location.origin === NEW) await target();
    else show('引き継ぎは本番の旧サイト・新サイトで利用できます。');
  })().catch(error => show(error.message || '保存記録を確認できませんでした。記録は削除していません。'));
})();
