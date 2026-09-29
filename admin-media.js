// Poster + Trailer upload + Telegram management for iDrama.ai Admin.
(function(){
  const posterInput=document.getElementById('posterFile');
  const posterHidden=document.getElementById('poster');
  const posterPreview=document.getElementById('posterPreview');
  const posterPreviewWrap=document.getElementById('posterPreviewWrap');
  const telegramInput=document.getElementById('telegramUrl');
  if(!posterInput||!posterHidden||!telegramInput||typeof db==='undefined') return;

  const POSTER_BUCKET='idrama-posters';
  const TRAILER_BUCKET='idrama-trailers';
  const MAX_POSTER_BYTES=8*1024*1024;
  const MAX_TRAILER_BYTES=50*1024*1024;
  const allowedImageTypes=new Set(['image/jpeg','image/png','image/webp','image/gif']);
  const allowedVideoTypes=new Set(['video/mp4','video/webm','video/quicktime']);
  const telegramRe=/^(https?:\/\/)?(t\.me|telegram\.me|telegram\.dog)\//i;
  const tgScheme=/^tg:\/\//i;
  let previewObjectUrl='';

  function mediaFor(itemId){
    const list=(episodes||[]).filter(e=>String(e.item_id)===String(itemId));
    const full=list.find(e=>!e.preview);
    const trailer=list.find(e=>e.preview===true);
    return {
      fullEpisode:full||null,
      telegramUrl:full?(sources[full.id]||''):'',
      trailerEpisode:trailer||null,
      trailerUrl:trailer?(sources[trailer.id]||''):''
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
    if(!allowedImageTypes.has(file.type)){
      posterInput.value='';
      $('movieMsg').className='msg err';
      $('movieMsg').textContent='សូមជ្រើសរូប JPG, PNG, WEBP ឬ GIF ប៉ុណ្ណោះ។';
      return;
    }
    if(file.size>MAX_POSTER_BYTES){
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
    if(!allowedImageTypes.has(file.type)) throw new Error('សូមប្រើ JPG, PNG, WEBP ឬ GIF។');
    if(file.size>MAX_POSTER_BYTES) throw new Error('រូបភាពមិនអាចលើស 8MB បានទេ។');
    const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type]||'jpg';
    const path=`${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from(POSTER_BUCKET).upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false});
    if(error) throw error;
    const {data}=db.storage.from(POSTER_BUCKET).getPublicUrl(path);
    if(!data?.publicUrl) throw new Error('មិនអាចទទួល URL រូបភាពបាន។');
    return data.publicUrl;
  }

  async function uploadTrailer(file){
    if(!allowedVideoTypes.has(file.type)) throw new Error('Trailer ត្រូវជា MP4, WEBM ឬ MOV។');
    if(file.size>MAX_TRAILER_BYTES) throw new Error('Trailer មិនអាចលើស 50MB បានទេ។');
    const ext=({'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'})[file.type]||'mp4';
    const path=`${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from(TRAILER_BUCKET).upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false});
    if(error) throw error;
    const {data}=db.storage.from(TRAILER_BUCKET).getPublicUrl(path);
    if(!data?.publicUrl) throw new Error('មិនអាចទទួល URL Trailer បាន។');
    return data.publicUrl;
  }
  window.uploadTrailerVideo=uploadTrailer;

  async function saveTrailer(itemId,url){
    const clean=(url||'').trim();
    if(!clean) return;
    const current=mediaFor(itemId);
    const ep=current.trailerEpisode;
    const now=new Date().toISOString();
    if(ep){
      const er=await db.from('idrama_episodes').update({title:'Trailer',preview:true,published:true,duration:'',updated_at:now}).eq('id',ep.id);
      if(er.error) throw er.error;
      const sr=await db.from('idrama_episode_sources').upsert({episode_id:ep.id,video_url:clean,updated_at:now});
      if(sr.error) throw sr.error;
      return;
    }
    const list=(episodes||[]).filter(e=>String(e.item_id)===String(itemId));
    const nextNumber=Math.max(0,...list.map(e=>Number(e.number)||0))+1;
    const r=await db.from('idrama_episodes').insert({item_id:itemId,number:nextNumber||1,title:'Trailer',duration:'',preview:true,published:true,updated_at:now}).select('id').single();
    if(r.error) throw r.error;
    const sr=await db.from('idrama_episode_sources').upsert({episode_id:r.data.id,video_url:clean,updated_at:now});
    if(sr.error) throw sr.error;
  }
  window.saveTrailerForMovie=saveTrailer;

  async function saveTelegram(itemId,url){
    const clean=(url||'').trim();
    const current=mediaFor(itemId);
    const ep=current.fullEpisode;
    const now=new Date().toISOString();

    if(ep){
      const er=await db.from('idrama_episodes').update({title:'Telegram Full Movie',preview:false,published:!!clean,duration:'',updated_at:now}).eq('id',ep.id);
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
    const r=await db.from('idrama_episodes').insert({item_id:itemId,number:nextNumber||1,title:'Telegram Full Movie',duration:'',preview:false,published:true,updated_at:now}).select('id').single();
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
    const tf=document.getElementById('trailerFile');
    if(tf) tf.value='';
    if(typeof window.setMainTrailerStatus==='function') window.setMainTrailerStatus('');
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
    const tf=document.getElementById('trailerFile');
    if(tf) tf.value='';
    if(typeof window.setMainTrailerStatus==='function') window.setMainTrailerStatus(media.trailerUrl||'');
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

      const trailerFile=document.getElementById('trailerFile')?.files?.[0]||null;
      if(trailerFile){
        if(!allowedVideoTypes.has(trailerFile.type)) throw new Error('Trailer ត្រូវជា MP4, WEBM ឬ MOV។');
        if(trailerFile.size>MAX_TRAILER_BYTES) throw new Error('Trailer មិនអាចលើស 50MB បានទេ។');
      }

      const payload={
        title:$('title').value.trim(),category:$('category').value,genre:$('genre').value.trim(),poster:posterUrl,
        word:$('word').value.trim()||'DRAMA',accent:+$('accent').value||340,views:+$('views').value||0,
        description:$('description').value.trim(),paid:$('paid').checked,price:+$('price').value||0,currency:$('currency').value,
        featured:$('featured').checked,published:$('published').checked,updated_at:new Date().toISOString()
      };

      const existingId=$('mid').value;
      let result;
      if(existingId) result=await db.from('idrama_items').update(payload).eq('id',existingId).select('id').single();
      else result=await db.from('idrama_items').insert(payload).select('id').single();
      if(result.error) throw result.error;
      const itemId=existingId||result.data.id;

      await loadCatalog();
      if(trailerFile){
        $('movieMsg').textContent='កំពុង Upload Trailer...';
        const trailerUrl=await uploadTrailer(trailerFile);
        await saveTrailer(itemId,trailerUrl);
      }
      await saveTelegram(itemId,telegram);
      await loadCatalog();
      $('movieMsg').className='msg';
      $('movieMsg').textContent=trailerFile?'រក្សាទុក Poster, Trailer, តម្លៃ និង Telegram Link រួចរាល់ ✓':'រក្សាទុក Poster, តម្លៃ និង Telegram Link រួចរាល់ ✓';
      setTimeout(()=>$('movieFormWrap').classList.add('hide'),650);
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
      const trailerStatus=media.trailerUrl?'Trailer ✓':'No Trailer';
      return `<div class="row">
        ${x.poster?`<img class="thumb" src="${esc(x.poster)}" alt="">`:`<div class="thumb" style="background:${grad(x.accent)}"></div>`}
        <div><h3>${esc(x.title)}</h3><div class="meta">${x.paid?money(x):'FREE'} · Poster ✓ · ${trailerStatus} · ${telegramStatus} ${x.published?'':'· Hidden'}</div></div>
        <div class="r"><button class="btn soft" data-edit="${x.id}">កែ</button><button class="btn danger" data-del="${x.id}">លុប</button></div>
      </div>`;
    }).join('')||'<div class="muted">មិនទាន់មានរឿងទេ</div>';
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editMovie(b.dataset.edit));
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>delMovie(b.dataset.del));
  };

  try{if(items?.length)renderMovies()}catch(_e){}
})();