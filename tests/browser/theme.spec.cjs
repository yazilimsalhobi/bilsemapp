const { test, expect } = require('@playwright/test');
const demo = 'http://127.0.0.1:5173/examples/theme-engine/';
test('all themes change shape, color, elevation and motion; persist across reload', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(demo);
  for (const [theme, radius, type] of [['Organic', '16px', 'spring'], ['Brutalist', '0px', 'tween'], ['Ethereal', '24px', 'tween']]) {
    await page.getByRole('button', { name: theme, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme.toLowerCase());
    await expect(page.locator('article')).toHaveCSS('border-top-left-radius', radius);
    expect(await page.locator('article').evaluate(el => getComputedStyle(el).getPropertyValue('--motion-type').trim())).toBe(type);
    expect(await page.locator('article').evaluate(el => getComputedStyle(el).boxShadow)).not.toBe('none');
  }
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'ethereal');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('theme switch touches only html attribute; existing card subtree survives', async ({ page }) => {
  await page.goto(demo); await page.waitForTimeout(1200);
  const result = await page.evaluate(async () => {
    const before = document.querySelector('article'); const records = [];
    const observer = new MutationObserver(mutations => records.push(...mutations.map(m => [m.target.tagName, m.attributeName, m.type])));
    observer.observe(document.documentElement, { attributes: true, subtree: true, childList: true, characterData: true });
    window.ThemeEngine.setTheme('brutalist');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    observer.disconnect(); return { same: before === document.querySelector('article'), records };
  });
  expect(result).toEqual({ same: true, records: [['HTML', 'data-theme', 'attributes']] });
});
test('Geogo loading is accessible and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(demo);
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('status')).toContainText('Geogo');
  await expect(page.getByRole('img', { name: 'Geogo' })).toHaveCSS('animation-name', 'none');
  await expect(page.locator('article')).toHaveAttribute('aria-busy', 'true');
  await page.screenshot({ path: 'scratch/theme-mobile.png', fullPage: true });
});
test('production PWA header cycles themes without loading React', async ({ page }) => {
  const urls = []; page.on('request', request => urls.push(request.url()));
  await page.goto('http://127.0.0.1:8765');
  await page.waitForFunction(() => !document.getElementById('splash-screen'));
  await page.locator('#login-email').fill('theme-test@example.invalid');
  await page.locator('#login-password').fill('test-password');
  await page.locator('#form-login').getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await page.locator('[title="Tema Değiştir"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'brutalist');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  expect(urls.some(url => /react|framer-motion|tailwind/.test(url))).toBe(false);
  await page.evaluate(() => { Store.setSetting('onboardingComplete', true); Router.go('settings'); });
  await page.locator('summary').filter({ hasText: 'Uygulama Tercihleri' }).click();
  await page.getByRole('button', { name: 'Ethereal', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ethereal');
  await page.screenshot({ path: 'scratch/theme-settings.png', fullPage: true });
});
