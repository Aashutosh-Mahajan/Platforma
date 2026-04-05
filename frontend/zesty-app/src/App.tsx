
import { useEffect, useState } from 'react';
import { EventraExperience } from './experiences/EventraExperience';
import { ZestyExperience } from './experiences/ZestyExperience';
import type { ExperienceMode } from './data/unifiedContent';

function App() {
  const [mode, setMode] = useState<ExperienceMode>(() => {
    const stored = window.localStorage.getItem('platforma-mode');
    return stored === 'eventra' ? 'eventra' : 'zesty';
  });

  useEffect(() => {
    window.localStorage.setItem('platforma-mode', mode);
  }, [mode]);

  return (
    <div className={mode === 'zesty' ? 'theme-zesty' : 'theme-eventra'}>
      <div key={mode} className="animate-fade-in">
        {mode === 'zesty' ? (
          <ZestyExperience onSwitchToEventra={() => setMode('eventra')} />
        ) : (
          <EventraExperience onSwitchToZesty={() => setMode('zesty')} />
        )}
      </div>
    </div>
  );
}

export default App;
