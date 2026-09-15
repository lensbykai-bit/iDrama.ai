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
  registerBtn.innerHTML = '<span class="auth-icon">＋</span><span>បង្កើតគណនី</span>';

  const loginBtn = document.createElement('button');
  loginBtn.id = 'headerLoginBtn';
  loginBtn.type = 'button';
  loginBtn.className = 'btn header-login-btn';
  loginBtn.innerHTML = '<span class="auth-icon">↪</span><span>ចូលគណនី</span>';

  account.insertBefore(registerBtn, oldBtn);
  account.insertBefore(loginBtn, oldBtn);

  const style = document.createElement('style');
  style.textContent = `
    .header-register-btn,
    .header-login-btn{
      min-height:44px;
      border-radius:14px;
      padding:9px 15px;
      font-family:Battambang,Inter,sans-serif;
      font-size:13px;
      font-weight:700;
      white-space:nowrap;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:7px;
      border:1px solid transparent;
      letter-spacing:.05px;
      transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease,color .18s ease;
    }

    .header-register-btn{
      background:rgba(255,62,104,.10);
      color:#ff9db3;
      border-color:rgba(255,62,104,.34);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.025);
    }

    .header-login-btn{
      background:linear-gradient(135deg,#ff3e68 0%,#ff557b 100%);
      color:#fff;
      border-color:#ff6f8e;
      box-shadow:0 8px 22px rgba(255,62,104,.20),inset 0 1px 0 rgba(255,255,255,.12);
    }

    .header-register-btn .auth-icon,
    .header-login-btn .auth-icon{
      width:21px;
      height:21px;
      border-radius:7px;
      display:inline-grid;
      place-items:center;
      line-height:1;
      font-family:Inter,sans-serif;
      font-weight:800;
      font-size:14px;
    }

    .header-register-btn .auth-icon{
      background:rgba(255,62,104,.12);
      color:#ff7898;
    }

    .header-login-btn .auth-icon{
      background:rgba(10,14,21,.18);
      color:#fff;
    }

    .header-register-btn:hover{
      background:rgba(255,62,104,.16);
      border-color:rgba(255,91,126,.60);
      color:#ffc0cf;
      transform:translateY(-1px);
      box-shadow:0 7px 18px rgba(255,62,104,.10);
    }

    .header-login-btn:hover{
      background:linear-gradient(135deg,#ff4b73 0%,#ff6687 100%);
      border-color:#ff91a8;
      transform:translateY(-1px);
      box-shadow:0 10px 26px rgba(255,62,104,.28);
    }

    .header-register-btn:active,
    .header-login-btn:active{
      transform:translateY(0) scale(.98);
    }

    .header-register-btn:focus-visible,
    .header-login-btn:focus-visible{
      outline:2px solid #ff7898;
      outline-offset:2px;
    }

    @media(max-width:860px){
      .header-register-btn,.header-login-btn{
        min-height:40px;
        padding:8px 11px;
        font-size:12px;
        border-radius:12px;
      }
      .header-register-btn .auth-icon,
      .header-login-btn .auth-icon{
        width:19px;
        height:19px;
        font-size:12px;
      }
    }

    @media(max-width:560px){
      .account{gap:5px!important}
      .header-register-btn,.header-login-btn{
        padding:8px 9px;
        font-size:11px;
      }
      .header-register-btn .auth-icon,
      .header-login-btn .auth-icon{
        display:none;
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
