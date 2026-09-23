const ImportPage = {
  draft: [],
  allParsedGroups: [],
  selectedSubjects: new Set(),
  step: 1, // 1=dosya, 2=branş seçimi, 3=önizleme

  async render(container, onboarding = false) {
    this.owner = Store.userId; this.onboarding = onboarding;
    this.draft = []; this.allParsedGroups = []; this.selectedSubjects = new Set();
    this.step = 1; this.busy = false;
    container.innerHTML = `<div class="page-container fade-in">
      <p class="eyebrow">PROGRAM AKTARIMI</p><h1 class="page-title">Dosyanızdan <span>ders programına</span></h1>
      <p class="import-description">PDF veya fotoğrafınızdaki günleri, saatleri, grup ve öğrenci adlarını okuyalım. Branşınızı seçin, yalnızca size ait program oluşturulsun.</p>
      <div class="setup-steps" id="import-steps">
        <span class="active">1 · Dosya yükle</span><span>2 · Branş seç</span><span>3 · Kontrol et</span>
      </div>
      <div id="import-step-content"></div>
      ${onboarding ? '<button class="btn btn-ghost" id="skip-import">Boş programla başla, daha sonra yükle</button>' : ''}
    </div>`;
    if (onboarding) document.getElementById('skip-import').onclick = () => { Store.setSetting('onboardingComplete', true); Router.go('home'); };
    this.renderStep();
  },

  updateStepIndicator() {
    const steps = document.querySelectorAll('#import-steps span');
    steps.forEach((span, i) => {
      span.classList.toggle('active', i + 1 === this.step);
      span.classList.toggle('completed', i + 1 < this.step);
    });
  },

  renderStep() {
    this.updateStepIndicator();
    const target = document.getElementById('import-step-content');
    if (!target) return;
    if (this.step === 1) this.renderFileStep(target);
    else if (this.step === 2) this.renderBranchStep(target);
    else if (this.step === 3) this.renderPreviewStep(target);
  },

  // ===== ADIM 1: Dosya Yükleme =====
  renderFileStep(target) {
    target.innerHTML = `
      <div class="card import-card" data-accordion-title="📄 Program dosyasını seçin">
        <label class="upload-zone" for="schedule-file">
          <span class="upload-icon">📄</span>
          <strong>Program dosyasını seçin</strong>
          <span>PDF · JSON · JPEG · PNG / en fazla 25 MB</span>
          <input id="schedule-file" type="file" accept=".pdf,.json,.jpg,.jpeg,.png">
        </label>
        <p id="import-progress" role="status" aria-live="polite"></p>
        <details><summary>Metni kontrol et veya yapıştır</summary>
          <textarea class="form-input" id="schedule-text" rows="8" placeholder="Pazartesi&#10;09:00 - 10:30&#10;Grup: A&#10;Matematik&#10;• Öğrenci Adı Soyadı"></textarea>
          <button class="btn btn-secondary" id="parse-text">Metni yeniden algıla</button>
        </details>
      </div>`;
    document.getElementById('schedule-file').onchange = event => this.read(event.target.files[0]);
    document.getElementById('parse-text').onclick = () => this.parseAndAdvance();
  },

  async read(file) {
    if (!file || this.busy) return;
    const owner = this.owner, field = document.getElementById('schedule-text'), status = document.getElementById('import-progress');
    if (!field || !status) return;
    this.busy = true;
    try {
      const result = await FileReaders.read(file, message => { status.textContent = message; });
      if (Store.userId !== owner || !field.isConnected) return;
      field.value = result.text;
      this.parseAndAdvance();
      status.textContent = `${this.allParsedGroups.length} grup algılandı.`;
    } catch (error) { status.textContent = error.message; }
    finally { this.busy = false; }
  },

  parseAndAdvance() {
    const textEl = document.getElementById('schedule-text');
    if (!textEl) return;
    const parsed = ImportParsers.schedule(textEl.value);
    
    // Zaman Çizelgesi PDF'i yüklendiyse
    if (parsed.type === 'timesheet' && parsed.times.length > 0) {
      Store.setSetting('timeTemplate', parsed.times);
      Toast.show(`Zaman çizelgesi (${parsed.times.length} ders saati) şablon olarak kaydedildi.`, 'success');
      document.getElementById('import-progress').textContent = 'Zaman çizelgesi başarıyla kaydedildi.';
      return; // Akışı burada kes
    }
    
    this.allParsedGroups = parsed.groups || [];
    if (!this.allParsedGroups.length) {
      Toast.show('Grup yapısı belirlenemedi. Okunan metni düzenleyebilir veya aşağıdan grup ekleyebilirsiniz.', 'warning');
      return;
    }
    // Tüm benzersiz branşları bul
    this.selectedSubjects = new Set();
    this.step = 2;
    this.renderStep();
  },

  // ===== ADIM 2: Branş Seçimi =====
  renderBranchStep(target) {
    const subjectMap = this.getSubjectStats();
    const subjectKeys = [...subjectMap.keys()];
    const defaultDept = BILSEM_DATA.school.department || '';

    target.innerHTML = `
      <div class="card import-card">
        <div class="branch-select-header">
          <span class="upload-icon">📚</span>
          <div>
            <strong>Hangi branşları öğretiyorsunuz?</strong>
            <p class="import-description" style="margin:4px 0 0">Programda ${this.allParsedGroups.length} grup ve ${subjectKeys.length} farklı branş tespit edildi. Kendi branşlarınızı seçin, yalnızca seçtiğiniz branşların programı oluşturulacak.</p>
          </div>
        </div>
        <div class="branch-list" id="branch-list">
          ${subjectKeys.map(subj => {
            const info = subjectMap.get(subj);
            const isDefault = subj && defaultDept && UI.normalize(subj).includes(UI.normalize(defaultDept));
            const isUnknown = subj === 'Branşı Belirsiz';
            return `
            <label class="branch-option ${isDefault ? 'branch-recommended' : ''} ${isUnknown ? 'branch-unknown' : ''}">
              <input type="checkbox" name="branch" value="${UI.escape(subj)}" ${isDefault ? 'checked' : ''}>
              <div class="branch-info">
                <span class="branch-name">${UI.escape(subj)}</span>
                <span class="branch-stats">${info.groupCount} grup · ${info.studentCount} öğrenci</span>
              </div>
              ${isDefault ? '<span class="branch-badge">Varsayılan branşınız</span>' : ''}
              ${isUnknown ? '<span class="branch-badge" style="color:var(--warning);border-color:var(--warning)">Belirtilmemiş</span>' : ''}
            </label>`;
          }).join('')}
        </div>
        <div class="import-toolbar" style="margin-top:16px">
          <button class="btn btn-ghost" id="branch-select-all">Tümünü seç</button>
          <button class="btn btn-secondary" id="branch-back">← Geri</button>
          <button class="btn btn-primary" id="branch-continue">Seçilen branşlarla devam et →</button>
        </div>
      </div>`;

    // Varsayılan branşı otomatik seç
    if (defaultDept) {
      subjectKeys.forEach(subj => {
        if (UI.normalize(subj).includes(UI.normalize(defaultDept))) this.selectedSubjects.add(subj);
      });
    }

    document.getElementById('branch-select-all').onclick = () => {
      const boxes = document.querySelectorAll('[name="branch"]');
      const allChecked = [...boxes].every(cb => cb.checked);
      boxes.forEach(cb => cb.checked = !allChecked);
    };
    document.getElementById('branch-back').onclick = () => { this.step = 1; this.renderStep(); };
    document.getElementById('branch-continue').onclick = () => this.applyBranchSelection();
  },

  getSubjectStats() {
    const map = new Map();
    for (const g of this.allParsedGroups) {
      const key = g.subject || 'Branşı Belirsiz';
      if (!map.has(key)) map.set(key, { groupCount: 0, studentCount: 0 });
      const info = map.get(key);
      info.groupCount++;
      info.studentCount += g.students.length;
    }
    return map;
  },

  applyBranchSelection() {
    const checked = [...document.querySelectorAll('[name="branch"]:checked')].map(cb => cb.value);
    if (!checked.length) {
      Toast.show('En az bir branş seçin.', 'warning');
      return;
    }
    this.selectedSubjects = new Set(checked);
    // Seçilen branşlara göre draft'ı filtrele
    this.draft = this.allParsedGroups.filter(g => {
      const subj = g.subject || 'Branşı Belirsiz';
      return this.selectedSubjects.has(subj);
    });
    this.step = 3;
    this.renderStep();
  },

  // ===== ADIM 3: Önizleme & Kaydet =====
  renderPreviewStep(target) {
    const subjectSummary = [...this.selectedSubjects].join(', ') || 'Tümü';
    target.innerHTML = `
      <div class="import-summary card import-card" style="margin-bottom:16px">
        <strong>📋 Seçilen branşlar:</strong> ${UI.escape(subjectSummary)}
        <span style="margin-left:8px;color:var(--text-tertiary)">(${this.draft.length} grup, ${this.draft.reduce((s,g)=>s+g.students.length,0)} öğrenci)</span>
        <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="ImportPage.step=2;ImportPage.renderStep()">Branş değiştir</button>
      </div>
      <section id="schedule-preview"></section>
      <div class="import-toolbar">
        <button class="btn btn-secondary" id="add-import-group">+ Grup ekle</button>
        <button class="btn btn-primary" id="save-import">Kontrol ettim, programı kaydet</button>
      </div>
      <p class="import-description">Yeni gruplar mevcut programa eklenir. Aynı grup, gün ve saat tekrar yüklenirse birleştirilir. Farklı günlerdeki dersler ayrı tutulur.</p>`;

    document.getElementById('add-import-group').onclick = () => { this.collect(); this.draft.push(this.blank()); this.preview(); };
    document.getElementById('save-import').onclick = () => this.save();
    this.preview();
  },

  blank() {
    const defaultSubject = [...this.selectedSubjects][0] || BILSEM_DATA.school.department || '';
    return { id: UI.id('grp'), name: '', day: 'Pazartesi', startTime: '', endTime: '', subject: defaultSubject, students: [], lessons: [] };
  },

  collect() {
    document.querySelectorAll('.import-group').forEach((card, i) => {
      const g = this.draft[i];
      for (const key of ['name', 'day', 'startTime', 'endTime', 'subject']) g[key] = card.querySelector(`[data-field="${key}"]`).value.trim();
      const previous = g.students;
      g.students = [...new Set(card.querySelector('[data-field="students"]').value.split('\n').map(s => s.trim()).filter(Boolean))].map(name => previous.find(s => s.name === name) || { id: UI.id('s'), name, parentName: '', parentPhone: '' });
    });
  },

  preview() {
    const previewEl = document.getElementById('schedule-preview');
    if (!previewEl) return;
    previewEl.innerHTML = this.draft.length ? `<h2 class="section-title">${this.draft.length} grup · Önizleme</h2>` + this.draft.map((g, i) => `<div class="card import-card import-group">
      <div class="section-header"><strong>Grup ${i + 1}</strong><button class="btn btn-ghost" onclick="ImportPage.remove(${i})">Kaldır</button></div>
      <label class="form-label">Grup adı<input class="form-input" data-field="name" value="${UI.escape(g.name)}"></label>
      <div class="import-grid"><label class="form-label">Gün<select class="form-select" data-field="day">${UI.days.map(day => `<option ${day === g.day ? 'selected' : ''}>${day}</option>`).join('')}</select></label>
      <label class="form-label">Ders / branş<input class="form-input" data-field="subject" value="${UI.escape(g.subject)}"></label>
      <label class="form-label">Başlangıç<input class="form-input" type="time" data-field="startTime" value="${UI.escape(g.startTime)}"></label>
      <label class="form-label">Bitiş<input class="form-input" type="time" data-field="endTime" value="${UI.escape(g.endTime)}"></label></div>
      <label class="form-label">Öğrenciler (her satıra bir kişi)<textarea class="form-input" data-field="students" rows="5">${UI.escape(g.students.map(s => s.name).join('\n'))}</textarea></label>
    </div>`).join('') : '<div class="empty-state">Dosya yükleyin veya bir grup ekleyin. Başka hesapların verileri bu alana aktarılmaz.</div>';
  },

  remove(i) { this.collect(); this.draft.splice(i, 1); this.preview(); },

  async save() {
    if (this.busy || Store.userId !== this.owner) return;
    this.collect();
    if (!this.draft.length) { Toast.show('Önce en az bir grup ekleyin.', 'warning'); return; }
    const invalid = this.draft.find(g => !g.name || !ImportParsers.time(g.startTime) || !ImportParsers.time(g.endTime) || g.startTime >= g.endTime);
    if (invalid) { Toast.show('Her grup için ad ve geçerli başlangıç/bitiş saatleri gerekiyor.', 'error'); return; }
    const groups = structuredClone(BILSEM_DATA.groups);
    for (const draft of this.draft) {
      const g = { ...draft, dayIndex: UI.days.indexOf(draft.day), color: BILSEM_DATA.dayColors[draft.day].bg, timeSlot: draft.timeSlot || '' };
      const lessons = g.lessons.filter(l => l.start >= g.startTime && l.end <= g.endTime && l.start < l.end);
      g.lessons = lessons.length ? lessons : [{ order: 1, start: g.startTime, end: g.endTime }];
      const existing = groups.find(old => UI.normalize(old.name) === UI.normalize(g.name) && old.day === g.day && old.startTime === g.startTime);
      if (existing) {
        g.id = existing.id;
        g.students = [...existing.students, ...g.students.filter(s => !existing.students.some(old => UI.normalize(old.name) === UI.normalize(s.name)))];
        Object.assign(existing, g);
      } else groups.push(g);
    }
    if (!Store.setSetting('customGroups', groups)) { Toast.show('Kayıt başarısız. Cihaz depolamasını kontrol edin.', 'error'); return; }
    Store.setSetting('onboardingComplete', true);
    const synced = await Store.syncNow();
    if (Store.userId !== this.owner) return;
    Toast.show(synced ? 'Programınız hesabınıza kaydedildi.' : 'Program bu cihazda kaydedildi. Bulut bağlantısı bekleniyor.', synced ? 'success' : 'warning');
    App.updateNavigationVisibility(); Router.go('home');
  }
};
