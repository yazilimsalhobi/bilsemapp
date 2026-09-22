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
    let todayGroups = DataHelpers.getTodayGroups();
    let currentLesson = DataHelpers.getCurrentLesson();
    let nextLesson = DataHelpers.getNextLesson();
    const stats = Store.getOverallStats();
    const dayColor = BILSEM_DATA.dayColors[dayName];
    const teacherFirst = BILSEM_DATA.school?.teacher ? BILSEM_DATA.school.teacher.split(' ')[0] : '';
    const user = typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null;
    const isParent = user && user.role === 'parent';
    const welcomeGreeting = isParent ? `${user.studentName || 'Öğrenci'} Velisi` : (teacherFirst ? `${teacherFirst} Öğretmenim` : 'Öğretmenim');

    if (isParent) {
      // Veli ise, sadece öğrencisinin olduğu dersleri filtrele
      const filterGroups = (groups) => groups.filter(g => g.students.some(s => s.id === user.studentId));
      todayGroups = filterGroups(todayGroups);
      if (currentLesson && !currentLesson.students.some(s => s.id === user.studentId)) currentLesson = null;
      if (nextLesson && !nextLesson.students.some(s => s.id === user.studentId)) nextLesson = null;
    }

    container.innerHTML = `
      <div class="page-container fade-in">
        <!-- Karşılama -->
        <div class="welcome-section">
          <div class="welcome-date">${dayColor?.emoji || '📅'} ${dayName}, ${DataHelpers.formatDate(now)}</div>
          <h1 class="welcome-title">Merhaba, <span class="text-gradient">${welcomeGreeting}</span> 👋</h1>
        </div>

        <!-- Aktif / Sonraki Ders -->
        ${currentLesson ? this.renderCurrentLesson(currentLesson, isParent) : ''}
        ${!currentLesson && nextLesson ? this.renderNextLesson(nextLesson) : ''}

        ${isParent ? '' : `
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
            <div class="quick-action" onclick="Router.go('settings')">
              <div class="quick-action-icon" style="background: rgba(108,92,231,0.15);">⚙️</div>
              <span class="quick-action-label">Ayarlar</span>
            </div>
            <div class="quick-action" onclick="Router.go('annual_plan')">
              <div class="quick-action-icon" style="background: rgba(253,121,168,0.15);">📅</div>
              <span class="quick-action-label">Yıllık Plan</span>
            </div>
            <div class="quick-action" onclick="Router.go('competitions')">
              <div class="quick-action-icon" style="background: rgba(255,159,67,0.15);">🏆</div>
              <span class="quick-action-label">Yarışmalar</span>
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

        <!-- Hatırlatmalarım -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📌 Hatırlatmalarım</h2>
          </div>
          <div class="todo-container" style="background: var(--bg-card); border-radius: var(--radius-md); padding: var(--space-md); border: 1px solid var(--border-subtle);">
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
              <input type="text" id="new-todo-input" class="form-input" placeholder="Yeni hatırlatma ekle..." style="flex: 1;" onkeypress="if(event.key === 'Enter') HomePage.addTodo()">
              <button class="btn btn-primary" onclick="HomePage.addTodo()">Ekle</button>
            </div>
            <div id="todo-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">
              <!-- ToDos here -->
            </div>
          </div>
        </div>
        `}

        <!-- Bugünün Dersleri -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">${todayGroups.length > 0 ? '📅 Bugünün Dersleri' : '🌙 Bugün Ders Yok'}</h2>
            ${todayGroups.length > 0 && !isParent ? '<button class="section-action" onclick="Router.go(\'schedule\')">Tümünü Gör →</button>' : ''}
          </div>
          ${todayGroups.length > 0 ? this.renderTodayGroups(todayGroups, currentLesson, isParent) : this.renderNoLesson()}
        </div>

        <!-- Yaklaşan Ödevler -->
        ${this.renderUpcomingHomework(isParent)}
      </div>
    `;

    // Geri sayım başlat
    if (nextLesson || currentLesson) {
      this.startCountdown(nextLesson || currentLesson, !!currentLesson);
    }
    
    // Hatırlatmaları yükle
    this.renderTodos();
  },

  renderCurrentLesson(lesson, isParent = false) {
    return `
      <div class="countdown card-glass active-lesson-card glow-ring" style="border: 1px solid var(--success); margin-bottom: var(--space-lg);">
        <div class="countdown-info">
          <div class="countdown-label" style="color: var(--success);">🟢 ŞU AN DERSTESİNİZ</div>
          <div class="countdown-group">${lesson.name}</div>
          <div style="font-size: var(--font-sm); color: var(--text-tertiary); margin-top: 2px;">
            ${lesson.subject} • ${lesson.startTime} - ${lesson.endTime}
          </div>
          ${!isParent ? `
          <div style="margin-top: 8px; display: flex; gap: 8px;">
            <button class="btn btn-success btn-sm" onclick="Router.go('attendance', '${lesson.id}')">
              ✅ Yoklama Al
            </button>
          </div>
          ` : ''}
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

  renderTodayGroups(groups, currentLesson, isParent = false) {
    return `
      <div class="stagger-children">
        ${groups.map(group => {
          const isActive = currentLesson && currentLesson.id === group.id;
          const color = group.color;
          const todayDate = DataHelpers.formatDateShort(new Date());
          const savedNote = Store.getNote(group.id, todayDate)?.note || '';
          
          return `
            <div class="group-card ${isActive ? 'active-lesson' : ''}" style="--card-color: ${color}; cursor: default;">
              <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: ${color};"></div>
              <div class="group-card-header" ${!isParent ? `onclick="Router.go('attendance', '${group.id}')" style="cursor: pointer;"` : ''}>
                <div class="group-card-info">
                  <div class="group-card-name">${group.name}</div>
                  <div class="group-card-subject">${group.subject}</div>
                </div>
                <div class="group-card-time">
                  🕐 ${group.startTime} - ${group.endTime}
                </div>
              </div>
              ${isActive ? '<span class="active-badge">CANLI</span>' : ''}
              
              <div class="group-card-students" style="margin-top: 12px;">
                <div class="student-avatars">
                  ${group.students.slice(0, 4).map((s, i) => {
                    const colors = ['#6C5CE7', '#00CEC9', '#FF6B6B', '#00B894', '#FDCB6E'];
                    return `<div class="student-avatar" style="background: ${colors[i % colors.length]};">${s.name.charAt(0)}</div>`;
                  }).join('')}
                  ${group.students.length > 4 ? `<div class="student-avatar" style="background: var(--bg-glass-strong); color: var(--text-secondary); font-size: 0.6rem;">+${group.students.length - 4}</div>` : ''}
                </div>
                <span class="student-count">${group.students.length} öğrenci</span>
              </div>
              
              <div class="group-card-actions" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05);">
                 <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                   <strong style="color: var(--text-primary);">🎯 Kazanım:</strong> 
                   <span ${!isParent ? 'contenteditable="true"' : ''}
                         ${!isParent ? `onblur="Store.saveNote('${group.id}', '${todayDate}', this.innerText)"` : ''} 
                         style="${!isParent ? 'border-bottom: 1px dashed rgba(255,255,255,0.3);' : ''} outline: none; min-width: 100px; display: inline-block; padding: 2px 4px;" 
                         data-placeholder="${!isParent ? 'Kazanım girmek için tıklayın...' : 'Henüz girilmedi'}">${savedNote}</span>
                 </div>
                 ${!isParent ? `
                 <div style="display: flex; gap: 8px;">
                   <button class="btn btn-sm" style="flex: 1; background: rgba(0, 184, 148, 0.15); color: #00B894; border: 1px solid rgba(0, 184, 148, 0.3);" onclick="Router.go('attendance', '${group.id}')">✅ Yoklama Al</button>
                   <button class="btn btn-sm" style="flex: 1; background: rgba(108, 92, 231, 0.15); color: #A29BFE; border: 1px solid rgba(108, 92, 231, 0.3);" onclick="Router.go('homework', '${group.id}')">📝 Ödev Ver</button>
                 </div>
                 ` : ''}
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
  },

  renderTodos() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    const todos = Store.getTodos().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (todos.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: var(--text-tertiary); font-size: 0.9rem; padding: 16px;">Henüz hatırlatma eklenmemiş.</div>';
      return;
    }
    list.innerHTML = todos.map(t => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(0,0,0,0.2); border-radius: var(--radius-sm); border-left: 3px solid ${t.completed ? 'var(--success)' : 'var(--primary)'}; opacity: ${t.completed ? '0.6' : '1'};">
        <div style="display: flex; align-items: center; gap: 12px; flex: 1; cursor: pointer;" onclick="HomePage.toggleTodo('${t.id}')">
          <input type="checkbox" ${t.completed ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--primary);">
          <span style="font-size: 0.95rem; text-decoration: ${t.completed ? 'line-through' : 'none'};">${t.text}</span>
        </div>
        <button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 0.7rem; min-width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 6px;" onclick="HomePage.deleteTodo('${t.id}')">✕</button>
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
