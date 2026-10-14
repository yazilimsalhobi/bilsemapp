/** A visible selection screen, including for groups not yet linked to MEBBİS. */
const AbsencesPage = {
  render(container) {
    this.owner=Store.userId;this.container=container;this.date=UI.date();
    if(Auth.getCurrentUser()?.role==='parent') {container.innerHTML='<div class="page-container">Bu ekran öğretmen hesabı içindir.</div>';return;}
    this.groupId=DataHelpers.getTodayGroups()[0]?.id || BILSEM_DATA.groups[0]?.id || '';
    container.innerHTML=`<div class="page-container" data-accordion="off">
      <h1 class="page-title">Devamsızlıkları <span>seç</span></h1>
      <p>Grubu ve tarihi seçin. Gelmeyen öğrencilerin ilgili derslerini işaretleyin.</p>
      <label class="form-label" for="absence-date">Tarih</label><input class="form-input" type="date" id="absence-date" value="${this.date}">
      <label class="form-label" for="absence-group">Grup</label><select class="form-select" id="absence-group"><option value="">Grup seçin</option>${BILSEM_DATA.groups.map(g=>`<option value="${UI.escape(g.id)}" ${g.id===this.groupId?'selected':''}>${UI.escape(g.name)} · ${UI.escape(g.day)} · ${UI.escape(g.subject)}</option>`).join('')}</select>
      <div id="absence-roster"></div>
      <p id="absence-status" role="status" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" id="absence-submit" style="margin:16px 0">Seçilenleri MEBBİS’e işle</button>
      <p>Yalnızca seçtiğiniz öğrenci/ders kayıtları gönderilir. İşaretlenmeyen öğrenciler için resmî kayıtta değişiklik yapılmaz.</p>
    </div>`;
    document.getElementById('absence-date').onchange=e=>{this.capture();this.date=e.target.value;this.roster();};
    document.getElementById('absence-group').onchange=e=>{this.capture();this.groupId=e.target.value;this.roster();};
    document.getElementById('absence-submit').onclick=()=>this.submit();this.roster();
  },
  lessonKey(lesson) {return lesson.id || JSON.stringify([lesson.order,lesson.start,lesson.end]);},
  key() {return JSON.stringify([this.date,this.groupId]);},
  capture() {
    if(Store.userId!==this.owner)return;
    const selections=Store.getSetting('absenceSelections',{});
    selections[this.key()]=[...document.querySelectorAll('[data-absence-pair]:checked')].map(e=>e.dataset.absencePair);
    Store.setSetting('absenceSelections',selections);
  },
  roster() {
    const target=document.getElementById('absence-roster'),group=DataHelpers.getGroupById(this.groupId);
    document.getElementById('absence-status').textContent='';
    if(!group) {target.innerHTML='<p>Öğrenci listesini görmek için bir grup seçin. Grubunuz yoksa önce programınızı ekleyin.</p><button class="btn btn-secondary" onclick="Router.go(\'import\')">Program ekle</button>';return;}
    this.lessons=group.lessons?.length?group.lessons:[{order:1,start:group.startTime,end:group.endTime}];
    const saved=Store.getSetting('absenceSelections',{})[this.key()] || [];
    const linked=!!group.mebbis&&this.lessons.every(l=>l.id);
    target.innerHTML=`${!linked?'<p role="alert" class="sync-notice">Bu grubun MEBBİS eşleştirmesi henüz yok. Seçim yapabilirsiniz; öğrenci numaraları ve resmî ders bilgileri eşleşmeden gönderim yapılmaz.</p><button class="btn btn-secondary" onclick="Router.go(\'mebbis\')">Programı MEBBİS verileriyle eşleştir</button>':''}
      <p>${group.students.length} öğrenci · ${this.lessons.length} ders · ${UI.escape(group.day)}</p>
      ${group.students.map((student,si)=>`<div class="card" style="padding:14px;margin:12px 0"><h2 style="font-size:1rem;margin-bottom:10px">${UI.escape(student.name)}</h2><div style="display:flex;flex-wrap:wrap;gap:12px">${this.lessons.map((lesson,li)=>{const key=JSON.stringify([this.lessonKey(lesson),student.id]);return `<label style="display:flex;align-items:center;gap:8px;padding:8px 0"><input type="checkbox" data-absence-pair="${UI.escape(key)}" ${saved.includes(key)?'checked':''}><span>${UI.escape(lesson.period || '')} ${UI.escape(lesson.order || li+1)}. ders<br><small>${UI.escape(lesson.start || '')}–${UI.escape(lesson.end || '')} · Gelmedi</small></span></label>`;}).join('')}</div></div>`).join('')}`;
    target.querySelectorAll('[data-absence-pair]').forEach(e=>e.onchange=()=>this.capture());
  },
  submit() {
    if(Store.userId!==this.owner)return;
    const status=document.getElementById('absence-status'),group=DataHelpers.getGroupById(this.groupId);
    const pairs=[...document.querySelectorAll('[data-absence-pair]:checked')].map(e=>{const [lessonKey,studentId]=JSON.parse(e.dataset.absencePair);return [this.lessons.findIndex(l=>this.lessonKey(l)===lessonKey),group?.students.findIndex(s=>s.id===studentId)??-1];});
    this.capture();
    if(pairs.some(([li,si])=>li<0||si<0)) {status.textContent='Öğrenci listesi değişti. Ekranı yeniden açın; işlem yapılmadı.';return;}
    if(!pairs.length) {status.textContent='En az bir öğrenci/ders işaretleyin.';return;}
    if(!group?.mebbis || !this.lessons.every(l=>l.id)) {status.textContent='Seçimleriniz korundu. Bu grubun MEBBİS öğrenci numarası ve ders eşleştirmesi eksik; önce yukarıdaki eşleştirmeyi tamamlayın.';return;}
    if(pairs.some(([,si])=>!group.students[si]?.studentNumber || group.students[si].mebbisInstitution!==group.mebbis.institution)) {status.textContent='Seçili öğrencilerin MEBBİS numaraları eşleşmiyor. Seçimler korunuyor; program eşleştirmesini kontrol edin.';return;}
    try {
      const rows=[];
      for(let li=0;li<this.lessons.length;li++) {
        const chosen=pairs.filter(p=>p[0]===li).map(p=>group.students[p[1]]);
        if(!chosen.length)continue;
        const lesson=this.lessons[li];
        const previous=Store.getLessonAttendance(group.id,this.date,lesson.id)?.records || [];
        const records=previous.filter(r=>!chosen.some(s=>s.id===r.studentId)).concat(chosen.map(s=>({studentId:s.id,status:'absent'})));
        if(!Store.saveLessonAttendance(group.id,this.date,lesson.id,records))throw new Error('Seçimler cihaza kaydedilemedi.');
        rows.push(...chosen.map(s=>({institution:group.mebbis.institution,date:this.date,branch:group.mebbis.branch,subject:group.mebbis.subject,period:lesson.period,lessonOrder:lesson.order,studentNumber:s.studentNumber,status:'absent'})));
      }
      NativeTransfer.open(this.date,{format:'bilsem-attendance-draft',version:1,date:this.date,rows,blocked:[],submitted:false});
    } catch(error) {status.textContent=error.message;}
  }
};
