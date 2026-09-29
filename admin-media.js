// Simplified Poster + Trailer + Telegram management for iDrama.ai Admin
(function(){
  const trailerInput=document.getElementById('trailerUrl');
  const telegramInput=document.getElementById('telegramUrl');
  if(!trailerInput||!telegramInput||typeof db==='undefined') return;

  const telegramRe=/^(https?:\/\/)?(t\.me|telegram\.me|telegram\.dog)\//i;
  const tgScheme=/^tg:\/\//i;

  function mediaFor(itemId){
    const list=(episodes||[]).filter(e=>String(e.item_id)===String(itemId));
    const trailer=list.find(e=>e.preview);
    const full=list.find(e=>!e.preview);
    return {
      trailerEpisode:trailer||null,
      fullEpisode:full||null,
      trailerUrl:trailer?(sources[trailer.id]||''):'',
      telegramUrl:full?(sources[full.id]||''):''
    };
  }

  async function saveMedia(itemId,kind,url){
    const isTrailer=kind==='trailer';
    const current=mediaFor(itemId);
    let ep=isTrailer?current.trailerEpisode:current.fullEpisode;
    const clean=(url||'').trim();
    const now=new Date().toISOString();

    if(ep){
      const update={
        title:isTrailer?'Trailer':'Telegram Full Movie',
        preview:isTrailer,
        published:!!clean,
        duration:isTrailer?(ep.duration||'00:30'):'',
        updated_at:now
      };
      const er=await db.from('idrama_episodes').update(update).eq('id',ep.id);
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
    const r=await db.from('idrama_episodes').insert({
      item_id:itemId,
      number:isTrailer?1:2,
      title:isTrailer?'Trailer':'Telegram Full Movie',
      duration:isTrailer?'00:30':'',
      preview:isTrailer,
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
    trailerInput.value='';
    telegramInput.value='';
  };

  editMovie=function(id){
    const x=items.find(i=>String(i.id)===String(id));
    if(!x) return;
    const media=mediaFor(id);
    $('mid').value=x.id;
    $('title').value=x.title||'';
    $('category').value=x.category||'ai';
    $('genre').value=x.genre||'';
    $('poster').value=x.poster||'';
    $('word').value=x.word||'DRAMA';
    $('accent').value=x.accent||340;
    $('views').value=x.views||0;
    $('description').value=x.description||'';
    $('paid').checked=!!x.paid;
    $('price').value=x.price||0;
    $('currency').value=x.currency||'USD';
    $('featured').checked=!!x.featured;
    $('published').checked=!!x.published;
    trailerInput.value=media.trailerUrl||'';
    telegramInput.value=media.telegramUrl||'';
    $('movieFormWrap').classList.remove('hide');
    window.scrollTo({top:90,behavior:'smooth'});
  };

  $('movieForm').onsubmit=async e=>{
    e.preventDefault();
    $('movieMsg').className='msg';
    $('movieMsg').textContent='កំពុងរក្សាទុក...';

    const trailer=trailerInput.value.trim();
    const telegram=telegramInput.value.trim();
    if(telegram && !telegramRe.test(telegram) && !tgScheme.test(telegram)){
      $('movieMsg').className='msg err';
      $('movieMsg').textContent='Telegram Link ត្រូវចាប់ផ្តើមដោយ https://t.me/... ឬ tg://...';
      return;
    }

    const payload={
      title:$('title').value.trim(),
      category:$('category').value,
      genre:$('genre').value.trim(),
      poster:$('poster').value.trim(),
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
    let itemId=existingId;
    let result;
    if(existingId){
      result=await db.from('idrama_items').update(payload).eq('id',existingId).select('id').single();
    }else{
      result=await db.from('idrama_items').insert(payload).select('id').single();
    }
    if(result.error){
      $('movieMsg').className='msg err';
      $('movieMsg').textContent=result.error.message;
      return;
    }
    itemId=itemId||result.data.id;

    try{
      // Refresh first so mediaFor() sees any existing rows after an item save.
      await loadCatalog();
      await saveMedia(itemId,'trailer',trailer);
      await loadCatalog();
      await saveMedia(itemId,'telegram',telegram);
      await loadCatalog();
      $('movieMsg').className='msg';
      $('movieMsg').textContent='រក្សាទុក Poster, Trailer, តម្លៃ និង Telegram Link រួចរាល់ ✓';
      setTimeout(()=>$('movieFormWrap').classList.add('hide'),450);
    }catch(err){
      $('movieMsg').className='msg err';
      $('movieMsg').textContent='រក្សាទុក Media មិនបាន៖ '+(err?.message||String(err));
    }
  };

  renderMovies=function(){
    const q=$('search').value.toLowerCase();
    const list=items.filter(x=>(x.title||'').toLowerCase().includes(q));
    $('movieList').innerHTML=list.map(x=>{
      const media=mediaFor(x.id);
      const trailerStatus=media.trailerUrl?'Trailer ✓':'No Trailer';
      const telegramStatus=media.telegramUrl?'Telegram ✓':'No Telegram';
      return `<div class="row">
        ${x.poster?`<img class="thumb" src="${esc(x.poster)}" alt="">`:`<div class="thumb" style="background:${grad(x.accent)}"></div>`}
        <div>
          <h3>${esc(x.title)}</h3>
          <div class="meta">${x.paid?money(x):'FREE'} · ${trailerStatus} · ${telegramStatus} ${x.published?'':'· Hidden'}</div>
        </div>
        <div class="r">
          <button class="btn soft" data-edit="${x.id}">កែ</button>
          <button class="btn dark" data-ep="${x.id}">Media Advanced</button>
          <button class="btn danger" data-del="${x.id}">លុប</button>
        </div>
      </div>`;
    }).join('')||'<div class="muted">មិនទាន់មានរឿងទេ</div>';
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editMovie(b.dataset.edit));
    document.querySelectorAll('[data-ep]').forEach(b=>b.onclick=()=>{show('eps');$('movieSelect').value=b.dataset.ep;renderEps()});
    document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>delMovie(b.dataset.del));
  };

  // Re-render if the catalog is already loaded.
  try{ if(items?.length) renderMovies(); }catch(_e){}
})();
