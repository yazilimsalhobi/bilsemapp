/**
 * Fatsa BİLSEM — Haftalık Ders Programı Sayfası
 */

const SchedulePage = {
  render(container) {
    const activeDays = BILSEM_DATA.activeDays;
    const todayName = DataHelpers.getDayName();
    const defaultDay = activeDays.includes(todayName) ? todayName : activeDays[0];

    container.innerHTML = `
      <div class="page-container fade-in">
        <h1 class="page-title">📅 Ders <span>Programı</span></h1>

        <!-- Gün Sekmeleri -->
        <div class="day-tabs" id="day-tabs">
          ${activeDays.map(day => {
            const color = BILSEM_DATA.dayColors[day];
            const isActive = day === defaultDay;
            const groups = DataHelpers.getGroupsByDay(day);
            return `
              <button class="day-tab ${isActive ? 'active' : ''}" 
                      data-day="${day}"
                      style="${isActive ? `background: ${color.bg}; border-color: ${color.bg};` : ''}"
                      onclick="SchedulePage.selectDay('${day}')">
                ${color.emoji} ${day}
                <span style="margin-left: 4px; opacity: 0.7;">(${groups.length})</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Ders Listesi -->
        <div id="schedule-content">
          ${this.renderDaySchedule(defaultDay)}
        </div>
      </div>
    `;
  },

  selectDay(day) {
    // Tab aktifliğini güncelle
    const color = BILSEM_DATA.dayColors[day];
    document.querySelectorAll('.day-tab').forEach(tab => {
      const isThis = tab.dataset.day === day;
      tab.classList.toggle('active', isThis);
      tab.style.background = isThis ? color.bg : '';
      tab.style.borderColor = isThis ? color.bg : '';
      tab.style.color = isThis ? 'white' : '';
    });

    // İçerik güncelle
    const content = document.getElementById('schedule-content');
    content.innerHTML = this.renderDaySchedule(day);
  },

  renderDaySchedule(day) {
    const groups = DataHelpers.getGroupsByDay(day);
    const dayColor = BILSEM_DATA.dayColors[day];
    const now = new Date();
    const isToday = DataHelpers.getDayName(now) === day;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (groups.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">${day} günü ders bulunmuyor</div>
        </div>
      `;
    }

    return `
      <div class="stagger-children">
        ${groups.map(group => {
          const startMin = DataHelpers.timeToMinutes(group.startTime);
          const endMin = DataHelpers.timeToMinutes(group.endTime);
          const isActive = isToday && currentMinutes >= startMin && currentMinutes <= endMin;
          const isPast = isToday && currentMinutes > endMin;
          const attendance = Store.getAttendance(group.id, DataHelpers.formatDateShort());

          return `
            <div class="group-card ${isActive ? 'active-lesson' : ''}" 
                 style="opacity: ${isPast ? '0.6' : '1'};">
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: ${dayColor.gradient};"></div>
              
              <div class="group-card-header">
                <div class="group-card-info">
                  <div class="group-card-name" style="display: flex; align-items: center; gap: 8px;">
                    ${group.name}
                    ${isActive ? '<span class="active-badge">CANLI</span>' : ''}
                    ${isPast ? '<span class="chip chip-sm" style="opacity: 0.6;">Bitti</span>' : ''}
                    ${attendance ? '<span class="chip chip-sm" style="background: rgba(0,184,148,0.15); color: var(--success); border-color: var(--success);">✅ Yoklama alındı</span>' : ''}
                  </div>
                  <div class="group-card-subject">${group.subject} • ${group.timeSlot}</div>
                </div>
                <div class="group-card-time">🕐 ${group.startTime} - ${group.endTime}</div>
              </div>

              <!-- Ders Saatleri -->
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0;">
                ${group.lessons.map(lesson => {
                  const lessonStart = DataHelpers.timeToMinutes(lesson.start);
                  const lessonEnd = DataHelpers.timeToMinutes(lesson.end);
                  const isLessonActive = isToday && currentMinutes >= lessonStart && currentMinutes <= lessonEnd;
                  return `
                    <span class="chip ${isLessonActive ? 'glow-ring' : ''}" 
                          style="${isLessonActive ? 'background: rgba(0,184,148,0.2); border-color: var(--success); color: var(--success);' : ''}">
                      ${lesson.order}. Ders: ${lesson.start}-${lesson.end}
                    </span>
                  `;
                }).join('')}
              </div>

              <!-- Öğrenci Listesi -->
              <div class="group-card-students">
                <div class="student-avatars">
                  ${group.students.slice(0, 5).map((s, i) => {
                    const colors = ['#6C5CE7', '#00CEC9', '#FF6B6B', '#00B894', '#FDCB6E', '#A29BFE'];
                    return `<div class="student-avatar" style="background: ${colors[i % colors.length]};" title="${s.name}">${s.name.charAt(0)}</div>`;
                  }).join('')}
                  ${group.students.length > 5 ? `<div class="student-avatar" style="background: var(--bg-glass-strong); color: var(--text-secondary);">+${group.students.length - 5}</div>` : ''}
                </div>
                <span class="student-count">${group.students.length} öğrenci</span>
              </div>

              <!-- Aksiyon Butonları -->
              <div style="display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
                <button class="btn btn-primary btn-sm" style="flex: 1;" onclick="event.stopPropagation(); Router.go('attendance', '${group.id}')">
                  ✅ Yoklama
                </button>
                <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="event.stopPropagation(); Router.go('homework', 'new-${group.id}')">
                  📝 Ödev Ver
                </button>
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); SchedulePage.showStudents('${group.id}')">
                  👁️
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  showStudents(groupId) {
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    App.showModal(`${group.name} — Öğrenciler`, `
      <div class="stagger-children">
        ${group.students.map((student, i) => {
          const parentInfo = Store.getParentInfo(student.id);
          const colors = ['#6C5CE7', '#00CEC9', '#FF6B6B', '#00B894', '#FDCB6E', '#A29BFE'];
          return `
            <div class="student-card" onclick="Router.go('students', '${student.id}'); App.closeModal();">
              <div class="student-card-avatar" style="background: ${colors[i % colors.length]};">
                ${student.name.charAt(0)}
              </div>
              <div class="student-card-info">
                <div class="student-card-name">${student.name}</div>
                <div class="student-card-group">${student.note || group.subject}</div>
              </div>
              ${parentInfo?.parentPhone ? `
                <button class="btn btn-icon btn-ghost" onclick="event.stopPropagation(); Notifications.sendWhatsApp('${parentInfo.parentPhone}', 'Merhaba, ${student.name} velisi.');" title="WhatsApp">
                  💬
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `);
  }
};
