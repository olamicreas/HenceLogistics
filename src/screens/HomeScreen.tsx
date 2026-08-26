import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Dimensions,
  Image,
  StatusBar,
  Linking,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Animated,
  PanResponder,
  AppState 
} from 'react-native';
import { Polyline } from 'react-native-maps';
import QRCode from 'react-native-qrcode-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker, AnimatedRegion } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext, BASE_URL } from '../context/AppProvider';
import axios from 'axios';
import { BookingIcon } from './BookingIcons';
import ProfileScreen from './ProfileScreen';
import DriverDashboard from './DriverDashboard';
import AccountHubScreen from './AccountHubScreen';
import { styles as globalStyles, modalStyles, ratingStyles } from '../styles';

// 🔥 GLOBAL OVERRIDE: Force push notifications to display while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_AVATAR = require('../../assets/cargovan.png');
const DUBLIN_REGION = { latitude: 53.3498, longitude: -6.2603, latitudeDelta: 0.05, longitudeDelta: 0.05 };
const DUBLIN_PICK_REGION = { latitude: 53.3498, longitude: -6.2603, latitudeDelta: 0.005, longitudeDelta: 0.005 };

// 🛡️ CRASH PREVENTION HELPER: Guarantees a strict Number for Maps
const safeCoord = (val: any, fallback: number = 0) => {
  if (val === null || val === undefined || val === '') return fallback;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
};

// 🛡️ CRASH PREVENTION HELPER: Prevents NaN crashes on prices
const safePrice = (val: any) => {
  const parsed = Number(val);
  return isNaN(parsed) ? 0 : parsed;
};

const COLORS = {
  primary: '#1A7A4A',
  primaryLight: '#22A862',
  primarySoft: '#E8F5EE',
  primaryMid: '#C5E8D4',
  ink: '#0F1A14',
  mid: '#3D5046',
  soft: '#7A9080',
  mute: '#B8CEC3',
  border: '#D4E2DA',
  bg: '#F4F8F6',
  white: '#FFFFFF',
  danger: '#C0392B',
  dangerSoft: '#FDEDEC',
  warning: '#D4860A',
  warningSoft: '#FEF3E2',
  purple: '#6B3FA0',
  purpleSoft: '#F0EAF8',
  
  // TRACKING MODAL COLORS
  forest: '#1A7A4A',
  forestDark: '#145C38',
  lemon: '#C8F135',
  paper: '#F6F8F6',
  card: '#FFFFFF',
  line: '#E2E8E4',
  textMuted: '#6B7670',
  amber: '#E8910C',
};

const mapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'water', stylers: [{ color: '#c7d2fe' }] },
];

// --- DATA: VEHICLES ---
const VEHICLES = [
  { id: 'large', name: 'Large Van', icon: 'v-large', note: 'Large Van — suitable for large parcels, furniture, appliances, catering and most deliveries up to 1,500 kg.' },
  { id: 'cargo', name: 'Cargo Van', icon: 'v-cargo', note: 'Cargo Van — best for parcels, electronics, fragile items, medical equipment and food up to 800 kg.' },
  { id: 'luton', name: 'Luton Van', icon: 'v-luton', note: 'Luton Van — ideal for house removals, large furniture and heavy loads up to 3,000 kg.' },
];

const CATEGORIES_SINGLE = [
  { id: 'collection', icon: 'cube-outline', name: 'Collection', desc: 'Pickups from homes, businesses & events' },
  { id: 'deliveries', icon: 'car-outline', name: 'Deliveries', desc: 'Same-day delivery across Ireland' },
  { id: 'removals', icon: 'trash-outline', name: 'Removals', desc: 'Clearances, moves & waste runs' },
  { id: 'warehouse', icon: 'business-outline', name: 'Warehouse', desc: 'Pallet, depot & fulfilment runs' }
];

const CATEGORIES_MULTI = [
  { id: 'deliveries', icon: 'car-outline', name: 'Deliveries', desc: 'Same-day delivery across Ireland' },
  { id: 'warehouse', icon: 'business-outline', name: 'Warehouse', desc: 'Pallet, depot & fulfilment runs' }
];

type Service = {
  id: string; name: string; desc: string; price: string; base: number; svc: number; badge: string; btxt: string; ico: string; v: string[]; mode?: 'desc' | 'items';
};

