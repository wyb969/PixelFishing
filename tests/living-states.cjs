const fs=require('node:fs'),Birds=require('../dist/birds.js'),Weather=require('../dist/weather.js'),Lightning=require('../dist/lightning.js');
const birds=Birds.create(),weather=Weather.create(),summer=[0,1,0,0];weather.mode='0';
const phases={};
function capture(name,mode,duration,step=.05){
 weather.mode=mode;const frames=[];
 for(let i=0;i<=Math.round(duration/step);i++){
  frames.push({seconds:i*step,weather:structuredClone(weather),birds:Array.from(Birds.packed(birds)),visibility:Birds.visibility(birds)});
  Weather.update(weather,step,summer);Birds.update(birds,step,weather,summer);
 }
 phases[name]=frames;
}
capture('clear-flight','0',6);capture('cloud-escape','1',4);capture('clear-return','0',20,.1);
const storm=Weather.create();storm.mode='5';storm.effectsEnabled=true;while(storm.lightningId===0)Weather.update(storm,.01,summer);
const strike=[];const segments=Array.from(Lightning.geometry(storm.boltX,storm.boltSeed));
for(let i=0;i<67;i++){strike.push({weather:structuredClone(storm),segments});Weather.update(storm,.03,summer);}
fs.writeFileSync(process.argv[2],JSON.stringify({phases,strike}));console.log('Wrote actual bird/weather transitions and one non-looping strike.');
