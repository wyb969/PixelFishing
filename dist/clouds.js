// Stepped, shared-topology cloud strips. Seasonal silhouettes morph without popping.
(function(root){
 function geometry(){
  const data=[],widths=[8,14,21,25,30,34,38,40,37,30];
  for(const [cx,cy] of [[50,100],[230,145],[410,77],[590,119],[770,65]])widths.forEach((width,i)=>{
   const y=-20+i*2,shade=i<6?[.96,.97,.95]:i<8?[.85,.90,.94]:[.72,.80,.88];
   for(const [x,yy] of [[-width,y],[width,y],[-width,y+2],[-width,y+2],[width,y],[width,y+2]])data.push(cx,cy,x,yy,...shade);
  });return new Float32Array(data);
 }
 const api={geometry};if(typeof module!=='undefined')module.exports=api;else root.SeaClouds=api;
})(typeof window==='undefined'?globalThis:window);
