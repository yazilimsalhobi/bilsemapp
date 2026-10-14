/** Read-only companion import. No requests are made to MEBBİS. */
const Mebbis = {
  text(value, label) {
    if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error(`${label} boş veya geçersiz.`);
    return value.trim().replace(/\s+/g, ' ');
  },
  norm(value) { return UI.normalize(value).replace(/\s+/g, ' ').trim(); },
  subject(value) { return this.text(value, 'Ders adı').replace(/\s*\(\d+\)\s*$/, '').trim(); },
  lessonId(period, order) { return `${period}:${order}`; },
  parse(data, institution) {
    institution = this.text(institution, 'Kurum kodu');
    if (!/^\d{6,8}$/.test(institution)) throw new Error('Kurum kodunu 6–8 rakam olarak girin.');
    if (data?.format !== 'bilsem-companion' || data.version !== 1 || !Array.isArray(data.schedule) || !Array.isArray(data.students)) throw new Error('BİLSEM Yardımcı sürüm 1 JSON dosyasını seçin.');
    if (!data.schedule.length || !data.students.length || data.schedule.length > 2000 || data.students.length > 10000) throw new Error('Program ve öğrenci listesi dolu olmalı; dosya sınırı aşılamaz.');
    const groups = new Map(), memberships = new Set(), identities = new Map();
    const key = (branch,subject) => JSON.stringify([this.norm(branch), this.norm(subject)]);
    for (const row of data.schedule) {
      const day = this.text(row.day,'Gün'), period = this.text(row.period,'Gün bölümü');
      if (!UI.days.includes(day) || !['Sabah','Öğle','Akşam'].includes(period)) throw new Error('Gün veya gün bölümü tanınmadı.');
      const orderMatch = this.text(row.lessonOrder,'Ders sırası').match(/^(\d{1,2})\s*\.?\s*(?:Ders)?$/i);
      if (!orderMatch || +orderMatch[1] < 1) throw new Error('Ders sırası tanınmadı.');
      const times = this.text(row.time,'Ders saati').match(/^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/);
      if (!times || !ImportParsers.time(times[1]) || !ImportParsers.time(times[2]) || times[1] >= times[2]) throw new Error('Geçersiz ders saati.');
      const branch = this.text(row.branch,'Şube'), subject = this.subject(row.subject);
      const groupKey = JSON.stringify([institution, this.norm(branch), this.norm(subject), day, period]);
      if (!groups.has(groupKey)) groups.set(groupKey, {
        id:UI.id('grp'), name:branch, subject, day, dayIndex:UI.days.indexOf(day), color:BILSEM_DATA.dayColors[day].bg,
        mebbis:{ institution, branch, subject, period }, lessons:[], students:[]
      });
      const group = groups.get(groupKey), order = +orderMatch[1];
      const lesson = { id:this.lessonId(period,order), order, period, start:times[1], end:times[2] };
      const previous = group.lessons.find(l => l.id === lesson.id);
      if (previous && (previous.start !== lesson.start || previous.end !== lesson.end)) throw new Error('Aynı ders sırası için farklı saatler var.');
      if (!previous) group.lessons.push(lesson);
    }
    for (const row of data.students) {
      const number = this.text(row.studentNumber,'Öğrenci numarası');
      if (!/^\d{1,12}$/.test(number)) throw new Error('Geçersiz öğrenci numarası.');
      const name = `${this.text(row.firstName,'Öğrenci adı')} ${this.text(row.lastName,'Öğrenci soyadı')}`;
      const identity = `${institution}:${number}`;
      if (identities.has(identity) && this.norm(identities.get(identity).name) !== this.norm(name)) throw new Error('Aynı öğrenci numarası için farklı isimler var.');
      if (!identities.has(identity)) identities.set(identity,{ id:UI.id('s'), name, studentNumber:number, mebbisInstitution:institution });
      const branch = this.text(row.branch,'Öğrenci şubesi'), subject = this.subject(row.subject), membership = key(branch,subject);
      const targets = [...groups.values()].filter(g => key(g.name,g.subject) === membership);
      if (!targets.length) throw new Error('Öğrenci listesinde programla eşleşmeyen şube/ders var. Tam programı tekrar okuyun.');
      const memberKey = `${membership}:${number}`;
      if (memberships.has(memberKey)) continue;
      memberships.add(memberKey);
      targets.forEach(g => g.students.push({...identities.get(identity)}));
    }
    for (const g of groups.values()) {
      if (!g.students.length) throw new Error('Öğrenci listesi olmayan ders grubu var. Tam listeyi tekrar okuyun.');
      g.lessons.sort((a,b) => a.start.localeCompare(b.start));
      for(let i=1;i<g.lessons.length;i++) if(g.lessons[i].start < g.lessons[i-1].end) throw new Error('Bir gruptaki ders saatleri çakışıyor.');
      g.startTime=g.lessons[0].start; g.endTime=g.lessons.at(-1).end; g.timeSlot=`${g.startTime} - ${g.endTime}`;
    }
    return { groups:[...groups.values()], studentCount:identities.size, lessonCount:[...groups.values()].reduce((n,g)=>n+g.lessons.length,0), institution };
  },
  compatible(old, incoming) {
    return old.day === incoming.day && this.norm(old.subject || '') === this.norm(incoming.subject) &&
      (!old.mebbis || old.mebbis.institution === incoming.mebbis.institution && old.mebbis.period === incoming.mebbis.period && this.norm(old.mebbis.branch) === this.norm(incoming.mebbis.branch));
  },
  plan(parsed, existing, mappings = {}) {
    const result = structuredClone(existing), changes=[], used=new Set();
    for (const incoming of parsed.groups) {
      let candidates = existing.filter(g => this.compatible(g,incoming) && this.norm(g.mebbis?.branch || g.name) === this.norm(incoming.name));
      let target;
      if (Object.hasOwn(mappings,incoming.id)) {
        target = mappings[incoming.id] ? existing.find(g=>g.id===mappings[incoming.id]) : null;
        if(mappings[incoming.id] && (!target || !this.compatible(target,incoming))) throw new Error('Seçilen mevcut grup gün, ders veya kurumla eşleşmiyor.');
      } else {
        if(candidates.length>1) throw new Error('Birden fazla mevcut grup eşleşiyor; grup seçimini açıkça yapın.');
        target=candidates[0];
      }
      if(target && used.has(target.id)) throw new Error('İki kaynak grubu aynı mevcut gruba bağlanamaz.');
      if(target) used.add(target.id);
      const g = target ? result.find(g=>g.id===target.id) : structuredClone(incoming);
      if (target) {
        const incomingIds=new Set(incoming.lessons.map(l=>l.id));
        const retained = (g.lessons || []).filter(l=>!incomingIds.has(l.id || this.lessonId(l.period,l.order)));
        // A legacy timetable has no MEBBİS lesson identity; retain it on the old group metadata.
        g.legacyLessons = g.legacyLessons || (!g.mebbis ? structuredClone(g.lessons || []) : []);
        g.lessons = [...(g.mebbis ? retained : []), ...structuredClone(incoming.lessons)].sort((a,b)=>a.start.localeCompare(b.start));
        g.mebbis = {...incoming.mebbis};
        for(let i=1;i<g.lessons.length;i++) if(g.lessons[i].start<g.lessons[i-1].end) throw new Error('Mevcut derslerle yeni ders saatleri çakışıyor. Programı kontrol edin.');
        g.startTime=g.lessons[0].start; g.endTime=g.lessons.at(-1).end; g.timeSlot=`${g.startTime} - ${g.endTime}`;
      }
      let added=0, matched=0;
      if(!target) g.students=[];
      for (const student of incoming.students) {
        const numbered = existing.flatMap(g=>g.students).filter(s=>s.mebbisInstitution===parsed.institution && s.studentNumber===student.studentNumber);
        const ids = new Set(numbered.map(s=>s.id));
        if(ids.size>1) throw new Error('Bir öğrenci numarası birden fazla kayıtla eşleşiyor. Önce mevcut kayıtları düzeltin.');
        let prior=g.students.find(s=>s.studentNumber===student.studentNumber && s.mebbisInstitution===parsed.institution);
        if(!prior && target) {
          const names=g.students.filter(s=>!s.studentNumber && this.norm(s.name)===this.norm(student.name));
          if(names.length>1) throw new Error('Aynı isimli birden fazla öğrenci var; otomatik eşleştirme durduruldu.');
          prior=names[0];
        }
        if(prior && ids.size && !ids.has(prior.id)) throw new Error('Öğrenci adı ve numarası farklı mevcut kimliklerle eşleşiyor.');
        const merged={...(prior || {}), ...student, id:prior?.id || numbered[0]?.id || student.id};
        if(prior) { Object.assign(prior,merged); matched++; } else { g.students.push(merged); added++; }
      }
      if(!target) result.push(g);
      changes.push({incomingId:incoming.id, groupId:g.id, targetId:target?.id || '', name:g.name, added, matched, retained:Math.max(0,g.students.length-incoming.students.length)});
    }
    return {groups:result, changes};
  }
};
