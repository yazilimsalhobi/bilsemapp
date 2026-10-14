((selection,source,institution)=>{
  const norm=s=>String(s||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]/g,'');
  const subject=s=>norm(String(s||'').replace(/\s*\(\d+\)\s*$/,''));
  const fail=m=>{throw new Error(m);};
  if(selection.format!=='bilsem-attendance-selection'||selection.version!==1||!selection.rows?.length||institution!=='765146')fail('Kurum veya seçim bilgisi doğrulanamadı.');
  const targets=new Map(),rows=[];
  for(const selected of selection.rows) {
    const date=new Date(`${selection.date}T12:00:00Z`),days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    if(isNaN(date)||date.toISOString().slice(0,10)!==selection.date||days[date.getUTCDay()]!==selected.day||selected.status!=='absent')fail('Seçim tarihi veya ders günü eşleşmiyor.');
    const candidates=[];
    for(const lesson of source.schedule||[]) {
      const times=String(lesson.time).match(/^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/),order=String(lesson.lessonOrder).match(/^(\d{1,2})\s*\.?\s*(?:Ders)?$/i);
      if(!times||!order||lesson.day!==selected.day||times[1]!==selected.start||times[2]!==selected.end||subject(lesson.subject)!==subject(selected.subject))continue;
      for(const student of source.students||[]) {
        if(norm(student.branch)!==norm(lesson.branch)||subject(student.subject)!==subject(lesson.subject)||norm(`${student.firstName} ${student.lastName}`)!==norm(selected.studentName))continue;
        if(!/^\d{1,12}$/.test(student.studentNumber)||!['Sabah','Öğle','Akşam'].includes(lesson.period))fail('Resmî öğrenci veya ders bilgisi eksik.');
        candidates.push({institution,date:selection.date,branch:lesson.branch,subject:String(lesson.subject).replace(/\s*\(\d+\)\s*$/,''),period:lesson.period,lessonOrder:+order[1],studentNumber:student.studentNumber,status:'absent',localGroupId:selected.localGroupId,localStudentId:selected.localStudentId});
      }
    }
    if(candidates.length!==1)fail('Öğrenci adı, ders günü ve saati tek bir resmî kayıtla eşleşmedi. Gönderim yapılmadı.');
    const record=candidates[0],target={localGroupId:selected.localGroupId,day:selected.day,branch:record.branch,subject:record.subject,period:record.period};
    if(targets.has(target.localGroupId)&&JSON.stringify(targets.get(target.localGroupId))!==JSON.stringify(target))fail('Bir yerel grupta farklı resmî şubeler var. Otomatik eşleştirme durduruldu.');
    targets.set(target.localGroupId,target);rows.push(record);
  }
  const keys=rows.map(r=>JSON.stringify([r.institution,r.date,r.branch,r.subject,r.period,r.lessonOrder,r.studentNumber]));
  if(new Set(keys).size!==keys.length)fail('Aynı resmî öğrenci/ders birden fazla seçilmiş.');
  return {institution,sourceProgram:source,targets:[...targets.values()],draft:{format:'bilsem-attendance-draft',version:1,date:selection.date,rows,blocked:[],submitted:false}};
})
