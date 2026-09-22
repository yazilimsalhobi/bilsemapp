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
 const h=env();const groups=h.ImportParsers.schedule('PAZARTESİ\n09:00 - 10:30\n09:00 - 09:40 (1. Ders)\n09:50 - 10:30 (2. Ders)\nBYF 1-A\nMatematik\n■Örnek Öğrenci\n■Deneme Öğrenci\nSALI\n10:00 - 10:40\nGrup: B\nCoğrafya\n•Test Öğrenci');
 assert.equal(groups.length,2);assert.equal(groups[0].day,'Pazartesi');assert.equal(groups[0].students.length,2);assert.equal(groups[0].lessons.length,2);assert.equal(groups[1].name,'B');
});
test('structured program table merges student rows for same group',()=>{
 const h=env();const groups=h.ImportParsers.schedule('Gün\tGrup\tSaat\tDers\tÖğrenci\nPazartesi\tA\t09:00 - 10:00\tMatematik\tÖrnek Bir\nPazartesi\tA\t09:00 - 10:00\tMatematik\tÖrnek İki');
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
