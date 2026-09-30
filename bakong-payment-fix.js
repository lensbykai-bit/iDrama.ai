// iDrama.ai Bakong payment hotfix: generate KHQR on Supabase Edge Function
// and keep the browser focused on rendering + payment status checks.
(function(){
  let fixPollTimer=null;

  function injectPaymentStyles(){
    if(document.getElementById('idrama-payment-ui-styles'))return;
    const style=document.createElement('style');
    style.id='idrama-payment-ui-styles';
    style.textContent=`
      #payModal{
        align-items:flex-start!important;
        overflow-y:auto!important;
        padding:92px 18px 32px!important;
        background:rgba(4,7,12,.82)!important;
        backdrop-filter:blur(12px)!important;
      }
      #payModal .paybox{
        width:min(440px,100%)!important;
        max-height:none!important;
        margin:0 auto!important;
        padding:22px 22px 20px!important;
        border:1px solid #334056!important;
        border-radius:24px!important;
        background:linear-gradient(180deg,#171e29 0%,#111722 100%)!important;
        box-shadow:0 28px 90px rgba(0,0,0,.62),0 0 0 1px rgba(255,255,255,.025) inset!important;
        position:relative!important;
        overflow:visible!important;
      }
      #payModal .paybox:before{
        content:'';
        position:absolute;
        left:22px;right:22px;top:72px;
        height:1px;
        background:linear-gradient(90deg,transparent,#344055,transparent);
      }
      #payModal .paybox h2{
        margin:0 48px 18px 0!important;
        min-height:34px;
        display:flex;
        align-items:center;
        gap:10px;
        color:#fff!important;
        font:800 24px/1.25 Inter,Battambang,sans-serif!important;
        letter-spacing:-.3px;
      }
      #payModal .paybox h2:before{
        content:'៛';
        width:34px;height:34px;
        display:grid;place-items:center;
        border-radius:11px;
        color:#fff;
        font-size:18px;
        background:linear-gradient(135deg,#e72b4b,#ff4f75);
        box-shadow:0 8px 20px rgba(231,43,75,.28);
      }
      #payModal #payClose{
        position:absolute!important;
        right:18px!important;
        top:18px!important;
        float:none!important;
        width:38px!important;
        height:38px!important;
        border:1px solid #39465a!important;
        border-radius:12px!important;
        background:#222b39!important;
        color:#dce4ef!important;
        font-size:24px!important;
        line-height:1!important;
        transition:.18s ease;
      }
      #payModal #payClose:hover{
        background:#303b4c!important;
        color:#fff!important;
        transform:translateY(-1px);
      }
      #payContent{
        display:grid;
        gap:14px;
        margin-top:24px;
      }
      #payContent .payment-summary{
        display:grid;
        gap:9px;
        padding:14px 15px;
        border:1px solid #2d394b;
        border-radius:16px;
        background:#0f1520;
        box-shadow:0 8px 24px rgba(0,0,0,.12) inset;
      }
      #payContent .payment-row{
        display:grid;
        grid-template-columns:74px minmax(0,1fr);
        gap:10px;
        align-items:start;
        font-family:Inter,Battambang,sans-serif;
        font-size:13px;
        line-height:1.55;
      }
      #payContent .payment-label{
        color:#8794a7;
        font-weight:700;
      }
      #payContent .payment-value{
        color:#f7f9fc;
        font-weight:800;
        overflow-wrap:anywhere;
      }
      #payContent .payment-value.price-value{
        color:#ff8aa5;
        font-size:16px;
      }
      #payContent .qr-wrap{
        display:flex;
        justify-content:center;
        padding:4px 0 0;
      }
      #payContent .qr-card{
        display:grid;
        place-items:center;
        width:248px;
        max-width:100%;
        padding:12px;
        border-radius:20px;
        background:#fff;
        box-shadow:0 14px 36px rgba(0,0,0,.32),0 0 0 1px rgba(255,255,255,.12);
      }
      #payContent .qr-card .qr{
        width:224px!important;
        max-width:100%!important;
        aspect-ratio:1!important;
        margin:0!important;
        border-radius:8px!important;
        background:#fff!important;
      }
      #payContent .payment-help{
        display:grid;
        grid-template-columns:34px minmax(0,1fr);
        gap:11px;
        align-items:start;
        padding:13px 14px;
        border:1px solid #2f3b4e;
        border-radius:16px;
        background:linear-gradient(180deg,#121a26,#0f1520);
      }
      #payContent .help-icon{
        width:34px;height:34px;
        display:grid;place-items:center;
        border-radius:11px;
        background:#252f3f;
        color:#ff9bb0;
        font-size:17px;
      }
      #payContent .help-title{
        color:#f7f9fc;
        font:800 13px/1.5 Inter,Battambang,sans-serif;
        margin-bottom:4px;
      }
      #payContent .help-text{
        color:#aeb8c6;
        font:600 12px/1.72 Inter,Battambang,sans-serif;
      }
      #payContent .help-expire{
        display:inline-flex;
        align-items:center;
        gap:6px;
        margin-top:7px;
        color:#ffc96b;
        font-size:11px;
        font-weight:800;
      }
      #payContent .payment-loading{
        min-height:170px;
        display:grid;
        place-items:center;
        gap:12px;
        color:#b9c4d2;
        font-family:Battambang,Inter,sans-serif;
      }
      #payContent .payment-spinner{
        width:34px;height:34px;
        border:3px solid #2c3748;
        border-top-color:#ff4f75;
        border-radius:50%;
        animation:idramaPaySpin .8s linear infinite;
      }
      @keyframes idramaPaySpin{to{transform:rotate(360deg)}}
      #payContent #checkPay,#payContent #retryKhqr{
        width:100%!important;
        min-height:48px;
        margin-top:0!important;
        border:1px solid #ff6688!important;
        border-radius:14px!important;
        background:linear-gradient(135deg,#e72b4b,#ff4f75)!important;
        color:#fff!important;
        font-family:Battambang,Inter,sans-serif!important;
        font-weight:800!important;
        box-shadow:0 10px 24px rgba(231,43,75,.22)!important;
        transition:.18s ease;
      }
      #payContent #checkPay:hover,#payContent #retryKhqr:hover{
        transform:translateY(-1px);
        filter:brightness(1.05);
      }
      #payStatus{
        min-height:44px;
        display:flex!important;
        align-items:center;
        justify-content:center;
        gap:8px;
        margin:14px 0 0!important;
        padding:10px 13px;
        border-radius:13px;
        border:1px solid #3b4656;
        background:#1b2330;
        font:700 12px/1.55 Battambang,Inter,sans-serif!important;
        text-align:center;
      }
      #payStatus.waiting{color:#ffd276!important;border-color:#594c2d!important;background:#221e15!important}
      #payStatus.success{color:#79e4c1!important;border-color:#295c4c!important;background:#11241f!important}
      #payStatus.err,#payStatus.msg.err{color:#ff8b8b!important;border-color:#62383e!important;background:#28171a!important}
      @media(max-width:600px){
        #payModal{padding:76px 10px 18px!important}
        #payModal .paybox{padding:18px 15px 16px!important;border-radius:20px!important}
        #payModal .paybox:before{left:15px;right:15px;top:64px}
        #payModal .paybox h2{font-size:20px!important;margin-bottom:16px!important}
        #payModal .paybox h2:before{width:31px;height:31px;font-size:16px}
        #payModal #payClose{right:14px!important;top:14px!important;width:35px!important;height:35px!important}
        #payContent{gap:11px;margin-top:20px}
        #payContent .payment-row{grid-template-columns:64px minmax(0,1fr);font-size:12px}
        #payContent .qr-card{width:224px;padding:10px;border-radius:18px}
        #payContent .qr-card .qr{width:204px!important}
        #payStatus{font-size:11px!important}
      }
    `;
    document.head.appendChild(style);
  }

  injectPaymentStyles();

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

  function summaryMarkup(movie,order){
    return `
      <div class="payment-summary">
        <div class="payment-row"><span class="payment-label">រឿង</span><span class="payment-value">${esc(movie.title)}</span></div>
        <div class="payment-row"><span class="payment-label">តម្លៃ</span><span class="payment-value price-value">${money(movie)}</span></div>
        <div class="payment-row"><span class="payment-label">Order</span><span class="payment-value">${esc(order.order_code||order.id)}</span></div>
      </div>`;
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
    $('payStatus').textContent='✓ ទូទាត់ជោគជ័យ — កំពុងបើក Telegram...';
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
      $('payStatus').textContent='QR ផុតកំណត់ — កំពុងបង្កើត QR ថ្មី...';
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
    $('payStatus').textContent='កំពុងរង់ចាំការបញ្ជាក់ពី Bakong...';
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
    $('payStatus').textContent='កំពុងរៀបចំ Bakong KHQR...';
    $('payContent').innerHTML=`${summaryMarkup(movie,order)}<div class="payment-loading"><span class="payment-spinner"></span><span>កំពុងបង្កើត QR សម្រាប់ Order នេះ...</span></div>`;

    try{
      const khqr=await makeServerKhqr(purchase);
      const note=(typeof settings!=='undefined'&&settings.payment_note)
        ?settings.payment_note
        :'ស្កេន KHQR ដើម្បីទូទាត់។ ប្រព័ន្ធនឹងផ្ទៀងផ្ទាត់ និងបើក Telegram ដោយស្វ័យប្រវត្តិ។';
      $('payContent').innerHTML=`
        ${summaryMarkup(movie,order)}
        <div class="qr-wrap"><div class="qr-card"><img class="qr" src="${khqr.image}" alt="Bakong KHQR"></div></div>
        <div class="payment-help">
          <div class="help-icon">⌁</div>
          <div>
            <div class="help-title">ស្កេន KHQR ដើម្បីទូទាត់</div>
            <div class="help-text">${esc(note)}</div>
            <div class="help-expire">◷ QR ផុតកំណត់ក្នុងប្រហែល 10 នាទី</div>
          </div>
        </div>
        <button id="checkPay" class="btn soft">ពិនិត្យការទូទាត់ឥឡូវនេះ</button>`;
      $('payStatus').className='waiting';
      $('payStatus').textContent='សូមទូទាត់តាមចំនួនទឹកប្រាក់ខាងលើ ហើយរង់ចាំការបញ្ជាក់។';
      $('checkPay').onclick=()=>checkPayment(purchase,movie);
      startFixPolling(purchase,movie);
    }catch(error){
      console.error('Bakong payment fix:',error);
      $('payStatus').className='msg err';
      $('payStatus').textContent=paymentErrorText(error);
      $('payContent').innerHTML=`${summaryMarkup(movie,order)}<div class="payment-help"><div class="help-icon">!</div><div><div class="help-title">មិនអាចបង្កើត KHQR</div><div class="help-text">${esc(paymentErrorText(error))}</div></div></div><button id="retryKhqr" class="btn soft">សាកម្តងទៀត</button>`;
      $('retryKhqr').onclick=()=>window.showPayment(purchase,movie);
    }
  };

  const closeBtn=document.getElementById('payClose');
  if(closeBtn)closeBtn.addEventListener('click',stopFixPolling);
})();
