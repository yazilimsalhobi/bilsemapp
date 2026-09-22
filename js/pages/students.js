/**
 * Fatsa BİLSEM — Öğrenci & Veli Sayfası
 */

const StudentsPage = {
  render(container, params = []) {
    const studentId = params[0] || null;

    if (studentId) {
      this.renderStudentDetail(container, studentId);
      return;
    }

    this.renderMain(container);
  },

  renderMain(container) {
    const allStudents = DataHelpers.getAllStudents();

    container.innerHTML = `
      <div class="page-container fade-in">
        <h1 class="page-title">👥 <span>Öğrenciler</span></h1>

        <!-- Arama -->
        <div class="search-bar">
          <input type="text" placeholder="Öğrenci ara..." id="student-search" oninput="StudentsPage.filterStudents(this.value)">
        </div>

        <!-- İstatistik -->
        <div class="stats-grid-3" style="margin-bottom: var(--space-lg);">
          <div class="stat-card">
            <div class="stat-card-value">${allStudents.length}</div>
            <div class="stat-card-label">Toplam</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${BILSEM_DATA.groups.length}</div>
            <div class="stat-card-label">Grup</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${BILSEM_DATA.activeDays.length}</div>
            <div class="stat-card-label">Gün</div>
          </div>
        </div>

        <!-- Gruplara Göre -->
        <div id="students-list">
          ${this.renderGroupedStudents(allStudents)}
        </div>
      </div>
    `;
  },

  renderGroupedStudents(students) {
    const grouped = {};
    students.forEach(s => {
      if (!grouped[s.groupId]) {
        grouped[s.groupId] = {
          group: DataHelpers.getGroupById(s.groupId),
          students: []
        };
      }
      grouped[s.groupId].students.push(s);
    });

    return Object.values(grouped).map(({ group, students }) => `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title" style="font-size: var(--font-base);">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${group.color};"></span>
            ${group.name}
          </h2>
          <span class="chip chip-sm">${group.day} • ${students.length} kişi</span>
        </div>
        <div class="stagger-children">
          ${students.map((student, i) => this.renderStudentCard(student, i)).join('')}
        </div>
      </div>
    `).join('');
  },

  renderStudentCard(student, index) {
    const parentInfo = Store.getParentInfo(student.id);
    const colors = ['#6C5CE7', '#00CEC9', '#FF6B6B', '#00B894', '#FDCB6E', '#A29BFE', '#FD79A8', '#74B9FF'];

    return `
      <div class="student-card" onclick="Router.go('students', '${student.id}')" data-student-name="${student.name.toLowerCase()}">
        <div class="student-card-avatar" style="background: ${colors[index % colors.length]};">
          ${student.name.charAt(0)}
        </div>
        <div class="student-card-info">
          <div class="student-card-name">${student.name}</div>
          <div class="student-card-group">${student.groupName} • ${student.subject}</div>
        </div>
        <div class="student-card-actions">
          ${parentInfo?.parentPhone ? `
            <button class="btn btn-icon btn-ghost" onclick="event.stopPropagation(); window.open('tel:${parentInfo.parentPhone}')" title="Ara">📞</button>
            <button class="btn btn-icon btn-ghost" onclick="event.stopPropagation(); Notifications.sendWhatsApp('${parentInfo.parentPhone}', 'Merhaba.')" title="WhatsApp">💬</button>
          ` : ''}
        </div>
      </div>
    `;
  },

  renderStudentDetail(container, studentId) {
    const student = DataHelpers.getStudentById(studentId);
    if (!student) {
      container.innerHTML = '<div class="page-container"><div class="empty-state"><div class="empty-state-title">Öğrenci bulunamadı</div></div></div>';
      return;
    }

    const parentInfo = Store.getParentInfo(studentId);
    const attendanceRecords = Store.getStudentAttendance(studentId);
    const group = DataHelpers.getGroupById(student.groupId);
    const studentNoteObj = Store.getStudentNote(studentId);
    const studentNote = studentNoteObj?.note || student.note || '';

    // İstatistikler
    const totalSessions = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const rate = totalSessions > 0 ? Math.round(((present + late) / totalSessions) * 100) : 0;

    container.innerHTML = `
      <div class="page-container fade-in">
        <!-- Geri -->
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--space-lg);">
          <button class="btn btn-ghost btn-icon" onclick="Router.go('students')">←</button>
          <div style="flex: 1;">
            <h1 style="font-size: var(--font-lg); font-weight: 700; margin: 0;">Öğrenci Profili</h1>
          </div>
        </div>

        <!-- Profil Kartı -->
        <div class="card-glass" style="text-align: center; padding: var(--space-xl); margin-bottom: var(--space-lg);">
          <div class="student-card-avatar" style="width: 72px; height: 72px; font-size: 1.8rem; margin: 0 auto var(--space-md); background: ${group?.color || 'var(--primary)'};">
            ${student.name.charAt(0)}
          </div>
          <h2 style="font-size: var(--font-xl); font-weight: 800; margin-bottom: 4px;">${student.name}</h2>
          <div style="color: var(--text-tertiary); font-size: var(--font-sm);">
            ${student.groupName} • ${student.subject} • ${student.day}
          </div>
          ${studentNote ? `<div class="chip" style="margin-top: 8px;">📍 ${studentNote.length > 50 ? studentNote.substring(0, 50) + '...' : studentNote}</div>` : ''}
        </div>

        <!-- Devam İstatistikleri -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📊 Devam Durumu</h2>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-card-icon">📋</div>
              <div class="stat-card-value">${totalSessions}</div>
              <div class="stat-card-label">Toplam Ders</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">✅</div>
              <div class="stat-card-value" style="color: var(--success);">${present}</div>
              <div class="stat-card-label">Geldi</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">❌</div>
              <div class="stat-card-value" style="color: var(--danger);">${absent}</div>
              <div class="stat-card-label">Gelmedi</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">📈</div>
              <div class="stat-card-value" style="color: ${rate >= 80 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)'};">%${rate}</div>
              <div class="stat-card-label">Devam Oranı</div>
            </div>
          </div>
        </div>

        <!-- Veli Bilgileri -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">👨‍👩‍👧 Veli Bilgileri</h2>
            <button class="section-action" onclick="StudentsPage.editParentInfo('${studentId}')">✏️ Düzenle</button>
          </div>
          <div class="card" id="parent-info-card">
            ${this.renderParentInfo(studentId, parentInfo)}
          </div>
        </div>

        <!-- Özel Durum -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📌 Özel Durum / Not</h2>
            <button class="section-action" onclick="StudentsPage.editStudentNote('${studentId}')">✏️ Düzenle</button>
          </div>
          <div class="card" style="padding: var(--space-md); line-height: 1.5; color: ${studentNote ? 'var(--text-primary)' : 'var(--text-tertiary)'};">
            ${studentNote ? studentNote.replace(/\n/g, '<br>') : 'Henüz özel bir durum eklenmemiş.'}
          </div>
        </div>

        <!-- Yoklama Geçmişi -->
        ${attendanceRecords.length > 0 ? `
          <div class="section">
            <div class="section-header">
              <h2 class="section-title">📜 Yoklama Geçmişi</h2>
            </div>
            <div class="stagger-children">
              ${attendanceRecords.slice(0, 10).map(record => {
                const statusObj = BILSEM_DATA.attendanceStatuses.find(s => s.id === record.status);
                return `
                  <div class="card" style="padding: 12px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: var(--font-sm); font-weight: 600;">${record.date}</span>
                    <span class="chip chip-sm" style="background: ${statusObj?.color}20; color: ${statusObj?.color}; border-color: ${statusObj?.color}40;">
                      ${statusObj?.icon} ${statusObj?.label}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- İletişim Butonları -->
        <div style="display: flex; gap: 8px; margin-bottom: var(--space-xl);">
          ${parentInfo?.parentPhone ? `
            <button class="btn btn-primary btn-block" onclick="window.open('tel:${parentInfo.parentPhone}')">📞 Ara</button>
            <button class="btn btn-success btn-block" onclick="Notifications.sendWhatsApp('${parentInfo.parentPhone}', 'Merhaba, ${student.name} velisi. Fatsa BİLSEM\\'den arıyorum.')">💬 WhatsApp</button>
          ` : `
            <button class="btn btn-primary btn-block" onclick="StudentsPage.editParentInfo('${studentId}')">📞 Telefon Ekle</button>
          `}
        </div>
      </div>
    `;
  },

  renderParentInfo(studentId, parentInfo) {
    if (!parentInfo || (!parentInfo.parentName && !parentInfo.parentPhone)) {
      return `
        <div style="text-align: center; padding: var(--space-md); color: var(--text-tertiary);">
          <p>Veli bilgisi henüz eklenmemiş</p>
          <button class="btn btn-sm btn-primary" style="margin-top: 8px;" onclick="StudentsPage.editParentInfo('${studentId}')">➕ Ekle</button>
        </div>
      `;
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${parentInfo.parentName ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-tertiary); font-size: var(--font-sm);">Veli Adı</span>
            <span style="font-weight: 600;">${parentInfo.parentName}</span>
          </div>
        ` : ''}
        ${parentInfo.parentPhone ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-tertiary); font-size: var(--font-sm);">Telefon</span>
            <span style="font-weight: 600;">${parentInfo.parentPhone}</span>
          </div>
        ` : ''}
      </div>
    `;
  },

  editParentInfo(studentId) {
    const student = DataHelpers.getStudentById(studentId);
    const existing = Store.getParentInfo(studentId);

    App.showModal('✏️ Veli Bilgileri', `
      <p style="color: var(--text-tertiary); font-size: var(--font-sm); margin-bottom: var(--space-md);">
        ${student?.name || ''} — Veli bilgilerini girin
      </p>
      <div class="form-group">
        <label class="form-label">Veli Adı Soyadı</label>
        <input type="text" class="form-input" id="parent-name" value="${existing?.parentName || ''}" placeholder="Veli adı soyadı">
      </div>
      <div class="form-group">
        <label class="form-label">Telefon Numarası</label>
        <input type="tel" class="form-input" id="parent-phone" value="${existing?.parentPhone || ''}" placeholder="05XX XXX XX XX">
      </div>
    `, `
      <button class="btn btn-primary btn-block btn-lg" onclick="StudentsPage.saveParentInfo('${studentId}')">💾 Kaydet</button>
    `);
  },

  saveParentInfo(studentId) {
    const name = document.getElementById('parent-name')?.value?.trim() || '';
    const phone = document.getElementById('parent-phone')?.value?.trim() || '';

    Store.saveParentInfo(studentId, name, phone);
    App.closeModal();
    Toast.show('Veli bilgileri kaydedildi! ✅', 'success');

    // Sayfayı yenile
    this.renderStudentDetail(document.getElementById('page-content'), studentId);
  },

  editStudentNote(studentId) {
    const student = DataHelpers.getStudentById(studentId);
    const existingObj = Store.getStudentNote(studentId);
    const note = existingObj?.note || student.note || '';

    App.showModal('📌 Özel Durum Ekle', `
      <p style="color: var(--text-tertiary); font-size: var(--font-sm); margin-bottom: var(--space-md);">
        ${student?.name || ''} — Öğrenci ile ilgili özel durum veya not ekleyin
      </p>
      <div class="form-group">
        <textarea class="form-input" id="student-note-input" rows="4" placeholder="Sağlık durumu, özel ilgi alanı, vb.">${note}</textarea>
      </div>
    `, `
      <button class="btn btn-primary btn-block btn-lg" onclick="StudentsPage.saveStudentNote('${studentId}')">💾 Kaydet</button>
    `);
  },

  saveStudentNote(studentId) {
    const note = document.getElementById('student-note-input')?.value?.trim() || '';
    Store.saveStudentNote(studentId, note);
    App.closeModal();
    Toast.show('Özel durum kaydedildi! ✅', 'success');
    this.renderStudentDetail(document.getElementById('page-content'), studentId);
  },

  filterStudents(query) {
    const lowerQuery = query.toLowerCase();
    document.querySelectorAll('[data-student-name]').forEach(card => {
      const name = card.dataset.studentName;
      card.style.display = name.includes(lowerQuery) ? '' : 'none';
    });
  }
};
