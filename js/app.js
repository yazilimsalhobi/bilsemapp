/**
 * Fatsa BİLSEM — Ana Uygulama Kontrolcüsü
 */

const App = {
  init() {
    // Toast sistemini başlat
    Toast.init();

    // Router'ı başlat
    this.setupRouter();
    Router.init();

    // Bottom nav event'leri
    this.setupNavigation();

    // Bildirim sistemini başlat
    Notifications.init();

    // Tema yönetimi
    this.loadTheme();

    // Splash screen kaldır
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500);
      }
    }, 1200);

    console.log('🏫 Fatsa BİLSEM App başlatıldı!');
  },

  setupRouter() {
    Router.register('home', (container) => HomePage.render(container));
    Router.register('schedule', (container) => SchedulePage.render(container));
    Router.register('attendance', (container, params) => AttendancePage.render(container, params));
    Router.register('homework', (container, params) => HomeworkPage.render(container, params));
    Router.register('students', (container, params) => StudentsPage.render(container, params));
    Router.register('stats', (container) => StatsPage.render(container));
    Router.register('settings', (container) => SettingsPage.render(container));
  },

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        Router.go(page);
      });
    });
  },

  // ====== MODAL ======
  showModal(title, content) {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = content;
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
    if (modal) modal.classList.remove('active');
    setTimeout(() => {
      if (backdrop) backdrop.classList.remove('active');
    }, 300);
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
