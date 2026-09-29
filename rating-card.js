// Five-star rating display for iDrama.ai movie cards.
(function(){
  function clampRating(value){
    const n=Number(value);
    if(!Number.isFinite(n)) return 5;
    return Math.max(0,Math.min(5,n));
  }

  function ratingMarkup(value){
    const rating=clampRating(value);
    const fill=(rating/5*100).toFixed(1)+'%';
    return `<div class="rating-score" title="កម្រិត ${rating.toFixed(1)} / 5">
      <span class="rating-stars" style="--rating-fill:${fill}" aria-label="${rating.toFixed(1)} out of 5 stars">
        <span class="rating-stars-base">★★★★★</span>
        <span class="rating-stars-fill">★★★★★</span>
      </span>
      <strong>${rating.toFixed(1)}</strong><small>/5</small>
    </div>`;
  }

  // Replace the old single-star card with a clean 5-star rating row.
  window.card=function(x){
    return `<article class="card" data-id="${x.id}">
      <div class="poster">${posterMarkup(x)}</div>
      <div class="card-info">
        <h3 title="${esc(x.title)}">${esc(x.title)}</h3>
        ${ratingMarkup(x.rating)}
        <div class="card-bottom">
          <div class="card-meta"><span class="views"><span class="eye">◉</span>${viewsText(x.views)} មើល</span></div>
          <b class="price-pill ${x.paid?'':'free-price'}">${money(x)}</b>
        </div>
      </div>
    </article>`;
  };

  const style=document.createElement('style');
  style.textContent=`
    .card-info{gap:8px!important}
    .rating-score{display:flex;align-items:center;gap:5px;min-height:22px;font-family:Inter,Battambang,sans-serif}
    .rating-stars{--rating-fill:100%;position:relative;display:inline-block;font-size:14px;line-height:1;letter-spacing:1.5px;white-space:nowrap}
    .rating-stars-base{color:#394253}
    .rating-stars-fill{position:absolute;left:0;top:0;width:var(--rating-fill);overflow:hidden;color:#ffc94a;white-space:nowrap;text-shadow:0 0 10px #ffc94a35}
    .rating-score strong{font-size:12px;color:#f5f7fb;margin-left:2px}
    .rating-score small{font-size:10px;color:#778397;margin-left:-3px}
    .card-bottom{margin-top:1px}
    @media(max-width:760px){.rating-stars{font-size:12px;letter-spacing:1px}.rating-score strong{font-size:11px}.rating-score small{font-size:9px}}
  `;
  document.head.appendChild(style);

  try{if(typeof render==='function') render()}catch(_e){}
})();
