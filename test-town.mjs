// Integration checks for the independent restaurant guide and study-state boundary.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {JSDOM,VirtualConsole}=require(process.env.KARIMEN_JSDOM_PATH||'jsdom');
const root=path.dirname(fileURLToPath(import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const key='karimen-town-bookmarks-v1';
const settle=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
function app({hash='',seed={},configure,observe=false}={}){
 const errors=[],observers=[];
 const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error));
 const dom=new JSDOM(read('index.html'),{url:'https://tnkkakuei3-design.github.io/karimen-study/'+hash,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window,ctx=dom.getInternalVMContext();
 for(const [name,value]of Object.entries(seed))w.localStorage.setItem(name,value);
 w.document.hasFocus=()=>true;w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.scrollTo=()=>{};w.requestAnimationFrame=fn=>fn();w.setInterval=()=>1;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){if(this.open){this.open=false;this.dispatchEvent(new w.Event('close'))}};
 if(observe)w.IntersectionObserver=class{
  constructor(callback){this.callback=callback;this.elements=new Set();observers.push(this)}
  observe(element){this.elements.add(element)}unobserve(element){this.elements.delete(element)}disconnect(){this.elements.clear()}
 };
 for(const file of ['questions.js','learning-content.js','cloud-record.js','model.js','visuals.js','notebook-content.js','question-guides.js','home-install.js','town-data.js','town-config.js'])vm.runInContext(read(file),ctx,{filename:file});
 configure?.(w);
 for(const file of ['town.js','app.js'])vm.runInContext(read(file),ctx,{filename:file});
 const query=selector=>w.document.querySelector(selector);
 const click=selector=>{const element=query(selector);assert.ok(element,selector);assert.equal(element.disabled,false);element.click();assert.equal(errors.length,0,errors[0]?.message)};
 return {w,query,click,run:code=>vm.runInContext(code,ctx),all:selector=>[...w.document.querySelectorAll(selector)],
  intersect:()=>observers.forEach(o=>o.callback([...o.elements].filter(el=>el.isConnected&&!el.closest('[hidden]')).map(target=>({target,isIntersecting:true})))),
  snapshot:()=>Object.fromEntries(Object.keys(w.localStorage).map(name=>[name,w.localStorage.getItem(name)])),
  close:()=>{assert.equal(errors.length,0,errors[0]?.message);dom.window.close()}};
}

let a=app();
const shops=a.w.KarimenTownData.shops;
assert.equal(shops.length,14);assert.equal(new Set(shops.map(s=>s.id)).size,14);
assert.deepEqual([...shops.map(s=>s.number)],[1,2,3,4,5,7,8,9,10,11,12,13,14,15]);
assert.equal(a.query('#mock').hidden,false);assert.ok(a.query('.town-directory-entry'));
assert.match(a.query('.town-directory-entry').textContent,/食券が使えるお店/);
const homePick=a.query('#mock [data-recommended-shop]');
assert.ok(homePick);assert.ok(homePick.querySelector('img'));assert.equal(homePick.querySelector('button').dataset.townAction,'open');
await settle();
// Real calendar edge cases, JST conversion, and uncertain opening information.
const status=(id,date)=>a.w.KarimenTown.scheduleStatus(shops.find(s=>s.id===id),new Date(date));
assert.ok(shops.every(s=>a.w.KarimenTownData.schedules[s.id]));
assert.equal(status('kirakira','2026-10-13T05:00:00Z').kind,'open'); // 14:00 JST
assert.equal(status('kirakira','2026-10-13T12:00:00Z').kind,'outside');
assert.equal(status('kirakira','2026-10-14T05:00:00Z').kind,'closed');
assert.equal(status('kinta','2026-10-12T10:00:00Z').kind,'closed'); // Sports Day
assert.equal(status('kinta','2026-10-13T14:59:00Z').kind,'open');
assert.equal(status('kinta','2026-10-13T15:00:00Z').kind,'outside'); // midnight
assert.equal(status('ritz','2026-10-18T01:00:00Z').kind,'outside'); // Sunday opens 11
assert.equal(status('ritz','2026-10-18T02:00:00Z').kind,'open');
assert.equal(status('konaya','2026-10-28T10:00:00Z').kind,'closed'); // last Wednesday
assert.equal(status('konaya','2026-10-21T10:00:00Z').kind,'open');
assert.match(status('konaya','2026-10-28T10:00:00Z').note,/10\/30/); // skip Thursday
assert.equal(status('center','2026-10-13T03:00:00Z').kind,'check');
assert.equal(status('yotsuba','2026-10-13T03:00:00Z').kind,'check');
assert.equal(status('uminchu','2026-10-15T12:00:00Z').kind,'outside','21:00 closing time');
assert.equal(status('uminchu','2026-10-13T09:00:00Z').kind,'open','Tuesday evening is listed open');
assert.equal(status('kirakira','2026-10-17T05:00:00Z').kind,'closed','Saturday closure');
assert.equal(status('mahoroba','2026-10-15T03:00:00Z').kind,'closed','Thursday closure');
assert.equal(status('mahoroba','2026-10-17T07:00:00Z').kind,'open','Saturday extends to 17:00');
assert.equal(status('center','2026-10-13T08:00:00Z').kind,'outside','17:00 closing time');
assert.equal(status('umibozu','2026-10-13T04:30:00Z').kind,'check','13:30 remains within hours subject to sellout');
assert.equal(status('yotsuba','2026-10-13T04:30:00Z').kind,'outside','13:30 closing time');
assert.equal(status('itomaru','2026-10-13T03:00:00Z').kind,'check');
assert.equal(status('ichiman-yokocho','2026-10-13T03:00:00Z').kind,'outside');
assert.equal(status('cafe-itoman','2026-10-13T03:00:00Z').kind,'open');
assert.equal(status('cafe-itoman','2026-10-15T03:00:00Z').kind,'closed');
assert.equal(status('chiquita','2028-01-04T03:00:00Z').kind,'check','unknown holiday year never claims scheduled opening');
for(const id of ['itomaru','zero'])assert.equal(status(id,'2026-10-12T18:10:00Z').kind,'outside','03:10 JST is outside listed hours');
for(const date of ['2026-10-17T08:30:00Z','2026-10-13T08:30:00Z'])assert.equal(status('cafe-itoman',date).kind,'outside','cafe closes at 17:00');
assert.equal(status('zero','2026-10-13T08:00:00Z').kind,'open','Google lists continuous hours');
assert.equal(status('zero','2026-10-17T16:00:00Z').kind,'open','Sunday 01:00 belongs to Saturday night');
assert.equal(status('zero','2026-10-17T17:00:00Z').kind,'outside','Sunday 02:00 end boundary');
assert.equal(status('zero','2026-10-18T15:30:00Z').kind,'open','Monday 00:30 belongs to Sunday night');
assert.equal(status('ichiman-yokocho','2026-10-13T15:30:00Z').kind,'check','facility is within overnight hours, tenant hours vary');
const tenantStatus=(id,date)=>a.w.KarimenTown.scheduleStatus(a.w.KarimenTownData.marketShops.find(s=>s.id===id),new Date(date));
assert.equal(tenantStatus('itomaru-fullhouse','2026-10-18T03:00:00Z').kind,'closed');
assert.equal(tenantStatus('itomaru-fullhouse','2026-10-17T10:00:00Z').kind,'open');
assert.equal(tenantStatus('itomaru-manjuen','2026-10-13T03:00:00Z').kind,'closed');
assert.equal(tenantStatus('itomaru-naminami','2026-10-15T03:00:00Z').kind,'closed');
assert.equal(tenantStatus('itomaru-lazy-pub','2026-10-15T07:00:00Z').kind,'outside','afternoon break');
assert.match(tenantStatus('itomaru-lazy-pub','2026-10-15T07:00:00Z').note,/本日 18:00/);
assert.equal(tenantStatus('itomaru-lazy-pub','2026-10-15T12:30:00Z').kind,'open','night service until 22:00');
assert.equal(tenantStatus('itomaru-machigwa','2026-10-17T07:30:00Z').kind,'outside','Saturday closes at 16:30');
assert.match(read('town.css'),/data-town-state=open/,'only scheduled-open photos remain undimmed');
const original=a.run('JSON.stringify(state)');
a.click('.town-directory-entry');
assert.equal(a.query('#town').hidden,false);assert.equal(a.w.location.hash,'#town');
assert.equal(a.all('.town-card').length,14);assert.equal(a.all('.town-card .town-hours').length,14);assert.equal(a.all('.town-card .town-hours dl').length,0);assert.equal(a.query('#town-title'),a.w.document.activeElement);
assert.equal(a.query('#town-title').textContent,'食券が使えるお店');
assert.equal(a.all('#town .town-character').length,1,'one small header character, not repeated promotional blocks');
a.click('[data-town-action="filter"][data-value="saved"]');
assert.equal(a.all('.town-empty .town-character').length,1,'saved empty state restores the existing guide');
a.click('[data-town-action="reset"]');
assert.equal(a.all('.town-card .town-ticket,.town-guide-note,.town-voucher-info').length,0,'no repeated voucher badges or coloured promo panels');
assert.doesNotMatch(a.query('#town').textContent,/どこ行こう|まちのごはん|食券を持って、地域のお店へ/);
assert.ok(a.query('.town-pr').textContent.includes('PR'),'promotional disclosure is retained');
assert.equal(a.query('[data-town-action="mode"][data-value="cards"]').textContent.trim(),'一覧');
assert.equal(a.query('script[src*="maps.googleapis.com"]'),null,'no API calls before provider configuration');
await settle();
for(const media of a.all('.town-media-card.has-photo')){
 assert.match(media.querySelector('.town-gallery-help').textContent,/タップで拡大/);
 assert.equal(media.querySelector('.town-gallery-help').textContent.includes('横スワイプ'),media.querySelectorAll('figure').length>1);
}
assert.equal(a.all('.town-card .town-photo-placeholder').length,0,'all listed shops have selected photos');
assert.equal(a.all('.town-card .town-photo-gallery img').length,40,'cards show up to three actual venue photos');
assert.equal(a.all('.town-card .town-photo-kind').length,0,'no generic food imagery is displayed');
assert.ok(a.all('.town-card .town-photo-credit').every(el=>el.querySelector('a[target="_blank"]')),'every photo retains its source');
assert.equal(a.all('[data-town-photo="itomaru"] .town-photo-credit a[href*="creativecommons.org"]').length,3,'existing photo licences remain accessible');
a.click('[data-town-photo="kinta"] .town-more-photos');
assert.match(a.query('.town-expanded-photo').src,/venue-kinta-4\.jpg$/,'additional photos open directly without leaving the app');
a.click('[data-photo-close]');
// Compact strips have no page counter; scrolling them must not throw.
a.query('.town-media-card .town-photo-gallery').dispatchEvent(new a.w.Event('scroll'));
for(const [id,photos]of Object.entries(a.w.KarimenTownConfig.suppliedPhotos)){
 assert.ok(photos.length>0,id);
 for(const photo of photos){
  assert.ok(photo.url.startsWith('./assets/town/'),'static image is served with the app');
  const file=fs.readFileSync(path.join(root,photo.url));
  assert.ok(['ffd8','8950'].includes(file.subarray(0,2).toString('hex')),'published photo is JPEG or PNG');
  assert.equal(crypto.createHash('sha256').update(file).digest('hex'),photo.sha256,'downloaded source image remains intact');
  assert.ok(photo.credit&&photo.sourceUrl);
  if(photo.permission)assert.ok(photo.licenseUrl);
  else {assert.equal(photo.selectedForDisplay,true);assert.equal(photo.rightsStatus,'unconfirmed');assert.equal(photo.licenseUrl,undefined,'source photos are not assigned an invented licence');}
  assert.equal(photo.kind,'venue');assert.equal(photo.shopId,id);
 }
}
// Opening from a card stays in the app; stepping and closing preserve the directory.
const photoTrigger=a.query('[data-town-photo="itomaru"] [data-town-action="photo"]');photoTrigger.click();
assert.ok(a.query('.town-photo-dialog').open);assert.equal(a.w.location.hash,'#town');
assert.match(a.query('.town-expanded-kind').textContent,/店舗・施設の写真/);
const firstExpanded=a.query('.town-expanded-photo').src;a.click('[data-photo-next]');
assert.notEqual(a.query('.town-expanded-photo').src,firstExpanded);
a.query('.town-photo-dialog').dispatchEvent(new a.w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
assert.equal(a.query('.town-expanded-photo').src,firstExpanded);
a.click('[data-photo-close]');assert.equal(a.query('.town-photo-dialog'),null);assert.equal(a.w.document.activeElement,photoTrigger);
photoTrigger.click();a.w.KarimenTown.open('itomaru');assert.equal(a.query('.town-photo-dialog'),null);await settle();
assert.equal(a.all('.town-media-detail img').length,3);a.w.KarimenTown.open();await settle();
// Each detail view must show only that store's configured, intact photographs.
for(const shop of shops){
 a.w.KarimenTown.open(shop.id);await settle();
 assert.equal(a.all('.town-voucher-info .town-character').length,1,'each store retains its voucher guide character');
 assert.equal(a.all('.town-save').length,1,'the save action remains available beside the store title');
 assert.ok(a.query('.town-voucher-info').textContent.includes('差額'),'voucher limitations are retained');
 const expected=[...(a.w.KarimenTownConfig.suppliedPhotos[shop.id]||[])];
 assert.deepEqual(a.all('.town-media-detail img').map(img=>img.src),expected.map(p=>new URL(p.url,a.w.location.href).href),shop.id);
 if(!expected.length)assert.ok(a.query('.town-photo-placeholder'),shop.id);
 if(expected.length){
  a.click('.town-media-detail [data-town-action="photo"]');
  for(let i=0;i<expected.length;i++){
   assert.equal(a.query('.town-expanded-photo').src,new URL(expected[i].url,a.w.location.href).href,`${shop.id} photo ${i+1}`);
   assert.equal(a.query('.town-photo-dialog-head strong').textContent,shop.name);
   if(i+1<expected.length)a.click('[data-photo-next]');
  }
  a.click('[data-photo-close]');
 }
}
a.w.KarimenTown.open();await settle();
a.click('[data-town-action="filter"][data-value="cafe"]');assert.equal(a.all('.town-card').length,3);
a.click('[data-town-action="filter"][data-value="all"]');
let input=a.query('#town-search');input.value='ｷﾗｷﾗ';input.dispatchEvent(new a.w.Event('input',{bubbles:true}));
assert.equal(a.all('.town-card').length,1);assert.match(a.query('.town-card').textContent,/きらきら/);
input.dispatchEvent(new a.w.Event('compositionstart',{bubbles:true}));input.value='見つからないお店';input.dispatchEvent(new a.w.Event('input',{bubbles:true}));
assert.equal(a.all('.town-card').length,1,'IME composition does not refresh prematurely');
input.dispatchEvent(new a.w.Event('compositionend',{bubbles:true}));assert.equal(a.all('.town-card').length,0);
a.click('[data-town-action="reset"]');
a.click('[data-town-action="save"][data-id="kirakira"]');
assert.equal(a.w.localStorage.getItem(key),'["kirakira"]');
a.click('[data-town-action="filter"][data-value="saved"]');assert.equal(a.all('.town-card').length,1);
a.click('[data-town-action="shop"][data-id="kirakira"]');
assert.equal(a.w.location.hash,'#town/kirakira');assert.equal(a.query('#town-title').textContent,'きらきら');
assert.equal(a.query('.town-detail-actions a[href^="tel:"]').getAttribute('href'),'tel:08083562119');
const route=new URL(a.query('.town-detail-actions a').href);
assert.equal(route.searchParams.get('travelmode'),'walking');assert.match(route.searchParams.get('origin'),/2278/);
assert.equal(a.run('JSON.stringify(state)'),original,'browsing and favorites never alter study records');
a.click('[data-town-action="list"]');a.click('[data-town-action="filter"][data-value="all"]');
a.click('[data-town-action="mode"][data-value="map"]');
// Switching repeatedly and re-entering map mode preserves each verified shop's map.
assert.equal(shops.filter(shop=>shop.embedUrl).length,14);
for(let round=0;round<2;round++){
 for(const shop of shops.filter(shop=>shop.embedUrl)){
  a.click(`[data-town-action="map-shop"][data-id="${shop.id}"]`);
  assert.equal(a.query('#town iframe').src,shop.embedUrl,`${shop.id} round ${round}`);
  assert.equal(a.query('#town iframe').title,`${shop.name}のGoogleマップ`);
  assert.equal(new URL(a.query('.town-map-fallback a').href).searchParams.get('query_place_id'),shop.mapPlaceId);
  assert.equal(new URL(a.query('.town-map-actions a').href).searchParams.get('destination_place_id'),shop.mapPlaceId);
 }
 a.click('[data-town-action="mode"][data-value="cards"]');
 a.click('[data-town-action="mode"][data-value="map"]');
}
assert.equal(a.query('[data-town-action="map-shop"][data-id="365"]'),null);
a.click('[data-town-action="close"]');assert.equal(a.query('#mock').hidden,false);assert.equal(a.w.location.hash,'');
a.click('.town-directory-entry');
a.click('[data-town-action="filter"][data-value="cafe"]');
a.click('[data-town-action="close"]');
a.click('.town-directory-entry');
assert.equal(a.all('.town-card').length,14,'home entry always opens the full directory');
a.click('[data-town-action="close"]');
const remembered=a.snapshot();a.close();

a=app({seed:remembered,hash:'#town/kirakira'});
assert.equal(a.query('#town').hidden,false,'direct links survive app initialization');
assert.equal(a.query('#town-title').textContent,'きらきら');assert.equal(a.query('.town-save').getAttribute('aria-pressed'),'true');
a.w.history.replaceState({},'','#town');a.w.dispatchEvent(new a.w.PopStateEvent('popstate'));
assert.equal(a.all('.town-card').length,14,'browser back can restore the directory');
a.w.history.replaceState({},'','./');a.w.dispatchEvent(new a.w.PopStateEvent('popstate'));assert.equal(a.query('#town').hidden,true);
a.click('#tab-learn');a.click('[data-action="quick-study"]');a.click('[data-action="answer"][data-value="true"]');
const playing=a.run('JSON.stringify(state)');a.w.KarimenTown.open('kirakira');
assert.equal(a.query('#play').hidden,false);assert.equal(a.run('JSON.stringify(state)'),playing,'guide cannot interrupt an active question');
a.click('[data-action="pause"]');const paused=a.run('JSON.stringify(state)');
assert.equal(a.query('#learn .town-teaser'),null,'learning screen has no restaurant promotion');
a.click('#tab-mock');a.click('.town-directory-entry');a.click('[data-town-action="save"][data-id="mahoroba"]');
// Every map entry point must identify the same verified business, including repeat visits.
for(const shop of shops){
 a.w.KarimenTown.open(shop.id);
 const links=a.all('#town a').filter(el=>el.href.startsWith('https://www.google.com/maps/'));
 if(shop.id==='365'){
  assert.equal(links.length,0,'unknown shop has no Google Maps buttons');
  assert.ok(a.query('.town-detail-actions a[href^="tel:"]'));
 }else{
  assert.ok(shop.mapPlaceId,shop.id);
  assert.ok(links.length>=3,shop.id);
  for(const link of links){
   const url=new URL(link.href);
   assert.equal(url.searchParams.get('api'),'1');
   assert.equal(url.searchParams.get(url.pathname.includes('/dir/')?'destination_place_id':'query_place_id'),shop.mapPlaceId,shop.id);
  }
  assert.equal(a.query('#town iframe').src,shop.embedUrl);
 }
}
a.w.KarimenTown.open();
for(const card of a.all('.town-card')){
 const id=card.querySelector('[data-town-action="shop"]').dataset.id;
 const photo=card.querySelector('.town-photo-link');
 if(id==='365') assert.equal(photo,null);
 else assert.equal(new URL(photo.href).searchParams.get('query_place_id'),shops.find(s=>s.id===id).mapPlaceId);
}
a.click('[data-town-action="close"]');assert.equal(a.query('#mock').hidden,false);
a.click('#tab-learn');
assert.equal(a.run('JSON.stringify(state)'),paused,'paused answer/session remains unchanged');
a.click('[data-action="resume"][data-mode="study"]');assert.equal(a.query('#play').hidden,false);
assert.equal(a.run('state.session.answers.filter(answer=>answer!==null).length'),1);a.close();

a=app({hash:'#town/365',seed:{[key]:JSON.stringify(['365','kirakira'])}});
assert.equal(a.all('.town-card').length,14,'retired direct links return to the directory');
assert.equal(a.query('[data-town-action="shop"][data-id="365"]'),null);
a.click('[data-town-action="filter"][data-value="saved"]');assert.equal(a.all('.town-card').length,1,'retired saved IDs are ignored');a.close();

a=app({hash:'#town/unknown'});assert.equal(a.all('.town-card').length,14);
a.w.Storage.prototype.setItem=function(name){if(name===key)throw new Error('quota')};
const beforeQuota=a.run('JSON.stringify(state)');a.click('[data-town-action="save"][data-id="kirakira"]');
assert.equal(a.query('[data-town-action="save"][data-id="kirakira"]').getAttribute('aria-pressed'),'false');
assert.match(a.query('#toast').textContent,/保存できません/);assert.equal(a.run('JSON.stringify(state)'),beforeQuota);a.close();

a=app();a.click('[data-action="detail"][data-set="1"]');a.click('[data-action="start-mock"]');
assert.equal(a.query('#play').hidden,false);a.w.KarimenTown.open();assert.equal(a.query('#town').hidden,true);
a.click('[data-action="pause"]');const pausedExam=a.run('JSON.stringify(state)');
a.click('.town-directory-entry');a.run('updateTimer()');
assert.equal(a.run('JSON.stringify(state)'),pausedExam,'restaurant browsing does not advance a paused mock timer');a.close();

let calls=0;
a=app({observe:true,configure(w){
 w.KarimenTownConfig={googleMapsApiKey:'test-browser-key',placeIds:{kirakira:'verified-test-place'},suppliedPhotos:{}};
 w.google={maps:{importLibrary:async()=>({Place:class{
  constructor({id}){assert.equal(id,'verified-test-place')}
  async fetchFields(){calls++;this.photos=[{getURI:()=> 'https://example.test/kirakira.jpg',authorAttributions:[{displayName:'写真の提供者',uri:'https://example.test/author'}]}];this.googleMapsURI='https://www.google.com/maps/';}
 }})}};
}});
assert.equal(calls,0);a.w.KarimenTown.open('kirakira');assert.equal(calls,0,'photos load only when their media is visible');
a.intersect();await settle();assert.equal(calls,1);
const img=a.query('.town-media-detail img');assert.ok(img);assert.equal(img.alt,'きらきらの写真');
assert.match(a.query('.town-photo-credit').textContent,/Google Maps.*写真の提供者/);
assert.equal(a.query('.town-photo-credit a').href,'https://example.test/author');
assert.ok(!Object.values(a.snapshot()).some(value=>value.includes('kirakira.jpg')),'photo URLs are not persisted');
img.dispatchEvent(new a.w.Event('error'));assert.ok(a.query('.town-photo-placeholder'),'failed photos fall back to the map link');
assert.ok(a.query('.town-all-photos'));a.close();

a=app({configure(w){w.KarimenTownConfig={suppliedPhotos:{kirakira:[{url:'javascript:alert(1)',credit:'Bad',permission:'owner-provided'},{kind:'venue',shopId:'kirakira',url:'https://example.test/owner.jpg',alt:'店舗提供の料理写真',credit:'きらきら提供',permission:'owner-provided'}]}};}});
a.w.KarimenTown.open('kirakira');await settle();
assert.equal(a.all('.town-media-detail img').length,1); assert.equal(a.query('.town-media-detail img').src,'https://example.test/owner.jpg');
assert.match(a.query('.town-photo-credit').textContent,/きらきら提供/);a.close();

let clock=Date.parse('2026-10-13T05:00:00Z'),scheduleTick;
a=app({configure(w){
 const NativeDate=w.Date;
 w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}};
 w.setInterval=(fn,delay)=>{if(delay===60000)scheduleTick=fn;return 1;};
}});
const checkHome=()=>{assert.ok(a.query('.town-directory-entry'));assert.ok(a.query('#mock [data-recommended-shop] img'),'home shows a real photo');};
const recordsBefore=a.snapshot();
checkHome();
for(const time of ['2026-10-13T15:00:00Z','2026-10-14T05:00:00Z','2026-10-13T05:00:00Z']){clock=Date.parse(time);scheduleTick();checkHome();}
assert.deepEqual(a.snapshot(),recordsBefore);
a.click('.town-directory-entry');assert.ok(a.query('#town .town-heading'));
a.click('#tab-mock');checkHome();
a.click('.town-directory-entry');
const orderedIds=()=>a.all('.town-card .town-card-copy').map(el=>el.dataset.id);
function assertScheduleOrder(){
 const priority={open:0,check:1,outside:2,closed:3};
 const ids=orderedIds();
 const expected=a.w.KarimenTownData.shops.filter(s=>ids.includes(s.id)).map(s=>({id:s.id,number:s.number,rank:priority[a.w.KarimenTown.scheduleStatus(s,new Date(clock)).kind]})).sort((x,y)=>x.rank-y.rank||x.number-y.number).map(s=>s.id);
 assert.deepEqual(ids,[...expected]);
}
assertScheduleOrder();assert.equal(orderedIds()[0],'kirakira');
const firstCard=a.query('.town-card'),originalPhoto=firstCard.querySelector('.town-media');
clock=Date.parse('2026-10-13T10:00:00Z');scheduleTick();assertScheduleOrder();
assert.equal(firstCard.querySelector('.town-media'),originalPhoto,'reordering preserves existing photo nodes');
a.click('[data-town-action="filter"][data-value="cafe"]');assertScheduleOrder();
a.click('[data-town-action="filter"][data-value="all"]');
const beforeMap=orderedIds();a.click('[data-town-action="mode"][data-value="map"]');
assert.deepEqual(a.all('.town-map-picker button').map(el=>el.dataset.id),beforeMap);
a.click('[data-town-action="map-shop"][data-id="kirakira"]');const map=a.query('#town iframe');
clock=Date.parse('2026-10-13T15:00:00Z');a.w.dispatchEvent(new a.w.Event('focus'));
assert.equal(a.query('#town iframe'),map,'time refresh preserves the selected map');
assert.equal(a.query('.town-map-picker [aria-pressed="true"]').dataset.id,'kirakira');
a.click('[data-town-action="mode"][data-value="cards"]');assertScheduleOrder();
assert.equal(a.all('.town-card[data-town-state="open"]').length,0,'no scheduled-open cards at weekday midnight');
assert.equal(a.query('[data-town-hours="cafe-itoman"]').closest('.town-card').dataset.townState,'outside');a.close();

