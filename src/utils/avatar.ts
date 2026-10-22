import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Normalizes any avatar URL:
 * - Preserves local file URIs (file://, content://, ph://, data:)
 * - Rewrites localhost/127.0.0.1 to production domain https://hencedelivery.com
 * - Prepends https://hencedelivery.com to relative paths
 */
export const getFullAvatarUrl = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Local file schemes (from expo-image-picker or local cache)
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  // Rewrite localhost or 127.0.0.1 to production host
  if (trimmed.includes('localhost:8000') || trimmed.includes('127.0.0.1:8000')) {
    return trimmed.replace(/https?:\/\/(localhost|127\.0\.0\.1):8000/, 'https://hencedelivery.com');
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Relative path (e.g. /static/avatars/... or static/avatars/...)
  return `https://hencedelivery.com${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

/**
 * Returns user initials derived strictly from real full name or email.
 * Never hardcodes dummy names.
 */
export const getUserInitials = (
  name?: string | null,
  email?: string | null,
  isDriver: boolean = false
): string => {
  const fallback = isDriver ? 'DR' : 'CU';
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const username = email.split('@')[0];
    return username.slice(0, 2).toUpperCase();
  }
  return fallback;
};

/**
 * Returns user display name from real data.
 * Never hardcodes "Emma Walsh" or "James Walsh".
 */
export const getUserDisplayName = (user?: any, isDriver: boolean = false): string => {
  if (user?.full_name && user.full_name.trim()) return user.full_name.trim();
  if (user?.name && user.name.trim()) return user.name.trim();
  if (user?.email && user.email.trim()) {
    const username = user.email.split('@')[0];
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  return isDriver ? 'Hence Driver' : 'Hence Customer';
};

/**
 * Launches the device photo library for selecting an avatar.
 */
export const pickImageFromLibrary = async (): Promise<string | null> => {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to choose a profile picture.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  } catch (e: any) {
    console.warn('Image picker error:', e);
    return null;
  }
};
