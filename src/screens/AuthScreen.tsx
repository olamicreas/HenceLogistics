import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../context/AppProvider';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WelcomeScreen from './WelcomeScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = 'https://hencedelivery.com';

type Mode = 'login' | 'signup_customer' | 'signup_driver';

function DriverOnboarding({ onExit }: { onExit: () => void }) {
  const insets = useSafeAreaInsets(); 

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔥 FIX 1: Converted Vehicle from a single string to a multi-select Array!
  const [vehicles, setVehicles] = useState<string[]>(['large']);
  const [ops, setOps] = useState<string[]>([]);
  const [rankOrder, setRankOrder] = useState<string[]>([]);
  const [plan, setPlan] = useState<'basic' | 'pro' | null>(null);
  const [hasFullLicence, setHasFullLicence] = useState<boolean | null>(null);
  
  // Vehicle Details State
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');

  const opNames: Record<string, string> = {
    courier: 'Courier',
    delivery: 'Delivery Driver',
    manvan: 'Man with a Van'
  };

  // 🔥 NEW: Toggle function for multi-selecting vehicles
  const toggleVehicle = (vid: string) => {
    if (vehicles.includes(vid)) {
      setVehicles(vehicles.filter(v => v !== vid));
    } else {
      setVehicles([...vehicles, vid]);
    }
  };

  const toggleOp = (op: string) => {
    let newOps;
    if (ops.includes(op)) {
      newOps = ops.filter(o => o !== op);
    } else {
      newOps = [...ops, op];
    }
    setOps(newOps);
    
    const newRank = newOps.filter(o => rankOrder.includes(o));
    newOps.forEach(o => { if (!newRank.includes(o)) newRank.push(o); });
    setRankOrder(newRank);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newRank = [...rankOrder];
    [newRank[index - 1], newRank[index]] = [newRank[index], newRank[index - 1]];
    setRankOrder(newRank);
  };

  const moveDown = (index: number) => {
    if (index === rankOrder.length - 1) return;
    const newRank = [...rankOrder];
    [newRank[index + 1], newRank[index]] = [newRank[index], newRank[index + 1]];
    setRankOrder(newRank);
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    try {
      const activeToken = await AsyncStorage.getItem('token');

      await axios.post(`${API_URL}/auth/driver/onboarding`, {
        vehicle_type: vehicles, // 🔥 FIX 2: Sending the full array of selected vehicles
        vehicle_reg: vehicleReg,
        vehicle_year: vehicleYear,
        vehicle_make: vehicleMake,
        operator_types: ops,
        operator_rank: rankOrder,
        plan: plan,
        has_full_licence: hasFullLicence
      }, {
        headers: {
          Authorization: `Bearer ${activeToken}`
        }
      });
      
      setStep(6);
    } catch (error) {
      console.error("Failed to save driver onboarding:", error);
      Alert.alert("Submission Failed", "We couldn't save your application. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labels = ['Details', 'Vehicle', 'Type', 'Rank', 'Plan', 'Review'];
  const progressWidth = `${((step + 1) / 6) * 100}%`;

  return (
    <View style={obStyles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* HEADER */}
      {step < 6 && (
        <View style={obStyles.header}>
          <View style={[obStyles.topBar, { paddingTop: Platform.OS === 'android' ? Math.max(insets.top, 20) : 0 }]}>
            {step > 0 ? (
              <TouchableOpacity style={obStyles.backBtn} onPress={() => setStep(step - 1)}>
                <Ionicons name="arrow-back" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={obStyles.logoWrap}>
                <Text style={obStyles.logoWordmark}>
                  HENCE<Text style={{ color: '#1A7A4A' }}>.</Text>
                </Text>
                <Text style={obStyles.logoSub}>Driver</Text>
              </View>
            )}
            <Text style={obStyles.title}>
              {step === 0 && 'Address & Licence'}
              {step === 1 && 'Vehicle Details'}
              {step === 2 && 'Operator Type'}
              {step === 3 && 'Rank Your Types'}
              {step === 4 && 'Choose Your Plan'}
              {step === 5 && 'Review & Submit'}
            </Text>
            <View style={{ width: 32 }} />
          </View>
          
          <View style={obStyles.progContainer}>
            <View style={obStyles.progTrack}>
              <View style={[obStyles.progFill, { width: progressWidth }]} />
            </View>
            <View style={obStyles.progLabels}>
              {labels.map((lbl, i) => (
                <Text key={lbl} style={[obStyles.progLbl, step === i && obStyles.progLblOn]}>{lbl}</Text>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* SCROLL CONTENT */}
      <ScrollView style={obStyles.scrollArea} contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        
        {step === 0 && (
          <>
            <View style={obStyles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#1A7A4A" style={{ marginTop: 2 }} />
              <Text style={obStyles.infoText}>Your account is created. Now complete your driver profile — we need your address and licence details before your first job.</Text>
            </View>

            <View style={obStyles.card}>
              <View style={obStyles.cardHeader}>
                <View>
                  <Text style={obStyles.cardTitle}>Home Address</Text>
                  <Text style={obStyles.cardSub}>Where are you based?</Text>
                </View>
              </View>
              <View style={obStyles.cardBody}>
                <Text style={obStyles.label}>Street Address</Text>
                <TextInput style={obStyles.input} placeholder="e.g. 14 Belgard Road, Tallaght" placeholderTextColor="#B8CEC3" />
                
                <View style={obStyles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={obStyles.label}>City / Town</Text>
                    <TextInput style={obStyles.input} placeholder="e.g. Dublin" placeholderTextColor="#B8CEC3" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={obStyles.label}>Eircode</Text>
                    <TextInput style={[obStyles.input, obStyles.mono]} placeholder="D24 KT77" placeholderTextColor="#B8CEC3" />
                  </View>
                </View>
              </View>
            </View>

            <View style={obStyles.card}>
              <View style={obStyles.cardHeader}>
                <View>
                  <Text style={obStyles.cardTitle}>Driving Licence</Text>
                  <Text style={obStyles.cardSub}>Required for verification</Text>
                </View>
              </View>
              <View style={obStyles.cardBody}>
                <Text style={[obStyles.label, { fontSize: 13, color: '#0F1A14', marginBottom: 12, textTransform: 'none' }]}>
                  Do you have a full license?
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity 
                    style={[obStyles.vChip, { flex: 1, marginBottom: 0, justifyContent: 'center' }, hasFullLicence === true && obStyles.vChipOn]} 
                    onPress={() => setHasFullLicence(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[obStyles.vName, hasFullLicence === true && { color: '#1A7A4A' }]}>Yes</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      obStyles.vChip, 
                      { flex: 1, marginBottom: 0, justifyContent: 'center' }, 
                      hasFullLicence === false && { borderColor: '#E74C3C', backgroundColor: '#FDF2F2' }
                    ]} 
                    onPress={() => setHasFullLicence(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[obStyles.vName, hasFullLicence === false && { color: '#E74C3C' }]}>No</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <View style={obStyles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#1A7A4A" style={{ marginTop: 2 }} />
              <Text style={obStyles.infoText}>Your vehicle determines which jobs you receive. <Text style={{fontWeight: '700', color: '#1A7A4A'}}>Select all vehicles you operate.</Text></Text>
            </View>

            <View style={obStyles.card}>
              <View style={obStyles.cardHeader}>
                <View>
                  <Text style={obStyles.cardTitle}>Your Vehicles</Text>
                  <Text style={obStyles.cardSub}>Select one or multiple vehicles</Text>
                </View>
              </View>
              <View style={obStyles.cardBody}>
                <View style={{ gap: 8, marginBottom: 16 }}>
                  {[
                    { id: 'large', name: 'Large Van', desc: 'Up to 1,500 kg · All operator types', icon: 'bus-outline' },
                    { id: 'cargo', name: 'Cargo Van', desc: 'Up to 800 kg · Courier & Delivery', icon: 'car-sport-outline' },
                    { id: 'luton', name: 'Luton Van', desc: 'Up to 3,000 kg · Delivery & Man with Van', icon: 'cube-outline' },
                    { id: 'dropside', name: 'Dropside / Flatbed', desc: 'Open flatbed · Oversized loads', icon: 'construct-outline' }
                  ].map(v => {
                    const isOn = vehicles.includes(v.id);
                    return (
                      <TouchableOpacity key={v.id} style={[obStyles.vChip, isOn && obStyles.vChipOn]} onPress={() => toggleVehicle(v.id)} activeOpacity={0.8}>
                        <Ionicons name={v.icon as any} size={22} color={isOn ? '#1A7A4A' : '#7A9080'} style={{ marginRight: 4 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={obStyles.vName}>{v.name}</Text>
                          <Text style={obStyles.vDesc}>{v.desc}</Text>
                        </View>
                        <View style={[obStyles.vSel, isOn && obStyles.vSelOn]} />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={obStyles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={obStyles.label}>Registration</Text>
                    <TextInput style={[obStyles.input, obStyles.mono]} placeholder="201-D-123" placeholderTextColor="#B8CEC3" value={vehicleReg} onChangeText={setVehicleReg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={obStyles.label}>Year</Text>
                    <TextInput style={[obStyles.input, obStyles.mono]} placeholder="2020" placeholderTextColor="#B8CEC3" keyboardType="numeric" value={vehicleYear} onChangeText={setVehicleYear} />
                  </View>
                </View>
                <Text style={obStyles.label}>Make & Model</Text>
                <TextInput style={obStyles.input} placeholder="e.g. Ford Transit Custom" placeholderTextColor="#B8CEC3" value={vehicleMake} onChangeText={setVehicleMake} />
              </View>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={obStyles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#1A7A4A" style={{ marginTop: 2 }} />
              <Text style={obStyles.infoText}><Text style={{fontWeight: '700', color: '#1A7A4A'}}>Select the type of driver you are.</Text> The dispatch system sends you jobs within your declared operator types.</Text>
            </View>

            <View style={obStyles.card}>
              <View style={obStyles.cardHeader}>
                <View>
                  <Text style={obStyles.cardTitle}>Operator Types</Text>
                  <Text style={obStyles.cardSub}>{ops.length === 0 ? 'Select at least one type' : `${ops.length} type${ops.length > 1 ? 's' : ''} selected`}</Text>
                </View>
              </View>
              <View style={obStyles.cardBody}>
                <View style={{ gap: 8 }}>
                  {[
                    { id: 'courier', name: 'Courier', desc: 'Parcel & city run specialist. Speed focused.', tags: ['Single & Multi'], icon: 'flash-outline' },
                    { id: 'delivery', name: 'Delivery Driver', desc: 'Careful handling of large items & furniture.', tags: ['Single & Multi'], icon: 'cube-outline' },
                    { id: 'manvan', name: 'Man with a Van', desc: 'Hands-on. Removals, trade materials, recycling.', tags: ['Heavy lift'], icon: 'body-outline' }
                  ].map(op => {
                    const isOn = ops.includes(op.id);
                    return (
                      <TouchableOpacity key={op.id} style={[obStyles.opItem, isOn && obStyles.opItemOn]} onPress={() => toggleOp(op.id)} activeOpacity={0.8}>
                        <View style={[obStyles.opIco, isOn && obStyles.opIcoOn]}>
                          <Ionicons name={op.icon as any} size={20} color={isOn ? '#1A7A4A' : '#7A9080'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={obStyles.opName}>{op.name}</Text>
                          <Text style={obStyles.opDesc}>{op.desc}</Text>
                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                            {op.tags.map(t => <View key={t} style={obStyles.tag}><Text style={obStyles.tagText}>{t}</Text></View>)}
                          </View>
                        </View>
                        <View style={[obStyles.vSel, isOn && obStyles.vSelOn]} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View style={obStyles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#1A7A4A" style={{ marginTop: 2 }} />
              <Text style={obStyles.infoText}><Text style={{fontWeight: '700', color: '#1A7A4A'}}>Rank your preferred operator types.</Text> When dispatch has multiple eligible drivers, your ranking determines priority.</Text>
            </View>

            <View style={obStyles.card}>
              <View style={obStyles.cardHeader}>
                <View>
                  <Text style={obStyles.cardTitle}>Preference Order</Text>
                  <Text style={obStyles.cardSub}>Use arrows to reorder · #1 is primary</Text>
                </View>
              </View>
              <View style={obStyles.cardBody}>
                <View style={{ gap: 6 }}>
                  {rankOrder.map((key, i) => (
                    <View key={key} style={obStyles.rankItem}>
                      <Text style={obStyles.rankN}>#{i + 1}</Text>
                      <Text style={obStyles.rankName}>{opNames[key]}</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={obStyles.rankBtn} onPress={() => moveUp(i)} disabled={i === 0}>
                          <Ionicons name="chevron-up" size={18} color={i === 0 ? '#D4E2DA' : '#1A7A4A'} />
                        </TouchableOpacity>
                        <TouchableOpacity style={obStyles.rankBtn} onPress={() => moveDown(i)} disabled={i === rankOrder.length - 1}>
                          <Ionicons name="chevron-down" size={18} color={i === rankOrder.length - 1 ? '#D4E2DA' : '#1A7A4A'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <View style={{ gap: 10 }}>
              <TouchableOpacity style={[obStyles.planCard, plan === 'basic' && obStyles.planCardOn]} onPress={() => setPlan('basic')} activeOpacity={0.9}>
                <Text style={[obStyles.planTier, plan === 'basic' && { color: '#1A7A4A' }]}>BASIC PLAN</Text>
                <Text style={obStyles.planPrice}>€29<Text style={{ fontSize: 16 }}>.99</Text></Text>
                <Text style={obStyles.planMo}>per month</Text>
                <View style={obStyles.planHr} />
                <View style={{ gap: 6 }}>
                  {['Hence driver app access', 'Dispatch system job matching', 'Keep 100% of all delivery fees', 'One operator type only'].map(f => (
                    <View key={f} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Ionicons name="checkmark" size={14} color="#1A7A4A" />
                      <Text style={obStyles.planFeat}>{f}</Text>
                    </View>
                  ))}
                </View>
                <View style={[obStyles.planSel, plan === 'basic' && obStyles.planSelOn]} />
              </TouchableOpacity>

              <TouchableOpacity style={[obStyles.planCard, obStyles.planPro, plan === 'pro' && obStyles.planCardOn]} onPress={() => setPlan('pro')} activeOpacity={0.9}>
                <Text style={[obStyles.planTier, { color: '#1A7A4A' }]}>PRO PLAN — MOST POPULAR</Text>
                <Text style={obStyles.planPrice}>€59<Text style={{ fontSize: 16 }}>.99</Text></Text>
                <Text style={obStyles.planMo}>per month</Text>
                <View style={obStyles.planHr} />
                <View style={{ gap: 6 }}>
                  {['Everything in Basic', 'Priority dispatch queue', 'Multiple operator types', 'Multi-drop job eligibility', 'Dedicated driver support'].map(f => (
                    <View key={f} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Ionicons name="checkmark" size={14} color="#1A7A4A" />
                      <Text style={obStyles.planFeat}>{f}</Text>
                    </View>
                  ))}
                </View>
                <View style={[obStyles.planSel, plan === 'pro' && obStyles.planSelOn]} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 5 && (
          <>
            <View style={obStyles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#1A7A4A" style={{ marginTop: 2 }} />
              <Text style={obStyles.infoText}>Your operator type is <Text style={{fontWeight: '700', color: '#1A7A4A'}}>locked for 30 days</Text> after submission. Changes can be requested from your profile after that period.</Text>
            </View>

            <View style={obStyles.card}>
              <View style={obStyles.cardHeader}>
                <Text style={obStyles.cardTitle}>Application Summary</Text>
              </View>
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <View style={obStyles.sumRow}>
                  <Text style={obStyles.sumLbl}>Vehicles</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                    {vehicles.map(v => <View key={v} style={obStyles.sumTag}><Text style={obStyles.sumTagTxt}>{v.toUpperCase()}</Text></View>)}
                  </View>
                </View>
                <View style={obStyles.sumRow}>
                  <Text style={obStyles.sumLbl}>Plan</Text>
                  <Text style={obStyles.sumVal}>{plan === 'pro' ? 'Pro Plan · €59.99/mo' : 'Basic Plan · €29.99/mo'}</Text>
                </View>
                <View style={obStyles.sumRow}>
                  <Text style={obStyles.sumLbl}>Types</Text>
                  <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                    {ops.map(o => <View key={o} style={obStyles.sumTag}><Text style={obStyles.sumTagTxt}>{opNames[o]}</Text></View>)}
                  </View>
                </View>
                <View style={[obStyles.sumRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <Text style={obStyles.sumLbl}>Primary</Text>
                  <Text style={obStyles.sumVal}>{rankOrder.length > 0 ? opNames[rankOrder[0]] : '—'}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {step === 6 && (
          <View style={obStyles.successContainer}>
            <View style={obStyles.successMark}>
              <Ionicons name="checkmark" size={32} color="#fff" />
            </View>
            <Text style={obStyles.successTitle}>You're on board.</Text>
            <Text style={obStyles.successDesc}>Your application has been submitted. We'll review your details and get back to you within 2 business days.</Text>
            <View style={obStyles.codeBox}>
              <Text style={obStyles.codeText}>HNC-IE-54920</Text>
            </View>
            <Text style={obStyles.codeHint}>Save your reference number</Text>
          </View>
        )}
      </ScrollView>

      {step < 6 ? (
        <View style={[obStyles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity 
            style={[obStyles.ctaBtn, ((step === 0 && hasFullLicence === null) || (step === 1 && vehicles.length === 0) || (step === 2 && ops.length === 0) || (step === 4 && !plan)) ? obStyles.ctaDim : obStyles.ctaActive]} 
            disabled={(step === 0 && hasFullLicence === null) || (step === 1 && vehicles.length === 0) || (step === 2 && ops.length === 0) || (step === 4 && !plan) || isSubmitting}
            onPress={() => {
              if (step === 5) {
                handleSubmitApplication();
              } else {
                setStep(step + 1);
              }
            }}
          >
            {isSubmitting && step === 5 ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[obStyles.ctaText, ((step === 2 && ops.length === 0) || (step === 4 && !plan)) ? { color: '#fff' } : { color: '#fff' }]}>
                {step === 0 && 'Continue — Vehicle Details →'}
                {step === 1 && (vehicles.length === 0 ? 'Select a vehicle to continue' : 'Continue — Operator Type →')}
                {step === 2 && (ops.length === 0 ? 'Select a type to continue' : `Continue — Rank Types →`)}
                {step === 3 && 'Continue — Choose Your Plan →'}
                {step === 4 && (!plan ? 'Select a plan to continue' : `Continue with ${plan === 'pro' ? 'Pro' : 'Basic'} →`)}
                {step === 5 && 'Submit Application ✓'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[obStyles.footer, { backgroundColor: '#0F2D20', borderTopWidth: 0, paddingBottom: Math.max(insets.bottom + 10, 32) }]}>
          <TouchableOpacity style={[obStyles.ctaBtn, { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1 }]} onPress={onExit}>
            <Text style={[obStyles.ctaText, { color: '#0F2D20' }]}>Enter the Driver App →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}


export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [successScreen, setSuccessScreen] = useState<'customer' | 'driver' | null>(null);
  
  const { setCurrentScreen, setToken, setUser } = useAppContext();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [eircode, setEircode] = useState('');

  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver' | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const loadSavedRole = async () => {
      try {
        const savedRole = await AsyncStorage.getItem('@app_role');
        if (savedRole === 'customer' || savedRole === 'driver') {
          setSelectedRole(savedRole);
        }
      } catch (error) {
        console.log("Error loading role:", error);
      } finally {
        setIsCheckingRole(false);
      }
    };
    loadSavedRole();
  }, []);

  const handleRoleSelection = async (role: 'customer' | 'driver') => {
    setSelectedRole(role);
    try {
      await AsyncStorage.setItem('@app_role', role);
    } catch (error) {
      console.log("Error saving role:", error);
    }
  };

  const getPasswordStrength = (pass: string) => {
    let s = 0;
    if (pass.length >= 8) s++;
    if (/[A-Z]/.test(pass)) s++;
    if (/[0-9]/.test(pass)) s++;
    if (/[^A-Za-z0-9]/.test(pass)) s++;
    return Math.min(s, 4);
  };

  const strength = getPasswordStrength(password);
  const strengthLabels = ['Too weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#C0392B', '#C47A0A', '#22A862', '#1A7A4A'];

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setSuccessScreen(null);
    setPassword('');
    setConfirmPassword('');
    setTermsAccepted(false);
  };

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (mode === 'login') {
        if (!selectedRole) throw new Error('Please select whether you need a delivery or are a driver.');
        if (!email.trim() || !password.trim()) throw new Error('Email and password are required.');

        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);

        const res = await axios.post(`${API_URL}/auth/token`, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        await AsyncStorage.setItem('token', res.data.access_token);
        if (res.data.user) {
            await AsyncStorage.setItem('userData', JSON.stringify(res.data.user));
        }

        setToken(res.data.access_token);
        setUser(res.data.user || { role: selectedRole });
        setCurrentScreen(selectedRole === 'driver' ? 'driver-dashboard' : 'home');
      }

      if (mode === 'signup_customer' || mode === 'signup_driver') {
        if (!termsAccepted) throw new Error('You must accept the terms to continue.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        if (!firstName || !lastName || !email || !phone) throw new Error('Please fill out all personal details.');
      }

      if (mode === 'signup_customer') {
        await axios.post(`${API_URL}/auth/register`, {
          email, password, first_name: firstName, last_name: lastName, phone, role: 'customer',
        });
        
        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);
        const loginRes = await axios.post(`${API_URL}/auth/token`, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        
        await AsyncStorage.setItem('token', loginRes.data.access_token);
        if (loginRes.data.user) {
            await AsyncStorage.setItem('userData', JSON.stringify(loginRes.data.user));
        }

        setSuccessScreen('customer');
      }

      if (mode === 'signup_driver') {
        if (!address || !eircode) throw new Error('Address and Eircode are required for drivers.');

        await axios.post(`${API_URL}/auth/register`, {
          email, password, first_name: firstName, last_name: lastName, phone, address, eircode, role: 'driver',
        });

        const params = new URLSearchParams();
        params.append('username', email);
        params.append('password', password);
        const loginRes = await axios.post(`${API_URL}/auth/token`, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        
        await AsyncStorage.setItem('token', loginRes.data.access_token);
        if (loginRes.data.user) {
            await AsyncStorage.setItem('userData', JSON.stringify(loginRes.data.user));
        }

        setSuccessScreen('driver');
      }
    } catch (e: any) {
      let errorMsg = 'An unexpected error occurred. Please try again.';
      if (e.response && e.response.data) {
        if (typeof e.response.data.detail === 'string') {
          errorMsg = e.response.data.detail;
        } else if (Array.isArray(e.response.data.detail)) {
          errorMsg = e.response.data.detail[0].msg;
        } else if (e.response.data.message) {
          errorMsg = e.response.data.message;
        }
      } else if (e.message) {
        errorMsg = e.message;
      }

      Alert.alert('Registration Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (showOnboarding) {
    return <DriverOnboarding onExit={async () => { 
      setShowOnboarding(false); 
      
      const savedToken = await AsyncStorage.getItem('token');
      const savedUser = await AsyncStorage.getItem('userData');
      if (savedToken) setToken(savedToken);
      if (savedUser) setUser(JSON.parse(savedUser));
      
      setCurrentScreen('driver-dashboard');
    }} />;
  }

  const renderPasswordStrength = () => (
    <View style={styles.strContainer}>
      <View style={styles.strBars}>
        {[1, 2, 3, 4].map((level) => (
          <View key={level} style={[styles.strBar, strength >= level ? { backgroundColor: strengthColors[strength - 1] } : null]} />
        ))}
      </View>
      <Text style={[styles.strLabel, strength > 0 ? { color: strengthColors[strength - 1] } : null]}>
        {strength > 0 ? strengthLabels[strength - 1] : ''}
      </Text>
    </View>
  );

  const isSignUp = mode === 'signup_driver' || mode === 'signup_customer';

  if (isCheckingRole) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111820', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1A7A4A" />
      </View>
    );
  }

  if (!selectedRole) {
    return <WelcomeScreen onSelectRole={handleRoleSelection} selectedRole={selectedRole} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: isSignUp ? '#0F2D20' : '#111820' }}>
      <StatusBar barStyle={isSignUp ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={ isSignUp ? ['#0F2D20', '#0F2D20'] : ['#C8E8D4', '#D8F0E0', '#EAF7EE', '#F5FDF8'] }
        locations={isSignUp ? [0, 1] : [0, 0.3, 0.65, 1]}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

            {mode === 'login' && (
              <View style={styles.loginContainer}>
                <View style={styles.loginBrand}>
                  <Image source={require('../../assets/logo1.png')} style={styles.logoImage} resizeMode="contain" />
                  <Text style={styles.loginTagline}>DELIVERY MATTERS</Text>
                </View>

                <View style={[styles.loginForm, { paddingBottom: Math.max(insets.bottom + 20, 44) }]}>
                  <Text style={styles.loginTitle}>Sign In</Text>

                  <TextInput style={styles.loginInput} placeholder="Email address" placeholderTextColor="#9AB5A4" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                  <TextInput style={styles.loginInput} placeholder="Password" placeholderTextColor="#9AB5A4" secureTextEntry value={password} onChangeText={setPassword} />

                  <TouchableOpacity style={styles.loginForgot}>
                    <Text style={styles.loginForgotText}>Forgot password?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={loading ? styles.ctaPrimary : styles.ctaOutline} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.ctaOutlineText}>Sign In</Text>}
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.divLine} />
                    <Text style={styles.divText}>or</Text>
                    <View style={styles.divLine} />
                  </View>

                  {selectedRole === 'driver' ? (
                    <TouchableOpacity style={styles.loginRegister} onPress={() => switchMode('signup_driver')}>
                      <Text style={styles.loginRegisterText}>New driver? <Text style={styles.loginRegisterLink}>Register here →</Text></Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.loginRegister} onPress={() => switchMode('signup_customer')}>
                      <Text style={styles.loginRegisterText}>New to Hence? <Text style={styles.loginRegisterLink}>Create an account</Text></Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={{ alignItems: 'center', marginTop: 24 }} onPress={async () => {
                    setSelectedRole(null);
                    await AsyncStorage.removeItem('@app_role');
                  }}>
                    <Text style={{ fontSize: 13, color: '#7A9080', fontWeight: '500' }}>
                      Not a {selectedRole}? <Text style={{ color: '#1A7A4A', fontWeight: '700' }}>Change Role</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {mode === 'signup_customer' && (
              <View style={styles.suContainer}>
                <View style={[styles.suHeader, { paddingBottom: 22, paddingTop: Math.max(insets.top, 10) }]}>
                  <TouchableOpacity style={[styles.suBack, { backgroundColor: 'rgba(255,255,255,0.08)', top: Math.max(insets.top, 10) }]} onPress={() => switchMode('login')}>
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </TouchableOpacity>
                  <Text style={[styles.suWordmark, { color: '#fff' }]}>HENCE<Text style={{ color: '#1A7A4A' }}>.</Text></Text>
                  <Text style={[styles.suSub, { color: 'rgba(255,255,255,0.4)' }]}>Customer sign up</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, backgroundColor: '#E8F0EB', paddingBottom: Math.max(insets.bottom + 20, 20) }}>
                  {successScreen === 'customer' ? (
                    <View style={styles.successBlock}>
                      <View style={styles.successTickWrapper}>
                        <View style={styles.successTick}>
                          <Ionicons name="checkmark" size={32} color="#fff" />
                        </View>
                      </View>
                      <Text style={styles.successTitle}>Account created.</Text>
                      <Text style={styles.successDesc}>You're all set! Sign in to start booking deliveries across Dublin.</Text>
                      
                      <TouchableOpacity style={styles.ctaPrimary} onPress={async () => {
                        const savedToken = await AsyncStorage.getItem('token');
                        const savedUser = await AsyncStorage.getItem('userData');
                        if (savedToken) setToken(savedToken);
                        if (savedUser) setUser(JSON.parse(savedUser));
                        setCurrentScreen('home');
                      }}>
                        <Text style={styles.ctaPrimaryText}>Sign In and Book →</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.suForm, { backgroundColor: '#F4F8F6', borderRadius: 20 }]}>
                      <Text style={styles.suSecTitle}>YOUR DETAILS</Text>
                      <View style={styles.suRow}>
                        <View style={styles.suField}><Text style={styles.suLabel}>First Name</Text><TextInput style={styles.suInput} placeholder="Aoife" placeholderTextColor="#B8CEC3" value={firstName} onChangeText={setFirstName} /></View>
                        <View style={styles.suField}><Text style={styles.suLabel}>Last Name</Text><TextInput style={styles.suInput} placeholder="Kelly" placeholderTextColor="#B8CEC3" value={lastName} onChangeText={setLastName} /></View>
                      </View>
                      <View style={styles.suField}><Text style={styles.suLabel}>Email Address</Text><TextInput style={styles.suInput} placeholder="you@example.com" placeholderTextColor="#B8CEC3" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} /></View>
                      <View style={styles.suField}><Text style={styles.suLabel}>Mobile Number</Text><TextInput style={styles.suInput} placeholder="+353 87..." placeholderTextColor="#B8CEC3" keyboardType="phone-pad" value={phone} onChangeText={setPhone} /></View>

                      <Text style={styles.suSecTitle}>ACCOUNT SECURITY</Text>
                      <View style={styles.suField}><Text style={styles.suLabel}>Password</Text><TextInput style={styles.suInput} placeholder="Create a password" placeholderTextColor="#B8CEC3" secureTextEntry value={password} onChangeText={setPassword} />{renderPasswordStrength()}</View>
                      <View style={styles.suField}><Text style={styles.suLabel}>Confirm Password</Text><TextInput style={styles.suInput} placeholder="Repeat your password" placeholderTextColor="#B8CEC3" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} /></View>

                      <TouchableOpacity style={styles.suTerms} onPress={() => setTermsAccepted(!termsAccepted)} activeOpacity={0.8}>
                        <View style={[styles.suChk, termsAccepted && styles.suChkOn]}>{termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}</View>
                        <Text style={styles.suTermsTxt}>I agree to the <Text style={styles.suLink}>Terms of Service</Text> and <Text style={styles.suLink}>Privacy Policy</Text>. Hence will use my details to manage my account and process bookings.</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.ctaPrimary} onPress={handleAuth} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaPrimaryText}>Create Account</Text>}
                      </TouchableOpacity>

                      <View style={styles.divider}><View style={styles.divLine} /><Text style={styles.divText}>want to drive?</Text><View style={styles.divLine} /></View>

                      <TouchableOpacity style={styles.suSwitchLink} onPress={() => switchMode('signup_driver')}>
                        <Ionicons name="car-sport-outline" size={18} color="#1A7A4A" />
                        <Text style={styles.suSwitchText}>Driver? <Text style={{ color: '#1A7A4A', fontWeight: '800' }}>Register here →</Text></Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.suSignin} onPress={() => switchMode('login')}>
                        <Text style={styles.suSigninText}>Already have an account? <Text style={styles.suLink}>Sign in</Text></Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            {mode === 'signup_driver' && (
              <View style={styles.suContainer}>
                <View style={[styles.suHeader, { paddingBottom: 22, paddingTop: Math.max(insets.top, 10) }]}>
                  <TouchableOpacity style={[styles.suBack, { backgroundColor: 'rgba(255,255,255,0.08)', top: Math.max(insets.top, 10) }]} onPress={() => switchMode('login')}>
                    <Ionicons name="chevron-back" size={20} color="#fff" />
                  </TouchableOpacity>
                  <Text style={[styles.suWordmark, { color: '#fff' }]}>HENCE<Text style={{ color: '#1A7A4A' }}>.</Text></Text>
                  <Text style={[styles.suSub, { color: 'rgba(255,255,255,0.4)' }]}>Driver sign up</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, backgroundColor: '#E8F0EB', paddingBottom: Math.max(insets.bottom + 20, 20) }}>
                  {successScreen === 'driver' ? (
                    <View style={styles.successBlock}>
                      <View style={styles.successTickWrapper}>
                        <View style={styles.successTick}>
                          <Ionicons name="checkmark" size={32} color="#fff" />
                        </View>
                      </View>
                      <Text style={styles.successTitle}>Account created.</Text>
                      <Text style={styles.successDesc}>Now complete your driver registration — add your vehicle, operator type, and choose your plan.</Text>
                      <TouchableOpacity style={styles.ctaPrimary} onPress={() => setShowOnboarding(true)}>
                        <Text style={styles.ctaPrimaryText}>Continue to Registration →</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.suForm, { backgroundColor: '#F4F8F6', borderRadius: 20 }]}>
                      <View style={styles.suInfoBox}>
                        <Ionicons name="information-circle-outline" size={18} color="#1A7A4A" style={{ marginTop: 2, marginRight: 8 }} />
                        <Text style={styles.suInfoTxt}>Create your account here. You'll complete your <Text style={{ color: '#1A7A4A', fontWeight: '700' }}>full driver registration</Text> — vehicle, operator type, and subscription plan — on the next screen.</Text>
                      </View>

                      <Text style={styles.suSecTitle}>PERSONAL DETAILS</Text>
                      
                      <View style={styles.suRow}>
                        <View style={styles.suField}>
                          <Text style={styles.suLabel}>First Name</Text>
                          <TextInput style={styles.suInput} placeholder="Aoife" placeholderTextColor="#B8CEC3" value={firstName} onChangeText={setFirstName} />
                        </View>
                        <View style={styles.suField}>
                          <Text style={styles.suLabel}>Last Name</Text>
                          <TextInput style={styles.suInput} placeholder="Kelly" placeholderTextColor="#B8CEC3" value={lastName} onChangeText={setLastName} />
                        </View>
                      </View>

                      <View style={styles.suField}>
                        <Text style={styles.suLabel}>Date of Birth</Text>
                        <TextInput style={styles.suInput} placeholder="DD/MM/YYYY" placeholderTextColor="#B8CEC3" value={dob} onChangeText={setDob} keyboardType="numbers-and-punctuation" />
                      </View>
                      <View style={styles.suField}><Text style={styles.suLabel}>Email Address</Text><TextInput style={styles.suInput} placeholder="you@example.com" placeholderTextColor="#B8CEC3" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} /></View>
                      <View style={styles.suField}><Text style={styles.suLabel}>Mobile Number</Text><TextInput style={styles.suInput} placeholder="+353 87..." placeholderTextColor="#B8CEC3" keyboardType="phone-pad" value={phone} onChangeText={setPhone} /></View>
                      <View style={styles.suField}><Text style={styles.suLabel}>Home Address</Text><TextInput style={styles.suInput} placeholder="e.g. 14 Belgard Road, Tallaght" placeholderTextColor="#B8CEC3" value={address} onChangeText={setAddress} /></View>
                      <View style={styles.suField}><Text style={styles.suLabel}>Eircode</Text><TextInput style={[styles.suInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]} placeholder="e.g. D24 KT77" placeholderTextColor="#B8CEC3" autoCapitalize="characters" value={eircode} onChangeText={setEircode} /></View>

                      <Text style={styles.suSecTitle}>ACCOUNT SECURITY</Text>
                      <View style={styles.suField}><Text style={styles.suLabel}>Password</Text><TextInput style={styles.suInput} placeholder="Create a password" placeholderTextColor="#B8CEC3" secureTextEntry value={password} onChangeText={setPassword} />{renderPasswordStrength()}</View>
                      <View style={styles.suField}><Text style={styles.suLabel}>Confirm Password</Text><TextInput style={styles.suInput} placeholder="Repeat your password" placeholderTextColor="#B8CEC3" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} /></View>

                      <TouchableOpacity style={styles.suTerms} onPress={() => setTermsAccepted(!termsAccepted)} activeOpacity={0.8}>
                        <View style={[styles.suChk, termsAccepted && styles.suChkOn]}>{termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}</View>
                        <Text style={styles.suTermsTxt}>I agree to the <Text style={styles.suLink}>Terms of Service</Text>, <Text style={styles.suLink}>Privacy Policy</Text>, and <Text style={styles.suLink}>Driver Agreement</Text>. I confirm I hold a valid Irish driving licence.</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.ctaPrimary} onPress={handleAuth} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaPrimaryText}>Continue to Driver Registration</Text>}
                      </TouchableOpacity>

                      <View style={styles.divider}><View style={styles.divLine} /><Text style={styles.divText}>need a delivery instead?</Text><View style={styles.divLine} /></View>

                      <TouchableOpacity style={styles.suSwitchLink} onPress={() => switchMode('signup_customer')}>
                        <Ionicons name="cube-outline" size={18} color="#1A7A4A" />
                        <Text style={styles.suSwitchText}>Customer? <Text style={{ color: '#1A7A4A', fontWeight: '800' }}>Sign up here →</Text></Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.suSignin} onPress={() => switchMode('login')}>
                        <Text style={styles.suSigninText}>Already have an account? <Text style={styles.suLink}>Sign in</Text></Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

          </KeyboardAvoidingView>
        </View>
      </LinearGradient>
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  ctaPrimary: { width: '100%', paddingVertical: 16, borderRadius: 14, backgroundColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#1A7A4A', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  ctaPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },

  ctaOutline: { width: '100%', paddingVertical: 14, borderRadius: 14, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ctaOutlineText: { color: '#1A7A4A', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: '#D4E2DA' },
  divText: { fontSize: 11, color: '#B8CEC3', fontWeight: '500', textTransform: 'lowercase' },

  strContainer: { marginTop: 6 },
  strBars: { flexDirection: 'row', gap: 4 },
  strBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#D4E2DA' },
  strLabel: { fontSize: 10, color: '#7A9080', marginTop: 4, height: 14, fontWeight: '600' },

  successBlock: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40, alignItems: 'center', minHeight: 400 },
  successTickWrapper: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(26,122,74,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTick: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#0F1A14', marginBottom: 8, letterSpacing: -0.2 },
  successDesc: { fontSize: 13, color: '#7A9080', textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 10 },

  loginContainer: { flex: 1, justifyContent: 'flex-end' },
  loginBrand: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  logoImage: { width: 250, height: 90, marginBottom: 6 },
  loginTagline: { fontSize: 12, fontWeight: '500', color: 'rgba(10,36,21,0.45)', letterSpacing: 2, marginTop: 4 },
  loginForm: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 28, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 40, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  loginTitle: { fontSize: 20, fontWeight: '700', color: '#0F1A14', marginBottom: 20, textAlign: 'center' },
  
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleBox: { flex: 1, borderWidth: 2, borderColor: '#E4EBE7', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FBF9' },
  roleBoxActive: { borderColor: '#1A7A4A', backgroundColor: '#F0FAF4' },
  roleIco: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EDF2EF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  roleIcoActive: { backgroundColor: '#C5E8D4' },
  roleTextName: { fontSize: 12, fontWeight: '700', color: '#0F1A14', textAlign: 'center' },

  loginInput: { width: '100%', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F2F4F3', borderWidth: 1.5, borderColor: '#E4EBE7', borderRadius: 12, fontSize: 14, color: '#0F1A14', marginBottom: 10 },
  loginForgot: { alignItems: 'flex-end', marginBottom: 18, marginTop: -2 },
  loginForgotText: { fontSize: 13, fontWeight: '600', color: '#1A7A4A' },
  loginRegister: { alignItems: 'center', marginTop: 4 },
  loginRegisterText: { fontSize: 13, color: '#7A9080', fontWeight: '500' },
  loginRegisterLink: { color: '#1A7A4A', fontWeight: '700' },

  suContainer: { flex: 1 },
  suHeader: { paddingHorizontal: 24, alignItems: 'center', position: 'relative' },
  suBack: { position: 'absolute', left: 20, width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  suWordmark: { fontSize: 26, fontWeight: '800', color: '#0A2415', letterSpacing: -0.5, marginBottom: 2 },
  suSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '600' },
  suForm: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 32, shadowOffset: { width: 0, height: -4 }, elevation: 10 },

  suSecTitle: { fontSize: 10, fontWeight: '700', color: '#7A9080', letterSpacing: 1, marginBottom: 10, marginTop: 18 },
  suRow: { flexDirection: 'row', gap: 10 },
  suField: { flex: 1, marginBottom: 10 },
  suLabel: { fontSize: 10, fontWeight: '700', color: '#3D5046', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  suInput: { width: '100%', backgroundColor: '#F7F9F8', borderWidth: 1.5, borderColor: '#D4E2DA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F1A14' },

  suTerms: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 14, paddingRight: 10 },
  suChk: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#D4E2DA', marginRight: 12, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  suChkOn: { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },
  suTermsTxt: { flex: 1, fontSize: 12, color: '#7A9080', lineHeight: 18 },
  suLink: { color: '#1A7A4A', fontWeight: '700' },
  suSwitchLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: '#F4F8F6', borderWidth: 1.5, borderColor: '#D4E2DA', borderRadius: 12, marginBottom: 14 },
  suSwitchText: { fontSize: 13, fontWeight: '600', color: '#3D5046' },
  suSignin: { alignItems: 'center', paddingVertical: 8 },
  suSigninText: { fontSize: 13, color: '#7A9080', fontWeight: '500' },

  suInfoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#E8F5EE', borderWidth: 1, borderColor: '#C5E8D4', borderRadius: 10, padding: 12, marginBottom: 16 },
  suInfoTxt: { flex: 1, fontSize: 12, color: '#3D5046', lineHeight: 18 },
});

const obStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F2D20' },
  header: { backgroundColor: '#0F2D20' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#fff' },
  
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoWordmark: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  logoSub: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', marginLeft: 2 },

  progContainer: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.12)' },
  progTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  progLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progLbl: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 },
  progLblOn: { color: '#fff' },

  scrollArea: { flex: 1, backgroundColor: '#E8F0EB' },
  
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: '#E8F5EE', borderWidth: 1, borderColor: '#C5E8D4', borderRadius: 10, marginBottom: 12 },
  infoText: { flex: 1, fontSize: 12, color: '#3D5046', lineHeight: 18, marginLeft: 8 },

  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#D4E2DA', marginBottom: 12, overflow: 'hidden' },
  cardHeader: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#D4E2DA' },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#0F1A14', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSub: { fontSize: 10, color: '#7A9080', marginTop: 2 },
  cardBody: { padding: 14 },

  label: { fontSize: 10, fontWeight: '700', color: '#7A9080', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input: { width: '100%', padding: 12, borderWidth: 1.5, borderColor: '#D4E2DA', borderRadius: 10, fontSize: 13, color: '#0F1A14', backgroundColor: '#F7F9F8', marginBottom: 12 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  row: { flexDirection: 'row', gap: 10 },

  vChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D4E2DA', borderRadius: 10, padding: 14, marginBottom: 8, backgroundColor: '#fff' },
  vChipOn: { borderColor: '#1A7A4A', backgroundColor: '#E8F5EE' },
  vName: { fontSize: 13, fontWeight: '700', color: '#0F1A14' },
  vDesc: { fontSize: 11, color: '#7A9080', marginTop: 2 },
  vSel: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D4E2DA' },
  vSelOn: { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },

  opItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D4E2DA', borderRadius: 14, padding: 14, marginBottom: 8, backgroundColor: '#fff' },
  opItemOn: { borderColor: '#1A7A4A', backgroundColor: '#E8F5EE' },
  opIco: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F4F8F6', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#D4E2DA' },
  opIcoOn: { backgroundColor: '#C5E8D4', borderColor: '#C5E8D4' },
  opName: { fontSize: 14, fontWeight: '700', color: '#0F1A14' },
  opDesc: { fontSize: 11, color: '#7A9080', marginTop: 2, lineHeight: 16 },
  tag: { backgroundColor: '#EAF2FB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  tagText: { color: '#1E6BB8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  rankItem: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D4E2DA', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  rankN: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, fontWeight: '600', color: '#1A7A4A', width: 28 },
  rankName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F1A14' },
  rankBtn: { padding: 6, backgroundColor: '#F4F8F6', borderRadius: 6, borderWidth: 1, borderColor: '#D4E2DA' },

  planCard: { borderWidth: 1.5, borderColor: '#D4E2DA', borderRadius: 14, padding: 20, backgroundColor: '#fff' },
  planCardOn: { borderColor: '#1A7A4A', backgroundColor: '#E8F5EE' },
  planPro: { borderColor: '#1A7A4A' },
  planTier: { fontSize: 11, fontWeight: '700', color: '#B8CEC3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  planPrice: { fontSize: 32, fontWeight: '600', color: '#0F1A14', marginBottom: 2 },
  planMo: { fontSize: 12, color: '#7A9080', marginBottom: 16 },
  planHr: { height: 1, backgroundColor: '#D4E2DA', marginBottom: 16 },
  planFeat: { fontSize: 12, color: '#3D5046', lineHeight: 18 },
  planSel: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D4E2DA', alignSelf: 'flex-end', marginTop: 12 },
  planSelOn: { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },

  sumRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#D4E2DA' },
  sumLbl: { width: 90, fontSize: 10, fontWeight: '700', color: '#7A9080', textTransform: 'uppercase', letterSpacing: 0.5, paddingTop: 2 },
  sumVal: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0F1A14', lineHeight: 20 },
  sumTag: { backgroundColor: '#E8F5EE', borderWidth: 1, borderColor: '#C5E8D4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  sumTagTxt: { color: '#1A7A4A', fontSize: 10, fontWeight: '700' },

  footer: { paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#D4E2DA' },
  ctaBtn: { width: '100%', padding: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaActive: { backgroundColor: '#1A7A4A', shadowColor: '#1A7A4A', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  ctaDim: { backgroundColor: '#B8CEC3' },
  ctaText: { fontSize: 15, fontWeight: '700' },

  successContainer: { flex: 1, backgroundColor: '#0F2D20', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 600 },
  successMark: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 12 },
  successDesc: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  codeBox: { backgroundColor: 'rgba(0,0,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginBottom: 8 },
  codeText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 15, color: '#fff', letterSpacing: 1 },
  codeHint: { fontSize: 11, color: 'rgba(255,255,255,0.45)' }
});