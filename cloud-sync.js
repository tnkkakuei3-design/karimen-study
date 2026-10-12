/* Optional cloud synchronization. Local saving remains the first write path. */
const KarimenCloud = (() => {
  let enabled = false, user = null, message = '', busy = false, paused = false, timer, host, knownRemote = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...options, headers: { 'Content-Type': 'application/json', 'X-Karimen-Request':'1', ...options.headers }, signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error || '接続できませんでした。'), { status: response.status });
    return data;
  }
  function markup() {
    if (!enabled) return '';
    const linked = host?.model.state.sync?.owner;
    return `<div class="settings-group" id="cloud-settings"><h3>クラウドに学習記録を保存</h3>${user
      ? `<p>${esc(user.email)}</p><p class="muted">回答・成績・途中の学習を自動で保存します。別の端末でも同じGoogleアカウントで続けられます。</p>`
      : `<p class="muted">登録なしでも学習できます。Googleでログインすると、学習記録をサーバーに保存し、別の端末にも引き継げます。${linked ? 'この端末の記録に紐づけたアカウントでログインしてください。' : ''}</p>`}
      <p id="cloud-save-status" role="status">${esc(message)}</p><div class="btnrow">${user
      ? '<button class="btn secondary" data-cloud-action="retry">同期を確認</button><button class="textbtn" data-cloud-action="logout">ログアウト</button>'
      : '<button class="btn secondary" data-cloud-action="login">Googleでログイン</button>'}</div><p class="muted"><a href="./privacy.html">保存する情報について</a></p></div>`;
  }
  function display(text = message) {
    message = text;
    const panel = document.getElementById('cloud-settings');
    if (panel) panel.outerHTML = markup();
  }
  function schedule(delay = 2500) { clearTimeout(timer); timer = setTimeout(sync, delay); }
  async function sync() {
    if (!enabled || !user || busy || paused || document.hidden) return;
    if (!navigator.onLine) { display('オフラインです。この端末に保存し、接続が戻ったら再送します。'); return; }
    if (host.model.readOnly || host.storage.conflict) { display('端末の保存記録を確認するため、同期を止めています。再読み込みしてください。'); return; }
    busy = true;
    try {
      const owner = host.model.state.sync?.owner;
      if (owner && owner !== user.id) { paused = true; throw new Error('この端末の記録は別のアカウントのものです。ログアウトし、元のアカウントで入り直してください。'); }
      display('クラウドの記録を確認しています…');
      const remote = await api('/api/progress');
      // An HTTP response can arrive after the user entered a question screen.
      // Never replace a live attempt underneath them. Its local writes continue.
      let local = KarimenCloudRecord.snapshot(host.model.exportData());
      const remoteText = remote.state ? KarimenCloudRecord.canonical(remote.state) : null;
      const different = remote.state && remoteText !== knownRemote && KarimenCloudRecord.canonical(local) !== remoteText;
      if (different || !owner) {
        if (!host.canApply()) { display('この端末に保存済み。学習画面を閉じると、他の端末の記録と同期します。'); return; }
        try { host.model.mergeCloud(remote.state, user.id); }
        catch (error) { paused = true; throw error; }
        await host.storage.flush?.();
        if (host.storage.conflict || host.storage.status?.message || (host.storage.status && !host.storage.status.primarySaved && !host.storage.status.backupSaved)) throw new Error('端末への保存を確認してから同期します。この画面を開いたままお待ちください。');
        host.changed();
        local = KarimenCloudRecord.snapshot(host.model.exportData());
      }
      if (!remote.state || KarimenCloudRecord.canonical(local) !== KarimenCloudRecord.canonical(remote.state)) {
        await api('/api/progress', { method: 'PUT', body: JSON.stringify({ revision: remote.revision, state: local }) });
      }
      knownRemote = KarimenCloudRecord.canonical(local);
      const stillCurrent = KarimenCloudRecord.canonical(local) === KarimenCloudRecord.canonical(KarimenCloudRecord.snapshot(host.model.exportData()));
      display(stillCurrent ? 'クラウドに保存済み' : '新しい回答をこの端末に保存しました。クラウドへ同期中です。');
      if (!stillCurrent) schedule();
    } catch (error) {
      if (error.status === 401) { user = null; display('ログインの有効期限が切れました。端末の記録は残っています。'); }
      else if (error.status === 409) { display('別の端末の記録と合わせています…'); schedule(1200); }
      else display(error.status || paused ? error.message : 'クラウドに接続できません。この端末に保存し、接続が戻ったら再送します。');
    } finally { busy = false; }
  }
  async function action(kind) {
    if (busy) return;
    if (kind === 'retry') { paused = false; return sync(); }
    if (kind === 'login') {
      busy = true;
      try {
        if (host.model.readOnly || host.storage.conflict) throw new Error('端末の記録を確認してからログインしてください。');
        host.beforeLogin();
        await host.storage.flush?.();
        if (host.storage.status && !host.storage.status.primarySaved && !host.storage.status.backupSaved) throw new Error('端末への保存を確認できませんでした。ログインの前に再読み込みしてください。');
        display('Googleのログイン画面へ進みます…');
        const result = await api('/api/auth/start', { method: 'POST', body: '{}' });
        const target = new URL(result.url);
        if (target.origin !== 'https://accounts.google.com') throw new Error('ログイン先を確認できません。');
        location.assign(target.href);
      } catch (error) { display(error.message); }
      finally { busy = false; }
    } else if (kind === 'logout') {
      busy = true;
      try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); user = null; paused = false; knownRemote = null; display('ログアウトしました。端末とクラウドの記録は保持しています。'); }
      catch (error) { display(error.message); }
      finally { busy = false; }
    }
  }
  async function init(options) {
    host = options;
    if (location.origin !== 'https://karimen-study.pages.dev') return;
    try {
      enabled = (await api('/api/cloud/config')).enabled === true;
      if (!enabled) return;
      user = (await api('/api/auth/me')).user;
      display(user ? 'クラウドに接続しました。記録を確認しています。' : '現在はこの端末・ブラウザに保存しています。');
      host.settingsChanged?.();
      document.addEventListener('click', event => {
        const button = event.target.closest('[data-cloud-action]');
        if (button) { event.preventDefault(); action(button.dataset.cloudAction); }
      });
      window.addEventListener('karimen-storage-status', () => { if (!busy) schedule(); });
      window.addEventListener('online', () => schedule(0));
      window.addEventListener('offline', () => { if (user) display('オフラインです。この端末に保存し、接続が戻ったら再送します。'); });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(0); });
      setInterval(() => schedule(0), 30000);
      if (new URL(location.href).searchParams.has('cloud')) {
        const url = new URL(location.href); url.searchParams.delete('cloud'); history.replaceState(null, '', url);
      }
      await sync();
    } catch { /* A disabled/unconfigured backend must not interrupt local study. */ }
  }
  return { init, settingsMarkup: markup };
})();
