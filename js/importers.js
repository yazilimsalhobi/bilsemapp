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
    if (ext === 'json') {
      const text = await file.text();
      return { text, rows: [] };
    }
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
          if (items.map(item => item.str).join('').length < 15) {
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
                return (gap < 2 ? '' : gap < 10 ? ' ' : '\t') + item.str;
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
    throw new Error(ext === 'doc' ? 'Eski .doc dosyasını Word ile .docx olarak kaydedip tekrar yükleyin.' : 'Desteklenen dosyalar: PDF, JSON, JPEG, PNG, Excel (.xlsx, .xls), Word (.docx).');
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
    const s = String(value || '').trim().replace(/[lI|]/g, '1').replace(/[oO]/g, '0');
    const m = s.match(/^(\d{1,2})[:.](\d{2})$/);
    return m && +m[1] < 24 && +m[2] < 60 ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
  },

  cleanStudentName(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    // Strip leading bullets
    s = s.replace(/^[■•*—–\-\s]+/, '');
    // Strip leading grade and/or row numbers (e.g. '4 1 ', '10 2 ', '1 ', '4.', '2)', '3-')
    s = s.replace(/^(\d{1,2}[.)\-–]?\s*)+/, '');
    // Strip parenthetical contents: (AYBASTI), (KORGAN H S), ( BİLİŞİM ), etc.
    s = s.replace(/\([^)]*\)/g, '');
    // Strip unclosed parenthesis at end: (AYBASTI
    s = s.replace(/\([A-Za-zÇĞİÖŞÜçğıöşü\s]*$/, '');
    // Strip known trailing town / branch / classification tags
    s = s.replace(/\s+(KORGAN|AYBASTI|KUMRU|FATSA)(\s+[Hh][\s_]*[Ssİi])?/gi, '');
    s = s.replace(/\s+[Zz][\-_]?[RrMm]\b/g, '');
    s = s.replace(/\s+NAK[İI]L.*$/gi, '');
    s = s.replace(/\s+NAK$/gi, '');
    // Strip trailing numbers
    s = s.replace(/\s+\d+$/, '');
    // Clean whitespace
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  },

  isValidSubject(raw) {
    if (!raw) return false;
    const s = String(raw).trim();
    if (s.length < 2) return false;
    // Reject pure numbers or numbers with dot/hyphen (e.g. 2, 4, 6, 7, 4., 2-)
    if (/^\d+[.)\-–]?$/.test(s)) return false;
    const norm = UI.normalize(s);
    if (['sinif', 'saat', 'ogrenci', 'ogrenci listesi', 'sira no', 'sira', 'gun', 'z-r', 'z-m', 'h_s', 'h_i'].includes(norm)) return false;
    if (UI.days.some(d => UI.normalize(d) === norm)) return false;
    return true;
  },

  normalizeSubject(raw) {
    if (!this.isValidSubject(raw)) return '';
    let s = String(raw).trim();
    s = s.replace(/^[■•*—–\-\s]+/, '').replace(/\s+/g, ' ').trim();
    const u = s.toLocaleUpperCase('tr-TR');

    if (u.includes('BİLİŞİM') || u.includes('BILISIM')) return 'Bilişim Teknolojileri';
    if (u.includes('DESTEK EĞİT') || u.includes('DESTEK EGIT')) return 'Destek Eğitimi';
    if (u.includes('İNGİLİZCE') || u.includes('INGILIZCE')) return 'İngilizce';
    if (u.includes('İLK. MAT') || u.includes('İLKÖĞRETİM MAT') || u.includes('ILK. MAT') || u.includes('ILKOGRETIM MAT')) return 'İlköğretim Matematik';
    if (u.includes('LİSE MAT') || u.includes('LISE MAT') || u.includes('MATEMATİK UYG') || u === 'MATEMATİK' || u === 'MATEMATIK') return 'Matematik';
    if (u.includes('FEN BİL') || u.includes('FEN BIL')) return 'Fen Bilimleri';
    if (u.includes('SOSYAL BİL') || u.includes('SOSYAL BIL')) return 'Sosyal Bilgiler';
    if (u.includes('TÜRKÇE') || u.includes('TURKCE')) return 'Türkçe';
    if (u.includes('FİZİK') || u.includes('FIZIK')) return 'Fizik';
    if (u.includes('KİMYA') || u.includes('KIMYA')) return 'Kimya';
    if (u.includes('BİYOLOJİ') || u.includes('BIYOLOJI')) return 'Biyoloji';
    if (u.includes('COĞRAFYA') || u.includes('COGRAFYA')) return 'Coğrafya';
    if (u.includes('TARİH') || u.includes('TARIH')) return 'Tarih';
    if (u.includes('EDEBİYAT') || u.includes('EDEBIYAT')) return 'Türk Dili ve Edebiyatı';
    if (u.includes('TEKNOLOJİ TASARIM') || u.includes('TASARIM') || u.includes('TEKNOLOJI TASARIM')) return 'Teknoloji ve Tasarım';
    if (u.includes('ATÖLYE') || u.includes('ATOLYE')) return 'Atölye (BYF)';
    if (u.includes('MÜZİK') || u.includes('MUZIK')) return 'Müzik';
    if (u.includes('GÖRSEL') || u.includes('GORSEL')) return 'Görsel Sanatlar';
    if (u.includes('FELSEFE')) return 'Felsefe';
    if (u.includes('ROBOTİK') || u.includes('ROBOTIK')) return 'Robotik';
    if (u.includes('YAPAY ZEKA') || u.includes('YAPAY ZEKÂ')) return 'Yapay Zeka';

    return s.split(' ').map(w => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR')).join(' ');
  },

  parseJSONSchedule(textOrData) {
    try {
      let data = textOrData;
      if (typeof textOrData === 'string') {
        const trimmed = textOrData.trim();
        if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null;
        data = JSON.parse(trimmed);
      }
      const list = Array.isArray(data) ? data : (data.groups || data.schedule || [data]);
      if (!list.length || !list[0] || (!list[0].grp && !list[0].name)) return null;

      const rawJson = [];
      const appGroups = [];

      for (const item of list) {
        const grpName = (item.grp || item.name || '').trim();
        const rawDay = (item.gun || item.day || '').trim();
        if (!grpName || !rawDay) continue;

        const matchedDay = UI.days.find(d => UI.normalize(d) === UI.normalize(rawDay)) || rawDay;
        const dayIndex = UI.days.indexOf(matchedDay);

        const prg = Array.isArray(item.prg) ? item.prg : [];
        const rawStudents = Array.isArray(item.ogr || item.students) ? (item.ogr || item.students) : [];
        const cleanStudents = rawStudents.map(s => typeof s === 'string' ? this.cleanStudentName(s) : this.cleanStudentName(s.name)).filter(Boolean);

        rawJson.push({
          grp: grpName,
          gun: rawDay.toLocaleUpperCase('tr-TR'),
          prg: prg.map(p => ({
            saat: p.saat || (p.start && p.end ? `${p.start}-${p.end}` : ''),
            ders: (p.ders || p.subject || '').trim()
          })).filter(p => p.saat && p.ders),
          ogr: cleanStudents
        });

        const bySubject = new Map();
        for (const slot of prg) {
          const saat = (slot.saat || (slot.start && slot.end ? `${slot.start}-${slot.end}` : '')).replace(/[lI|]/g, '1').replace(/[oO]/g, '0');
          const ders = (slot.ders || slot.subject || 'Genel').trim();
          const timeMatch = saat.match(/(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/);
          if (!timeMatch) continue;
          const start = this.time(timeMatch[1]);
          const end = this.time(timeMatch[2]);
          if (!start || !end) continue;

          let normSubj = this.normalizeSubject(ders) || ders.trim();
          if (!this.isValidSubject(normSubj)) normSubj = 'Genel';

          if (!bySubject.has(normSubj)) bySubject.set(normSubj, []);
          bySubject.get(normSubj).push({ start, end });
        }

        if (bySubject.size === 0) {
          appGroups.push({
            id: UI.id('grp'),
            name: grpName,
            day: matchedDay,
            dayIndex,
            subject: 'Genel',
            timeSlot: '',
            startTime: '09:00',
            endTime: '10:30',
            lessons: [{ order: 1, start: '09:00', end: '10:30' }],
            color: BILSEM_DATA.dayColors[matchedDay] ? BILSEM_DATA.dayColors[matchedDay].bg : '#00B894',
            students: cleanStudents.map(name => ({ id: UI.id('s'), name, parentName: '', parentPhone: '' }))
          });
        } else {
          for (const [subj, lessons] of bySubject.entries()) {
            lessons.sort((a, b) => a.start.localeCompare(b.start));
            const startTime = lessons[0].start;
            const endTime = lessons[lessons.length - 1].end;
            appGroups.push({
              id: UI.id('grp'),
              name: grpName,
              day: matchedDay,
              dayIndex,
              subject: subj,
              timeSlot: `${startTime} - ${endTime}`,
              startTime,
              endTime,
              lessons: lessons.map((l, i) => ({ order: i + 1, start: l.start, end: l.end })),
              color: BILSEM_DATA.dayColors[matchedDay] ? BILSEM_DATA.dayColors[matchedDay].bg : '#00B894',
              students: cleanStudents.map(name => ({ id: UI.id('s'), name, parentName: '', parentPhone: '' }))
            });
          }
        }
      }

      return { type: 'groups', groups: appGroups, rawJson };
    } catch (e) {
      return null;
    }
  },

  extractSemanticSchedule(text) {
    return this.schedule(text);
  },

  schedule(text) {
    if (!text || typeof text !== 'string') return { type: 'groups', groups: [] };

    const trimmed = text.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const jsonResult = this.parseJSONSchedule(trimmed);
      if (jsonResult) return jsonResult;
    }

    if (text.includes('BAŞLAMA SAATİ') && text.includes('BİTİŞ SAATİ')) {
      return { type: 'timesheet', times: this.parseTimesheet(text) };
    }
    if (text.includes('Öğrenci Listesi')) {
      return { type: 'groups', groups: this.parseMatrix(text) };
    }
    return { type: 'groups', groups: this.parseList(text) };
  },

  parseTimesheet(text) {
    const times = [];
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/(\d{1,2}[:.]\d{2})\s+(\d{1,2}[:.]\d{2})/);
      if (match) {
        times.push({ start: this.time(match[1]), end: this.time(match[2]) });
      }
    }
    return times.filter(t => t.start && t.end);
  },

  formatSubject(str) {
    if (!str || !this.isValidSubject(str)) return '';
    let s = str.trim();
    s = s.toLocaleLowerCase('tr-TR');
    return s.split(' ').map(w => w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1)).join(' ');
  },

  parseMatrix(text) {
    const groups = [];
    const lines = text.split(/\r?\n/);
    
    let activeHeaders = []; 
    let templateGroups = [];
    const groupStudentsMap = new Map(); // groupName -> Set of clean student names
    const timeRegex = /(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const rawCols = line.split('\t');
      
      // Look for group names column by column
      const groupMatches = [];
      if (!line.includes('Saat') && !timeRegex.test(line)) {
        for (let cIdx = 0; cIdx < rawCols.length; cIdx++) {
          const colText = rawCols[cIdx].trim();
          const m = colText.match(/(?:BYF|DESTEK|UYUM|ÖYG|PROJE)[-\s\d\p{L}\/_]+(?:\s*\([^)]+\))?/iu);
          if (m) {
            groupMatches.push({ colIndex: cIdx, name: m[0].trim().replace(/[_]+$/, '').trim() });
          }
        }
      }

      if (groupMatches.length > 0) {
        activeHeaders = [];
        templateGroups = [];
        for (const gm of groupMatches) {
          activeHeaders.push({ colIndex: gm.colIndex, name: gm.name });
          templateGroups.push({ name: gm.name, days: [] });
          if (!groupStudentsMap.has(gm.name)) groupStudentsMap.set(gm.name, new Set());
        }
        continue;
      }
      
      // Look for day names in header row
      const daysFound = UI.days.filter(d => new RegExp(`(^|[^a-z])${UI.normalize(d)}([^a-z]|$)`).test(UI.normalize(line)));
      if (daysFound.length > 0 && line.includes('Saat')) {
        const saatIndexes = rawCols.map((c, idx) => c.includes('Saat') ? idx : -1).filter(idx => idx !== -1);
        
        for (let idx = 0; idx < activeHeaders.length; idx++) {
          if (saatIndexes[idx] !== undefined) {
             activeHeaders[idx].colIndex = saatIndexes[idx];
          }
          const h = activeHeaders[idx];
          const nextColIndex = saatIndexes[idx + 1] !== undefined ? saatIndexes[idx + 1] : rawCols.length;
          
          const dayCols = rawCols.map((c, idx) => ({ text: c, i: idx })).filter(c => c.i >= h.colIndex && c.i < nextColIndex);
          for (const dc of dayCols) {
            const foundDay = UI.days.find(d => new RegExp(`(^|[^a-z])${UI.normalize(d)}([^a-z]|$)`).test(UI.normalize(dc.text)));
            if (foundDay) {
              templateGroups[idx].days.push(foundDay);
            }
          }
        }
        continue;
      }
      
      // Expand any cells where timeRegex is merged with text (e.g. '09:00-09:40 İNGİLİZCE')
      const cols = [];
      for (const c of rawCols) {
        const m = c.match(timeRegex);
        if (m && c.trim() !== m[0]) {
          const timePart = m[0];
          const rest = (c.slice(0, m.index) + ' ' + c.slice(m.index + m[0].length)).trim();
          cols.push(timePart);
          if (rest) cols.push(rest);
        } else {
          cols.push(c);
        }
      }

      // Look for time range and students (Data row)
      const timeIndexes = cols.map((c, idx) => timeRegex.test(c.trim()) ? idx : -1).filter(idx => idx !== -1);
      
      if (timeIndexes.length > 0) {
        for (let idx = 0; idx < Math.min(timeIndexes.length, activeHeaders.length); idx++) {
          const startCol = timeIndexes[idx];
          const endCol = timeIndexes[idx + 1] !== undefined ? timeIndexes[idx + 1] : cols.length;
          
          const slice = cols.slice(startCol, endCol);
          const timeMatch = slice[0].match(timeRegex);
          
          if (timeMatch) {
            const start = this.time(timeMatch[1]);
            const end = this.time(timeMatch[2]);
            const tGroup = templateGroups[idx];
            if (!tGroup) continue;

            // Extract students from slice (excluding time and pure numbers)
            const studentCells = slice.filter(c => c.trim().length > 3 && !timeRegex.test(c) && !/^\d+[.)\-–]?$/.test(c.trim()));
            if (studentCells.length > 0) {
              const rawName = studentCells[studentCells.length - 1];
              const studentName = this.cleanStudentName(rawName);
              if (studentName && studentName.length > 2) {
                if (groupStudentsMap.has(tGroup.name)) {
                  groupStudentsMap.get(tGroup.name).add(studentName);
                }
              }
            }

            if (tGroup.days && tGroup.days.length > 0) {
              for (let d = 0; d < tGroup.days.length; d++) {
                const dayName = tGroup.days[d];
                const rawSub = (slice[1 + d] || '').trim();
                let subject = this.formatSubject(rawSub);
                if (!subject || !this.isValidSubject(subject)) {
                  const cand = slice.slice(1).find(c => this.isValidSubject(c) && !/^\d+[.)\-–]?$/.test(c.trim()) && !studentCells.includes(c));
                  subject = cand ? this.formatSubject(cand) : 'Genel';
                }
                
                let g = groups.find(x => x.name === tGroup.name && x.day === dayName && x.subject === subject);
                if (!g) {
                    g = {
                        id: UI.id('grp'), name: tGroup.name, day: dayName, dayIndex: UI.days.indexOf(dayName),
                        subject: subject, timeSlot: '', startTime: start, endTime: end, lessons: [],
                        color: BILSEM_DATA.dayColors[dayName] ? BILSEM_DATA.dayColors[dayName].bg : 'gray', students: []
                    };
                    groups.push(g);
                }
                
                if (start < g.startTime || !g.startTime) g.startTime = start;
                if (end > g.endTime || !g.endTime) g.endTime = end;
                if (!g.lessons.some(l => l.start === start)) {
                    g.lessons.push({ order: g.lessons.length + 1, start, end });
                }
              }
            }
          }
        }
      } else if (templateGroups.length > 0) {
        // Rows without time (e.g. students 9, 10, etc.)
        for (let idx = 0; idx < activeHeaders.length; idx++) {
          const tGroup = templateGroups[idx];
          if (!tGroup) continue;
          const h = activeHeaders[idx];
          const nextCol = activeHeaders[idx + 1] ? activeHeaders[idx + 1].colIndex : rawCols.length;
          const slice = rawCols.slice(h.colIndex, nextCol);
          for (const cell of slice) {
            if (!timeRegex.test(cell) && !/^\d+[.)\-–]?$/.test(cell.trim())) {
              const studentName = this.cleanStudentName(cell);
              if (studentName && studentName.length > 2 && !this.isValidSubject(studentName)) {
                if (groupStudentsMap.has(tGroup.name)) {
                  groupStudentsMap.get(tGroup.name).add(studentName);
                }
              }
            }
          }
        }
      }
    }
    
    // Adım 1 Sonucu: Tüm gruplara kenara ayrılan eksiksiz öğrenci listesini bağla
    for (const g of groups) {
      const studentNames = Array.from(groupStudentsMap.get(g.name) || []);
      g.students = studentNames.map(name => ({ id: UI.id('s'), name, parentName: '', parentPhone: '' }));
      g.timeSlot = `${g.startTime} - ${g.endTime}`;
    }
    
    return groups.filter(g => g.students.length > 0 && g.startTime);
  },
  parseList(text) {
    const groups = [];
    let day = '', current = null, times = [], subject = '', columns = null, timeSlot = '';
    const subjects = /^(co[gğ]rafya|sosyal bilgiler|matematik|t[uü]rk[cç]e|fen bilimleri|ingilizce|m[uü]zik|g[oö]rsel sanatlar|bilim|robotik|yaz[iı]l[iı]m|beden e[gğ]itimi|resim|teknoloji|bili[sş]im)/i;
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
      if (foundDay) { if (day !== foundDay) { times = []; current = null; timeSlot = ''; } day = foundDay; }
      // Capture time slot labels like "Akşam Grubu", "Sabah ve Öğle Grubu"
      const slotMatch = line.match(/^((?:Ak[sş]am|Sabah|[OÖ][gğ]le)(?:\s+ve\s+(?:Ak[sş]am|Sabah|[OÖ][gğ]le))?\s+Grubu)/i);
      if (slotMatch) { timeSlot = slotMatch[1]; continue; }
      const ranges = [...line.matchAll(/(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2})/g)].map(m => ({ start: this.time(m[1]), end: this.time(m[2]) })).filter(t => t.start && t.end);
      const groupMatch = line.match(/(?<!\p{L})(?:BYF[-\s]?\d?|[OÖ]YG|UYUM|DESTEK|PROJE)\s*[-:]?\s*[\p{L}\p{N}() _-]+/iu) || line.match(/(?:Grup|Sınıf)\s*[:=]\s*([^\t;|]+)/iu);
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
        current = { id: UI.id('grp'), name, day, dayIndex: UI.days.indexOf(day), subject: '', timeSlot: timeSlot, startTime: times[0]?.start || '', endTime: times[0]?.end || '',
          lessons: times.slice(1).map((t, i) => ({ order: i + 1, ...t })), color: BILSEM_DATA.dayColors[day].bg, students: [] };
        if (!current.lessons.length && times.length) current.lessons = [{ order: 1, ...times[0] }];
        groups.push(current); times = []; subject = '';
        // A structured table may place names after the group column.
        const columns = line.split(/\t|;|\|/).map(v => v.trim()).filter(Boolean);
        const groupColumn = columns.findIndex(v => v.includes(name));
        for (const col of columns.slice(groupColumn + 1)) {
          const nCol = col.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
          const subjMatch = nCol.match(subjects);
          if (subjMatch) { current.subject = subjMatch[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); continue; }
          if (!/\d{1,2}[:.]\d{2}/.test(col) && !UI.days.some(d => UI.normalize(col) === UI.normalize(d))) this.addNames(current, col);
        }
        subject = current.subject;
        continue;
      }
      const nLine = line.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
      const lineSubjMatch = nLine.match(subjects);
      if (current && lineSubjMatch) { 
        current.subject = lineSubjMatch[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); 
        subject = current.subject; 
        continue; 
      }
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
      if (normalized.some(v => /kazanim|ogrenme cikti|hedef|konu|etkinlik|icerik|aciklama/.test(v)) && normalized.some(v => /tarih|hafta|sure/.test(v))) {
        columns = { topic: normalized.findIndex(v => /kazanim|ogrenme cikti|hedef/.test(v)), date: normalized.findIndex(v => /tarih/.test(v)), week: normalized.findIndex(v => /hafta/.test(v)) };
        if (columns.topic < 0) columns.topic = normalized.findIndex(v => /konu|etkinlik|icerik|aciklama/.test(v));
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
