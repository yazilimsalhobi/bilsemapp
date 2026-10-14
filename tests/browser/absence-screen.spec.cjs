const {test,expect}=require('@playwright/test');
async function setup(page,linked){
 await page.goto('http://127.0.0.1:8765');await expect(page.locator('#splash-screen')).toHaveCount(0);
 await page.locator('#login-email').fill('absence-screen@example.invalid');await page.locator('#login-password').fill('test-password');await page.locator('#form-login').getByRole('button',{name:'Giriş Yap',exact:true}).click();
 await page.waitForFunction(()=>Store.ready&&Store.userId);
 await page.evaluate(linked=>{
  Store.setSetting('onboardingComplete',true);
  Store.setSetting('customGroups',[{id:'g',name:'A',subject:'COĞRAFYA',day:'Cumartesi',startTime:'09:00',endTime:'10:30',students:[{id:'s1',name:'Örnek Öğrenci',...(linked?{studentNumber:'42',mebbisInstitution:'123456'}:{})},{id:'s2',name:'Diğer Öğrenci',...(linked?{studentNumber:'43',mebbisInstitution:'123456'}:{})}],...(linked?{mebbis:{institution:'123456',branch:'A',subject:'COĞRAFYA',period:'Sabah'}}:{}),lessons:[{...(linked?{id:'Sabah:1',period:'Sabah'}:{}),order:1,start:'09:00',end:'09:40'},{...(linked?{id:'Sabah:2',period:'Sabah'}:{}),order:2,start:'09:50',end:'10:30'}]}]);
  Router.go('home');
 },linked);
 await page.getByRole('link',{name:'Devamsızlıkları seç → MEBBİS’e işle'}).click();
 await expect(page.getByRole('heading',{name:'Devamsızlıkları seç'})).toBeVisible();
 await page.locator('#absence-date').fill('2026-10-17');await page.locator('#absence-date').dispatchEvent('change');
}
test('selection screen is visible for legacy groups and retains choices while explaining missing mapping',async({page})=>{
 await setup(page,false);await expect(page.locator('[data-absence-pair]')).toHaveCount(4);
 await page.locator('[data-absence-pair]').first().check();await page.locator('#absence-submit').click();
 await expect(page.locator('#absence-status')).toContainText('eşleştirmesi eksik');
 await page.reload();await page.locator('#absence-date').fill('2026-10-17');await page.locator('#absence-date').dispatchEvent('change');
 await expect(page.locator('[data-absence-pair]').first()).toBeChecked();
 expect(await page.evaluate(()=>NativeTransfer.pending)).toBe(null);
});
test('linked screen queues only selected student/lesson, preserving unrelated stored absences',async({page})=>{
 await setup(page,true);
 await page.evaluate(()=>Store.saveLessonAttendance('g','2026-10-17','Sabah:1',[{studentId:'s2',status:'absent'}]));
 await page.locator('[data-absence-pair]').first().check();await page.locator('#absence-submit').click();
 await expect(page.locator('[data-transfer-row]')).toHaveCount(1);
 await page.evaluate(()=>window.BilsemAndroid={version:3});await page.locator('#native-transfer-send').click();
 const request=await page.evaluate(()=>NativeTransfer.takeRequest());expect(request.draft.rows.length).toBe(1);expect(request.draft.rows[0].studentNumber).toBe('42');expect(request.draft.rows[0].lessonOrder).toBe(1);
 expect(await page.evaluate(()=>Store.getLessonAttendance('g','2026-10-17','Sabah:1').records.length)).toBe(2);
});
