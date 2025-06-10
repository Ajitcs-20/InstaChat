import { Redirect } from 'expo-router';
import { useUser } from './context/UserContext';
import OnboardingScreen from './screens/OnboardingScreen';

export default function Index() {
  const { user } = useUser();

  // If user is logged in, redirect to home
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  // Show onboarding if not logged in
  return <OnboardingScreen />;
} 