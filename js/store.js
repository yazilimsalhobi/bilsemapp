/**
 * Fatsa BİLSEM — Veri Yönetim Katmanı (Store)
 * localStorage tabanlı kalıcı veri depolama
 */

const Store = {
  KEYS: {
    ATTENDANCE: 'bilsem_attendance',
    HOMEWORK: 'bilsem_homework',
    PROJECTS: 'bilsem_projects',
    PARENTS: 'bilsem_parents',
    SETTINGS: 'bilsem_settings',
    NOTES: 'bilsem_notes',
    TODOS: 'bilsem_todos',
    STUDENT_NOTES: 'bilsem_student_notes',
    ANNUAL_PLANS: 'bilsem_annual_plans'
  },

  // ==================== SUPABASE SENKRONİZASYONU ====================

  userId: null,
  ready: false,
  _loading: null,
  _syncTimer: null,
  _writeQueue: Promise.resolve(),
  _revision: 0,
  _generation: 0,
  syncError: '',

  storageKey(key, userId = this.userId) { return userId ? 'bilsem_user:' + userId + ':' + key : null; },
  resetUser() {
    this._generation++;
    clearTimeout(this._syncTimer);
    this.userId = null;
    this.ready = false;
    this._loading = null;
    this.syncError = '';
    this.applyWorkspace();
  },
  applyWorkspace() {
    BILSEM_DATA.school = this.getSetting('schoolInfo', { name: '', teacher: '', department: '', year: '' });
    BILSEM_DATA.groups = this.getSetting('customGroups', []);
    BILSEM_DATA.activeDays = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].filter(day => BILSEM_DATA.groups.some(g => g.day === day));
  },
  async loadAllFromSupabase() {
    const id = typeof Auth !== 'undefined' ? Auth.getCurrentUser()?.id : null;
    if (!id) { this.resetUser(); return; }
    if (this.userId === id && this.ready) return;
    if (this.userId === id && this._loading) return this._loading;
    this.resetUser();
    this.userId = id;
    this.applyWorkspace();
    const revision = this._revision;
    const generation = this._generation;
    this._loading = (async () => {
      try {
        if (!window.supabaseClient) throw new Error('İnternet bağlantısı yok.');
        const { data, error } = await window.supabaseClient.from('user_workspaces').select('payload').eq('user_id', id).maybeSingle();
        if (error) throw error;
        if (this.userId !== id || this._generation !== generation) return;
        // Offline edits are never overwritten by a stale cloud response.
        if (data && !localStorage.getItem(this.storageKey('dirty')) && revision === this._revision) {
          for (const key of Object.values(this.KEYS)) {
            if (data.payload[key] !== undefined) localStorage.setItem(this.storageKey(key), JSON.stringify(data.payload[key]));
            else localStorage.removeItem(this.storageKey(key));
          }
        }
      } catch (error) {
        if (this.userId === id && this._generation === generation) this.syncError = 'Bulut bağlantısı kurulamadı. Bu hesaba ait cihaz kayıtları kullanılıyor.';
        console.warn('[Store] Workspace load:', error.message);
      } finally {
        if (this.userId === id && this._generation === generation) {
          this.ready = true;
          this._loading = null;
          this.applyWorkspace();
          if (!this.syncError && localStorage.getItem(this.storageKey('dirty'))) this.scheduleSync();
        }
      }
    })();
    return this._loading;
  },
  scheduleSync() {
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this.syncNow(), 600);
  },
  async syncNow() {
    const id = this.userId;
    if (!id || !window.supabaseClient) return false;
    const revision = this._revision;
    const payload = Object.fromEntries(Object.values(this.KEYS).map(key => [key, this._get(key)]));
    const write = async () => {
      if (this.userId !== id) return false;
      try {
        const { error } = await window.supabaseClient.from('user_workspaces').upsert({ user_id: id, payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) throw error;
        if (this.userId === id && revision === this._revision) localStorage.removeItem(this.storageKey('dirty'));
        if (this.userId === id) this.syncError = '';
        return true;
      } catch (error) {
        if (this.userId === id) this.syncError = 'Veriler bu cihazda kaydedildi; bulut kaydı bekliyor. Ayarlardan yeniden deneyebilirsiniz.';
        console.warn('[Store] Workspace save:', error.message);
        return false;
      }
    };
    this._writeQueue = this._writeQueue.then(write, write);
    return this._writeQueue;
  },

  // ==================== GENEL CRUD ====================

  _get(key) {
    try {
      if (!this.userId) return null;
      const data = localStorage.getItem(this.storageKey(key));
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Store._get(${key}) hatası:`, e);
      return null;
    }
  },

  _set(key, value) {
    try {
      if (!this.userId) return false;
      localStorage.setItem(this.storageKey(key), JSON.stringify(value));
      localStorage.setItem(this.storageKey('dirty'), '1');
      this._revision++;
      this.scheduleSync();
      return true;
    } catch (e) {
      console.error(`Store._set(${key}) hatası:`, e);
      return false;
    }
  },

  // ==================== YOKLAMA ====================

  /**
   * Yoklama kaydet
   * @param {string} groupId - Grup ID
   * @param {string} date - Tarih (YYYY-MM-DD)
   * @param {Array} records - [{studentId, status}]
   */
  async saveAttendance(groupId, date, records) {
    const all = this._get(this.KEYS.ATTENDANCE) || {};
    const key = `${groupId}_${date}`;
    all[key] = {
      groupId,
      date,
      records,
      savedAt: new Date().toISOString()
    };
    
    // UI için hızlıca LocalStorage'a kaydet
    this._set(this.KEYS.ATTENDANCE, all);

    return true;
  },

  /**
   * Belirli bir grubun belirli tarihteki yoklamasını getir
   */
  getAttendance(groupId, date) {
    const all = this._get(this.KEYS.ATTENDANCE) || {};
    return all[`${groupId}_${date}`] || null;
  },

  /**
   * Bir öğrencinin tüm yoklama kayıtlarını getir
   */
  getStudentAttendance(studentId) {
    const all = this._get(this.KEYS.ATTENDANCE) || {};
    const records = [];
    Object.values(all).forEach(entry => {
      const studentRecord = entry.records.find(r => r.studentId === studentId);
      if (studentRecord) {
        records.push({
          date: entry.date,
          groupId: entry.groupId,
          status: studentRecord.status
        });
      }
    });
    return records.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Bir grubun tüm yoklama kayıtlarını getir
   */
  getGroupAttendanceHistory(groupId) {
    const all = this._get(this.KEYS.ATTENDANCE) || {};
    return Object.values(all)
      .filter(entry => entry.groupId === groupId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Devamsızlık istatistikleri
   */
  getAttendanceStats(groupId) {
    const history = this.getGroupAttendanceHistory(groupId);
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return null;

    const stats = {};
    group.students.forEach(student => {
      stats[student.id] = {
        name: student.name,
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        rate: 0
      };
    });

    history.forEach(entry => {
      entry.records.forEach(record => {
        if (stats[record.studentId]) {
          stats[record.studentId].total++;
          stats[record.studentId][record.status]++;
        }
      });
    });

    // Devam oranı hesapla
    Object.values(stats).forEach(s => {
      if (s.total > 0) {
        s.rate = Math.round(((s.present + s.late) / s.total) * 100);
      }
    });

    return stats;
  },

  // ==================== ÖDEVLER ====================

  /**
   * Ödev kaydet
   */
  saveHomework(homework) {
    const all = this._get(this.KEYS.HOMEWORK) || [];
    if (homework.id) {
      // Güncelleme
      const idx = all.findIndex(h => h.id === homework.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...homework, updatedAt: new Date().toISOString() };
      }
    } else {
      // Yeni
      homework.id = 'hw_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      homework.createdAt = new Date().toISOString();
      homework.studentStatuses = homework.studentStatuses || {};
      all.push(homework);
    }
    this._set(this.KEYS.HOMEWORK, all);
    return homework;
  },

  /**
   * Ödev getir
   */
  getHomework(homeworkId) {
    const all = this._get(this.KEYS.HOMEWORK) || [];
    return all.find(h => h.id === homeworkId) || null;
  },

  /**
   * Grubun ödevlerini getir
   */
  getGroupHomework(groupId) {
    const all = this._get(this.KEYS.HOMEWORK) || [];
    return all
      .filter(h => h.groupId === groupId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Tüm aktif ödevleri getir
   */
  getActiveHomework() {
    const all = this._get(this.KEYS.HOMEWORK) || [];
    return all
      .filter(h => !h.completed)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  },

  /**
   * Tüm ödevleri getir
   */
  getAllHomework() {
    return this._get(this.KEYS.HOMEWORK) || [];
  },

  /**
   * Ödev sil
   */
  deleteHomework(homeworkId) {
    const all = this._get(this.KEYS.HOMEWORK) || [];
    const filtered = all.filter(h => h.id !== homeworkId);
    return this._set(this.KEYS.HOMEWORK, filtered);
  },

  /**
   * Öğrencinin ödev durumunu güncelle
   */
  updateHomeworkStudentStatus(homeworkId, studentId, status) {
    const all = this._get(this.KEYS.HOMEWORK) || [];
    const hw = all.find(h => h.id === homeworkId);
    if (hw) {
      if (!hw.studentStatuses) hw.studentStatuses = {};
      hw.studentStatuses[studentId] = {
        status,
        updatedAt: new Date().toISOString()
      };
      this._set(this.KEYS.HOMEWORK, all);
    }
    return hw;
  },

  // ==================== PROJELER ====================

  saveProject(project) {
    const all = this._get(this.KEYS.PROJECTS) || [];
    if (project.id) {
      const idx = all.findIndex(p => p.id === project.id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...project, updatedAt: new Date().toISOString() };
      }
    } else {
      project.id = 'prj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      project.createdAt = new Date().toISOString();
      project.phase = project.phase || 'planning';
      all.push(project);
    }
    this._set(this.KEYS.PROJECTS, all);
    return project;
  },

  getGroupProjects(groupId) {
    const all = this._get(this.KEYS.PROJECTS) || [];
    return all.filter(p => p.groupId === groupId);
  },

  getAllProjects() {
    return this._get(this.KEYS.PROJECTS) || [];
  },

  deleteProject(projectId) {
    const all = this._get(this.KEYS.PROJECTS) || [];
    return this._set(this.KEYS.PROJECTS, all.filter(p => p.id !== projectId));
  },

  // ==================== VELİ BİLGİLERİ ====================

  /**
   * Veli bilgisi kaydet/güncelle
   */
  saveParentInfo(studentId, parentName, parentPhone) {
    const all = this._get(this.KEYS.PARENTS) || {};
    all[studentId] = { parentName, parentPhone, updatedAt: new Date().toISOString() };
    return this._set(this.KEYS.PARENTS, all);
  },

  /**
   * Veli bilgisi getir
   */
  getParentInfo(studentId) {
    const all = this._get(this.KEYS.PARENTS) || {};
    return all[studentId] || null;
  },

  /**
   * Tüm veli bilgilerini getir
   */
  getAllParentInfo() {
    return this._get(this.KEYS.PARENTS) || {};
  },

  // ==================== ÖĞRENCİ ÖZEL DURUM ====================

  saveStudentNote(studentId, note) {
    const all = this._get(this.KEYS.STUDENT_NOTES) || {};
    all[studentId] = { note, updatedAt: new Date().toISOString() };
    return this._set(this.KEYS.STUDENT_NOTES, all);
  },

  getStudentNote(studentId) {
    const all = this._get(this.KEYS.STUDENT_NOTES) || {};
    return all[studentId] || null;
  },

  // ==================== NOTLAR ====================

  saveNote(groupId, date, note) {
    const all = this._get(this.KEYS.NOTES) || {};
    const key = `${groupId}_${date}`;
    all[key] = { note, savedAt: new Date().toISOString() };
    return this._set(this.KEYS.NOTES, all);
  },

  getNote(groupId, date) {
    const all = this._get(this.KEYS.NOTES) || {};
    return all[`${groupId}_${date}`] || null;
  },

  // ==================== TO-DO (HATIRLATMALAR) ====================

  getTodos() {
    return this._get(this.KEYS.TODOS) || [];
  },

  saveTodo(text) {
    const all = this.getTodos();
    const todo = {
      id: 'todo_' + Date.now(),
      text,
      completed: false,
      createdAt: new Date().toISOString()
    };
    all.push(todo);
    this._set(this.KEYS.TODOS, all);
    return todo;
  },

  toggleTodo(id) {
    const all = this.getTodos();
    const todo = all.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      this._set(this.KEYS.TODOS, all);
    }
    return todo;
  },

  deleteTodo(id) {
    const all = this.getTodos();
    const filtered = all.filter(t => t.id !== id);
    this._set(this.KEYS.TODOS, filtered);
    return true;
  },

  // ==================== AYARLAR ====================

  getSetting(key, defaultValue = null) {
    const settings = this._get(this.KEYS.SETTINGS) || {};
    return settings[key] !== undefined ? settings[key] : defaultValue;
  },

  setSetting(key, value) {
    const settings = this._get(this.KEYS.SETTINGS) || {};
    settings[key] = value;
    const saved = this._set(this.KEYS.SETTINGS, settings);
    if (saved && ['customGroups', 'schoolInfo'].includes(key)) this.applyWorkspace();
    return saved;
  },

  // ==================== YARDIMCI ====================

  /**
   * Genel istatistikleri getir
   */
  getOverallStats() {
    const allAttendance = this._get(this.KEYS.ATTENDANCE) || {};
    const allHomework = this._get(this.KEYS.HOMEWORK) || [];

    let totalSessions = Object.keys(allAttendance).length;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalRecords = 0;

    Object.values(allAttendance).forEach(entry => {
      entry.records.forEach(r => {
        totalRecords++;
        if (r.status === 'present') totalPresent++;
        if (r.status === 'absent') totalAbsent++;
      });
    });

    const activeHomework = allHomework.filter(h => !h.completed).length;
    const completedHomework = allHomework.filter(h => h.completed).length;

    return {
      totalSessions,
      totalRecords,
      totalPresent,
      totalAbsent,
      attendanceRate: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0,
      activeHomework,
      completedHomework,
      totalHomework: allHomework.length
    };
  },

  /**
   * Tüm verileri dışa aktar (JSON)
   */
  exportAll() {
    return {
      attendance: this._get(this.KEYS.ATTENDANCE),
      homework: this._get(this.KEYS.HOMEWORK),
      projects: this._get(this.KEYS.PROJECTS),
      parents: this._get(this.KEYS.PARENTS),
      settings: this._get(this.KEYS.SETTINGS),
      notes: this._get(this.KEYS.NOTES),
      annualPlans: this._get(this.KEYS.ANNUAL_PLANS),
      todos: this._get(this.KEYS.TODOS),
      studentNotes: this._get(this.KEYS.STUDENT_NOTES),
      exportDate: new Date().toISOString()
    };
  },

  /**
   * Verileri içe aktar
   */
  importAll(data) {
    if (data.attendance) this._set(this.KEYS.ATTENDANCE, data.attendance);
    if (data.homework) this._set(this.KEYS.HOMEWORK, data.homework);
    if (data.projects) this._set(this.KEYS.PROJECTS, data.projects);
    if (data.parents) this._set(this.KEYS.PARENTS, data.parents);
    if (data.settings) this._set(this.KEYS.SETTINGS, data.settings);
    if (data.notes) this._set(this.KEYS.NOTES, data.notes);
    if (data.annualPlans) this._set(this.KEYS.ANNUAL_PLANS, data.annualPlans);
    if (data.todos) this._set(this.KEYS.TODOS, data.todos);
    if (data.studentNotes) this._set(this.KEYS.STUDENT_NOTES, data.studentNotes);
    this.applyWorkspace();
    return true;
  },

  /**
   * Tüm verileri sil
   */
  clearAll() {
    if (!this.userId) return;
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(this.storageKey(key)));
    localStorage.setItem(this.storageKey('dirty'), '1');
    this._revision++;
    this.applyWorkspace();
    this.scheduleSync();
  }
};
