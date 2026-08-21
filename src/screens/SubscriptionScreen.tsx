import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppProvider';
import { styles } from '../styles';
import axios from 'axios';
import * as Linking from 'expo-linking';

const API_URL = 'https://hencedelivery.com';

type TierKey = 'basic' | 'professional';

const TIERS: Record<TierKey, { title: string; price: string; jobsPerDay: number; features: string[] }> = {
  basic: {
    title: 'Basic',
    price: '€25 / month',
    jobsPerDay: 5,
    features: ['Up to 5 jobs/day', 'Standard visibility', 'Fast payouts (100%)'],
  },
  professional: {
    title: 'Professional',
    price: '€50 / month',
    jobsPerDay: 10,
    features: ['Up to 10 jobs/day', 'Priority visibility', 'Featured placement', 'Higher demand jobs'],
  },
};

export default function SubscriptionScreen() {
  const {
    token,
    isPremium,
    subscriptionLoading,
    subscriptionPolling,
    checkSubscriptionStatus,
    stopSubscriptionPolling,
    setCurrentScreen,
    setBottomTab,
  } = useAppContext();

  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  
  // ✅ NEW: Memorize the session ID before opening the browser
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  // ✅ NEW: Listen for the app coming back to the foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      // If the app comes back to the foreground and we are waiting on a payment
      if (nextAppState === "active" && pendingSessionId) {
        verifyPayment(pendingSessionId);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [pendingSessionId]);

  // Fallback: Still listen to the URL just in case Expo behaves
  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      const parsedUrl = Linking.parse(url);
      if (url.includes('payment-success')) {
        let sessionId = parsedUrl.queryParams?.session_id;
        if (!sessionId) {
          const match = url.match(/[?&]session_id=([^&]+)/);
          if (match && match[1]) sessionId = match[1];
        }
        if (sessionId) verifyPayment(sessionId as string);
      }
    }
  }, [url]);

  const verifyPayment = async (sessionId: string) => {
    if (!token) return;
    try {
      setLocalLoading(true);
      const res = await axios.post(
        `${API_URL}/payments/verify-subscription`,
        { session_id: sessionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.ok) {
        setPendingSessionId(null); // Clear the pending state
        Alert.alert("Success!", "Your account has been upgraded for 30 days.");
        if (checkSubscriptionStatus) {
          checkSubscriptionStatus(true); // ✅ Passed 'true' here to silently refresh and redirect
        }
      }
    } catch (error: any) {
      // Only show error if they explicitly clicked the manual verify button
      console.warn("Verification status:", error?.response?.data?.detail);
    } finally {
      setLocalLoading(false);
    }
  };

  const onSubscribe = async () => {
    if (!token) return Alert.alert('Sign in', 'Please sign in first.');
    if (!selectedTier) return Alert.alert('Choose tier', 'Select Basic or Professional to continue.');
    
    try {
      setLocalLoading(true);
      const successUrl = Linking.createURL('payment-success');
      const cancelUrl = Linking.createURL('payment-cancel');

      const res = await axios.post(
        `${API_URL}/payments/create-subscription-session`,
        { tier: selectedTier, success_url: successUrl, cancel_url: cancelUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data && res.data.url) {
        // ✅ Save the session_id so we don't rely on the URL returning it
        if (res.data.session_id) {
          setPendingSessionId(res.data.session_id);
        }
        Linking.openURL(res.data.url);
      }
    } catch (err: any) {
      Alert.alert('Subscription error', err?.response?.data?.detail || 'Could not start subscription.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={{ padding: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>Driver subscriptions</Text>
          <TouchableOpacity
            onPress={() => {
              setCurrentScreen('home');
              setBottomTab('account');
              stopSubscriptionPolling();
            }}
            style={{ padding: 8 }}
          >
            <Ionicons name="close-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: '700', marginBottom: 6 }}>Choose a plan</Text>
            <Text style={{ color: '#6b7280' }}>
              Two driver tiers — choose the plan that matches your goals. Drivers keep 100% of earnings.
            </Text>
          </View>

          {/* Tier cards */}
          {(['basic', 'professional'] as TierKey[]).map((k) => {
            const tier = TIERS[k];
            const active = selectedTier === k;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setSelectedTier(k)}
                style={{
                  backgroundColor: active ? '#eff6ff' : '#fff',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                  borderWidth: active ? 1 : 0,
                  borderColor: '#2563eb',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800' }}>{tier.title}</Text>
                    <Text style={{ color: '#6b7280', marginTop: 4 }}>{tier.price}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: '700', color: active ? '#2563eb' : '#111827' }}>{tier.jobsPerDay} jobs/day</Text>
                    <Text style={{ color: '#6b7280', marginTop: 6 }}>{active ? 'Selected' : 'Tap to select'}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12 }}>
                  {tier.features.map((f, i) => <Text key={i} style={{ color: '#374151', marginTop: 4 }}>• {f}</Text>)}
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ marginTop: 6 }}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Test mode</Text>
            <Text style={{ color: '#6b7280', marginBottom: 12 }}>
              Stripe Checkout will open in test mode. Use card <Text style={{ fontWeight: '700' }}>4242 4242 4242 4242</Text> (any CVC/expiry).
            </Text>

            <TouchableOpacity style={[styles.primaryButton, { marginBottom: 8 }]} onPress={onSubscribe} disabled={subscriptionLoading || localLoading}>
              {(subscriptionLoading || localLoading) ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {selectedTier ? `Subscribe: ${TIERS[selectedTier].title} (${TIERS[selectedTier].price})` : 'Select a plan to subscribe'}
                </Text>
              )}
            </TouchableOpacity>

            {/* ✅ NEW: Manual Verify Button that appears if they went to Stripe */}
            {pendingSessionId && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#10b981', marginBottom: 8 }]}
                onPress={() => verifyPayment(pendingSessionId)}
                disabled={localLoading}
              >
                <Text style={styles.buttonText}>I have completed payment</Text>
              </TouchableOpacity>
            )}

          </View>

          <View style={{ backgroundColor: '#fff', padding: 14, borderRadius: 12, marginTop: 16 }}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Subscription status</Text>
            <Text>{isPremium ? 'Active (You have an active subscription)' : 'Not active'}</Text>
            <Text style={{ color: '#6b7280', marginTop: 8 }}>
              Active subscription unlocks the ability to accept up to your plan’s job limit each day.
            </Text>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}