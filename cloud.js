/* Supabase cloud adapter. Client only uses publishable/anon key, never service role. */
(() => {
const CFGKEY='wardrobe-cloud-config-v1'; const cloud={client:null,user:null,busy:false,connected:false,ready:false,saving:false,queued:false,baselinePairs:{},dirty:false};
const allowed=['item_code','name','category','subcategory','brand','colors','materials','pattern','occasions','seasons','style_tags','image_path','insulation_clo_estimate'];
const config=()=>{try{return JSON.parse(localStorage.getItem(CFGKEY))||{}}catch{return {}}};
const message=(m)=>{let el=document.getElementById('cloudmsg');if(el)el.textContent=m;console.info('[Wardrobe sync]',m)};
function getClient(){let c=config();if(!c.url||!c.key)throw Error('Enter the Supabase project URL and publishable/anon key first.');if(!window.supabase?.createClient)throw Error('Supabase library unavailable. Serve this app over HTTP(S), with internet access.');return cloud.client ||= window.supabase.createClient(c.url,c.key);}
async function login(){let email=document.getElementById('cloudemail')?.value?.trim();let password=document.getElementById('cloudpassword')?.value;if(!email||!password)throw Error('Enter email and password.');let sb=getClient();let {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;cloud.user=data.user;cloud.connected=true;if(localStorage.getItem('wardrobe-sync-pending')!=='1'){await loadAll();}else message('Signed in. You have pending local changes; review or back them up before loading cloud data.');}
async function signup(){let email=document.getElementById('cloudemail')?.value?.trim();let password=document.getElementById('cloudpassword')?.value;if(!email||!password)throw Error('Enter email and password.');let {data,error}=await getClient().auth.signUp({email,password});if(error)throw error;cloud.user=data.user||null;message(data.session?'Account created and signed in.':'Account created. If email confirmation is enabled, confirm the email, then sign in.');}
function safeGarment(x){let o={};for(let k of allowed)if(x[k]!==undefined)o[k]=x[k];if(o.insulation_clo_estimate==null||o.insulation_clo_estimate==='')delete o.insulation_clo_estimate; // Never overwrite cloud-calculated insulation with an old blank local value.
if(x._storage_path)o.image_path=x._storage_path;for(let k of ['image_path'])if(o[k]?.startsWith('images/'))delete o[k];return o}
async function uploadImages(sb,uid){let count=0;for(let x of state.items){if(!x.image_path?.startsWith('images/'))continue;let path=`${uid}/${x.item_code.toLowerCase()}.webp`;let blob=await fetch(x.image_path).then(r=>{if(!r.ok)throw Error('Cannot read '+x.image_path);return r.blob()});let {error}=await sb.storage.from('garment-images').upload(path,blob,{upsert:true,contentType:blob.type||'image/webp'});if(error)throw Error('Image upload for '+x.item_code+': '+error.message);x.image_path=path;count++}return count}
async function uploadAll(){if(!confirm('Upload the local wardrobe and pair decisions to this Supabase account? Existing matching item codes and pairs will be updated.'))return;let sb=getClient(),user=(await sb.auth.getUser()).data.user;if(!user)throw Error('Sign in first.');cloud.user=user;message('Uploading images and garments…');let n=await uploadImages(sb,user.id);let rows=state.items.map(x=>({...safeGarment(x),owner_id:user.id}));let {error}=await sb.from('garments').upsert(rows,{onConflict:'owner_id,item_code'});if(error)throw error;let {data:items,error:readerr}=await sb.from('garments').select('id,item_code').eq('owner_id',user.id);if(readerr)throw readerr;let ids=Object.fromEntries(items.map(x=>[x.item_code,x.id]));let pairs=Object.entries(state.pairs).map(([key,v])=>{let [a,b]=key.split('::').map(k=>ids[k]);if(!a||!b)return null;let [garment_a_id,garment_b_id]=[a,b].sort();return {owner_id:user.id,garment_a_id,garment_b_id,decision:v}}).filter(Boolean);if(pairs.length){let {error}=await sb.from('compatibility').upsert(pairs,{onConflict:'owner_id,garment_a_id,garment_b_id'});if(error)throw error}cloud.connected=true;cloud.ready=true;cloud.baselinePairs={...state.pairs};localStorage.setItem('wardrobe-sync-user',user.id);localStorage.removeItem('wardrobe-sync-pending');message(`Saved ${rows.length} garments, ${pairs.length} pair decisions, and ${n} images in Supabase. Auto-sync enabled.`);}
async function loadAll(){let sb=getClient(),user=(await sb.auth.getUser()).data.user;if(!user)throw Error('Sign in first.');cloud.user=user;let {data:items,error}=await sb.from('garments').select('*').eq('owner_id',user.id).order('item_code');if(error)throw error;let {data:relationships,error:err}=await sb.from('compatibility').select('garment_a_id,garment_b_id,decision').eq('owner_id',user.id);if(err)throw err;if(!items.length){message('No cloud garments yet. Use “Upload this wardrobe” to import the 10 starter items.');return}let byId=Object.fromEntries(items.map(x=>[x.id,x.item_code]));let pairs={};for(let p of relationships){let a=byId[p.garment_a_id],b=byId[p.garment_b_id];if(a&&b)pairs[pairKey(a,b)]=p.decision}
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
state.items=items;state.pairs=pairs;state.category='All';state.subcategory='All';cloud.connected=true;cloud.ready=true;cloud.baselinePairs={...pairs};localStorage.setItem('wardrobe-sync-user',user.id);localStorage.removeItem('wardrobe-sync-pending');localStorage.setItem(KEY,JSON.stringify({items:state.items,pairs:state.pairs}));nav('wardrobe');message(`Loaded ${items.length} garments and ${Object.keys(pairs).length} decisions from Supabase. Auto-sync enabled.`)}

// Auto-sync only after a deliberate cloud load/upload. This prevents stale browser data
// from silently overwriting the cloud on sign-in.
let timer;
window.addEventListener('wardrobe:changed',()=>{
  if(!cloud.ready || !cloud.user)return;
  cloud.dirty=true;localStorage.setItem('wardrobe-sync-pending','1');clearTimeout(timer);
  timer=setTimeout(()=>{cloud.queued=true;void drain();},300);
});
async function drain(){
  if(cloud.saving || !cloud.queued || !cloud.ready)return;
  cloud.saving=true;cloud.queued=false;
  try{
    let sb=getClient(), user=(await sb.auth.getUser()).data.user;
    if(!user || user.id!==cloud.user.id)throw Error('Session expired. Sign in again.');
    message('Saving changes…');
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
    const {data:existing,error:exerr}=await sb.from('compatibility').select('id,garment_a_id,garment_b_id').eq('owner_id',user.id);
    if(exerr)throw exerr;
    const removed=Object.keys(cloud.baselinePairs).filter(k=>!(k in snapshot.pairs));
    const removedIds=new Set(removed.map(k=>k.split('::').map(code=>ids[code]).sort().join('::')));
    const obsolete=existing.filter(p=>removedIds.has(p.garment_a_id+'::'+p.garment_b_id)).map(p=>p.id);
    if(obsolete.length){const {error}=await sb.from('compatibility').delete().eq('owner_id',user.id).in('id',obsolete);if(error)throw error;}
    cloud.baselinePairs={...snapshot.pairs};
    if(JSON.stringify(state.pairs)===JSON.stringify(snapshot.pairs) && JSON.stringify(state.items.map(safeGarment))===JSON.stringify(snapshot.items)){cloud.dirty=false;localStorage.removeItem('wardrobe-sync-pending');}
    else cloud.queued=true;
    message('All changes saved to Supabase.');
  }catch(e){console.error(e);message('Sync failed — local changes retained. Retry by making another change or loading this page while signed in. '+e.message);cloud.queued=true;}
  finally{cloud.saving=false;if(cloud.queued){clearTimeout(timer);timer=setTimeout(()=>void drain(),5000);}}
}

const original=renderSettings;
renderSettings=function(m){original(m);let c=config();m.insertAdjacentHTML('beforeend',`<section class="page" style="border-top:1px solid #ddd"><h2>Supabase connection</h2><p class="hint">Use the project URL and publishable/anon key (never a service-role or secret key). Sign in before syncing. After loading cloud data, edits and pair decisions sync automatically.</p><div class="field"><label>Project URL</label><input id="cloudurl" placeholder="https://example.supabase.co" value="${esc(c.url||'')}"></div><div class="field"><label>Publishable / anon key</label><input id="cloudkey" placeholder="sb_publishable_… or legacy anon key" value="${esc(c.key||'')}"></div><button class="secondary" id="cloudsave">Save connection settings</button><div class="field"><label>Email</label><input id="cloudemail" type="email" autocomplete="email"></div><div class="field"><label>Password (minimum 6 characters)</label><input id="cloudpassword" type="password" autocomplete="current-password"></div><div class="toolbar"><button class="secondary" id="cloudsignup">Create account</button><button class="primary" id="cloudlogin">Sign in</button><button class="secondary" id="cloudlogout">Sign out</button></div><div class="toolbar"><button class="primary" id="cloudupload">Upload this wardrobe</button><button class="secondary" id="cloudload">Load cloud data</button></div><p id="cloudmsg" class="hint">${cloud.user?'Signed in: '+esc(cloud.user.email):'Not signed in on this page.'}</p><p class="note">Caution: “Load cloud data” replaces current browser items and decisions; export a JSON backup first. Garment images remain publicly accessible to anyone with their image URL.</p></section>`)};
document.addEventListener('click',async e=>{const id=e.target.closest('button')?.id;if(!id?.startsWith('cloud'))return;try{if(id==='cloudsave'){let url=document.getElementById('cloudurl').value.trim().replace(/\/$/,'');let key=document.getElementById('cloudkey').value.trim();if(!/^https:\/\/.+\.supabase\.co$/.test(url)||!key)throw Error('Enter a valid Supabase project URL and key.');localStorage.setItem(CFGKEY,JSON.stringify({url,key}));cloud.client=null;message('Connection settings saved.');}else if(id==='cloudlogin')await login();else if(id==='cloudsignup')await signup();else if(id==='cloudlogout'){await getClient().auth.signOut();cloud.user=null;cloud.ready=false;localStorage.removeItem('wardrobe-sync-user');message('Signed out.');}else if(id==='cloudupload')await uploadAll();else if(id==='cloudload'){if(confirm('Replace local wardrobe with Supabase records? Export backup first.'))await loadAll()}}catch(err){message('Error: '+err.message)}});
// Track existing session when visiting settings.
(async()=>{try{let c=config();if(c.url&&c.key){let {data}=await getClient().auth.getUser();cloud.user=data.user||null;
if(cloud.user&&localStorage.getItem('wardrobe-sync-user')===cloud.user.id){
  if(localStorage.getItem('wardrobe-sync-pending')==='1'){
    cloud.ready=true;cloud.queued=true;cloud.baselinePairs={...state.pairs};void drain();
  }else await loadAll();
}}catch(err){console.warn('Startup cloud sync:',err)}})();
})();
