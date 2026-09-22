/**
 * Fatsa BİLSEM — Supabase Kimlik Doğrulama (Auth) Modülü
 */

const Auth = {
  currentUser: null,
  _profilePromise: null,
  _fetchingUserId: null,

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
    if (session?.user) {
      await this.fetchUserProfile(session.user);
    }
    
    // Oturum değişikliklerini dinle
    window.supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange:', event, !!session);
      
      if (event === 'SIGNED_OUT') {
        // Sadece gerçek çıkış olayında null yap
        this.currentUser = null;
        if (window.App && typeof App.updateNavigationVisibility === 'function') {
          App.updateNavigationVisibility();
        }
        if (window.Router && Router._initialized) {
          Router.go('login');
        }
        return;
      }

      if (session?.user) {
        await this.fetchUserProfile(session.user);
        if (window.App && typeof App.updateNavigationVisibility === 'function') {
          App.updateNavigationVisibility();
        }
        // OAuth geri dönüşünde veya kullanıcı login sayfasındayken home'a yönlendir
        if (window.location.hash.includes('access_token=') && window.Router && Router._initialized) {
          Router.go('home');
        }
      }
      // ÖNEMLİ: session null veya boş geldiğinde (SIGNED_OUT haricinde) currentUser ASLA null yapılmaz!
    });
  },

  async fetchUserProfile(user) {
    if (!user || !user.id) {
      console.warn('[Auth] fetchUserProfile: Geçersiz user nesnesi', user);
      return;
    }

    // 1. SAVUNMACI ANINDA ATAMA:
    // Ağ sorgusu, RLS kısıtlaması veya gecikmeler sırasında Auth.isAuthenticated()
    // ASLA false dönmesin diye currentUser'ı HEMEN senkron olarak set ediyoruz.
    if (!this.currentUser || this.currentUser.id !== user.id) {
      this.currentUser = {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role || 'parent',
        studentId: user.user_metadata?.student_id || null
      };
    }

    // 2. RACE CONDITION KİLİDİ:
    // Eğer aynı kullanıcı için zaten profil sorgusu devam ediyorsa, mükerrer istek atmak yerine mevcut Promise'i bekle
    if (this._profilePromise && this._fetchingUserId === user.id) {
      return this._profilePromise;
    }

    this._fetchingUserId = user.id;
    this._profilePromise = (async () => {
      try {
        if (!window.supabaseClient) return;

        // profiles tablosundan rolü ve öğrenci ID'sini getir
        // maybeSingle() 0 satır döndüğünde hata (PGRST116) fırlatmaz, data=null döner
        const { data, error } = await window.supabaseClient
          .from('profiles')
          .select('role, student_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('[Auth] Profil getirme uyarısı:', error.message);
        }

        if (data) {
          this.currentUser = {
            id: user.id,
            email: user.email || this.currentUser.email,
            role: data.role || this.currentUser.role || 'parent',
            studentId: data.student_id !== undefined ? data.student_id : this.currentUser.studentId
          };
        } else {
          // Profil tablosunda henüz kayıt yoksa arka planda oluşturmayı dene (RLS engellerse sessizce geç)
          window.supabaseClient.from('profiles').insert([
            { id: user.id, email: user.email, role: this.currentUser?.role || 'parent' }
          ]).then(({ error: insertError }) => {
            if (insertError) {
              console.warn('[Auth] Profil insert atlandı (RLS aktif olabilir):', insertError.message);
            }
          }).catch(err => {
            console.warn('[Auth] Profil insert istisnası:', err);
          });
        }
        console.log('[Auth] currentUser set:', this.currentUser?.email, 'role:', this.currentUser?.role);
      } catch (e) {
        console.warn('[Auth] fetchUserProfile istisnası (varsayılan profil korundu):', e);
      }
    })().finally(() => {
      this._profilePromise = null;
      this._fetchingUserId = null;
    });

    return this._profilePromise;
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

    if (data?.user) {
      // Önce anında currentUser'ı garantile (asla null kalmasın)
      this.currentUser = {
        id: data.user.id,
        email: data.user.email || email,
        role: data.user.user_metadata?.role || 'parent',
        studentId: null
      };
      await this.fetchUserProfile(data.user);
    }
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
