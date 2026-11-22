import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, PointerEvent } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from '../lib/hooks';
import { question, unlock } from '../lib/vault';
import { countWord } from '../lib/words';
import stats from '../data/stats.json';
import './opening.css';

type SealProps = { onOpen: () => void; locked?: boolean };

const gentleNos = [
  'not quite, my love. try again ♡',
  'hmm, think back a little ♡',
  'close your eyes and remember that evening ♡',
  'so close. the seal believes in you ♡',
];

export function Seal({ onOpen, locked = false }: SealProps) {
  const root = useRef<HTMLElement>(null);
  const stamp = useRef<HTMLButtonElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const hold = useRef<gsap.core.Tween>();
  const transition = useRef<gsap.core.Timeline>();
  const progress = useRef({ value: 0 });
  const opening = useRef(false);
  const [isOpening, setIsOpening] = useState(false);
  const [answer, setAnswer] = useState('');
  const [checking, setChecking] = useState(false);
  const [misses, setMisses] = useState(0);
  const answerInput = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    const stampElement = stamp.current;
    const context = gsap.context(() => {
      if (opening.current) {
        transition.current = gsap.timeline({ onComplete: () => onOpenRef.current() })
          .to(root.current, { opacity: 0, duration: 0.25 });
        return;
      }
      if (reducedMotion) {
        gsap.from(root.current, { opacity: 0, duration: 0.4 });
      } else {
        gsap.from('.opening-copy', { y: 16, duration: 0.9, ease: 'power3.out' });
        gsap.from('.opening-envelope', { opacity: 0, y: 28, rotate: -3, duration: 1.2, delay: 0.15, ease: 'power3.out' });
        gsap.from('.opening-hold-hint, .seal-lock', { opacity: 0, duration: 0.7, delay: 0.8 });
      }
    }, root);
    return () => {
      hold.current?.kill();
      transition.current?.kill();
      gsap.killTweensOf(progress.current);
      gsap.killTweensOf(stampElement);
      context.revert();
    };
  }, [reducedMotion]);

  function paintProgress() {
    if (ring.current) ring.current.style.strokeDashoffset = String(302 * (1 - progress.current.value));
  }

  function open() {
    if (opening.current) return;
    opening.current = true;
    setIsOpening(true);
    hold.current?.kill();
    const timeline = gsap.timeline({ onComplete: () => onOpenRef.current() });
    transition.current = timeline;
    if (reducedMotion) {
      timeline.to(root.current, { opacity: 0, duration: 0.35 });
      return;
    }
    timeline
      .to('.seal-original', { opacity: 0, duration: 0.08 }, 0)
      .set('.seal-half', { opacity: 1 }, 0)
      .to('.seal-half--left', { x: -30, y: 17, rotation: -28, opacity: 0, duration: 0.65, ease: 'power3.out' }, 0)
      .to('.seal-half--right', { x: 30, y: 21, rotation: 25, opacity: 0, duration: 0.65, ease: 'power3.out' }, 0)
      .to('.seal-progress', { opacity: 0, duration: 0.15 }, 0)
      .to('.opening-hold-hint, .seal-lock', { opacity: 0, duration: 0.2 }, 0)
      .to('.envelope-flap', { rotationX: 180, duration: 0.65, ease: 'power3.out' }, 0.12)
      .set('.envelope-flap', { zIndex: 0 }, 0.43)
      .to('.envelope-letter', { y: -100, duration: 0.7, ease: 'power3.out' }, 0.44)
      .to('.opening-copy', { opacity: 0, y: -12, duration: 0.45 }, 0.55)
      .to(root.current, { opacity: 0, duration: 0.35 }, 1.05);
  }

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (checking || opening.current || !answer.trim()) return;
    setChecking(true);
    gsap.killTweensOf(progress.current);
    // The key derivation takes a moment on a phone; the ring fills while the seal listens.
    const listening = gsap.to(progress.current, { value: 0.7, duration: 1.2, ease: 'power2.out', onUpdate: paintProgress });
    const correct = await unlock(answer);
    listening.kill();
    if (correct) {
      answerInput.current?.blur();
      gsap.to(progress.current, { value: 1, duration: reducedMotion ? 0 : 0.3, ease: 'power3.out', onUpdate: paintProgress, onComplete: open });
      return;
    }
    setChecking(false);
    setMisses((count) => count + 1);
    gsap.to(progress.current, { value: 0, duration: 0.4, ease: 'power3.out', onUpdate: paintProgress });
    if (!reducedMotion) gsap.fromTo('.opening-envelope', { x: 0 }, { keyframes: { x: [-9, 8, -6, 4, 0] }, duration: 0.45, ease: 'power2.out' });
    answerInput.current?.select();
  }

  function beginHold() {
    if (opening.current || reducedMotion || locked) return;
    hold.current?.kill();
    gsap.killTweensOf(progress.current);
    gsap.to(stamp.current, { scale: 0.95, rotation: -2, duration: 0.2, ease: 'power3.out' });
    hold.current = gsap.to(progress.current, {
      value: 1,
      duration: 0.9 * (1 - progress.current.value),
      ease: 'none',
      onUpdate: paintProgress,
      onComplete: open,
    });
  }

  function releaseHold() {
    if (opening.current || reducedMotion) return;
    hold.current?.kill();
    gsap.to(progress.current, { value: 0, duration: 0.35, ease: 'power3.out', onUpdate: paintProgress });
    gsap.to(stamp.current, { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.6)' });
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    if (locked) { answerInput.current?.focus(); return; }
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    beginHold();
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (locked) { answerInput.current?.focus(); return; }
    if (!event.repeat) reducedMotion ? open() : beginHold();
  }

  return (
    <section ref={root} className="opening opening--seal" aria-label="A letter for Nurulain">
      <div className="opening-copy">
        <p className="opening-kicker">{locked ? 'FOR NURULAIN · AND ONLY NURULAIN' : 'FOR NURULAIN · OPEN WHEN READY'}</p>
        <h1 className="opening-title">a little universe,<br />all for you.</h1>
      </div>
      <div className="opening-envelope" aria-hidden={isOpening || undefined}>
        <div className="envelope-back" />
        <div className="envelope-letter"><span>Nurul,</span><i /><i /><i /><small>— Aleem</small></div>
        <div className="envelope-front" />
        <div className="envelope-flap" />
        <button
          ref={stamp}
          className="opening-seal"
          aria-label={locked ? 'The seal: answer its question to open your letter' : reducedMotion ? 'Open your letter' : 'Press and hold to open your letter'}
          aria-describedby={locked ? undefined : 'seal-instruction'}
          tabIndex={locked ? -1 : undefined}
          disabled={isOpening}
          onPointerDown={pointerDown}
          onPointerUp={releaseHold}
          onPointerCancel={releaseHold}
          onLostPointerCapture={releaseHold}
          onKeyDown={keyDown}
          onKeyUp={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); releaseHold(); } }}
          onBlur={releaseHold}
          onClick={() => { if (reducedMotion && !locked) open(); }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="seal-original">
            <img className="seal-wax" src="/wax-seal.svg" alt="" draggable={false} />
          </span>
          <img className="seal-half seal-half--left" src="/wax-seal-left.svg" alt="" draggable={false} />
          <img className="seal-half seal-half--right" src="/wax-seal-right.svg" alt="" draggable={false} />
          <svg className="seal-progress" viewBox="0 0 108 108" aria-hidden="true">
            <circle className="seal-progress-track" cx="54" cy="54" r="48" />
            <circle ref={ring} className="seal-progress-fill" cx="54" cy="54" r="48" />
          </svg>
        </button>
      </div>
      {locked ? <form className="seal-lock" onSubmit={submitAnswer}>
        <label className="seal-question" htmlFor="seal-answer">{question}</label>
        <div className="seal-answer-row">
          <input
            ref={answerInput}
            id="seal-answer"
            className="seal-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="only you would know…"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            disabled={checking || isOpening}
            aria-invalid={misses > 0 && !checking ? true : undefined}
            aria-describedby="seal-feedback"
          />
          <button className="seal-submit" type="submit" disabled={checking || isOpening || !answer.trim()} aria-label="Break the seal"><span aria-hidden="true">✦</span></button>
        </div>
        <p id="seal-feedback" className="seal-feedback" role="status">{isOpening ? 'it’s you. welcome home ♡' : checking ? 'the seal is listening…' : misses ? gentleNos[(misses - 1) % gentleNos.length] : 'answer, and the seal will know it’s you'}</p>
      </form> : <p id="seal-instruction" className="opening-hold-hint">{isOpening ? 'a little something, just for you' : reducedMotion ? 'tap the seal to open' : 'press & hold the seal'}<span aria-hidden="true">♡</span></p>}
      <p className="opening-signature">{countWord(stats.websites)} little worlds. one favourite person.</p>
    </section>
  );
}
