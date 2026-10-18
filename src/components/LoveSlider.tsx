import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useReducedMotion } from '../lib/hooks';

type LoveSliderProps = {
  onBurst: (x: number, y: number, count?: number) => void;
};

const answers = ['a lot', 'more than that', "the slider can't hold it", 'okay it broke 💥'];

function answerFor(value: number) {
  if (value >= 99) return 3;
  if (value >= 96) return 2;
  if (value >= 93) return 1;
  return 0;
}

export function LoveSlider({ onBurst }: LoveSliderProps) {
  const [value, setValue] = useState(90);
  const [dragging, setDragging] = useState(false);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const releaseAnimation = useRef<gsap.core.Tween | null>(null);
  const reducedMotion = useReducedMotion();
  const answer = answerFor(value);
  const extension = Math.max(0, (value - 90) / 10);
  const position = 85 + extension * 12;

  useEffect(() => {
    if (reducedMotion && thumbRef.current) gsap.set(thumbRef.current, { scale: 1, rotation: 0, opacity: 1 });
    return () => { releaseAnimation.current?.kill(); };
  }, [reducedMotion]);

  function release() {
    setDragging(false);
    const thumb = thumbRef.current;
    if (!thumb) return;
    const rect = thumb.getBoundingClientRect();
    onBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, value >= 99 ? 28 : 15);
    releaseAnimation.current?.kill();
    releaseAnimation.current = reducedMotion
      ? gsap.fromTo(thumb, { opacity: 0.55 }, { opacity: 1, duration: 0.25 })
      : gsap.fromTo(thumb, { scale: 1.22, rotation: value >= 99 ? -14 : -5 }, {
        scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(1.6)',
      });
  }

  return (
    <section className="love-section lower-scene" aria-labelledby="love-heading">
      <p className="eyebrow">A VERY UNRELIABLE MEASUREMENT</p>
      <h2 id="love-heading">How much do I<br /><em>love you?</em></h2>
      <div className={`love-measure ${dragging ? 'is-dragging' : ''} ${answer === 3 ? 'is-broken' : ''}`}>
        <div className="love-rail" aria-hidden="true" style={{ width: `${position}%` }}>
          <span className="love-rail-fill" />
          <span className="love-track-end" />
        </div>
        <span className="love-thumb" aria-hidden="true" ref={thumbRef} style={{ left: `${position}%` }}>
          <svg viewBox="0 0 28 28"><path d="M14 23.2 4.4 14A6.2 6.2 0 0 1 13.2 5.3L14 6.2l.8-.9a6.2 6.2 0 0 1 8.8 8.7Z" /></svg>
        </span>
        <input
          className="love-range"
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          aria-valuemin={90}
          aria-label="How much do I love you?"
          aria-valuetext={`${answers[answer]}. It can only be at least a lot.`}
          aria-describedby="love-slider-hint"
          onChange={(event) => setValue(Math.max(90, Number(event.target.value)))}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerUp={release}
          onPointerCancel={() => setDragging(false)}
          onBlur={() => setDragging(false)}
          onKeyUp={(event) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) release();
          }}
        />
        <div className="love-track-labels" aria-hidden="true"><span>a little</span><span>↔</span><span>a lot</span></div>
      </div>
      <p className="love-answer" aria-live="polite" aria-atomic="true">{answers[answer]}</p>
      <p className="love-hint" id="love-slider-hint">go on, try to find the end</p>
    </section>
  );
}

export default LoveSlider;
