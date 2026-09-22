/**
 * Fatsa BİLSEM — İstatistik & Rapor Sayfası
 */

const StatsPage = {
  render(container) {
    const overallStats = Store.getOverallStats();
    const allStudents = DataHelpers.getAllStudents();

    container.innerHTML = `
      <div class="page-container fade-in">
        <h1 class="page-title">📊 <span>İstatistikler</span></h1>

        <!-- Genel Özet -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📈 Genel Özet</h2>
          </div>
          <div class="stats-grid stagger-children">
            <div class="stat-card">
              <div class="stat-card-icon">📋</div>
              <div class="stat-card-value count-up">${overallStats.totalSessions}</div>
              <div class="stat-card-label">Yoklama Alındı</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">📈</div>
              <div class="stat-card-value count-up" style="color: ${overallStats.attendanceRate >= 80 ? 'var(--success)' : 'var(--warning)'};">%${overallStats.attendanceRate}</div>
              <div class="stat-card-label">Devam Oranı</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">📝</div>
              <div class="stat-card-value count-up">${overallStats.totalHomework}</div>
              <div class="stat-card-label">Toplam Ödev</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-icon">✅</div>
              <div class="stat-card-value count-up" style="color: var(--success);">${overallStats.completedHomework}</div>
              <div class="stat-card-label">Tamamlanan</div>
            </div>
          </div>
        </div>

        <!-- Grup Bazlı Devam Oranları -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📊 Grup Devam Oranları</h2>
          </div>
          <div class="card" style="padding: var(--space-lg);">
            <div class="chart-bar-container">
              ${BILSEM_DATA.groups.map(group => {
                const stats = Store.getAttendanceStats(group.id);
                let avgRate = 0;
                if (stats) {
                  const rates = Object.values(stats).filter(s => s.total > 0).map(s => s.rate);
                  avgRate = rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
                }
                return `
                  <div class="chart-bar-item">
                    <span class="chart-bar-label" title="${group.name}">${group.name}</span>
                    <div class="chart-bar-track">
                      <div class="chart-bar-fill" style="width: ${avgRate}%; background: linear-gradient(90deg, ${group.color}, ${group.color}CC);">
                        ${avgRate > 15 ? `%${avgRate}` : ''}
                      </div>
                    </div>
                    <span class="chart-bar-value" style="color: ${avgRate >= 80 ? 'var(--success)' : avgRate >= 50 ? 'var(--warning)' : 'var(--danger)'};">%${avgRate}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- En Çok Devamsızlık Yapanlar -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">⚠️ Devamsızlık Uyarıları</h2>
          </div>
          ${this.renderAbsenceWarnings()}
        </div>

        <!-- Gün Bazlı Dağılım -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📅 Gün Bazlı Öğrenci Dağılımı</h2>
          </div>
          <div class="card" style="padding: var(--space-lg);">
            <div class="chart-bar-container">
              ${BILSEM_DATA.activeDays.map(day => {
                const dayGroups = DataHelpers.getGroupsByDay(day);
                const studentCount = dayGroups.reduce((sum, g) => sum + g.students.length, 0);
                const maxStudents = Math.max(...BILSEM_DATA.activeDays.map(d => DataHelpers.getGroupsByDay(d).reduce((s, g) => s + g.students.length, 0)));
                const percentage = maxStudents > 0 ? Math.round((studentCount / maxStudents) * 100) : 0;
                const dayColor = BILSEM_DATA.dayColors[day];
                return `
                  <div class="chart-bar-item">
                    <span class="chart-bar-label">${dayColor.emoji} ${day}</span>
                    <div class="chart-bar-track">
                      <div class="chart-bar-fill" style="width: ${percentage}%; background: ${dayColor.gradient};">
                        ${studentCount} kişi
                      </div>
                    </div>
                    <span class="chart-bar-value">${dayGroups.length} grup</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Raporlar ve e-Okul -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">📄 Rapor Gönderimi & e-Okul</h2>
          </div>
          <div class="card" style="padding: var(--space-lg);">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button class="btn btn-success btn-block" onclick="StatsPage.exportEOkul()">
                🏫 e-Okul Formatında İndir (Devamsızlık CSV)
              </button>
              <button class="btn btn-primary btn-block" onclick="StatsPage.sendEmailReport()">
                ✉️ Genel Raporu E-posta ile Gönder
              </button>
            </div>
          </div>
        </div>

        <!-- Veri Yönetimi -->
        <div class="section">
          <div class="section-header">
            <h2 class="section-title">⚙️ Veri Yönetimi (Yedek)</h2>
          </div>
          <div class="card" style="padding: var(--space-lg);">
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <button class="btn btn-secondary btn-block" onclick="StatsPage.exportData()">
                📤 Verileri Dışa Aktar (JSON)
              </button>
              <button class="btn btn-secondary btn-block" onclick="document.getElementById('import-file').click()">
                📥 Verileri İçe Aktar
              </button>
              <input type="file" id="import-file" accept=".json" style="display: none;" onchange="StatsPage.importData(event)">
              <div class="divider"></div>
              <button class="btn btn-danger btn-block btn-sm" onclick="StatsPage.clearData()">
                🗑️ Tüm Verileri Sil
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderAbsenceWarnings() {
    const warnings = [];
    BILSEM_DATA.groups.forEach(group => {
      const stats = Store.getAttendanceStats(group.id);
      if (!stats) return;

      Object.entries(stats).forEach(([studentId, stat]) => {
        if (stat.absent >= 2) {
          warnings.push({
            studentId,
            name: stat.name,
            groupName: group.name,
            absent: stat.absent,
            rate: stat.rate,
            color: group.color
          });
        }
      });
    });

    warnings.sort((a, b) => b.absent - a.absent);

    if (warnings.length === 0) {
      return `
        <div class="card" style="text-align: center; padding: var(--space-xl); color: var(--text-tertiary);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🎉</div>
          <div>Ciddi devamsızlık sorunu olan öğrenci yok</div>
        </div>
      `;
    }

    return `
      <div class="stagger-children">
        ${warnings.slice(0, 10).map(w => `
          <div class="card" style="padding: 12px; margin-bottom: 6px; border-left: 3px solid ${w.rate < 50 ? 'var(--danger)' : 'var(--warning)'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; font-size: var(--font-base);">${w.name}</div>
                <div style="font-size: var(--font-xs); color: var(--text-tertiary);">${w.groupName}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 700; color: var(--danger);">${w.absent} devamsızlık</div>
                <div style="font-size: var(--font-xs); color: ${w.rate >= 80 ? 'var(--success)' : 'var(--danger)'};">%${w.rate} devam</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  exportData() {
    const data = Store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bilsem_yedek_${DataHelpers.formatDateShort()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Veriler dışa aktarıldı! 📤', 'success');
  },

  exportEOkul() {
    let csvContent = "Ogrenci No,Adi Soyadi,Devamsizlik Sayisi\\n";
    BILSEM_DATA.groups.forEach(group => {
      const stats = Store.getAttendanceStats(group.id);
      if (stats) {
        Object.entries(stats).forEach(([id, stat]) => {
          if (stat.absent > 0) {
            // Gerçek bir e-okul sisteminde öğrenci no gereklidir.
            csvContent += `${id},${stat.name},${stat.absent}\\n`;
          }
        });
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eOkul_Devamsizlik_${DataHelpers.formatDateShort()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('e-Okul CSV dosyası indirildi! 🏫', 'success');
  },

  sendEmailReport() {
    const overallStats = Store.getOverallStats();
    const subject = encodeURIComponent("Fatsa BİLSEM - Haftalık İstatistik Raporu");
    const body = encodeURIComponent(
      `Merhaba,\\n\\n` +
      `Fatsa BİLSEM güncel istatistik raporu aşağıdadır:\\n\\n` +
      `- Toplam Yoklama Sayısı: ${overallStats.totalSessions}\\n` +
      `- Ortalama Devam Oranı: %${overallStats.attendanceRate}\\n` +
      `- Verilen Toplam Ödev: ${overallStats.totalHomework}\\n` +
      `- Tamamlanan Ödev: ${overallStats.completedHomework}\\n\\n` +
      `İyi çalışmalar dilerim.`
    );
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Store.importAll(data);
        Toast.show('Veriler başarıyla içe aktarıldı! 📥', 'success');
        this.render(document.getElementById('page-content'));
      } catch (err) {
        Toast.show('Dosya okunamadı. Geçerli bir JSON dosyası seçin.', 'error');
      }
    };
    reader.readAsText(file);
  },

  clearData() {
    if (confirm('⚠️ TÜM VERİLER SİLİNECEK!\n\nYoklama, ödev, proje ve veli bilgileri dahil tüm veriler kalıcı olarak silinecektir.\n\nDevam etmek istiyor musunuz?')) {
      if (confirm('Bu işlem geri alınamaz. Emin misiniz?')) {
        Store.clearAll();
        Toast.show('Tüm veriler silindi', 'info');
        this.render(document.getElementById('page-content'));
      }
    }
  }
};
