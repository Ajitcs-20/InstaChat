import React from 'react';
import { UserProvider } from './app/context/UserContext';
import AppNavigator from './app/navigation/AppNavigator';

export default function App() {
  return (
    <UserProvider>
      <AppNavigator />
    </UserProvider>
  );
} 