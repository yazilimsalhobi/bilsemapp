const AnnualPlans = {
  all() { return Store._get(Store.KEYS.ANNUAL_PLANS) || []; },
  forDate(groupId, date = UI.date()) {
    return this.all().filter(p => p.groupId === groupId && p.start <= date && p.end >= date);
  },
  outcome(groupId, date = UI.date()) { return this.forDate(groupId, date).map(p => p.topic).join(' • '); },
  lessonDates(plan, group) {
    const dates = [];
    const current = new Date(plan.start + 'T12:00:00');
    const end = new Date(plan.end + 'T12:00:00');
    for (let i = 0; current <= end && i < 370; i++, current.setDate(current.getDate() + 1)) {
      if (current.getDay() === group.dayIndex) dates.push(UI.date(current));
    }
    return dates;
  }
};

const AnnualPlanPage = {
  draft: [],
  render(container) {
    this.owner = Store.userId; this.draft = []; this.sourceRows = null; this.busy = false;
    const groups = BILSEM_DATA.groups;
    container.innerHTML = `<div class="page-container fade-in">
      <p class="eyebrow">HAFTA HAFTA ÖĞRENME</p><h1 class="page-title">Yıllık <span>plan</span></h1>
      <p class="import-description">Excel veya Word planınızı yükleyin. Tarih aralıklarını ve kazanımları kontrol edin, uygulanacağı grupları seçin.</p>
      <div class="card import-card" data-accordion-title="📄 Plan dosyası ve grup seçimi">
        <label class="upload-zone" for="annual-file"><span class="upload-icon">🗓️</span><strong>Yıllık planı seçin</strong><span>Excel (.xlsx, .xls) · Word (.docx)</span><input id="annual-file" type="file" accept=".xlsx,.xls,.docx"></label>
        <label class="form-label" for="annual-first-week">Dosyada tarih yoksa: 1. haftanın başlangıcı</label><input class="form-input" type="date" id="annual-first-week">
        <p class="import-description">Tarihsiz haftalar bu tarihten itibaren 7 gün arayla eşleştirilir. Tatil ve ara tatil aralıklarını önizlemede düzenleyin. Dosyadaki açık tarihler korunur.</p>
        <button class="btn btn-secondary" id="annual-reparse">Tarihleri yeniden eşleştir</button><p role="status" aria-live="polite" id="annual-status"></p>
        <fieldset class="group-picker"><legend>Planın uygulanacağı gruplar</legend>${groups.map(g => `<label><input type="checkbox" name="plan-group" value="${UI.escape(g.id)}"> ${UI.escape(g.name)} · ${g.day} ${g.startTime}</label>`).join('') || '<p>Önce ders programınızdan grup ekleyin.</p>'}</fieldset>
      </div>
      <div id="annual-preview"></div>
      <div class="import-toolbar"><button class="btn btn-secondary" id="annual-add">+ Hafta / kazanım ekle</button><button class="btn btn-primary" id="annual-save">Seçilen gruplara kaydet</button></div>
      <p class="import-description">Kaydetmek, seçilen grupların önceki yıllık planının yerini alır. Diğer gruplar etkilenmez.</p>
      <section class="section"><div class="section-header"><h2 class="section-title">Kayıtlı planlar</h2><select class="form-select" id="annual-filter"><option value="">Tüm gruplar</option>${groups.map(g => `<option value="${UI.escape(g.id)}">${UI.escape(g.name)} · ${g.day}</option>`).join('')}</select></div>
      <div id="annual-saved"></div></section>
    </div>`;
    document.getElementById('annual-file').onchange = event => this.read(event.target.files[0]);
    document.getElementById('annual-reparse').onclick = () => this.parse();
    document.getElementById('annual-add').onclick = () => { this.collect(); this.draft.push({ id: UI.id('plan'), week: this.draft.length + 1, start: '', end: '', topic: '' }); this.preview(); };
    document.getElementById('annual-save').onclick = () => this.save();
    document.getElementById('annual-filter').onchange = () => this.renderSaved();
    this.preview(); this.renderSaved();
  },
  async read(file) {
    if (!file || this.busy) return;
    const owner = this.owner, status = document.getElementById('annual-status');
    if (!status) return;
    this.busy = true;
    try {
      const data = await FileReaders.read(file, message => { status.textContent = message; });
      if (Store.userId !== owner || !status.isConnected) return;
      this.sourceRows = data.rows; this.parse();
      status.textContent = `${this.draft.length} kazanım satırı okundu. Eksik tarihleri tamamlayın ve grupları seçin.`;
    } catch (error) { status.textContent = error.message; }
    finally { this.busy = false; }
  },
  parse() {
    if (!this.sourceRows) return;
    const year = Number(BILSEM_DATA.school.year?.slice(0, 4)) || new Date().getFullYear();
    this.draft = ImportParsers.annual(this.sourceRows, { year, firstWeek: document.getElementById('annual-first-week').value });
    this.preview();
    if (!this.draft.length) Toast.show('Hafta, tarih ve kazanım sütunları bulunamadı. Aşağıdan satır ekleyebilirsiniz.', 'warning');
  },
  collect() {
    document.querySelectorAll('.plan-draft-row').forEach((row, i) => {
      const item = this.draft[i];
      item.week = Number(row.querySelector('[data-field="week"]').value);
      for (const key of ['start', 'end', 'topic']) item[key] = row.querySelector(`[data-field="${key}"]`).value.trim();
    });
  },
  preview() {
    document.getElementById('annual-preview').innerHTML = this.draft.map((p, i) => `<div class="card import-card plan-draft-row" data-accordion-title="${p.week}. hafta · Kazanım önizlemesi">
      <div class="import-grid"><label class="form-label">Hafta<input class="form-input" data-field="week" type="number" min="1" max="60" value="${p.week}"></label>
      <label class="form-label">Başlangıç<input class="form-input" type="date" data-field="start" value="${UI.escape(p.start)}"></label>
      <label class="form-label">Bitiş<input class="form-input" type="date" data-field="end" value="${UI.escape(p.end)}"></label></div>
      <label class="form-label">Kazanım<textarea class="form-input" data-field="topic" rows="3">${UI.escape(p.topic)}</textarea></label>
      <button class="btn btn-ghost" onclick="AnnualPlanPage.removeDraft(${i})">Satırı kaldır</button>
    </div>`).join('');
  },
  removeDraft(i) { this.collect(); this.draft.splice(i, 1); this.preview(); },
  async save() {
    if (this.busy || Store.userId !== this.owner) return;
    this.collect();
    const ids = Array.from(document.querySelectorAll('[name="plan-group"]:checked')).map(el => el.value);
    if (!ids.length || !this.draft.length) { Toast.show('En az bir grup ve kazanım satırı seçin.', 'warning'); return; }
    if (this.draft.some(p => !p.topic || !ImportParsers.isoDate(p.start) || !ImportParsers.isoDate(p.end) || p.start > p.end || !Number.isInteger(p.week) || p.week < 1 || p.week > 60)) {
      Toast.show('Her satırda geçerli hafta, başlangıç/bitiş tarihi ve kazanım olmalı.', 'error'); return;
    }
    const old = AnnualPlans.all();
    if (old.some(p => ids.includes(p.groupId)) && !confirm('Seçtiğiniz grupların mevcut yıllık planı bu önizlemeyle değiştirilsin mi?')) return;
    const plans = old.filter(p => !ids.includes(p.groupId));
    for (const groupId of ids) for (const p of this.draft) plans.push({ ...p, id: UI.id('plan'), groupId });
    if (!Store._set(Store.KEYS.ANNUAL_PLANS, plans)) { Toast.show('Plan kaydedilemedi.', 'error'); return; }
    const synced = await Store.syncNow();
    if (Store.userId !== this.owner) return;
    Toast.show(synced ? 'Yıllık plan hesabınıza kaydedildi.' : 'Yıllık plan bu cihazda kaydedildi; bulut kaydı bekliyor.', synced ? 'success' : 'warning');
    this.draft = []; this.preview(); this.renderSaved();
  },
  renderSaved() {
    const filter = document.getElementById('annual-filter').value;
    const plans = AnnualPlans.all().filter(p => !filter || p.groupId === filter).sort((a, b) => a.start.localeCompare(b.start));
    document.getElementById('annual-saved').innerHTML = plans.map(p => {
      const group = DataHelpers.getGroupById(p.groupId);
      const active = p.start <= UI.date() && p.end >= UI.date();
      const dates = group ? AnnualPlans.lessonDates(p, group) : [];
      return `<article class="card import-card ${active ? 'plan-current' : ''}"><div class="section-header"><strong>${UI.escape(group?.name || 'Silinmiş grup')} · ${p.week}. hafta ${active ? '· BU HAFTA' : ''}</strong><button class="btn btn-ghost" data-edit-plan="${UI.escape(p.id)}">Düzenle</button></div>
        <p>${UI.escape(p.start)} – ${UI.escape(p.end)}</p><p class="plan-topic">${UI.escape(p.topic)}</p><small>Ders tarihleri: ${dates.join(', ') || 'Bu aralıkta grubun ders günü yok; tarihleri kontrol edin.'}</small></article>`;
    }).join('') || '<div class="empty-state">Bu gruba ait yıllık plan henüz eklenmedi.</div>';
    document.querySelectorAll('[data-edit-plan]').forEach(button => { button.onclick = () => this.edit(button.dataset.editPlan); });
  },
  edit(id) {
    const p = AnnualPlans.all().find(p => p.id === id); if (!p) return;
    App.showModal('Kazanımı düzenle', `<label class="form-label">Başlangıç<input id="plan-edit-start" class="form-input" type="date" value="${UI.escape(p.start)}"></label><label class="form-label">Bitiş<input id="plan-edit-end" class="form-input" type="date" value="${UI.escape(p.end)}"></label><label class="form-label">Kazanım<textarea id="plan-edit-topic" class="form-input" rows="5">${UI.escape(p.topic)}</textarea></label>`, '<button class="btn btn-primary" id="save-plan-edit">Kaydet</button>');
    document.getElementById('save-plan-edit').onclick = () => {
      const start = document.getElementById('plan-edit-start').value, end = document.getElementById('plan-edit-end').value, topic = document.getElementById('plan-edit-topic').value.trim();
      if (!start || !end || start > end || !topic) { Toast.show('Tarihleri ve kazanımı kontrol edin.', 'warning'); return; }
      Store._set(Store.KEYS.ANNUAL_PLANS, AnnualPlans.all().map(item => item.id === id ? { ...item, start, end, topic } : item));
      App.closeModal(); this.renderSaved();
    };
  }
};
