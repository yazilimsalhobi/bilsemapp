/**
 * Fatsa BİLSEM — Ana Sayfa (Dashboard)
 * Karşılama + canlı ders sayacı, özet kutucuklar, hızlı erişim,
 * bugünün ders akışı, haftalık plan ilerlemesi, ödevler ve hatırlatmalar.
 */

const HomePage = {
  countdownInterval: null,
  tones: ['blue', 'green', 'amber', 'rose', 'violet', 'teal'],

  render(container) {
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    const now = new Date();
    const dayName = DataHelpers.getDayName(now);
    let todayGroups = DataHelpers.getTodayGroups().slice().sort((a, b) => DataHelpers.timeToMinutes(a.startTime) - DataHelpers.timeToMinutes(b.startTime));
    let currentLesson = DataHelpers.getCurrentLesson();
    let nextLesson = DataHelpers.getNextLesson();
    const teacherFirst = BILSEM_DATA.school?.teacher ? BILSEM_DATA.school.teacher.split(' ')[0] : '';
    const user = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const isParent = user && user.role === 'parent';
    const greeting = isParent ? `${user.studentName || 'Öğrenci'} Velisi` : (teacherFirst ? `${teacherFirst} Öğretmenim` : 'Öğretmenim');

    if (isParent) {
      // Veli yalnızca öğrencisinin olduğu dersleri görür.
      const mine = g => g.students.some(s => s.id === user.studentId);
      todayGroups = todayGroups.filter(mine);
      if (currentLesson && !mine(currentLesson)) currentLesson = null;
      if (nextLesson && !mine(nextLesson)) nextLesson = null;
    }

    container.innerHTML = `
      <div class="page-container home fade-in" data-accordion="off">
        ${this.renderHero({ now, dayName, greeting, todayGroups, currentLesson, nextLesson, isParent })}
        ${Store.syncError ? `<div class="sync-notice">${UI.escape(Store.syncError)}</div>` : ''}
        ${!BILSEM_DATA.groups.length ? this.renderOnboarding() : ''}
        ${isParent ? '' : this.renderStats()}
        ${isParent ? '' : this.renderActions()}
        ${BILSEM_DATA.groups.length ? this.renderToday(todayGroups, currentLesson, nextLesson, isParent) : ''}
        ${isParent ? '' : this.renderWeekPlans()}
        ${this.renderUpcomingHomework(isParent)}
        ${isParent ? '' : this.renderTodoBlock()}
      </div>
    `;

    if (nextLesson || currentLesson) this.startCountdown(currentLesson || nextLesson, !!currentLesson);
    this.renderTodos();
  },

  renderHero({ now, dayName, greeting, todayGroups, currentLesson, nextLesson, isParent }) {
    const holiday = AnnualPlans.holiday(UI.date(now));
    const week = BILSEM_DATA.groups.map(g => AnnualPlans.forDate(g.id)[0]?.week).find(Boolean);
    const studentCount = todayGroups.reduce((sum, g) => sum + g.students.length, 0);
    const summary = holiday ? `🏖️ ${holiday.label} — iyi dinlenmeler!`
      : todayGroups.length ? `Bugün <b>${todayGroups.length} ders</b> · <b>${studentCount} öğrenci</b> sizi bekliyor`
      : 'Bugün dersiniz yok, iyi dinlenmeler 🌿';
    const lesson = currentLesson || nextLesson;
    const label = currentLesson ? 'ŞU AN DERSTESİNİZ' : nextLesson?.isToday ? 'SIRADAKİ DERS' : nextLesson ? `${nextLesson.day.toLocaleUpperCase('tr-TR')} GÜNÜ` : '';
    return `
      <section class="home-hero" aria-label="Karşılama">
        <span class="home-hero-orb one" aria-hidden="true"></span><span class="home-hero-orb two" aria-hidden="true"></span>
        <div class="home-hero-top">
          <span class="home-date">${UI.escape(dayName)} · ${DataHelpers.formatDate(now)}</span>
          ${week ? `<span class="home-pill">📚 ${week}. hafta</span>` : ''}
        </div>
        <h1 class="home-hello">Merhaba,<br><span>${UI.escape(greeting)}</span> 👋</h1>
        <p class="home-summary">${summary}</p>
        ${lesson ? `
        <div class="home-next ${currentLesson ? 'live' : ''}">
          <div class="home-next-info">
            <span class="home-next-label">${currentLesson ? '<i class="home-live-dot"></i>' : '⏰'} ${label}</span>
            <strong>${UI.escape(lesson.name)}</strong>
            <small>${UI.escape(lesson.subject || '')} · ${lesson.startTime}–${lesson.endTime}</small>
          </div>
          <div class="home-next-timer"><b id="countdown-display">--</b><small>${currentLesson ? 'bitişe' : lesson.isToday ? 'başlamaya' : 'başlangıç'}</small></div>
          ${currentLesson && !isParent ? `<button class="home-next-btn" onclick="Router.go('attendance', '${currentLesson.id}')">✅ Yoklama al</button>` : ''}
        </div>` : ''}
      </section>`;
  },

  renderOnboarding() {
    return `
      <section class="home-onboard">
        <span class="home-onboard-icon" aria-hidden="true">🚀</span>
        <div><h2>İlk ders programınızı ekleyin</h2><p>Programınızı yükleyin; dersleriniz, öğrencileriniz ve yıllık planınız burada canlansın.</p></div>
        <div class="home-onboard-actions">
          <button class="btn btn-primary" onclick="Router.go('import')">Program yükle</button>
          <button class="btn btn-secondary" onclick="SettingsPage.editGroups()">Elle sınıf ekle</button>
        </div>
      </section>`;
  },

  renderStats() {
    const stats = Store.getOverallStats();
    const values = { students: DataHelpers.getTotalStudentCount(), groups: DataHelpers.getTotalGroupCount(), attendance: stats.totalSessions, homework: stats.activeHomework };
    const tones = { students: 'blue', groups: 'violet', attendance: 'green', homework: 'amber' };
    const items = Dashboard.config('metrics').filter(s => s.visible);
    if (!items.length) return '';
    return `
      <section class="home-stats" aria-label="Hızlı bakış">
        ${items.map(s => `
          <div class="home-stat tone-${tones[s.id] || 'teal'}">
            <span class="home-stat-icon" aria-hidden="true">${UI.escape(s.icon)}</span>
            <b>${values[s.id] ?? 0}</b><small>${UI.escape(s.label)}</small>
          </div>`).join('')}
      </section>`;
  },

  renderActions() {
    const items = Dashboard.config('links').filter(s => s.visible);
    if (!items.length) return '';
    return `
      <section class="home-block">
        <div class="home-block-head"><h2>Hızlı erişim</h2><button class="section-action" onclick="Dashboard.edit()">Düzenle</button></div>
        <div class="home-actions">
          ${items.map((s, i) => `
            <button class="home-action tone-${this.tones[i % this.tones.length]}" onclick="Router.go('${s.id}')">
              <span class="home-action-icon" aria-hidden="true">${UI.escape(s.icon)}</span>
              <span>${UI.escape(s.label)}</span>
            </button>`).join('')}
        </div>
      </section>`;
  },

  renderToday(groups, currentLesson, nextLesson, isParent) {
    const head = `<div class="home-block-head"><h2>Bugünün dersleri</h2>${groups.length && !isParent ? '<button class="section-action" onclick="Router.go(\'schedule\')">Program →</button>' : ''}</div>`;
    if (!groups.length) {
      return `
        <section class="home-block">${head}
          <div class="home-empty">
            <span aria-hidden="true">🌙</span>
            <div><strong>Bugün ders yok</strong><p>${nextLesson ? `Sıradaki ders: <b>${UI.escape(nextLesson.day)}</b> ${nextLesson.startTime} · ${UI.escape(nextLesson.name)}` : 'Programınızı kontrol edin.'}</p></div>
          </div>
        </section>`;
    }
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const todayDate = DataHelpers.formatDateShort(new Date());
    return `
      <section class="home-block">${head}
        <ol class="home-timeline">
          ${groups.map(group => {
            const live = currentLesson && currentLesson.id === group.id;
            const done = !live && DataHelpers.timeToMinutes(group.endTime) < nowMinutes;
            const plan = AnnualPlans.forDate(group.id)[0];
            const note = Store.getNote(group.id, todayDate)?.note ?? '';
            return `
              <li class="home-lesson ${live ? 'live' : ''} ${done ? 'done' : ''}" style="--lesson:${UI.escape(group.color || 'var(--primary)')}">
                <div class="home-lesson-time"><b>${group.startTime}</b><small>${group.endTime}</small></div>
                <div class="home-lesson-card">
                  <div class="home-lesson-head">
                    <div><strong>${UI.escape(group.name)}</strong><small>${UI.escape(group.subject || '')}</small></div>
                    ${live ? '<span class="home-badge live">CANLI</span>' : done ? '<span class="home-badge">Bitti</span>' : ''}
                  </div>
                  ${plan ? `<div class="home-lesson-plan"><span>🎯 ${plan.week}. hafta${plan.unit ? ` · ${UI.escape(plan.unit)}` : ''}</span><p>${UI.escape(plan.topic)}</p></div>` : ''}
                  <div class="home-lesson-foot">
                    <div class="student-avatars">
                      ${group.students.slice(0, 4).map((s, i) => `<div class="student-avatar tone-${this.tones[i % this.tones.length]}">${UI.escape(s.name.charAt(0))}</div>`).join('')}
                      ${group.students.length > 4 ? `<div class="student-avatar more">+${group.students.length - 4}</div>` : ''}
                    </div>
                    <span class="home-lesson-count">${group.students.length} öğrenci</span>
                  </div>
                  ${!isParent ? `
                  <label class="home-note"><span>Ders notu</span>
                    <input class="form-input" value="${UI.escape(note)}" placeholder="Bugün işlenen konu, not…" onchange="Store.saveNote('${group.id}', '${todayDate}', this.value)">
                  </label>
                  <div class="home-lesson-actions">
                    <button class="btn btn-sm tone-green" onclick="Router.go('attendance', '${group.id}')">✅ Yoklama</button>
                    <button class="btn btn-sm tone-blue" onclick="Router.go('homework', '${group.id}')">📝 Ödev ver</button>
                  </div>` : ''}
                </div>
              </li>`;
          }).join('')}
        </ol>
      </section>`;
  },

  renderWeekPlans() {
    const rows = BILSEM_DATA.groups.map(group => ({ group, status: AnnualPlans.status(group.id) })).filter(r => r.status);
    if (!rows.length) {
      if (!BILSEM_DATA.groups.length) return '';
      return `
        <section class="home-block">
          <div class="home-block-head"><h2>Bu haftanın planı</h2></div>
          <button class="home-empty action" onclick="Router.go('annual_plan')">
            <span aria-hidden="true">🗂️</span><div><strong>Yıllık planlarınızı yükleyin</strong><p>Her sınıfın haftalık konusu ve kazanımı burada görünsün.</p></div>
          </button>
        </section>`;
    }
    return `
      <section class="home-block">
        <div class="home-block-head"><h2>Bu haftanın planı</h2><button class="section-action" onclick="Router.go('annual_plan')">Tümü →</button></div>
        <div class="home-plans">
          ${rows.map(({ group, status }) => {
            const focus = status.current || status.next;
            return `
              <button class="home-plan" style="--lesson:${UI.escape(group.color || 'var(--primary)')}" onclick="Router.go('annual_plan')">
                <span class="home-plan-head"><strong>${UI.escape(group.name)}</strong><small>${status.done}/${status.total}</small></span>
                <span class="plan-progress"><span style="width:${status.percent}%"></span></span>
                ${status.holiday && !status.current ? `<span class="home-plan-unit">🏖️ ${UI.escape(status.holiday.label)}</span>` : ''}
                ${focus ? `<span class="home-plan-unit">${status.current ? '' : 'Sıradaki · '}${UI.escape(focus.unit || focus.topic)}</span>${focus.unit ? `<span class="home-plan-topic">${UI.escape(focus.topic)}</span>` : ''}` : '<span class="home-plan-unit">Plan tamamlandı 🎉</span>'}
              </button>`;
          }).join('')}
        </div>
      </section>`;
  },

  renderUpcomingHomework(isParent = false) {
    let activeHw = Store.getActiveHomework();
    const user = Auth.getCurrentUser();
    if (isParent) {
      activeHw = activeHw.filter(hw => {
        const group = DataHelpers.getGroupById(hw.groupId);
        return group && group.students.some(s => s.id === user.studentId);
      });
    }
    if (activeHw.length === 0) return '';

    return `
      <section class="home-block">
        <div class="home-block-head"><h2>Aktif ödevler</h2><button class="section-action" onclick="Router.go('homework')">Tümü →</button></div>
        <div class="home-list">
          ${activeHw.slice(0, 3).map(hw => {
            const group = DataHelpers.getGroupById(hw.groupId);
            const diffDays = hw.dueDate ? Math.ceil((new Date(hw.dueDate) - new Date()) / 86400000) : null;
            const urgency = diffDays === null ? 'relaxed' : diffDays <= 1 ? 'urgent' : diffDays <= 3 ? 'normal' : 'relaxed';
            const total = group ? group.students.length : 0;
            const submitted = hw.studentStatuses ? Object.values(hw.studentStatuses).filter(s => s.status !== 'assigned').length : 0;
            const progress = total > 0 ? Math.round(submitted / total * 100) : 0;
            return `
              <button class="home-hw" onclick="Router.go('homework', '${hw.id}')">
                <span class="home-hw-head"><strong>${UI.escape(hw.title)}</strong>${diffDays !== null ? `<span class="homework-due ${urgency}">${diffDays <= 0 ? 'BUGÜN' : diffDays + ' gün'}</span>` : ''}</span>
                <small>${UI.escape(group ? `${group.name} · ${group.subject}` : '')} · ${submitted}/${total} teslim</small>
                <span class="plan-progress"><span style="width:${progress}%"></span></span>
              </button>`;
          }).join('')}
        </div>
      </section>`;
  },

  renderTodoBlock() {
    return `
      <section class="home-block">
        <div class="home-block-head"><h2>Hatırlatmalarım</h2></div>
        <div class="home-todo">
          <form class="home-todo-add" onsubmit="event.preventDefault(); HomePage.addTodo()">
            <input type="text" id="new-todo-input" class="form-input" placeholder="Yeni hatırlatma ekle…" aria-label="Yeni hatırlatma">
            <button class="btn btn-primary" type="submit">Ekle</button>
          </form>
          <div id="todo-list" class="home-todo-list"></div>
        </div>
      </section>`;
  },

  startCountdown(lesson, isActive) {
    const display = document.getElementById('countdown-display');
    if (!display) return;
    const update = () => {
      if (!isActive && !lesson.isToday) { display.textContent = lesson.startTime; return; }
      const now = new Date();
      const diff = DataHelpers.timeToMinutes(isActive ? lesson.endTime : lesson.startTime) - (now.getHours() * 60 + now.getMinutes());
      if (diff < 0) { display.textContent = '0 dk'; return; }
      const hours = Math.floor(diff / 60), mins = diff % 60;
      display.textContent = hours > 0 ? `${hours}s ${String(mins).padStart(2, '0')}dk` : `${mins} dk`;
    };
    update();
    this.countdownInterval = setInterval(update, 30000);
  },

  renderTodos() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    const todos = Store.getTodos().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (todos.length === 0) {
      list.innerHTML = '<p class="home-todo-empty">Henüz hatırlatma yok. Yukarıdan ekleyin ✍️</p>';
      return;
    }
    list.innerHTML = todos.map(t => `
      <div class="home-todo-item ${t.completed ? 'done' : ''}">
        <label><input type="checkbox" ${t.completed ? 'checked' : ''} onchange="HomePage.toggleTodo('${t.id}')"><span>${UI.escape(t.text)}</span></label>
        <button class="home-todo-del" onclick="HomePage.deleteTodo('${t.id}')" aria-label="Hatırlatmayı sil">✕</button>
      </div>
    `).join('');
  },

  addTodo() {
    const input = document.getElementById('new-todo-input');
    if (!input) return;
    const text = input.value.trim();
    if (text) {
      Store.saveTodo(text);
      input.value = '';
      this.renderTodos();
    }
  },

  toggleTodo(id) {
    Store.toggleTodo(id);
    this.renderTodos();
  },

  deleteTodo(id) {
    Store.deleteTodo(id);
    this.renderTodos();
  }
};
