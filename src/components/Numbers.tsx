import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import stats from '../data/stats.json';
import { useReducedMotion } from '../lib/hooks';
import './lower-scenes.css';

gsap.registerPlugin(ScrollTrigger);

const firstDay = Date.parse('2026-06-22T00:00:00+08:00');

export function Numbers() {
  const sectionRef = useRef<HTMLElement>(null);
  const numberRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const infinityRef = useRef<SVGPathElement>(null);
  const reducedMotion = useReducedMotion();
  const days = Math.max(0, Math.floor((Date.now() - firstDay) / 86_400_000));
  const values = [stats.websites, stats.totalCommits, days];
  const labels = ['websites', 'commits', 'days of building you things'];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const context = gsap.context(() => {
      const path = infinityRef.current;
      const length = path?.getTotalLength() ?? 0;

      if (reducedMotion) {
        numberRefs.current.forEach((element, index) => {
          if (element) element.textContent = values[index].toLocaleString();
        });
        if (path) gsap.set(path, { strokeDasharray: length, strokeDashoffset: 0 });
        return;
      }

      numberRefs.current.forEach((element) => {
        if (element) element.textContent = '0';
      });
      if (path) gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });

      const timeline = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top 85%', once: true },
      });

      numberRefs.current.forEach((element, index) => {
        if (!element) return;
        const counter = { value: 0 };
        timeline.to(counter, {
          value: values[index],
          duration: 1.45,
          ease: 'power3.out',
          onUpdate: () => { element.textContent = Math.round(counter.value).toLocaleString(); },
        }, index * 0.12);
      });
      if (path) timeline.to(path, { strokeDashoffset: 0, duration: 1.5, ease: 'power3.out' }, 0.3);
    }, section);

    return () => context.revert();
  // The three values are fixed for this visit; a new visit starts a new count.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  return (
    <section ref={sectionRef} id="numbers" className="numbers-section lower-scene" aria-labelledby="numbers-heading">
      <div className="section-rule" aria-hidden="true"><span>✦</span></div>
      <p className="eyebrow" id="numbers-heading">ONE COMMIT AT A TIME</p>
      <div className="numbers-grid">
        {values.map((value, index) => (
          <div className="number-item" key={labels[index]}>
            <span className="sr-only">{value.toLocaleString()} </span>
            <span className="number-value" aria-hidden="true" ref={(element) => { numberRefs.current[index] = element; }}>
              {value.toLocaleString()}
            </span>
            <span className="number-label">{labels[index]}</span>
          </div>
        ))}
        <div className="number-item infinity-item">
          <span className="sr-only">infinite </span>
          <svg className="infinity-mark" viewBox="0 0 120 64" aria-hidden="true">
            <path ref={infinityRef} d="M60 32C45 10 12 6 12 32C12 58 44 54 60 32C76 10 108 6 108 32C108 58 75 54 60 32Z" />
          </svg>
          <span className="number-label">reasons</span>
        </div>
      </div>
    </section>
  );
}

export default Numbers;
