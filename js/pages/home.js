/**
 * Fatsa BİLSEM — Ana Sayfa (Dashboard)
 * Bugünün programı, aktif ders, geri sayım, hızlı eylemler
 */

const HomePage = {
  countdownInterval: null,

  render(container) {
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    const now = new Date();
    const dayName = DataHelpers.getDayName(now);
    const todayGroups = DataHelpers.getTodayGroups();
    const currentLesson = DataHelpers.getCurrentLesson();
    const nextLesson = DataHelpers.getNextLesson();
    const stats = Store.getOverallStats();
    const dayColor = BILSEM_DATA.dayColors[dayName];
    const teacherFirst = BILSEM_DATA.school?.teacher ? BILSEM_DATA.school.teacher.split(' ')[0] : '';
    const welcomeGreeting = teacherFirst ? `${teacherFirst} Öğretmenim` : 'Öğretmenim';

    container.innerHTML = `
      <div class="page-container fade-in">
        <!-- Karşılama -->
        <div class="welcome-section">
          <div class="welcome-date">${dayColor?.emoji || '📅'} ${dayName}, ${DataHelpers.formatDate(now)}</div>
          <h1 class="welcome-title">Merhaba, <span class="text-gradient">${welcomeGreeting}</span> 👋</h1>
        </div>

        <!-- Aktif / Sonraki Ders -->
        ${currentLesson ? this.renderCurrentLesson(currentLesson) : ''}
        ${!currentLesson && nextLesson ? this.renderNextLesson(nextLesson) : ''}

        <!-- Hızlı Eylemler -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">⚡ Hızlı Erişim</h2>
          </div>
          <div class="quick-actions">
            <div class="quick-action" onclick="Router.go('attendance')">
              <div class="quick-action-icon" style="background: rgba(0,184,148,0.15);">✅</div>
              <span class="quick-action-label">Yoklama Al</span>
            </div>
            <div class="quick-action" onclick="Router.go('homework')">
              <div class="quick-action-icon" style="background: rgba(108,92,231,0.15);">📝</div>
              <span class="quick-action-label">Ödev Ver</span>
            </div>
            <div class="quick-action" onclick="Router.go('students')">
              <div class="quick-action-icon" style="background: rgba(0,206,201,0.15);">👥</div>
              <span class="quick-action-label">Öğrenciler</span>
            </div>
            <div class="quick-action" onclick="Router.go('stats')">
              <div class="quick-action-icon" style="background: rgba(253,203,110,0.15);">📊</div>
              <span class="quick-action-label">İstatistik</span>
            </div>
          </div>
        </div>

        <!-- Genel İstatistikler -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📈 Genel Bakış</h2>
          </div>
          <div class="stats-grid stagger-children">
            <div class="stat-card">
              <div class="stat-card-icon">👥</div>
              <div class="stat-card-value">${DataHelpers.getTotalStudentCount()}</div>
              <div class="stat-card-label">Öğrenci</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">📚</div>
              <div class="stat-card-value">${DataHelpers.getTotalGroupCount()}</div>
              <div class="stat-card-label">Grup</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">📋</div>
              <div class="stat-card-value">${stats.totalSessions}</div>
              <div class="stat-card-label">Yoklama</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">📝</div>
              <div class="stat-card-value">${stats.activeHomework}</div>
              <div class="stat-card-label">Aktif Ödev</div>
            </div>
          </div>
        </div>

        <!-- Bugünün Dersleri -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">${todayGroups.length > 0 ? '📅 Bugünün Dersleri' : '🌙 Bugün Ders Yok'}</h2>
            ${todayGroups.length > 0 ? '<button class="section-action" onclick="Router.go(\'schedule\')">Tümünü Gör →</button>' : ''}
          </div>
          ${todayGroups.length > 0 ? this.renderTodayGroups(todayGroups, currentLesson) : this.renderNoLesson()}
        </div>

        <!-- Yaklaşan Ödevler -->
        ${this.renderUpcomingHomework()}
      </div>
    `;

    // Geri sayım başlat
    if (nextLesson || currentLesson) {
      this.startCountdown(nextLesson || currentLesson, !!currentLesson);
    }
  },

  renderCurrentLesson(lesson) {
    return `
      <div class="countdown card-glass active-lesson-card glow-ring" style="border: 1px solid var(--success); margin-bottom: var(--space-lg);">
        <div class="countdown-info">
          <div class="countdown-label" style="color: var(--success);">🟢 ŞU AN DERSTESİNİZ</div>
          <div class="countdown-group">${lesson.name}</div>
          <div style="font-size: var(--font-sm); color: var(--text-tertiary); margin-top: 2px;">
            ${lesson.subject} • ${lesson.startTime} - ${lesson.endTime}
          </div>
          <div style="margin-top: 8px; display: flex; gap: 8px;">
            <button class="btn btn-success btn-sm" onclick="Router.go('attendance', '${lesson.id}')">
              ✅ Yoklama Al
            </button>
          </div>
        </div>
        <div class="countdown-timer" id="countdown-display">--:--</div>
      </div>
    `;
  },

  renderNextLesson(lesson) {
    const prefix = lesson.isToday ? '⏰ BİR SONRAKİ DERS' : `📅 ${lesson.day.toUpperCase()} GÜNÜ`;
    return `
      <div class="countdown card-glass" style="margin-bottom: var(--space-lg);">
        <div class="countdown-info">
          <div class="countdown-label">${prefix}</div>
          <div class="countdown-group">${lesson.name}</div>
          <div style="font-size: var(--font-sm); color: var(--text-tertiary); margin-top: 2px;">
            ${lesson.subject} • ${lesson.startTime} - ${lesson.endTime}
          </div>
        </div>
        <div class="countdown-timer" id="countdown-display">--:--</div>
      </div>
    `;
  },

  renderTodayGroups(groups, currentLesson) {
    return `
      <div class="stagger-children">
        ${groups.map(group => {
          const isActive = currentLesson && currentLesson.id === group.id;
          const color = group.color;
          return `
            <div class="group-card ${isActive ? 'active-lesson' : ''}" onclick="Router.go('attendance', '${group.id}')" style="--card-color: ${color};">
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: ${color};"></div>
              <div class="group-card-header">
                <div class="group-card-info">
                  <div class="group-card-name">${group.name}</div>
                  <div class="group-card-subject">${group.subject}</div>
                </div>
                <div class="group-card-time">
                  🕐 ${group.startTime} - ${group.endTime}
                </div>
              </div>
              ${isActive ? '<span class="active-badge">CANLI</span>' : ''}
              <div class="group-card-students">
                <div class="student-avatars">
                  ${group.students.slice(0, 4).map((s, i) => {
                    const colors = ['#6C5CE7', '#00CEC9', '#FF6B6B', '#00B894', '#FDCB6E'];
                    return `<div class="student-avatar" style="background: ${colors[i % colors.length]};">${s.name.charAt(0)}</div>`;
                  }).join('')}
                  ${group.students.length > 4 ? `<div class="student-avatar" style="background: var(--bg-glass-strong); color: var(--text-secondary); font-size: 0.6rem;">+${group.students.length - 4}</div>` : ''}
                </div>
                <span class="student-count">${group.students.length} öğrenci</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderNoLesson() {
    return `
      <div class="empty-state" style="padding: var(--space-xl) var(--space-lg);">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-title">Bugün ders yok!</div>
        <div class="empty-state-text">İyi dinlenmeler. Sonraki ders programınızı görmek için ders programını kontrol edin.</div>
      </div>
    `;
  },

  renderUpcomingHomework() {
    const activeHw = Store.getActiveHomework();
    if (activeHw.length === 0) return '';

    return `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">📝 Aktif Ödevler</h2>
          <button class="section-action" onclick="Router.go('homework')">Tümü →</button>
        </div>
        <div class="stagger-children">
          ${activeHw.slice(0, 3).map(hw => {
            const group = DataHelpers.getGroupById(hw.groupId);
            const dueDate = hw.dueDate ? new Date(hw.dueDate) : null;
            const today = new Date();
            const diffDays = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null;
            let urgency = 'relaxed';
            if (diffDays !== null && diffDays <= 1) urgency = 'urgent';
            else if (diffDays !== null && diffDays <= 3) urgency = 'normal';

            // Teslim oranı hesapla
            const totalStudents = group ? group.students.length : 0;
            const submitted = hw.studentStatuses ? Object.values(hw.studentStatuses).filter(s => s.status !== 'assigned').length : 0;
            const progress = totalStudents > 0 ? Math.round((submitted / totalStudents) * 100) : 0;

            return `
              <div class="homework-card" onclick="Router.go('homework', '${hw.id}')">
                <div class="homework-card-header">
                  <div class="homework-title">${hw.title}</div>
                  ${dueDate ? `<span class="homework-due ${urgency}">${diffDays <= 0 ? 'BUGÜN' : diffDays + ' gün'}</span>` : ''}
                </div>
                <div class="homework-group">${group ? group.name : ''} • ${group ? group.subject : ''}</div>
                <div class="homework-progress">
                  <div class="homework-progress-bar progress-animate" style="width: ${progress}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  startCountdown(lesson, isActive) {
    const display = document.getElementById('countdown-display');
    if (!display) return;

    const update = () => {
      const now = new Date();
      let targetMinutes;

      if (isActive) {
        // Ders bitimine kalan
        targetMinutes = DataHelpers.timeToMinutes(lesson.endTime);
      } else if (lesson.isToday) {
        // Ders başlangıcına kalan
        targetMinutes = DataHelpers.timeToMinutes(lesson.startTime);
      } else {
        // Farklı gün — sadece saati göster
        display.textContent = lesson.startTime;
        return;
      }

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      let diff = targetMinutes - currentMinutes;

      if (diff < 0) {
        display.textContent = '00:00';
        return;
      }

      const hours = Math.floor(diff / 60);
      const mins = diff % 60;

      if (hours > 0) {
        display.textContent = `${hours}s ${String(mins).padStart(2, '0')}dk`;
      } else {
        display.textContent = `${mins} dk`;
      }
    };

    update();
    this.countdownInterval = setInterval(update, 30000);
  }
};
