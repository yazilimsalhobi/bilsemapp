/* Shared, state-free theme provider. Loaded before CSS to avoid a theme flash. */
(() => {
  'use strict';
  const themes = Object.freeze(['organic', 'brutalist', 'ethereal']);
  const key = 'bilsem.theme.v1';
  const normalize = value => themes.includes(value) ? value : 'organic';
  const apply = value => {
    const theme = normalize(value);
    if (document.documentElement.dataset.theme !== theme) {
      document.documentElement.dataset.theme = theme;
    }
    return theme;
  };
  const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const setTheme = value => {
    const theme = apply(value);
    try { localStorage.setItem(key, theme); } catch { /* Private/storage-disabled mode. */ }
  };
  window.ThemeEngine = Object.freeze({ themes, setTheme,
    getTheme: () => normalize(document.documentElement.dataset.theme),
    cycle: () => setTheme(themes[(themes.indexOf(document.documentElement.dataset.theme) + 1) % themes.length])
  });
  apply(read());
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(read());
  });
})();
