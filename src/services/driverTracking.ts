// src/services/driverTracking.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';

const DRIVER_TRACKING_TASK = 'DRIVER_TRACKING_TASK';
const API_BASE = 'https://hencedelivery.com'; // keep as your dev server or replace with LAN IP

let authToken: string | null = null;
let currentBookingId: number | null = null;

/* ---------------- BACKGROUND TASK ---------------- */
TaskManager.defineTask(DRIVER_TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Driver tracking task error', error);
    return;
  }

  // nothing to do if we don't have a booking or token
  if (!data?.locations?.length || !currentBookingId || !authToken) return;

  // pick the last location in the batch
  const loc = data.locations[data.locations.length - 1];

  try {
    await fetch(`${API_BASE}/driver/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        booking_id: currentBookingId,
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
        // include accuracy + ts optionally
        accuracy: loc.coords.accuracy,
        ts: loc.timestamp ?? Date.now(),
      }),
    });
  } catch (e) {
    console.warn('Failed to post driver location (background)', e);
  }
});

/* ---------------- HELPERS ---------------- */
export async function ensureLocationPermissions() {
  // request foreground
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    Alert.alert(
      'Location required',
      'Please enable location permission to share position.'
    );
    return false;
  }

  // for iOS request background and if denied show Settings button
  if (Platform.OS === 'ios') {
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      Alert.alert(
        'Background location required',
        'Please allow "Always" location for background sharing. Open Settings to enable it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
  } else {
    // Android: depending on SDK level you may need ACCESS_BACKGROUND_LOCATION in manifest
    // Expo-managed: ensure you configured AndroidManifest / app.json appropriately
  }
  return true;
}

/**
 * Start background location sharing for a booking.
 * Accepts (bookingId, token).
 * Returns true if started (or already running), false if permissions declined.
 */
export async function startBackgroundLocationSharing(
  bookingId: number,
  token: string
): Promise<boolean> {
  try {
    authToken = token;
    currentBookingId = bookingId;

    const ok = await ensureLocationPermissions();
    if (!ok) return false;

    const running = await Location.hasStartedLocationUpdatesAsync(
      DRIVER_TRACKING_TASK
    );
    if (running) {
      // task already running, but ensure booking/token set
      return true;
    }

    await Location.startLocationUpdatesAsync(DRIVER_TRACKING_TASK, {
      accuracy: Location.Accuracy.Highest,
      timeInterval: 3000,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Delivery in progress',
        notificationBody: 'Sharing your live location',
      },
    });

    return true;
  } catch (e) {
    console.warn('startBackgroundLocationSharing failed', e);
    return false;
  }
}

/**
 * Stop background sharing and clear booking/token stored in this module.
 */
export async function stopBackgroundLocationSharing() {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(
      DRIVER_TRACKING_TASK
    );
    if (running) {
      await Location.stopLocationUpdatesAsync(DRIVER_TRACKING_TASK);
    }
  } catch (e) {
    console.warn('stopBackgroundLocationSharing error', e);
  } finally {
    // clear local state so background task won't post again
    currentBookingId = null;
    authToken = null;
  }
}

/**
 * Helper for other modules to read current booking id (non-mutating).
 * Useful to unify posting from foreground watch: getBookingId()
 */
export function getCurrentBookingId(): number | null {
  return currentBookingId;
}

/**
 * Helper to set token/booking directly (rarely needed — prefer startBackgroundLocationSharing)
 */
export function _setAuthAndBooking(token: string | null, bookingId: number | null) {
  authToken = token;
  currentBookingId = bookingId;
}