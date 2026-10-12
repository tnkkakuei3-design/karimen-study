(() => {
  if (location.origin !== 'https://tnkkakuei3-design.github.io' || !location.pathname.startsWith('/karimen-study/')) return;
  const notice = document.createElement('aside');
  notice.style.cssText = 'max-width:1040px;margin:12px auto;padding:16px;border:1px solid #cbd5e1;border-radius:16px;line-height:1.7';
  const text = document.createElement('p'); text.textContent = '新サイトを公開しました。これまでの学習記録を引き継いで利用できます。';
  const link = document.createElement('a'); link.href = './migration.html'; link.className = 'btn secondary'; link.textContent = '学習記録を引き継ぐ';
  notice.append(text, link); document.getElementById('main').before(notice);
})();
