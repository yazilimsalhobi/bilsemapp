/**
 * Fatsa BİLSEM — Login (Giriş) Sayfası
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
            <button class="btn" id="tab-teacher" style="flex: 1; border-radius: var(--radius-sm); background: var(--primary); color: white;" onclick="LoginPage.switchTab('teacher')">Personel</button>
            <button class="btn btn-ghost" id="tab-parent" style="flex: 1; border-radius: var(--radius-sm);" onclick="LoginPage.switchTab('parent')">Veli</button>
          </div>

          <!-- Personel Formu -->
          <div id="form-teacher" style="display: block;">
            <div class="form-group">
              <label class="form-label">Kullanıcı Adı</label>
              <input type="text" id="login-username" class="form-input" placeholder="admin veya ogretmen">
            </div>
            <div class="form-group">
              <label class="form-label">Şifre</label>
              <input type="password" id="login-password" class="form-input" placeholder="Şifreniz" onkeypress="if(event.key === 'Enter') LoginPage.handleTeacherLogin()">
            </div>
            <button class="btn btn-primary btn-block" onclick="LoginPage.handleTeacherLogin()" style="margin-top: var(--space-md);">Giriş Yap</button>
            <p style="color: var(--text-tertiary); font-size: 0.75rem; text-align: center; margin-top: 16px;">Demo İçin: admin / admin123 VEYA ogretmen / ogretmen123</p>
          </div>

          <!-- Veli Formu -->
          <div id="form-parent" style="display: none;">
            <div class="form-group">
              <label class="form-label">Öğrenci Numarası</label>
              <input type="text" id="login-student-id" class="form-input" placeholder="Örn: s001, s002...">
            </div>
            <div class="form-group">
              <label class="form-label">Veli Telefonu</label>
              <input type="tel" id="login-parent-phone" class="form-input" placeholder="Sistemde kayıtlı numara (İsteğe bağlı)" onkeypress="if(event.key === 'Enter') LoginPage.handleParentLogin()">
            </div>
            <button class="btn btn-primary btn-block" style="background: var(--success); border-color: var(--success);" onclick="LoginPage.handleParentLogin()" style="margin-top: var(--space-md);">Veli Girişi</button>
            <p style="color: var(--text-tertiary); font-size: 0.75rem; text-align: center; margin-top: 16px;">İpucu: s001 ile s052 arası bir no deneyin.</p>
          </div>

        </div>
      </div>
    `;

    // Alt menüyü gizle (Login sayfasında görünmesin)
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';
  },

  switchTab(tab) {
    const btnTeacher = document.getElementById('tab-teacher');
    const btnParent = document.getElementById('tab-parent');
    const formTeacher = document.getElementById('form-teacher');
    const formParent = document.getElementById('form-parent');

    if (tab === 'teacher') {
      btnTeacher.style.background = 'var(--primary)';
      btnTeacher.style.color = 'white';
      btnTeacher.className = 'btn';
      
      btnParent.style.background = 'transparent';
      btnParent.style.color = 'var(--text-secondary)';
      btnParent.className = 'btn btn-ghost';

      formTeacher.style.display = 'block';
      formParent.style.display = 'none';
    } else {
      btnParent.style.background = 'var(--success)';
      btnParent.style.color = 'white';
      btnParent.className = 'btn';
      
      btnTeacher.style.background = 'transparent';
      btnTeacher.style.color = 'var(--text-secondary)';
      btnTeacher.className = 'btn btn-ghost';

      formParent.style.display = 'block';
      formTeacher.style.display = 'none';
    }
  },

  handleTeacherLogin() {
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();

    if (!u || !p) {
      Toast.show('Kullanıcı adı ve şifre zorunludur.', 'error');
      return;
    }

    let result;
    if (u === 'admin') result = Auth.loginAdmin(u, p);
    else result = Auth.loginTeacher(u, p);

    if (result.success) {
      Toast.show('Hoş geldiniz, ' + result.user.name, 'success');
      App.updateNavigationVisibility();
      Router.go('home');
    } else {
      Toast.show(result.message, 'error');
    }
  },

  handleParentLogin() {
    const sId = document.getElementById('login-student-id').value.trim().toLowerCase();
    const phone = document.getElementById('login-parent-phone').value.trim();

    if (!sId) {
      Toast.show('Lütfen öğrenci numarasını girin.', 'error');
      return;
    }

    const result = Auth.loginParent(sId, phone);

    if (result.success) {
      Toast.show('Hoş geldiniz, ' + result.user.studentName + ' velisi.', 'success');
      App.updateNavigationVisibility();
      Router.go('home');
    } else {
      Toast.show(result.message, 'error');
    }
  }
};
