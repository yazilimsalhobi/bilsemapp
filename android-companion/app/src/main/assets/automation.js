((request,attendance,extract,resolveSelection) => {
  const norm=s=>String(s||'').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/İ/g,'I').replace(/[^A-Z0-9]/g,'');
  const visible=e=>e.getClientRects().length>0&&!e.disabled;
  const label=e=>norm(e.innerText||e.value||e.alt||e.title);
  const reply=value=>JSON.stringify(value);
  const fail=message=>{throw new Error(message);};
  const controls=()=>Array.from(document.querySelectorAll('a,button,input[type=submit],input[type=button],input[type=image]')).filter(visible);
  const unique=word=>{const found=controls().filter(e=>label(e)===norm(word));if(found.length!==1)fail(`${word} düğmesi kesin tanınamadı. İşlem durdu.`);return found[0];};
  const docId=()=>window.__bilsemAutoDoc||(window.__bilsemAutoDoc=crypto.randomUUID());
  const epoch=()=>window.__bilsemAutoEpoch||0;
  const marker=()=>({documentId:docId(),epoch:epoch()});
  const fresh=before=>before&&(before.documentId!==docId()||before.epoch<epoch());
  const call=r=>{const result=JSON.parse(attendance(r));if(!result.ok)fail(result.error);return result;};
  try {
    if(location.protocol!=='https:'||!['mebbis.meb.gov.tr','bilsem.meb.gov.tr'].includes(location.hostname))fail('Güvenilir MEBBİS sayfası değil.');
    // ASP.NET UpdatePanel posts may not replace the document.
    if(window.Sys?.WebForms?.PageRequestManager&&!window.__bilsemAutoHook) {
      window.__bilsemAutoHook=true;
      Sys.WebForms.PageRequestManager.getInstance().add_endRequest(()=>{window.__bilsemAutoEpoch=epoch()+1;});
    }
    if(document.querySelector('input[type=password]')) return reply({ok:true,state:'login'});
    if(window.Sys?.WebForms?.PageRequestManager?.getInstance().get_isInAsyncPostBack()) return reply({ok:true,state:'waiting'});
    if(request.action==='navigate' || (request.action==='resolve' && location.hostname==='mebbis.meb.gov.tr')) {
      if(document.querySelector('input[type=password]') || location.hostname==='mebbis.meb.gov.tr') {
        const links=Array.from(document.querySelectorAll('a,button,[role=button],[onclick]')).filter(e=>visible(e)&&label(e)==='BILIMVESANATMERKEZIMODULU');
        if(links.length===1&&!document.querySelector('input[type=password]')) {links[0].click();return reply({ok:true,state:'navigating'});}
        return reply({ok:true,state:'login'});
      }
      if(/^\/BLS00048\.ASPX$/i.test(location.pathname))return reply({ok:true,state:'ready'});
      return reply({ok:true,state:'navigate',url:'https://bilsem.meb.gov.tr/BLS00048.ASPX'});
    }
    if(request.action==='resolve' && location.hostname==='bilsem.meb.gov.tr') {
      const source=JSON.parse(extract());
      if(source.schedule?.length && source.students?.length) {
        const institutions=[...new Set(Array.from(document.body.innerText.matchAll(/\((\d{6,8})\)/g),m=>m[1]))];
        if(institutions.length!==1)fail('Kurum kodu ekrandan doğrulanamadı.');
        return reply({ok:true,state:'resolved',resolution:resolveSelection(request.draft,source,institutions[0])});
      }
      const links=Array.from(document.querySelectorAll('a,button,[role=button],[onclick]')).filter(e=>visible(e)&&label(e)==='OGRETMENBILGILERI');
      if(links.length!==1)fail('Otomatik eşleştirme için Öğretmen Bilgileri bağlantısı tanınamadı.');
      links[0].click();return reply({ok:true,state:'navigating'});
    }
    if(location.hostname!=='bilsem.meb.gov.tr'||!/^\/BLS00048\.ASPX$/i.test(location.pathname))return reply({ok:true,state:'login'});
    const draft=request.draft;
    if(!draft||!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)||!['Sabah','Öğle','Akşam'].includes(request.period))fail('Aktarım tarih/gün bölümü geçersiz.');
    if(request.action==='prepare') {
      const selects=Array.from(document.querySelectorAll('select')).filter(e=>visible(e)&&['Sabah','Öğle','Akşam'].every(p=>Array.from(e.options).some(o=>o.textContent.trim()===p)));
      if(selects.length!==1)fail('Gün bölümü filtresi tanınamadı.');
      const select=selects[0],option=Array.from(select.options).find(o=>o.textContent.trim()===request.period);
      if(select.value!==option.value) {select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));return reply({ok:true,state:'filter'});}
      const dates=Array.from(document.querySelectorAll('input')).filter(e=>visible(e)&&['date','text'].includes(e.type)&&(/^\d{2}[./]\d{2}[./]\d{4}$/.test(e.value)||e.type==='date'||/tarih|date/i.test(e.id+' '+e.name)));
      if(dates.length!==1)fail('Tarih filtresi tanınamadı.');
      const input=dates[0],separator=input.value.includes('.')?'.':'/';
      const desired=input.type==='date'?draft.date:draft.date.split('-').reverse().join(separator);
      if(input.value!==desired) {input.value=desired;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return reply({ok:true,state:'filter'});}
      const before=marker();unique('Listele').click();return reply({ok:true,state:'listed',before});
    }
    if(request.action==='awaitList'||request.action==='awaitSave') {
      if(!fresh(request.before))return reply({ok:true,state:'waiting'});
      return reply({ok:true,state:'fresh'});
    }
    if(request.action==='inspect'||request.action==='verify') {
      call({action:'bind'});
      const result=call({action:request.action==='inspect'?'preview':'verify',draft});
      return reply({...result,marker:marker(),state:request.action==='inspect'?'inspected':'verified'});
    }
    if(request.action==='commit') {
      // Locate Save before changing any controls. Never touch the completion checkbox.
      const save=unique('Kaydet');
      const preview=call({action:'preview',draft});
      if(preview.token!==request.token)fail('Liste önizlemeden sonra değişti; kaydetme durdu.');
      if(preview.changed===0)return reply({ok:true,state:'already',count:preview.summary.length});
      call({action:'apply',draft,token:request.token});
      const before=marker();save.click();return reply({ok:true,state:'submitted',before,count:preview.summary.length});
    }
    fail('Bilinmeyen aktarım adımı.');
  } catch(error) {return reply({ok:false,error:error.message});}
})
