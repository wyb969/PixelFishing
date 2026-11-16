// No third-party Node dependencies. Fail immediately on any regression.
const {spawnSync}=require('node:child_process');
const {readdirSync}=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function run(args){const r=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);}
for(const file of readdirSync(path.join(root,'dist')).filter(x=>x.endsWith('.js')))run(['--check','dist/'+file]);
for(const name of ['weather','snow','thunder','thunder-audio','storm-controls','birds','lightning','species-motion','journal','boat-scale','searchlight'])run(['tests/'+name+'.cjs']);
console.log('All current JavaScript regression suites passed.');
