// Guest Bakong KHQR checkout for iDrama.ai — no customer account required.
// Paid private Telegram links (t.me/c/...) are delivered through a one-person Bot invite.
(function(){
  const BAKONG_SDK='https://esm.sh/bakong-khqr@1.0.20';
  const QR_SDK='https://esm.sh/qrcode@1.5.4';
  const STORE_PREFIX='idrama_guest_purchase_';
  let sdkPromise=null,qrPromise=null,currentPurchase=null;

  function randomToken(){
    const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  function key(itemId){return STORE_PREFIX+itemId}
  function getSaved(itemId){try{return JSON.parse(localStorage.getItem(key(itemId))||'null')}catch{return null}}
  function save(itemId,p){localStorage.setItem(key(itemId),JSON.stringify(p))}
  function clearSaved(itemId){localStorage.removeItem(key(itemId))}

  async function invoke(action,purchase,extra={}){
    const body={action,guest_token:purchase.token,...extra};
    if(purchase.order?.id) body.order_id=purchase.order.id;
    return db.functions.invoke('bakong-payment',{body});
  }

  async function loadBakongSettings(){
    const {data}=await db.from('site_settings')
      .select('bakong_enabled,bakong_account_id,bakong_account_name,bakong_merchant_city,bakong_account_information,bakong_acquiring_bank,bakong_store_label,bakong_qr_url,payment_note')
      .eq('id',1).maybeSingle();
    if(data)Object.assign(settings,data);
  }
  async function getBakongSdk(){if(!sdkPromise)sdkPromise=import(BAKONG_SDK);const mod=await sdkPromise;return mod.default?Object.assign({},mod.default,mod):mod}
  async function getQrSdk(){if(!qrPromise)qrPromise=import(QR_SDK);const mod=await qrPromise;return mod.default&&mod.default.toDataURL?mod.default:mod}

  async function createPurchase(movie){
    const token=randomToken();
    const r=await db.functions.invoke('bakong-payment',{body:{action:'create',item_id:movie.id,guest_token:token}});
    if(r.error||!r.data?.order)throw new Error(r.data?.error||r.error?.message||'ORDER_CREATE_FAILED');
    const purchase={token,order:r.data.order,itemId:movie.id};
    save(movie.id,purchase);
    return purchase;
  }

  function telegramErrorMessage(data,error){
    const code=data?.error||error?.message||'';
    if(code==='telegram_bot_token_missing')return 'Telegram Bot មិនទាន់បានកំណត់នៅ Server ទេ។';
    if(code==='telegram_invite_failed')return 'Telegram Bot មិនអាចបង្កើត Private Invite បាន។ សូមពិនិត្យថា Bot ជា Admin ក្នុង Channel។';
    if(code==='telegram_link_missing')return 'Telegram Link រឿងពេញមិនទាន់បានដាក់។';
    return 'មិនអាចរៀបចំ Telegram Link បាន។ សូមទាក់ទង Admin។';
  }

  function renderTelegramAccess(data){
    const target=data.telegram_url||'';
    const invite=data.invite_url||'';
    $('buybox').className='buybox owned';
    if(data.private_channel&&invite){
      $('buybox').innerHTML=`
        <div><b>បានទូទាត់រួច ✓</b><small>Private Channel៖ ចូល Channel ជាមុន រួចបើករឿងពេញ។ Invite នេះអនុញ្ញាតបាន 1 គណនីប៉ុណ្ណោះ។</small></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn telegram" href="${esc(invite)}" target="_blank" rel="noopener noreferrer">1. ចូល Private Channel</a>
          <a class="btn soft" href="${esc(target)}" target="_blank" rel="noopener noreferrer">2. បើករឿងពេញ</a>
        </div>`;
    }else{
      $('buybox').innerHTML=`<div><b>បានទូទាត់រួច ✓</b><small>រឿងពេញរួចរាល់ក្នុង Telegram</small></div><a class="btn telegram" href="${esc(target)}" target="_blank" rel="noopener noreferrer">បើក Telegram រឿងពេញ</a>`;
    }
  }

  async function paidTelegram(purchase,movie,autoOpen){
    const r=await invoke('telegram',purchase);
    const data=r.data||{};
    if(r.error||!data.telegram_url){
      $('buybox').className='buybox owned';
      $('buybox').innerHTML=`<div><b>ទូទាត់រួច ✓</b><small>${esc(telegramErrorMessage(data,r.error))}</small></div>`;
      if($('payStatus')){$('payStatus').className='msg err';$('payStatus').textContent=telegramErrorMessage(data,r.error)}
      return false;
    }

    renderTelegramAccess(data);
    if(autoOpen){
      clearInterval(pollTimer);
      if($('payStatus')){
        $('payStatus').className='success';
        $('payStatus').textContent=data.private_channel
          ?'ទូទាត់ជោគជ័យ ✓ កំពុងបើក Private Telegram Invite...'
          :'ទូទាត់ជោគជ័យ ✓ កំពុងបើក Telegram រឿងពេញ...';
      }
      const destination=data.private_channel&&data.invite_url?data.invite_url:data.telegram_url;
      setTimeout(()=>{window.location.href=destination},700);
    }
    return true;
  }

  window.renderGuestPurchaseState=async function(movie){
    const p=getSaved(movie.id);
    if(!p?.token||!p?.order?.id){showBuyButton(movie);return}
    const r=await invoke('status',p);
    if(r.error||!r.data){clearSaved(movie.id);showBuyButton(movie);return}
    if(r.data.status==='paid'){await paidTelegram(p,movie,false);return}
    if(r.data.status==='pending'){
      $('buybox').className='buybox';
      $('buybox').innerHTML=`<div><b>${money(movie)}</b><small>មានការទូទាត់កំពុងរង់ចាំ។ មិនចាំបាច់ Login។</small></div><button id="buyBtn" class="btn pink">បន្តទូទាត់</button>`;
      $('buyBtn').onclick=()=>window.startPurchase(movie);
      return;
    }
    clearSaved(movie.id);showBuyButton(movie);
  };

  async function makeKhqr(order,movie,purchase){
    await loadBakongSettings();
    if(!settings.bakong_enabled)throw new Error('BAKONG_DISABLED');
    if(!settings.bakong_account_id||!settings.bakong_account_name)throw new Error('BAKONG_ACCOUNT_MISSING');
    const lib=await getBakongSdk();
    const {BakongKHQR,khqrData,IndividualInfo}=lib;
    if(!BakongKHQR||!khqrData||!IndividualInfo)throw new Error('BAKONG_SDK_LOAD_FAILED');
    const expiresMs=Date.now()+10*60*1000;
    const optionalData={
      currency:movie.currency==='KHR'?khqrData.currency.khr:khqrData.currency.usd,
      amount:Number(movie.price),merchantCategoryCode:'5999',
      storeLabel:String(settings.bakong_store_label||'iDrama.ai').slice(0,25),
      terminalLabel:'WEB',purposeOfTransaction:String(order.order_code||'iDrama').slice(0,25),
      expirationTimestamp:expiresMs
    };
    if(settings.bakong_account_information)optionalData.accountInformation=settings.bakong_account_information;
    if(settings.bakong_acquiring_bank)optionalData.acquiringBank=settings.bakong_acquiring_bank;
    const info=new IndividualInfo(settings.bakong_account_id,settings.bakong_account_name,settings.bakong_merchant_city||'PHNOM PENH',optionalData);
    const result=new BakongKHQR().generateIndividual(info);
    if(Number(result?.status?.code)!==0||!result?.data?.qr||!result?.data?.md5)throw new Error(result?.status?.message||'KHQR_GENERATION_FAILED');
    const expiresAt=new Date(expiresMs).toISOString();
    const bind=await invoke('bind',purchase,{qr:result.data.qr,md5:result.data.md5,expires_at:expiresAt});
    if(bind.error||bind.data?.error)throw new Error(bind.data?.error||bind.error?.message||'KHQR_BIND_FAILED');
    const qrLib=await getQrSdk(),toDataURL=qrLib.toDataURL||qrLib.default?.toDataURL;
    if(!toDataURL)throw new Error('QR_RENDERER_FAILED');
    return {image:await toDataURL(result.data.qr,{width:280,margin:2,errorCorrectionLevel:'M'}),expiresAt};
  }

  async function manualOrderStatus(purchase,movie){
    const r=await invoke('status',purchase);
    if(r.error||!r.data)return;
    if(r.data.status==='paid'){await paidTelegram(purchase,movie,true);return}
    if(['cancelled','failed'].includes(r.data.status)){
      clearInterval(pollTimer);clearSaved(movie.id);$('payStatus').className='msg err';$('payStatus').textContent='ការទូទាត់មិនបានជោគជ័យ។';return;
    }
    $('payStatus').className='waiting';$('payStatus').textContent='កំពុងរង់ចាំការបញ្ជាក់ការទូទាត់...';
  }
  function startManualPolling(purchase,movie){clearInterval(pollTimer);pollTimer=setInterval(()=>manualOrderStatus(purchase,movie),5000)}

  function showManualFallback(purchase,movie,message){
    const order=purchase.order;
    const fallback=settings.bakong_qr_url?`<img class="qr" src="${esc(settings.bakong_qr_url)}" alt="Bakong KHQR">`:'';
    $('payContent').innerHTML=`<div class="paymeta"><div>រឿង: <b>${esc(movie.title)}</b></div><div>តម្លៃ: <b>${money(movie)}</b></div><div>Order: <b>${esc(order.order_code||order.id)}</b></div></div>${fallback}<div class="paymeta">${esc(message)}</div>${fallback?'<button id="checkPay" class="btn soft" style="width:100%;margin-top:12px">ពិនិត្យការទូទាត់</button>':''}`;
    if(fallback){
      $('payStatus').className='waiting';$('payStatus').textContent='ស្កេន KHQR ហើយរង់ចាំការបញ្ជាក់...';
      $('checkPay').onclick=()=>manualOrderStatus(purchase,movie);startManualPolling(purchase,movie);
    }else{
      $('payStatus').className='msg err';$('payStatus').textContent='Bakong KHQR មិនទាន់បានកំណត់។';
    }
  }

  window.startPurchase=async function(movie){
    try{
      let purchase=getSaved(movie.id);
      if(purchase?.token&&purchase?.order?.id){
        const status=await invoke('status',purchase);
        if(status.data?.status==='paid'){await paidTelegram(purchase,movie,true);return}
        if(!status.data||status.error||['cancelled','failed'].includes(status.data.status)){clearSaved(movie.id);purchase=null}
      }
      if(!purchase)purchase=await createPurchase(movie);
      currentPurchase=purchase;currentOrder=purchase.order;currentMovie=movie;
      await showPayment(purchase,movie);
    }catch(err){
      console.error(err);alert('មិនអាចបង្កើតការទូទាត់បាន។ សូមសាកម្តងទៀត។');
    }
  };

  window.showPayment=async function(purchase,movie){
    const order=purchase.order;
    $('payModal').classList.add('show');$('payStatus').className='waiting';$('payStatus').textContent='កំពុងបង្កើត Bakong KHQR...';
    $('payContent').innerHTML=`<div class="paymeta"><div>រឿង: <b>${esc(movie.title)}</b></div><div>តម្លៃ: <b>${money(movie)}</b></div><div>Order: <b>${esc(order.order_code||order.id)}</b></div></div>`;
    try{
      const khqr=await makeKhqr(order,movie,purchase);
      $('payContent').innerHTML=`<div class="paymeta"><div>រឿង: <b>${esc(movie.title)}</b></div><div>តម្លៃ: <b>${money(movie)}</b></div><div>Order: <b>${esc(order.order_code||order.id)}</b></div></div><img class="qr" src="${khqr.image}" alt="Bakong KHQR"><div class="paymeta"><b>Bakong KHQR</b><br>${esc(settings.payment_note||'ស្កេន KHQR។ ពេលទូទាត់ជោគជ័យ ប្រព័ន្ធនឹងបើក Telegram ដោយស្វ័យប្រវត្តិ។')}<br><small>QR ផុតកំណត់ប្រហែល 10 នាទី</small></div><button id="checkPay" class="btn soft" style="width:100%;margin-top:12px">ពិនិត្យការទូទាត់ឥឡូវនេះ</button>`;
      $('payStatus').textContent='កំពុងរង់ចាំ Bakong បញ្ជាក់ការទូទាត់...';
      $('checkPay').onclick=()=>checkOrder(purchase,movie);startPolling(purchase,movie);
    }catch(err){
      console.error(err);await loadBakongSettings();
      let text='Bakong KHQR មិនទាន់បានកំណត់។ សូម Admin បញ្ចូល Bakong Settings។';
      if(String(err?.message).includes('BAKONG_DISABLED'))text='សូមស្កេន KHQR ខាងលើ។ ពេល Admin បញ្ជាក់ការទូទាត់ ប្រព័ន្ធនឹងបើក Telegram ដោយស្វ័យប្រវត្តិ។';
      showManualFallback(purchase,movie,text);
    }
  };

  function startPolling(purchase,movie){clearInterval(pollTimer);pollTimer=setInterval(()=>checkOrder(purchase,movie),5000)}
  async function checkOrder(purchase,movie){
    const r=await invoke('check',purchase);
    if(r.error){
      await loadBakongSettings();
      if(settings.bakong_qr_url)showManualFallback(purchase,movie,'ស្កេន KHQR ហើយរង់ចាំការបញ្ជាក់ការទូទាត់។');
      else{$('payStatus').className='msg err';$('payStatus').textContent='មិនអាចផ្ទៀងផ្ទាត់ Bakong បាននៅពេលនេះ។'}
      return;
    }
    const data=r.data||{};
    if(data.status==='paid'){await paidTelegram(purchase,movie,true);return}
    if(data.status==='expired'){
      clearInterval(pollTimer);$('payStatus').className='waiting';$('payStatus').textContent='KHQR ផុតកំណត់។ កំពុងបង្កើត QR ថ្មី...';
      setTimeout(()=>showPayment(purchase,movie),500);return;
    }
    if(data.status==='configuration_required'){
      await loadBakongSettings();showManualFallback(purchase,movie,'Auto Verify មិនទាន់បានកំណត់។ ស្កេន KHQR ហើយរង់ចាំ Admin បញ្ជាក់។');return;
    }
    if(data.error==='transaction_mismatch'){
      clearInterval(pollTimer);$('payStatus').className='msg err';$('payStatus').textContent='រកឃើញការទូទាត់ ប៉ុន្តែ Account/Amount/Currency មិនត្រូវនឹង Order។';return;
    }
    $('payStatus').className='waiting';$('payStatus').textContent='កំពុងរង់ចាំ Bakong បញ្ជាក់ការទូទាត់...';
  }

  loadBakongSettings();
})();
