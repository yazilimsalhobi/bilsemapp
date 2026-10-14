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
  takeRequest() {
    if(this.pending && this.pending.owner!==Store.userId) this.pending=null;
    if(!this.pending || this.pending.taken) return null;
    this.pending.taken=true;
    return {requestId:this.pending.requestId,owner:this.pending.owner,draft:this.pending.draft};
  },
  result(value) {
    if(!this.pending || value.requestId!==this.pending.requestId || this.pending.owner!==Store.userId) return;
    const message=value.message || 'Aktarım durumu güncellendi.';
    const status=document.getElementById('native-transfer-status');if(status) status.textContent=message;
    Toast.show(message,value.state==='completed'?'success':value.state==='running'?'info':'warning',8000);
    if(value.state!=='running') {
      this.pending=null;
      const button=document.getElementById('native-transfer-send');if(button) button.disabled=false;
    }
  }
};
