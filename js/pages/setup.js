const SetupPage = {
  render(container) {
    const info = Store.getSetting('schoolInfo', {});
    container.innerHTML = `<div class="page-container fade-in setup-page">
      <p class="eyebrow">SİZE AİT BİR BAŞLANGIÇ</p>
      <h1 class="page-title">Derslerinizi <span>birlikte düzenleyelim</span></h1>
      <p class="import-description">Önce kendinizi tanıtın. Ardından ders programınızı yükleyerek gruplarınızı ve öğrencilerinizi oluşturun.</p>
      <div class="setup-steps"><span class="active">1 · Kişisel bilgiler</span><span>2 · Programı yükle</span><span>3 · Kontrol et ve başla</span></div>
      <form id="setup-form" class="card import-card">
        <label class="form-label" for="setup-teacher">Adınız soyadınız</label><input class="form-input" id="setup-teacher" required maxlength="120" value="${UI.escape(info.teacher || '')}" autocomplete="name">
        <label class="form-label" for="setup-school">Okul / kurum</label><input class="form-input" id="setup-school" required maxlength="160" value="${UI.escape(info.name || '')}">
        <label class="form-label" for="setup-dept">Branş</label><input class="form-input" id="setup-dept" required maxlength="120" value="${UI.escape(info.department || '')}">
        <label class="form-label" for="setup-year">Eğitim yılı</label><input class="form-input" id="setup-year" required pattern="[0-9]{4}-[0-9]{4}" placeholder="2026-2027" value="${UI.escape(info.year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`)}">
        <button class="btn btn-primary btn-block" type="submit">Bilgileri kaydet ve program yükle →</button>
      </form>
      ${Auth.getCurrentUser()?.email?.toLowerCase() === 'admin@fatsabilsem.com' ? '<button class="btn btn-secondary" onclick="SetupPage.restoreLegacy()">Bu cihazdaki eski yönetici kayıtlarını aktar</button>' : ''}
    </div>`;
    document.getElementById('setup-form').onsubmit = event => {
      event.preventDefault();
      const info = { teacher: document.getElementById('setup-teacher').value.trim(), name: document.getElementById('setup-school').value.trim(), department: document.getElementById('setup-dept').value.trim(), year: document.getElementById('setup-year').value.trim() };
      if (!info.teacher || !info.name || !info.department) return;
      if (!Store.setSetting('schoolInfo', info)) { Toast.show('Bilgiler kaydedilemedi. Cihaz depolamasını kontrol edin.', 'error'); return; }
      ImportPage.render(container, true);
    };
  },
  restoreLegacy() {
    if (Auth.getCurrentUser()?.email?.toLowerCase() !== 'admin@fatsabilsem.com') return;
    const settings = JSON.parse(localStorage.getItem(Store.KEYS.SETTINGS) || '{}');
    if (!settings.customGroups?.length) { Toast.show('Bu cihazda eski program bulunamadı. Ayarlardan yönetici yedeğinizi yükleyebilirsiniz.', 'info'); return; }
    if (!confirm('Bu cihazdaki eski kayıtlar yönetici çalışma alanınıza aktarılsın mı?')) return;
    for (const key of Object.values(Store.KEYS)) {
      const raw = localStorage.getItem(key);
      if (raw) Store._set(key, JSON.parse(raw));
    }
    Store.setSetting('onboardingComplete', true);
    Store.applyWorkspace(); Router.go('home');
  }
};
