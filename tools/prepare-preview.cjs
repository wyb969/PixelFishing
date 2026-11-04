const fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
process.chdir(path.resolve(__dirname,'..'));
fs.mkdirSync('analysis',{recursive:true});
execFileSync(process.execPath,['tools/verify-motion.cjs'],{stdio:'inherit'});
execFileSync(process.execPath,['tools/verify-fishing.cjs'],{stdio:'inherit'});
fs.writeFileSync('analysis/cloud-geometry.json',JSON.stringify(Array.from(require('../dist/clouds.js').geometry())));
console.log('Preview inputs ready in analysis/.');
