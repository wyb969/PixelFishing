'use strict';
const assert=require('node:assert/strict');
const Journal=require('../dist/journal.js');
let species;try{species=require('../dist/species.js').list;}catch(_){species=['silverfin','goldfin','redtail','tealstripe','violetback','spottedgrouper'].map((id,i)=>({id,name:'鱼种'+i,color:'#70b5a1',description:'海岸鱼类'}));}
function storage(raw){let value=raw??null,writes=0;return {getItem:k=>{assert.equal(k,Journal.STORAGE_KEY);return value;},setItem:(k,v)=>{assert.equal(k,Journal.STORAGE_KEY);value=v;writes++;},value:()=>value,writes:()=>writes};}
const saved=storage(),journal=Journal.create({species,storage:saved});
assert.equal(journal.snapshot().total,0);assert.equal(saved.writes(),0);assert(journal.snapshot().species.every(s=>!s.unlocked));
assert.equal(journal.recordCatch(0,'session:a:1').firstCatch,true);assert.equal(journal.snapshot().total,1);assert.equal(journal.snapshot().discovered,1);assert(journal.snapshot().achievements.find(a=>a.id==='first').earned);
assert.equal(journal.recordCatch(0,'session:a:1').accepted,false);assert.equal(journal.snapshot().total,1);
assert.equal(journal.recordCatch(0,'session:a:2').firstCatch,false);assert.equal(journal.snapshot().species[0].count,2);
for(const index of [-1,6,NaN,Infinity,1.5,'1'])assert.equal(journal.recordCatch(index).accepted,false);
assert.equal(journal.snapshot().total,2);
const refreshed=Journal.create({species,storage:saved});assert.equal(refreshed.snapshot().total,2);assert.equal(refreshed.snapshot().species[0].count,2);
refreshed.recordCatch(1);refreshed.recordCatch(2);assert(refreshed.snapshot().achievements.find(a=>a.id==='explorer').earned);
for(let i=3;i<6;i++)refreshed.recordCatch(i);assert(refreshed.snapshot().achievements.find(a=>a.id==='collector').earned);
while(refreshed.snapshot().total<10)refreshed.recordCatch(0);
assert(refreshed.snapshot().achievements.every(a=>a.earned));
const reordered=Journal.create({species:[...species].reverse(),storage:saved});assert.equal(reordered.snapshot().species.at(-1).count,refreshed.snapshot().species[0].count,'counts depend on slot rather than stable id');
const detached=refreshed.snapshot();detached.species[0].count=999;assert.notEqual(refreshed.snapshot().species[0].count,999);
const broken=Journal.create({species,storage:storage('{bad json')});assert.equal(broken.snapshot().total,0);assert.equal(broken.snapshot().storageMode,'recovered');assert(broken.recordCatch(0).accepted);assert.equal(broken.snapshot().storageMode,'saved');
const malformed=storage(JSON.stringify({version:1,counts:{silverfin:-20,goldfin:2.3,redtail:'9',tealstripe:Infinity,violetback:9000000,spottedgrouper:4},total:999}));
const normalized=Journal.create({species,storage:malformed});assert.deepEqual(normalized.snapshot().species.map(s=>s.count),[0,0,0,0,1000000,4]);assert.equal(normalized.snapshot().total,1000004);
const denied=Journal.create({species,storage:{getItem(){throw new Error('SecurityError');},setItem(){throw new Error('SecurityError');}}});assert.equal(denied.snapshot().storageMode,'memory');assert(denied.recordCatch(1).accepted);assert.equal(denied.snapshot().total,1);
const full=Journal.create({species,storage:{getItem(){return null;},setItem(){throw new Error('QuotaExceededError');}}});assert(full.recordCatch(0).accepted);assert.equal(full.snapshot().storageMode,'memory');full.recordCatch(0);assert.equal(full.snapshot().total,2);
const futureStore=storage(JSON.stringify({version:9,counts:{silverfin:20}})),future=Journal.create({species,storage:futureStore});assert.equal(future.snapshot().storageMode,'future');future.recordCatch(0);assert.equal(futureStore.writes(),0,'overwrote future-version save');
// Real fishing state transitions: only caught increments unlock, never escape or
// the repeated frames spent displaying the same successful catch.
const Fishing=require('../dist/fishing.js'),Motion=require('../dist/motion.js');
const gameplay=Motion.create();gameplay.fishing=Fishing.create();const actual=Journal.create({species,storage:null});let last=0;
function tick(dt,random){Fishing.update(gameplay,dt,random);const f=gameplay.fishing;if(f.caught>last){actual.recordCatch(f.id%species.length,'game:'+f.caught);last=f.caught;}}
Object.assign(gameplay.fishing,{stage:4,age:.9,duration:1,id:4});tick(.2,()=>.9);assert.equal(gameplay.fishing.stage,6);assert.equal(actual.snapshot().total,0);
Object.assign(gameplay.fishing,{stage:4,age:.9,duration:1,id:2});tick(.2,()=>0);assert.equal(gameplay.fishing.stage,5);assert.equal(actual.snapshot().total,1);
for(let i=0;i<30;i++)tick(.05,()=>0);assert.equal(actual.snapshot().total,1,'success display frames double-counted');assert.equal(actual.snapshot().species[2].count,1);
// Scores are derived from validated v1 counts and current stable-id rarity values.
assert.equal(Journal.STORAGE_KEY,'pixelfishing.catch-journal.v1');
assert.deepEqual(species.map(s=>s.rarity),[1,2,3,4,6,10]);
assert.equal(journal.snapshot().score,2);assert.equal(refreshed.snapshot().score,30);
assert.deepEqual(refreshed.snapshot().species.map(s=>s.points),[5,2,3,4,6,10]);
assert.equal(reordered.snapshot().score,refreshed.snapshot().score);
assert.equal(normalized.snapshot().score,6000040);
const oldV1=storage(JSON.stringify({version:1,counts:{silverfin:2,goldfin:3,redtail:4,tealstripe:5,violetback:6,spottedgrouper:7},score:999999,total:999999}));
const oldLoaded=Journal.create({species,storage:oldV1});assert.equal(oldLoaded.snapshot().total,27);assert.equal(oldLoaded.snapshot().score,146);assert.equal(oldV1.writes(),0);
oldLoaded.recordCatch(5,'old-save:new-catch');assert.equal(oldLoaded.snapshot().score,156);assert.equal(JSON.parse(oldV1.value()).version,1);assert.equal('score' in JSON.parse(oldV1.value()),false,'persisted a stale derived score');
assert.equal(Journal.create({species,storage:oldV1}).snapshot().score,156);
const unusual=species.map((s,i)=>({...s,rarity:[-1,0,NaN,1.5,101,'10'][i]}));
const sanitized=Journal.create({species:unusual,storage:null});for(let i=0;i<6;i++)sanitized.recordCatch(i);assert.equal(sanitized.snapshot().score,6,'invalid rarity polluted score');
const extended=Journal.create({species:[...species,{id:'extra',name:'额外鱼',rarity:100}],storage:null});assert.equal(extended.snapshot().species.length,6);assert.equal(extended.recordCatch(6).accepted,false);
// A lightweight DOM/event harness. Native button keyboard activation is modeled
// explicitly; this is not a real browser, CSS layout, or touch-device test.
class Element{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.styles={};this.style={setProperty:(k,v)=>{this.styles[k]=v;}};this._text='';this.open=false;this.className='';this.listeners={};
  this.classList={contains:c=>this.className.split(/\s+/).includes(c),add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(c=>!names.includes(c)).join(' ');},toggle:(c,force)=>{const on=force===undefined?!this.classList.contains(c):!!force;on?this.classList.add(c):this.classList.remove(c);return on;}};
 }
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n);}}
 replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.children=[];this._text='';this.append(...nodes);}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}
 addEventListener(type,handler){(this.listeners[type]??=[]).push(handler);}
 removeEventListener(type,handler){this.listeners[type]=(this.listeners[type]||[]).filter(fn=>fn!==handler);}
 dispatch(type,extra={}){const event={type,target:this,key:undefined,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...extra};let n=this;while(n){event.currentTarget=n;for(const fn of [...(n.listeners[type]||[])])fn(event);if(event.stopped)break;n=n.parentNode;}return event;}
 click(extra={}){return this.dispatch('click',extra);}
 pressKey(key){const event=this.dispatch('keydown',{key});if(this.tagName==='button'&&!event.defaultPrevented&&(key==='Enter'||key===' '))this.click({detail:0});}
 focus(){this.ownerDocument.activeElement=this;}
 getBoundingClientRect(){return {left:0,top:0,width:200,height:70};}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null;}
}
class Document{constructor(){this.documentElement=new Element('html',this);this.head=new Element('head',this);this.documentElement.append(this.head);this.activeElement=null;}createElement(t){return new Element(t,this);}getElementById(id){return walk(this.documentElement).find(n=>n.id===id)||null;}}
function walk(node){return [node,...node.children.flatMap(walk)];}
function nodes(node,className){return walk(node).filter(n=>n.classList.contains(className));}
function openPanel(details,value=true){details.open=value;details.dispatch('toggle');}
function noCatchAnimation(details){assert.equal(nodes(details,'journal-burst').length,0);assert.equal(nodes(details,'journal-caught').length,0);assert.equal(nodes(details,'journal-score-pop').length,0);}
const originalMatchMedia=global.matchMedia;let reduced=false;const mediaQueries=[];global.matchMedia=query=>{const listeners=new Set(),result={get matches(){return query.includes('prefers-reduced-motion')&&reduced;},addEventListener(type,fn){if(type==='change')listeners.add(fn);},removeEventListener(type,fn){if(type==='change')listeners.delete(fn);},notify(){for(const fn of listeners)fn({matches:this.matches});}};mediaQueries.push(result);return result;};
function setReduced(value){reduced=value;for(const query of mediaQueries)query.notify();}
try{
 const doc=new Document(),host=doc.createElement('section');host.id='journal-host';doc.documentElement.append(host);
 const ui=Journal.create({species,storage:null}),details=ui.mount(host);assert.equal(details.tagName,'details');assert.equal(details.open,false);const summary=details.children[0];assert.equal(summary.tagName,'summary');assert.equal(summary.children.length,3);assert.equal(doc.head.children.length,1);
 assert(details.textContent.includes('0/6 种 · 0 条'));assert.equal(nodes(details,'journal-card').length,6);assert(nodes(details,'journal-card').every(n=>n.tagName==='button'&&n.type==='button'));noCatchAnimation(details);
 const cards=nodes(details,'journal-card'),firstDetail=nodes(cards[0],'journal-detail')[0];
 // Mouse/touch click and native Enter/Space activation share the same selection path.
 cards[0].click({pointerType:'touch'});assert.equal(cards[0].getAttribute('aria-pressed'),'true');assert.equal(nodes(cards[0],'journal-detail')[0],firstDetail,'selection replaced detail node');
 cards[1].click({pointerType:'mouse'});assert.equal(cards[0].getAttribute('aria-pressed'),'false');assert.equal(cards[1].getAttribute('aria-pressed'),'true');
 cards[1].pressKey('Enter');assert.equal(cards[1].getAttribute('aria-pressed'),'false');cards[2].pressKey(' ');assert.equal(cards[2].getAttribute('aria-pressed'),'true');
 openPanel(details);assert(host.classList.contains('journal-expanded'));cards[2].focus();cards[2].pressKey('Escape');assert.equal(details.open,false);assert.equal(host.classList.contains('journal-expanded'),false);assert.equal(doc.activeElement,summary);
 // A closed panel gets a steady marker, not an invisible/replayed capture animation.
 ui.recordCatch(0,'ui:1');assert(details.classList.contains('journal-new'));noCatchAnimation(details);assert(details.textContent.includes('1/6 种 · 1 条'));assert(details.textContent.includes('本次打开期间有效'));
 openPanel(details);assert.equal(details.classList.contains('journal-new'),false);noCatchAnimation(details);
 const beforeDetail=nodes(cards[0],'journal-detail')[0],scoreNode=nodes(details,'journal-score-value')[0];
 const accepted=ui.recordCatch(5,'ui:2');assert(accepted.accepted);assert.equal(accepted.snapshot.score,11);assert.equal(nodes(details,'journal-burst').length,1);assert.equal(nodes(details,'journal-burst')[0].textContent,'+10');assert(cards[5].classList.contains('journal-caught'));assert.equal(scoreNode.textContent,'11');
 assert.equal(nodes(cards[0],'journal-detail')[0],beforeDetail,'catch replaced persistent detail');
 const countBefore=ui.snapshot().total,scoreBefore=ui.snapshot().score,burstBefore=nodes(details,'journal-burst')[0];
 for(let i=0;i<100;i++)assert.equal(ui.recordCatch(5,'ui:2').accepted,false);
 assert.equal(ui.snapshot().total,countBefore);assert.equal(ui.snapshot().score,scoreBefore);assert.equal(nodes(details,'journal-burst').length,1);assert.equal(nodes(details,'journal-burst')[0],burstBefore,'duplicate event retriggered effect');
 burstBefore.dispatch('animationend');cards[5].dispatch('animationend');noCatchAnimation(details);
 // Reduced motion blocks tilt and all new capture animations without losing score.
 setReduced(true);const rx=cards[4].styles['--rx'];cards[4].dispatch('pointermove',{pointerType:'mouse',clientX:180,clientY:10});assert.equal(cards[4].styles['--rx'],rx);ui.recordCatch(4,'ui:3');assert.equal(ui.snapshot().score,17);noCatchAnimation(details);
 setReduced(false);cards[4].dispatch('pointermove',{pointerType:'touch',clientX:180,clientY:10});assert.equal(cards[4].styles['--rx'],rx,'touch started hover tilt');cards[4].dispatch('pointermove',{pointerType:'mouse',clientX:180,clientY:10});assert.notEqual(cards[4].styles['--rx'],undefined);cards[4].dispatch('pointerleave');assert.equal(cards[4].styles['--rx'],'0deg');
 // A rapid second valid catch replaces the first transient; late events from the
 // removed burst must not clear the currently active scoreboard effect.
 ui.recordCatch(1,'rapid:1');const firstBurst=nodes(details,'journal-burst')[0];
 ui.recordCatch(2,'rapid:2');const secondBurst=nodes(details,'journal-burst')[0];
 assert.notEqual(firstBurst,secondBurst);assert.equal(firstBurst.parentNode,null);assert.equal(nodes(details,'journal-burst').length,1);
 firstBurst.dispatch('animationend');assert.equal(nodes(details,'journal-burst')[0],secondBurst);assert.equal(nodes(details,'journal-score-pop').length,1);
 // Closing in the middle of an animation clears effects; reopening never replays.
 openPanel(details,false);noCatchAnimation(details);assert.equal(secondBurst.parentNode,null);openPanel(details);noCatchAnimation(details);
 ui.recordCatch(3,'reduce-mid-animation');assert.equal(nodes(details,'journal-burst').length,1);
 cards[3].dispatch('pointermove',{pointerType:'mouse',clientX:180,clientY:10});setReduced(true);noCatchAnimation(details);assert.equal(cards[3].styles['--rx'],'0deg');assert.equal(cards[3].styles['--ry'],'0deg');setReduced(false);noCatchAnimation(details);
 // Remount clears old nodes before replacing the panel; stale events cannot affect
 // a new panel's capture animation either.
 ui.recordCatch(0,'remount:before');const preRemountBurst=nodes(details,'journal-burst')[0];
 const remounted=ui.mount(host);assert.equal(host.children.length,1);assert.equal(doc.head.children.length,1);noCatchAnimation(remounted);noCatchAnimation(details);assert.equal(preRemountBurst.parentNode,null);
 openPanel(remounted);ui.recordCatch(1,'remount:after');const postRemountBurst=nodes(remounted,'journal-burst')[0];preRemountBurst.dispatch('animationend');assert.equal(nodes(remounted,'journal-burst')[0],postRemountBurst);assert.equal(nodes(remounted,'journal-score-pop').length,1);openPanel(remounted,false);noCatchAnimation(remounted);
 // The count cap earns zero additional points, so neither announcement nor
 // animation may claim a positive score increment.
 const capped=Journal.create({species,storage:storage(JSON.stringify({version:1,counts:{spottedgrouper:1000000}}))});const cappedDOM=capped.mount(doc.createElement('section'));openPanel(cappedDOM);const cappedBefore=capped.snapshot().score;capped.recordCatch(5,'cap:1');assert.equal(capped.snapshot().score,cappedBefore);assert(nodes(cappedDOM,'journal-update')[0].textContent.includes('+0 分'));noCatchAnimation(cappedDOM);
 // Reloaded legacy counts show their derived score without unlock/score replay.
 const loadedHost=doc.createElement('section');doc.documentElement.append(loadedHost);const loadedUI=Journal.create({species,storage:oldV1});const loadedDOM=loadedUI.mount(loadedHost);assert.equal(nodes(loadedDOM,'journal-score-value')[0].textContent,'156');assert.equal(loadedDOM.classList.contains('journal-new'),false);assert.equal(nodes(loadedDOM,'journal-update')[0].textContent,'');noCatchAnimation(loadedDOM);openPanel(loadedDOM);noCatchAnimation(loadedDOM);
 const maxHost=doc.createElement('section');doc.documentElement.append(maxHost);const maxDOM=extended.mount(maxHost);assert.equal(nodes(maxDOM,'journal-card').length,6);
 // All species text stays text; generated icons contain only validated color data.
 const hostile=Journal.create({species:[{id:'safe',name:'<img src=x onerror=alert(1)>',color:'url(https://invalid.example)',description:'<script>bad()</script>',rarity:2}],storage:null});hostile.recordCatch(0);const hostileDOM=hostile.mount(doc.createElement('section'));assert(hostileDOM.textContent.includes('<img'));const icon=nodes(hostileDOM,'journal-fish')[0];assert.equal(icon.tagName,'img');assert(icon.src.startsWith('data:image/svg+xml,'));const svg=decodeURIComponent(icon.src.split(',').slice(1).join(','));assert(svg.includes('#7dbdb0'));assert(!svg.includes('invalid.example'));assert(!svg.includes('<script>'));
 const style=doc.head.children[0].textContent;assert(style.includes('@media(prefers-reduced-motion:reduce)'));assert(style.includes('animation:none!important'));assert(style.includes('touch-action:manipulation'));
}finally{if(originalMatchMedia===undefined)delete global.matchMedia;else global.matchMedia=originalMatchMedia;}
console.log('PASS: all legacy count/storage/achievement/catch tests; v1 score migration and rarity validation; refresh with no animation; at most six cards; click/native-button keyboard model and Escape focus; reduced-motion and touch-tilt guards; 100 duplicate catch events trigger one effect; rapid-effect replacement/stale events, close/remount/reduced-change cleanup, capped-score announcement; safe SVG/text rendering. DOM harness only, not browser/mobile layout proof.');

// Optional fixture helpers for rendering the actual product-generated DOM offline.
// Requiring this test runs its assertions first; no hand-authored UI substitute.
function serialize(node){
 const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const attributes={...node.attributes};if(node.className)attributes.class=node.className;if(node.id)attributes.id=node.id;
 for(const key of ['type','src','alt'])if(node[key]!==undefined)attributes[key]=node[key];
 if(node.open)attributes.open='';if(Object.keys(node.styles).length)attributes.style=Object.entries(node.styles).map(([k,v])=>k+':'+v).join(';');
 const tag=node.tagName,attrs=Object.entries(attributes).map(([k,v])=>' '+k+'="'+escape(v)+'"').join('');
 const content=(tag==='style'?node._text:escape(node._text))+node.children.map(serialize).join('');
 return '<'+tag+attrs+'>'+(['img','input','br','meta','link'].includes(tag)?'':content+'</'+tag+'>');
}
module.exports={Element,Document,walk,nodes,openPanel,serialize};
