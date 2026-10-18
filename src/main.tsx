import React, { useEffect, useState } from 'react';
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

type Gate = 'checking' | 'locked' | 'unlocked' | 'remembered';

/** Nothing of the story exists on the page until the vault is open. */
function Root() {
  const [gate, setGate] = useState<Gate>('checking');
  useEffect(() => { unlockRemembered().then((ok) => setGate(ok ? 'remembered' : 'locked')); }, []);
  if (gate === 'checking') return <StarField active />;
  if (gate === 'locked') return <><StarField active /><main><Seal locked onOpen={() => setGate('unlocked')} /></main></>;
  return <App startAtLetter={gate === 'unlocked'} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root /></React.StrictMode>);
