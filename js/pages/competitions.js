/**
 * Fatsa BİLSEM — Yarışmalar ve Organizasyonlar Sayfası
 */

const CompetitionsPage = {
  competitions: [
    { title: 'TÜBİTAK 2204-B Ortaokul Öğrencileri Araştırma Projeleri', date: 'Ekim - Aralık 2026', type: 'Proje Yarışması', desc: 'Danışman öğretmen eşliğinde öğrencilerin coğrafya, tarih veya sosyal bilimler alanında proje üretmesi.', link: 'https://tubitak.gov.tr' },
    { title: 'TEKNOFEST Eğitim Teknolojileri Yarışması', date: 'Ocak 2027 Başvuruları', type: 'Teknoloji', desc: 'Sosyal bilimler ve eğitim teknolojileri alanlarında yenilikçi proje fikirleri.', link: 'https://teknofest.org' },
    { title: 'BİLSEM İçi Coğrafya Bilgi Yarışması', date: 'Mayıs 2027', type: 'Kurum İçi Etkinlik', desc: 'Öğrencilerin harita okuma ve genel kültür bilgilerini ölçecekleri kurum içi mini bilgi yarışması.', link: '#' }
  ],

  render(container) {
    container.innerHTML = `
      <div class="page-container fade-in">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--space-lg);">
          <button class="btn btn-ghost btn-icon" onclick="Router.go('home')">←</button>
          <h1 class="page-title" style="margin: 0;">🏆 <span>Yarışmalar</span></h1>
        </div>

        <div class="section">
          <p style="color: var(--text-tertiary); font-size: var(--font-sm); margin-bottom: var(--space-lg);">
            TÜBİTAK, Teknofest ve BİLSEM içi etkinlik takvimleri
          </p>

          <div class="stagger-children">
            ${this.competitions.map(comp => `
              <div class="card" data-accordion-title="${UI.escape(comp.title)}" style="padding: var(--space-lg); margin-bottom: var(--space-md); border-top: 4px solid var(--primary);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                  <h3 style="font-size: var(--font-md); font-weight: 700; color: var(--text-primary); margin: 0; padding-right: 16px;">${comp.title}</h3>
                  <span class="chip chip-sm" style="background: var(--primary-subtle); color: var(--primary); white-space: nowrap;">${comp.type}</span>
                </div>
                
                <div style="font-size: var(--font-xs); font-weight: 600; color: var(--warning); margin-bottom: 8px;">
                  📅 ${comp.date}
                </div>
                
                <div style="font-size: var(--font-sm); color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;">
                  ${comp.desc}
                </div>
                
                ${comp.link !== '#' ? `
                <a href="${comp.link}" target="_blank" class="btn btn-sm btn-ghost" style="color: var(--primary-light); padding: 0;">
                  Detaylı Bilgi & Başvuru ↗
                </a>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
};
