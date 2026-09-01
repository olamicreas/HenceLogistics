// src/context/AppProvider.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { View, Text, Alert, Platform, AppState, Animated, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useStripe } from '@stripe/stripe-react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as ImagePicker from 'expo-image-picker';



const API_URL = 'https://hencedelivery.com';

export const BASE_URL = API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

const ENDPOINTS = {
  LOGIN: '/auth/token',
  REGISTER: '/auth/register',

  USER_ME: 'auth/users/me',
  USER_PUSH_TOKEN: '/auth/users/me/push-token',

  DRIVER_JOBS: '/driver/jobs',
  DRIVER_ACCEPT_OFFER: (offerId: number) => `/driver/offers/${offerId}/accept`,
  DRIVER_DECLINE_OFFER: (offerId: number) => `/driver/offers/${offerId}/decline`,
  DRIVER_ACCEPT_JOB: (jobId: number) => `/driver/jobs/${jobId}/accept`,
  DRIVER_DECLINE_JOB: (jobId: number) => `/driver/jobs/${jobId}/decline`,
  DRIVER_PICKUP_JOB: (jobId: number) => `/driver/jobs/${jobId}/picked-up`,
  DRIVER_DELIVER_JOB: (jobId: number) => `/driver/jobs/${jobId}/delivered`,
  DRIVER_PROOF_JOB: (jobId: number) => `/driver/jobs/${jobId}/proof`,
  DRIVER_OFFERS: '/driver/offers',
  DRIVER_LOCATION: '/driver/location',
  DRIVER_RATE: (driverId: number) => `/driver/${driverId}/rate`,
  DRIVER_PROFILE: (driverId: number) => `/drivers/${driverId}`,

  USER_PROFILE_BY_ID: (userId: number) => `/users/${userId}`,

  BOOKINGS_QUOTE: '/bookings/quote',
  BOOKINGS_CREATE: '/bookings/create',
  BOOKINGS_ACTIVE: '/bookings/active',
  BOOKING_ACKNOWLEDGE: (bookingId: number) => `/bookings/${bookingId}/acknowledge`,

  JOBS_HISTORY: '/jobs/history',

  PAYMENT_CREATE_BOOKING: '/payments/create-booking-payment',
  PAYMENT_CREATE_SUBSCRIPTION: '/payments/create-subscription-session',

  SUPPORT_MESSAGE: '/support/message',
  SUPPORT_TICKET: '/support/ticket',
};

const BACKGROUND_LOCATION_TASK = 'HENCE_BACKGROUND_LOCATION_TASK';

