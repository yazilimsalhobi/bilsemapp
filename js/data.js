/**
 * Fatsa BİLSEM — Ders Programı & Öğrenci Verileri
 * PDF'den çıkarılmış ve yapılandırılmış veri modeli
 */

const BILSEM_DATA = {
  school: { name: '', department: '', teacher: '', year: '' },

  // Gün renk kodları
  dayColors: {
    'Pazartesi': { bg: '#4A90D9', gradient: 'linear-gradient(135deg, #4A90D9, #357ABD)', emoji: '🌤️' },
    'Salı':     { bg: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B, #EE5A5A)', emoji: '🔴' },
    'Çarşamba': { bg: '#FDCB6E', gradient: 'linear-gradient(135deg, #FDCB6E, #F0B429)', emoji: '🟡' },
    'Perşembe': { bg: '#6C5CE7', gradient: 'linear-gradient(135deg, #6C5CE7, #5A4BD1)', emoji: '🟣' },
    'Cuma':     { bg: '#00CEC9', gradient: 'linear-gradient(135deg, #00CEC9, #00B5B0)', emoji: '🔵' },
    'Cumartesi':{ bg: '#00B894', gradient: 'linear-gradient(135deg, #00B894, #009B7D)', emoji: '🟢' },
    'Pazar':    { bg: '#636e72', gradient: 'linear-gradient(135deg, #636e72, #4a5568)', emoji: '⚪' }
  },

  // JS Date.getDay() ile eşleştirme (0=Pazar, 1=Pazartesi, ... 6=Cumartesi)
  dayIndexMap: {
    0: 'Pazar',
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
    6: 'Cumartesi'
  },

  // Aktif ders günleri (ders olan günler)
  activeDays: [],

  // Tüm gruplar ve ders programları
  groups: [],
  // Yoklama durum seçenekleri
  attendanceStatuses: [
    { id: 'present', label: 'Geldi', icon: '✅', color: '#00B894' },
    { id: 'absent', label: 'Gelmedi', icon: '❌', color: '#FF6B6B' },
    { id: 'late', label: 'Geç Kaldı', icon: '⏰', color: '#FDCB6E' },
    { id: 'excused', label: 'İzinli', icon: '📋', color: '#74B9FF' }
  ],

  // Ödev durum seçenekleri
  homeworkStatuses: [
    { id: 'assigned', label: 'Verildi', icon: '📝', color: '#74B9FF' },
    { id: 'submitted', label: 'Teslim Edildi', icon: '📥', color: '#FDCB6E' },
    { id: 'reviewed', label: 'Kontrol Edildi', icon: '🔍', color: '#A29BFE' },
    { id: 'graded', label: 'Notlandırıldı', icon: '⭐', color: '#00B894' }
  ],

  // Proje aşamaları
  projectPhases: [
    { id: 'planning', label: 'Planlama', icon: '📋', color: '#74B9FF' },
    { id: 'research', label: 'Araştırma', icon: '🔎', color: '#A29BFE' },
    { id: 'development', label: 'Geliştirme', icon: '⚙️', color: '#FDCB6E' },
    { id: 'presentation', label: 'Sunum', icon: '🎤', color: '#00B894' },
    { id: 'completed', label: 'Tamamlandı', icon: '🏆', color: '#00CEC9' }
  ]
};

// Helper fonksiyonlar
const DataHelpers = {
  /**
   * Bugünün derslerini getir
   */
  getTodayGroups() {
    const today = new Date();
    const dayName = BILSEM_DATA.dayIndexMap[today.getDay()];
    return BILSEM_DATA.groups.filter(g => g.day === dayName);
  },

  /**
   * Belirli bir günün derslerini getir
   */
  getGroupsByDay(dayName) {
    return BILSEM_DATA.groups.filter(g => g.day === dayName);
  },

  /**
   * Grup ID ile grup getir
   */
  getGroupById(groupId) {
    return BILSEM_DATA.groups.find(g => g.id === groupId);
  },

  /**
   * Tüm öğrencileri getir (tüm gruplardan)
   */
  getAllStudents() {
    const students = [];
    BILSEM_DATA.groups.forEach(group => {
      group.students.forEach(student => {
        students.push({
          ...student,
          groupId: group.id,
          groupName: group.name,
          day: group.day,
          subject: group.subject
        });
      });
    });
    return students;
  },

  /**
   * Öğrenci ID ile öğrenci getir
   */
  getStudentById(studentId) {
    for (const group of BILSEM_DATA.groups) {
      const student = group.students.find(s => s.id === studentId);
      if (student) {
        return {
          ...student,
          groupId: group.id,
          groupName: group.name,
          day: group.day,
          subject: group.subject
        };
      }
    }
    return null;
  },

  /**
   * Şu anki aktif dersi getir
   */
  getCurrentLesson() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayGroups = this.getTodayGroups();

    for (const group of todayGroups) {
      const startMinutes = this.timeToMinutes(group.startTime);
      const endMinutes = this.timeToMinutes(group.endTime);

      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        return group;
      }
    }
    return null;
  },

  /**
   * Bir sonraki dersi getir
   */
  getNextLesson() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayGroups = this.getTodayGroups();

    // Bugün kalan dersler
    const upcoming = todayGroups
      .filter(g => this.timeToMinutes(g.startTime) > currentMinutes)
      .sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

    if (upcoming.length > 0) return { ...upcoming[0], isToday: true };

    for (let i = 1; i <= 7; i++) {
      const nextDay = BILSEM_DATA.dayIndexMap[(now.getDay() + i) % 7];
      const groups = this.getGroupsByDay(nextDay).slice().sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
      if (groups.length) return { ...groups[0], isToday: false, daysUntil: i };
    }

    return null;
  },

  /**
   * Saat string'ini dakikaya çevir (HH:MM -> minutes)
   */
  timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  },

  /**
   * Toplam öğrenci sayısı
   */
  getTotalStudentCount() {
    return BILSEM_DATA.groups.reduce((sum, g) => sum + g.students.length, 0);
  },

  /**
   * Toplam grup sayısı
   */
  getTotalGroupCount() {
    return BILSEM_DATA.groups.length;
  },

  /**
   * Günün Türkçe adını getir
   */
  getDayName(date = new Date()) {
    return BILSEM_DATA.dayIndexMap[date.getDay()];
  },

  /**
   * Tarih formatla (Türkçe)
   */
  formatDate(date = new Date()) {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  },

  /**
   * Kısa tarih formatla
   */
  formatDateShort(date = new Date()) {
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  }
};
