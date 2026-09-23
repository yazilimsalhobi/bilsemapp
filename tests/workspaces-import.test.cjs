const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'), fs=require('node:fs'), path=require('node:path');
const {webcrypto}=require('node:crypto');
function env(shared=new Map(), cloud={}) {
 const timers=new Map();let timer=0;
 const c=vm.createContext({console,crypto:webcrypto,structuredClone,Date,
  setTimeout(fn){timers.set(++timer,fn);return timer;}, clearTimeout(id){timers.delete(id);},
  localStorage:{getItem:k=>shared.get(k)||null,setItem:(k,v)=>shared.set(k,v),removeItem:k=>shared.delete(k)},
  window:{supabaseClient:{from(table){assert.equal(table,'user_workspaces');return {select(){return this;},eq(_,id){this.id=id;return this;},async maybeSingle(){return {data:cloud[this.id]?{payload:cloud[this.id]}:null};},async upsert(row){cloud[row.user_id]=structuredClone(row.payload);return {};}};}}}
 });
 for(const file of ['js/ui.js','js/data.js','js/store.js','js/importers.js','js/pages/annual_plan.js','js/dashboard.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),c);
 vm.runInContext('const Auth={currentUser:null,getCurrentUser(){return this.currentUser;}};',c);
 return {...vm.runInContext('({Store,Auth,UI,ImportParsers,AnnualPlans,Dashboard,BILSEM_DATA})',c), shared,cloud,c};
}
test('new users have no bundled school, student or schedule data',()=>{
 const h=env();assert.equal(h.BILSEM_DATA.groups.length,0);assert.equal(h.BILSEM_DATA.school.teacher,'');
});
test('two accounts on one device cannot see one another’s records or dashboard',async()=>{
 const h=env();h.shared.set('bilsem_settings',JSON.stringify({customGroups:[{name:'Legacy admin'}]}));
 h.Auth.currentUser={id:'alice'};await h.Store.loadAllFromSupabase();assert.equal(h.BILSEM_DATA.groups.length,0);
 h.Store.setSetting('schoolInfo',{teacher:'Alice'});h.Store.setSetting('dashboard',{metrics:[{id:'students',visible:false}]});
 h.Store.saveTodo('Alice reminder');await h.Store.syncNow();
 h.Auth.currentUser={id:'bob'};await h.Store.loadAllFromSupabase();assert.equal(h.Store.getTodos().length,0);assert.equal(h.BILSEM_DATA.school.teacher,'');assert.equal(h.Dashboard.config('metrics')[0].visible,true);
 h.Store.saveTodo('Bob reminder');await h.Store.syncNow();
 h.Auth.currentUser={id:'alice'};await h.Store.loadAllFromSupabase();assert.equal(h.Store.getTodos()[0].text,'Alice reminder');assert.equal(h.Dashboard.config('metrics')[0].visible,false);
 h.Store.clearAll();assert.ok(h.shared.has('bilsem_user:bob:bilsem_todos'));
});
test('workspace is restored on a second device with group lessons and plans',async()=>{
 const cloud={}, a=env(new Map(),cloud);a.Auth.currentUser={id:'alice'};await a.Store.loadAllFromSupabase();
 a.Store.setSetting('customGroups',[{id:'g',name:'A',day:'Pazartesi',dayIndex:1,lessons:[{start:'09:00',end:'09:40'}],students:[]}]);
 a.Store._set(a.Store.KEYS.ANNUAL_PLANS,[{groupId:'g',start:'2026-09-21',end:'2026-09-27',topic:'Maps'}]);await a.Store.syncNow();
 const b=env(new Map(),cloud);b.Auth.currentUser={id:'alice'};await b.Store.loadAllFromSupabase();assert.equal(b.BILSEM_DATA.groups[0].lessons.length,1);assert.equal(b.AnnualPlans.outcome('g','2026-09-22'),'Maps');
});
test('offline local edits survive older cloud data',async()=>{
 const h=env();h.Auth.currentUser={id:'alice'};await h.Store.loadAllFromSupabase();h.Store.saveTodo('offline');h.Store.resetUser();
 h.cloud.alice={bilsem_todos:[]};await h.Store.loadAllFromSupabase();assert.equal(h.Store.getTodos()[0].text,'offline');
});
test('program parser reads Turkish days, lesson blocks and student bullets',()=>{
 const h=env();const groups=h.ImportParsers.schedule('PAZARTESİ\n09:00 - 10:30\n09:00 - 09:40 (1. Ders)\n09:50 - 10:30 (2. Ders)\nBYF 1-A\nMatematik\n■Örnek Öğrenci\n■Deneme Öğrenci\nSALI\n10:00 - 10:40\nGrup: B\nCoğrafya\n•Test Öğrenci').groups;
 assert.equal(groups.length,2);assert.equal(groups[0].day,'Pazartesi');assert.equal(groups[0].students.length,2);assert.equal(groups[0].lessons.length,2);assert.equal(groups[1].name,'B');
});
test('structured program table merges student rows for same group',()=>{
 const h=env();const groups=h.ImportParsers.schedule('Gün\tGrup\tSaat\tDers\tÖğrenci\nPazartesi\tA\t09:00 - 10:00\tMatematik\tÖrnek Bir\nPazartesi\tA\t09:00 - 10:00\tMatematik\tÖrnek İki').groups;
 assert.equal(groups.length,1);assert.equal(groups[0].students.length,2);
});
test('annual plan maps explicit date ranges and preserves learning outcomes',()=>{
 const h=env();const plans=h.ImportParsers.annual([['Hafta','Tarih','Kazanımlar'],['1','21.09.2026 - 27.09.2026','Harita okur.'],['2','28.09.2026 - 04.10.2026','Yön bulur.']],{year:2026});
 assert.equal(plans.length,2);assert.equal(plans[1].end,'2026-10-04');assert.equal(plans[0].topic,'Harita okur.');
});
test('undated weeks require explicit start date, missing dates are not fabricated',()=>{
 const h=env();const rows=[['Hafta','Kazanım'],['1','Harita'],['3','Yön']];
 assert.equal(h.ImportParsers.annual(rows,{year:2026})[0].start,'');
 const plans=h.ImportParsers.annual(rows,{year:2026,firstWeek:'2026-12-28'});assert.equal(plans[1].start,'2027-01-11');assert.equal(plans[1].end,'2027-01-17');
});
test('plan matching is inclusive and scoped to the exact group',async()=>{
 const h=env();h.Auth.currentUser={id:'alice'};await h.Store.loadAllFromSupabase();h.Store._set(h.Store.KEYS.ANNUAL_PLANS,[{groupId:'a',start:'2026-09-21',end:'2026-09-27',topic:'A'},{groupId:'b',start:'2026-09-21',end:'2026-09-27',topic:'B'}]);
 assert.equal(h.AnnualPlans.outcome('a','2026-09-27'),'A');assert.equal(h.AnnualPlans.outcome('a','2026-09-28'),'');
 assert.deepEqual(Array.from(h.AnnualPlans.lessonDates({start:'2026-09-21',end:'2026-09-27'},{dayIndex:2})),['2026-09-22']);
});
test('invalid dates and times are rejected; imported HTML is escaped',()=>{
 const h=env();assert.equal(h.ImportParsers.isoDate('31.02.2026'),'');assert.equal(h.ImportParsers.time('25:00'),'');assert.equal(h.ImportParsers.isoDate('29.02.2028'),'2028-02-29');assert.equal(h.UI.escape('<img onerror="bad">'),'&lt;img onerror=&quot;bad&quot;&gt;');
});
test('Turkish month ranges cross months and academic years correctly',()=>{
 const h=env();assert.equal(h.ImportParsers.dateRange('28 Eylül - 2 Ekim',2026).end,'2026-10-02');assert.equal(h.ImportParsers.dateRange('4-8 Ocak',2026).start,'2027-01-04');assert.equal(h.ImportParsers.dateRange('28.12 - 03.01',2026).end,'2027-01-03');
});
test('ders_programi.txt full parse finds all groups with students and timeSlots',()=>{
 const h=env();const text=fs.readFileSync(path.join(__dirname,'..','ders_programi.txt'),'utf8');
 const groups=h.ImportParsers.schedule(text).groups;
 // Should find at least 9 groups across SALI, ÇARŞAMBA, PERŞEMBE, CUMA, CUMARTESİ
 assert.ok(groups.length>=9,`Expected >=9 groups, got ${groups.length}`);
 // Check days are detected
 const days=new Set(groups.map(g=>g.day));
 assert.ok(days.has('Salı'),'should find Salı');
 assert.ok(days.has('Çarşamba'),'should find Çarşamba');
 assert.ok(days.has('Perşembe'),'should find Perşembe');
 assert.ok(days.has('Cuma'),'should find Cuma');
 assert.ok(days.has('Cumartesi'),'should find Cumartesi');
 // All groups should have at least 1 student
 for(const g of groups) assert.ok(g.students.length>=1,`${g.name} should have students, got ${g.students.length}`);
 // Total students across all groups should be reasonable (>30)
 const totalStudents=groups.reduce((s,g)=>s+g.students.length,0);
 assert.ok(totalStudents>=30,`Expected >=30 total students, got ${totalStudents}`);
 // BYF-2 D group should exist on Salı with specific students
 const byf2d=groups.find(g=>g.name.includes('BYF-2 D')&&g.day==='Salı');
 assert.ok(byf2d,'BYF-2 D on Salı should exist');
 assert.ok(byf2d.students.length>=4,`BYF-2 D should have >=4 students, got ${byf2d.students.length}`);
 // Subjects should be detected
 const subjects=new Set(groups.map(g=>g.subject).filter(Boolean));
 assert.ok(subjects.size>=1,`should detect at least 1 subject, got ${subjects.size}`);
 // TimeSlot should be captured for at least some groups
 const withSlot=groups.filter(g=>g.timeSlot);
 assert.ok(withSlot.length>=1,`should have timeSlot on some groups, got ${withSlot.length}`);
});
test('branch filtering keeps only selected subjects',()=>{
 const h=env();const groups=h.ImportParsers.schedule('PAZARTESİ\n09:00 - 10:00\nBYF 1-A\nMatematik\n■A Öğrenci\nSALI\n10:00 - 11:00\nBYF 1-B\nCoğrafya\n■B Öğrenci\nÇARŞAMBA\n11:00 - 12:00\nBYF 1-C\nMatematik\n■C Öğrenci').groups;
 assert.equal(groups.length,3);
 const coğrafya=groups.filter(g=>g.subject.toLowerCase().includes('coğrafya'));
 assert.equal(coğrafya.length,1);
 assert.equal(coğrafya[0].name,'BYF 1-B');
 const matematik=groups.filter(g=>g.subject.toLowerCase().includes('matematik'));
 assert.equal(matematik.length,2);
});
test('annual plan recognizes etkinlik and icerik column headers',()=>{
 const h=env();const plans=h.ImportParsers.annual([['Hafta','Süre','Etkinlik'],['1','1 hafta','Harita çizimi'],['2','1 hafta','Yön bulma']],{year:2026,firstWeek:'2026-09-21'});
 assert.equal(plans.length,2);assert.equal(plans[0].topic,'Harita çizimi');assert.equal(plans[1].topic,'Yön bulma');
});
test('matrix schedule parser extracts side-by-side groups with days and students',()=>{
 const h=env();
 const matrixText = `DESTEK 1-B (H-S)\tDESTEK 1-A (H_İ)
Saat\tCUMARTESİ\tSınıf\tÖğrenci Listesi\tSaat\tÇARŞAMBA\tCUMA\tSınıf\tÖğrenci Listesi
09:00-09:40\tİNGİLİZCE\t4\t1\tBEYZA BEBEK Z-R\t16:15-16:55\tBİLİŞİM TEKN.\tDESTEK EĞİTİMİ\t2\t1\tALİ YAHYA İNAN
09:50-10:30\tİNGİLİZCE\t4\t2\tZEYNEP ÇAKIR\t17:05-17:45\tBİLİŞİM TEKN.\tDESTEK EĞİTİMİ\t2\t2\tGÖKÇE DURU KEÇECİ`;
 const parsed = h.ImportParsers.schedule(matrixText);
 assert.equal(parsed.type, 'groups');
 const groups = parsed.groups;
 assert.strictEqual(groups.length, 3, 'Should find 3 groups');
 assert.strictEqual(groups[0].name, 'DESTEK 1-B (H-S)');
 assert.strictEqual(groups[0].day, 'Cumartesi');
 assert.strictEqual(groups[0].students.length, 2);
 
 assert.strictEqual(groups[1].name, 'DESTEK 1-A (H_İ)');
 assert.strictEqual(groups[1].day, 'Çarşamba');
 assert.strictEqual(groups[1].subject, 'Bilişim Tekn.');
 assert.strictEqual(groups[1].students.length, 2);

 assert.strictEqual(groups[2].name, 'DESTEK 1-A (H_İ)');
 assert.strictEqual(groups[2].day, 'Cuma');
 assert.strictEqual(groups[2].subject, 'Destek Eğitimi');
 assert.strictEqual(groups[2].students.length, 2);
});
test('timesheet parser extracts time blocks from Zaman Çizelgesi',()=>{
 const h=env();
 const timesheetText = `FATSA BİLİM VE SANAT MERKEZİ GÜNLÜK ZAMAN ÇİZELGESİ
HAFTAİÇİ GRUP (AKŞAM)
SÜRE\tBAŞLAMA SAATİ\tBİTİŞ SAATİ\tÇALIŞMA ALANI
40\t16:15\t16:55\t1. Ders
10\t16:55\t17:05\tDinlenme
40\t17:05\t17:45\t2. Ders`;
 const parsed = h.ImportParsers.schedule(timesheetText);
 assert.equal(parsed.type, 'timesheet');
 assert.equal(parsed.times.length, 3);
 assert.equal(parsed.times[0].start, '16:15');
 assert.equal(parsed.times[0].end, '16:55');
 assert.equal(parsed.times[2].start, '17:05');
 assert.equal(parsed.times[2].end, '17:45');
});
