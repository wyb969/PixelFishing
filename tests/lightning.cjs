const assert=require('node:assert/strict'),fs=require('node:fs');const Lightning=require('../dist/lightning.js');
for(let i=0;i<1000;i++){
 const seed=i/1000,x=100+seed*310,a=Lightning.geometry(x,seed);
 assert.equal(a.length,72);assert(a.every(Number.isFinite));assert.deepEqual(a,Lightning.geometry(x,seed));
 for(let k=0;k<18;k++){
  assert(Math.abs(a[k*4]-x)<80&&Math.abs(a[k*4+2]-x)<80);assert(a[k*4+1]>=15&&a[k*4+3]<=215);assert(a[k*4+3]>a[k*4+1]);
  if(k>0&&k!==12&&k!==15){assert.equal(a[k*4],a[(k-1)*4+2]);assert.equal(a[k*4+1],a[(k-1)*4+3]);}
 }
 for(const [branch,node]of [[12,3],[15,7]]){assert.equal(a[branch*4],a[node*4+2]);assert.equal(a[branch*4+1],a[node*4+3]);}
}
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify([.12,.38,.64,.87].map(seed=>({seed,x:100+seed*310,segments:Array.from(Lightning.geometry(100+seed*310,seed))}))));
console.log('PASS: 1,000 deterministic branched bolts; connected leader/branches; fixed 18 segments; monotone descent; all geometry inside narrow shader bounds.');