const normalizeUrl = (url: string | null | undefined) => {
  if (!url || typeof url !== 'string') return null;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://')
  ) {
    return url;
  }
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_URL}${path}`;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  if (!data) return;

  try {
    const { locations } = data as any;
    if (!locations?.length) return;

    const loc = locations[0];
    const token = await AsyncStorage.getItem('token');
    
    if (!token) return;

    await axios.post(
      `${API_URL}${ENDPOINTS.DRIVER_LOCATION}`,
      {
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        ts: loc.timestamp,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 7000,
      }
    );
  } catch {}
});

type CurrentScreen = 'login' | 'home' | 'create-job' | 'profile' | 'subscription' | 'account-hub' | 'support' | 'settings' | 'delete';
type BottomTab = 'home' | 'rides' | 'account';

export interface RouteStop {
  id: string;
  address: string;
  lat: number | null;
  lon: number | null;
  recipient?: string;
  phone?: string;
  instructions?: string;
  items?: Array<{
    description: string;
    qty: string;
    weight: string;
    ref: string;
  }>;
  ref?: string;
  weight?: number | null;
  jobType?: string | null;
  categoryId?: string | null;
  itemPhotos?: string[];
  service?: any;
}

interface AppContextType {
  token: string | null;
  setToken: (t: string | null) => void;

  user: any;
  setUser: (u: any) => void;

  loading: boolean;
  setLoading: (l: boolean) => void;

  currentScreen: CurrentScreen;
  setCurrentScreen: (s: CurrentScreen) => void;

  bottomTab: BottomTab;
  setBottomTab: (t: BottomTab) => void;

  pickupAddr: string;
  setPickupAddr: (s: string) => void;

  pickupCoord: { latitude: number; longitude: number };
  setPickupCoord: (c: { latitude: number; longitude: number }) => void;

  stops: RouteStop[];
  setStops: (stops: RouteStop[]) => void;
  addStop: () => void;
  removeStop: (index: number) => void;
  updateStop: (index: number, field: string, value: any) => void;

  activeSearchIndex: number;
  setActiveSearchIndex: (i: number) => void;
  pickupSuggestions: any[];
  setPickupSuggestions: (s: any[]) => void;
  dropoffSuggestions: any[];
  setDropoffSuggestions: (s: any[]) => void;
  updateDriverStatus: (status: string) => Promise<any>;

  availableJobs: any[];
  setAvailableJobs: (j: any[]) => void;
  activeJobs: any[];
  setActiveJobs: (j: any[]) => void;
  rideHistory: any[];
  setRideHistory: (h: any[]) => void;

  isPremium: boolean;
  setIsPremium: (p: boolean) => void;
  subscriptionLoading: boolean;
  setSubscriptionLoading: (l: boolean) => void;
  subscriptionPolling: boolean;
  setSubscriptionPolling: (p: boolean) => void;

  quoteModalVisible: boolean;
  setQuoteModalVisible: (v: boolean) => void;
  quoteData: any;
  setQuoteData: (d: any) => void;
  creatingBooking: boolean;
  setCreatingBooking: (c: boolean) => void;

  menuVisible: boolean;
  setMenuVisible: (v: boolean) => void;
  mapFormExpanded: boolean;
  setMapFormExpanded: (e: boolean) => void;

  activeBooking: any | null;
  setActiveBooking: (b: any | null) => void;
  trackingEnabled: boolean;
  setTrackingEnabled: (e: boolean) => void;
  driverLocation: { lat: number; lon: number } | null;
  setDriverLocation: (l: { lat: number; lon: number } | null) => void;

  editingProfile: boolean;
  setEditingProfile: (e: boolean) => void;
  profileDraft: any;
  setProfileDraft: (d: any) => void;

  mapRef: React.MutableRefObject<any>;
  progressAnim: Animated.Value;
  etaSeconds: number | null;
  setEtaSeconds: (s: number | null) => void;

  isRegister: boolean;
  setIsRegister: (v: boolean) => void;
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  selectedRole: string;
  setSelectedRole: (v: string) => void;
  roleModalVisible: boolean;
  setRoleModalVisible: (v: boolean) => void;

  bookingMode: 'single' | 'multi';
  setBookingMode: (m: 'single' | 'multi') => void;
  vanType: string;
  setVanType: (v: string) => void;
  jobType: string;
  setJobType: (v: string) => void;
  manService: number;
  setManService: (n: number) => void;
  followDriver: boolean;
  setFollowDriver: (b: boolean) => void;
  isScheduled: boolean;
  setIsScheduled: (v: boolean) => void;
  scheduleTime: Date | null;
  setScheduleTime: (d: Date | null) => void;
  packagePhotos: string[];
  setPackagePhotos: (p: string[]) => void;

  pricePreview: any | null;
  setPricePreview: (p: any | null) => void;
  calculatePrice: (extraData?: any) => Promise<any>;
  pendingVanType: string | null;
  setPendingVanType: (v: string | null) => void;

  mapPickTarget: number | null;
  setMapPickTarget: (i: number | null) => void;
  reverseGeocode: (lat: number, lon: number) => Promise<string>;

  handleAuth: (extraData?: any) => Promise<void>;
  fetchUser: (t: string) => Promise<void>;
  logout: () => Promise<void>;

  refreshDriverJobs: () => Promise<void>;
  acceptJob: (offerId: number) => Promise<any>;
  declineJob: (offerId: number) => Promise<any>;
  fetchRideHistory: () => Promise<any[]>;
  pollActiveBooking: () => Promise<void>;

  scheduleSearch: (query: string, idx: number) => void;
  runSearch: (query: string, idx: number) => Promise<void>;
  useMyLocation: (idx: number) => Promise<void>;
  selectSearchResult: (idx: number, item: any) => void;

  openQuoteFlow: (payload?: any) => Promise<void>;
  confirmAndPayAndCreateBooking: () => Promise<void>;

  startDriverSubscription: (tier?: 'basic' | 'professional') => Promise<void>;
  checkSubscriptionStatus: (silent?: boolean) => Promise<void>;
  startSubscriptionPolling: () => void;
  stopSubscriptionPolling: () => void;

  saveProfile: () => Promise<void>;
  openNavigationToJob: (job: any) => void;
  markPickedUp: (jobId: number) => Promise<void>;
  markDelivered: (jobId: number) => Promise<void>;

  requestDriverStartSharing: (bookingId: number) => Promise<any>;
  uploadDeliveryProof: (
    bookingId: number,
    localUri: string
  ) => Promise<{ ok: boolean; url?: string; error?: any }>;
  pickAndUploadProof: (
    bookingId: number
  ) => Promise<void | { ok: boolean; url?: string; error?: any }>;

  rateDriver: (
    driverId: number,
    rating: number,
    note?: string,
    bookingId?: number
  ) => Promise<{ ok: boolean; rating_avg?: number; rating_count?: number }>;

  fetchDriverProfile: (driverId: number) => Promise<any>;
  getDriverFromCache: (driverId?: number | null) => any;
  driverCache: Record<number, any>;

  acknowledgeBooking: (bookingId: number) => Promise<void>;

  stopDetailsIndex: number | null;
  setStopDetailsIndex: (i: number | null) => void;
  openStopDetails: (i: number) => void;
  closeStopDetails: () => void;

  sendSupportMessage: (payload: any) => Promise<{ ok: boolean; data?: any }>;
  createSupportTicket: (payload: any) => Promise<{ ok: boolean; data?: any }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const driverWsRef = useRef<any>(null);
  const customerWsRef = useRef<any>(null);
  const wsReconnectRef = useRef<{ attempts: number; timer: any }>({
    attempts: 0,
    timer: null,
  });
  const subscriptionPollRef = useRef<any>(null);
  const currentBookingRef = useRef<number | null>(null);
  const lastDriverIdRef = useRef<number | null>(null);
  const etaIntervalRef = useRef<any>(null);
  const pollRef = useRef<any>(null);
  const searchTimerRef = useRef<any>(null);
  const bgLocationRunningRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const tokenRef = useRef<string | null>(null);
  const bookingDraftRef = useRef<any>(null);
  const [driverScreenIndex, setDriverScreenIndex] = useState(0);


  const mapRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [currentScreen, setCurrentScreen] =
    useState<CurrentScreen>('login');
  const [bottomTab, setBottomTab] = useState<BottomTab>('home');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const [pickupAddr, setPickupAddr] = useState('');
  const [pickupCoord, setPickupCoord] = useState({
    latitude: 6.5244,
    longitude: 3.3792,
  });

  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '' });
  const alertAnim = useRef(new Animated.Value(-150)).current;

  const showAnimatedAlert = (title: string, message: string) => {
    setCustomAlert({ visible: true, title, message });
    
    Animated.spring(alertAnim, {
      toValue: Platform.OS === 'ios' ? 60 : 40,
      useNativeDriver: true,
      bounciness: 12,
    }).start();

    setTimeout(() => {
      Animated.timing(alertAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCustomAlert({ visible: false, title: '', message: '' });
      });
    }, 4000);
  };

  // 👇 4. THE GLOBAL ALERT HIJACKER
  useEffect(() => {
    const originalAlert = Alert.alert;
    Alert.alert = (title, message, buttons, options) => {
      const hasActionableButtons = buttons && buttons.some(btn => btn.onPress);
      if (hasActionableButtons) {
        originalAlert(title, message, buttons, options);
      } else {
        showAnimatedAlert(title || 'Notification', message || '');
      }
    };
    return () => {
      Alert.alert = originalAlert;
    };
  }, []);


  const updateDriverStatus = async (status: string) => {
    try {
      const res = await api.post(
        '/driver/status',
        { status },
        { headers: authHeaders() }
      );

      setUser((prev: any) =>
        prev ? { ...prev, operational_status: status } : prev
      );

      return res.data;
    } catch (e: any) {
      throw new Error(
        e?.response?.data?.detail || e?.message || 'Could not update driver status'
      );
    }
  };

  const [stops, setStops] = useState<RouteStop[]>([
    {
      id: 'stop_1',
      address: '',
      lat: null,
      lon: null,
      recipient: '',
      phone: '',
      instructions: '',
      items: [{ description: '', qty: '1', weight: '', ref: '' }],
      ref: '',
      weight: null,
      jobType: null,
      categoryId: null,
      itemPhotos: [],
      service: null,
    },
  ]);

  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([]);

  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [rideHistory, setRideHistory] = useState<any[]>([]);

  const [activeBooking, setActiveBooking] = useState<any | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);

  const [bookingMode, setBookingMode] = useState<'single' | 'multi'>('single');
  const [vanType, setVanType] = useState<string>('large');
  const [jobType, setJobType] = useState<string>('');
  const [manService, setManService] = useState<number>(1);
  const [followDriver, setFollowDriver] = useState<boolean>(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState<Date | null>(null);
  const [packagePhotos, setPackagePhotos] = useState<string[]>([]);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [pricePreview, setPricePreview] = useState<any | null>(null);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [pendingVanType, setPendingVanType] = useState<string | null>(null);

  const [menuVisible, setMenuVisible] = useState(false);
  const [mapFormExpanded, setMapFormExpanded] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<any>({});

  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionPolling, setSubscriptionPolling] = useState(false);

  const [mapPickTarget, setMapPickTarget] = useState<number | null>(null);

  const [driverCache, setDriverCache] = useState<Record<number, any>>({});

  const [stopDetailsIndex, setStopDetailsIndex] = useState<number | null>(null);
  const openStopDetails = (i: number) => setStopDetailsIndex(i);
  const closeStopDetails = () => setStopDetailsIndex(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const authHeaders = (overrideToken?: string | null) => {
    const t = overrideToken ?? tokenRef.current ?? token;
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const stopEtaInterval = () => {
    if (etaIntervalRef.current) {
      clearInterval(etaIntervalRef.current);
      etaIntervalRef.current = null;
    }
  };

  const startEtaInterval = () => {
    if (etaIntervalRef.current) return;
    etaIntervalRef.current = setInterval(() => {
      setEtaSeconds((prev) => {
        if (prev == null) return null;
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  };

  const stopSubscriptionPolling = () => {
    if (subscriptionPollRef.current) {
      clearInterval(subscriptionPollRef.current);
      subscriptionPollRef.current = null;
    }
    setSubscriptionPolling(false);
  };

  const startSubscriptionPolling = () => {
    if (subscriptionPollRef.current) return;
    setSubscriptionPolling(true);
    subscriptionPollRef.current = setInterval(async () => {
      await checkSubscriptionStatus(true);
    }, 3000);
  };

  const normalizeProfile = (raw: any) => {
    if (!raw) return null;
    return {
      id: raw.id ?? raw.user_id ?? raw.driver_id ?? null,
      full_name:
        raw.full_name ||
        raw.name ||
        raw.display_name ||
        raw.username ||
        raw.driver_name ||
        null,
      avatar_url:
        normalizeUrl(
          raw.avatar_url ||
            raw.avatar ||
            raw.profile_picture ||
            raw.photo_url ||
            raw.driver_avatar
        ) || null,
      phone: raw.phone || raw.phone_number || raw.driver_phone || null,
      vehicle: raw.vehicle || raw.driver_vehicle || null,
      rating: raw.rating || raw.avg_rating || raw.driver_rating || null,
      raw,
    };
  };

  const fetchDriverProfile = async (driverId: number) => {
    if (!driverId) return null;
    if (driverCache[driverId]) return driverCache[driverId];

    try {
      let res: any = null;

      try {
        res = await api.get(ENDPOINTS.DRIVER_PROFILE(driverId), {
          headers: authHeaders(),
        });
      } catch {
        try {
          res = await api.get(ENDPOINTS.USER_PROFILE_BY_ID(driverId), {
            headers: authHeaders(),
          });
        } catch {
          res = null;
        }
      }

      const profile = normalizeProfile(res?.data ?? null);
      if (profile?.id) {
        setDriverCache((prev) => ({ ...prev, [profile.id]: profile }));
      }
      return profile;
    } catch {
      return null;
    }
  };

  const getDriverFromCache = (driverId?: number | null) => {
    if (!driverId) return null;
    return driverCache[driverId] ?? null;
  };

  const startBackgroundLocationUpdates = async () => {
    try {
      if (bgLocationRunningRef.current) return;

      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') return;

      const { status: bgStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.warn('Background location permission not granted');
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'HENCE Driver',
          notificationBody: 'Sharing your location with customer',
        },
      });

      bgLocationRunningRef.current = true;
    } catch (e) {
      console.warn('Error starting background location', e);
    }
  };

  const stopBackgroundLocationUpdates = async () => {
    try {
      if (bgLocationRunningRef.current) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        bgLocationRunningRef.current = false;
      }
    } catch {}
  };

  const checkSubscriptionStatus = async (silent = false) => {
    const currentToken = tokenRef.current || token;
    if (!currentToken) return;

    if (!silent) setLoading(true);

    try {
      // 1. Fetch fresh data from the backend
      const res = await api.get(`${ENDPOINTS.USER_ME}?ts=${Date.now()}`, {
        headers: authHeaders(currentToken),
      });

      const userData = res.data;
     
      const premiumFlag = !!userData?.is_premium || userData?.subscription_tier === 'Professional' || userData?.subscription_tier === 'professional';

      if (premiumFlag) {
        // 2. Globally update the user state so the whole app knows they are Pro
        setIsPremium(true);
        setUser(userData);
        setProfileDraft(userData);

        // 3. Stop background polling if it was running
        if (subscriptionPollRef?.current) stopSubscriptionPolling();

        // 4. Only show the alert if this was a manual button press, 
        // to avoid double-alerts after the verifyPayment success popup.
        if (!silent) {
          Alert.alert('Status', 'Your subscription is active.');
        }

        // 5. Navigate them out of the Subscription screen to see their new badge
        if (currentScreen === 'subscription') {
          setCurrentScreen('home');
          setBottomTab('account'); // Route to Profile tab to see the Pro Badge
        }

        // 6. Refresh the job queue so they immediately see higher limits / better jobs
        if (userData.role === 'driver' && typeof refreshDriverJobs === 'function') {
          await refreshDriverJobs();
        }
        
      } else if (!silent) {
        Alert.alert(
          'Status',
          'Subscription not active yet. If you just paid, please check again in a moment.'
        );
      }
    } catch {
      if (!silent) {
        Alert.alert(
          'Error',
          'Could not check subscription status. Please check your internet connection.'
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const addStop = () => {
    const lastIndex = stops.length - 1;
    const last = stops[lastIndex];

    if (last) {
      const missingJobType = !last.jobType;
      const missingWeight =
        !(typeof last.weight === 'number' && !Number.isNaN(last.weight));

      if (missingJobType || missingWeight) {
        setStopDetailsIndex(lastIndex);
        return;
      }
    }

    const nextIndex = stops.length;

    setStops((prev) => [
      ...prev,
      {
        id: `stop_${Date.now()}`,
        address: '',
        lat: null,
        lon: null,
        recipient: '',
        phone: '',
        instructions: '',
        items: [{ description: '', qty: '1', weight: '', ref: '' }],
        ref: '',
        weight: null,
        jobType: null,
        categoryId: null,
        itemPhotos: [],
        service: null,
      },
    ]);

    setStopDetailsIndex(nextIndex);
  };

  const removeStop = (idx: number) => {
    if (stops.length <= 1) return;
    setStops((prev) => prev.filter((_, i) => i !== idx));
    if (stopDetailsIndex === idx) closeStopDetails();
  };

  const updateStop = (idx: number, field: string, value: any) => {
    setStops((prev) => {
      const copy = [...prev];
      if (!copy[idx]) return prev;
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const searchTimeout = useRef(null);
  const GOOGLE_MAPS_API_KEY = 'AIzaSyCnt02Uotcj2lXun70USSQ2hRsOcDXrZLY';

  const scheduleSearch = (text, index) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!text || text.length < 3) {
      if (index === -1) setPickupSuggestions([]);
      else setDropoffSuggestions([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      try {
        const cleanText = text.trim();
        
        // 1. Check if it looks like an Eircode (e.g., D02 X285 or D02X285)
        const isEircodeFormat = /\b[A-Za-z0-9]{3}\s?[A-Za-z0-9]{4}\b/i.test(cleanText);

        if (isEircodeFormat) {
          // 🔥 It's an Eircode! Hit the Geocoding API directly for a perfect match
          const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanText)}&components=country:ie&key=${GOOGLE_MAPS_API_KEY}`;
          const geoRes = await fetch(geoUrl);
          const geoData = await geoRes.json();

          if (geoData.status === 'OK' && geoData.results.length > 0) {
            const result = geoData.results[0];
            const formatted = [{
              display_name: `📍 Eircode Match: ${result.formatted_address}`,
              lat: result.geometry.location.lat,
              lon: result.geometry.location.lng,
              isExact: true // Flag to skip the second Geocode lookup later
            }];
            
            if (index === -1) setPickupSuggestions(formatted);
            else setDropoffSuggestions(formatted);
            return; // Stop here, we got our perfect match!
          }
        }

        // 🌍 2. Standard Text? Hit the Autocomplete API
        const autoUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(cleanText)}&components=country:ie&key=${GOOGLE_MAPS_API_KEY}`;
        const autoRes = await fetch(autoUrl);
        const autoData = await autoRes.json();

        if (autoData.status === 'OK') {
          const formattedSuggestions = autoData.predictions.map(p => ({
            display_name: p.description,
            place_id: p.place_id,
            isExact: false
          }));

          if (index === -1) setPickupSuggestions(formattedSuggestions);
          else setDropoffSuggestions(formattedSuggestions);
        } else {
          // Clear if nothing is found
          if (index === -1) setPickupSuggestions([]);
          else setDropoffSuggestions([]);
        }
      } catch (error) {
        console.error("Search Error:", error);
      }
    }, 400); 
  };

  const selectSearchResult = async (index, item) => {
    try {
      let lat = item.lat;
      let lng = item.lon;

      // 🔥 If it came from Autocomplete (not an exact Eircode), fetch the coordinates using place_id
      if (!item.isExact && item.place_id) {
        const detailUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${item.place_id}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(detailUrl);
        const data = await res.json();

        if (data.status === 'OK') {
          lat = data.results[0].geometry.location.lat;
          lng = data.results[0].geometry.location.lng;
        } else {
          console.error("Geocode Lookup Failed:", data.status);
          return;
        }
      }

      // 🧹 Clean up the "📍 Eircode Match: " tag before saving it to the UI
      const cleanAddress = item.display_name.replace('📍 Eircode Match: ', '');

      if (index === -1) {
        setPickupAddr(cleanAddress);
        setPickupCoord({ latitude: lat, longitude: lng });
        setPickupSuggestions([]);
      } else {
        updateStop(index, 'address', cleanAddress);
        updateStop(index, 'lat', lat);
        updateStop(index, 'lon', lng);
        setDropoffSuggestions([]);
      }
      
    } catch (error) {
      console.error("Selection Error:", error);
    }
    
    setActiveSearchIndex(null);
  };

  const runSearch = async (query: string, idx: number) => {
    if (!query || query.trim().length < 2) return;

    try {
      // Added countrycodes=ie to prioritize Ireland results (remove if global)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ie`;

      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          // Nominatim REQUIRES an email in the User-Agent or it blocks you
          'User-Agent': 'HenceApp/1.0 (support@hencelogistics.com)', 
        },
      });

      const data = await res.json();

      if (idx === -1) setPickupSuggestions(data || []);
      else setDropoffSuggestions(data || []);
    } catch (error) {
      console.log("Search error:", error);
    }
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const res = await fetch(url, {
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'HenceApp/1.0 (support@hencelogistics.com)' 
        },
      });
      const data = await res.json();
      return data?.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }
  };





  const useMyLocation = async (idx: number) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      const address = await reverseGeocode(lat, lon);

      if (idx === -1) {
        setPickupAddr(address);
        setPickupCoord({ latitude: lat, longitude: lon });
      } else {
        updateStop(idx, 'address', address);
        updateStop(idx, 'lat', lat);
        updateStop(idx, 'lon', lon);
      }

      try {
        mapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          500
        );
      } catch {}
    } catch {
      Alert.alert('Error', 'Could not get current location.');
    }
  };

  // --- Distance Math Helpers ---
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const haversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    return +haversineKm(lat1, lon1, lat2, lon2).toFixed(3);
  };

  const calculatePrice = async (extraData?: any) => {
    try {
      const validStops = stops.filter((s) => s.lat != null && s.lon != null && s.address);
      if (!pickupCoord || validStops.length === 0) return null;

      // 1. Guaranteed Local Distance Calculation
      let totalKm = 0;
      const waypoints = [
        { lat: pickupCoord.latitude, lon: pickupCoord.longitude },
        ...validStops.map(s => ({ lat: s.lat as number, lon: s.lon as number }))
      ];
      
      for (let i = 0; i < waypoints.length - 1; i++) {
        totalKm += haversineDistanceKm(waypoints[i].lat, waypoints[i].lon, waypoints[i+1].lat, waypoints[i+1].lon);
      }
      
      // Fallback to 5.0km if math results in 0 or NaN
      if (!totalKm || isNaN(totalKm) || totalKm <= 0) {
        totalKm = 5.0; 
      }

      const last = validStops[validStops.length - 1];
      const resolvedJobType = extraData?.job_type || extraData?.service?.id || extraData?.jobType || jobType || validStops[0]?.jobType || 'p1';
      const resolvedVanType = extraData?.van_type || extraData?.vanType || vanType || 'cargo';
      const totalWeight = validStops.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);

      const quotePayload = {
        pickup_lat: pickupCoord.latitude,
        pickup_lon: pickupCoord.longitude,
        pickup_address: pickupAddr,
        dropoff_lat: last.lat,
        dropoff_lon: last.lon,
        dropoff_address: last.address,
        distance: totalKm,
        van_type: resolvedVanType,
        job_type: resolvedJobType,
        man_service: manService,
        follow_driver: followDriver,
        when: isScheduled && scheduleTime ? scheduleTime.toISOString() : new Date().toISOString(),
        mode: bookingMode,
        stop_count: validStops.length,
        total_weight: totalWeight,
        stops: validStops.map((s) => ({
          address: s.address,
          lat: s.lat,
          lon: s.lon,
          recipient: s.recipient || '',
          phone: s.phone || '',
          instructions: s.instructions || '',
          items: s.items || [],
          weight: s.weight || 0,
          ref: s.ref || '',
        })),
      };

      bookingDraftRef.current = {
        ...quotePayload,
        service: extraData?.service || null,
      };

      // 2. Delegate to Backend
      const res = await api.post(ENDPOINTS.BOOKINGS_QUOTE, quotePayload, {
        headers: authHeaders(),
      });

      const server = res.data;
      if (server && server.price !== undefined) {
        const serverQuote = {
          distance_km: server.distance_km || totalKm,
          duration_min: server.duration_min || Math.ceil((totalKm / 30) * 60),
          final_price: server.price,
          price_cents: server.price_cents,
          van_type: resolvedVanType,
          job_type: resolvedJobType,
          follow_driver: followDriver,
          mode: bookingMode,
          stop_count: validStops.length,
          source: 'server',
          computed_at: new Date().toISOString(),
          price_breakdown: server.breakdown || server.price_breakdown || {},
          server_raw: server,
        };

        setPricePreview(serverQuote);
        setQuoteData(serverQuote);
        bookingDraftRef.current = {
          ...(bookingDraftRef.current || {}),
          server_quote: serverQuote,
        };

        return serverQuote;
      } else {
         throw new Error("Backend did not return a valid price format.");
      }
    } catch (error: any) {
      // 3. Robust Error Extraction
      const msg = error?.response?.data?.detail || error?.message || "Failed to calculate pricing.";
      console.log("Backend pricing failed:", msg);
      
      // Bubble the actual error up to the UI alert
      throw new Error(msg); 
    }
  };

  const openQuoteFlow = async (payload?: any) => {
    const validStops = stops.filter((s) => s.lat && s.lon);
    if (!pickupCoord || validStops.length === 0) {
      Alert.alert('Missing Info', 'Select pickup and drop-off.');
      return;
    }

    setLoading(true);
    setQuoteData(null);
    setPricePreview(null);
    setQuoteModalVisible(true);

    try {
      const result = await calculatePrice(payload ?? {});
      if (!result) {
        throw new Error("Could not compute a price. Please try again.");
      }
      setQuoteData(result);
    } catch (error: any) {
      Alert.alert('Price Error', error.message || 'Could not compute a price.');
      setQuoteModalVisible(false);
    } finally {
      setLoading(false);
    }
  };



  const confirmAndPayAndCreateBooking = async () => {
    try {
      const validStops = stops.filter((s) => s.lat && s.lon && s.address);
      if (!pickupCoord || validStops.length === 0) {
        Alert.alert('Error', 'Pickups and dropoffs required');
        return;
      }

      const draft = bookingDraftRef.current || {};
      let quote = pricePreview || quoteData;

      if (!quote) {
        quote = await calculatePrice(draft);
        if (!quote) {
          Alert.alert('Error', 'Could not compute price.');
          return;
        }
      }

      const last = validStops[validStops.length - 1];

      // Add this line right before defining 'const body = {'
      const totalWeight = validStops.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);

      const body = {
        pickup_lat: pickupCoord.latitude,
        pickup_lon: pickupCoord.longitude,
        pickup_address: pickupAddr,
        dropoff_address: last.address,
        dropoff_lat: last.lat,
        dropoff_lon: last.lon,
        stops: validStops.map((s) => ({
          address: s.address,
          lat: s.lat,
          lon: s.lon,
          recipient: s.recipient || '',
          phone: s.phone || '',
          instructions: s.instructions || '',
          items: s.items || [],
          weight: s.weight || 0,
          ref: s.ref || '',
          jobType: s.jobType || null,
          categoryId: s.categoryId || null,
          itemPhotos: s.itemPhotos || [],
        })),
        van_type: vanType,
        job_type:
          draft?.service?.id || draft?.jobType || jobType || validStops[0]?.jobType || '',
        man_service: manService,
        follow_driver: followDriver,
        notes: 'Booking via App',
        distance: quote.distance_km || 0,
        when:
          isScheduled && scheduleTime
            ? scheduleTime.toISOString()
            : new Date().toISOString(),
        mode: bookingMode,

         // ✅ ADD THESE 3 LINES FOR THE IDP ENGINE!
        stop_count: validStops.length,
        total_weight: totalWeight,
        priority: 'standard', 
        
        final_price: quote.final_price || quote.price,
        amount_cents: quote.price_cents || (quote.final_price ? Math.round(quote.final_price * 100) : undefined),
      };
      

      setCreatingBooking(true);

      const payReq = await api.post(ENDPOINTS.PAYMENT_CREATE_BOOKING, body, {
        headers: authHeaders(),
      });

      const raw = payReq.data || {};

      const serverAmountNumber = Number(
        raw.amount ??
          raw.final_price ??
          raw.price ??
          (raw.price_cents ? raw.price_cents / 100 : undefined)
      );

      const serverAmountCents = Number(
        raw.price_cents ??
          (raw.amount ? Math.round(Number(raw.amount) * 100) : undefined) ??
          (raw.final_price
            ? Math.round(Number(raw.final_price) * 100)
            : undefined)
      );

      const clientAmountCents = Math.round(
        Number(quote.final_price || quote.price || 0) * 100
      );

      const effectiveServerCents =
        !Number.isNaN(serverAmountCents) && serverAmountCents > 0
          ? serverAmountCents
          : !Number.isNaN(serverAmountNumber) && serverAmountNumber > 0
          ? Math.round(serverAmountNumber * 100)
          : clientAmountCents;

      const pctDiff =
        Math.abs(effectiveServerCents - clientAmountCents) /
        Math.max(1, Math.max(effectiveServerCents, clientAmountCents));

      if (pctDiff > 0.12) {
        const serverDisplay = effectiveServerCents / 100;
        const updatedQuote = {
          ...quote,
          final_price: serverDisplay,
          server_override: true,
          server_price_raw: raw,
        };

        setQuoteData(updatedQuote);
        setPricePreview(updatedQuote);
        setCreatingBooking(false);

        Alert.alert(
          'Price updated',
          `Server price is €${serverDisplay.toFixed(
            2
          )} (your estimate was €${(clientAmountCents / 100).toFixed(
            2
          )}). Please review before paying.`
        );
        setQuoteModalVisible(true);
        return;
      }

      const clientSecret =
        raw.client_secret || raw.clientSecret || raw.payment_client_secret;
      const paymentIntent =
        raw.payment_intent || raw.paymentIntent || raw.intent_id;

      if (!clientSecret) {
        throw new Error('Payment init failed');
      }

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'HENCE',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      const { error: payError } = await presentPaymentSheet();

      if (payError) {
        throw new Error(payError.message || 'Payment cancelled');
      }

  const createRes = await api.post(
        ENDPOINTS.BOOKINGS_CREATE,
        {
          ...body,
          payment_intent: paymentIntent,
        },
        { headers: authHeaders() }
      );

      const createdBooking = createRes.data;

      Alert.alert('Success', `Booking created!`);

      // 🚨 FIX: Instantly inject the new booking into the global state. 
      // Do not wait for pollActiveBooking to fetch it, or the UI will show the old #8 ID!
      setActiveBooking(createdBooking); 

      setQuoteModalVisible(false);
      setQuoteData(null);
      setPricePreview(null);
      bookingDraftRef.current = null;
      
      // ... (keep the rest of your state resets the same) ...

      setStops([
        {
          id: 'stop_1',
          address: '',
          lat: null,
          lon: null,
          recipient: '',
          phone: '',
          instructions: '',
          items: [{ description: '', qty: '1', weight: '', ref: '' }],
          ref: '',
          weight: null,
          jobType: null,
          categoryId: null,
          itemPhotos: [],
          service: null,
        },
      ]);
      setPickupAddr('');
      setJobType('');
      setManService(1);
      setFollowDriver(false);
      setIsScheduled(false);
      setScheduleTime(null);

      await pollActiveBooking();

      setCurrentScreen('home');
      setBottomTab('home');
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.detail || e?.message || 'Payment failed'
      );
    } finally {
      setCreatingBooking(false);
    }
  };

  const handleAuth = async (extraData: any = {}) => {
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim() || !email.trim() || !password.trim() || !selectedRole) {
          throw new Error('Fill all required fields');
        }

        // 1. Build the base payload for EVERYONE
        const payload: any = {
          email: email.trim(),
          password: password.trim(),
          full_name: fullName.trim(),
          role: selectedRole,
        };

        // Add phone if the UI provided it
        if (extraData.phone) payload.phone = extraData.phone;

        // 2. ONLY add Driver fields if they are a driver!
        if (selectedRole === 'driver') {
          payload.vehicle_type = extraData.vehicle_type || 'cargo';
          
          // 🔥 THE MAGIC FIX: Convert whatever the frontend sent into the array the backend expects
          payload.operator_types = extraData.operator_types 
            ? extraData.operator_types 
            : (extraData.operatorType ? [extraData.operatorType] : []);
            
          if (extraData.driver_node_id) {
             payload.driver_node_id = extraData.driver_node_id;
          }
        }

        // 3. Send the clean payload to FastAPI
        await api.post(ENDPOINTS.REGISTER, payload);

        Alert.alert('Success', 'Account created.');
        setIsRegister(false);
      } else {
        const p = new URLSearchParams();
        p.append('username', email);
        p.append('password', password);

        const res = await api.post(ENDPOINTS.LOGIN, p.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        // 🔥 THE STRICT BARRIER: Prevent cross-login
        const serverRole = res.data.user.role;
        const requestedRole = selectedRole === 'customer' ? 'individual' : 'driver';
        if (selectedRole && serverRole !== requestedRole) {
           throw new Error(`Access Denied: You selected ${selectedRole}, but this account is registered as a ${serverRole}.`);
        }

        const newAccessToken = res.data.access_token;
        await AsyncStorage.setItem('token', newAccessToken);
        setToken(newAccessToken);
        
        // Wait for fetchUser to finish pulling your profile data
        await fetchUser(newAccessToken);
        
        // 🔥 FORCE AUTO-LOAD HISTORY IMMEDIATELY AFTER LOGIN
        if (typeof fetchRideHistory === 'function') {
          await fetchRideHistory();
        }
        
        // Only navigate to the home screen if fetchUser was successful
        setCurrentScreen('home');
        setBottomTab('home');
      }
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.detail || e?.message || 'Auth failed'
      );
    } finally {
      setLoading(false);
    }
  };


  const fetchUser = async (t: string) => {
    try {
      api.defaults.headers.Authorization = `Bearer ${t}`;
      const url = `${ENDPOINTS.USER_ME}?ts=${Date.now()}`;
      const res = await api.get(url, { headers: authHeaders(t) });

      setUser(res.data);
      setProfileDraft(res.data);
      setIsPremium(!!(res.data.stripe_onboarding_complete || res.data.is_premium));

      // 🚨 CRITICAL FIX: Save the user data to physical storage instantly
      await AsyncStorage.setItem('userData', JSON.stringify(res.data));

      try {
        await registerPushToken();
        await fetchRideHistory();
      } catch (backgroundError) {}
      
    } catch (error: any) {
      console.log("🔴 FETCH USER FAILED:", error?.message);
      
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        await logout(); 
      }
      throw new Error("Could not fetch user profile details."); 
    }
  };
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userData'); 
      await AsyncStorage.removeItem('current_booking_id');
     

      setToken(null);
      setUser(null);
      setCurrentScreen('login');
      setBottomTab('home');

      setActiveBooking(null);
      setRideHistory([]);
      setDriverLocation(null);
      setDriverCache({});
      setQuoteData(null);
      setPricePreview(null);
      bookingDraftRef.current = null;

      try {
        driverWsRef.current?.close();
        customerWsRef.current?.close();
      } catch {}

      if (wsReconnectRef.current.timer) {
        clearTimeout(wsReconnectRef.current.timer);
      }

      await stopBackgroundLocationUpdates();
      stopSubscriptionPolling();
      stopEtaInterval();
    } catch {}
  };

  const fetchRideHistory = async () => {
    if (!tokenRef.current && !token) return [];

    try {
      const res = await api.get(ENDPOINTS.JOBS_HISTORY, {
        headers: authHeaders(),
      });

      const mapped = (res.data || []).map((r: any) => ({
        ...r,
        delivery_proof_url: normalizeUrl(r.delivery_proof_url || r.proof_url),
      }));

      setRideHistory(mapped);
      return mapped;
    } catch {
      return [];
    }
  };

