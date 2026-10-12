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
 for(const file of ['questions.js','learning-content.js','model.js','visuals.js','notebook-content.js','question-guides.js','home-install.js','town-data.js','town-config.js'])vm.runInContext(read(file),ctx,{filename:file});
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
assert.equal(a.query('#mock').hidden,false);assert.ok(a.query('#mock .town-teaser'));
assert.match(a.query('#mock .town-directory-entry').textContent,/全14件を見る/);
assert.equal(a.query('#mock .town-teaser [data-town-action="shop"]'),null,'home links to all stores, not an individual recommendation');
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
assert.equal(status('uminchu','2026-10-15T12:00:00Z').kind,'check');
for(const id of ['zero','itomaru','ichiman-yokocho','cafe-itoman'])assert.equal(status(id,'2026-10-13T03:00:00Z').kind,'check');
assert.equal(status('chiquita','2028-01-04T03:00:00Z').kind,'check','unknown holiday year never claims scheduled opening');
const original=a.run('JSON.stringify(state)');
a.click('#mock [data-town-action="open"]');
assert.equal(a.query('#town').hidden,false);assert.equal(a.w.location.hash,'#town');
assert.equal(a.all('.town-card').length,14);assert.equal(a.all('.town-card .town-hours').length,14);assert.equal(a.all('.town-card .town-hours dl').length,14);assert.equal(a.query('#town-title'),a.w.document.activeElement);
assert.equal(a.query('script[src*="maps.googleapis.com"]'),null,'no API calls before provider configuration');
await settle();
assert.equal(a.all('.town-card .town-photo-gallery img').length,14,'all 14 cards include a real image file without an API');
assert.equal(a.all('.town-card .town-photo-kind').length,13,'generic food imagery is explicitly labeled');
assert.ok(a.all('.town-card .town-photo-credit').every(el=>el.querySelector('a[href*="creativecommons.org"]')),'photo licenses remain accessible');
for(const [id,photos]of Object.entries(a.w.KarimenTownConfig.suppliedPhotos)){
 assert.ok(photos.length>0,id);
 for(const photo of photos){
  assert.ok(photo.url.startsWith('./assets/town/'),'static image is served with the app');
  const file=fs.readFileSync(path.join(root,photo.url));
  assert.equal(file.subarray(0,2).toString('hex'),'ffd8','published photo is a JPEG');
  assert.equal(crypto.createHash('sha256').update(file).digest('hex'),photo.sha256,'downloaded source image remains intact');
  assert.ok(photo.credit&&photo.licenseUrl&&photo.sourceUrl);
  if(id!=='itomaru'){assert.equal(photo.kind,'menu-illustration');assert.match(photo.alt,/イメージ/)}
 }
}
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
a.click('#mock [data-town-action="open"]');
a.click('[data-town-action="filter"][data-value="cafe"]');
a.click('[data-town-action="close"]');
a.click('#mock [data-town-action="open"]');
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
a.click('#tab-mock');a.click('#mock [data-town-action="open"]');a.click('[data-town-action="save"][data-id="mahoroba"]');
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
a.click('#mock [data-town-action="open"]');a.run('updateTimer()');
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

a=app({configure(w){w.KarimenTownConfig={suppliedPhotos:{kirakira:[{url:'javascript:alert(1)',credit:'Bad',permission:'owner-provided'},{url:'https://example.test/owner.jpg',alt:'店舗提供の料理写真',credit:'きらきら提供',permission:'owner-provided'}]}};}});
a.w.KarimenTown.open('kirakira');await settle();
assert.equal(a.all('.town-media-detail img').length,1);assert.equal(a.query('.town-media-detail img').src,'https://example.test/owner.jpg');
assert.match(a.query('.town-photo-credit').textContent,/きらきら提供/);a.close();

console.log('PASS: 14 shops with verified static JPEG assets and illustration labels, search/IME/filters, bookmarks/reload/failure, map fallback, direct links/history, unchanged study answers and paused mock timer, lazy photo provider/attribution/error fallback.');
