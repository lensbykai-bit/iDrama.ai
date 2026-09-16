// Split iDrama.ai login and registration into two independent modals
(function(){
  const $=id=>document.getElementById(id);
  const authModal=$('authModal');
  const authBox=authModal?.querySelector('.authbox');
  const loginForm=$('loginForm');
  const registerForm=$('registerForm');
  const authMsg=$('authMsg');
  const actions=$('authExtraActions');
  if(!authModal||!authBox||!loginForm||!registerForm||!authMsg) return;

  const oldTitle=authBox.querySelector('h2');
  const oldTabs=authBox.querySelector('.tabs2');
  if(oldTitle) oldTitle.classList.add('hide');
  if(oldTabs) oldTabs.classList.add('hide');

  function brandBlock(title,subtitle){
    const wrap=document.createElement('div');
    wrap.className='auth-heading';
    wrap.innerHTML=`<div class="auth-brand"><div class="auth-brand-logo">iDrama<b>.ai</b></div><div class="auth-brand-tag">DRAMAS BRING US CLOSER</div><div class="auth-brand-line"></div></div><div class="auth-title">${title}</div><div class="auth-subtitle">${subtitle}</div>`;
    return wrap;
  }

  const loginHeading=brandBlock('ចូលគណនី <span>iDrama.ai</span>','ចូលគណនីរបស់អ្នក ដើម្បីទិញ និងមើលរឿងដែលអ្នកចូលចិត្ត។');
  authBox.insertBefore(loginHeading,loginForm);

  const registerModal=document.createElement('div');
  registerModal.id='registerModal';
  registerModal.className='modal';
  registerModal.innerHTML=`<div class="authbox"><button id="registerClose" class="close" type="button">×</button><div id="registerHeadingMount"></div><div id="registerFormMount"></div><div class="auth-switch">មានគណនីរួចហើយ? <button id="switchToLogin" type="button">ចូលគណនី</button></div></div>`;
  document.body.appendChild(registerModal);
  const registerBox=registerModal.querySelector('.authbox');
  registerBox.querySelector('#registerHeadingMount').replaceWith(brandBlock('បង្កើតគណនី <span>iDrama.ai</span>','បង្កើតគណនីថ្មី ដើម្បីទិញ និងមើលរឿងពេញបានងាយស្រួល។'));
  registerBox.querySelector('#registerFormMount').replaceWith(registerForm);
  registerForm.classList.remove('hide');

  const loginSwitch=document.createElement('div');
  loginSwitch.className='auth-switch';
  loginSwitch.innerHTML='មិនទាន់មានគណនី? <button id="switchToRegister" type="button">បង្កើតគណនី</button>';
  authBox.appendChild(loginSwitch);

  $('loginEmail')?.setAttribute('placeholder','example@email.com');
  $('loginPassword')?.setAttribute('placeholder','បញ្ចូល Password របស់អ្នក');
  $('regName')?.setAttribute('placeholder','បញ្ចូលឈ្មោះរបស់អ្នក');
  $('regEmail')?.setAttribute('placeholder','example@email.com');
  $('regPhone')?.setAttribute('placeholder','+855 12 345 678');
  $('regPassword')?.setAttribute('placeholder','បញ្ចូល Password របស់អ្នក');
  if($('regPhone')) $('regPhone').required=true;

  let confirmInput=$('regConfirmPassword');
  if(!confirmInput){
    const passWrap=$('regPassword')?.closest('.f');
    if(passWrap){
      const confirmWrap=document.createElement('div');
      confirmWrap.className='f';
      confirmWrap.innerHTML='<label>បញ្ជាក់ Password</label><input id="regConfirmPassword" type="password" minlength="6" required placeholder="បញ្ជាក់ Password ម្តងទៀត">';
      passWrap.insertAdjacentElement('afterend',confirmWrap);
      confirmInput=$('regConfirmPassword');
    }
  }

  function placeStatus(box){
    if(!box) return;
    const sw=box.querySelector('.auth-switch');
    if(sw){
      box.insertBefore(authMsg,sw);
      if(actions) box.insertBefore(actions,sw);
    }else{
      box.appendChild(authMsg);
      if(actions) box.appendChild(actions);
    }
  }

  function openLogin(){
    registerModal.classList.remove('show');
    authModal.classList.add('show');
    loginForm.classList.remove('hide');
    const reset=$('userResetForm');
    if(reset && !location.hash.includes('type=recovery') && new URLSearchParams(location.search).get('recovery')!=='1') reset.classList.add('hide');
    placeStatus(authBox);
    document.body.style.overflow='hidden';
  }

  function openRegister(){
    authModal.classList.remove('show');
    registerModal.classList.add('show');
    registerForm.classList.remove('hide');
    placeStatus(registerBox);
    authMsg.textContent='';
    authMsg.className='msg';
    if(actions) actions.innerHTML='';
    document.body.style.overflow='hidden';
  }

  function closeAll(){
    authModal.classList.remove('show');
    registerModal.classList.remove('show');
    document.body.style.overflow='';
  }

  // Replace the original shared modal behavior with two dedicated panels.
  window.openAuth=function(tab='login'){
    if(tab==='register') openRegister(); else openLogin();
  };
  window.switchAuth=function(tab='login'){
    if(tab==='register') openRegister(); else openLogin();
  };

  $('authClose')?.addEventListener('click',closeAll);
  $('registerClose')?.addEventListener('click',closeAll);
  $('switchToRegister')?.addEventListener('click',openRegister);
  $('switchToLogin')?.addEventListener('click',openLogin);
  registerModal.addEventListener('click',e=>{if(e.target===registerModal) closeAll();});

  registerForm.addEventListener('submit',e=>{
    const p1=$('regPassword')?.value||'';
    const p2=$('regConfirmPassword')?.value||'';
    if(!p2 || p1!==p2){
      e.preventDefault();
      e.stopImmediatePropagation();
      placeStatus(registerBox);
      authMsg.className='msg err';
      authMsg.textContent=!p2?'សូមបញ្ជាក់ Password ម្តងទៀត។':'Password ទាំងពីរមិនដូចគ្នា។';
      $('regConfirmPassword')?.focus();
    }
  },true);

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&registerModal.classList.contains('show')) closeAll();});

  // Keep status messages with the currently visible panel.
  db.auth.onAuthStateChange((event,current)=>{
    if(event==='PASSWORD_RECOVERY'){
      placeStatus(authBox);
      registerModal.classList.remove('show');
      authModal.classList.add('show');
      return;
    }
    if(current && ['SIGNED_IN','USER_UPDATED'].includes(event)) closeAll();
  });

  // If recovery UI is already active on load, keep it in the login modal.
  if(location.hash.includes('type=recovery')||new URLSearchParams(location.search).get('recovery')==='1') placeStatus(authBox);
})();
