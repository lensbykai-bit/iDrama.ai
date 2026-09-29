// Editable 0-5 rating control for iDrama.ai Admin.
(function(){
  const form=document.getElementById('movieForm');
  const views=document.getElementById('views');
  const mid=document.getElementById('mid');
  const poster=document.getElementById('poster');
  if(!form||!views||!mid||!poster||typeof db==='undefined') return;

  if(!document.getElementById('rating')){
    const wrap=document.createElement('div');
    wrap.className='f';
    wrap.id='ratingField';
    wrap.innerHTML=`
      <label>កម្រិតផ្កាយ (0–5)</label>
      <input id="rating" type="number" min="0" max="5" step="0.1" value="5.0">
      <div id="ratingPreview" class="muted" style="margin-top:5px;color:#ffc94a">★★★★★ 5.0/5</div>`;
    views.closest('.f')?.after(wrap);
  }

  const rating=document.getElementById('rating');
  const preview=document.getElementById('ratingPreview');
  if(!rating) return;

  function clamp(v){
    const n=Number(v);
    if(!Number.isFinite(n)) return 5;
    return Math.max(0,Math.min(5,n));
  }

  function paint(){
    const r=clamp(rating.value);
    rating.value=r.toFixed(1);
    const rounded=Math.round(r);
    if(preview) preview.textContent='★'.repeat(rounded)+'☆'.repeat(5-rounded)+' '+r.toFixed(1)+'/5';
  }
  rating.addEventListener('input',paint);
  rating.addEventListener('change',paint);
  paint();

  const oldReset=window.resetMovie;
  if(typeof oldReset==='function'){
    window.resetMovie=function(){
      oldReset();
      rating.value='5.0';
      paint();
    };
  }

  const oldEdit=window.editMovie;
  if(typeof oldEdit==='function'){
    window.editMovie=function(id){
      oldEdit(id);
      const x=(items||[]).find(i=>String(i.id)===String(id));
      rating.value=clamp(x?.rating ?? 5).toFixed(1);
      paint();
    };
  }

  document.getElementById('newMovie')?.addEventListener('click',()=>setTimeout(()=>{
    if(!mid.value){rating.value='5.0';paint()}
  },0));

  const oldSubmit=form.onsubmit;
  if(typeof oldSubmit==='function'){
    form.onsubmit=async function(e){
      const wanted=clamp(rating.value);
      const existingId=mid.value;
      await oldSubmit.call(form,e);

      let itemId=existingId;
      if(!itemId){
        const posterUrl=poster.value.trim();
        if(posterUrl){
          const {data}=await db.from('idrama_items').select('id').eq('poster',posterUrl).order('created_at',{ascending:false}).limit(1).maybeSingle();
          itemId=data?.id||'';
        }
      }

      if(itemId){
        const {error}=await db.from('idrama_items').update({rating:wanted,updated_at:new Date().toISOString()}).eq('id',itemId);
        if(error){
          const msg=document.getElementById('movieMsg');
          if(msg){msg.className='msg err';msg.textContent='រក្សាទុកកម្រិតផ្កាយមិនបាន៖ '+error.message}
          return;
        }
        if(typeof loadCatalog==='function') await loadCatalog();
      }
    };
  }
})();
