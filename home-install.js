// Home-screen guidance is kept separate from learning records and imports.
(() => {
  const SEEN_KEY = 'karimen-home-install-seen-v1';
  const $ = id => document.getElementById(id);
  const standalone = () => navigator.standalone === true || ['standalone', 'fullscreen', 'minimal-ui'].some(mode => matchMedia(`(display-mode: ${mode})`).matches);
  const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isMobile = () => isIOS() || /Android/i.test(navigator.userAgent);
  let context, initialized = false, seen = false, deferredPrompt = null, platform = 'ios', returnToSettings = false;

  function wasSeen() {
    if (seen) return true;
    try { return localStorage.getItem(SEEN_KEY) === '1'; }
    catch { return true; } // With no persistent storage, avoid repeated invitations.
  }
  function markSeen() {
    seen = true;
    try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
  }
  function hidePrompt() {
    const prompt = $('home-install-prompt');
    if (prompt) prompt.hidden = true;
  }
  function dismiss() { markSeen(); hidePrompt(); }
  function sync() {
    if (!initialized) return;
    if (standalone()) { markSeen(); hidePrompt(); }
    if (!context.canPrompt()) hidePrompt();
    if (!context.canGuide() && $('home-install-guide').open) {
      returnToSettings = false;
      $('home-install-guide').close();
    }
  }
  const shareIcon = '<svg class="icon install-share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M7 10H5v11h14V10h-2"/></svg>';
  function guideMarkup() {
    const hasProgress = context.hasProgress();
    if (standalone()) return '<p class="install-status">ホーム画面から起動しています。</p>';
    const ios = platform === 'ios';
    return `<div class="install-platforms seg" role="group" aria-label="追加する端末"><button data-install-platform="ios" aria-pressed="${ios}">iPhone / iPad</button><button data-install-platform="android" aria-pressed="${!ios}">Android</button></div>
      <p class="muted">${ios ? 'Safariアプリでこのページを開いて追加します。' : 'Chromeでこのページを開いて操作してください。'}</p>
      ${ios ? '<div class="install-safari-tip"><strong>右下にコンパスマークがある方へ</strong><p>そのマークをタップしてSafariへ移り、下の手順で追加してください。</p></div>' : ''}
      ${!ios && deferredPrompt ? '<button class="btn wide install-native" data-install-action="native">ホーム画面に追加する</button>' : ''}
      <ol class="install-steps">${ios ? `<li><span>${shareIcon}<strong>「共有」を開く</strong><small>見当たらない場合は、ページのメニューから「共有」を選びます。</small></span></li><li><span><strong>「ホーム画面に追加」を選ぶ</strong><small>共有メニューを下へスクロールすると見つかります。</small></span></li><li><span><strong>「追加」をタップ</strong><small>プーリーくんの画像と「仮免ドリル」の名前を確認します。</small></span></li>` : '<li><span><strong>右上の「︙」を開く</strong></span></li><li><span><strong>「ホーム画面に追加」を選ぶ</strong><small>「インストール」や「インストールしてショートカットを作成」と表示される場合もあります。</small></span></li><li><span><strong>画面の案内に沿って追加</strong><small>「仮免ドリル」のアイコンが目印です。</small></span></li>'}</ol>
      ${ios ? '<details class="install-help"><summary>「ホーム画面に追加」が見つからないとき</summary><p class="muted">共有メニューの下にある「アクションを編集」から追加できます。別のアプリ内で開いている場合は、Safariで開き直してください。</p></details>' : ''}
      ${hasProgress ? '<div class="install-records"><strong>学習済みの記録を引き継ぐには</strong><p class="muted">追加前に記録を書き出しておくと安心です。追加後に記録が表示されない場合は、設定の「読み込む」から引き継げます。</p><button class="textbtn" data-install-action="export">学習記録を書き出す</button></div>' : ''}`;
  }
  function renderGuide() { $('home-install-guide-body').innerHTML = guideMarkup(); }
  function openGuide() {
    if (!context.canGuide()) return;
    dismiss();
    returnToSettings = ($('settings') || $('h-dialog')).open;
    if (returnToSettings) ($('settings') || $('h-dialog')).close();
    platform = isIOS() || !/Android/i.test(navigator.userAgent) ? 'ios' : 'android';
    renderGuide();
    $('home-install-close').textContent = returnToSettings ? '設定に戻る' : '閉じる';
    if (!$('home-install-guide').open) $('home-install-guide').showModal();
    $('home-install-guide-title').focus({preventScroll:true});
  }
  async function installNative(button) {
    const prompt = deferredPrompt;
    if (!prompt || standalone() || !context.canGuide()) return;
    deferredPrompt = null;
    button.disabled = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === 'accepted') {
        dismiss();
        $('home-install-guide').close();
        return;
      }
    } catch {} // Manual instructions remain usable if the browser declines.
    if ($('home-install-guide').open) renderGuide();
  }
  function settingsMarkup() {
    return `<div class="settings-group install-settings"><h3>ホーム画面に追加</h3>${standalone() ? '<p class="muted">ホーム画面から起動しています。</p>' : `<p class="muted">次回からアイコンをタップして開けます。</p><button class="textbtn" data-install-action="guide" ${context && !context.canGuide() ? 'disabled' : ''}>追加方法を見る ${icon('arrow')}</button>`}</div>`;
  }
  function init(options) {
    if (initialized) return;
    context = options;
    initialized = true;
    $('home-install-guide').addEventListener('close', () => {
      const restore = returnToSettings;
      returnToSettings = false;
      if (restore && context.canGuide()) context.openSettings();
    });
    document.addEventListener('click', event => {
      const choice = event.target.closest('[data-install-platform]');
      if (choice) {
        platform = choice.dataset.installPlatform;
        renderGuide();
        $('home-install-guide-body').querySelector(`[data-install-platform="${platform}"]`).focus();
        return;
      }
      const button = event.target.closest('[data-install-action]');
      if (!button || button.disabled) {
        if (event.target.closest('[data-action]')) hidePrompt();
        return;
      }
      const action = button.dataset.installAction;
      if (action === 'dismiss') dismiss();
      else if (action === 'guide') openGuide();
      else if (action === 'close') $('home-install-guide').close();
      else if (action === 'native') installNative(button);
      else if (action === 'export') context.exportRecord();
    });
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      dismiss();
      if ($('home-install-guide').open) $('home-install-guide').close();
    });
    window.addEventListener('pageshow', sync);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    matchMedia('(display-mode: standalone)').addEventListener?.('change', sync);
    window.addEventListener('storage', event => { if (event.key === SEEN_KEY && event.newValue === '1') { seen = true; hidePrompt(); } });
    requestAnimationFrame(() => {
      sync();
      if (!isMobile() || standalone() || wasSeen() || !context.canPrompt() || document.querySelector('dialog[open]')) return;
      markSeen();
      $('home-install-prompt').hidden = false;
    });
  }
  // Capture this early, but only offer the system prompt after a button press.
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (standalone()) return;
    deferredPrompt = event;
    if ($('home-install-guide')?.open) renderGuide();
  });
  window.KarimenHomeInstall = {init, sync, openGuide, settingsMarkup};
})();
