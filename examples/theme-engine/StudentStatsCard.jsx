import { useEffect, useRef } from 'react';
import { LazyMotion, domAnimation, m, useAnimationControls, useReducedMotion } from 'framer-motion';
import geogo from '../../icons/geogo.svg';

// Read only when an interaction starts. CSS remains the source of truth;
// no observer, theme state, per-frame layout reads or theme-change re-render.
function transitionFor(element, reduced) {
  if (reduced) return { type: 'tween', duration: 0 };
  const tokens = getComputedStyle(element);
  const type = tokens.getPropertyValue('--motion-type').trim();
  const duration = Number(tokens.getPropertyValue('--motion-duration'));
  return type === 'spring'
    ? { type, duration, bounce: Number(tokens.getPropertyValue('--motion-bounce')) }
    : { type: 'tween', duration, ease: 'easeOut' };
}
export function StudentStatsCard({ loading = false, studentCount = 24, attendance = 92 }) {
  const ref = useRef(null);
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  const interact = scale => controls.start({ scale, transition: transitionFor(ref.current, reduced) });
  useEffect(() => {
    controls.start({ opacity: 1, y: 0, transition: transitionFor(ref.current, reduced) });
  }, [controls, reduced]);
  return <LazyMotion features={domAnimation} strict>
    <m.article ref={ref} className="student-stat-card" aria-labelledby="student-stat-title" aria-busy={loading}
      initial={{ opacity: 0, y: 8 }} animate={controls}>
      <p className="text-muted">BİLSEM · Örnek veriler</p>
      <h2 id="student-stat-title">Öğrenci İstatistikleri</h2>
      {loading ? <div className="geogo-loader" role="status">
        <img className="geogo" src={geogo} alt="Geogo" width="80" height="80" />
        <span>Geogo istatistikleri hazırlıyor…</span>
      </div> : <div>
        <p><strong className="student-stat-value text-foreground">{studentCount}</strong> öğrenci</p>
        <p>Katılım oranı: <strong className="text-success">%{attendance}</strong></p>
      </div>}
      <button type="button" className="px-4 py-3 mt-6 bg-primary text-on-primary rounded-theme border-theme shadow-soft"
        onPointerEnter={() => interact(1.015)} onPointerLeave={() => interact(1)}
        onFocus={() => interact(1.015)} onBlur={() => interact(1)}
        onClick={() => interact(1)}>Geogo ile devam et</button>
    </m.article>
  </LazyMotion>;
}
