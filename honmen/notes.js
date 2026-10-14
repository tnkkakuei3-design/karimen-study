// Reuse the reviewed diagrams and notebook content; never read karimen progress.
function esc(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
window.HonmenNotes = (()=>{
  const map={sign:'標識・標示',signal:'信号・合図',inter:'交差点・通行',pass:'交差点・通行',ped:'歩行者保護',speed:'速度・車間距離',start:'運転・点検',basic:'免許・心得',hazard:'危険予測',park:'駐停車'};
  const group=n=>map[noteCategory(n).k]||'免許・心得';
  function render(root,{search='',filter='',bank}) {
    const term=search.trim().toLowerCase(),special=['高速道路','二輪車','危険予測'];
    const visible=NOTES.filter(n=>(!filter||group(n)===filter)&&(!term||[n.t,...n.pts,n.trap].join(' ').toLowerCase().includes(term)));
    const cats=[...new Set([...Object.values(map),...special])];
    const extras=special.filter(cat=>(!filter||cat===filter)&&(!term||cat.includes(term)));
    root.innerHTML=`<p class="muted learn-notes-intro">重要なポイントを、図で整理。</p><div class="toolbar"><label class="sr-only" for="note-search">図解ノートを検索</label><input id="note-search" type="search" placeholder="例：横断歩道、徐行" value="${esc(search)}"><label class="sr-only" for="note-filter">分野</label><select id="note-filter"><option value="">全分野</option>${cats.map(c=>`<option value="${esc(c)}" ${c===filter?'selected':''}>${c}</option>`).join('')}</select></div><p class="muted">${visible.length+extras.length}テーマ</p><div class="note-groups">${cats.map(cat=>{const list=visible.filter(n=>group(n)===cat);const extra=extras.includes(cat);if(!list.length&&!extra)return '';return `<section class="note-group"><h3 class="note-group-title">${icon('book')}${cat}<small>${list.length+Number(extra)}テーマ</small></h3><div class="note-grid">${list.map(n=>`<details class="note" data-h-note="${n.id}"><summary>${noteThumbnail(n)}<span class="note-summary-copy"><strong>${esc(n.t)}</strong><small>図解 ${n.figs.length}点 · 要点 ${n.pts.length}つ</small></span></summary><div class="note-content"></div></details>`).join('')}${extra?`<details class="note" data-h-note="special:${cat}"><summary><span class="note-preview" aria-hidden="true">${icon(cat==='危険予測'?'flag':cat==='高速道路'?'road':'carStart')}</span><span class="note-summary-copy"><strong>${cat}を問題で確認</strong><small>本免の問題と解説</small></span></summary><div class="note-content"></div></details>`:''}</div></section>`;}).join('')||'<div class="empty note-empty"><p>見つかりませんでした。別の言葉で探してください。</p><button class="textbtn" data-h="note-reset">検索と分野をリセット</button></div>'}</div>`;
  }
  function populate(el,bank) {
    if(el.dataset.loaded)return;
    const id=el.dataset.hNote,body=el.querySelector('.note-content');
    if(id.startsWith('special:')) {
      const cat=id.slice(8),qs=bank.filter(q=>cat==='危険予測'?q.type==='hazard':q.category===cat).slice(0,3);
      body.innerHTML=qs.map(q=>`<section class="h-note-example"><h3>第${q.set}回・問${q.number}</h3>${q.image?`<button class="h-figure" data-h="figure" data-id="${q.id}" aria-label="問題の図を拡大"><img src="./${esc(q.image)}" alt="${esc(q.imageAlt||'問題の図')}" loading="lazy"><small>タップして拡大</small></button>`:''}<p>${esc(q.text)}</p>${q.statements?`<ol>${q.statements.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}<p><b>正解：${(Array.isArray(q.answer)?q.answer:[q.answer]).map(x=>x?'○':'×').join('・')}</b></p><p>${esc(q.explanation)}</p></section>`).join('')+`<div class="note-bottom"><button class="btn" data-h="note-category" data-category="${cat}">この分野を10問学ぶ ${icon('arrow')}</button></div>`;
    }else {
      const n=NOTES.find(n=>n.id===id);if(!n)return;
      body.innerHTML=n.figs.map(k=>figHTML(k).replaceAll('data-action="figure-open"','data-h="note-figure"')).join('')+`<div class="note-keypoints"><h3>押さえるポイント</h3><ul>${n.pts.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div><div class="note-caution"><div class="caution-heading"><h3>間違えやすいところ</h3><img class="placement-character caution-guide" src="./assets/characters/D042.png" alt="" aria-hidden="true"></div><p>${esc(n.trap)}</p></div><div class="note-bottom"><button class="btn" data-h="note-category" data-category="${group(n)}">この分野を10問学ぶ ${icon('arrow')}</button><a class="source-link" href="${esc(n.source?.url||REFS.rules.url)}" target="_blank" rel="noopener">公式資料で確認 ↗</a></div>`;
    }
    el.dataset.loaded='true';
  }
  return {render,populate,figure:k=>figHTML(k).replace(/<button[^>]*>拡大 ↗<\/button>/g,'')};
})();
