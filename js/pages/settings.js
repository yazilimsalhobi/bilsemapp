/**
 * Fatsa BİLSEM — Ayarlar & Veri Yönetim Sayfası
 * Kişisel bilgiler, program düzenleme, öğrenci ekleme, tema, bildirimler
 */

const SettingsPage = {
  render(container) {
    const school = BILSEM_DATA.school;
    const savedSchool = Store.getSetting('schoolInfo', school);
    const theme = Store.getSetting('theme', 'dark');
    const notifEnabled = Store.getSetting('notificationsEnabled', false);
    const reminderMin = Store.getSetting('reminderMinutes', 10);

    container.innerHTML = `
      <div class="page-container fade-in">
        <h1 class="page-title">⚙️ <span>Ayarlar</span></h1>

        <!-- Kişisel ve Kurum Bilgileri (Doğrudan Düzenlenebilir) -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">👤 Kişisel & Kurum Bilgileri</h2>
          </div>
          <div class="card" style="padding: var(--space-lg); background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-lg);">
            <div class="form-group">
              <label class="form-label">👨‍🏫 Öğretmen Adı Soyadı</label>
              <input type="text" class="form-input" id="set-teacher" value="${savedSchool.teacher || school.teacher || ''}" placeholder="Ad Soyad">
            </div>
            <div class="form-group">
              <label class="form-label">🏫 Okul / Kurum Adı</label>
              <input type="text" class="form-input" id="set-school" value="${savedSchool.name || school.name || ''}" placeholder="Okul adı">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label">📚 Branş / Bölüm</label>
                <input type="text" class="form-input" id="set-dept" value="${savedSchool.department || school.department || ''}" placeholder="Branş">
              </div>
              <div class="form-group">
                <label class="form-label">📅 Eğitim Yılı</label>
                <input type="text" class="form-input" id="set-year" value="${savedSchool.year || school.year || ''}" placeholder="2026-2027">
              </div>
            </div>
            <button class="btn btn-primary btn-block btn-lg" onclick="SettingsPage.savePersonalInfo()" style="margin-top: var(--space-sm);">
              💾 Kişisel Bilgileri Kaydet
            </button>
          </div>
        </div>

        <!-- Program & Öğrenci Yönetimi -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📅 Program & Öğrenci Yönetimi</h2>
          </div>
          <div class="settings-menu stagger-children">
            <div class="settings-menu-item gradient-card gradient-cyan" onclick="SettingsPage.editGroups()">
              <div class="settings-menu-icon">📚</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Grup & Ders Yönetimi</div>
                <div class="settings-menu-desc">Grup ekle, ders saatlerini ve günleri düzenle (${BILSEM_DATA.groups.length} grup)</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <div class="settings-menu-item gradient-card gradient-green" onclick="SettingsPage.editStudents()">
              <div class="settings-menu-icon">👥</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Öğrenci Yönetimi</div>
                <div class="settings-menu-desc">Öğrenci ekle, isimleri düzenle, gruptan çıkar (${DataHelpers.getTotalStudentCount()} öğrenci)</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <div class="settings-menu-item gradient-card gradient-orange" onclick="SettingsPage.editParents()">
              <div class="settings-menu-icon">👨‍👩‍👧</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Veli Bilgileri</div>
                <div class="settings-menu-desc">Veli adlarını ve WhatsApp telefonlarını düzenle</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
          </div>
        </div>

        <!-- Uygulama Ayarları -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">🎨 Uygulama Tercihleri</h2>
          </div>
          <div class="settings-toggles">
            <div class="settings-toggle-item">
              <div class="settings-toggle-info">
                <span class="settings-toggle-icon">🌓</span>
                <div>
                  <div class="settings-toggle-title">Karanlık Tema</div>
                  <div class="settings-toggle-desc">Göz yormayan koyu renk teması</div>
                </div>
              </div>
              <div class="toggle ${theme === 'dark' ? 'active' : ''}" onclick="SettingsPage.toggleTheme(this)"></div>
            </div>
            <div class="settings-toggle-item">
              <div class="settings-toggle-info">
                <span class="settings-toggle-icon">🔔</span>
                <div>
                  <div class="settings-toggle-title">Bildirimler</div>
                  <div class="settings-toggle-desc">Ders öncesi hatırlatıcılar ve uyarılar</div>
                </div>
              </div>
              <div class="toggle ${notifEnabled ? 'active' : ''}" onclick="SettingsPage.toggleNotifications(this)"></div>
            </div>
            <div class="settings-toggle-item" style="padding-top: var(--space-md);">
              <div class="settings-toggle-info">
                <span class="settings-toggle-icon">⏱️</span>
                <div>
                  <div class="settings-toggle-title">Ders Hatırlatma Süresi</div>
                  <div class="settings-toggle-desc">Ders başlamadan ne kadar önce bildirilsin</div>
                </div>
              </div>
              <select class="form-select" id="set-reminder" style="width: auto; min-width: 110px; padding: 6px 28px 6px 12px; font-size: var(--font-xs);" onchange="SettingsPage.changeReminderMinutes(this.value)">
                <option value="5" ${reminderMin == 5 ? 'selected' : ''}>5 dk önce</option>
                <option value="10" ${reminderMin == 10 ? 'selected' : ''}>10 dk önce</option>
                <option value="15" ${reminderMin == 15 ? 'selected' : ''}>15 dk önce</option>
                <option value="30" ${reminderMin == 30 ? 'selected' : ''}>30 dk önce</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Tüm Ayarları Kaydet Butonu -->
        <div class="section" style="margin-top: var(--space-md);">
          <button class="btn btn-primary btn-block btn-lg" onclick="SettingsPage.saveAllSettings()" style="box-shadow: 0 6px 20px rgba(108, 92, 231, 0.45); font-weight: 700;">
            💾 Tüm Ayarları Kaydet
          </button>
        </div>

        <!-- İstatistik & Raporlar -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📊 Raporlar & Yedekleme</h2>
          </div>
          <div class="settings-menu stagger-children">
            <div class="settings-menu-item gradient-card gradient-pink" onclick="Router.go('stats')">
              <div class="settings-menu-icon">📊</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">İstatistikler & Grafikler</div>
                <div class="settings-menu-desc">Devam oranları, performans analizleri</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <div class="settings-menu-item gradient-card gradient-blue" onclick="StatsPage.exportData()">
              <div class="settings-menu-icon">📤</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Verileri Dışa Aktar (Yedek Al)</div>
                <div class="settings-menu-desc">Tüm program, öğrenci ve yoklama verilerini JSON olarak indir</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <div class="settings-menu-item gradient-card gradient-dark" onclick="document.getElementById('import-file-settings').click()">
              <div class="settings-menu-icon">📥</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Verileri İçe Aktar (Geri Yükle)</div>
                <div class="settings-menu-desc">JSON yedek dosyasını yükleyip tüm verileri geri getir</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <input type="file" id="import-file-settings" accept=".json" style="display:none;" onchange="StatsPage.importData(event)">
          </div>
        </div>

        <!-- Tehlikeli Bölge -->
        <div class="section">
          <div class="card" style="border: 1px solid rgba(255,107,107,0.25); background: rgba(255,107,107,0.05); padding: var(--space-lg); border-radius: var(--radius-lg);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <span style="font-size: 1.4rem;">⚠️</span>
              <div>
                <div style="font-weight: 700; color: var(--danger);">Veri Sıfırlama</div>
                <div style="font-size: var(--font-xs); color: var(--text-tertiary);">Yoklama, ödev ve not kayıtlarını temizler.</div>
              </div>
            </div>
            <button class="btn btn-danger btn-block btn-sm" onclick="StatsPage.clearData()">🗑️ Tüm Kayıtlı Verileri Sıfırla</button>
          </div>
        </div>

        <!-- Uygulama Hakkında -->
        <div class="section" style="text-align: center; padding-bottom: var(--space-xl);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🏫</div>
          <div style="font-weight: 700; font-size: var(--font-md); color: var(--text-secondary);">Fatsa BİLSEM</div>
          <div style="font-size: var(--font-xs); color: var(--text-tertiary);">Ders Programı & Öğrenci Takip v1.2</div>
          <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: 4px;">Coğrafya & Sosyal Bilgiler • by geogogames</div>
        </div>
      </div>
    `;
  },

  // ========== KİŞİSEL BİLGİLER ==========
  savePersonalInfo() {
    const teacher = document.getElementById('set-teacher')?.value?.trim() || '';
    const name = document.getElementById('set-school')?.value?.trim() || '';
    const department = document.getElementById('set-dept')?.value?.trim() || '';
    const year = document.getElementById('set-year')?.value?.trim() || '';

    const info = { teacher, name, department, year };

    // Store'a kaydet
    Store.setSetting('schoolInfo', info);

    // Aktif oturum belleğini güncelle
    Object.assign(BILSEM_DATA.school, info);

    // Modal açıksa kapat
    App.closeModal();

    Toast.show('Kişisel bilgiler başarıyla kaydedildi! ✅', 'success');
  },

  // ========== TÜM AYARLARI KAYDET ==========
  saveAllSettings() {
    // 1. Kişisel bilgileri al ve kaydet
    const teacher = document.getElementById('set-teacher')?.value?.trim();
    const name = document.getElementById('set-school')?.value?.trim();
    const department = document.getElementById('set-dept')?.value?.trim();
    const year = document.getElementById('set-year')?.value?.trim();

    if (teacher || name) {
      const info = {
        teacher: teacher || BILSEM_DATA.school.teacher,
        name: name || BILSEM_DATA.school.name,
        department: department || BILSEM_DATA.school.department,
        year: year || BILSEM_DATA.school.year
      };
      Store.setSetting('schoolInfo', info);
      Object.assign(BILSEM_DATA.school, info);
    }

    // 2. Özel grupları kalıcı kaydet
    Store.setSetting('customGroups', BILSEM_DATA.groups);

    // 3. Hatırlatma süresini kaydet
    const rem = document.getElementById('set-reminder')?.value;
    if (rem) {
      Store.setSetting('reminderMinutes', parseInt(rem));
    }

    Toast.show('Tüm ayarlar başarıyla kaydedildi! ✅', 'success');
  },

  changeReminderMinutes(val) {
    Store.setSetting('reminderMinutes', parseInt(val));
    Toast.show(`Ders hatırlatması: ${val} dk önce olarak ayarlandı ⏰`, 'info');
  },

  // ========== GRUP & DERS YÖNETİMİ ==========
  editGroups() {
    App.showModal('📚 Grup & Ders Yönetimi', `
      <p style="color: var(--text-tertiary); font-size: var(--font-sm); margin-bottom: var(--space-lg);">
        Aşağıdan düzenlemek istediğiniz gruba dokunun veya yeni bir grup ekleyin.
      </p>

      <div class="stagger-children" id="group-edit-list" style="max-height: 55vh; overflow-y: auto;">
        ${BILSEM_DATA.groups.map((group) => `
          <div class="settings-menu-item" style="cursor: pointer; margin-bottom: 8px;" onclick="SettingsPage.editSingleGroup('${group.id}')">
            <div style="width: 10px; height: 40px; border-radius: var(--radius-full); background: ${group.color}; flex-shrink: 0;"></div>
            <div class="settings-menu-info" style="margin-left: 12px;">
              <div class="settings-menu-title">${group.name}</div>
              <div class="settings-menu-desc">${group.day} • ${group.startTime}-${group.endTime} • ${group.students.length} öğrenci</div>
            </div>
            <span style="color: var(--text-tertiary); font-size: 1.1rem;">✏️</span>
          </div>
        `).join('')}
      </div>
    `, `
      <button class="btn btn-primary btn-block btn-lg" onclick="SettingsPage.addNewGroup()">
        ➕ Yeni Grup Ekle
      </button>
    `);
  },

  editSingleGroup(groupId) {
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    App.showModal(`✏️ ${group.name} Düzenle`, `
      <div class="form-group">
        <label class="form-label">Grup Adı</label>
        <input type="text" class="form-input" id="eg-name" value="${group.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Ders Günü</label>
        <select class="form-select" id="eg-day">
          ${['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'].map(d =>
            `<option value="${d}" ${group.day === d ? 'selected' : ''}>${d}</option>`
          ).join('')}
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Başlangıç Saati</label>
          <input type="time" class="form-input" id="eg-start" value="${group.startTime}">
        </div>
        <div class="form-group">
          <label class="form-label">Bitiş Saati</label>
          <input type="time" class="form-input" id="eg-end" value="${group.endTime}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Ders / Branş</label>
        <input type="text" class="form-input" id="eg-subject" value="${group.subject}">
      </div>
      <div class="form-group">
        <label class="form-label">Zaman Dilimi</label>
        <input type="text" class="form-input" id="eg-slot" value="${group.timeSlot}" placeholder="Akşam Grubu / Sabah Grubu">
      </div>
      <div class="form-group">
        <label class="form-label">Grup Rengi</label>
        <input type="color" class="form-input" id="eg-color" value="${group.color}" style="height: 44px; padding: 4px;">
      </div>
    `, `
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-primary btn-lg" style="flex: 1;" onclick="SettingsPage.saveGroup('${groupId}')">
          💾 Grubu Kaydet
        </button>
        <button class="btn btn-danger btn-sm" title="Grubu Sil" onclick="SettingsPage.deleteGroup('${groupId}')" style="padding: 0 16px;">
          🗑️ Sil
        </button>
      </div>
    `);
  },

  saveGroup(groupId) {
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    group.name = document.getElementById('eg-name')?.value?.trim() || group.name;
    group.day = document.getElementById('eg-day')?.value || group.day;
    group.startTime = document.getElementById('eg-start')?.value || group.startTime;
    group.endTime = document.getElementById('eg-end')?.value || group.endTime;
    group.subject = document.getElementById('eg-subject')?.value?.trim() || group.subject;
    group.timeSlot = document.getElementById('eg-slot')?.value?.trim() || group.timeSlot;
    group.color = document.getElementById('eg-color')?.value || group.color;

    // dayIndex güncelle
    const dayMap = { 'Pazar': 0, 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6 };
    group.dayIndex = dayMap[group.day] !== undefined ? dayMap[group.day] : 1;

    // Ders saatlerini yeniden hesapla
    const startMin = DataHelpers.timeToMinutes(group.startTime);
    const endMin = DataHelpers.timeToMinutes(group.endTime);
    group.lessons = [];
    let currentMin = startMin;
    let order = 1;
    while (currentMin + 40 <= endMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      const endH = Math.floor((currentMin + 40) / 60);
      const endM = (currentMin + 40) % 60;
      group.lessons.push({
        order,
        start: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
        end: `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
      });
      order++;
      currentMin += 50; // 40dk ders + 10dk teneffüs
    }

    // Kalıcı kayıt
    Store.setSetting('customGroups', BILSEM_DATA.groups);
    App.closeModal();
    Toast.show('Grup bilgileri güncellendi! ✅', 'success');

    // Ayarlar sayfasını yenile
    if (Router.currentPage === 'settings') {
      this.render(document.getElementById('page-content'));
    }
  },

  deleteGroup(groupId) {
    if (!confirm('Bu grubu ve içindeki öğrenci listesini silmek istediğinize emin misiniz?')) return;
    BILSEM_DATA.groups = BILSEM_DATA.groups.filter(g => g.id !== groupId);
    Store.setSetting('customGroups', BILSEM_DATA.groups);
    App.closeModal();
    Toast.show('Grup silindi 🗑️', 'info');

    if (Router.currentPage === 'settings') {
      this.render(document.getElementById('page-content'));
    }
  },

  addNewGroup() {
    App.showModal('➕ Yeni Grup Ekle', `
      <div class="form-group">
        <label class="form-label">Grup Adı</label>
        <input type="text" class="form-input" id="ng-name" placeholder="Örn: BYF-3 A">
      </div>
      <div class="form-group">
        <label class="form-label">Ders Günü</label>
        <select class="form-select" id="ng-day">
          ${['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'].map(d =>
            `<option value="${d}">${d}</option>`
          ).join('')}
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Başlangıç Saati</label>
          <input type="time" class="form-input" id="ng-start" value="16:15">
        </div>
        <div class="form-group">
          <label class="form-label">Bitiş Saati</label>
          <input type="time" class="form-input" id="ng-end" value="17:45">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Ders / Branş</label>
        <input type="text" class="form-input" id="ng-subject" value="Coğrafya" placeholder="Coğrafya / Sosyal Bilgiler">
      </div>
      <div class="form-group">
        <label class="form-label">Zaman Dilimi</label>
        <input type="text" class="form-input" id="ng-slot" value="Akşam Grubu" placeholder="Akşam Grubu / Sabah Grubu">
      </div>
      <div class="form-group">
        <label class="form-label">Grup Rengi</label>
        <input type="color" class="form-input" id="ng-color" value="#6C5CE7" style="height: 44px; padding: 4px;">
      </div>
    `, `
      <button class="btn btn-primary btn-block btn-lg" onclick="SettingsPage.saveNewGroup()">
        💾 Grubu Ekle ve Kaydet
      </button>
    `);
  },

  saveNewGroup() {
    const name = document.getElementById('ng-name')?.value?.trim();
    if (!name) { Toast.show('Grup adı giriniz', 'warning'); return; }

    const day = document.getElementById('ng-day')?.value || 'Pazartesi';
    const dayMap = { 'Pazar': 0, 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6 };

    const newGroup = {
      id: 'grp_' + Date.now(),
      name,
      day,
      dayIndex: dayMap[day] !== undefined ? dayMap[day] : 1,
      timeSlot: document.getElementById('ng-slot')?.value?.trim() || 'Akşam Grubu',
      startTime: document.getElementById('ng-start')?.value || '16:15',
      endTime: document.getElementById('ng-end')?.value || '17:45',
      lessons: [],
      subject: document.getElementById('ng-subject')?.value?.trim() || 'Coğrafya',
      color: document.getElementById('ng-color')?.value || '#6C5CE7',
      students: []
    };

    // Ders saatlerini otomatik oluştur
    const startMin = DataHelpers.timeToMinutes(newGroup.startTime);
    const endMin = DataHelpers.timeToMinutes(newGroup.endTime);
    let currentMin = startMin;
    let order = 1;
    while (currentMin + 40 <= endMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      const endH = Math.floor((currentMin + 40) / 60);
      const endM = (currentMin + 40) % 60;
      newGroup.lessons.push({
        order,
        start: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
        end: `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
      });
      order++;
      currentMin += 50;
    }

    BILSEM_DATA.groups.push(newGroup);
    Store.setSetting('customGroups', BILSEM_DATA.groups);
    App.closeModal();
    Toast.show('Yeni grup başarıyla eklendi! 📚', 'success');

    if (Router.currentPage === 'settings') {
      this.render(document.getElementById('page-content'));
    }
  },

  // ========== ÖĞRENCİ YÖNETİMİ ==========
  editStudents() {
    App.showModal('👥 Öğrenci Yönetimi', `
      <p style="color: var(--text-tertiary); font-size: var(--font-sm); margin-bottom: var(--space-md);">
        Öğrencilerini düzenlemek istediğiniz grubu seçin:
      </p>
      <div class="stagger-children" style="max-height: 60vh; overflow-y: auto;">
        ${BILSEM_DATA.groups.map(group => `
          <div class="settings-menu-item" style="cursor: pointer; margin-bottom: 8px;" onclick="SettingsPage.editGroupStudents('${group.id}')">
            <div style="width: 10px; height: 40px; border-radius: var(--radius-full); background: ${group.color}; flex-shrink: 0;"></div>
            <div class="settings-menu-info" style="margin-left: 12px;">
              <div class="settings-menu-title">${group.name}</div>
              <div class="settings-menu-desc">${group.day} • ${group.students.length} öğrenci</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; color: var(--primary-light); font-size: var(--font-sm);">${group.students.length}</span>
              <span style="color: var(--text-tertiary);">→</span>
            </div>
          </div>
        `).join('')}
      </div>
    `);
  },

  editGroupStudents(groupId) {
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    App.showModal(`👥 ${group.name} — Öğrenci Listesi`, `
      <p style="color: var(--text-tertiary); font-size: var(--font-xs); margin-bottom: var(--space-md);">
        Öğrenci isimlerini doğrudan kutulardan değiştirebilir veya alttan yeni öğrenci ekleyebilirsiniz. Bitirdiğinizde aşağıdaki <b>Kaydet</b> butonuna basınız.
      </p>

      <div id="student-edit-list" style="max-height: 45vh; overflow-y: auto; padding-right: 4px;">
        ${group.students.length === 0 ? `
          <div style="text-align: center; color: var(--text-tertiary); padding: var(--space-lg);">Bu grupta henüz öğrenci yok. Alttan ekleyebilirsiniz.</div>
        ` : group.students.map((student, i) => `
          <div class="attendance-item" style="margin-bottom: 6px; gap: 8px;" id="se-${student.id}">
            <div class="student-card-avatar" style="background: ${AttendancePage.getAvatarColor(i)}; width: 32px; height: 32px; font-size: 0.75rem; flex-shrink: 0;">
              ${student.name ? student.name.charAt(0) : '?'}
            </div>
            <div style="flex: 1;">
              <input type="text" class="form-input student-name-input" 
                     data-student-id="${student.id}"
                     value="${student.name}" 
                     placeholder="Öğrenci Adı Soyadı"
                     style="padding: 8px 12px; font-size: var(--font-sm);">
            </div>
            <button class="btn btn-ghost btn-sm" title="Öğrenciyi Sil" onclick="SettingsPage.removeStudent('${groupId}', '${student.id}')" style="color: var(--danger); font-size: 1.1rem; padding: 4px 8px;">✕</button>
          </div>
        `).join('')}
      </div>

      <div class="divider" style="margin: var(--space-md) 0;"></div>

      <div style="display: flex; gap: 8px; margin-bottom: var(--space-sm);">
        <input type="text" class="form-input" id="new-student-name" placeholder="Yeni öğrenci adı soyadı" style="flex: 1;" onkeydown="if(event.key==='Enter') SettingsPage.addStudent('${groupId}')">
        <button class="btn btn-secondary btn-sm" onclick="SettingsPage.addStudent('${groupId}')" style="white-space: nowrap;">➕ Ekle</button>
      </div>

      <div class="divider" style="margin: var(--space-sm) 0;"></div>
      <div style="text-align: center;">
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('csv-upload-${groupId}').click()">
          📥 Excel/CSV'den Toplu Ekle
        </button>
        <input type="file" id="csv-upload-${groupId}" accept=".csv" style="display: none;" onchange="SettingsPage.importCSV(event, '${groupId}')">
        <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top: 4px;">Sadece isim listesi içeren virgülle ayrılmış bir .csv dosyası yükleyin.</div>
      </div>
    `, `
      <button class="btn btn-primary btn-block btn-lg" onclick="SettingsPage.saveGroupStudents('${groupId}')">
        💾 Öğrenci Değişikliklerini Kaydet
      </button>
    `);
  },

  saveGroupStudents(groupId) {
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    // Mevcut öğrenci input alanlarından güncel isimleri topla
    const inputs = document.querySelectorAll('#student-edit-list .student-name-input');
    inputs.forEach(input => {
      const studentId = input.dataset.studentId;
      const student = group.students.find(s => s.id === studentId);
      if (student && input.value.trim()) {
        student.name = input.value.trim();
      }
    });

    // Eğer 'Yeni öğrenci' kutusuna bir şey yazılıp 'Ekle'ye basılmadıysa otomatik ekle
    const newNameInput = document.getElementById('new-student-name');
    const pendingName = newNameInput?.value?.trim();
    if (pendingName) {
      group.students.push({
        id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: pendingName,
        parentName: '',
        parentPhone: ''
      });
    }

    // Kalıcı kayıt
    Store.setSetting('customGroups', BILSEM_DATA.groups);
    App.closeModal();
    Toast.show(`${group.name} öğrenci listesi kaydedildi! ✅`, 'success');

    if (Router.currentPage === 'settings') {
      this.render(document.getElementById('page-content'));
    }
  },

  removeStudent(groupId, studentId) {
    if (!confirm('Bu öğrenciyi gruptan çıkarmak istediğinize emin misiniz?')) return;
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;
    group.students = group.students.filter(s => s.id !== studentId);
    Store.setSetting('customGroups', BILSEM_DATA.groups);
    const el = document.getElementById(`se-${studentId}`);
    if (el) { el.style.animation = 'fadeOut 0.3s ease'; setTimeout(() => el.remove(), 300); }
    Toast.show('Öğrenci listeden çıkarıldı', 'info');
  },

  addStudent(groupId) {
    const nameInput = document.getElementById('new-student-name');
    const name = nameInput?.value?.trim();
    if (!name) { Toast.show('Öğrenci adı giriniz', 'warning'); return; }

    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    const newStudent = {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name,
      parentName: '',
      parentPhone: ''
    };

    group.students.push(newStudent);
    Store.setSetting('customGroups', BILSEM_DATA.groups);
    nameInput.value = '';
    Toast.show(`${name} eklendi! ✅`, 'success');

    // Listeyi yenile
    this.editGroupStudents(groupId);
  },

  importCSV(event, groupId) {
    const file = event.target.files[0];
    if (!file) return;

    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      let count = 0;

      lines.forEach(line => {
        const name = line.trim().replace(/;/g, '').replace(/,/g, '');
        if (name && name.length > 2) {
          group.students.push({
            id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: name,
            parentName: '',
            parentPhone: ''
          });
          count++;
        }
      });

      Store.setSetting('customGroups', BILSEM_DATA.groups);
      Toast.show(`${count} öğrenci CSV'den aktarıldı! ✅`, 'success');
      this.editGroupStudents(groupId);
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  // ========== VELİ BİLGİLERİ TOPLU DÜZENLEME ==========
  editParents() {
    const parents = Store.getAllParentInfo();

    App.showModal('👨‍👩‍👧 Veli Bilgileri — Toplu Düzenleme', `
      <p style="color: var(--text-tertiary); font-size: var(--font-xs); margin-bottom: var(--space-sm);">
        Öğrencilerin veli adı ve WhatsApp telefon numaralarını girin. Bitirdiğinizde kaydet butonuna dokunun.
      </p>

      <div style="margin-bottom: var(--space-md);">
        <input type="text" class="form-input" id="parent-search-input" placeholder="🔍 Öğrenci ara..." oninput="SettingsPage.filterParentList(this.value)" style="padding: 8px 12px; font-size: var(--font-sm);">
      </div>

      <div id="parent-edit-list" style="max-height: 50vh; overflow-y: auto; padding-right: 4px;">
        ${BILSEM_DATA.groups.map(group => `
          <div class="parent-group-section" style="margin-bottom: var(--space-lg);">
            <div style="font-weight: 700; font-size: var(--font-sm); margin-bottom: 8px; display: flex; align-items: center; gap: 8px; position: sticky; top: 0; background: var(--bg-secondary); padding: 4px 0; z-index: 2;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${group.color};"></span>
              ${group.name} <span style="color: var(--text-tertiary); font-weight: 400; font-size: var(--font-xs);">(${group.day})</span>
            </div>
            ${group.students.map(student => {
              const pInfo = parents[student.id];
              return `
                <div class="parent-student-row" data-name="${student.name.toLowerCase()}" style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 6px; margin-bottom: 6px; align-items: center;">
                  <div style="font-size: var(--font-xs); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${student.name}">${student.name}</div>
                  <input type="text" class="form-input" placeholder="Veli adı" 
                         value="${pInfo?.parentName || ''}" 
                         data-student="${student.id}" data-field="name"
                         style="padding: 6px 8px; font-size: var(--font-xs);">
                  <input type="tel" class="form-input" placeholder="05XX XXX XX XX" 
                         value="${pInfo?.parentPhone || ''}" 
                         data-student="${student.id}" data-field="phone"
                         style="padding: 6px 8px; font-size: var(--font-xs);">
                </div>
              `;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `, `
      <button class="btn btn-primary btn-block btn-lg" onclick="SettingsPage.saveAllParents()">
        💾 Veli Bilgilerini Kaydet
      </button>
    `);
  },

  filterParentList(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.parent-student-row').forEach(row => {
      const name = row.dataset.name || '';
      row.style.display = (!q || name.includes(q)) ? 'grid' : 'none';
    });
  },

  saveAllParents() {
    const nameInputs = document.querySelectorAll('[data-field="name"]');
    let count = 0;

    nameInputs.forEach(input => {
      const studentId = input.dataset.student;
      const phoneInput = document.querySelector(`[data-student="${studentId}"][data-field="phone"]`);
      const parentName = input.value.trim();
      const parentPhone = phoneInput?.value?.trim() || '';
      if (parentName || parentPhone) {
        Store.saveParentInfo(studentId, parentName, parentPhone);
        count++;
      }
    });

    App.closeModal();
    Toast.show(`Veli bilgileri başarıyla kaydedildi! ✅ (${count} kayıt)`, 'success');
  },

  // ========== TEMA & BİLDİRİM ==========
  toggleTheme(el) {
    el.classList.toggle('active');
    App.toggleTheme();
  },

  async toggleNotifications(el) {
    const willEnable = !el.classList.contains('active');
    if (willEnable) {
      const granted = await App.enableNotifications();
      if (granted) {
        el.classList.add('active');
        Store.setSetting('notificationsEnabled', true);
        Toast.show('Bildirimler açıldı 🔔', 'success');
      } else {
        el.classList.remove('active');
        Store.setSetting('notificationsEnabled', false);
        Toast.show('Tarayıcı bildirim izni verilmedi', 'warning');
      }
    } else {
      el.classList.remove('active');
      Store.setSetting('notificationsEnabled', false);
      Toast.show('Bildirimler kapatıldı 🔕', 'info');
    }
  }
};
