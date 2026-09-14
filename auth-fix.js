// Robust email signup / confirmation / password recovery flow for iDrama.ai
(function(){
  const byId=id=>document.getElementById(id);
  const authMsg=byId('authMsg');
  const loginForm=byId('loginForm');
  const registerForm=byId('registerForm');
  if(!authMsg||!loginForm||!registerForm) return;

  const authBox=document.querySelector('.authbox');
  const tabs=document.querySelector('.tabs2');
  let lastSignupEmail='';

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

  // Replace the original signup handler with clearer duplicate-user handling.
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
        emailRedirectTo:location.origin+location.pathname
      }
    });

    if(error){
      msg(error.message||'មិនអាចបង្កើតគណនីបានទេ',true);
      return;
    }

    // Supabase intentionally returns an obfuscated user with no identities when
    // this email is already registered. No confirmation email is sent.
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

    msg('បានបង្កើតគណនីថ្មី។ សូមពិនិត្យ Inbox និង Spam/Junk របស់ Email ដើម្បីបញ្ជាក់គណនី។');
    addAction('ផ្ញើ Confirmation Email ម្តងទៀត',async()=>{
      msg('កំពុងផ្ញើ Email ម្តងទៀត...');
      const {error:re}=await db.auth.resend({
        type:'signup',
        email:lastSignupEmail,
        options:{emailRedirectTo:location.origin+location.pathname}
      });
      if(re) msg(re.message||'មិនអាចផ្ញើ Email ម្តងទៀតបានទេ',true);
      else msg('បានផ្ញើ Confirmation Email ម្តងទៀត ✓ សូមពិនិត្យ Inbox និង Spam/Junk។');
    });
  };

  forgot.onclick=async()=>{
    clearActions();
    const email=byId('loginEmail').value.trim();
    if(!email){
      msg('សូមបញ្ចូល Email ជាមុនសិន។',true);
      byId('loginEmail').focus();
      return;
    }
    msg('កំពុងផ្ញើ Reset Password Email...');
    const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error) msg(error.message||'មិនអាចផ្ញើ Reset Email បានទេ',true);
    else msg('បានផ្ញើ Reset Password Email ✓ សូមពិនិត្យ Inbox និង Spam/Junk។');
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
    setTimeout(()=>showLogin('Password ថ្មីត្រូវបានរក្សាទុករួចរាល់។'),700);
  };

  // Recovery links establish a temporary session and emit PASSWORD_RECOVERY.
  db.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY') setTimeout(showReset,0);
  });

  if(location.hash.includes('type=recovery')) setTimeout(showReset,0);
})();
