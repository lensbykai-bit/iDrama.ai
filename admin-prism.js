/* Admin Prism enhancements. Runs after existing admin scripts and keeps their event handlers. */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const form=$('settingsForm'),panel=$('settings');
  if(!form||!panel)return;
  // Add a functional account tab without changing original movie/order/khqr handlers.
  const baseShow=window.show;
  if(typeof baseShow==='function'&&$('tabAccount')){
    window.show=function(name){
      if(name==='account'){
        ['movies','eps','orders','settings'].forEach(id=>$(id)?.classList.add('hide'));
        $('account').classList.remove('hide');
        document.querySelectorAll('.tabs .btn').forEach(btn=>{btn.classList.remove('active');btn.classList.add('soft')});
        $('tabAccount').classList.add('active');$('tabAccount').classList.remove('soft');
        db.auth.getUser().then(({data})=>{$('adminAccountEmail').textContent=data?.user?.email||'Admin'})
           .catch(()=>$('adminAccountEmail').textContent='Admin');
      }else{
        $('account')?.classList.add('hide');
        baseShow(name);
        if($('tabAccount')){$('tabAccount').classList.remove('active');$('tabAccount').classList.add('soft')}
        if(name==='settings')setTimeout(refreshPaymentOverview,150);
      }
    };
    $('tabAccount').onclick=()=>window.show('account');
  }
  $('openPayment')?.addEventListener('click',()=>{
    if(typeof window.show==='function')window.show('settings');
    window.scrollTo({top:0,behavior:'smooth'});
  });
  // Keep account passwords in Supabase Auth; never persist them in local storage.
  $('adminPasswordForm')?.addEventListener('submit',async event=>{
    event.preventDefault();
    const msg=$('adminPasswordMsg'),newPass=$('adminPasswordNew').value,confirm=$('adminPasswordConfirm').value;
    msg.className='msg';
    if(newPass.length<10){msg.className='msg err';msg.textContent='សូមប្រើ Password យ៉ាងតិច 10 តួអក្សរ';return}
    if(newPass!==confirm){msg.className='msg err';msg.textContent='Password ទាំងពីរមិនដូចគ្នា';return}
    msg.textContent='កំពុងកំណត់ Password...';
    try{
      const {data:auth,error:authErr}=await db.auth.getUser();
      if(authErr||!auth?.user)throw new Error('សូម Login ម្តងទៀត');
      const {data:admin,error:adminErr}=await db.from('admins').select('user_id').eq('user_id',auth.user.id).maybeSingle();
      if(adminErr||!admin)throw new Error('គណនីនេះមិនមានសិទ្ធិ Admin');
      const {error}=await db.auth.updateUser({password:newPass});
      if(error)throw error;
      msg.className='msg';msg.textContent='បានប្តូរ Password រួចរាល់ ✓';
      $('adminPasswordForm').reset();
    }catch(error){msg.className='msg err';msg.textContent='ប្តូរមិនបាន៖ '+(error?.message||String(error))}
  });
  // Reduce clutter in the Movie Editor: move secondary metadata under expandable Advanced Options.
  const movieGrid=$('title')?.closest('.grid');
  if(movieGrid&&!document.getElementById('prismAdvanced')){
    const details=document.createElement('details');
    details.className='prism-advanced';details.id='prismAdvanced';
    details.innerHTML='<summary>ជម្រើសបន្ថែម — Genre, Views, Rating, Poster Styling និងសង្ខេបសាច់រឿង</summary><div class="prism-advanced-fields"></div>';
    ['genre','word','accent','views','rating','description'].forEach(id=>{
      const field=$(id)?.closest('.f');
      if(field)details.querySelector('.prism-advanced-fields').appendChild(field);
    });
    movieGrid.appendChild(details);
    const editButton=$('newMovie');
    editButton?.addEventListener('click',()=>{details.open=false});
  }
  // Organize preexisting Bakong widgets (injected by bakong-admin.js and khqr-upload.js).
  const merchant=$('bakongAccountId')?.closest('.grid')?.parentElement;
  const qrWrap=$('qrUrl')?.closest('.f');
  const noteWrap=$('paymentNote')?.closest('.f');
  const guide=$('dynamicKhqrGuide');
  if(guide)guide.classList.add('prism-dynamic-guide');
  if(merchant&&qrWrap&&noteWrap&&!form.querySelector('.prism-config-grid')){
    const row=document.createElement('div');row.className='prism-config-grid';
    const left=document.createElement('section');left.className='prism-config-group merchant';
    const right=document.createElement('section');right.className='prism-config-group fallback';
    left.innerHTML='<h3>01 · គណនីទទួលប្រាក់ / Dynamic KHQR</h3><p>បើកការទូទាត់ និងបញ្ចូលព័ត៌មាន Bakong Merchant ត្រឹមត្រូវ។</p>';
    right.innerHTML='<h3>02 · QR &amp; ព័ត៌មានបន្ថែម</h3><p>Fallback QR ជាជម្រើសបន្ថែម។ Checkout ពិតអាស្រ័យលើការបង្កើត QR ដោយ Server។</p>';
    left.appendChild(merchant);right.appendChild(qrWrap);right.appendChild(noteWrap);
    row.appendChild(left);row.appendChild(right);
    form.insertBefore(row,form.querySelector('.actions'));
    const foot=document.createElement('div');
    foot.className='payment-helpfoot';foot.textContent='ការបើក Dynamic KHQR និងការរក្សាទុក Account ID មិនមានន័យថា Auto Verify បានសាកល្បងជោគជ័យទេ។ ត្រូវមាន Bakong server token ដែលមានសុពលភាព និងការផ្ទៀងផ្ទាត់ពីប្រព័ន្ធ Backend។';
    form.insertBefore(foot,form.querySelector('.actions'));
  }
  // Read-only configuration health. We never fetch or reveal secret access tokens here.
  function mark(id,primary,detail,level){
    const el=$(id),desc=$(id.replace('State','Desc'));
    if(el){el.textContent=primary;el.closest('.payment-state-card').dataset.state=level}
    if(desc)desc.textContent=detail;
  }
  async function refreshPaymentOverview(){
    mark('prismBakongState','កំពុងពិនិត្យ...','អានការកំណត់ពី Supabase','loading');
    try{
      const {data,error}=await db.from('site_settings')
        .select('bakong_enabled,bakong_account_id,bakong_account_name,bakong_qr_url')
        .eq('id',1).maybeSingle();
      if(error)throw error;
      if(!data){['prismBakongState','prismMerchantState','prismFallbackState'].forEach(id=>mark(id,'មិនទាន់មានការកំណត់','រកមិនឃើញ site_settings','attention'));return}
      const enabled=!!data.bakong_enabled,hasId=!!String(data.bakong_account_id||'').trim();
      const hasName=!!String(data.bakong_account_name||'').trim(),hasQr=!!String(data.bakong_qr_url||'').trim();
      mark('prismBakongState',enabled?'បានបើក':'បានបិទ',enabled?'Enabled ក្នុង Database':'អតិថិជនមិនគួរបង់នៅពេលបិទ',''+(enabled?'ready':'attention'));
      mark('prismMerchantState',hasId&&hasName?'បានបំពេញ':'មិនទាន់ពេញលេញ',hasId&&hasName?'Account ID និងឈ្មោះមានរួច':'សូមបញ្ចូល Account ID និងឈ្មោះ',hasId&&hasName?'ready':'attention');
      mark('prismFallbackState',hasQr?'មានរូប QR':'មិនទាន់មាន',hasQr?'រូប Fallback បានរក្សាទុក':'មិនចាំបាច់ បើ Server KHQR ដំណើរការ',hasQr?'ready':'attention');
    }catch(error){
      ['prismBakongState','prismMerchantState','prismFallbackState'].forEach(id=>mark(id,'មិនអាចពិនិត្យ','សូមពិនិត្យ Supabase / Admin Session','error'));
    }
  }
  const checkButton=document.createElement('button');
  checkButton.type='button';checkButton.className='prism-check-settings';
  checkButton.textContent='↻ ពិនិត្យការកំណត់ក្នុង Database ម្តងទៀត';
  form.parentElement?.querySelector('.head')?.appendChild(checkButton);
  checkButton.addEventListener('click',refreshPaymentOverview);
  $('tabSettings')?.addEventListener('click',()=>setTimeout(refreshPaymentOverview,200));
  form.addEventListener('submit',()=>setTimeout(refreshPaymentOverview,1600));
  // Refresh after auth login completes without disclosing private credentials.
  const app=$('app');
  if(app){
    const observer=new MutationObserver(()=>{
      if(!app.classList.contains('hide')){
        observer.disconnect();refreshPaymentOverview();
      }
    });
    if(app.classList.contains('hide'))observer.observe(app,{attributes:true,attributeFilter:['class']});
    else refreshPaymentOverview();
  }
})();