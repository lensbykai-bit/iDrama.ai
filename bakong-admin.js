// Bakong KHQR settings extension for iDrama.ai Admin
(function(){
  const form=document.getElementById('settingsForm');
  if(!form) return;

  const block=document.createElement('div');
  block.innerHTML=`
    <div class="check" style="margin-bottom:8px"><label><input id="bakongEnabled" type="checkbox"> Enable Bakong KHQR</label></div>
    <div class="grid">
      <div class="f full"><label>Bakong Account ID *</label><input id="bakongAccountId" placeholder="yourname@bank"></div>
      <div class="f"><label>Account / Merchant Name *</label><input id="bakongAccountName" placeholder="Your Name"></div>
      <div class="f"><label>Merchant City</label><input id="bakongCity" value="PHNOM PENH"></div>
      <div class="f"><label>Account Information (optional)</label><input id="bakongAccountInfo" placeholder="855... or account info"></div>
      <div class="f"><label>Acquiring Bank (optional)</label><input id="bakongBank" placeholder="Bank name"></div>
      <div class="f full"><label>Store Label</label><input id="bakongStore" value="iDrama.ai" maxlength="25"></div>
    </div>
    <div class="meta" style="margin-top:10px;line-height:1.7">Dynamic KHQR និង Auto Verify ប្រើ Bakong Open API server-side។ <b>API Token មិនត្រូវដាក់នៅ Browser ទេ</b>; backend ប្រើ secret ឈ្មោះ <code>BAKONG_ACCESS_TOKEN</code>.</div>
  `;
  form.insertBefore(block,form.firstChild);

  const originalLoadSettings=loadSettings;
  loadSettings=async function(){
    await originalLoadSettings();
    const r=await db.from('site_settings').select('bakong_enabled,bakong_account_id,bakong_account_name,bakong_merchant_city,bakong_account_information,bakong_acquiring_bank,bakong_store_label').eq('id',1).single();
    if(r.data){
      $('bakongEnabled').checked=!!r.data.bakong_enabled;
      $('bakongAccountId').value=r.data.bakong_account_id||'';
      $('bakongAccountName').value=r.data.bakong_account_name||'';
      $('bakongCity').value=r.data.bakong_merchant_city||'PHNOM PENH';
      $('bakongAccountInfo').value=r.data.bakong_account_information||'';
      $('bakongBank').value=r.data.bakong_acquiring_bank||'';
      $('bakongStore').value=r.data.bakong_store_label||'iDrama.ai';
    }
  };

  form.onsubmit=async e=>{
    e.preventDefault();
    $('settingsMsg').textContent='កំពុងរក្សាទុក...';
    const payload={
      bakong_enabled:$('bakongEnabled').checked,
      bakong_account_id:$('bakongAccountId').value.trim(),
      bakong_account_name:$('bakongAccountName').value.trim(),
      bakong_merchant_city:$('bakongCity').value.trim()||'PHNOM PENH',
      bakong_account_information:$('bakongAccountInfo').value.trim(),
      bakong_acquiring_bank:$('bakongBank').value.trim(),
      bakong_store_label:$('bakongStore').value.trim()||'iDrama.ai',
      bakong_qr_url:$('qrUrl').value.trim(),
      payment_note:$('paymentNote').value.trim(),
      updated_at:new Date().toISOString()
    };
    if(payload.bakong_enabled&&(!payload.bakong_account_id||!payload.bakong_account_name)){
      $('settingsMsg').className='msg err';
      $('settingsMsg').textContent='សូមបញ្ចូល Bakong Account ID និង Account Name';
      return;
    }
    const r=await db.from('site_settings').update(payload).eq('id',1);
    $('settingsMsg').className=r.error?'msg err':'msg';
    $('settingsMsg').textContent=r.error?r.error.message:'រក្សាទុក Bakong KHQR Settings រួចរាល់ ✓';
  };
})();
