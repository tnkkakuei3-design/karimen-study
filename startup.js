/* Restore records before the application can create or modify them. */
(() => {
  const entry = document.currentScript;
  const panel = document.getElementById('startup-status');
  panel.hidden = false;
  const lock = value => {
    document.getElementById('main').inert = value;
    document.getElementById('tabs').inert = value;
    document.getElementById('settings-button').disabled = value;
  };
  lock(true);
  window.KarimenStartup = (async () => {
    try {
      window.KarimenProgressStorage = await KarimenStorage.open({
        storage: window.localStorage, indexedDB: window.indexedDB,
        validate: KarimenModel.normalize, build: entry.dataset.build,
        onChange: () => window.dispatchEvent(new Event('karimen-storage-status'))
      });
      const script = document.createElement('script');
      script.src = entry.dataset.appSrc;
      await new Promise((resolve, reject) => {
        const stop = () => {
          window.removeEventListener('error', runtimeError);
          reject(new Error('画面を読み込めませんでした。再読み込みしてください。学習記録は保持しています。'));
        };
        const runtimeError = event => { if (event.filename === script.src) stop(); };
        window.addEventListener('error', runtimeError);
        script.onload = () => { window.removeEventListener('error', runtimeError); resolve(); };
        script.onerror = stop;
        document.body.append(script);
      });
      panel.hidden = true; lock(false);
      window.KarimenProgressStorage.protect(navigator.storage);
      return true;
    } catch (error) {
      panel.textContent = error.message || '保存記録を確認できませんでした。再読み込みしてください。';
      panel.setAttribute('role', 'alert');
      const retry = document.createElement('button');
      retry.className = 'btn secondary'; retry.textContent = '再読み込み';
      retry.addEventListener('click', () => location.reload()); panel.append(retry);
      return false;
    }
  })();
})();
