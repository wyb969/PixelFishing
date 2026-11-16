/* Local-only catch journal. Call recordCatch only for a confirmed stage-4 -> 5 catch. */
(function(root){
'use strict';
const KEY='pixelfishing.catch-journal.v1',LIMIT=1000000;
const STYLE=`
.play-area{display:flex;align-items:stretch;min-width:0}.coast-stage{min-width:0;flex:1}#journal-host{position:relative;flex:0 0 46px;min-width:0;background:#112c38;border-right:2px solid #557b7b}#journal-host.journal-expanded{flex-basis:236px}.catch-journal{position:absolute;inset:0;color:#dceee7;font:11px/1.45 'Courier New',Microsoft YaHei,monospace;overflow:hidden}.catch-journal>summary{height:100%;min-height:64px;padding:12px 4px;display:flex;align-items:center;flex-direction:column;gap:10px;cursor:pointer;list-style:none;touch-action:manipulation;background:linear-gradient(90deg,#173a47,#102b37);color:#dfe9c8}.catch-journal>summary::-webkit-details-marker{display:none}.catch-journal>summary::before{content:'▧';font-size:21px;color:#e6cb7f;text-shadow:2px 2px #071f2c}.catch-journal .journal-title{writing-mode:vertical-rl;letter-spacing:3px}.catch-journal .journal-toggle{font-size:14px;color:#91b5b6}.catch-journal .journal-mini-score{writing-mode:vertical-rl;font-size:10px;max-height:120px;overflow:hidden;color:#b8dfce}.catch-journal[open]>summary{height:45px;min-height:45px;flex-direction:row;padding:7px 12px;gap:8px;border-bottom:2px solid #557b7b}.catch-journal[open] .journal-title{writing-mode:horizontal-tb;letter-spacing:1px}.catch-journal[open] .journal-mini-score{display:none}.catch-journal[open] .journal-toggle{margin-left:auto}.catch-journal .journal-body{height:calc(100% - 45px);overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#597f7b #142f3a;padding:10px 10px 14px;background:repeating-linear-gradient(0deg,#15323f 0 3px,#173643 3px 6px)}.journal-scoreboard{position:relative;border:2px solid #789f92;background:#102a36;box-shadow:3px 3px #061d29;padding:8px 10px;margin-bottom:12px}.journal-score-label{font-size:9px;color:#91b3ab;letter-spacing:2px}.journal-score-value{display:block;font-size:25px;font-weight:bold;line-height:1.15;letter-spacing:1px;color:#f1d99c;text-shadow:2px 2px #503c31}.journal-totals{font-size:10px;color:#a5c8bf}.journal-formula{font-size:9px;color:#8fafa9;margin-top:4px}.journal-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}.catch-journal .journal-card{position:relative;isolation:isolate;width:100%;min-height:58px;display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:2px 5px;padding:7px;border:2px solid #698d89;border-radius:0;background:#214451;box-shadow:3px 3px #081e2c;text-align:left;color:#e1eee4;font:inherit;cursor:pointer;touch-action:manipulation;transform:perspective(450px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform 120ms ease,border-color 120ms,box-shadow 120ms;overflow:hidden}.journal-card::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 20%,#fff9c91c 48%,transparent 65%);transform:translateX(-120%);transition:transform 500ms}.journal-card[aria-pressed=true]{border-color:#ead89a;box-shadow:3px 3px #987f48;background:#2b5059}.catch-journal .journal-card.locked{background:#142f3b;border-color:#365965;color:#7a9a9c;box-shadow:3px 3px #0a202a}.journal-card.rare:not(.locked){border-color:#ad91cc;background:linear-gradient(125deg,#34435e,#284c58 45%,#4e4263);box-shadow:3px 3px #0b2030,inset 0 0 12px #a381ca22}.journal-card.legendary:not(.locked){border-color:#dfc67e;background:linear-gradient(120deg,#514760,#32565e 42%,#665044);box-shadow:3px 3px #46375a,inset 0 0 16px #ffd78720}.journal-card.rare .journal-name{color:#e3c7fa}.journal-card.legendary .journal-name{color:#ffe4a3}.journal-card.locked .journal-name{color:inherit}.journal-fish{display:block;width:32px;height:20px;grid-row:1/3;image-rendering:pixelated;filter:drop-shadow(2px 2px #0b2633)}.locked .journal-fish{filter:grayscale(1);opacity:.36}.rare:not(.locked) .journal-fish{filter:drop-shadow(0 0 4px #ba93e7)}.legendary:not(.locked) .journal-fish{filter:drop-shadow(0 0 5px #ebc885)}.journal-name{min-width:0;font-size:11px;font-weight:bold;overflow-wrap:anywhere}.journal-count{font-size:13px;font-weight:bold;color:#e5e5bc;white-space:nowrap}.journal-rarity{font-size:9px;color:#bad3cc;grid-column:2}.journal-points{font-size:9px;color:#cbdcc8;text-align:right}.journal-detail{display:none;grid-column:1/-1;border-top:1px dashed #84a69b55;padding-top:6px;margin-top:4px;font-size:10px;color:#bdd5cc;line-height:1.6}.journal-card[aria-pressed=true] .journal-detail{display:block}.journal-heading{font-size:10px;letter-spacing:2px;margin:14px 0 7px;color:#bcd2b7}.journal-achievements{display:grid;grid-template-columns:1fr 1fr;gap:5px}.journal-achievement{min-width:0;border:1px solid #3d6067;padding:5px;background:#122e3a;color:#72918f;font-size:9px;overflow-wrap:anywhere}.journal-achievement.earned{border-color:#849f73;background:#2d4a45;color:#ebdfa7}.journal-achievement small{display:block;font-size:8px;line-height:1.5;color:#91afa5}.journal-storage,.journal-update{font-size:9px;margin:9px 0 0;color:#86a8a7;overflow-wrap:anywhere}.journal-update:empty{display:none}.journal-burst{position:absolute;right:9px;top:12px;font-weight:bold;font-size:15px;color:#fbdfa0;pointer-events:none;animation:score-rise 700ms ease-out both}.journal-scoreboard.journal-score-pop{animation:score-pop 420ms ease-out}.journal-card.journal-caught{animation:catch-pop 500ms cubic-bezier(.16,.85,.38,1.2)}.journal-card.journal-caught::after{transform:translateX(120%)}.catch-journal.journal-new>summary::before{color:#fff2ab;text-shadow:0 0 9px #d2ae48}.catch-journal summary:focus-visible,.catch-journal .journal-card:focus-visible{outline:2px solid #fff1b0;outline-offset:-4px}.catch-journal[open] .journal-body{animation:panel-in 180ms ease-out}@media(hover:hover) and (pointer:fine){.catch-journal .journal-card:hover{border-color:#e0d9b1;box-shadow:4px 5px #0a202b;transform:perspective(450px) translateY(-2px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))}.journal-card:hover::after{transform:translateX(120%)}}.catch-journal .journal-card:active{transform:translateY(2px) scale(.985);box-shadow:1px 1px #081e2c}@keyframes catch-pop{0%{transform:scale(.96)}35%{transform:translateY(-3px) scale(1.025)}70%{transform:translateY(1px) scale(.995)}100%{transform:scale(1)}}@keyframes score-rise{0%{opacity:0;transform:translateY(8px)}20%{opacity:1}100%{opacity:0;transform:translateY(-22px)}}@keyframes score-pop{40%{transform:scale(1.025)}100%{transform:scale(1)}}@keyframes panel-in{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@media(max-width:650px){.play-area{display:grid;grid-template-columns:44px minmax(0,1fr)}#journal-host{grid-column:1;grid-row:1;width:44px}.coast-stage{grid-column:2;grid-row:1}#journal-host.journal-expanded{grid-column:1/-1;grid-row:1;width:100%;border-right:0;border-bottom:2px solid #557b7b}#journal-host.journal-expanded+.coast-stage{grid-column:1/-1;grid-row:2}.journal-expanded .catch-journal{position:relative;inset:auto}.journal-expanded .journal-body{height:auto;max-height:min(65svh,450px)}.journal-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.catch-journal .journal-card{grid-template-columns:29px minmax(0,1fr);padding:6px;min-height:72px}.journal-fish{width:27px;height:18px;grid-row:1/3}.journal-count{grid-column:2;font-size:12px}.journal-rarity{grid-column:1/-1}.journal-points{display:none;font-size:9px}.journal-card[aria-pressed=true] .journal-points{display:block;grid-column:1/-1}.journal-name{font-size:10px}.journal-scoreboard{display:grid;grid-template-columns:1fr auto;column-gap:8px}.journal-score-label{grid-column:1}.journal-score-value{grid-column:2;grid-row:1/3}.journal-formula{grid-column:1/-1}.journal-achievements{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){.catch-journal *,.catch-journal *::after{animation:none!important;transition:none!important;transform:none!important}.journal-burst{display:none}.journal-card::after{display:none}}
`;
function create(options={}){
 const list=options.species||(root.SeaSpecies&&root.SeaSpecies.list)||[];
 const species=list.slice(0,6).map((s,i)=>({id:String(s.id??i),name:String(s.name||('鱼种 '+(i+1))),detail:String(s.description||s.habitat||s.detail||'海岸鱼类'),color:/^#[0-9a-f]{6}$/i.test(s.color||'')?s.color:'#7dbdb0',rarity:Number.isSafeInteger(s.rarity)&&s.rarity>0&&s.rarity<=100?s.rarity:1,rarityLabel:String(s.rarityLabel||'普通')}));
 const counts=Object.create(null),seen=new Set();for(const s of species)counts[s.id]=0;
 let storage=null,storageMode='saved',mounted=null,announcement='',selected=null;
 const motionPreference=root.matchMedia?.('(prefers-reduced-motion: reduce)');
 const reduced=()=>!!motionPreference?.matches;
 motionPreference?.addEventListener?.('change',()=>{if(reduced())clearEffects();});
 try{storage=Object.prototype.hasOwnProperty.call(options,'storage')?options.storage:root.localStorage;if(!storage)storageMode='memory';}catch(_){storageMode='memory';}
 let raw=null;if(storage)try{raw=storage.getItem(KEY);}catch(_){storageMode='memory';storage=null;}
 if(raw)try{
  {const saved=JSON.parse(raw);if(saved&&saved.version>1){storageMode='future';storage=null;}
   else if(!saved||saved.version!==1||!saved.counts||typeof saved.counts!=='object'||Array.isArray(saved.counts)){storageMode='recovered';}
   else for(const s of species){const n=saved.counts[s.id];counts[s.id]=Number.isSafeInteger(n)&&n>0?Math.min(n,LIMIT):0;}
  }
 }catch(_){storageMode='recovered';}
 function snapshot(){
  const rows=species.map((s,index)=>({...s,index,count:counts[s.id],points:counts[s.id]*s.rarity,unlocked:counts[s.id]>0}));
  const total=rows.reduce((n,s)=>n+s.count,0),discovered=rows.filter(s=>s.unlocked).length;
  const achievements=[
   {id:'first',name:'初次收获',description:'累计钓获 1 条',earned:total>=1},
   {id:'explorer',name:'海岸探索者',description:'发现 3 种鱼',earned:discovered>=3},
   {id:'angler',name:'熟练钓手',description:'累计钓获 10 条',earned:total>=10},
   {id:'collector',name:'图鉴收藏家',description:'发现全部 '+species.length+' 种鱼',earned:species.length>0&&discovered===species.length}
  ];return {version:1,total,score:rows.reduce((sum,s)=>sum+s.points,0),discovered,species:rows,achievements,storageMode};
 }
 function persist(){
  if(!storage)return;
  try{storage.setItem(KEY,JSON.stringify({version:1,counts}));storageMode='saved';}
  catch(_){storageMode='memory';storage=null;}
 }
 function element(doc,tag,className,text){const node=doc.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
 // Tiny original SVG pixel fish, generated locally with no external assets.
 function fishIcon(s){
  const color=s.color,accent=['#D5ECE5','#FFF0A3','#DF765A','#C3E7D6','#E1B5C8','#665E4D'][s.index%6];
  const tall=s.index===1||s.index===5,y=tall?3:5,h=tall?10:6;
  let svg='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="20" viewBox="0 0 32 20" shape-rendering="crispEdges"><path fill="'+(s.index===2?accent:color)+'" d="M1 4h3v2h3v2h3v4H7v2H4v2H1z"/><path fill="'+color+'" d="M9 '+(y+2)+'h4v-2h11v2h4v2h3v4h-3v2h-4v2H13v-2H9z"/>';
  if(s.index===1||s.index===4)svg+='<path fill="'+accent+'" d="M15 '+y+'h2v'+(h+4)+'h-2zM22 '+y+'h2v'+(h+4)+'h-2z"/>';
  else if(s.index===5)svg+='<path fill="'+accent+'" d="M13 6h2v2h-2zM21 10h2v2h-2zM17 13h2v2h-2z"/>';
  else svg+='<path fill="'+accent+'" d="M13 11h13v2H13z"/>';
  return 'data:image/svg+xml,'+encodeURIComponent(svg+'<path fill="#102933" d="M26 8h2v2h-2z"/></svg>');
 }
 function render(){
  if(!mounted)return;const {doc,totals,score,mini,cards,achievements,notice,update}=mounted,state=snapshot();
  totals.textContent=state.discovered+'/'+species.length+' 种 · '+state.total+' 条';score.textContent=state.score.toLocaleString('en-US');mini.textContent=state.score+' 分';
  for(const s of state.species){
   const c=cards[s.index];c.button.className='journal-card'+(s.unlocked?'':' locked')+(s.rarity>=4?' rare':'')+(s.rarity>=10?' legendary':'');
   c.button.setAttribute('aria-pressed',String(selected===s.id));c.name.textContent=s.unlocked?s.name:'未发现 '+String(s.index+1).padStart(2,'0');c.count.textContent='× '+s.count;
   c.rarity.textContent=s.rarityLabel+' · '+s.rarity+' 分/条';c.points.textContent=s.points.toLocaleString('en-US')+' 分';
   c.detail.textContent=(s.unlocked?s.detail:'成功钓获后点亮。')+' '+s.count+' × '+s.rarity+' = '+s.points+' 分';
   c.button.setAttribute('aria-label',(s.unlocked?s.name:'未发现鱼种 '+(s.index+1))+'，'+s.count+' 条，'+s.rarityLabel+'，'+s.points+' 分；点击查看详情');
  }
  achievements.replaceChildren();for(const a of state.achievements){const badge=element(doc,'div','journal-achievement'+(a.earned?' earned':''),(a.earned?'◆ ':'◇ ')+a.name);badge.append(element(doc,'small','',a.description));achievements.append(badge);}
  notice.textContent=storageMode==='saved'?'本地保存 · 不会上传':storageMode==='future'?'较新版存档受保护，本次仅暂存。':storageMode==='recovered'?'旧记录无法读取，新钓获将重新记录。':'浏览器无法保存，本次打开期间有效。';update.textContent=announcement;
 }
 function clearEffects(){
  if(!mounted)return;mounted.burst?.remove();mounted.burst=null;mounted.board.classList.remove('journal-score-pop');for(const c of mounted.cards){c.button.classList.remove('journal-caught');c.button.style.setProperty('--rx','0deg');c.button.style.setProperty('--ry','0deg');}
 }
 function mount(container){
  if(!container||!container.ownerDocument)throw new TypeError('Journal mount requires a DOM container');
  const doc=container.ownerDocument;if(!doc.getElementById('sea-journal-style')){const style=element(doc,'style','',STYLE);style.id='sea-journal-style';(doc.head||doc.documentElement).append(style);}
  if(mounted){clearEffects();mounted.details.remove();}
  const details=element(doc,'details','catch-journal'),summary=element(doc,'summary'),title=element(doc,'span','journal-title','成就鱼册'),mini=element(doc,'span','journal-mini-score'),toggle=element(doc,'span','journal-toggle','›');summary.setAttribute('aria-label','展开或收起成就鱼册');summary.append(title,mini,toggle);details.append(summary);
  const body=element(doc,'div','journal-body'),board=element(doc,'div','journal-scoreboard'),score=element(doc,'strong','journal-score-value'),totals=element(doc,'span','journal-totals');
  board.append(element(doc,'span','journal-score-label','COAST SCORE'),score,totals,element(doc,'div','journal-formula','总分 = Σ 数量 × 稀有度分值'));
  const grid=element(doc,'div','journal-grid'),cards=species.map((s,index)=>{
   const button=element(doc,'button','journal-card');button.type='button';const icon=element(doc,'img','journal-fish');icon.alt='';icon.src=fishIcon({...s,index});icon.setAttribute('aria-hidden','true');
   const name=element(doc,'span','journal-name'),count=element(doc,'span','journal-count'),rarity=element(doc,'span','journal-rarity'),points=element(doc,'span','journal-points'),detail=element(doc,'span','journal-detail');button.append(icon,name,count,rarity,points,detail);
   button.addEventListener('click',()=>{selected=selected===s.id?null:s.id;render();});
   button.addEventListener('pointermove',e=>{if(reduced()||e.pointerType!=='mouse')return;const r=button.getBoundingClientRect();button.style.setProperty('--rx',((.5-(e.clientY-r.top)/r.height)*5).toFixed(2)+'deg');button.style.setProperty('--ry',(((e.clientX-r.left)/r.width-.5)*7).toFixed(2)+'deg');});
   const reset=()=>{button.style.setProperty('--rx','0deg');button.style.setProperty('--ry','0deg');};button.addEventListener('pointerleave',reset);button.addEventListener('blur',reset);button.addEventListener('animationend',()=>button.classList.remove('journal-caught'));grid.append(button);return{button,name,count,rarity,points,detail};
  });
  const achievements=element(doc,'div','journal-achievements'),notice=element(doc,'p','journal-storage'),update=element(doc,'p','journal-update');update.setAttribute('role','status');update.setAttribute('aria-live','polite');grid.setAttribute('aria-label','最多六种鱼收藏');body.append(board,grid,element(doc,'h2','journal-heading','航海徽章'),achievements,notice,update);details.append(body);container.append(details);
  const sync=()=>{container.classList.toggle('journal-expanded',details.open);toggle.textContent=details.open?'‹':'›';if(details.open)details.classList.remove('journal-new');else clearEffects();};details.addEventListener('toggle',sync);details.addEventListener('keydown',e=>{if(e.key==='Escape'&&details.open){details.open=false;sync();summary.focus();}});sync();
  mounted={doc,details,summary,totals,score,mini,cards,board,achievements,notice,update};render();return details;
 }
 function celebrate(index,points){
  if(!mounted)return;const {doc,details,board,cards}=mounted;if(!details.open)details.classList.add('journal-new');
  clearEffects();if(points<=0||reduced()||!details.open)return;
  void board.offsetWidth;
  cards[index].button.classList.add('journal-caught');board.classList.add('journal-score-pop');
  const burst=element(doc,'span','journal-burst','+'+points);burst.setAttribute('aria-hidden','true');board.append(burst);mounted.burst=burst;burst.addEventListener('animationend',()=>{if(mounted?.burst!==burst)return;burst.remove();mounted.burst=null;board.classList.remove('journal-score-pop');});
 }
 function recordCatch(index,eventToken){
  if(!Number.isInteger(index)||index<0||index>=species.length)return {accepted:false,reason:'invalid-species'};
  if(eventToken!==undefined){const token=String(eventToken);if(seen.has(token))return {accepted:false,reason:'duplicate-event'};seen.add(token);}
  const before=snapshot(),s=species[index],firstCatch=counts[s.id]===0;counts[s.id]=Math.min(LIMIT,counts[s.id]+1);persist();
  const after=snapshot(),unlockedAchievements=after.achievements.filter(a=>a.earned&&!before.achievements.find(b=>b.id===a.id).earned).map(a=>a.id);
  announcement=(firstCatch?'新鱼种：':'钓获 ')+s.name+'，+'+(after.score-before.score)+' 分，累计 '+counts[s.id]+' 条'+(unlockedAchievements.length?' · 点亮 '+unlockedAchievements.length+' 项成就':'');render();celebrate(index,after.score-before.score);
  return {accepted:true,firstCatch,unlockedAchievements,snapshot:after};
 }
 return {mount,recordCatch,snapshot};
}
const api={create,STORAGE_KEY:KEY};if(typeof module!=='undefined')module.exports=api;root.SeaJournal=api;
})(typeof globalThis!=='undefined'?globalThis:this);
