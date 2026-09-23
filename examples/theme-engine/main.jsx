import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, ThemeSwitcher } from './ThemeProvider';
import { StudentStatsCard } from './StudentStatsCard';
import '../../css/main.css';
import './utilities.css';
import '../../css/globals.css';
import './preview.css';

function Demo() {
  const [loading, setLoading] = useState(false);
  return <ThemeProvider><main className="theme-preview">
    <p>BİLSEM TAKİP · TEMA ATÖLYESİ</p>
    <h1>Bir uygulama, üç karakter.</h1>
    <p>Organic’in sıcaklığı, Brutalist’in keskinliği ve Ethereal’ın hafifliği.</p>
    <ThemeSwitcher />
    <StudentStatsCard loading={loading} />
    <label className="preview-loading"><input type="checkbox" checked={loading}
      onChange={event => setLoading(event.target.checked)} /> Geogo bekleme animasyonunu göster</label>
  </main></ThemeProvider>;
}
createRoot(document.getElementById('root')).render(<Demo />);
