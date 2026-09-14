// Always show a clear price label on every movie card.
(function(){
  if(typeof card!=='function') return;
  const displayPrice=(x)=>{
    if(x.paid){
      return x.currency==='KHR'
        ? `${Number(x.price||0).toLocaleString()} ៛`
        : `$${Number(x.price||0).toFixed(2)}`;
    }
    return 'FREE';
  };

  card=function(x){
    const poster=x.poster&&/^https?:\/\//i.test(x.poster)
      ? `<img src="${esc(x.poster)}" loading="lazy" alt="${esc(x.title)}">`
      : `<div class="fill" style="background:${grad(x.accent)}"><div class="word">${esc(x.word||'DRAMA')}</div></div>`;
    const price=displayPrice(x);
    return `<article class="card" data-id="${x.id}">
      <div class="poster">
        ${poster}
        <span class="badge">${x.eps} ភាគ</span>
        <span class="price ${x.paid?'':'free'}">${price}</span>
      </div>
      <h3>${esc(x.title)}</h3>
      <div class="meta">${esc(({ai:'AI Drama',live:'រឿងមនុស្ស',anime:'រឿងគំនូរ'})[x.category]||x.category)}${x.genre?' · '+esc(x.genre):''}</div>
      <div class="card-price">តម្លៃ: <b>${price}</b></div>
    </article>`;
  };

  const style=document.createElement('style');
  style.textContent=`
    .price.free{background:#168a67d9;color:#fff}
    .card-price{font-family:Battambang;margin-top:5px;font-size:12px;color:#aeb8c7}
    .card-price b{color:#ff8da7;font-size:13px}
  `;
  document.head.appendChild(style);

  // Re-render after this enhancement loads.
  try{ if(typeof render==='function') render(); }catch(e){}
})();