const refreshDriverJobs = async () => {
    const currentToken = tokenRef.current || token;
    if (!currentToken || user?.role !== 'driver') return;

    try {
      const [jobsRes, userRes] = await Promise.all([
        api.get(ENDPOINTS.DRIVER_JOBS, {
          headers: authHeaders(currentToken),
        }),
        api.get(`${ENDPOINTS.USER_ME}?ts=${Date.now()}`, {
          headers: authHeaders(currentToken),
        }),
      ]);

      const updatedUser = userRes.data;
      setUser(updatedUser);
      setProfileDraft(updatedUser);
      setIsPremium(!!updatedUser.is_premium);

      const nowTs = Date.now() / 1000;

      const av = (jobsRes.data.available_jobs || [])
        .map((j: any) => ({
          ...j,
          id: j.offer_id || j.booking_id || j.id,
          offer_id: j.offer_id || j.booking_id || j.id,
          booking_id: j.booking_id || j.id,
        }));

      const ac = (jobsRes.data.active_jobs || []).map((j: any) => ({
        ...j,
        id: j.id || j.booking_id,
        booking_id: j.booking_id || j.id,
      }));

      // 🔥 FIX: Extract and format the history array from the backend response
      const hist = (jobsRes.data.history || jobsRes.data.completed_jobs || []).map((j: any) => ({
        ...j,
        id: j.id || j.booking_id,
        booking_id: j.booking_id || j.id,
      }));

      const allDriverIds = Array.from(
        new Set([
          ...av.map((j: any) => j.driver_id).filter(Boolean),
          ...ac.map((j: any) => j.driver_id).filter(Boolean),
          ...hist.map((j: any) => j.driver_id).filter(Boolean), // 🔥 Ensure historical drivers are cached too
        ])
      );

      await Promise.all(
        allDriverIds.map((id: any) => fetchDriverProfile(Number(id)))
      );

      const mergeJobs = (jobs: any[]) =>
        jobs.map((j) => {
          const drv = j.driver_id
            ? getDriverFromCache(j.driver_id)
            : j.driver ?? null;

          return drv
            ? {
                ...j,
                driver: drv,
                driver_name: j.driver_name || drv.full_name,
                driver_avatar: j.driver_avatar || drv.avatar_url,
              }
            : j;
        });

      const mergedAvailable = mergeJobs(av);
      const mergedActive = mergeJobs(ac);
      const mergedHistory = mergeJobs(hist); // 🔥 Apply driver caching to historical jobs

      setAvailableJobs(mergedAvailable);
      setActiveJobs(mergedActive);
      setRideHistory(mergedHistory); // 🔥 FIX: Inject the history into the AppContext state!

      if (mergedActive.length > 0) {
        const current = mergedActive[0];
        currentBookingRef.current = current.id || current.booking_id || null;
        if (currentBookingRef.current) {
          await AsyncStorage.setItem('current_booking_id', String(currentBookingRef.current));
        }
      } else {
        currentBookingRef.current = null;
        await AsyncStorage.removeItem('current_booking_id');
      }
    } catch (e) {
      console.log('refreshDriverJobs error', e);
      setAvailableJobs([]);
    }
  };

  const acceptJob = async (offerId: number) => {
    if (!token) throw new Error('Not authenticated');

    try {
      const res = await api.post(
        ENDPOINTS.DRIVER_ACCEPT_OFFER(offerId),
        {},
        { headers: authHeaders() }
      );

      await refreshDriverJobs();
      return res.data;
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '';

      if (detail.includes('not installed') || err?.response?.status === 501) {
        const legacyRes = await api.post(
          ENDPOINTS.DRIVER_ACCEPT_JOB(offerId),
          {},
          { headers: authHeaders() }
        );

        await refreshDriverJobs();
        return legacyRes.data;
      }

      throw new Error(detail || err?.message || 'Could not accept job');
    }
  };

  const declineJob = async (offerId: number) => {
    if (!token) throw new Error('Not authenticated');

    try {
      const res = await api.post(
        ENDPOINTS.DRIVER_DECLINE_OFFER(offerId),
        {},
        { headers: authHeaders() }
      );

      await refreshDriverJobs();
      return res.data;
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '';

      if (detail.includes('not installed') || err?.response?.status === 501) {
        const legacyRes = await api.post(
          ENDPOINTS.DRIVER_DECLINE_JOB(offerId),
          {},
          { headers: authHeaders() }
        );

        await refreshDriverJobs();
        return legacyRes.data;
      }

      throw new Error(detail || err?.message || 'Could not decline job');
    }
  };

  const pollActiveBooking = async () => {
    // 🔥 FIXED: Allow 'customer' AND 'individual' roles to pass, just block drivers!
    if (!token || !user || user.role === 'driver') return;

    try {
      const res = await api.get(ENDPOINTS.BOOKINGS_ACTIVE, {
        headers: authHeaders(),
      });

      const list = res.data || [];

      const needsAction = (b: any) => {
        const status = (b.status || '').toLowerCase();
        const done = ['completed', 'delivered', 'paid'].includes(status);
        const rated = b.customer_rating ?? b.rating ?? null;
        return done && !rated;
      };

      let candidate = null;

      if (
        list.length === 0 ||
        ['completed', 'delivered', 'paid'].includes(
          (list[0]?.status || '').toLowerCase()
        )
      ) {
        const h = await fetchRideHistory();
        const targetId =
          list.length > 0 ? list[0].id : activeBooking?.id || h[0]?.id;
        candidate = h.find((x) => x.id === targetId) || list[0];
      } else {
        candidate = list[0];
      }

      if (!candidate) {
        setActiveBooking(null);
        return;
      }

      const drvId =
        candidate.driver_id ?? activeBooking?.driver_id ?? lastDriverIdRef.current;

      if (drvId) lastDriverIdRef.current = drvId;

      let profile = null;
      if (drvId) {
        profile = await fetchDriverProfile(Number(drvId));
      }

      const mapped: any = {
        ...candidate,
        driver_id: drvId,
        delivery_proof_url: normalizeUrl(
          candidate.delivery_proof_url || candidate.proof_url
        ),
      };

      if (profile) {
        mapped.driver = profile;
        mapped.driver_name = mapped.driver_name || profile.full_name;
        mapped.driver_avatar = mapped.driver_avatar || profile.avatar_url;
        mapped.driver_phone = mapped.driver_phone || profile.phone;
        mapped.driver_vehicle = mapped.driver_vehicle || profile.vehicle;
      }

      const status = (mapped.status || '').toLowerCase();

      if (['completed', 'delivered', 'paid'].includes(status)) {
        if (needsAction(mapped)) {
          if (!mapped.driver_id) return;
          setActiveBooking(mapped);
          setTrackingEnabled(false);
        } else {
          setActiveBooking(null);
          setDriverLocation(null);
        }
        return;
      }

      // 🔥 CRITICAL FIX: The Shield!
      // Do NOT let a stale database 'pending' response overwrite a live 'accepted' WebSocket state!
      setActiveBooking((prev: any) => {
         const currentStatus = (prev?.status || '').toLowerCase();
         if (['accepted', 'in_transit', 'picked_up'].includes(currentStatus) && status === 'pending') {
             console.log("🛡️ BLOCKED STALE HTTP DOWNGRADE. Keeping active WS state.");
             return prev;
         }
         return mapped;
      });

      if (mapped.driver_current_lat && mapped.driver_current_lon) {
        setDriverLocation({
          lat: mapped.driver_current_lat,
          lon: mapped.driver_current_lon,
        });
      }
    } catch {}
  };

  const connectDriverSocket = () => {
    const currentToken = tokenRef.current || token;
    const driverId = user?.id;

    if (!currentToken || !driverId || user?.role !== 'driver') return;

    try {
      if (driverWsRef.current) {
        try {
          driverWsRef.current.close();
        } catch {}
        driverWsRef.current = null;
      }

      if (wsReconnectRef.current.timer) {
        clearTimeout(wsReconnectRef.current.timer);
        wsReconnectRef.current.timer = null;
      }

      const wsBase = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const wsUrl = `${wsBase}/ws/driver/${driverId}?token=${encodeURIComponent(currentToken)}`;

      const ws = new WebSocket(wsUrl);
      driverWsRef.current = ws;

      ws.onopen = async () => {
        wsReconnectRef.current.attempts = 0;

        try {
          await refreshDriverJobs();
        } catch {}

        try {
          const active = activeJobs?.[0];
          if (active?.id || active?.booking_id) {
            const bookingId = active.id || active.booking_id;
            currentBookingRef.current = bookingId;
            await AsyncStorage.setItem('current_booking_id', String(bookingId));
          }
        } catch {}

        try {
          ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
        } catch {}
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = String(msg?.type || '').toUpperCase();

          if (type === 'PONG') return;

          if (type === 'IDP_OFFER' || type === 'NEW_JOB') {
            
            setAvailableJobs((prev) => {
              // 🔥 THE RE-PUSH FIX: 
              // Filter out the old stale version of this job (if it exists in the array)
              const filtered = prev.filter((j) => (j.offer_id || j.id) !== (msg.offer_id || msg.booking_id || msg.id));
              
              // Add the completely fresh payload from the IDP right at the top!
              return [{ ...msg, id: msg.offer_id || msg.booking_id || msg.id }, ...filtered];
            });

            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'New delivery request',
                  body: msg?.pickup_address && msg?.dropoff_address
                    ? `${msg.pickup_address} → ${msg.dropoff_address}`
                    : 'A new job is waiting for you.',
                  data: msg,
                  sound: true,
                  channelId: 'default',
                },
                trigger: null,
              });
            } catch {}
            return;
          }
          if (type === 'IDP_REQUEUE' || type === 'IDP_ESCALATED') {
            // 🔥 INSTANT DISMISS: If the server timer runs out, rip it out of the UI instantly so the modal closes!
            setAvailableJobs((prev) => 
              prev.filter((j) => (j.offer_id || j.id) !== (msg.job_id || msg.booking_id))
            );
            
            refreshDriverJobs().catch(() => {});
            return;
          }


          if (type === 'IDP_ASSIGN') {
            try {
              await refreshDriverJobs();
            } catch {}

            const assignedBookingId = msg?.job_id || msg?.booking_id;
            if (assignedBookingId) {
              currentBookingRef.current = assignedBookingId;
              try {
                await AsyncStorage.setItem('current_booking_id', String(assignedBookingId));
              } catch {}
            }

            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Job accepted',
                  body: `Booking #${assignedBookingId || ''} assigned to you.`,
                  data: msg,
                  sound: true,
                  channelId: 'default',
                },
                trigger: null,
              });
            } catch {}
            return;
          }

          if (type === 'START_SHARING') {
            const bookingId = msg?.booking_id;
            if (bookingId) {
              try {
                await requestDriverStartSharing(bookingId);
              } catch {}
            }
            return;
          }
        } catch (e) {
          console.log('driver socket message parse error', e);
        }
      };

      ws.onerror = (e) => {
        console.log('driver socket error', e);
      };

      ws.onclose = () => {
        driverWsRef.current = null;

        if (user?.role !== 'driver') return;

        if (wsReconnectRef.current.timer) {
          clearTimeout(wsReconnectRef.current.timer);
        }

        const attempts = (wsReconnectRef.current.attempts || 0) + 1;
        wsReconnectRef.current.attempts = attempts;

        const delay = Math.min(10000, 1000 * attempts);

        wsReconnectRef.current.timer = setTimeout(() => {
          connectDriverSocket();
        }, delay);
      };
    } catch (e) {
      console.log('connectDriverSocket error', e);
    }
  };

  const connectCustomerSocket = (bookingId: number) => {
    const currentToken = tokenRef.current || token;

    // 🔥 FIXED: Block drivers, but allow BOTH 'customer' and 'individual' to connect!
    if (!currentToken || !bookingId || user?.role === 'driver') return;

    try {
      if (customerWsRef.current) {
        try {
          customerWsRef.current.close();
        } catch {}
        customerWsRef.current = null;
      }

      const wsBase = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const wsUrl = `${wsBase}/ws/customer/${bookingId}?token=${encodeURIComponent(currentToken)}`;

      const ws = new WebSocket(wsUrl);
      customerWsRef.current = ws;

      ws.onopen = () => {
        console.log('🟢 Customer socket connected for booking:', bookingId);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = String(msg?.type || '').toUpperCase();
          
          // 🔥 ADDED LOGGING: Watch your terminal to see exactly what the backend sends!
          console.log('📨 Customer WS Received:', type, msg); 

          // 🔥 THE CATCH-ALL FIX: Grab the ID no matter what the backend named it!
          const targetId = msg.booking_id || msg.bookingId || msg.job_id || msg.id;
          const incomingDriverId = msg.driver_id || msg.driverId || msg.driver?.id;

          if (type === 'DRIVER_LOCATION') {
            if (msg?.lat != null && msg?.lon != null) {
              setDriverLocation({
                lat: Number(msg.lat),
                lon: Number(msg.lon),
              });
              setTrackingEnabled(true);
            }
            return;
          }

         if (type === 'JOB_ACCEPTED') {
            console.log("🔥 SOCKET CAUGHT JOB_ACCEPTED:", msg);
            
            // 1. Force the UI to accept the driver data immediately without relying on the previous state
            setActiveBooking((prev: any) => {
              // Construct a fresh, complete object using the incoming socket data
              const updated = prev ? { ...prev } : {};
              updated.status = msg.status || 'accepted';
              updated.driver_id = msg.driver_id || msg.driverId;
              updated.driver_name = msg.driver_name || msg.driverName || 'Your Driver';
              updated.driver_phone = msg.driver_phone || msg.driverPhone;
              
              // Map the nested object that HomeScreen.tsx explicitly looks for
              updated.driver = {
                id: msg.driver_id || msg.driverId,
                full_name: msg.driver_name || msg.driverName || 'Your Driver',
                phone: msg.driver_phone || msg.driverPhone,
              };
              
              return updated;
            });

          
            return;
          }

          if (type === 'STATUS_UPDATE') {
            console.log("🔥 SOCKET CAUGHT STATUS_UPDATE:", msg);
            
            let alertMsg = "";
            if (msg.status === 'arrived_pickup') alertMsg = "Your driver has arrived at the pickup location!";
            if (msg.status === 'in_transit') alertMsg = "Your items have been collected and are on the way!";
            if (msg.status === 'arrived_dropoff') alertMsg = "Your driver is at the drop-off! Have your PIN ready.";
            if (['delivered', 'completed', 'paid'].includes(msg.status)) alertMsg = "Your delivery is complete!";
            
            if (alertMsg) {
             
              try {
                Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Delivery Update 🚚",
                    body: alertMsg,
                    sound: true,
                  },
                  trigger: null, // 'null' means show it immediately
                });
              } catch (e) {
                console.log("Local notification failed:", e);
              }
            }
            
            // 🔥 This instantly forces the UI to update the exact second the driver taps the button!
            setActiveBooking((prev: any) => {
              if (!prev || String(prev.id) !== String(targetId)) return prev;
              
              const updatedBooking = { ...prev, status: msg.status };

              if (['accepted', 'assigned'].includes(msg.status)) updatedBooking.accepted_at = new Date().toISOString();
              if (['arrived_pickup', 'in_transit', 'picked_up'].includes(msg.status)) updatedBooking.picked_up_at = prev.picked_up_at || new Date().toISOString();
              if (['arrived_dropoff', 'delivered', 'completed', 'paid'].includes(msg.status)) updatedBooking.delivered_at = prev.delivered_at || new Date().toISOString();

              return updatedBooking;
            });
            return;
          }


          if (type === 'PICKED_UP') {
            setActiveBooking((prev: any) => {
              if (!prev || String(prev.id) !== String(targetId)) return prev;
              return { ...prev, status: msg.status || 'in_transit' };
            });

            setTimeout(() => { pollActiveBooking().catch(() => {}); }, 2000);
            return;
          }

          if (type === 'DELIVERED') {
            setActiveBooking((prev: any) => {
              if (!prev || String(prev.id) !== String(targetId)) return prev;
              return { ...prev, status: msg.status || 'completed' };
            });

            setTimeout(() => { pollActiveBooking().catch(() => {}); }, 2000);
            return;
          }

        } catch (e) {
          console.log('customer socket message parse error', e);
        }
      };

      ws.onerror = (e) => {
        console.log('customer socket error', e);
      };

      ws.onclose = () => {
        customerWsRef.current = null;
      };
    } catch (e) {
      console.log('connectCustomerSocket error', e);
    }
  };


  const registerPushToken = async () => {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return;
      }

      // 1. Explicitly check and request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // 2. Safely grab the Project ID for TestFlight/Production
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId;

      if (!projectId) {
         console.warn('Project ID not found. Push notifications will fail in standalone builds.');
      }

      // 3. Fetch the token
      let expoToken = '';
      try {
        expoToken = (
          await Notifications.getExpoPushTokenAsync({ projectId })
        ).data;
      } catch (e) {
        console.warn("Failed to get token with Project ID, falling back to legacy", e);
        expoToken = (await Notifications.getExpoPushTokenAsync()).data;
      }

      if (!expoToken) return;

      const currentToken = tokenRef.current || token;
      if (!currentToken) return;

      // 4. Send to backend
      try {
        await api.post(
          ENDPOINTS.USER_PUSH_TOKEN,
          { expo_push_token: expoToken },
          { headers: authHeaders(currentToken) }
        );
        console.log("✅ Push token saved successfully!");
      } catch (e) {
        console.error("❌ Failed to save push token to backend:", e?.response?.data || e?.message);
      }
    } catch (e) {
       console.error("Push token setup failed:", e);
    }
  };


  const rateDriver = async (
    driverId: number,
    rating: number,
    note?: string,
    bookingId?: number
  ) => {
    try {
      const res = await api.post(
        ENDPOINTS.DRIVER_RATE(driverId),
        {
          rating,
          note,
          booking_id: bookingId,
        },
        { headers: authHeaders() }
      );

      setActiveBooking(null);
      await fetchRideHistory();

      return {
        ok: true,
        rating_avg: res.data?.rating_avg,
        rating_count: res.data?.rating_count,
      };
    } catch {
      return { ok: false };
    }
  };

  const acknowledgeBooking = async (bookingId: number) => {
    try {
      await api.post(
        ENDPOINTS.BOOKING_ACKNOWLEDGE(bookingId),
        {},
        { headers: authHeaders() }
      );
    } catch {}
  };

  const saveProfile = async () => {
    try {
      const payload = { ...profileDraft };
      const res = await api.put(ENDPOINTS.USER_ME, payload, {
        headers: authHeaders(),
      });

      setUser(res.data);
      setProfileDraft(res.data);
      setEditingProfile(false);
      Alert.alert('Success', 'Profile updated.');
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.detail || 'Failed to save profile.'
      );
    }
  };

  const openNavigationToJob = (job: any) => {
    if (!job) return;

    const status = String(job.status || '').toLowerCase();
    let url = '';

    if (Platform.OS === 'ios') {
      if (['picked_up', 'in_transit'].includes(status)) {
        url = `http://maps.apple.com/?daddr=${job.dropoff_lat},${job.dropoff_lon}`;
      } else {
        url = `http://maps.apple.com/?daddr=${job.pickup_lat},${job.pickup_lon}`;
      }
    } else {
      if (['picked_up', 'in_transit'].includes(status)) {
        url = `https://www.google.com/maps/dir/?api=1&destination=${job.dropoff_lat},${job.dropoff_lon}&travelmode=driving`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&waypoints=${job.pickup_lat},${job.pickup_lon}&destination=${job.dropoff_lat},${job.dropoff_lon}&travelmode=driving`;
      }
    }

    if (url) Linking.openURL(url);
  };

  const uploadVerificationPhoto = async (field, uri) => {
    try {
      const filename = uri.split('/').pop() || `${field}.jpg`;
      const formData = new FormData();
      
      formData.append('document', {
        uri: uri,
        name: filename,
        type: 'image/jpeg',
      });
      formData.append('document_type', field);

      const response = await api.post('/driver/documents/upload', formData, {
        headers: {
          ...authHeaders(),
          'Content-Type': 'multipart/form-data', 
        },
      });

      return response.data.url; 
      
    } catch (e) {
      console.error("Upload error:", e?.response?.data || e?.message);
      throw new Error(e?.response?.data?.detail || e?.message || 'Could not upload document');
    }
  };

  const markPickedUp = async (jobId: number) => {
    try {
      await api.post(ENDPOINTS.DRIVER_PICKUP_JOB(jobId), {}, { headers: authHeaders() });
      await refreshDriverJobs();
    } catch (e: any) {
      throw new Error(e?.response?.data?.detail || e?.message || 'Could not mark pickup');
    }
  };

  const markDelivered = async (jobId: number) => {
    try {
      await api.post(ENDPOINTS.DRIVER_DELIVER_JOB(jobId), {}, { headers: authHeaders() });
      await refreshDriverJobs();
      await stopBackgroundLocationUpdates();
      await AsyncStorage.removeItem('current_booking_id');
      currentBookingRef.current = null;
    } catch (e: any) {
      throw new Error(e?.response?.data?.detail || e?.message || 'Could not mark delivered');
    }
  };

  const requestDriverStartSharing = async (bookingId: number) => {
    try {
      currentBookingRef.current = bookingId;
      await AsyncStorage.setItem('current_booking_id', String(bookingId));
      await startBackgroundLocationUpdates();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  const uploadDeliveryProof = async (bookingId: number, localUri: string) => {
    try {
      const proofUrl = normalizeUrl(localUri) || localUri;

      const res = await api.post(
        ENDPOINTS.DRIVER_PROOF_JOB(bookingId),
        { proof_url: proofUrl },
        { headers: authHeaders() }
      );

      return {
        ok: true,
        url: normalizeUrl(res.data?.proof_url || res.data?.url) || res.data?.proof_url || res.data?.url,
      };
    } catch (e) {
      return { ok: false, error: e };
    }
  };
  const pickAndUploadProof = async (bookingId: number) => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (res.canceled) return;

      return await uploadDeliveryProof(bookingId, res.assets[0].uri);
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  const startDriverSubscription = async (tier?: 'basic' | 'professional') => {
    if (!token) return;

    try {
      setSubscriptionLoading(true);

      const res = await api.post(
        ENDPOINTS.PAYMENT_CREATE_SUBSCRIPTION,
        { tier },
        { headers: authHeaders() }
      );

      const url = res.data?.url;
      if (url) await Linking.openURL(url);

      setCurrentScreen('subscription');
      startSubscriptionPolling();
    } catch {
      Alert.alert('Error', 'Subscription failed');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const sendSupportMessage = async (payload: any) => {
    try {
      const res = await api.post(ENDPOINTS.SUPPORT_MESSAGE, payload, {
        headers: authHeaders(),
      });
      return { ok: true, data: res.data };
    } catch {
      return { ok: false };
    }
  };

  const createSupportTicket = async (payload: any) => {
    try {
      const res = await api.post(ENDPOINTS.SUPPORT_TICKET, payload, {
        headers: authHeaders(),
      });
      return { ok: true, data: res.data };
    } catch {
      return { ok: false };
    }
  };

  useEffect(() => {
    (async () => {
      const savedToken = await AsyncStorage.getItem('token');
      const savedUserData = await AsyncStorage.getItem('userData');

      if (savedToken) {
        setToken(savedToken);
        
        // 🚨 INSTANT WAKE UP: Restore user state before checking the internet
        if (savedUserData) {
           setUser(JSON.parse(savedUserData));
        }

        try {
          await fetchUser(savedToken); // Silent background refresh
          setCurrentScreen('home'); 
          setBottomTab('home');
        } catch (e) {
          if (savedToken && savedUserData) {
            setCurrentScreen('home');
            setBottomTab('home');
          }
        }
      }
      await registerPushToken();
    })();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (wsReconnectRef.current.timer) clearTimeout(wsReconnectRef.current.timer);
      try {
        driverWsRef.current?.close();
        customerWsRef.current?.close();
      } catch {}
      stopSubscriptionPolling();
      stopEtaInterval();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (tokenRef.current) {
          checkSubscriptionStatus(true);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);



  // Inside your AppProvider function:
  useEffect(() => {
      const bootstrapAsync = async () => {
          try {
              const savedToken = await AsyncStorage.getItem('userToken');
              const savedUserData = await AsyncStorage.getItem('userData');
              
              if (savedToken && savedUserData) {
                  // Immediately restore session without forcing a new login
                  setToken(savedToken);
                  setUser(JSON.parse(savedUserData));
                  
                  // Optionally: Silently refresh user data from backend here
                  // api.get('/auth/users/me').then(res => setUser(res.data));
              }
          } catch (e) {
              console.error("Failed to restore session", e);
          }
      };

      bootstrapAsync();
  }, []);

  // Update your login function to save BOTH token and user data to physical storage
  const completeLogin = async (apiResponse) => {
      const newToken = apiResponse.access_token;
      const newUserData = apiResponse.user;
      
      await AsyncStorage.setItem('userToken', newToken);
      await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
      
      setToken(newToken);
      setUser(newUserData);
  };

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (token && user && user.role === 'individual') {
      pollActiveBooking();
      pollRef.current = setInterval(pollActiveBooking, 5000);
    }
  }, [token, user]);

  useEffect(() => {
    if (!activeBooking && trackingEnabled) {
      setTrackingEnabled(false);
      setDriverLocation(null);
    }

    const status = (activeBooking?.status || '').toLowerCase();
    const done = ['completed', 'delivered', 'paid'].includes(status);

    if (done && trackingEnabled) {
      setTrackingEnabled(false);
      Alert.alert('Order complete', 'Your order is delivered.');
    }
  }, [activeBooking?.id, activeBooking?.status]);

  useEffect(() => {
    if (!activeBooking) return;

    const status = (activeBooking.status || '').toLowerCase();
    const shouldAutoStart = ['assigned', 'accepted', 'in_transit', 'picked_up', 'on_trip'].includes(status);

    if (shouldAutoStart && !trackingEnabled) {
      setTrackingEnabled(true);
    }
  }, [activeBooking?.id, activeBooking?.status]);

  useEffect(() => {
    if (driverLocation && trackingEnabled && mapRef.current) {
      try {
        mapRef.current.animateToRegion(
          {
            latitude: driverLocation.lat,
            longitude: driverLocation.lon,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          400
        );
      } catch {}
    }
  }, [driverLocation, trackingEnabled]);

  useEffect(() => {
    if (user?.role !== 'driver' || !token || !user?.id) return;

    connectDriverSocket();

    const fallbackPoll = setInterval(() => {
      if (!driverWsRef.current || driverWsRef.current.readyState !== 1) {
        refreshDriverJobs().catch(() => {});
      }
    }, 5000);

    return () => {
      clearInterval(fallbackPoll);
      try {
        driverWsRef.current?.close();
      } catch {}
    };
  }, [user?.role, user?.id, token]);

  useEffect(() => {
    // 🔥 Make sure this allows 'customer' too!
    if (user?.role === 'driver' || !token || !activeBooking?.id) return;

    connectCustomerSocket(activeBooking.id);

    return () => {
      try {
        customerWsRef.current?.close();
      } catch {}
    };
  }, [user?.role, activeBooking?.id, token]);

  const value: AppContextType = {
    token,
    setToken,
    user,
    setUser,
    loading,
    setLoading,

    currentScreen,
    setCurrentScreen,
    bottomTab,
    setBottomTab,

    pickupAddr,
    setPickupAddr,
    pickupCoord,
    setPickupCoord,
    stops,
    setStops,
    addStop,
    removeStop,
    updateStop,

    activeSearchIndex,
    setActiveSearchIndex,
    pickupSuggestions,
    setPickupSuggestions,
    dropoffSuggestions,
    setDropoffSuggestions,

    availableJobs,
    setAvailableJobs,
    activeJobs,
    setActiveJobs,
    rideHistory,
    setRideHistory,

    isPremium,
    setIsPremium,
    subscriptionLoading,
    setSubscriptionLoading,
    subscriptionPolling,
    setSubscriptionPolling,

    quoteModalVisible,
    setQuoteModalVisible,
    quoteData,
    setQuoteData,
    creatingBooking,
    setCreatingBooking,

    menuVisible,
    setMenuVisible,
    mapFormExpanded,
    setMapFormExpanded,

    activeBooking,
    setActiveBooking,
    trackingEnabled,
    setTrackingEnabled,
    driverLocation,
    setDriverLocation,

    editingProfile,
    setEditingProfile,
    profileDraft,
    setProfileDraft,

    mapRef,
    progressAnim,
    etaSeconds,
    setEtaSeconds,

    isRegister,
    setIsRegister,
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    selectedRole,
    setSelectedRole,
    roleModalVisible,
    setRoleModalVisible,

    bookingMode,
    setBookingMode,
    vanType,
    setVanType,
    jobType,
    setJobType,
    manService,
    setManService,
    followDriver,
    setFollowDriver,
    isScheduled,
    setIsScheduled,
    scheduleTime,
    setScheduleTime,
    packagePhotos,
    setPackagePhotos,

    pricePreview,
    setPricePreview,
    calculatePrice,
    pendingVanType,
    setPendingVanType,

    mapPickTarget,
    setMapPickTarget,
    reverseGeocode,

    handleAuth,
    fetchUser,
    logout,

    refreshDriverJobs,
    acceptJob,
    declineJob,
    fetchRideHistory,
    pollActiveBooking,

    scheduleSearch,
    runSearch,
    useMyLocation,
    selectSearchResult,

    openQuoteFlow,
    confirmAndPayAndCreateBooking,

    startDriverSubscription,
    checkSubscriptionStatus,
    startSubscriptionPolling,
    stopSubscriptionPolling,

    saveProfile,
    openNavigationToJob,
    markPickedUp,
    markDelivered,
    updateDriverStatus,

    requestDriverStartSharing,
    uploadDeliveryProof,
    pickAndUploadProof,

    rateDriver,
    fetchDriverProfile,
    getDriverFromCache,
    driverCache,

    acknowledgeBooking,

    stopDetailsIndex,
    setStopDetailsIndex,
    openStopDetails,
    closeStopDetails,
    uploadVerificationPhoto,

    sendSupportMessage,
    createSupportTicket,
    driverScreenIndex,
    setDriverScreenIndex,

  };

  return (
    <AppContext.Provider value={value}>
      {/* 🔥 THE PREMIUM ANIMATED BANNER (Must be rendered here to float over the app) */}
      {customAlert.visible && (
        <Animated.View style={{
          position: 'absolute', top: Platform.OS === 'ios' ? 10 : 0, left: 16, right: 16, zIndex: 9999,
          transform: [{ translateY: alertAnim }],
          backgroundColor: '#1A7A4A', borderRadius: 16, padding: 16,
          flexDirection: 'row', alignItems: 'center',
          shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
        }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12, marginRight: 14 }}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15.5 }}>{customAlert.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 3, fontWeight: '500' }}>{customAlert.message}</Text>
          </View>
        </Animated.View>
      )}

      {/* Render the rest of the app */}
      {children}
    </AppContext.Provider>
  );
};