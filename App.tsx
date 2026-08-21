// App.tsx (root)
import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ← 1. Import this
import { AppProvider } from './src/context/AppProvider.tsx';
import AppRoot from './src/AppRoot.tsx';

const STRIPE_PUBLISHABLE_KEY =
  'pk_test_51Ser79BkXz3IrSREgfolHBSyAuugOH8NtlC7rLkaEB8OALbIiTd54G6IgMym6FRwH8Oc25Wcq7x7cUpHDFs01diz00sPYiWTOH';

export default function App() {
  return (
    // ← 2. Wrap your entire app with SafeAreaProvider at the absolute top level
    <SafeAreaProvider> 
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <AppProvider>
          <AppRoot />
        </AppProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}