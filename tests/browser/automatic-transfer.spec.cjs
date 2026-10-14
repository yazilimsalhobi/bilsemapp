const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const automation=fs.readFileSync('android-companion/app/src/main/assets/automation.js','utf8');
const attendance=fs.readFileSync('android-companion/app/src/main/assets/attendance.js','utf8');
const extract=fs.readFileSync('android-companion/app/src/main/assets/extract.js','utf8');
const resolver=fs.readFileSync('android-companion/app/src/main/assets/resolve-selection.js','utf8');
const draft=()=>({format:'bilsem-attendance-draft',version:1,submitted:false,blocked:[],date:'2026-10-17',rows:[{institution:'123456',date:'2026-10-17',period:'Sabah',branch:'A',subject:'COĞRAFYA',studentNumber:'42',lessonOrder:1,status:'absent'}]});
async function auto(page,action,other={}){return page.evaluate(({automation,attendance,extract,resolver,request})=>JSON.parse((0,eval)(`(${automation})`)(request,(0,eval)(`(${attendance})`),()=>(0,eval)(extract),(0,eval)(`(${resolver})`))),{automation,attendance,extract,resolver,request:{action,draft:draft(),period:'Sabah',...other}});}
function form(state,options={}){
 const checked=state.absent?'checked':'';
 return `<html><body><header>Kurum (123456)</header><form method="post"><input name="date" value="${state.date}"><select name="period">${['Sabah','Öğle','Akşam'].map(p=>`<option ${state.period===p?'selected':''}>${p}</option>`).join('')}</select><button name="action" value="list">Listele</button><button name="action" value="save">Kaydet</button>${options.duplicateSave?'<button>Kaydet</button>':''}
 <table><tr>${['TC','ÖĞRENCİ NO','ADI','SOYADI','SINIFI','DERS ADI','DERS SIRASI','GELMEDİ','RAPOR/RESMÎ İZİN'].map(h=>`<th>${h}</th>`).join('')}</tr><tr><td>11111111111</td><td>42</td><td>Örnek</td><td>Kişi</td><td>A</td><td>1035 COĞRAFYA (${state.period})</td><td>1. Ders</td><td><input type="radio" name="lesson42" value="absent" ${checked}></td><td><input type="radio" name="lesson42" value="excused"></td></tr></table><input type="checkbox" name="complete"></form></body></html>`;
}
async function setup(page,options={}){
 const state={date:'16/10/2026',period:'Akşam',absent:false,saves:0,complete:false};
 await page.route('https://bilsem.meb.gov.tr/BLS00048.ASPX',route=>{
  const request=route.request();if(request.method()==='POST'){
   const posted=new URLSearchParams(request.postData());state.date=posted.get('date');state.period=posted.get('period');
   if(posted.get('action')==='save'){state.saves++;state.complete=posted.has('complete');if(!options.rejectSave)state.absent=posted.get('lesson42')==='absent';}
  }
  return route.fulfill({contentType:'text/html; charset=utf-8',body:form(state,options)});
 });
 await page.goto('https://bilsem.meb.gov.tr/BLS00048.ASPX');return state;
}
async function list(page){
 // Set period and date first; each prepare step changes at most one filter.
 expect((await auto(page,'prepare')).state).toBe('filter');
 expect((await auto(page,'prepare')).state).toBe('filter');
 const [,result]=await Promise.all([page.waitForNavigation(),auto(page,'prepare')]);
 expect(result.state).toBe('listed');expect((await auto(page,'awaitList',{before:result.before})).state).toBe('fresh');
 return auto(page,'inspect');
}
test('selected records travel through filters, list, one Save, fresh readback and idempotent repeat',async({page})=>{
 const state=await setup(page);const preview=await list(page);expect(preview.ok).toBe(true);expect(preview.changed).toBe(1);
 const [,commit]=await Promise.all([page.waitForNavigation(),auto(page,'commit',{token:preview.token})]);
 expect(commit.state).toBe('submitted');expect(state.saves).toBe(1);expect(state.absent).toBe(true);expect(state.complete).toBe(false);
 expect((await auto(page,'awaitSave',{before:commit.before})).state).toBe('fresh');
 const [,relisted]=await Promise.all([page.waitForNavigation(),auto(page,'prepare')]);
 expect((await auto(page,'awaitList',{before:relisted.before})).state).toBe('fresh');
 expect((await auto(page,'verify')).readbackMatches).toBe(true);
 const again=await auto(page,'inspect');expect(again.changed).toBe(0);
 expect((await auto(page,'commit',{token:again.token})).state).toBe('already');expect(state.saves).toBe(1);
});
test('ambiguous Save stops before filling and rejected server save never counts as verified',async({page})=>{
 const state=await setup(page,{duplicateSave:true});const preview=await list(page);
 const stopped=await auto(page,'commit',{token:preview.token});expect(stopped.ok).toBe(false);expect(state.saves).toBe(0);
 expect(await page.locator('input[value=absent]').isChecked()).toBe(false);
 await page.unrouteAll();const denied=await setup(page,{rejectSave:true});const p=await list(page);
 await Promise.all([page.waitForNavigation(),auto(page,'commit',{token:p.token})]);expect(denied.saves).toBe(1);
 expect((await auto(page,'verify')).readbackMatches).toBe(false);
});
test('login and unfinished asynchronous postback wait without modifying anything',async({page})=>{
 await page.route('https://mebbis.meb.gov.tr/',route=>route.fulfill({contentType:'text/html',body:'<input type=password>'}));await page.goto('https://mebbis.meb.gov.tr/');
 expect((await auto(page,'navigate')).state).toBe('login');
 await setup(page);await page.evaluate(()=>window.Sys={WebForms:{PageRequestManager:{getInstance:()=>({add_endRequest(){},get_isInAsyncPostBack:()=>true})}}});
 expect((await auto(page,'prepare')).state).toBe('waiting');
});
test('native queue requires selected records and native capability; it carries only selected rows',async({page})=>{
 await page.goto('http://127.0.0.1:8765');await expect(page.locator('#splash-screen')).toHaveCount(0);
 await page.locator('#login-email').fill('auto-test@example.invalid');await page.locator('#login-password').fill('test-password');await page.locator('#form-login').getByRole('button',{name:'Giriş Yap',exact:true}).click();
 await page.waitForFunction(()=>Store.ready&&Store.userId);
 await page.evaluate(()=>{
  Store.setSetting('onboardingComplete',true);
  Store.setSetting('customGroups',[{id:'g',name:'A',subject:'COĞRAFYA',day:'Cumartesi',startTime:'09:00',endTime:'09:40',students:[{id:'s',name:'Örnek Kişi',studentNumber:'42',mebbisInstitution:'123456'},{id:'s2',name:'Diğer Kişi',studentNumber:'43',mebbisInstitution:'123456'}],mebbis:{institution:'123456',branch:'A',subject:'COĞRAFYA',period:'Sabah'},lessons:[{id:'Sabah:1',period:'Sabah',order:1,start:'09:00',end:'09:40'}]}]);
  Store.saveLessonAttendance('g','2026-10-17','Sabah:1',[{studentId:'s',status:'absent'},{studentId:'s2',status:'present'}]);
  NativeTransfer.open('2026-10-17');
 });
 await page.locator('#native-transfer-send').click();await expect(page.locator('#native-transfer-status')).toContainText('Android 0.3');
 await page.evaluate(()=>window.BilsemAndroid={version:3});await page.locator('#native-transfer-send').click();
 const request=await page.evaluate(()=>NativeTransfer.takeRequest());expect(request.draft.rows.length).toBe(1);expect(request.draft.rows[0].studentNumber).toBe('42');
 expect(await page.evaluate(()=>NativeTransfer.takeRequest())).toBe(null);
 await page.evaluate(requestId=>NativeTransfer.result({requestId,state:'completed',message:'1 kayıt doğrulandı'}),request.requestId);
 await expect(page.locator('#native-transfer-status')).toHaveText('1 kayıt doğrulandı');
 expect(await page.evaluate(()=>NativeTransfer.pending)).toBe(null);
 await page.evaluate(()=>{
  App.closeModal();AttendancePage.owner=Store.userId;AttendancePage.currentGroupId='g';AttendancePage.currentDate='17.10.2026';AttendancePage.currentLessonId='Sabah:1';AttendancePage.records={s:'absent'};AttendancePage.dirty=true;
  AttendancePage.sendToMebbis();
 });
 expect(await page.evaluate(()=>Store.getLessonAttendance('g','2026-10-17','Sabah:1').records.length)).toBe(1);
 const next=await page.evaluate(()=>NativeTransfer.takeRequest());expect(next.draft.rows.length).toBe(1);

});
test('official teacher tables resolve legacy selections automatically without a file',async({page})=>{
 const headers=a=>`<tr>${a.map(h=>`<th>${h}</th>`).join('')}</tr>`;
 const cells=a=>`<tr>${a.map(v=>`<td>${v}</td>`).join('')}</tr>`;
 const html=`<header>Kurum (765146)</header><table>${headers(['DERS_GÜNÜ','ZAMAN','KAÇINCI_DERS','DERS_SAATLERİ','DERS_ADI','ŞUBE_ADI'])}${cells(['Cumartesi','Sabah','1. Ders','09:00-09:40','COĞRAFYA (2)','Official-A'])}</table><table>${headers(['DERS_ADI','ŞUBE_ADI','ÖĞR_NO','ÖĞR_ADI','ÖĞR_SOYADI'])}${cells(['COĞRAFYA','Official-A','42','Örnek','Öğrenci'])}</table>`;
 await page.route('https://bilsem.meb.gov.tr/test-teacher',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:html}));await page.goto('https://bilsem.meb.gov.tr/test-teacher');
 const selection={format:'bilsem-attendance-selection',version:1,date:'2026-10-17',rows:[{localGroupId:'old',localStudentId:'s',studentName:'Örnek Öğrenci',day:'Cumartesi',subject:'Coğrafya',start:'09:00',end:'09:40',status:'absent'}]};
 const result=await auto(page,'resolve',{draft:selection});expect(result.ok,JSON.stringify(result)).toBe(true);expect(result.state).toBe('resolved');expect(result.resolution.draft.rows[0].studentNumber).toBe('42');
});
