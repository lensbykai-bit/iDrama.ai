// Show account display name in the header instead of the email address.
(function(){
  function niceName(user){
    if(!user) return '';
    const meta=user.user_metadata||{};
    const explicit=(meta.full_name||meta.name||meta.display_name||meta.username||'').trim();
    if(explicit) return explicit;
    const local=(user.email||'').split('@')[0].trim();
    if(!local) return 'User';
    return local
      .replace(/[._-]+/g,' ')
      .replace(/\b\w/g,c=>c.toUpperCase());
  }

  window.updateAccount=function(){
    const on=!!window.session;
    const authBtn=document.getElementById('authBtn');
    const logoutBtn=document.getElementById('logoutBtn');
    const userPill=document.getElementById('userPill');
    if(!authBtn||!logoutBtn||!userPill) return;
    authBtn.classList.toggle('hide',on);
    logoutBtn.classList.toggle('hide',!on);
    userPill.classList.toggle('hide',!on);
    userPill.textContent=on?niceName(window.session.user):'';
  };

  // app.js declares session with let, so read the active Supabase session directly here.
  async function refreshName(){
    try{
      const {data}=await window.db.auth.getSession();
      const s=data?.session||null;
      const userPill=document.getElementById('userPill');
      const authBtn=document.getElementById('authBtn');
      const logoutBtn=document.getElementById('logoutBtn');
      const on=!!s;
      if(authBtn) authBtn.classList.toggle('hide',on);
      if(logoutBtn) logoutBtn.classList.toggle('hide',!on);
      if(userPill){
        userPill.classList.toggle('hide',!on);
        userPill.textContent=on?niceName(s.user):'';
      }
    }catch(e){console.warn('Could not refresh account display name',e)}
  }

  refreshName();
  try{
    window.db.auth.onAuthStateChange(()=>setTimeout(refreshName,0));
  }catch(e){}
})();
