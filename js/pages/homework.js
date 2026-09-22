/**
 * Fatsa BİLSEM — Ödev & Proje Takip Sayfası
 */

const HomeworkPage = {
  render(container, params = []) {
    const param = params[0] || null;

    // Yeni ödev oluşturma
    if (param && param.startsWith('new-')) {
      const groupId = param.replace('new-', '');
      this.showNewHomeworkForm(container, groupId);
      return;
    }

    // Ödev detay
    if (param && param.startsWith('hw_')) {
      this.showHomeworkDetail(container, param);
      return;
    }

    this.renderMain(container);
  },

  renderMain(container) {
    const allHomework = Store.getAllHomework();
    const activeHw = allHomework.filter(h => !h.completed);
    const completedHw = allHomework.filter(h => h.completed);

    container.innerHTML = `
      <div class="page-container fade-in">
        <h1 class="page-title">📝 Ödev & <span>Proje</span></h1>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab active" onclick="HomeworkPage.switchTab('active', this)">Aktif (${activeHw.length})</button>
          <button class="tab" onclick="HomeworkPage.switchTab('completed', this)">Tamamlanan (${completedHw.length})</button>
          <button class="tab" onclick="HomeworkPage.switchTab('projects', this)">Projeler</button>
        </div>

        <div class="section" data-accordion-title="Ödev ve proje listesi"><div id="homework-content">
          ${this.renderActiveHomework(activeHw)}
        </div>

        </div>
        <!-- FAB: Yeni Ödev -->
        <button class="btn btn-primary btn-fab" onclick="HomeworkPage.showNewModal()">➕</button>
      </div>
    `;
  },

  switchTab(tab, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    const content = document.getElementById('homework-content');
    const allHomework = Store.getAllHomework();

    switch (tab) {
      case 'active':
        content.innerHTML = this.renderActiveHomework(allHomework.filter(h => !h.completed));
        break;
      case 'completed':
        content.innerHTML = this.renderCompletedHomework(allHomework.filter(h => h.completed));
        break;
      case 'projects':
        content.innerHTML = this.renderProjects();
        break;
    }
  },

  renderActiveHomework(homework) {
    if (homework.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">Aktif ödev bulunmuyor</div>
          <div class="empty-state-text">Yeni ödev eklemek için + butonuna tıklayın</div>
        </div>
      `;
    }

    return `
      <div class="stagger-children">
        ${homework.map(hw => this.renderHomeworkCard(hw)).join('')}
      </div>
    `;
  },

  renderCompletedHomework(homework) {
    if (homework.length === 0) {
      return `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">Tamamlanan ödev yok</div></div>`;
    }

    return `<div class="stagger-children">${homework.map(hw => this.renderHomeworkCard(hw)).join('')}</div>`;
  },

  renderHomeworkCard(hw) {
    const group = DataHelpers.getGroupById(hw.groupId);
    const dueDate = hw.dueDate ? new Date(hw.dueDate) : null;
    const today = new Date();
    const diffDays = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null;

    let urgency = 'relaxed';
    let urgencyText = '';
    if (diffDays !== null) {
      if (diffDays < 0) { urgency = 'urgent'; urgencyText = 'Süresi geçti'; }
      else if (diffDays === 0) { urgency = 'urgent'; urgencyText = 'BUGÜN'; }
      else if (diffDays === 1) { urgency = 'urgent'; urgencyText = 'YARIN'; }
      else if (diffDays <= 3) { urgency = 'normal'; urgencyText = `${diffDays} gün`; }
      else { urgencyText = `${diffDays} gün`; }
    }

    // Teslim oranı
    const totalStudents = group ? group.students.length : 0;
    const statuses = hw.studentStatuses || {};
    const submitted = Object.values(statuses).filter(s => s.status !== 'assigned').length;
    const progress = totalStudents > 0 ? Math.round((submitted / totalStudents) * 100) : 0;

    return `
      <div class="homework-card" onclick="Router.go('homework', '${hw.id}')">
        <div class="homework-card-header">
          <div class="homework-title">${hw.title}</div>
          ${dueDate ? `<span class="homework-due ${urgency}">${urgencyText}</span>` : ''}
        </div>
        <div class="homework-group">
          ${group ? `${UI.escape(group.name)} • ${group.day}` : ''}
          ${hw.completed ? '<span style="color: var(--success);">✅ Tamamlandı</span>' : ''}
        </div>
        ${hw.description ? `<div style="font-size: var(--font-sm); color: var(--text-tertiary); margin-top: 4px;">${hw.description.substring(0, 100)}${hw.description.length > 100 ? '...' : ''}</div>` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="font-size: var(--font-xs); color: var(--text-tertiary);">Teslim: ${submitted}/${totalStudents}</span>
          <span style="font-size: var(--font-xs); font-weight: 700; color: var(--primary-light);">%${progress}</span>
        </div>
        <div class="homework-progress">
          <div class="homework-progress-bar progress-animate" style="width: ${progress}%;"></div>
        </div>
      </div>
    `;
  },

  renderProjects() {
    const projects = Store.getAllProjects();
    if (projects.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">🔬</div>
          <div class="empty-state-title">Aktif proje bulunmuyor</div>
          <div class="empty-state-text">Yeni proje eklemek için + butonuna tıklayın</div>
        </div>
      `;
    }

    return `
      <div class="stagger-children">
        ${projects.map(project => {
          const group = DataHelpers.getGroupById(project.groupId);
          const phase = BILSEM_DATA.projectPhases.find(p => p.id === project.phase);
          return `
            <div class="homework-card">
              <div class="homework-card-header">
                <div class="homework-title">${project.title}</div>
                <span class="chip" style="background: ${phase?.color}20; color: ${phase?.color}; border-color: ${phase?.color}40;">
                  ${phase?.icon} ${phase?.label}
                </span>
              </div>
              <div class="homework-group">${group?.name || ''} • ${project.studentName || ''}</div>
              ${project.description ? `<div style="font-size: var(--font-sm); color: var(--text-tertiary); margin-top: 4px;">${project.description}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  showNewModal() {
    App.showModal('📝 Yeni Ödev', `
      <div class="form-group">
        <label class="form-label">Grup Seçin</label>
        <select class="form-select" id="hw-group">
          ${BILSEM_DATA.groups.map(g => `<option value="${g.id}">${UI.escape(g.name)} — ${g.day} (${UI.escape(g.subject)})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ödev Başlığı</label>
        <input type="text" class="form-input" id="hw-title" placeholder="Örn: Harita çizimi">
      </div>
      <div class="form-group">
        <label class="form-label">Açıklama</label>
        <textarea class="form-textarea" id="hw-desc" placeholder="Ödev detayları..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Son Teslim Tarihi</label>
        <input type="date" class="form-input" id="hw-due">
      </div>
    `, `
      <button class="btn btn-primary btn-block btn-lg" onclick="HomeworkPage.createHomework()">💾 Kaydet</button>
    `);
  },

  showNewHomeworkForm(container, groupId) {
    // Direkt modal açmak yerine sayfada göster
    this.renderMain(container);
    setTimeout(() => {
      this.showNewModal();
      // Grubu seç
      const select = document.getElementById('hw-group');
      if (select) select.value = groupId;
    }, 300);
  },

  createHomework() {
    const groupId = document.getElementById('hw-group')?.value;
    const title = document.getElementById('hw-title')?.value?.trim();
    const description = document.getElementById('hw-desc')?.value?.trim();
    const dueDate = document.getElementById('hw-due')?.value;

    if (!title) {
      Toast.show('Ödev başlığı giriniz', 'warning');
      return;
    }

    Store.saveHomework({
      groupId,
      title,
      description,
      dueDate: dueDate || null,
      completed: false
    });

    App.closeModal();
    Toast.show('Ödev başarıyla oluşturuldu! 📝', 'success');

    // Sayfayı yenile
    this.renderMain(document.getElementById('page-content'));
  },

  showHomeworkDetail(container, homeworkId) {
    const hw = Store.getHomework(homeworkId);
    if (!hw) {
      container.innerHTML = '<div class="page-container"><div class="empty-state"><div class="empty-state-title">Ödev bulunamadı</div></div></div>';
      return;
    }

    const group = DataHelpers.getGroupById(hw.groupId);
    const statuses = BILSEM_DATA.homeworkStatuses;

    container.innerHTML = `
      <div class="page-container fade-in">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--space-lg);">
          <button class="btn btn-ghost btn-icon" onclick="Router.go('homework')">←</button>
          <div style="flex: 1;">
            <h1 style="font-size: var(--font-lg); font-weight: 700; margin: 0;">${hw.title}</h1>
            <div style="font-size: var(--font-sm); color: var(--text-tertiary);">${group?.name || ''} • ${group?.day || ''}</div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-ghost btn-icon" onclick="HomeworkPage.toggleComplete('${hw.id}')" title="${hw.completed ? 'Aktife Al' : 'Tamamla'}">
              ${hw.completed ? '🔄' : '✅'}
            </button>
            <button class="btn btn-ghost btn-icon" onclick="HomeworkPage.deleteHomework('${hw.id}')" title="Sil">
              🗑️
            </button>
          </div>
        </div>

        ${hw.description ? `<div class="card" style="margin-bottom: var(--space-lg);"><p style="color: var(--text-secondary); font-size: var(--font-sm);">${hw.description}</p></div>` : ''}

        ${hw.dueDate ? `
          <div class="chip" style="margin-bottom: var(--space-lg);">📅 Son Teslim: ${new Date(hw.dueDate).toLocaleDateString('tr-TR')}</div>
        ` : ''}

        <!-- Öğrenci Durumları -->
        <div class="section-header">
          <h2 class="section-title">👥 Öğrenci Durumları</h2>
        </div>
        <div class="stagger-children">
          ${group ? group.students.map((student, index) => {
            const studentStatus = hw.studentStatuses?.[student.id]?.status || 'assigned';
            const currentStatusObj = statuses.find(s => s.id === studentStatus);
            return `
              <div class="attendance-item">
                <div class="student-card-avatar" style="background: ${AttendancePage.getAvatarColor(index)}; width: 36px; height: 36px; font-size: 0.8rem;">
                  ${UI.escape(student.name.charAt(0))}
                </div>
                <div class="student-info" style="flex: 1;">
                  <div class="student-name">${UI.escape(student.name)}</div>
                  <div class="student-note" style="color: ${currentStatusObj?.color || 'var(--text-tertiary)'};">${currentStatusObj?.icon || ''} ${currentStatusObj?.label || 'Verildi'}</div>
                </div>
                <select class="form-select" style="width: auto; padding: 6px 30px 6px 10px; font-size: var(--font-xs);"
                        onchange="HomeworkPage.updateStudentStatus('${hw.id}', '${student.id}', this.value)">
                  ${statuses.map(s => `<option value="${s.id}" ${studentStatus === s.id ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}
                </select>
              </div>
            `;
          }).join('') : ''}
        </div>
      </div>
    `;
  },

  updateStudentStatus(homeworkId, studentId, status) {
    Store.updateHomeworkStudentStatus(homeworkId, studentId, status);
    Toast.show('Durum güncellendi', 'success');
  },

  toggleComplete(homeworkId) {
    const hw = Store.getHomework(homeworkId);
    if (hw) {
      hw.completed = !hw.completed;
      Store.saveHomework(hw);
      Toast.show(hw.completed ? 'Ödev tamamlandı! 🎉' : 'Ödev aktife alındı', 'success');
      this.showHomeworkDetail(document.getElementById('page-content'), homeworkId);
    }
  },

  deleteHomework(homeworkId) {
    if (confirm('Bu ödevi silmek istediğinize emin misiniz?')) {
      Store.deleteHomework(homeworkId);
      Toast.show('Ödev silindi', 'info');
      Router.go('homework');
    }
  }
};
