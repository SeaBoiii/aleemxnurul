import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { projects } from '../content';
import sky from '../data/sky.json';
import { question, unlock, unlockRemembered } from '../lib/vault';
import { readStorage, writeStorage } from '../lib/storage';
import { Letter } from '../components/Letter';
import ProjectCard from '../components/ProjectCard';
import ConstellationInfo from '../components/ConstellationInfo';
import Numbers from '../components/Numbers';
import LoveSlider from '../components/LoveSlider';
import Countdown from '../components/Countdown';
import Finale from '../components/Finale';
import { burstHearts } from '../components/StarField';
import { flight } from './flight';
import { canStream } from './network';
import { capitalised } from '../lib/words';
import { crossingT, denebT, starT, stars } from './world';
import { legend, starFacts } from './publicCopy';
import '../components/lower-scenes.css';
import './immersive.css';

const Scene = lazy(() => import('./Scene'));

const gentleNos = ['not quite, my love. try again ♡', 'hmm, think back a little ♡', 'close your eyes and remember that evening ♡', 'so close. the seal believes in you ♡'];

/** Stars whose site is a surprise stay dim and unnamed until their date. */
function useHidden() {
  return useMemo(() => new Set(sky.stars.filter((s) => 'revealOn' in s && s.revealOn && Date.now() < Date.parse(s.revealOn)).map((s) => s.key)), []);
}

function savedVisits(): string[] {
  const stored = readStorage<unknown>('visited', []);
  return Array.isArray(stored) ? stored.filter((v): v is string => typeof v === 'string') : [];
}

/** Scroll → route position: each chapter declares where on the route its middle sits. */
function useFlightScroll(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    let stops: { y: number; t: number; focus: number | null; bridge: boolean }[] = [];
    const measure = () => {
      stops = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-t]') ?? []).map((el) => ({
        y: el.offsetTop + el.offsetHeight / 2,
        t: Number(el.dataset.t),
        focus: el.dataset.star ? Number(el.dataset.star) : null,
        bridge: el.dataset.bridge === 'true',
      }));
    };
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!stops.length) return;
      const y = scrollY + innerHeight / 2;
      let i = stops.findIndex((s) => s.y > y);
      if (i === -1) i = stops.length;
      const a = stops[Math.max(0, i - 1)], b = stops[Math.min(stops.length - 1, i)];
      const k = a === b ? 0 : Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
      // Linger beside each star: ease between stops instead of moving at constant speed.
      const eased = k * k * (3 - 2 * k);
      flight.target = a.t + (b.t - a.t) * eased;
      const near = k < 0.5 ? a : b;
      flight.focus = near.focus !== null ? stars[near.focus].position : null;
      flight.bridgeLit = flight.bridgeLit || stops.slice(0, i).some((s) => s.bridge);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    measure(); update();
    const observer = new ResizeObserver(() => { measure(); update(); });
    if (root.current) observer.observe(root.current);
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('scroll', onScroll); observer.disconnect(); cancelAnimationFrame(frame); };
  }, [root]);
}

/**
 * A portrait clip that only loads when near, plays muted once and holds its last frame (the
 * hero clips each end on their keyframe), replaying whenever it comes back into view.
 */
function Clip({ src, poster, label, className = '' }: { src?: string; poster?: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); if (video.ended) video.currentTime = 0; video.play().catch(() => {}); } else video.pause();
    }, { rootMargin: '0px', threshold: 0.35 });
    io.observe(video);
    return () => io.disconnect();
  }, []);
  return <figure className={`clip ${className}`}>
    <video ref={ref} src={near && src && canStream() ? src : undefined} poster={poster} muted playsInline preload="none" aria-label={label} onLoadedData={(e) => { if (near) e.currentTarget.play().catch(() => {}); }} />
  </figure>;
}

