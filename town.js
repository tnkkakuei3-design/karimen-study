/* Independent local restaurant guide. Never writes to KarimenModel or its storage keys. */
(() => {
  'use strict';
  const data = window.KarimenTownData;
  if (!data?.shops?.length) return;
  const shops = data.shops;
  const byId = new Map(shops.map(shop => [shop.id, shop]));
  const config = window.KarimenTownConfig || {};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    food:'M5 3v6m3-6v6M3 3v6a3 3 0 0 0 6 0V3M6 12v9M17 3c-3 2-3 7 0 8h3M20 3v18',
    map:'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Zm6-3v15m6-12v15',
    pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    photo:'M3 4h18v16H3ZM3 16l6-6 5 5 3-3 4 4M16 8h.01',
    ticket:'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4ZM9 5v2m0 3v2m0 3v4',
    save:'M6 3h12v18l-6-4-6 4Z',
    back:'M20 12H4m7-7-7 7 7 7',
    arrow:'M4 12h16m-7-7 7 7-7 7',
    phone:'m7 3 3 5-3 3a18 18 0 0 0 6 6l3-3 5 3c0 4-3 5-6 4C9 19 5 15 3 9 2 6 3 3 7 3Z',
    walk:'M13 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 21l2-6-3-4 3-3 4 4h4M5 14l4-3m3 4 5 6',
    search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    cafe:'M4 7h12v7a6 6 0 0 1-12 0Zm12 1h2a3 3 0 0 1 0 6h-2M3 22h14M8 2v2m4-2v2',
    bag:'M4 7h16l1 14H3ZM8 7V5a4 4 0 0 1 8 0v2',
    shop:'M3 10V7l3-4h12l3 4v3M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 13v8h14v-8M9 21v-6h6v6',
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.food}"/></svg>`;
  const safeUrl = value => {
    if (!value) return '';
    try { const u = new URL(value, location.href); return u.protocol === 'https:' || (u.origin === location.origin && u.protocol === 'http:') ? u.href : ''; } catch { return ''; }
  };
  const link = (url, label, cls = '') => !url ? '' : `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="${cls}">${label}</a>`;
  const normalize = s => String(s).normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s・〜～ー-]/g, '');
  const mapPlaceId = shop => config.placeIds?.[shop.id] || shop.mapPlaceId;
  const searchUrl = shop => {
    if (!shop.address && !mapPlaceId(shop)) return '';
    const params = new URLSearchParams({api:'1',query:[shop.name,shop.address || '沖縄県糸満市',!shop.address ? shop.phone : ''].filter(Boolean).join(' ')});
    const placeId = mapPlaceId(shop);
    if (placeId) params.set('query_place_id', placeId);
    return `https://www.google.com/maps/search/?${params}`;
  };
  const routeUrl = shop => {
    // Do not offer a destination until its location is verified.
    if (!shop.address && !mapPlaceId(shop)) return '';
    const params = new URLSearchParams({api:'1',origin:`${data.school.name} ${data.school.address}`,destination:`${shop.name} ${shop.address || ''}`,travelmode:'walking'});
    if (mapPlaceId(shop)) params.set('destination_place_id',mapPlaceId(shop));
    return `https://www.google.com/maps/dir/?${params}`;
  };
  const filters = [['all','すべて'],['meal','ごはん'],['cafe','カフェ'],['takeout','持ち帰り'],['bakery','パン・ケーキ'],['market','市場・横丁'],['saved','保存したお店']];
  const bookmarkKey = 'karimen-town-bookmarks-v1';
  let saved = new Set();
  try { const list=JSON.parse(localStorage.getItem(bookmarkKey)||'[]'); if(Array.isArray(list))saved=new Set(list.filter(id=>byId.has(id))); } catch {}
  let api = null, selected = null, mode = 'cards', filter = 'all', query = '', mapShop = (shops.find(shop => shop.embedUrl) || shops[0]).id;
  let listScroll = 0, composing = false, initDone = false, photoObserver = null, requestVersion = 0;
  let mapsPromise = null;
  const photoRequests = new Map();
  const root = () => document.getElementById('town');
  const isOpen = () => root() && !root().hidden;
  function announce(message) { const el = document.getElementById('town-status'); if(el)el.textContent=message; }
  function notify(message) { announce(message); api?.notify(message); }
  function bookmarkButton(shop) {
    return `<button class="town-save" data-town-action="save" data-id="${shop.id}" aria-label="${esc(shop.name)}を保存" aria-pressed="${saved.has(shop.id)}">${icon('save')}</button>`;
  }
  function badge(shop) { return `<span class="town-ticket">${shop.facility ? '施設内の飲食店で食券利用可' : '食券利用可'}</span>`; }
  function media(shop, kind='card') {
    const glyph = shop.tags.includes('cafe') ? 'cafe' : shop.tags.includes('bakery') ? 'bag' : shop.facility ? 'shop' : 'food';
    return `<div class="town-media town-media-${kind}" data-town-photo="${shop.id}"><div class="town-photo-placeholder">${icon(glyph)}<small>店舗写真は未掲載です</small></div></div>`;
  }
  const timeText = minutes => `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`;
  function scheduleStatus(shop, now=new Date()) {
    const rule=data.schedules?.[shop.id];
    const check=note=>({kind:'check',label:'営業状況は要確認',note});
    if(!rule)return check('店舗にご確認ください');
    const date=new Date(now.getTime()+9*60*60*1000);
    const minutes=date.getUTCHours()*60+date.getUTCMinutes();
    if(rule.uncertain){
      const ranges=[0,6].includes(date.getUTCDay())&&rule.weekendRanges?rule.weekendRanges:rule.ranges;
      if(ranges&&!ranges.some(([start,end])=>minutes>=start&&minutes<end)){
        return {kind:'outside',label:'営業時間外',note:`案内表の時間外・${rule.uncertain}`};
      }
      return check(rule.uncertain);
    }
    const holidayData=data.holidays;
    const dayInfo=d=>{
      const weekday=d.getUTCDay();
      const lastWednesday=rule.lastWednesday&&weekday===3&&new Date(d.getTime()+7*86400000).getUTCMonth()!==d.getUTCMonth();
      const holidayKnown=holidayData&&holidayData.years.includes(d.getUTCFullYear());
      const holiday=holidayKnown&&Boolean(holidayData.dates[d.toISOString().slice(0,10)]);
      return {closed:rule.closed.includes(weekday)||lastWednesday||(rule.holidays&&holiday),unknown:rule.holidays&&!holidayKnown,hours:weekday===0&&rule.sunday?rule.sunday:rule.hours};
    };
    const today=dayInfo(date);
    const nextOpening=()=>{
      for(let offset=0;offset<=7;offset++){
        const d=new Date(date.getTime()+offset*86400000),info=dayInfo(d);
        if(info.unknown)return '';
        if(info.closed || (offset===0&&minutes>=info.hours[0]))continue;
        const prefix=offset===0?'本日':offset===1?'明日':`${d.getUTCMonth()+1}/${d.getUTCDate()}`;
        return `${prefix} ${timeText(info.hours[0])}〜の予定`;
      }
      return '';
    };
    if(today.closed)return {kind:'closed',label:'本日定休日',note:nextOpening()};
    const [start,end]=today.hours;
    if(minutes<start || (end!==null&&minutes>=end))return {kind:'outside',label:'営業時間外',note:nextOpening()};
    if(today.unknown)return check('祝日の営業は店舗にご確認ください');
    if(rule.soldOut)return check('案内上は営業時間内・売り切れ次第終了');
    if(rule.lastOrder&&minutes>=rule.lastOrder)return check('ラストオーダー時刻を過ぎています');
    return {kind:'open',label:'営業予定',note:`案内上は${timeText(end)}まで`};
  }
  function scheduleSummary(shop) {
    const status=scheduleStatus(shop);
    return `<div class="town-hours" data-town-hours="${shop.id}"><div class="town-hours-status" data-kind="${status.kind}"><strong>${esc(status.label)}</strong><span>${esc(status.note)}</span></div><dl><div><dt>営業時間</dt><dd>${esc(shop.hours)}</dd></div><div><dt>定休日</dt><dd>${esc(shop.closed)}</dd></div></dl></div>`;
  }
  function updateSchedules(){
    refreshHomeRecommendation();
    if(!isOpen())return;
    root().querySelectorAll('[data-town-hours]').forEach(el=>{
      const status=scheduleStatus(byId.get(el.dataset.townHours));
      const label=el.querySelector('.town-hours-status');
      label.dataset.kind=status.kind;label.querySelector('strong').textContent=status.label;label.querySelector('span').textContent=status.note;
      const card=el.closest('.town-card');if(card)card.dataset.townState=status.kind;
    });
    // Move existing nodes so loaded photos, map selection and controls are preserved.
    const ordered=matches();
    for(const [container,selector] of [['.town-grid','.town-card'],['.town-map-picker','button']]){
      const holder=root().querySelector(container);if(!holder)continue;
      const nodes=new Map([...holder.querySelectorAll(selector)].map(el=>[el.dataset.id||el.querySelector('[data-town-action="shop"]').dataset.id,el]));
      ordered.forEach((shop,index)=>{const node=nodes.get(shop.id);if(node&&holder.children[index]!==node)holder.insertBefore(node,holder.children[index]||null);});
    }
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateSchedules();});
  window.addEventListener('focus',updateSchedules);
  window.setInterval(updateSchedules,60000);
  function card(shop) {
    return `<article class="town-card" data-town-state="${scheduleStatus(shop).kind}"><div class="town-card-head"><button class="town-card-copy" data-town-action="shop" data-id="${shop.id}"><span><strong>${esc(shop.shortName || shop.name)}</strong><small>${esc(shop.category)}</small></span>${icon('arrow')}</button>${bookmarkButton(shop)}</div><p class="town-card-menu">${esc(shop.menus.slice(0,3).join('・'))}</p>${scheduleSummary(shop)}${media(shop)}<div class="town-card-foot">${shop.facility?'<span>食券は施設内の飲食店で利用可</span>':'<span></span>'}${link(searchUrl(shop),'Googleマップ ↗','town-photo-link')}</div></article>`;
  }
  function homeRecommendation() {
    const now=new Date();
    const available=shops.filter(shop=>scheduleStatus(shop,now).kind==='open');
    if(!available.length)return '<p class="town-home-empty">現在、営業時間内と確認できるお店はありません。</p>';
    const day=Math.floor((now.getTime()+9*3600000)/86400000);
    const shop=available[day%available.length],status=scheduleStatus(shop,now),photo=suppliedPhotos(shop)[0];
    return `<div class="town-home-pick" data-recommended-shop="${shop.id}"><p class="town-home-label">営業時間内のおすすめ <span>案内表の予定</span></p><button class="town-home-shop" data-town-action="shop" data-id="${shop.id}">${photo?`<img src="${esc(photo.url)}" alt="${esc(photo.alt)}" width="104" height="80" loading="lazy" decoding="async">`:icon('food')}<span><strong>${esc(shop.shortName||shop.name)}</strong><small>${esc(shop.menus.slice(0,2).join('・'))}</small><small class="town-home-hours">${esc(status.note)}</small></span>${icon('arrow')}</button>${photo?photoCredit(photo,true).replace('<figcaption','<div').replace('</figcaption>','</div>'):''}<p class="town-home-note">臨時休業・売り切れは各店へご確認ください。</p></div>`;
  }
  function refreshHomeRecommendation(){
    const holder=document.querySelector('#mock:not([hidden]) .town-home-recommendation');
    if(!holder)return;
    const content=homeRecommendation();
    if(holder.dataset.signature===content)return;
    const restoreFocus=holder.contains(document.activeElement);
    holder.innerHTML=content;holder.dataset.signature=content;
    if(restoreFocus)(holder.querySelector('button')||holder.closest('.town-teaser').querySelector('.town-directory-entry')).focus({preventScroll:true});
  }
  function matches() {
    const term = normalize(query);
    const now=new Date(),priority={open:0,check:1,outside:2,closed:3};
    const rank=new Map(shops.map(shop=>[shop.id,priority[scheduleStatus(shop,now).kind]]));
    return shops.filter(shop => (filter==='all' || (filter==='saved' ? saved.has(shop.id) : shop.tags.includes(filter))) && (!term || normalize([shop.name,shop.category,...shop.menus].join(' ')).includes(term)))
      .sort((a,b)=>rank.get(a.id)-rank.get(b.id)||a.number-b.number);
  }
  function routeHash(id) { return id ? `#town/${encodeURIComponent(id)}` : '#town'; }
  function setRoute(id, replace=false) {
    const hash=routeHash(id); if(location.hash===hash)return;
    history[replace?'replaceState':'pushState']({...history.state,karimenTown:true},'',location.pathname+location.search+hash);
  }
  function open(id, fromHistory=false) {
    if(api?.canOpen && !api.canOpen())return;
    if(id&&!byId.has(id))id=null;
    if(isOpen()&&!selected&&id)listScroll=window.scrollY;
    selected=id || null;
    if(!fromHistory)setRoute(selected);
    render(); api?.open();
    document.getElementById('town-title')?.focus({preventScroll:true});
  }
  function close() {
    closePhotoViewer();
    history.replaceState({...history.state,karimenTown:false},'',location.pathname+location.search);
    selected=null; disconnectPhotos(); api?.back();
  }
  function backToList() { open(null); window.scrollTo({top:listScroll,behavior:'instant'}); document.querySelector(`[data-town-action="shop"][data-id="${mapShop}"]`)?.focus({preventScroll:true}); }
  const townCharacter = () => '<img class="town-character" src="./assets/characters/D012.png" width="400" height="400" alt="" aria-hidden="true" decoding="async">';
  function directory() {
    return `<div class="town-topline"><button class="textbtn" data-town-action="close">${icon('back')}模試へ戻る</button><span class="town-pr">店舗案内 · PR</span></div><div class="town-heading"><div class="town-heading-copy"><p class="town-eyebrow">糸満自動車学校周辺</p><h2 id="town-title" tabindex="-1">食券が使えるお店</h2></div>${townCharacter()}</div><div class="town-modes" role="group" aria-label="お店の探し方">${[['cards','photo','一覧'],['map','map','地図']].map(([value,glyph,label])=>`<button data-town-action="mode" data-value="${value}" aria-pressed="${mode===value}">${icon(glyph)}${label}</button>`).join('')}</div><label class="town-search">${icon('search')}<span class="sr-only">店名やメニューで探す</span><input id="town-search" type="search" autocomplete="off" value="${esc(query)}" placeholder="店名・メニューで検索"></label><div class="town-filters" role="group" aria-label="お店の種類">${filters.map(([value,label])=>`<button data-town-action="filter" data-value="${value}" aria-pressed="${filter===value}">${label}</button>`).join('')}</div><p class="town-hours-notice">営業表示は案内表に基づく予定です。臨時休業・売り切れは各店へ。</p><div class="town-list-meta"><p class="town-count" id="town-count"></p><span>営業時間内の予定を上に表示</span></div><div id="town-results"></div><details class="town-source-note"><summary>食券の利用・掲載情報について</summary><p>食券の対象メニュー・差額・利用時間は、食券の案内と各店でご確認ください。市場・横丁では施設内の飲食店が対象です。</p><p>メニュー・営業時間・定休日は教習所の案内表をもとに、日本時間で表示しています。店舗情報の確認日：2026年10月12日。</p><p>写真は実際の店舗・施設のものです。撮影・掲載時期が分かるものは併記しています。出典と利用条件は各写真と${link('./assets/town/SOURCES.json','写真の出典一覧')}をご覧ください。</p><p>地図や外部リンクを開くとGoogle等へ接続します。学習の回答・成績は送信しません。${link('https://policies.google.com/privacy','Googleプライバシーポリシー')}・${link('https://www.google.com/intl/ja/help/terms_maps/','Googleマップ利用規約')}</p></details><p id="town-status" class="sr-only" role="status" aria-live="polite"></p>`;
  }
  function embeddedMap(shop) {
    let src = safeUrl(shop.embedUrl || '');
    if (!shop.embedUrl) src='';
    if (!src && config.googleMapsApiKey && config.placeIds?.[shop.id]) {
      const params=new URLSearchParams({key:config.googleMapsApiKey,q:`place_id:${config.placeIds[shop.id]}`,language:'ja'});
      src=`https://www.google.com/maps/embed/v1/place?${params}`;
    }
    return src ? `<div class="town-map-frame"><iframe title="${esc(shop.name)}のGoogleマップ" src="${esc(src)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><p class="town-map-fallback">地図が表示されない場合は ${link(searchUrl(shop),'Googleマップで開く ↗')}</p>` : `<div class="town-map-fallback-card">${icon('map')}<strong>${shop.address ? esc(shop.address) : shop.mapNote ? '所在地を確認中' : '場所をGoogleマップで確認'}</strong><p>${shop.mapNote ? esc(shop.mapNote) : shop.address ? '教習所からの徒歩ルートを確認できます。' : '同名のお店があるため、電話番号や所在地を確認してお選びください。'}</p>${link(searchUrl(shop),'Googleマップを開く ↗','btn secondary')}</div>`;
  }
  function mapResults(list) {
    if(!list.some(s=>s.id===mapShop))mapShop=(list.find(shop=>shop.embedUrl)||list[0]).id;
    const shop=byId.get(mapShop);
    return `<div class="town-map-layout"><div class="town-map-picker" role="group" aria-label="地図に表示するお店">${list.map(s=>`<button data-town-action="map-shop" data-id="${s.id}" aria-pressed="${s.id===mapShop}"><span class="town-number">${s.number}</span>${esc(s.shortName||s.name)}</button>`).join('')}</div><div class="town-map-selected"><h3>${esc(shop.name)}</h3>${scheduleSummary(shop)}${embeddedMap(shop)}<div class="town-map-actions"><button class="btn secondary" data-town-action="shop" data-id="${shop.id}">お店の詳細を見る ${icon('arrow')}</button>${link(routeUrl(shop),shop.address||mapPlaceId(shop)?'徒歩ルートを見る ↗':'お店の場所を探す ↗','textbtn')}</div></div></div>`;
  }
  function refreshResults() {
    const holder=document.getElementById('town-results'); if(!holder)return;
    disconnectPhotos(); const list=matches();
    document.getElementById('town-count').textContent=`${list.length}件の店舗・施設${filter==='saved'?' · この端末に保存':''}`;
    holder.innerHTML=list.length ? (mode==='cards'?`<div class="town-grid">${list.map(card).join('')}</div>`:mapResults(list)) : `<div class="town-empty">${filter==='saved'?townCharacter():icon('search')}<h3>${filter==='saved'?'保存したお店はありません':'該当するお店がありません'}</h3><p>${filter==='saved'?'店名横のしおりから保存できます。':'店名や検索条件を変更してください。'}</p><button class="btn secondary" data-town-action="reset">すべてのお店を見る</button></div>`;
    activatePhotos(holder);
    announce(`${list.length}件のお店を表示しています`);
  }
  function detail(shop) {
    const canRoute=Boolean(shop.address || mapPlaceId(shop));
    const addressSource=shop.source ? link(shop.source,'店舗情報の出典 ↗','town-source-link') : '';
    const socialLink=safeUrl(shop.instagram) ? link(safeUrl(shop.instagram),'公式Instagramで写真を見る ↗','town-source-link') : '';
    return `<div class="town-topline"><button class="textbtn" data-town-action="list">${icon('back')}お店一覧へ</button><span class="town-pr">店舗案内 · PR</span></div>
      <div class="town-detail-heading"><div><p class="town-eyebrow">${esc(shop.category)}</p><h2 id="town-title" tabindex="-1">${esc(shop.name)}</h2>${badge(shop)}</div>${bookmarkButton(shop)}</div>
      ${scheduleSummary(shop)}<p class="town-hours-notice">案内表に基づく営業予定です。臨時休業・売り切れは各店へ。</p>
      <div class="town-detail-hero">${media(shop,'detail')}</div>
      ${link(searchUrl(shop),'Googleマップの写真・口コミ ↗','textbtn town-all-photos')}${socialLink}
      <section class="town-detail-section"><h3>主なメニュー</h3><ul class="town-menu-list">${shop.menus.map(menu=>`<li>${esc(menu)}</li>`).join('')}</ul><p class="town-menu-note">教習所の案内表より。</p></section>
      <section class="town-detail-section"><h3>店舗情報</h3><dl class="town-details">${shop.phone?`<div><dt>電話</dt><dd><a href="tel:${shop.phone.replace(/-/g,'')}">${esc(shop.phone)}</a></dd></div>`:''}${shop.address?`<div><dt>住所</dt><dd>${esc(shop.address)}</dd></div>`:''}</dl>${shop.note?`<p class="town-store-note">${esc(shop.note)}</p>`:''}${addressSource}</section>
      <section class="town-detail-section"><h3>地図・行き方</h3>${embeddedMap(shop)}<p class="town-section-sub">${canRoute?'徒歩ルートの出発地：糸満自動車学校':'所在地は店舗または教習所にご確認ください。'}</p></section>
      <div class="town-voucher-info">${townCharacter()}<div><h3>食券のご利用について</h3><p>${shop.facility?'施設内の飲食店が対象です。':''}対象メニュー・差額・利用時間は各店でご確認ください。</p></div></div>
      <div class="town-detail-actions">${link(routeUrl(shop),`${icon(canRoute?'walk':'search')}${canRoute?'徒歩ルートを見る':'場所を確認する'}`,'btn')}${shop.phone?`<a class="btn secondary" href="tel:${shop.phone.replace(/-/g,'')}">${icon('phone')}電話する</a>`:''}</div><p id="town-status" class="sr-only" role="status" aria-live="polite"></p>`;
  }
  function render() {
    closePhotoViewer();
    if(!root())return;
    disconnectPhotos(); requestVersion++;
    root().innerHTML=selected ? detail(byId.get(selected)) : directory();
    if(!selected)refreshResults(); else activatePhotos(root());
  }
  function disconnectPhotos() { photoObserver?.disconnect(); photoObserver=null; }
  function suppliedPhotos(shop) {
    // Selecting a sourced photo for display does not establish a reuse licence.
    return (config.suppliedPhotos?.[shop.id]||[]).filter(p=>p.kind==='venue'&&p.shopId===shop.id&&(p.permission||p.selectedForDisplay===true)&&p.credit&&safeUrl(p.url)).map(p=>({...p,url:safeUrl(p.url),sourceUrl:safeUrl(p.sourceUrl||''),authors:[],google:false}));
  }
  function loadMaps() {
    if(!config.googleMapsApiKey)return Promise.reject(new Error('Maps is not configured'));
    if(window.google?.maps?.importLibrary)return Promise.resolve(window.google.maps);
    if(mapsPromise)return mapsPromise;
    mapsPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script'); let timer;
      const stop=()=>{clearTimeout(timer);delete window.karimenTownMapsReady;script.remove();reject(new Error('Maps is unavailable'));};
      window.karimenTownMapsReady=()=>{clearTimeout(timer);resolve(window.google.maps);delete window.karimenTownMapsReady;};
      const params=new URLSearchParams({key:config.googleMapsApiKey,loading:'async',callback:'karimenTownMapsReady',v:'quarterly',language:'ja',region:'JP'});
      script.src=`https://maps.googleapis.com/maps/api/js?${params}`;script.async=true;script.onerror=stop;timer=setTimeout(stop,12000);document.head.appendChild(script);
    });
    return mapsPromise;
  }
  async function getPhotos(shop) {
    const supplied=suppliedPhotos(shop);if(supplied.length)return supplied;
    const placeId=config.placeIds?.[shop.id];
    if(!config.googleMapsApiKey||!placeId)return [];
    // In-memory request deduplication only: no disk, localStorage, IndexedDB or service-worker cache.
    if(!photoRequests.has(shop.id))photoRequests.set(shop.id,(async()=>{
      const maps=await loadMaps();const {Place}=await maps.importLibrary('places');const place=new Place({id:placeId});
      await place.fetchFields({fields:['photos','googleMapsURI']});
      return (place.photos||[]).slice(0,5).map(photo=>({url:photo.getURI({maxWidth:960}),alt:`${shop.name}の写真`,google:true,authors:photo.authorAttributions||[],sourceUrl:photo.googleMapsURI||place.googleMapsURI||searchUrl(shop)}));
    })().catch(()=>[]));
    return photoRequests.get(shop.id);
  }
  function photoCredit(photo, compact=false) {
    const authors=photo.google?photo.authors.map(author=>safeUrl(author.uri)?link(safeUrl(author.uri),esc(author.displayName||'撮影者')):esc(author.displayName||'撮影者')).join(' / '):esc(photo.credit);
    const source=safeUrl(photo.sourceUrl);
    const license=safeUrl(photo.licenseUrl);
    const credit=`${photo.google?'<span translate="no">Google Maps</span> · ':''}${authors}${source?` · <a href="${esc(source)}" target="_blank" rel="noopener noreferrer" title="${esc(photo.title||'写真の出典')}">出典 ↗</a>`:''}${license?` · ${link(license,esc(photo.license))}`:''}${photo.caption?`<span class="town-photo-caption">${esc(photo.caption)}</span>`:''}`;
    return `<figcaption class="town-photo-credit">${compact&&!photo.google?`<details><summary>写真の出典</summary>${credit}</details>`:credit}</figcaption>`;
  }
  const loadedPhotos = new WeakMap();
  let photoViewer = null;
  function closePhotoViewer() {
    if(!photoViewer)return;
    const dialog=photoViewer;photoViewer=null;dialog.close();dialog.remove();
  }
  function openPhotoViewer(button) {
    const media=button.closest('[data-town-photo]');
    const photos=loadedPhotos.get(media);if(!photos?.length)return;
    let index=Number(button.dataset.photoIndex)||0;
    closePhotoViewer();
    const dialog=document.createElement('dialog');photoViewer=dialog;
    dialog.className='town-photo-dialog';dialog.setAttribute('aria-label','写真を拡大');
    const paint=()=>{
      const photo=photos[index];
      dialog.innerHTML=`<div class="town-photo-dialog-head"><strong>${esc(byId.get(media.dataset.townPhoto)?.name)}</strong><button class="btn secondary compact" data-photo-close autofocus>閉じる</button></div><figure><img class="town-expanded-photo" src="${esc(safeUrl(photo.url))}" alt="${esc(photo.alt)}"><p class="town-expanded-kind">${photo.kind==='menu-illustration'?'料理イメージ（店舗の実際の料理写真ではありません）':'店舗・施設の写真'}</p>${photoCredit(photo)}</figure><div class="town-photo-dialog-nav"><button class="btn secondary" data-photo-prev ${index===0?'disabled':''}>前の写真</button><span aria-live="polite">${index+1} / ${photos.length}</span><button class="btn secondary" data-photo-next ${index===photos.length-1?'disabled':''}>次の写真</button></div>`;
      dialog.querySelector('img').addEventListener('error',()=>{dialog.querySelector('img').hidden=true;dialog.querySelector('.town-expanded-kind').textContent='写真を読み込めませんでした。前後の写真をご覧ください。';},{once:true});
    };
    const move=step=>{const next=index+step;if(next<0||next>=photos.length)return;index=next;paint();dialog.querySelector(step>0?'[data-photo-next]:not(:disabled)':'[data-photo-prev]:not(:disabled)')?.focus();if(!dialog.contains(document.activeElement))dialog.querySelector('[data-photo-close]').focus();};
    dialog.addEventListener('click',event=>{
      if(event.target.closest('[data-photo-close]'))closePhotoViewer();
      else if(event.target.closest('[data-photo-prev]'))move(-1);
      else if(event.target.closest('[data-photo-next]'))move(1);
    });
    dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}});
    dialog.addEventListener('close',()=>{if(photoViewer===dialog)photoViewer=null;dialog.remove();if(button.isConnected)button.focus({preventScroll:true});},{once:true});
    document.body.append(dialog);paint();dialog.showModal();
  }
  async function fillMedia(el) {
    const shop=byId.get(el.dataset.townPhoto);if(!shop)return;
    const version=requestVersion;const photos=await getPhotos(shop);
    if(!el.isConnected || !photos.length || (el.closest('#town')&&version!==requestVersion))return;
    const images=el.classList.contains('town-media-teaser')?photos.slice(0,1):el.classList.contains('town-media-detail')?photos:photos.slice(0,3);
    loadedPhotos.set(el,photos);
    const fallback=el.innerHTML;
    const galleryHelp=el.classList.contains('town-media-card')
      ? `<div class="town-gallery-help"><span>写真をタップで拡大${images.length>1?' · 横スワイプで次へ':''}</span></div>` + (photos.length>images.length?`<button class="town-more-photos" data-town-action="photo" data-photo-index="${images.length}">ほか${photos.length-images.length}枚の写真を見る</button>`:'')
      : `<div class="town-gallery-help"><span class="town-photo-counter">${images.length>1?`1 / ${images.length}`:''}</span><span>写真をタップで拡大${images.length>1?' · 横スワイプで次へ':''}</span></div>`;
    el.innerHTML=`<div class="town-photo-gallery" tabindex="${images.length>1?'0':'-1'}" ${images.length>1?'aria-label="掲載写真。横にスクロールできます"':''}>${images.map((p,i)=>`<figure><button class="town-photo-frame town-photo-open" data-town-action="photo" data-photo-index="${i}" aria-label="${esc(shop.name)}の写真${i+1}を拡大"><img src="${esc(safeUrl(p.url))}" alt="${esc(p.alt)}" loading="lazy" decoding="async" width="960" height="640"></button>${photoCredit(p)}</figure>`).join('')}</div>${galleryHelp}`;
    el.classList.add('has-photo');
    const gallery=el.querySelector('.town-photo-gallery');
    gallery.addEventListener('scroll',()=>{const counter=el.querySelector('.town-photo-counter');if(!counter||images.length<2)return;const width=gallery.querySelector('figure')?.getBoundingClientRect().width||1;const current=Math.min(images.length,Math.max(1,Math.round(gallery.scrollLeft/(width+10))+1));counter.textContent=`${current} / ${images.length}`;},{passive:true});
    el.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{if(images.length===1){el.innerHTML=fallback;el.classList.remove('has-photo');}else{img.hidden=true;const frame=img.closest('.town-photo-frame');frame.disabled=true;frame.insertAdjacentHTML('beforeend','<span class="town-photo-error">写真を読み込めませんでした</span>');}},{once:true}));
  }
  function activatePhotos(scope) {
    const els=[...scope.querySelectorAll('[data-town-photo]')];
    if(!els.length)return;
    if(typeof IntersectionObserver!=='function'){els.forEach(el=>void fillMedia(el));return;}
    photoObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){photoObserver?.unobserve(entry.target);void fillMedia(entry.target);}}),{rootMargin:'180px'});
    els.forEach(el=>photoObserver.observe(el));
  }
  function toggleSave(id) {
    if(!byId.has(id))return;
    const before=new Set(saved); saved.has(id)?saved.delete(id):saved.add(id);
    try { localStorage.setItem(bookmarkKey,JSON.stringify([...saved])); } catch { saved=before; notify('この端末に保存できませんでした。ブラウザの保存設定をご確認ください。');return; }
    const pressed=saved.has(id);
    document.querySelectorAll(`[data-town-action="save"][data-id="${id}"]`).forEach(el=>el.setAttribute('aria-pressed',String(pressed)));
    if(!selected&&filter==='saved'){refreshResults();document.querySelector('[data-town-action="filter"][data-value="saved"]')?.focus({preventScroll:true});}
    notify(pressed?'お店をこの端末に保存しました':'保存から外しました');
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-town-action]');if(!button||button.disabled)return;
    const action=button.dataset.townAction;
    if(action==='photo')openPhotoViewer(button);
    else if(action==='open'){mode='cards';filter='all';query='';listScroll=0;open();}
    else if(action==='shop'){mapShop=button.dataset.id;open(button.dataset.id);}
    else if(action==='close')close();
    else if(action==='list')backToList();
    else if(action==='save')toggleSave(button.dataset.id);
    else if(action==='mode'){mode=button.dataset.value==='map'?'map':'cards';render();document.querySelector(`[data-town-action="mode"][data-value="${mode}"]`)?.focus({preventScroll:true});}
    else if(action==='filter'){filter=filters.some(([key])=>key===button.dataset.value)?button.dataset.value:'all';document.querySelectorAll('[data-town-action="filter"]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.value===filter)));refreshResults();}
    else if(action==='map-shop'){mapShop=button.dataset.id;refreshResults();document.querySelector(`[data-town-action="map-shop"][data-id="${mapShop}"]`)?.focus({preventScroll:true});}
    else if(action==='reset'){query='';filter='all';render();document.getElementById('town-search')?.focus({preventScroll:true});}
  });
  function updateSearch(target) {query=target.value;refreshResults();}
  document.addEventListener('compositionstart',event=>{if(event.target.id==='town-search')composing=true;});
  document.addEventListener('compositionend',event=>{if(event.target.id==='town-search'){composing=false;updateSearch(event.target);}});
  document.addEventListener('input',event=>{if(event.target.id==='town-search'&&!composing)updateSearch(event.target);});
  window.addEventListener('storage',event=>{if(event.key!==bookmarkKey)return;try{const ids=JSON.parse(event.newValue||'[]');saved=new Set(Array.isArray(ids)?ids.filter(id=>byId.has(id)):[]);if(isOpen())render();}catch{}});
  function readRoute() {
    if(location.hash==='#town'||location.hash.startsWith('#town/')) {
      let id=null;try{id=decodeURIComponent(location.hash.slice(6));}catch{}
      open(id,true);
    } else if(isOpen()) { closePhotoViewer();selected=null;disconnectPhotos();api?.back(); }
  }
  window.addEventListener('popstate',readRoute);
  window.KarimenTown = {
    init(callbacks){api=callbacks;if(initDone)return;initDone=true;readRoute();if(!isOpen())activatePhotos(document.querySelector('main > section:not([hidden])')||document.createElement('div'));},
    onView(name){if(!initDone)return;if(name!=='town'){disconnectPhotos();if(location.hash==='#town'||location.hash.startsWith('#town/'))history.replaceState({...history.state,karimenTown:false},'',location.pathname+location.search);if(['mock','learn'].includes(name))activatePhotos(document.getElementById(name));if(name==='mock')refreshHomeRecommendation();}},
    teaser(){
      return `<aside class="town-teaser" aria-label="地域のお店一覧"><div class="town-home-recommendation">${homeRecommendation()}</div><button class="town-directory-entry" data-town-action="open"><span class="town-entry-icon">${icon('ticket')}</span><span><strong>食券が使えるお店</strong><small>営業時間・定休日・地図</small></span><span class="town-entry-meta"><small class="town-pr">PR</small><span class="town-entry-cta">全${shops.length}件を見る ${icon('arrow')}</span></span></button></aside>`;
    },
    scheduleStatus,
    open,
    searchUrl, routeUrl,
  };
})();
