import { useEffect, useRef } from 'react';
import stats from '../data/stats.json';
import { capitalised, roman } from '../lib/words';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { finale } from '../content';
import { useReducedMotion } from '../lib/hooks';

gsap.registerPlugin(ScrollTrigger);

type FinaleProps = { complete: boolean };

export function Finale({ complete }: FinaleProps) {
  const noteRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const note = noteRef.current;
    if (!note || !complete) return;
    const context = gsap.context(() => {
      if (reducedMotion) {
        gsap.fromTo(note, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      } else {
        gsap.fromTo(note, { opacity: 0, rotationX: -65, y: -14, transformOrigin: '50% 0%' }, {
          opacity: 1, rotationX: 0, y: 0, duration: 1.1, ease: 'power3.out',
          scrollTrigger: { trigger: note, start: 'top 92%', once: true },
        });
      }
    }, note);
    return () => context.revert();
  }, [complete, reducedMotion]);

  return (
    <section className={`finale-section lower-scene${complete ? ' is-complete' : ''}`} aria-labelledby="finale-heading">
      <div className="twelfth-star" role="img" aria-label={complete ? 'Deneb, the bridge, is shining. You found every star.' : 'Deneb, the bridge, waiting to shine'}>
        <span className="twelfth-star-halo" />
        <svg viewBox="0 0 80 80" aria-hidden="true"><path d="M40 4 48 32 76 40 48 48 40 76 32 48 4 40 32 32Z" /></svg>
        <span className="twelfth-star-number" aria-hidden="true">{roman(stats.websites + 1)}</span>
      </div>
      <p className="eyebrow">DENEB · THE BRIDGE</p>
      <h2 id="finale-heading">{capitalised(stats.websites)} websites.<br /><em>And the last star?</em></h2>
      <p className="finale-closing">That one's the bridge, our whole life,<br />still being written.</p>
      {complete && (
        <div className="finale-note" ref={noteRef}>
          <span className="finale-note-star" aria-hidden="true">✦</span>
          <p>{finale}</p>
          <span className="finale-signature" aria-hidden="true">always, Aleem</span>
        </div>
      )}
      <footer className="love-footer">made by Aleem, for Nurulain,<br className="footer-mobile-break" /> one commit at a time <span aria-hidden="true">♡</span></footer>
    </section>
  );
}

export default Finale;
