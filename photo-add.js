/* Photo editor for Add Garment. Browser-side processing; no API keys. */
(() => {
  let current = null, generation = 0;
  let editorContext={mode:'add',itemCode:null};
  const $ = (id) => document.getElementById(id);
  const load = (url) => new Promise((resolve,reject) => {
    const existing=document.querySelector('script[data-photo-lib="'+url+'"]');
    if(existing){if(existing.dataset.ready==='yes')resolve();else existing.addEventListener('load',resolve,{once:true});return}
    const s=document.createElement('script');s.src=url;s.dataset.photoLib=url;
    s.onload=()=>{s.dataset.ready='yes';resolve()};s.onerror=()=>reject(Error('Model library unavailable'));document.head.append(s);
  });
  const imageFromFile = file => new Promise((resolve,reject)=>{
    const u=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(u);reject(Error('Cannot read this image'))};img.src=u;
  });
  const draw = (img,limit=1400)=>{
    const scale=Math.min(1,limit/Math.max(img.width,img.height));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
    c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,c.width,c.height);return c;
  };
  const canvasCopy = src => {const c=document.createElement('canvas');c.width=src.width;c.height=src.height;c.getContext('2d').drawImage(src,0,0);return c};
  const editorIcons={
    back:'<path d="m15 3-9 9 9 9"/>',check:'<path d="m3 12 6 6L21 5"/>',
    adjust:'<circle cx="9" cy="15" r="6"/><circle cx="15" cy="9" r="6"/><path d="m7 17 10-10"/>',
    crop:'<path d="M5 2v17h17M2 5h17v17M15 2l4 3-4 3M9 22l-4-3 4-3"/>',
    erase:'<path d="m3 15 10-11 8 8-10 10H9zM8 10l9 9M10 22h12"/>',
    restore:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="5" stroke-dasharray="2 3"/>',
    brightness:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    contrast:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    temperature:'<path d="M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/><path d="M12 8v10"/>',
    saturation:'<path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z"/>',
    tint:'<path d="M2 17a10 10 0 0 1 20 0M5 17a7 7 0 0 1 14 0m-11 0a4 4 0 0 1 8 0"/>',
    undo:'<path d="m9 5-7 6 7 6M2 11h11a8 8 0 0 1 8 8"/>',
    rotate:'<path d="M3 11a9 9 0 1 1 3 8M3 4v7h7"/><path d="m9 9 6-2 2 6-6 2Z"/>'
  };
  const editorIcon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+editorIcons[name]+'</svg>';
  const adjustmentNames=[['brightness','Brightness'],['contrast','Contrast'],['temperature','Temp'],['saturation','Sat'],['tint','Tint']];
  const editorHTML = () => `<div id="photo-edit-overlay" role="dialog" aria-modal="true" aria-label="Edit garment photo" data-mode="adjust">
    <div class="photo-edit-head"><button type="button" id="photo-edit-cancel" aria-label="Back">${editorIcon('back')}</button><button type="button" id="photo-edit-done" aria-label="Continue to details">${editorIcon('check')}</button></div>
    <div class="photo-workspace"><div class="photo-edit-preview"><div class="photo-edit-stage" id="photo-edit-stage"><canvas id="photo-edit-canvas"></canvas><div id="photo-crop-box" hidden><i data-crop-handle="nw"></i><i data-crop-handle="ne"></i><i data-crop-handle="sw"></i><i data-crop-handle="se"></i></div></div></div>
    <div class="photo-floating-actions"><button type="button" id="photo-reset">Original</button><button type="button" id="photo-remove-background" hidden>Remove background</button><button type="button" id="photo-undo" aria-label="Undo">${editorIcon('undo')}</button></div><p id="photo-edit-status" role="status" aria-live="polite"></p></div>
    <div id="photo-adjust-panel"><div class="photo-adjust-choices">${adjustmentNames.map(([id,name])=>`<button type="button" data-photo-adjust="${id}" aria-expanded="false"><span>${editorIcon(id)}</span>${name}</button>`).join('')}</div><div class="photo-adjust-sliders">${adjustmentNames.map(([id,name])=>`<label data-adjust-slider="${id}" hidden><span>${name} <output>0</output></span><input aria-label="${name}" type="range" id="photo-${id}" min="-100" max="100" value="0"></label>`).join('')}</div></div>
    <div id="photo-brush-panel" hidden><div class="photo-brush-modes" hidden><button type="button" id="photo-brush-erase" class="active" aria-pressed="true">Erase</button><button type="button" id="photo-brush-restore" aria-pressed="false">Restore</button></div><label><span>Brush <output id="photo-brush-value">28</output></span><input type="range" id="photo-brush" min="4" max="100" value="28"></label></div>
    <div id="photo-crop-controls" hidden><button type="button" id="photo-rotate">${editorIcon('rotate')}<span>Rotate 90°</span></button><div class="photo-crop-footer"><button type="button" id="photo-crop-cancel">Cancel</button><button type="button" id="photo-crop-apply">Done</button></div></div>
    <div class="photo-edit-tabs photo-toolstrip">${[['adjust','Adjust'],['crop','Crop / Rotate'],['erase','Erase'],['restore','Restore']].map(([id,name])=>`<button type="button" data-photo-tool="${id}" class="${id==='adjust'?'active':''}">${editorIcon(id)}<span>${name}</span></button>`).join('')}</div>
    <div id="photo-loading" class="photo-loading" role="status" aria-live="polite" hidden><div class="photo-loading-spinner" aria-hidden="true"></div><strong>Removing background…</strong><span>Processing your photo</span></div>
    </div>`;
  function installEditorPresentation(){
    if($('photo-editor-presentation'))return;
    const style=document.createElement('style');style.id='photo-editor-presentation';style.textContent=`
#photo-edit-overlay{height:100dvh;overflow:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);box-sizing:border-box}
#photo-edit-overlay [hidden]{display:none!important}
#photo-edit-overlay svg{width:26px;height:26px;display:block;flex:none}
#photo-edit-overlay .photo-edit-head{height:clamp(62px,10dvh,90px);padding:0 17px;border:0;flex:none}
#photo-edit-overlay .photo-edit-head button{display:grid;place-items:center;min-width:44px;height:48px;padding:0;color:#222}
#photo-edit-overlay .photo-edit-head svg{width:30px;height:30px}
#photo-edit-overlay .photo-workspace{position:relative;flex:1;min-height:0;overflow:hidden}
#photo-edit-overlay .photo-edit-preview{position:absolute;inset:0;min-height:0;display:flex;align-items:safe center;justify-content:safe center;padding:12px 0 55px;box-sizing:border-box;background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0;background-image:conic-gradient(#ededed 25%,#fff 0 50%,#ededed 0 75%,#fff 0);overflow:auto}
#photo-edit-overlay .photo-edit-stage{flex:none;margin:0;position:relative;max-width:none}
#photo-edit-overlay .photo-floating-actions{position:absolute;left:14px;right:14px;bottom:15px;display:flex;align-items:center;justify-content:flex-end;gap:7px;pointer-events:none}
#photo-edit-overlay .photo-floating-actions button{pointer-events:auto;border:0;border-radius:12px;background:#929398c9;color:white;min-height:38px;padding:7px 12px;font-size:14px;display:flex;align-items:center;justify-content:center}
#photo-edit-overlay #photo-undo{width:42px;height:42px;padding:0;background:#74747499}
#photo-edit-overlay #photo-remove-background{margin-right:auto;background:#fffffff0;color:#222;border:1px solid #dadde5;font-weight:600}
#photo-edit-overlay #photo-edit-status{position:absolute;left:10px;right:10px;top:5px;margin:0;min-height:0;padding:0;text-align:center;font-size:11px;pointer-events:none;color:#62636a}
#photo-edit-overlay #photo-edit-status:empty{display:none}
#photo-edit-overlay #photo-adjust-panel,#photo-edit-overlay #photo-brush-panel{height:clamp(105px,15dvh,142px);flex:none;padding:10px 8px;display:flex;flex-direction:column;justify-content:center;gap:8px;overflow:hidden;box-sizing:border-box}
#photo-edit-overlay .photo-adjust-choices{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px}
#photo-edit-overlay .photo-adjust-choices button{border:0;background:none;display:flex;align-items:center;flex-direction:column;gap:7px;color:#222;font-size:clamp(11px,3.1vw,14px);padding:0;min-width:0;white-space:nowrap}
#photo-edit-overlay .photo-adjust-choices button>span{width:clamp(38px,12vw,52px);aspect-ratio:1;display:grid;place-items:center;border-radius:50%;background:#f1f2f7}
#photo-edit-overlay .photo-adjust-choices button[aria-expanded=true]>span{background:#e0e6f5;color:#326ff5}
#photo-edit-overlay .photo-adjust-sliders label{padding:0 12px;gap:2px}
#photo-edit-overlay .photo-adjust-sliders label>span{font-size:12px;color:#64666e}
#photo-edit-overlay input[type=range]{width:100%;margin:4px 0;accent-color:#3277ff;min-height:24px}
#photo-edit-overlay output{color:#3277ff}
#photo-edit-overlay #photo-brush-panel{padding:20px;justify-content:center}
#photo-edit-overlay #photo-brush-panel label{font-size:14px;color:#64666e;gap:16px}
#photo-edit-overlay .photo-toolstrip{height:clamp(76px,12dvh,110px);flex:none;grid-template-columns:repeat(4,minmax(0,1fr));padding:9px 6px;border-top:1px solid #e9e9ee;border-bottom:0;gap:0;align-items:center}
#photo-edit-overlay .photo-toolstrip button{background:white;color:#222;border:0;border-radius:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;font-size:clamp(11px,3.2vw,15px);padding:6px 0;white-space:nowrap}
#photo-edit-overlay .photo-toolstrip button svg{width:27px;height:27px}
#photo-edit-overlay .photo-toolstrip button.active svg{fill:#2222;stroke-width:2.3}
#photo-edit-overlay[data-mode=crop] .photo-toolstrip,#photo-edit-overlay[data-mode=crop] .photo-floating-actions{display:none}
#photo-edit-overlay #photo-crop-controls{flex:none;display:flex;flex-direction:column;gap:18px;padding:16px 16px 24px}
#photo-edit-overlay #photo-rotate{display:flex;flex-direction:column;align-items:center;gap:5px;border:0;background:none;color:#222}
#photo-edit-overlay .photo-crop-footer{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#photo-edit-overlay .photo-crop-footer button{height:46px;border:0;border-radius:9px;background:#ececf1;color:#666;font-size:15px;font-weight:600}
#photo-edit-overlay .photo-crop-footer #photo-crop-apply{background:#161618;color:#fff}
#photo-edit-overlay #photo-crop-box{border:1px solid #fff;box-shadow:0 0 0 200vmax #0004}
#photo-edit-overlay #photo-crop-box i{width:23px;height:23px;background:transparent;border:0;border-radius:0;border-color:white;border-style:solid}
#photo-edit-overlay [data-crop-handle=nw]{left:-3px;top:-3px;border-width:3px 0 0 3px!important}
#photo-edit-overlay [data-crop-handle=ne]{right:-3px;top:-3px;border-width:3px 3px 0 0!important}
#photo-edit-overlay [data-crop-handle=sw]{left:-3px;bottom:-3px;border-width:0 0 3px 3px!important}
#photo-edit-overlay [data-crop-handle=se]{right:-3px;bottom:-3px;border-width:0 3px 3px 0!important}
`;document.head.append(style);
  }
  function fitEditorStage(){
    if(!current)return;
    const preview=document.querySelector('#photo-edit-overlay .photo-edit-preview'),stage=$('photo-edit-stage');
    if(!preview||!stage)return;
    const availableHeight=Math.max(1,preview.clientHeight-67);
    const fit=Math.min(preview.clientWidth*.78,540,availableHeight*current.base.width/current.base.height);
    stage.style.width=Math.max(1,fit*(current.zoom||1))+'px';
  }
  function renderPreview(){
    if(!current)return;
    const s=current, c=$('photo-edit-canvas');if(!c)return;c.width=s.base.width;c.height=s.base.height;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    const b=s.base.getContext('2d').getImageData(0,0,c.width,c.height), mask=s.mask.getContext('2d').getImageData(0,0,c.width,c.height);
    const brightness=Number($('photo-brightness').value)*2.0,contrast=Number($('photo-contrast').value),sat=1+Number($('photo-saturation').value)/100;
    const temp=Number($('photo-temperature').value)*0.65,tint=Number($('photo-tint').value)*0.55;
    const factor=(259*(contrast+255))/(255*(259-contrast));
    for(let i=0;i<b.data.length;i+=4){
      const r=b.data[i],g=b.data[i+1],bl=b.data[i+2],gray=.2126*r+.7152*g+.0722*bl;
      b.data[i]=Math.max(0,Math.min(255,factor*(gray+(r-gray)*sat-128)+128+brightness+temp+tint/2));
      b.data[i+1]=Math.max(0,Math.min(255,factor*(gray+(g-gray)*sat-128)+128+brightness-tint));
      b.data[i+2]=Math.max(0,Math.min(255,factor*(gray+(bl-gray)*sat-128)+128+brightness-temp+tint/2));
      b.data[i+3]=Math.round(b.data[i+3]*mask.data[i+3]/255);
    }
    ctx.putImageData(b,0,0);fitEditorStage();
  }
  function status(msg){if($('photo-edit-status'))$('photo-edit-status').textContent=msg}
  function storeUndo(){const s=current;s.history.push({base:canvasCopy(s.base),mask:canvasCopy(s.mask)});if(s.history.length>6)s.history.shift()}
  function resetMask(){const c=current.mask;c.getContext('2d').clearRect(0,0,c.width,c.height);c.getContext('2d').fillStyle='#fff';c.getContext('2d').fillRect(0,0,c.width,c.height)}
  function replaceDimensions(canvas){current.base=canvas;current.mask=document.createElement('canvas');current.mask.width=canvas.width;current.mask.height=canvas.height;resetMask()}
  function colorSuggestion(canvas){
    const {data,width,height}=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
    const counts=new Map(), swatches=[['Black',[35,35,35]],['White',[243,243,243]],['Ivory',[237,230,213]],['Gray',[135,135,135]],['Beige',[207,184,151]],['Brown',[111,75,49]],['Red',[184,58,64]],['Orange',[225,125,59]],['Yellow',[228,196,65]],['Green',[67,138,78]],['Blue',[61,113,180]],['Purple',[153,109,170]],['Pink',[227,155,182]]];
    let sample=0;const stride=Math.max(1,Math.floor(width*height/3500));
    for(let p=0;p<width*height;p+=stride){const i=p*4;if(data[i+3]<150)continue;const r=data[i],g=data[i+1],b=data[i+2];let best='',dist=Infinity;
      for(const [name,v] of swatches){const d=(r-v[0])**2+(g-v[1])**2+(b-v[2])**2;if(d<dist){best=name;dist=d}}
      counts.set(best,(counts.get(best)||0)+1);sample++;
    }
    return [...counts].sort((a,b)=>b[1]-a[1]).filter(x=>x[1]>sample*.09).slice(0,2).map(x=>x[0]);
  }
  async function suggestCategory(photo){
    try {
      status('Checking garment type…');
      await load('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
      await load('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js');
      if(!window.mobilenet)throw Error('Image model missing');
      window.wardrobePhotoModel ||= await window.mobilenet.load({version:2,alpha:0.5});
      if(!document.querySelector("#addform"))return;
      const classes=await window.wardrobePhotoModel.classify(photo,5);
      const names=classes.map(x=>x.className.toLowerCase()).join(' | ');
      let guess=null;
      if(/running shoe|sneaker|loafer|sandal|boot|slipper|shoe/.test(names))guess='Shoes';
      else if(/handbag|purse|backpack|wallet|bag/.test(names))guess='Bags';
      else if(/dress|gown|abaya/.test(names))guess='Dresses';
      else if(/skirt|miniskirt/.test(names))guess='Skirts';
      else if(/jean|trouser|pant/.test(names))guess='Pants';
      else if(/coat|jacket|trench/.test(names))guess='Outerwear';
      else if(/sweatshirt|jersey|cardigan|sweater|shirt|t-shirt/.test(names))guess='Tops';
      if(guess&&typeof WARDROBE_CATEGORIES!=='undefined'&&WARDROBE_CATEGORIES[guess]){
        const select=document.querySelector('#addform [name="category"]');if(select) {select.value=guess;select.dispatchEvent(new Event('change',{bubbles:true}));}
        const subtype=guess==='Pants'?(/jean/.test(names)?'Jeans':/trouser/.test(names)?'Trousers':null):guess==='Tops'?(/sweater/.test(names)?'Sweater':/sweatshirt/.test(names)?'Sweatshirt':/t-shirt/.test(names)?'T-shirt':null):guess==='Shoes'?(/boot/.test(names)?'Boots':/sandal/.test(names)?'Sandals':/loafer/.test(names)?'Loafers':/running shoe/.test(names)?'Sneakers':null):guess==='Outerwear'?(/trench/.test(names)?'Trench coat':/jacket/.test(names)?'Jacket':null):null;
        const sub=document.querySelector('#addform [name="subcategory"]');if(sub&&subtype&&[...sub.options].some(o=>o.value===subtype))sub.value=subtype;
        const title=document.querySelector('#addform [name="name"]');if(title&&!title.value){const color=document.querySelector('#addform [name="colors"]')?.value.split(',')[0]?.trim()||'';title.value=[color,subtype||guess].filter(Boolean).join(' ')}
        status('Suggested category: '+guess+' (review before saving)');
      }else status('Category could not be identified confidently. Select it manually.');
    }catch(e){status('Automatic category unavailable on this device. Select it manually.')}
  }
  async function completed(){
    if(!current)return;
    if(current.tool==='crop'){applyCrop();return}
    renderPreview();
    if(editorContext.mode==='existing'){
      const save=$('photo-edit-done'),code=editorContext.itemCode;
      save.disabled=true;status('Saving updated photo to your wardrobe…');
      try {
        if(typeof window.replaceWardrobeGarmentImage!=='function')throw Error('Cloud photo saving is not available.');
        await window.replaceWardrobeGarmentImage(code,$('photo-edit-canvas').toDataURL('image/webp',0.85));
        close();
      }catch(error){status('Could not save photo: '+(error?.message||error));save.disabled=false;}
      return;
    }
    const c=$('photo-edit-canvas'),preview=$('photo-add-preview');
    window.wardrobePhotoEdited=c.toDataURL('image/webp',0.85);
    if(preview){preview.src=window.wardrobePhotoEdited;preview.hidden=false}
    const colors=colorSuggestion(c),col=document.querySelector('#addform [name="colors"]');
    if(col&&!col.value&&colors.length)col.value=colors.join(', ');
    const photo=canvasCopy(c);
    close();
    $('photo-step-select').hidden=true;$('photo-step-review').hidden=false;
    suggestCategory(photo);
  }
  function close(){current?.layoutObserver?.disconnect();const e=$('photo-edit-overlay');if(e)e.remove();current=null;editorContext={mode:'add',itemCode:null}}
  function setTool(tool){
    if(!current)return;
    current.tool=tool;
    $('photo-edit-overlay').dataset.mode=tool;
    $('photo-reset').hidden=['erase','restore'].includes(tool);
    $('photo-remove-background').hidden=!['erase','restore'].includes(tool);
    document.querySelectorAll('[data-photo-tool]').forEach(b=>b.classList.toggle('active',b.dataset.photoTool===tool));
    $('photo-adjust-panel').hidden=tool!=='adjust';
    $('photo-brush-panel').hidden=!['erase','restore'].includes(tool);
    $('photo-crop-controls').hidden=tool!=='crop';
    $('photo-crop-box').hidden=tool!=='crop';
    if(tool==='erase'||tool==='restore')setBrushMode(tool);else status('');fitEditorStage();
  }
  function setBrushMode(mode){
    if(!current)return;current.tool=mode;
    for(const kind of ['erase','restore']){
      const b=$('photo-brush-'+kind);if(b){b.classList.toggle('active',mode===kind);b.setAttribute('aria-pressed',String(mode===kind))}
    }
    document.querySelectorAll('[data-photo-tool]').forEach(b=>b.classList.toggle('active',b.dataset.photoTool===mode));
  }
  function setZoom(value,anchor=null){
    if(!current)return;
    const preview=document.querySelector('#photo-edit-overlay .photo-edit-preview'),stage=$('photo-edit-stage');
    if(!preview||!stage)return;
    const before=stage.getBoundingClientRect(),frame=preview.getBoundingClientRect();
    const point=anchor||{x:frame.left+frame.width/2,y:frame.top+frame.height/2};
    const x=(point.x-before.left)/(before.width||1),y=(point.y-before.top)/(before.height||1);
    current.zoom=Math.max(1,Math.min(5,value));
    fitEditorStage();
    const after=stage.getBoundingClientRect();
    preview.scrollLeft+=after.left+x*after.width-point.x;
    preview.scrollTop+=after.top+y*after.height-point.y;
  }
  function installPinchZoom(preview){
    let pinch=null;
    const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
    const center=t=>({x:(t[0].clientX+t[1].clientX)/2,y:(t[0].clientY+t[1].clientY)/2});
    preview.addEventListener('touchstart',e=>{
      if(e.touches.length===2){if(current){current.drawing=false;current.lastPoint=null}pinch={distance:distance(e.touches),zoom:current?.zoom||1}}
    },{passive:true});
    preview.addEventListener('touchmove',e=>{
      if(e.touches.length===2&&pinch&&current){e.preventDefault();setZoom(pinch.zoom*distance(e.touches)/Math.max(1,pinch.distance),center(e.touches))}
    },{passive:false});
    preview.addEventListener('touchend',e=>{if(e.touches.length<2)pinch=null},{passive:true});
    preview.addEventListener('touchcancel',()=>{pinch=null},{passive:true});
  }
  function brush(e){
    if(!current||!['erase','restore'].includes(current.tool))return;
    const canvas=$('photo-edit-canvas'),rect=canvas.getBoundingClientRect();
    const x=(e.clientX-rect.left)*canvas.width/rect.width,y=(e.clientY-rect.top)*canvas.height/rect.height;
    const ctx=current.mask.getContext('2d');
    const radius=Number($('photo-brush').value)*Math.max(canvas.width,canvas.height)/1700;
    ctx.save();ctx.globalCompositeOperation=current.tool==='erase'?'destination-out':'source-over';ctx.fillStyle='#fff';
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=2*radius;
    if(current.lastPoint){ctx.beginPath();ctx.moveTo(current.lastPoint.x,current.lastPoint.y);ctx.lineTo(x,y);ctx.stroke()}
    ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.restore();
    current.lastPoint={x,y};renderPreview();
  }
  function beginCrop(){
    if(!current)return;
    current.crop={x:.08,y:.08,w:.84,h:.84};setTool('crop');drawCrop();
  }
  function drawCrop(){
    if(!current?.crop)return;const c=current.crop,box=$('photo-crop-box');
    Object.assign(box.style,{left:c.x*100+'%',top:c.y*100+'%',width:c.w*100+'%',height:c.h*100+'%'});
  }
  function applyCrop(){
    const s=current;if(!s?.crop)return;
    storeUndo();
    const {x,y,w,h}=s.crop;
    const px=Math.round(x*s.base.width),py=Math.round(y*s.base.height);
    const width=Math.max(1,Math.round(w*s.base.width)),height=Math.max(1,Math.round(h*s.base.height));
    for(const key of ['base','mask']){
      const c=document.createElement('canvas');c.width=width;c.height=height;
      c.getContext('2d').drawImage(s[key],px,py,width,height,0,0,width,height);s[key]=c;
    }
    s.crop=null;setTool('adjust');renderPreview();setZoom(1);
  }
  async function removeBackground(){
    if(!current)return;const id=current.id,loading=$('photo-loading');if(loading)loading.hidden=false;status('');
    try {
      const mod=await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm');
      if(!current||current.id!==id)return;
      const blob=await mod.removeBackground(current.base.toDataURL('image/png'),{output:{format:'image/png'}});
      const image=await imageFromFile(blob);
      if(!current||current.id!==id)return;
      storeUndo();const c=draw(image,1400);current.base=canvasCopy(current.original);current.mask=document.createElement('canvas');current.mask.width=current.base.width;current.mask.height=current.base.height;
      const m=current.mask.getContext('2d');m.drawImage(c,0,0,current.mask.width,current.mask.height);
      const pixels=m.getImageData(0,0,current.mask.width,current.mask.height);
      for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=255;pixels.data[i+1]=255;pixels.data[i+2]=255}
      m.putImageData(pixels,0,0);renderPreview();status('Background removed. Use Erase / Restore to refine edges.');
    }catch(e){status('Automatic removal unavailable ('+(e.message||'model failed')+'). Manual Erase is available.')}
    finally{if(loading)loading.hidden=true}
  }
  function rotate(){storeUndo();const s=current,c=document.createElement('canvas');c.width=s.base.height;c.height=s.base.width;const cx=c.getContext('2d');cx.translate(c.width,0);cx.rotate(Math.PI/2);cx.drawImage(s.base,0,0);
    const m=document.createElement('canvas');m.width=c.width;m.height=c.height;const mx=m.getContext('2d');mx.translate(m.width,0);mx.rotate(Math.PI/2);mx.drawImage(s.mask,0,0);s.base=c;s.mask=m;renderPreview()}
  function crop(){const s=current,ctx=s.mask.getContext('2d'),d=ctx.getImageData(0,0,s.mask.width,s.mask.height).data;let minX=s.mask.width,minY=s.mask.height,maxX=0,maxY=0;
    for(let y=0;y<s.mask.height;y+=2)for(let x=0;x<s.mask.width;x+=2)if(d[(y*s.mask.width+x)*4+3]>80){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
    if(minX>maxX){status('Nothing visible to crop');return}storeUndo();const pad=Math.round(Math.max(s.mask.width,s.mask.height)*.025);const x=Math.max(0,minX-pad),y=Math.max(0,minY-pad),w=Math.min(s.base.width-x,maxX-x+pad+2),h=Math.min(s.base.height-y,maxY-y+pad+2);
    for(const name of ['base','mask']){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(s[name],x,y,w,h,0,0,w,h);s[name]=c}renderPreview()}
  async function open(file,skipAI=false,context={mode:'add',itemCode:null}){
    try{const img=await imageFromFile(file);if($('photo-edit-overlay'))close();editorContext=context;const base=draw(img),mask=document.createElement('canvas');mask.width=base.width;mask.height=base.height;
      current={id:++generation,original:canvasCopy(base),base,mask,history:[],tool:'adjust',drawing:false,zoom:1};resetMask();
      installEditorPresentation();document.body.insertAdjacentHTML('beforeend',editorHTML());
      $('photo-edit-cancel').onclick=close;$('photo-edit-done').onclick=completed;$('photo-rotate').onclick=rotate;
      $('photo-undo').onclick=()=>{const p=current.history.pop();if(p){current.base=p.base;current.mask=p.mask;renderPreview()}};
      $('photo-reset').onclick=()=>{storeUndo();replaceDimensions(canvasCopy(current.original));renderPreview()};
      for(const [id] of adjustmentNames){const input=$('photo-'+id);input.oninput=()=>{input.parentElement.querySelector('output').value=input.value;renderPreview()}}
      document.querySelectorAll('[data-photo-adjust]').forEach(b=>b.onclick=()=>{const was=b.getAttribute('aria-expanded')==='true';document.querySelectorAll('[data-photo-adjust]').forEach(x=>x.setAttribute('aria-expanded',String(!was&&x===b)));document.querySelectorAll('[data-adjust-slider]').forEach(x=>x.hidden=was||x.dataset.adjustSlider!==b.dataset.photoAdjust)});
      $('photo-brush').oninput=()=>{$('photo-brush-value').value=$('photo-brush').value};
      $('photo-remove-background').onclick=removeBackground;
      document.querySelectorAll('[data-photo-tool]').forEach(b=>b.onclick=()=>{if(b.dataset.photoTool==='crop')beginCrop();else if(['erase','restore'].includes(b.dataset.photoTool))setTool(b.dataset.photoTool);else{current.crop=null;setTool('adjust')}});
      $('photo-brush-erase').onclick=()=>setBrushMode('erase');$('photo-brush-restore').onclick=()=>setBrushMode('restore');
      const c=$('photo-edit-canvas');
      c.addEventListener('pointerdown',e=>{if(!['erase','restore'].includes(current?.tool)||e.pointerType==='touch'&&!e.isPrimary)return;storeUndo();current.drawing=true;current.lastPoint=null;c.setPointerCapture(e.pointerId);brush(e)});
      c.addEventListener('pointermove',e=>{if(current?.drawing)brush(e)});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,()=>{if(current){current.drawing=false;current.lastPoint=null}});
      installPinchZoom(document.querySelector('#photo-edit-overlay .photo-edit-preview'));
      $('photo-crop-apply').onclick=applyCrop;$('photo-crop-cancel').onclick=()=>{current.crop=null;setTool('adjust')};
      const cropBox=$('photo-crop-box');cropBox.addEventListener('pointerdown',e=>{
        if(!current?.crop)return;
        e.preventDefault();e.stopPropagation();cropBox.setPointerCapture(e.pointerId);
        const bounds=$('photo-edit-canvas').getBoundingClientRect();
        current.cropDrag={startX:e.clientX,startY:e.clientY,origin:{...current.crop},handle:e.target.dataset.cropHandle||'move',bounds};
      });
      cropBox.addEventListener('pointermove',e=>{
        if(!current?.cropDrag)return;
        const d=current.cropDrag,dx=(e.clientX-d.startX)/d.bounds.width,dy=(e.clientY-d.startY)/d.bounds.height;
        let {x,y,w,h}=d.origin;
        if(d.handle==='move'){x=Math.max(0,Math.min(1-w,x+dx));y=Math.max(0,Math.min(1-h,y+dy))}
        else{
          if(d.handle.includes('w')){const nx=Math.max(0,Math.min(x+w-.08,x+dx));w+=x-nx;x=nx}
          if(d.handle.includes('e'))w=Math.max(.08,Math.min(1-x,w+dx));
          if(d.handle.includes('n')){const ny=Math.max(0,Math.min(y+h-.08,y+dy));h+=y-ny;y=ny}
          if(d.handle.includes('s'))h=Math.max(.08,Math.min(1-y,h+dy));
        }
        current.crop={x,y,w,h};drawCrop();
      });
      for(const event of ['pointerup','pointercancel','lostpointercapture'])cropBox.addEventListener(event,()=>{if(current)current.cropDrag=null});
      if(typeof ResizeObserver!=='undefined'){current.layoutObserver=new ResizeObserver(fitEditorStage);current.layoutObserver.observe(document.querySelector('#photo-edit-overlay .photo-workspace'))}renderPreview();if(!skipAI)removeBackground();
    }catch(e){alert('Could not load photo: '+e.message)}
  }
  // Both the existing-item view and Add Garment share this exact editing flow.
  window.openWardrobePhotoEditorForItem=async function(code){
    const item=state.items.find(x=>x.item_code===code);
    if(!item?.image_path){alert('No photo is available for this garment.');return}
    try {
      const response=await fetch(item.image_path);
      if(!response.ok)throw Error('Photo download failed ('+response.status+').');
      await open(await response.blob(),true,{mode:'existing',itemCode:code});
    }catch(error){alert('Could not open garment photo: '+(error?.message||error))}
  };
  window.initWardrobePhotoAdd=function(){
    window.wardrobePhotoEdited=null;
    const input=$('photo-add-file');if(!input)return;
    input.onchange=()=>{const f=input.files?.[0];if(f)open(f)};
    $('photo-review-back').onclick=async()=>{
      if(window.wardrobePhotoEdited){const blob=await (await fetch(window.wardrobePhotoEdited)).blob();await open(blob,true)}else{const f=input.files?.[0];if(f)await open(f)}
    };
  };
})();
