import { createRoot } from 'react-dom/client';
import '@fontsource/ibm-plex-sans-arabic/arabic-400.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-500.css';
import '@fontsource/ibm-plex-sans-arabic/arabic-600.css';
import '@fontsource/ibm-plex-sans-arabic/latin-400.css';
import '@fontsource/ibm-plex-sans-arabic/latin-500.css';
import '@fontsource/ibm-plex-sans-arabic/latin-600.css';
import '@fontsource/noto-kufi-arabic/arabic-700.css';
import '@fontsource/noto-kufi-arabic/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import 'katex/dist/katex.min.css';
import './index.css';
import { App } from './App';
import { installAudioUnlock } from './lib/sound';
import { keepHashLinksInPage } from './router';

// StrictMode is not used: drei's <Html> labels create nested React roots, and StrictMode's
// double mounting makes them unmount mid-render under React 19 (labels could go missing).
keepHashLinksInPage();
installAudioUnlock();
createRoot(document.getElementById('root')!).render(<App />);
