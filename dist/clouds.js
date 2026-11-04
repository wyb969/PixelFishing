// Three fixed cloud sprites built from ordinary rectangles. No noise or per-pixel masks.
(function(root){
 function geometry(){
  const data=[],rows=[[-8,8,-12,-10],[-13,12,-10,-8],[-18,17,-8,-6],[-23,22,-6,-4],[-27,26,-4,-2],[-30,29,-2,0]];
  for(const [cx,cy] of [[50,100],[240,145],[440,77]])rows.forEach(([l,r,t,b],i)=>{
   const shade=i<4?[.96,.97,.95]:i===4?[.85,.90,.94]:[.72,.80,.88];
   for(const [x,y] of [[l,t],[r,t],[l,b],[l,b],[r,t],[r,b]])data.push(cx,cy,x,y,...shade);
  });return new Float32Array(data);
 }
 const api={geometry};if(typeof module!=='undefined')module.exports=api;else root.SeaClouds=api;
})(typeof window==='undefined'?globalThis:window);
