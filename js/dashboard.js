const Dashboard = {
  links: [
    { id: 'attendance', label: 'Yoklama Al', icon: '✅' }, { id: 'homework', label: 'Ödev Ver', icon: '📝' },
    { id: 'students', label: 'Öğrenciler', icon: '👥' }, { id: 'schedule', label: 'Ders Programı', icon: '🗓️' },
    { id: 'annual_plan', label: 'Yıllık Plan', icon: '📅' }, { id: 'import', label: 'Program Yükle', icon: '📄' },
    { id: 'stats', label: 'İstatistik', icon: '📊' }, { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
    { id: 'competitions', label: 'Yarışmalar', icon: '🏆' }
  ],
  metrics: [
    { id: 'students', label: 'Öğrenci', icon: '👥' }, { id: 'groups', label: 'Grup', icon: '📚' },
    { id: 'attendance', label: 'Yoklama', icon: '📋' }, { id: 'homework', label: 'Aktif Ödev', icon: '📝' }
  ],
  config(type) {
    const saved = Store.getSetting('dashboard', {})[type] || [];
    return this[type].map((item, i) => ({ ...item, visible: true, order: i + 1, ...saved.find(s => s.id === item.id), id: item.id })).sort((a, b) => a.order - b.order);
  },
  render() {
    const stats = Store.getOverallStats();
    const values = { students: DataHelpers.getTotalStudentCount(), groups: DataHelpers.getTotalGroupCount(), attendance: stats.totalSessions, homework: stats.activeHomework };
    return `<section class="section"><div class="section-header"><h2 class="section-title">⚡ Hızlı Erişim</h2><button class="section-action" onclick="Dashboard.edit()">Düzenle</button></div>
      <div class="quick-actions">${this.config('links').filter(s => s.visible).map(s => `<button class="quick-action" onclick="Router.go('${s.id}')"><span class="quick-action-icon">${UI.escape(s.icon)}</span><span class="quick-action-label">${UI.escape(s.label)}</span></button>`).join('')}</div></section>
      <section class="section"><div class="section-header"><h2 class="section-title">📈 Hızlı Bakış</h2><button class="section-action" onclick="Dashboard.edit()">Düzenle</button></div>
      <div class="stats-grid">${this.config('metrics').filter(s => s.visible).map(s => `<div class="stat-card"><div class="stat-card-icon">${UI.escape(s.icon)}</div><div class="stat-card-value">${values[s.id]}</div><div class="stat-card-label">${UI.escape(s.label)}</div></div>`).join('')}</div></section>`;
  },
  edit() {
    App.showModal('Hızlı Bakış ve Hızlı Erişim', `<p>Gösterilecek kartları seçin, adlarını ve sırasını düzenleyin. Sayısal değerler kayıtlarınızdan hesaplanır.</p>${['metrics', 'links'].map(type => `<h3>${type === 'metrics' ? 'Hızlı Bakış' : 'Hızlı Erişim'}</h3>${this.config(type).map(item => `<div class="dashboard-edit-row" data-type="${type}" data-id="${item.id}"><label><input type="checkbox" ${item.visible ? 'checked' : ''} aria-label="${UI.escape(item.label)} göster"> ${UI.escape(item.icon)}</label><input class="form-input" data-field="label" aria-label="Kart adı" maxlength="40" value="${UI.escape(item.label)}"><input class="form-input" data-field="order" aria-label="Sıra" type="number" min="1" max="99" value="${item.order}"></div>`).join('')}`).join('')}`, '<button class="btn btn-secondary" onclick="Dashboard.reset()">Varsayılana dön</button><button class="btn btn-primary" onclick="Dashboard.save()">Kaydet</button>');
  },
  save() {
    const config = { metrics: [], links: [] };
    document.querySelectorAll('.dashboard-edit-row').forEach(row => config[row.dataset.type].push({ id: row.dataset.id, visible: row.querySelector('[type="checkbox"]').checked, label: row.querySelector('[data-field="label"]').value.trim() || this[row.dataset.type].find(i => i.id === row.dataset.id).label, order: Number(row.querySelector('[data-field="order"]').value) || 1 }));
    Store.setSetting('dashboard', config); App.closeModal(); HomePage.render(document.getElementById('page-content'));
  },
  reset() { Store.setSetting('dashboard', {}); App.closeModal(); HomePage.render(document.getElementById('page-content')); }
};
