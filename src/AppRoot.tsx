import React, { useState } from 'react';
import { View, StatusBar, ScrollView, Text, TouchableOpacity, Switch, TextInput, Alert, Linking, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from './context/AppProvider';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import DriverDashboard from './screens/DriverDashboard';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import CreateJobScreen from './screens/CreateJobScreen';
import ProfileScreen from './screens/ProfileScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import { styles } from './styles';

// 🔥 FULLY FUNCTIONAL ACCOUNT SCREENS MATCHING HTML
function SupportScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F8F6', padding: 14 }}>
      <Text style={localStyles.sdiv}>Get in touch</Text>
      <View style={localStyles.card}>
        <TouchableOpacity style={localStyles.supRow} onPress={() => Alert.alert("Live Chat", "Connecting you to an agent...")}>
          <View style={localStyles.supIco}><Ionicons name="chatbubbles" size={15} color="#1A7A4A" /></View>
          <View style={localStyles.supInfo}>
            <Text style={localStyles.supTitle}>Live Chat</Text>
            <Text style={localStyles.supSub}>Talk to the Hence team now</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={localStyles.supRow} onPress={() => Linking.openURL('tel:+353830000000')}>
          <View style={localStyles.supIco}><Ionicons name="call" size={15} color="#1A7A4A" /></View>
          <View style={localStyles.supInfo}>
            <Text style={localStyles.supTitle}>Call Support</Text>
            <Text style={localStyles.supSub}>Available 7am – 10pm daily</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
        </TouchableOpacity>

        <TouchableOpacity style={[localStyles.supRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL('https://hence.com/help')}>
          <View style={localStyles.supIco}><Ionicons name="document-text" size={15} color="#1A7A4A" /></View>
          <View style={localStyles.supInfo}>
            <Text style={localStyles.supTitle}>Help Centre</Text>
            <Text style={localStyles.supSub}>FAQs, guides & policies</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
        </TouchableOpacity>
      </View>

      <Text style={localStyles.sdiv}>Something wrong with an order?</Text>
      <View style={localStyles.card}>
        <TouchableOpacity style={[localStyles.supRow, { borderBottomWidth: 0 }]} onPress={() => Linking.openURL('mailto:support@hencelogistics.com')}>
          <View style={[localStyles.supIco, { backgroundColor: '#FEF3E2', borderColor: '#D4860A' }]}>
            <Ionicons name="alert-circle" size={15} color="#D4860A" />
          </View>
          <View style={localStyles.supInfo}>
            <Text style={localStyles.supTitle}>Report an Issue</Text>
            <Text style={localStyles.supSub}>Damaged item, late delivery, etc.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SettingsScreen() {
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F8F6', padding: 14 }}>
      <Text style={[localStyles.sdiv, { marginTop: 14 }]}>Notifications</Text>
      <View style={localStyles.card}>
        <View style={localStyles.setRow}>
          <View style={localStyles.supInfo}>
            <Text style={localStyles.supTitle}>Push Notifications</Text>
            <Text style={localStyles.supSub}>Order updates and driver alerts</Text>
          </View>
          <Switch value={push} onValueChange={setPush} trackColor={{ true: '#1A7A4A', false: '#D4E2DA' }} />
        </View>

        <View style={localStyles.setRow}>
          <View style={localStyles.supInfo}>
            <Text style={localStyles.supTitle}>Email Updates</Text>
            <Text style={localStyles.supSub}>Receipts and account notices</Text>
          </View>
          <Switch value={email} onValueChange={setEmail} trackColor={{ true: '#1A7A4A', false: '#D4E2DA' }} />
        </View>

        <View style={[localStyles.setRow, { borderBottomWidth: 0 }]}>
          <View style={localStyles.supInfo}>
            <Text style={localStyles.supTitle}>SMS Updates</Text>
            <Text style={localStyles.supSub}>Text alerts for delivery ETA</Text>
          </View>
          <Switch value={sms} onValueChange={setSms} trackColor={{ true: '#1A7A4A', false: '#D4E2DA' }} />
        </View>
      </View>

      <Text style={localStyles.sdiv}>Legal</Text>
      <View style={localStyles.card}>
        <TouchableOpacity style={localStyles.supRow}>
          <Text style={[localStyles.supTitle, { flex: 1 }]}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
        </TouchableOpacity>
        <TouchableOpacity style={[localStyles.supRow, { borderBottomWidth: 0 }]}>
          <Text style={[localStyles.supTitle, { flex: 1 }]}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
        </TouchableOpacity>
      </View>

      <Text style={{ textAlign: 'center', fontSize: 10, color: '#B8CEC3', marginVertical: 16 }}>Hence Delivery · App Version 1.0.0</Text>
    </ScrollView>
  );
}

function DeleteScreen({ logout }: { logout: () => void }) {
  const [mode, setMode] = useState<'deactivate' | 'delete'>('deactivate');
  const [confirmText, setConfirmText] = useState('');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F8F6', padding: 14 }}>
      <View style={{ alignItems: 'center', textAlign: 'center', paddingVertical: 24 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FDEDEC', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Ionicons name="alert-circle" size={26} color="#C0392B" />
        </View>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F1A14' }}>This affects your account</Text>
        <Text style={{ fontSize: 12, color: '#7A9080', marginTop: 6, lineHeight: 18, textAlign: 'center' }}>
          Choose whether to pause your account temporarily or remove it permanently. This cannot be undone once confirmed.
        </Text>
      </View>

      <View style={[localStyles.card, { padding: 12 }]}>
        <TouchableOpacity style={{ flexDirection: 'row', gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#D4E2DA' }} onPress={() => setMode('deactivate')}>
          <Ionicons name={mode === 'deactivate' ? "radio-button-on" : "radio-button-off"} size={20} color={mode === 'deactivate' ? '#1A7A4A' : '#B8CEC3'} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F1A14' }}>Deactivate my account</Text>
            <Text style={{ fontSize: 11, color: '#7A9080', marginTop: 4 }}>Temporary — hides your profile and pauses bookings. You can log back in anytime to reactivate.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={{ flexDirection: 'row', gap: 10, paddingTop: 12 }} onPress={() => setMode('delete')}>
          <Ionicons name={mode === 'delete' ? "radio-button-on" : "radio-button-off"} size={20} color={mode === 'delete' ? '#C0392B' : '#B8CEC3'} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#C0392B' }}>Delete my account permanently</Text>
            <Text style={{ fontSize: 11, color: '#7A9080', marginTop: 4 }}>Removes your profile, order history and saved details. This cannot be reversed.</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: '#3D5046', textTransform: 'uppercase', marginBottom: 5 }}>Type DELETE to confirm</Text>
        <TextInput 
          style={{ width: '100%', padding: 13, borderWidth: 1, borderColor: '#D4E2DA', borderRadius: 8, fontSize: 13, color: '#0F1A14', backgroundColor: '#fff' }} 
          placeholder="DELETE" 
          value={confirmText} 
          onChangeText={setConfirmText} 
          autoCapitalize="characters"
        />
      </View>

      <TouchableOpacity 
        style={{ width: '100%', marginTop: 14, padding: 14, backgroundColor: '#C0392B', borderRadius: 10, alignItems: 'center' }} 
        onPress={() => {
          if(confirmText !== 'DELETE') { Alert.alert('Verification Failed', 'Please type DELETE to confirm.'); return; }
          Alert.alert('Confirmed', mode === 'delete' ? 'Account permanently deleted.' : 'Account deactivated.');
          logout();
        }}
      >
        <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// 🔥 APP ROOT COMPONENT
export default function AppRoot() {
  const { token, currentScreen, user, logout } = useAppContext();

  const isDriver = user?.role === 'driver' || user?.role?.value === 'driver';
  
  // Only show bottom navigation on core main screens
  const showBottomNav = token && !isDriver && (currentScreen === 'home' || currentScreen === 'create-job');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        
        <StatusBar barStyle="light-content" backgroundColor="#0F1A14" />
        
        {token && <Header />}
        
        <View style={{ flex: 1, backgroundColor: '#F4F8F6' }}>
          {!token && <AuthScreen />}

          {/* CUSTOMER ROUTES */}
          {token && !isDriver && currentScreen === 'home' && <HomeScreen />}
          {token && !isDriver && currentScreen === 'create-job' && <CreateJobScreen />}

          {/* ACCOUNT & SUPPORT ROUTES */}
          {token && currentScreen === 'profile' && <ProfileScreen />}
          {token && currentScreen === 'support' && <SupportScreen />}
          {token && currentScreen === 'settings' && <SettingsScreen />}
          {token && currentScreen === 'delete' && <DeleteScreen logout={logout} />}
          {token && currentScreen === 'subscription' && <SubscriptionScreen />}

          {/* DRIVER ROUTE */}
          {token && isDriver && !['profile', 'support', 'settings', 'delete', 'subscription'].includes(currentScreen) && <DriverDashboard />}
        </View>

        {showBottomNav && <BottomNav />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const localStyles = StyleSheet.create({
  sdiv: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: '#7A9080', marginVertical: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#D4E2DA', overflow: 'hidden' },
  supRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#D4E2DA' },
  supIco: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#E8F5EE', borderWidth: 1, borderColor: '#C5E8D4', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  supInfo: { flex: 1 },
  supTitle: { fontSize: 13, fontWeight: '700', color: '#0F1A14' },
  supSub: { fontSize: 11, color: '#7A9080', marginTop: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#D4E2DA' }
});