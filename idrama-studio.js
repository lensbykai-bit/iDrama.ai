/* iDrama.ai Studio — public poster-and-price storefront.
 * Existing Supabase Edge Functions remain the only authority for payment.
 * Never expose paid Telegram links before a verified status from the server.
 */
(function(){
  'use strict';
  var PROJECT_URL='https://xiziwoquiatlpkihkdoh.supabase.co';
  var PUBLIC_KEY='sb_publishable_3TmqRI06OhjnXkxelxDwWQ__YsvBgXQ';
  var API=PROJECT_URL+'/functions/v1/';
  var db=null, movies=[], activeFilter='all', searchText='', activeMovie=null;
  var currentPurchase=null, pollTimer=null, checking=false, generation=0, lastFocus=null;
  var grid=document.getElementById('movieGrid');
  var state=document.getElementById('catalogState');
  var stateText=document.getElementById('catalogStateText');
  var retry=document.getElementById('catalogRetry');
  var modal=document.getElementById('checkout');
  var body=document.getElementById('checkoutBody');
  var closeBtn=document.getElementById('checkoutClose');

  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function price(item){
    if(!item.paid)return 'FREE';
    return item.currency==='KHR'?Number(item.price||0).toLocaleString()+' ៛':'$'+Number(item.price||0).toFixed(2);
  }
  function catList(item){
    var genre=String(item.genre||'').toLowerCase();
    var tags=[String(item.category||'').toLowerCase()];
    [['romance',['romance','ស្នេហា']],['reborn',['reborn','កើតឡើងវិញ']],
      ['ancient',['ancient','បុរាណ']],['family',['family','គ្រួសារ']]]
      .forEach(function(pair){if(pair[1].some(function(t){return genre.includes(t)}))tags.push(pair[0])});
    return tags;
  }
  function externalImage(url){
    try{var u=new URL(url);return ['http:','https:'].includes(u.protocol)?u.href:''}catch(e){return ''}
  }
  function telegramLink(url){
    try{
      var u=new URL(url);
      if(u.protocol==='tg:')return u.href;
      if(u.protocol==='https:'&&['t.me','www.t.me','telegram.me','telegram.dog'].includes(u.hostname.toLowerCase()))return u.href;
    }catch(e){}
    return '';
  }
  function showCatalog(message,kind,allowRetry){
    state.hidden=false;state.dataset.kind=kind||'loading';stateText.textContent=message;
    retry.hidden=!allowRetry;
  }
  function makePoster(item){
    var src=externalImage(item.poster);
    if(src)return '<img src="'+escapeHtml(src)+'" loading="lazy" alt="'+escapeHtml(item.title||'Movie poster')+'">';
    return '<span class="poster-fallback"><span>iDrama.ai</span></span>';
  }
  function makeSummary(item,order){
    var poster=externalImage(item.poster);
    var pic=poster?'<img class="checkout-poster" src="'+escapeHtml(poster)+'" alt="">':'<span class="checkout-poster fallback" aria-hidden="true">▶</span>';
    var orderCode=order&&order.order_code||order&&order.id;
    return '<div class="checkout-summary">'+pic+'<div><div class="checkout-name">'+escapeHtml(item.title)+'</div>'+
      '<div class="checkout-price">'+escapeHtml(price(item))+'</div>'+
      (orderCode?'<div class="checkout-order">ORDER: '+escapeHtml(orderCode)+'</div>':'')+'</div></div>';
  }
  function drawCards(){
    if(!grid)return;
    var found=movies.filter(function(x){
      var eligible=activeFilter==='all'||catList(x).includes(activeFilter);
      return eligible&&String(x.title||'').toLowerCase().includes(searchText);
    });
    grid.textContent='';
    var fragment=document.createDocumentFragment();
    found.forEach(function(item){
      var el=document.createElement('button');
      el.type='button';el.className='movie-card';
      el.setAttribute('aria-label',String(item.title||'រឿង')+' — '+price(item));
      el.innerHTML='<span class="poster-media">'+makePoster(item)+'</span>'+
        '<span class="poster-price-row"><span class="poster-price'+(!item.paid?' free':'')+'">'+escapeHtml(price(item))+'</span></span>';
      el.addEventListener('click',function(){openCheckout(item)});
      var img=el.querySelector('.poster-media img');
      if(img)img.addEventListener('error',function(){
        if(!img.parentNode)return;
        img.parentNode.innerHTML='<span class="poster-fallback"><span>iDrama.ai</span></span>';
      },{once:true});
      fragment.appendChild(el);
    });
    grid.appendChild(fragment);
    if(!found.length)showCatalog('មិនមានរឿងដែលត្រូវនឹងការស្វែងរកនេះទេ។','empty',false);
    else state.hidden=true;
  }
  async function loadMovies(){
    if(!db){showCatalog('មិនអាចភ្ជាប់ប្រព័ន្ធរឿងបាន។ សូមសាកម្តងទៀត។','error',true);return}
    showCatalog('កំពុងទាញយករឿង...','loading',false);
    try{
      var response=await db.from('idrama_items').select('*').eq('published',true).order('featured',{ascending:false}).order('created_at',{ascending:false});
      if(response.error)throw response.error;
      movies=Array.isArray(response.data)?response.data:[];
      drawCards();
    }catch(error){
      console.error('Catalog unavailable:',error.message);
      grid.textContent='';
      showCatalog('បញ្ជីរឿងមិនអាចដំណើរការបាននៅពេលនេះ។ សូមពិនិត្យការភ្ជាប់ Supabase។','error',true);
    }
  }
  function rememberKey(id){return 'idrama_guest_purchase_'+id}
  function getSaved(id){
    try{return JSON.parse(localStorage.getItem(rememberKey(id))||'null')}catch(e){return null}
  }
  function savePurchase(id,p){try{localStorage.setItem(rememberKey(id),JSON.stringify(p))}catch(e){}}
  function clearPurchase(id){try{localStorage.removeItem(rememberKey(id))}catch(e){}}
  function secureToken(){
    var bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
    return Array.from(bytes,function(b){return b.toString(16).padStart(2,'0')}).join('');
  }
  async function guest(action,purchase,extra){
    var endpoint=action==='telegram'?'telegram-access':'bakong-payment';
    var payload=Object.assign({action:action,guest_token:purchase.token},extra||{});
    if(purchase.order&&purchase.order.id)payload.order_id=purchase.order.id;
    var response=await fetch(API+endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:PUBLIC_KEY},body:JSON.stringify(payload)});
    var data=await response.json().catch(function(){return {}});
    if(!response.ok||data.error)throw new Error(data.error||'HTTP '+response.status);
    return data;
  }
  function setModal(content){
    body.innerHTML=content;
  }
  function statusMarkup(message,kind,loading){
    return '<div class="checkout-status'+(kind?' '+kind:'')+'">'+
      (loading?'<span class="spinner" aria-hidden="true"></span>':'')+
      '<span>'+escapeHtml(message)+'</span></div>';
  }
  function stopPolling(){if(pollTimer){clearInterval(pollTimer);pollTimer=null}checking=false}
  function closeCheckout(){
    stopPolling();generation++;activeMovie=null;currentPurchase=null;
    modal.classList.remove('open');modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('lock');
    if(lastFocus&&typeof lastFocus.focus==='function')lastFocus.focus();
  }
  function showIssue(item,message,retryFn){
    setModal(makeSummary(item,currentPurchase&&currentPurchase.order)+statusMarkup(message,'error')+
      '<div class="checkout-actions"><button type="button" class="button button-primary" id="checkoutRetry">សាកម្តងទៀត</button></div>');
    var btn=document.getElementById('checkoutRetry');
    btn.onclick=retryFn||function(){openCheckout(item)};
  }
  async function freeAccess(item,gen){
    setModal(makeSummary(item)+statusMarkup('កំពុងស្វែងរក Telegram Link...','',true));
    try{
      var eps=await db.from('idrama_episodes').select('id,preview,published').eq('item_id',item.id).eq('published',true);
      if(eps.error)throw eps.error;
      var ids=(eps.data||[]).filter(function(x){return !x.preview}).map(function(x){return x.id});
      if(!ids.length)throw new Error('NO_LINK');
      var sources=await db.from('idrama_episode_sources').select('episode_id,video_url').in('episode_id',ids);
      if(sources.error)throw sources.error;
      var tg=(sources.data||[]).map(function(x){return telegramLink(x.video_url)}).find(Boolean);
      if(gen!==generation)return;
      if(!tg)throw new Error('NO_LINK');
      setModal(makeSummary(item)+statusMarkup('រឿងនេះមើលបានឥតគិតថ្លៃ។','success')+
        '<div class="checkout-actions"><a class="access-link" target="_blank" rel="noopener noreferrer" href="'+escapeHtml(tg)+'">បើក Telegram រឿងពេញ ↗</a></div>');
    }catch(error){
      if(gen!==generation)return;
      showIssue(item,'Telegram Link រឿងនេះមិនទាន់មាន ឬមិនអាចទាញយកបាន។');
    }
  }
  function orderInfo(item,order){
    return makeSummary(item,order)+statusMarkup('កំពុងរៀបចំ Bakong KHQR...','',true);
  }
  async function createOrResume(item,gen){
    var saved=getSaved(item.id);
    if(saved&&saved.token&&saved.order&&saved.order.id){
      try{
        var checked=await guest('status',saved);
        if(gen!==generation)return;
        if(checked.status==='paid'){currentPurchase=saved;await deliverLink(item,saved,gen,false);return}
        if(checked.status==='pending'){currentPurchase=saved;await showQR(item,saved,gen);return}
        clearPurchase(item.id);
      }catch(error){
        if(gen!==generation)return;
        currentPurchase=saved;
        showIssue(item,'មិនអាចពិនិត្យ Order ចាស់បាន។ សូមសាកម្តងទៀត ដើម្បីកុំឱ្យទូទាត់ស្ទួន។',function(){openCheckout(item)});
        return;
      }
    }
    try{
      var token=secureToken();
      var created=await guest('create',{token:token},{item_id:item.id});
      if(gen!==generation)return;
      if(!created.order||!created.order.id)throw new Error('ORDER_CREATE_FAILED');
      var purchase={token:token,order:created.order,itemId:item.id};
      currentPurchase=purchase;savePurchase(item.id,purchase);
      await showQR(item,purchase,gen);
    }catch(error){
      if(gen!==generation)return;
      showIssue(item,'មិនអាចបង្កើតការទូទាត់បាន។ សូមពិនិត្យ Supabase និង Bakong Settings។');
    }
  }
  async function showQR(item,purchase,gen){
    setModal(orderInfo(item,purchase.order));
    try{
      var r=await db.functions.invoke('bakong-khqr',{body:{order_id:purchase.order.id,guest_token:purchase.token}});
      if(gen!==generation)return;
      if(r.error||!r.data||!r.data.ok||!r.data.image)throw new Error(r.data&&r.data.error||r.error&&r.error.message||'QR_UNAVAILABLE');
      var qr=String(r.data.image);
      if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(qr)&&!externalImage(qr))throw new Error('INVALID_QR');
      setModal(makeSummary(item,purchase.order)+
        '<div class="qr-area"><div class="qr-frame"><img src="'+escapeHtml(qr)+'" alt="Bakong KHQR សម្រាប់ទូទាត់"></div>'+
        '<div class="qr-help">ស្កេន QR តាម App ធនាគារ។ ប្រព័ន្ធនឹងបញ្ជាក់ការទូទាត់មុនបង្ហាញ Telegram Link។</div></div>'+
        '<div id="paymentStatus">'+statusMarkup('កំពុងរង់ចាំការទូទាត់...','',true)+'</div>'+
        '<div class="checkout-actions"><button type="button" class="button button-glass" id="checkNow">ពិនិត្យការទូទាត់ឥឡូវ</button></div>');
      document.getElementById('checkNow').onclick=function(){checkPayment(item,purchase,gen)};
      startPolling(item,purchase,gen);
    }catch(error){
      if(gen!==generation)return;
      showIssue(item,'មិនអាចបង្ហាញ KHQR បាន។ ត្រូវកំណត់ Bakong នៅ Server មុនពេលទទួលការទូទាត់។',
        function(){showQR(item,purchase,gen)});
    }
  }
  function setPaymentStatus(message,kind,loading){
    var el=document.getElementById('paymentStatus');
    if(el)el.innerHTML=statusMarkup(message,kind,loading);
  }
  function startPolling(item,purchase,gen){
    stopPolling();
    pollTimer=setInterval(function(){checkPayment(item,purchase,gen)},4000);
  }
  async function checkPayment(item,purchase,gen){
    if(checking||gen!==generation)return;
    checking=true;
    try{
      var data=await guest('check',purchase);
      if(gen!==generation)return;
      if(data.status==='paid'){
        stopPolling();await deliverLink(item,purchase,gen,true);
      }else if(data.status==='expired'){
        stopPolling();
        showIssue(item,'KHQR ផុតកំណត់។ សូមបង្កើត QR ថ្មី។',function(){showQR(item,purchase,gen)});
      }else if(data.status==='configuration_required'){
        stopPolling();
        showIssue(item,'Auto Verify មិនទាន់បានកំណត់នៅ Supabase Server។');
      }else if(data.error==='transaction_mismatch'){
        stopPolling();
        showIssue(item,'ការទូទាត់មិនត្រូវនឹង Order នេះ។ សូមទាក់ទង Admin។');
      }else{
        setPaymentStatus('កំពុងរង់ចាំ Bakong បញ្ជាក់ការទូទាត់...','',true);
      }
    }catch(error){
      if(gen!==generation)return;
      if(String(error.message).includes('transaction_mismatch')){
        stopPolling();showIssue(item,'ការទូទាត់មិនត្រូវនឹង Order។ សូមទាក់ទង Admin។');
      }else{
        setPaymentStatus('មិនអាចផ្ទៀងផ្ទាត់ប្រាក់នៅពេលនេះ។ ប្រព័ន្ធនឹងសាកល្បងម្តងទៀត។','error',false);
      }
    }finally{checking=false}
  }
  async function deliverLink(item,purchase,gen,autoOpen){
    setModal(makeSummary(item,purchase.order)+statusMarkup('បានបញ្ជាក់ការទូទាត់ ✓ កំពុងរៀបចំ Telegram Link...','success',true));
    try{
      var data=await guest('telegram',purchase);
      if(gen!==generation)return;
      var movieLink=telegramLink(data.telegram_url||'');
      var invite=telegramLink(data.invite_url||'');
      if(!movieLink)throw new Error('TELEGRAM_LINK_MISSING');
      var privateAccess=Boolean(data.private_channel&&invite);
      var links=privateAccess
        ?'<a class="access-link" href="'+escapeHtml(invite)+'" target="_blank" rel="noopener noreferrer">1. ចូល Private Channel ↗</a>'+
         '<a class="access-link secondary" href="'+escapeHtml(movieLink)+'" target="_blank" rel="noopener noreferrer">2. បើករឿងពេញ ↗</a>'
        :'<a class="access-link" href="'+escapeHtml(movieLink)+'" target="_blank" rel="noopener noreferrer">បើក Telegram រឿងពេញ ↗</a>';
      setModal(makeSummary(item,purchase.order)+
        '<h3 class="access-title">✓ ទូទាត់ជោគជ័យ</h3>'+
        '<p class="access-help">'+(privateAccess?'ចូល Channel ជាមុន បន្ទាប់មកចុចបើករឿងពេញ។':'Telegram Link រឿងពេញរួចរាល់។')+'</p>'+
        '<div class="checkout-actions">'+links+'</div>');
      if(autoOpen){
        var destination=privateAccess?invite:movieLink;
        setTimeout(function(){if(gen===generation&&modal.classList.contains('open'))window.location.assign(destination)},1700);
      }
    }catch(error){
      if(gen!==generation)return;
      setModal(makeSummary(item,purchase.order)+statusMarkup('ទូទាត់បានជោគជ័យ ប៉ុន្តែមិនអាចទាញយក Telegram Link បាន។ សូមសាកម្តងទៀត ឬទាក់ទង Admin។','error')+
        '<div class="checkout-actions"><button type="button" id="retryDelivery" class="button button-primary">ព្យាយាមយក Telegram Link ម្តងទៀត</button></div>');
      document.getElementById('retryDelivery').onclick=function(){deliverLink(item,purchase,gen,false)};
    }
  }
  function openCheckout(item){
    stopPolling();generation++;var gen=generation;
    activeMovie=item;currentPurchase=null;lastFocus=document.activeElement;
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('lock');
    setModal(makeSummary(item)+statusMarkup('កំពុងតភ្ជាប់...','',true));
    closeBtn.focus();
    if(!item.paid)freeAccess(item,gen);else createOrResume(item,gen);
  }

  closeBtn.addEventListener('click',closeCheckout);
  document.getElementById('checkoutBackdrop').addEventListener('click',closeCheckout);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal.classList.contains('open'))closeCheckout()});
  document.querySelectorAll('[data-filter]').forEach(function(btn){
    btn.addEventListener('click',function(){
      activeFilter=btn.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(function(b){
        var yes=b===btn;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));
      });
      drawCards();
    });
  });
  document.getElementById('catalogSearch').addEventListener('input',function(e){
    searchText=String(e.target.value||'').trim().toLowerCase();drawCards();
  });
  retry.addEventListener('click',loadMovies);
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden&&modal.classList.contains('open')&&activeMovie&&currentPurchase&&pollTimer){
      checkPayment(activeMovie,currentPurchase,generation);
    }
  });
  try{if(!window.supabase)throw new Error('Supabase SDK unavailable');
    db=window.supabase.createClient(PROJECT_URL,PUBLIC_KEY);
  }catch(error){console.error('Supabase initialization failed',error);}
  loadMovies();
})();