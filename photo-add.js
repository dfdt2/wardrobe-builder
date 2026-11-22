/* Photo editor for Add Garment. Browser-side processing; no API keys. */
(() => {
  let current = null, generation = 0;
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
  const editorHTML = () => `<div id="photo-edit-overlay" role="dialog" aria-modal="true" aria-label="Edit garment photo">
    <div class="photo-edit-head"><button type="button" id="photo-edit-cancel" aria-label="Back">‹</button><strong>Edit photo</strong><button type="button" id="photo-edit-done" aria-label="Continue to details">✓</button></div>
    <div class="photo-edit-preview"><div class="photo-edit-stage" id="photo-edit-stage"><canvas id="photo-edit-canvas"></canvas><div id="photo-crop-box" hidden><i data-crop-handle="nw"></i><i data-crop-handle="ne"></i><i data-crop-handle="sw"></i><i data-crop-handle="se"></i></div></div></div>
    <div class="photo-edit-actions"><button type="button" id="photo-remove-bg">Remove background</button><button type="button" id="photo-rotate">Rotate 90°</button><button type="button" id="photo-crop">Crop / Rotate</button><button type="button" id="photo-zoom-out">−</button><span id="photo-zoom-label">100%</span><button type="button" id="photo-zoom-in">+</button><button type="button" id="photo-undo">Undo</button><button type="button" id="photo-reset">Original</button></div>
    <div class="photo-edit-tabs"><button type="button" data-photo-tool="adjust" class="active">Adjust</button><button type="button" data-photo-tool="erase">Erase</button><button type="button" data-photo-tool="restore">Restore</button></div>
    <div id="photo-adjust-panel"><label>Brightness<input type="range" id="photo-brightness" min="-100" max="100" value="0"></label><label>Contrast<input type="range" id="photo-contrast" min="-100" max="100" value="0"></label><label>Temperature<input type="range" id="photo-temperature" min="-100" max="100" value="0"></label><label>Saturation<input type="range" id="photo-saturation" min="-100" max="100" value="0"></label><label>Tint<input type="range" id="photo-tint" min="-100" max="100" value="0"></label></div>
    <div id="photo-brush-panel" hidden><label>Brush size<input type="range" id="photo-brush" min="4" max="100" value="28"></label><p class="photo-hint">Draw over the image to erase or restore. Use + / − to zoom for detailed edits.</p></div>
    <div id="photo-crop-controls" hidden><button type="button" id="photo-crop-apply">Apply crop</button><button type="button" id="photo-crop-cancel">Cancel crop</button><p class="photo-hint">Drag the crop corners or move the rectangle to choose the saved area.</p></div><p id="photo-edit-status" role="status"></p>
    </div>`;
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
    ctx.putImageData(b,0,0);
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
  function completed(){
    if(!current)return;
    if(current.tool==='crop'){applyCrop();return}
    renderPreview();
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
  function close(){const e=$('photo-edit-overlay');if(e)e.remove();current=null}
  function setTool(tool){
    if(!current)return;
    current.tool=tool;
    document.querySelectorAll('[data-photo-tool]').forEach(b=>b.classList.toggle('active',b.dataset.photoTool===tool));
    $('photo-adjust-panel').hidden=tool!=='adjust';
    $('photo-brush-panel').hidden=!['erase','restore'].includes(tool);
    $('photo-crop-controls').hidden=tool!=='crop';
    $('photo-crop-box').hidden=tool!=='crop';
    status(tool==='erase'?'Brush on the image to remove pixels.':tool==='restore'?'Brush on the image to bring back pixels.':'');
  }
  function zoom(delta){if(!current)return;current.zoom=Math.max(1,Math.min(5,Math.round((current.zoom+delta)*10)/10));const c=$('photo-edit-canvas');c.style.width=(100*current.zoom)+'%';$('photo-zoom-label').textContent=Math.round(current.zoom*100)+'%'}
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
    s.crop=null;setTool('adjust');renderPreview();zoom(0);
  }
  async function removeBackground(){
    if(!current)return;const id=current.id,btn=$('photo-remove-bg');btn.disabled=true;status('Removing background with AI. First run downloads a model…');
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
    finally{if(btn)btn.disabled=false}
  }
  function rotate(){storeUndo();const s=current,c=document.createElement('canvas');c.width=s.base.height;c.height=s.base.width;const cx=c.getContext('2d');cx.translate(c.width,0);cx.rotate(Math.PI/2);cx.drawImage(s.base,0,0);
    const m=document.createElement('canvas');m.width=c.width;m.height=c.height;const mx=m.getContext('2d');mx.translate(m.width,0);mx.rotate(Math.PI/2);mx.drawImage(s.mask,0,0);s.base=c;s.mask=m;renderPreview()}
  function crop(){const s=current,ctx=s.mask.getContext('2d'),d=ctx.getImageData(0,0,s.mask.width,s.mask.height).data;let minX=s.mask.width,minY=s.mask.height,maxX=0,maxY=0;
    for(let y=0;y<s.mask.height;y+=2)for(let x=0;x<s.mask.width;x+=2)if(d[(y*s.mask.width+x)*4+3]>80){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
    if(minX>maxX){status('Nothing visible to crop');return}storeUndo();const pad=Math.round(Math.max(s.mask.width,s.mask.height)*.025);const x=Math.max(0,minX-pad),y=Math.max(0,minY-pad),w=Math.min(s.base.width-x,maxX-x+pad+2),h=Math.min(s.base.height-y,maxY-y+pad+2);
    for(const name of ['base','mask']){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(s[name],x,y,w,h,0,0,w,h);s[name]=c}renderPreview()}
  async function open(file,skipAI=false){
    try{const img=await imageFromFile(file);const base=draw(img),mask=document.createElement('canvas');mask.width=base.width;mask.height=base.height;
      current={id:++generation,original:canvasCopy(base),base,mask,history:[],tool:'adjust',drawing:false,zoom:1};resetMask();
      document.body.insertAdjacentHTML('beforeend',editorHTML());
      $('photo-edit-cancel').onclick=close;$('photo-edit-done').onclick=completed;$('photo-remove-bg').onclick=removeBackground;$('photo-rotate').onclick=rotate;$('photo-crop').onclick=beginCrop;
      $('photo-undo').onclick=()=>{const p=current.history.pop();if(p){current.base=p.base;current.mask=p.mask;renderPreview()}};
      $('photo-reset').onclick=()=>{storeUndo();replaceDimensions(canvasCopy(current.original));renderPreview()};
      for(const id of ['brightness','contrast','temperature','saturation','tint'])$('photo-'+id).oninput=renderPreview;
      document.querySelectorAll('[data-photo-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.photoTool));
      const c=$('photo-edit-canvas');
      c.addEventListener('pointerdown',e=>{if(!['erase','restore'].includes(current?.tool))return;storeUndo();current.drawing=true;current.lastPoint=null;c.setPointerCapture(e.pointerId);brush(e)});
      c.addEventListener('pointermove',e=>{if(current?.drawing)brush(e)});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,()=>{if(current){current.drawing=false;current.lastPoint=null}});
      $('photo-zoom-in').onclick=()=>zoom(.5);$('photo-zoom-out').onclick=()=>zoom(-.5);
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
      renderPreview();if(!skipAI)removeBackground();
    }catch(e){alert('Could not load photo: '+e.message)}
  }
  window.initWardrobePhotoAdd=function(){
    window.wardrobePhotoEdited=null;
    const input=$('photo-add-file');if(!input)return;
    input.onchange=()=>{const f=input.files?.[0];if(f)open(f)};
    $('photo-review-back').onclick=async()=>{
      if(window.wardrobePhotoEdited){const blob=await (await fetch(window.wardrobePhotoEdited)).blob();await open(blob,true)}else{const f=input.files?.[0];if(f)await open(f)}
    };
  };
})();
