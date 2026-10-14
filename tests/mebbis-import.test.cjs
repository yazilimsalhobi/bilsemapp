const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'), fs=require('node:fs');
const {webcrypto}=require('node:crypto');
function env(shared=new Map(),cloud={}) {
 const context=vm.createContext({console,crypto:webcrypto,structuredClone,Date,setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>shared.get(k)||null,setItem:(k,v)=>shared.set(k,v),removeItem:k=>shared.delete(k)},window:{supabaseClient:{from(){return {select(){return this;},eq(_,id){this.id=id;return this;},async maybeSingle(){return {data:cloud[this.id]?{payload:cloud[this.id]}:null};},async upsert(row){cloud[row.user_id]=structuredClone(row.payload);return {};}}}}}});
 for(const path of ['js/ui.js','js/data.js','js/store.js','js/importers.js','js/mebbis.js']) vm.runInContext(fs.readFileSync(path,'utf8'),context);
 vm.runInContext('const Auth={user:{id:"a"},getCurrentUser(){return this.user;}};',context);
 return {...vm.runInContext('({Mebbis,Store,BILSEM_DATA,Auth})',context),shared,cloud};
}
function fixture(){return {format:'bilsem-companion',version:1,schedule:[
 {day:'Cumartesi',period:'Sabah',lessonOrder:'1. Ders',time:'09:00-09:40',subject:'COĞRAFYA (2)',branch:'Ö1/A'},
 {day:'Cumartesi',period:'Sabah',lessonOrder:'2. Ders',time:'09:50-10:30',subject:'COĞRAFYA (2)',branch:'Ö1/A'},
 {day:'Cumartesi',period:'Öğle',lessonOrder:'1. Ders',time:'12:30-13:10',subject:'COĞRAFYA (2)',branch:'Ö1/B'}],students:[
 {subject:'COĞRAFYA',branch:'Ö1/A',studentNumber:'10',firstName:'Örnek',lastName:'Öğrenci'},
 {subject:'COĞRAFYA',branch:'Ö1/B',studentNumber:'11',firstName:'Deneme',lastName:'Kişi'}]};}
