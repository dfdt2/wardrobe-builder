/* Supabase cloud adapter. Client only uses publishable/anon key, never service role. */
(() => {
const CFGKEY='wardrobe-cloud-config-v1'; const cloud={client:null,user:null,busy:false,connected:false,ready:false,saving:false,queued:false,baselinePairs:{},dirty:false};
const allowed=['item_code','name','category','subcategory','brand','colors','materials','pattern','occasions','seasons','style_tags','image_path','insulation_clo_estimate','wear_count'];
const config=()=>{try{return JSON.parse(localStorage.getItem(CFGKEY))||{}}catch{return {}}};
const message=(m)=>{let el=document.getElementById('cloudmsg');if(el)el.textContent=m;console.info('[Wardrobe sync]',m)};
function getClient(){let c=config();if(!c.url||!c.key)throw Error('Enter the Supabase project URL and publishable/anon key first.');if(!window.supabase?.createClient)throw Error('Supabase library unavailable. Serve this app over HTTP(S), with internet access.');return cloud.client ||= window.supabase.createClient(c.url,c.key);}
async function login(){let email=document.getElementById('cloudemail')?.value?.trim();let password=document.getElementById('cloudpassword')?.value;if(!email||!password)throw Error('Enter email and password.');let sb=getClient();let {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;cloud.user=data.user;cloud.connected=true;if(localStorage.getItem('wardrobe-sync-pending')!=='1'){await loadAll();}else message('Signed in. You have pending local changes; review or back them up before loading cloud data.');}
async function signup(){let email=document.getElementById('cloudemail')?.value?.trim();let password=document.getElementById('cloudpassword')?.value;if(!email||!password)throw Error('Enter email and password.');let {data,error}=await getClient().auth.signUp({email,password});if(error)throw error;cloud.user=data.user||null;message(data.session?'Account created and signed in.':'Account created. If email confirmation is enabled, confirm the email, then sign in.');}
function safeGarment(x){normalizeOccasions([x]);let o={};for(let k of allowed)if(x[k]!==undefined)o[k]=x[k];if(o.insulation_clo_estimate==null||o.insulation_clo_estimate==='')delete o.insulation_clo_estimate; // Never overwrite cloud-calculated insulation with an old blank local value.
if(x._storage_path)o.image_path=x._storage_path;for(let k of ['image_path'])if(o[k]?.startsWith('images/'))delete o[k];return o}
async function uploadImages(sb,uid){let count=0;for(let x of state.items){if(!x.image_path?.startsWith('images/'))continue;let path=`${uid}/${x.item_code.toLowerCase()}.webp`;let blob=await fetch(x.image_path).then(r=>{if(!r.ok)throw Error('Cannot read '+x.image_path);return r.blob()});let {error}=await sb.storage.from('garment-images').upload(path,blob,{upsert:true,contentType:blob.type||'image/webp'});if(error)throw Error('Image upload for '+x.item_code+': '+error.message);x.image_path=path;count++}return count}
async function uploadAll(){if(!confirm('Upload the local wardrobe and pair decisions to this Supabase account? Existing matching item codes and pairs will be updated.'))return;let sb=getClient(),user=(await sb.auth.getUser()).data.user;if(!user)throw Error('Sign in first.');cloud.user=user;message('Uploading images and garments…');let n=await uploadImages(sb,user.id);let rows=state.items.map(x=>({...safeGarment(x),owner_id:user.id}));let {error}=await sb.from('garments').upsert(rows,{onConflict:'owner_id,item_code'});if(error)throw error;let {data:items,error:readerr}=await sb.from('garments').select('id,item_code').eq('owner_id',user.id);if(readerr)throw readerr;let ids=Object.fromEntries(items.map(x=>[x.item_code,x.id]));let pairs=Object.entries(state.pairs).map(([key,v])=>{let [a,b]=key.split('::').map(k=>ids[k]);if(!a||!b)return null;let [garment_a_id,garment_b_id]=[a,b].sort();return {owner_id:user.id,garment_a_id,garment_b_id,decision:v}}).filter(Boolean);if(pairs.length){let {error}=await sb.from('compatibility').upsert(pairs,{onConflict:'owner_id,garment_a_id,garment_b_id'});if(error)throw error}cloud.connected=true;cloud.ready=true;cloud.baselinePairs={...state.pairs};localStorage.setItem('wardrobe-sync-user',user.id);localStorage.removeItem('wardrobe-sync-pending');reportCloudCount(pairs.length,'saved');message(`Saved ${rows.length} garments, ${pairs.length} pair decisions, and ${n} images in Supabase. Auto-sync enabled.`);}
async function fetchAllRows(sb,table,columns,uid){let out=[];for(let from=0;;from+=500){const {data,error}=await sb.from(table).select(columns).eq('owner_id',uid).range(from,from+499);if(error)throw error;out.push(...(data||[]));if(!data||data.length<500)break;}return out;}
function reportCloudCount(count,status){window.wardrobeCloudCount=count;window.wardrobeSyncStatus=status;window.dispatchEvent(new Event('wardrobe:sync-status'));}
async function loadAll(){let sb=getClient(),user=(await sb.auth.getUser()).data.user;if(!user)throw Error('Sign in first.');cloud.user=user;let items=await fetchAllRows(sb,'garments','*',user.id);items.sort((a,b)=>String(a.item_code).localeCompare(String(b.item_code)));let relationships=await fetchAllRows(sb,'compatibility','garment_a_id,garment_b_id,decision',user.id);if(!items.length){message('No cloud garments yet. Use “Upload this wardrobe” to import the 10 starter items.');return}let byId=Object.fromEntries(items.map(x=>[x.id,x.item_code]));let pairs={};for(let p of relationships){let a=byId[p.garment_a_id],b=byId[p.garment_b_id];if(a&&b)pairs[pairKey(a,b)]=p.decision}
for (let x of items) {
  if (!x.image_path) continue;

  const path = x.image_path;

  if (path.startsWith('http') || path.startsWith('data:')) {
    continue;
  }

  if (path.startsWith('images/')) {
    continue;
  }

  const { data } = sb.storage.from('garment-images').getPublicUrl(path);
  x._storage_path = path;
  x.image_path = data.publicUrl;
}
normalizeOccasions(items);state.items=items;state.pairs=pairs;state.category='All';state.subcategory='All';cloud.connected=true;cloud.ready=true;cloud.baselinePairs={...pairs};localStorage.setItem('wardrobe-sync-user',user.id);localStorage.removeItem('wardrobe-sync-pending');localStorage.setItem(KEY,JSON.stringify({items:state.items,pairs:state.pairs}));reportCloudCount(relationships.length,'saved');nav('wardrobe');message(`Loaded ${items.length} garments and ${Object.keys(pairs).length} decisions from Supabase. Auto-sync enabled.`)}

// Auto-sync only after a deliberate cloud load/upload. This prevents stale browser data
// from silently overwriting the cloud on sign-in.
let timer;
window.addEventListener('wardrobe:changed',()=>{
  if(!cloud.ready || !cloud.user)return;
  cloud.dirty=true;localStorage.setItem('wardrobe-sync-pending','1');reportCloudCount(window.wardrobeCloudCount??null,'pending');clearTimeout(timer);
  timer=setTimeout(()=>{cloud.queued=true;void drain();},300);
});
async function drain(){
  if(cloud.saving || !cloud.queued || !cloud.ready)return;
  cloud.saving=true;cloud.queued=false;
  try{
    let sb=getClient(), user=(await sb.auth.getUser()).data.user;
    if(!user || user.id!==cloud.user.id)throw Error('Session expired. Sign in again.');
    reportCloudCount(window.wardrobeCloudCount??null,'saving');message('Saving changes…');
    await uploadImages(sb,user.id);
    const snapshot=JSON.parse(JSON.stringify({items:state.items.map(safeGarment),pairs:state.pairs}));
    const rows=snapshot.items.map(x=>({...x,owner_id:user.id}));
    if(rows.length){const {error}=await sb.from('garments').upsert(rows,{onConflict:'owner_id,item_code'});if(error)throw error;}
    const {data:items,error:readerr}=await sb.from('garments').select('id,item_code').eq('owner_id',user.id);
    if(readerr)throw readerr;
    const ids=Object.fromEntries(items.map(x=>[x.item_code,x.id]));
    const pairs=Object.entries(snapshot.pairs).map(([key,v])=>{
      const [a,b]=key.split('::').map(k=>ids[k]);
      if(!a||!b)return null;
      const [garment_a_id,garment_b_id]=[a,b].sort();
      return {owner_id:user.id,garment_a_id,garment_b_id,decision:v};
    }).filter(Boolean);
    if(pairs.length){const {error}=await sb.from('compatibility').upsert(pairs,{onConflict:'owner_id,garment_a_id,garment_b_id'});if(error)throw error;}
    // Respect removal of a previous decision without deleting unrelated wardrobe data.
    const current=new Set(pairs.map(p=>p.garment_a_id+'::'+p.garment_b_id));
    const existing=await fetchAllRows(sb,'compatibility','id,garment_a_id,garment_b_id',user.id);
    const removed=Object.keys(cloud.baselinePairs).filter(k=>!(k in snapshot.pairs));
    const removedIds=new Set(removed.map(k=>k.split('::').map(code=>ids[code]).sort().join('::')));
    const obsolete=existing.filter(p=>removedIds.has(p.garment_a_id+'::'+p.garment_b_id)).map(p=>p.id);
    if(obsolete.length){const {error}=await sb.from('compatibility').delete().eq('owner_id',user.id).in('id',obsolete);if(error)throw error;}
    cloud.baselinePairs={...snapshot.pairs};
    if(JSON.stringify(state.pairs)===JSON.stringify(snapshot.pairs) && JSON.stringify(state.items.map(safeGarment))===JSON.stringify(snapshot.items)){cloud.dirty=false;localStorage.removeItem('wardrobe-sync-pending');}
    else cloud.queued=true;
    reportCloudCount(existing.length-obsolete.length+Math.max(0,pairs.length-existing.filter(p=>current.has(p.garment_a_id+'::'+p.garment_b_id)).length),'saved');message('All changes saved to Supabase.');
  }catch(e){console.error(e);reportCloudCount(window.wardrobeCloudCount??null,'failed');message('Sync failed — local changes retained. Retry by making another change or loading this page while signed in. '+e.message);cloud.queued=true;}
  finally{cloud.saving=false;if(cloud.queued){clearTimeout(timer);timer=setTimeout(()=>void drain(),5000);}}
}

// Clean-out rotation uses a dedicated owner-protected Supabase record.
window.loadCleanoutCloud=async function(){
 const sb=getClient(),{data:{user},error:authError}=await sb.auth.getUser();
 if(authError)throw authError;
 if(!user)return null;
 const {data,error}=await sb.from('closet_cleanout').select('rotation').eq('owner_id',user.id).maybeSingle();
 if(error)throw error;
 return data?.rotation||null;
};
window.saveCleanoutCloud=async function(rotation){
 const sb=getClient(),{data:{user},error:authError}=await sb.auth.getUser();
 if(authError)throw authError;
 if(!user)throw Error('Sign in to synchronize closet cleanout.');
 const {error}=await sb.from('closet_cleanout').upsert({owner_id:user.id,rotation,updated_at:new Date().toISOString()},{onConflict:'owner_id'});
 if(error)throw error;
};
const original=renderSettings;
renderSettings=function(m){
 original(m);
 const c=config();
 // The cloud database is the intended source of truth. Keep maintenance tools out of the main UI.
 m.innerHTML=`<section class="page" style="max-width:650px;margin:auto">
 <h2>Wardrobe sync</h2>
 <p class="hint">Supabase is your primary wardrobe. Update this device with the latest cloud garments and compatibility decisions.</p>
 <button class="primary" type="button" id="cloudload" style="width:100%;padding:15px;font-size:16px">Update wardrobe</button>
 <p class="note" style="margin:10px 0 18px">Downloads the current Supabase wardrobe to this device. Unsynced local edits could be replaced.</p>
 <p id="cloudmsg" class="hint">${cloud.user?'Signed in: '+esc(cloud.user.email):'Not signed in on this device. Open Connection settings below.'}</p>
 <details style="margin-top:22px;border-top:1px solid #e8e8e8;padding-top:17px">
  <summary style="cursor:pointer;font-weight:600">Connection settings</summary>
  <p class="hint" style="margin-top:12px">Only change these if connecting a different account or restoring your connection.</p>
  <div class="field"><label>Supabase project URL</label><input id="cloudurl" placeholder="https://example.supabase.co" value="${esc(c.url||'')}"></div>
  <div class="field"><label>Publishable / anon key</label><input id="cloudkey" placeholder="sb_publishable_… or legacy anon key" value="${esc(c.key||'')}"></div>
  <button class="secondary" id="cloudsave">Save connection settings</button>
  <div class="field"><label>Email</label><input id="cloudemail" type="email" autocomplete="email"></div>
  <div class="field"><label>Password</label><input id="cloudpassword" type="password" autocomplete="current-password"></div>
  <div class="toolbar"><button class="primary" id="cloudlogin">Sign in</button><button class="secondary" id="cloudlogout">Sign out</button><button class="secondary" id="cloudsignup">Create account</button></div>
  <details style="margin:20px 0;border-top:1px solid #eee;padding-top:14px">
   <summary style="cursor:pointer;font-size:13px;color:#666">Advanced: upload local wardrobe to Supabase</summary>
   <p class="hint">Only use this when intentionally transferring locally stored items to the cloud. It may overwrite existing cloud records. Normally use Update wardrobe instead.</p>
   <button class="secondary" id="cloudupload">Upload this wardrobe to Supabase</button>
  </details>
 </details>
 </section>`;
};
document.addEventListener('click',async e=>{const id=e.target.closest('button')?.id;if(!id?.startsWith('cloud'))return;try{if(id==='cloudsave'){let url=document.getElementById('cloudurl').value.trim().replace(/\/$/,'');let key=document.getElementById('cloudkey').value.trim();if(!/^https:\/\/.+\.supabase\.co$/.test(url)||!key)throw Error('Enter a valid Supabase project URL and key.');localStorage.setItem(CFGKEY,JSON.stringify({url,key}));cloud.client=null;message('Connection settings saved.');}else if(id==='cloudlogin')await login();else if(id==='cloudsignup')await signup();else if(id==='cloudlogout'){await getClient().auth.signOut();cloud.user=null;cloud.ready=false;localStorage.removeItem('wardrobe-sync-user');message('Signed out.');}else if(id==='cloudupload')await uploadAll();else if(id==='cloudload'){if(localStorage.getItem('wardrobe-sync-pending')==='1'||cloud.dirty||cloud.saving||cloud.queued){message('Unsynced local changes detected. Sync must finish before updating from Supabase; this prevents overwriting local edits.');return}if(confirm('Update this device from Supabase? This replaces the local wardrobe with the current cloud records.'))await loadAll()}}catch(err){message('Error: '+err.message)}});
// Track existing session when visiting settings.
(async()=>{try{let c=config();if(c.url&&c.key){let {data}=await getClient().auth.getUser();cloud.user=data.user||null;
if(cloud.user&&localStorage.getItem('wardrobe-sync-user')===cloud.user.id){
  if(localStorage.getItem('wardrobe-sync-pending')==='1'){
    cloud.ready=true;cloud.queued=true;cloud.baselinePairs={...state.pairs};void drain();
  }else await loadAll();
}}}catch(err){console.warn('Startup cloud sync:',err)}})();
})();
