import { createContext, useContext } from 'react';

// Stable command context, deliberately no theme state/subscriptions.
const ThemeContext = createContext(null);
const commands = Object.freeze({ setTheme: theme => window.ThemeEngine.setTheme(theme) });
export function ThemeProvider({ children }) {
  return <ThemeContext.Provider value={commands}>{children}</ThemeContext.Provider>;
}
export function ThemeSwitcher() {
  const { setTheme } = useContext(ThemeContext);
  return <fieldset className="theme-switcher">
    <legend>Görünüm ve hareket</legend>
    {['organic', 'brutalist', 'ethereal'].map(theme =>
      <button key={theme} type="button" className="theme-choice" data-choice={theme}
        onClick={() => setTheme(theme)}>{theme[0].toUpperCase() + theme.slice(1)}</button>)}
  </fieldset>;
}
