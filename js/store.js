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
    STUDENT_NOTES: 'bilsem_student_notes'
  },

  // ==================== SUPABASE SENKRONİZASYONU ====================

  async loadAllFromSupabase() {
    if (!window.supabaseClient) {
      console.warn("Supabase bağlantısı yok, yerel verilerle devam ediliyor.");
      return;
    }

    console.log("Supabase verileri yükleniyor...");
    const { data: groups, error: gError } = await window.supabaseClient.from('groups').select('*');
    
    if (!gError && groups && groups.length === 0) {
      // Veritabanı boş, başlangıç verilerini aktar (Seed)
      console.log("Veritabanı boş, ilk veriler gönderiliyor...");
      for (const group of BILSEM_DATA.groups) {
        await window.supabaseClient.from('groups').insert({
          id: group.id,
          name: group.name,
          day: group.day,
          day_index: group.dayIndex,
          start_time: group.startTime,
          end_time: group.endTime,
          time_slot: group.timeSlot,
          subject: group.subject,
          color: group.color
        });
        
        const studentsToInsert = group.students.map(s => ({
          id: s.id,
          group_id: group.id,
          name: s.name,
          parent_name: s.parentName,
          parent_phone: s.parentPhone
        }));
        
        if (studentsToInsert.length > 0) {
          await window.supabaseClient.from('students').insert(studentsToInsert);
        }
      }
      return; // İlk yüklemede mevcut BILSEM_DATA'yı kullan
    }

    if (groups && groups.length > 0) {
      const { data: students } = await window.supabaseClient.from('students').select('*');
      
      // BILSEM_DATA'yı buluttaki verilerle güncelle
      BILSEM_DATA.groups = groups.map(g => ({
        id: g.id,
        name: g.name,
        day: g.day,
        dayIndex: g.day_index,
        startTime: g.start_time,
        endTime: g.end_time,
        timeSlot: g.time_slot,
        subject: g.subject,
        color: g.color,
        students: students ? students.filter(s => s.group_id === g.id).map(s => ({
          id: s.id,
          name: s.name,
          parentName: s.parent_name || '',
          parentPhone: s.parent_phone || ''
        })) : []
      }));
    }

    // Yoklamaları buluttan çek ve localStorage'ı güncelle (Senkron UI için)
    const { data: attendanceData } = await window.supabaseClient.from('attendance').select('*');
    if (attendanceData) {
      const allAtt = {};
      attendanceData.forEach(a => {
        const key = `${a.group_id}_${a.date}`;
        if (!allAtt[key]) allAtt[key] = { groupId: a.group_id, date: a.date, records: [] };
        allAtt[key].records.push({ studentId: a.student_id, status: a.status });
      });
      this._set(this.KEYS.ATTENDANCE, allAtt);
    }
  },

  // ==================== GENEL CRUD ====================

  _get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Store._get(${key}) hatası:`, e);
      return null;
    }
  },

  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
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

    // Arka planda Supabase'e gönder
    try {
      // Önce bu günün kayıtlarını sil
      await window.supabaseClient.from('attendance').delete().match({ group_id: groupId, date: date });
      
      // Yeni kayıtları ekle
      const inserts = records.map(r => ({
        group_id: groupId,
        student_id: r.studentId,
        date: date,
        status: r.status
      }));
      if (inserts.length > 0) {
        await window.supabaseClient.from('attendance').insert(inserts);
      }
    } catch (e) {
      console.error("Supabase yoklama kayıt hatası", e);
    }
    
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
    return this._set(this.KEYS.SETTINGS, settings);
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
    return true;
  },

  /**
   * Tüm verileri sil
   */
  clearAll() {
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
  }
};
