/* Original pixel-coast species. Stable ids are used by the local field guide. */
(function(root){
'use strict';
// Rarity is a game-score multiplier, not a scientific rarity classification.
const definitions=[
 {id:'silverfin',rarity:1,rarityLabel:'普通',name:'银鳞鱼',color:'#8FC8D4',accent:'#D5ECE5',length:1.55,girth:.48,tail:.85,pattern:'plain',speed:10.5,depthOffset:0,description:'细长银蓝轮廓，喜欢成小群穿过浅水。',habitat:'浅水上层'},
 {id:'goldfin',rarity:2,rarityLabel:'少见',name:'金鳍鲷',color:'#E5BA52',accent:'#FFF0A3',length:1.32,girth:.90,tail:.75,pattern:'fin',speed:7.2,depthOffset:3,description:'金色高扁鱼身，转弯时显出浅色鳍缘。',habitat:'近岸中层'},
 {id:'redtail',rarity:3,rarityLabel:'珍奇',name:'赤尾鲈',color:'#82B695',accent:'#DF765A',length:1.65,girth:.66,tail:1.05,pattern:'tail',speed:9.0,depthOffset:4,description:'青绿色结实鱼身，赤红尾鳍格外醒目。',habitat:'湾内中层'},
 {id:'tealstripe',rarity:4,rarityLabel:'稀有',name:'青纹鲭',color:'#43A8B0',accent:'#C3E7D6',length:1.95,girth:.52,tail:1.0,pattern:'stripe',speed:12.0,depthOffset:1,description:'流线长身带浅青背纹，游动轻快。',habitat:'开阔水面下'},
 {id:'violetback',rarity:6,rarityLabel:'史诗',name:'紫背隆头鱼',color:'#9C83B5',accent:'#E1B5C8',length:1.75,girth:.72,tail:.72,pattern:'back',speed:6.8,depthOffset:6,description:'柔紫长圆鱼身，浅粉腹侧与短尾相衬。',habitat:'近岸较深处'},
 {id:'spottedgrouper',rarity:10,rarityLabel:'传说',name:'斑点石斑鱼',color:'#AF9A69',accent:'#665E4D',length:1.42,girth:.88,tail:.82,pattern:'spot',speed:5.8,depthOffset:7,description:'短厚沙褐鱼身点缀深色斑点，游姿沉稳。',habitat:'沙岸下层'}
];
const rgb=hex=>Object.freeze([1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255));
const list=Object.freeze(definitions.map((s,index)=>Object.freeze({...s,index,rgb:rgb(s.color),accentRgb:rgb(s.accent)})));
function indexForFish(index){return Number.isInteger(index)&&index>=0?index%list.length:-1;}
function forFish(index){const i=indexForFish(index);return i<0?null:list[i];}
const api={list,indexForFish,forFish};if(typeof module!=='undefined')module.exports=api;root.SeaSpecies=api;
})(typeof globalThis!=='undefined'?globalThis:this);
