/**
 * Fatsa BİLSEM — Supabase Kimlik Doğrulama (Auth) Modülü
 */

const Auth = {
  currentUser: null,

  async init() {
    if (!window.supabaseClient) {
      console.warn("Supabase istemcisi bulunamadı, çevrimdışı modda başlatılıyor.");
      return;
    }

    // Google girişinden dönüldüğünde URL'de access_token olur, parse edilmesini bekle
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mevcut oturumu al
    const { data, error } = await window.supabaseClient.auth.getSession();
    
    if (error) {
      console.warn('Oturum bilgisi alınamadı:', error.message);
    }
    
    const session = data?.session;
    if (session) {
      await this.fetchUserProfile(session.user);
    }
    
    // Oturum değişikliklerini dinle
    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await this.fetchUserProfile(session.user);
      } else {
        this.currentUser = null;
      }
    });
  },

  async fetchUserProfile(user) {
    // profiles tablosundan rolü ve öğrenci ID'sini getir
    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('role, student_id')
      .eq('id', user.id)
      .single();

    if (data) {
      this.currentUser = {
        id: user.id,
        email: user.email,
        role: data.role || 'parent',
        studentId: data.student_id
      };
    } else {
      // Eğer profil yoksa (ilk defa Google ile giriş yapıldıysa vs.) varsayılan parent oluştur
      await window.supabaseClient.from('profiles').insert([
        { id: user.id, email: user.email, role: 'parent' }
      ]);
      this.currentUser = {
        id: user.id,
        email: user.email,
        role: 'parent',
        studentId: null
      };
    }
  },

  getCurrentUser() {
    return this.currentUser;
  },

  isAuthenticated() {
    return this.currentUser !== null;
  },

  hasRole(roles) {
    if (!this.currentUser) return false;
    if (Array.isArray(roles)) {
      return roles.includes(this.currentUser.role);
    }
    return this.currentUser.role === roles;
  },

  async loginWithEmail(email, password) {
    if (!window.supabaseClient) return { success: false, message: 'Bağlantı hatası: Sunucuya ulaşılamıyor.' };

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      return { success: false, message: error.message };
    }
    await this.fetchUserProfile(data.user);
    return { success: true };
  },

  async registerWithEmail(email, password, studentId = null) {
    if (!window.supabaseClient) return { success: false, message: 'Bağlantı hatası: Sunucuya ulaşılamıyor.' };

    const { data, error } = await window.supabaseClient.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      return { success: false, message: error.message };
    }

    if (data.user) {
      // Profil oluştur
      await window.supabaseClient.from('profiles').insert([
        { id: data.user.id, email: data.user.email, role: 'parent', student_id: studentId }
      ]);
      
      // Eğer email onayı gerekiyorsa session null döner
      if (!data.session) {
        return { success: true, needsEmailConfirmation: true };
      }

      await this.fetchUserProfile(data.user);
      return { success: true, needsEmailConfirmation: false };
    }
    return { success: false, message: 'Bilinmeyen bir hata oluştu.' };
  },

  async loginWithGoogle() {
    if (!window.supabaseClient) {
      Toast.show('Sunucuya bağlanılamadı, lütfen sayfayı yenileyin.', 'error');
      return;
    }
    const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
    });
    // OAuth işlemi sayfayı yönlendirir, bu yüzden hata dışında bir şey dönmesine gerek yok.
    if (error) {
      console.error(error);
      Toast.show('Google girişi başlatılamadı.', 'error');
    }
  },

  async resetPassword(email) {
    if (!window.supabaseClient) return { success: false, message: 'Sunucuya ulaşılamıyor.' };
    const { data, error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  },

  async logout() {
    await window.supabaseClient.auth.signOut();
    this.currentUser = null;
    if (typeof App !== 'undefined' && App.updateNavigationVisibility) {
      App.updateNavigationVisibility();
    }
    Router.go('login');
  }
};
