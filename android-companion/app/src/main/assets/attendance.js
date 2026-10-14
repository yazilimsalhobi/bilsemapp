(request => {
  // No network calls, hidden inputs, cookies, identity numbers or Save clicks.
  const fail=message=>{throw new Error(message);};
  const norm=s=>String(s).toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]/g,'');
  const visible=e=>e.getClientRects().length>0;
  const text=e=>(e?.innerText || '').replace(/\s+/g,' ').trim();
  const date=s=>{
    let m=String(s).match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
    const iso=m?`${m[3]}-${m[2]}-${m[1]}`:String(s);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const d=new Date(`${iso}T12:00:00Z`);return !isNaN(d)&&d.toISOString().slice(0,10)===iso?iso:'';
  };
  try {
    if(location.protocol!=='https:' || location.hostname!=='bilsem.meb.gov.tr' || !/^\/BLS00048\.ASPX$/i.test(location.pathname)) fail('Ders Devamsızlık Takibi (BLS00048) ekranını açın.');
    const columns={number:['OGRENCINO','OGRNO'],branch:['SINIFI','SUBEADI'],subject:['DERSADI'],order:['DERSSIRASI'],absent:['GELMEDI'],excused:['RAPORRESMIIZIN']};
    const diagnostics=[];const tables=[];const headerLabels=[];
    for(const table of document.querySelectorAll('table')) {
      if(!visible(table))continue;
      headerLabels.push(Array.from(table.querySelectorAll('th')).slice(0,30).map(c=>{const label=norm(text(c));return /^(TC|OGRENCINO|OGRNO|ADI|SOYADI|SINIFI|SUBEADI|DERSADI[0-9]*|DERSSIRASI[0-9]*|GELMEDI|RAPORRESMIIZIN)$/.test(label)?label:'TANINMAYAN_BASLIK';}));
      const rows=Array.from(table.rows).filter(r=>r.closest('table')===table);
      for(let i=0;i<rows.length;i++) {
        const headers=Array.from(rows[i].cells).map(c=>norm(Array.from(c.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ') || c.querySelector('label,span')?.textContent || text(c)));
        const indexes=Object.fromEntries(Object.entries(columns).map(([k,aliases])=>[k,headers.findIndex(h=>aliases.some(a=>h===a || (['subject','order'].includes(k)&&h.startsWith(a))))]));
        if(Object.values(indexes).every(n=>n>=0)) {tables.push({rows:rows.slice(i+1),indexes});diagnostics.push({columns:Object.keys(indexes),rowCount:rows.length-i-1});break;}
      }
    }
    if(request.action==='diagnose') return JSON.stringify({ok:true,format:'bilsem-attendance-diagnostic',version:1,headerLabels,tables:diagnostics,controls:tables.flatMap(t=>t.rows.filter(visible).map(r=>Object.fromEntries(['absent','excused'].map(k=>[k,Array.from(r.cells[t.indexes[k]]?.querySelectorAll('input')||[]).filter(e=>e.type!=='hidden').map(e=>({type:e.type,disabled:e.disabled,visible:visible(e)}))]))))});
    if(tables.length!==1) fail('Tek bir devamsızlık tablosu tanınamadı. Listele yapın; gerekirse Ekranı Tanı ile tanı dosyasını paylaşın.');
    const institutions=[...new Set(Array.from(document.body.innerText.matchAll(/\((\d{6,8})\)/g),m=>m[1]))];
    const dates=[...new Set(Array.from(document.querySelectorAll('input')).filter(e=>visible(e)&&['text','date'].includes(e.type)).map(e=>date(e.value)).filter(Boolean))];
    const periods=[...new Set(Array.from(document.querySelectorAll('select')).filter(visible).map(e=>e.selectedOptions[0]?.textContent.trim()).filter(s=>['Sabah','Öğle','Akşam'].includes(s)))];
    if(institutions.length!==1 || dates.length!==1 || periods.length!==1) fail('Kurum kodu, tarih ve gün bölümü ekrandan kesin doğrulanamadı. Aktarım durduruldu.');
    const context={institution:institutions[0],date:dates[0],period:periods[0]};
    const table=tables[0], official=[];
    for(const row of table.rows) {
      if(!visible(row))continue;
      const cells=Array.from(row.cells),number=text(cells[table.indexes.number]);
      if(!/^\d{1,12}$/.test(number)) continue; // Footer and pager rows are not student rows.
      const readControl=k=>{
        const controls=Array.from(cells[table.indexes[k]]?.querySelectorAll('input')||[]).filter(e=>['checkbox','radio'].includes(e.type));
        if(controls.length!==1 || controls[0].disabled || !visible(controls[0])) fail('Devamsızlık kutularının yapısı tanınmadı veya alanlar kilitli.');
        return controls[0];
      };
      const absent=readControl('absent'),excused=readControl('excused');
      if(absent.type!==excused.type || absent===excused) fail('Desteklenmeyen yoklama alanı.');
      if(absent.type==='radio' && (!absent.name || absent.name!==excused.name)) fail('Radyo kutularının öğrenci/ders grubu doğrulanamadı.');
      if(absent.type==='radio' && Array.from(document.querySelectorAll('input[type=radio]')).filter(e=>e.name===absent.name).length!==2) fail('Radyo grubu başka alanlarla ortak; doldurma durduruldu.');
      if(absent.checked&&excused.checked)fail('Aynı satırda gelmedi ve izinli birlikte seçili.');
      const subjectText=text(cells[table.indexes.subject]);
      const periodLabel=subjectText.match(/\((Sabah|Öğle|Akşam)\)\s*$/i);
      if(!periodLabel || norm(periodLabel[1])!==norm(context.period)) fail('Listelenmiş dersin gün bölümü seçili filtreyle eşleşmiyor. Yeniden Listele yapın.');
      const subject=subjectText.replace(/^\d+\s*[-:]?\s*/, '').replace(/\s*\((Sabah|Öğle|Akşam)\)\s*$/i,'').replace(/\s*\(\d+\)\s*$/,'');
      const order=text(cells[table.indexes.order]).match(/^(\d{1,2})\s*\.?\s*Ders$/i);
      const branch=text(cells[table.indexes.branch]);
      if(!order || !branch || !subject) fail('Ders sırası, şube veya ders adı tanınmadı.');
      official.push({number,branch,subject,order:+order[1],absent,excused});
    }
    if(!official.length)fail('Listede öğrenci ders satırı bulunamadı.');
    const radioNames=official.filter(r=>r.absent.type==='radio').map(r=>r.absent.name);
    if(new Set(radioNames).size!==radioNames.length)fail('Farklı ders satırları aynı radyo grubunu kullanıyor.');
    const identity=JSON.stringify({context,rows:official.map(r=>[r.number,r.branch,r.subject,r.order,r.absent.name,r.excused.name])});
    if(request.action==='bind') {
      window.__bilsemListed={table:table.rows[0]?.closest('table'),identity};
      return JSON.stringify({ok:true,action:'bind'});
    }
    if(!window.__bilsemListed || window.__bilsemListed.table!==table.rows[0]?.closest('table') || window.__bilsemListed.identity!==identity) fail('Liste veya filtre değişti. Doğru tarih/gün bölümünde Listele yapın; gerekirse sayfayı yenileyip tekrar Listele yapın.');
    const draft=request.draft;
    if(draft?.format!=='bilsem-attendance-draft'||draft.version!==1||draft.submitted!==false||!Array.isArray(draft.rows)||!draft.rows.length||draft.rows.length>10000||!Array.isArray(draft.blocked)||draft.blocked.length)fail('Geçerli, engellenen satırı olmayan yoklama taslağı seçin.');
    if(date(draft.date)!==context.date)fail('Dosyanın tarihi ekrandaki tarihle eşleşmiyor.');
    if(draft.rows.some(r=>String(r.institution)!==context.institution||r.date!==context.date||!['Sabah','Öğle','Akşam'].includes(r.period)))fail('Dosyanın kurum/tarih bilgisi ekrandan farklı.');
    const selected=draft.rows.filter(r=>r.period===context.period);
    if(!selected.length)fail('Dosyada seçili gün bölümü için kayıt yok.');
    const planned=[],keys=new Set();
    for(const record of selected) {
      if(!['present','absent'].includes(record.status)||typeof record.studentNumber!=='string'||!Number.isInteger(record.lessonOrder)||record.lessonOrder<1||typeof record.branch!=='string'||typeof record.subject!=='string')fail('Taslakta geçersiz durum veya ders/öğrenci bilgisi var.');
      const key=JSON.stringify([record.studentNumber,norm(record.branch),norm(record.subject),record.lessonOrder]);
      if(keys.has(key))fail('Taslakta aynı öğrenci/ders tekrarlanıyor.');keys.add(key);
      const matches=official.filter(r=>r.number===record.studentNumber&&norm(r.branch)===norm(record.branch)&&norm(r.subject)===norm(record.subject)&&r.order===record.lessonOrder);
      if(matches.length!==1)fail('Bir öğrenci/ders satırı bulunamadı veya birden fazla eşleşti. Hiçbir alan değiştirilmedi.');
      const row=matches[0];
      if(row.excused.checked)fail('Eşleşen satırda rapor/resmî izin var. Otomatik değiştirilemez.');
      planned.push({row,record,before:row.absent.checked?'absent':'present'});
    }
    const snapshot=JSON.stringify({context,rows:official.map(r=>[r.number,r.branch,r.subject,r.order,r.absent.name,r.excused.name,r.absent.checked,r.excused.checked])});
    const summary=planned.map(({row,record,before})=>({studentNumber:row.number,branch:row.branch,subject:row.subject,lessonOrder:row.order,before,after:record.status}));
    if(request.action==='apply') {
      if(request.token!==snapshot)fail('Ekran önizlemeden sonra değişti. Yeniden önizleme yapın.');
      // Set properties only: change/click handlers may trigger an unreviewed postback.
      // The user submits using the official Kaydet control afterwards.
      for(const {row,record} of planned) {row.absent.checked=record.status==='absent';row.excused.checked=false;}
      if(planned.some(({row,record})=>row.absent.checked!==(record.status==='absent')||row.excused.checked))fail('Doldurma doğrulanamadı. Kaydetmeden önce sayfayı yenileyin.');
      return JSON.stringify({ok:true,action:'apply',context,summary,changed:planned.filter(p=>p.before!==p.record.status).length,otherPeriods:draft.rows.length-selected.length,submitted:false});
    }
    if(request.action==='verify') {
      const differences=summary.filter(r=>r.before!==r.after);
      return JSON.stringify({ok:true,action:'verify',context,matched:summary.length,differences,submitted: false,readbackMatches:differences.length===0});
    }
    if(request.action!=='preview')fail('Geçersiz işlem.');
    return JSON.stringify({ok:true,action:'preview',context,summary,changed:summary.filter(r=>r.before!==r.after).length,otherPeriods:draft.rows.length-selected.length,token:snapshot,submitted:false});
  } catch(error) {return JSON.stringify({ok:false,error:error.message});}
})
