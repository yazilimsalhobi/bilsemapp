/**
 * Fatsa BİLSEM — Yıllık Plan Sayfası
 */

const AnnualPlanPage = {
  planData: [
    { week: '1. Hafta (Eylül)', topic: 'Tanışma, BİLSEM kültürüne uyum ve BİLSEM kurallarının tanıtımı', status: 'completed' },
    { week: '2. Hafta (Eylül)', topic: 'Coğrafyaya Giriş: Temel harita okuryazarlığı ve yön bulma becerileri', status: 'completed' },
    { week: '3. Hafta (Ekim)', topic: 'Dünya ve Güneş Sistemi: Gezegenimiz nerede?', status: 'completed' },
    { week: '4. Hafta (Ekim)', topic: 'İklim Tipleri ve Etkileri: Yaşadığımız bölgenin iklimi', status: 'active' },
    { week: '5. Hafta (Ekim)', topic: 'Doğal Afetler ve Korunma Yolları (Deprem Haftası Özel)', status: 'pending' },
    { week: '6. Hafta (Kasım)', topic: 'Türkiye’nin Coğrafi Bölgeleri: Proje tabanlı araştırma başlangıcı', status: 'pending' },
    { week: '7. Hafta (Kasım)', topic: 'Kültürel Mirasımız: Yaşadığımız şehrin tarihi ve kültürel dokusu', status: 'pending' },
    { week: '8. Hafta (Kasım)', topic: 'Ara Tatil Değerlendirmesi ve Sosyal Sorumluluk Fikirleri', status: 'pending' },
    { week: '9. Hafta (Aralık)', topic: 'Küresel Isınma ve İklim Değişikliği (TÜBİTAK Proje Fikir Geliştirme)', status: 'pending' },
    { week: '10. Hafta (Aralık)', topic: 'Sürdürülebilirlik: Geri dönüşüm ve çevre bilinci projeleri', status: 'pending' }
  ],

  render(container) {
    container.innerHTML = `
      <div class="page-container fade-in">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--space-lg);">
          <button class="btn btn-ghost btn-icon" onclick="Router.go('home')">←</button>
          <h1 class="page-title" style="margin: 0;">📅 Yıllık <span>Plan</span></h1>
        </div>

        <div class="section">
          <p style="color: var(--text-tertiary); font-size: var(--font-sm); margin-bottom: var(--space-lg);">
            2026-2027 Eğitim Öğretim Yılı Coğrafya / Sosyal Bilgiler Taslak Planı
          </p>

          <div class="stagger-children">
            ${this.planData.map((item) => {
              let icon = '⏳';
              let color = 'var(--text-tertiary)';
              let bg = 'var(--bg-card)';
              
              if (item.status === 'completed') {
                icon = '✅';
                color = 'var(--success)';
                bg = 'rgba(0, 184, 148, 0.05)';
              } else if (item.status === 'active') {
                icon = '🎯';
                color = 'var(--primary)';
                bg = 'rgba(108, 92, 231, 0.1)';
              }

              return `
                <div class="card" style="padding: 16px; margin-bottom: 12px; background: ${bg}; border-left: 3px solid ${color};">
                  <div style="display: flex; align-items: flex-start; gap: 12px;">
                    <div style="font-size: 1.5rem;">${icon}</div>
                    <div>
                      <div style="font-weight: 700; color: ${color}; margin-bottom: 4px; font-size: var(--font-sm);">${item.week}</div>
                      <div style="font-size: var(--font-base); color: var(--text-primary); line-height: 1.4;">${item.topic}</div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }
};
