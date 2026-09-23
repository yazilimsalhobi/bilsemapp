/**
 * Fatsa BİLSEM — Yoklama Sayfası
 */

const AttendancePage = {
  currentGroupId: null,
  currentDate: null,
  records: {},

  render(container, params = []) {
    const groupId = params[0] || null;
    this.currentDate = DataHelpers.formatDateShort();

    container.innerHTML = `
      <div class="page-container fade-in">
        <h1 class="page-title">✅ <span>Yoklama</span></h1>

        ${groupId ? this.renderGroupAttendance(groupId) : this.renderGroupSelection()}
      </div>
    `;
  },

  renderGroupSelection() {
    let todayGroups = DataHelpers.getTodayGroups();
    let allGroups = BILSEM_DATA.groups;
    
    const user = Auth.getCurrentUser();
    const isParent = user && user.role === 'parent';

    if (isParent) {
      todayGroups = todayGroups.filter(g => g.students.some(s => s.id === user.studentId));
      allGroups = allGroups.filter(g => g.students.some(s => s.id === user.studentId));
    } else {
      // Öğretmen branşı filtresi: Sadece öğretmenin seçtiği branşın gruplarını göster
      const teacherDept = (BILSEM_DATA.school?.department || Store.getSetting('schoolInfo', {}).department || '').trim();
      if (teacherDept) {
        const depts = teacherDept.split(',').map(d => UI.normalize(d.trim())).filter(Boolean);
        const matchesDept = (g) => {
          if (!g.subject) return false;
          const normSubj = UI.normalize(g.subject);
          return depts.some(d => normSubj.includes(d) || d.includes(normSubj));
        };
        const filteredToday = todayGroups.filter(matchesDept);
        const filteredAll = allGroups.filter(matchesDept);
        if (filteredAll.length > 0) {
          todayGroups = filteredToday;
          allGroups = filteredAll;
        }
      }
    }

    return `
      ${todayGroups.length > 0 ? `
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📅 Bugünün Grupları</h2>
          </div>
          <div class="stagger-children">
            ${todayGroups.map(group => this.renderGroupCard(group, true)).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">📋 Tüm Gruplar</h2>
        </div>
        <div class="stagger-children">
          ${allGroups.map(group => this.renderGroupCard(group, false)).join('')}
        </div>
      </div>
    `;
  },

  renderGroupCard(group, isToday) {
    const attendance = Store.getAttendance(group.id, this.currentDate);
    const dayColor = BILSEM_DATA.dayColors[group.day];

    return `
      <div class="group-card" onclick="Router.go('attendance', '${group.id}')">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: ${group.color};"></div>
        <div class="group-card-header">
          <div class="group-card-info">
            <div class="group-card-name" style="display: flex; align-items: center; gap: 8px;">
              ${UI.escape(group.name)}
              ${attendance ? '<span class="chip chip-sm" style="background: rgba(0,184,148,0.15); color: var(--success); border-color: var(--success);">✅ Alındı</span>' : ''}
            </div>
            <div class="group-card-subject">${group.day} • ${UI.escape(group.subject)} • ${group.students.length} öğrenci</div>
          </div>
          <div class="group-card-time">🕐 ${group.startTime}</div>
        </div>
      </div>
    `;
  },

  renderGroupAttendance(groupId) {
    this.currentGroupId = groupId;
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return '<div class="empty-state"><div class="empty-state-title">Grup bulunamadı</div></div>';

    // Mevcut yoklama varsa yükle
    const existing = Store.getAttendance(groupId, this.currentDate);
    this.records = {};
    if (existing) {
      existing.records.forEach(r => { this.records[r.studentId] = r.status; });
    }

    const statuses = BILSEM_DATA.attendanceStatuses;

    const user = Auth.getCurrentUser();
    const isParent = user && user.role === 'parent';
    
    // Veli ise sadece kendi öğrencisini listele
    let displayStudents = group.students;
    if (isParent) {
      displayStudents = displayStudents.filter(s => s.id === user.studentId);
    }

    return `
      <!-- Geri butonu & bilgi -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--space-lg);">
        <button class="btn btn-ghost btn-icon" onclick="Router.go('attendance')">←</button>
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: var(--font-md);">${UI.escape(group.name)}</div>
          <div style="font-size: var(--font-sm); color: var(--text-tertiary);">${group.day} • ${UI.escape(group.subject)} • ${this.currentDate}</div>
        </div>
        <div class="chip" style="background: ${group.color}20; color: ${group.color}; border-color: ${group.color}40;">
          ${displayStudents.length} kişi
        </div>
      </div>

      <!-- Toplu İşlemler -->
      ${!isParent ? `
      <div style="display: flex; gap: 6px; margin-bottom: var(--space-lg); flex-wrap: wrap;">
        <button class="btn btn-sm btn-success" onclick="AttendancePage.markAll('present')">✅ Hepsi Geldi</button>
        <button class="btn btn-sm btn-secondary" onclick="AttendancePage.markAll('absent')">❌ Hepsi Gelmedi</button>
        <button class="btn btn-sm btn-secondary" onclick="AttendancePage.showHistory('${groupId}')">📜 Geçmiş</button>
      </div>
      ` : `
      <div style="display: flex; gap: 6px; margin-bottom: var(--space-lg); flex-wrap: wrap;">
        <button class="btn btn-sm btn-secondary" onclick="AttendancePage.showHistory('${groupId}')">📜 Tüm Devamsızlık Geçmişi</button>
      </div>
      `}

      <!-- Öğrenci Listesi -->
      <div class="attendance-list stagger-children" id="attendance-list">
        ${displayStudents.map((student, index) => {
          const currentStatus = this.records[student.id] || '';
          return `
            <div class="attendance-item" id="att-${student.id}" data-student="${student.id}">
              <div class="student-card-avatar" style="background: ${this.getAvatarColor(index)}; width: 38px; height: 38px; font-size: 0.85rem;">
                ${UI.escape(student.name.charAt(0))}
              </div>
              <div class="student-info" style="flex: 1; min-width: 0;">
                <div class="student-name truncate">${UI.escape(student.name)}</div>
                ${student.note && !isParent ? `<div class="student-note">${student.note}</div>` : ''}
              </div>
              <div class="attendance-actions">
                ${isParent ? `
                  <span style="font-size: 0.9rem; font-weight: 600; color: ${currentStatus === 'present' ? 'var(--success)' : (currentStatus === 'absent' ? 'var(--danger)' : 'var(--text-tertiary)')}">
                    ${currentStatus === 'present' ? '✅ Geldi' : (currentStatus === 'absent' ? '❌ Gelmedi' : (currentStatus === 'late' ? '⏱️ Geç Kaldı' : (currentStatus === 'excused' ? '📝 İzinli' : 'Belirtilmedi')))}
                  </span>
                ` : `
                  ${statuses.map(s => `
                    <button class="attendance-btn ${currentStatus === s.id ? `selected selected-${s.id}` : ''}"
                            onclick="AttendancePage.toggleStatus('${student.id}', '${s.id}')"
                            title="${s.label}">
                      ${s.icon}
                    </button>
                  `).join('')}
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Kaydet Butonu -->
      ${!isParent ? `
      <div style="position: sticky; bottom: calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 12px); padding: var(--space-md) 0; z-index: 10;">
        <button class="btn btn-primary btn-lg btn-block" onclick="AttendancePage.save()" id="save-attendance-btn">
          💾 Yoklamayı Kaydet
        </button>
      </div>
      ` : ''}
    `;
  },

  toggleStatus(studentId, status) {
    // Aynı duruma tekrar tıklandıysa kaldır
    if (this.records[studentId] === status) {
      delete this.records[studentId];
    } else {
      this.records[studentId] = status;
    }

    // UI güncelle
    const item = document.getElementById(`att-${studentId}`);
    if (!item) return;

    const buttons = item.querySelectorAll('.attendance-btn');
    buttons.forEach(btn => {
      btn.className = 'attendance-btn';
    });

    if (this.records[studentId]) {
      const activeBtn = item.querySelector(`[onclick*="'${status}'"]`);
      if (activeBtn) {
        activeBtn.classList.add('selected', `selected-${status}`, 'attendance-check-anim');
      }
    }
  },

  markAll(status) {
    const group = DataHelpers.getGroupById(this.currentGroupId);
    if (!group) return;

    group.students.forEach(student => {
      this.records[student.id] = status;
    });

    // UI güncelle
    group.students.forEach(student => {
      const item = document.getElementById(`att-${student.id}`);
      if (!item) return;

      const buttons = item.querySelectorAll('.attendance-btn');
      buttons.forEach(btn => {
        btn.className = 'attendance-btn';
      });

      const activeBtn = item.querySelector(`[onclick*="'${status}'"]`);
      if (activeBtn) {
        activeBtn.classList.add('selected', `selected-${status}`, 'attendance-check-anim');
      }
    });

    Toast.show(`Tüm öğrenciler "${BILSEM_DATA.attendanceStatuses.find(s => s.id === status)?.label}" olarak işaretlendi`, 'success');
  },

  save() {
    if (!this.currentGroupId) return;

    const group = DataHelpers.getGroupById(this.currentGroupId);
    if (!group) return;

    // Eksik yoklama kontrolü
    const unmarked = group.students.filter(s => !this.records[s.id]);
    if (unmarked.length > 0) {
      Toast.show(`${unmarked.length} öğrenci işaretlenmedi!`, 'warning');
      // Yine de kaydet
    }

    const records = Object.entries(this.records).map(([studentId, status]) => ({
      studentId,
      status
    }));

    Store.saveAttendance(this.currentGroupId, this.currentDate, records);

    // Kaydet butonunu güncelle
    const btn = document.getElementById('save-attendance-btn');
    if (btn) {
      btn.innerHTML = '✅ Kaydedildi!';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-success');
      setTimeout(() => {
        btn.innerHTML = '💾 Yoklamayı Kaydet';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-primary');
      }, 2000);
    }

    Toast.show('Yoklama başarıyla kaydedildi! ✅', 'success');

    // Devamsız öğrencilere WhatsApp bildirimi öner
    const absentStudents = group.students.filter(s => this.records[s.id] === 'absent');
    if (absentStudents.length > 0) {
      setTimeout(() => {
        this.offerAbsenceNotification(group, absentStudents);
      }, 1000);
    }
  },

  offerAbsenceNotification(group, absentStudents) {
    const names = absentStudents.map(s => s.name).join(', ');
    App.showModal('📱 Devamsızlık Bildirimi', `
      <p style="margin-bottom: var(--space-md); color: var(--text-secondary);">
        Aşağıdaki öğrenciler derse gelmedi. Velilerine WhatsApp ile bildirim göndermek ister misiniz?
      </p>
      <div style="margin-bottom: var(--space-lg);">
        ${absentStudents.map(student => {
          const parentInfo = Store.getParentInfo(student.id);
          return `
            <div class="attendance-item" style="margin-bottom: 8px;">
              <div style="flex: 1;">
                <div class="student-name">${UI.escape(student.name)}</div>
                <div class="student-note">${parentInfo?.parentPhone || 'Telefon kayıtlı değil'}</div>
              </div>
              ${parentInfo?.parentPhone ? `
                <button class="btn btn-sm btn-success" onclick="Notifications.messageParent('${student.id}', '${group.id}', '${this.currentDate}')">
                  💬 Gönder
                </button>
              ` : `
                <button class="btn btn-sm btn-secondary" onclick="Router.go('students', '${student.id}'); App.closeModal();">
                  📞 Numara Ekle
                </button>
              `}
            </div>
          `;
        }).join('')}
      </div>
    `);
  },

  showHistory(groupId) {
    const history = Store.getGroupAttendanceHistory(groupId);
    const group = DataHelpers.getGroupById(groupId);

    const user = Auth.getCurrentUser();
    const isParent = user && user.role === 'parent';

    if (history.length === 0) {
      App.showModal('📜 Yoklama Geçmişi', `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">Henüz yoklama kaydı yok</div>
        </div>
      `);
      return;
    }

    App.showModal(`📜 ${UI.escape(group.name)} — Geçmiş`, `
      <div class="stagger-children">
        ${history.slice(0, 20).map(entry => {
          let records = entry.records;
          if (isParent) {
            records = records.filter(r => r.studentId === user.studentId);
          }
          
          if (isParent && records.length === 0) return '';
          
          const present = records.filter(r => r.status === 'present').length;
          const absent = records.filter(r => r.status === 'absent').length;
          const total = records.length;
          return `
            <div class="card" style="margin-bottom: 8px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 600;">${entry.date}</div>
                  <div style="font-size: var(--font-xs); color: var(--text-tertiary);">${total} öğrenci</div>
                </div>
                <div style="display: flex; gap: 8px;">
                  <span class="chip chip-sm" style="background: rgba(0,184,148,0.15); color: var(--success);">✅ ${present}</span>
                  ${absent > 0 ? `<span class="chip chip-sm" style="background: rgba(255,107,107,0.15); color: var(--danger);">❌ ${absent}</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `);
  },

  getAvatarColor(index) {
    const colors = ['#6C5CE7', '#00CEC9', '#FF6B6B', '#00B894', '#FDCB6E', '#A29BFE', '#FD79A8', '#74B9FF', '#55EFC4', '#E17055'];
    return colors[index % colors.length];
  }
};
