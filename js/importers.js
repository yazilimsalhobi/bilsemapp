/** File contents stay in the browser; only reviewed records are saved. */
const FileReaders = {
  _scripts: {},
  script(url, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (!this._scripts[url]) this._scripts[url] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve(window[globalName]);
      script.onerror = () => { delete this._scripts[url]; script.remove(); reject(new Error('Dosya okuyucu indirilemedi. İnternet bağlantınızı kontrol edin.')); };
      document.head.appendChild(script);
    });
    return this._scripts[url];
  },
  async read(file, progress = () => {}) {
    if (!file || file.size > 25 * 1024 * 1024) throw new Error('En fazla 25 MB boyutunda bir dosya seçin.');
    const ext = file.name.split('.').pop().toLowerCase();
    progress('Dosya okunuyor…');
    if (['jpg', 'jpeg', 'png'].includes(ext)) {
      const text = await this.ocr(file, progress);
      return { text, rows: text.split('\n').map(line => line.split(/\t|\s{3,}/)) };
    }
    if (ext === 'pdf') {
      const pdfjs = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
      const lines = [];
      try {
        if (pdf.numPages > 40) throw new Error('Lütfen en fazla 40 sayfalık bir program yükleyin.');
        for (let n = 1; n <= pdf.numPages; n++) {
          progress(`${n} / ${pdf.numPages} sayfa okunuyor…`);
          const page = await pdf.getPage(n);
          const content = await page.getTextContent();
          const items = content.items.filter(item => item.str?.trim());
          if (items.map(item => item.str).join('').length < 25) {
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height;
            try {
              await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
              lines.push(await this.ocr(canvas, progress));
            } finally { canvas.width = 0; canvas.height = 0; }
          } else {
            // Reconstruct physical lines, retaining table columns with tabs.
            const rows = [];
            for (const item of items.sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])) {
              let row = rows.find(row => Math.abs(row.y - item.transform[5]) < 3);
              if (!row) { row = { y: item.transform[5], items: [] }; rows.push(row); }
              row.items.push(item);
            }
            lines.push(rows.map(row => {
              const ordered = row.items.sort((a, b) => a.transform[4] - b.transform[4]);
              return ordered.map((item, i) => {
                if (!i) return item.str;
                const previous = ordered[i - 1];
                const gap = item.transform[4] - previous.transform[4] - previous.width;
                // PDF fonts often split Turkish letters into separate text items.
                return (gap < 2 ? '' : gap < 14 ? ' ' : '\t') + item.str;
              }).join('');
            }).join('\n'));
          }
          page.cleanup();
        }
      } finally { await pdf.destroy(); }
      const text = lines.join('\n');
      return { text, rows: text.split('\n').map(line => line.split('\t')) };
    }
    if (['xlsx', 'xls'].includes(ext)) {
      const XLSX = await this.script('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js', 'XLSX');
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const rows = book.SheetNames.flatMap(name => XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: false, dateNF: 'dd.mm.yyyy', defval: '' }));
      return { rows, text: rows.map(row => row.join('\t')).join('\n') };
    }
    if (ext === 'docx') {
      const mammoth = await this.script('https://cdn.jsdelivr.net/npm/mammoth@1.11.0/mammoth.browser.min.js', 'mammoth');
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      // Untrusted document HTML is parsed inertly, never inserted into the page.
      const doc = new DOMParser().parseFromString(result.value, 'text/html');
      const rows = Array.from(doc.querySelectorAll('tr')).map(row => Array.from(row.cells).map(cell => cell.textContent.trim()));
      if (!rows.length) rows.push(...Array.from(doc.querySelectorAll('p')).map(p => [p.textContent.trim()]));
      return { rows, text: rows.map(row => row.join('\t')).join('\n') };
    }
    throw new Error(ext === 'doc' ? 'Eski .doc dosyasını Word ile .docx olarak kaydedip tekrar yükleyin.' : 'Desteklenen dosyalar: PDF, JPEG, PNG, Excel (.xlsx, .xls), Word (.docx).');
  },
  async ocr(source, progress) {
    const Tesseract = await this.script('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', 'Tesseract');
    const worker = await Tesseract.createWorker('tur+eng', 1, { logger: m => {
      if (m.status === 'recognizing text') progress(`Görüntüdeki yazılar okunuyor: %${Math.round(m.progress * 100)}`);
    } });
    try { return (await worker.recognize(source)).data.text; }
    finally { await worker.terminate(); }
  }
};

