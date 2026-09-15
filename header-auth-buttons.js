// Separate Register / Login buttons in the iDrama.ai header
(function () {
  const oldBtn = document.getElementById('authBtn');
  const account = document.querySelector('.account');
  if (!account || !oldBtn || document.getElementById('headerRegisterBtn')) return;

  // Keep the original button for compatibility with app.js, but do not show it.
  oldBtn.style.display = 'none';

  const registerBtn = document.createElement('button');
  registerBtn.id = 'headerRegisterBtn';
  registerBtn.type = 'button';
  registerBtn.className = 'btn header-register-btn';
  registerBtn.textContent = 'បង្កើតគណនី';

  const loginBtn = document.createElement('button');
  loginBtn.id = 'headerLoginBtn';
  loginBtn.type = 'button';
  loginBtn.className = 'btn header-login-btn';
  loginBtn.textContent = 'ចូលគណនី';

  account.insertBefore(registerBtn, oldBtn);
  account.insertBefore(loginBtn, oldBtn);

  const style = document.createElement('style');
  style.textContent = `
    .header-register-btn,
    .header-login-btn{
      min-height:44px;
      border-radius:13px;
      padding:10px 16px;
      font-family:Battambang,Inter,sans-serif;
      font-weight:700;
      white-space:nowrap;
      border:1px solid transparent;
      transition:transform .18s ease,filter .18s ease,box-shadow .18s ease;
    }
    .header-register-btn{
      background:#07965e;
      color:#fff;
      border-color:#10b574;
      box-shadow:0 7px 18px rgba(0,151,94,.16);
    }
    .header-login-btn{
      background:#a8070a;
      color:#fff;
      border-color:#d72b2f;
      box-shadow:0 7px 18px rgba(168,7,10,.16);
    }
    .header-register-btn:hover,.header-login-btn:hover{
      transform:translateY(-1px);
      filter:brightness(1.08);
    }
    @media(max-width:760px){
      .header-register-btn,.header-login-btn{
        min-height:40px;
        padding:8px 10px;
        font-size:12px;
      }
    }
    @media(max-width:540px){
      .account{gap:5px!important}
      .header-register-btn,.header-login-btn{
        padding:8px 9px;
        font-size:11px;
      }
    }
  `;
  document.head.appendChild(style);

  registerBtn.addEventListener('click', () => {
    if (typeof openAuth === 'function') openAuth('register');
  });

  loginBtn.addEventListener('click', () => {
    if (typeof openAuth === 'function') openAuth('login');
  });

  async function sync() {
    try {
      const { data: { session: current } } = await db.auth.getSession();
      const loggedIn = !!current;
      registerBtn.classList.toggle('hide', loggedIn);
      loginBtn.classList.toggle('hide', loggedIn);
    } catch (_) {}
  }

  db.auth.onAuthStateChange((_event, current) => {
    const loggedIn = !!current;
    registerBtn.classList.toggle('hide', loggedIn);
    loginBtn.classList.toggle('hide', loggedIn);
  });

  sync();
})();
