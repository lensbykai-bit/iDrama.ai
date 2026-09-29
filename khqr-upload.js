// Direct KHQR image upload for iDrama.ai Admin.
// Uploaded fallback QR is shown to customers when Dynamic KHQR is not configured.
(function(){
  const form=document.getElementById('settingsForm');
  const qrUrl=document.getElementById('qrUrl');
  if(!form||!qrUrl||typeof db==='undefined') return;

  const BUCKET='idrama-khqr';
  const MAX_BYTES=5*1024*1024;
  const allowedTypes=new Set(['image/jpeg','image/png','image/webp']);

  // Keep the URL field for compatibility, but Admin uploads the QR image directly.
  qrUrl.type='hidden';
  qrUrl.removeAttribute('placeholder');
  const oldWrap=qrUrl.closest('.f');
  if(oldWrap){
    const oldLabel=oldWrap.querySelector('label');
    if(oldLabel) oldLabel.textContent='Bakong KHQR (Fallback)';

    const uploader=document.createElement('div');
    uploader.innerHTML=`
      <input id="khqrFile" type="file" accept="image/jpeg,image/png,image/webp">
      <div class="muted" style="margin-top:7px">Upload រូប Bakong KHQR ផ្ទាល់។ JPG, PNG ឬ WEBP មិនលើស 5MB។ QR នេះនឹងបង្ហាញនៅពេលអតិថិជនចុចទូទាត់ ប្រសិនបើ Dynamic KHQR មិនទាន់បានកំណត់។</div>
      <div id="khqrPreviewWrap" style="display:none;margin-top:12px">
        <img id="khqrPreview" alt="Bakong KHQR preview" style="width:220px;max-width:100%;aspect-ratio:1/1;object-fit:contain;background:#fff;padding:10px;border-radius:14px;border:1px solid #334057">
      </div>`;
    oldWrap.appendChild(uploader);
  }

  const fileInput=document.getElementById('khqrFile');
  const preview=document.getElementById('khqrPreview');
  const previewWrap=document.getElementById('khqrPreviewWrap');
  let previewObjectUrl='';

  function showPreview(url){
    if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=''}
    if(url){preview.src=url;previewWrap.style.display='block'}
    else{preview.removeAttribute('src');previewWrap.style.display='none'}
  }

  fileInput?.addEventListener('change',()=>{
    const file=fileInput.files?.[0];
    if(!file){showPreview(qrUrl.value.trim());return}
    if(!allowedTypes.has(file.type)){
      fileInput.value='';
      document.getElementById('settingsMsg').className='msg err';
      document.getElementById('settingsMsg').textContent='សូមជ្រើសរូប JPG, PNG ឬ WEBP ប៉ុណ្ណោះ។';
      return;
    }
    if(file.size>MAX_BYTES){
      fileInput.value='';
      document.getElementById('settingsMsg').className='msg err';
      document.getElementById('settingsMsg').textContent='រូប KHQR ធំពេក។ សូមប្រើរូបមិនលើស 5MB។';
      return;
    }
    previewObjectUrl=URL.createObjectURL(file);
    preview.src=previewObjectUrl;
    previewWrap.style.display='block';
  });

  async function uploadKhqr(file){
    if(!allowedTypes.has(file.type)) throw new Error('សូមប្រើ JPG, PNG ឬ WEBP។');
    if(file.size>MAX_BYTES) throw new Error('រូប KHQR មិនអាចលើស 5MB បានទេ។');
    const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type]||'png';
    const path=`khqr/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:'31536000',contentType:file.type,upsert:false});
    if(error) throw error;
    const {data}=db.storage.from(BUCKET).getPublicUrl(path);
    if(!data?.publicUrl) throw new Error('មិនអាចទទួល URL រូប KHQR បាន។');
    return data.publicUrl;
  }

  const originalLoad=window.loadSettings;
  if(typeof originalLoad==='function'){
    window.loadSettings=async function(){
      await originalLoad();
      showPreview(qrUrl.value.trim());
      if(fileInput) fileInput.value='';
    };
  }

  const originalSubmit=form.onsubmit;
  form.onsubmit=async function(e){
    e.preventDefault();
    const msg=document.getElementById('settingsMsg');
    try{
      const file=fileInput?.files?.[0];
      if(file){
        msg.className='msg';
        msg.textContent='កំពុង Upload Bakong KHQR...';
        const url=await uploadKhqr(file);
        qrUrl.value=url;
        showPreview(url);
      }
      if(typeof originalSubmit==='function') await originalSubmit.call(form,e);
    }catch(err){
      msg.className='msg err';
      msg.textContent='Upload KHQR មិនបាន៖ '+(err?.message||String(err));
    }
  };
})();

// Clear, guided Dynamic KHQR setup inside the Admin website.
(function(){
  const form=document.getElementById('settingsForm');
  const enabled=document.getElementById('bakongEnabled');
  const accountId=document.getElementById('bakongAccountId');
  const accountName=document.getElementById('bakongAccountName');
  const city=document.getElementById('bakongCity');
  const store=document.getElementById('bakongStore');
  const qrUrl=document.getElementById('qrUrl');
  if(!form||!enabled||!accountId||!accountName) return;

  const tab=document.getElementById('tabSettings');
  if(tab) tab.textContent='Bakong KHQR / ទូទាត់';
  const title=form.closest('.panel')?.querySelector('.head h2');
  if(title) title.textContent='រៀបចំប្រព័ន្ធទូទាត់ Bakong KHQR';

  // Add simple Khmer helper text directly under the fields.
  function helper(input,text){
    const wrap=input.closest('.f');
    if(!wrap||wrap.querySelector('.bakong-help')) return;
    const d=document.createElement('div');
    d.className='muted bakong-help';
    d.style.cssText='margin-top:6px;line-height:1.65';
    d.textContent=text;
    wrap.appendChild(d);
  }
  helper(accountId,'បញ្ចូល Bakong Account ID របស់អ្នក (ទម្រង់ប្រហែល username@bank)។');
  helper(accountName,'បញ្ចូលឈ្មោះគណនីឲ្យដូចឈ្មោះដែលបង្ហាញក្នុង Bakong។');
  if(city) helper(city,'ទុក PHNOM PENH បាន ប្រសិនបើអ្នកមិនចង់កែ។');
  if(store) helper(store,'ឈ្មោះហាងដែលបង្ហាញលើ KHQR។ ទុក iDrama.ai បាន។');

  const guide=document.createElement('div');
  guide.id='dynamicKhqrGuide';
  guide.style.cssText='margin:0 0 18px;padding:16px;border:1px solid #334057;border-radius:16px;background:#101620;line-height:1.75';
  guide.innerHTML=`
    <div style="font-weight:800;font-size:16px;margin-bottom:8px">Dynamic KHQR — បង្កើត QR តាម Order ដោយស្វ័យប្រវត្តិ</div>
    <div style="font-family:Battambang,sans-serif;color:#cbd4df">
      ① បើក <b>Enable Bakong KHQR</b> → ② បញ្ចូល <b>Bakong Account ID</b> → ③ បញ្ចូល <b>Account / Merchant Name</b> → ④ ចុច <b>រក្សាទុក</b>។<br>
      ពេលរួច អតិថិជនចុចទិញរឿង នឹងឃើញ QR ដែលមានតម្លៃរបស់ Order នោះភ្លាមៗ។
    </div>
    <div id="dynamicKhqrState" style="margin-top:12px"></div>
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid #283142;color:#9aa5b5;font-family:Battambang,sans-serif">
      សម្រាប់ Auto Verify ការទូទាត់ ត្រូវមាន Secret <code>BAKONG_ACCESS_TOKEN</code> នៅ Supabase។ Token មិនត្រូវរក្សាទុកក្នុងគេហទំព័រ ដើម្បីការពារសុវត្ថិភាព។
    </div>`;
  form.insertBefore(guide,form.firstChild);

  const dynamicFields=[enabled,accountId,accountName,city,store];
  function renderState(){
    const state=document.getElementById('dynamicKhqrState');
    if(!state) return;
    const hasAccount=!!accountId.value.trim();
    const hasName=!!accountName.value.trim();
    const ready=enabled.checked&&hasAccount&&hasName;
    const staticQr=!!qrUrl?.value?.trim();
    state.innerHTML=`
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span style="padding:6px 10px;border-radius:999px;background:${enabled.checked?'#12352b':'#2a2024'};color:${enabled.checked?'#72e0bd':'#ff9baa'}">${enabled.checked?'✓ Dynamic KHQR ON':'○ Dynamic KHQR OFF'}</span>
        <span style="padding:6px 10px;border-radius:999px;background:${hasAccount?'#12352b':'#2a2024'};color:${hasAccount?'#72e0bd':'#ff9baa'}">${hasAccount?'✓ Account ID':'○ Account ID'}</span>
        <span style="padding:6px 10px;border-radius:999px;background:${hasName?'#12352b':'#2a2024'};color:${hasName?'#72e0bd':'#ff9baa'}">${hasName?'✓ Account Name':'○ Account Name'}</span>
        <span style="padding:6px 10px;border-radius:999px;background:${staticQr?'#12352b':'#202938'};color:${staticQr?'#72e0bd':'#c5cfdd'}">${staticQr?'✓ Fallback QR':'○ Fallback QR optional'}</span>
      </div>
      <div style="margin-top:9px;font-family:Battambang,sans-serif;color:${ready?'#72e0bd':'#ffcf72'}">${ready?'✓ Dynamic KHQR Settings រួចរាល់សម្រាប់បង្កើត QR។':'សូមបំពេញចំណុចដែលនៅសល់ខាងលើ។'}</div>`;
  }

  dynamicFields.forEach(el=>{
    el.addEventListener(el.type==='checkbox'?'change':'input',renderState);
  });
  qrUrl?.addEventListener('change',renderState);

  // Refresh the status after settings finish loading from Supabase.
  const refreshLater=()=>setTimeout(renderState,150);
  document.getElementById('tabSettings')?.addEventListener('click',refreshLater);
  form.addEventListener('submit',()=>setTimeout(renderState,500));
  refreshLater();
})();
