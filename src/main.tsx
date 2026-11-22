import React, { lazy, Suspense, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/caveat/latin-400.css';
import App from './App';
import { Seal } from './components/Seal';
import StarField from './components/StarField';
import { unlockRemembered } from './lib/vault';
import './styles.css';

const Immersive = lazy(() => import('./immersive/Immersive'));

/** The 3D flight needs WebGL and a visitor who hasn't asked for less motion. ?classic forces 2D. */
function canFly() {
  if (new URLSearchParams(location.search).has('classic')) return false;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

type Gate = 'checking' | 'locked' | 'unlocked' | 'remembered';

/** The 2D sky: nothing of the story exists on the page until the vault is open. */
function Root() {
  const [gate, setGate] = useState<Gate>('checking');
  useEffect(() => { unlockRemembered().then((ok) => setGate(ok ? 'remembered' : 'locked')); }, []);
  if (gate === 'checking') return <StarField active />;
  if (gate === 'locked') return <><StarField active /><main><Seal locked onOpen={() => setGate('unlocked')} /></main></>;
  return <App startAtLetter={gate === 'unlocked'} />;
}

const app = canFly() ? <Suspense fallback={<StarField active />}><Immersive /></Suspense> : <Root />;
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode>{app}</React.StrictMode>);
