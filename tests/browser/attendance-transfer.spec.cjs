const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const source=fs.readFileSync('android-companion/app/src/main/assets/attendance.js','utf8');
const row=(number,order,checked='',excused='')=>`<tr><td>11111111111</td><td>${number}</td><td>Örnek</td><td>Kişi</td><td>Test-A</td><td>1035 COĞRAFYA (Sabah)</td><td>${order}. Ders</td><td><input type="radio" name="s${number}d${order}" ${checked}></td><td><input type="radio" name="s${number}d${order}" ${excused}></td></tr>`;
const html=(rows=row('42',1)+row('42',2))=>`<html><body><header>Test Kurum (123456)</header><input type="text" value="17/10/2026"><select><option>Sabah</option><option>Akşam</option></select><table><tr>${['TC','ÖĞRENCİ NO','ADI','SOYADI','SINIFI','DERS ADI','DERS SIRASI','GELMEDİ','RAPOR/RESMÎ İZİN'].map(s=>`<th>${s}</th>`).join('')}</tr>${rows}</table><button onclick="window.saved=true">Kaydet</button><input type="checkbox" id="complete"></body></html>`;
const draft=()=>({format:'bilsem-attendance-draft',version:1,date:'2026-10-17',submitted:false,blocked:[],rows:[1,2].map(lessonOrder=>({institution:'123456',date:'2026-10-17',period:'Sabah',branch:'Test-A',subject:'COĞRAFYA',studentNumber:'42',lessonOrder,status:lessonOrder===1?'present':'absent'}))});
async function run(page,request){return page.evaluate(({source,request})=>JSON.parse((0,eval)(`(${source})`)(request)),{source,request});}
async function load(page,markup=html()){
 await page.route('https://bilsem.meb.gov.tr/BLS00048.ASPX',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:markup}));
 await page.goto('https://bilsem.meb.gov.tr/BLS00048.ASPX');
 return run(page,{action:'bind'});
}
test('preview changes nothing; fill touches only matched lessons, never Save or completion; fresh readback matches',async({page})=>{
 await load(page,html(row('42',1,'checked')+row('42',2)+row('99',1,'checked')));
 const d=draft(),preview=await run(page,{action:'preview',draft:d});
 expect(preview.ok,JSON.stringify(preview)).toBe(true);expect(preview.changed).toBe(2);
 expect(await page.locator('input[name=s42d2]').first().isChecked()).toBe(false);
 const applied=await run(page,{action:'apply',draft:d,token:preview.token});expect(applied.ok).toBe(true);expect(applied.submitted).toBe(false);
 expect(await page.locator('input[name=s42d1]').first().isChecked()).toBe(false);
 expect(await page.locator('input[name=s42d2]').first().isChecked()).toBe(true);
 expect(await page.locator('input[name=s99d1]').first().isChecked()).toBe(true);
 expect(await page.locator('#complete').isChecked()).toBe(false);expect(await page.evaluate(()=>window.saved)).toBeUndefined();
 // Simulate a newly loaded server response, rather than treating filled properties as saved.
 await page.unrouteAll();await load(page,html(row('42',1)+row('42',2,'checked')));
 const verified=await run(page,{action:'verify',draft:d});expect(verified.readbackMatches).toBe(true);
});
test('institution, date, period, duplicate and missing row mismatches fail without partial writes',async({page})=>{
 await load(page);
 for(const mutate of [d=>d.rows[0].institution='654321',d=>d.date='2026-10-18',d=>d.rows[1].studentNumber='999',d=>d.rows.push({...d.rows[0]}),d=>d.rows[0].status='late',d=>d.blocked.push({reason:'blocked'})]) {
  const d=draft();mutate(d);const result=await run(page,{action:'preview',draft:d});expect(result.ok).toBe(false);
  expect(await page.locator('input[name=s42d2]').first().isChecked()).toBe(false);
 }
 await page.locator('select').selectOption({label:'Akşam'});
 expect((await run(page,{action:'preview',draft:draft()})).ok).toBe(false);
});
test('stale preview and stale listing are rejected',async({page})=>{
 await load(page);const d=draft(),preview=await run(page,{action:'preview',draft:d});expect(preview.ok,JSON.stringify(preview)).toBe(true);
 await page.locator('input[name=s42d1]').first().check();
 expect((await run(page,{action:'apply',draft:d,token:preview.token})).ok).toBe(false);
 await page.locator('input[type=text]').fill('24/10/2026');const next=draft();next.date='2026-10-24';next.rows.forEach(r=>r.date=next.date);
 expect((await run(page,{action:'preview',draft:next})).ok).toBe(false);
});
test('existing excused records are protected and diagnostic output excludes student details and TC',async({page})=>{
 await load(page,html(row('42',1,'','checked')+row('42',2)));
 const result=await run(page,{action:'preview',draft:draft()});expect(result.ok).toBe(false);expect(result.error).toContain('izin');
 const diag=await run(page,{action:'diagnose'});expect(diag.ok).toBe(true);
 expect(JSON.stringify(diag)).not.toContain('11111111111');expect(JSON.stringify(diag)).not.toContain('Örnek');expect(JSON.stringify(diag)).not.toContain('42');
});
test('ambiguous official rows and unsafe radio group layouts are blocked',async({page})=>{
 await load(page,html(row('42',1)+row('42',1)+row('42',2)));
 expect((await run(page,{action:'preview',draft:draft()})).ok).toBe(false);
});
test('checkbox layout is supported; disabled controls and unrecognized pages are blocked',async({page})=>{
 await load(page,html().replaceAll('type="radio"','type="checkbox"'));
 const d=draft(),p=await run(page,{action:'preview',draft:d});expect(p.ok).toBe(true);
 expect((await run(page,{action:'apply',draft:d,token:p.token})).ok).toBe(true);
 await page.locator('input[name=s42d1]').first().evaluate(e=>e.disabled=true);
 expect((await run(page,{action:'preview',draft:d})).ok).toBe(false);
 await page.goto('about:blank');expect((await run(page,{action:'preview',draft:d})).ok).toBe(false);
});
test('other day periods remain pending and mismatching readback is reported',async({page})=>{
 await load(page);const d=draft();d.rows.push({...d.rows[0],period:'Akşam'});
 const p=await run(page,{action:'preview',draft:d});expect(p.ok).toBe(true);expect(p.otherPeriods).toBe(1);expect(p.summary.length).toBe(2);
 const v=await run(page,{action:'verify',draft:d});expect(v.readbackMatches).toBe(false);expect(v.differences.length).toBe(1);
});
