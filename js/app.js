/**
 * Fatsa BİLSEM — Ana Uygulama Kontrolcüsü
 */

const App = {
  async init() {
    try {
      // Toast sistemini hemen başlat
      Toast.init();

      // Router'ı önce kur (kayıt et), ama henüz başlatma
      this.setupRouter();

      // Bottom nav event'leri
      this.setupNavigation();

      // Tema yönetimi
      this.loadTheme();

      // Auth sistemini (Supabase) başlat ve oturumu bekle
      await Auth.init();

      // Auth tamamlandıktan sonra bulut verilerini yükle
      await Store.loadAllFromSupabase();

      // Kayıtlı verileri yükle (okul bilgisi vb.)
      this.loadSavedData();

      // Bildirim sistemini başlat
      Notifications.init();

      console.log('🏫 Fatsa BİLSEM App başlatıldı!');
    } catch (error) {
      console.error('🚨 Uygulama başlatılırken hata:', error);
      
      if (!Toast.container) Toast.init();
      Toast.show('Bağlantı hatası oluştu. Çevrimdışı modda çalışılıyor.', 'error', 8000);

      // Yerel verilerle çalışmayı dene — Router tekrar init edilmez!
      try {
        this.loadSavedData();
      } catch (fallbackError) {
        console.error('🚨 Yedek başlatma da başarısız:', fallbackError);
      }
    } finally {
      // Router ve navigation'ı her durumda başlat (sadece bir kez)
      if (!Router._initialized) {
        Router.init();
      }
      this.updateNavigationVisibility();

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
    Router.register('setup', (container) => SetupPage.render(container));
    Router.register('import', (container) => ImportPage.render(container));
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
    const trigger = document.getElementById('nav-group-trigger');
    const popup = document.getElementById('nav-popup');
    const backdrop = document.getElementById('nav-popup-backdrop');

    // Regular nav items (not inside popup)
    document.querySelectorAll('.bottom-nav .nav-item:not(.nav-group-trigger)').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeNavPopup();
        this.closeModal();
        const page = item.dataset.page;
        if (Router.currentPage === page) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          Router.go(page);
        }
      });
    });

    // Popup trigger toggle
    if (trigger && popup) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleNavPopup();
      });

      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleNavPopup();
        }
      });

      // Popup items navigate + close
      popup.querySelectorAll('.nav-popup-card, .nav-popup-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const page = item.dataset.page;
          this.closeNavPopup();
          this.closeModal();
          if (page) Router.go(page);
        });
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeNavPopup());
    }

    // Click outside closes popup
    document.addEventListener('click', (e) => {
      if (popup && popup.classList.contains('open') && !popup.contains(e.target) && !trigger?.contains(e.target)) {
        this.closeNavPopup();
      }
    });

    // ESC closes popup and modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeNavPopup();
        this.closeModal();
      }
    });
  },

  toggleNavPopup() {
    const popup = document.getElementById('nav-popup');
    const backdrop = document.getElementById('nav-popup-backdrop');
    const trigger = document.getElementById('nav-group-trigger');
    if (!popup) return;
    const isOpen = popup.classList.contains('open');
    if (isOpen) {
      this.closeNavPopup();
    } else {
      popup.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
      if (trigger) {
        trigger.classList.add('active');
        trigger.setAttribute('aria-expanded', 'true');
      }
    }
  },

  closeNavPopup() {
    const popup = document.getElementById('nav-popup');
    const backdrop = document.getElementById('nav-popup-backdrop');
    const trigger = document.getElementById('nav-group-trigger');
    if (popup) popup.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
      const groupedPages = ['attendance', 'homework', 'students'];
      trigger.classList.toggle('active', groupedPages.includes(Router.currentPage));
    }
  },

  updateNavigationVisibility() {
    const bottomNav = document.querySelector('.bottom-nav');
    const logoutBtn = document.getElementById('logout-btn');
    const header = document.querySelector('.app-header');
    
    if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) {
      if (bottomNav) bottomNav.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (header) header.style.display = 'none';
      return;
    }

    if (bottomNav) bottomNav.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (header) header.style.display = 'block';

    const user = Auth.getCurrentUser();
    const isParent = user.role === 'parent';
    const brand = document.querySelector('.header-title');
    const subtitle = document.querySelector('.header-subtitle');
    if (brand) brand.textContent = BILSEM_DATA.school.name || 'BİLSEM';
    if (subtitle) subtitle.textContent = BILSEM_DATA.school.department || 'Kişisel ders takibi';
    
    document.querySelectorAll('.bottom-nav > .nav-item').forEach(item => {
      const page = item.dataset.page;
      if (isParent) {
        // Parents see Home, Schedule, and Dersler (which has attendance inside)
        const parentPages = ['home', 'schedule'];
        const isTrigger = item.classList.contains('nav-group-trigger');
        item.style.display = (parentPages.includes(page) || isTrigger) ? 'flex' : 'none';
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
      if (savedGroups && Array.isArray(savedGroups) && savedGroups.length >= 0) {
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
