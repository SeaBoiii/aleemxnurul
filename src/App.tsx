import { useEffect, useRef, useState } from 'react';
import { projects } from './content';
import { readStorage, writeStorage } from './lib/storage';
import { Seal } from './components/Seal';
import { Letter } from './components/Letter';
import Sky from './components/Sky';
import StarField, { burstHearts, rainHearts } from './components/StarField';
import ProjectCard from './components/ProjectCard';
import ConstellationInfo from './components/ConstellationInfo';
import Numbers from './components/Numbers';
import LoveSlider from './components/LoveSlider';
import Countdown from './components/Countdown';
import Finale from './components/Finale';

type Scene = 'seal' | 'letter' | 'sky';
function savedVisits() {
  const stored = readStorage<unknown>('visited', []);
  return Array.isArray(stored) ? projects.map(project => project.id).filter(id => stored.includes(id)) : [];
}

export default function App({ startAtLetter = false }: { startAtLetter?: boolean }) {
  const [scene, setScene] = useState<Scene>(() => startAtLetter ? 'letter' : readStorage<boolean>('seen-letter', false) === true ? 'sky' : 'seal');
  const [visited, setVisited] = useState<string[]>(savedVisits);
  const [selected, setSelected] = useState<number | null>(null);
  const [info, setInfo] = useState(false);
  const [fromLetter, setFromLetter] = useState(false);
  const monogramTaps = useRef(0);
  const lastTap = useRef(0);

  useEffect(() => {
    let keys = '';
    const onKey = (event: KeyboardEvent) => {
      if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
      keys = (keys + event.key.toLowerCase()).slice(-5);
      if (keys === 'nurul') rainHearts();
    };
    const onReturn = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setSelected(null);
      setInfo(false);
      setVisited(savedVisits());
      setScene(readStorage<boolean>('seen-letter', false) === true ? 'sky' : 'seal');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pageshow', onReturn);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pageshow', onReturn);
    };
  }, []);

  useEffect(() => {
    if (scene === 'sky') document.getElementById('sky-title')?.focus({ preventScroll: true });
  }, [scene]);

  function visit(id: string) {
    const next = visited.includes(id) ? visited : [...visited, id];
    // Save synchronously before the exit animation starts and the browser navigates.
    writeStorage('visited', next);
    setVisited(next);
  }

  function finishLetter() {
    writeStorage('seen-letter', true);
    setFromLetter(true);
    setScene('sky');
    window.scrollTo(0, 0);
  }

  function tapMonogram() {
    const now = Date.now();
    monogramTaps.current = now - lastTap.current > 2000 ? 1 : monogramTaps.current + 1;
    lastTap.current = now;
    if (monogramTaps.current >= 5) {
      rainHearts();
      monogramTaps.current = 0;
    }
  }

  return <>
    <StarField key={scene} active />
    {scene === 'seal' && <main><Seal onOpen={() => setScene('letter')} /></main>}
    {scene === 'letter' && <main><h1 className="sr-only">Your letter from Aleem</h1><Letter onComplete={finishLetter} /></main>}
    {scene === 'sky' && <main>
      <a className="skip-link" href="#numbers">Skip to the rest of the story</a>
      <Sky
        visited={visited}
        onSelect={setSelected}
        onReadLetter={() => { setScene('letter'); window.scrollTo(0, 0); }}
        onInfo={() => setInfo(true)}
        onMonogram={tapMonogram}
        fromLetter={fromLetter}
      />
      <div className="below-sky">
        <Numbers />
        <LoveSlider onBurst={burstHearts} />
        <Countdown />
        <Finale complete={visited.length === projects.length} />
      </div>
    </main>}
    {selected !== null && <ProjectCard index={selected} onClose={() => setSelected(null)} onChange={setSelected} onVisit={visit} />}
    {info && <ConstellationInfo onClose={() => setInfo(false)} />}
  </>;
}