const SERVICES_SINGLE: Record<string, Service[]> = {
  collection: [
    { id: 'gen-c', name: 'General Collection', desc: 'Ad-hoc pickup — tell us what you need', price: 'From €50', base: 50, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-01', v: ['cargo','large','luton'], mode: 'desc' },
    { id: 'ret-s', name: 'Returns Collection', desc: 'Online returns to stores or warehouses', price: 'From €45', base: 45, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-01', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'stk-s', name: 'Stock & Supply Pickup', desc: 'Goods from suppliers for shops, cafes, offices', price: 'From €55', base: 55, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-02', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'fur-s', name: 'Furniture Pickup', desc: 'Sofas, beds, appliances, office furniture', price: 'From €75', base: 75, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-14', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'evt-s', name: 'Event Equipment', desc: 'Gear from venues, bands, market stalls', price: 'From €70', base: 70, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-20', v: ['cargo','large','luton'], mode: 'items' }
  ],
  deliveries: [
    { id: 'gen-d', name: 'General Delivery', desc: 'Ad-hoc delivery — tell us what you need', price: 'From €50', base: 50, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-01', v: ['cargo','large','luton'], mode: 'desc' },
    { id: 'fur-d', name: 'Furniture Delivery', desc: 'Sofas, beds, appliances with inside drop-off', price: 'From €85', base: 85, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-14', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'sto-d', name: 'Store Transfer', desc: 'Stock between shop locations or warehouse', price: 'From €65', base: 65, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-16', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'spe-d', name: 'Specialist Delivery', desc: 'High-value or fragile, white-glove service', price: 'From €120', base: 120, svc: 0, badge: 'bp', btxt: 'Priority', ico: 'si-08', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'las-d', name: 'Last-Mile Delivery', desc: 'From a local hub to the end customer', price: 'From €50', base: 50, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-01', v: ['cargo','large','luton'], mode: 'items' }
  ],
  removals: [
    { id: 'hse-r', name: 'House Clearance', desc: 'Full or partial clear-out, end of tenancy', price: 'From €145', base: 145, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-15', v: ['cargo','large','luton'], mode: 'desc' },
    { id: 'off-r', name: 'Office Clearance', desc: 'Clearing furniture when businesses relocate', price: 'From €165', base: 165, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-18', v: ['cargo','large','luton'], mode: 'desc' },
    { id: 'jnk-r', name: 'Junk & Waste Removal', desc: 'Household waste, old appliances, mattresses', price: 'From €75', base: 75, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-recycle', v: ['cargo','large','luton'], mode: 'desc' },
    { id: 'bld-r', name: 'Building Waste', desc: 'Rubble, wood, debris from DIY or contractors', price: 'From €95', base: 95, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-13', v: ['cargo','large','luton'], mode: 'desc' },
    { id: 'rec-r', name: 'Recycling Run', desc: 'Cardboard, metals, electronics, white goods', price: 'From €70', base: 70, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-recycle', v: ['cargo','large','luton'], mode: 'desc' },
    { id: 'wst-r', name: 'Waste Disposal', desc: 'Waste to licensed tips and recycling centres', price: 'From €80', base: 80, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-recycle', v: ['cargo','large','luton'], mode: 'desc' }
  ],
  warehouse: [
    { id: 'pal-w', name: 'Pallet Delivery', desc: 'Palletised goods to a single address', price: 'From €110', base: 110, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-pall', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'dep-w', name: 'Depot Transfer', desc: 'Stock between depots or warehouse sites', price: 'From €120', base: 120, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-13', v: ['cargo','large','luton'], mode: 'items' }
  ]
};

const SERVICES_MULTI: Record<string, Service[]> = {
  deliveries: [
    { id: 'mul-d', name: 'Multi-Drop Delivery', desc: 'One pickup, multiple delivery addresses', price: 'From €65', base: 65, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-std', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'sch-d', name: 'Scheduled Delivery Run', desc: 'Regular runs for shops, cafes, pharmacies', price: 'From €75', base: 75, svc: 0, badge: 'bs', btxt: 'Scheduled', ico: 'si-rec', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'lmm-d', name: 'Last-Mile Multi-Drop', desc: 'Multiple end-customers from a local hub', price: 'From €70', base: 70, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-02', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'par-m', name: 'Parcel Pickup Run', desc: 'Collecting parcels across multiple locations', price: 'From €65', base: 65, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-01', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'ret-m', name: 'Returns Run', desc: 'Multi-address returns in one trip', price: 'From €70', base: 70, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-06', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'evt-m', name: 'Event Equipment Run', desc: 'Collecting from multiple venues or stalls', price: 'From €85', base: 85, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-20', v: ['cargo','large','luton'], mode: 'items' }
  ],
  warehouse: [
    { id: 'plm-w', name: 'Pallet Delivery Run', desc: 'Pallets to multiple addresses in one booking', price: 'From €145', base: 145, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-pall', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'pkp-w', name: 'Pick & Pack Run', desc: 'Picking orders, delivering to multiple addresses', price: 'From €85', base: 85, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-01', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'dpm-w', name: 'Multi-Depot Transfer', desc: 'Stock across multiple depot or warehouse sites', price: 'From €145', base: 145, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-13', v: ['cargo','large','luton'], mode: 'items' },
    { id: 'mac-r', name: 'Multi-Address Clearance', desc: 'Clearing multiple properties in one booking', price: 'From €185', base: 185, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-15', v: ['cargo','large','luton'], mode: 'desc' },
    { id: 'mrc-r', name: 'Recycling Run', desc: 'Recyclables from multiple addresses', price: 'From €90', base: 90, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-recycle', v: ['cargo','large','luton'], mode: 'desc' }
  ]
};

// --- HELPERS ---
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => d * Math.PI / 180;
  const toDeg = (r: number) => r * 180 / Math.PI;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

function initials(name?: string | null) {
  if (!name) return 'DR';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || 'DR';
}

function formatVehicleName(v?: string | null) {
  if (!v) return 'Van';
  return String(v).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const SERVICE_NAMES: Record<string, string> = {
  'p1': 'Standard Parcel Courier',
  'pk1': 'Single Item (Furniture)',
  'pk2': 'Multi-Item (Furniture)',
  'pk3': 'Large Load / Pallet',
  'pk4': 'Trade & Materials',
  'd1': '1-Man Delivery',
  'd2': '2-Man Delivery',
  'd3': 'White Glove Delivery',
  'd6': 'Store Collection',
  'r1': 'Rubbish / Waste Removal',
  'r4': 'House Removals',
  'mf1': 'Multi-drop (1-Man)',
  'mf2': 'Multi-drop (2-Man)',
  'mf3': 'Multi-drop (Courier)',
  'mx1': 'Complex Route (1-Man)',
  'mx2': 'Complex Route (2-Man)',
  'parcel_small': 'Small Parcel Delivery',
  'furniture_items': 'Furniture & Large Items'
};

function formatJobType(v?: string | null) {
  if (!v) return 'Standard Delivery';
  const cleanId = String(v).trim().toLowerCase();
  if (SERVICE_NAMES[cleanId]) {
    return SERVICE_NAMES[cleanId];
  }
  return String(v).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function shortTime(v?: string | null) {
  if (!v) return '';
  try {
    const d = new Date(v);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

// --- SUB-COMPONENTS ---
function ChatSupportModal({ visible, onClose, user, activeBooking, sendSupportMessage, createSupportTicket }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (visible) {
      setMessages([{ id: 'bot-welcome', sender: 'bot', text: `Hi ${user?.full_name?.split(' ')[0] || 'there'} — I’m Hence Assist. How can I help today?`, time: Date.now() }]);
      setInput('');
    }
  }, [visible, user]);

  const onSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, sender: 'user', text: input.trim(), time: Date.now() }]);
    setInput('');
    setTimeout(() => setMessages(prev => [...prev, { id: `b-${Date.now()}`, sender: 'bot', text: 'I am a demo bot. Please escalate to human support for real assistance.', time: Date.now() }]), 600);
  };

  const escalateToHuman = async () => {
    const subject = `Chat escalation from ${user?.full_name}`;
    const body = `Please assist user ${user?.id} with booking ${activeBooking?.id || 'N/A'}`;
    const mailUrl = `mailto:support@hencelogistics.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailUrl).catch(() => Alert.alert('Error', 'Could not open email client.'));
  };

  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.backdrop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ position: 'absolute', top: 40, left: 12, right: 12, bottom: 40, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' }}>
            <View style={{ flex: 1 }}><Text style={{ fontWeight: '800', fontSize: 16 }}>Hence Support</Text></View>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}><Ionicons name="close" size={22} color="#374151" /></TouchableOpacity>
          </View>
          <ScrollView ref={scrollRef} style={{ flex: 1, padding: 12 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd()}>
            {messages.map((item) => (
              <View key={item.id} style={{ marginBottom: 10, alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <View style={{ backgroundColor: item.sender === 'user' ? COLORS.primary : '#F3F4F6', padding: 10, borderRadius: 12 }}>
                  <Text style={{ color: item.sender === 'user' ? 'white' : '#111827' }}>{item.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' }}>
            <TextInput placeholder="Type your message..." value={String(input || '')} onChangeText={setInput} style={{ flex: 1, backgroundColor: '#F9FAFB', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginRight: 8 }} />
            <TouchableOpacity onPress={onSend} style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 12 }}><Ionicons name="send" size={18} color="#fff" /></TouchableOpacity>
            <TouchableOpacity onPress={escalateToHuman} style={{ marginLeft: 8, padding: 10 }}><MaterialCommunityIcons name="headset" size={22} color={COLORS.primary} /></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RatingModal({ visible, onClose, onSubmit, defaultRating = 0, proofUrl }: any) {
  const [rating, setRating] = useState<number>(defaultRating);
  const [note, setNote] = useState<string>('');
  useEffect(() => { if (visible) { setRating(defaultRating); setNote(''); } }, [visible, defaultRating]);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}><View style={modalStyles.backdrop} /></TouchableWithoutFeedback>
      <View style={[modalStyles.container, { top: '15%' }]}>
        <View style={ratingStyles.card}>
          <Text style={ratingStyles.title}>Rate your driver</Text>
          {proofUrl && <View style={{ alignItems: 'center', marginVertical: 12 }}><Image source={{ uri: proofUrl }} style={{ width: 220, height: 140, borderRadius: 8, resizeMode: 'cover' }} /></View>}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 12 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} style={{ padding: 8 }}><Ionicons name={s <= rating ? 'star' : 'star-outline'} size={32} color="#f59e0b" /></TouchableOpacity>
            ))}
          </View>
          <TextInput placeholder="Leave a note..." value={String(note || '')} onChangeText={setNote} multiline style={ratingStyles.textInput} />
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={[modalStyles.btn, { backgroundColor: '#e5e7eb', flex: 1, marginRight: 8 }]} onPress={onClose}><Text style={[modalStyles.btnText, { color: '#111827' }]}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[modalStyles.btn, { backgroundColor: COLORS.primary, flex: 1 }]} onPress={() => onSubmit(rating, note)}><Text style={modalStyles.btnText}>Submit</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 🔥 ZERO-DEPENDENCY SWIPE-TO-DELETE COMPONENT
export function SwipeToDeleteItem({ ride, onDelete, children }: any) {
  const pan = React.useRef(new Animated.Value(0)).current;
  
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx < 0 && gestureState.dx >= -90) {
          pan.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50) {
          Animated.spring(pan, { toValue: -80, useNativeDriver: true }).start();
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Alert.alert(
      "Delete Order", 
      "Remove this order from your history?", 
      [
        { text: "Cancel", style: "cancel", onPress: () => Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start() }, 
        { text: "Delete", style: "destructive", onPress: () => onDelete(ride.id) }
      ]
    );
  };

  return (
    <View style={{ position: 'relative', marginBottom: 16 }}>
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: '#FFEBEB', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity onPress={handleDelete} style={{ padding: 20 }}>
          <Ionicons name="trash" size={24} color="#D64545" />
        </TouchableOpacity>
      </View>
      <Animated.View style={{ transform: [{ translateX: pan }], backgroundColor: '#fff', borderRadius: 16 }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const { height, width } = Dimensions.get('window');

// 🚀 1. THE PULSING BUTTON COMPONENT
export const PulsingQrButton = ({ onPress, isActive }: { onPress: () => void, isActive: boolean }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [isActive]);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <TouchableOpacity 
        onPress={onPress}
        style={{
          backgroundColor: isActive ? '#1A7A4A' : '#E2E8E4',
          padding: 10, borderRadius: 12,
          shadowColor: isActive ? '#1A7A4A' : 'transparent',
          shadowOpacity: isActive ? 0.4 : 0, shadowRadius: 8, elevation: isActive ? 5 : 0
        }}
      >
        <Ionicons name="qr-code" size={20} color={isActive ? '#fff' : '#666'} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// 🚀 2. THE PREMIUM HOLOGRAPHIC MODAL
export const PremiumQrModal = ({ visible, onClose, stopIndex, stopAddress, qrValue, isMulti }: any) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 8,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, { toValue: 200, duration: 1500, useNativeDriver: true }),
          Animated.timing(laserAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible && slideAnim === height) return null;

  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999, justifyContent: 'flex-end',
      transform: [{ translateY: slideAnim }],
    }}>
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={onClose} 
        style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)' }} 
      />

      <View style={{
        backgroundColor: '#111', 
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        alignItems: 'center',
        shadowColor: '#1A7A4A', shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.2, shadowRadius: 20, elevation: 20,
      }}>
        
        <View style={{ width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, marginBottom: 20 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 8 }}>
          <View style={{ backgroundColor: 'rgba(26, 122, 74, 0.2)', padding: 8, borderRadius: 12, marginRight: 12 }}>
            <Ionicons name="qr-code-outline" size={24} color="#1A7A4A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#aaa', fontSize: 13, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 1 }}>
              {stopIndex === -1 
                ? 'Collection Access Code' 
                : (!isMulti ? 'Delivery Access Code' : `Stop #${stopIndex + 1} Access Code`)
              }
            </Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
              {stopAddress}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 30, marginBottom: 20, position: 'relative' }}>
          <Animated.View style={{
            position: 'absolute', top: -15, left: -15, right: -15, bottom: -15,
            backgroundColor: 'rgba(26, 122, 74, 0.15)', borderRadius: 24,
            transform: [{ scale: pulseAnim }]
          }} />

          <View style={{
            backgroundColor: '#fff', padding: 20, borderRadius: 16,
            overflow: 'hidden', 
          }}>
            <QRCode value={String(qrValue) || 'pending'} size={180} color="#000" backgroundColor="#fff" />
            
            <Animated.View style={{
              position: 'absolute', left: 0, right: 0, height: 3,
              backgroundColor: '#1A7A4A',
              shadowColor: '#1A7A4A', shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1, shadowRadius: 8, elevation: 5,
              transform: [{ translateY: laserAnim }]
            }} />
          </View>
        </View>

        <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
          Present this code to the driver to securely confirm collection or delivery.
        </Text>

        <TouchableOpacity onPress={onClose} style={{
          backgroundColor: '#333', paddingVertical: 16, width: '100%', borderRadius: 16, alignItems: 'center'
        }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Close</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// --- MAIN HOME COMPONENT ---
export default function HomeScreen() {
  const {
    user, token, bottomTab, setCurrentScreen,
    pickupAddr, setPickupAddr, pickupCoord, setPickupCoord, stops, setStops, addStop, removeStop, updateStop,
    bookingMode, setBookingMode, isScheduled, setIsScheduled, scheduleTime, setScheduleTime,
    openQuoteFlow, activeSearchIndex, setActiveSearchIndex, scheduleSearch,
    pickupSuggestions, dropoffSuggestions, selectSearchResult,
    manService, setManService, followDriver, setFollowDriver, setMapPickTarget,
    vanType, setVanType, mapPickTarget, reverseGeocode,
    rideHistory, fetchRideHistory, driverLocation, mapRef, activeBooking, setActiveBooking,
    quoteModalVisible, setQuoteModalVisible, quoteData, creatingBooking, confirmAndPayAndCreateBooking,
    rateDriver, acknowledgeBooking, fetchDriverProfile, sendSupportMessage, createSupportTicket, checkActiveBooking
  } = useAppContext() as any;

  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<number>(1);
  const [hiddenHistoryIds, setHiddenHistoryIds] = useState<number[]>([]);
  const [sheetCategory, setSheetCategory] = useState<string | null>(null);
  const [localVanType, setLocalVanType] = useState<string>('large');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [expandedStopIdx, setExpandedStopIdx] = useState<number | null>(0);
  const [selectedStopServices, setSelectedStopServices] = useState<Record<number, Service>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');

  const [activeStopCategory, setActiveStopCategory] = useState<Record<number, string>>({});

  // Tracking / App State
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingBookingContext, setRatingBookingContext] = useState<{ bookingId?: number; driverId?: number } | null>(null);
  const [dismissedRatingIds, setDismissedRatingIds] = useState<number[]>([]);
  const [chatVisible, setChatVisible] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [tempCoord, setTempCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [bearing, setBearing] = useState<number>(0);

  const [activeQrStopIndex, setActiveQrStopIndex] = useState<number | null>(null);
  const completedBookingIds = useRef<number[]>([]);
  const mapMovedRef = useRef(false);
  const modalMapRef = useRef<any>(null);

  // 🚀 NEW: Tracker to clear the form out once a booking is successfully started
  const lastResetBookingId = useRef<number | null>(null);

  // 🔥 AUTO-RESET FORM UNDERNEATH THE TRACKING MODAL
  useEffect(() => {
    if (activeBooking && activeBooking.id && activeBooking.id !== lastResetBookingId.current) {
      setStep(1);
      setLocalVanType('large');
      setSelectedCategory(null);
      setSelectedService(null);
      setSelectedStopServices({});
      setActiveStopCategory({});
      setIsScheduled(false);
      setExpandedStopIdx(0);
      
      if (typeof setVanType === 'function') setVanType('large');
      if (typeof setBookingMode === 'function') setBookingMode('single');
      if (typeof setPickupAddr === 'function') setPickupAddr('');
      if (typeof setPickupCoord === 'function') setPickupCoord(null);
      if (typeof setStops === 'function') {
        setStops([{ address: '', recipient: '', phone: '', instructions: '', items: [{ description: '', qty: '1', weight: '', ref: '' }], weight: 45, lat: null, lon: null }]);
      }

      lastResetBookingId.current = activeBooking.id;
    }
  }, [activeBooking?.id]);

  // 🛡️ CRASH FIX 1: Ensure stops array is NEVER empty
  useEffect(() => {
    if (!Array.isArray(stops) || stops.length === 0) {
      const initialStop = {
        address: '',
        recipient: '',
        phone: '',
        instructions: '',
        items: [{ description: '', qty: '1', weight: '', ref: '' }],
        weight: 45,
        lat: null,
        lon: null,
      };
      if (typeof setStops === 'function') {
        setStops([initialStop]);
      } else if (typeof addStop === 'function') {
        addStop(initialStop);
      }
    }
  }, [stops]);

  // 🚀 THE SWIPEABLE WIDGET STATE
  const widgetPan = useRef(new Animated.Value(0)).current;
  const [widgetMinimized, setWidgetMinimized] = useState(false);

  useEffect(() => {
    widgetPan.setValue(0);
    setWidgetMinimized(false);
  }, [activeBooking?.id]);

  const widgetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        if (!widgetMinimized && gestureState.dx < 0) {
          widgetPan.setValue(gestureState.dx); 
        } else if (widgetMinimized && gestureState.dx > 0) {
          widgetPan.setValue(-SCREEN_WIDTH + 60 + gestureState.dx); 
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!widgetMinimized) {
          if (gestureState.dx < -80 || gestureState.vx < -0.5) {
            Animated.spring(widgetPan, { toValue: -SCREEN_WIDTH + 55, useNativeDriver: true, speed: 20 }).start(() => setWidgetMinimized(true));
          } else {
            Animated.spring(widgetPan, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start();
          }
        } else {
          if (gestureState.dx > 40 || gestureState.vx > 0.5) {
            Animated.spring(widgetPan, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start(() => setWidgetMinimized(false));
          } else {
            Animated.spring(widgetPan, { toValue: -SCREEN_WIDTH + 55, useNativeDriver: true, speed: 20 }).start();
          }
        }
      }
    })
  ).current;

  // 🚀 THE UNIFIED ZERO-TOUCH AUTOMATION ENGINE
  const prevStatusRef = useRef(String(activeBooking?.status || ''));
  
  useEffect(() => {
    if (!activeBooking) return;
    const status = String(activeBooking.status || '').toLowerCase();
    const prevStatus = prevStatusRef.current.toLowerCase();
    prevStatusRef.current = status;
    
    const isMultiDrop = activeBooking.booking_mode === 'multi' || (activeBooking.stops && activeBooking.stops.length > 1);

    if (status === 'arrived_pickup') {
        if (isMultiDrop) setActiveQrStopIndex(-1); 
    } else if (status === 'arrived_dropoff') {
        if (isMultiDrop) {
            const nextStopIndex = activeBooking?.stops?.findIndex((s: any) => 
                String(s.status).toLowerCase() !== 'completed'
            );
            if (nextStopIndex !== undefined && nextStopIndex !== -1) setActiveQrStopIndex(nextStopIndex);
        } else {
            setActiveQrStopIndex(0); 
        }
    } else if ((status === 'in_transit' || status === 'picked_up') && prevStatus !== status) {
        setActiveQrStopIndex(null); 
    }
  }, [activeBooking?.status, activeBooking?.stops, activeBooking?.booking_mode]);

  // 🔥 QR SYNC GUARANTEE
  useEffect(() => {
    let syncTimer: NodeJS.Timeout;
    if (activeQrStopIndex !== null) {
        syncTimer = setInterval(() => {
            if (activeBookingRef.current && token) {
                const API_URL = typeof BASE_URL !== 'undefined' ? BASE_URL : "https://hencedelivery.com";
                fetch(`${API_URL}/bookings/active?t=${Date.now()}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' }
                })
                .then(res => res.json())
                .then(data => {
                    if (data && data.length > 0) {
                        const matched = data.find((j: any) => j.id === activeBookingRef.current.id);
                        if (matched) setActiveBooking((prev: any) => ({ ...prev, ...matched }));
                    }
                })
                .catch(() => {});
            }
        }, 2500); 
    }
    return () => clearInterval(syncTimer);
  }, [activeQrStopIndex, token]);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', { name: 'default', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: '#1A7A4A' });
      }
      const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        if (canAskAgain) {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        } else return; 
      }
      if (finalStatus === 'granted') {
        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
          const tokenData = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})).data;
          if (token && tokenData) await axios.post(`${BASE_URL}/auth/users/me/push-token`, { expo_push_token: tokenData }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (e) {}
      }
    })();
    const notifSub = Notifications.addNotificationReceivedListener(notification => {
      if (typeof fetchRideHistory === 'function') fetchRideHistory().catch(() => {});
      Alert.alert(notification.request.content.title || "Booking Update", notification.request.content.body || "Your delivery status has changed.");
    });
    const respSub = Notifications.addNotificationResponseReceivedListener(response => {
      if (typeof fetchRideHistory === 'function') fetchRideHistory().catch(() => {});
    });
    return () => { notifSub.remove(); respSub.remove(); };
  }, [token]);

  const activeBookingRef = useRef(activeBooking);
  useEffect(() => { activeBookingRef.current = activeBooking; }, [activeBooking]);

  useEffect(() => {
    let syncInterval: NodeJS.Timeout | null = null;
    let isPolling = false; 

    const pollActiveBooking = async () => {
      if (!token || user?.role === 'driver' || isPolling) return;
      isPolling = true;
      const API_URL = typeof BASE_URL !== 'undefined' ? BASE_URL : "https://hencedelivery.com"; 
      try {
        const response = await fetch(`${API_URL}/bookings/active?t=${Date.now()}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' }});
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const rawData = await response.json();
        const currentJob = activeBookingRef.current;
        const data = (rawData || []).filter((j: any) => !['escalated', 'cancelled', 'failed'].includes(String(j.status).toLowerCase()));
        if (data && data.length > 0) {
          let liveJob = data[0];
          if (currentJob) {
            const matchedJob = data.find((j: any) => j.id === currentJob.id);
            if (matchedJob) liveJob = matchedJob; 
            else { setActiveBooking(null); return; }
          }
          setActiveBooking((prev: any) => {
            if (!prev || JSON.stringify(prev) !== JSON.stringify(liveJob)) return { ...prev, ...liveJob };
            return prev;
          });
        } 
        else if (currentJob) setActiveBooking(null);
      } catch (error: any) {
      } finally { isPolling = false; }
    };
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') pollActiveBooking(); 
    });
    if (token && user?.role !== 'driver') {
      pollActiveBooking(); 
      syncInterval = setInterval(pollActiveBooking, 3000); 
    }
    return () => {
      if (syncInterval) clearInterval(syncInterval);
      appStateSubscription.remove(); 
    };
  }, [token, user?.role]);

  useEffect(() => {
    if (!activeBooking) {
      setTrackingModalVisible(false);
      setActiveQrStopIndex(null); 
      return;
    }
    const rawStatus = String(activeBooking.status || '').toLowerCase();
    const cleanStatus = rawStatus.replace(/[-_ .]/g, '');
    const finishedStopsCount = (activeBooking.stops || []).filter((s: any) => String(s.status).toLowerCase() === 'completed').length;
    const allStopsDone = activeBooking.stops?.length > 0 && finishedStopsCount === activeBooking.stops.length;
    const isDone = ['completed', 'delivered', 'paid', 'awaitingconfirmation'].includes(cleanStatus) || allStopsDone;
    const isTransit = ['intransit', 'inprogress', 'pickedup', 'arriveddropoff'].includes(cleanStatus) || finishedStopsCount > 0 || cleanStatus.includes('transit') || !!activeBooking.picked_up_at;
    const isError = ['cancelled', 'escalated', 'failed'].includes(cleanStatus);

    if (ratingModalVisible && ratingBookingContext?.bookingId === activeBooking.id) return; 

    if (isDone) {
      if (!completedBookingIds.current.some(id => String(id) === String(activeBooking.id))) completedBookingIds.current.push(activeBooking.id);
      setTrackingModalVisible(false); setActiveQrStopIndex(null); 
      if (!activeBooking.customer_rating && !activeBooking.rating && !dismissedRatingIds.includes(activeBooking.id)) {
        setRatingBookingContext({ bookingId: activeBooking.id, driverId: activeBooking.driver_id || activeBooking.driver?.id });
        setRatingModalVisible(true);
      } else setActiveBooking(null);
    } 
    else if (isError && !isDone && !isTransit) { 
      const hasDriver = !!activeBooking.driver_id || !!activeBooking.driver?.id;
      const alreadyStarted = !!activeBooking.accepted_at || !!activeBooking.picked_up_at;
      const isAlreadyFinished = completedBookingIds.current.some(id => String(id) === String(activeBooking.id)) || dismissedRatingIds.some(id => String(id) === String(activeBooking.id)) || !!activeBooking.delivered_at;
      if (isAlreadyFinished || alreadyStarted || hasDriver) return;
      setTrackingModalVisible(false); setActiveQrStopIndex(null);
      Alert.alert("Booking Update", `This booking has been ${rawStatus}. Please contact support if you need assistance.`);
      setTimeout(() => setActiveBooking(null), 2000);
    }
    else {
      if (!trackingModalVisible && !ratingModalVisible) setTrackingModalVisible(true);
    }
  }, [activeBooking?.status, activeBooking?.id, dismissedRatingIds, ratingModalVisible]);

  const prevLocationRef = useRef<{ lat: number; lon: number } | null>(
    driverLocation ? { lat: safeCoord(driverLocation.lat), lon: safeCoord(driverLocation.lon) } : null
  );

  const animatedCoordinate = useRef(
    new AnimatedRegion({
      latitude: safeCoord(driverLocation?.lat, DUBLIN_REGION.latitude),
      longitude: safeCoord(driverLocation?.lon, DUBLIN_REGION.longitude),
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;

  const isMulti = activeBooking 
    ? (activeBooking.booking_mode === 'multi' || (activeBooking.stops && activeBooking.stops.length > 1))
    : (bookingMode === 'multi');

  const pendingStops = (activeBooking?.stops || []).filter((s: any) => s.status !== 'completed');
  const stopPosition = activeBooking?.stops ? activeBooking.stops.length - pendingStops.length + 1 : 1;

  const activeCategories = isMulti ? CATEGORIES_MULTI : CATEGORIES_SINGLE;
  const activeServicesDict = isMulti ? SERVICES_MULTI : SERVICES_SINGLE;

  const selectedVehicle = VEHICLES.find(v => v.id === localVanType);

  const activeCatKey = sheetCategory?.startsWith('stop_') ? sheetCategory.split('_')[2] : sheetCategory;
  const visibleSheetServices = useMemo(() => {
    if (!activeCatKey || !selectedVehicle) return [];
    const sourceDict = sheetCategory?.startsWith('stop_') ? SERVICES_MULTI : activeServicesDict;
    return (sourceDict[activeCatKey] || []).filter(s => s.v.includes(localVanType));
  }, [activeCatKey, localVanType, activeServicesDict, selectedVehicle, sheetCategory]);

  const canContinue = !!selectedService && !!localVanType;

  const handleModeChange = (mode: 'single' | 'multi') => {
    setBookingMode(mode);
    setSelectedService(null);
    setSheetCategory(null);
  };

  const openSheet = (catId: string) => {
    if (!localVanType) {
      Alert.alert("Select Vehicle", "Please select a vehicle type first to see available services.");
      return;
    }
    setSheetCategory(catId);
  };

  const selectService = (svc: Service) => {
    if (sheetCategory?.startsWith('stop_')) {
      const stopIdx = parseInt(sheetCategory.split('_')[1], 10);
      setSelectedStopServices(prev => ({ ...prev, [stopIdx]: svc }));
    } else {
      setSelectedService(svc);
      if (svc.id === 'sch-d' || svc.btxt === 'Scheduled') {
        setIsScheduled(true);
        if (!scheduleTime) setScheduleTime(new Date());
      }
    }
    setSheetCategory(null);
  };

  const handleDateChange = (e: any, d?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (e.type === 'dismissed') return;
    }
    if (d) {
      setScheduleTime(d);
      setIsScheduled(true);
    }
  };

  const selectVehicle = (id: string) => {
    setLocalVanType(id);
    setVanType?.(id);
    setSelectedCategory(null);
    setSelectedService(null);
  };

  // 🛡️ CRASH FIX 2: Immutable array updates ensuring stops[idx] exists
  const handleUpdateStopSafe = (idx: number, field: string, value: any) => {
    if (typeof setStops === 'function') {
      setStops((prevStops: any[]) => {
        const list = Array.isArray(prevStops) ? [...prevStops] : [];
        while (list.length <= idx) {
          list.push({ address: '', recipient: '', phone: '', instructions: '', items: [{ description: '', qty: '1', weight: '', ref: '' }], weight: 45, lat: null, lon: null });
        }
        list[idx] = {
          ...list[idx],
          [field]: value
        };
        return list;
      });
    } else if (typeof updateStop === 'function') {
      try { updateStop(idx, field, value); } catch (e) {}
    }
  };

  const handleAddStopItem = (stopIdx: number) => {
    const safeStops = Array.isArray(stops) ? stops : [];
    const stop = safeStops[stopIdx] || {};
    const items = Array.isArray(stop.items) ? [...stop.items] : [];
    items.push({ description: '', qty: '1', weight: '', ref: '' });
    handleUpdateStopSafe(stopIdx, 'items', items);
  };

  const updateStopItem = (stopIdx: number, itemIdx: number, field: string, value: string) => {
    const safeStops = Array.isArray(stops) ? stops : [];
    const stop = safeStops[stopIdx] || {};
    const items = Array.isArray(stop.items) ? [...stop.items] : [];
    if (!items[itemIdx]) items[itemIdx] = { description: '', qty: '1', weight: '', ref: '' };
    items[itemIdx] = { ...items[itemIdx], [field]: value };
    handleUpdateStopSafe(stopIdx, 'items', items);
  };

  const handleRemoveStopItem = (stopIdx: number, itemIdx: number) => {
    const safeStops = Array.isArray(stops) ? stops : [];
    const stop = safeStops[stopIdx] || {};
    const items = Array.isArray(stop.items) ? [...stop.items] : [];
    if (items.length > 1) {
      items.splice(itemIdx, 1);
      handleUpdateStopSafe(stopIdx, 'items', items);
    }
  };

  const adjustWeight = (stopIdx: number, amount: number) => {
    const safeStops = Array.isArray(stops) ? stops : [];
    const current = Number(safeStops[stopIdx]?.weight || 0);
    handleUpdateStopSafe(stopIdx, 'weight', Math.max(0, current + amount));
  };

  const handleAddStop = () => {
    const newStop = { address: '', recipient: '', phone: '', instructions: '', items: [{ description: '', qty: '1', weight: '', ref: '' }], weight: 45, lat: null, lon: null };
    if (typeof setStops === 'function') { 
      setStops((prev: any[]) => [...(Array.isArray(prev) ? prev : []), newStop]); 
      setExpandedStopIdx((stops?.length || 0)); 
    } else if (typeof addStop === 'function') { 
      addStop(newStop); 
      setExpandedStopIdx((stops?.length || 0)); 
    } 
  };

  const handleRemoveStopSafe = (idx: number) => {
    if (typeof setStops === 'function') { 
      setStops((prev: any[]) => {
        const updated = Array.isArray(prev) ? [...prev] : []; 
        updated.splice(idx, 1); 
        return updated;
      }); 
    } else if (typeof removeStop === 'function') {
      removeStop(idx);
    }
  };

  // 🛡️ CRASH FIX 3: Fully isolated string-only text input tables
  const renderItemsTable = (idx: number) => {
    const safeStops = Array.isArray(stops) ? stops : [];
    const stop = safeStops[idx] || {};
    const items = Array.isArray(stop.items) && stop.items.length > 0 ? stop.items : [{ description: '', qty: '1', weight: '', ref: '' }];
    return (
      <View style={styles.itemsSec}>
        <View style={styles.table}>
          <View style={styles.tableHdrRow}>
            <Text style={[styles.th, { flex: 2 }]}>Description</Text>
            <Text style={[styles.th, { width: 40, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Weight</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>PO/Ref</Text>
            <View style={{ width: 24 }} />
          </View>
          {items.map((item: any, i: number) => (
            <View key={i} style={styles.tr}>
              <TextInput style={[styles.tdInput, { flex: 2 }]} placeholder="Item description" value={String(item?.description || '')} onChangeText={(t) => updateStopItem(idx, i, 'description', t)} />
              <TextInput style={[styles.tdInput, { width: 40, textAlign: 'center' }]} keyboardType="numeric" value={String(item?.qty || '')} onChangeText={(t) => updateStopItem(idx, i, 'qty', t)} />
              <TextInput style={[styles.tdInput, { flex: 1.2 }]} placeholder="0 kg" value={String(item?.weight || '')} onChangeText={(t) => updateStopItem(idx, i, 'weight', t)} />
              <TextInput style={[styles.tdInput, { flex: 1.5 }]} placeholder="Ref/PO" value={String(item?.ref || '')} onChangeText={(t) => updateStopItem(idx, i, 'ref', t)} />
              <TouchableOpacity style={styles.tdDel} onPress={() => handleRemoveStopItem(idx, i)}><Ionicons name="close" size={16} color={COLORS.soft} /></TouchableOpacity>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.addItemBtn} onPress={() => handleAddStopItem(idx)}>
          <Ionicons name="add" size={12} color={COLORS.primary} />
          <Text style={styles.addItemBtnText}>Add item</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleConfirmDelivery = async () => {
    try {
      await axios.post(`${BASE_URL}/bookings/customer/jobs/${activeBooking.id}/confirm-delivery`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setActiveBooking((prev: any) => ({ ...prev, status: 'completed' }));
    } catch (error) {}
  };

  const getLiveETA = () => {
    if (!driverLocation || !activeBooking) return '...';
    const status = String(activeBooking.status || '').toLowerCase();
    const isHeadingToPickup = ['pending', 'assigned', 'accepted'].includes(status);
    const targetLat = safeCoord(isHeadingToPickup ? activeBooking.pickup_lat : activeBooking.dropoff_lat);
    const targetLon = safeCoord(isHeadingToPickup ? activeBooking.pickup_lon : activeBooking.dropoff_lon);
    if (!targetLat || !targetLon) return '...';
    const driverLatNum = safeCoord(driverLocation.lat);
    const driverLonNum = safeCoord(driverLocation.lon);
    const R = 6371;
    const dLat = (targetLat - driverLatNum) * (Math.PI / 180);
    const dLon = (targetLon - driverLonNum) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(driverLatNum * (Math.PI / 180)) * Math.cos(targetLat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const distanceKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    const timeMins = Math.round((distanceKm / 35) * 60);
    return timeMins < 1 ? 'Less than a minute' : `${timeMins} min`;
  };

  const handleGetPrice = async () => {
    try {
      if (!pickupAddr || pickupAddr.trim() === '') { Alert.alert('Missing Info', 'Please enter pickup location'); return; }
      
      const safeStops = Array.isArray(stops) ? stops : [];
      const validStops = safeStops.filter((s: any) => s.address && s.address.trim() !== '');
      if (validStops.length === 0 || validStops.length !== safeStops.length) { 
        Alert.alert('Missing Info', 'Please enter all drop-off locations'); 
        return; 
      }
      
      const activeSvc = isMulti ? Object.values(selectedStopServices).find(Boolean) : selectedService;
      if (!activeSvc) { Alert.alert('Missing Service', 'Please choose a service before continuing'); return; }
      
      const quotePayload = { 
        van_type: localVanType, 
        job_type: activeSvc.id, 
        service: activeSvc,
        pickup_address: pickupAddr,
        pickup_lat: safeCoord(pickupCoord?.latitude, DUBLIN_REGION.latitude),
        pickup_lon: safeCoord(pickupCoord?.longitude, DUBLIN_REGION.longitude),
        
        is_scheduled: isScheduled,
        scheduled_at: isScheduled && scheduleTime ? scheduleTime.toISOString() : null,

        stops: validStops.map((s: any, index: number) => ({
          ...s,
          lat: safeCoord(s.lat, DUBLIN_PICK_REGION.latitude),
          lon: safeCoord(s.lon, DUBLIN_PICK_REGION.longitude),
          job_description: String(s.jobDescription || ''),
          service_id: isMulti ? (selectedStopServices[index]?.id || activeSvc.id) : activeSvc.id,
          service_name: isMulti ? (selectedStopServices[index]?.name || activeSvc.name) : activeSvc.name
        })),
        
        booking_mode: isMulti ? 'multi' : 'single',
        total_weight: validStops.reduce((sum: number, s: any) => sum + safePrice(s.weight), 0)
      };

      await openQuoteFlow(quotePayload);
      
    } catch (e: any) { Alert.alert('Error', e?.message || 'Could not prepare quote request'); }
  };

  const handleMapPick = (index: number) => { 
    setMapPickTarget(index); 
    setTempAddress(''); 
    setTempCoord(null);
    mapMovedRef.current = false;
  };

  const onRegionChangeComplete = async (region: any, details: any) => {
    if (mapPickTarget === null || !region) return;
    const lat = safeCoord(region.latitude, DUBLIN_PICK_REGION.latitude);
    const lon = safeCoord(region.longitude, DUBLIN_PICK_REGION.longitude);
    setTempCoord({ lat, lon });
    
    if (mapMovedRef.current || details?.isGesture) {
      try {
        if (typeof reverseGeocode === 'function') {
          const addr = await reverseGeocode(lat, lon);
          if (typeof addr === 'string' && addr.trim() !== '') {
            setTempAddress(addr);
          }
        }
      } catch (err) {
        console.warn("Reverse geocode error suppressed:", err);
      }
    }
  };

  const confirmLocation = () => {
    if (mapPickTarget === null) return;
    const cleanAddr = String(tempAddress || '').trim();

    if (!cleanAddr) {
      Alert.alert('Address Required', 'Please enter an address or drag the map pin.');
      return;
    }

    const finalLat = safeCoord(tempCoord?.lat, DUBLIN_PICK_REGION.latitude);
    const finalLon = safeCoord(tempCoord?.lon, DUBLIN_PICK_REGION.longitude);

    if (mapPickTarget === -1) {
      if (typeof setPickupAddr === 'function') setPickupAddr(cleanAddr);
      if (typeof setPickupCoord === 'function') setPickupCoord({ latitude: finalLat, longitude: finalLon });
    } else {
      handleUpdateStopSafe(mapPickTarget, 'address', cleanAddr);
      handleUpdateStopSafe(mapPickTarget, 'lat', finalLat);
      handleUpdateStopSafe(mapPickTarget, 'lon', finalLon);
    }
    
    setMapPickTarget(null);
    setActiveSearchIndex(null);
  };

 

  
  if (bottomTab === 'account') {
    const { currentScreen } = useAppContext();
    if (currentScreen === 'profile') return <ProfileScreen />;    
    return <AccountHubScreen />;
  }

  if (bottomTab === 'rides') {
    const visibleRides = (rideHistory || []).filter((ride: any) => (ride.status || '').toLowerCase() !== 'escalated' && !hiddenHistoryIds.includes(ride.id));
    return (
      <ScrollView contentContainerStyle={globalStyles.scrollContent}>
        <Text style={globalStyles.screenTitle}>Your Orders</Text>
        {visibleRides.length === 0 ? <Text style={globalStyles.emptyText}>No orders yet</Text> : (
          visibleRides.map((ride: any) => {
            const completed = ['completed', 'paid', 'delivered'].includes((ride.status || '').toLowerCase());
            const proofUrl = ride.delivery_proof_url ?? ride.proof_url;
            return (
              <SwipeToDeleteItem key={ride.id} ride={ride} onDelete={(id: number) => setHiddenHistoryIds(prev => [...prev, id])}>
                <View style={[globalStyles.rideCard, { marginBottom: 0 }]}>
                  <Text style={globalStyles.rideDetail}>{ride.pickup_address} → {ride.dropoff_address}</Text>
                  <Text style={globalStyles.ridePrice}>€{safePrice(ride.final_price).toFixed(2)}</Text>
                  <Text style={[globalStyles.rideStatus, { color: completed ? COLORS.primary : COLORS.warning }]}>{ride.status}</Text>
                  {proofUrl && <TouchableOpacity onPress={() => Linking.openURL(proofUrl)}><Text style={{ color: COLORS.primary, marginTop: 8 }}>View Proof</Text></TouchableOpacity>}
                </View>
              </SwipeToDeleteItem>
            );
          })
        )}
      </ScrollView>
    );
  }

  if (user?.role === 'driver') return <DriverDashboard />;

  const currentStop = Array.isArray(stops) && stops.length > 0 ? stops[0] : {};

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>

      {/* 🚀 PREMIUM SWIPEABLE LIVE WIDGET */}
      {activeBooking && !trackingModalVisible && !['completed', 'delivered', 'cancelled', 'paid', 'escalated'].includes((activeBooking?.status || '').toLowerCase()) && (
        <Animated.View 
          {...widgetPanResponder.panHandlers}
          style={{ position: 'absolute', top: Math.max(insets.top, 10), left: 16, right: 16, zIndex: 100, transform: [{ translateX: widgetPan }] }}
        >
          <TouchableOpacity activeOpacity={0.9} onPress={() => { if (widgetMinimized) { Animated.spring(widgetPan, { toValue: 0, useNativeDriver: true, bounciness: 10 }).start(() => setWidgetMinimized(false)); } else { setTrackingModalVisible(true); } }} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10, borderWidth: 1, borderColor: `${COLORS.primary}33` }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                {['arrived_pickup', 'arrived_dropoff'].includes(String(activeBooking.status).toLowerCase()) ? <Ionicons name="location" size={22} color={COLORS.primary} /> : <Ionicons name="car-outline" size={24} color={COLORS.primary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.ink }}>
                  {['pending', 'accepted', 'assigned'].includes(String(activeBooking.status).toLowerCase()) ? 'Driver is on the way' : String(activeBooking.status).toLowerCase() === 'arrived_pickup' ? 'Driver at pickup' : ['in_transit', 'picked_up'].includes(String(activeBooking.status).toLowerCase()) ? 'Order is en route' : String(activeBooking.status).toLowerCase() === 'arrived_dropoff' ? 'Driver has arrived' : 'Active Delivery'}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.soft, marginTop: 2 }}>ETA: <Text style={{ color: COLORS.primary, fontWeight: '800' }}>{getLiveETA()}</Text> • {widgetMinimized ? 'Swipe right' : 'Tap to track'}</Text>
              </View>
              <View style={{ backgroundColor: COLORS.ink, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{widgetMinimized ? '➔' : 'View'}</Text></View>
            </View>
            <View style={{ height: 5, backgroundColor: COLORS.line, borderRadius: 3, overflow: 'hidden' }}>
               <View style={{ height: '100%', backgroundColor: COLORS.primary, borderRadius: 3, width: ['pending', 'accepted', 'assigned'].includes(String(activeBooking.status).toLowerCase()) ? '25%' : String(activeBooking.status).toLowerCase() === 'arrived_pickup' ? '50%' : ['in_transit', 'picked_up'].includes(String(activeBooking.status).toLowerCase()) ? '75%' : '95%' }} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* --- STEPS --- */}
      <View style={styles.steps}>
        <View style={step === 1 ? styles.stepActive : styles.stepDone}>
          <Text style={styles.stepCircle}>{step === 1 ? '1' : '✓'}</Text>
          <Text style={styles.stepLabel}>Vehicle & Service</Text>
        </View>
        <View style={step === 1 ? styles.stepLinePending : styles.stepLineDone} />
        <View style={step === 2 ? styles.stepActive : styles.stepPending}>
          <Text style={styles.stepCircle}>2</Text>
          <Text style={styles.stepLabel}>Location & Details</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
            {/* 🚀 TEMPORARILY DISABLED MULTI-DROP FOR NOW
            <View style={styles.modeToggleRow}>
              <TouchableOpacity style={[styles.modeToggleBtn, !isMulti && styles.modeToggleBtnOn]} onPress={() => handleModeChange('single')}>
                <Text style={[styles.modeToggleText, !isMulti && styles.modeToggleTextOn]}>Single Drop</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeToggleBtn, isMulti && styles.modeToggleBtnOn]} onPress={() => handleModeChange('multi')}>
                <Text style={[styles.modeToggleText, isMulti && styles.modeToggleTextOn]}>Multi Drop</Text>
              </TouchableOpacity>
            </View>
            */}

          {/* 🚀 ADDED MTD: marginTop to push it down cleanly */}
            <View style={[styles.card, { marginTop: 16 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.cardTitle}>Our Vehicles</Text>
                  <Text style={styles.cardSub}>The right vehicle will be assigned once order has been placed</Text>
                </View>
                <Text style={styles.autoBadge}>AUTO</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                  {VEHICLES.map((v) => (
                    <TouchableOpacity 
                      key={v.id} 
                      style={styles.vehicleChip}
                      onPress={() => setLocalVanType(v.id)}
                      activeOpacity={0.6}
                    >
                      <BookingIcon name={v.icon} size={42} color={COLORS.soft} />
                      <Text style={[styles.vehicleName, { fontSize: 11, marginTop: 6 }]} numberOfLines={1}>{v.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedVehicle && <View style={styles.noteBox}><Text style={styles.noteText}>{selectedVehicle.note}</Text></View>}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>Select a Service</Text>
                  <Text style={styles.cardSub}>Tap a category to see services</Text>
                </View>
              </View>
              <View style={[styles.cardBody, { padding: 10 }]}>
                
                <View style={styles.grpGrid}>
                  {activeCategories.map((cat) => (
                    <TouchableOpacity key={cat.id} style={[styles.grpCard, selectedService && selectedCategory === cat.id && styles.grpCardSel]} onPress={() => { setSelectedCategory(cat.id); openSheet(cat.id); }} activeOpacity={0.9}>
                      <View style={styles.gcIco}><Ionicons name={cat.icon as any} size={22} color={selectedService && selectedCategory === cat.id ? '#FFF' : COLORS.soft} /></View>
                      <Text style={[styles.gcName, { fontWeight: '500' }, selectedService && selectedCategory === cat.id && { color: COLORS.primary }]}>{cat.name}</Text>
                      <View style={styles.gcArrow}><Ionicons name="chevron-forward" size={14} color={COLORS.ink} /></View>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedService && (
                  <View style={styles.svcConfirmed}>
                    <View style={styles.svcConfirmedIco}><BookingIcon name={selectedService.ico} size={20} color="#FFF" /></View>
                    <View style={styles.svcConfirmedBody}>
                      <Text style={[styles.svcConfirmedName, { fontWeight: '400' }]}>{selectedService.name}</Text>
                      <Text style={styles.svcConfirmedDesc}>{selectedService.btxt}</Text>
                    </View>
                    <TouchableOpacity onPress={() => openSheet(selectedCategory!)}><Text style={styles.svcConfirmedChange}>Change</Text></TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.priceBanner}>
              <View style={styles.priceBannerIco}><Ionicons name="checkmark-circle-outline" size={24} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.priceBannerTitle}>Price confirmed after booking</Text>
                <Text style={styles.priceBannerSub}>Your price will be shown once you complete your booking details.</Text>
              </View>
            </View>

            <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 20), marginBottom: 80 }]}>
              <TouchableOpacity 
                style={[styles.ctaBtn, !canContinue && styles.ctaBtnDim]} 
                onPress={() => { if (canContinue) setStep(2); }} 
                disabled={!canContinue} 
                activeOpacity={0.85}
              >
                <Text style={styles.ctaBtnText}>Continue to Location & Details</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.serviceBanner}>
              <BookingIcon name={selectedService?.ico || 'si-01'} size={18} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceBannerName}>{selectedService?.name || 'Service'}</Text>
                <Text style={styles.serviceBannerSub}>{selectedVehicle?.name || 'Van'} · Standard Delivery</Text>
              </View>
              <TouchableOpacity onPress={() => setStep(1)}><Text style={styles.serviceBannerChange}>Change</Text></TouchableOpacity>
            </View>

            {/* 🚀 TEMPORARILY DISABLED SCHEDULING
            <View style={styles.schedToggle}>
              <TouchableOpacity style={[styles.schedBtn, !isScheduled && styles.schedBtnOn]} onPress={() => setIsScheduled(false)}>
                <Text style={[styles.schedText, !isScheduled && styles.schedTextOn]}>Pick up now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.schedBtn, isScheduled && styles.schedBtnOn]} onPress={() => { setIsScheduled(true); }}>
                <BookingIcon name="ic-clock" size={14} color={isScheduled ? '#FFF' : COLORS.soft} />
                <Text style={[styles.schedText, isScheduled && styles.schedTextOn]}>Schedule for later</Text>
              </TouchableOpacity>
            </View>
            */}

            {isScheduled && (
              <View style={styles.card}>
                <View style={[styles.cardBody, { padding: 10 }]}>
                  <View style={styles.row2}>
                    <TouchableOpacity style={styles.fieldHalf} onPress={() => { setDatePickerMode('date'); setShowDatePicker(true); }}>
                      <Text style={styles.fieldLabel}>Date</Text>
                      <View style={styles.fieldInput}>
                        <Text style={{ fontSize: 13, color: COLORS.ink, paddingVertical: 2 }}>{scheduleTime ? scheduleTime.toLocaleDateString() : 'Select Date'}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.fieldHalf} onPress={() => { setDatePickerMode('time'); setShowDatePicker(true); }}>
                      <Text style={styles.fieldLabel}>Time</Text>
                      <View style={styles.fieldInput}>
                        <Text style={{ fontSize: 13, color: COLORS.ink, paddingVertical: 2 }}>{scheduleTime ? scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select Time'}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {isScheduled && showDatePicker && (
              <View style={styles.datePickerCard}>
                <DateTimePicker 
                  value={scheduleTime || new Date()} 
                  mode={datePickerMode} 
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
                  onChange={handleDateChange} 
                  textColor={COLORS.ink} 
                  themeVariant="light" 
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.dateConfirmBtn} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.dateConfirmText}>Confirm Time</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!isMulti ? (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Pickup & Drop-off</Text>
                      <Text style={styles.cardSub}><Ionicons name="location" size={10} color={COLORS.soft} /> Tap to pin exact location</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <TouchableOpacity style={styles.mapStrip} onPress={() => handleMapPick(-1)} activeOpacity={0.9}>
                      <View style={styles.mapBgReal}>
                        <View style={styles.mapRoadMain} />
                        <View style={styles.mapRouteLine} />
                        <View style={styles.mapPinsWrap}>
                          <View style={styles.mapPinGroup}>
                            <View style={[styles.mapPinDotReal, styles.mapPinPickup]}><Text style={styles.mapPinLetter}>P</Text></View>
                            <Text style={styles.mapPinTag}>Pickup</Text>
                          </View>
                          <View style={styles.mapPinGroup}>
                            <View style={[styles.mapPinDotReal, styles.mapPinDropoff]}><Text style={styles.mapPinLetter}>D</Text></View>
                            <Text style={styles.mapPinTag}>Drop-off</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.mapEditBtn}><Ionicons name="map-outline" size={12} color={COLORS.primary} /><Text style={styles.mapEditText}>Edit map</Text></View>
                    </TouchableOpacity>

                    <View style={{ zIndex: 1 }}>
                      <TouchableOpacity style={styles.locRowPick} onPress={() => handleMapPick(-1)} activeOpacity={0.7}>
                        <View style={styles.locDotG} />
                        <View style={styles.locInfo}>
                          <Text style={styles.locLblG}>Pickup</Text>
                          <View pointerEvents="none"><TextInput style={styles.locInput} placeholder="Tap to select pickup location..." placeholderTextColor={COLORS.soft} value={String(pickupAddr || '')} editable={false} /></View>
                        </View>
                        <View style={styles.locPinBtn}><Ionicons name="location-outline" size={16} color={COLORS.primary} /></View>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.connectorLine} />

                    <View style={{ zIndex: 1 }}>
                      <TouchableOpacity style={styles.locRowDrop} onPress={() => handleMapPick(0)} activeOpacity={0.7}>
                        <View style={styles.locDotR} />
                        <View style={styles.locInfo}>
                          <Text style={styles.locLblR}>Drop-off</Text>
                          <View pointerEvents="none"><TextInput style={styles.locInput} placeholder="Tap to select drop-off location..." placeholderTextColor={COLORS.soft} value={String(currentStop.address || '')} editable={false} /></View>
                        </View>
                        <View style={styles.locPinBtnRed}><Ionicons name="location-outline" size={16} color={COLORS.danger} /></View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Recipient Details</Text>
                      <Text style={styles.cardSub}>Who is receiving this delivery?</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.row2}>
                      <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>Name</Text><TextInput style={styles.fieldInput} placeholder="Full name" value={String(currentStop.recipient || '')} onChangeText={(t) => handleUpdateStopSafe(0, 'recipient', t)} /></View>
                      <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>Phone</Text><TextInput style={styles.fieldInput} placeholder="+353..." keyboardType="phone-pad" value={String(currentStop.phone || '')} onChangeText={(t) => handleUpdateStopSafe(0, 'phone', t)} /></View>
                    </View>

                    <View style={[styles.fieldFull, { marginTop: 12 }]}>
                      <Text style={styles.fieldLabel}>Order Number <Text style={{fontWeight: '400', color: COLORS.mute, fontSize: 10, textTransform: 'none'}}>(optional)</Text></Text>
                      <TextInput style={styles.fieldInput} placeholder="e.g. 20481" value={String(currentStop.ref || '')} onChangeText={(t) => handleUpdateStopSafe(0, 'ref', t)} />
                    </View>
                    <View style={[styles.fieldFull, { marginTop: 12 }]}>
                      <Text style={styles.fieldLabel}>Delivery Instructions</Text>
                      <TextInput style={[styles.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="e.g. Leave at reception, call buzzer 3..." multiline value={String(currentStop.instructions || '')} onChangeText={(t) => handleUpdateStopSafe(0, 'instructions', t)} />
                    </View>
                  </View>
                </View>

                {/* 🚀 JOB DETAILS CARD */}
                {selectedService && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardTitle}>Job Details</Text>
                        <Text style={styles.cardSub}>{selectedService.mode === 'desc' ? 'Tell us about the job' : 'What are we moving?'}</Text>
                      </View>
                    </View>
                    <View style={styles.cardBody}>
                      {selectedService.mode === 'desc' ? (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={styles.fieldLabel}>Job Description</Text>
                          <TextInput style={[styles.fieldInput, { minHeight: 120, textAlignVertical: 'top' }]} placeholder="Describe what you need done, e.g. clear a two-bedroom house..." multiline value={String(currentStop.jobDescription || '')} onChangeText={(t) => handleUpdateStopSafe(0, 'jobDescription', t)} />
                        </View>
                      ) : (
                        renderItemsTable(0)
                      )}

                      <View style={styles.sdivRow}><Text style={styles.sdivText}>Total Weight (Approx)</Text></View>
                      <View style={styles.row2}>
                        <View style={styles.fieldHalf}>
                          <Text style={styles.fieldLabel}>Total Weight (kg)</Text>
                          <View style={styles.weightStepperContainer}>
                            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustWeight(0, -1)}><Ionicons name="remove" size={16} color={COLORS.ink} /></TouchableOpacity>
                            <TextInput style={styles.weightStepperInput} keyboardType="numeric" value={String(currentStop.weight ?? 45)} onChangeText={(t) => handleUpdateStopSafe(0, 'weight', parseInt(t) || 0)} />
                            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustWeight(0, 1)}><Ionicons name="add" size={16} color={COLORS.ink} /></TouchableOpacity>
                          </View>
                        </View>
                        <View style={[styles.fieldHalf, { justifyContent: 'flex-end', paddingBottom: 4 }]}><Text style={{ fontSize: 10, color: COLORS.soft, lineHeight: 14 }}>Approximate combined weight of all items in this delivery.</Text></View>
                      </View>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Stops</Text>
                      <Text style={styles.cardSub}>Each stop can have different items and services</Text>
                    </View>
                    <Text style={styles.stopCount}>{(stops || []).length} stops</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <TouchableOpacity style={styles.mapStrip} onPress={() => handleMapPick(-1)} activeOpacity={0.9}>
                      <View style={styles.mapBgReal}>
                        <View style={styles.mapRoadMain} />
                        <View style={styles.mapRouteLine} />
                        <View style={styles.mapPinsWrap}>
                          <View style={styles.mapPinGroup}>
                            <View style={[styles.mapPinDotReal, styles.mapPinPickup]}><Text style={styles.mapPinLetter}>P</Text></View>
                            <Text style={styles.mapPinTag}>Pickup</Text>
                          </View>
                          {(stops || []).map((_: any, idx: number) => (
                            <View key={idx} style={styles.mapPinGroup}>
                              <View style={[styles.mapPinDotReal, styles.mapPinStop]}><Text style={styles.mapPinLetter}>{idx + 1}</Text></View>
                              <Text style={styles.mapPinTag}>Stop {idx + 1}</Text>
                            </View>
                          ))}
                          <View style={styles.mapPinGroup}>
                            <View style={[styles.mapPinDotReal, styles.mapPinDropoff]}><Text style={styles.mapPinLetter}>D</Text></View>
                            <Text style={styles.mapPinTag}>Drop-off</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.mapEditBtn}><Ionicons name="map-outline" size={12} color={COLORS.primary} /><Text style={styles.mapEditText}>Edit map</Text></View>
                    </TouchableOpacity>

                    <View style={{ zIndex: 1 }}>
                      <TouchableOpacity style={styles.locRowPick} onPress={() => handleMapPick(-1)} activeOpacity={0.7}>
                        <View style={styles.locDotG} />
                        <View style={styles.locInfo}>
                          <Text style={styles.locLblG}>Collection</Text>
                          <View pointerEvents="none"><TextInput style={styles.locInput} placeholder="Tap to select collection location..." placeholderTextColor={COLORS.soft} value={String(pickupAddr || '')} editable={false} /></View>
                        </View>
                        <View style={styles.locPinBtn}><Ionicons name="location-outline" size={16} color={COLORS.primary} /></View>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.stopsWrap}>
                      {(stops || []).map((stop: any, idx: number) => {
                        const expanded = expandedStopIdx === idx;
                        const itemsCount = stop.items?.length || 0;
                        const chosenSvc = selectedStopServices[idx];
                        const activeCat = activeStopCategory[idx];

                        return (
                          <View key={idx} style={[styles.stopCard, expanded && styles.stopCardExp]}>
                            <TouchableOpacity style={styles.stopHdr} onPress={() => setExpandedStopIdx(expanded ? null : idx)}>
                              <View style={[styles.stopNum, expanded && styles.stopNumActive]}><Text style={styles.stopNumText}>{idx + 1}</Text></View>
                              <View style={styles.stopPrev}>
                                <Text style={[styles.stopAddr, !stop.address && styles.stopAddrPh]} numberOfLines={1}>{String(stop.address || 'Enter delivery address...')}</Text>
                                <Text style={styles.stopMeta}>{itemsCount} item{itemsCount !== 1 ? 's' : ''}{chosenSvc ? ` · ${chosenSvc.name}` : ' · no service selected'}</Text>
                              </View>
                              <View style={styles.stopRight}>
                                {!stop.address && <Text style={styles.incBadge}>Incomplete</Text>}
                                <TouchableOpacity style={styles.stopPinBtn} onPress={() => handleMapPick(idx)}><Ionicons name="location-outline" size={14} color={COLORS.primary} /></TouchableOpacity>
                                {idx > 0 && (<TouchableOpacity style={styles.delBtn} onPress={() => handleRemoveStopSafe(idx)}><Ionicons name="close" size={16} color={COLORS.soft} /></TouchableOpacity>)}
                                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.soft} />
                              </View>
                            </TouchableOpacity>

                            {expanded && (
                              <View style={styles.stopBody}>
                                <View style={styles.row2}>
                                  <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>Recipient</Text><TextInput style={styles.fieldInput} placeholder="e.g. Client Ltd" value={String(stop.recipient || '')} onChangeText={(t) => handleUpdateStopSafe(idx, 'recipient', t)} /></View>
                                  <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>Phone</Text><TextInput style={styles.fieldInput} placeholder="+353..." keyboardType="phone-pad" value={String(stop.phone || '')} onChangeText={(t) => handleUpdateStopSafe(idx, 'phone', t)} /></View>
                                </View>
                                <View style={[styles.fieldFull, { marginTop: 12 }]}>
                                  <Text style={styles.fieldLabel}>Address</Text>
                                  <TouchableOpacity style={styles.addrWrap} onPress={() => handleMapPick(idx)} activeOpacity={0.8}>
                                    <View pointerEvents="none"><TextInput style={[styles.fieldInput, { paddingRight: 36 }]} placeholder="Tap to search or pin on map..." value={String(stop.address || '')} editable={false} /></View>
                                    <View style={styles.addrPin}><Ionicons name="location-outline" size={16} color={COLORS.primary} /></View>
                                  </TouchableOpacity>
                                </View>

                                <View style={styles.row2}>
                                  <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>Order Number</Text><TextInput style={styles.fieldInput} placeholder="e.g. ORD-00142" value={String(stop.ref || '')} onChangeText={(t) => handleUpdateStopSafe(idx, 'ref', t)} /></View>
                                  <View style={styles.fieldHalf}><Text style={styles.fieldLabel}>Instructions</Text><TextInput style={styles.fieldInput} placeholder="e.g. Loading bay" value={String(stop.instructions || '')} onChangeText={(t) => handleUpdateStopSafe(idx, 'instructions', t)} /></View>
                                </View>

                                {/* 🚀 MULTI-DROP INLINE SERVICE SELECTOR */}
                                <View style={styles.stopSvcSel}>
                                  <Text style={styles.stopSvcLbl}>Service for this stop</Text>
                                  {chosenSvc ? (
                                    <TouchableOpacity 
                                      style={styles.stopSvcChosen} 
                                      onPress={() => { 
                                        const updated = { ...selectedStopServices }; 
                                        delete updated[idx]; 
                                        setSelectedStopServices(updated); 
                                        setActiveStopCategory(prev => ({ ...prev, [idx]: '' })); 
                                      }}
                                    >
                                      <BookingIcon name={chosenSvc.ico} size={18} color={COLORS.primary} />
                                      <Text style={[styles.stopSvcChosenName, { fontWeight: '400' }]}>{chosenSvc.name}</Text>
                                      <Text style={styles.stopSvcChosenChange}>Change</Text>
                                    </TouchableOpacity>
                                  ) : (
                                    <View>
                                      <View style={styles.stopCatsGrid}>
                                        {CATEGORIES_MULTI.map((cat) => {
                                          const compatible = (SERVICES_MULTI[cat.id] || []).some(s => s.v.includes(localVanType));
                                          const isActive = activeCat === cat.id;
                                          return (
                                            <TouchableOpacity 
                                              key={cat.id} 
                                              style={[styles.stopCatBtn, !compatible && styles.stopCatBtnDim, isActive && styles.stopCatBtnOn]} 
                                              disabled={!compatible} 
                                              onPress={() => setActiveStopCategory(prev => ({ ...prev, [idx]: cat.id }))}
                                            >
                                              <Text style={[styles.stopCatBtnText, isActive && styles.stopCatBtnTextOn]}>{cat.name.split(' ')[0]}</Text>
                                            </TouchableOpacity>
                                          );
                                        })}
                                      </View>
                                      
                                      {/* THE INLINE DROPDOWN LIST */}
                                      {activeCat && (
                                        <ScrollView style={styles.stopSvcScroll} nestedScrollEnabled={true}>
                                          {(SERVICES_MULTI[activeCat] || []).filter(s => s.v.includes(localVanType)).map((svc) => (
                                            <TouchableOpacity 
                                              key={svc.id} 
                                              style={styles.stopSvcItem} 
                                              onPress={() => { 
                                                setSelectedStopServices(prev => ({ ...prev, [idx]: svc }));
                                                setActiveStopCategory(prev => ({ ...prev, [idx]: '' }));
                                              }}
                                              activeOpacity={0.7}
                                            >
                                              <View style={styles.stopSvcItemIco}><BookingIcon name={svc.ico} size={20} color={COLORS.soft} /></View>
                                              <Text style={styles.stopSvcItemName}>{svc.name}</Text>
                                            </TouchableOpacity>
                                          ))}
                                        </ScrollView>
                                      )}
                                    </View>
                                  )}
                                </View>

                                {chosenSvc && chosenSvc.mode === 'desc' ? (
                                  <View style={{ marginTop: 16 }}>
                                    <Text style={styles.fieldLabel}>Job Description</Text>
                                    <TextInput style={[styles.fieldInput, { minHeight: 120, textAlignVertical: 'top' }]} placeholder="Describe what you need done at this stop..." multiline value={String(stop.jobDescription || '')} onChangeText={(t) => handleUpdateStopSafe(idx, 'jobDescription', t)} />
                                  </View>
                                ) : (
                                  <View style={styles.itemsSec}>
                                    <View style={styles.sdivRow}><Text style={styles.sdivText}>Items for this stop</Text></View>
                                    <View style={styles.table}>
                                      <View style={styles.tableHdrRow}>
                                        <Text style={[styles.th, { flex: 2 }]}>Description</Text>
                                        <Text style={[styles.th, { width: 40, textAlign: 'center' }]}>Qty</Text>
                                        <Text style={[styles.th, { flex: 1.2 }]}>Weight</Text>
                                        <Text style={[styles.th, { flex: 1.5 }]}>PO/Ref</Text>
                                        <View style={{ width: 24 }} />
                                      </View>
                                      {(Array.isArray(stop.items) && stop.items.length > 0 ? stop.items : [{ description: '', qty: '1', weight: '', ref: '' }]).map((item: any, i: number) => (
                                        <View key={i} style={styles.tr}>
                                          <TextInput style={[styles.tdInput, { flex: 2 }]} placeholder="Item description" value={String(item?.description || '')} onChangeText={(t) => updateStopItem(idx, i, 'description', t)} />
                                          <TextInput style={[styles.tdInput, { width: 40, textAlign: 'center' }]} keyboardType="numeric" value={String(item?.qty || '')} onChangeText={(t) => updateStopItem(idx, i, 'qty', t)} />
                                          <TextInput style={[styles.tdInput, { flex: 1.2 }]} placeholder="0 kg" value={String(item?.weight || '')} onChangeText={(t) => updateStopItem(idx, i, 'weight', t)} />
                                          <TextInput style={[styles.tdInput, { flex: 1.5 }]} placeholder="Ref/PO" value={String(item?.ref || '')} onChangeText={(t) => updateStopItem(idx, i, 'ref', t)} />
                                          <TouchableOpacity style={styles.tdDel} onPress={() => { const items = [...(stop.items || [])]; if (items.length > 1) { items.splice(i, 1); handleUpdateStopSafe(idx, 'items', items); } }}><Ionicons name="close" size={16} color={COLORS.soft} /></TouchableOpacity>
                                        </View>
                                      ))}
                                    </View>
                                    <TouchableOpacity style={styles.addItemBtn} onPress={() => { const items = [...(stop.items || [])]; items.push({ description: '', qty: '1', weight: '', ref: '' }); handleUpdateStopSafe(idx, 'items', items); }}>
                                      <Ionicons name="add" size={12} color={COLORS.primary} />
                                      <Text style={styles.addItemBtnText}>Add item</Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    <TouchableOpacity style={styles.addStopBtn} onPress={handleAddStop}>
                      <Ionicons name="add" size={16} color={COLORS.soft} />
                      <Text style={styles.addStopBtnText}>Add another drop-off stop</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, 20), marginBottom: 80 }]}>
              <TouchableOpacity style={styles.ctaBtnGreen} onPress={handleGetPrice} activeOpacity={0.85}>
                <Text style={styles.ctaBtnText}>Confirm & Book</Text>
                <Ionicons name="checkmark" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* 🚀 4. THE FULL-SCREEN TRACKING MODAL */}
      <Modal visible={trackingModalVisible && !!activeBooking} animationType="slide" transparent={false}>
        {activeBooking && (
          <View style={{ flex: 1, backgroundColor: COLORS.bg || '#F4F8F6' }}>
            <View style={{ paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingHorizontal: 22, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white || '#FFFFFF', borderBottomWidth: 1, borderBottomColor: COLORS.line || '#E2E8E4' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.ink }}>Active Delivery</Text>
              <TouchableOpacity onPress={() => setTrackingModalVisible(false)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E9F7EE', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chevron-down" size={24} color={COLORS.forest || COLORS.primary} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: COLORS.card, overflow: 'hidden' }}>
              {String(activeBooking.status).toLowerCase() === 'awaiting_confirmation' ? (
                <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', padding: 24 }}>
                  <View style={{ alignItems: 'center', marginBottom: 30 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}><Ionicons name="cube-outline" size={40} color={COLORS.success} /></View>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.ink, textAlign: 'center' }}>Delivery Arrived!</Text>
                    <Text style={{ fontSize: 38, fontWeight: '900', color: COLORS.forest, marginVertical: 16, letterSpacing: 6 }}>{activeBooking.delivery_pin || activeBooking.pin || "0000"}</Text>
                    <Text style={{ fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginTop: 10 }}>Read this PIN to your driver, or simply tap below to confirm you have received your items.</Text>
                  </View>
                  <TouchableOpacity style={[globalStyles.btn, { backgroundColor: COLORS.success, marginBottom: 12 }]} onPress={handleConfirmDelivery}><Text style={globalStyles.btnText}>Yes, I received my items</Text></TouchableOpacity>
                  <TouchableOpacity style={[globalStyles.btn, { backgroundColor: COLORS.dangerSoft, borderWidth: 1, borderColor: COLORS.danger }]} onPress={() => Alert.alert("Report Issue", "Support has been notified.")}><Text style={[globalStyles.btnText, { color: COLORS.danger }]}>No, I don't have them</Text></TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={{ height: 200, overflow: 'hidden', position: 'relative' }}>
                    <MapView 
                      ref={mapRef} 
                      style={{ flex: 1 }} 
                      customMapStyle={mapStyle} 
                      mapPadding={{ top: 20, right: 0, bottom: 20, left: 0 }} 
                      initialRegion={{ 
                        latitude: driverLocation?.lat ? safeCoord(driverLocation.lat) : safeCoord(activeBooking.pickup_lat, DUBLIN_REGION.latitude), 
                        longitude: driverLocation?.lon ? safeCoord(driverLocation.lon) : safeCoord(activeBooking.pickup_lon, DUBLIN_REGION.longitude), 
                        latitudeDelta: 0.05, 
                        longitudeDelta: 0.05 
                      }}
                    >
                      {activeBooking.pickup_lat && (
                        <Marker coordinate={{ latitude: safeCoord(activeBooking.pickup_lat), longitude: safeCoord(activeBooking.pickup_lon) }}>
                          <View style={[globalStyles.pinWrap, { backgroundColor: COLORS.amber }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>P</Text></View>
                        </Marker>
                      )}
                      {driverLocation && (
                        // @ts-ignore
                        <Marker.Animated coordinate={animatedCoordinate} anchor={{ x: 0.5, y: 0.5 }}>
                          <View style={globalStyles.driverPin}><Ionicons name="car" size={16} color="#fff" /></View>
                        </Marker.Animated>
                      )}
                    </MapView>
                    <View style={{ position: 'absolute', left: 16, top: 16, backgroundColor: 'rgba(15,31,23,0.85)', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18 }}><Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '700' }}>Live Tracking</Text></View>
                  </View>
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {['pending', 'accepted', 'assigned', 'arrived_pickup', 'in_transit', 'picked_up'].includes(String(activeBooking.status).toLowerCase()) && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.lemon, marginRight: 8 }} />}
                        <Text style={{ fontSize: 19, fontWeight: '800', color: COLORS.ink }}>{['pending', 'accepted', 'assigned'].includes(String(activeBooking.status).toLowerCase()) ? 'Driver heading to pickup' : String(activeBooking.status).toLowerCase() === 'arrived_pickup' ? 'Driver is at pickup' : ['in_transit', 'picked_up'].includes(String(activeBooking.status).toLowerCase()) ? (isMulti ? `En route to Stop ${stopPosition}` : 'Your order is on its way') : String(activeBooking.status).toLowerCase() === 'arrived_dropoff' ? 'Driver is at drop-off' : 'Delivered'}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.forest, marginTop: 3 }}>{['delivered', 'completed', 'paid'].includes(String(activeBooking.status).toLowerCase()) ? 'Your order has arrived' : String(activeBooking.status).toLowerCase() === 'arrived_pickup' ? (isMulti ? 'Please prepare QR code for collection' : 'Driver is preparing to collect items') : String(activeBooking.status).toLowerCase() === 'arrived_dropoff' ? 'Please prepare your QR code for drop-off' : `Arriving in ${getLiveETA()}`}</Text>
                      {isMulti && ['in_transit', 'picked_up', 'arrived_dropoff'].includes(String(activeBooking.status).toLowerCase()) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#FCF3DE', alignSelf: 'flex-start', borderWidth: 1, borderColor: `${COLORS.amber}55` }}>
                          <Ionicons name="location" size={14} color={COLORS.amber} style={{ marginRight: 6 }} /><Text style={{ fontSize: 12, fontWeight: '700', color: '#7A5708' }}>Your delivery is stop {Math.min(stopPosition, activeBooking.stops?.length || 1)} of {activeBooking.stops?.length || 1} on this route</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
                      {(() => {
                        const rawStatus = String(activeBooking.status || '').toLowerCase();
                        const cleanStatus = rawStatus.replace(/[-_ .]/g, ''); 
                        const finishedStopsCount = (activeBooking.stops || []).filter((s: any) => String(s.status).toLowerCase() === 'completed').length;
                        const hasDelivered = cleanStatus.includes('deliver') || cleanStatus.includes('complet') || cleanStatus.includes('paid') || cleanStatus.includes('awaiting') || (activeBooking.stops?.length > 0 && finishedStopsCount === activeBooking.stops.length);
                        const hasEnRoute = cleanStatus.includes('transit') || cleanStatus.includes('progress') || cleanStatus.includes('dropoff') || finishedStopsCount > 0 || hasDelivered;
                        const hasCollected = cleanStatus.includes('pick') || !!activeBooking.picked_up_at || hasEnRoute || hasDelivered;
                        const hasArrivedPickup = cleanStatus.includes('arrivedpickup') || hasCollected;
                        const isAssigned = ['accepted', 'assigned'].includes(cleanStatus) || !!activeBooking.driver_id || hasArrivedPickup;
                        const horizSteps = [ { label: 'Collected', icon: 'cube', active: hasCollected }, { label: 'En Route', icon: 'navigate', active: hasEnRoute }, { label: 'Delivered', icon: 'checkmark-circle', active: hasDelivered } ];
                        const vertSteps = [ { label: 'Order Placed', time: shortTime(activeBooking.created_at), done: true }, { label: 'Driver Assigned', time: shortTime(activeBooking.accepted_at), done: isAssigned }, { label: 'Items Collected', time: shortTime(activeBooking.picked_up_at), done: hasCollected }, { label: 'En Route to Drop-off', time: null, done: hasEnRoute }, { label: 'Delivered', time: shortTime(activeBooking.delivered_at), done: hasDelivered }, ];
                        return (
                          <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 16 }}>
                              {horizSteps.map((step, i) => (
                                <React.Fragment key={step.label}>
                                  <View style={{ alignItems: 'center', flex: i === 1 ? 1 : 0 }}><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: step.active ? COLORS.forest : COLORS.line, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={step.icon as any} size={17} color={step.active ? '#fff' : COLORS.textMuted} /></View><Text style={{ marginTop: 6, fontSize: 11.5, fontWeight: step.active ? '700' : '500', color: step.active ? COLORS.ink : COLORS.textMuted }}>{step.label}</Text></View>
                                  {i < 2 && <View style={{ flex: 1, height: 2, backgroundColor: horizSteps[i+1]?.active ? COLORS.forest : COLORS.line, marginHorizontal: -2, marginBottom: 18 }} />}
                                </React.Fragment>
                              ))}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.line }}>
                              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#CFF0E0', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.forestDark }}>{initials(activeBooking.driver?.full_name || activeBooking.driver_name || 'Driver')}</Text></View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>{activeBooking.driver?.full_name || activeBooking.driver_name || 'Driver Assigned'}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}><Text style={{ fontSize: 12.5, color: COLORS.textMuted }}>{formatVehicleName(activeBooking.van_type)}</Text><Text style={{ fontSize: 12.5, color: COLORS.textMuted, marginHorizontal: 5 }}>·</Text><Ionicons name="star" size={12} color={COLORS.amber} /><Text style={{ fontSize: 12.5, color: COLORS.textMuted, fontWeight: '600', marginLeft: 3 }}>{activeBooking.driver?.rating_avg ? Number(activeBooking.driver.rating_avg).toFixed(1) : '5.0'}</Text></View>
                              </View>
                              <TouchableOpacity onPress={() => Linking.openURL(`tel:${activeBooking.driver_phone || activeBooking.driver?.phone}`)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E9F7EE', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="call" size={17} color={COLORS.forest} /></TouchableOpacity>
                            </View>
                            <View style={{ marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.paper, borderRadius: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: `${COLORS.forest}33`, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, marginRight: 10 }}><Text style={{ fontSize: 10.5, fontWeight: '700', color: COLORS.forestDark }}>{formatJobType(activeBooking.job_type)}</Text></View>
                              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.ink }}>{(activeBooking?.booking_mode === 'multi' || (activeBooking?.stops?.length > 1)) ? `Multi-Drop · ${activeBooking.stops.length} Stops` : 'Single Drop'}</Text>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted }}>HNC-{String(activeBooking.id).padStart(4, '0')}</Text>
                            </View>
                            <View style={{ paddingBottom: 10 }}>
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: COLORS.forestDark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Delivery Journey</Text>
                              {vertSteps.map((s, i) => {
                                const isLast = i === vertSteps.length - 1;
                                return (
                                  <View key={s.label} style={{ flexDirection: 'row', gap: 14 }}>
                                    <View style={{ alignItems: 'center' }}>
                                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: s.done ? COLORS.forest : COLORS.paper, borderWidth: 2, borderColor: s.done ? COLORS.forest : COLORS.line, alignItems: 'center', justifyContent: 'center' }}>{s.done && <Ionicons name="checkmark" size={13} color="#fff" />}</View>
                                      {!isLast && <View style={{ width: 2, height: 30, backgroundColor: s.done ? COLORS.forest : COLORS.line, marginVertical: 2 }} />}
                                    </View>
                                    <View style={{ paddingBottom: isLast ? 0 : 22 }}><Text style={{ fontSize: 14, fontWeight: '700', color: s.done ? COLORS.ink : COLORS.textMuted }}>{s.label}</Text>{s.time && <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>{s.time}</Text>}</View>
                                  </View>
                                );
                              })}
                            </View>
                          </>
                        );
                      })()}
                    </View>

                    {isMulti ? (
                      <View style={{ paddingHorizontal: 22, paddingBottom: 16 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: COLORS.forestDark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Collection & Drop-offs</Text>
                        {(() => {
                           const status = String(activeBooking.status || '').toLowerCase();
                           const hasCollected = ['picked_up', 'in_transit', 'arrived_dropoff', 'delivered', 'completed', 'paid'].includes(status);
                           const isPrePickup = ['pending', 'accepted', 'assigned', 'arrived_pickup'].includes(status);
                           return (
                             <View style={{ flexDirection: 'row', backgroundColor: COLORS.paper, borderRadius: 14, padding: 12, marginBottom: 8, opacity: hasCollected ? 0.6 : 1 }}>
                               <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: hasCollected ? COLORS.forest : COLORS.line, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>{hasCollected ? <Ionicons name="checkmark" size={13} color="#fff" /> : <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted }}>P</Text>}</View>
                               <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink, textDecorationLine: hasCollected ? 'line-through' : 'none' }}>Pickup Location</Text><Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>{activeBooking.pickup_address}</Text></View>
                               {!hasCollected && <View style={{ justifyContent: 'center', paddingLeft: 10 }}><PulsingQrButton isActive={isPrePickup} onPress={() => setActiveQrStopIndex(-1)} /></View>}
                             </View>
                           );
                        })()}
                        {(activeBooking.stops || []).map((s: any, idx: number) => {
                           const isCompleted = s.status === 'completed';
                           const activeStopIdx = (activeBooking.stops || []).findIndex((stop: any) => stop.status !== 'completed');
                           const isCurrentActiveStop = idx === activeStopIdx;
                           return (
                             <View key={idx} style={{ flexDirection: 'row', backgroundColor: COLORS.paper, borderRadius: 14, padding: 12, marginBottom: 8, opacity: isCompleted ? 0.6 : 1 }}>
                               <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: isCompleted ? COLORS.forest : COLORS.line, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>{isCompleted ? <Ionicons name="checkmark" size={13} color="#fff" /> : <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textMuted }}>{s.stop_order || idx + 1}</Text>}</View>
                               <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink, textDecorationLine: isCompleted ? 'line-through' : 'none' }}>{s.recipient || s.name || String(s.address || '').split(',')[0]}</Text><Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>{s.address}</Text></View>
                               {!isCompleted && <View style={{ justifyContent: 'center', paddingLeft: 10 }}><PulsingQrButton isActive={isCurrentActiveStop} onPress={() => setActiveQrStopIndex(idx)} /></View>}
                             </View>
                           );
                        })}
                      </View>
                    ) : (
                      <View style={{ paddingHorizontal: 22, paddingBottom: 16 }}>
                        <View style={{ flexDirection: 'row', backgroundColor: COLORS.paper, borderRadius: 14, padding: 12 }}>
                          <Ionicons name="cube" size={16} color={COLORS.forest} style={{ marginTop: 2, marginRight: 10 }} />
                          <View style={{ flex: 1 }}><Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>Drop-off Destination</Text><Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1 }}>{activeBooking.dropoff_address || 'Provided during booking'}</Text></View>
                          {(() => {
                              const status = String(activeBooking.status || '').toLowerCase();
                              const isDelivered = ['delivered', 'completed', 'paid', 'awaitingconfirmation'].includes(status.replace(/[-_ .]/g, ''));
                              const isAtDropoff = status === 'arrived_dropoff';
                              if (!isDelivered) return <View style={{ justifyContent: 'center', paddingLeft: 10 }}><PulsingQrButton isActive={isAtDropoff} onPress={() => setActiveQrStopIndex(0)} /></View>;
                              return null;
                          })()}
                        </View>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', paddingHorizontal: 22, gap: 10 }}>
                      <TouchableOpacity onPress={() => setChatVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.line, backgroundColor: '#fff' }}>
                        <Ionicons name="help-buoy-outline" size={16} color={COLORS.ink} style={{ marginRight: 7 }} />
                        <Text style={{ color: COLORS.ink, fontWeight: '700', fontSize: 13.5 }}>Support</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                          if (isMulti) {
                            const status = String(activeBooking.status || '').toLowerCase();
                            const isPrePickup = ['pending', 'accepted', 'assigned', 'arrived_pickup'].includes(status);
                            if (isPrePickup) setActiveQrStopIndex(-1);
                            else { const nextStopIndex = activeBooking.stops?.findIndex((s: any) => String(s.status).toLowerCase() !== 'completed'); if (nextStopIndex !== undefined && nextStopIndex !== -1) setActiveQrStopIndex(nextStopIndex); }
                          } else { setActiveQrStopIndex(0); }
                        }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 14, backgroundColor: ['delivered', 'completed'].includes(String(activeBooking.status).toLowerCase()) ? COLORS.line : COLORS.forest }}>
                        <Ionicons name="key-outline" size={16} color={['delivered', 'completed'].includes(String(activeBooking.status).toLowerCase()) ? COLORS.textMuted : '#fff'} style={{ marginRight: 8 }} />
                        <Text style={{ color: ['delivered', 'completed'].includes(String(activeBooking.status).toLowerCase()) ? COLORS.textMuted : '#fff', fontWeight: '700', fontSize: 14.5 }}>{['delivered', 'completed'].includes(String(activeBooking.status).toLowerCase()) ? 'Delivered' : (isMulti ? 'Show Active QR' : 'Show Delivery QR')}</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </>
              )}
            </View>

            <PremiumQrModal visible={activeQrStopIndex !== null} onClose={() => setActiveQrStopIndex(null)} stopIndex={activeQrStopIndex !== null ? activeQrStopIndex : 0} isMulti={isMulti} stopAddress={ activeQrStopIndex === -1 ? activeBooking?.pickup_address : isMulti ? activeBooking?.stops?.[activeQrStopIndex || 0]?.address || '' : activeBooking?.dropoff_address || ''} qrValue={(() => { if (activeQrStopIndex === -1) return encodeURIComponent(JSON.stringify({ type: 'PICKUP_CONFIRMATION', booking_id: activeBooking?.id })); else if (isMulti) return encodeURIComponent(JSON.stringify({ type: 'STOP_CONFIRMATION', booking_id: activeBooking?.id, stop_id: activeBooking?.stops?.[activeQrStopIndex || 0]?.id })); else return encodeURIComponent(JSON.stringify({ type: 'DROPOFF_CONFIRMATION', booking_id: activeBooking?.id })); })()} />

          </View>
        )}
      </Modal>

      {/* 6. QUOTE / PAY MODAL */}
      <Modal visible={quoteModalVisible} transparent animationType="slide" onRequestClose={() => setQuoteModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '60%' }}>
            <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Confirm Booking</Text>
            {quoteData ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><Text style={{ color: COLORS.soft, fontSize: 15 }}>Total Distance:</Text><Text style={{ fontWeight: '700', fontSize: 15 }}>{safePrice(quoteData.distance_km || quoteData.distance).toFixed(2)} km</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><Text style={{ color: COLORS.soft, fontSize: 15 }}>Van Type:</Text><Text style={{ fontWeight: '700', fontSize: 15, textTransform: 'capitalize' }}>{quoteData.van_type}</Text></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}><Text style={{ color: COLORS.soft, fontSize: 15 }}>Est. Time:</Text><Text style={{ fontWeight: '700', fontSize: 15 }}>{quoteData.duration_min} mins</Text></View>
                <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16, marginBottom: 24, alignItems: 'center' }}><Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.ink, textAlign: 'center' }}>€{safePrice(quoteData.final_price ?? quoteData.price).toFixed(2)}</Text><Text style={{ textAlign: 'center', color: COLORS.soft, fontSize: 13, marginTop: 4 }}>Includes taxes & fees</Text></View>
                <TouchableOpacity style={[globalStyles.primaryButton, { backgroundColor: COLORS.primary }]} onPress={confirmAndPayAndCreateBooking} disabled={creatingBooking}>{creatingBooking ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.buttonText}>Pay & Book Now</Text>}</TouchableOpacity>
                <TouchableOpacity style={{ marginTop: 16, alignItems: 'center', padding: 10 }} onPress={() => setQuoteModalVisible(false)}><Text style={{ color: COLORS.soft, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
              </>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={{ marginTop: 16, color: COLORS.soft, marginBottom: 20, textAlign: 'center' }}>Fetching best price...</Text><TouchableOpacity style={{ padding: 10, marginBottom: 10 }} onPress={handleGetPrice}><Text style={{ color: COLORS.primary, fontWeight: '600' }}>Retry</Text></TouchableOpacity><TouchableOpacity onPress={() => setQuoteModalVisible(false)}><Text style={{ color: COLORS.danger, fontWeight: '600' }}>Cancel</Text></TouchableOpacity></View>
            )}
          </View>
        </View>
      </Modal>

      {/* 7. RATING MODAL */}
      <RatingModal visible={ratingModalVisible} proofUrl={activeBooking?.delivery_proof_url ?? activeBooking?.proof_url} onClose={() => { if (ratingBookingContext?.bookingId) setDismissedRatingIds(prev => [...prev, ratingBookingContext.bookingId!]); setRatingModalVisible(false); setRatingBookingContext(null); setActiveBooking(null); }} onSubmit={async (rating: number, note: string) => { if (!ratingBookingContext?.driverId) return; await rateDriver(ratingBookingContext.driverId, rating, note, ratingBookingContext.bookingId); if (ratingBookingContext?.bookingId) setDismissedRatingIds(prev => [...prev, ratingBookingContext.bookingId!]); await acknowledgeBooking?.(ratingBookingContext.bookingId!); setRatingModalVisible(false); setActiveBooking(null); }} />

      {/* 8. LIVE CHAT TRIGGER & MODAL */}
      <TouchableOpacity onPress={() => setChatVisible(true)} style={{ position: 'absolute', right: 18, bottom: 90, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8 }}><Ionicons name="chatbubbles" size={26} color="#fff" /></TouchableOpacity>

      <ChatSupportModal visible={chatVisible} onClose={() => setChatVisible(false)} user={user} activeBooking={activeBooking} sendSupportMessage={sendSupportMessage} createSupportTicket={createSupportTicket} />
      
      {/* 🚀 THE BOTTOM SHEET MODAL (Single Drop Only) */}
      <Modal visible={!!sheetCategory && !sheetCategory.startsWith('stop_')} animationType="slide" transparent onRequestClose={() => setSheetCategory(null)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSheetCategory(null)} activeOpacity={1} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{activeCategories.find(c => c.id === activeCatKey)?.name || 'Services'}</Text>
              <Text style={styles.sheetSub}>{activeCategories.find(c => c.id === activeCatKey)?.desc || 'Select a service for this category.'}</Text>
            </View>
            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.6 }}>
              {visibleSheetServices.length === 0 ? (
                <Text style={styles.emptyText}>No matching services for this van type.</Text>
              ) : (
                visibleSheetServices.map((svc) => (
                  <TouchableOpacity key={svc.id} style={[styles.sheetItem, selectedService?.id === svc.id && styles.sheetItemSel]} onPress={() => selectService(svc)} activeOpacity={0.7}>
                    <View style={styles.shiIco}><BookingIcon name={svc.ico} size={24} color={selectedService?.id === svc.id ? COLORS.primary : COLORS.soft} /></View>
                    <View style={styles.shiBody}>
                      <Text style={[styles.shiName, { fontWeight: '400' }, selectedService?.id === svc.id && { color: COLORS.primary }]}>{svc.name}</Text>
                      <Text style={styles.shiDesc}>{svc.desc}</Text>
                    </View>
                    <View style={styles.shiRight}>
                      <View style={[styles.shiRadio, selectedService?.id === svc.id && styles.shiRadioSel]}>{selectedService?.id === svc.id && <View style={styles.shiRadioDot} />}</View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🚀 THE NEW MAP MODAL */}
      <Modal visible={mapPickTarget !== null} animationType="slide" transparent onRequestClose={() => setMapPickTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(10,22,18,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden', maxHeight: '90%' }}>
            
            {/* Modal Header */}
            <View style={{ padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <View style={{ width: 36, height: 4, backgroundColor: COLORS.border, borderRadius: 2, position: 'absolute', top: 8 }} />
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="location" size={18} color={mapPickTarget === 0 ? COLORS.danger : COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.ink, letterSpacing: -0.2 }}>{mapPickTarget === 0 ? 'Pin drop-off' : 'Pin location'}</Text>
                </View>
                <TouchableOpacity onPress={() => setMapPickTarget(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color={COLORS.soft} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Map View Box */}
            <View style={{ height: 260, position: 'relative' }}>
              <MapView 
                style={{ flex: 1 }} 
                initialRegion={DUBLIN_PICK_REGION} 
                onPanDrag={() => { mapMovedRef.current = true; }} 
                onRegionChangeComplete={onRegionChangeComplete} 
              />
              <View style={{ position: 'absolute', top: '50%', left: '50%', marginTop: -36, marginLeft: -18, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <Ionicons name="location" size={42} color={mapPickTarget === 0 ? COLORS.danger : COLORS.primary} style={{ marginBottom: 12 }} />
                <View style={{ width: 8, height: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 4, position: 'absolute', bottom: 12 }} />
              </View>
              <View style={{ position: 'absolute', bottom: 8, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '500' }}>Move map to position pin</Text>
              </View>
            </View>

            {/* Address Input Body with Search Suggestions */}
            <View style={{ padding: 18, zIndex: 10 }}>
              <Text style={styles.fieldLabel}>{mapPickTarget === 0 ? 'Drop-off Address' : 'Pickup / Stop Address'}</Text>
              <View style={{ position: 'relative', zIndex: 100 }}>
                <TextInput 
                  style={styles.fieldInput} 
                  value={tempAddress} 
                  onChangeText={(t) => { setTempAddress(t); scheduleSearch(t, mapPickTarget!); }} 
                  onFocus={() => setActiveSearchIndex(mapPickTarget!)} 
                  placeholder="Search full address or Eircode..." 
                />
                {activeSearchIndex === mapPickTarget && (
                  <ScrollView 
                    keyboardShouldPersistTaps="handled"
                    style={[styles.suggestionBox, { position: 'absolute', top: 50, left: 0, right: 0, zIndex: 999, maxHeight: 220 }]}
                  >
                    {/* 🚀 FIXED: Changed to ScrollView, added maxHeight, and handled taps over keyboard */}

                    {((mapPickTarget === -1 ? pickupSuggestions : dropoffSuggestions) || []).map((item: any, i: number) => {
                      const displayTitle = item?.display_name || item?.formatted || item?.description || item?.name || (typeof item === 'string' ? item : '');
                      return (
                        <TouchableOpacity 
                          key={i} 
                          style={styles.suggestionItem} 
                          activeOpacity={0.7} 
                          onPress={() => { 
                            const parsedLat = safeCoord(item.lat || item.latitude, DUBLIN_PICK_REGION.latitude);
                            const parsedLon = safeCoord(item.lon || item.longitude, DUBLIN_PICK_REGION.longitude);
                            setTempAddress(displayTitle); 
                            setTempCoord({ lat: parsedLat, lon: parsedLon }); 
                            setActiveSearchIndex(null); 
                            mapMovedRef.current = false;
                          }}
                        >
                          <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                          <Text style={styles.suggestionText}>{displayTitle}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </View>


            {/* Buttons Footer */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom, 20), gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={{ paddingVertical: 14, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }} onPress={() => setMapPickTarget(null)}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.mid }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }} onPress={confirmLocation}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.white }}>Confirm</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 0 },

  closeBtn: { padding: 8, backgroundColor: COLORS.bg, borderRadius: 20 },
  headerTitle: { fontSize: 13, fontWeight: '600', color: COLORS.ink },

  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.ink,
  },
  stepActive: { flex: 1, alignItems: 'center' },
  stepDone: { flex: 1, alignItems: 'center' },
  stepPending: { flex: 1, alignItems: 'center' },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
    paddingTop: 4, 
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
    marginTop: 4,
  },
  stepLineDone: { width: 40, height: 2, backgroundColor: COLORS.primary, marginHorizontal: 4 },
  stepLinePending: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 4 },

  modeToggleRow: { flexDirection: 'row', backgroundColor: COLORS.primarySoft, borderRadius: 28, padding: 3, marginBottom: 12,marginTop: 12, borderWidth: 1, borderColor: COLORS.primaryMid },
  modeToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 24, backgroundColor: 'transparent' },
  modeToggleBtnOn: { backgroundColor: COLORS.ink },
  modeToggleText: { fontSize: 12, fontWeight: '600', color: COLORS.soft },
  modeToggleTextOn: { color: COLORS.white },

  card: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8 },
  cardLocked: { opacity: 0.42 },
  cardHeader: { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 11, fontWeight: '700', color: COLORS.ink, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSub: { fontSize: 10, color: COLORS.soft, marginTop: 1 },
  cardBody: { padding: 12 },
  autoBadge: { fontSize: 9, color: COLORS.primary, fontWeight: '700', backgroundColor: COLORS.primarySoft, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 20, letterSpacing: 0.5 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  lockedBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.mute, letterSpacing: 0.5 },

  opRow: { flexDirection: 'row', gap: 6, marginBottom: 0 },
  opBtn: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 9, paddingHorizontal: 6, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.white, position: 'relative' },
  opBtnOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  opBtnIco: { width: 34, height: 34, borderRadius: 8, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  opBtnIcoOn: { backgroundColor: COLORS.primaryMid },
  opBtnName: { fontSize: 9, fontWeight: '700', color: COLORS.soft, textAlign: 'center', lineHeight: 12, marginTop: 1 },
  opBtnTag: { fontSize: 8, fontWeight: '700', color: COLORS.primary, backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primaryMid, paddingVertical: 1, paddingHorizontal: 5, borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.2, marginTop: 2 },
  opSelDot: { position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  opReset: { fontSize: 10, color: COLORS.soft, fontWeight: '600', textDecorationLine: 'underline' },

  vehicleScroll: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  
  vehicleChip: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white, position: 'relative' },
  vehicleChipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  vehicleChipDim: { opacity: 0.28 },
  vehicleName: { fontSize: 9, fontWeight: '600', color: COLORS.soft, textAlign: 'center', marginTop: 4 },
  vehicleNameOn: { color: COLORS.primary },
  vehicleSelDot: { position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  noteBox: { marginTop: 10, padding: 8, backgroundColor: COLORS.bg, borderRadius: 7, borderWidth: 1, borderColor: COLORS.border },
  noteText: { fontSize: 10, color: COLORS.soft, lineHeight: 15 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catChip: { alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white, marginBottom: 0, position: 'relative' },
  catChipSingle: { width: '48.5%', flexGrow: 1 },
  catChipMulti: { width: '48.5%', flexGrow: 1 },

  catChipAuto: { width: '100%', flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, gap: 10 },
  catChipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  catChipDim: { opacity: 0.28 },
  catName: { fontSize: 9, fontWeight: '600', color: COLORS.soft, marginTop: 4, textAlign: 'center' },
  catNameAuto: { marginTop: 0 },
  catNameOn: { color: COLORS.primary },
  catInfoBtn: { position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  catInfoText: { fontSize: 9, fontWeight: '700', color: COLORS.soft },

  serviceListHeader: { marginTop: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionDivider: { fontSize: 9, fontWeight: '700', color: COLORS.soft, textTransform: 'uppercase', letterSpacing: 0.5 },
  backLink: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  emptyText: { fontSize: 11, color: COLORS.soft, textAlign: 'center', paddingVertical: 14 },

  serviceList: { gap: 6 },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.white },
  serviceItemOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  svcIcoWrap: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primarySoft },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 12, fontWeight: '600', color: COLORS.ink },
  serviceDesc: { fontSize: 10, color: COLORS.soft, marginTop: 2, lineHeight: 14 },
  serviceRight: { alignItems: 'flex-end' },
  servicePrice: { fontSize: 11, fontWeight: '500', color: COLORS.mid, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  serviceBadge: { fontSize: 8, fontWeight: '700', marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, textTransform: 'uppercase', overflow: 'hidden' },
  badgeBp: { backgroundColor: COLORS.dangerSoft, color: COLORS.danger },
  badgeBe: { backgroundColor: COLORS.warningSoft, color: COLORS.warning },
  badgeBs: { backgroundColor: COLORS.primarySoft, color: COLORS.primary },
  badgeBm: { backgroundColor: COLORS.purpleSoft, color: COLORS.purple },

  selectedPill: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: COLORS.primarySoft, borderWidth: 1.5, borderColor: COLORS.primary, marginBottom: 10 },
  selectedPillName: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  selectedPillPrice: { fontSize: 11, color: COLORS.mid, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  changeLink: { fontSize: 10, color: COLORS.primary, textDecorationLine: 'underline', fontWeight: '600' },

  sdivRow: { marginTop: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  sdivText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: COLORS.soft, letterSpacing: 0.5 },

  weightStepperContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, backgroundColor: COLORS.white },
  stepperBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  weightStepperInput: { flex: 1, textAlign: 'center', fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: COLORS.ink },

  itemsSec: { marginTop: 2 },
  table: { width: '100%' },
  tableHdrRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 6, marginBottom: 4, backgroundColor: COLORS.bg, paddingHorizontal: 8, borderRadius: 6 },
  th: { fontSize: 8, fontWeight: '700', color: COLORS.soft, textTransform: 'uppercase', letterSpacing: 0.5 },
  tr: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border, 
    paddingVertical: 6, 
    paddingHorizontal: 8
  },
  tdInput: { fontSize: 12, color: COLORS.ink, paddingVertical: 8, paddingHorizontal: 8 },
  tdDel: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  addItemBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, marginTop: 4 },
  addItemBtnText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },

  row2: { flexDirection: 'row', gap: 7, marginTop: 8 },
  fieldHalf: { flex: 1 },
  fieldFull: { marginTop: 8 },

  fieldLabel: { fontSize: 10, fontWeight: '700', color: COLORS.mid, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 },
  fieldInput: { width: '100%', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 11, fontSize: 13, color: COLORS.ink, backgroundColor: COLORS.white },
  priceBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primaryMid, borderRadius: 12, marginBottom: 10 },
  priceBannerIco: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  priceBannerTitle: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  priceBannerSub: { fontSize: 10, color: COLORS.mid, marginTop: 2, lineHeight: 14 },

  bottomCta: { marginTop: 10, paddingBottom: 20 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, gap: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 5 },
  ctaBtnGreen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, gap: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 5 },
  ctaBtnDim: { backgroundColor: COLORS.mute, shadowOpacity: 0, elevation: 0 },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  schedToggle: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 24, padding: 3, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  schedBtn: { flex: 1, paddingVertical: 7, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  schedBtnOn: { backgroundColor: COLORS.ink },
  schedText: { fontSize: 12, fontWeight: '500', color: COLORS.soft },
  schedTextOn: { color: COLORS.white, fontWeight: '600' },
  datePickerCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  dateConfirmBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  dateConfirmText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  serviceBanner: { backgroundColor: COLORS.primary, padding: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, marginBottom: 12, marginTop:10 },
  serviceBannerName: { fontSize: 11, color: COLORS.white, fontWeight: '600' },
  serviceBannerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  serviceBannerChange: { fontSize: 10, color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },

  mapStrip: { width: '100%', height: 90, borderRadius: 8, overflow: 'hidden', position: 'relative', marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  mapEditBtn: { position: 'absolute', bottom: 6, right: 6, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapEditText: { fontSize: 9, fontWeight: '600', color: COLORS.primary },

  locRowPick: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primaryMid, backgroundColor: COLORS.primarySoft, marginBottom: 8 },
  locRowDrop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#f1b8b4', backgroundColor: COLORS.dangerSoft, marginBottom: 8 },
  locDotG: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  locDotR: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.danger },
  locInfo: { flex: 1, justifyContent: 'center' },
  locLblG: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, color: COLORS.primary },
  locLblR: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, color: COLORS.danger },

  locInput: { fontSize: 13, fontWeight: '500', color: COLORS.ink, padding: 0, margin: 0 },
  locPinBtn: { width: 26, height: 26, borderRadius: 5, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  locPinBtnRed: { width: 26, height: 26, borderRadius: 5, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  connectorLine: { width: 2, height: 16, marginLeft: 14, marginTop: -4, marginBottom: -4, borderLeftWidth: 2, borderLeftColor: COLORS.border, borderStyle: 'dashed' },

  stopsWrap: { position: 'relative', marginTop: 4 },
  stopCard: { backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginTop: 8, overflow: 'hidden', position: 'relative' },
  stopCardExp: { borderColor: COLORS.primary },
  stopHdr: { flexDirection: 'row', alignItems: 'center', padding: 9 },
  stopNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  stopNumActive: { backgroundColor: COLORS.primary },
  stopNumText: { color: COLORS.white, fontSize: 9, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  stopPrev: { flex: 1 },
  stopAddr: { fontSize: 11, fontWeight: '500', color: COLORS.ink },
  stopAddrPh: { color: COLORS.soft, fontWeight: '400' },
  stopMeta: { fontSize: 10, color: COLORS.soft, marginTop: 1 },
  stopRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stopPinBtn: { width: 22, height: 22, borderRadius: 4, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 22, height: 22, borderRadius: 4, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  stopBody: { padding: 10, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: '#FAFCFB' },

  addrWrap: { position: 'relative' },
  addrPin: { position: 'absolute', right: 5, top: '50%', marginTop: -10, width: 20, height: 20, borderRadius: 3, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },

  stopSvcSel: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  stopSvcLbl: { fontSize: 9, fontWeight: '700', color: COLORS.mid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  stopSvcChosen: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 7, backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primaryMid, borderRadius: 7, marginBottom: 6 },
  stopSvcChosenName: { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.primary },
  stopSvcChosenChange: { fontSize: 9, color: COLORS.primary, textDecorationLine: 'underline' },
  stopCatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  stopCatBtn: { width: '32%', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 5, alignItems: 'center', backgroundColor: COLORS.white },
  stopCatBtnDim: { opacity: 0.3 },
  stopCatBtnText: { fontSize: 9, fontWeight: '600', color: COLORS.soft },
  
  stopCatBtnOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  stopCatBtnTextOn: { color: COLORS.primary },
  stopSvcScroll: { maxHeight: 180, marginTop: 8 },
  stopSvcItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.white, marginBottom: 6 },
  stopSvcItemIco: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  stopSvcItemName: { fontSize: 13, fontWeight: '500', color: COLORS.ink, flex: 1 },

  incBadge: { fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, textTransform: 'uppercase', backgroundColor: COLORS.warningSoft, color: COLORS.warning, overflow: 'hidden' },

  addStopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: 8, marginTop: 10 },
  addStopBtnText: { fontSize: 11, fontWeight: '500', color: COLORS.soft },
  stopCount: { fontSize: 10, color: COLORS.soft, fontWeight: '500', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  suggestionBox: { backgroundColor: COLORS.white, borderRadius: 8, marginTop: 4, paddingHorizontal: 4, paddingBottom: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, zIndex: 10 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionText: { marginLeft: 8, fontSize: 13, color: '#374151' },

  mapBgReal: { flex: 1, backgroundColor: '#c8e6d4', position: 'relative', overflow: 'hidden' },
  mapRoadMain: { position: 'absolute', left: -10, right: -10, top: '44%', height: 10, backgroundColor: 'rgba(255,255,255,0.5)', transform: [{ rotate: '-2deg' }] },
  mapRouteLine: { position: 'absolute', left: '10%', right: '10%', top: '39%', height: 2, borderBottomWidth: 2, borderBottomColor: COLORS.primary, borderStyle: 'dashed' },
  mapPinsWrap: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: '10%', zIndex: 4 },
  mapPinGroup: { alignItems: 'center', justifyContent: 'center', gap: 1 },
  mapPinDotReal: { width: 16, height: 16, borderRadius: 8, borderTopRightRadius: 0, transform: [{ rotate: '-45deg' }], alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 5 },
  mapPinPickup: { backgroundColor: COLORS.primary },
  mapPinStop: { backgroundColor: COLORS.ink },
  mapPinDropoff: { backgroundColor: COLORS.danger },
  mapPinLetter: { color: COLORS.white, fontSize: 7, fontWeight: '700', transform: [{ rotate: '45deg' }] },
  mapPinTag: { fontSize: 8, fontWeight: '600', color: COLORS.ink, backgroundColor: COLORS.white, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, overflow: 'hidden', marginTop: 3 },

  grpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 4 },
  grpCard: { width: '48%', backgroundColor: COLORS.bg, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' },
  grpCardSel: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 10, elevation: 4 },
  gcIco: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  gcName: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  gcArrow: { position: 'absolute', top: 10, right: 10, opacity: 0.4 },
  
  svcConfirmed: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: COLORS.primarySoft, borderWidth: 1.5, borderColor: COLORS.primaryMid, borderRadius: 14, marginTop: 12 },
  svcConfirmedIco: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  svcConfirmedBody: { flex: 1 },
  svcConfirmedName: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  svcConfirmedDesc: { fontSize: 12, color: COLORS.mid, marginTop: 2 },
  svcConfirmedChange: { fontSize: 12, color: COLORS.primary, fontWeight: '700', textDecorationLine: 'underline' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(10, 22, 18, 0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, overflow: 'hidden' },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetHead: { paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.ink },
  sheetSub: { fontSize: 13, color: COLORS.soft, marginTop: 4 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: COLORS.bg },
  sheetItemSel: { backgroundColor: COLORS.primarySoft },
  shiIco: { width: 46, height: 46, borderRadius: 12, backgroundColor: COLORS.bg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  shiBody: { flex: 1, marginLeft: 14 },
  shiName: { fontSize: 15, fontWeight: '700', color: COLORS.ink, marginBottom: 2 },
  shiDesc: { fontSize: 12, color: COLORS.soft, lineHeight: 18 },
  shiRight: { alignItems: 'flex-end', marginLeft: 12 },
  shiPrice: { fontSize: 13, fontWeight: '700', color: COLORS.soft, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 8 },
  shiRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  shiRadioSel: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  shiRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white },
});