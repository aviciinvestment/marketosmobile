import React, { useEffect } from 'react';
import { SyncProvider } from './src/hooks/SyncContext';
import { hydrateLang } from './src/i18n';
import { hydrateVoiceGuide } from './src/voiceGuide';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    hydrateLang();
    hydrateVoiceGuide();
  }, []);

  return (
    <SyncProvider>
      <AppNavigator />
    </SyncProvider>
  );
}
