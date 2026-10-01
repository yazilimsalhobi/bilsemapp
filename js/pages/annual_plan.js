const AnnualPlans = {
  all() { return Store._get(Store.KEYS.ANNUAL_PLANS) || []; },
  forGroup(groupId) { return this.all().filter(p => p.groupId === groupId).sort((a, b) => a.start.localeCompare(b.start) || a.week - b.week); },
  forDate(groupId, date = UI.date()) {
    return this.all().filter(p => p.groupId === groupId && p.start <= date && p.end >= date);
  },
  outcome(groupId, date = UI.date()) { return this.forDate(groupId, date).map(p => p.topic).join(' • '); },
  // Bu haftanın (veya tatildeyse bir sonraki) plan satırı ve yıl içindeki ilerleme.
  status(groupId, date = UI.date()) {
    const plans = this.forGroup(groupId);
    if (!plans.length) return null;
    const current = plans.find(p => p.start <= date && p.end >= date) || null;
    const next = current ? null : plans.find(p => p.start > date) || null;
    const done = plans.filter(p => p.end < date).length;
    return { plans, current, next, done, total: plans.length, percent: Math.round(done / plans.length * 100), holiday: this.holiday(date) };
  },
  holidays() { return Store.getSetting('planHolidays', []) || []; },
  holiday(date = UI.date()) { return this.holidays().find(h => h.start <= date && h.end >= date) || null; },
  lessonDates(plan, group) {
    const dates = [];
    const current = new Date(plan.start + 'T12:00:00');
    const end = new Date(plan.end + 'T12:00:00');
    for (let i = 0; current <= end && i < 370; i++, current.setDate(current.getDate() + 1)) {
      if (current.getDay() === group.dayIndex) dates.push(UI.date(current));
    }
    return dates;
  },
  shortDate(iso) {
    if (!iso) return '—';
    const [, m, d] = iso.split('-');
    return `${+d} ${['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][+m - 1]}`;
  }
};

