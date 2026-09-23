const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('js/theme.js', 'utf8');
function boot(saved, blocked = false) {
  const writes = [], listeners = {};
  const dataset = new Proxy({}, { set(target, key, value) { writes.push([key, value]); target[key] = value; return true; } });
  const storage = { value: saved };
  const context = { document: { documentElement: { dataset } },
    localStorage: { getItem() { if (blocked) throw Error(); return storage.value; },
      setItem(key, value) { if (blocked) throw Error(); storage.value = value; } },
    addEventListener(name, fn) { listeners[name] = fn; } };
  context.window = context;
  vm.runInNewContext(source, context);
  return { engine: context.ThemeEngine, dataset, writes, storage, listeners };
}
test('bootstrap validates persisted themes, including legacy/invalid values', () => {
  for (const theme of ['organic', 'brutalist', 'ethereal']) assert.equal(boot(theme).dataset.theme, theme);
  for (const value of [null, 'dark', 'light', 'invalid']) assert.equal(boot(value).dataset.theme, 'organic');
});
test('theme switch mutates only root once and repeating it is a no-op', () => {
  const h = boot('organic'); h.writes.length = 0;
  h.engine.setTheme('brutalist'); h.engine.setTheme('brutalist');
  assert.deepEqual(h.writes, [['theme', 'brutalist']]);
  assert.equal(h.storage.value, 'brutalist');
});
test('blocked storage still supports theme switching', () => {
  const h = boot(null, true); h.engine.setTheme('ethereal'); assert.equal(h.dataset.theme, 'ethereal');
});
test('storage events synchronize tabs and reset cleared preferences', () => {
  const h = boot('organic'); h.storage.value = 'ethereal';
  h.listeners.storage({ key: 'unrelated' }); assert.equal(h.dataset.theme, 'organic');
  h.listeners.storage({ key: 'bilsem.theme.v1' }); assert.equal(h.dataset.theme, 'ethereal');
  h.storage.value = null; h.listeners.storage({ key: null }); assert.equal(h.dataset.theme, 'organic');
});
test('header cycle visits all three themes', () => {
  const h = boot('organic');
  for (const theme of ['brutalist', 'ethereal', 'organic']) { h.engine.cycle(); assert.equal(h.engine.getTheme(), theme); }
});
