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
  async function source() {
    const store = await openStore();
    let raw = store.getItem(KEY);
    if (!raw) raw = localStorage.getItem(KarimenModel.OLD);
    if (!raw || !meaningful(normalize(raw))) {
      show('このブラウザには引き継ぐ学習記録がありません。これまで学習したブラウザから開いてください。');
      return;
    }
    show('記録を確認しました。下のボタンで新サイトへ引き継げます。ファイルの保存や読み込みは不要です。');
    start.hidden = false;
    start.addEventListener('click', () => {
      const id = Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
      let child, sent = false;
      const timer = setTimeout(() => {
        cleanup(); start.disabled = false;
        show('引き継ぎを確認できませんでした。新しく開いた画面を確認してください。旧サイトの記録は残っています。');
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
      if (!child) { cleanup(); show('新しい画面を開けませんでした。このサイトのポップアップを許可して、もう一度押してください。'); return; }
      start.disabled = true; show('新サイトに記録を引き継いでいます…');
    });
  }
  async function target() {
    if (!/^[a-f0-9]{48}$/.test(nonce || '') || !window.opener) {
      show('引き継ぎは旧サイトから開始します。これまで学習したブラウザで下のリンクを開いてください。');
      home.href = OLD + OLD_PATH; home.textContent = '旧サイトから記録を引き継ぐ'; return;
    }
    const parent = window.opener;
    const store = await openStore();
    let busy = false;
    const ping = () => parent.postMessage(message('ready', nonce), OLD);
    const interval = setInterval(ping, 500);
    const timeout = setTimeout(() => { cleanup(); show('旧サイトとの接続を確認できませんでした。旧サイトからやり直してください。'); }, 120000);
    function cleanup() { clearInterval(interval); clearTimeout(timeout); window.removeEventListener('message', receive); }
    async function receive(e) {
      if (busy || e.origin !== OLD || e.source !== parent || e.data?.channel !== 'karimen-transfer-v1' || e.data.nonce !== nonce || e.data.type !== 'progress') return;
      busy = true; cleanup();
      try {
        if (typeof e.data.raw !== 'string' || e.data.raw.length > 8 * 1024 * 1024) throw new Error('記録の形式を確認できませんでした。旧サイトの記録は残っています。');
        const state = normalize(e.data.raw);
        if (!meaningful(state)) throw new Error('引き継ぐ学習記録がありません。');
        const raw = JSON.stringify(state);
        const current = store.getItem(KEY);
        if (current && meaningful(normalize(current)) && current !== raw) {
          throw new Error('新サイトにも学習記録があるため、上書きを止めました。両方の記録はそのまま残っています。記録の統合が必要です。');
        }
        if (store.conflict) throw new Error('別の画面で記録が更新されました。再読み込みしてください。');
        if (current !== raw) store.setItem(KEY, raw);
        await store.flush();
        if (store.conflict || store.status.message || !(store.status.primarySaved || store.status.backupSaved)) throw new Error('新サイトへの保存を確認できませんでした。旧サイトから再試行してください。');
        show('学習記録を引き継ぎました。回答履歴と途中の学習から続けられます。');
        home.textContent = '引き継いだ記録で学習を始める'; home.href = './';
        history.replaceState(null, '', location.pathname);
        parent.postMessage(message('saved', nonce), OLD);
      } catch (error) {
        show(error.message); parent.postMessage(message('error', nonce), OLD);
      }
    }
    window.addEventListener('message', receive); ping();
  }
  (async () => {
    if (location.origin === OLD && location.pathname === OLD_PATH) await source();
    else if (location.origin === NEW) await target();
    else show('引き継ぎは本番の旧サイト・新サイトで利用できます。');
  })().catch(error => show(error.message || '保存記録を確認できませんでした。記録は削除していません。'));
})();
