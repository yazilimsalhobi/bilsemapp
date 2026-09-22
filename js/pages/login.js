/**
 * Fatsa BİLSEM — Login (Giriş) Sayfası (Supabase Auth)
 */

const LoginPage = {
  render(container) {
    container.innerHTML = `
      <div class="page-container fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: var(--space-xl) var(--space-md);">
        
        <div style="text-align: center; margin-bottom: var(--space-xl);">
          <div style="width: 90px; height: 90px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 24px; display: flex; align-items: center; justify-content: center; font-size: 3rem; margin: 0 auto var(--space-md); box-shadow: 0 10px 25px rgba(108, 92, 231, 0.4);">🏫</div>
          <h1 style="font-size: 2.2rem; font-weight: 900; margin-bottom: 8px; background: linear-gradient(135deg, #fff, #a29bfe); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Fatsa BİLSEM</h1>
          <p style="color: var(--text-secondary); font-size: 1.1rem;">Uygulamaya giriş yapın</p>
        </div>

        <div class="card-glass" style="width: 100%; max-width: 400px; padding: var(--space-xl); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          
          <!-- Tabs -->
          <div style="display: flex; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 4px; margin-bottom: var(--space-xl);">
            <button class="btn" id="tab-login" style="flex: 1; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; border: none; font-weight: 600;" onclick="LoginPage.switchTab('login')">Giriş Yap</button>
            <button class="btn btn-ghost" id="tab-register" style="flex: 1; border-radius: 8px; border: none; font-weight: 600;" onclick="LoginPage.switchTab('register')">Kayıt Ol</button>
          </div>

          <!-- Giriş Formu -->
          <div id="form-login" style="display: block;">
            <div class="form-group">
              <label class="form-label" style="color: var(--text-secondary); font-weight: 500;">E-posta Adresi</label>
              <input type="email" id="login-email" class="form-input" placeholder="ornek@mail.com" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 14px;">
            </div>
            <div class="form-group">
              <label class="form-label" style="color: var(--text-secondary); font-weight: 500;">Şifre</label>
              <input type="password" id="login-password" class="form-input" placeholder="Şifreniz" onkeypress="if(event.key === 'Enter') LoginPage.handleLogin()" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 14px;">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; margin-bottom: 20px; font-size: 0.9rem;">
              <label style="display: flex; align-items: center; gap: 8px; color: var(--text-secondary); cursor: pointer;">
                <input type="checkbox" id="login-remember" checked style="accent-color: var(--primary); width: 16px; height: 16px;">
                Beni Hatırla
              </label>
              <a href="#" onclick="LoginPage.handleForgotPassword(event)" style="color: var(--primary); text-decoration: none; font-weight: 500;">Şifremi Unuttum</a>
            </div>

            <button class="btn btn-primary btn-block" onclick="LoginPage.handleLogin()" style="padding: 14px; font-size: 1.1rem; border-radius: 12px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border: none; box-shadow: 0 8px 20px rgba(108, 92, 231, 0.3);">Giriş Yap</button>
          </div>

          <!-- Kayıt Formu -->
          <div id="form-register" style="display: none;">
            <div class="form-group">
              <label class="form-label" style="color: var(--text-secondary); font-weight: 500;">E-posta Adresi</label>
              <input type="email" id="reg-email" class="form-input" placeholder="ornek@mail.com" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 14px;">
            </div>
            <div class="form-group">
              <label class="form-label" style="color: var(--text-secondary); font-weight: 500;">Şifre (En az 6 karakter)</label>
              <input type="password" id="reg-password" class="form-input" placeholder="Şifre belirleyin" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 14px;">
            </div>
            <div class="form-group">
              <label class="form-label" style="color: var(--text-secondary); font-weight: 500;">Öğrenci Numarası</label>
              <input type="text" id="reg-student-id" class="form-input" placeholder="Örn: s001 (Sadece veliler için)" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 14px;">
            </div>
            <button class="btn btn-primary btn-block" style="background: linear-gradient(135deg, var(--success), #00b894); border: none; padding: 14px; font-size: 1.1rem; border-radius: 12px; box-shadow: 0 8px 20px rgba(0, 184, 148, 0.3); margin-top: var(--space-lg);" onclick="LoginPage.handleRegister()">Kayıt Ol</button>
          </div>

          <div class="divider" style="margin: var(--space-xl) 0; color: var(--text-tertiary); font-size: 0.9rem;">veya</div>

          <!-- Google ile Giriş -->
          <button class="btn btn-secondary btn-block" onclick="LoginPage.handleGoogleLogin()" style="display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--text-primary); transition: all 0.3s ease;">
            <svg width="20" height="20" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Google ile Giriş Yap
          </button>
          
          <!-- Legal Links -->
          <div style="margin-top: 24px; text-align: center; font-size: 0.8rem; color: var(--text-tertiary);">
            By continuing, you agree to our <br>
            <a href="terms-of-service.html" target="_blank" style="color: var(--primary); text-decoration: none;">Terms of Service</a> and 
            <a href="privacy-policy.html" target="_blank" style="color: var(--primary); text-decoration: none;">Privacy Policy</a>.
          </div>

        </div>
      </div>
    `;

    // Alt menüyü ve header'ı gizle
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';
    
    const header = document.querySelector('.app-header');
    if (header) header.style.display = 'none';
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
      if (result.needsEmailConfirmation) {
        Toast.show('Kayıt başarılı! Lütfen e-posta adresinize gönderilen onay linkine tıklayarak hesabınızı doğrulayın.', 'success', 6000);
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-student-id').value = '';
        LoginPage.switchTab('login');
      } else {
        Toast.show('Kayıt başarılı! Hoş geldiniz.', 'success');
        App.updateNavigationVisibility();
        Router.go('home');
      }
    } else {
      Toast.show(result.message, 'error');
    }
  },

  async handleForgotPassword(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      Toast.show('Lütfen önce e-posta adresinizi üstteki kutucuğa girin.', 'error');
      return;
    }
    Toast.show('Şifre sıfırlama e-postası gönderiliyor...', 'info');
    const result = await Auth.resetPassword(email);
    if (result.success) {
      Toast.show('Şifre sıfırlama linki e-posta adresinize gönderildi.', 'success', 6000);
    } else {
      Toast.show(result.message, 'error');
    }
  },

  async handleGoogleLogin() {
    await Auth.loginWithGoogle();
  }
};
