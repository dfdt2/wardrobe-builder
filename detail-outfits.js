/* Weather-independent outfit browser anchored to the item-detail garment. */
(()=>{
const order=['top','outer','bottom','shoe','bag','scarf','gloves','hat','tights','belt','jewelry','hair'];
const searchOrder=['top','bottom','shoe','outer','scarf','gloves','hat','bag','belt','tights','jewelry','hair'];
const labels={top:'Top / dress',outer:'Jacket',bottom:'Pants / skirt',shoe:'Shoes',bag:'Bag',scarf:'Scarf',gloves:'Gloves',hat:'Hat',tights:'Tights',belt:'Belt',jewelry:'Jewelry',hair:'Hair accessories'};
const weatherAccessories=['scarf','gloves','hat'];
const role=g=>g.category==='Other'?({Hats:'hat',Scarves:'scarf',Gloves:'gloves',Belts:'belt',Tights:'tights',Jewelry:'jewelry','Hair accessories':'hair'})[g.subcategory]:({Tops:'top',Dresses:'top',Pants:'bottom',Skirts:'bottom',Shoes:'shoe',Outerwear:'outer',Bags:'bag'})[g.category]|| (coverupRole(g)?'top':null);
const isDress=g=>g.category==='Dresses'||coverupRole(g)==='dress';
const parts=g=>g?.layerBase?[g.layerBase,g.layerOuter]:g?[g]:[];
const code=g=>g?.item_code||'';
const tags=(g,k)=>new Set((Array.isArray(g[k])?g[k]:String(g[k]||'').split(',')).map(v=>String(v).trim().toLowerCase()).filter(Boolean));
const intersect=(a,b)=>new Set([...a].filter(v=>b.has(v)));
function approved(a,b){
 if(a.item_code===b.item_code)return false;
 const vote=state.pairs[pairKey(a.item_code,b.item_code)];
 return pairTrainable(a,b)?homePairAllowed(a,b)&&sharedTrainableActivity(a,b)&&vote===true:vote!==false;
}
let active=null;
function* build(anchor){
 const anchorRole=role(anchor);if(!anchorRole)return [];
 const sameContext=g=>intersect(tags(anchor,'seasons'),tags(g,'seasons')).size&&(coverupRole(anchor)||coverupRole(g)||intersect(tags(anchor,'occasions'),tags(g,'occasions')).size);
 const by=Object.fromEntries(order.map(r=>[r,[]]));
 for(const g of state.items){const r=role(g);if(r&&(g.item_code===anchor.item_code||(sameContext(g)&&approved(anchor,g))))by[r].push(g);}
 const tops=by.top.slice();
 for(let i=0;i<tops.length;i++)for(let j=i+1;j<tops.length;j++){
  const a=tops[i],b=tops[j];
  if(!isLayerPair(a,b)||!pairTrainable(a,b)||!approved(a,b))continue;
  const base=layerRole(a)==='base'?a:b,outer=base===a?b:a;
  by.top.push({...base,item_code:'layer:'+base.item_code+'+'+outer.item_code,name:base.name+' + '+outer.name,layerBase:base,layerOuter:outer,category:isDress(a)||isDress(b)?'Dresses':'Tops'});
 }
 for(const r of order){
  by[r].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  if(r===anchorRole)by[r]=by[r].filter(g=>parts(g).some(p=>p.item_code===anchor.item_code));
  else if(r!=='top')by[r].unshift(null);
 }
 const variants=[],seen=new Set();let nodes=0;
 function* completion(forcedRole,forcedCode){
  const picked={},selected=[];
  function* dfs(i,seasons,occasions){
   if(++nodes%128===0)yield null;
   if(i===searchOrder.length)return {...picked};
   const r=searchOrder[i];
   let choices=by[r];
   if(r==='bottom')choices= isDress(picked.top)?choices.filter(x=>!x):choices.filter(Boolean);
   if(r==='shoe'&&!occasions.has('home'))choices=choices.filter(Boolean);
   if(weatherAccessories.includes(r)&&!picked.outer)choices=choices.filter(x=>!x);
   if(r==='belt')choices=choices.filter(x=>!x||(picked.bottom&&beltBottomAllowed(picked.bottom)&&pairTrainable(x,picked.bottom)&&approved(x,picked.bottom)));
   if(r==='tights')choices=choices.filter(x=>!x||picked.bottom||isDress(picked.top));
   if(r==='hair')choices=choices.filter(x=>!x|| (parts(picked.top).some(g=>g.category==='Tops'||coverupRole(g)==='top')&&parts(picked.top).filter(g=>g.category==='Tops'||coverupRole(g)==='top').every(g=>pairTrainable(g,x)&&approved(g,x))));
   if(r===forcedRole)choices=choices.filter(x=>code(x)===forcedCode);
   // A forced weather accessory requires a jacket; a forced belt requires a belt-eligible bottom.
   if(r==='outer'&&weatherAccessories.includes(forcedRole)&&forcedCode)choices=choices.filter(Boolean);
   if(r==='bottom'&&forcedRole==='belt'&&forcedCode)choices=choices.filter(x=>x&&beltBottomAllowed(x));
   for(const g of choices){
    const ps=parts(g);
    if(ps.some(p=>selected.some(q=>!approved(p,q))))continue;
    let ss=seasons,oo=occasions;
    for(const p of ps){ss=intersect(ss,tags(p,'seasons'));if(!coverupRole(p))oo=intersect(oo,tags(p,'occasions'));}
    if(!ss.size||!oo.size)continue;
    if(r==='shoe'&&!g&&!oo.has('home'))continue;
    // If shoes were omitted, the final common occasion must remain Home.
    if(i>searchOrder.indexOf('shoe')&&!picked.shoe&&!oo.has('home'))continue;
    picked[r]=g;selected.push(...ps);
    const found=yield* dfs(i+1,ss,oo);
    selected.splice(selected.length-ps.length,ps.length);
    if(found)return found;
   }
   delete picked[r];return null;
  }
  return yield* dfs(0,new Set(['spring','summer','fall','winter']),new Set(WARDROBE_OCCASIONS.map(x=>x.toLowerCase())));
 }
 function add(v){if(!v)return;const k=order.map(r=>code(v[r])).join('|');if(!seen.has(k)){seen.add(k);variants.push(v);}}
 const first=yield* completion(null,null);if(!first)return [];
 add(first);
 for(const r of order)for(const g of by[r]){add(yield* completion(r,code(g)));yield null;}
 return variants;
}
function paint(session){
 const root=session.root;if(!root.isConnected)return;
 const variants=session.variants;
 if(!variants.length){root.innerHTML='<p class="hint">No complete approved outfits found for this item.</p>';return;}
 const current=variants[session.index];
 const anchorRole=role(session.anchor);
 const choices=r=>[...new Set(variants.map(v=>code(v[r])))];
 root.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 10px"><small>'+variants.length.toLocaleString()+' unique outfits listed</small><div style="display:flex;align-items:center;gap:8px"><button type="button" class="secondary" data-detail-outfit-step="-1" aria-label="Previous outfit">‹</button><small>'+(session.index+1)+' / '+variants.length+'</small><button type="button" class="secondary" data-detail-outfit-step="1" aria-label="Next outfit">›</button></div></div><div class="stylist-slots">'+order.map(r=>{
  const g=current[r],opts=choices(r),idx=opts.indexOf(code(g)),locked=r===anchorRole;
  return '<div class="stylist-slot'+(locked?' locked-slot':'')+'" data-detail-swipe="'+r+'"><div class="slot-head">'+labels[r]+(locked?' <small>Fixed item</small>':'')+'</div>'+
   (g?'<div class="garment-wrap-s"><div class="garment-s">'+(g.layerBase?'<div class="layer-composite-s"><img draggable="false" class="layer-base-s" src="'+esc(image(g.layerBase))+'" alt="'+esc(g.layerBase.name)+'"><img draggable="false" class="layer-outer-s" src="'+esc(image(g.layerOuter))+'" alt="'+esc(g.layerOuter.name)+'"></div>':'<img draggable="false" src="'+esc(image(g))+'" alt="'+esc(g.name)+'">')+'<div class="name">'+esc(g.name)+'</div></div></div>':'<div class="slot-empty">—</div>')+
   (opts.length>1?'<div class="slot-controls"><button type="button" data-detail-outfit-role="'+r+'" data-step="-1" aria-label="Previous '+labels[r]+'">‹</button><small>'+(idx+1)+' / '+opts.length+'</small><button type="button" data-detail-outfit-role="'+r+'" data-step="1" aria-label="Next '+labels[r]+'">›</button></div>':'')+'</div>';
 }).join('')+'</div>';
}
function cycle(session,r,step){
 const variants=session.variants;if(!variants.length)return;
 const current=variants[session.index];
 const opts=[...new Set(variants.map(v=>code(v[r])))];
 if(opts.length<2)return;
 const next=opts[(opts.indexOf(code(current[r]))+step+opts.length)%opts.length];
 let best=-1,score=-1;
 variants.forEach((v,i)=>{if(code(v[r])!==next)return;const n=order.filter(k=>k!==r&&code(v[k])===code(current[k])).length;if(n>score){best=i;score=n;}});
 if(best>=0){session.index=best;paint(session);}
}
window.mountDetailOutfits=function(anchor){
 const root=document.getElementById('detail-approved-outfits');if(!root)return;
 const session={root,anchor,variants:[],index:0};active=session;
 const iterator=build(anchor);root.innerHTML='<p class="hint" role="status">Finding approved outfits…</p>';
 function run(){if(active!==session||!root.isConnected)return;try{const start=performance.now();let result;do{result=iterator.next();if(result.done){session.variants=result.value;paint(session);return;}}while(performance.now()-start<12);setTimeout(run,0);}catch(err){root.textContent='Unable to generate approved outfits.';console.error(err);}}
 setTimeout(run,0);
};
document.addEventListener('click',e=>{
 const t=e.target.closest('button');if(!t||!active?.root.contains(t))return;
 if(t.dataset.detailOutfitStep&&active.variants.length){active.index=(active.index+Number(t.dataset.detailOutfitStep)+active.variants.length)%active.variants.length;paint(active);}
 if(t.dataset.detailOutfitRole)cycle(active,t.dataset.detailOutfitRole,Number(t.dataset.step));
});
let swipe=null;
document.addEventListener('touchstart',e=>{const el=e.target.closest('[data-detail-swipe]');if(el&&active?.root.contains(el)&&e.touches.length===1)swipe={r:el.dataset.detailSwipe,x:e.touches[0].clientX,y:e.touches[0].clientY,session:active};},{passive:true});
document.addEventListener('touchend',e=>{if(!swipe)return;const s=swipe;swipe=null;if(s.session!==active||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-s.x,dy=e.changedTouches[0].clientY-s.y;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.5)cycle(active,s.r,dx<0?1:-1);},{passive:true});
document.addEventListener('touchcancel',()=>{swipe=null;},{passive:true});
if(state.page==='detail'&&state.detailTab==='matches'){const anchor=state.items.find(g=>g.item_code===state.selected);if(anchor)window.mountDetailOutfits(anchor);}
})();