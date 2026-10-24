/* Integrated stylist: uses Builder state.items / state.pairs, not demo approvals. */
(()=>{
let locationTimer;
const TYPES=['Work','Daily','Date','Business','Home','Party','Sport','Special'];
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

  </div><div><section class="panel-s"><div class="line-s"><h2>Outfit clusters</h2><span class="small" id="st-count"></span></div><div class="family-chips" id="st-families"></div><div id="st-outfit"></div></section></div></div></section>`;
}
function weatherTheme(w){if(!w)return 'neutral';if([95,96,99].includes(w.code))return 'storm';if(w.snow>0||[71,73,75,77,85,86].includes(w.code))return 'snow';if([51,53,55,61,63,65,80,81,82].includes(w.code)||w.rain>=70)return 'rain';if([0,1].includes(w.code))return 'sunny';if(w.code===2)return 'partly';return 'cloudy'}
function forecast(){const slot=byid('st-forecast');if(!slot)return;slot.innerHTML=ST.weather?[8,12,16,20].map(h=>{const w=ST.weather[h];return `<div class="weather-card-s weather-${weatherTheme(w)}"><span class="weather-art-s" aria-hidden="true"></span><small>${time(h)}</small><b>${w?Math.round(w.temp)+'°':'—'}</b>${w?`<small>${Math.round(w.rain)}% rain</small>`:''}</div>`}).join(''):'';const msg=byid('st-weather-msg');if(msg){msg.textContent=ST.weatherMessage;msg.style.display=ST.weather||!ST.weatherMessage?'none':'block';}}
function schedule(){const slot=byid('st-activities');if(!slot)return;slot.innerHTML=ST.activities.map((a,i)=>`<div class="activity-s"><select aria-label="Activity ${i+1}" data-st-activity="${i}" data-key="type">${options(a.type,TYPES)}</select><div class="time-slider-s"><div class="time-labels-s"><span>${time(a.start)}</span><span>${time(a.end)}</span></div><div class="range-pair-s" style="--range-start:${(a.start-6)/18*100}%;--range-end:${(a.end-6)/18*100}%"><input type="range" aria-label="Start time" min="6" max="23" step="1" value="${a.start}" data-st-activity="${i}" data-key="start"><input type="range" aria-label="End time" min="7" max="24" step="1" value="${a.end}" data-st-activity="${i}" data-key="end"></div></div><button class="tiny remove-s" data-st="remove" data-index="${i}" aria-label="Remove activity">×</button></div>`).join('');}
function group(name){const n=String(name||'').toLowerCase();if(n==='tops'||n==='top')return 'top';if(['pants','skirts','shorts','bottoms'].includes(n))return 'bottom';if(['shoes','footwear'].includes(n))return 'shoe';if(['outerwear','jackets','coats'].includes(n))return 'outer';if(n==='dresses')return 'dress';return null}
function warmth(g){return estimatedClo(g)*25} // °F contribution is a heuristic, not a physical conversion
function scheduleHours(){const out=new Set();for(const a of ST.activities)for(let h=a.start;h<a.end;h++)out.add(h);return [...out].sort((a,b)=>a-b)}
// Require approval only for relationships that the trainer offers for evaluation.
const ROLE=c=>c==='Tops'?'top':(['Pants','Skirts'].includes(c)?'bottom':c==='Shoes'?'shoe':c==='Outerwear'?'outer':null);
const TRAINABLE=new Set(['bottom|top','bottom|shoe','bottom|outer']);
function trainerEligible(a,b){const x=ROLE(a.category),y=ROLE(b.category);return !!(x&&y&&TRAINABLE.has([x,y].sort().join('|')))}
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
const by={top:[],bottom:[],shoe:[],outer:[],dress:[]};
for(const x of state.items){let role=group(x.category);if(role)by[role].push(x)}
const hours=scheduleHours(),temps=hours.map(h=>ST.weather?.[h]?.temp).filter(Number.isFinite);
const hottest=temps.length?Math.max(...temps):null,coldest=temps.length?Math.min(...temps):null;
const categoryRank=x=>x.category==='Dresses'?0:1;
let candidates=[];
const bases=[];
for(const top of by.top)for(const bottom of by.bottom)if(pair(top,bottom))bases.push([top,bottom]);
for(const dress of by.dress)bases.push([dress]);
for(const base of bases)for(const shoe of by.shoe){
 const required=[...base,shoe];
 if(!validBaseOutfit(required)||!compatibleSet(required))continue;
 // Every scheduled activity must be represented by at least one garment occasion.
 // Every required garment must carry every scheduled activity label.
 if(ST.activities.some(a=>required.some(g=>!hasOccasion(g,a.type))))continue;
 const baseTemp=required.reduce((t,g)=>t+warmth(g),0);
 // The complete base outfit must be comfortable at the warmest scheduled hour.
 // A removable outer layer can then be included for the coldest hour.
 if(hottest!==null&&Math.abs(hottest+baseTemp-72)>9)continue;
 const layers=[null,...by.outer.filter(o=>compatibleSet([...required,o]))];
 let variants=[];
 for(const layer of layers){
   const garments=layer?[...required,layer]:required;
   // Optional outerwear must satisfy the same activity restrictions.
   if(ST.activities.some(a=>garments.some(g=>!hasOccasion(g,a.type))))continue;
   const total=baseTemp+(layer?warmth(layer):0);
   // Reject a full outfit variant if its combined insulation misses the coldest hour.
   if(coldest!==null&&Math.abs(coldest+total-72)>9)continue;
   const warmError=hottest===null?0:Math.abs(hottest+baseTemp-72);
   const coldError=coldest===null?0:Math.abs(coldest+total-72);
   const score=Math.max(0,100-Math.round((warmError+coldError)*2));
   variants.push({garments,score,layer});
 }
 if(!variants.length)continue;
 variants.sort((a,b)=>b.score-a.score);
 candidates.push({base:required,variants,score:variants[0].score,id:required.map(x=>x.item_code).join('/'),rank:categoryRank(base[0])});
}
// A cluster is uniquely defined by its core top + bottom, or by one dress.
// Shoes and outerwear are independently eligible variations within that cluster.
// Greedy representative grouping: a new separates cluster requires BOTH a different
// top and a different bottom from every existing separates cluster representative.
// Dresses each define their own cluster. Candidates are already ranked by comfort.
const clusters=[];
for(const candidate of candidates){
 const core=candidate.base.filter(x=>group(x.category)!=='shoe');
 const top=core.find(x=>group(x.category)==='top');
 const bottom=core.find(x=>group(x.category)==='bottom');
 const dress=core.find(x=>group(x.category)==='dress');
 let cluster=dress?clusters.find(g=>g.base.some(x=>x.item_code===dress.item_code)):
  clusters.find(g=>{const gt=g.base.find(x=>group(x.category)==='top'),gb=g.base.find(x=>group(x.category)==='bottom');return gt&&gb&&(gt.item_code===top?.item_code||gb.item_code===bottom?.item_code)});
 if(!cluster){const key=core.map(x=>x.item_code).sort().join('::');cluster={base:core,variants:[],score:candidate.score,id:key,rank:candidate.rank};clusters.push(cluster)}
 cluster.variants.push(...candidate.variants);
}
for(const cluster of clusters){
 const unique=new Map();
 for(const variant of cluster.variants){
  const key=variant.garments.map(x=>x.item_code).sort().join('::');
  if(!unique.has(key)||unique.get(key).score<variant.score)unique.set(key,variant);
 }
 cluster.variants=[...unique.values()].sort((a,b)=>b.score-a.score);
 cluster.score=cluster.variants[0].score;
}
clusters.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
return clusters;
}
function results(){if(!byid('st-outfit'))return;const groups=build();byid('st-count').textContent=`${groups.length} clusters`;ST.cluster=Math.min(ST.cluster,Math.max(0,groups.length-1));let g=groups[ST.cluster];if(!g){byid('st-families').innerHTML='';byid('st-outfit').innerHTML=`<div class="empty-s">No outfits satisfy your schedule, approved pairings, and total outfit warmth. Each base outfit needs a top, pants or skirt, and shoes—or a dress and shoes.<br><span class="small">Try additional compatibility approvals, more clothing, or a different date or schedule.</span></div>`;return}
byid('st-families').innerHTML=groups.map((x,i)=>`<button class="${i===ST.cluster?'active':''}" data-st="family" data-index="${i}">Cluster ${i+1}</button>`).join('');ST.variant=Math.min(ST.variant,g.variants.length-1);const v=g.variants[ST.variant];byid('st-outfit').innerHTML=`<div class="outfit-grid">${v.garments.map(x=>`<button type="button" class="garment-s" data-st="open-item" data-item-code="${E(x.item_code)}" aria-label="View ${E(x.name)} details"><img src="${E(getimage(x))}" alt="${E(x.name)}"><div class="name">${E(x.name)}</div></button>`).join('')}</div><div class="navigator-s"><button class="tiny" data-st="previous">‹</button><span>Variation ${ST.variant+1} of ${g.variants.length} · Estimated fit ${v.score}</span><button class="tiny" data-st="next">›</button></div>`;
}
async function getWeather(){if(ST.lat==null||ST.lon==null)return;const key=`${ST.lat},${ST.lon},${ST.date}`;if(ST.weatherKey===key&&ST.weather)return;ST.weather=null;ST.weatherMessage='Loading forecast…';forecast();try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${ST.lat}&longitude=${ST.lon}&hourly=temperature_2m,precipitation_probability,snowfall,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=16`;const res=await fetch(url);if(!res.ok)throw Error('Forecast service unavailable');const d=await res.json();const hours=Array.from({length:24},(_,h)=>{const idx=d.hourly.time.indexOf(`${ST.date}T${String(h).padStart(2,'0')}:00`);return idx<0?null:{temp:d.hourly.temperature_2m[idx],rain:d.hourly.precipitation_probability[idx]??0,snow:d.hourly.snowfall[idx]??0,code:d.hourly.weather_code[idx]}});if(hours.every(x=>!x))throw Error('Forecast unavailable for this date (typically limited to the next 16 days)');ST.weather=hours;ST.weatherKey=key;ST.weatherMessage='';}catch(e){ST.weatherMessage=e.message;ST.weatherKey='';}forecast();results();}
async function searchLocation(){let name=byid('st-location')?.value.trim();if(!name)return;ST.weatherMessage='Looking up location…';forecast();try{let r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`);let d=await r.json();if(!d.results?.length)throw Error('Location not found');let c=d.results[0];ST.lat=c.latitude;ST.lon=c.longitude;ST.location=[c.name,c.admin1,c.country].filter(Boolean).join(', ');byid('st-location').value=ST.location;await getWeather()}catch(e){ST.weatherMessage=e.message;forecast()}}
function detect(){if(!navigator.geolocation){ST.weatherMessage='Location permission unavailable';forecast();return}ST.weatherMessage='Detecting location…';forecast();navigator.geolocation.getCurrentPosition(async p=>{ST.lat=p.coords.latitude;ST.lon=p.coords.longitude;ST.location='Current location';if(byid('st-location'))byid('st-location').value=ST.location;try{let r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${ST.lat}&lon=${ST.lon}&format=json&zoom=10&addressdetails=1`);let j=await r.json();if(j.address){ST.location=[j.address.city||j.address.town||j.address.village||j.address.municipality||j.address.county,j.address.state].filter(Boolean).join(', ');if(byid('st-location'))byid('st-location').value=ST.location}}catch(e){}await getWeather()},()=>{ST.weatherMessage='Location access denied. Search for a city instead.';forecast()},{timeout:12000,maximumAge:600000})}
window.renderStylist=function(m){if(!ST.dateManual)ST.date=defaultDate();setTitle("Stylist");m.innerHTML=body();schedule();forecast();results();if(!ST.geolocationTried){ST.geolocationTried=true;detect()}};
document.addEventListener('click',e=>{if(state.page!=='stylist')return;const b=e.target.closest('[data-st]');if(!b)return;const act=b.dataset.st;if(act==='open-item'){state.selected=b.dataset.itemCode;state.detailTab='matches';state.page='detail';render();return}if(act==='detect')detect();if(act==='search')searchLocation();if(act==='add'){const end=ST.activities.at(-1)?.end||17;ST.activities.push({type:'Daily',start:Math.max(6,Math.min(23,end)),end:Math.min(24,Math.max(7,end+1))});schedule();results()}if(act==='remove'){if(ST.activities.length>1){ST.activities.splice(+b.dataset.index,1);schedule();results()}}if(act==='vibe'){ST.vibe=b.dataset.vibe;ST.cluster=0;ST.variant=0;schedule();results()}if(act==='family'){ST.cluster=+b.dataset.index;ST.variant=0;results()}if(act==='previous'||act==='next'){const g=build()[ST.cluster];if(g)ST.variant=(ST.variant+(act==='next'?1:-1)+g.variants.length)%g.variants.length;results()}});
document.addEventListener('change',e=>{if(state.page!=='stylist')return;const el=e.target;if(el.id==='st-date'){ST.date=el.value||defaultDate();ST.dateManual=true;const label=byid('st-date-label');if(label)label.textContent=dateLabel(ST.date);ST.weatherKey='';getWeather()}if(el.dataset.stActivity!=null){const i=+el.dataset.stActivity;const k=el.dataset.key;ST.activities[i][k]=k==='type'?el.value:+el.value;if(ST.activities[i].end<=ST.activities[i].start){if(k==='start')ST.activities[i].start=ST.activities[i].end-1;else ST.activities[i].end=ST.activities[i].start+1}schedule();results()}});
document.addEventListener('input',e=>{if(state.page==='stylist'&&e.target.dataset.stActivity!=null&&e.target.type==='range'){const el=e.target,i=+el.dataset.stActivity,k=el.dataset.key;ST.activities[i][k]=+el.value;if(k==='start')ST.activities[i].start=Math.min(ST.activities[i].start,ST.activities[i].end-1);else ST.activities[i].end=Math.max(ST.activities[i].end,ST.activities[i].start+1);const row=el.closest('.activity-s');row.querySelector('.time-labels-s').innerHTML='<span>'+time(ST.activities[i].start)+'</span><span>'+time(ST.activities[i].end)+'</span>';row.querySelector('.range-pair-s').style.setProperty('--range-start',(ST.activities[i].start-6)/18*100+'%');row.querySelector('.range-pair-s').style.setProperty('--range-end',(ST.activities[i].end-6)/18*100+'%');results();return}if(state.page==='stylist'&&e.target.id==='st-location'){clearTimeout(locationTimer);locationTimer=setTimeout(()=>{if(byid('st-location')?.value.trim().length>=3)searchLocation()},600)}});
document.addEventListener('keydown',e=>{if(state.page==='stylist'&&e.key==='Enter'&&e.target.id==='st-location'){e.preventDefault();clearTimeout(locationTimer);searchLocation()}});
})();
