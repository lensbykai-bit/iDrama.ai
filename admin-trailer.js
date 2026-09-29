// Trailer manager + direct video upload for iDrama.ai Admin.
(function(){
  const tab=document.getElementById('tabEps');
  const section=document.getElementById('eps');
  const form=document.getElementById('epForm');
  const movieSelect=document.getElementById('movieSelect');
  const epList=document.getElementById('epList');
  const movieForm=document.getElementById('movieForm');
  if(!tab||!section||!form||!movieSelect||!epList||!movieForm||typeof db==='undefined') return;

  const MAX_BYTES=50*1024*1024;
  const allowedTypes=new Set(['video/mp4','video/webm','video/quicktime']);

  // ---- Visible upload field directly inside Add/Edit Movie ----
  const posterFile=document.getElementById('posterFile');
  const posterWrap=posterFile?.closest('.f');
  if(posterWrap && !document.getElementById('trailerFile')){
    const wrap=document.createElement('div');
    wrap.className='f full';
    wrap.id='mainTrailerUploadWrap';
    wrap.innerHTML=`
      <label>Upload Video Trailer</label>
      <input id="trailerFile" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov">
      <div class="muted" style="margin-top:7px;line-height:1.7">ជ្រើសវីដេអូ Trailer ពីកុំព្យូទ័រ/ទូរស័ព្ទ។ MP4, WEBM ឬ MOV មិនលើស 50MB។ បើកែរឿងហើយមិនជ្រើស Video ថ្មី Trailer ចាស់នឹងនៅដដែល។</div>
      <div id="mainTrailerStatus" class="muted" style="margin-top:8px"></div>
      <video id="mainTrailerPreview" controls playsinline style="display:none;margin-top:10px;width:min(360px,100%);max-height:240px;background:#000;border-radius:12px"></video>`;
    posterWrap.after(wrap);
  }

  const mainFile=document.getElementById('trailerFile');
  const mainPreview=document.getElementById('mainTrailerPreview');
  const mainStatus=document.getElementById('mainTrailerStatus');
  let mainObjectUrl='';

  window.setMainTrailerStatus=function(url){
    if(mainObjectUrl){URL.revokeObjectURL(mainObjectUrl);mainObjectUrl=''}
    if(mainFile) mainFile.value='';
    const clean=String(url||'').trim();
    if(!clean){
      if(mainStatus) mainStatus.textContent='មិនទាន់មាន Trailer';
      if(mainPreview){mainPreview.pause();mainPreview.removeAttribute('src');mainPreview.style.display='none'}
      return;
    }
    if(mainStatus) mainStatus.textContent='Trailer មានរួច ✓ — ជ្រើស Video ថ្មី ប្រសិនបើចង់ប្ដូរ';
    if(mainPreview){
      if(/^https?:\/\//i.test(clean) && !/(tiktok\.com|youtu\.be|youtube\.com|facebook\.com|instagram\.com)/i.test(clean)){
        mainPreview.src=clean;
        mainPreview.style.display='block';
      }else{
        mainPreview.removeAttribute('src');
        mainPreview.style.display='none';
      }
    }
  };

  mainFile?.addEventListener('change',()=>{
    const file=mainFile.files?.[0];
    if(mainObjectUrl){URL.revokeObjectURL(mainObjectUrl);mainObjectUrl=''}
    if(!file){window.setMainTrailerStatus('');return}
    if(!allowedTypes.has(file.type)){
      mainFile.value='';
      if(mainStatus) mainStatus.textContent='សូមជ្រើស Video MP4, WEBM ឬ MOV។';
      return;
    }
    if(file.size>MAX_BYTES){
      mainFile.value='';
      if(mainStatus) mainStatus.textContent='Video ធំពេក។ សូមប្រើ Trailer មិនលើស 50MB។';
      return;
    }
    mainObjectUrl=URL.createObjectURL(file);
    if(mainPreview){mainPreview.src=mainObjectUrl;mainPreview.style.display='block'}
    if(mainStatus) mainStatus.textContent=`រួចរាល់សម្រាប់ Upload: ${file.name}`;
  });

  // ---- Trailer tab kept for old links and direct uploads ----
  tab.classList.remove('hide');
  tab.textContent='Trailer';

  const panels=section.querySelectorAll('.panel');
  const topTitle=panels[0]?.querySelector('.head h2');
  if(topTitle) topTitle.textContent='Trailer របស់រឿង';
  const topNote=panels[0]?.querySelector('.muted');
  if(topNote) topNote.textContent='ជ្រើសរឿង រួច Upload Video Trailer ឬដាក់ Trailer Link។';

  const formTitle=panels[1]?.querySelector('.head h2');
  if(formTitle) formTitle.textContent='Upload / កែ Trailer';
  const listTitle=panels[2]?.querySelector('.head h2');
  if(listTitle) listTitle.textContent='Trailer ដែលបានដាក់';

  const epn=document.getElementById('epn');
  const ept=document.getElementById('ept');
  const epd=document.getElementById('epd');
  const epv=document.getElementById('epv');
  const eppreview=document.getElementById('eppreview');
  const epp=document.getElementById('epp');
  const saveBtn=form.querySelector('button:not([type="button"])');
  const cancelBtn=document.getElementById('cancelEp');

  [epn,ept,epd].forEach(el=>{const w=el?.closest('.f');if(w)w.style.display='none'});
  [eppreview,epp].forEach(el=>{const l=el?.closest('label');if(l)l.style.display='none'});

  if(epv){
    const wrap=epv.closest('.f');
    const label=wrap?.querySelector('label');
    if(label) label.textContent='Trailer Link (optional)';
    epv.placeholder='https://www.tiktok.com/... ឬ https://youtu.be/... ឬ https://...mp4';
    epv.required=false;
    if(wrap && !document.getElementById('trailerTabFile')){
      const upload=document.createElement('div');
      upload.style.marginBottom='14px';
      upload.innerHTML=`
        <label style="display:block;margin-bottom:7px;font-family:Battambang,sans-serif;font-weight:700">Upload Video Trailer</label>
        <input id="trailerTabFile" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov">
        <div id="trailerTabUploadMsg" class="muted" style="margin-top:7px">MP4, WEBM ឬ MOV មិនលើស 50MB។</div>`;
      wrap.insertBefore(upload,epv);
    }
  }
  if(saveBtn) saveBtn.textContent='រក្សាទុក Trailer';
  if(cancelBtn) cancelBtn.textContent='សម្អាត';

  function prepareTrailerFields(){
    if(epn && !epn.value) epn.value='1';
    if(ept && !ept.value.trim()) ept.value='Trailer';
    if(eppreview) eppreview.checked=true;
    if(epp) epp.checked=true;
  }

  const oldReset=window.resetEp;
  if(typeof oldReset==='function'){
    window.resetEp=function(){
      oldReset();
      if(epn) epn.value='1';
      if(ept) ept.value='Trailer';
      if(eppreview) eppreview.checked=true;
      if(epp) epp.checked=true;
      const f=document.getElementById('trailerTabFile');if(f)f.value='';
    };
  }
  prepareTrailerFields();

  const originalSubmit=form.onsubmit;
  form.onsubmit=async function(e){
    e.preventDefault();
    prepareTrailerFields();
    const upload=document.getElementById('trailerTabFile');
    const uploadMsg=document.getElementById('trailerTabUploadMsg');
    const file=upload?.files?.[0]||null;
    try{
      if(file){
        if(!allowedTypes.has(file.type)) throw new Error('សូមជ្រើស MP4, WEBM ឬ MOV។');
        if(file.size>MAX_BYTES) throw new Error('Trailer មិនអាចលើស 50MB បានទេ។');
        if(typeof window.uploadTrailerVideo!=='function') throw new Error('Trailer uploader មិនទាន់រួចរាល់។');
        if(uploadMsg) uploadMsg.textContent='កំពុង Upload Trailer...';
        epv.value=await window.uploadTrailerVideo(file);
      }
      if(!epv.value.trim()) throw new Error('សូម Upload Video Trailer ឬដាក់ Trailer Link។');
      if(typeof originalSubmit==='function') await originalSubmit.call(form,e);
      if(uploadMsg) uploadMsg.textContent='រក្សាទុក Trailer រួចរាល់ ✓';
    }catch(err){
      const msg=document.getElementById('epMsg');
      if(msg){msg.className='msg err';msg.textContent=err?.message||String(err)}
      if(uploadMsg) uploadMsg.textContent='Upload មិនបាន';
    }
  };

  window.renderEps=function(){
    const id=movieSelect.value;
    const list=(episodes||[]).filter(e=>String(e.item_id)===String(id) && e.preview===true);
    epList.innerHTML=list.map(e=>{
      const url=sources[e.id]||'';
      return `<div class="row"><div class="thumb" style="height:54px;display:grid;place-items:center;background:#101620;color:#fff;font-weight:800">▶</div><div><h3>${esc(e.title||'Trailer')}</h3><div class="meta">${url?esc(url):'No Trailer URL'} ${e.published?'':'· Hidden'}</div></div><div class="r"><button class="btn soft" data-eedit="${e.id}">កែ</button><button class="btn danger" data-edel="${e.id}">លុប</button></div></div>`;
    }).join('')||'<div class="muted">រឿងនេះមិនទាន់មាន Trailer ទេ។ Upload Video ឬដាក់ Link ខាងលើ។</div>';
    document.querySelectorAll('[data-eedit]').forEach(b=>b.onclick=()=>editEp(b.dataset.eedit));
    document.querySelectorAll('[data-edel]').forEach(b=>b.onclick=()=>delEp(b.dataset.edel));
  };

  movieSelect.onchange=window.renderEps;
  tab.addEventListener('click',()=>setTimeout(()=>{prepareTrailerFields();window.renderEps()},0));
})();