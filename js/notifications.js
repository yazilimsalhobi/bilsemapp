/**
 * Fatsa BİLSEM — Bildirim Sistemi
 * Push notifications, ders hatırlatıcıları, WhatsApp deep link
 */

const Notifications = {
  timers: [],
  permission: 'default',

  async init() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
    this.startLessonChecker();
  },

  /**
   * Bildirim izni iste
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      Toast.show('Bu tarayıcı bildirim desteklemiyor', 'warning');
      return false;
    }

    const result = await Notification.requestPermission();
    this.permission = result;

    if (result === 'granted') {
      Toast.show('Bildirimler aktif! 🔔', 'success');
      return true;
    } else {
      Toast.show('Bildirim izni reddedildi', 'error');
      return false;
    }
  },

  /**
   * Bildirim gönder
   */
  send(title, body, options = {}) {
    if (this.permission !== 'granted') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: options.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: options.tag || 'bilsem-notification',
        vibrate: [200, 100, 200],
        ...options
      });

      notification.onclick = () => {
        window.focus();
        if (options.onClick) options.onClick();
        notification.close();
      };

      // 10 saniye sonra otomatik kapat
      setTimeout(() => notification.close(), 10000);
    } catch (e) {
      console.warn('Bildirim gönderilemedi:', e);
    }
  },

  /**
   * Ders hatırlatıcılarını başlat
   */
  startLessonChecker() {
    // Her dakika kontrol et
    setInterval(() => this.checkUpcomingLessons(), 60000);
    // İlk kontrol
    setTimeout(() => this.checkUpcomingLessons(), 5000);
  },

  /**
   * Yaklaşan dersleri kontrol et
   */
  checkUpcomingLessons() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayGroups = DataHelpers.getTodayGroups();

    todayGroups.forEach(group => {
      const lessonMinutes = DataHelpers.timeToMinutes(group.startTime);
      const diff = lessonMinutes - currentMinutes;

      // 10 dakika önce hatırlatma
      if (diff === 10) {
        this.send(
          '📚 Ders Yaklaşıyor!',
          `${group.name} - ${group.subject}\n${group.startTime} - ${group.endTime}\n${group.students.length} öğrenci`,
          {
            tag: `lesson-${group.id}-${DataHelpers.formatDateShort()}`,
            onClick: () => Router.go('schedule')
          }
        );
      }

      // Ders başlangıcında yoklama hatırlatması
      if (diff === 0) {
        this.send(
          '✅ Yoklama Zamanı!',
          `${group.name} dersi başladı.\nYoklamayı almayı unutmayın!`,
          {
            tag: `attendance-${group.id}-${DataHelpers.formatDateShort()}`,
            onClick: () => Router.go('attendance', group.id)
          }
        );
      }
    });

    // Ödev deadline kontrolü
    this.checkHomeworkDeadlines();
  },

  /**
   * Ödev deadline kontrolü
   */
  checkHomeworkDeadlines() {
    const activeHomework = Store.getActiveHomework();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    activeHomework.forEach(hw => {
      if (!hw.dueDate) return;
      const due = new Date(hw.dueDate);
      due.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        this.send(
          '⏰ Ödev Yarın Son Gün!',
          `"${hw.title}" ödevi yarın son teslim.`,
          { tag: `hw-deadline-${hw.id}` }
        );
      } else if (diffDays === 0) {
        this.send(
          '🚨 Ödev Bugün Son Gün!',
          `"${hw.title}" ödevi bugün son teslim!`,
          { tag: `hw-today-${hw.id}` }
        );
      }
    });
  },

  /**
   * WhatsApp mesajı gönder (deep link)
   */
  sendWhatsApp(phone, message) {
    if (!phone) {
      Toast.show('Telefon numarası kayıtlı değil', 'warning');
      return;
    }

    // Telefon numarasını düzenle (sadece rakamlar)
    let cleanPhone = phone.replace(/[^0-9]/g, '');

    // Türkiye formatı
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '90' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('90')) {
      cleanPhone = '90' + cleanPhone;
    }

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  },

  /**
   * Toplu WhatsApp mesajı (her veliye ayrı ayrı)
   */
  sendBulkWhatsApp(groupId, message) {
    const group = DataHelpers.getGroupById(groupId);
    if (!group) return;

    const parents = Store.getAllParentInfo();
    const phonesFound = [];

    group.students.forEach(student => {
      const parentInfo = parents[student.id];
      if (parentInfo && parentInfo.parentPhone) {
        phonesFound.push({
          studentName: student.name,
          phone: parentInfo.parentPhone
        });
      }
    });

    if (phonesFound.length === 0) {
      Toast.show('Kayıtlı veli telefonu bulunamadı', 'warning');
      return;
    }

    // İlk veliyi aç, diğerlerini listele
    this.sendWhatsApp(phonesFound[0].phone, message);

    if (phonesFound.length > 1) {
      Toast.show(`${phonesFound.length} veliye mesaj göndermek için her birini tek tek açın`, 'info');
    }
  },

  /**
   * Devamsızlık bildirim mesajı oluştur
   */
  createAbsenceMessage(studentName, groupName, date) {
    return `Sayın Veli,\n\n${studentName} öğrencimiz ${date} tarihinde ${groupName} dersine katılmamıştır.\n\nBilgilerinize sunarız.\n\nFatsa BİLSEM\nCoğrafya & Sosyal Bilgiler`;
  },

  /**
   * Genel duyuru mesajı oluştur
   */
  createAnnouncementMessage(groupName, message) {
    return `📢 Fatsa BİLSEM - ${groupName}\n\n${message}\n\nSaygılarımızla.`;
  }
};

/* ============ TOAST HELPER ============ */
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3500) {
    if (!this.container) this.init();

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};
