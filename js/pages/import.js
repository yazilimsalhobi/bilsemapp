const ImportPage = {
  draft: [],
  async render(container, onboarding = false) {
    this.owner = Store.userId; this.onboarding = onboarding; this.draft = []; this.busy = false;
    container.innerHTML = `<div class="page-container fade-in">
      <p class="eyebrow">PROGRAM AKTARIMI</p><h1 class="page-title">Dosyanızdan <span>ders programına</span></h1>
      <p class="import-description">PDF veya fotoğrafınızdaki günleri, saatleri, grup ve öğrenci adlarını okuyalım. Kaydetmeden önce tüm alanları kontrol edip düzeltebilirsiniz.</p>
      <div class="card import-card" data-accordion-title="📄 Program dosyasını seçin"><label class="upload-zone" for="schedule-file"><span class="upload-icon">📄</span><strong>Program dosyasını seçin</strong><span>PDF · JPEG · PNG / en fazla 25 MB</span>
      <input id="schedule-file" type="file" accept=".pdf,.jpg,.jpeg,.png"></label><p id="import-progress" role="status" aria-live="polite"></p>
      <details><summary>Metni kontrol et veya yapıştır</summary><textarea class="form-input" id="schedule-text" rows="8" placeholder="Pazartesi&#10;09:00 - 10:30&#10;Grup: A&#10;Matematik&#10;• Öğrenci Adı Soyadı"></textarea><button class="btn btn-secondary" id="parse-text">Metni yeniden algıla</button></details></div>
      <section id="schedule-preview"></section>
      <div class="import-toolbar"><button class="btn btn-secondary" id="add-import-group">+ Grup ekle</button><button class="btn btn-primary" id="save-import">Kontrol ettim, programı kaydet</button></div>
      <p class="import-description">Yeni gruplar mevcut programa eklenir. Aynı grup, gün ve saat tekrar yüklenirse birleştirilir. Farklı günlerdeki dersler ayrı tutulur.</p>
      ${onboarding ? '<button class="btn btn-ghost" id="skip-import">Boş programla başla, daha sonra yükle</button>' : ''}
    </div>`;
    document.getElementById('schedule-file').onchange = event => this.read(event.target.files[0]);
    document.getElementById('parse-text').onclick = () => this.parse();
    document.getElementById('add-import-group').onclick = () => { this.collect(); this.draft.push(this.blank()); this.preview(); };
    document.getElementById('save-import').onclick = () => this.save();
    if (!onboarding) UI.collapseSections(container);
    if (onboarding) document.getElementById('skip-import').onclick = () => { Store.setSetting('onboardingComplete', true); Router.go('home'); };
    this.preview();
  },
  blank() { return { id: UI.id('grp'), name: '', day: 'Pazartesi', startTime: '', endTime: '', subject: BILSEM_DATA.school.department || '', students: [], lessons: [] }; },
  async read(file) {
    if (!file || this.busy) return;
    const owner = this.owner, field = document.getElementById('schedule-text'), status = document.getElementById('import-progress');
    if (!field || !status) return;
    this.busy = true;
    try {
      const result = await FileReaders.read(file, message => { status.textContent = message; });
      if (Store.userId !== owner || !field.isConnected) return;
      field.value = result.text; this.parse();
      status.textContent = `${this.draft.length} grup algılandı. Öğrenci isimlerini ve saatleri kontrol edin.`;
    } catch (error) { status.textContent = error.message; }
    finally { this.busy = false; }
  },
  parse() {
    this.draft = ImportParsers.schedule(document.getElementById('schedule-text').value);
    this.preview();
    if (!this.draft.length) Toast.show('Grup yapısı belirlenemedi. Okunan metni düzenleyebilir veya aşağıdan grup ekleyebilirsiniz.', 'warning');
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
    document.getElementById('schedule-preview').innerHTML = this.draft.length ? `<h2 class="section-title">${this.draft.length} grup · Önizleme</h2>` + this.draft.map((g, i) => `<div class="card import-card import-group">
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
