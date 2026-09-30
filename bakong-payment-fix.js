// iDrama.ai Bakong payment hotfix: generate KHQR on Supabase Edge Function
// and keep the browser focused on rendering + payment status checks.
(function(){
  let fixPollTimer=null;

  function stopFixPolling(){
    if(fixPollTimer){clearInterval(fixPollTimer);fixPollTimer=null;}
  }

  async function paymentInvoke(action,purchase,extra={}){
    const body={action,guest_token:purchase.token,...extra};
    if(purchase.order?.id)body.order_id=purchase.order.id;
    return db.functions.invoke('bakong-payment',{body});
  }

  async function makeServerKhqr(purchase){
    const r=await db.functions.invoke('bakong-khqr',{
      body:{order_id:purchase.order.id,guest_token:purchase.token}
    });
    const data=r.data||{};
    if(r.error||!data.ok||!data.image){
      const code=data.error||r.error?.message||'KHQR_GENERATION_FAILED';
      throw new Error(code+(data.detail?`: ${data.detail}`:''));
    }
    return data;
  }

  function paymentErrorText(error){
    const text=String(error?.message||error||'');
    if(text.includes('bakong_account_missing'))return 'គណនី Bakong មិនទាន់បានកំណត់ត្រឹមត្រូវ។';
    if(text.includes('bakong_disabled'))return 'ការទូទាត់ Bakong ត្រូវបានបិទជាបណ្ដោះអាសន្ន។';
    if(text.includes('khqr_generation_failed'))return 'មិនអាចបង្កើត KHQR បាន។ សូមពិនិត្យព័ត៌មានគណនី Bakong។';
    if(text.includes('qr_render_failed'))return 'មិនអាចបង្ហាញ QR បាន។ សូមសាកម្តងទៀត។';
    return 'មិនអាចបង្កើត Bakong KHQR បាន។ សូមសាកម្តងទៀត។';
  }

  function renderPaidAccess(data){
    const target=data.telegram_url||'';
    const invite=data.invite_url||'';
    $('buybox').className='buybox owned';
    if(data.private_channel&&invite){
      $('buybox').innerHTML=`
        <div><b>បានទូទាត់រួច ✓</b><small>ចូល Private Channel ជាមុន រួចបើករឿងពេញ។ Invite នេះប្រើបានសម្រាប់ 1 គណនីប៉ុណ្ណោះ។</small></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn telegram" href="${esc(invite)}" target="_blank" rel="noopener noreferrer">1. ចូល Private Channel</a>
          <a class="btn soft" href="${esc(target)}" target="_blank" rel="noopener noreferrer">2. បើករឿងពេញ</a>
        </div>`;
    }else{
      $('buybox').innerHTML=`<div><b>បានទូទាត់រួច ✓</b><small>រឿងពេញរួចរាល់ក្នុង Telegram</small></div><a class="btn telegram" href="${esc(target)}" target="_blank" rel="noopener noreferrer">បើក Telegram រឿងពេញ</a>`;
    }
  }

  async function openTelegramAfterPaid(purchase){
    const r=await paymentInvoke('telegram',purchase);
    const data=r.data||{};
    if(r.error||!data.telegram_url){
      $('payStatus').className='msg err';
      $('payStatus').textContent='ទូទាត់បានជោគជ័យ ប៉ុន្តែមិនអាចបើក Telegram បាន។ សូមទាក់ទង Admin។';
      return;
    }
    renderPaidAccess(data);
    $('payStatus').className='success';
    $('payStatus').textContent='ទូទាត់ជោគជ័យ ✓ កំពុងបើក Telegram...';
    stopFixPolling();
    const destination=data.private_channel&&data.invite_url?data.invite_url:data.telegram_url;
    setTimeout(()=>{window.location.href=destination},700);
  }

  async function checkPayment(purchase,movie){
    const r=await paymentInvoke('check',purchase);
    const data=r.data||{};
    if(r.error&&data.error!=='transaction_mismatch'){
      if(data.status==='configuration_required'){
        stopFixPolling();
        $('payStatus').className='msg err';
        $('payStatus').textContent='Auto Verify Bakong មិនទាន់បានកំណត់នៅ Server។';
      }
      return;
    }
    if(data.status==='paid'){
      await openTelegramAfterPaid(purchase);
      return;
    }
    if(data.status==='expired'){
      stopFixPolling();
      $('payStatus').className='waiting';
      $('payStatus').textContent='KHQR ផុតកំណត់។ កំពុងបង្កើត QR ថ្មី...';
      setTimeout(()=>window.showPayment(purchase,movie),400);
      return;
    }
    if(data.error==='transaction_mismatch'){
      stopFixPolling();
      $('payStatus').className='msg err';
      $('payStatus').textContent='ការទូទាត់មិនត្រូវនឹងតម្លៃ ឬគណនីរបស់ Order នេះ។';
      return;
    }
    $('payStatus').className='waiting';
    $('payStatus').textContent='កំពុងរង់ចាំ Bakong បញ្ជាក់ការទូទាត់...';
  }

  function startFixPolling(purchase,movie){
    stopFixPolling();
    fixPollTimer=setInterval(()=>checkPayment(purchase,movie),4000);
  }

  window.showPayment=async function(purchase,movie){
    stopFixPolling();
    const order=purchase.order;
    $('payModal').classList.add('show');
    $('payStatus').className='waiting';
    $('payStatus').textContent='កំពុងបង្កើត Bakong KHQR...';
    $('payContent').innerHTML=`<div class="paymeta"><div>រឿង: <b>${esc(movie.title)}</b></div><div>តម្លៃ: <b>${money(movie)}</b></div><div>Order: <b>${esc(order.order_code||order.id)}</b></div></div>`;

    try{
      const khqr=await makeServerKhqr(purchase);
      const note=(typeof settings!=='undefined'&&settings.payment_note)
        ?settings.payment_note
        :'ស្កេន KHQR ដើម្បីទូទាត់។ ប្រព័ន្ធនឹងផ្ទៀងផ្ទាត់ និងបើក Telegram ដោយស្វ័យប្រវត្តិ។';
      $('payContent').innerHTML=`
        <div class="paymeta"><div>រឿង: <b>${esc(movie.title)}</b></div><div>តម្លៃ: <b>${money(movie)}</b></div><div>Order: <b>${esc(order.order_code||order.id)}</b></div></div>
        <div style="text-align:center;margin:16px 0"><img class="qr" src="${khqr.image}" alt="Bakong KHQR"></div>
        <div class="paymeta"><b>Bakong KHQR</b><br>${esc(note)}<br><small>QR ផុតកំណត់ក្នុងប្រហែល 10 នាទី</small></div>
        <button id="checkPay" class="btn soft" style="width:100%;margin-top:12px">ពិនិត្យការទូទាត់ឥឡូវនេះ</button>`;
      $('payStatus').className='waiting';
      $('payStatus').textContent='សូមស្កេន KHQR ហើយទូទាត់តាមតម្លៃដែលបានបង្ហាញ។';
      $('checkPay').onclick=()=>checkPayment(purchase,movie);
      startFixPolling(purchase,movie);
    }catch(error){
      console.error('Bakong payment fix:',error);
      $('payStatus').className='msg err';
      $('payStatus').textContent=paymentErrorText(error);
      $('payContent').innerHTML=`<div class="paymeta"><div>រឿង: <b>${esc(movie.title)}</b></div><div>តម្លៃ: <b>${money(movie)}</b></div><div>Order: <b>${esc(order.order_code||order.id)}</b></div></div><div class="paymeta">${esc(paymentErrorText(error))}</div><button id="retryKhqr" class="btn soft" style="width:100%;margin-top:12px">សាកម្តងទៀត</button>`;
      $('retryKhqr').onclick=()=>window.showPayment(purchase,movie);
    }
  };

  const closeBtn=document.getElementById('payClose');
  if(closeBtn)closeBtn.addEventListener('click',stopFixPolling);
})();
