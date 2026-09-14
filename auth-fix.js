// Robust email signup / confirmation / password recovery flow for iDrama.ai
(function(){
  const byId=id=>document.getElementById(id);
  const authMsg=byId('authMsg');
  const loginForm=byId('loginForm');
  const registerForm=byId('registerForm');
  if(!authMsg||!loginForm||!registerForm) return;

  const LIVE_URL='https://idrama-ai.onrender.com/';
  const RECOVERY_URL=LIVE_URL+'?recovery=1';
  const COOLDOWN_MS=60000;
  const COOLDOWN_KEY='idrama_auth_email_cooldown_until';
  const tabs=document.querySelector('.tabs2');
  let lastSignupEmail='';
  let cooldownTimer=null;

  const actions=document.createElement('div');
  actions.id='authExtraActions';
  actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px';
  authMsg.insertAdjacentElement('afterend',actions);

  const forgot=document.createElement('button');
  forgot.type='button';
  forgot.className='btn dark';
  forgot.style.cssText='margin-top:10px;width:100%';
  forgot.textContent='ភ្លេច Password?';
  loginForm.appendChild(forgot);

  const resetForm=document.createElement('form');
  resetForm.id='userResetForm';
  resetForm.className='hide';
  resetForm.innerHTML=`
    <div class="f"><label>Password ថ្មី</label><input id="userNewPassword" type="password" minlength="6" required></div>
    <div class="f"><label>បញ្ជាក់ Password ថ្មី</label><input id="userConfirmPassword" type="password" minlength="6" required></div>
    <button class="btn pink" style="width:100%;margin-top:14px">រក្សាទុក Password ថ្មី</button>`;
  authMsg.insertAdjacentElement('beforebegin',resetForm);

  function clearActions(){ actions.innerHTML=''; }
  function msg(text,error=false){
    authMsg.className='msg'+(error?' err':'');
    authMsg.textContent=text||'';
  }
  function friendlyAuthError(error){
    const raw=String(error?.message||error||'').toLowerCase();
    if(raw.includes('rate limit')||raw.includes('too many requests')||error?.status===429){
      return 'បានស្នើ Email ច្រើនដងពេក។ សូមរង់ចាំបន្តិច ហើយសាកល្បងម្តងទៀត។';
    }
    return error?.message||'មានបញ្ហាក្នុងការផ្ញើ Email។ សូមសាកល្បងម្តងទៀត។';
  }
  function setCooldown(ms=COOLDOWN_MS){
    const until=Date.now()+ms;
    try{ localStorage.setItem(COOLDOWN_KEY,String(until)); }catch(e){}
    runCooldown(until);
  }
  function runCooldown(until){
    clearInterval(cooldownTimer);
    const tick=()=>{
      const left=Math.max(0,Math.ceil((until-Date.now())/1000));
      if(left<=0){
        clearInterval(cooldownTimer);
        forgot.disabled=false;
        forgot.style.opacity='';
        forgot.textContent='ភ្លេច Password?';
        try{ localStorage.removeItem(COOLDOWN_KEY); }catch(e){}
        return;
      }
      forgot.disabled=true;
      forgot.style.opacity='.65';
      forgot.textContent=`សូមរង់ចាំ ${left} វិនាទី`;
    };
    tick();
    cooldownTimer=setInterval(tick,1000);
  }
  function restoreCooldown(){
    try{
      const until=Number(localStorage.getItem(COOLDOWN_KEY)||0);
      if(until>Date.now()) runCooldown(until);
      else localStorage.removeItem(COOLDOWN_KEY);
    }catch(e){}
  }
  function showLogin(message=''){
    loginForm.classList.remove('hide');
    registerForm.classList.add('hide');
    resetForm.classList.add('hide');
    if(tabs) tabs.classList.remove('hide');
    const lt=byId('loginTab'),rt=byId('registerTab');
    if(lt) lt.className='btn pink';
    if(rt) rt.className='btn dark';
    clearActions();
    if(message) msg(message,false);
    restoreCooldown();
  }
  function showReset(){
    loginForm.classList.add('hide');
    registerForm.classList.add('hide');
    resetForm.classList.remove('hide');
    if(tabs) tabs.classList.add('hide');
    clearActions();
    msg('សូមកំណត់ Password ថ្មីរបស់អ្នក។');
    byId('authModal')?.classList.add('show');
  }
  function addAction(label,handler,kind='soft'){
    const b=document.createElement('button');
    b.type='button';
    b.className='btn '+kind;
    b.textContent=label;
    b.onclick=handler;
    actions.appendChild(b);
    return b;
  }

  registerForm.onsubmit=async e=>{
    e.preventDefault();
    clearActions();
    msg('កំពុងបង្កើតគណនី...');
    const email=byId('regEmail').value.trim();
    const name=byId('regName').value.trim();
    const phone=byId('regPhone').value.trim();
    lastSignupEmail=email;

    const {data,error}=await db.auth.signUp({
      email,
      password:byId('regPassword').value,
      options:{
        data:{full_name:name,phone},
        emailRedirectTo:LIVE_URL
      }
    });

    if(error){
      if(String(error.message||'').toLowerCase().includes('rate limit')||error.status===429) setCooldown();
      msg(friendlyAuthError(error),true);
      return;
    }

    const identities=data?.user?.identities;
    if(Array.isArray(identities)&&identities.length===0){
      byId('loginEmail').value=email;
      showLogin('Email នេះមានគណនីរួចហើយ។ សូមចូលគណនី ឬចុច “ភ្លេច Password?” ប្រសិនបើមិនចាំ Password។');
      return;
    }

    if(data?.session){
      session=data.session;
      byId('authModal')?.classList.remove('show');
      if(typeof updateAccount==='function') updateAccount();
      if(currentMovie) openDrama(currentMovie.id);
      return;
    }

    msg('បានបង្កើតគណនីថ្មី។ សូមពិនិត្យ Inbox និង Spam/Junk ដើម្បីបញ្ជាក់គណនី។');
    const resendBtn=addAction('ផ្ញើ Confirmation Email ម្តងទៀត',async()=>{
      if(resendBtn.disabled) return;
      msg('កំពុងផ្ញើ Email ម្តងទៀត...');
      resendBtn.disabled=true;
      const {error:re}=await db.auth.resend({
        type:'signup',
        email:lastSignupEmail,
        options:{emailRedirectTo:LIVE_URL}
      });
      if(re){
        resendBtn.disabled=false;
        msg(friendlyAuthError(re),true);
        return;
      }
      msg('បានផ្ញើ Confirmation Email ម្តងទៀត ✓ សូមពិនិត្យ Inbox និង Spam/Junk។');
      let left=60;
      resendBtn.textContent=`ផ្ញើម្តងទៀត (${left}s)`;
      const t=setInterval(()=>{
        left--;
        if(left<=0){ clearInterval(t); resendBtn.disabled=false; resendBtn.textContent='ផ្ញើ Confirmation Email ម្តងទៀត'; }
        else resendBtn.textContent=`ផ្ញើម្តងទៀត (${left}s)`;
      },1000);
    });
  };

  forgot.onclick=async()=>{
    if(forgot.disabled) return;
    clearActions();
    const email=byId('loginEmail').value.trim();
    if(!email){
      msg('សូមបញ្ចូល Email ជាមុនសិន។',true);
      byId('loginEmail').focus();
      return;
    }

    forgot.disabled=true;
    forgot.style.opacity='.65';
    msg('កំពុងផ្ញើ Reset Password Email...');
    const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:RECOVERY_URL});
    if(error){
      if(String(error.message||'').toLowerCase().includes('rate limit')||error.status===429){
        setCooldown();
        msg('បានស្នើ Reset Password Email ច្រើនដងពេក។ សូមរង់ចាំយ៉ាងហោចណាស់ 60 វិនាទី ហើយសាកល្បងម្តងទៀត។',true);
      }else{
        forgot.disabled=false;
        forgot.style.opacity='';
        msg(friendlyAuthError(error),true);
      }
      return;
    }

    msg('បានផ្ញើ Reset Password Email ✓ សូមពិនិត្យ Inbox និង Spam/Junk។');
    setCooldown();
  };

  resetForm.onsubmit=async e=>{
    e.preventDefault();
    const p1=byId('userNewPassword').value;
    const p2=byId('userConfirmPassword').value;
    if(p1.length<6) return msg('Password ត្រូវមានយ៉ាងតិច 6 តួអក្សរ។',true);
    if(p1!==p2) return msg('Password ទាំងពីរមិនដូចគ្នា។',true);
    msg('កំពុងរក្សាទុក Password ថ្មី...');
    const {error}=await db.auth.updateUser({password:p1});
    if(error) return msg(error.message||'មិនអាចកែ Password បានទេ',true);
    msg('កែ Password រួចរាល់ ✓ អ្នកអាចចូលគណនីបានហើយ។');
    history.replaceState({},document.title,LIVE_URL);
    setTimeout(()=>showLogin('Password ថ្មីត្រូវបានរក្សាទុករួចរាល់។'),700);
  };

  db.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY') setTimeout(showReset,0);
  });

  const params=new URLSearchParams(location.search);
  if(location.hash.includes('type=recovery')||params.get('recovery')==='1'){
    setTimeout(showReset,100);
  }

  restoreCooldown();
})();
