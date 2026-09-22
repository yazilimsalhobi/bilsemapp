/**
 * Fatsa BİLSEM — Ana Uygulama Kontrolcüsü
 */

const App = {
  async init() {
    try {
      // Auth sistemini (Supabase) başlat ve oturumu bekle
      await Auth.init();

      // Tüm bulut verilerini (Gruplar, Öğrenciler, Yoklamalar) yükle
      await Store.loadAllFromSupabase();

      // Kayıtlı verileri yükle (okul bilgisi vb.)
      this.loadSavedData();

      // Toast sistemini başlat
      Toast.init();

      // Router'ı başlat
      this.setupRouter();
      Router.init();
      this.updateNavigationVisibility();

      // Bottom nav event'leri
      this.setupNavigation();

      // Bildirim sistemini başlat
      Notifications.init();

      // Tema yönetimi
      this.loadTheme();

      console.log('🏫 Fatsa BİLSEM App başlatıldı!');
    } catch (error) {
      console.error('🚨 Uygulama başlatılırken hata:', error);
      
      // Toast sistemi henüz hazır olmayabilir, init et
      if (!Toast.container) Toast.init();
      Toast.show('Bağlantı hatası oluştu. Lütfen sayfayı yenileyin.', 'error', 8000);

      // Yerel verilerle çalışmayı dene
      try {
        this.loadSavedData();
        if (!Toast.container) Toast.init();
        this.setupRouter();
        Router.init();
        this.updateNavigationVisibility();
        this.setupNavigation();
        this.loadTheme();
      } catch (fallbackError) {
        console.error('🚨 Yedek başlatma da başarısız:', fallbackError);
      }
    } finally {
      // Splash screen'i her durumda kaldır
      setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
          splash.style.opacity = '0';
          setTimeout(() => splash.remove(), 500);
        }
      }, 800);
    }
  },

  setupRouter() {
    Router.register('login', (container) => LoginPage.render(container));
    Router.register('home', (container) => HomePage.render(container));
    Router.register('schedule', (container) => SchedulePage.render(container));
    Router.register('attendance', (container, params) => AttendancePage.render(container, params));
    Router.register('homework', (container, params) => HomeworkPage.render(container, params));
    Router.register('students', (container, params) => StudentsPage.render(container, params));
    Router.register('stats', (container) => StatsPage.render(container));
    Router.register('settings', (container) => SettingsPage.render(container));
    Router.register('annual_plan', (container) => AnnualPlanPage.render(container));
    Router.register('competitions', (container) => CompetitionsPage.render(container));
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();

        // Açık olan modal veya ekranları hemen kapat
        this.closeModal();

        const page = item.dataset.page;
        if (Router.currentPage === page) {
          // Zaten aynı sayfadaysak en üste yumuşak kaydır
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          Router.go(page);
        }
      });
    });

    // ESC tuşuna basıldığında da açık olan ekranı kapat
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  },

  updateNavigationVisibility() {
    const bottomNav = document.querySelector('.bottom-nav');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (!window.Auth || !Auth.isAuthenticated()) {
      if (bottomNav) bottomNav.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      return;
    }

    if (bottomNav) bottomNav.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'flex';

    const user = Auth.getCurrentUser();
    const isParent = user.role === 'parent';
    
    document.querySelectorAll('.nav-item').forEach(item => {
      const page = item.dataset.page;
      if (isParent) {
        if (['home', 'schedule', 'attendance'].includes(page)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      } else {
        item.style.display = 'flex';
      }
    });
  },

  // ====== MODAL ======
  showModal(title, content, footerContent = null) {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = content;

    if (modalFooter) {
      if (footerContent) {
        modalFooter.innerHTML = footerContent;
        modalFooter.style.display = 'block';
      } else {
        modalFooter.innerHTML = '';
        modalFooter.style.display = 'none';
      }
    }

    if (backdrop) backdrop.classList.add('active');
    if (modal) modal.classList.add('active');

    // Dışarıya tıklayınca kapat
    if (backdrop) {
      backdrop.onclick = () => this.closeModal();
    }
  },

  closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal');
    const modalFooter = document.getElementById('modal-footer');

    if (modal) modal.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');

    setTimeout(() => {
      if (modalFooter) {
        modalFooter.innerHTML = '';
        modalFooter.style.display = 'none';
      }
    }, 250);
  },

  // ====== VERİ YÜKLEME ======
  loadSavedData() {
    try {
      const savedSchool = Store.getSetting('schoolInfo');
      if (savedSchool && typeof savedSchool === 'object') {
        Object.assign(BILSEM_DATA.school, savedSchool);
      }

      const savedGroups = Store.getSetting('customGroups');
      if (savedGroups && Array.isArray(savedGroups) && savedGroups.length > 0) {
        BILSEM_DATA.groups = savedGroups;
      }
    } catch (e) {
      console.error('Kayıtlı veriler yüklenirken hata:', e);
    }
  },

  // ====== TEMA ======
  loadTheme() {
    const theme = Store.getSetting('theme', 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    Store.setSetting('theme', next);
    Toast.show(`${next === 'dark' ? '🌙 Karanlık' : '☀️ Aydınlık'} tema aktif`, 'info');
  },

  // ====== BİLDİRİM İZNİ ======
  async enableNotifications() {
    const granted = await Notifications.requestPermission();
    return granted;
  }
};

// Uygulama başlat
document.addEventListener('DOMContentLoaded', () => App.init());
