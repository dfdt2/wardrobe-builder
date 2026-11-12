/* Integrated stylist: uses Builder state.items / state.pairs, not demo approvals. */
(()=>{
let locationTimer;
const TYPES=['Work','Daily','Date','Business','Home','Party','Dressy','Sport','Specialty'];
const ACTIVITY_DEFAULT_TIMES={
 Work:[8,17],Daily:[8,17],Date:[8,17],Business:[8,17],
 Home:[18,24],Party:[20,24],Dressy:[20,24],
 Sport:[8,20],Specialty:[8,20]
};
const defaultActivity=(type='Daily')=>{const [start,end]=ACTIVITY_DEFAULT_TIMES[type]||[8,17];return {type,start,end};};
const VIBES=['Casual','Minimal','Polished','Sporty','Romantic','Edgy'];
const iso=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const defaultDate=()=>{const d=new Date();if(d.getHours()>=21)d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const dateLabel=v=>{const d=new Date();d.setDate(d.getDate()+1);const tomorrow=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');return v===iso()?'Today':v===tomorrow?'Tomorrow':new Date(v+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})};
let currentOutfitCodes=[];
const ST={date:defaultDate(),dateManual:false,location:'',lat:null,lon:null,weather:null,weatherKey:'',weatherMessage:'Choose a location to retrieve a forecast.',activities:[defaultActivity('Work')],vibe:'Casual',cluster:0,variant:0,requesting:false,geolocationTried:false};
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byid=id=>document.getElementById(id);
const time=h=>h===24?'12 AM':`${h%12||12} ${h<12?'AM':'PM'}`;
const pair=(a,b)=>state.pairs[[a.item_code,b.item_code].sort().join('::')]===true;
const getimage=x=>typeof image==='function'?image(x):x.image_path||'';
const options=(selected,values)=>values.map(v=>`<option value="${E(v)}" ${String(v)===String(selected)?'selected':''}>${E(v)}</option>`).join('');
function body(){
  return `<section class="stylist"><div class="layout"><div>
  <section class="panel-s"><div class="line-s"><h2>Location & forecast</h2></div>
  <div class="location-input"><input id="st-location" placeholder="City, state or country" value="${E(ST.location)}"><label class="date-wrap-s"><span id="st-date-label">${E(dateLabel(ST.date))}</span><input id="st-date" aria-label="Outfit date" type="date" value="${E(ST.date)}"></label></div>
  <div class="small" id="st-weather-msg" role="status" style="display:none"></div><div id="st-forecast" class="forecast-s"></div></section>
  <section class="panel-s"><h2>Schedule</h2><div id="st-activities"></div><button class="tiny" data-st="add">+ Add activity</button></section>

  </div><div><section class="panel-s"><div class="line-s"><h2>Outfit recommendation</h2><div class="outfit-actions-s"><span class="small" id="st-count"></span><button type="button" class="random-outfit-s" data-st="clear-locks" aria-label="Unlock all selected garments">Clear locks</button><button type="button" class="random-outfit-s" data-st="random-anchor" aria-label="Choose a random eligible garment as anchor">Random</button></div></div><div id="st-outfit"></div></section></div></div></section>`;
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
   const extrema=[low,high].filter((p,i,a)=>i===0||p.h!==a[0].h).map(p=>{const xx=x(p.h),yy=y(p.temp),isHigh=p===high;const ly=yy<83?yy+28:yy-19,color=isHigh?'#9b7300':'#147b9e';return '<circle cx="'+xx+'" cy="'+yy+'" r="5.5" fill="#fff" stroke="'+(isHigh?'#d5a82b':'#53adc7')+'" stroke-width="3"/><text x="'+xx+'" y="'+ly+'" text-anchor="middle" font-weight="700" font-size="21" fill="'+color+'">'+Math.round(p.temp)+'°</text>'}).join('');
   // Each activity boundary follows the same start/end times as the schedule sliders.
   const boundaries=ST.activities.flatMap((a,i)=>[{h:a.start,kind:'Start',i},{h:a.end,kind:'End',i}]).filter(b=>Number.isFinite(b.h));
   const scheduleMarkers=boundaries.map((b,k)=>{const xx=x(Math.min(23,b.h)),w=ST.weather?.[Math.min(23,b.h)],temp=w&&Number.isFinite(Number(w.temp))?Number(w.temp):null;
     const yy=temp===null?null:y(temp),labelY=yy===null?null:(yy<83?yy+29:yy-19);
     return '<line x1="'+xx+'" x2="'+xx+'" y1="'+T+'" y2="'+(H-B)+'" stroke="#171717" stroke-width="1.5" stroke-dasharray="4 3"/>'+
       (yy===null?'':'<circle cx="'+xx+'" cy="'+yy+'" r="5.5" fill="#171717" stroke="white" stroke-width="2"/><text x="'+xx+'" y="'+labelY+'" text-anchor="middle" font-size="21" font-weight="700" fill="#171717">'+Math.round(temp)+'°</text>');
   }).join('');
   slot.innerHTML='<div class="small" style="padding:0 4px 4px;color:#777">Feels like (°F) · includes sun, wind & humidity</div><div class="weather-graph-s"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Hourly feels-like temperature from midnight to 11 PM, low '+Math.round(low.temp)+' degrees at '+time(low.h)+', high '+Math.round(high.temp)+' degrees at '+time(high.h)+'"><defs><linearGradient id="st-area-grad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffe5a0" stop-opacity=".65"/><stop offset="1" stop-color="#9adce5" stop-opacity=".12"/></linearGradient><linearGradient id="st-line-grad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#50bad1"/><stop offset=".55" stop-color="#e3bb40"/><stop offset="1" stop-color="#65c0bb"/></linearGradient></defs>'+guide+icons+'<path d="'+area+'" fill="url(#st-area-grad)"/><path d="'+line+'" stroke="url(#st-line-grad)" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" fill="none"/>'+scheduleMarkers+extrema+marks+'</svg></div>';
  }
 }
 const msg=byid('st-weather-msg');if(msg){msg.textContent=ST.weatherMessage;msg.style.display=ST.weather||!ST.weatherMessage?'none':'block';}
}
// Walking estimates for a 5'4"-5'5" adult at a normal pace.
// Store shoe requirements in actual steps; mile/minute inputs are approximate.
const WALK_STEPS_PER_MILE=2300,WALK_STEPS_PER_MINUTE=100;
function walkingSteps(a){
 if(a.walkingSteps!==undefined&&a.walkingSteps!==null&&a.walkingSteps!=='')return Math.max(0,Number(a.walkingSteps)||0);
 // Migrate the older "thousands of steps" activity field without changing its meaning.
 if(a.walkingThousands!==undefined&&a.walkingThousands!==null&&a.walkingThousands!==''){
  a.walkingSteps=Math.max(0,Math.round((Number(a.walkingThousands)||0)*1000));
  delete a.walkingThousands;return a.walkingSteps;
 }
 return 0;
}
function walkingUnitsValue(steps,unit){
 if(!steps)return '';
 if(unit==='miles')return String(Math.round(steps/WALK_STEPS_PER_MILE*100)/100);
 if(unit==='minutes')return String(Math.round(steps/WALK_STEPS_PER_MINUTE*10)/10);
 return String(Math.round(steps));
}
function schedule(){const slot=byid('st-activities');if(!slot)return;slot.innerHTML=ST.activities.map((a,i)=>{
 const steps=walkingSteps(a),unit=['steps','miles','minutes'].includes(a.walkingUnit)?a.walkingUnit:'steps';
 return `<div class="activity-s"><select aria-label="Activity ${i+1}" data-st-activity="${i}" data-key="type">${options(a.type,TYPES)}</select><div class="time-slider-s"><div class="range-labels-s"><span data-time="start">${time(a.start)}</span><span data-time="end">${time(a.end)}</span></div><div class="time-range-track" data-time-range="${i}" style="--start:${a.start/24*100}%;--end:${a.end/24*100}%"><div class="time-range-fill"></div><button type="button" class="time-range-handle start" data-range-handle="start" role="slider" aria-label="Start time" aria-valuemin="0" aria-valuemax="${a.end-1}" aria-valuenow="${a.start}" aria-valuetext="${time(a.start)}" style="left:${a.start/24*100}%"></button><button type="button" class="time-range-handle end" data-range-handle="end" role="slider" aria-label="End time" aria-valuemin="${a.start+1}" aria-valuemax="24" aria-valuenow="${a.end}" aria-valuetext="${time(a.end)}" style="left:${a.end/24*100}%"></button></div></div><details class="walking-steps-s" style="grid-column:1/-1;margin:3px 0 6px"><summary style="cursor:pointer;font-size:12px;color:#777">Walking distance<span data-walk-summary="${i}">${steps?' · '+steps.toLocaleString()+' steps':''}</span></summary><div style="display:flex;align-items:center;gap:8px;margin-top:9px"><input aria-label="Walking distance for activity ${i+1}" type="number" min="0" step="${unit==='miles'?'any':'1'}" data-st-walking="${i}" value="${E(walkingUnitsValue(steps,unit))}" placeholder="Any" style="width:115px;min-width:0;padding:8px;border:1px solid #ddd;border-radius:8px"><select aria-label="Walking distance unit for activity ${i+1}" data-st-walk-unit="${i}" style="width:110px;padding:8px;border:1px solid #ddd;border-radius:8px">${options(unit,['steps','miles','minutes'])}</select></div></details><button class="tiny remove-s" data-st="remove" data-index="${i}" aria-label="Remove activity">×</button></div>`;
 }).join('');}
function setWalkingInput(el){
 const i=Number(el.dataset.stWalking),a=ST.activities[i];if(!a)return;
 const raw=el.value.trim(),v=Number(raw),unit=a.walkingUnit||'steps';
 a.walkingSteps=raw!==''&&Number.isFinite(v)&&v>=0?Math.round(v*(unit==='miles'?WALK_STEPS_PER_MILE:unit==='minutes'?WALK_STEPS_PER_MINUTE:1)):0;
 delete a.walkingThousands;
 const steps=a.walkingSteps,summary=byid('st-activities')?.querySelector('[data-walk-summary="'+i+'"]');
 if(summary)summary.textContent=steps?' · '+steps.toLocaleString()+' steps':'';
 results();
}

function paintTimeRange(i){const bar=document.querySelector('[data-time-range="'+i+'"]');const a=ST.activities[i];if(!bar||!a)return;bar.style.setProperty('--start',a.start/24*100+'%');bar.style.setProperty('--end',a.end/24*100+'%');const row=bar.closest('.activity-s');row.querySelector('[data-time="start"]').textContent=time(a.start);row.querySelector('[data-time="end"]').textContent=time(a.end);for(const key of ['start','end']){const h=bar.querySelector('[data-range-handle="'+key+'"]');h.style.left=a[key]/24*100+'%';h.setAttribute('aria-valuenow',a[key]);h.setAttribute('aria-valuetext',time(a[key]));h.setAttribute('aria-valuemin',key==='start'?0:a.start+1);h.setAttribute('aria-valuemax',key==='start'?a.end-1:24)}}
function moveTimeHandle(i,key,value){const a=ST.activities[i];if(!a)return;const h=Math.round(Math.max(0,Math.min(24,value)));a[key]=key==='start'?Math.min(h,a.end-1):Math.max(h,a.start+1);paintTimeRange(i);forecast();}
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
// Winter calibration: the original fixed baseline made even insulated outfits fail
// in the 30s–40s. Retain the strict 72 ± 5°F target, but account for the
// extra effective insulation of a fully dressed winter outfit below 65°F.
// This is a heuristic comfort calibration, not a physical clo conversion.
function coldWeatherAdjustment(temp){return Math.max(0,Math.min(13,(65-temp)*1.3))}
function effectiveWarmth(raw,temp){return raw-BASELINE_CLO_F+coldWeatherAdjustment(temp)}
function comfortError(temp,baseWarmth,extraWarmth=0,coatWarmth=0){
 const without=Math.abs(temp+effectiveWarmth(baseWarmth+extraWarmth,temp)-72);
 const withCoat=coatWarmth>0?Math.abs(temp+effectiveWarmth(baseWarmth+extraWarmth+coatWarmth,temp)-72):Infinity;
 return Math.min(without,withCoat);
}
function scheduleHours(){const out=new Set();for(const a of ST.activities)for(let h=a.start;h<a.end;h++)out.add(h);return [...out].sort((a,b)=>a-b)}
// Require approval only for relationships that the trainer offers for evaluation.
const ROLE=(c,g)=>g?roleOf(g):c==='Tops'?'top':(['Pants','Skirts'].includes(c)?'bottom':c==='Shoes'?'shoe':c==='Outerwear'?'outer':c==='Bags'?'bag':c==='Dresses'?'dress':null);
const TRAINABLE=new Set(['bottom|top','bottom|shoe','bottom|outer','outer|top','dress|outer','dress|shoe','bag|top','bag|outer','bag|dress','hat|outer','gloves|outer','outer|scarf','hat|scarf','gloves|scarf','gloves|hat']);
function trainerEligible(a,b){const x=ROLE(a.category,a),y=ROLE(b.category,b);return !!(x&&y&&!hasOccasion(a,'Specialty')&&!hasOccasion(b,'Specialty')&&TRAINABLE.has([x,y].sort().join('|')))}
function compatibleSet(items){return items.every((x,i)=>items.slice(i+1).every(y=>(trainerEligible(x,y)?pair(x,y):state.pairs[[x.item_code,y.item_code].sort().join('::')]!==false)))}
function hasOccasion(g,type){return (g.occasions||[]).some(o=>String(o).trim().toLowerCase()===String(type).trim().toLowerCase())}
// A complete base outfit is either top + pants/skirt + shoes, or dress + shoes.
// Outerwear is an optional variation and never substitutes for a required item.
function validBaseOutfit(items,shoeOptional=false){
 const count=role=>items.filter(g=>group(g.category)===role).length;
 const dressLook=count('dress')===1&&(shoeOptional?count('shoe')<=1:count('shoe')===1)&&count('top')===0&&count('bottom')===0;
 const separatesLook=count('top')===1&&count('bottom')===1&&(shoeOptional?count('shoe')<=1:count('shoe')===1)&&count('dress')===0;
 return items.length===(dressLook?1+count('shoe'):2+count('shoe'))&&(dressLook||separatesLook);
}
const NONE='__NONE__';
const OPTIONAL_ROLES=new Set(['outer','shoe','bag','scarf','hat','gloves']);
const explicitlyNone=role=>lockedRoles.has(role)&&slotSelection[role]===NONE;
// Indexed, on-demand constraint solver. It searches for one valid completion
// of each visible garment choice, rather than materializing a Cartesian product.
// The remaining combinations are still reachable by changing/locking slots.
let outfitPoolCache=null;
function invalidateOutfitPool(){outfitPoolCache=null;}
function buildUncached(){
 const noShoe=explicitlyNone('shoe'),noOuter=explicitlyNone('outer'),noBag=explicitlyNone('bag');
 const homeOnly=ST.activities.length>0&&ST.activities.every(a=>a.type==='Home');
 const month=Number(ST.date.slice(5,7));
 const indoorTemp=month===12||month<=2?65:month>=6&&month<=8?75:70;
 const hours=scheduleHours();
 const temperatures=hours.map(h=>{
  const activities=ST.activities.filter(a=>h>=a.start&&h<a.end);
  return activities.length&&activities.every(a=>a.type==='Home')?indoorTemp:ST.weather?.[h]?.temp;
 }).filter(Number.isFinite);
 const coldest=temperatures.length?Math.min(...temperatures):null;
 const accessoryThresholds={hat:40,scarf:60,gloves:50};
 const requiredWalkingSteps=ST.activities.reduce((n,a)=>n+walkingSteps(a),0);
 const excludeOpenToe=!homeOnly&&hours.some(h=>ST.activities.some(a=>a.type!=='Home'&&h>=a.start&&h<a.end)&&ST.weather?.[h]?.temp<60);
 const by={top:[],bottom:[],dress:[],shoe:[],outer:[],bag:[],scarf:[],gloves:[],hat:[]};
 for(const garment of state.items){
  const role=roleOf(garment);
  if(!role||ST.activities.some(a=>!hasOccasion(garment,a.type)))continue;
  if(['hat','scarf','gloves'].includes(role)&&(homeOnly||coldest===null||coldest>=accessoryThresholds[role]||hasOccasion(garment,'Specialty')))continue;
  if(role==='shoe'){
   if(excludeOpenToe&&['sandals','sandal heels'].includes(String(garment.subcategory||'').trim().toLowerCase()))continue;
   if(requiredWalkingSteps>0&&(shoeComfortSteps(garment)===null||shoeComfortSteps(garment)<requiredWalkingSteps))continue;
  }
  by[role].push(garment);
 }
 const roles=['top','bottom','shoe','outer','scarf','gloves','hat','bag'];
 const allOptions={
  top:[...by.top,...by.dress],bottom:[...by.bottom,null],
  shoe:noShoe?[null]:homeOnly?[...by.shoe,null]:by.shoe,
  outer:noOuter?[null]:[null,...by.outer],
  scarf:[null,...by.scarf],gloves:[null,...by.gloves],hat:[null,...by.hat],
  bag:noBag?[null]:[null,...by.bag]
 };
 const optionCode=item=>item?.item_code||NONE;
 const validityCache=new Map();
 const minimumShoeWarmth=(homeOnly||noShoe)?0:(by.shoe.length?Math.min(...by.shoe.map(warmth)):Infinity);
 const permits=(items,candidate)=>!candidate||items.every(other=>!other||(
  trainerEligible(other,candidate)?pair(other,candidate):
  state.pairs[[other.item_code,candidate.item_code].sort().join('::')]!==false
 ));
 const variants=[];
 const seen=new Set();
 function findCompletion(forcedRole,forcedCode){
  const fixed=new Map();
  for(const role of lockedRoles){
   const code=slotSelection[role];
   if(code)fixed.set(role,code);
  }
  if(forcedRole)fixed.set(forcedRole,forcedCode);
  const constraintKey=roles.map(role=>fixed.get(role)||'*').join('|');
  if(validityCache.has(constraintKey))return validityCache.get(constraintKey);
  const picked={};
  const selected=[];
  function dfs(index){
   // A top/bottom combination already too warm with the lightest eligible shoe
   // cannot become valid by adding shoes, coats or accessories.
   if(index===2&&!homeOnly&&!noOuter&&temperatures.length){
    const part=[picked.top,picked.bottom].filter(Boolean);
    const lowerBound=part.reduce((sum,g)=>sum+warmth(g),0)+minimumShoeWarmth;
    if(temperatures.some(temp=>temp+effectiveWarmth(lowerBound,temp)>77))return null;
   }
   // Reject impossible core looks before exploring coats, bags or accessories.
   // Added layers only increase warmth, so an already-too-warm base cannot pass.
   if(index===3&&!homeOnly&&!noOuter&&temperatures.length){
    const baseWarmth=[picked.top,picked.bottom,picked.shoe].filter(Boolean).reduce((sum,g)=>sum+warmth(g),0);
    if(temperatures.some(temp=>temp+effectiveWarmth(baseWarmth,temp)>77))return null;
   }
   // Temperature is independent of bag selection: don't enumerate bags for
   // a base/layer/accessory combination that has already failed.
   if(index===7&&!homeOnly&&!noOuter&&temperatures.length){
    const baseWarmth=[picked.top,picked.bottom,picked.shoe].filter(Boolean).reduce((sum,g)=>sum+warmth(g),0);
    const extra=['scarf','gloves','hat'].reduce((sum,role)=>sum+(picked[role]?warmth(picked[role]):0),0);
    if(temperatures.some(temp=>comfortError(temp,baseWarmth,extra,picked.outer?warmth(picked.outer):0)>5))return null;
   }
   if(index===roles.length){
    const base=[picked.top,picked.bottom,picked.shoe].filter(Boolean);
    if(!validBaseOutfit(base,homeOnly||noShoe))return null;
    const baseWarmth=base.reduce((sum,g)=>sum+warmth(g),0);
    const accessoryWarmth=['scarf','gloves','hat'].reduce((sum,role)=>sum+(picked[role]?warmth(picked[role]):0),0);
    const coat=picked.outer;
    const errors=temperatures.map(temp=>comfortError(temp,baseWarmth,accessoryWarmth,coat?warmth(coat):0));
    if(!homeOnly&&!noOuter&&errors.some(error=>error>5))return null;
    const score=Math.max(0,100-Math.round((errors.length?errors.reduce((sum,e)=>sum+e,0)/errors.length:0)*4));
    return {garments:selected.filter(Boolean).slice(),score,layer:coat||null};
   }
   const role=roles[index];
   let choices=allOptions[role];
   // Dresses are displayed in the top slot and do not have a separate bottom.
   if(role==='bottom')choices=picked.top&&roleOf(picked.top)==='dress'?[null]:by.bottom;
   if(role==='top'&&!choices.length)return null;
   // Avoid optional-item searches for a missing required shoe.
   if(role==='shoe'&&!choices.length)return null;
   const forced=fixed.get(role);
   if(forced!==undefined)choices=choices.filter(x=>optionCode(x)===forced);
   for(const item of choices){
    if(!permits(selected,item))continue;
    picked[role]=item;
    if(item)selected.push(item);
    const found=dfs(index+1);
    if(item)selected.pop();
    if(found)return found;
   }
   return null;
  }
  const result=dfs(0);
  validityCache.set(constraintKey,result);
  return result;
 }
 function add(variant){
  if(!variant)return;
  const key=variant.garments.map(g=>g.item_code).sort().join('::');
  if(!seen.has(key)){seen.add(key);variants.push(variant);}
 }
 // Include the current combination first where possible. One representative
 // per valid garment choice suffices; cycle/lock searches the constraints again.
 const firstCompletion=findCompletion(null,null);
 if(!firstCompletion)return [];
 add(firstCompletion);
 for(const role of roles){
  for(const item of allOptions[role]){
   const code=optionCode(item);
   if(role==='bottom'&&code===NONE)continue;
   add(findCompletion(role,code));
  }
 }
 variants.sort((a,b)=>outfitOrderKey(a)-outfitOrderKey(b));
 return variants.length?[{id:'all-outfits',variants}]:[];
}
function build(){
 const locks=[...lockedRoles].sort().map(role=>[role,slotSelection[role]||'']).join('|');
 const key=conditionsKey()+'|'+locks;
 if(outfitPoolCache&&outfitPoolCache.key===key&&outfitPoolCache.items===state.items&&outfitPoolCache.pairs===state.pairs)return outfitPoolCache.groups;
 const groups=buildUncached();
 outfitPoolCache={key,items:state.items,pairs:state.pairs,groups};
 return groups;
}
// Per-page randomized garment ordering: stable until refresh, independent of weather score.
// Using garment identities rather than array indices avoids reordering during UI rerenders.
const outfitOrderSeed=Math.floor(Math.random()*0xffffffff)>>>0;
function outfitOrderKey(variant){
 const key=variant.garments.map(g=>String(g.item_code)).sort().join('::');
 let hash=(2166136261^outfitOrderSeed)>>>0;
 for(let i=0;i<key.length;i++){hash=Math.imul(hash^key.charCodeAt(i),16777619)>>>0;}
 return hash;
}
const SLOT_ORDER=['top','outer','bottom','shoe','bag','scarf','gloves','hat'];
let slotSelection={};
// An unlocked None is a browsable preview, not a validation override or an implicit lock.
let previewNoneRoles=new Set();
let lockedRoles=new Set(['top']);
let suppressAnchorClick=false;
let lastClusterKey='';
let lastConditionsKey=null;
function clearAllLocks(){lockedRoles.clear();slotSelection={};previewNoneRoles.clear();}
function conditionsKey(){return JSON.stringify({activities:ST.activities.map(a=>[a.type,a.start,a.end,walkingSteps(a)]),date:ST.date,location:ST.location,weather:ST.weather});}
function garmentFor(v,role){return v.garments.find(x=>roleOf(x)===role||(role==='top'&&group(x.category)==='dress'))||null}
function itemCode(v,role){return garmentFor(v,role)?.item_code||''}
function selectedCode(v,role){return itemCode(v,role)||(OPTIONAL_ROLES.has(role)?NONE:'')}
function matchingLocks(g,omit=null){return g.variants.filter(v=>[...lockedRoles].every(r=>r===omit||!slotSelection[r]||selectedCode(v,r)===slotSelection[r]))}
function optionsForSlot(g,role){return matchingLocks(g,role)}
function toggleLock(role){
 const g=build()[ST.cluster];if(!g)return;
 if(lockedRoles.has(role)){lockedRoles.delete(role);results();return}
 const code=slotSelection[role]||selectedCode(matchingLocks(g)[0]||g.variants[0],role);
 if(!code)return;
 if(code!==NONE&&!matchingLocks(g).some(v=>selectedCode(v,role)===code))return;
 slotSelection[role]=code;previewNoneRoles.delete(role);lockedRoles.add(role);results();
}
function randomAnchor(){
 const groups=build(),g=groups[ST.cluster];if(!g)return;
 const pool=new Map();
 for(const v of matchingLocks(g))for(const role of SLOT_ORDER){
  const code=itemCode(v,role);if(code&&!pool.has(code))pool.set(code,{role,code});
 }
 const choices=[...pool.values()];if(!choices.length)return;
 // 70% uniformly random; 30% weighted to garments with fewer recorded wears.
 let selected;
 if(Math.random()<.30){
  const weights=choices.map(v=>1/Math.sqrt(1+Math.max(0,Number(state.items.find(x=>x.item_code===v.code)?.wear_count)||0)));
  let draw=Math.random()*weights.reduce((a,b)=>a+b,0);
  selected=choices[choices.length-1];
  for(let i=0;i<choices.length;i++){draw-=weights[i];if(draw<=0){selected=choices[i];break}}
 }else selected=choices[Math.floor(Math.random()*choices.length)];
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
 if(!g){
  currentOutfitCodes=[];
  byid('st-outfit').innerHTML='<div class="empty-s">No matching outfits.<p style="margin-top:10px">'+E(emptyReason())+'</p></div>';
  return;
 }
 if(lastClusterKey!==g.id){
  lastClusterKey=g.id;
  // Preserve unlocked state after changing conditions or using Clear locks.
  slotSelection={};previewNoneRoles.clear();
 }
 // Initialize a default top lock, favoring a real top when available.
 if(lockedRoles.has('top')&&!slotSelection.top){
  const first=g.variants.find(v=>itemCode(v,'top'));
  if(first)slotSelection.top=itemCode(first,'top');else lockedRoles.delete('top');
 }
 // If a lock has become impossible (e.g. data changed), recover without trapping the user.
 let matching=matchingLocks(g);
 if(!matching.length){clearAllLocks();matching=g.variants;}
 let chosen=matching.find(v=>SLOT_ORDER.every(role=>!slotSelection[role]||lockedRoles.has(role)||previewNoneRoles.has(role)||selectedCode(v,role)===slotSelection[role]))||matching[0];
 // Keep temporary None selections visible without changing the validated outfit pool.
 for(const role of SLOT_ORDER)slotSelection[role]=previewNoneRoles.has(role)?NONE:selectedCode(chosen,role);
 const displayedGarments=chosen.garments.filter(x=>!previewNoneRoles.has(roleOf(x)));
 currentOutfitCodes=[...new Set(displayedGarments.map(x=>x.item_code).filter(Boolean))];
 const baseGarments=displayedGarments.filter(g=>!['outer','bag','hat','scarf','gloves'].includes(roleOf(g)));
 const coat=displayedGarments.find(g=>group(g.category)==='outer');
 const baseWarmth=baseGarments.reduce((sum,g)=>sum+warmth(g),0);
 const accessoryWarmth=displayedGarments.filter(g=>['scarf','gloves','hat'].includes(roleOf(g))).reduce((sum,g)=>sum+warmth(g),0);
 // Determine displayed comfort range using the same calibrated temperature rule
 // that validates the outfit, so the label and the recommendations agree.
 const comfortableTemperatures=[];
 for(let temp=-20;temp<=110;temp+=0.5)if(comfortError(temp,baseWarmth,accessoryWarmth,coat?warmth(coat):0)<=5)comfortableTemperatures.push(temp);
 const low=comfortableTemperatures.length?Math.round(comfortableTemperatures[0]):null;
 const high=comfortableTemperatures.length?Math.round(comfortableTemperatures[comfortableTemperatures.length-1]):null;
 byid('st-count').textContent=low===null?'Comfort range unavailable':'Comfort: '+low+'–'+high+'°F';
 byid('st-count').title='Estimated outdoor comfort range, using optional outerwear at colder temperatures (72°F target ±5°F).';
 const labels={top:'Top / dress',outer:'Jacket',bottom:'Pants / skirt',shoe:'Shoes',bag:'Bag',hat:'Hat',scarf:'Scarf',gloves:'Gloves'};
 const noOuterWarning=(explicitlyNone('outer')||previewNoneRoles.has('outer'))&&!ST.activities.every(a=>a.type==='Home')&&scheduleHours().some(h=>{const temp=ST.weather?.[h]?.temp;return Number.isFinite(temp)&&comfortError(temp,baseWarmth,accessoryWarmth,0)>5;});
 const slots=SLOT_ORDER.map(role=>{
  const possible=[...new Map(optionsForSlot(g,role).map(v=>{const item=garmentFor(v,role);return [item?.item_code||NONE,item]})).values()];
  if(OPTIONAL_ROLES.has(role)&&!possible.includes(null))possible.push(null);
  const current=previewNoneRoles.has(role)?null:garmentFor(chosen,role),code=current?.item_code||NONE;
  const index=possible.findIndex(x=>(x?.item_code||NONE)===code);
  const count=possible.length,canCycle=count>1;
  const isLocked=lockedRoles.has(role);
  return '<div class="stylist-slot'+(isLocked?' locked-slot':'')+'" data-swipe-role="'+role+'" aria-label="'+labels[role]+(isLocked?', locked':'')+'"><div class="slot-head">'+labels[role]+'</div>'+
   (current?'<button type="button" class="garment-s" data-st="open-item" data-item-code="'+E(current.item_code)+'" aria-label="View '+E(current.name)+' details" style="-webkit-touch-callout:none;touch-action:pan-y"><img draggable="false" style="-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;pointer-events:none" src="'+E(getimage(current))+'" alt="'+E(current.name)+'"><div class="name">'+E(current.name)+'</div></button>':'<div class="slot-empty">No '+(role==='bag'?'bag':role==='outer'?'jacket':labels[role].toLowerCase())+(role==='outer'&&noOuterWarning?'<div style="font-size:11px;line-height:1.35;color:#a65b21;margin-top:5px;font-weight:500">Temperature requirements not met</div>':'')+'</div>')+
   (!canCycle?'':'<div class="slot-controls"><button type="button" data-st="cycle-slot" data-role="'+role+'" data-step="-1" '+(!canCycle?'disabled':'')+' aria-label="Previous '+labels[role]+'">‹</button><small>'+(Math.max(0,index)+1)+' / '+count+'</small><button type="button" data-st="cycle-slot" data-role="'+role+'" data-step="1" '+(!canCycle?'disabled':'')+' aria-label="Next '+labels[role]+'">›</button></div>')+'</div>';
 }).join('');
 byid('st-outfit').innerHTML='<div class="stylist-slots">'+slots+'</div><p class="slot-foot">'+'Compatible garment choices · Hold an item to lock / unlock</p>'+'<div style="margin:16px 4px 5px"><button type="button" data-st="record-wear" class="primary" style="width:100%;padding:13px 16px">I’m wearing this</button><p class="small" id="st-wear-confirmation" role="status" style="margin:8px 0 0;text-align:center"></p></div>';
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
 const options=[...new Set(variants.map(v=>selectedCode(v,role)))];
 if(OPTIONAL_ROLES.has(role)&&!options.includes(NONE))options.push(NONE);
 if(options.length<2)return;
 const current=slotSelection[role]||selectedCode(variants[0],role);
 const index=Math.max(0,options.indexOf(current));
 const code=options[(index+step+options.length)%options.length];
 slotSelection[role]=code;
 // Browsing None never changes the lock state. Only long-press can lock an override.
 if(code===NONE){if(!lockedRoles.has(role))previewNoneRoles.add(role);else previewNoneRoles.delete(role);results();return;}
 previewNoneRoles.delete(role);
 // If a lock is switched, preserve all other locks; update unlocked slots to a valid outfit.
 const matches=matchingLocks(g,role).filter(v=>selectedCode(v,role)===code);
 if(!matches.length)return;
 const v=matches[0];
 for(const r of SLOT_ORDER)if(!lockedRoles.has(r))slotSelection[r]=selectedCode(v,r);
 results();
}

async function getWeather(){if(ST.lat==null||ST.lon==null)return;const key=`${ST.lat},${ST.lon},${ST.date}`;if(ST.weatherKey===key&&ST.weather)return;ST.weather=null;ST.weatherMessage='Loading forecast…';forecast();try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${ST.lat}&longitude=${ST.lon}&hourly=apparent_temperature,precipitation_probability,snowfall,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=16`;const res=await fetch(url);if(!res.ok)throw Error('Forecast service unavailable');const d=await res.json();const hours=Array.from({length:24},(_,h)=>{const idx=d.hourly.time.indexOf(`${ST.date}T${String(h).padStart(2,'0')}:00`);return idx<0?null:{temp:d.hourly.apparent_temperature[idx],rain:d.hourly.precipitation_probability[idx]??0,snow:d.hourly.snowfall[idx]??0,code:d.hourly.weather_code[idx]}});if(hours.every(x=>!x))throw Error('Forecast unavailable for this date (typically limited to the next 16 days)');ST.weather=hours;ST.weatherKey=key;ST.weatherMessage='';}catch(e){ST.weatherMessage=e.message;ST.weatherKey='';}forecast();results();}
async function searchLocation(){let name=byid('st-location')?.value.trim();if(!name)return;ST.weatherMessage='Looking up location…';forecast();try{let r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);let d=await r.json();if(!d.results?.length)throw Error('Location not found');let c=d.results[0];ST.lat=c.latitude;ST.lon=c.longitude;ST.location=[c.name,c.admin1,c.country].filter(Boolean).join(', ');byid('st-location').value=ST.location;await getWeather()}catch(e){ST.weatherMessage=e.message;forecast()}}
function detect(){if(!navigator.geolocation){ST.weatherMessage='Location permission unavailable';forecast();return}ST.weatherMessage='Detecting location…';forecast();navigator.geolocation.getCurrentPosition(async p=>{ST.lat=p.coords.latitude;ST.lon=p.coords.longitude;ST.location='Current location';if(byid('st-location'))byid('st-location').value=ST.location;try{let r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${ST.lat}&lon=${ST.lon}&format=json&zoom=10&addressdetails=1`);let j=await r.json();if(j.address){ST.location=[j.address.city||j.address.town||j.address.village||j.address.municipality||j.address.county,j.address.state].filter(Boolean).join(', ');if(byid('st-location'))byid('st-location').value=ST.location}}catch(e){}await getWeather()},()=>{ST.weatherMessage='Location access denied. Search for a city instead.';forecast()},{timeout:12000,maximumAge:600000})}
window.renderStylist=function(m){invalidateOutfitPool();if(!ST.dateManual)ST.date=defaultDate();setTitle("Stylist");m.innerHTML=body();schedule();forecast();results();if(!ST.geolocationTried){ST.geolocationTried=true;detect()}};
document.addEventListener('click',e=>{if(suppressAnchorClick){suppressAnchorClick=false;e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('click',e=>{if(state.page!=='stylist')return;const b=e.target.closest('[data-st]');if(!b)return;const act=b.dataset.st;if(act==='open-item'){openItemDetail(b.dataset.itemCode,'stylist','matches');return}if(act==='record-wear'){const list=currentOutfitCodes.map(code=>state.items.find(x=>x.item_code===code)).filter(Boolean);if(!list.length)return;for(const x of list)x.wear_count=Math.max(0,Number(x.wear_count)||0)+1;persist();const message=byid('st-wear-confirmation');if(message)message.textContent='Recorded +1 wear for '+list.length+' items.';return}if(act==='random-anchor'){randomAnchor();return}if(act==='clear-locks'){clearAllLocks();results();return} if(act==='cycle-slot'){cycleSlot(b.dataset.role,Number(b.dataset.step));return}if(act==='set-anchor'){toggleLock(b.dataset.role);return}if(act==='detect')detect();if(act==='search')searchLocation();if(act==='add'){ST.activities.push(defaultActivity('Daily'));schedule();results()}if(act==='remove'){if(ST.activities.length>1){ST.activities.splice(+b.dataset.index,1);schedule();results()}}if(act==='vibe'){ST.vibe=b.dataset.vibe;ST.cluster=0;ST.variant=0;schedule();results()}if(act==='family'){ST.cluster=+b.dataset.index;ST.variant=0;slotSelection={};lastClusterKey='';results()}if(act==='previous'||act==='next'){const g=build()[ST.cluster];if(g)ST.variant=(ST.variant+(act==='next'?1:-1)+g.variants.length)%g.variants.length;results()}});
document.addEventListener('change',e=>{if(state.page!=='stylist')return;const el=e.target;if(el.id==='st-date'){ST.date=el.value||defaultDate();ST.dateManual=true;const label=byid('st-date-label');if(label)label.textContent=dateLabel(ST.date);ST.weatherKey='';getWeather()}if(el.dataset.stWalkUnit!=null){
 const i=+el.dataset.stWalkUnit,a=ST.activities[i];if(!a)return;
 const steps=walkingSteps(a);a.walkingUnit=el.value;
 const input=el.closest('.walking-steps-s')?.querySelector('[data-st-walking]');
 if(input){input.value=walkingUnitsValue(steps,a.walkingUnit);input.step=a.walkingUnit==='miles'?'any':'1'}
 return;
}if(el.dataset.stWalking!=null){setWalkingInput(el);return}if(el.dataset.stActivity!=null){
 const i=+el.dataset.stActivity,k=el.dataset.key,a=ST.activities[i];
 if(!a)return;
 if(k==='type'){
  const defaults=defaultActivity(el.value);
  a.type=defaults.type;a.start=defaults.start;a.end=defaults.end;
 }else{
  a[k]=+el.value;
  if(a.end<=a.start){if(k==='start')a.start=a.end-1;else a.end=a.start+1}
 }
 schedule();results();
}});
document.addEventListener('input',e=>{if(state.page==='stylist'&&e.target.dataset.stWalking!=null){setWalkingInput(e.target);return}if(state.page==='stylist'&&e.target.id==='st-location'){clearTimeout(locationTimer);locationTimer=setTimeout(()=>{if(byid('st-location')?.value.trim().length>=3)searchLocation()},600)}});
document.addEventListener('keydown',e=>{if(state.page==='stylist'&&e.key==='Enter'&&e.target.id==='st-location'){e.preventDefault();clearTimeout(locationTimer);searchLocation()}});
})();
