// Dynamic featured banner for iDrama.ai.
(function(){
  const htmlEscape=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const compactViews=v=>{const n=Math.max(0,Number(v)||0);if(n>=1000000)return `${(n/1000000).toFixed(n>=10000000?0:1).replace('.0','')}M`;if(n>=1000)return `${(n/1000).toFixed(n>=100000?0:1).replace('.0','')}K`;return n.toLocaleString()};
  const priceText=x=>!x.paid?'FREE':x.currency==='KHR'?`${Number(x.price||0).toLocaleString()} ៛`:`$${Number(x.price||0).toFixed(2)}`;
  const rating=v=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(5,n)):5};

  window.renderFeaturedHero=function(list){
    const hero=document.querySelector('.hero');
    if(!hero||!Array.isArray(list)||!list.length)return;
    const featured=list.filter(x=>x&&x.published!==false&&x.featured===true);
    const pool=(featured.length?featured:list.filter(x=>x&&x.published!==false)).slice();
    const movie=pool.sort((a,b)=>(Number(b.views)||0)-(Number(a.views)||0))[0];
    if(!movie)return;

    const r=rating(movie.rating);
    const poster=movie.poster&&/^https?:\/\//i.test(movie.poster)?movie.poster:'';
    const desc=(movie.description||'').trim()||'រឿងពេញនិយមដែលកំពុងមានអ្នកចាប់អារម្មណ៍។ ចុចមើលព័ត៌មានរឿង និងតម្លៃបានភ្លាមៗ។';
    const genre=(movie.genre||'').trim();
    hero.classList.add('featured-hero');
    hero.innerHTML=`
      <div class="featured-bg" aria-hidden="true"></div>
      <div class="featured-shade" aria-hidden="true"></div>
      <div class="featured-content">
        <div class="featured-copy">
          <div class="featured-label">★ រឿងពេញនិយម</div>
          <h1 class="featured-title">${htmlEscape(movie.title)}</h1>
          <p class="featured-description">${htmlEscape(desc)}</p>
          <div class="featured-meta">
            <span class="featured-chip stars">★★★★★ ${r.toFixed(1)}</span>
            <span class="featured-chip">👁 ${compactViews(movie.views)} មើល</span>
            ${genre?`<span class="featured-chip">${htmlEscape(genre)}</span>`:''}
            <span class="featured-chip price">${priceText(movie)}</span>
          </div>
          <div class="featured-actions">
            <button id="featuredOpen" class="btn pink featured-open" type="button">មើលព័ត៌មានរឿង</button>
            <button id="featuredBrowse" class="featured-secondary" type="button">មើលរឿងទាំងអស់</button>
          </div>
        </div>
        <div class="featured-poster-wrap">
          <div class="featured-poster-glow"></div>
          <div class="featured-poster"><div id="featuredPoster" class="featured-poster-inner"></div></div>
        </div>
      </div>`;

    const bg=hero.querySelector('.featured-bg');
    if(poster){bg.style.backgroundImage=`url("${poster.replace(/"/g,'%22')}")`;hero.querySelector('#featuredPoster').innerHTML=`<img src="${htmlEscape(poster)}" alt="${htmlEscape(movie.title)}">`}
    else{bg.style.background='linear-gradient(135deg,#4a1728,#1a2130)';hero.querySelector('#featuredPoster').innerHTML=`<div class="fill" style="background:linear-gradient(145deg,#ff566f,#5c376e)"><div class="word">${htmlEscape(movie.word||'DRAMA')}</div></div>`}
    hero.querySelector('#featuredOpen').onclick=()=>{if(typeof openDrama==='function')openDrama(movie.id)};
    hero.querySelector('#featuredBrowse').onclick=()=>document.querySelector('.sec')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
})();