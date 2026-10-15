// Honmen-only teaching material. Shared karimen notes remain unchanged.
function esc(value) {return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
window.HonmenNotes = (()=>{
  const map={sign:'標識・標示',signal:'信号・合図',inter:'交差点・通行',pass:'交差点・通行',ped:'歩行者保護',speed:'速度・車間距離',start:'運転・点検',basic:'免許・心得',hazard:'危険な場所',park:'駐停車'};
  const group=n=>n.hCategory||map[noteCategory(n).k]||'免許・心得';
  const matches={"n-dist": "(?=.*(?:駐車|停車))(?=.*(?:メートル|m|距離))", "n-stop": "駐車|停車", "n-pass": "追い?越|追い?抜", "n-left": "追い?越|追い?抜", "n-hill": "坂|勾配", "n-prio": "優先道路", "n-right": "右折", "n-emer": "緊急自動車", "n-time": "合図|方向指示", "n-sig": "信号", "n-sign": "標識", "n-road": "(?=.*路側帯)(?=.*(?:駐車|停車))", "n-safe": "安全地帯", "n-dis": "車間|停止距離|空走距離|制動距離", "n-time2": "合図|方向指示", "n-ped": "歩行者用信号", "n-tram": "路面電車|安全地帯", "n-close": "通行止め", "n-zone": "標示", "n-bus": "バス.*通行帯|通行帯.*バス", "n-fb": "(?=.*(?:駐車|停車))(?=.*(?:手前|前後|メートル))", "n-veh": "車両|軽車両", "n-rail": "踏切", "n-turn": "右折|左折", "n-yield": "交差点.*優先|優先.*交差点|道幅", "n-slow": "徐行", "n-rail2": "踏切", "n-kari": "仮免", "n-pedx": "横断歩道|歩行者", "n-lane": "通行帯|車線|中央線", "n-mind": "飲酒|疲労|体調|睡眠|過労", "n-entry": "進入禁止|通行止め", "n-arrow": "矢印|停止線", "n-hand": "手.*合図|合図.*手", "n-police": "警察官|手信号", "n-speed": "最高速度|法定速度", "n-jam": "交差点.*渋滞|渋滞.*交差点", "n-at": "オートマチック|AT車|クリープ|チェンジレバー", "n-waka": "初心者|乗り降り|乗降", "n-at-new": "オートマチック|AT車|ABS|運転支援", "n-start-new": "発進|死角|点検", "n-aux-new": "補助標識", "n-meeting-new": "行き違|すれ違|ゆず|譲", "n-bus-new": "バス.*発進|発進.*バス", "n-speed-new": "法定速度|中央線|生活道路", "n-cycle-new": "自転車.*側方|側方.*自転車", "n-round-new": "環状交差点", "n-dedicated": "専用.*標識|標識.*専用", "n-crossing-signs": "横断歩道|歩行者専用", "n-indications": "優先道路|安全地帯|中央線", "n-warning-signs": "警戒標識", "n-weight-sign": "重量|積載", "n-direction-signs": "指定方向|左折可|矢印.*標識|標識.*矢印", "n-road-marks": "標示|黄色|黄の線", "n-cycle-marks": "自転車.*標示|標示.*自転車|自転車横断帯", "n-lines": "黄色|黄の線|はみ出|進路変更", "n-moped-turn": "二段階右折|小回り右折", "n-brake": "ブレーキ|ABS", "n-licenses": "免許|最大積載量|車両総重量", "n-license-duty": "免許", "n-inside-wheel": "内輪差|巻き込", "n-stop-position": "停止位置|停止線|手信号", "n-responsibility": "責任|賠償|道路交通法|交通規則", "n-ready": "体調|点検|疲労|睡眠|運転計画", "n-horn": "警音器|警笛"};
  const extraData=[["h-merge", "高速道路", "合流と出口", "合流|加速車線|減速車線|本線車道から出", ["加速車線：本線の流れに合わせる", "合流：ミラーと目視で確認", "出口：減速車線に入って減速"], ["本線を走る車の進行を妨げないように合流します。", "出口では感覚だけに頼らず速度計で確認します。"], "本線上で急減速したり、死角を見ずに合流したりしない。"], ["h-highway", "高速道路", "高速走行と車間距離", "高速道路|高速自動車国道|ハイドロ|スタンディング", ["走行前：タイヤ・燃料を点検", "走行中：速度と車間を確認", "雨天：速度を落とし車間を広げる"], ["高速走行では停止に必要な距離が長くなります。", "雨や横風、路面の状態に応じて速度を調整します。"], "制限速度以内でも、その場の状況によっては減速が必要です。"], ["h-emergency", "高速道路", "高速道路で故障したら", "高速.*故障|故障.*高速|停止表示|非常電話", ["停止：可能なら安全な路肩へ", "退避：車から離れ安全な場所へ", "通報：安全を確保して救援依頼"], ["後続車へ危険を知らせ、停止表示器材等は自分の安全を確保して使用します。", "車内や車の前後で待たず、ガードレールの外側など安全な場所へ避難します。"], "器材の設置や車の修理のために危険な車道にとどまらない。"], ["h-bike-brake", "二輪車", "二輪のブレーキとカーブ", "二輪.*ブレーキ|ブレーキ.*二輪|前輪|後輪|カーブ|クラッチ", ["手前：直線で十分に減速", "カーブ：急操作を避ける", "制動：前後輪をバランスよく使う"], ["カーブは手前の直線部分で十分に速度を落とします。", "車体を安定させ、前後輪のブレーキを適切に併用します。"], "カーブ中の急ブレーキや、クラッチを切ったままの惰性走行は危険です。"], ["h-bike-visible", "二輪車", "二輪の死角と交差点", "二輪|ヘルメット|プロテクター", ["四輪側：死角の二輪を探す", "二輪側：右折車の動きを見る", "双方：先に行けると決めつけない"], ["二輪車は小さく見え、実際より遠い・遅いと見誤られることがあります。", "ヘルメットを正しく着用し、身体を保護する服装で運転します。"], "相手がこちらに気付いていると決めつけない。"], ["h-hazard", "危険予測", "危険を見つける順番", "", ["見る：死角・人・路面", "予測：次にどう動くか", "対応：減速・間隔・停止準備"], ["見えない場所にも人や車がいる可能性を考えます。", "3つの判断をそれぞれ確かめます。すべて同じ○×になる問題もあります。"], "危険に気付くだけでなく、その後の操作が安全かまで判断します。"]];
  const extraNotes=extraData.map(([id,hCategory,t,pattern,steps,pts,trap])=>({id,hCategory,t,pattern,steps,pts,trap,figs:[]}));
  const all=()=>[...NOTES,...extraNotes];
  function questions(id,bank) {
    const n=all().find(n=>n.id===id);if(!n)return [];
    if(id==='h-hazard')return bank.filter(q=>q.type==='hazard');
    const pattern=n.pattern||matches[id];if(!pattern)return [];
    const re=new RegExp(pattern);
    return bank.filter(q=> {
      if(n.hCategory==='二輪車'&&q.category!=='二輪車')return false;
      if(n.hCategory==='高速道路'&&q.category!=='高速道路'&&q.type!=='hazard')return false;
      return re.test([q.text,...(q.statements||[])].join(' '));
    });
  }
  function related(q) {
    if(q.type==='hazard')return extraNotes.filter(n=>n.id==='h-hazard');
    return all().filter(n=>group(n)===q.category&&questions(n.id,[q]).length).sort((a,b)=>Number(!!b.hCategory)-Number(!!a.hCategory)).slice(0,2);
  }
  function title(id){return all().find(n=>n.id===id)?.t||'テーマ学習';}
  function drill(n,bank){const count=questions(n.id,bank).length;return count?`<button class="btn" data-h="note-drill" data-note="${n.id}">このテーマを${Math.min(count,10)}問学ぶ ${icon('arrow')}</button>`:'<p class="muted">このテーマは参考ノートです。対応する本免問題はありません。</p>';}
  function render(root,{search='',filter='',bank}) {
    const term=search.trim().toLowerCase(),cats=[...new Set(all().map(group))];
    const visible=all().filter(n=>(!filter||group(n)===filter)&&(!term||[n.t,...n.pts,n.trap,...(n.steps||[])].join(' ').toLowerCase().includes(term)));
    root.innerHTML=`<p class="muted learn-notes-intro">重要なポイントを、図で整理。</p><div class="toolbar"><label class="sr-only" for="note-search">図解ノートを検索</label><input id="note-search" type="search" placeholder="例：横断歩道、合流" value="${esc(search)}"><label class="sr-only" for="note-filter">分野</label><select id="note-filter"><option value="">全分野</option>${cats.map(c=>`<option value="${esc(c)}" ${c===filter?'selected':''}>${c}</option>`).join('')}</select></div><p class="muted">${visible.length}テーマ</p><div class="note-groups">${cats.map(cat=>{const list=visible.filter(n=>group(n)===cat);return list.length?`<section class="note-group"><h3 class="note-group-title">${icon('book')}${cat}<small>${list.length}テーマ</small></h3><div class="note-grid">${list.map(n=>{const count=questions(n.id,bank).length;return `<details class="note" data-h-note="${n.id}"><summary>${n.steps?`<span class="note-preview" aria-hidden="true">${icon(cat==='高速道路'?'road':cat==='二輪車'?'carStart':'flag')}</span>`:noteThumbnail(n)}<span class="note-summary-copy"><strong>${esc(n.t)}</strong><small>${n.steps?'流れと要点':`図解 ${n.figs.length}点`} · ${count?`対応 ${count}問`:'参考ノート'}</small></span></summary><div class="note-content"></div></details>`;}).join('')}</div></section>`:'';}).join('')||'<div class="empty"><p>見つかりませんでした。</p><button class="textbtn" data-h="note-reset">検索と分野をリセット</button></div>'}</div>`;
  }
  function populate(el,bank) {
    if(el.dataset.loaded)return;
    const n=all().find(n=>n.id===el.dataset.hNote);if(!n)return;
    const body=el.querySelector('.note-content');
    const diagram=n.steps?`<ol class="h-note-flow" aria-label="${esc(n.t)}の流れ">${n.steps.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:n.figs.map(k=>figHTML(k).replaceAll('data-action="figure-open"','data-h="note-figure"')).join('');
    const examples=n.steps?questions(n.id,bank).slice(0,2).map(q=>`<details class="h-note-example"><summary>第${HONMEN_DATA.sets.indexOf(q.set)+1}回・問${q.number}で確認</summary><p>${esc(q.text)}</p>${q.image?`<button class="h-figure" data-h="figure" data-id="${q.id}" aria-label="問題の図を拡大"><img src="./${esc(q.image)}?v=${q.imageHash.slice(0,12)}" alt="${esc(q.imageAlt)}" loading="lazy"></button>`:''}${q.statements?`<ol>${q.statements.map((t,i)=>`<li><b>${q.answer[i]?'○':'×'} ${esc(t)}</b><p>${esc(window.HonmenTeaching?.[q.id]?.[i]||'')}</p></li>`).join('')}</ol>`:`<p><b>正解：${q.answer?'○':'×'}</b></p>`}<p>${esc(q.explanation)}</p></details>`).join(''):'';
    body.innerHTML=diagram+`<div class="note-keypoints"><h3>押さえるポイント</h3><ul>${n.pts.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div><div class="note-caution"><div class="caution-heading"><h3>間違えやすいところ</h3><img class="placement-character caution-guide" src="./assets/characters/D042.png" alt="" aria-hidden="true"></div><p>${esc(n.trap)}</p></div>${examples}<div class="note-bottom">${drill(n,bank)}<a class="source-link" href="${esc(n.id==='h-emergency'?'https://www.npa.go.jp/bureau/traffic/highway/':n.source?.url||REFS.rules.url)}" target="_blank" rel="noopener">公式資料で確認 ↗</a></div>`;
    el.dataset.loaded='true';
  }
  return {render,populate,questions,title,related,figure:k=>figHTML(k).replace(/<button[^>]*>拡大 ↗<\/button>/g,'')};
})();
