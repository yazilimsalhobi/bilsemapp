/**
 * Fatsa BİLSEM — SPA Router
 * Hash-based sayfa yönlendirme
 */

const Router = {
  routes: {},
  currentPage: null,
  pageContainer: null,

  init() {
    this.pageContainer = document.getElementById('page-content');
    window.addEventListener('hashchange', () => this.handleRoute());
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
    if (this.currentPage === page && params.length === 0) return;

    const container = this.pageContainer;
    if (!container) return;

    // Çıkış animasyonu
    container.classList.add('page-exit');

    setTimeout(() => {
      container.classList.remove('page-exit');

      // Yeni sayfa içeriğini yükle
      if (this.routes[page]) {
        this.currentPage = page;
        this.routes[page](container, params);

        // Giriş animasyonu
        container.classList.add('page-enter');
        setTimeout(() => container.classList.remove('page-enter'), 400);

        // Nav güncelle
        this.updateNav(page);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    window.location.hash = params ? `${page}/${params}` : page;
  }
};
