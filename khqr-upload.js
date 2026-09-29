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
