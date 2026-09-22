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

    container.innerHTML = `
      <div class="page-container fade-in">
        <h1 class="page-title">⚙️ <span>Ayarlar</span></h1>

        <!-- Kişisel Bilgiler -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">👤 Kişisel Bilgiler</h2>
            <button class="section-action" onclick="SettingsPage.editPersonalInfo()">✏️ Düzenle</button>
          </div>
          <div class="settings-card gradient-card gradient-purple">
            <div class="settings-card-icon">👨‍🏫</div>
            <div class="settings-card-body">
              <div class="settings-card-title" id="display-teacher-name">${savedSchool.teacher || school.teacher}</div>
              <div class="settings-card-subtitle">${savedSchool.department || school.department}</div>
              <div class="settings-card-meta">${savedSchool.name || school.name} • ${savedSchool.year || school.year}</div>
            </div>
            <div class="settings-card-arrow">→</div>
          </div>
        </div>

        <!-- Program Düzenleme -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📅 Program Düzenleme</h2>
          </div>
          <div class="settings-menu stagger-children">
            <div class="settings-menu-item gradient-card gradient-cyan" onclick="SettingsPage.editGroups()">
              <div class="settings-menu-icon">📚</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Grup & Ders Yönetimi</div>
                <div class="settings-menu-desc">Grup ekle, düzenle, ders saatlerini değiştir</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <div class="settings-menu-item gradient-card gradient-green" onclick="SettingsPage.editStudents()">
              <div class="settings-menu-icon">👥</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Öğrenci Yönetimi</div>
                <div class="settings-menu-desc">Öğrenci ekle, çıkar, bilgileri düzenle</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <div class="settings-menu-item gradient-card gradient-orange" onclick="SettingsPage.editParents()">
              <div class="settings-menu-icon">👨‍👩‍👧</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Veli Bilgileri</div>
                <div class="settings-menu-desc">Veli telefon numaralarını toplu düzenle</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
          </div>
        </div>

        <!-- Uygulama Ayarları -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">🎨 Uygulama Ayarları</h2>
          </div>
          <div class="settings-toggles">
            <div class="settings-toggle-item">
              <div class="settings-toggle-info">
                <span class="settings-toggle-icon">🌓</span>
                <div>
                  <div class="settings-toggle-title">Karanlık Tema</div>
                  <div class="settings-toggle-desc">Göz yormayan koyu arayüz</div>
                </div>
              </div>
              <div class="toggle ${theme === 'dark' ? 'active' : ''}" onclick="SettingsPage.toggleTheme(this)"></div>
            </div>
            <div class="settings-toggle-item">
              <div class="settings-toggle-info">
                <span class="settings-toggle-icon">🔔</span>
                <div>
                  <div class="settings-toggle-title">Bildirimler</div>
                  <div class="settings-toggle-desc">Ders hatırlatıcıları ve uyarılar</div>
                </div>
              </div>
              <div class="toggle ${notifEnabled ? 'active' : ''}" onclick="SettingsPage.toggleNotifications(this)"></div>
            </div>
          </div>
        </div>

        <!-- İstatistik & Raporlar -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📊 Raporlar & Veriler</h2>
          </div>
          <div class="settings-menu stagger-children">
            <div class="settings-menu-item gradient-card gradient-pink" onclick="Router.go('stats')">
              <div class="settings-menu-icon">📊</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">İstatistikler</div>
                <div class="settings-menu-desc">Devam oranları, performans raporları</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <div class="settings-menu-item gradient-card gradient-blue" onclick="StatsPage.exportData()">
              <div class="settings-menu-icon">📤</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Verileri Dışa Aktar</div>
                <div class="settings-menu-desc">Tüm verileri JSON olarak kaydet</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <div class="settings-menu-item gradient-card gradient-dark" onclick="document.getElementById('import-file-settings').click()">
              <div class="settings-menu-icon">📥</div>
              <div class="settings-menu-info">
                <div class="settings-menu-title">Verileri İçe Aktar</div>
                <div class="settings-menu-desc">JSON yedek dosyasından geri yükle</div>
              </div>
              <div class="settings-card-arrow">→</div>
            </div>
            <input type="file" id="import-file-settings" accept=".json" style="display:none;" onchange="StatsPage.importData(event)">
          </div>
        </div>

        <!-- Tehlikeli Bölge -->
        <div class="section">
          <div class="card" style="border: 1px solid rgba(255,107,107,0.2); background: rgba(255,107,107,0.05); padding: var(--space-lg);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <span style="font-size: 1.3rem;">⚠️</span>
              <div style="font-weight: 700; color: var(--danger);">Tehlikeli Bölge</div>
            </div>
            <button class="btn btn-danger btn-block btn-sm" onclick="StatsPage.clearData()">🗑️ Tüm Verileri Sil</button>
          </div>
        </div>

        <!-- Uygulama Hakkında -->
        <div class="section" style="text-align: center; padding-bottom: var(--space-xl);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🏫</div>
          <div style="font-weight: 700; font-size: var(--font-md); color: var(--text-secondary);">Fatsa BİLSEM</div>
          <div style="font-size: var(--font-xs); color: var(--text-tertiary);">Ders Programı & Öğrenci Takip v1.0</div>
          <div style="font-size: var(--font-xs); color: var(--text-tertiary); margin-top: 4px;">Coğrafya & Sosyal Bilgiler</div>
        </div>
      </div>
    `;
  },

  // ========== KİŞİSEL BİLGİLER ==========
  editPersonalInfo() {
    const school = BILSEM_DATA.school;
    const saved = Store.getSetting('schoolInfo', school);

    App.showModal('👤 Kişisel Bilgiler', `
      <div class="form-group">
        <label class="form-label">Öğretmen Adı Soyadı</label>
        <input type="text" class="form-input" id="set-teacher" value="${saved.teacher || ''}" placeholder="Ad Soyad">
      </div>
      <div class="form-group">
        <label class="form-label">Okul Adı</label>
        <input type="text" class="form-input" id="set-school" value="${saved.name || ''}" placeholder="Okul adı">
      </div>
      <div class="form-group">
        <label class="form-label">Bölüm / Branş</label>
        <input type="text" class="form-input" id="set-dept" value="${saved.department || ''}" placeholder="Branş">
      </div>
      <div class="form-group">
        <label class="form-label">Eğitim Yılı</label>
        <input type="text" class="form-input" id="set-year" value="${saved.year || ''}" placeholder="2026-2027">
      </div>
      <button class="btn btn-primary btn-block" onclick="SettingsPage.savePersonalInfo()" style="margin-top: var(--space-md);">💾 Kaydet</button>
    `);
  },

  savePersonalInfo() {
    const info = {
      teacher: document.getElementById('set-teacher')?.value?.trim() || '',
      name: document.getElementById('set-school')?.value?.trim() || '',
      department: document.getElementById('set-dept')?.value?.trim() || '',
      year: document.getElementById('set-year')?.value?.trim() || ''
    };
    Store.setSetting('schoolInfo', info);
    // BILSEM_DATA'yı da güncelle
    Object.assign(BILSEM_DATA.school, info);
    App.closeModal();
    Toast.show('Kişisel bilgiler kaydedildi! ✅', 'success');
    this.render(document.getElementById('page-content'));
  },

  // ========== GRUP & DERS YÖNETİMİ ==========
  editGroups() {
    App.showModal('📚 Grup & Ders Yönetimi', `
      <p style="color: var(--text-tertiary); font-size: var(--font-sm); margin-bottom: var(--space-lg);">
        Mevcut grupları düzenleyin veya yeni grup ekleyin.
      </p>

      <div class="stagger-children" id="group-edit-list">
        ${BILSEM_DATA.groups.map((group, i) => `
          <div class="settings-menu-item" style="cursor: pointer; margin-bottom: 8px;" onclick="SettingsPage.editSingleGroup('${group.id}')">
            <div style="width: 10px; height: 40px; border-radius: var(--radius-full); background: ${group.color}; flex-shrink: 0;"></div>
            <div class="settings-menu-info" style="margin-left: 12px;">
              <div class="settings-menu-title">${group.name}</div>
              <div class="settings-menu-desc">${group.day} • ${group.startTime}-${group.endTime} • ${group.students.length} öğrenci</div>
            </div>
            <span style="color: var(--text-tertiary);">✏️</span>
          </div>
        `).join('')}
      </div>

      <div class="divider"></div>
      <button class="btn btn-primary btn-block" onclick="SettingsPage.addNewGroup()">
        ➕ Yeni Grup Ekle
      </button>
    `);
  },

  editSingleGroup(groupId) {
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    App.showModal(`✏️ ${group.name}`, `
      <div class="form-group">
        <label class="form-label">Grup Adı</label>
        <input type="text" class="form-input" id="eg-name" value="${group.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Gün</label>
        <select class="form-select" id="eg-day">
          ${['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'].map(d =>
            `<option value="${d}" ${group.day === d ? 'selected' : ''}>${d}</option>`
          ).join('')}
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Başlangıç</label>
          <input type="time" class="form-input" id="eg-start" value="${group.startTime}">
        </div>
        <div class="form-group">
          <label class="form-label">Bitiş</label>
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
        <label class="form-label">Renk</label>
        <input type="color" class="form-input" id="eg-color" value="${group.color}" style="height: 44px; padding: 4px;">
      </div>
      <div style="display: flex; gap: 8px; margin-top: var(--space-lg);">
        <button class="btn btn-primary" style="flex:1;" onclick="SettingsPage.saveGroup('${groupId}')">💾 Kaydet</button>
        <button class="btn btn-danger btn-sm" onclick="SettingsPage.deleteGroup('${groupId}')">🗑️</button>
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
    group.dayIndex = dayMap[group.day] || 0;

    // Kalıcı kayıt
    Store.setSetting('customGroups', BILSEM_DATA.groups);
    App.closeModal();
    Toast.show('Grup bilgileri güncellendi! ✅', 'success');
  },

  deleteGroup(groupId) {
    if (!confirm('Bu grubu silmek istediğinize emin misiniz?')) return;
    BILSEM_DATA.groups = BILSEM_DATA.groups.filter(g => g.id !== groupId);
    Store.setSetting('customGroups', BILSEM_DATA.groups);
    App.closeModal();
    Toast.show('Grup silindi', 'info');
  },

  addNewGroup() {
    App.showModal('➕ Yeni Grup Ekle', `
      <div class="form-group">
        <label class="form-label">Grup Adı</label>
        <input type="text" class="form-input" id="ng-name" placeholder="Örn: BYF-3 A">
      </div>
      <div class="form-group">
        <label class="form-label">Gün</label>
        <select class="form-select" id="ng-day">
          ${['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'].map(d =>
            `<option value="${d}">${d}</option>`
          ).join('')}
        </select>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="form-group">
          <label class="form-label">Başlangıç</label>
          <input type="time" class="form-input" id="ng-start" value="16:15">
        </div>
        <div class="form-group">
          <label class="form-label">Bitiş</label>
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
        <label class="form-label">Renk</label>
        <input type="color" class="form-input" id="ng-color" value="#6C5CE7" style="height: 44px; padding: 4px;">
      </div>
      <button class="btn btn-primary btn-block" onclick="SettingsPage.saveNewGroup()" style="margin-top: var(--space-md);">➕ Ekle</button>
    `);
  },

  saveNewGroup() {
    const name = document.getElementById('ng-name')?.value?.trim();
    if (!name) { Toast.show('Grup adı giriniz', 'warning'); return; }

    const day = document.getElementById('ng-day')?.value;
    const dayMap = { 'Pazar': 0, 'Pazartesi': 1, 'Salı': 2, 'Çarşamba': 3, 'Perşembe': 4, 'Cuma': 5, 'Cumartesi': 6 };

    const newGroup = {
      id: 'grp_' + Date.now(),
      name,
      day,
      dayIndex: dayMap[day] || 0,
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
      currentMin += 50; // 40dk ders + 10dk teneffüs
    }

    BILSEM_DATA.groups.push(newGroup);
    Store.setSetting('customGroups', BILSEM_DATA.groups);
    App.closeModal();
    Toast.show('Yeni grup eklendi! 📚', 'success');
  },

  // ========== ÖĞRENCİ YÖNETİMİ ==========
  editStudents() {
    App.showModal('👥 Öğrenci Yönetimi', `
      <p style="color: var(--text-tertiary); font-size: var(--font-sm); margin-bottom: var(--space-md);">
        Bir grup seçerek öğrencileri düzenleyin.
      </p>
      <div class="stagger-children">
        ${BILSEM_DATA.groups.map(group => `
          <div class="settings-menu-item" style="cursor: pointer; margin-bottom: 8px;" onclick="SettingsPage.editGroupStudents('${group.id}')">
            <div style="width: 10px; height: 40px; border-radius: var(--radius-full); background: ${group.color}; flex-shrink: 0;"></div>
            <div class="settings-menu-info" style="margin-left: 12px;">
              <div class="settings-menu-title">${group.name}</div>
              <div class="settings-menu-desc">${group.day} • ${group.students.length} öğrenci</div>
            </div>
            <span style="font-weight: 700; color: var(--primary-light);">${group.students.length}</span>
          </div>
        `).join('')}
      </div>
    `);
  },

  editGroupStudents(groupId) {
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    App.showModal(`👥 ${group.name} — Öğrenciler`, `
      <div id="student-edit-list">
        ${group.students.map((student, i) => `
          <div class="attendance-item" style="margin-bottom: 6px;" id="se-${student.id}">
            <div class="student-card-avatar" style="background: ${AttendancePage.getAvatarColor(i)}; width: 32px; height: 32px; font-size: 0.75rem;">
              ${student.name.charAt(0)}
            </div>
            <div style="flex: 1;">
              <input type="text" class="form-input" value="${student.name}" 
                     style="padding: 6px 10px; font-size: var(--font-sm);"
                     onchange="SettingsPage.updateStudentName('${groupId}', '${student.id}', this.value)">
            </div>
            <button class="btn btn-ghost btn-sm" onclick="SettingsPage.removeStudent('${groupId}', '${student.id}')" style="color: var(--danger);">✕</button>
          </div>
        `).join('')}
      </div>

      <div class="divider"></div>

      <div style="display: flex; gap: 8px;">
        <input type="text" class="form-input" id="new-student-name" placeholder="Yeni öğrenci adı" style="flex: 1;">
        <button class="btn btn-primary btn-sm" onclick="SettingsPage.addStudent('${groupId}')">➕</button>
      </div>
    `);
  },

  updateStudentName(groupId, studentId, newName) {
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;
    const student = group.students.find(s => s.id === studentId);
    if (student) {
      student.name = newName.trim();
      Store.setSetting('customGroups', BILSEM_DATA.groups);
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
    Toast.show('Öğrenci çıkarıldı', 'info');
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

    // Listeyi güncelle
    this.editGroupStudents(groupId);
  },

  // ========== VELİ BİLGİLERİ TOPLU DÜZENLEME ==========
  editParents() {
    const allStudents = DataHelpers.getAllStudents();
    const parents = Store.getAllParentInfo();

    App.showModal('👨‍👩‍👧 Veli Bilgileri — Toplu Düzenleme', `
      <p style="color: var(--text-tertiary); font-size: var(--font-sm); margin-bottom: var(--space-lg);">
        Her öğrencinin veli adı ve telefon numarasını girin.
      </p>
      <div id="parent-edit-list" style="max-height: 60vh; overflow-y: auto;">
        ${BILSEM_DATA.groups.map(group => `
          <div style="margin-bottom: var(--space-lg);">
            <div style="font-weight: 700; font-size: var(--font-base); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${group.color};"></span>
              ${group.name} <span style="color: var(--text-tertiary); font-weight: 400; font-size: var(--font-xs);">${group.day}</span>
            </div>
            ${group.students.map(student => {
              const pInfo = parents[student.id];
              return `
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 6px; align-items: center;">
                  <div style="font-size: var(--font-sm); font-weight: 500; padding: 6px 0;">${student.name}</div>
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
      <button class="btn btn-primary btn-block" onclick="SettingsPage.saveAllParents()" style="margin-top: var(--space-md);">💾 Tümünü Kaydet</button>
    `);
  },

  saveAllParents() {
    const nameInputs = document.querySelectorAll('[data-field="name"]');
    const phoneInputs = document.querySelectorAll('[data-field="phone"]');

    nameInputs.forEach(input => {
      const studentId = input.dataset.student;
      const phoneInput = document.querySelector(`[data-student="${studentId}"][data-field="phone"]`);
      const parentName = input.value.trim();
      const parentPhone = phoneInput?.value?.trim() || '';
      if (parentName || parentPhone) {
        Store.saveParentInfo(studentId, parentName, parentPhone);
      }
    });

    App.closeModal();
    Toast.show('Veli bilgileri kaydedildi! ✅', 'success');
  },

  // ========== TEMA & BİLDİRİM ==========
  toggleTheme(el) {
    el.classList.toggle('active');
    App.toggleTheme();
  },

  async toggleNotifications(el) {
    const granted = await App.enableNotifications();
    if (granted) {
      el.classList.add('active');
      Store.setSetting('notificationsEnabled', true);
    } else {
      el.classList.remove('active');
      Store.setSetting('notificationsEnabled', false);
    }
  }
};
