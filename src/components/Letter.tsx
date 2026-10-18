import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { letter } from '../content';
import { useReducedMotion } from '../lib/hooks';
import './opening.css';

type LetterProps = { onComplete: () => void };

export function Letter({ onComplete }: LetterProps) {
  const root = useRef<HTMLElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const [characters, setCharacters] = useState(0);
  const [isFlying, setIsFlying] = useState(false);
  const flying = useRef(false);
  const reducedMotion = useReducedMotion();
  const transition = useRef<gsap.core.Timeline>();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const finishedTyping = characters >= letter.length || reducedMotion;

  useEffect(() => {
    if (reducedMotion || characters >= letter.length) return;
    const timer = window.setTimeout(() => setCharacters((value) => Math.min(value + 1, letter.length)), 60);
    return () => window.clearTimeout(timer);
  }, [characters, reducedMotion]);

  useEffect(() => {
    root.current?.focus({ preventScroll: true });
    const context = gsap.context(() => {
      if (flying.current) {
        transition.current = gsap.timeline({ onComplete: () => onCompleteRef.current() })
          .to(root.current, { opacity: 0, duration: 0.25 });
        return;
      }
      gsap.from(paper.current, {
        opacity: 0,
        ...(reducedMotion ? {} : { y: 48, rotation: -2, scale: 0.96 }),
        duration: reducedMotion ? 0.4 : 0.9,
        ease: 'power3.out',
      });
    }, root);
    return () => { transition.current?.kill(); context.revert(); };
  }, [reducedMotion]);

  function skipTyping() {
    if (!isFlying && !finishedTyping) setCharacters(letter.length);
  }

  function takeFlight() {
    if (flying.current) return;
    flying.current = true;
    setCharacters(letter.length);
    setIsFlying(true);
    const timeline = gsap.timeline({ onComplete: () => onCompleteRef.current() }).timeScale(1.7);
    transition.current = timeline;
    if (reducedMotion) {
      timeline.to(root.current, { opacity: 0, duration: 0.4 });
      return;
    }
    timeline
      .to('.letter-body, .letter-actions, .letter-date', { opacity: 0, duration: 0.15 })
      .to(paper.current, { rotateX: 48, scaleY: 0.54, y: -20, duration: 0.3, ease: 'power3.out' }, 0.1)
      .to(paper.current, { rotateY: -65, scaleX: 0.12, scaleY: 0.13, opacity: 0, duration: 0.3, ease: 'power3.out' }, 0.4)
      .set('.letter-plane', { visibility: 'visible', opacity: 1 }, 0.62)
      .fromTo('.letter-plane', { scale: 0.65, rotate: -16 }, { scale: 1, rotate: -28, x: 52, y: -54, duration: 0.35, ease: 'power3.out' }, 0.62)
      .to('.letter-plane', { x: 85, y: -125, rotate: -125, duration: 0.25, ease: 'sine.inOut' }, 0.97)
      .to('.letter-plane', { x: 4, y: -148, rotate: -230, duration: 0.25, ease: 'sine.inOut' }, 1.22)
      .to('.letter-plane', { x: -40, y: -83, rotate: -340, duration: 0.25, ease: 'sine.inOut' }, 1.47)
      .to('.letter-plane', { x: 230, y: -320, rotate: -385, scale: 0.45, opacity: 0, duration: 0.55, ease: 'power3.in' }, 1.72)
      .fromTo('.letter-flight-trail', { strokeDashoffset: 650, opacity: 0.7 }, { strokeDashoffset: 0, duration: 1.55, ease: 'none' }, 0.7)
      .to(root.current, { opacity: 0, duration: 0.3 }, 2);
  }

  return (
    <section ref={root} tabIndex={-1} className={`opening opening--letter${isFlying ? ' opening--flying' : ''}`} aria-label="Your letter from Aleem">
      <div ref={paper} className="letter-paper">
        <p className="letter-date" aria-hidden="true">a letter with a little stardust</p>
        <div className="letter-body" onClick={skipTyping}>
          <p className="opening-sr-only">{letter}</p>
          <p className="letter-layout" aria-hidden="true">{letter}</p>
          <p className="letter-typed" aria-hidden="true">{reducedMotion ? letter : letter.slice(0, characters)}{!finishedTyping && <span className="letter-caret">|</span>}</p>
        </div>
        <div className="letter-actions">
          {!finishedTyping && <button className="letter-skip" onClick={skipTyping}>tap to read it all</button>}
          <button className="letter-cta" onClick={takeFlight} disabled={isFlying}>Show me <span aria-hidden="true">✦</span></button>
        </div>
      </div>
      <svg className="letter-flight-trail" viewBox="0 0 390 650" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="M195 380 C260 335 310 230 245 203 C180 176 126 252 174 298 C217 340 301 254 384 38" /></svg>
      <img className="letter-plane" src="/paper-plane.svg" alt="" aria-hidden="true" />
    </section>
  );
}
