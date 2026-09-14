// Bakong KHQR integration for iDrama.ai
(function(){
  const BAKONG_SDK='https://esm.sh/bakong-khqr@1.0.20';
  const QR_SDK='https://esm.sh/qrcode@1.5.4';
  let sdkPromise=null, qrPromise=null;

  async function loadBakongSettings(){
    const {data}=await db.from('site_settings').select('bakong_enabled,bakong_account_id,bakong_account_name,bakong_merchant_city,bakong_account_information,bakong_acquiring_bank,bakong_store_label,bakong_qr_url,payment_note').eq('id',1).maybeSingle();
    if(data) Object.assign(settings,data);
  }

  async function getBakongSdk(){
    if(!sdkPromise) sdkPromise=import(BAKONG_SDK);
    const mod=await sdkPromise;
    return mod.default?Object.assign({},mod.default,mod):mod;
  }
  async function getQrSdk(){
    if(!qrPromise) qrPromise=import(QR_SDK);
    const mod=await qrPromise;
    return mod.default&&mod.default.toDataURL?mod.default:mod;
  }

  async function makeKhqr(order,movie){
    await loadBakongSettings();
    if(!settings.bakong_enabled) throw new Error('BAKONG_DISABLED');
    if(!settings.bakong_account_id||!settings.bakong_account_name) throw new Error('BAKONG_ACCOUNT_MISSING');

    const lib=await getBakongSdk();
    const {BakongKHQR,khqrData,IndividualInfo}=lib;
    if(!BakongKHQR||!khqrData||!IndividualInfo) throw new Error('BAKONG_SDK_LOAD_FAILED');

    const expiresMs=Date.now()+10*60*1000;
    const optionalData={
      currency: movie.currency==='KHR'?khqrData.currency.khr:khqrData.currency.usd,
      amount:Number(movie.price),
      merchantCategoryCode:'5999',
      storeLabel:String(settings.bakong_store_label||'iDrama.ai').slice(0,25),
      terminalLabel:'WEB',
      purposeOfTransaction:String(order.order_code||'iDrama').slice(0,25),
      expirationTimestamp:expiresMs
    };
    if(settings.bakong_account_information) optionalData.accountInformation=settings.bakong_account_information;
    if(settings.bakong_acquiring_bank) optionalData.acquiringBank=settings.bakong_acquiring_bank;

    const info=new IndividualInfo(
      settings.bakong_account_id,
      settings.bakong_account_name,
      settings.bakong_merchant_city||'PHNOM PENH',
      optionalData
    );
    const khqr=new BakongKHQR();
    const result=khqr.generateIndividual(info);
    if(Number(result?.status?.code)!==0||!result?.data?.qr||!result?.data?.md5){
      throw new Error(result?.status?.message||'KHQR_GENERATION_FAILED');
    }

    const expiresAt=new Date(expiresMs).toISOString();
    const bind=await db.functions.invoke('bakong-payment',{body:{
      action:'bind',order_id:order.id,qr:result.data.qr,md5:result.data.md5,expires_at:expiresAt
    }});
    if(bind.error||bind.data?.error) throw new Error(bind.data?.error||bind.error?.message||'KHQR_BIND_FAILED');

    const qrLib=await getQrSdk();
    const toDataURL=qrLib.toDataURL||qrLib.default?.toDataURL;
    if(!toDataURL) throw new Error('QR_RENDERER_FAILED');
    const image=await toDataURL(result.data.qr,{width:280,margin:2,errorCorrectionLevel:'M'});
    return {image,qr:result.data.qr,md5:result.data.md5,expiresAt};
  }

  startPurchase=async function(movie){
    if(!session){openAuth('login');return}
    const {data:paid}=await db.from('idrama_orders').select('*').eq('item_id',movie.id).eq('status','paid').limit(1);
    if(paid?.length){openDrama(movie.id);return}

    const {data:pending}=await db.from('idrama_orders').select('*').eq('item_id',movie.id).eq('status','pending').order('created_at',{ascending:false}).limit(1);
    let order=pending?.[0];
    if(!order){
      const user=session.user;
      const payload={
        user_id:user.id,item_id:movie.id,amount:movie.price,currency:movie.currency,status:'pending',payment_method:'bakong_khqr',
        buyer_name:user.user_metadata?.full_name||'',buyer_email:user.email||'',buyer_phone:user.user_metadata?.phone||''
      };
      const r=await db.from('idrama_orders').insert(payload).select('*').single();
      if(r.error){alert(r.error.message);return}
      order=r.data;
    }
    currentOrder=order;
    await showPayment(order,movie);
  };

  showPayment=async function(order,movie){
    $('payModal').classList.add('show');
    $('payStatus').className='waiting';
    $('payStatus').textContent='កំពុងបង្កើត Bakong KHQR...';
    $('payContent').innerHTML=`<div class="paymeta"><div>រឿង: <b>${esc(movie.title)}</b></div><div>តម្លៃ: <b>${money(movie)}</b></div><div>Order: <b>${esc(order.order_code)}</b></div></div>`;

    try{
      const khqr=await makeKhqr(order,movie);
      $('payContent').innerHTML=`<div class="paymeta"><div>រឿង: <b>${esc(movie.title)}</b></div><div>តម្លៃ: <b>${money(movie)}</b></div><div>Order: <b>${esc(order.order_code)}</b></div></div><img class="qr" src="${khqr.image}" alt="Bakong KHQR"><div class="paymeta"><b>Bakong KHQR</b><br>${esc(settings.payment_note||'ស្កេន KHQR ហើយប្រព័ន្ធនឹងបើករឿងដោយស្វ័យប្រវត្តិ ពេលទូទាត់ជោគជ័យ។')}<br><small>QR ផុតកំណត់ប្រហែល 10 នាទី</small></div><button id="checkPay" class="btn soft" style="width:100%;margin-top:12px">ពិនិត្យការទូទាត់ឥឡូវនេះ</button>`;
      $('payStatus').textContent='កំពុងរង់ចាំ Bakong បញ្ជាក់ការទូទាត់...';
      $('checkPay').onclick=()=>checkOrder(order.id,movie.id);
      startPolling(order.id,movie.id);
    }catch(err){
      console.error(err);
      const fallback=settings.bakong_qr_url?`<img class="qr" src="${esc(settings.bakong_qr_url)}" alt="KHQR fallback">`:'';
      let text='Bakong KHQR មិនទាន់បានកំណត់។ សូម Admin បញ្ចូល Bakong Account ID និងឈ្មោះគណនីក្នុង Payment Settings។';
      if(String(err?.message).includes('BAKONG_DISABLED')) text='Bakong KHQR ត្រូវបានបិទក្នុង Admin Settings។';
      $('payContent').innerHTML=`<div class="paymeta"><div>រឿង: <b>${esc(movie.title)}</b></div><div>តម្លៃ: <b>${money(movie)}</b></div><div>Order: <b>${esc(order.order_code)}</b></div></div>${fallback}<div class="paymeta">${esc(text)}</div>`;
      $('payStatus').className='msg err';
      $('payStatus').textContent='មិនអាចបង្កើត Dynamic KHQR បានទេ';
    }
  };

  startPolling=function(orderId,itemId){
    clearInterval(pollTimer);
    pollTimer=setInterval(()=>checkOrder(orderId,itemId),5000);
  };

  checkOrder=async function(orderId,itemId){
    const invoke=await db.functions.invoke('bakong-payment',{body:{action:'check',order_id:orderId}});
    if(invoke.error){
      $('payStatus').className='msg err';
      $('payStatus').textContent='មិនអាចភ្ជាប់ Bakong verifier បាន';
      return;
    }
    const data=invoke.data||{};
    if(data.status==='paid'){
      clearInterval(pollTimer);
      $('payStatus').className='success';
      $('payStatus').textContent='ទូទាត់ Bakong KHQR ជោគជ័យ ✓ កំពុងបើករឿងពេញ...';
      setTimeout(()=>{$('payModal').classList.remove('show');openDrama(itemId)},800);
      return;
    }
    if(data.status==='expired'){
      clearInterval(pollTimer);
      $('payStatus').className='waiting';
      $('payStatus').textContent='KHQR ផុតកំណត់។ កំពុងបង្កើត QR ថ្មី...';
      if(currentOrder&&currentMovie) setTimeout(()=>showPayment(currentOrder,currentMovie),500);
      return;
    }
    if(data.status==='configuration_required'){
      clearInterval(pollTimer);
      $('payStatus').className='msg err';
      if(data.error==='bakong_token_missing') $('payStatus').textContent='Bakong API Token មិនទាន់ដាក់នៅ server-side ទេ។';
      else if(data.error==='bakong_token_invalid') $('payStatus').textContent='Bakong API Token ផុតកំណត់ ឬមិនត្រឹមត្រូវ។';
      else $('payStatus').textContent='Bakong backend មិនទាន់បានកំណត់ពេញលេញ។';
      return;
    }
    if(data.error==='transaction_mismatch'){
      clearInterval(pollTimer);
      $('payStatus').className='msg err';
      $('payStatus').textContent='រកឃើញ transaction ប៉ុន្តែ Account/Amount/Currency មិនត្រូវនឹង Order។';
      return;
    }
    $('payStatus').className='waiting';
    $('payStatus').textContent='កំពុងរង់ចាំ Bakong បញ្ជាក់ការទូទាត់...';
  };

  loadBakongSettings();
})();
