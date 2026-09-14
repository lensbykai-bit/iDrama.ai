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

  updateAccount=function(){
    const on=!!session;
    $('authBtn').classList.toggle('hide',on);
    $('logoutBtn').classList.toggle('hide',!on);
    $('userPill').classList.toggle('hide',!on);
    $('userPill').textContent=on?niceName(session.user):'';
  };

  async function refreshName(){
    try{
      const {data}=await db.auth.getSession();
      const s=data?.session||null;
      const on=!!s;
      $('authBtn').classList.toggle('hide',on);
      $('logoutBtn').classList.toggle('hide',!on);
      $('userPill').classList.toggle('hide',!on);
      $('userPill').textContent=on?niceName(s.user):'';
    }catch(e){console.warn('Could not refresh account display name',e)}
  }

  refreshName();
  try{db.auth.onAuthStateChange(()=>setTimeout(refreshName,0));}catch(e){}
})();
