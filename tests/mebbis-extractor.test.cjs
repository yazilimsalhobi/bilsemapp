const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const script=fs.readFileSync('android-companion/app/src/main/assets/extract.js','utf8');
function table(lines,visible=true){
 const t={getClientRects:()=>visible?[1]:[]};
 t.rows=lines.map(values=>({cells:values.map(innerText=>({innerText})),closest:()=>t,getClientRects:()=>[1]}));return t;
}
function extract(tables){return JSON.parse(vm.runInNewContext(script,{document:{querySelectorAll:()=>tables}}));}
test('Turkish program headers, lesson order and period survive extraction',()=>{
 const r=extract([table([['DERS_GÜNÜ','ZAMAN','KAÇINCI_DERS','DERS_SAATLERİ','DERS_ADI','ŞUBE_ADI'],['Cumartesi','Öğle','2. Ders','13:20-14:00','COĞRAFYA (2)','Ö1/6-MAT-Ö1']])]);
 assert.equal(r.schedule.length,1);assert.equal(r.schedule[0].period,'Öğle');assert.equal(r.schedule[0].lessonOrder,'2. Ders');
});
test('only allowlisted student columns are exported, hidden tables ignored',()=>{
 const rows=[['DERS_ADI','ŞUBE_ADI','ÖĞR_NO','ÖĞR_ADI','ÖĞR_SOYADI','TC'],['Coğrafya','B2','42','Örnek','Öğrenci','sensitive']];
 const r=extract([table(rows),table(rows,false)]);
 assert.equal(r.students.length,1);assert.equal(r.students[0].studentNumber,'42');assert.ok(!JSON.stringify(r).includes('sensitive'));
});
test('unrecognized and incomplete tables produce no records',()=>{
 assert.equal(extract([table([['Şifre'],['secret']])]).students.length,0);
 assert.equal(extract([table([['DERS_ADI','ŞUBE_ADI','OGR_NO','OGR_ADI','OGR_SOYADI'],['C','B','','X','Y']])]).students.length,0);
});
