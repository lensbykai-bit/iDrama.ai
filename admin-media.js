// Poster upload + Telegram management for iDrama.ai Admin.
// Existing trailer rows are intentionally left untouched.
(function(){
  const posterInput=document.getElementById('posterFile');
  const posterHidden=document.getElementById('poster');
  const posterPreview=document.getElementById('posterPreview');
  const posterPreviewWrap=document.getElementById('posterPreviewWrap');
  const telegramInput=document.getElementById('telegramUrl');
  if(!posterInput||!posterHidden||!telegramInput||typeof db==='undefined') return;

  const BUCKET='idrama-posters';
  const MAX_BYTES=8*1024*1024;
  const allowedTypes=new Set(['image/jpeg','image/png','image/webp','image/gif']);
  const telegramRe=/^(https?:\/\/)?(t\.me|telegram\.me|telegram\.dog)\//i;
  const tgScheme=/^tg:\/\//i;
  let previewObjectUrl='';

  function mediaFor(itemId){
    const list=(episodes||[]).filter(e=>String(e.item_id)===String(itemId));
    const full=list.find(e=>!e.preview);
    return {
      fullEpisode:full||null,
      telegramUrl:full?(sources[full.id]||''):''
    };
  }

  function showPoster(url){
    if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=''}
    if(url){
      posterPreview.src=url;
      posterPreviewWrap.style.display='block';
    }else{
      posterPreview.removeAttribute('src');
      posterPreviewWrap.style.display='none';
    }
  }

  posterInput.addEventListener('change',()=>{
    const file=posterInput.files?.[0];
    if(!file){showPoster(posterHidden.value.trim());return}
    if(!allowedTypes.has(file.type)){
      posterInput.value='';
      $('movieMsg').className='msg err';
      $('movieMsg').textContent='សូមជ្រើសរូប JPG, PNG, WEBP ឬ GIF ប៉ុណ្ណោះ។';
      return;
    }
    if(file.size>MAX_BYTES){
      posterInput.value='';
      $('movieMsg').className='msg err';
      $('movieMsg').textContent='រូបភាពធំពេក។ សូមប្រើរូបមិនលើស 8MB។';
      return;
    }
    previewObjectUrl=URL.createObjectURL(file);
    posterPreview.src=previewObjectUrl;
    posterPreviewWrap.style.display='block';
  });

  async function uploadPoster(file){
    if(!allowedTypes.has(file.type)) throw new Error('សូមប្រើ JPG, PNG, WEBP ឬ GIF។');
    if(file.size>MAX_BYTES) throw new Error('រូបភាពមិនអាចលើស 8MB បានទេ។');
    const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type]||'jpg';
    const path=`${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from(BUCKET).upload(path,file,{
      cacheControl:'31536000',
      contentType:file.type,
      upsert:false
    });
    if(error) throw error;
    const {data}=db.storage.from(BUCKET).getPublicUrl(path);
    if(!data?.publicUrl) throw new Error('មិនអាចទទួល URL រូបភាពបាន។');
    return data.publicUrl;
  }

  async function saveTelegram(itemId,url){
    const clean=(url||'').trim();
    const current=mediaFor(itemId);
    const ep=current.fullEpisode;
    const now=new Date().toISOString();

    if(ep){
      const er=await db.from('idrama_episodes').update({
        title:'Telegram Full Movie',
        preview:false,
        published:!!clean,
        duration:'',
        updated_at:now
      }).eq('id',ep.id);
      if(er.error) throw er.error;
      if(clean){
        const sr=await db.from('idrama_episode_sources').upsert({episode_id:ep.id,video_url:clean,updated_at:now});
        if(sr.error) throw sr.error;
      }else{
        const sr=await db.from('idrama_episode_sources').delete().eq('episode_id',ep.id);
        if(sr.error) throw sr.error;
      }
      return;
    }

    if(!clean) return;
    const list=(episodes||[]).filter(e=>String(e.item_id)===String(itemId));
    const nextNumber=Math.max(0,...list.map(e=>Number(e.number)||0))+1;
    const r=await db.from('idrama_episodes').insert({
      item_id:itemId,
      number:nextNumber||1,
      title:'Telegram Full Movie',
      duration:'',
      preview:false,
      published:true,
      updated_at:now
    }).select('id').single();
    if(r.error) throw r.error;
    const sr=await db.from('idrama_episode_sources').upsert({episode_id:r.data.id,video_url:clean,updated_at:now});
    if(sr.error) throw sr.error;
  }

  const originalReset=resetMovie;
  resetMovie=function(){
    originalReset();
    posterInput.value='';
    posterHidden.value='';
    telegramInput.value='';
    showPoster('');
  };

  editMovie=function(id){
    const x=items.find(i=>String(i.id)===String(id));
    if(!x) return;
    const media=mediaFor(id);
    $('mid').value=x.id;
    $('title').value=x.title||'';
    $('category').value=x.category||'ai';
    $('genre').value=x.genre||'';
    posterHidden.value=x.poster||'';
    posterInput.value='';
    showPoster(x.poster||'');
    $('word').value=x.word||'DRAMA';
    $('accent').value=x.accent||340;
    $('views').value=x.views||0;
    $('description').value=x.description||'';
    $('paid').checked=!!x.paid;
    $('price').value=x.price||0;
    $('currency').value=x.currency||'USD';
    $('featured').checked=!!x.featured;
    $('published').checked=!!x.published;
    telegramInput.value=media.telegramUrl||'';
    $('movieMsg').className='msg';
    $('movieMsg').textContent='';
    $('movieFormWrap').classList.remove('hide');
    window.scrollTo({top:90,behavior:'smooth'});
  };

  $('movieForm').onsubmit=async e=>{
    e.preventDefault();
    $('movieMsg').className='msg';
    $('movieMsg').textContent='កំពុងរក្សាទុក...';

    const telegram=telegramInput.value.trim();
    if(telegram && !telegramRe.test(telegram) && !tgScheme.test(telegram)){
      $('movieMsg').className='msg err';
      $('movieMsg').textContent='Telegram Link ត្រូវចាប់ផ្តើមដោយ https://t.me/... ឬ tg://...';
      return;
    }

    try{
      let posterUrl=posterHidden.value.trim();
      const file=posterInput.files?.[0];
      if(file){
        $('movieMsg').textContent='កំពុង Upload Poster...';
        posterUrl=await uploadPoster(file);
        posterHidden.value=posterUrl;
      }
      if(!posterUrl){
        $('movieMsg').className='msg err';
        $('movieMsg').textContent='សូម Upload Poster មុនពេលរក្សាទុក។';
        return;
      }

      const payload={
        title:$('title').value.trim(),
        category:$('category').value,
        genre:$('genre').value.trim(),
        poster:posterUrl,
        word:$('word').value.trim()||'DRAMA',
        accent:+$('accent').value||340,
        views:+$('views').value||0,
        description:$('description').value.trim(),
        paid:$('paid').checked,
        price:+$('price').value||0,
        currency:$('currency').value,
        featured:$('featured').checked,
        published:$('published').checked,
        updated_at:new Date().toISOString()
      };

      const existingId=$('mid').value;
      let result;
      if(existingId){
        result=await db.from('idrama_items').update(payload).eq('id',existingId).select('id').single();
      }else{
        result=await db.from('idrama_items').insert(payload).select('id').single();
      }
      if(result.error) throw result.error;
      const itemId=existingId||result.data.id;

      // Important: do not create, edit or delete legacy trailer rows here.
      await loadCatalog();
      await saveTelegram(itemId,telegram);
      await loadCatalog();
      $('movieMsg').className='msg';
      $('movieMsg').textContent='រក្សាទុក Poster, តម្លៃ និង Telegram Link រួចរាល់ ✓';
      setTimeout(()=>$('movieFormWrap').classList.add('hide'),500);
    }catch(err){
      $('movieMsg').className='msg err';
      $('movieMsg').textContent='រក្សាទុកមិនបាន៖ '+(err?.message||String(err));
    }
  };

  renderMovies=function(){
    const q=$('search').value.toLowerCase();
    const list=items.filter(x=>(x.title||'').toLowerCase().includes(q));
    $('movieList').innerHTML=list.map(x=>{
      const media=mediaFor(x.id);
      const telegramStatus=media.telegramUrl?'Telegram ✓':'No Telegram';
      return `<div class="row">
        ${x.poster?`<img class="thumb" src="${esc(x.poster)}" alt="">`:`<div class="thumb" style="background:${grad(x.accent)}"></div>`}
        <div>
          <h3>${esc(x.title)}</h3>
          <div class="meta">${x.paid?money(x):'FREE'} · Poster ✓ · ${telegramStatus} ${x.published?'':'· Hidden'}</div>
        </div>
        <div class="r">
          <button class="btn soft" data-edit="${x.id}">កែ</button>
          <button class="btn danger" data-del="${x.id}">លុប</button>
        </div>
      </div>`;
    }).join('')||'<div class="muted">មិនទាន់មានរឿងទេ</div>';
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editMovie(b.dataset.edit));
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>delMovie(b.dataset.del));
  };

  try{if(items?.length)renderMovies()}catch(_e){}
})();