export default function Immersive() {
  const root = useRef<HTMLElement>(null);
  const hidden = useHidden();
  const [unlocked, setUnlocked] = useState(false);
  const [opened, setOpened] = useState(false);
  const [visited, setVisited] = useState<string[]>(savedVisits);
  const [selected, setSelected] = useState<number | null>(null);
  const [info, setInfo] = useState(false);
  const [answer, setAnswer] = useState('');
  const [checking, setChecking] = useState(false);
  const [misses, setMisses] = useState(0);
  // Each reading is a fresh letter: once it folds into the plane and flies, it leaves the page,
  // and the next "Read your letter" mounts a new one (a flown letter stays transparent).
  const [reading, setReading] = useState(0);
  const openLetter = useCallback(() => setReading((n) => n + 1), []);
  useFlightScroll(root);

  // The 3D envelope shows only while the seal chapter is on screen.
  useEffect(() => {
    const seal = document.getElementById('seal');
    if (!seal) return;
    const io = new IntersectionObserver(([entry]) => { flight.sealVisible = entry.isIntersecting; }, { threshold: 0.3 });
    io.observe(seal);
    return () => { io.disconnect(); flight.sealVisible = false; };
  }, []);

  // Scroll to the letter once it is actually on the page.
  useEffect(() => {
    if (reading > 0) document.getElementById('letter')?.scrollIntoView({ behavior: 'smooth' });
  }, [reading]);

  useEffect(() => { unlockRemembered().then((ok) => { if (ok) { setUnlocked(true); setOpened(true); } }); }, []);

  useLayoutEffect(() => {
    // Back from a site: the page is restored from the bfcache; pick up the new visit.
    const onReturn = (event: PageTransitionEvent) => { if (event.persisted) { setSelected(null); setVisited(savedVisits()); } };
    addEventListener('pageshow', onReturn);
    return () => removeEventListener('pageshow', onReturn);
  }, []);

  const visit = useCallback((id: string) => {
    setVisited((current) => {
      const next = current.includes(id) ? current : [...current, id];
      writeStorage('visited', next);
      return next;
    });
  }, []);

  // projects fills in when the vault opens, so unlocked is a real dependency here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visitedStars = useMemo(() => projects.filter((p) => visited.includes(p.id)).map((p) => p.star), [visited, unlocked]);
  const complete = unlocked && projects.length > 0 && projects.every((p) => visited.includes(p.id) || hidden.has(p.star));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (checking || !answer.trim()) return;
    setChecking(true);
    const ok = await unlock(answer);
    setChecking(false);
    if (!ok) { setMisses((m) => m + 1); return; }
    setUnlocked(true);
    setOpened(true);
    burstHearts(innerWidth / 2, innerHeight / 2, 16);
    openLetter();
  }

  const project = (i: number) => (unlocked ? projects[i] : undefined);

  return <>
    <div className="immersive-stage" aria-hidden="true">
      <Suspense fallback={null}><Scene unlocked={unlocked} visited={visitedStars} hiddenUntil={hidden} opened={opened} /></Suspense>
    </div>

    <header className="im-header">
      <a className="im-brand" href="#top"><img src="/brand/monogram-small.webp" alt="" width="30" height="30" /><span>aleemxnurul.love</span></a>
      {unlocked && <span className="im-progress">{visited.filter((id) => projects.some((p) => p.id === id)).length} / {projects.length} stars visited</span>}
      <button className="im-info" onClick={() => setInfo(true)} aria-label="About this sky"><span aria-hidden="true">i</span></button>
    </header>

    <main ref={root} className="immersive" id="top">
      <section className="im-chapter im-hero" data-t="0">
        <Clip src="/media/h1-river.mp4" poster="/media/h1-river.webp" label="Flying into the Milky Way behind a paper plane" className="clip--hero" />
        <div className="im-hero-copy">
          <p className="im-kicker">A LITTLE UNIVERSE · ALL FOR HER</p>
          <h1>Every star <em>was you.</em></h1>
          <p className="im-sub">{capitalised(stars.length)} little worlds, made one at a time. Scroll, and follow the paper plane.</p>
          <span className="im-cue" aria-hidden="true">↓</span>
        </div>
      </section>

      {legend.map((line, i) => <section key={i} className="im-chapter im-legend" data-t={(0.004 + i * 0.006).toFixed(4)}>
        <p className="im-legend-line">{line}</p>
      </section>)}

      {stars.map((s, i) => {
        const p = project(i);
        const waiting = hidden.has(s.key);
        return <div key={s.key}>
          {i === 5 && <section className="im-chapter im-river" data-t={crossingT.toFixed(4)}>
            <p className="im-legend-line">Between them, the heavens poured a river of stars.</p>
            <p className="im-small">the Silver River · the Milky Way</p>
          </section>}
          {i === 11 && <section className="im-chapter im-interlude" data-t={((starT[10] + starT[11]) / 2).toFixed(4)}>
            <p className="im-legend-line">And swimming in the river, a swan.</p>
            <p className="im-small">Cygnus · where every new star joins the bridge</p>
          </section>}
          <section className={`im-chapter im-star${s.status === 'draft' ? ' is-draft' : ''}${waiting ? ' is-waiting' : ''}`} data-t={starT[i].toFixed(4)} data-star={i}>
            <article className={`im-card${i % 2 ? ' im-card--left' : ''}`} style={p ? { ['--accent' as string]: p.accent, ['--accent-ink' as string]: inkOn(p.accent) } : undefined}>
              <p className="im-eyebrow">№ {String(i + 1).padStart(2, '0')} · {s.month}{s.status === 'draft' ? ' · draft' : ''}</p>
              <h2>{waiting ? 'a star still waiting' : p ? p.title : s.name}</h2>
              <p className="im-star-name">{waiting ? 'opens on 1 January' : `${s.name === s.designation ? s.name : `${s.name} · ${s.designation}`} · ${s.constellation}`}</p>
              {p && !waiting && <>
                <p className="im-note">{p.note}</p>
                <button className="im-step" onClick={() => setSelected(i)}>{visited.includes(p.id) ? 'Visit again' : 'Step inside'} <span aria-hidden="true">→</span></button>
              </>}
              {!p && !waiting && <p className="im-public">{starFacts[s.key]}</p>}
            </article>
          </section>
        </div>;
      })}

      <section className="im-chapter im-bridge" data-t={denebT.toFixed(4)} data-bridge="true">
        <Clip src="/media/h2-bridge.mp4" poster="/media/h2-bridge.webp" label="Magpies flying together into a bridge across the Milky Way" className="clip--window" />
        <div className="im-bridge-copy">
          <p className="im-legend-line">Once a year, every magpie in the world flies up and makes a bridge of their wings.</p>
          <p className="im-small">Deneb · α Cygni · the bridge</p>
        </div>
      </section>

      <div className="below-sky im-below" data-t={((denebT + 1) / 2).toFixed(4)}>
        <Numbers />
        <LoveSlider onBurst={burstHearts} />
        <Countdown />
      </div>

      <section className="im-chapter im-seal" data-t="1" id="seal">
        {!unlocked ? <form className="im-lock" onSubmit={submit}>
          <p className="im-kicker">FOR NURULAIN · AND ONLY NURULAIN</p>
          <h2>The rest is only for her.</h2>
          <label htmlFor="im-answer" className="im-question">{question}</label>
          <div className="im-answer-row">
            <input id="im-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="only you would know…" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" disabled={checking} aria-describedby="im-feedback" aria-invalid={misses > 0 && !checking ? true : undefined} />
            <button type="submit" disabled={checking || !answer.trim()} aria-label="Break the seal"><span aria-hidden="true">✦</span></button>
          </div>
          <p id="im-feedback" role="status" className="im-feedback">{checking ? 'the seal is listening…' : misses ? gentleNos[(misses - 1) % gentleNos.length] : 'answer, and the seal will know it’s you'}</p>
        </form> : <div className="im-opened">
          <Clip src="/media/h3-seal.mp4" poster="/media/h3-seal.webp" label="The wax seal breaking and the envelope opening with light" className="clip--window" />
          <p className="im-kicker">IT’S YOU. WELCOME HOME</p>
          <button className="im-step" onClick={openLetter}>Read your letter <span aria-hidden="true">→</span></button>
        </div>}
      </section>

      {unlocked && reading > 0 && <div className="im-letter" id="letter">
        <Letter key={reading} onComplete={() => { writeStorage('seen-letter', true); setReading(0); scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>}

      {unlocked && <section className="im-finale"><Finale complete={complete} /></section>}
      <footer className="im-footer"><p>made by Aleem, for Nurulain, one commit at a time ♡</p></footer>
    </main>

    {selected !== null && unlocked && <ProjectCard index={selected} onClose={() => setSelected(null)} onChange={setSelected} onVisit={visit} />}
    {info && (unlocked ? <ConstellationInfo onClose={() => setInfo(false)} /> : <PublicInfo onClose={() => setInfo(false)} />)}
  </>;
}

/** Readable text on an accent: paper on dark accents (navy), ink on light ones. */
function inkOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18 ? '#FFF6E9' : '#2A2233';
}

function PublicInfo({ onClose }: { onClose: () => void }) {
  return <ConstellationInfo onClose={onClose} text={`**The Weaver Girl & the Cowherd**\n\n${legend.join('\n\n')}\n\n${legend.length ? 'Look up on a clear evening and you can find them: Altair, Vega and Deneb make the Summer Triangle.' : ''}`} />;
}

