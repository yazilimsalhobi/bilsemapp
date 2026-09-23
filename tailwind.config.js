/** Optional React example build; no Tailwind runtime is shipped to the PWA. */
module.exports = {
  content: ['./examples/theme-engine/**/*.{html,jsx}'],
  theme: { extend: {
    colors: {
      background: 'var(--bg-primary)', surface: 'var(--surface)', foreground: 'var(--text-primary)',
      muted: 'var(--text-secondary)', primary: 'var(--primary)', 'on-primary': 'var(--on-primary)',
      accent: 'var(--accent)', success: 'var(--success)', danger: 'var(--danger)', border: 'var(--border-color)'
    },
    borderRadius: { theme: 'var(--radius)' },
    borderWidth: { theme: 'var(--border-width)' },
    boxShadow: { soft: 'var(--shadow-soft)', raised: 'var(--shadow-raised)' },
    transitionDuration: { theme: 'var(--motion-time)' },
    transitionTimingFunction: { theme: 'var(--motion-ease)' }
  } },
  plugins: []
};