const AnnualPlanPage = {
  queue: [],
  render(container) {
    this.owner = Store.userId; this.queue = []; this.busy = false;
    container.innerHTML = `<div class="page-container fade-in" data-accordion="off">
      <p class="eyebrow">HAFTA HAFTA ÖĞRENME</p><h1 class="page-title">Yıllık <span>plan</span></h1>
      <label class="plan-drop" id="annual-drop" for="annual-file">
        <span class="plan-drop-icon" aria-hidden="true">🗂️</span>
        <strong>Yıllık planlarınızı seçin veya buraya bırakın</strong>
        <span>Birden fazla dosya seçebilirsiniz · Word (.docx) · Excel (.xlsx, .xls)</span>
        <span class="btn btn-primary btn-sm">Dosya seç</span>
        <input id="annual-file" type="file" accept=".xlsx,.xls,.docx" multiple class="plan-drop-input">
      </label>
      <p role="status" aria-live="polite" id="annual-status" class="plan-status"></p>
      <details class="plan-advanced"><summary>Tarihsiz planlar için ayar</summary>
        <label class="form-label" for="annual-first-week">1. haftanın başlangıcı</label><input class="form-input" type="date" id="annual-first-week">
        <p class="import-description">Dosyada tarih yoksa haftalar bu tarihten itibaren 7 gün arayla eşleştirilir. Dosyadaki tarihler her zaman korunur.</p>
      </details>
      <div id="annual-queue"></div>
      <div class="plan-section-head"><h2 class="section-title">Sınıflarınızın planları</h2></div>
      <div id="annual-saved"></div>
    </div>`;
    const input = document.getElementById('annual-file'), drop = document.getElementById('annual-drop');
    input.onchange = event => { this.addFiles(event.target.files); event.target.value = ''; };
    drop.ondragover = event => { event.preventDefault(); drop.classList.add('dragging'); };
    drop.ondragleave = () => drop.classList.remove('dragging');
    drop.ondrop = event => { event.preventDefault(); drop.classList.remove('dragging'); this.addFiles(event.dataTransfer.files); };
    document.getElementById('annual-first-week').onchange = () => { this.queue.forEach(item => this.parse(item)); this.renderQueue(); };
    this.renderQueue(); this.renderSaved();
  },
  async addFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => /\.(docx|xlsx|xls)$/i.test(f.name));
    if (!files.length || this.busy) return;
    const owner = this.owner, status = document.getElementById('annual-status');
    this.busy = true;
    try {
      for (const [i, file] of files.entries()) {
        status.textContent = `${i + 1}/${files.length} · ${file.name} okunuyor…`;
        try {
          const data = await FileReaders.read(file, () => {});
          if (Store.userId !== owner || !status.isConnected) return;
          const headings = data.headings || data.rows.slice(0, 6).map(row => row.join(' '));
          const item = { id: UI.id('pf'), file: file.name, rows: data.rows, target: ImportParsers.planTarget(file.name, headings), groups: [] };
          this.queue = this.queue.filter(q => q.file !== file.name).concat(item);
          this.parse(item);
        } catch (error) { Toast.show(`${file.name}: ${error.message}`, 'error'); }
      }
      this.autoMatch();
      status.textContent = `${this.queue.length} plan hazır. Sınıf eşleşmelerini kontrol edip kaydedin.`;
      this.renderQueue();
    } finally { this.busy = false; }
  },
  parse(item) {
    const year = Number(BILSEM_DATA.school.year?.slice(0, 4)) || this.yearFromRows(item.rows) || new Date().getFullYear();
    const result = ImportParsers.annualPlan(item.rows, { year, firstWeek: document.getElementById('annual-first-week')?.value || '' });
    item.weeks = result.weeks; item.holidays = result.holidays;
  },
  // "2026-2027" gibi bir eğitim yılı ifadesinden başlangıç yılını bulur.
  yearFromRows(rows) {
    const m = rows.slice(0, 40).flat().join(' ').match(/\b(20\d{2})\s*[-–/]\s*20\d{2}\b/);
    return m ? +m[1] : 0;
  },
  autoMatch() {
    const matches = ImportParsers.matchPlans(this.queue.map(q => q.target), BILSEM_DATA.groups);
    this.queue.forEach((item, i) => { item.groups = matches[i]; });
  },
  incomplete(item) { return item.weeks.filter(p => !p.topic || !ImportParsers.isoDate(p.start) || !ImportParsers.isoDate(p.end) || p.start > p.end); },
  renderQueue() {
    const box = document.getElementById('annual-queue');
    if (!box) return;
    if (!this.queue.length) { box.innerHTML = ''; return; }
    const groups = BILSEM_DATA.groups;
    const selected = this.queue.reduce((sum, q) => sum + q.groups.length, 0);
    box.innerHTML = `<div class="plan-section-head"><h2 class="section-title">Yüklenecek planlar</h2><button class="section-action" id="annual-clear">Temizle</button></div>
      ${this.queue.map((item, qi) => {
        const bad = this.incomplete(item), first = item.weeks[0], last = item.weeks[item.weeks.length - 1];
        return `<article class="plan-file tone-${qi % 5}">
          <header class="plan-file-head">
            <span class="plan-file-icon" aria-hidden="true">📘</span>
            <div class="plan-file-title"><strong>${UI.escape(item.target.label || 'Program türü bulunamadı')}</strong><small>${UI.escape(item.file)}</small></div>
            <button class="plan-file-remove" data-remove="${qi}" aria-label="${UI.escape(item.file)} kaldır">✕</button>
          </header>
          <div class="plan-chips">
            <span class="plan-chip">📅 ${item.weeks.length} hafta</span>
            ${first ? `<span class="plan-chip">${AnnualPlans.shortDate(first.start)} – ${AnnualPlans.shortDate(last.end)}</span>` : ''}
            ${item.holidays.length ? `<span class="plan-chip">🏖️ ${item.holidays.length} tatil</span>` : ''}
            ${bad.length ? `<span class="plan-chip warn">⚠️ ${bad.length} satırda tarih eksik</span>` : ''}
          </div>
          <fieldset class="plan-groups"><legend>Uygulanacağı sınıflar</legend>
            ${groups.map(g => `<label class="group-chip" style="--chip:${UI.escape(g.color || 'var(--primary)')}"><input type="checkbox" data-plan="${qi}" value="${UI.escape(g.id)}" ${item.groups.includes(g.id) ? 'checked' : ''}><span>${UI.escape(g.name)}<small>${UI.escape(g.day)} ${UI.escape(g.startTime || '')}</small></span></label>`).join('') || '<p class="plan-empty">Önce ders programınızdan sınıf ekleyin.</p>'}
            ${groups.length && !item.groups.length ? '<p class="plan-hint">Otomatik eşleşen sınıf bulunamadı; uygun sınıfları işaretleyin.</p>' : ''}
          </fieldset>
          <details class="plan-weeks"><summary>Haftaları önizle</summary>
            <ol>${item.weeks.map(p => `<li class="${bad.includes(p) ? 'warn' : ''}"><b>${p.week}. hafta</b><span class="plan-week-date">${AnnualPlans.shortDate(p.start)} – ${AnnualPlans.shortDate(p.end)}</span>${p.unit ? `<em>${UI.escape(p.unit)}</em>` : ''}<span>${UI.escape(p.topic)}</span></li>`).join('')}
            ${item.holidays.map(h => `<li class="holiday"><b>🏖️ ${UI.escape(h.label)}</b><span class="plan-week-date">${AnnualPlans.shortDate(h.start)} – ${AnnualPlans.shortDate(h.end)}</span></li>`).join('')}</ol>
          </details>
        </article>`;
      }).join('')}
      <div class="plan-save-bar"><button class="btn btn-primary" id="annual-save" ${selected ? '' : 'disabled'}>${this.queue.length} planı ${selected} sınıfa kaydet</button></div>`;
    box.querySelectorAll('[data-plan]').forEach(input => input.onchange = () => {
      const item = this.queue[+input.dataset.plan];
      item.groups = input.checked ? [...item.groups, input.value] : item.groups.filter(id => id !== input.value);
      // Bir sınıfın tek yıllık planı olur: başka plandaki seçimi kaldır.
      if (input.checked) this.queue.forEach(other => { if (other !== item) other.groups = other.groups.filter(id => id !== input.value); });
      this.renderQueue();
    });
    box.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => { this.queue.splice(+button.dataset.remove, 1); this.renderQueue(); });
    document.getElementById('annual-clear').onclick = () => { this.queue = []; this.renderQueue(); };
    document.getElementById('annual-save').onclick = () => this.save();
  },
  async save() {
    if (this.busy || Store.userId !== this.owner) return;
    const items = this.queue.filter(q => q.groups.length);
    const broken = items.find(q => !q.weeks.length || this.incomplete(q).length);
    if (broken) { Toast.show(`${broken.file}: tarihi eksik haftalar var. "Tarihsiz planlar için ayar" bölümünden 1. haftayı girin.`, 'error'); return; }
    const ids = items.flatMap(q => q.groups);
    const old = AnnualPlans.all();
    if (old.some(p => ids.includes(p.groupId)) && !confirm('Seçilen sınıfların mevcut yıllık planı yenileriyle değiştirilsin mi?')) return;
    const plans = old.filter(p => !ids.includes(p.groupId));
    for (const item of items) for (const groupId of item.groups) for (const p of item.weeks) plans.push({ ...p, id: UI.id('plan'), groupId, source: item.file, label: item.target.label });
    if (!Store._set(Store.KEYS.ANNUAL_PLANS, plans)) { Toast.show('Plan kaydedilemedi.', 'error'); return; }
    const holidays = [...AnnualPlans.holidays(), ...items.flatMap(q => q.holidays)];
    Store.setSetting('planHolidays', holidays.filter((h, i) => holidays.findIndex(o => o.start === h.start && o.end === h.end) === i));
    const synced = await Store.syncNow();
    if (Store.userId !== this.owner) return;
    Toast.show(synced ? `${items.length} plan ${ids.length} sınıfa kaydedildi.` : 'Planlar bu cihazda kaydedildi; bulut kaydı bekliyor.', synced ? 'success' : 'warning');
    this.queue = []; document.getElementById('annual-status').textContent = '';
    this.renderQueue(); this.renderSaved();
  },
  renderSaved() {
    const box = document.getElementById('annual-saved');
    if (!box) return;
    const today = UI.date();
    const cards = BILSEM_DATA.groups.map(group => {
      const s = AnnualPlans.status(group.id, today);
      if (!s) return `<article class="plan-class empty" style="--chip:${UI.escape(group.color || 'var(--primary)')}"><div class="plan-class-head"><div><strong>${UI.escape(group.name)}</strong><small>${UI.escape(group.subject || '')} · ${UI.escape(group.day)}</small></div><span class="plan-chip">Plan yok</span></div></article>`;
      const focus = s.current || s.next;
      return `<article class="plan-class" style="--chip:${UI.escape(group.color || 'var(--primary)')}">
        <div class="plan-class-head"><div><strong>${UI.escape(group.name)}</strong><small>${UI.escape(s.plans[0].label || group.subject || '')} · ${UI.escape(group.day)}</small></div><span class="plan-chip">${s.done}/${s.total} hafta</span></div>
        <div class="plan-progress" role="progressbar" aria-label="Plan ilerlemesi" aria-valuenow="${s.percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${s.percent}%"></span></div>
        ${s.holiday && !s.current ? `<p class="plan-now holiday">🏖️ ${UI.escape(s.holiday.label)}</p>` : ''}
        ${focus ? `<div class="plan-now"><span class="plan-now-label">${s.current ? `BU HAFTA · ${focus.week}. hafta` : `SIRADAKİ · ${AnnualPlans.shortDate(focus.start)}`}</span>${focus.unit ? `<strong>${UI.escape(focus.unit)}</strong>` : ''}<p>${UI.escape(focus.topic)}</p></div>` : '<p class="plan-now">Plan tamamlandı 🎉</p>'}
        <details class="plan-weeks"><summary>Tüm haftalar</summary><ol>${s.plans.map(p => `<li class="${p === s.current ? 'now' : p.end < today ? 'done' : ''}"><b>${p.week}. hafta</b><span class="plan-week-date">${AnnualPlans.shortDate(p.start)} – ${AnnualPlans.shortDate(p.end)}</span>${p.unit ? `<em>${UI.escape(p.unit)}</em>` : ''}<span>${UI.escape(p.topic)}</span><button class="btn btn-ghost btn-sm" data-edit-plan="${UI.escape(p.id)}">Düzenle</button></li>`).join('')}</ol>
          <button class="btn btn-ghost btn-sm plan-remove" data-remove-group="${UI.escape(group.id)}">Bu sınıfın planını kaldır</button></details>
      </article>`;
    });
    const orphans = AnnualPlans.all().filter(p => !DataHelpers.getGroupById(p.groupId)).length;
    box.innerHTML = (cards.join('') || '<div class="empty-state">Henüz sınıfınız yok. Önce ders programınızı yükleyin.</div>') +
      (orphans ? `<p class="plan-hint">${orphans} hafta silinmiş sınıflara ait. <button class="section-action" id="annual-orphans">Temizle</button></p>` : '');
    box.querySelectorAll('[data-edit-plan]').forEach(button => { button.onclick = () => this.edit(button.dataset.editPlan); });
    box.querySelectorAll('[data-remove-group]').forEach(button => { button.onclick = () => this.removeGroup(button.dataset.removeGroup); });
    document.getElementById('annual-orphans')?.addEventListener('click', () => { Store._set(Store.KEYS.ANNUAL_PLANS, AnnualPlans.all().filter(p => DataHelpers.getGroupById(p.groupId))); this.renderSaved(); });
  },
  removeGroup(groupId) {
    const group = DataHelpers.getGroupById(groupId);
    if (!confirm(`${group?.name || 'Bu sınıf'} için yıllık plan kaldırılsın mı?`)) return;
    Store._set(Store.KEYS.ANNUAL_PLANS, AnnualPlans.all().filter(p => p.groupId !== groupId));
    this.renderSaved();
  },
  edit(id) {
    const p = AnnualPlans.all().find(p => p.id === id); if (!p) return;
    App.showModal(`${p.week}. hafta`, `<label class="form-label">Başlangıç<input id="plan-edit-start" class="form-input" type="date" value="${UI.escape(p.start)}"></label><label class="form-label">Bitiş<input id="plan-edit-end" class="form-input" type="date" value="${UI.escape(p.end)}"></label><label class="form-label">Konu<input id="plan-edit-unit" class="form-input" value="${UI.escape(p.unit || '')}"></label><label class="form-label">Kazanım<textarea id="plan-edit-topic" class="form-input" rows="5">${UI.escape(p.topic)}</textarea></label>`, '<button class="btn btn-primary" id="save-plan-edit">Kaydet</button>');
    document.getElementById('save-plan-edit').onclick = () => {
      const start = document.getElementById('plan-edit-start').value, end = document.getElementById('plan-edit-end').value;
      const unit = document.getElementById('plan-edit-unit').value.trim(), topic = document.getElementById('plan-edit-topic').value.trim();
      if (!start || !end || start > end || !topic) { Toast.show('Tarihleri ve kazanımı kontrol edin.', 'warning'); return; }
      Store._set(Store.KEYS.ANNUAL_PLANS, AnnualPlans.all().map(item => item.id === id ? { ...item, start, end, unit, topic } : item));
      App.closeModal(); this.renderSaved();
    };
  }
};
