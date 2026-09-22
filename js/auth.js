/**
 * Fatsa BİLSEM — Kimlik Doğrulama (Auth) Modülü
 */

const Auth = {
  KEYS: {
    SESSION: 'bilsem_session'
  },

  getCurrentUser() {
    try {
      const session = localStorage.getItem(this.KEYS.SESSION);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  },

  loginAdmin(username, password) {
    if (username === 'admin' && password === 'admin123') {
      const user = { role: 'admin', name: 'İdareci' };
      localStorage.setItem(this.KEYS.SESSION, JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, message: 'Geçersiz kullanıcı adı veya şifre.' };
  },

  loginTeacher(username, password) {
    if (username === 'ogretmen' && password === 'ogretmen123') {
      const user = { role: 'teacher', name: 'Öğretmen' };
      localStorage.setItem(this.KEYS.SESSION, JSON.stringify(user));
      return { success: true, user };
    }
    return { success: false, message: 'Geçersiz kullanıcı adı veya şifre.' };
  },

  loginParent(studentId, parentPhone) {
    const student = DataHelpers.getStudentById(studentId);
    if (!student) {
      return { success: false, message: 'Bu numaraya ait öğrenci bulunamadı. (İpucu: s001 - s052 arası deneyin)' };
    }

    const parentInfo = Store.getParentInfo(studentId);
    if (parentInfo && parentInfo.parentPhone && parentPhone && parentPhone !== parentInfo.parentPhone) {
      return { success: false, message: 'Telefon numarası sistemdeki ile eşleşmiyor.' };
    }

    const user = { role: 'parent', name: 'Veli', studentId: student.id, studentName: student.name };
    localStorage.setItem(this.KEYS.SESSION, JSON.stringify(user));
    return { success: true, user };
  },

  logout() {
    localStorage.removeItem(this.KEYS.SESSION);
    if (typeof App !== 'undefined' && App.updateNavigationVisibility) {
      App.updateNavigationVisibility();
    }
    Router.go('login');
  },

  isAuthenticated() {
    return this.getCurrentUser() !== null;
  },

  hasRole(roles) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  }
};
