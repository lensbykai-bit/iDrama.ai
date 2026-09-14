// Show / hide password controls for iDrama.ai
(function () {
  const eyeOpen = `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>`;

  const eyeClosed = `
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 3 18 18"></path>
      <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 6 10 6a17.8 17.8 0 0 1-3 3.8"></path>
      <path d="M6.6 6.6C3.6 8.5 2 12 2 12s3.5 6 10 6a9.6 9.6 0 0 0 4.2-.9"></path>
      <path d="M10.7 10.7a2 2 0 0 0 2.6 2.6"></path>
    </svg>`;

  const style = document.createElement('style');
  style.textContent = `
    .password-eye-wrap{position:relative;width:100%;display:block}
    .password-eye-wrap>input{width:100%;padding-right:54px!important}
    .password-eye-btn{
      position:absolute;right:10px;top:50%;transform:translateY(-50%);
      width:40px;height:40px;border:0;border-radius:10px;background:transparent;
      color:#9eabba;display:grid;place-items:center;cursor:pointer;padding:0;
      transition:background .18s ease,color .18s ease,transform .18s ease;
    }
    .password-eye-btn:hover{background:rgba(255,255,255,.07);color:#fff}
    .password-eye-btn:active{transform:translateY(-50%) scale(.95)}
    .password-eye-btn:focus-visible{outline:2px solid #ff4c76;outline-offset:2px}
  `;
  document.head.appendChild(style);

  function enhance(input) {
    if (!input || input.dataset.eyeToggle === '1') return;
    input.dataset.eyeToggle = '1';

    const wrap = document.createElement('div');
    wrap.className = 'password-eye-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'password-eye-btn';
    btn.setAttribute('aria-label', 'បង្ហាញ Password');
    btn.setAttribute('title', 'បង្ហាញ Password');
    btn.innerHTML = eyeOpen;
    wrap.appendChild(btn);

    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = showing ? eyeOpen : eyeClosed;
      btn.setAttribute('aria-label', showing ? 'បង្ហាញ Password' : 'លាក់ Password');
      btn.setAttribute('title', showing ? 'បង្ហាញ Password' : 'លាក់ Password');
    });
  }

  function scan(root = document) {
    root.querySelectorAll('input[type="password"]:not([data-eye-toggle="1"])').forEach(enhance);
  }

  scan();

  const observer = new MutationObserver(() => scan());
  observer.observe(document.body, { childList: true, subtree: true });
})();
