// Trailer manager for iDrama.ai Admin.
// Trailer upload/link stays in the separate Trailer tab; it is no longer shown inside Add/Edit Movie.
(function(){
  const tab=document.getElementById('tabEps');
  const section=document.getElementById('eps');
  const form=document.getElementById('epForm');
  const movieSelect=document.getElementById('movieSelect');
  const epList=document.getElementById('epList');
  if(!tab||!section||!form||!movieSelect||!epList||typeof db==='undefined') return;

  const MAX_BYTES=50*1024*1024;
  const allowedTypes=new Set(['video/mp4','video/webm','video/quicktime']);

  // Safety cleanup: remove the old inline Trailer upload field from Add/Edit Movie if it exists.
  document.getElementById('mainTrailerUploadWrap')?.remove();

  // Trailer is managed only from this dedicated tab.
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

  // Hide technical fields from normal Admin use.
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
      const f=document.getElementById('trailerTabFile');
      if(f) f.value='';
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