/**
 * Fatsa BİLSEM — SPA Router
 * Hash-based sayfa yönlendirme
 */

const Router = {
  routes: {},
  currentPage: null,
  pageContainer: null,
  _initialized: false,

  init() {
    this.pageContainer = document.getElementById('page-content');
    if (!this._initialized) {
      window.addEventListener('hashchange', () => this.handleRoute());
      this._initialized = true;
    }
    // İlk yükleme
    this.handleRoute();
  },

  /**
   * Route tanımla
   */
  register(path, handler) {
    this.routes[path] = handler;
  },

  /**
   * Mevcut hash'e göre sayfa yükle
   */
  handleRoute() {
    const hash = window.location.hash.slice(1) || 'home';
    const [page, ...params] = hash.split('/');

    // OAuth redirect'ini kesintiye uğratma
    if (page.startsWith('access_token=') || page.startsWith('error_description=')) {
      return;
    }

    // Auth Guard
    if (page !== 'login' && (!window.Auth || !Auth.isAuthenticated())) {
      if (window.location.hash !== '#login' && window.location.hash !== 'login') {
        window.location.hash = 'login';
      } else {
        this.navigate('login', []);
      }
      return;
    }

    // Zaten giriş yapmışsa login sayfasını atla
    if (page === 'login' && window.Auth && Auth.isAuthenticated()) {
      this.go('home');
      return;
    }

    if (this.routes[page]) {
      this.navigate(page, params);
    } else {
      this.navigate('home', []);
    }
  },

  /**
   * Sayfaya git
   */
  navigate(page, params = []) {
    // Açık olan modal ekranı varsa kapat
    if (window.App && typeof App.closeModal === 'function') {
      App.closeModal();
    }

    // Sadece tam aynı sayfa+parametre ise atla
    const paramsStr = params.join('/');
    if (this.currentPage === page && this._lastParams === paramsStr) return;
    this._lastParams = paramsStr;

    const container = this.pageContainer;
    if (!container) return;

    // Çıkış animasyonu
    container.classList.add('page-exit');

    setTimeout(() => {
      container.classList.remove('page-exit');

      if (this.routes[page]) {
        try {
          this.currentPage = page;
          this.routes[page](container, params);

          // Giriş animasyonu
          container.classList.add('page-enter');
          setTimeout(() => container.classList.remove('page-enter'), 400);

          // Nav güncelle
          this.updateNav(page);

          // Scroll to top
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
          console.error("Sayfa yüklenirken hata oluştu:", err);
          if (window.Toast) {
            Toast.show("Sayfa yüklenirken hata: " + err.message, "error", 10000);
          }
        }
      }
    }, 200);
  },

  /**
   * Bottom nav aktif durumu güncelle
   */
  updateNav(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
  },

  /**
   * Programatik yönlendirme
   */
  go(page, params = '') {
    const newHash = params ? `${page}/${params}` : page;
    if (window.location.hash.slice(1) === newHash) {
      this.handleRoute();
    } else {
      window.location.hash = newHash;
    }
  }
};
