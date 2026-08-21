import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { useAppContext } from './context/AppContext';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import CreateJobScreen from './screens/CreateJobScreen';
import ProfileScreen from './screens/ProfileScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { globalStyles } from './styles';

export default function MainNavigator() {
  const { token, currentScreen, bottomTab, setBottomTab, setCurrentScreen } = useAppContext();

  if (!token) {
    return <AuthScreen />;
  }

  const showBottomNav =
    currentScreen === 'home' ||
    (currentScreen === 'create-job' && bottomTab === 'home');

  return (
    <SafeAreaView style={globalStyles.container}>
      <StatusBar barStyle="dark-content" />

      <Header />

      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'create-job' && <CreateJobScreen />}
      {currentScreen === 'profile' && <ProfileScreen />}
      {currentScreen === 'subscription' && <SubscriptionScreen />}

      {showBottomNav && <BottomNav />}
    </SafeAreaView>
  );
}