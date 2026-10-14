const {test,expect}=require('@playwright/test');
const sample={format:'bilsem-companion',version:1,schedule:[
 {day:'Cumartesi',period:'Sabah',lessonOrder:'1. Ders',time:'09:00-09:40',subject:'COĞRAFYA (2)',branch:'Test-A'},
 {day:'Cumartesi',period:'Sabah',lessonOrder:'2. Ders',time:'09:50-10:30',subject:'COĞRAFYA (2)',branch:'Test-A'}
],students:[{subject:'COĞRAFYA',branch:'Test-A',studentNumber:'42',firstName:'Örnek',lastName:'Öğrenci'}]};
async function login(page) {
 await page.goto('http://127.0.0.1:8765');
 await expect(page.locator('#splash-screen')).toHaveCount(0);
 await page.locator('#login-email').fill('mebbis-test@example.invalid');await page.locator('#login-password').fill('test-password');
 await page.locator('#form-login').getByRole('button',{name:'Giriş Yap',exact:true}).click();
 await page.waitForFunction(()=>Store.ready && Store.userId);
 await page.evaluate(()=>{Store.setSetting('onboardingComplete',true);Router.go('mebbis');});
 await page.locator('#mebbis-program-tools summary').click();
}
async function upload(page) {
 await page.locator('#mebbis-file').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))});
 await expect(page.locator('#mebbis-status')).toContainText('1 grup · 2 ders saati · 1 farklı öğrenci');
}
test('Android-sized import preview, repeated import, per-lesson register and reload',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login(page);await upload(page);
 expect(await page.evaluate(()=>BILSEM_DATA.groups.length)).toBe(0);
 await page.locator('#mebbis-save').click();await expect(page.locator('#mebbis-status')).toContainText('onay kutusunu');
 await page.locator('#mebbis-confirm').check();await page.locator('#mebbis-save').click();
 await expect(page.locator('#mebbis-status')).toContainText('kaydedildi');
 await upload(page);await page.locator('#mebbis-confirm').check();await page.locator('#mebbis-save').click();await expect(page.locator('#mebbis-status')).toContainText('kaydedildi');
 expect(await page.evaluate(()=>BILSEM_DATA.groups.length)).toBe(1);
 await page.evaluate(()=>Router.go('attendance',BILSEM_DATA.groups[0].id));
 await page.locator('#attendance-date').fill('2026-10-17');await page.locator('#attendance-date').dispatchEvent('change');
 await page.getByRole('button',{name:'✅ Hepsi Geldi',exact:true}).click();await page.locator('#save-local-attendance-btn').click();
 await page.locator('#attendance-lesson').selectOption('Sabah:2');
 await page.getByRole('button',{name:'❌ Hepsi Gelmedi',exact:true}).click();await page.locator('#save-local-attendance-btn').click();
 await page.locator('#attendance-lesson').selectOption('Sabah:1');
 await expect(page.locator('.attendance-btn.selected-present')).toHaveCount(1);
 await page.reload();await expect(page.locator('#splash-screen')).toHaveCount(0);await page.locator('#attendance-date').fill('2026-10-17');await page.locator('#attendance-date').dispatchEvent('change');
 await expect(page.locator('.attendance-btn.selected-present')).toHaveCount(1);
 await page.locator('#attendance-lesson').selectOption('Sabah:2');await expect(page.locator('.attendance-btn.selected-absent')).toHaveCount(1);
 const summary=await page.evaluate(()=>({sessions:Store.getOverallStats().totalSessions,progress:Store.getLessonAttendanceProgress(BILSEM_DATA.groups[0].id,'2026-10-17'),draft:Store.lessonTransferDraft('2026-10-17')}));
 expect(summary.sessions).toBe(2);expect(summary.progress).toEqual({completed:2,total:2});expect(summary.draft.rows.map(r=>r.status)).toEqual(['present','absent']);
 await page.screenshot({path:'test-results/mebbis-mobile.png',fullPage:true});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});
test('invalid JSON never changes the current workspace',async({page})=>{
 await login(page);
 await page.locator('#mebbis-file').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{"format":"wrong"}')});
 await expect(page.locator('#mebbis-status')).toContainText('BİLSEM Yardımcı');
 expect(await page.evaluate(()=>BILSEM_DATA.groups.length)).toBe(0);
 await expect(page.locator('#mebbis-save')).toHaveCount(0);
});
test('first-time setup can enter companion import without an existing schedule',async({page})=>{
 await page.goto('http://127.0.0.1:8765');
 await expect(page.locator('#splash-screen')).toHaveCount(0);
 await page.locator('#login-email').fill('new-user@example.invalid');await page.locator('#login-password').fill('test-password');
 await page.locator('#form-login').getByRole('button',{name:'Giriş Yap',exact:true}).click();
 await page.locator('#setup-teacher').fill('Test Öğretmen');await page.locator('#setup-school').fill('Test Kurum');
 await page.locator('#setup-dept').fill('Coğrafya');await page.locator('#setup-year').fill('2026-2027');
 await page.locator('#setup-form button[type=submit]').click();
 await page.getByRole('button',{name:'Android BİLSEM JSON dosyasını aktar'}).click();
 await expect(page.locator('#mebbis-institution')).toHaveCount(0);
 await page.locator('#mebbis-program-tools summary').click();await upload(page);
 expect(await page.evaluate(()=>Store.getSetting('onboardingComplete',false))).toBe(false);
});
