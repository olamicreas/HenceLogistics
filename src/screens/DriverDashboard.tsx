import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  Linking,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  AppState 
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../context/AppProvider';
import { DriverIcon } from './DriverIcons';
import axios from 'axios';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_URL = 'https://hencedelivery.com';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type EarningsWindow = 'daily' | 'weekly' | 'monthly';
type VerField = 'reg' | 'insurance' | 'id' | 'license' | 'nct';

const openGoogleNavigation = (lat: number, lon: number) => {
  if (!lat || !lon) {
    Alert.alert("Error", "Missing location data");
    return;
  }
  const url = Platform.OS === 'ios'
    ? `http://maps.apple.com/?daddr=${lat},${lon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
  
  Linking.openURL(url);
};

const COLORS = {
  primary: '#1A7A4A',
  primarySoft: '#CCFBF1',
  primaryBorder: '#5EEAD4',
  bg: '#F4F8F6',
  white: '#FFFFFF',
  ink: '#111827',
  mid: '#3D5046',
  soft: '#6B7280',
  mute: '#B8CEC3',
  border: '#E5E7EB',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  warningSoft: '#FEF3DC',
  successSoft: '#D1FAE5',
  dangerSoft: '#FEF2F2',
};

const mapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'water', stylers: [{ color: '#c7d2fe' }] },
];

function statusValue(v: any) {
  return String(v || '').toLowerCase();
}

function money(v: any) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function shortDateTime(v?: string | null) {
  if (!v) return '';
  try {
    const d = new Date(v);
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(v);
  }
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

function initials(name?: string | null) {
  if (!name) return 'DR';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || 'DR';
}

function getWindowDates(window: EarningsWindow) {
  const now = new Date();

  if (window === 'daily') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: now };
  }

  if (window === 'weekly') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  const start = new Date(now);
  start.setDate(now.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

function shadow(color: string) {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  } as const;
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


function getVerificationDocs(profileDraft: any) {
  return profileDraft?.verification_docs || {};
}

function getVerificationStatusLabel(status: string) {
  if (status === 'verified') return 'Verified';
  if (status === 'pending') return 'Reviewing';
  return 'Missing';
}

function getVerificationBadgeStyle(status: string, styles: any) {
  if (status === 'verified') return styles.dbOk;
  if (status === 'pending') return styles.dbPend;
  return styles.dbMiss;
}

function getVerificationIconStyle(status: string, styles: any) {
  if (status === 'verified') return styles.docOk;
  if (status === 'pending') return styles.docPend;
  return styles.docMiss;
}

function getVerificationIconColor(status: string) {
  if (status === 'verified') return COLORS.success;
  if (status === 'pending') return COLORS.warning;
  return COLORS.danger;
}

async function registerForPushNotificationsAsync() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0F766E',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;
    if (!Device.isDevice) return null;

    try {
      return (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;
    } catch {
      return (await Notifications.getExpoPushTokenAsync()).data;
    }
  } catch {
    return null;
  }
}

async function schedulePushNotification(title: string, body: string, data?: Record<string, any>) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null,
    });
  } catch {}
}

function DriverChatSupportModal({
  visible,
  onClose,
  user,
  activeJob,
  sendSupportMessage,
  createSupportTicket,
}: any) {
  const FAQ = [
    {
      q: 'Why am I not seeing jobs?',
      a: 'Make sure you are online, premium-enabled if required, and your live location is updating.',
      keywords: ['jobs', 'available', 'dispatch'],
    },
    {
      q: 'How do I confirm pickup?',
      a: 'Open the active job and scan the pickup QR, then proceed to delivery.',
      keywords: ['pickup', 'scan', 'qr'],
    },
    {
      q: 'How do I report a dispute?',
      a: 'Open Support and submit the issue with the booking reference and a short explanation.',
      keywords: ['dispute', 'issue', 'problem'],
    },
  ];

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setMessages([
        {
          id: 'bot-welcome',
          sender: 'bot',
          text: `Hi ${user?.full_name?.split(' ')[0] || 'there'} — I’m Hence Driver Support. How can I help today?`,
          time: Date.now(),
        },
      ]);
      setInput('');
    }
  }, [visible, user]);

  const botReply = (text: string) => {
    const lower = text.toLowerCase();
    const match = FAQ.find((item) =>
      item.keywords.some((k) => lower.includes(k))
    );

    if (match) return match.a;
    return 'I can help with jobs, pickup confirmation, delivery issues, account issues, and disputes. If this needs a human agent, tap the headset button.';
  };

  const onSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();

    setMessages(prev => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        sender: 'user',
        text: userText,
        time: Date.now(),
      },
    ]);
    setInput('');

    const autoReply = botReply(userText);

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: autoReply,
          time: Date.now(),
        },
      ]);
    }, 500);
  };

  const escalateToHuman = async () => {
    setSending(true);
    try {
      const payload = {
        userId: user?.id,
        name: user?.full_name,
        role: user?.role,
        subject: `Driver support escalation${activeJob?.id ? ` for booking #${activeJob.id}` : ''}`,
        message: `Driver ${user?.full_name || ''} (ID: ${user?.id || 'N/A'}) requested live support.${activeJob?.id ? ` Booking ID: ${activeJob.id}.` : ''}`,
        bookingId: activeJob?.id || null,
      };

      if (sendSupportMessage) {
        await sendSupportMessage(payload);
      } else if (createSupportTicket) {
        await createSupportTicket(payload);
      } else {
        const subject = payload.subject;
        const body = payload.message;
        const mailUrl = `mailto:support@hencelogistics.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        await Linking.openURL(mailUrl);
      }

      setMessages(prev => [
        ...prev,
        {
          id: `b-human-${Date.now()}`,
          sender: 'bot',
          text: 'Your issue has been escalated to human support.',
          time: Date.now(),
        },
      ]);
    } catch {
      Alert.alert('Error', 'Could not contact support right now.');
    } finally {
      setSending(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalShade} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.chatModalCard}>
          <View style={styles.chatHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatTitle}>Hence Driver Support</Text>
              <Text style={styles.chatSub}>
                {activeJob?.id ? `Booking #${activeJob.id}` : 'General support'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.chatCloseBtn}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={{ flex: 1, padding: 12 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((item) => (
              <View
                key={item.id}
                style={{
                  marginBottom: 10,
                  alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <View
                  style={{
                    backgroundColor: item.sender === 'user' ? COLORS.primary : '#F3F4F6',
                    padding: 10,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: item.sender === 'user' ? 'white' : '#111827' }}>
                    {item.text}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.chatComposer}>
            <TextInput
              placeholder="Type your message..."
              value={input}
              onChangeText={setInput}
              style={styles.chatInput}
              placeholderTextColor="#9ca3af"
            />

            <TouchableOpacity onPress={onSend} style={styles.chatSendBtn}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={escalateToHuman}
              style={styles.chatHeadsetBtn}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <MaterialCommunityIcons name="headset" size={22} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SwipeToDeleteItem({ ride, onDelete, children }: any) {
  const pan = React.useRef(new Animated.Value(0)).current;
  
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx < 0 && gestureState.dx >= -90) pan.setValue(gestureState.dx);
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
    Alert.alert("Delete Log", "Remove this job from your history?", [
        { text: "Cancel", style: "cancel", onPress: () => Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start() }, 
        { text: "Delete", style: "destructive", onPress: () => onDelete(ride.id) }
    ]);
  };

  return (
    <View style={{ position: 'relative', marginBottom: 12 }}>
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

// --- MAIN DRIVER DASHBOARD COMPONENT ---
export default function DriverDashboard() {
  const {
    user,
    token,
    availableJobs,
    setAvailableJobs,
    activeJobs,
    rideHistory,
    refreshDriverJobs,
    acceptJob,
    declineJob,
    openNavigationToJob,
    markPickedUp,
    markDelivered,
    pickAndUploadProof,
    isPremium,
    driverLocation,
    fetchDriverProfile,
    getDriverFromCache,
    uploadVerificationPhoto,
    submitDriverVerification,
    fetchDriverVerificationStatus,
    sendSupportMessage,
    createSupportTicket,
    profileDraft,
    setProfileDraft,
    saveProfile,
    updateDriverStatus,
    setCurrentScreen,
    driverScreenIndex,
    setDriverScreenIndex,
  } = useAppContext();
  
  const locationInterval = useRef<any>(null);
  const mapRef = useRef<MapView>(null);
  const screenIndex = driverScreenIndex || 0;
  const setScreenIndex = setDriverScreenIndex;
  const [isOnline, setIsOnline] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [jobDriverProfile, setJobDriverProfile] = useState<any | null>(null);
  const [earningsWindow, setEarningsWindow] = useState<EarningsWindow>('daily');
  const [supportVisible, setSupportVisible] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [driverChatVisible, setDriverChatVisible] = useState(false);
  const [activeDoc, setActiveDoc] = useState<VerField | null>(null);
  const [verUploads, setVerUploads] = useState<Partial<Record<VerField, string>>>({});
  const [uploadedUrls, setUploadedUrls] = useState<Partial<Record<VerField, string>>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Partial<Record<VerField, boolean>>>({});
  const [uploadProgress, setUploadProgress] = useState<Partial<Record<VerField, number>>>({});
  const [verStatus, setVerStatus] = useState<'unverified' | 'pending' | 'verified'>(
    (user as any)?.driver_verified ? 'verified' : 'unverified'
  );
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [locModalVisible, setLocModalVisible] = useState(false);
  const [newOfferModalVisible, setNewOfferModalVisible] = useState(false);
  const [ringingOffer, setRingingOffer] = useState<any>(null);
  const [offerSecondsLeft, setOfferSecondsLeft] = useState(30);

  const [selectedHistoryFilter, setSelectedHistoryFilter] = useState<
    'All' | 'Completed' | 'Disputed' | 'Cancelled' | 'This Week'
  >('All');

  const pollRef = useRef<number | null>(null);
  const skipProcessingRef = useRef<Record<number, boolean>>({});
  const acceptProcessingRef = useRef<Record<number, boolean>>({});
  
  const activeJob = activeJobs?.[0] || null;
  const nextAvailableJob = availableJobs?.[0] || null;
  const docsFromProfile = useMemo(() => getVerificationDocs(profileDraft), [profileDraft]);

  const [hiddenHistoryIds, setHiddenHistoryIds] = useState<number[]>([]);

  // 🔥 DYNAMIC ROUTE CALCULATORS: Overrides broken backend distances
  const getTrueDistance = (job: any) => {
    if (!job) return "0.0";
    const backendDist = Number(job.distance_km || job.distance || job.total_distance || 0);
    if (backendDist > 2.0) return backendDist.toFixed(1);

    const lat1 = Number(job.pickup_lat);
    const lon1 = Number(job.pickup_lon);
    const lat2 = Number(job.dropoff_lat || job.stops?.[job.stops?.length - 1]?.lat);
    const lon2 = Number(job.dropoff_lon || job.stops?.[job.stops?.length - 1]?.lon);

    if (!lat1 || !lat2) return "1.5"; 

    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const trueDist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    return (trueDist * 1.3).toFixed(1); 
  };

  const getTrueTime = (job: any) => {
    if (!job) return 0;
    const backendTime = Number(job.duration_min || job.duration || job.estimated_duration || 0);
    if (backendTime > 5) return Math.round(backendTime);

    const dist = Number(getTrueDistance(job));
    return Math.round((dist / 35) * 60) || 5;
  };
  
  // 🔥 DRIVER PUSH NOTIFICATIONS & TOKEN SAVING
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const tokenData = (await Notifications.getExpoPushTokenAsync()).data;
          
          if (token && tokenData) {
            setExpoPushToken(tokenData);
            await axios.post(`${BASE_URL}/auth/users/me/push-token`, { expo_push_token: tokenData }, {
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        }
      } catch (e) {
        console.log("Driver Push Token Error:", e);
      }

      const notifSub = Notifications.addNotificationReceivedListener(() => {
        // DO NOTHING! The WebSocket handles foreground jobs perfectly. 
      });

      const respSub = Notifications.addNotificationResponseReceivedListener(() => {
        try {
          refreshDriverJobs();
        } catch {}
      });

      notificationListener.current = notifSub;
      responseListener.current = respSub;
    })();

    return () => {
      try { notificationListener.current?.remove?.(); } catch {}
      try { responseListener.current?.remove?.(); } catch {}
    };
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        const ids = Array.from(
          new Set([
            ...availableJobs.map((j: any) => j.driver_id).filter(Boolean),
            ...activeJobs.map((j: any) => j.driver_id).filter(Boolean),
          ])
        );

        if (fetchDriverProfile) {
          await Promise.all(ids.map((id: number) => fetchDriverProfile(Number(id))));
        }
      } catch {}
    })();
  }, [availableJobs, activeJobs, fetchDriverProfile]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const job = activeJobs[0];
      if (!job) {
        if (mounted) setJobDriverProfile(null);
        return;
      }

      const drvId = job.driver_id ?? job.driver?.id;
      if (!drvId) {
        if (mounted) setJobDriverProfile(job.driver ?? null);
        return;
      }

      const cached = getDriverFromCache?.(Number(drvId));
      if (cached) {
        if (mounted) setJobDriverProfile(cached);
        return;
      }

      try {
        if (fetchDriverProfile) {
          const profile = await fetchDriverProfile(Number(drvId));
          if (mounted) setJobDriverProfile(profile);
        }
      } catch {
        if (mounted) setJobDriverProfile(job.driver ?? null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [activeJobs, fetchDriverProfile, getDriverFromCache]);

  useEffect(() => {
    let isMounted = true;

    const pollOnce = async () => {
      try {
        if (fetchDriverVerificationStatus) {
          const res = await fetchDriverVerificationStatus();
          if (!isMounted) return;
          if (res?.status) {
            setVerStatus(res.status as any);
            return;
          }
        }

        if (fetchDriverProfile && user?.id) {
          const profile = await fetchDriverProfile(user.id);
          if (!isMounted) return;

          const inferred =
            profile && (profile.driver_verified || profile.verification_status)
              ? profile.driver_verified
                ? 'verified'
                : profile.verification_status || 'pending'
              : 'unverified';

          setVerStatus(inferred as any);
        }
      } catch {}
    };

    pollOnce();
    const id = setInterval(pollOnce, 20000);
    pollRef.current = id as any;

    return () => {
      isMounted = false;
      if (pollRef.current) {
        clearInterval(pollRef.current as number);
        pollRef.current = null;
      }
    };
  }, [fetchDriverVerificationStatus, fetchDriverProfile, user?.id]);

  // 🔥 DRIVER AUTO-WAKE SYNC ENGINE
  useEffect(() => {
    refreshDriverJobs().catch(() => {});
    
    const interval = setInterval(() => {
      refreshDriverJobs().catch(() => {});
    }, 15000);

    // 🚨 CACHE-BUSTER: Instantly sync jobs if the driver wakes up their phone
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        refreshDriverJobs().catch(() => {});
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []); 

  useEffect(() => {
    let pingInterval: NodeJS.Timeout | null = null;

    const startLivePinging = async () => {
      const sendPing = async () => {
        if (!token) return;

        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced, 
          });

          const payload = { 
            lat: location.coords.latitude, 
            lon: location.coords.longitude, 
            ts: Date.now() / 1000 
          };
          
          await axios.post(`${BASE_URL}/driver/location`, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e: any) {
        }
      };

      await sendPing();
      pingInterval = setInterval(sendPing, 12000);
    };

    if (isOnline && token) {
      startLivePinging();
    }

    return () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    };
  }, [isOnline, token]);

  // 🔥 Handle incoming jobs and accurately sync the timer with the IDP offer window!
  useEffect(() => {
    if (availableJobs && availableJobs.length > 0) {
      const offer = availableJobs[0];
      setRingingOffer(offer);

      if (offer.expires_at) {
        const expiresMs = offer.expires_at * 1000;
        const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
        
        setOfferSecondsLeft(remaining > 0 ? remaining : (offer.window_sec || 30));
      } else {
        setOfferSecondsLeft(offer.window_sec || 30);
      }

      setNewOfferModalVisible(true);
    } else {
      setNewOfferModalVisible(false);
      setRingingOffer(null);
    }
  }, [availableJobs]);

  // 🔥 Run the live visual countdown
  useEffect(() => {
    let t: NodeJS.Timeout;
    if (newOfferModalVisible && offerSecondsLeft > 0) {
      t = setTimeout(() => setOfferSecondsLeft(s => s - 1), 1000);
    } else if (newOfferModalVisible && offerSecondsLeft <= 0) {
      handleSkipAvailableJob(ringingOffer?.offer_id || ringingOffer?.id);
    }
    return () => clearTimeout(t);
  }, [newOfferModalVisible, offerSecondsLeft]);


  useEffect(() => {
    if (activeJob) setScreenIndex(2);
  }, [activeJob?.id]);

  useEffect(() => {
    if (driverLocation && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: { latitude: driverLocation.lat, longitude: driverLocation.lon },
          zoom: 14.5,
        },
        { duration: 700 }
      );
    }
  }, [driverLocation]);

  useEffect(() => {
    const checkPermissionsAutomatically = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocModalVisible(true);
          if (isOnline) {
            await proceedToOnline(false); 
          }
        }
      } catch (error) {
      }
    };
    checkPermissionsAutomatically();
  }, []);

  const completedRides = useMemo(() => {
    return (rideHistory || []).filter((ride: any) =>
      ['completed', 'paid', 'delivered'].includes(statusValue(ride.status))
    );
  }, [rideHistory]);

  const cancelledRides = useMemo(() => {
    return (rideHistory || []).filter((ride: any) => statusValue(ride.status) === 'cancelled');
  }, [rideHistory]);

  const disputedRides = useMemo(() => {
    return (rideHistory || []).filter((ride: any) => statusValue(ride.status) === 'disputed');
  }, [rideHistory]);

  const totalEarnings = useMemo(() => {
    return completedRides.reduce((acc: number, ride: any) => {
      return acc + Number(ride.driver_payout || ride.final_price || 0);
    }, 0);
  }, [completedRides]);

  const todayEarnings = useMemo(() => {
    const now = new Date();
    return completedRides.reduce((acc: number, ride: any) => {
      const dateString = ride.delivered_at || ride.accepted_at || ride.created_at;
      const jobDate = dateString ? new Date(dateString) : null;
      if (jobDate && jobDate.toDateString() === now.toDateString()) {
        return acc + Number(ride.driver_payout || ride.final_price || 0);
      }
      return acc;
    }, 0);
  }, [completedRides]);

  const todayJobsCount = useMemo(() => {
    const now = new Date();
    return completedRides.filter((ride: any) => {
      const dateString = ride.delivered_at || ride.accepted_at || ride.created_at;
      const jobDate = dateString ? new Date(dateString) : null;
      return jobDate && jobDate.toDateString() === now.toDateString();
    }).length;
  }, [completedRides]);

  const averageRating = useMemo(() => {
    const fromUser = Number((user as any)?.rating_avg ?? (profileDraft as any)?.rating_avg ?? 0);
    if (fromUser > 0) return fromUser;
    return 5.0;
  }, [user, profileDraft]);

  const earningsByWindow = useMemo(() => {
    const now = new Date();
    const filtered = completedRides.filter((r: any) => {
      const jobDate = r.created_at ? new Date(r.created_at) : null;
      if (!jobDate || isNaN(jobDate.getTime())) return false;

      if (earningsWindow === 'daily') {
        return jobDate.toDateString() === now.toDateString();
      } else if (earningsWindow === 'weekly') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return jobDate >= oneWeekAgo;
      } else if (earningsWindow === 'monthly') {
        return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
      }
      return false;
    });

    const total = filtered.reduce(
      (acc: number, r: any) => acc + Number(r.driver_payout || r.final_price || 0),
      0
    );

    const sortedItems = [...filtered].sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return {
      total,
      count: filtered.length,
      items: sortedItems,
    };
  }, [completedRides, earningsWindow]);

  const avgJob = earningsByWindow.count > 0 
    ? earningsByWindow.total / earningsByWindow.count 
    : 0;

  const { dayValues, dayLabels, bestDay, todayIdx, weekTotal } = useMemo(() => {
    const values = [0, 0, 0, 0, 0, 0, 0];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; 
    let wTotal = 0;

    completedRides.forEach((r: any) => {
      const jobDate = r.created_at ? new Date(r.created_at) : null;
      if (!jobDate || isNaN(jobDate.getTime())) return;
      const daysDiff = Math.floor((now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 7) {
        const jobDayIndex = (jobDate.getDay() + 6) % 7;
        const amount = Number(r.driver_payout || r.final_price || 0);
        values[jobDayIndex] += amount;
        wTotal += amount;
      }
    });

    return {
      dayValues: values,
      dayLabels: labels,
      bestDay: Math.max(...values, 1),
      todayIdx: currentDayOfWeek,
      weekTotal: wTotal
    };
  }, [completedRides]);

  const acceptanceRate = useMemo(() => {
    const accepted = activeJobs.length + completedRides.length + disputedRides.length + cancelledRides.length;
    const offered = accepted + availableJobs.length;
    if (offered <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((accepted / offered) * 100)));
  }, [activeJobs.length, completedRides.length, disputedRides.length, cancelledRides.length, availableJobs.length]);

  const completionRate = useMemo(() => {
    const handled = completedRides.length + cancelledRides.length + disputedRides.length;
    if (handled <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((completedRides.length / handled) * 100)));
  }, [completedRides.length, cancelledRides.length, disputedRides.length]);

  const onTimeRate = useMemo(() => {
    const onTimeCount = completedRides.filter((r: any) => {
      if (typeof r.on_time === 'boolean') return r.on_time;
      return true;
    }).length;

    if (completedRides.length <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((onTimeCount / completedRides.length) * 100)));
  }, [completedRides]);

  const disputeRate = useMemo(() => {
    const handled = completedRides.length + disputedRides.length;
    if (handled <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((disputedRides.length / handled) * 100)));
  }, [completedRides.length, disputedRides.length]);

  const trustScore = useMemo(() => {
    const ratingScore = Math.min(100, Math.round((averageRating / 5) * 100));
    const score = Math.round(
      acceptanceRate * 0.2 +
        completionRate * 0.3 +
        ratingScore * 0.25 +
        onTimeRate * 0.2 +
        Math.max(0, 100 - disputeRate * 10) * 0.05
    );
    return Math.max(1, Math.min(100, score));
  }, [averageRating, acceptanceRate, completionRate, onTimeRate, disputeRate]);

  const trustBand = useMemo(() => {
    if (trustScore >= 85) return 'Excellent Driver';
    if (trustScore >= 70) return 'Strong Driver';
    if (trustScore >= 55) return 'Good Driver';
    return 'Needs Improvement';
  }, [trustScore]);

  const filteredHistory = useMemo(() => {
    const base = rideHistory || [];

    return base.filter((r: any) => {
      if (hiddenHistoryIds.includes(r.id)) return false;

      const status = statusValue(r.status);
      const ok =
        selectedHistoryFilter === 'All'
          ? true
          : selectedHistoryFilter === 'Completed'
          ? ['completed', 'paid', 'delivered'].includes(status)
          : selectedHistoryFilter === 'Disputed'
          ? status === 'disputed'
          : selectedHistoryFilter === 'Cancelled'
          ? status === 'cancelled'
          : true;

      if (!ok) return false;

      if (selectedHistoryFilter === 'This Week') {
        const created = r.created_at ? new Date(r.created_at) : null;
        if (!created) return false;
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        return created >= start && created <= now;
      }

      return true;
    });
  }, [rideHistory, selectedHistoryFilter, hiddenHistoryIds]);

  const activeJobStatus = statusValue(activeJob?.status);
  
  const activePickup = activeJob
    ? { latitude: Number(activeJob.pickup_lat), longitude: Number(activeJob.pickup_lon) }
    : null;
  
  // 🔥 SEPARATION FIX: Safely pull drop-off from stops[0] if it's a single drop
  const activeDropoff = activeJob ? { 
    latitude: Number(activeJob.dropoff_lat || activeJob.stops?.[activeJob.stops.length - 1]?.lat || 0), 
    longitude: Number(activeJob.dropoff_lon || activeJob.stops?.[activeJob.stops.length - 1]?.lon || 0) 
  } : null;

  // 🔥 SEPARATION FIX: It is ONLY multi-drop if explicitly flagged, or if there are 2+ stops!
  const isMulti = activeJob?.booking_mode === 'multi' || (activeJob?.stops && activeJob.stops.length > 1);
  
  // FIX 1: Force to lowercase so "COMPLETED" doesn't jam the app!
  const pendingStops = (activeJob?.stops || []).filter((s: any) => String(s.status).toLowerCase() !== 'completed');
  const nextStop = pendingStops.length > 0 ? pendingStops[0] : null;
  const stopIndex = activeJob?.stops ? activeJob.stops.findIndex((s: any) => s.id === nextStop?.id) : 0;
  
  // FIX 2: Ensure it doesn't say "All Stops Completed" if there are 0 stops total
  const allStopsCompleted = isMulti && activeJob?.stops?.length > 0 && pendingStops.length === 0;

  // 🔥 SEPARATION FIX: Display correct name/address depending on Single vs Multi
  const displayName = nextStop && isMulti ? (nextStop.recipient || nextStop.name || 'Customer') : (jobDriverProfile?.full_name || activeJob?.customer_name || 'Customer');
  const displayAddress = nextStop && isMulti ? nextStop.address : (activeJob?.dropoff_address || activeJob?.stops?.[0]?.address || 'Delivery address');

  // 🔥 Make sure the function is async!
  const handleBarcodeScanned = async ({ data }: any) => {
    if (scanned || !activeJob) return;
    setScanned(true);

    try {
      const parsedData = JSON.parse(decodeURIComponent(data));
      const currentSafeStatus = String(activeJobStatus || '').toLowerCase();

      // PHASE 1: MULTI-DROP PICKUP
      if (parsedData.type === 'PICKUP_CONFIRMATION') {
        if (String(parsedData.booking_id) !== String(activeJob.id)) {
          Alert.alert('Wrong Order', 'QR code is for a different order.', [{ text: 'OK', onPress: () => setScanned(false) }]);
          return;
        }
        
        const preTransit = ['pending', 'accepted', 'assigned', 'arrived_pickup', 'queued'];
        if (!preTransit.includes(currentSafeStatus)) {
          Alert.alert('Already Picked Up', 'You are already in transit. Ask the customer to tap the "Next" button so you can scan the drop-off.', [{ text: 'OK', onPress: () => setScanned(false) }]);
          return;
        }

        // 🔥 STRICT FIX: We block the "Success" alert if the database fails!
        try {
          await axios.patch(`${BASE_URL}/driver/jobs/${activeJob.id}/status`, { status: 'IN_TRANSIT' }, { headers: { Authorization: `Bearer ${token}` } });

          // Only runs if the database actually updated!
          setScannerVisible(false);
          Alert.alert('Success', 'Collection confirmed! Starting route.', [
            {
              text: 'OK',
              onPress: async () => {
                if (typeof refreshDriverJobs === 'function') await refreshDriverJobs();
                setScanned(false);
              }
            }
          ]);
        } catch (error) {
          // If the network drops, the driver is forced to scan again!
          Alert.alert('Network Error', 'Could not sync pickup to the server. Please scan the code again.', [{ text: 'OK', onPress: () => setScanned(false) }]);
        }
        return;
      }

      // PHASE 2: MULTI-DROP DROP-OFF
      if (parsedData.type === 'STOP_CONFIRMATION') {
        const preTransit = ['pending', 'accepted', 'assigned', 'arrived_pickup', 'queued'];
        if (preTransit.includes(currentSafeStatus)) {
          Alert.alert('Scan Error', 'You must scan the Pickup QR code first to start the delivery!', [{ text: 'OK', onPress: () => setScanned(false) }]);
          return;
        }

        if (String(parsedData.booking_id) !== String(activeJob.id) || String(parsedData.stop_id) !== String(nextStop?.id)) {
          Alert.alert('Wrong Stop', `QR code is not for Stop ${nextStop?.stop_order}. Please ensure the Customer app is fully synced.`, [{ text: 'OK', onPress: () => setScanned(false) }]);
          return;
        }
        
        setScannerVisible(false);
        Alert.alert('Success', `Stop ${nextStop?.stop_order} confirmed!`, [
          { text: 'OK', onPress: async () => {
              if (parsedData.stop_id) await handleCompleteStop(parsedData.stop_id);
              setScanned(false);
          }}
        ]);
        return;
      }

      // PHASE 3: SINGLE-DROP DROP-OFF
      if (parsedData.type === 'DROPOFF_CONFIRMATION') {
        if (String(parsedData.booking_id) !== String(activeJob.id)) {
          Alert.alert('Wrong Order', `QR code is for Order #${parsedData.booking_id}.`, [{ text: 'Try Again', onPress: () => setScanned(false) }]);
          return;
        }
        setScannerVisible(false);
        Alert.alert('Success', 'Drop-off confirmed successfully.', [
          { text: 'OK', onPress: async () => {
              try {
                await markDelivered(activeJob.id);
                await refreshDriverJobs();
                setScreenIndex(0);
              } catch { Alert.alert('Error', 'Could not mark job as delivered.'); } finally { setScanned(false); }
            }
          },
        ]);
        return;
      }

      Alert.alert('Invalid QR', 'This is not a valid confirmation code.', [{ text: 'Try Again', onPress: () => setScanned(false) }]);
    } catch { Alert.alert('Scan Error', 'Could not read the QR code data.', [{ text: 'Try Again', onPress: () => setScanned(false) }]); }
  };

  const simulateScan = () => {
    let mockType = 'DROPOFF_CONFIRMATION';
    let stopId = null;

    if (isMulti) {
      if (activeJobStatus === 'arrived_pickup') mockType = 'PICKUP_CONFIRMATION';
      else { mockType = 'STOP_CONFIRMATION'; stopId = nextStop?.id; }
    }

    const mockData: any = { type: mockType, booking_id: activeJob?.id, driver_id: user?.id };
    if (stopId) mockData.stop_id = stopId;
    handleBarcodeScanned({ type: 'qr', data: encodeURIComponent(JSON.stringify(mockData)) });
  };

  // 🔥 Generic scanner used for Drop-off
  const openScanner = async () => {
    if (!activeJob) return;

    if (!Device.isDevice) {
      setScanned(false);
      setScannerVisible(true);
      return;
    }

    if (!permission) await requestPermission();

    if (!permission?.granted) {
      const status = await requestPermission();
      if (!status.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to scan QR codes.');
        return;
      }
    }

    setScanned(false);
    setScannerVisible(true);
  };

  const toggleOnline = async () => {
    if (!isOnline) {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocModalVisible(true);
        return;
      }
    }
    await proceedToOnline(!isOnline);
  };

  const proceedToOnline = async (nextStatus: boolean) => {
    setIsOnline(nextStatus);
    try {
      if (updateDriverStatus) {
        await updateDriverStatus(nextStatus ? 'available' : 'offline');
      }
    } catch {
      setIsOnline(!nextStatus);
      Alert.alert('Error', 'Could not update your online status.');
    }
  };

  const handleRequestLocation = async () => {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      if (current.canAskAgain) {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus === 'granted') {
          await Location.requestBackgroundPermissionsAsync();
          setLocModalVisible(false);
          await proceedToOnline(true);
          return; 
        }
      }

      Alert.alert(
        'Permission Blocked', 
        'Your phone is blocking location access. Please open Settings, find the app, and set Location to "Always Allow".',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );

    } catch (e) {
      Alert.alert('Error', 'Could not request location permissions.');
    }
  };

  const sendSupport = async () => {
    if (!supportSubject || !supportMessage) {
      Alert.alert('Missing fields', 'Please provide a subject and a message.');
      return;
    }

    setSupportSending(true);
    try {
      const payload = {
        userId: user?.id,
        name: user?.full_name,
        subject: supportSubject,
        message: supportMessage,
        role: user?.role,
        bookingId: activeJob?.id || null,
      };

      if (sendSupportMessage) {
        await sendSupportMessage(payload);
        Alert.alert('Sent', 'Your message was sent to Hence support.');
      } else if (createSupportTicket) {
        await createSupportTicket(payload);
        Alert.alert('Sent', 'Support ticket created.');
      } else {
        const url = `mailto:support@hencelogistics.com?subject=${encodeURIComponent(
          supportSubject
        )}&body=${encodeURIComponent(
          `DriverID: ${user?.id}\nName: ${user?.full_name}\nBooking: ${activeJob?.id || 'N/A'}\n\n${supportMessage}`
        )}`;
        await Linking.openURL(url);
      }

      setSupportSubject('');
      setSupportMessage('');
      setSupportVisible(false);
    } catch {
      Alert.alert('Failed', 'Could not send support message.');
    } finally {
      setSupportSending(false);
    }
  };

  const captureVerificationPhoto = async (field: VerField) => {
    try {
      const camStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (!camStatus.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to capture documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: false,
        allowsEditing: false,
      });

      const uri = (result as any).uri ?? (result as any)?.assets?.[0]?.uri;
      if (uri) {
        setVerUploads(prev => ({ ...prev, [field]: uri }));
      }
    } catch {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const uploadSingle = async (field: VerField) => {
    const uri = verUploads[field];
    if (!uri) {
      Alert.alert('No file', 'Please capture or attach the file before uploading.');
      return null;
    }

    setUploadingFiles(prev => ({ ...prev, [field]: true }));
    setUploadProgress(prev => ({ ...prev, [field]: 0 }));

    let simInterval: any = null;

    const startSim = () => {
      simInterval = setInterval(() => {
        setUploadProgress(prev => {
          const cur = (prev && (prev as any)[field]) || 0;
          if (cur >= 85) return prev;
          const next = Math.min(85, cur + Math.random() * 12);
          return { ...(prev || {}), [field]: Math.round(next) };
        });
      }, 400);
    };

    try {
      if (uploadVerificationPhoto) {
        startSim();

        let completedUrl: string | null = null;
        try {
          const maybePromise = uploadVerificationPhoto(
            field,
            uri,
            (pct: number) => {
              const n = Math.max(0, Math.min(100, Math.round(pct)));
              setUploadProgress(prev => ({ ...(prev || {}), [field]: n }));
            }
          );
          completedUrl = await Promise.resolve(maybePromise);
        } catch {
          completedUrl = await uploadVerificationPhoto(field, uri);
        } finally {
          if (simInterval) clearInterval(simInterval);
        }

        setUploadProgress(prev => ({ ...(prev || {}), [field]: 100 }));
        setUploadedUrls(prev => ({ ...(prev || {}), [field]: completedUrl || '' }));
        setUploadingFiles(prev => ({ ...(prev || {}), [field]: false }));
        return completedUrl;
      }

      Alert.alert('Upload not available', 'This app instance does not provide direct uploads.');
      setUploadProgress(prev => ({ ...(prev || {}), [field]: 0 }));
      setUploadingFiles(prev => ({ ...(prev || {}), [field]: false }));
      return null;
    } catch {
      if (simInterval) clearInterval(simInterval);
      setUploadProgress(prev => ({ ...(prev || {}), [field]: 0 }));
      setUploadingFiles(prev => ({ ...(prev || {}), [field]: false }));
      Alert.alert('Upload failed', `Could not upload ${field}.`);
      return null;
    }
  };

  const submitVerification = async () => {
    if (!verUploads.id && !docsFromProfile.id) {
      Alert.alert('Incomplete', 'Please capture/upload ID at minimum.');
      return;
    }

    if (!verUploads.license && !docsFromProfile.license) {
      Alert.alert('Incomplete', 'Please capture/upload licence at minimum.');
      return;
    }

    if (!verUploads.reg && !docsFromProfile.reg) {
      Alert.alert('Incomplete', 'Please capture/upload car registration at minimum.');
      return;
    }

    try {
      const keys: VerField[] = ['reg', 'insurance', 'id', 'license', 'nct'];
      const urls: Partial<Record<VerField, string>> = {
        ...(docsFromProfile || {}),
        ...(uploadedUrls || {}),
      };

      for (const k of keys) {
        if (!urls[k] && verUploads[k]) {
          const res = await uploadSingle(k);
          if (res) urls[k] = res;
        }
      }

      if (submitDriverVerification) {
        const payload = {
          driverId: user?.id,
          uploads: urls,
          meta: { name: user?.full_name, email: user?.email },
        };
        const res = await submitDriverVerification(payload);
        const newStatus = res?.status || 'pending';
        setVerStatus(newStatus as any);

        try {
          if (typeof setProfileDraft === 'function') {
            setProfileDraft((prev: any) => ({
              ...(prev || {}),
              verification_docs: urls,
              driver_verified: newStatus === 'verified',
              verification_status: newStatus,
            }));
            if (typeof saveProfile === 'function') await saveProfile();
          }
        } catch {}

        Alert.alert('Submitted', `Verification status: ${newStatus}`);
        setDocModalVisible(false);
        return;
      }

      Alert.alert('Submitted', 'Verification submitted.');
      setDocModalVisible(false);
    } catch {
      Alert.alert('Failed', 'Could not submit verification. Try again later.');
    }
  };

  const openCallSupport = async () => {
    try {
      await Linking.openURL('tel:+353000000000');
    } catch {
      Alert.alert('Unavailable', 'Could not open dialer.');
    }
  };

  const openHelpCentre = async () => {
    Alert.alert('Help Centre', 'Connect your real help centre URL here.');
  };

  const openAccountIssues = () => {
    setSupportSubject('Account issue');
    setSupportVisible(true);
  };

  const handleAcceptAvailableJob = useCallback(
    async (jobId: number) => {
      if (acceptProcessingRef.current[jobId]) return;
      acceptProcessingRef.current[jobId] = true;

      try {
        await acceptJob(jobId);
        await refreshDriverJobs();

        await schedulePushNotification(
          'Job Accepted',
          `You accepted booking #${jobId}.`,
          { type: 'job_accepted', booking_id: jobId }
        );

        setScreenIndex(2);
      } catch (e: any) {
        const msg = e?.message || 'Could not accept job.';

        if (
          msg.toLowerCase().includes('offer is no longer active') ||
          msg.toLowerCase().includes('offer expired') ||
          msg.toLowerCase().includes('no longer available')
        ) {
          setAvailableJobs((prev: any[]) =>
            prev.filter(
              (j: any) =>
                Number(j.offer_id || j.id || j.booking_id) !== Number(jobId)
            )
          );
        }

        try {
          await refreshDriverJobs();
        } catch {}

        Alert.alert(
          msg.toLowerCase().includes('offer') ? 'Offer expired' : 'Error',
          msg.toLowerCase().includes('offer')
            ? 'This offer is no longer available and has been removed from your list.'
            : msg
        );
      } finally {
        acceptProcessingRef.current[jobId] = false;
      }
    },
    [acceptJob, refreshDriverJobs, setAvailableJobs]
  );

  const handleSkipAvailableJob = async (jobId: number) => {
    if (skipProcessingRef.current[jobId]) return;
    skipProcessingRef.current[jobId] = true;

    try {
      await declineJob(jobId);
      await refreshDriverJobs();
    } catch (e: any) {
      const msg = e?.message || 'Could not skip job.';

      if (
        msg.toLowerCase().includes('offer is no longer active') ||
        msg.toLowerCase().includes('offer expired') ||
        msg.toLowerCase().includes('no longer available')
      ) {
        setAvailableJobs((prev: any[]) =>
          prev.filter(
            (j: any) =>
              Number(j.offer_id || j.id || j.booking_id) !== Number(jobId)
          )
        );
      }

      try {
        await refreshDriverJobs();
      } catch {}

      Alert.alert(
        msg.toLowerCase().includes('offer') ? 'Offer expired' : 'Error',
        msg.toLowerCase().includes('offer')
          ? 'This offer is no longer available and has been removed from your list.'
          : msg
      );
    } finally {
      skipProcessingRef.current[jobId] = false;
    }
  };

  const handleUploadProof = async (jobId: number) => {
    try {
      const res = await pickAndUploadProof(jobId);
      if (res && (res as any).ok !== false) {
        Alert.alert('Uploaded', 'Delivery proof uploaded successfully.');
        await schedulePushNotification(
          'Proof Uploaded',
          `Proof uploaded for booking #${jobId}.`,
          { type: 'proof_uploaded', booking_id: jobId }
        );
        await refreshDriverJobs();
      }
    } catch {
      Alert.alert('Error', 'Could not upload proof.');
    }
  };

  const handleMarkDelivered = async (jobId: number) => {
    try {
      await markDelivered(jobId);
      await schedulePushNotification(
        'Delivery Completed',
        `Booking #${jobId} marked as delivered.`,
        { type: 'delivered', booking_id: jobId }
      );
      await refreshDriverJobs();
      setScreenIndex(0);
    } catch {
      Alert.alert('Error', 'Could not complete delivery.');
    }
  };

  const handleCompleteStop = async (stopId: number) => {
    try {
      try {
        await axios.post(`${BASE_URL}/driver/jobs/${activeJob.id}/stops/${stopId}/complete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      } catch (e1) {
        await axios.patch(`${BASE_URL}/driver/jobs/${activeJob.id}/stops/${stopId}`, { status: 'completed' }, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      // 🔥 THE FIX: Check if this was the last stop! If yes, automatically finish the whole job!
      const remainingStops = pendingStops.filter((s: any) => String(s.id) !== String(stopId));
      if (remainingStops.length === 0) {
        await markDelivered(activeJob.id);
        setScreenIndex(0);
      }
      
    } catch (finalError) {
      Alert.alert('Network Sync Error', 'Could not sync the completed stop to the server, but you can continue your route.');
    } finally {
      await refreshDriverJobs();
    }
  };
  
  const openSmartNav = (lat: number, lon: number) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
    const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`;

    if (Platform.OS === 'ios') {
      Alert.alert(
        "Choose Navigation App",
        "Which map application would you like to use?",
        [
          {
            text: "Apple Maps",
            onPress: () => Linking.openURL(appleMapsUrl).catch(() => Alert.alert("Error", "Could not open Apple Maps."))
          },
          {
            text: "Google Maps",
            onPress: () => Linking.openURL(googleMapsUrl).catch(() => Alert.alert("Error", "Could not open Google Maps."))
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ],
        { cancelable: true }
      );
    } else {
      // Android defaults directly to Google Maps
      Linking.openURL(googleMapsUrl).catch(() => Alert.alert("Error", "Could not open map application."));
    }
  };

  const renderDashboard = () => (
    <>
      <View style={[styles.onlineBar, !isOnline && styles.onlineBarOff]}>
        <View style={[styles.obPulse, !isOnline && styles.obPulseOff]} />
        <View style={styles.obInfo}>
          <Text style={styles.obTitle}>{isOnline ? 'You are Online' : 'You are Offline'}</Text>
          <Text style={styles.obSub}>
            {isOnline
              ? `${availableJobs.length} available jobs · ${activeJobs.length} active`
              : 'Go online to receive jobs'}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.swTrack, isOnline ? styles.swTrackOn : styles.swTrackOff]}
          onPress={toggleOnline}
        >
          <View style={[styles.swThumb, isOnline ? styles.swThumbOn : styles.swThumbOff]} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.pad}>
        
        {/* 🚀 BULLETPROOF FIX: THE ACTIVE JOB CAN NEVER BE LOST */}
        {activeJob && (
          <TouchableOpacity 
            style={[styles.card, { borderColor: COLORS.primary, borderWidth: 2, overflow: 'hidden' }]} 
            onPress={() => setScreenIndex(2)}
            activeOpacity={0.9}
            
          >
            <View style={[styles.ch, { backgroundColor: COLORS.primary, borderBottomWidth: 0 }]}>
              <Text style={[styles.ct, { color: '#fff' }]}>Current Active Delivery</Text>
              <Text style={[styles.linkText, { color: '#fff' }]}>View Map →</Text>
            </View>
            <View style={[styles.cb, { backgroundColor: '#fff' }]}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.ink }}>
                {activeJob.pickup_address?.split(',')[0] || 'Pickup'} → {activeJob.dropoff_address?.split(',')[0] || 'Drop-off'}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.soft, marginTop: 4 }}>
                Tap here to return to your live navigation and delivery controls.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiV}>€{money(todayEarnings)}</Text>
            <Text style={styles.kpiL}>Today</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiV}>{todayJobsCount}</Text>
            <Text style={styles.kpiL}>Jobs done</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiV}>{averageRating.toFixed(1)}</Text>
            <Text style={styles.kpiL}>Rating</Text>
          </View>
        </View>


        {isOnline && nextAvailableJob && (
          <TouchableOpacity
            style={styles.jcard}
            onPress={() => setScreenIndex(1)}
            activeOpacity={0.9}
          >
            <View style={styles.jcardTimer}>
              <View style={styles.jctLeft}>
                <View style={styles.jctPulse} />
                <Text style={styles.jctText}>New job available</Text>
              </View>
              <Text style={styles.jctTime}>
                {shortTime(nextAvailableJob.created_at) || 'Now'}
              </Text>
            </View>

            <View style={styles.jcardBody}>
              <Text style={styles.jcardRoute}>
                {(nextAvailableJob.pickup_address || 'Pickup')} → {(nextAvailableJob.dropoff_address || 'Drop-off')}
              </Text>
              <Text style={styles.jcardMeta}>
                {formatVehicleName(nextAvailableJob.van_type)} · {formatJobType(nextAvailableJob.job_type)} · {Number(nextAvailableJob.distance_km || 0).toFixed(1)} km
              </Text>
            </View>

            <View style={styles.jcardStats}>
              <View style={styles.jcs}>
                <Text style={styles.jcsV}>€{money(nextAvailableJob.driver_payout || nextAvailableJob.final_price)}</Text>
                <Text style={styles.jcsL}>You earn</Text>
              </View>
              <View style={styles.jcs}>
                {/* 🔥 THE FIX: Uses real math */}
                <Text style={styles.jcsV}>{getTrueTime(nextAvailableJob)} min</Text>
                <Text style={styles.jcsL}>Est. time</Text>
              </View>
              <View style={styles.jcs}>
                {/* 🔥 THE FIX: Uses real math */}
                <Text style={styles.jcsV}>{getTrueDistance(nextAvailableJob)} km</Text>
                <Text style={styles.jcsL}>Distance</Text>
              </View>

            </View>

            <View style={styles.jcardBtns}>
              <TouchableOpacity
                style={styles.jbtnAcc}
                onPress={() => handleAcceptAvailableJob(nextAvailableJob.offer_id || nextAvailableJob.id)}
              >
                <Text style={styles.jbtnAccText}>Accept Job</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.jbtnDec}
                onPress={() => handleSkipAvailableJob(nextAvailableJob.offer_id || nextAvailableJob.id)}
              >
                <Text style={styles.jbtnDecText}>Skip</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.card}>
          <View style={styles.ch}>
            <Text style={styles.ct}>Recent Jobs</Text>
            <Text style={styles.linkText} onPress={() => setScreenIndex(5)}>See all →</Text>
          </View>

          {(rideHistory || []).slice(0, 3).map((ride: any, idx: number) => {
            const status = statusValue(ride.status);
            const isCompleted = ['completed', 'paid', 'delivered'].includes(status);
            const isDisputed = status === 'disputed';

            return (
              <View key={ride.id || idx} style={[styles.hr, idx === 2 && { borderBottomWidth: 0 }]}>
                <View
                  style={[
                    styles.hrIco,
                    {
                      backgroundColor: isCompleted
                        ? COLORS.successSoft
                        : isDisputed
                        ? COLORS.warningSoft
                        : COLORS.dangerSoft,
                    },
                  ]}
                >
                  <DriverIcon
                    name={isCompleted ? 'ic-pkg' : isDisputed ? 'ic-warn' : 'ic-van'}
                    size={18}
                    color={isCompleted ? COLORS.success : isDisputed ? COLORS.warning : COLORS.danger}
                  />
                </View>

                <View style={styles.hrInfo}>
                  <Text style={styles.hrRoute}>
                    {(ride.pickup_address || 'Pickup')} → {(ride.dropoff_address || 'Drop-off')}
                  </Text>
                  <Text style={styles.hrMeta}>
                    {shortDateTime(ride.created_at)} · {formatVehicleName(ride.van_type)}
                  </Text>
                </View>

                <View style={styles.hrRight}>
                  <Text
                    style={
                      isCompleted
                        ? styles.hrAmtG
                        : isDisputed
                        ? styles.hrAmtA
                        : styles.hrAmtR
                    }
                  >
                    {isCompleted ? '+' : ''}€{money(ride.driver_payout || ride.final_price)}
                  </Text>
                  <Text
                    style={[
                      styles.hrBadge,
                      isCompleted ? styles.hbOk : isDisputed ? styles.hbDis : styles.hbCan,
                    ]}
                  >
                    {status || 'status'}
                  </Text>
                </View>
              </View>
            );
          })}

          {(!rideHistory || rideHistory.length === 0) && (
            <View style={{ padding: 14 }}>
              <Text style={{ color: COLORS.soft }}>No completed history yet.</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.card} onPress={() => setScreenIndex(4)} activeOpacity={0.85}>
          <View style={styles.ch}>
            <Text style={styles.ct}>Trust Score</Text>
            <Text style={styles.linkText}>Details →</Text>
          </View>

          <View style={styles.cb}>
            <View style={styles.trustMini}>
              <View style={styles.trustRing}>
                <Text style={styles.trustScore}>{trustScore}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trustTitle}>{trustBand}</Text>
                <Text style={styles.trustSub}>Based on completion, rating, disputes and delivery quality</Text>
                <Text style={styles.trustPill}>
                  {trustScore >= 85 ? 'Priority dispatch on' : 'Keep improving'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </>
  );

  const renderJobAlert = () => {
    if (!nextAvailableJob) return null;
    return null; 
  };

  const renderActiveJob = () => {
    if (!activeJob) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 16 }} />
          <Text style={{ color: COLORS.ink, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>
            Syncing Delivery...
          </Text>
          <Text style={{ color: COLORS.soft, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
            If you just accepted a job, we are securely fetching the route details from the server.
          </Text>
        </View>
      );
    }

    const H_COLORS = {
      forest: '#1A7A4A', forestDark: '#145C38', lemon: '#C8F135',
      ink: '#0F1F17', paper: '#F6F8F6', card: '#FFFFFF',
      line: '#E2E8E4', textMuted: '#6B7670', amber: '#E8910C', red: '#D64545',
    };

    const pickup = activePickup;
    const dropoff = activeDropoff;

    const displayName = nextStop ? (nextStop.recipient || nextStop.name || 'Customer') : (jobDriverProfile?.full_name || activeJob?.customer_name || 'Customer');
    const displayAddress = nextStop ? nextStop.address : (activeJob?.dropoff_address || 'Delivery address');

    // 🔥 BULLETPROOF UI SYNC FOR DRIVER
    const rawStatus = String(activeJob.status || '').toLowerCase();
    const cleanStatus = rawStatus.replace(/[-_ ]/g, ''); 
    const finishedStopsCount = (activeJob.stops || []).filter((s: any) => String(s.status).toLowerCase() === 'completed').length;
    
    const isDelivered = ['delivered', 'completed', 'paid', 'awaitingconfirmation'].includes(cleanStatus);
    const isCollected = ['intransit', 'inprogress', 'pickedup', 'arriveddropoff'].includes(cleanStatus) || finishedStopsCount > 0 || cleanStatus.includes('transit') || !!activeJob.picked_up_at;
    
    const stage = isDelivered ? 2 : isCollected ? 1 : 0;

    const getDriverLiveETA = () => {
      // 1. Check if we have coordinates
      if (!driverLocation?.lat || !driverLocation?.lon || !activeJob) return '...';

      const status = String(activeJob.status || '').toLowerCase();
      const isHeadingToPickup = ['pending', 'accepted', 'assigned', 'arrived_pickup'].includes(status);

      let targetLat = null;
      let targetLon = null;

      // 2. Find the correct target destination!
      if (isHeadingToPickup) {
        targetLat = activeJob.pickup_lat;
        targetLon = activeJob.pickup_lon;
      } else {
        // If it's multi-drop, find the FIRST stop that is NOT completed
        if (activeJob.stops && activeJob.stops.length > 0) {
          const nextPendingStop = activeJob.stops.find((s: any) => String(s.status).toLowerCase() !== 'completed');
          if (nextPendingStop) {
            targetLat = nextPendingStop.lat;
            targetLon = nextPendingStop.lon;
          } else {
            targetLat = activeJob.dropoff_lat;
            targetLon = activeJob.dropoff_lon;
          }
        } else {
          // Single drop
          targetLat = activeJob.dropoff_lat;
          targetLon = activeJob.dropoff_lon;
        }
      }

      // 3. If no target found, safely fallback
      if (!targetLat || !targetLon) return '...';

      // 4. Bulletproof Distance Math (Haversine Formula)
      const R = 6371; // Earth radius in km
      const dLat = (targetLat - driverLocation.lat) * (Math.PI / 180);
      const dLon = (targetLon - driverLocation.lon) * (Math.PI / 180);
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
        Math.cos(driverLocation.lat * (Math.PI / 180)) * Math.cos(targetLat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
      const distanceKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

      // 5. Convert distance to minutes (Assuming ~35 km/h average city speed)
      const timeMins = Math.ceil((distanceKm / 35) * 60);

      // 6. Guarantee it NEVER says "0"
      if (isNaN(timeMins) || timeMins <= 1) return '< 1 min';
      return `${timeMins} min`;
    };

    const updateJobStatus = async (newStatus: string) => {
      try {
        // 🔥 FIX: Added .toUpperCase() so it perfectly matches your Python Database Enums!
        await axios.patch(`${BASE_URL}/driver/jobs/${activeJob.id}/status`, { status: newStatus.toUpperCase() }, { headers: { Authorization: `Bearer ${token}` } });
        await refreshDriverJobs();
      } catch (e) { Alert.alert('Error', 'Could not update status'); }
    };


    let routeCoords = [];
    if (stage === 0 && driverLocation && pickup) {
      routeCoords = [{ latitude: driverLocation.lat, longitude: driverLocation.lon }, pickup];
    } else {
      routeCoords = [
        driverLocation ? { latitude: driverLocation.lat, longitude: driverLocation.lon } : pickup,
        ...(activeJob?.stops || []).map((s: any) => ({ latitude: Number(s.lat), longitude: Number(s.lon) })),
        !isMulti ? dropoff : null
      ].filter(Boolean);
    }

    return (
      <View style={{ flex: 1, backgroundColor: H_COLORS.card }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          <View style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
            {pickup ? (
              <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                customMapStyle={mapStyle}
                mapPadding={{ top: 20, right: 0, bottom: 20, left: 0 }}
                initialRegion={{ latitude: pickup.latitude, longitude: pickup.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
                showsUserLocation
                followsUserLocation
                showsCompass={false}
                pitchEnabled={false}
              >
                <Marker coordinate={pickup}><View style={[styles.pinWrap, { backgroundColor: stage === 0 ? H_COLORS.amber : H_COLORS.forest }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>P</Text></View></Marker>
                {isMulti && activeJob.stops?.map((stop: any, i: number) => (
                  <Marker key={stop.id} coordinate={{ latitude: Number(stop.lat), longitude: Number(stop.lon) }}><View style={[styles.pinWrap, { backgroundColor: stop.status === 'completed' ? H_COLORS.forest : (nextStop?.id === stop.id ? H_COLORS.red : H_COLORS.ink) }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>{stop.stop_order || i + 1}</Text></View></Marker>
                ))}
                {!isMulti && dropoff && <Marker coordinate={dropoff}><View style={[styles.pinWrap, { backgroundColor: H_COLORS.red }]}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>D</Text></View></Marker>}
                {driverLocation && <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lon }}><View style={styles.driverPin}><Ionicons name="car" size={16} color="#fff" /></View></Marker>}
                <Polyline coordinates={routeCoords as any} strokeWidth={4} strokeColor={H_COLORS.forest} lineCap="round" lineJoin="round" />
              </MapView>
            ) : <View style={{ flex: 1, backgroundColor: '#DCE9DD' }} />}

            <View style={{ position: 'absolute', right: 14, top: 14, backgroundColor: 'rgba(15,31,23,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>HNC-{String(activeJob.id).padStart(4, '0')}</Text>
            </View>
            <View style={{ position: 'absolute', left: 16, bottom: 14, backgroundColor: H_COLORS.ink, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="navigate" size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                {stage === 0 
                  ? `Navigating to Pickup · ETA ${getDriverLiveETA()}` 
                  : stage === 1 
                    ? (isMulti ? `En Route to Stop ${stopIndex + 1} · ETA ${getDriverLiveETA()}` : `En Route to Drop-off · ETA ${getDriverLiveETA()}`) 
                    : 'Delivered'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
             {[
               { label: 'Collected', icon: 'cube' },
               { label: 'En Route', icon: 'navigate' },
               { label: 'Delivered', icon: 'checkmark-circle' }
             ].map((step, i) => (
               <React.Fragment key={step.label}>
                 <View style={{ alignItems: 'center', flex: i === 1 ? 1 : 0 }}>
                   <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: i <= stage ? H_COLORS.forest : H_COLORS.line, alignItems: 'center', justifyContent: 'center' }}>
                     <Ionicons name={step.icon as any} size={18} color={i <= stage ? '#fff' : H_COLORS.textMuted} />
                   </View>
                   <Text style={{ marginTop: 6, fontSize: 11.5, fontWeight: i === stage ? '700' : '500', color: i <= stage ? H_COLORS.ink : H_COLORS.textMuted }}>{step.label}</Text>
                 </View>
                 {i < 2 && <View style={{ flex: 1, height: 2, backgroundColor: i < stage ? H_COLORS.forest : H_COLORS.line, marginHorizontal: -2, marginBottom: 18 }} />}
               </React.Fragment>
             ))}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: H_COLORS.line }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#CFF0E0', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: H_COLORS.forestDark }}>{initials(displayName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15.5, fontWeight: '700', color: H_COLORS.ink }}>{displayName}</Text>
              <Text style={{ fontSize: 13, color: H_COLORS.textMuted, marginTop: 2 }}>{displayAddress}</Text>
            </View>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${nextStop?.phone || activeJob?.customer_phone}`)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E9F7EE', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="call" size={17} color={H_COLORS.forest} />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
            <View style={{ flexDirection: 'row', backgroundColor: '#FCF3DE', borderWidth: 1, borderColor: `${H_COLORS.amber}55`, borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: H_COLORS.amber }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#7A5708' }}>
                    {isMulti ? `Multi-Drop · Stop ${stopIndex + 1} of ${activeJob.stops?.length || 1}` : 'Booking via App'}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#7A5708' }}>HNC-{String(activeJob.id).padStart(4, '0')}</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#8A6A1E', marginTop: 4 }}>
                  {formatJobType(activeJob.job_type)} · {formatVehicleName(activeJob.van_type)}
                </Text>
              </View>
            </View>
          </View>

          {/* 🚀 MULTI-DROP: REMAINING STOPS LIST PORTED FROM WEB MOCKUP */}
          {isMulti && stage === 1 && pendingStops.length > 1 && (
            <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: H_COLORS.forestDark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Remaining Stops</Text>
              {pendingStops.slice(1).map((s: any, i: number) => (
                <View key={s.id || i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: H_COLORS.paper, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: H_COLORS.line, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: H_COLORS.textMuted }}>{s.stop_order || (stopIndex + i + 2)}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: H_COLORS.ink }}>{s.recipient || s.name || s.address?.split(',')[0]}</Text>
                  <Text style={{ fontSize: 11, color: H_COLORS.textMuted, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                    {s.ref || `HNC-${String(activeJob.id).padStart(4,'0')}`}
                  </Text>
                </View>
              ))}
              {stopIndex === (activeJob.stops?.length || 1) - 1 && (
                  <Text style={{ fontSize: 12.5, color: H_COLORS.textMuted, paddingVertical: 4 }}>Final stop — no further drop-offs</Text>
              )}
            </View>
          )}

          {stage === 1 && (
            <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
              <View style={{ backgroundColor: H_COLORS.paper, borderWidth: 1, borderColor: H_COLORS.line, borderRadius: 14, padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="navigate" size={14} color={H_COLORS.forestDark} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: H_COLORS.forestDark, textTransform: 'uppercase' }}>En Route</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: H_COLORS.forestDark }}>ETA {getDriverLiveETA()}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: H_COLORS.line, borderRadius: 4, marginTop: 10, overflow: 'hidden' }}>
                  <View style={{ width: '60%', height: '100%', backgroundColor: H_COLORS.forest, borderRadius: 4 }} />
                </View>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 20, gap: 12, justifyContent: 'space-between' }}>
            {(() => {
              // 🔥 Determine if the driver is physically allowed to upload proof
              const currentStatus = String(activeJob?.status || '').toLowerCase();
              const canUploadProof = currentStatus === 'arrived_dropoff' || (isMulti && allStopsCompleted);

              return [
                // Add the "disabled" flag to lock the camera until arrival
                { icon: 'camera', label: 'Photo Proof', action: () => handleUploadProof(activeJob.id), disabled: !canUploadProof },
                { icon: 'map', label: 'Smart Nav', action: () => openSmartNav(Number(nextStop?.lat || activeJob.dropoff_lat), Number(nextStop?.lon || activeJob.dropoff_lon)) },
                { icon: 'qr-code', label: 'Scan QR', action: openScanner },
                { icon: 'card', label: 'Order Details', action: () => Alert.alert('Instructions', nextStop?.instructions || activeJob?.notes || 'No special notes.') }
              ].map((btn, i) => (
                <TouchableOpacity 
                  key={i} 
                  // 🔥 THE FIX: Physically block the onPress from firing if disabled!
                  onPress={btn.disabled ? undefined : btn.action} 
                  disabled={btn.disabled} 
                  style={{ 
                    width: '48%', 
                    backgroundColor: H_COLORS.paper, 
                    borderWidth: 1.5, 
                    borderColor: H_COLORS.line, 
                    borderRadius: 14, 
                    paddingVertical: 16, 
                    alignItems: 'center',
                    opacity: btn.disabled ? 0.35 : 1 // Visually dims the button if locked!
                  }}
                >
                  <Ionicons name={btn.icon as any} size={22} color={H_COLORS.forestDark} />
                  <Text style={{ marginTop: 8, fontSize: 12.5, fontWeight: '600', color: H_COLORS.ink }}>{btn.label}</Text>
                </TouchableOpacity>
              ));
            })()}
          </View>

          {/* Dynamic Master Progression CTA */}
          <View style={{ paddingHorizontal: 22, paddingTop: 24 }}>
            {stage === 0 && activeJobStatus === 'accepted' && (
              <TouchableOpacity style={[styles.btnGreen, { backgroundColor: H_COLORS.ink, height: 54, borderRadius: 16 }]} onPress={() => updateJobStatus('arrived_pickup')}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>Arrived at Pickup</Text>
              </TouchableOpacity>
            )}

            {/* SINGLE DROP PICKUP: Button Tap Only (No Scan) */}
            {stage === 0 && activeJobStatus === 'arrived_pickup' && !isMulti && (
              <TouchableOpacity style={[styles.btnGreen, { backgroundColor: H_COLORS.forest, height: 54, borderRadius: 16 }]} onPress={() => updateJobStatus('in_transit')}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>Confirm Collection & Start</Text>
              </TouchableOpacity>
            )}

            {/* MULTI DROP PICKUP: Forced QR Scan */}
            {stage === 0 && activeJobStatus === 'arrived_pickup' && isMulti && (
              <TouchableOpacity style={[styles.btnGreen, { backgroundColor: H_COLORS.forest, height: 54, borderRadius: 16 }]} onPress={openScanner}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>Scan QR to Pick Up All Items</Text>
              </TouchableOpacity>
            )}

            {/* MULTI DROP DROPOFF: Scan individual stops */}
            {stage === 1 && isMulti && nextStop && (
              <TouchableOpacity style={[styles.btnGreen, { backgroundColor: H_COLORS.ink, height: 54, borderRadius: 16 }]} onPress={openScanner}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>Scan QR to Complete Stop {nextStop.stop_order}</Text>
              </TouchableOpacity>
            )}

            {stage === 1 && isMulti && allStopsCompleted && (
              <TouchableOpacity style={[styles.btnGreen, { backgroundColor: H_COLORS.forest, height: 54, borderRadius: 16 }]} onPress={async () => { await markDelivered(activeJob.id); await refreshDriverJobs(); setScreenIndex(0); }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>All Stops Complete — Finish</Text>
              </TouchableOpacity>
            )}

            {/* SINGLE DROP: Arrival at drop-off */}
            {stage === 1 && !isMulti && activeJobStatus === 'in_transit' && (
              <TouchableOpacity style={[styles.btnGreen, { backgroundColor: H_COLORS.ink, height: 54, borderRadius: 16 }]} onPress={() => updateJobStatus('arrived_dropoff')}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>Arrived at Drop-off</Text>
              </TouchableOpacity>
            )}

            {/* SINGLE DROP: Scan to complete delivery */}
            {stage === 1 && !isMulti && activeJobStatus === 'arrived_dropoff' && (
              <View style={{ gap: 10 }}>
                <TouchableOpacity style={[styles.btnGreen, { backgroundColor: H_COLORS.forest, height: 54, borderRadius: 16 }]} onPress={openScanner}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>Scan QR to Complete Delivery</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={async () => { await axios.patch(`${BASE_URL}/driver/jobs/${activeJob.id}/request-completion`, {}, { headers: { Authorization: `Bearer ${token}` } }); await refreshDriverJobs(); }}>
                  <Text style={{ color: H_COLORS.forestDark, fontWeight: '700', fontSize: 13.5 }}>Having trouble? Request PIN approval</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeJobStatus === 'awaiting_confirmation' && !isMulti && (
              <View style={{ padding: 18, backgroundColor: '#FCF3DE', borderRadius: 16, borderWidth: 1, borderColor: H_COLORS.amber, alignItems: 'center' }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#7A5708' }}>Waiting on Customer...</Text>
                <Text style={{ fontSize: 12.5, color: '#8A6A1E', textAlign: 'center', marginTop: 4 }}>Customer is verifying PIN in their app.</Text>
              </View>
            )}

            
          </View>

        </ScrollView>
      </View>
    );
  };

  const renderEarnings = () => {
    const now = new Date();

    const windowItems = completedRides.filter((r: any) => {
      const dateString = r.delivered_at || r.accepted_at || r.created_at;
      const jobDate = dateString ? new Date(dateString) : null;
      if (!jobDate || isNaN(jobDate.getTime())) return false;

      if (earningsWindow === 'daily') {
        return jobDate.toDateString() === now.toDateString();
      } else if (earningsWindow === 'weekly') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return jobDate >= oneWeekAgo;
      } else if (earningsWindow === 'monthly') {
        return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
      }
      return false;
    });

    const windowTotal = windowItems.reduce(
      (acc: number, r: any) => acc + Number(r.driver_payout || r.final_price || 0),
      0
    );
    const windowCount = windowItems.length;
    const avgJob = windowCount > 0 ? windowTotal / windowCount : 0;
    
    const sortedWindowItems = [...windowItems].sort((a: any, b: any) => {
      const dateA = a.delivered_at || a.created_at;
      const dateB = b.delivered_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayValues = [0, 0, 0, 0, 0, 0, 0];
    let weekTotal = 0;
    
    const todayIdx = (now.getDay() + 6) % 7; 

    completedRides.forEach((r: any) => {
      const dateString = r.delivered_at || r.accepted_at || r.created_at;
      const jobDate = dateString ? new Date(dateString) : null;
      if (!jobDate || isNaN(jobDate.getTime())) return;
      
      const pastDate = new Date(jobDate);
      pastDate.setHours(0,0,0,0);
      const todayDate = new Date(now);
      todayDate.setHours(0,0,0,0);
      
      const daysDiff = Math.round((todayDate.getTime() - pastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0 && daysDiff < 7) {
        const jobDayIndex = (jobDate.getDay() + 6) % 7;
        const amount = Number(r.driver_payout || r.final_price || 0);
        dayValues[jobDayIndex] += amount;
        weekTotal += amount;
      }
    });

    const bestDay = Math.max(...dayValues, 1);

    return (
      <>
        <View style={styles.earnHero}>
          <Text style={styles.ehLbl}>Selected Window</Text>
          <Text style={styles.ehAmt}>€{money(windowTotal)}</Text>
          <Text style={styles.ehChg}>
            <Text style={styles.ehUp}>{windowCount}</Text> completed jobs
          </Text>

          <View style={styles.ehKpis}>
            <View style={styles.ehk}>
              <Text style={styles.ehkV}>{windowCount}</Text>
              <Text style={styles.ehkL}>Jobs</Text>
            </View>
            <View style={styles.ehk}>
              <Text style={styles.ehkV}>€{money(avgJob)}</Text>
              <Text style={styles.ehkL}>Avg/job</Text>
            </View>
            <View style={styles.ehk}>
              <Text style={styles.ehkV}>€0</Text>
              <Text style={styles.ehkL}>Fees</Text>
            </View>
            <TouchableOpacity style={styles.ehk} onPress={() => setCurrentScreen('subscription')}>
              <Text style={[styles.ehkV, !isPremium && { color: '#06B6D4' }]}>
                {isPremium ? 'Pro' : 'Upgrade'}
              </Text>
              <Text style={styles.ehkL}>Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.periodRow}>
          {(['daily', 'weekly', 'monthly'] as EarningsWindow[]).map(w => (
            <TouchableOpacity
              key={w}
              style={[styles.prBtn, earningsWindow === w && styles.prBtnOn]}
              onPress={() => setEarningsWindow(w)}
            >
              <Text style={[styles.prLbl, earningsWindow === w && styles.prLblOn]}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.pad}>
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Daily Earnings — Last 7 Days</Text>
            <View style={styles.chart}>
              {dayValues.map((v, idx) => {
                const heightPct = bestDay > 0 ? Math.max(4, Math.round((v / bestDay) * 100)) : 4;
                const isToday = idx === todayIdx;
                return (
                  <View key={idx} style={styles.barWrap}>
                    <View style={[styles.bar, isToday && styles.barToday, { height: `${heightPct}%` }]} />
                    <Text style={[styles.barLbl, isToday && styles.barLblToday]}>{dayLabels[idx]}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.chartFoot}>
              <Text style={styles.cfNote}>Today</Text>
              <Text style={styles.cfNote}>Week total: €{money(weekTotal)}</Text>
            </View>
          </View>

          <View style={styles.txCard}>
            <View style={styles.txHeader}>
              <Text style={styles.txHeaderTitle}>Recent Transactions</Text>
              <Text style={styles.txHeaderDate}>
                {new Date().toLocaleDateString([], { month: 'short', year: 'numeric' })}
              </Text>
            </View>

            {sortedWindowItems.slice(0, 8).map((r: any, idx: number) => {
              const status = statusValue(r.status);
              const isCompleted = ['completed', 'paid', 'delivered'].includes(status);
              const isDisputed = status === 'disputed';
              const isNegative = status === 'cancelled';

              return (
                <View
                  key={r.id || idx}
                  style={[
                    styles.txRow,
                    idx === Math.min(7, sortedWindowItems.length - 1) && { borderBottomWidth: 0 },
                  ]}
                >
                  <View
                    style={[
                      styles.txIconWrap,
                      {
                        backgroundColor: isCompleted
                          ? COLORS.successSoft
                          : isDisputed
                          ? COLORS.warningSoft
                          : COLORS.dangerSoft,
                      },
                    ]}
                  >
                    <DriverIcon
                      name={isCompleted ? 'ic-pkg' : isDisputed ? 'ic-warn' : 'ic-earn'}
                      size={20}
                      color={isCompleted ? COLORS.success : isDisputed ? COLORS.warning : COLORS.danger}
                    />
                  </View>

                  <View style={styles.txDetails}>
                    <Text style={styles.txTitle}>
                      {(r.pickup_address || 'Pickup')} → {(r.dropoff_address || 'Drop-off')}
                    </Text>
                    <Text style={styles.txMeta}>
                      {shortDateTime(r.created_at)} • {formatVehicleName(r.van_type)}
                    </Text>
                  </View>

                  <View style={styles.txRight}>
                    <Text
                      style={
                        isCompleted
                          ? styles.txAmountPlus
                          : isDisputed
                          ? styles.txAmountWarn
                          : isNegative
                          ? styles.txAmountMinus
                          : styles.txAmountPlus
                      }
                    >
                      {isNegative ? '-' : '+'}€{money(r.driver_payout || r.final_price)}
                    </Text>
                    <Text
                      style={[
                        styles.txStatusText,
                        { color: isCompleted ? COLORS.success : isDisputed ? COLORS.warning : COLORS.danger },
                      ]}
                    >
                      {status || 'paid'}
                    </Text>
                  </View>
                </View>
              );
            })}

            {sortedWindowItems.length === 0 && (
              <View style={{ padding: 16 }}>
                <Text style={{ color: COLORS.soft }}>No earnings in this window yet.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </>
    );
  };

  const renderPerformance = () => (
    <>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.scoreCard}>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreNum}>{trustScore}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.scoreTitle}>{trustBand}</Text>
            <Text style={styles.scoreSub}>Based on your live backend job history</Text>
            <Text style={styles.scorePill}>
              {trustScore >= 85 ? 'Priority dispatch active' : 'Keep improving'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.ch}>
            <Text style={styles.ct}>Score Breakdown</Text>
            <Text style={styles.cs}>IDP ranking factors</Text>
          </View>

          <View style={{ paddingHorizontal: 14 }}>
            {[
              ['Acceptance Rate', 'Jobs accepted vs offered', acceptanceRate, `${acceptanceRate}%`],
              ['Completion Rate', 'Jobs finished successfully', completionRate, `${completionRate}%`],
              ['Customer Rating', 'Average across all deliveries', Math.round((averageRating / 5) * 100), `${averageRating.toFixed(1)}★`],
              ['On-Time Delivery', 'Based on completed jobs', onTimeRate, `${onTimeRate}%`],
              ['Dispute Rate', 'Keep this under 2%', Math.max(0, 100 - disputeRate * 10), `${disputeRate}%`],
              ['Zone Coverage', 'Availability and delivery activity', Math.min(100, Math.max(50, completedRides.length * 5)), `${Math.min(100, Math.max(50, completedRides.length * 5))}%`],
            ].map((m, idx) => (
              <View key={idx} style={[styles.metricRow, idx === 5 && { borderBottomWidth: 0 }]}>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricName}>{m[0] as string}</Text>
                  <Text style={styles.metricSub}>{m[1] as string}</Text>
                </View>
                <View style={styles.metricBarBg}>
                  <View
                    style={[
                      styles.metricBarFill,
                      {
                        width: `${m[2]}%`,
                        backgroundColor: m[0] === 'Dispute Rate' ? COLORS.warning : COLORS.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.metricVal, m[0] === 'Dispute Rate' && { color: COLORS.warning }]}>
                  {m[3] as string}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.ch}>
            <Text style={styles.ct}>How to Improve</Text>
          </View>
          <View style={styles.cb}>
            <View style={styles.tipBoxWarn}>
              <View style={styles.tipHead}>
                <DriverIcon name="ic-warn" size={14} color={COLORS.warning} />
                <Text style={styles.tipHeadText}>Dispute Rate — {disputeRate}%</Text>
              </View>
              <Text style={styles.tipText}>
                Always upload delivery proof and keep customer notes documented.
              </Text>
            </View>

            <View style={styles.tipBoxSoft}>
              <Text style={styles.tipHeadTextSoft}>On-Time Rate — {onTimeRate}%</Text>
              <Text style={styles.tipText}>
                Use navigation early and confirm pickup promptly to raise on-time score.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );

  const renderHistory = () => {
    return (
      <>
        <View style={styles.filterRow}>
          {['All', 'Completed', 'Disputed', 'Cancelled', 'This Week'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.ftag, selectedHistoryFilter === f && styles.ftagOn]}
              onPress={() => setSelectedHistoryFilter(f as any)}
            >
              <Text style={[styles.ftagText, selectedHistoryFilter === f && styles.ftagTextOn]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.pad0}>
          
          <Text style={[styles.sectionLbl, { marginTop: 16 }]}>History Logs</Text>

          {filteredHistory.map((r: any, idx: number) => {
            const status = statusValue(r.status);

            const badgeStyle = ['completed', 'paid', 'delivered'].includes(status) ? styles.hbOk : status === 'disputed' ? styles.hbDis : styles.hbCan;
            const amountStyle = ['completed', 'paid', 'delivered'].includes(status) ? styles.hrAmtG : status === 'disputed' ? styles.hrAmtA : styles.hrAmtMuted;

            return (
              // 🔥 WRAP IN SWIPE COMPONENT
              <SwipeToDeleteItem 
                key={r.id || idx} 
                ride={r} 
                onDelete={(id: number) => setHiddenHistoryIds(prev => [...prev, id])}
              >
                <TouchableOpacity
                  style={[styles.hr, { position: 'relative', marginBottom: 0, borderWidth: 0 }]} // removed margin so wrapper handles spacing
                  onPress={() => {
                    if (activeJob && r.id === activeJob.id) setScreenIndex(2);
                  }}
                >
                  <View style={[styles.hrIco, { backgroundColor: ['completed', 'paid', 'delivered'].includes(status) ? COLORS.successSoft : status === 'disputed' ? COLORS.warningSoft : COLORS.dangerSoft }]}>
                    <DriverIcon name={['completed', 'paid', 'delivered'].includes(status) ? 'ic-pkg' : status === 'disputed' ? 'ic-warn' : 'ic-van'} size={18} color={['completed', 'paid', 'delivered'].includes(status) ? COLORS.success : status === 'disputed' ? COLORS.warning : COLORS.danger} />
                  </View>

                  <View style={styles.hrInfo}>
                    <Text style={styles.hrRoute}>{(r.pickup_address || 'Route')} → {(r.dropoff_address || 'Destination')}</Text>
                    <Text style={styles.hrMeta}>{r.created_at ? shortDateTime(r.created_at) : ''} · {formatVehicleName(r.van_type)}</Text>
                  </View>

                  <View style={styles.hrRight}>
                    <View style={{ marginTop: 24, alignItems: 'flex-end' }}>
                      <Text style={amountStyle}>{['completed', 'paid', 'delivered'].includes(status) ? '+' : ''}€{money(r.driver_payout || r.final_price || 0)}</Text>
                      <Text style={[styles.hrBadge, badgeStyle]}>{status || 'Status'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </SwipeToDeleteItem>
            );
          })}

          {filteredHistory.length === 0 && (
            <View style={{ padding: 16 }}>
              <Text style={{ color: COLORS.soft }}>No history found for this filter.</Text>
            </View>
          )}
        </ScrollView>
      </>
    );
  };

  const renderDocuments = () => {
    const getDocStatus = (field: VerField, label: string) => {
      const hasRemote = !!docsFromProfile?.[field];
      const hasLocal = !!verUploads[field];
      const status = hasRemote
        ? verStatus === 'verified'
          ? 'verified'
          : 'pending'
        : hasLocal
        ? 'pending'
        : 'missing';

      return {
        label,
        status,
        sub:
          status === 'verified'
            ? 'Verified'
            : status === 'pending'
            ? 'Under review / captured'
            : 'Required — not uploaded',
      };
    };

    const docs = [
      getDocStatus('license', "Driver's Licence"),
      getDocStatus('id', 'Passport / National ID'),
      getDocStatus('reg', 'Vehicle Registration'),
      getDocStatus('insurance', 'Insurance Certificate'),
      getDocStatus('nct', 'NCT Certificate'),
    ];

    return (
      <ScrollView contentContainerStyle={styles.pad}>
        {verStatus !== 'verified' && (
          <View style={styles.docAlert}>
            <DriverIcon name="ic-warn" size={18} color={COLORS.danger} />
            <Text style={styles.docAlertText}>
              <Text style={{ color: COLORS.danger, fontWeight: '700' }}>Documents incomplete.</Text>{' '}
              Tap any item to upload.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.ch}>
            <Text style={styles.ct}>Verification Status</Text>
            <Text style={styles.linkText}>{verStatus}</Text>
          </View>
          <View style={styles.cb}>
            <Text style={{ color: COLORS.mid }}>
              Keep your documents updated so your driver account stays active.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.ch}>
            <Text style={styles.ct}>Documents</Text>
          </View>

          {docs.map((doc, i) => {
            const field =
              doc.label === "Driver's Licence"
                ? 'license'
                : doc.label === 'Passport / National ID'
                ? 'id'
                : doc.label === 'Vehicle Registration'
                ? 'reg'
                : doc.label === 'Insurance Certificate'
                ? 'insurance'
                : 'nct';

            return (
              <TouchableOpacity
                key={doc.label}
                style={[styles.docRow, i === docs.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  setActiveDoc(field as VerField);
                  setDocModalVisible(true);
                }}
              >
                <View style={[styles.docIco, getVerificationIconStyle(doc.status, styles)]}>
                  <DriverIcon
                    name={field === 'insurance' ? 'ic-shield' : field === 'nct' ? 'ic-tool' : 'ic-doc'}
                    size={18}
                    color={getVerificationIconColor(doc.status)}
                  />
                </View>

                <View style={styles.docInfo}>
                  <Text style={styles.docName}>{doc.label}</Text>
                  <Text style={styles.docSub}>{doc.sub}</Text>
                </View>

                <Text style={[styles.docBadge, getVerificationBadgeStyle(doc.status, styles)]}>
                  {getVerificationStatusLabel(doc.status)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.btnGreen} onPress={submitVerification}>
          <Text style={styles.btnText}>Submit Verification</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderSupport = () => (
    <>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.supRow} onPress={() => setDisputeOpen(v => !v)}>
            <View style={[styles.supIco, { backgroundColor: COLORS.dangerSoft, borderColor: '#F0C0C0' }]}>
              <DriverIcon name="ic-warn" size={18} color={COLORS.danger} />
            </View>
            <View style={styles.supInfo}>
              <Text style={styles.supTitle}>Report a Dispute</Text>
              <Text style={styles.supSub}>Job went wrong? Raise it here</Text>
            </View>
            <Text style={styles.supBadge}>{disputedRides.length} open</Text>
            <Text style={styles.supArr}>›</Text>
          </TouchableOpacity>

          <View style={[styles.dispPanel, disputeOpen && styles.dispPanelOn]}>
            <Text style={styles.dpLbl}>Job Reference</Text>
            <TextInput
              style={styles.dpInp}
              placeholder="e.g. JOB-4821"
              value={supportSubject}
              onChangeText={setSupportSubject}
            />
            <Text style={styles.dpLbl}>Issue Type</Text>
            <TextInput style={styles.dpInp} placeholder="Customer refused delivery" />
            <Text style={styles.dpLbl}>Description</Text>
            <TextInput
              style={styles.dpTa}
              placeholder="Describe what happened..."
              multiline
              value={supportMessage}
              onChangeText={setSupportMessage}
            />
            <TouchableOpacity style={styles.redBtn} onPress={sendSupport}>
              <Text style={styles.redBtnText}>Submit Dispute</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.supRow} onPress={() => setDriverChatVisible(true)}>
            <View style={[styles.supIco, { backgroundColor: COLORS.primarySoft, borderColor: '#C4DDF5' }]}>
              <DriverIcon name="ic-chat" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.supInfo}>
              <Text style={styles.supTitle}>Live Chat / Message</Text>
              <Text style={styles.supSub}>Talk to the Hence team now</Text>
            </View>
            <Text style={styles.supArr}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.supRow} onPress={openCallSupport}>
            <View style={[styles.supIco, { backgroundColor: COLORS.successSoft, borderColor: COLORS.primaryBorder }]}>
              <DriverIcon name="ic-call" size={18} color={COLORS.success} />
            </View>
            <View style={styles.supInfo}>
              <Text style={styles.supTitle}>Call Support</Text>
              <Text style={styles.supSub}>Available from your configured support line</Text>
            </View>
            <Text style={styles.supArr}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.supRow} onPress={openHelpCentre}>
            <View style={[styles.supIco, { backgroundColor: COLORS.bg }]}>
              <DriverIcon name="ic-doc" size={18} color={COLORS.soft} />
            </View>
            <View style={styles.supInfo}>
              <Text style={styles.supTitle}>Help Centre</Text>
              <Text style={styles.supSub}>FAQs, guides & driver policies</Text>
            </View>
            <Text style={styles.supArr}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.supRow, { borderBottomWidth: 0 }]} onPress={openAccountIssues}>
            <View style={[styles.supIco, { backgroundColor: COLORS.warningSoft, borderColor: '#E8C87A' }]}>
              <DriverIcon name="ic-user" size={18} color={COLORS.warning} />
            </View>
            <View style={styles.supInfo}>
              <Text style={styles.supTitle}>Account Issues</Text>
              <Text style={styles.supSub}>Suspension, billing, verification</Text>
            </View>
            <Text style={styles.supArr}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );

  const TABS = [
    { label: 'Home', icon: 'ic-home', target: 0 },
    { label: 'Active', icon: 'ic-map', target: 2 }, 
    { label: 'History', icon: 'ic-hist', target: 5 },
    { label: 'Support', icon: 'ic-sup', target: 7 },
  ];

  const isOfferMulti = ringingOffer?.booking_mode === 'multi' || (ringingOffer?.stops?.length || 0) > 1;

return (
    <View style={styles.container}>
      <View style={{ flex: 1, position: 'relative' }}>
        {screenIndex === 0 && renderDashboard()}
        {screenIndex === 1 && renderJobAlert()}
        {screenIndex === 2 && renderActiveJob()}
        {screenIndex === 3 && renderEarnings()}
        {screenIndex === 4 && renderPerformance()}
        {screenIndex === 5 && renderHistory()}
        {screenIndex === 6 && renderDocuments()}
        {screenIndex === 7 && renderSupport()}
      </View>

      <View style={styles.tabbar}>
        {TABS.map((tab) => (
          <TouchableOpacity key={tab.label} style={styles.tab} onPress={() => setScreenIndex(tab.target)}>
            <View style={styles.tabIcoWrap}>
              <DriverIcon
                name={tab.icon}
                size={18}
                color={screenIndex === tab.target ? COLORS.primary : COLORS.mute}
              />
            </View>
            <Text style={[styles.tabLbl, screenIndex === tab.target && styles.tabLblOn]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={docModalVisible} animationType="fade" transparent>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeDoc === 'license'
                  ? "Driver's Licence"
                  : activeDoc === 'id'
                  ? 'Passport / National ID'
                  : activeDoc === 'reg'
                  ? 'Vehicle Registration'
                  : activeDoc === 'insurance'
                  ? 'Insurance Certificate'
                  : activeDoc === 'nct'
                  ? 'NCT Certificate'
                  : 'Upload Document'}
              </Text>
              <TouchableOpacity onPress={() => setDocModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>×</Text>
              </TouchableOpacity>
            </View>

            {activeDoc && (
              <View>
                <View style={styles.docPreviewWrap}>
                  {verUploads[activeDoc] || docsFromProfile?.[activeDoc] ? (
                    <Image
                      source={{ uri: verUploads[activeDoc] || docsFromProfile?.[activeDoc] }}
                      style={styles.docPreviewImg}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.docEmptyWrap}>
                      <DriverIcon name="ic-upload" size={40} color={COLORS.mute} />
                      <Text style={styles.docEmptyText}>No file selected</Text>
                    </View>
                  )}
                </View>

                <View style={styles.docActions}>
                  <TouchableOpacity onPress={() => captureVerificationPhoto(activeDoc)} style={styles.docActionBtn}>
                    <DriverIcon name="ic-cam" size={16} color="#fff" />
                    <Text style={styles.docActionText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => uploadSingle(activeDoc)}
                    style={[styles.docActionBtn, { backgroundColor: '#06B6D4' }]}
                  >
                    <Text style={styles.docActionText}>
                      {uploadedUrls[activeDoc] ? 'Re-upload' : 'Upload File'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {uploadingFiles[activeDoc] && (
                  <View style={styles.docProgressWrap}>
                    <View style={styles.progressBg}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.round(uploadProgress[activeDoc] || 0)}%` },
                        ]}
                      />
                    </View>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressText}>
                        {uploadProgress[activeDoc] || 0}% Uploaded
                      </Text>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                  </View>
                )}

                {!uploadingFiles[activeDoc] && uploadedUrls[activeDoc] && (
                  <View style={styles.docSuccessWrap}>
                    <Text style={styles.docSuccessText}>Document Uploaded Successfully ✓</Text>
                    <TouchableOpacity style={styles.btnGreen} onPress={() => setDocModalVisible(false)}>
                      <Text style={styles.btnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={scannerVisible} animationType="slide" transparent={false}>
        <View style={styles.scannerWrap}>
          {!Device.isDevice ? (
            <View style={styles.simWrap}>
              <Text style={styles.simText}>Running on Simulator?{'\n'}Camera is not available.</Text>
              <TouchableOpacity style={styles.smallBlueBtn2} onPress={simulateScan}>
                <Text style={styles.smallWhiteBtnText}>Simulate Successful Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 20 }} onPress={() => setScannerVisible(false)}>
                <Text style={{ color: COLORS.danger, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            >
              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanText}>Scan Customer's QR Code</Text>
              </View>
            </CameraView>
          )}

          <TouchableOpacity style={styles.closeScan} onPress={() => setScannerVisible(false)}>
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={supportVisible} animationType="fade" transparent>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Contact Support</Text>
            <TextInput
              placeholder="Subject"
              value={supportSubject}
              onChangeText={setSupportSubject}
              style={styles.modalInput}
            />
            <TextInput
              placeholder="Message"
              value={supportMessage}
              onChangeText={setSupportMessage}
              style={[styles.modalInput, styles.modalTextarea]}
              multiline
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setSupportVisible(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={sendSupport} style={styles.modalSend}>
                <Text style={styles.modalSendText}>{supportSending ? 'Sending...' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={locModalVisible} animationType="slide" transparent>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 16, marginTop: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <DriverIcon name="ic-pin" size={32} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.ink, textAlign: 'center' }}>
                Enable Location
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: COLORS.mid, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              Hence collects location data to enable job dispatching, calculate distances, and allow customers to track their deliveries in real-time, <Text style={{ fontWeight: '700' }}>even when the app is closed or not in use.</Text>
            </Text>

            <TouchableOpacity style={[styles.btnGreen, { width: '100%', marginBottom: 12 }]} onPress={handleRequestLocation}>
              <Text style={styles.btnText}>Allow Location Access</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => setLocModalVisible(false)}>
              <Text style={{ color: COLORS.soft, fontWeight: '600', fontSize: 14 }}>Not Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {screenIndex === 2 && activeJob && (
        <TouchableOpacity 
          onPress={() => setDriverChatVisible(true)} 
          style={{ 
            position: 'absolute', 
            right: 18, 
            bottom: 90, 
            width: 60, 
            height: 60, 
            borderRadius: 30, 
            backgroundColor: COLORS.primary, 
            alignItems: 'center', 
            justifyContent: 'center', 
            elevation: 8, 
            shadowColor: '#000', 
            shadowOpacity: 0.2, 
            shadowRadius: 8 
          }}
        >
          <Ionicons name="chatbubbles" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <DriverChatSupportModal
        visible={driverChatVisible}
        onClose={() => setDriverChatVisible(false)}
        user={user}
        activeJob={activeJob}
        sendSupportMessage={sendSupportMessage}
        createSupportTicket={createSupportTicket}
      />

      <Modal visible={newOfferModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(15,31,23,0.65)', justifyContent: 'center', padding: 16 }}>
          
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8E4', elevation: 10, shadowColor: '#0F1F17', shadowOpacity: 0.3, shadowRadius: 20 }}>
            
            {/* 1. HERO PAYOUT SECTION */}
            <View style={{ backgroundColor: COLORS.primary, padding: 24, paddingBottom: 22 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#C8F135', marginRight: 8 }} />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8, color: '#C8F135', textTransform: 'uppercase' }}>
                    New Job Offer {isOfferMulti ? `· ${ringingOffer?.stops?.length || ringingOffer?.stop_count || 0} Stops` : ''}
                  </Text>
                </View>

                {/* Simulated Countdown Ring */}
                <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: offerSecondsLeft <= 8 ? '#FF6B6B' : '#C8F135', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ 
                    fontSize: offerSecondsLeft > 60 ? 12 : 14, 
                    fontWeight: '800', 
                    color: offerSecondsLeft <= 8 ? '#FF6B6B' : '#fff' 
                  }}>
                    {offerSecondsLeft > 60 
                      ? `${Math.floor(offerSecondsLeft / 60)}:${String(offerSecondsLeft % 60).padStart(2, '0')}`
                      : offerSecondsLeft}
                  </Text>
                </View>
              </View> {/* 🔥 HERE IS THE TAG THAT WAS MISSING! */}

              <Text style={{ fontSize: 46, fontWeight: '800', color: '#fff', marginTop: 10, letterSpacing: -1 }}>
                €{money(ringingOffer?.driver_payout || ringingOffer?.final_price)}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontSize: 30, fontWeight: '800', color: '#fff' }}>
                    {getTrueDistance(ringingOffer)}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginLeft: 4 }}>
                    km {isOfferMulti ? 'total' : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginLeft: 18 }}>
                  {getTrueTime(ringingOffer)} min est. time
                </Text>
              </View>
            </View>


            {/* 2. ROUTE LINE SECTION */}
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', paddingHorizontal: 22, paddingTop: 20, paddingBottom: 4 }}>
                
                {/* Connector Graphics */}
                <View style={{ alignItems: 'center', marginRight: 14, paddingTop: 4 }}>
                  <View style={{ width: 11, height: 11, borderRadius: 5.5, backgroundColor: COLORS.primary }} />
                  
                  {isOfferMulti ? (
                    ringingOffer?.stops?.map((_: any, i: number) => (
                      <React.Fragment key={i}>
                        <View style={{ width: 2, height: 40, backgroundColor: '#E2E8E4', marginVertical: 4 }} />
                        <View style={{ width: i === ringingOffer.stops.length - 1 ? 11 : 8, height: i === ringingOffer.stops.length - 1 ? 11 : 8, borderRadius: i === ringingOffer.stops.length - 1 ? 3 : 4, backgroundColor: i === ringingOffer.stops.length - 1 ? '#0F1F17' : '#6B7670' }} />
                      </React.Fragment>
                    ))
                  ) : (
                    <>
                      <View style={{ width: 2, height: 40, backgroundColor: '#E2E8E4', marginVertical: 4 }} />
                      <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: '#0F1F17' }} />
                    </>
                  )}
                </View>

                {/* Addresses */}
                <View style={{ flex: 1, gap: 24 }}>
                  <View>
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pickup</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F1F17', marginTop: 2 }}>{ringingOffer?.pickup_address?.split(',')[0] || 'Pickup Location'}</Text>
                    <Text style={{ fontSize: 13, color: '#6B7670', marginTop: 1 }} numberOfLines={1}>{ringingOffer?.pickup_address}</Text>
                  </View>

                  {isOfferMulti ? (
                    ringingOffer?.stops?.map((s: any, i: number) => (
                      <View key={i}>
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#6B7670', textTransform: 'uppercase', letterSpacing: 0.5 }}>Drop-off {i + 1} of {ringingOffer.stops.length}</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F1F17', marginTop: 2 }}>{s.recipient || s.name || s.address.split(',')[0]}</Text>
                        <Text style={{ fontSize: 13, color: '#6B7670', marginTop: 1 }} numberOfLines={1}>{s.address}</Text>
                      </View>
                    ))
                  ) : (
                    <View>
                      <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#6B7670', textTransform: 'uppercase', letterSpacing: 0.5 }}>Drop-off</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F1F17', marginTop: 2 }}>{ringingOffer?.dropoff_address?.split(',')[0] || 'Delivery Location'}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7670', marginTop: 1 }} numberOfLines={1}>{ringingOffer?.dropoff_address}</Text>
                    </View>
                  )}
                </View>

              </View>
            </ScrollView>

            {/* 3. COMPACT META ROW */}
            <View style={{ marginHorizontal: 22, marginTop: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F6F8F6', borderRadius: 14, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.primary + '33', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, marginRight: 10 }}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: COLORS.primary }}>{formatJobType(ringingOffer?.job_type)}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: '#0F1F17' }} numberOfLines={1}>
                {isOfferMulti ? `Multi-Drop · ${ringingOffer?.stops?.length || 0} Orders` : 'Single Drop'}
              </Text>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#6B7670' }}>{formatVehicleName(ringingOffer?.van_type)}</Text>
            </View>

            {/* 4. ACTIONS */}
            <View style={{ flexDirection: 'row', padding: 22, paddingBottom: 24, gap: 10 }}>
              <TouchableOpacity 
                style={{ width: 54, height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8E4', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }} 
                onPress={() => {
                  setNewOfferModalVisible(false);
                  handleSkipAvailableJob(ringingOffer?.offer_id || ringingOffer?.id);
                }}
              >
                <Ionicons name="close" size={24} color="#6B7670" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ flex: 1, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }} 
                onPress={() => {
                  setNewOfferModalVisible(false);
                  handleAcceptAvailableJob(ringingOffer?.offer_id || ringingOffer?.id);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Accept Job</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  onlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.primary,
    flexShrink: 0,
  },
  onlineBarOff: { backgroundColor: COLORS.mid },
  obPulse: { width: 11, height: 11, borderRadius: 11, backgroundColor: '#4ade80' },
  obPulseOff: { backgroundColor: 'rgba(255,255,255,0.3)' },
  obInfo: { flex: 1 },
  obTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  obSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 1 },

  swTrack: { width: 52, height: 30, borderRadius: 15, padding: 2, justifyContent: 'center' },
  swTrackOn: { backgroundColor: COLORS.success },
  swTrackOff: { backgroundColor: 'rgba(0,0,0,0.25)' },
  swThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  swThumbOn: { transform: [{ translateX: 22 }] },
  swThumbOff: { transform: [{ translateX: 0 }], backgroundColor: '#E5E7EB' },

  pad: { padding: 14, paddingBottom: 30 },
  pad0: { paddingBottom: 30 },
  padActive: { padding: 14, paddingTop: 12, paddingBottom: 90 },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kpi: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    ...shadow('rgba(15,26,20,0.07)'),
  },
  kpiV: { fontSize: 20, fontFamily: 'monospace', color: COLORS.ink, fontWeight: '500' },
  kpiL: { fontSize: 10, color: COLORS.soft, marginTop: 4, fontWeight: '500' },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    overflow: 'hidden',
    ...shadow('rgba(15,26,20,0.07)'),
  },
  ch: {
    padding: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ct: { fontSize: 11, fontWeight: '700', color: COLORS.ink, textTransform: 'uppercase', letterSpacing: 1.1 },
  cs: { fontSize: 10, color: COLORS.soft },
  cb: { padding: 12, paddingHorizontal: 14 },

  linkText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  jcard: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    ...shadow('rgba(15,118,110,0.14)'),
  },
  jcardTimer: {
    backgroundColor: COLORS.warningSoft,
    borderBottomWidth: 1,
    borderBottomColor: '#ecd88a',
    paddingVertical: 7,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jctLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  jctPulse: { width: 7, height: 7, borderRadius: 7, backgroundColor: COLORS.warning },
  jctText: { fontSize: 11, fontWeight: '600', color: COLORS.warning },
  jctTime: { fontSize: 13, fontFamily: 'monospace', color: COLORS.warning },
  jcardBody: {
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  jcardRoute: { fontSize: 15, fontWeight: '700', color: COLORS.ink, lineHeight: 20 },
  jcardMeta: { fontSize: 11, color: COLORS.soft, marginTop: 4 },
  jcardStats: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  jcs: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  jcsV: { fontSize: 15, fontFamily: 'monospace', color: COLORS.primary, fontWeight: '500' },
  jcsL: { fontSize: 9, color: COLORS.soft, marginTop: 2 },
  jcardBtns: { flexDirection: 'row' },
  jbtnAcc: { flex: 2, backgroundColor: COLORS.primary, padding: 12, alignItems: 'center' },
  jbtnDec: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 12,
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  jbtnAccText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  jbtnDecText: { color: COLORS.soft, fontSize: 13, fontWeight: '700' },

  hr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  hrIco: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hrInfo: { flex: 1 },
  hrRoute: { fontSize: 12, fontWeight: '600', color: COLORS.ink },
  hrMeta: { fontSize: 10, color: COLORS.soft, marginTop: 2 },
  hrRight: { alignItems: 'flex-end' },
  hrAmtG: { fontSize: 13, fontFamily: 'monospace', color: COLORS.success, fontWeight: '500' },
  hrAmtA: { fontSize: 13, fontFamily: 'monospace', color: COLORS.warning, fontWeight: '500' },
  hrAmtR: { fontSize: 13, fontFamily: 'monospace', color: COLORS.danger, fontWeight: '500' },
  hrAmtMuted: { fontSize: 13, fontFamily: 'monospace', color: COLORS.mute, fontWeight: '500' },
  hrBadge: { fontSize: 9, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, marginTop: 3 },
  hbOk: { backgroundColor: COLORS.successSoft, color: COLORS.success } as any,
  hbDis: { backgroundColor: COLORS.warningSoft, color: COLORS.warning } as any,
  hbCan: { backgroundColor: COLORS.dangerSoft, color: COLORS.danger } as any,

  trustMini: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  trustRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustScore: { fontFamily: 'monospace', color: COLORS.success, fontSize: 15, fontWeight: '500' },
  trustTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  trustSub: { fontSize: 11, color: COLORS.soft, marginTop: 2 },
  trustPill: {
    marginTop: 5,
    fontSize: 10,
    color: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 20,
    fontWeight: '600',
    alignSelf: 'flex-start',
  },

  alertWrap: { flex: 1, overflow: 'hidden' },
  alertMap: { height: 190, flexShrink: 0 },
  amBg: { flex: 1, backgroundColor: '#b8d8c4', position: 'relative' },
  amGrid: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', opacity: 0.35 },
  amRoad: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  amRouteLine: {
    position: 'absolute',
    top: '42%',
    left: '13%',
    right: '17%',
    height: 3,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  amPinP: { position: 'absolute', top: '24%', left: '12%' },
  amPinD: { position: 'absolute', top: '18%', right: '15%' },
  amDist: {
    position: 'absolute',
    bottom: 10,
    left: '50%',
    marginLeft: -80,
    width: 160,
    textAlign: 'center',
    backgroundColor: 'rgba(15,26,20,0.72)',
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderRadius: 20,
  },

  urgencyStrip: {
    backgroundColor: COLORS.danger,
    paddingVertical: 9,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  usLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  usTimer: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 7,
  },

  jobMain: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexShrink: 0 },
  jobRoute: { fontSize: 18, fontWeight: '700', color: COLORS.ink, lineHeight: 24 },
  jobMeta: { marginTop: 4, fontSize: 12, color: COLORS.soft },
  jobStatsRow: { flexDirection: 'row', gap: 8, marginTop: 13 },
  jsr: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  jsrV: { fontSize: 16, fontFamily: 'monospace', color: COLORS.ink, fontWeight: '500' },
  jsrVg: { fontSize: 16, fontFamily: 'monospace', color: COLORS.primary, fontWeight: '500' },
  jsrL: { fontSize: 9, color: COLORS.soft, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },

  itemsBlock: { paddingVertical: 12, paddingHorizontal: 14, flexShrink: 0 },
  itemsHdr: { fontSize: 10, fontWeight: '700', color: COLORS.soft, textTransform: 'uppercase', letterSpacing: 1 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemNum: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNumText: { color: COLORS.primary, fontSize: 10, fontFamily: 'monospace', fontWeight: '500' },
  itemText: { flex: 1, fontSize: 12, fontWeight: '500', color: COLORS.ink },
  itemWt: { fontSize: 11, color: COLORS.soft, fontFamily: 'monospace' },

  alertBtns: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  acceptBig: { flex: 2, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  acceptBigText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  declineBig: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBigText: { color: COLORS.soft, fontSize: 13, fontWeight: '600' },

  activeMap: { height: 180, position: 'relative' },
  activeMapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#CFE8D8' },
  activeMapFallbackText: { color: COLORS.ink, fontWeight: '600' },
  actEta: {
    position: 'absolute',
    bottom: 9,
    left: '50%',
    marginLeft: -95,
    width: 190,
    textAlign: 'center',
    backgroundColor: COLORS.ink,
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 5,
    borderRadius: 20,
  },
  pinWrap: { padding: 6, borderRadius: 999, borderWidth: 2, borderColor: '#fff' },
  driverPin: { backgroundColor: COLORS.primary, padding: 6, borderRadius: 999, borderWidth: 2, borderColor: '#fff' },

  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pbStep: { flex: 1, alignItems: 'center', gap: 4 },
  pbDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pbDone: { backgroundColor: COLORS.success },
  pbActive: { backgroundColor: COLORS.ink },
  pbPend: { backgroundColor: COLORS.bg, borderWidth: 2, borderColor: COLORS.border },
  pbLbl: { fontSize: 9, fontWeight: '600' },
  pbDoneLbl: { color: COLORS.success },
  pbActiveLbl: { color: COLORS.ink },
  pbPendLbl: { color: COLORS.mute },
  pbLine: { flex: 1, height: 2, borderRadius: 1, marginTop: -14, marginHorizontal: 5 },
  pbLineDone: { backgroundColor: COLORS.primaryBorder },
  pbLinePend: { backgroundColor: COLORS.border },

  custRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  custAv: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryBorder,
  },
  custAvText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  custInfo: { flex: 1 },
  custName: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  custAddr: { fontSize: 10, color: COLORS.soft, marginTop: 2 },
  custBtns: { flexDirection: 'row', gap: 6 },
  custBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  infoCard: { width: '48.6%', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, padding: 10 },
  igLbl: { fontSize: 9, color: COLORS.soft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3, fontWeight: '700' },
  igVal: { fontSize: 12, fontWeight: '600', color: COLORS.ink },
  igValGreen: { color: COLORS.primary },
  warnBox: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: COLORS.warningSoft,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    padding: 10,
  },
  warnText: { flex: 1, fontSize: 11, color: COLORS.mid, lineHeight: 16 },

  actGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBox: {
    width: '48.6%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    gap: 6,
  },
  actionDanger: { backgroundColor: COLORS.dangerSoft, borderColor: '#F0C0C0' },
  actionText: { fontSize: 11, fontWeight: '600', color: COLORS.ink },

  btnGreen: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  earnHero: { backgroundColor: '#0F1A14', paddingVertical: 18, paddingHorizontal: 16 },
  ehLbl: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
    fontWeight: '700',
  },
  ehAmt: { fontFamily: 'monospace', fontSize: 38, color: '#fff', fontWeight: '500', lineHeight: 38 },
  ehChg: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 5 },
  ehUp: { color: '#4ade80', fontWeight: '600' },
  ehKpis: {
    flexDirection: 'row',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  ehk: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  ehkV: { fontSize: 14, fontFamily: 'monospace', color: '#fff', fontWeight: '500' },
  ehkL: { fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2, textTransform: 'uppercase' },

  periodRow: {
    flexDirection: 'row',
    gap: 4,
    padding: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  prBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 7 },
  prBtnOn: { backgroundColor: COLORS.ink },
  prLbl: { fontSize: 10, color: COLORS.soft, fontWeight: '600' },
  prLblOn: { color: '#fff' },

  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
    ...shadow('rgba(15,26,20,0.07)'),
  },
  chartTitle: { fontSize: 11, fontWeight: '700', color: COLORS.ink, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, height: 72 },
  barWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', gap: 4, height: '100%' },
  bar: { width: '100%', minHeight: 4, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: COLORS.primaryBorder },
  barToday: { backgroundColor: COLORS.primary },
  barLbl: { fontSize: 8, color: COLORS.soft },
  barLblToday: { color: COLORS.primary, fontWeight: '700' },
  chartFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cfNote: { fontSize: 10, color: COLORS.soft },

  txCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    overflow: 'hidden',
    ...shadow('rgba(15,26,20,0.07)'),
  },
  txHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  txHeaderTitle: { fontSize: 11, fontWeight: '700', color: COLORS.ink, textTransform: 'uppercase', letterSpacing: 1.1 },
  txHeaderDate: { fontSize: 11, color: COLORS.soft, fontWeight: '600' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDetails: { flex: 1, justifyContent: 'center' },
  txTitle: { fontSize: 14, fontWeight: '700', color: COLORS.ink, marginBottom: 3 },
  txMeta: { fontSize: 11, color: COLORS.soft, fontWeight: '500' },
  txRight: { alignItems: 'flex-end', justifyContent: 'center' },
  txAmountPlus: { fontSize: 15, fontFamily: 'monospace', color: COLORS.success, fontWeight: '700', marginBottom: 2 },
  txAmountWarn: { fontSize: 15, fontFamily: 'monospace', color: COLORS.warning, fontWeight: '700', marginBottom: 2 },
  txAmountMinus: { fontSize: 15, fontFamily: 'monospace', color: COLORS.danger, fontWeight: '700', marginBottom: 2 },
  txStatusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  scoreCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    ...shadow('rgba(15,26,20,0.07)'),
  },
  scoreRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { fontSize: 20, fontFamily: 'monospace', color: COLORS.primary, fontWeight: '500' },
  scoreTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink },
  scoreSub: { fontSize: 11, color: COLORS.soft, marginTop: 3 },
  scorePill: {
    marginTop: 6,
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  metricInfo: { flex: 1 },
  metricName: { fontSize: 12, fontWeight: '600', color: COLORS.ink },
  metricSub: { fontSize: 10, color: COLORS.soft, marginTop: 1 },
  metricBarBg: { width: 78, height: 5, borderRadius: 3, backgroundColor: COLORS.bg, overflow: 'hidden' },
  metricBarFill: { height: '100%', borderRadius: 3 },
  metricVal: { width: 42, textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: COLORS.ink },

  tipBoxWarn: { backgroundColor: COLORS.warningSoft, borderWidth: 1, borderColor: '#ECD88A', borderRadius: 9, padding: 10, marginBottom: 8 },
  tipBoxSoft: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, padding: 10 },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  tipHeadText: { fontSize: 10, fontWeight: '700', color: COLORS.warning, textTransform: 'uppercase', letterSpacing: 0.4 },
  tipHeadTextSoft: { fontSize: 10, fontWeight: '700', color: COLORS.soft, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  tipText: { fontSize: 11, color: COLORS.mid, lineHeight: 16 },

  filterRow: { flexDirection: 'row', gap: 5, padding: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  ftag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  ftagOn: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  ftagText: { fontSize: 10, color: COLORS.soft, fontWeight: '600' },
  ftagTextOn: { color: '#fff' },
  sectionLbl: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.soft,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  docAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: '#F0C0C0',
    borderRadius: 9,
    padding: 11,
    marginBottom: 10,
  },
  docAlertText: { flex: 1, fontSize: 12, color: COLORS.mid, lineHeight: 16 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  docIco: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  docOk: { backgroundColor: COLORS.successSoft, borderColor: COLORS.primaryBorder },
  docPend: { backgroundColor: COLORS.warningSoft, borderColor: '#E8C87A' },
  docMiss: { backgroundColor: COLORS.dangerSoft, borderColor: '#F0C0C0' },
  docInfo: { flex: 1 },
  docName: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  docSub: { fontSize: 10, color: COLORS.soft, marginTop: 2 },
  docBadge: { fontSize: 9, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, overflow: 'hidden' },
  dbOk: { backgroundColor: COLORS.successSoft, color: COLORS.success } as any,
  dbPend: { backgroundColor: COLORS.warningSoft, color: COLORS.warning } as any,
  dbMiss: { backgroundColor: COLORS.dangerSoft, color: COLORS.danger } as any,

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  closeBtn: { width: 30, height: 30, alignItems: 'flex-end', justifyContent: 'center' },
  closeBtnText: { fontSize: 24, color: COLORS.soft, lineHeight: 24 },
  docPreviewWrap: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docPreviewImg: { width: '100%', height: '100%' },
  docEmptyWrap: { alignItems: 'center', gap: 8 },
  docEmptyText: { color: COLORS.mute, fontSize: 13, fontWeight: '600' },
  docActions: { flexDirection: 'row', gap: 10 },
  docActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 9,
  },
  docActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  docProgressWrap: { marginTop: 16 },
  docSuccessWrap: { marginTop: 16, alignItems: 'center' },
  docSuccessText: { fontSize: 14, color: COLORS.success, fontWeight: '600', marginBottom: 10 },

  progressBg: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' },
  progressText: { fontSize: 12, color: COLORS.soft, fontWeight: '600' },

  supRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  supIco: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  supInfo: { flex: 1 },
  supTitle: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  supSub: { fontSize: 10, color: COLORS.soft, marginTop: 2 },
  supBadge: { fontSize: 9, fontWeight: '700', backgroundColor: COLORS.dangerSoft, color: COLORS.danger, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, overflow: 'hidden' },
  supArr: { fontSize: 16, color: COLORS.mute },

  dispPanel: { display: 'none' },
  dispPanelOn: {
    display: 'flex',
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 13,
    paddingHorizontal: 14,
  },
  dpLbl: { fontSize: 9, fontWeight: '700', color: COLORS.soft, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  dpInp: {
    width: '100%',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    fontSize: 12,
    color: COLORS.ink,
    marginBottom: 9,
  },
  dpTa: {
    width: '100%',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    fontSize: 12,
    color: COLORS.ink,
    minHeight: 76,
    marginBottom: 9,
  },
  redBtn: {
    width: '100%',
    marginTop: 10,
    paddingVertical: 12,
    backgroundColor: COLORS.danger,
    borderRadius: 9,
    alignItems: 'center',
  },
  redBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  scannerWrap: { flex: 1, backgroundColor: '#000' },
  simWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  simText: { color: 'white', fontSize: 18, marginBottom: 20, textAlign: 'center' },
  scanOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: '#fff', borderRadius: 20, backgroundColor: 'transparent' },
  scanText: {
    color: 'white',
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  closeScan: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },

  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 12,
    padding: 10,
    borderRadius: 9,
    color: COLORS.ink,
    backgroundColor: COLORS.white,
  },
  modalTextarea: { minHeight: 100, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.bg, alignItems: 'center' },
  modalCancelText: { color: COLORS.ink, fontWeight: '600' },
  modalSend: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSendText: { color: '#fff', fontWeight: '700' },

  chatModalCard: {
    position: 'absolute',
    top: 40,
    left: 12,
    right: 12,
    bottom: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  chatTitle: { fontWeight: '800', fontSize: 16, color: '#111827' },
  chatSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  chatCloseBtn: { padding: 8 },
  chatComposer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 8,
    color: '#111827',
  },
  chatSendBtn: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 12,
  },
  chatHeadsetBtn: {
    marginLeft: 8,
    padding: 10,
  },

  tabbar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 2, gap: 3 },
  tabIcoWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  tabLbl: { fontSize: 9, color: COLORS.mute, fontWeight: '600' },
  tabLblOn: { color: COLORS.primary },

  smallBlueBtn2: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  smallWhiteBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