test('companion JSON preserves period, official order and student number; reimport is idempotent',()=>{
 const {Mebbis}=env();const parsed=Mebbis.parse(fixture(),'123456');
 assert.equal(parsed.groups.length,2);assert.equal(parsed.lessonCount,3);assert.equal(parsed.studentCount,2);
 assert.equal(parsed.groups[0].lessons[1].order,2);
 const first=Mebbis.plan(parsed,[]);const second=Mebbis.plan(Mebbis.parse(fixture(),'123456'),first.groups);
 assert.equal(second.groups.length,2);assert.equal(second.groups[0].id,first.groups[0].id);
 assert.equal(second.groups[0].students[0].id,first.groups[0].students[0].id);
 assert.equal(second.groups[0].lessons.length,2);
});
test('legacy IDs, notes, unrelated groups and unmatched students survive reviewed merge',()=>{
 const {Mebbis}=env();const parsed=Mebbis.parse(fixture(),'123456');
 const old={id:'legacy-group',name:'Ö1/A',subject:'Coğrafya',day:'Cumartesi',lessons:[{order:1,start:'08:00',end:'10:00'}],students:[{id:'old-student',name:'Örnek Öğrenci',note:'keep'},{id:'extra',name:'Eski Öğrenci'}]};
 const result=Mebbis.plan(parsed,[old,{...old,id:'unrelated',name:'Başka'}]);
 assert.equal(result.groups.length,3);assert.equal(result.groups[0].id,'legacy-group');
 assert.equal(result.groups[0].students[0].id,'old-student');assert.equal(result.groups[0].students[0].note,'keep');
 assert.equal(result.groups[0].students[0].studentNumber,'10');assert.equal(result.groups[0].students.length,2);
 assert.equal(result.groups[1].name,'Başka');assert.equal(old.students[0].studentNumber,undefined);
});
test('invalid schema, incomplete rosters, conflicting identity and conflicting times are blocked',()=>{
 const {Mebbis}=env(); assert.throws(()=>Mebbis.parse({format:'other'},'123456'));
 assert.throws(()=>Mebbis.parse(fixture(),''));
 const missing=fixture();missing.students.pop();assert.throws(()=>Mebbis.parse(missing,'123456'),/listesi olmayan/);
 const conflict=fixture();conflict.students[1].studentNumber='10';assert.throws(()=>Mebbis.parse(conflict,'123456'),/farklı isimler/);
 const times=fixture();times.schedule.push({...times.schedule[0],time:'10:00-10:40'});assert.throws(()=>Mebbis.parse(times,'123456'),/farklı saatler/);
 const unknown=fixture();unknown.students[0].branch='Not scheduled';assert.throws(()=>Mebbis.parse(unknown,'123456'),/eşleşmeyen/);
});
test('institutions stay separate and ambiguous name matches cannot silently merge',()=>{
 const {Mebbis}=env();const a=Mebbis.plan(Mebbis.parse(fixture(),'123456'),[]);
 const b=Mebbis.plan(Mebbis.parse(fixture(),'654321'),a.groups);assert.equal(b.groups.length,4);
 const parsed=Mebbis.parse(fixture(),'123456');
 const old={id:'g',name:'Ö1/A',subject:'COĞRAFYA',day:'Cumartesi',lessons:[],students:[{id:'one',name:'Örnek Öğrenci'},{id:'two',name:'Örnek Öğrenci'}]};
 assert.throws(()=>Mebbis.plan(parsed,[old]),/Aynı isimli/);
 assert.throws(()=>Mebbis.plan(parsed,[{...old,students:[]},{...old,id:'g2',students:[]}]),/Birden fazla/);
});
test('lesson registers are isolated by date, group and period; old daily records remain intact',async()=>{
 const h=env();await h.Store.loadAllFromSupabase();const groups=h.Mebbis.plan(h.Mebbis.parse(fixture(),'123456'),[]).groups;
 h.Store.setSetting('customGroups',groups);const g=groups[0],studentId=g.students[0].id;
 await h.Store.saveAttendance(g.id,'17.10.2026',[{studentId,status:'absent'}]);
 assert.equal(h.Store.getLessonAttendance(g.id,'2026-10-17',g.lessons[0].id),null);
 assert.equal(h.Store.saveLessonAttendance(g.id,'2026-10-17',g.lessons[0].id,[{studentId,status:'present'}]),true);
 h.Store.saveLessonAttendance(g.id,'17.10.2026',g.lessons[1].id,[{studentId,status:'absent'}]);
 assert.equal(h.Store.getLessonAttendance(g.id,'2026-10-17',g.lessons[0].id).records[0].status,'present');
 assert.equal(h.Store.getLessonAttendance(g.id,'2026-10-17',g.lessons[1].id).records[0].status,'absent');
 assert.equal(h.Store.getAttendance(g.id,'17.10.2026').records[0].status,'absent');
 assert.equal(h.Store.getOverallStats().totalSessions,2);assert.equal(h.Store.getAttendanceStats(g.id)[studentId].rate,50);
 assert.throws(()=>h.Store.saveLessonAttendance(g.id,'2026-10-18',g.lessons[0].id,[{studentId,status:'present'}]),/ders günü/);
 assert.throws(()=>h.Store.saveLessonAttendance(g.id,'2026-10-17',g.lessons[0].id,[{studentId:'foreign',status:'present'}]));
 assert.equal(h.Store.getLessonAttendance(g.id,'2026-10-24',g.lessons[0].id),null);
});
test('new records sync and backup/restore, survive second device and stay private between accounts',async()=>{
 const cloud={},h=env(new Map(),cloud);await h.Store.loadAllFromSupabase();
 const groups=h.Mebbis.plan(h.Mebbis.parse(fixture(),'123456'),[]).groups;h.Store.setSetting('customGroups',groups);
 const g=groups[0];h.Store.saveLessonAttendance(g.id,'2026-10-17',g.lessons[0].id,[{studentId:g.students[0].id,status:'absent'}]);
 await h.Store.syncNow();const second=env(new Map(),cloud);await second.Store.loadAllFromSupabase();
 assert.equal(second.Store.getLessonAttendance(g.id,'2026-10-17',g.lessons[0].id).records[0].status,'absent');
 const backup=h.Store.exportAll();h.Store.clearAll();h.Store.importAll(backup);assert.equal(h.Store.getOverallStats().totalSessions,1);
 h.Auth.user={id:'b'};await h.Store.loadAllFromSupabase();assert.equal(h.Store.getOverallStats().totalSessions,0);
 assert.equal(h.Store.getSetting('customGroups',[]).length,0);
});
test('transfer drafts never label themselves submitted; late and excused statuses are blocked',async()=>{
 const h=env();await h.Store.loadAllFromSupabase();const groups=h.Mebbis.plan(h.Mebbis.parse(fixture(),'123456'),[]).groups;
 h.Store.setSetting('customGroups',groups);const g=groups[0];
 h.Store.saveLessonAttendance(g.id,'2026-10-17',g.lessons[0].id,[{studentId:g.students[0].id,status:'late'}]);
 let draft=h.Store.lessonTransferDraft('17.10.2026');assert.equal(draft.rows.length,0);assert.equal(draft.blocked.length,1);assert.equal(draft.submitted,false);
 h.Store.saveLessonAttendance(g.id,'2026-10-17',g.lessons[0].id,[{studentId:g.students[0].id,status:'absent'}]);
 draft=h.Store.lessonTransferDraft('2026-10-17');assert.equal(draft.rows[0].lessonOrder,1);assert.equal(draft.rows[0].period,'Sabah');assert.equal(draft.rows[0].studentNumber,'10');
});
test('duplicate official rows are blocked instead of generating conflicting transfer instructions',async()=>{
 const h=env();await h.Store.loadAllFromSupabase();const groups=h.Mebbis.plan(h.Mebbis.parse(fixture(),'123456'),[]).groups;
 const first=groups[0],duplicate={...structuredClone(first),id:'duplicate-group'};
 h.Store.setSetting('customGroups',[...groups,duplicate]);
 for(const group of [first,duplicate]) h.Store.saveLessonAttendance(group.id,'2026-10-17',group.lessons[0].id,[{studentId:group.students[0].id,status:group===first?'present':'absent'}]);
 const draft=h.Store.lessonTransferDraft('2026-10-17');assert.equal(draft.rows.length,0);assert.equal(draft.blocked.length,1);
});
test('overlapping retained source lessons cannot be merged',()=>{
 const {Mebbis}=env();const parsed=Mebbis.parse(fixture(),'123456');const first=Mebbis.plan(parsed,[]).groups;
 first[0].lessons.push({id:'Sabah:3',order:3,period:'Sabah',start:'09:20',end:'10:00'});
 assert.throws(()=>Mebbis.plan(parsed,first),/çakışıyor/);
});
