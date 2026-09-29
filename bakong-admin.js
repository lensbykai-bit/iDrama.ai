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

  if(!$('app').classList.contains('hide')) loadSettings();
})();

// Admin login reliability + password recovery.
(function(){
  const form=document.getElementById('loginForm');
  const email=document.getElementById('email');
  const password=document.getElementById('password');
  const msg=document.getElementById('loginMsg');
  if(!form||!email||!password||!msg) return;

  const tools=document.createElement('div');
  tools.id='adminLoginTools';
  tools.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap';
  tools.innerHTML='<button type="button" id="showAdminPw" class="btn soft" style="padding:7px 10px">បង្ហាញ Password</button><button type="button" id="forgotAdminPw" class="btn soft" style="padding:7px 10px">ភ្លេច Password?</button>';
  msg.before(tools);

  document.getElementById('showAdminPw').onclick=()=>{
    const show=password.type==='password';
    password.type=show?'text':'password';
    document.getElementById('showAdminPw').textContent=show?'លាក់ Password':'បង្ហាញ Password';
  };

  async function verifyAndOpen(user){
    const check=await db.from('admins').select('user_id').eq('user_id',user.id).maybeSingle();
    if(check.error){
      await db.auth.signOut();
      msg.className='msg err';
      msg.textContent='មិនអាចពិនិត្យសិទ្ធិ Admin បាន៖ '+check.error.message;
      return false;
    }
    if(!check.data){
      await db.auth.signOut();
      msg.className='msg err';
      msg.textContent='គណនីនេះមិនមានសិទ្ធិ Admin ទេ';
      return false;
    }
    document.getElementById('login').classList.add('hide');
    document.getElementById('app').classList.remove('hide');
    msg.textContent='';
    await loadAll();
    return true;
  }

  form.onsubmit=async e=>{
    e.preventDefault();
    msg.className='msg';
    msg.textContent='កំពុងចូល...';
    const {data,error}=await db.auth.signInWithPassword({email:email.value.trim(),password:password.value});
    if(error){
      msg.className='msg err';
      if(/invalid login credentials/i.test(error.message)) msg.textContent='Email ឬ Password មិនត្រឹមត្រូវ។ បើភ្លេច Password សូមចុច “ភ្លេច Password?”';
      else if(/email not confirmed/i.test(error.message)) msg.textContent='Email មិនទាន់បានបញ្ជាក់។ សូមពិនិត្យ Inbox/Spam។';
      else msg.textContent='ចូលមិនបាន៖ '+error.message;
      return;
    }
    await verifyAndOpen(data.user);
  };

  document.getElementById('forgotAdminPw').onclick=async()=>{
    const value=email.value.trim();
    if(!value){
      msg.className='msg err';
      msg.textContent='សូមបញ្ចូល Email ជាមុនសិន';
      email.focus();
      return;
    }
    msg.className='msg';
    msg.textContent='កំពុងផ្ញើ Recovery Email...';
    const redirectTo=location.origin+location.pathname+'?reset=1';
    const {error}=await db.auth.resetPasswordForEmail(value,{redirectTo});
    if(error){
      msg.className='msg err';
      msg.textContent='ផ្ញើ Recovery Email មិនបាន៖ '+error.message;
    }else{
      msg.className='msg';
      msg.textContent='បានផ្ញើ Recovery Email រួច។ សូមពិនិត្យ Inbox/Spam ហើយចុច Link ក្នុង Email។';
    }
  };

  function showReset(){
    if(document.getElementById('adminResetBox')) return;
    document.getElementById('login').classList.add('hide');
    document.getElementById('app').classList.add('hide');
    const wrap=document.createElement('div');
    wrap.id='adminResetBox';
    wrap.className='login';
    wrap.innerHTML=`<form id="adminResetForm" class="box">
      <div class="brand">iDrama<b>.ai</b></div>
      <div class="muted">កំណត់ Password ថ្មី</div>
      <div class="f"><label>Password ថ្មី</label><input id="adminNewPassword" type="password" minlength="8" required></div>
      <div class="f"><label>បញ្ជាក់ Password ថ្មី</label><input id="adminConfirmPassword" type="password" minlength="8" required></div>
      <button class="btn pink" style="width:100%;margin-top:16px">រក្សាទុក Password ថ្មី</button>
      <div id="adminResetMsg" class="msg"></div>
    </form>`;
    document.body.appendChild(wrap);
    document.getElementById('adminResetForm').onsubmit=async e=>{
      e.preventDefault();
      const p=document.getElementById('adminNewPassword').value;
      const c=document.getElementById('adminConfirmPassword').value;
      const rm=document.getElementById('adminResetMsg');
      if(p!==c){rm.className='msg err';rm.textContent='Password ទាំងពីរមិនដូចគ្នា';return}
      rm.className='msg';rm.textContent='កំពុងរក្សាទុក...';
      const {data,error}=await db.auth.updateUser({password:p});
      if(error){rm.className='msg err';rm.textContent=error.message;return}
      history.replaceState({},'',location.pathname);
      wrap.remove();
      await verifyAndOpen(data.user);
    };
  }

  db.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'||(event==='SIGNED_IN'&&session&&location.search.includes('reset=1'))) showReset();
  });

  if(location.search.includes('reset=1')){
    db.auth.getSession().then(({data})=>{if(data.session) showReset()});
  }
})();
