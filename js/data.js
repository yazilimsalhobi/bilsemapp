/**
 * Fatsa BİLSEM — Ders Programı & Öğrenci Verileri
 * PDF'den çıkarılmış ve yapılandırılmış veri modeli
 */

const BILSEM_DATA = {
  school: {
    name: 'Fatsa BİLSEM',
    department: 'Coğrafya & Sosyal Bilgiler',
    teacher: 'Harun Berna Mutlu',
    year: '2026-2027'
  },

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
  activeDays: ['Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],

  // Tüm gruplar ve ders programları
  groups: [
    // ===== SALI =====
    {
      id: 'byf2d',
      name: 'BYF-2 D (HI)',
      day: 'Salı',
      dayIndex: 2,
      timeSlot: 'Akşam Grubu',
      startTime: '17:55',
      endTime: '19:25',
      lessons: [
        { order: 3, start: '17:55', end: '18:35' },
        { order: 4, start: '18:45', end: '19:25' }
      ],
      subject: 'Coğrafya',
      color: '#FF6B6B',
      students: [
        { id: 's001', name: 'İNCİ KASTAN', parentName: '', parentPhone: '' },
        { id: 's002', name: 'MUSTAFA VAROL', parentName: '', parentPhone: '' },
        { id: 's003', name: 'Erdem AVCI', parentName: '', parentPhone: '' },
        { id: 's004', name: 'Ömer SAĞLAM', parentName: '', parentPhone: '' },
        { id: 's005', name: 'Karahan KOÇ', parentName: '', parentPhone: '' }
      ]
    },

    // ===== ÇARŞAMBA =====
    {
      id: 'proje1b',
      name: 'PROJE 1-B',
      day: 'Çarşamba',
      dayIndex: 3,
      timeSlot: 'Akşam Grubu',
      startTime: '16:15',
      endTime: '19:25',
      lessons: [
        { order: 1, start: '16:15', end: '16:55' },
        { order: 2, start: '17:05', end: '17:45' },
        { order: 3, start: '17:55', end: '18:35' },
        { order: 4, start: '18:45', end: '19:25' }
      ],
      subject: 'Coğrafya (Blok)',
      color: '#FDCB6E',
      students: [
        { id: 's006', name: 'EYMEN ATA KÖMÜRCÜ', parentName: '', parentPhone: '' },
        { id: 's007', name: 'AZRA BETÜL ÖZGEN', parentName: '', parentPhone: '' },
        { id: 's008', name: 'CEYLİN GUASE KAPLAN', parentName: '', parentPhone: '' }
      ]
    },

    // ===== PERŞEMBE 1 =====
    {
      id: 'oyg1bhi',
      name: 'OYG 1-BHÍ',
      day: 'Perşembe',
      dayIndex: 4,
      timeSlot: 'Akşam Grubu',
      startTime: '16:15',
      endTime: '17:45',
      lessons: [
        { order: 1, start: '16:15', end: '16:55' },
        { order: 2, start: '17:05', end: '17:45' }
      ],
      subject: 'Coğrafya',
      color: '#6C5CE7',
      students: [
        { id: 's009', name: 'Beyza GÜNGÖR', parentName: '', parentPhone: '' },
        { id: 's010', name: 'Nehir GÖZE', parentName: '', parentPhone: '' },
        { id: 's011', name: 'Alper CUNİ', parentName: '', parentPhone: '' },
        { id: 's012', name: 'Melis Alya ERGÖZ', parentName: '', parentPhone: '' }
      ]
    },

    // ===== PERŞEMBE 2 =====
    {
      id: 'byf1a',
      name: 'BYF 1-A (HI)',
      day: 'Perşembe',
      dayIndex: 4,
      timeSlot: 'Akşam Grubu',
      startTime: '17:55',
      endTime: '19:25',
      lessons: [
        { order: 3, start: '17:55', end: '18:35' },
        { order: 4, start: '18:45', end: '19:25' }
      ],
      subject: 'Sosyal Bilgiler',
      color: '#A29BFE',
      students: [
        { id: 's013', name: 'AYŞE SARE ERGÜN', parentName: '', parentPhone: '' },
        { id: 's014', name: 'AYŞEGÜL TİREKİ', parentName: '', parentPhone: '' },
        { id: 's015', name: 'ELVİN YÜSRA KARANFİL', parentName: '', parentPhone: '' },
        { id: 's016', name: 'İSMAİL DOĞU NUHOĞLU', parentName: '', parentPhone: '' },
        { id: 's017', name: 'ELIF DEFNE KAYIN', parentName: '', parentPhone: '' },
        { id: 's018', name: 'Bedirhan KÖSTEK', parentName: '', parentPhone: '' },
        { id: 's019', name: 'AZRA GÜNDÜZOĞLU', parentName: '', parentPhone: '' }
      ]
    },

    // ===== CUMA 1 =====
    {
      id: 'byf2b',
      name: 'BYF-2 B (H₁)',
      day: 'Cuma',
      dayIndex: 5,
      timeSlot: 'Akşam Grubu',
      startTime: '16:15',
      endTime: '17:45',
      lessons: [
        { order: 1, start: '16:15', end: '16:55' },
        { order: 2, start: '17:05', end: '17:45' }
      ],
      subject: 'Coğrafya',
      color: '#00CEC9',
      students: [
        { id: 's020', name: 'Elif Ecce BASTÜRK', parentName: '', parentPhone: '' },
        { id: 's021', name: 'Emir Gökalp GÖKBUDAK', parentName: '', parentPhone: '' },
        { id: 's022', name: 'Mirza ERDİK', parentName: '', parentPhone: '' },
        { id: 's023', name: 'Zeynep Hilal BAĞ', parentName: '', parentPhone: '' },
        { id: 's024', name: 'Zeynep ERGÜN', parentName: '', parentPhone: '' },
        { id: 's025', name: 'Elif Nihan EVİN', parentName: '', parentPhone: '' }
      ]
    },

    // ===== CUMA 2 =====
    {
      id: 'oyg1d',
      name: 'OYG I-D H-1',
      day: 'Cuma',
      dayIndex: 5,
      timeSlot: 'Akşam Grubu',
      startTime: '17:55',
      endTime: '19:25',
      lessons: [
        { order: 3, start: '17:55', end: '18:35' },
        { order: 4, start: '18:45', end: '19:25' }
      ],
      subject: 'Coğrafya',
      color: '#81ECEC',
      students: [
        { id: 's026', name: 'Feyza Nur YARAN', parentName: '', parentPhone: '' },
        { id: 's027', name: 'Duru KARABAYRAK', parentName: '', parentPhone: '' },
        { id: 's028', name: 'Elif Ada BAYMAK', parentName: '', parentPhone: '' },
        { id: 's029', name: 'Muhammet Efkan ÜNCE', parentName: '', parentPhone: '' },
        { id: 's030', name: 'Aybike BAHADIR', parentName: '', parentPhone: '' }
      ]
    },

    // ===== CUMARTESİ 1 =====
    {
      id: 'byf1c',
      name: 'BYF 1-C (HS)',
      day: 'Cumartesi',
      dayIndex: 6,
      timeSlot: 'Sabah Grubu',
      startTime: '09:00',
      endTime: '10:30',
      lessons: [
        { order: 1, start: '09:00', end: '09:40' },
        { order: 2, start: '09:50', end: '10:30' }
      ],
      subject: 'Sosyal Bilgiler',
      color: '#00B894',
      students: [
        { id: 's031', name: 'YAĞMUR ŞEN', parentName: '', parentPhone: '' },
        { id: 's032', name: 'DORUK GÜNGÖR', parentName: '', parentPhone: '' }
      ]
    },

    // ===== CUMARTESİ 2 =====
    {
      id: 'oyg1fhs',
      name: 'OYG 1-FHS',
      day: 'Cumartesi',
      dayIndex: 6,
      timeSlot: 'Sabah Grubu',
      startTime: '10:40',
      endTime: '12:10',
      lessons: [
        { order: 3, start: '10:40', end: '11:20' },
        { order: 4, start: '11:30', end: '12:10' }
      ],
      subject: 'Coğrafya',
      color: '#55EFC4',
      students: [
        { id: 's033', name: 'MELİH ÇAKIROĞLU', parentName: '', parentPhone: '', note: 'Z-M' },
        { id: 's034', name: 'Zümra KARABIYIK', parentName: '', parentPhone: '', note: 'Z-R' },
        { id: 's035', name: 'Eylül BİLDİK', parentName: '', parentPhone: '' },
        { id: 's036', name: 'Miraç Ulaş DİLDEN', parentName: '', parentPhone: '' },
        { id: 's037', name: 'Nehir Asya KESİM', parentName: '', parentPhone: '' }
      ]
    },

    // ===== CUMARTESİ 3 =====
    {
      id: 'oyg1ehs',
      name: 'ÖYG 1-EHS',
      day: 'Cumartesi',
      dayIndex: 6,
      timeSlot: 'Öğle Grubu',
      startTime: '12:30',
      endTime: '14:00',
      lessons: [
        { order: 5, start: '12:30', end: '13:10' },
        { order: 6, start: '13:20', end: '14:00' }
      ],
      subject: 'Coğrafya',
      color: '#00D2D3',
      students: [
        { id: 's038', name: 'Feyza GÜR', parentName: '', parentPhone: '', note: 'Korgan HS' },
        { id: 's039', name: 'ABDUSSAMET AKKİRAZ', parentName: '', parentPhone: '', note: 'Korgan' },
        { id: 's040', name: 'HASAN ATA BEY', parentName: '', parentPhone: '', note: 'Korgan HS' },
        { id: 's041', name: 'NİSA ALDAV', parentName: '', parentPhone: '', note: 'Korgan HS' },
        { id: 's042', name: 'YİĞİT ALP DEMİR', parentName: '', parentPhone: '', note: 'Aybastı' },
        { id: 's043', name: 'BUĞRA İZZET ERDEM', parentName: '', parentPhone: '', note: 'Aybastı' }
      ]
    },

    // ===== CUMARTESİ 4 =====
    {
      id: 'byf2f',
      name: 'BYF-2 F (HS)',
      day: 'Cumartesi',
      dayIndex: 6,
      timeSlot: 'Öğle Grubu',
      startTime: '14:10',
      endTime: '15:40',
      lessons: [
        { order: 7, start: '14:10', end: '14:50' },
        { order: 8, start: '15:00', end: '15:40' }
      ],
      subject: 'Coğrafya',
      color: '#1DD1A1',
      students: [
        { id: 's044', name: 'Salih Efe BOZKURT', parentName: '', parentPhone: '' },
        { id: 's045', name: 'Asive Nisa AKÇAY', parentName: '', parentPhone: '' },
        { id: 's046', name: 'Alya KALAYCI', parentName: '', parentPhone: '' },
        { id: 's047', name: 'Muhammed Yavuz ANAYOL', parentName: '', parentPhone: '' },
        { id: 's048', name: 'Yusuf Yiğit Bozkurt ÖLMEZ', parentName: '', parentPhone: '' },
        { id: 's049', name: 'Caner DALAR', parentName: '', parentPhone: '' },
        { id: 's050', name: 'Ali Sadi ÖNAL', parentName: '', parentPhone: '' },
        { id: 's051', name: 'Seda TOPRAKÇI', parentName: '', parentPhone: '' },
        { id: 's052', name: 'Zeynep Gökçe KÜÇÜK', parentName: '', parentPhone: '' }
      ]
    }
  ],

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

    // Sonraki günlerin dersleri
    const dayOrder = ['Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const todayName = BILSEM_DATA.dayIndexMap[now.getDay()];
    const todayIdx = dayOrder.indexOf(todayName);

    for (let i = 1; i <= 7; i++) {
      const nextIdx = (todayIdx + i) % dayOrder.length;
      const nextDay = dayOrder[nextIdx];
      const groups = this.getGroupsByDay(nextDay);
      if (groups.length > 0) {
        const sorted = groups.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
        return { ...sorted[0], isToday: false, daysUntil: i };
      }
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
