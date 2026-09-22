/**
 * Fatsa BİLSEM — Login (Giriş) Sayfası (Supabase Auth)
 */

const LoginPage = {
  render(container) {
    container.innerHTML = `
      <div class="page-container fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh;">
        
        <div style="text-align: center; margin-bottom: var(--space-xl);">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto var(--space-md); box-shadow: var(--shadow-glow-primary);">🏫</div>
          <h1 style="font-size: var(--font-xl); font-weight: 800; margin-bottom: 8px;">Fatsa BİLSEM</h1>
          <p style="color: var(--text-tertiary); font-size: var(--font-sm);">Sisteme giriş yapın</p>
        </div>

        <div class="card-glass" style="width: 100%; max-width: 400px; padding: var(--space-lg);">
          
          <!-- Tabs -->
          <div style="display: flex; background: rgba(0,0,0,0.2); border-radius: var(--radius-md); padding: 4px; margin-bottom: var(--space-lg);">
            <button class="btn" id="tab-login" style="flex: 1; border-radius: var(--radius-sm); background: var(--primary); color: white;" onclick="LoginPage.switchTab('login')">Giriş Yap</button>
            <button class="btn btn-ghost" id="tab-register" style="flex: 1; border-radius: var(--radius-sm);" onclick="LoginPage.switchTab('register')">Kayıt Ol</button>
          </div>

          <!-- Giriş Formu -->
          <div id="form-login" style="display: block;">
            <div class="form-group">
              <label class="form-label">E-posta</label>
              <input type="email" id="login-email" class="form-input" placeholder="ornek@mail.com">
            </div>
            <div class="form-group">
              <label class="form-label">Şifre</label>
              <input type="password" id="login-password" class="form-input" placeholder="Şifreniz" onkeypress="if(event.key === 'Enter') LoginPage.handleLogin()">
            </div>
            <button class="btn btn-primary btn-block" onclick="LoginPage.handleLogin()" style="margin-top: var(--space-md);">Giriş Yap</button>
          </div>

          <!-- Kayıt Formu -->
          <div id="form-register" style="display: none;">
            <div class="form-group">
              <label class="form-label">E-posta</label>
              <input type="email" id="reg-email" class="form-input" placeholder="ornek@mail.com">
            </div>
            <div class="form-group">
              <label class="form-label">Şifre (En az 6 karakter)</label>
              <input type="password" id="reg-password" class="form-input" placeholder="Şifre belirleyin">
            </div>
            <div class="form-group">
              <label class="form-label">Öğrenci Numarası (Sadece Veliler İçin)</label>
              <input type="text" id="reg-student-id" class="form-input" placeholder="Örn: s001 (İsteğe bağlı)">
            </div>
            <button class="btn btn-primary btn-block" style="background: var(--success); border-color: var(--success);" onclick="LoginPage.handleRegister()" style="margin-top: var(--space-md);">Kayıt Ol</button>
          </div>

          <div class="divider" style="margin: var(--space-lg) 0;">veya</div>

          <!-- Google ile Giriş -->
          <button class="btn btn-secondary btn-block" onclick="LoginPage.handleGoogleLogin()" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Google ile Giriş Yap
          </button>

        </div>
      </div>
    `;

    // Alt menüyü gizle
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';
  },

  switchTab(tab) {
    const btnLogin = document.getElementById('tab-login');
    const btnReg = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formReg = document.getElementById('form-register');

    if (tab === 'login') {
      btnLogin.style.background = 'var(--primary)';
      btnLogin.style.color = 'white';
      btnLogin.className = 'btn';
      btnReg.style.background = 'transparent';
      btnReg.style.color = 'var(--text-secondary)';
      btnReg.className = 'btn btn-ghost';
      formLogin.style.display = 'block';
      formReg.style.display = 'none';
    } else {
      btnReg.style.background = 'var(--primary)';
      btnReg.style.color = 'white';
      btnReg.className = 'btn';
      btnLogin.style.background = 'transparent';
      btnLogin.style.color = 'var(--text-secondary)';
      btnLogin.className = 'btn btn-ghost';
      formReg.style.display = 'block';
      formLogin.style.display = 'none';
    }
  },

  async handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value.trim();

    if (!email || !pass) {
      Toast.show('Lütfen e-posta ve şifrenizi girin.', 'error');
      return;
    }

    Toast.show('Giriş yapılıyor...', 'info');
    const result = await Auth.loginWithEmail(email, pass);

    if (result.success) {
      Toast.show('Hoş geldiniz!', 'success');
      App.updateNavigationVisibility();
      Router.go('home');
    } else {
      Toast.show(result.message, 'error');
    }
  },

  async handleRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value.trim();
    const studentId = document.getElementById('reg-student-id').value.trim().toLowerCase() || null;

    if (!email || pass.length < 6) {
      Toast.show('E-posta zorunludur ve şifre en az 6 karakter olmalıdır.', 'error');
      return;
    }

    Toast.show('Kayıt yapılıyor...', 'info');
    const result = await Auth.registerWithEmail(email, pass, studentId);

    if (result.success) {
      Toast.show('Kayıt başarılı! Hoş geldiniz.', 'success');
      App.updateNavigationVisibility();
      Router.go('home');
    } else {
      Toast.show(result.message, 'error');
    }
  },

  async handleGoogleLogin() {
    await Auth.loginWithGoogle();
  }
};
