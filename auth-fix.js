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
    if(raw.includes('invalid login credentials')) return 'Email ឬ Password មិនត្រឹមត្រូវ។';
    if(raw.includes('email not confirmed')) return 'Email នេះមិនទាន់បានបញ្ជាក់នៅឡើយទេ។';
    return error?.message||'មានបញ្ហាក្នុងការផ្ញើ Email។ សូមសាកល្បងម្តងទៀត។';
  }
  function finishLogin(s){
    if(!s) return false;
    session=s;
    byId('authModal')?.classList.remove('show');
    if(typeof updateAccount==='function') updateAccount();
    if(currentMovie) openDrama(currentMovie.id);
    return true;
  }
  async function directLogin(email,password){
    const {data,error}=await db.auth.signInWithPassword({email,password});
    if(error) return {ok:false,error};
    if(data?.session){ finishLogin(data.session); return {ok:true}; }
    return {ok:false,error:null};
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
    msg('កំពុងចូលគណនី...');
    const email=byId('regEmail').value.trim();
    const password=byId('regPassword').value;
    const name=byId('regName').value.trim();
    const phone=byId('regPhone').value.trim();
    lastSignupEmail=email;

    const {data,error}=await db.auth.signUp({
      email,
      password,
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

    if(data?.session){
      finishLogin(data.session);
      return;
    }

    // Existing email: Supabase may return an obfuscated user with no identities.
    // Try the password immediately so registration also acts as one-step login.
    const identities=data?.user?.identities;
    if(Array.isArray(identities)&&identities.length===0){
      msg('កំពុងចូលគណនី...');
      const r=await directLogin(email,password);
      if(r.ok) return;
      byId('loginEmail').value=email;
      if(r.error && String(r.error.message||'').toLowerCase().includes('invalid login credentials')){
        msg('Email នេះមានគណនីរួចហើយ ប៉ុន្តែ Password មិនត្រឹមត្រូវ។ សូមពិនិត្យ Password ម្តងទៀត។',true);
      }else{
        msg(friendlyAuthError(r.error),true);
      }
      return;
    }

    // New account: try immediate login. This succeeds when email confirmation is disabled.
    const loginResult=await directLogin(email,password);
    if(loginResult.ok) return;

    if(loginResult.error && String(loginResult.error.message||'').toLowerCase().includes('email not confirmed')){
      msg('គណនីត្រូវបានបង្កើតរួច ប៉ុន្តែ Supabase នៅតម្រូវឱ្យបញ្ជាក់ Email មុនពេលចូល។',true);
      const resendBtn=addAction('ផ្ញើ Confirmation Email ម្តងទៀត',async()=>{
        if(resendBtn.disabled) return;
        msg('កំពុងផ្ញើ Email ម្តងទៀត...');
        resendBtn.disabled=true;
        const {error:re}=await db.auth.resend({
          type:'signup',
          email:lastSignupEmail,
          options:{emailRedirectTo:LIVE_URL}
        });
        if(re){ resendBtn.disabled=false; msg(friendlyAuthError(re),true); return; }
        msg('បានផ្ញើ Confirmation Email ម្តងទៀត ✓ សូមពិនិត្យ Inbox និង Spam/Junk។');
        let left=60;
        resendBtn.textContent=`ផ្ញើម្តងទៀត (${left}s)`;
        const t=setInterval(()=>{
          left--;
          if(left<=0){ clearInterval(t); resendBtn.disabled=false; resendBtn.textContent='ផ្ញើ Confirmation Email ម្តងទៀត'; }
          else resendBtn.textContent=`ផ្ញើម្តងទៀត (${left}s)`;
        },1000);
      });
      return;
    }

    msg(loginResult.error?friendlyAuthError(loginResult.error):'គណនីត្រូវបានបង្កើតរួច។ សូមចូលគណនី។',!!loginResult.error);
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
