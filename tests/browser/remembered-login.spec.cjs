const {test,expect}=require('@playwright/test');const fs=require('node:fs');const source=fs.readFileSync('android-companion/app/src/main/assets/credentials.js','utf8');
async function run(page){return page.evaluate(source=>JSON.parse((0,eval)(`(${source})`)({username:'synthetic-user',password:'synthetic-password'})),source);}
async function load(page,extras='',action='https://mebbis.meb.gov.tr/'){
 await page.route('https://mebbis.meb.gov.tr/',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<form method="post" action="${action}" onsubmit="event.preventDefault();window.submitted=(window.submitted||0)+1"><input name="username" autocomplete="username"><input type="password" name="password">${extras}<button>Giriş</button></form>`}));await page.goto('https://mebbis.meb.gov.tr/');
}
test('known POST login fills credentials and submits without returning secrets',async({page})=>{
 await load(page);const result=await run(page);expect(result.state).toBe('submitted');expect(await page.evaluate(()=>window.submitted)).toBe(1);
 expect(await page.locator('input[name=username]').inputValue()).toBe('synthetic-user');expect(await page.locator('input[type=password]').inputValue()).toBe('synthetic-password');
 expect(JSON.stringify(result)).not.toContain('synthetic-password');
});
test('verification code remains manual; foreign form targets receive no credentials',async({page})=>{
 await load(page,'<input name="guvenlikKodu" required>');expect((await run(page)).state).toBe('verification');expect(await page.evaluate(()=>window.submitted)).toBeUndefined();
 await page.unrouteAll();await load(page,'','https://example.invalid/');expect((await run(page)).state).toBe('wrong_target');expect(await page.locator('input[type=password]').inputValue()).toBe('');
});
test('wrong origin, different username and multiple password fields are rejected',async({page})=>{
 await load(page);await page.locator('input[name=username]').fill('another-user');expect((await run(page)).state).toBe('different_user');expect(await page.locator('input[type=password]').inputValue()).toBe('');
 await page.unrouteAll();await load(page,'<input type=password>');expect((await run(page)).state).toBe('unrecognized');
 await page.goto('about:blank');expect((await run(page)).state).toBe('wrong_origin');
});
