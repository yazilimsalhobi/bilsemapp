(() => {
  // Read only visible table text. Never read forms, hidden fields or cookies.
  const normalize = s => s.toLocaleUpperCase('tr-TR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/İ/g, 'I').replace(/[^A-Z0-9]/g, '');
  const schemas = {
    schedule: { day:'DERSGUNU', period:'ZAMAN', lessonOrder:'KACINCIDERS', time:'DERSSAATLERI', subject:'DERSADI', branch:'SUBEADI' },
    students: { subject:'DERSADI', branch:'SUBEADI', studentNumber:'OGRNO', firstName:'OGRADI', lastName:'OGRSOYADI' }
  };
  const result = { format:'bilsem-companion', version:1, capturedAt:new Date().toISOString(), schedule:[], students:[] };
  for (const table of document.querySelectorAll('table')) {
    if (table.getClientRects().length === 0) continue;
    const rows = Array.from(table.rows).filter(r => r.closest('table') === table);
    for (const [kind, schema] of Object.entries(schemas)) {
      let indexes = null;
      for (const row of rows) {
        const cells = Array.from(row.cells);
        const headers = cells.map(c => normalize(c.innerText || ''));
        if (Object.values(schema).every(name => headers.includes(name))) {
          indexes = Object.fromEntries(Object.entries(schema).map(([key,name]) => [key, headers.indexOf(name)]));
          continue;
        }
        if (!indexes || row.getClientRects().length === 0) continue;
        const record = {};
        for (const [key,index] of Object.entries(indexes)) record[key] = (cells[index]?.innerText || '').replace(/\s+/g,' ').trim();
        if (Object.values(record).every(Boolean) && !result[kind].some(r => JSON.stringify(r) === JSON.stringify(record))) result[kind].push(record);
      }
    }
  }
  return JSON.stringify(result);
})()
