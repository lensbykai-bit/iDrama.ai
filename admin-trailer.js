// Simple Trailer manager for iDrama.ai Admin.
// Reuses existing idrama_episodes / idrama_episode_sources rows and only shows preview=true rows.
(function(){
  const tab=document.getElementById('tabEps');
  const section=document.getElementById('eps');
  const form=document.getElementById('epForm');
  const movieSelect=document.getElementById('movieSelect');
  const epList=document.getElementById('epList');
  if(!tab||!section||!form||!movieSelect||!epList||typeof db==='undefined') return;

  tab.classList.remove('hide');
  tab.textContent='Trailer';

  const panels=section.querySelectorAll('.panel');
  const topTitle=panels[0]?.querySelector('.head h2');
  if(topTitle) topTitle.textContent='Trailer របស់រឿង';
  const topNote=panels[0]?.querySelector('.muted');
  if(topNote) topNote.textContent='ជ្រើសរឿងខាងក្រោម រួចដាក់ Link Trailer។ Trailer ចាស់ៗត្រូវបានរក្សាទុកដដែល។';

  const formTitle=panels[1]?.querySelector('.head h2');
  if(formTitle) formTitle.textContent='ដាក់ / កែ Trailer';
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

  // Keep technical fields in the data model but hide them from normal Admin use.
  [epn,ept,epd].forEach(el=>{
    const wrap=el?.closest('.f');
    if(wrap) wrap.style.display='none';
  });
  [eppreview,epp].forEach(el=>{
    const label=el?.closest('label');
    if(label) label.style.display='none';
  });

  if(epv){
    const wrap=epv.closest('.f');
    const label=wrap?.querySelector('label');
    if(label) label.textContent='Trailer Video URL *';
    epv.placeholder='https://www.tiktok.com/... ឬ https://youtu.be/... ឬ https://...mp4';
    epv.required=true;
    if(wrap && !wrap.querySelector('.trailer-help')){
      const help=document.createElement('div');
      help.className='muted trailer-help';
      help.style.cssText='margin-top:7px;line-height:1.7';
      help.textContent='អាចដាក់ TikTok, YouTube, Facebook, Instagram ឬ direct video URL។ Website នឹងបង្ហាញ Trailer សម្រាប់រឿងនេះ។';
      wrap.appendChild(help);
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
    };
  }
  prepareTrailerFields();
  form.addEventListener('submit',prepareTrailerFields,true);

  window.renderEps=function(){
    const id=movieSelect.value;
    const list=(episodes||[]).filter(e=>String(e.item_id)===String(id) && e.preview===true);
    epList.innerHTML=list.map(e=>{
      const url=sources[e.id]||'';
      return `<div class="row">
        <div class="thumb" style="height:54px;display:grid;place-items:center;background:#101620;color:#fff;font-weight:800">▶</div>
        <div>
          <h3>${esc(e.title||'Trailer')}</h3>
          <div class="meta">${url?esc(url):'No Trailer URL'} ${e.published?'':'· Hidden'}</div>
        </div>
        <div class="r">
          <button class="btn soft" data-eedit="${e.id}">កែ</button>
          <button class="btn danger" data-edel="${e.id}">លុប</button>
        </div>
      </div>`;
    }).join('')||'<div class="muted">រឿងនេះមិនទាន់មាន Trailer ទេ។ ដាក់ Link ខាងលើ ហើយចុច “រក្សាទុក Trailer”។</div>';

    document.querySelectorAll('[data-eedit]').forEach(b=>b.onclick=()=>editEp(b.dataset.eedit));
    document.querySelectorAll('[data-edel]').forEach(b=>b.onclick=()=>delEp(b.dataset.edel));
  };

  movieSelect.onchange=window.renderEps;
  tab.addEventListener('click',()=>setTimeout(()=>{ prepareTrailerFields(); window.renderEps(); },0));
})();
