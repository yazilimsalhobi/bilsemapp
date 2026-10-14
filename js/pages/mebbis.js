const MebbisPage = {
  render(container) {
    this.owner=Store.userId; this.parsed=null; this.mappings={}; this.container=container; this.institution=Mebbis.personalInstitution;
    container.innerHTML=`<div class="page-container" data-accordion="off">
      <h1 class="page-title">MEBBİS <span>işlemleri</span></h1>
      <p>${UI.escape(Mebbis.personalSchool)}</p>
      <a class="btn btn-primary btn-block" href="#absences">Devamsızlıkları seç ve MEBBİS’e işle</a>
      <p>Kurumunuz hazır tanımlı. Devamsızlık göndermek için yukarıdaki düğmeyi kullanın.</p>
      <details id="mebbis-program-tools"><summary>Program ve öğrenci verilerini güncelle</summary>
      <p>Android yardımcı uygulamasından kaydettiğiniz JSON dosyasını seçin. Program ve öğrenciler, kontrolünüzden sonra bu hesaba eklenir.</p>
      <label class="form-label" for="mebbis-file">Program ve öğrenci JSON dosyası</label>
      <input class="form-input" type="file" accept=".json,application/json" id="mebbis-file">
      <p id="mebbis-status" role="status" aria-live="polite"></p><div id="mebbis-preview"></div>
      <p>Bu ekran MEBBİS’e giriş yapmaz veya kayıt göndermez. Dosyadaki listelerin BİLSEM’deki programınızın tamamı olduğunu kontrol edin.</p>
      </details>
    </div>`;
    document.getElementById('mebbis-file').onchange=e=>this.read(e.target.files[0]);
  },
  async read(file) {
    const owner=this.owner, token=this.readToken=(this.readToken || 0)+1;
    const institution=this.institution;
    this.parsed=null; document.getElementById('mebbis-preview').innerHTML='';
    try {
      if(!file || file.size>5*1024*1024) throw new Error('En fazla 5 MB JSON dosyası seçin.');
      const data=JSON.parse(await file.text());
      if(Store.userId!==owner || !this.container.isConnected || this.readToken!==token || this.institution!==institution) return;
      this.parsed=Mebbis.parse(data,institution); this.mappings={};
      this.preview();
    } catch(error) { if(Store.userId===owner && this.readToken===token && document.getElementById('mebbis-status')) document.getElementById('mebbis-status').textContent=error.message; }
  },
  preview() {
    const parsed=this.parsed;
    if(!parsed || Store.userId!==this.owner) return;
    const existing=Store.getSetting('customGroups',[]);
    // Ambiguous source matches require an explicit target instead of a guessed merge.
    for(const g of parsed.groups) {
      const candidates=existing.filter(old=>Mebbis.compatible(old,g) && Mebbis.norm(old.mebbis?.branch || old.name)===Mebbis.norm(g.name));
      if(candidates.length>1 && !Object.hasOwn(this.mappings,g.id)) this.mappings[g.id]='';
    }
    const plan=Mebbis.plan(parsed,existing,this.mappings);
    this.previewRevision=JSON.stringify(existing);
    document.getElementById('mebbis-status').textContent=`${parsed.groups.length} grup · ${parsed.lessonCount} ders saati · ${parsed.studentCount} farklı öğrenci. Henüz kaydedilmedi.`;
    document.getElementById('mebbis-preview').innerHTML=parsed.groups.map((g,i)=>{
      const change=plan.changes[i];
      return `<div class="card" style="padding:16px;margin:12px 0">
        <h2>${UI.escape(g.name)} · ${UI.escape(g.subject)}</h2><p>${UI.escape(g.day)} · ${UI.escape(g.mebbis.period)}</p>
        <p>${g.lessons.map(l=>`${l.order}. ders ${l.start}–${l.end}`).join(' · ')}</p>
        <label class="form-label">Mevcut grupla eşleştirme<select class="form-select" data-map="${g.id}">
        <option value="">Yeni grup oluştur</option>${existing.filter(old=>Mebbis.compatible(old,g)).map(old=>`<option value="${UI.escape(old.id)}" ${old.id===change.targetId?'selected':''}>${UI.escape(old.name)} · ${UI.escape(old.startTime)} (${old.students.length} öğrenci)</option>`).join('')}</select></label>
        <p>${change.matched} öğrenci eşleşti · ${change.added} öğrenci eklenecek · kaynakta olmayan ${change.retained} mevcut öğrenci korunacak.</p>
        <details><summary>Öğrencileri kontrol et (${g.students.length})</summary><ul>${g.students.map(s=>`<li>${UI.escape(s.studentNumber)} · ${UI.escape(s.name)}</li>`).join('')}</ul></details>
      </div>`;
    }).join('')+`<p>Adla eşleştirme yalnızca seçilen gruptaki numarasız, tek eşleşen öğrenciler için kullanılır. Eşleştirmeleri kontrol edin. Eski gruplar, öğrenciler ve yoklama kayıtları silinmez.</p>
      <label><input type="checkbox" id="mebbis-confirm"> Grup ve öğrenci eşleştirmelerini kontrol ettim.</label>
      <button class="btn btn-primary btn-block" id="mebbis-save">Programı ve öğrencileri kaydet</button>`;
    document.querySelectorAll('[data-map]').forEach(select=>select.onchange=()=>{
      this.mappings[select.dataset.map]=select.value;
      try {this.preview();} catch(error) {document.getElementById('mebbis-status').textContent=error.message; document.getElementById('mebbis-save').disabled=true;}
    });
    document.getElementById('mebbis-save').onclick=()=>this.save();
  },
  async save() {
    if(this.busy || !this.parsed || Store.userId!==this.owner) return;
    const status=document.getElementById('mebbis-status');
    if(!document.getElementById('mebbis-confirm').checked) {status.textContent='Önce eşleştirmeleri kontrol edip onay kutusunu işaretleyin.';return;}
    try {
      const existing=Store.getSetting('customGroups',[]);
      if(JSON.stringify(existing)!==this.previewRevision) {this.preview();throw new Error('Mevcut program değişti. Güncellenmiş önizlemeyi yeniden kontrol edin.');}
      const plan=Mebbis.plan(this.parsed,existing,this.mappings);
      if(!Store.setSetting('customGroups',plan.groups)) throw new Error('Cihaz kaydı başarısız. Depolama alanını kontrol edin.');
      this.busy=true;
      Store.setSetting('mebbisInstitution',this.parsed.institution);
      Store.setSetting('onboardingComplete',true);
      document.getElementById('mebbis-save').disabled=true;
      const synced=await Store.syncNow();
      if(Store.userId!==this.owner || !status.isConnected) return;
      status.textContent=synced?'Program ve öğrenciler hesabınıza kaydedildi.':'Cihaza kaydedildi; bulut kaydı bekliyor.';
      this.parsed=null; document.getElementById('mebbis-preview').innerHTML='';
    } catch(error) {if(status.isConnected) status.textContent=error.message;} finally {this.busy=false;}
  }
};
