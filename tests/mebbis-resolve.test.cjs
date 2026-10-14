const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const resolve=vm.runInNewContext(fs.readFileSync('android-companion/app/src/main/assets/resolve-selection.js','utf8'));
const selection=()=>({format:'bilsem-attendance-selection',version:1,date:'2026-10-17',rows:[{localGroupId:'old',localStudentId:'student',studentName:'Örnek Öğrenci',day:'Cumartesi',subject:'Coğrafya',start:'09:00',end:'09:40',status:'absent'}]});
const program=()=>({format:'bilsem-companion',version:1,schedule:[{day:'Cumartesi',period:'Sabah',lessonOrder:'1. Ders',time:'09:00-09:40',subject:'COĞRAFYA (2)',branch:'Official-A'}],students:[{branch:'Official-A',subject:'COĞRAFYA',studentNumber:'42',firstName:'Örnek',lastName:'Öğrenci'}]});
test('legacy selection resolves only by unique student, course, weekday and exact lesson time',()=>{
 const r=resolve(selection(),program(),'765146');assert.equal(r.draft.rows[0].studentNumber,'42');assert.equal(r.draft.rows[0].lessonOrder,1);assert.equal(r.draft.rows[0].localStudentId,'student');assert.equal(r.targets[0].localGroupId,'old');assert.equal(r.draft.submitted,false);
});
test('wrong institution, weekday, lesson time and duplicate name cannot silently resolve',()=>{
 assert.throws(()=>resolve(selection(),program(),'123456'));
 const wrongDay=selection();wrongDay.date='2026-10-18';assert.throws(()=>resolve(wrongDay,program(),'765146'));
 const wrongTime=selection();wrongTime.rows[0].start='10:00';assert.throws(()=>resolve(wrongTime,program(),'765146'));
 const duplicates=program();duplicates.students.push({...duplicates.students[0],studentNumber:'43'});assert.throws(()=>resolve(selection(),duplicates,'765146'));
});
test('duplicate official rows and a local group spanning different official branches are blocked',()=>{
 const duplicate=selection();duplicate.rows.push({...duplicate.rows[0]});assert.throws(()=>resolve(duplicate,program(),'765146'));
 const s=selection(),p=program();s.rows.push({...s.rows[0],start:'09:50',end:'10:30'});p.schedule.push({...p.schedule[0],time:'09:50-10:30',lessonOrder:'2. Ders',branch:'Official-B'});p.students.push({...p.students[0],branch:'Official-B'});assert.throws(()=>resolve(s,p,'765146'));
});
