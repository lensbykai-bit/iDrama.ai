const db=window.supabase.createClient('https://xiziwoquiatlpkihkdoh.supabase.co','sb_publishable_3TmqRI06OhjnXkxelxDwWQ__YsvBgXQ');
let all=[],filter='all',query='',currentMovie=null,currentOrder=null,pollTimer=null,settings={bakong_qr_url:'',payment_note:''};
const $=x=>document.getElementById(x),esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function grad(a){a=+a||340;return `linear-gradient(145deg,hsl(${a} 78% 58%),hsl(${(a+38)%360} 76% 44%))`}
function cats(x){let g=(x.genre||'').toLowerCase(),c=[x.category];if(g.includes('ស្នេហា')||g.includes('romance'))c.push('romance');if(g.includes('កើតឡើងវិញ')||g.includes('reborn'))c.push('reborn');if(g.includes('បុរាណ')||g.includes('ancient'))c.push('ancient');if(g.includes('គ្រួសារ')||g.includes('family'))c.push('family');return c}
function money(x){if(!x.paid)return 'FREE';return x.currency==='KHR'?`${Number(x.price).toLocaleString()} ៛`:`$${Number(x.price).toFixed(2)}`}
function viewsText(v){const n=Math.max(0,Number(v)||0);if(n>=1000000)return `${(n/1000000).toFixed(n>=10000000?0:1).replace('.0','')}M`;if(n>=1000)return `${(n/1000).toFixed(n>=100000?0:1).replace('.0','')}K`;return n.toLocaleString()}
function ratingValue(v){const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(5,n)):5}
function ratingStars(v){const r=ratingValue(v),full=Math.max(0,Math.min(5,Math.round(r)));return `${'★'.repeat(full)}${'☆'.repeat(5-full)}`}
function categoryLabel(v){return v==='ai'?'រឿង AI':v==='live'?'រឿងមនុស្ស':v==='anime'?'រឿងគំនូរ':'រឿង'}
function genreList(v){return String(v||'').split(/[,/•|]+/).map(s=>s.trim()).filter(Boolean).slice(0,3)}
function posterMarkup(x,detail=false){if(x.poster&&/^https?:\/\//i.test(x.poster))return `<img src="${esc(x.poster)}" loading="lazy" alt="${esc(x.title)}">`;return `<div class="fill${detail?' detail-fill':''}" style="background:${grad(x.accent)}"><div class="word">${esc(x.word||'DRAMA')}</div></div>`}
function card(x){return `<article class="card" data-id="${x.id}"><div class="poster">${posterMarkup(x)}<span class="poster-star" title="ពេញនិយម">★</span></div><div class="card-info"><h3 title="${esc(x.title)}">${esc(x.title)}</h3><div class="card-bottom"><div class="card-meta"><span class="views"><span class="eye">◉</span>${viewsText(x.views)} មើល</span></div><b class="price-pill ${x.paid?'':'free-price'}">${money(x)}</b></div></div></article>`}
function render(){let list=all.filter(x=>(filter==='all'||x.cats.includes(filter))&&x.title.toLowerCase().includes(query.toLowerCase()));$('grid').innerHTML=list.map(card).join('');$('empty').style.display=list.length?'none':'block';$('empty').textContent='រកមិនឃើញរឿងដែលត្រូវនឹងការស្វែងរកទេ។';document.querySelectorAll('[data-id]').forEach(e=>e.onclick=()=>openDrama(e.dataset.id))}
async function load(){let [a,s]=await Promise.all([db.from('idrama_items').select('*').eq('published',true).order('featured',{ascending:false}).order('created_at',{ascending:false}),db.from('site_settings').select('bakong_qr_url,payment_note').eq('id',1).maybeSingle()]);if(a.error){$('empty').textContent='មិនអាចទាញយកទិន្នន័យបាន';return}if(s.data)settings=s.data;all=(a.data||[]).map(x=>({...x,cats:cats(x)}));render();if(typeof window.renderFeaturedHero==='function')window.renderFeaturedHero(all)}
async function getEpisodes(itemId){let {data,error}=await db.from('idrama_episodes').select('id,number,preview,published').eq('item_id',itemId).eq('published',true).order('number');return error?[]:(data||[])}
async function getSource(episodeId){if(!episodeId)return '';let {data}=await db.from('idrama_episode_sources').select('video_url').eq('episode_id',episodeId).maybeSingle();return data?.video_url||''}
async function getFreeTelegramLink(itemId){let eps=await getEpisodes(itemId),full=eps.filter(e=>!e.preview);if(!full.length)return '';let ids=full.map(e=>e.id);let {data}=await db.from('idrama_episode_sources').select('episode_id,video_url').in('episode_id',ids);let row=(data||[]).find(x=>/^(https?:\/\/)?(t\.me|telegram\.me|telegram\.dog)\//i.test(x.video_url||'')||/^tg:\/\//i.test(x.video_url||''));return row?.video_url||''}
function showBuyButton(x){$('buybox').className='buybox';$('buybox').innerHTML=`<div class="purchase-copy"><span class="purchase-label">តម្លៃរឿងពេញ</span><b>${money(x)}</b><small>ទូទាត់ជាមួយ KHQR រួចនឹងទម្លាក់លីង រឿងពេញតែម្តង</small></div><button id="buyBtn" class="btn pink purchase-btn"><span class="cart-icon">🛒</span> ទិញរឿងពេញ</button>`;$('buyBtn').onclick=()=>startPurchase(x)}
function renderDetailThumbs(x){
  const host=$('detailThumbs');if(!host)return;
  const others=all.filter(m=>String(m.id)!==String(x.id)).slice(0,3);
  const picks=[x,...others];
  host.innerHTML=`<button class="thumb-arrow" type="button" aria-label="ថយក្រោយ">‹</button>${picks.map((m,i)=>`<button class="poster-thumb ${i===0?'active':''}" type="button" data-thumb-id="${m.id}" title="${esc(m.title)}">${posterMarkup(m)}</button>`).join('')}<button class="thumb-arrow" type="button" aria-label="បន្ទាប់">›</button>`;
  host.querySelectorAll('[data-thumb-id]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();openDrama(btn.dataset.thumbId)});
  const arrows=host.querySelectorAll('.thumb-arrow');
  arrows.forEach((btn,i)=>btn.onclick=e=>{e.stopPropagation();host.scrollBy({left:i===0?-180:180,behavior:'smooth'})});
}
function renderDetailMeta(x){
  const rating=ratingValue(x.rating),genres=genreList(x.genre),type=categoryLabel(x.category);
  $('detailKicker').textContent=x.category==='ai'?'♛ រឿងភាគ AI':'✦ '+type;
  $('detailMeta').innerHTML=`
    <span class="meta-chip rating-chip"><span class="meta-stars">${ratingStars(rating)}</span><b>${rating.toFixed(1)}</b></span>
    <span class="meta-chip">👁 ${viewsText(x.views)} មើល</span>
    <span class="meta-chip">💳 KHQR</span>
    <span class="meta-chip accent-chip">🎬 ${esc(type)}</span>
    ${genres.map(g=>`<span class="meta-chip">${esc(g)}</span>`).join('')}`;
  const primaryGenre=genres.join(' · ')||'មិនទាន់កំណត់';
  $('detailInfo').innerHTML=`
    <div class="info-tile"><span class="info-icon">★</span><div><b>${rating.toFixed(1)}/5</b><small>កម្រិតផ្កាយ</small></div></div>
    <div class="info-tile"><span class="info-icon">◉</span><div><b>${viewsText(x.views)}</b><small>ចំនួនអ្នកមើល</small></div></div>
    <div class="info-tile"><span class="info-icon">▣</span><div><b>KHQR</b><small>ទូទាត់</small></div></div>
    <div class="info-tile"><span class="info-icon">🎬</span><div><b>${esc(type)}</b><small>ប្រភេទរឿង</small></div></div>
    <div class="info-tile genre-tile"><span class="info-icon">♥</span><div><b>${esc(primaryGenre)}</b><small>Genre</small></div></div>`;
}
async function openDrama(id){
  let x=all.find(i=>String(i.id)===String(id));if(!x)return;
  currentMovie=x;$('dt').textContent=x.title;$('detailPoster').innerHTML=posterMarkup(x,true);$('story').textContent=(x.description||'').trim()||'មិនទាន់មានសេចក្ដីសង្ខេបសាច់រឿងទេ។';
  renderDetailMeta(x);renderDetailThumbs(x);
  const backdrop=$('movieBackdrop');
  if(backdrop){if(x.poster&&/^https?:\/\//i.test(x.poster)){backdrop.style.backgroundImage=`url("${String(x.poster).replace(/"/g,'%22')}")`;backdrop.style.backgroundColor=''}else{backdrop.style.backgroundImage='none';backdrop.style.background=grad(x.accent)}}
  const posterAction=$('posterAction');
  if(posterAction){posterAction.innerHTML=x.paid?'<span>▶</span> មើល / ទិញរឿងពេញ':'<span>▶</span> មើលរឿងពេញ';posterAction.onclick=async()=>{if(x.paid){if(typeof window.startPurchase==='function')window.startPurchase(x)}else{const tg=await getFreeTelegramLink(x.id);if(tg)window.open(tg,'_blank','noopener,noreferrer')}}}
  $('buybox').className='buybox';$('buybox').innerHTML='<div class="loadingline">កំពុងរៀបចំ...</div>';$('movieModal').classList.add('show');document.body.style.overflow='hidden';
  if(!x.paid){let tg=await getFreeTelegramLink(x.id);$('buybox').className='buybox owned';$('buybox').innerHTML=tg?`<div class="purchase-copy"><span class="purchase-label">រឿងឥតគិតថ្លៃ</span><b>FREE ✓</b><small>បើករឿងពេញក្នុង Telegram</small></div><a class="btn telegram purchase-btn" href="${esc(tg)}" target="_blank" rel="noopener noreferrer">បើក Telegram</a>`:`<div class="purchase-copy"><b>FREE</b><small>Telegram Link មិនទាន់បានដាក់សម្រាប់រឿងនេះទេ។</small></div>`;return}
  if(typeof window.renderGuestPurchaseState==='function'){await window.renderGuestPurchaseState(x)}else showBuyButton(x)
}
function closeMovie(){$('movieModal').classList.remove('show');document.body.style.overflow=''}
$('movieClose').onclick=closeMovie;
$('payClose').onclick=()=>{clearInterval(pollTimer);$('payModal').classList.remove('show')};
document.addEventListener('click',e=>{let b=e.target.closest('[data-f]');if(b){filter=b.dataset.f;document.querySelectorAll('[data-f]').forEach(x=>x.classList.toggle('active',x.dataset.f===filter));render()}});$('q').oninput=e=>{query=e.target.value.trim();render()};$('movieModal').onclick=e=>{if(e.target.id==='movieModal')closeMovie()};$('payModal').onclick=e=>{if(e.target.id==='payModal')$('payModal').classList.remove('show')};document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMovie();$('payModal').classList.remove('show')}});
load();
