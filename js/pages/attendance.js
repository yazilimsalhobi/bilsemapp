/**
 * Fatsa BİLSEM — Yoklama Sayfası
 */

const AttendancePage = {
  currentGroupId: null,
  currentDate: null,
  records: {},
  currentLessonId: null,
  dirty: false,

  render(container, params = []) {
    this.owner=Store.userId; this.currentLessonId=null; this.dirty=false;
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
    const progress=Store.getLessonAttendanceProgress(group.id,this.currentDate);
    const dayColor = BILSEM_DATA.dayColors[group.day];

    return `
      <div class="group-card" onclick="Router.go('attendance', '${group.id}')">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 3px; background: ${group.color};"></div>
        <div class="group-card-header">
          <div class="group-card-info">
            <div class="group-card-name" style="display: flex; align-items: center; gap: 8px;">
              ${UI.escape(group.name)}
              ${progress.total ? `<span class="chip chip-sm">${progress.completed}/${progress.total} ders</span>` : attendance ? '<span class="chip chip-sm" style="background: rgba(0,184,148,0.15); color: var(--success); border-color: var(--success);">✅ Alındı</span>' : ''}
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
    const lessonMode=!!group.mebbis && group.lessons?.length>0 && group.lessons.every(l=>l.id);
    if(lessonMode && !group.lessons.some(l=>l.id===this.currentLessonId)) this.currentLessonId=group.lessons[0].id;
    if(!lessonMode) this.currentLessonId=null;
    const existing = lessonMode ? Store.getLessonAttendance(groupId,this.currentDate,this.currentLessonId) : Store.getAttendance(groupId, this.currentDate);
    this.dirty=false;
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

      <div class="card" style="padding:12px;margin-bottom:16px">
        <label class="form-label" for="attendance-date">Yoklama tarihi</label>
        <input class="form-input" type="date" id="attendance-date" value="${Store.attendanceDate(this.currentDate)}" onchange="AttendancePage.changeContext(this.value,null)">
        ${lessonMode ? `<label class="form-label" for="attendance-lesson">Ders saati</label>
        <select class="form-select" id="attendance-lesson" onchange="AttendancePage.changeContext(null,this.value)">${group.lessons.map(l=>`<option value="${UI.escape(l.id)}" ${l.id===this.currentLessonId?'selected':''}>${UI.escape(l.period)} · ${l.order}. ders · ${l.start}–${l.end}</option>`).join('')}</select>
        <p>Her dersin yoklaması ayrı kaydedilir. Eski günlük kayıtlar derslere otomatik kopyalanmaz.</p>
        ${BILSEM_DATA.dayIndexMap[new Date(`${Store.attendanceDate(this.currentDate)}T12:00:00`).getDay()]!==group.day?`<p role="alert">Bu grubun ders günü ${UI.escape(group.day)}. Kaydetmek için uygun tarihi seçin.</p>`:''}
        <button class="btn btn-primary btn-block" onclick="AttendancePage.sendToMebbis()">MEBBİS’e işle</button>
        <button class="btn btn-secondary" onclick="AttendancePage.exportDraft()">Bu tarihin aktarım taslağını indir</button>`:''}
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
        <button class="btn btn-primary btn-lg btn-block" onclick="${lessonMode ? 'AttendancePage.sendToMebbis()' : 'AttendancePage.save()'}" id="save-attendance-btn" style="white-space:normal">
          ${lessonMode ? 'Yoklamayı kaydet ve MEBBİS’e işle' : '💾 Uygulamaya kaydet'}
        </button>
        ${lessonMode ? '<button class="btn btn-secondary btn-block" id="save-local-attendance-btn" onclick="AttendancePage.save()" style="margin-top:8px">Yalnızca uygulamaya kaydet</button>' : ''}
      </div>
      ` : ''}
    `;
  },

  changeContext(date, lessonId) {
    if(this.dirty && !window.confirm('Kaydedilmemiş yoklama değişiklikleri silinecek. Devam edilsin mi?')) {
      document.getElementById('attendance-date').value=Store.attendanceDate(this.currentDate);
      const select=document.getElementById('attendance-lesson'); if(select) select.value=this.currentLessonId;
      return;
    }
    if(date) {
      const iso=Store.attendanceDate(date); if(!iso) return;
      this.currentDate=iso.split('-').reverse().join('.');
    }
    if(lessonId) this.currentLessonId=lessonId;
    Router.pageContainer.innerHTML=`<div class="page-container"><h1 class="page-title">✅ Yoklama</h1>${this.renderGroupAttendance(this.currentGroupId)}</div>`;
  },
  sendToMebbis() {
    if(Store.userId!==this.owner || Auth.getCurrentUser()?.role==='parent') return;
    try {
      if(this.dirty && this.currentLessonId) {
        const records=Object.entries(this.records).map(([studentId,status])=>({studentId,status}));
        if(!records.length) {Toast.show('Önce işlenecek öğrencileri işaretleyin.','warning');return;}
        if(!Store.saveLessonAttendance(this.currentGroupId,this.currentDate,this.currentLessonId,records)) throw new Error('Seçimler cihaza kaydedilemedi.');
        this.dirty=false;
      }
      const draft=Store.lessonTransferDraft(this.currentDate);
      const group=DataHelpers.getGroupById(this.currentGroupId),lesson=group?.lessons.find(l=>l.id===this.currentLessonId);
      const rows=draft.rows.filter(r=>r.status==='absent' && r.institution===group?.mebbis?.institution && r.branch===group.mebbis.branch && r.subject===group.mebbis.subject && r.period===lesson?.period && r.lessonOrder===lesson.order);
      if(!rows.length) {Toast.show('Bu derste aktarılabilir Gelmedi kaydı yok. Öğrenci seçimini ve MEBBİS eşleştirmesini kontrol edin.','warning');return;}
      const selected={...draft,rows,blocked:[]};
      if(!NativeTransfer.enqueue(selected)) NativeTransfer.open(this.currentDate,selected);
    } catch(error) {Toast.show(error.message,'warning');}
  },
  exportDraft() {
    if(Store.userId!==this.owner || Auth.getCurrentUser()?.role==='parent') return;
    const draft=Store.lessonTransferDraft(this.currentDate);
    if(!draft.rows.length && !draft.blocked.length) {Toast.show('Bu tarihte kayıtlı ders yoklaması yok.', 'warning');return;}
    App.showModal('BİLSEM aktarım taslağı', `<p>${draft.date}: ${draft.rows.length} satır hazır, ${draft.blocked.length} satır resmî eşleştirme gerektiriyor.</p><p>Bu dosya BİLSEM’e gönderilmedi. İşaretlenmeyen öğrenciler dahil edilmez; bu dosya günün yoklamasının tamamlandığı anlamına gelmez. Geç ve izinli durumları otomatik çevrilmez.</p><button class="btn btn-primary" id="download-lesson-draft">JSON indir</button>`);
    document.getElementById('download-lesson-draft').onclick=()=>{
      const url=URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download=`bilsem-yoklama-taslak-${draft.date}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };
  },
  toggleStatus(studentId, status) {
    this.dirty=true;
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
    this.dirty=true;
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

  async save() {
    if (!this.currentGroupId || Store.userId!==this.owner || Auth.getCurrentUser()?.role==='parent') return;

    const group = DataHelpers.getGroupById(this.currentGroupId);
    if (!group) return;

    // Eksik yoklama kontrolü
    const unmarked = group.students.filter(s => !this.records[s.id]);
    if (unmarked.length > 0) {
      Toast.show(`${unmarked.length} öğrenci işaretlenmedi!`, 'warning');
      if(this.currentLessonId) return; // Imported lesson registers must be complete.
    }

    const records = Object.entries(this.records).map(([studentId, status]) => ({
      studentId,
      status
    }));

    try {
      const saved=this.currentLessonId ? Store.saveLessonAttendance(this.currentGroupId,this.currentDate,this.currentLessonId,records) : await Store.saveAttendance(this.currentGroupId, this.currentDate, records);
      if(!saved) throw new Error('Yoklama kaydedilemedi. Cihaz depolamasını kontrol edin.');
      this.dirty=false;
    } catch(error) {Toast.show(error.message,'error');return;}

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
    const effective = Store.getGroupAttendanceHistory(groupId);
    const hiddenLegacy=Object.values(Store._get(Store.KEYS.ATTENDANCE) || {}).filter(e=>e.groupId===groupId && effective.some(r=>r.lesson && Store.attendanceDate(r.date)===Store.attendanceDate(e.date)));
    const history=[...effective,...hiddenLegacy].sort((a,b)=>Store.attendanceDate(b.date).localeCompare(Store.attendanceDate(a.date)));
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
                  <div style="font-weight: 600;">${UI.escape(entry.date)} · ${entry.lesson ? `${UI.escape(entry.lesson.period)} ${entry.lesson.order}. ders` : 'Eski günlük kayıt'}</div>
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
    const colors = ['#2563EB', '#0D9488', '#F59E0B', '#10B981', '#0284C7', '#EC4899', '#3B82F6', '#14B8A6'];
    return colors[index % colors.length];
  }
};
