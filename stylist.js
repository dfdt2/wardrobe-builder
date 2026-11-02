/* Integrated stylist: uses Builder state.items / state.pairs, not demo approvals. */
(()=>{
let locationTimer;
const TYPES=['Work','Daily','Date','Business','Home','Party','Sport','Dressy','Specialty'];
const VIBES=['Casual','Minimal','Polished','Sporty','Romantic','Edgy'];
const iso=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const defaultDate=()=>{const d=new Date();if(d.getHours()>=21)d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dateLabel=v=>{const d=new Date();d.setDate(d.getDate()+1);const tomorrow=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');return v===iso()?'Today':v===tomorrow?'Tomorrow':new Date(v+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})};
const ST={date:defaultDate(),dateManual:false,location:'',lat:null,lon:null,weather:null,weatherKey:'',weatherMessage:'Choose a location to retrieve a forecast.',activities:[{type:'Work',start:8,end:17}],vibe:'Casual',cluster:0,variant:0,requesting:false,geolocationTried:false};
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byid=id=>document.getElementById(id);
const time=h=>`${h%12||12} ${h<12?'AM':'PM'}`;
const pair=(a,b)=>state.pairs[[a.item_code,b.item_code].sort().join('::')]===true;
const getimage=x=>typeof image==='function'?image(x):x.image_path||'';
const options=(selected,values)=>values.map(v=>`<option value="${E(v)}" ${String(v)===String(selected)?'selected':''}>${E(v)}</option>`).join('');
function body(){
  return `<section class="stylist"><div class="layout"><div>
  <section class="panel-s"><div class="line-s"><h2>Location & forecast</h2></div>
  <div class="location-input"><input id="st-location" placeholder="City, state or country" value="${E(ST.location)}"><label class="date-wrap-s"><span id="st-date-label">${E(dateLabel(ST.date))}</span><input id="st-date" aria-label="Outfit date" type="date" value="${E(ST.date)}"></label></div>
  <div class="small" id="st-weather-msg" role="status" style="display:none"></div><div id="st-forecast" class="forecast-s"></div></section>
  <section class="panel-s"><h2>Schedule</h2><div id="st-activities"></div><button class="tiny" data-st="add">+ Add activity</button></section>

  </div><div><section class="panel-s"><div class="line-s"><h2>Outfit</h2><div class="outfit-actions-s"><span class="small" id="st-count"></span><button type="button" class="random-outfit-s" data-st="clear-locks" aria-label="Unlock all selected garments">Clear locks</button><button type="button" class="random-outfit-s" data-st="random-anchor" aria-label="Choose a random eligible garment as anchor">Random</button></div></div><div id="st-outfit"></div></section></div></div></section>`;
}
function weatherTheme(w){if(!w)return 'neutral';if([95,96,99].includes(w.code))return 'storm';if(w.snow>0||[71,73,75,77,85,86].includes(w.code))return 'snow';if([51,53,55,61,63,65,80,81,82].includes(w.code)||w.rain>=70)return 'rain';if([0,1].includes(w.code))return 'sunny';if(w.code===2)return 'partly';return 'cloudy'}
function weatherSymbol(w,h){const theme=weatherTheme(w);if(theme==='storm')return '⛈';if(theme==='snow')return '❄';if(theme==='rain')return '☂';if(theme==='cloudy')return '☁';if(theme==='partly')return '⛅';return h<6||h>=20?'☾':'☀'}
function forecast(){
 const slot=byid('st-forecast');if(!slot)return;
 if(!ST.weather){slot.innerHTML='';}
 else{
  const points=ST.weather.map((w,h)=>w&&Number.isFinite(Number(w.temp))?{h,temp:Number(w.temp),w}:null).filter(Boolean);
  if(!points.length){slot.innerHTML='';}
  else{
   const low=points.reduce((a,b)=>b.temp<a.temp?b:a),high=points.reduce((a,b)=>b.temp>a.temp?b:a);
   const W=670,H=345,L=34,R=49,T=50,B=48, ymin=Math.floor((low.temp-6)/5)*5,ymax=Math.ceil((high.temp+6)/5)*5;
   const x=h=>L+h/23*(W-L-R),y=t=>T+(ymax-t)/(ymax-ymin)*(H-T-B);
   const coords=points.map(p=>[x(p.h),y(p.temp)]);
   const line=coords.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
   const area=line+' L '+coords[coords.length-1][0].toFixed(1)+' '+(H-B)+' L '+coords[0][0].toFixed(1)+' '+(H-B)+' Z';
   const ticks=[0,6,12,18,23];
   const guide=Array.from({length:9},(_,i)=>i).map(i=>{let t=ymin+i*(ymax-ymin)/8;return '<line x1="'+L+'" y1="'+y(t)+'" x2="'+(W-R)+'" y2="'+y(t)+'" stroke="#dce5e9" stroke-width="1.1"/><text x="'+(W-5)+'" y="'+(y(t)+4)+'" fill="#858e99" text-anchor="end" font-size="15">'+Math.round(t)+'°</text>'}).join('');
   const icons=[0,3,6,9,12,15,18,21,23].map(h=>{const p=points.find(q=>q.h===h);return p?'<text x="'+x(h)+'" y="24" text-anchor="middle" font-size="24" fill="#4b647d">'+weatherSymbol(p.w,h)+'</text>':''}).join('');
   const marks=ticks.map(h=>'<text x="'+x(h)+'" y="'+(H-17)+'" text-anchor="middle" font-size="16" fill="#78818a">'+(h===0?'12 AM':h===23?'11 PM':time(h))+'</text>').join('');
   const extrema=[low,high].filter((p,i,a)=>i===0||p.h!==a[0].h).map(p=>{const xx=x(p.h),yy=y(p.temp),isHigh=p===high;const ly=yy<83?yy+28:yy-19;return '<circle cx="'+xx+'" cy="'+yy+'" r="5.5" fill="#fff" stroke="'+(isHigh?'#d5a82b':'#53adc7')+'" stroke-width="3"/><text x="'+xx+'" y="'+ly+'" text-anchor="middle" font-weight="700" font-size="21" fill="#223248">'+Math.round(p.temp)+'°</text>'}).join('');
   slot.innerHTML='<div class="weather-graph-s"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Hourly temperature from midnight to 11 PM, low '+Math.round(low.temp)+' degrees at '+time(low.h)+', high '+Math.round(high.temp)+' degrees at '+time(high.h)+'"><defs><linearGradient id="st-area-grad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffe5a0" stop-opacity=".65"/><stop offset="1" stop-color="#9adce5" stop-opacity=".12"/></linearGradient><linearGradient id="st-line-grad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#50bad1"/><stop offset=".55" stop-color="#e3bb40"/><stop offset="1" stop-color="#65c0bb"/></linearGradient></defs>'+guide+icons+'<path d="'+area+'" fill="url(#st-area-grad)"/><path d="'+line+'" stroke="url(#st-line-grad)" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" fill="none"/>'+extrema+marks+'</svg></div>';
  }
 }
 const msg=byid('st-weather-msg');if(msg){msg.textContent=ST.weatherMessage;msg.style.display=ST.weather||!ST.weatherMessage?'none':'block';}
}
function schedule(){const slot=byid('st-activities');if(!slot)return;slot.innerHTML=ST.activities.map((a,i)=>`<div class="activity-s"><select aria-label="Activity ${i+1}" data-st-activity="${i}" data-key="type">${options(a.type,TYPES)}</select><div class="time-slider-s"><div class="range-labels-s"><span data-time="start">${time(a.start)}</span><span data-time="end">${time(a.end)}</span></div><div class="time-range-track" data-time-range="${i}" style="--start:${a.start/24*100}%;--end:${a.end/24*100}%"><div class="time-range-fill"></div><button type="button" class="time-range-handle start" data-range-handle="start" role="slider" aria-label="Start time" aria-valuemin="0" aria-valuemax="${a.end-1}" aria-valuenow="${a.start}" aria-valuetext="${time(a.start)}" style="left:${a.start/24*100}%"></button><button type="button" class="time-range-handle end" data-range-handle="end" role="slider" aria-label="End time" aria-valuemin="${a.start+1}" aria-valuemax="24" aria-valuenow="${a.end}" aria-valuetext="${time(a.end)}" style="left:${a.end/24*100}%"></button></div></div><button class="tiny remove-s" data-st="remove" data-index="${i}" aria-label="Remove activity">×</button></div>`).join('');}
function paintTimeRange(i){const bar=document.querySelector('[data-time-range="'+i+'"]');const a=ST.activities[i];if(!bar||!a)return;bar.style.setProperty('--start',a.start/24*100+'%');bar.style.setProperty('--end',a.end/24*100+'%');const row=bar.closest('.activity-s');row.querySelector('[data-time="start"]').textContent=time(a.start);row.querySelector('[data-time="end"]').textContent=time(a.end);for(const key of ['start','end']){const h=bar.querySelector('[data-range-handle="'+key+'"]');h.style.left=a[key]/24*100+'%';h.setAttribute('aria-valuenow',a[key]);h.setAttribute('aria-valuetext',time(a[key]));h.setAttribute('aria-valuemin',key==='start'?0:a.start+1);h.setAttribute('aria-valuemax',key==='start'?a.end-1:24)}}
function moveTimeHandle(i,key,value){const a=ST.activities[i];if(!a)return;const h=Math.round(Math.max(0,Math.min(24,value)));a[key]=key==='start'?Math.min(h,a.end-1):Math.max(h,a.start+1);paintTimeRange(i);}
let activeTimeDrag=null;
document.addEventListener('pointerdown',e=>{if(state.page!=='stylist')return;const bar=e.target.closest('[data-time-range]');if(!bar)return;const i=Number(bar.dataset.timeRange),a=ST.activities[i],rect=bar.getBoundingClientRect();if(!a||!rect.width)return;const h=Math.max(0,Math.min(24,(e.clientX-rect.left)/rect.width*24));const explicit=e.target.closest('[data-range-handle]')?.dataset.rangeHandle;const key=explicit||(Math.abs(h-a.start)<=Math.abs(h-a.end)?'start':'end');activeTimeDrag={id:e.pointerId,i,key,bar};bar.setPointerCapture(e.pointerId);moveTimeHandle(i,key,h);e.preventDefault()});
document.addEventListener('pointermove',e=>{const d=activeTimeDrag;if(!d||e.pointerId!==d.id)return;const rect=d.bar.getBoundingClientRect();if(rect.width)moveTimeHandle(d.i,d.key,(e.clientX-rect.left)/rect.width*24)});
function finishTimeDrag(e){if(!activeTimeDrag||e.pointerId!==activeTimeDrag.id)return;const d=activeTimeDrag;activeTimeDrag=null;if(d.bar.hasPointerCapture(e.pointerId))d.bar.releasePointerCapture(e.pointerId);results();}
document.addEventListener('pointerup',finishTimeDrag);document.addEventListener('pointercancel',finishTimeDrag);
document.addEventListener('keydown',e=>{const h=e.target.closest('[data-range-handle]');if(state.page!=='stylist'||!h||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const bar=h.closest('[data-time-range]'),i=Number(bar.dataset.timeRange),k=h.dataset.rangeHandle,a=ST.activities[i];let n=a[k];if(e.key==='ArrowLeft')n--;if(e.key==='ArrowRight')n++;if(e.key==='Home')n=k==='start'?0:a.start+1;if(e.key==='End')n=k==='start'?a.end-1:24;moveTimeHandle(i,k,n);results();e.preventDefault()});

function group(name){const n=String(name||'').toLowerCase();if(n==='tops'||n==='top')return 'top';if(['pants','skirts','shorts','bottoms'].includes(n))return 'bottom';if(['shoes','footwear'].includes(n))return 'shoe';if(['outerwear','jackets','coats'].includes(n))return 'outer';if(n==='dresses')return 'dress';if(n==='bags')return 'bag';return null}
function accessoryRole(g){if(g.category!=='Other')return null;return ({Hats:'hat',Scarves:'scarf',Gloves:'gloves'})[g.subcategory]||null}
function roleOf(g){return accessoryRole(g)||group(g.category)}
function warmth(g){return estimatedClo(g)*25} // °F contribution is a heuristic, not a physical conversion
// The 72°F target already assumes ordinary indoor clothing. The garment-specific
// warmth values are relative adjustments, not insulation above bare skin.
// Calibrated reference = 0.32 clo (8°F in this app's heuristic scale).
const BASELINE_CLO_F=8;
function effectiveWarmth(raw){return raw-BASELINE_CLO_F}
function scheduleHours(){const out=new Set();for(const a of ST.activities)for(let h=a.start;h<a.end;h++)out.add(h);return [...out].sort((a,b)=>a-b)}
// Require approval only for relationships that the trainer offers for evaluation.
const ROLE=(c,g)=>g?roleOf(g):(c==='Tops'?'top':(['Pants','Skirts'].includes(c)?'bottom':c==='Shoes'?'shoe':c==='Outerwear'?'outer':c==='Bags'?'bag':c==='Dresses'?'dress':null);
const TRAINABLE=new Set(['bottom|top','bottom|shoe','bottom|outer','outer|top','dress|outer','bag|top','bag|outer','bag|dress','hat|outer','gloves|outer','outer|scarf','hat|scarf','gloves|scarf','gloves|hat']);
function trainerEligible(a,b){const x=ROLE(a.category,a),y=ROLE(b.category,b);return !!(x&&y&&!hasOccasion(a,'Specialty')&&!hasOccasion(b,'Specialty')&&TRAINABLE.has([x,y].sort().join('|')))}
function compatibleSet(items){return items.every((x,i)=>items.slice(i+1).every(y=>(trainerEligible(x,y)?pair(x,y):state.pairs[[x.item_code,y.item_code].sort().join('::')]!==false)))}
function hasOccasion(g,type){return (g.occasions||[]).some(o=>String(o).trim().toLowerCase()===String(type).trim().toLowerCase())}
// A complete base outfit is either top + pants/skirt + shoes, or dress + shoes.
// Outerwear is an optional variation and never substitutes for a required item.
function validBaseOutfit(items){
 const count=role=>items.filter(g=>group(g.category)===role).length;
 const dressLook=count('dress')===1&&count('shoe')===1&&count('top')===0&&count('bottom')===0;
 const separatesLook=count('top')===1&&count('bottom')===1&&count('shoe')===1&&count('dress')===0;
 return items.length===(dressLook?2:3)&&(dressLook||separatesLook);
}
function build(){
const by={top:[],bottom:[],shoe:[],outer:[],dress:[],bag:[],hat:[],scarf:[],gloves:[]};
for(const x of state.items){let role=roleOf(x);if(role)by[role].push(x)}
// Indoor Home is seasonally tempered, never filtered against outdoor weather.
const month=Number(ST.date.slice(5,7));
const indoorTemp=month===12||month<=2?65:month>=6&&month<=8?75:70;
const homeOnly=ST.activities.length>0&&ST.activities.every(a=>a.type==='Home');
const hours=scheduleHours();
const temps=hours.map(h=>{
 const active=ST.activities.filter(a=>h>=a.start&&h<a.end);
 return active.length&&active.every(a=>a.type==='Home')?indoorTemp:ST.weather?.[h]?.temp;
}).filter(Number.isFinite);
const hottest=temps.length?Math.max(...temps):null,coldest=temps.length?Math.min(...temps):null;
const coldAccessories=!homeOnly&&coldest!==null&&coldest<40;
// Exclude open-toed footwear if any scheduled hour is colder than 60°F.
const excludeOpenToe=!homeOnly&&hours.some(h=>ST.activities.some(a=>a.type!=='Home'&&h>=a.start&&h<a.end)&&ST.weather?.[h]?.temp<60);
const eligibleShoes=by.shoe.filter(shoe=>!excludeOpenToe||!['sandals','sandal heels'].includes(String(shoe.subcategory||'').trim().toLowerCase()));
const categoryRank=x=>x.category==='Dresses'?0:1;
let candidates=[];
const bases=[];
for(const top of by.top)for(const bottom of by.bottom)if(pair(top,bottom))bases.push([top,bottom]);
for(const dress of by.dress)bases.push([dress]);
for(const base of bases)for(const shoe of eligibleShoes){
 const required=[...base,shoe];
 if(!validBaseOutfit(required)||!compatibleSet(required))continue;
 // Every scheduled activity must be represented by at least one garment occasion.
 // Every required garment must carry every scheduled activity label.
 if(ST.activities.some(a=>required.some(g=>!hasOccasion(g,a.type))))continue;
 const baseTemp=effectiveWarmth(required.reduce((t,g)=>t+warmth(g),0));
 // The complete base outfit must be comfortable at the warmest scheduled hour.
 // A removable outer layer can then be included for the coldest hour.
 if(!homeOnly&&hottest!==null&&Math.abs(hottest+baseTemp-72)>5)continue;
 const layers=[null,...by.outer.filter(o=>compatibleSet([...required,o]))];
 let variants=[];
 for(const layer of layers){
   const garments=layer?[...required,layer]:required;
   // Optional outerwear must satisfy the same activity restrictions.
   if(ST.activities.some(a=>garments.some(g=>!hasOccasion(g,a.type))))continue;
   const total=baseTemp+(layer?warmth(layer):0);
   // Reject a full outfit variant if its combined insulation misses the coldest hour.
   if(!homeOnly&&coldest!==null&&Math.abs(coldest+total-72)>5)continue;
   const warmError=hottest===null?0:Math.abs(hottest+baseTemp-72);
   const coldError=coldest===null?0:Math.abs(coldest+total-72);
   const score=Math.max(0,100-Math.round((warmError+coldError)*2));
   // Use a compatible bag whenever one exists; "No bag" is fallback only.
   const compatibleBags=by.bag.filter(bag=>
     compatibleSet([...garments,bag])&&
     !ST.activities.some(a=>!hasOccasion(bag,a.type))
   );
   for(const bag of compatibleBags.length?compatibleBags:[null]){
     const outfit=bag?[...garments,bag]:garments;
     // Each accessory is optional. When present it must be compatible with the coat
     // and every other selected cold-weather accessory, with a recorded Yes vote.
     const accessoryOptions=coldAccessories&&layer?['hat','scarf','gloves'].map(role=>[null,...by[role].filter(a=>!hasOccasion(a,'Specialty')&&!ST.activities.some(act=>!hasOccasion(a,act.type))&&compatibleSet([layer,a]))]):[[null],[null],[null]];
     for(const hat of accessoryOptions[0])for(const scarf of accessoryOptions[1])for(const gloves of accessoryOptions[2]){
       const accessories=[hat,scarf,gloves].filter(Boolean);
       if(!compatibleSet([layer,...accessories].filter(Boolean)))continue;
       variants.push({garments:[...outfit,...accessories],score,layer});
     }
   }
 }
 if(!variants.length)continue;
 variants.sort((a,b)=>b.score-a.score);
 candidates.push({base:required,variants,score:variants[0].score,id:required.map(x=>x.item_code).join('/'),rank:categoryRank(base[0])});
}
// One shared pool of fully validated outfits. Each garment slot can be browsed.
const unique=new Map();
for(const candidate of candidates)for(const variant of candidate.variants){
 const key=variant.garments.map(g=>g.item_code).sort().join('::');
 if(!unique.has(key)||unique.get(key).score<variant.score)unique.set(key,variant);
}
const variants=[...unique.values()].sort((a,b)=>b.score-a.score);
return variants.length?[{id:'all-outfits',variants}]:[];
}
const SLOT_ORDER=['top','outer','bottom','shoe','bag','hat','scarf','gloves'];
let slotSelection={};
let lockedRoles=new Set(['top']);
let suppressAnchorClick=false;
let lastClusterKey='';
let lastConditionsKey=null;
function clearAllLocks(){lockedRoles.clear();slotSelection={};}
function conditionsKey(){return JSON.stringify({activities:ST.activities.map(a=>[a.type,a.start,a.end]),date:ST.date,location:ST.location,weather:ST.weather});}
function garmentFor(v,role){return v.garments.find(x=>roleOf(x)===role||(role==='top'&&group(x.category)==='dress'))||null}
function itemCode(v,role){return garmentFor(v,role)?.item_code||''}
function matchingLocks(g,omit=null){return g.variants.filter(v=>[...lockedRoles].every(r=>r===omit||!slotSelection[r]||itemCode(v,r)===slotSelection[r]))}
function optionsForSlot(g,role){return matchingLocks(g,role)}
function toggleLock(role){
 const g=build()[ST.cluster];if(!g)return;
 if(lockedRoles.has(role)){lockedRoles.delete(role);results();return}
 const code=slotSelection[role]||itemCode(matchingLocks(g)[0]||g.variants[0],role);
 if(!code)return;
 if(!matchingLocks(g).some(v=>itemCode(v,role)===code))return;
 slotSelection[role]=code;lockedRoles.add(role);results();
}
function randomAnchor(){
 const groups=build(),g=groups[ST.cluster];if(!g)return;
 const pool=new Map();
 for(const v of matchingLocks(g))for(const role of SLOT_ORDER){
  const code=itemCode(v,role);if(code&&!pool.has(code))pool.set(code,{role,code});
 }
 const choices=[...pool.values()];if(!choices.length)return;
 const selected=choices[Math.floor(Math.random()*choices.length)];
 slotSelection[selected.role]=selected.code;
 lockedRoles.add(selected.role);
 results();
}
function emptyReason(){
 const work=ST.activities.map(a=>a.type);
 const tops=state.items.filter(x=>group(x.category)==='top'&&work.every(t=>hasOccasion(x,t)));
 const bottoms=state.items.filter(x=>group(x.category)==='bottom'&&work.every(t=>hasOccasion(x,t)));
 const shoes=state.items.filter(x=>group(x.category)==='shoe'&&work.every(t=>hasOccasion(x,t)));
 const basePairs=tops.flatMap(t=>bottoms.filter(b=>pair(t,b)).map(b=>[t,b]));
 const combos=basePairs.reduce((n,[t,b])=>n+shoes.filter(sh=>compatibleSet([t,b,sh])).length,0);
 const hours=scheduleHours();
 const temperatures=hours.map(h=>ST.weather?.[h]?.temp).filter(Number.isFinite);
 const context=temperatures.length?' Scheduled temperatures: '+Math.round(Math.min(...temperatures))+'–'+Math.round(Math.max(...temperatures))+'°F.':' Weather data unavailable for the selected hours.';
 if(!combos)return 'No approved top + bottom + shoe combinations meet the selected activity tags. Check that cloud decisions have finished loading.'+context;
 return combos+' approved complete combinations meet your activity tags, but none pass the remaining temperature/layer requirements.'+context+' The ±5°F comfort constraint is still enforced.';
}
function results(){
 if(!byid('st-outfit'))return;
 const nextConditionsKey=conditionsKey();
 if(lastConditionsKey!==null&&nextConditionsKey!==lastConditionsKey){clearAllLocks();lastClusterKey='';}
 lastConditionsKey=nextConditionsKey;
 const groups=build();byid('st-count').textContent='';
 ST.cluster=Math.min(ST.cluster,Math.max(0,groups.length-1));
 const g=groups[ST.cluster];
 if(!g){byid('st-outfit').innerHTML='<div class="empty-s">No matching outfits.<p style="margin-top:10px">'+E(emptyReason())+'</p></div>';return}
 if(lastClusterKey!==g.id){
  lastClusterKey=g.id;
  // Preserve unlocked state after changing conditions or using Clear locks.
  slotSelection={};
 }
 // Initialize a default top lock, favoring a real top when available.
 if(lockedRoles.has('top')&&!slotSelection.top){
  const first=g.variants.find(v=>itemCode(v,'top'));
  if(first)slotSelection.top=itemCode(first,'top');else lockedRoles.delete('top');
 }
 // If a lock has become impossible (e.g. data changed), recover without trapping the user.
 let matching=matchingLocks(g);
 if(!matching.length){clearAllLocks();matching=g.variants;}
 let chosen=matching.find(v=>SLOT_ORDER.every(role=>!slotSelection[role]||lockedRoles.has(role)||itemCode(v,role)===slotSelection[role]))||matching[0];
 for(const role of SLOT_ORDER)slotSelection[role]=itemCode(chosen,role);
 const baseGarments=chosen.garments.filter(g=>!['outer','bag','hat','scarf','gloves'].includes(roleOf(g)));
 const coat=chosen.garments.find(g=>group(g.category)==='outer');
 const baseWarmth=baseGarments.reduce((sum,g)=>sum+warmth(g),0);
 const layeredWarmth=baseWarmth+(coat?warmth(coat):0)-BASELINE_CLO_F;
 const adjustedBaseWarmth=baseWarmth-BASELINE_CLO_F;
 const low=Math.round(67-layeredWarmth),high=Math.round(77-adjustedBaseWarmth);
 byid('st-count').textContent='Comfort: '+low+'–'+high+'°F';
 byid('st-count').title='Estimated outdoor comfort range, using optional outerwear at colder temperatures (72°F target ±5°F).';
 const labels={top:'Top / dress',outer:'Jacket',bottom:'Pants / skirt',shoe:'Shoes',bag:'Bag',hat:'Hat',scarf:'Scarf',gloves:'Gloves'};
 const slots=SLOT_ORDER.filter(role=>!['hat','scarf','gloves'].includes(role)||chosen.garments.some(x=>roleOf(x)===role)||g.variants.some(v=>v.garments.some(x=>roleOf(x)===role))).map(role=>{
  const possible=[...new Map(optionsForSlot(g,role).map(v=>{const item=garmentFor(v,role);return [item?.item_code||'',item]})).values()];
  const current=garmentFor(chosen,role),code=current?.item_code||'';
  const index=possible.findIndex(x=>(x?.item_code||'')===code);
  const count=possible.length,canCycle=count>1;
  const isLocked=lockedRoles.has(role);
  return '<div class="stylist-slot'+(isLocked?' locked-slot':'')+'" data-swipe-role="'+role+'" aria-label="'+labels[role]+(isLocked?', locked':'')+'"><div class="slot-head">'+labels[role]+'</div>'+
   (current?'<button type="button" class="garment-s" data-st="open-item" data-item-code="'+E(current.item_code)+'" aria-label="View '+E(current.name)+' details" style="-webkit-touch-callout:none;touch-action:pan-y"><img draggable="false" style="-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;pointer-events:none" src="'+E(getimage(current))+'" alt="'+E(current.name)+'"><div class="name">'+E(current.name)+'</div></button>':'<div class="slot-empty">No '+(role==='bag'?'bag':role==='outer'?'jacket':labels[role].toLowerCase())+'</div>')+
   (['bag','hat','scarf','gloves'].includes(role)&&!current?'':'<div class="slot-controls"><button type="button" data-st="cycle-slot" data-role="'+role+'" data-step="-1" '+(!canCycle?'disabled':'')+' aria-label="Previous '+labels[role]+'">‹</button><small>'+(Math.max(0,index)+1)+' / '+count+'</small><button type="button" data-st="cycle-slot" data-role="'+role+'" data-step="1" '+(!canCycle?'disabled':'')+' aria-label="Next '+labels[role]+'">›</button></div>')+'</div>';
 }).join('');
 const localProtection=chosen.garments.filter(x=>['hat','scarf','gloves'].includes(roleOf(x))).map(x=>{const n=Number(x.warmth_contribution_f);return (roleOf(x)==='hat'?'Hat':roleOf(x)==='scarf'?'Scarf':'Gloves')+': '+(Number.isFinite(n)?n.toFixed(1):warmth(x).toFixed(1))+'°F'});
 byid('st-outfit').innerHTML='<div class="stylist-slots">'+slots+'</div>'+(localProtection.length?'<p class="slot-foot">Accessory protection (local estimates, not added to whole-body comfort): '+E(localProtection.join(' · '))+'</p>':'')+'<p class="slot-foot">'+matching.length+' compatible complete outfit'+(matching.length===1?'':'s')+' · Hold an item to lock / unlock</p>';
 const holder=byid('st-outfit');
 holder.querySelectorAll('[data-swipe-role]').forEach(el=>{
  let startX=0,startY=0,holdTimer=null,held=false;
  el.addEventListener('pointerdown',e=>{
   if(e.target.closest('.slot-controls'))return;
   startX=e.clientX;startY=e.clientY;held=false;
   holdTimer=setTimeout(()=>{held=true;suppressAnchorClick=true;toggleLock(el.dataset.swipeRole)},550);
  });
  el.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-startX)>12||Math.abs(e.clientY-startY)>12)clearTimeout(holdTimer)});
  for(const t of ['pointerup','pointercancel','pointerleave'])el.addEventListener(t,()=>clearTimeout(holdTimer));
  el.addEventListener('contextmenu',e=>{e.preventDefault();if(!held&&e.pointerType==='mouse')toggleLock(el.dataset.swipeRole)});
  el.addEventListener('dragstart',e=>e.preventDefault());
  el.addEventListener('touchstart',e=>{startX=e.touches[0].clientX;startY=e.touches[0].clientY},{passive:true});
  el.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(!held&&Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.3)cycleSlot(el.dataset.swipeRole,dx<0?1:-1)},{passive:true});
 });
}
function cycleSlot(role,step){
 const g=build()[ST.cluster];if(!g)return;
 const variants=optionsForSlot(g,role);
 const options=[...new Set(variants.map(v=>itemCode(v,role)))];
 if(options.length<2)return;
 const current=slotSelection[role]||itemCode(variants[0],role);
 const index=Math.max(0,options.indexOf(current));
 const code=options[(index+step+options.length)%options.length];
 slotSelection[role]=code;
 // If a lock is switched, preserve all other locks; update unlocked slots to a valid outfit.
 const matches=matchingLocks(g).filter(v=>itemCode(v,role)===code);
 if(!matches.length)return;
 const v=matches[0];
 for(const r of SLOT_ORDER)if(!lockedRoles.has(r))slotSelection[r]=itemCode(v,r);
 results();
}