const ImportParsers = {
  time(value) {
    const m = String(value).match(/^(\d{1,2})[:.](\d{2})$/);
    return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
  },
  schedule(text) {
    const groups = [];
    let day = '', current = null, times = [], subject = '', columns = null;
    const subjects = /^(co[gğ]rafya|sosyal bilgiler|matematik|t[uü]rk[cç]e|fen bilimleri|ingilizce|m[uü]zik|g[oö]rsel sanatlar|bilim|robotik|yaz[iı]l[iı]m)/i;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const normalized = UI.normalize(line);
      if (normalized.includes('veli iletisim rehberi')) break;
      if (/sayfa\s+\d|page break|bilsem/.test(normalized)) continue;
      const cells = line.split(/\t|;|\|/).map(v => v.trim());
      const labels = cells.map(UI.normalize);
      if (labels.some(v => /^gun$/.test(v)) && labels.some(v => /grup|sinif/.test(v))) {
        columns = { day: labels.findIndex(v => v === 'gun'), name: labels.findIndex(v => /grup|sinif/.test(v)), start: labels.findIndex(v => /baslangic/.test(v)), end: labels.findIndex(v => /bitis/.test(v)), time: labels.findIndex(v => /saat/.test(v)), students: labels.findIndex(v => /ogrenci/.test(v)), subject: labels.findIndex(v => /ders|brans/.test(v)) };
        continue;
      }
      if (columns && cells.length > 1) {
        const tableDay = UI.days.find(d => UI.normalize(d) === UI.normalize(cells[columns.day] || ''));
        const name = cells[columns.name];
        if (tableDay && name) {
          const range = (cells[columns.time] || '').match(/(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/);
          const start = this.time(cells[columns.start] || range?.[1] || ''), end = this.time(cells[columns.end] || range?.[2] || '');
          let g = groups.find(g => g.name === name && g.day === tableDay && g.startTime === start);
          if (!g) { g = { id: UI.id('grp'), name, day: tableDay, dayIndex: UI.days.indexOf(tableDay), startTime: start, endTime: end, subject: cells[columns.subject] || '', timeSlot: '', lessons: start && end ? [{ order: 1, start, end }] : [], color: BILSEM_DATA.dayColors[tableDay].bg, students: [] }; groups.push(g); }
          if (columns.students >= 0) this.addNames(g, cells[columns.students] || '');
          continue;
        }
      }
      const foundDay = UI.days.find(d => new RegExp(`(^|[^a-z])${UI.normalize(d)}([^a-z]|$)`).test(normalized));
      if (foundDay) { if (day !== foundDay) { times = []; current = null; } day = foundDay; }
      const ranges = [...line.matchAll(/(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/g)].map(m => ({ start: this.time(m[1]), end: this.time(m[2]) })).filter(t => t.start && t.end);
      const groupMatch = line.match(/(?<!\p{L})(?:BYF|[OÖ]YG|UYUM|DESTEK|PROJE)\s*[-:]?\s*[\p{L}\p{N}() _-]+/iu) || line.match(/(?:Grup|Sınıf)\s*[:=]\s*([^\t;|]+)/iu);
      const detailedLesson = /\d+\.?\s*ders/i.test(line);
      if (ranges.length) {
        if (current && !groupMatch && detailedLesson) {
          if (!current._detailed) { current.lessons = []; current._detailed = true; }
          current.lessons.push(...ranges.map(t => ({ order: current.lessons.length + 1, ...t })));
        } else if (current && !groupMatch && !current.startTime) {
          current.startTime = ranges[0].start; current.endTime = ranges[0].end;
          current.lessons = [{ order: 1, ...ranges[0] }];
        } else {
          if (current && !groupMatch) { current = null; times = []; }
          times.push(...ranges);
        }
      }
      if (groupMatch && day) {
        const name = (groupMatch[1] || groupMatch[0]).split(/\t|;|\|/)[0].replace(/\d{1,2}[:.]\d{2}.*/, '').trim();
        current = { id: UI.id('grp'), name, day, dayIndex: UI.days.indexOf(day), subject: '', timeSlot: '', startTime: times[0]?.start || '', endTime: times[0]?.end || '',
          lessons: times.slice(1).map((t, i) => ({ order: i + 1, ...t })), color: BILSEM_DATA.dayColors[day].bg, students: [] };
        if (!current.lessons.length && times.length) current.lessons = [{ order: 1, ...times[0] }];
        groups.push(current); times = []; subject = '';
        // A structured table may place names after the group column.
        const columns = line.split(/\t|;|\|/).map(v => v.trim()).filter(Boolean);
        const groupColumn = columns.findIndex(v => v.includes(name));
        for (const col of columns.slice(groupColumn + 1)) {
          if (subjects.test(col)) { current.subject = col; continue; }
          if (!/\d{1,2}[:.]\d{2}/.test(col) && !UI.days.some(d => UI.normalize(col) === UI.normalize(d))) this.addNames(current, col);
        }
        subject = current.subject;
        continue;
      }
      if (current && subjects.test(line)) { current.subject = line; subject = line; continue; }
      const bullet = line.search(/[■▪•●]/);
      if (current && bullet >= 0) this.addNames(current, line.slice(bullet));
      else if (current && (/^[*\-]/.test(line) || /^\d+[.)]\s*\p{L}/u.test(line))) this.addNames(current, line);
      else if (current && subject && !/teneffüs|sayfa|bilsem|grubu|ders|page break/i.test(line) && !foundDay && !ranges.length) this.addNames(current, line);
    }
    groups.forEach(g => { delete g._detailed; });
    return groups;
  },
  addNames(group, text) {
    for (const part of text.split(/[;,|\t■▪•●]/)) {
      const name = part.replace(/^[\s■▪•●*\-\d.)]+/, '').trim();
      if (name.length > 2 && /\p{L}/u.test(name) && !group.students.some(s => s.name === name)) group.students.push({ id: UI.id('s'), name, parentName: '', parentPhone: '' });
    }
  },
  isoDate(value, year) {
    let m = String(value).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    let y, month, day;
    if (m) [, y, month, day] = m;
    else {
      m = String(value).trim().match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/);
      if (!m) return '';
      day = m[1]; month = m[2]; y = m[3] || year;
      if (String(y).length === 2) y = 2000 + +y;
    }
    const date = new Date(+y, +month - 1, +day);
    return date.getFullYear() === +y && date.getMonth() === +month - 1 && date.getDate() === +day ? UI.date(date) : '';
  },
  dateRange(text, year) {
    const shortRange = String(text).match(/\b(\d{1,2})\s*[-–—]\s*(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
    if (shortRange) {
      const [, first, last, month, explicitYear] = shortRange;
      const y = explicitYear || (+year + (+month < 9 ? 1 : 0));
      return { start: this.isoDate(`${first}.${month}.${y}`, year), end: this.isoDate(`${last}.${month}.${y}`, year) };
    }
    const full = [...String(text).matchAll(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)\b/g)].map(m => {
      const short = m[0].match(/^\d{1,2}[./](\d{1,2})$/);
      return this.isoDate(m[0], short && +short[1] < 9 ? +year + 1 : year);
    }).filter(Boolean);
    if (full.length) return { start: full[0], end: full[1] || full[0] };
    const months = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
    const normalized = UI.normalize(text);
    const namedDates = [...normalized.matchAll(/(\d{1,2})\s+(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)(?:\s+(20\d{2}))?/g)];
    if (namedDates.length >= 2) {
      const dates = namedDates.map(m => { const month = months.indexOf(m[2]) + 1; return this.isoDate(`${m[1]}.${month}.${m[3] || (+year + (month < 9 ? 1 : 0))}`, year); });
      return { start: dates[0], end: dates[1] };
    }
    const month = months.findIndex(m => normalized.includes(m));
    if (month >= 0) {
      const m = normalized.match(/(\d{1,2})(?:\s*[-–—]\s*(\d{1,2}))?\s*[a-z]+(?:\s+(20\d{2}))?/);
      const inferredYear = +year + (month < 8 ? 1 : 0);
      if (m) return { start: this.isoDate(`${m[1]}.${month + 1}.${m[3] || inferredYear}`, year), end: this.isoDate(`${m[2] || m[1]}.${month + 1}.${m[3] || inferredYear}`, year) };
    }
    return { start: '', end: '' };
  },
  annual(rows, { year = new Date().getFullYear(), firstWeek = '' } = {}) {
    let columns = null;
    const result = [];
    for (const raw of rows) {
      const row = raw.map(v => String(v ?? '').trim());
      const normalized = row.map(UI.normalize);
      if (normalized.some(v => /kazanim|ogrenme cikti|hedef|konu/.test(v)) && normalized.some(v => /tarih|hafta/.test(v))) {
        columns = { topic: normalized.findIndex(v => /kazanim|ogrenme cikti|hedef/.test(v)), date: normalized.findIndex(v => /tarih/.test(v)), week: normalized.findIndex(v => /hafta/.test(v)) };
        if (columns.topic < 0) columns.topic = normalized.findIndex(v => /konu/.test(v));
        continue;
      }
      const range = this.dateRange(columns?.date >= 0 ? row[columns.date] : row.join(' '), year);
      const weekMatch = (columns?.week >= 0 ? row[columns.week] : row.join(' ')).match(/(?:^|\s)(\d{1,2})(?:\.?\s*hafta|$)/i);
      const week = weekMatch ? +weekMatch[1] : result.length + 1;
      let topic = columns?.topic >= 0 ? row[columns.topic] : row.filter(cell => cell && !/^\d+\.?\s*(hafta)?$/i.test(cell)).join(' — ')
        .replace(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)\b/g, '').replace(/^\s*\d+\.?\s*hafta\s*/i, '').replace(/^[\s—–-]+/, '').trim();
      if (!topic || (!range.start && !weekMatch && !columns)) continue;
      if (!range.start && firstWeek) {
        const start = new Date(firstWeek + 'T12:00:00'); start.setDate(start.getDate() + (week - 1) * 7);
        const end = new Date(start); end.setDate(end.getDate() + 6);
        range.start = UI.date(start); range.end = UI.date(end);
      }
      // Rows without dates remain visibly incomplete for user correction.
      result.push({ id: UI.id('plan'), week, start: range.start, end: range.end, topic });
    }
    return result;
  }
};
