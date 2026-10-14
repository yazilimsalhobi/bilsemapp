/** Native Android takes this in-memory queue only from the application's HTTPS origin. */
const NativeTransfer = {
  pending:null,
  open(date, selectedDraft = null) {
    if(Auth.getCurrentUser()?.role==='parent') return;
    const draft=selectedDraft || Store.lessonTransferDraft(date),owner=Store.userId;
    if(this.pending && this.pending.owner!==owner) this.pending=null;
    if(!draft.rows.length) {Toast.show('Önce ders yoklamasını kaydedin. Aktarılabilir kayıt bulunamadı.','warning');return;}
    App.showModal('MEBBİS’e işlenecek kayıtlar',`<p>${UI.escape(draft.date)} · İşlenecek öğrenci ve dersleri seçin. Seçili kayıtlar, girişinizden sonra MEBBİS’te kaydedilip yeniden kontrol edilecek.</p>
      ${draft.blocked.length?`<p role="alert">${draft.blocked.length} kayıt resmî eşleştirme gerektirdiği için seçime alınmadı.</p>`:''}
      <div style="max-height:45vh;overflow:auto">${draft.rows.map((r,i)=>{
        const student=DataHelpers.getAllStudents().find(s=>s.studentNumber===r.studentNumber&&s.mebbisInstitution===r.institution);
        return `<label style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color)"><input type="checkbox" data-transfer-row="${i}" ${r.status==='absent'?'checked':''}><span>${UI.escape(student?.name || r.studentNumber)} · ${UI.escape(r.branch)}<br>${UI.escape(r.period)} ${r.lessonOrder}. ders · ${r.status==='absent'?'Gelmedi':'Geldi (mevcut devamsızlığı kaldır)'}</span></label>`;
      }).join('')}</div>
      <p id="native-transfer-status" role="status" aria-live="polite"></p><button class="btn btn-primary btn-block" id="native-transfer-send">Seçilenleri MEBBİS’e işle</button>`);
    document.getElementById('native-transfer-send').onclick=()=>{
      const status=document.getElementById('native-transfer-status');
      if(Store.userId!==owner) {status.textContent='Hesap değişti. Aktarım ekranını yeniden açın.';return;}
      if(!window.BilsemAndroid || window.BilsemAndroid.version<3) {status.textContent='Dosyasız aktarım için BİLSEM Android 0.3 uygulamasının BİLSEM Takip ekranını kullanın.';return;}
      if(this.pending) {status.textContent='Önceki aktarım henüz bitmedi. Android ekranındaki sonucu kontrol edin.';return;}
      const rows=[...document.querySelectorAll('[data-transfer-row]:checked')].map(e=>draft.rows[+e.dataset.transferRow]);
      if(!rows.length) {status.textContent='En az bir öğrenci/ders seçin.';return;}
      this.pending={requestId:crypto.randomUUID(),owner,draft:{...draft,rows,blocked:[]}};
      status.textContent='MEBBİS açılıyor. Giriş ve doğrulama kodunu siz tamamlayın.';
      document.getElementById('native-transfer-send').disabled=true;
    };
  },
  enqueue(draft) {
    const owner=Store.userId;
    if(!owner || Auth.getCurrentUser()?.role==='parent') throw new Error('Öğretmen hesabınıza giriş yapın.');
    if(!window.BilsemAndroid || window.BilsemAndroid.version<3) return false;
    if(this.pending && this.pending.owner!==owner) this.pending=null;
    if(this.pending) throw new Error('Önceki gönderim bitmedi. Uygulamadaki işlem sonucunu kontrol edin.');
    if(!['bilsem-attendance-draft','bilsem-attendance-selection'].includes(draft.format)||draft.version!==1||!draft.rows?.length||draft.blocked?.length) throw new Error('Gönderilecek kayıtlar doğrulanamadı.');
    this.pending={requestId:crypto.randomUUID(),owner,draft:structuredClone(draft)};
    const status=document.getElementById('absence-status');if(status)status.textContent='Yoklama kaydedildi. MEBBİS açılıyor; işlem sonucu burada gösterilecek.';
    return true;
  },
  resolved(requestId, resolution) {
    try {
      if(!this.pending || this.pending.requestId!==requestId || this.pending.owner!==Store.userId) throw new Error('Takip hesabı veya aktarım işi değişti.');
      if(resolution.institution!==Mebbis.personalInstitution || resolution.draft?.format!=='bilsem-attendance-draft') throw new Error('Kurum veya çözüm bilgisi eşleşmiyor.');
      const parsed=Mebbis.parse(resolution.sourceProgram,resolution.institution),existing=Store.getSetting('customGroups',[]);
      const selected=[],mappings={};
      for(const target of resolution.targets) {
        const matches=parsed.groups.filter(g=>g.day===target.day&&g.mebbis.period===target.period&&Mebbis.norm(g.mebbis.branch)===Mebbis.norm(target.branch)&&Mebbis.norm(g.subject)===Mebbis.norm(target.subject));
        if(matches.length!==1||!existing.some(g=>g.id===target.localGroupId)) throw new Error('Mevcut grup tek bir resmî grupla eşleştirilemedi.');
        selected.push(matches[0]);mappings[matches[0].id]=target.localGroupId;
      }
      if(new Set(selected.map(g=>g.id)).size!==selected.length)throw new Error('Birden fazla yerel grup aynı resmî gruba bağlanamaz.');
      const plan=Mebbis.plan({...parsed,groups:selected},existing,mappings);
      if(!Store.setSetting('customGroups',plan.groups))throw new Error('Eşleştirme cihaza kaydedilemedi.');
      const selections=Store.getSetting('absenceSelections',{}),byLesson=new Map();
      for(const row of resolution.draft.rows) {
        const group=DataHelpers.getGroupById(row.localGroupId),student=group?.students.find(s=>s.id===row.localStudentId);
        const lesson=group?.lessons.find(l=>l.period===row.period&&l.order===row.lessonOrder);
        if(!lesson||student?.studentNumber!==row.studentNumber||student.mebbisInstitution!==row.institution)throw new Error('Öğrenci numarası son kontrolde eşleşmedi.');
        const key=JSON.stringify([group.id,lesson.id]);if(!byLesson.has(key))byLesson.set(key,{group,lesson,students:[]});byLesson.get(key).students.push(student);
        const selectionKey=JSON.stringify([resolution.draft.date,group.id]);
        const pair=JSON.stringify([lesson.id,student.id]);selections[selectionKey]=[...new Set([...(selections[selectionKey]||[]),pair])];
      }
      for(const {group,lesson,students} of byLesson.values()) {
        const previous=Store.getLessonAttendance(group.id,resolution.draft.date,lesson.id)?.records || [];
        const records=previous.filter(r=>!students.some(s=>s.id===r.studentId)).concat(students.map(s=>({studentId:s.id,status:'absent'})));
        if(!Store.saveLessonAttendance(group.id,resolution.draft.date,lesson.id,records))throw new Error('Yoklama cihaza kaydedilemedi.');
      }
      Store.setSetting('absenceSelections',selections);
      this.pending.draft=resolution.draft;
      if(document.getElementById('absence-roster'))AbsencesPage.roster();
      return {ok:true};
    } catch(error) {return {ok:false,error:error.message};}
  },
  takeRequest() {
    if(this.pending && this.pending.owner!==Store.userId) this.pending=null;
    if(!this.pending || this.pending.taken) return null;
    this.pending.taken=true;
    return {requestId:this.pending.requestId,owner:this.pending.owner,draft:this.pending.draft};
  },
  result(value) {
    if(!this.pending || value.requestId!==this.pending.requestId || this.pending.owner!==Store.userId) return;
    const message=value.message || 'Aktarım durumu güncellendi.';
    const status=document.getElementById('native-transfer-status') || document.getElementById('absence-status');if(status) status.textContent=message;
    Toast.show(message,value.state==='completed'?'success':value.state==='running'?'info':'warning',8000);
    if(value.state!=='running') {
      const savedHistory=Store.getSetting('mebbisTransferHistory',[]);
      const history=Array.isArray(savedHistory)?savedHistory:[];
      const receipt={requestId:value.requestId,date:this.pending.draft.date,selected:this.pending.draft.rows.length,verified:Number.isInteger(value.verified)?value.verified:null,state:value.state,message,checkedAt:new Date().toISOString()};
      Store.setSetting('mebbisTransferHistory',[receipt,...history.filter(r=>r && typeof r==='object' && r.requestId!==receipt.requestId)].slice(0,100));
      this.pending=null;
      const historyView=document.getElementById('absence-transfer-history');if(historyView)historyView.innerHTML=AbsencesPage.renderHistory();
      const button=document.getElementById('native-transfer-send');if(button) button.disabled=false;
    }
  }
};