console.log('PASS: 14 shops, scheduled-hours ordering and refresh, filters/maps, photos, bookmarks, unchanged study records.');

// Market drilldown, direct links, saved child stores and search keep study records intact.
a=app({hash:'#town/itomaru',seed:{'karimen-progress-v1':'{"untouched":true}'}});
const beforeMarket=a.snapshot();
assert.equal(a.all('.town-tenant').length,9);
const tenants=[...a.w.KarimenTownData.marketShops];
assert.equal(new Set(tenants.map(s=>s.id)).size,9);
for(const tenant of tenants){
 a.w.KarimenTown.open(tenant.id);await settle();
 assert.equal(a.query('#town-title').textContent,tenant.name);
 assert.match(a.query('.town-ticket').textContent,/食券利用可/);
 assert.doesNotMatch(a.query('.town-voucher-info').textContent,/未確認/);
 assert.ok(new URL(a.query('.town-detail-actions a').href).searchParams.get('destination').includes(tenant.name));
 assert.ok(a.query('.town-details').textContent.includes(tenant.price));
 assert.equal(a.all('.town-media-detail img').length,(a.w.KarimenTownConfig.suppliedPhotos[tenant.id]||[]).length);
 if(!(a.w.KarimenTownConfig.suppliedPhotos[tenant.id]||[]).length)assert.ok(a.query('.town-photo-source a'));
 a.click('.town-topline [data-town-action="shop"]');
 assert.equal(a.w.location.hash,'#town/itomaru');
}
assert.deepEqual(a.snapshot(),beforeMarket);
a.w.KarimenTown.open('itomaru-knowry');a.click('.town-save');a.w.KarimenTown.open();a.click('[data-town-action="filter"][data-value="saved"]');
assert.ok(a.query('[data-town-action="shop"][data-id="itomaru-knowry"]'));
a.click('[data-town-action="filter"][data-value="all"]');
const marketSearch=a.query('#town-search');marketSearch.value='ゆし豆腐';marketSearch.dispatchEvent(new a.w.Event('input',{bubbles:true}));
assert.ok(a.query('[data-town-action="shop"][data-id="itomaru-machigwa"]'));
marketSearch.value='Ceramic Art Cafe Itoman';marketSearch.dispatchEvent(new a.w.Event('input',{bubbles:true}));
assert.ok(a.query('[data-town-action="shop"][data-id="cafe-itoman"]'));
a.close();
a=app({hash:'#town/itomaru-machigwa'});assert.match(a.query('#town-title').textContent,/町小/);a.close();
console.log('PASS: 9 nested market restaurants, eligibility, photos, search, saved shops and navigation.');
