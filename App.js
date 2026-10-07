import React from 'react';
import { SyncProvider } from './src/hooks/SyncContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SyncProvider>
      <AppNavigator />
    </SyncProvider>
  );
}