async function getWeather(){if(ST.lat==null||ST.lon==null)return;const key=`${ST.lat},${ST.lon},${ST.date}`;if(ST.weatherKey===key&&ST.weather)return;ST.weather=null;ST.weatherMessage='Loading forecast…';forecast();try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${ST.lat}&longitude=${ST.lon}&hourly=temperature_2m,precipitation_probability,snowfall,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=16`;const res=await fetch(url);if(!res.ok)throw Error('Forecast service unavailable');const d=await res.json();const hours=Array.from({length:24},(_,h)=>{const idx=d.hourly.time.indexOf(`${ST.date}T${String(h).padStart(2,'0')}:00`);return idx<0?null:{temp:d.hourly.temperature_2m[idx],rain:d.hourly.precipitation_probability[idx]??0,snow:d.hourly.snowfall[idx]??0,code:d.hourly.weather_code[idx]}});if(hours.every(x=>!x))throw Error('Forecast unavailable for this date (typically limited to the next 16 days)');ST.weather=hours;ST.weatherKey=key;ST.weatherMessage='';}catch(e){ST.weatherMessage=e.message;ST.weatherKey='';}forecast();results();}
async function searchLocation(){let name=byid('st-location')?.value.trim();if(!name)return;ST.weatherMessage='Looking up location…';forecast();try{let r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);let d=await r.json();if(!d.results?.length)throw Error('Location not found');let c=d.results[0];ST.lat=c.latitude;ST.lon=c.longitude;ST.location=[c.name,c.admin1,c.country].filter(Boolean).join(', ');byid('st-location').value=ST.location;await getWeather()}catch(e){ST.weatherMessage=e.message;forecast()}}
function detect(){if(!navigator.geolocation){ST.weatherMessage='Location permission unavailable';forecast();return}ST.weatherMessage='Detecting location…';forecast();navigator.geolocation.getCurrentPosition(async p=>{ST.lat=p.coords.latitude;ST.lon=p.coords.longitude;ST.location='Current location';if(byid('st-location'))byid('st-location').value=ST.location;try{let r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${ST.lat}&lon=${ST.lon}&format=json&zoom=10&addressdetails=1`);let j=await r.json();if(j.address){ST.location=[j.address.city||j.address.town||j.address.village||j.address.municipality||j.address.county,j.address.state].filter(Boolean).join(', ');if(byid('st-location'))byid('st-location').value=ST.location}}catch(e){}await getWeather()},()=>{ST.weatherMessage='Location access denied. Search for a city instead.';forecast()},{timeout:12000,maximumAge:600000})}
window.renderStylist=function(m){if(!ST.dateManual)ST.date=defaultDate();setTitle("Stylist");m.innerHTML=body();schedule();forecast();results();if(!ST.geolocationTried){ST.geolocationTried=true;detect()}};
document.addEventListener('click',e=>{if(suppressAnchorClick){suppressAnchorClick=false;e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('click',e=>{if(state.page!=='stylist')return;const b=e.target.closest('[data-st]');if(!b)return;const act=b.dataset.st;if(act==='open-item'){openItemDetail(b.dataset.itemCode,'stylist','matches');return}if(act==='random-anchor'){randomAnchor();return}if(act==='clear-locks'){clearAllLocks();results();return}if(act==='cycle-slot'){cycleSlot(b.dataset.role,Number(b.dataset.step));return}if(act==='set-anchor'){toggleLock(b.dataset.role);return}if(act==='detect')detect();if(act==='search')searchLocation();if(act==='add'){const end=ST.activities.at(-1)?.end||17;ST.activities.push({type:'Daily',start:Math.max(6,Math.min(23,end)),end:Math.min(24,Math.max(7,end+1))});schedule();results()}if(act==='remove'){if(ST.activities.length>1){ST.activities.splice(+b.dataset.index,1);schedule();results()}}if(act==='vibe'){ST.vibe=b.dataset.vibe;ST.cluster=0;ST.variant=0;schedule();results()}if(act==='family'){ST.cluster=+b.dataset.index;ST.variant=0;slotSelection={};lastClusterKey='';results()}if(act==='previous'||act==='next'){const g=build()[ST.cluster];if(g)ST.variant=(ST.variant+(act==='next'?1:-1)+g.variants.length)%g.variants.length;results()}});
document.addEventListener('change',e=>{if(state.page!=='stylist')return;const el=e.target;if(el.id==='st-date'){ST.date=el.value||defaultDate();ST.dateManual=true;const label=byid('st-date-label');if(label)label.textContent=dateLabel(ST.date);ST.weatherKey='';getWeather()}if(el.dataset.stActivity!=null){const i=+el.dataset.stActivity;const k=el.dataset.key;ST.activities[i][k]=k==='type'?el.value:+el.value;if(ST.activities[i].end<=ST.activities[i].start){if(k==='start')ST.activities[i].start=ST.activities[i].end-1;else ST.activities[i].end=ST.activities[i].start+1}schedule();results()}});
document.addEventListener('input',e=>{if(state.page==='stylist'&&e.target.id==='st-location'){clearTimeout(locationTimer);locationTimer=setTimeout(()=>{if(byid('st-location')?.value.trim().length>=3)searchLocation()},600)}});
document.addEventListener('keydown',e=>{if(state.page==='stylist'&&e.key==='Enter'&&e.target.id==='st-location'){e.preventDefault();clearTimeout(locationTimer);searchLocation()}});
})();
