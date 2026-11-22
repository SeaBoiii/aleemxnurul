import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import gsap from 'gsap';
import { isWaiting, projects, whispers } from '../content';
import scraped from '../data/scraped.json';
import { arrivalPath, bridgePath, bridgePoint, crossing, deneb, figureEdges, flightRoute, labelSide, linePath, mapHeight, mapWidth, starMap, summerTriangle } from '../lib/constellation';
import { useReducedMotion } from '../lib/hooks';
import { capitalised, countWord } from '../lib/words';
import { burstHearts } from './StarField';
import './sky.css';

type Props = { visited: string[]; onSelect: (index: number) => void; onReadLetter: () => void; onMonogram: () => void; onInfo: () => void; fromLetter?: boolean };
const captures = scraped.projects as Record<string, { captures?: { mobile?: string } }>;

export default function Sky({ visited, onSelect, onReadLetter, onMonogram, onInfo, fromLetter = false }: Props) {
  const [list, setList] = useState(false);
  const [memo, setMemo] = useState<number | null>(null);
  const [whisper, setWhisper] = useState('');
  const [shooting, setShooting] = useState(false);
  const [peek, setPeek] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const bridge = useRef<SVGPathElement>(null);
  const shootingStar = useRef<HTMLButtonElement>(null);
  const longPress = useRef<ReturnType<typeof setTimeout>>();
  const memoTimer = useRef<ReturnType<typeof setTimeout>>();
  const memoOpened = useRef(false);
  const current = useRef(0);
  const busy = useRef(false);
  const flight = useRef<gsap.core.Tween>();
  const complete = projects.every((project) => visited.includes(project.id) || isWaiting(project));

  useEffect(() => {
    if (!fromLetter || reduced) return;
    const context = gsap.context(() => {
      gsap.timeline()
        .fromTo('.arrival-mask-line', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'power3.out' })
        .to('.arrival-trail', { opacity: 0, duration: 0.35 });
    }, root);
    return () => context.revert();
  }, [fromLetter, reduced]);

  useEffect(() => {
    const planeElement = plane.current;
    const context = gsap.context(() => {
      if (reduced) { gsap.from('.sky-intro, .constellation', { opacity: 0, duration: 0.4 }); return; }
      gsap.from('.sky-intro', { opacity: 0, y: 10, duration: 0.7, ease: 'power3.out' });
      gsap.fromTo('.figure-guide', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power3.out' });
      gsap.from('.star-label', { opacity: 0, duration: 0.5, delay: 0.3, stagger: 0.035, ease: 'power3.out' });
    }, root);
    return () => { gsap.killTweensOf(planeElement); context.revert(); };
  }, [reduced]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>, hide: ReturnType<typeof setTimeout>;
    const schedule = () => { timer = setTimeout(() => {
      if (!document.hidden) { setShooting(true); hide = setTimeout(() => setShooting(false), reduced ? 5000 : 2400); }
      schedule();
    }, 8000 + Math.random() * 6000); };
    schedule();
    return () => { clearTimeout(timer); clearTimeout(hide); clearTimeout(longPress.current); clearTimeout(memoTimer.current); flight.current?.kill(); };
  }, [reduced]);

  useEffect(() => {
    if (!shooting || reduced) return;
    const tween = gsap.fromTo(shootingStar.current, { x: 65, y: -40, opacity: 0 }, { x: -180, y: 160, opacity: 1, duration: 2, ease: 'power3.out' });
    return () => { tween.kill(); };
  }, [shooting, reduced]);

  useEffect(() => {
    if (!whisper) return;
    const timer = setTimeout(() => setWhisper(''), 7000);
    return () => clearTimeout(timer);
  }, [whisper]);

  useEffect(() => {
    if (!complete) return;
    const context = gsap.context(() => {
      if (reduced) { gsap.set('.magpie, .summer-triangle', { opacity: 1 }); return; }
      const timeline = gsap.timeline();
      const birds = gsap.utils.toArray<SVGGElement>('.magpie');
      const path = bridge.current;
      if (path) birds.forEach((bird, index) => {
        const point = path.getPointAtLength(path.getTotalLength() * (index + 0.5) / birds.length);
        timeline.fromTo(bird, { x: 195, y: 340, scale: 0.5, opacity: 0 }, { x: point.x, y: point.y, scale: 1, opacity: 0.9, duration: 1.2, ease: 'power3.out' }, index * 0.07);
      });
      timeline.fromTo('.deneb-glyph', { opacity: 0.3, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.6)' }, 1.35)
        .fromTo('.summer-triangle', { strokeDashoffset: 1, opacity: 0 }, { strokeDashoffset: 0, opacity: 1, duration: 1.4, ease: 'power3.out' }, 1.7);
    }, root);
    return () => context.revert();
  }, [complete, reduced]);

  function select(index: number) {
    if (memoOpened.current) { memoOpened.current = false; return; }
    if (busy.current) return;
    if (reduced || list) { current.current = index; onSelect(index); return; }
    const route = flightRoute(current.current, index).map((node) => starMap[node]);
    if (route.length === 1) route.unshift({ ...route[0], x: route[0].x - 18, y: route[0].y + 18 });
    const lengths = route.slice(1).map((point, i) => Math.hypot(point.x - route[i].x, point.y - route[i].y));
    const distance = lengths.reduce((sum, length) => sum + length, 0);
    const travel = { value: 0 };
    busy.current = true;
    flight.current = gsap.to(travel, { value: distance, duration: 0.7, ease: 'power3.out', onUpdate: () => {
      let local = travel.value, segment = 0;
      while (segment < lengths.length - 1 && local > lengths[segment]) { local -= lengths[segment]; segment++; }
      const start = route[segment], end = route[segment + 1], ratio = Math.min(1, local / (lengths[segment] || 1));
      gsap.set(plane.current, { left: `${(start.x + (end.x - start.x) * ratio) / mapWidth * 100}%`, top: `${(start.y + (end.y - start.y) * ratio) / mapHeight * 100}%`, rotation: Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI + 25 });
    }, onComplete: () => { current.current = index; busy.current = false; onSelect(index); } });
  }

  function showMemo(index: number) {
    if (!visited.includes(projects[index].id)) return;
    memoOpened.current = false;
    longPress.current = setTimeout(() => {
      memoOpened.current = true;
      setMemo(index);
      clearTimeout(memoTimer.current);
      memoTimer.current = setTimeout(() => setMemo(null), 8000);
    }, 650);
  }

  function bankToward(index: number) {
    if (reduced || busy.current) return;
    const target = starMap[index], start = starMap[current.current];
    gsap.to(plane.current, { rotation: Math.atan2(target.y - start.y, target.x - start.x) * 180 / Math.PI + 25, duration: 0.25, ease: 'power3.out' });
  }

  return <section ref={root} className={`sky${complete ? ' sky--complete' : ''}`} id="sky" aria-labelledby="sky-title" onClick={(event) => {
    if (event.target instanceof Element && !event.target.closest('button,a')) burstHearts(event.clientX, event.clientY, 4);
  }}>
    <header className="sky-header">
      <button className="sky-brand" onClick={onMonogram} aria-label="aleemxnurul.love · Aleem and Nurulain monogram"><img src="/brand/monogram-small.webp" alt="" width="34" height="34" /><span>aleemxnurul.love</span></button>
      <div className="sky-tools">
        <button className="view-toggle" aria-pressed={list} onClick={() => setList(!list)}><span aria-hidden="true">{list ? '✦' : '☷'}</span><span>{list ? 'Sky view' : 'List view'}</span></button>
        <button className="sky-info" aria-label="About this sky" onClick={onInfo}><span aria-hidden="true">i</span></button>
      </div>
      <div className="visited-progress" aria-label={`${visited.length} / ${projects.length} stars visited`}><span className="heart-pips" aria-hidden="true">{projects.map((project) => <span className={visited.includes(project.id) ? 'filled' : ''} key={project.id}>♥</span>)}</span><span>{visited.length} / {projects.length} stars visited</span></div>
    </header>
    <div className="sky-intro"><p className="sky-eyebrow">A LITTLE UNIVERSE, MADE FOR YOU</p><h1 id="sky-title" tabIndex={-1}>Every star was you.</h1><p>{capitalised(projects.length)} little worlds, across a river of stars.</p></div>
    <div className={`constellation${list ? ' is-list' : ''}`}>
      <svg className="constellation-lines" viewBox={`0 0 ${mapWidth} ${mapHeight}`} aria-hidden="true">
        <defs><symbol id="sky-magpie" viewBox="-12 -7 24 14"><path d="M-11 1 Q-6-8 0 0 Q6-8 11 1 M0 0 L-2 6 M0 0 L3 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></symbol><mask id="arrival-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={mapWidth} height={mapHeight}><path className="arrival-mask-line" d={arrivalPath} stroke="white" strokeWidth="3" pathLength="1" /></mask></defs>
        {fromLetter && !reduced && <path className="arrival-trail" d={arrivalPath} mask="url(#arrival-mask)" stroke="#f1ddb0" strokeWidth="1.1" strokeDasharray="2 5" opacity="0.8" />}
        {figureEdges.map(([from, to]) => <g key={`${from}-${to}`}><path className="figure-guide" d={linePath(from, to)} pathLength="1" /><path className={`figure-line${visited.includes(projects[from].id) && visited.includes(projects[to].id) ? ' is-drawn' : ''}`} d={linePath(from, to)} pathLength="1" /></g>)}
        <path className="river-crossing" d={linePath(...crossing)} />
        <path className={`river-crossing river-crossing--visited${visited.includes(projects[4].id) && visited.includes(projects[5].id) ? ' is-drawn' : ''}`} d={linePath(...crossing)} pathLength="1" />
        <path ref={bridge} className="magpie-bridge-guide" d={bridgePath} />
        {complete && <><path className="summer-triangle" d={summerTriangle} pathLength="1" />{Array.from({ length: 15 }, (_, i) => {
          const { x, y } = bridgePoint((i + 0.5) / 15);
          return <g className="magpie" key={i} transform={`translate(${x} ${y})`}><use href="#sky-magpie" x="-7" y="-5" width="14" height="10" /></g>;
        })}</>}
      </svg>
      {!list && <><div ref={plane} className="sky-plane" style={{ left: `${starMap[0].x / mapWidth * 100}%`, top: `${starMap[0].y / mapHeight * 100}%` }} aria-hidden="true"><img src="/paper-plane.svg" alt="" width="27" height="27" /></div><span className="sky-constellation-name sky-constellation-name--lyra" aria-hidden="true">LYRA</span><span className="sky-constellation-name sky-constellation-name--aquila" aria-hidden="true">AQUILA</span><span className="sky-constellation-name sky-constellation-name--cygnus" aria-hidden="true">CYGNUS</span><span className="sky-river-label" aria-hidden="true">the Silver River</span></>}
      <ol className="star-list">{projects.map((project, index) => {
        const star = starMap[index], isVisited = visited.includes(project.id);
        const styles = { '--x': `${star.x / mapWidth * 100}%`, '--y': `${star.y / mapHeight * 100}%`, '--phase': `${-index * 0.37}s` } as CSSProperties;
        return <li key={project.id} style={styles} className={`star-position star-${index} label-${labelSide[index]}${project.status === 'draft' ? ' is-draft' : ''}${isVisited ? ' is-visited' : ''}${index === 0 || index === 10 ? ' is-lover' : ''}`}>
          <button className="project-star" disabled={isWaiting(project)} aria-label={`${isWaiting(project) ? 'a star still waiting' : project.title} ${project.month}${project.status === 'draft' ? ' · draft' : ''}${index === 0 ? ' the Cowherd' : index === 10 ? ' the Weaver Girl' : ''} ${star.name}${isVisited ? ', visited' : ''}`} onClick={() => select(index)} onPointerDown={() => showMemo(index)} onPointerUp={() => clearTimeout(longPress.current)} onPointerCancel={() => clearTimeout(longPress.current)} onPointerLeave={() => { clearTimeout(longPress.current); setPeek((active) => active === index ? null : active); }} onPointerEnter={() => { bankToward(index); if (!list) setPeek(index); }} onFocus={() => { bankToward(index); if (!list) setPeek(index); }} onBlur={() => setPeek((active) => active === index ? null : active)} onKeyDown={(event) => { if (event.shiftKey && event.key === 'Enter' && isVisited) { event.preventDefault(); setMemo(index); } }}>
            <span className="star-glyph" aria-hidden="true"><span className="star-glyph-visual">{isVisited ? '♥' : '✦'}</span></span><span className="star-label"><span>{isWaiting(project) ? 'a star still waiting' : project.title}</span>{' '}<span className="star-month">{project.month}{project.status === 'draft' ? ' · draft' : ''}</span>{(index === 0 || index === 10) && <>{' '}<span className="star-lover">{index === 0 ? 'the Cowherd' : 'the Weaver Girl'}</span></>}</span>{' '}<span className="list-star-name">{star.name}</span>{peek === index && <span className="star-preview" aria-hidden="true">{captures[project.id]?.captures?.mobile ? <img src={captures[project.id].captures!.mobile} alt="" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} /> : <span className="star-preview-fallback">✦<small>{star.name}</small></span>}</span>}<span className="list-arrow" aria-hidden="true">↗</span>
          </button>
        </li>;
      })}</ol>
      {!list && <div className={`deneb${complete ? ' is-lit' : ''}`} style={{ left: `${deneb.x / mapWidth * 100}%`, top: `${deneb.y / mapHeight * 100}%` }} aria-label={complete ? 'Deneb, the bridge, is alight' : 'Deneb, the bridge, waiting for every star'}><span className="deneb-glyph" aria-hidden="true">{complete ? '✦' : '☆'}</span><span className="deneb-label">Deneb<small>the bridge</small></span></div>}
    </div>
    <div className="sky-bottom"><p className="sky-instruction">{list ? `${countWord(projects.length)} little love letters, in order.` : 'tap a star. they all lead back to you.'}</p><button className="sky-read-letter" onClick={onReadLetter}>read the letter again <span aria-hidden="true">↗</span></button><a className="scroll-cue" href="#numbers">there’s more down here <span aria-hidden="true">↓</span></a></div>
    {shooting && <button ref={shootingStar} className="shooting-star" aria-label="Catch a shooting star" onClick={(event) => { burstHearts(event.clientX, event.clientY, 12); setWhisper(whispers[Math.floor(Math.random() * whispers.length)]); setShooting(false); }}><span aria-hidden="true">✦</span></button>}
    {whisper && <button className="whisper-bubble" onClick={() => setWhisper('')} aria-label={`A whisper: ${whisper}. Dismiss`}>{whisper} <span aria-hidden="true">♡</span></button>}
    {memo !== null && <div className="memo-bubble" role="status"><span className="sky-eyebrow">▸ A LITTLE NOTE FROM ALEEM</span><div className="memo-wave" aria-hidden="true">▂ ▅ ▃ ▇ ▄ ▂ ▆ ▄ ▇ ▂ ▅ ▃</div><p>{projects[memo].note}</p><button className="sky-read-letter" onClick={() => setMemo(null)}>close note</button></div>}
  </section>;
}
