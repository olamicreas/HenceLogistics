import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Normalizes any avatar URL:
 * - Preserves base64 data URIs
 * - Preserves local file URIs (file://, content://, ph://)
 * - Accepts objects with { uri, base64 }
 * - Rewrites localhost/127.0.0.1 to production domain https://hencedelivery.com
 * - Prepends https://hencedelivery.com to relative paths
 * - Ignores invalid strings like "null", "undefined", "[object Object]"
 */
export const getFullAvatarUrl = (url?: any): string | null => {
  if (!url) return null;

  let target: any = url;
  if (typeof url === 'object' && url !== null) {
    target = url.base64 || url.uri || url.url || '';
  }

  if (typeof target !== 'string') return null;
  const trimmed = target.trim();
  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === '[object Object]'
  ) {
    return null;
  }

  // Base64 Data URI (loads instantly, fully offline resilient)
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Local file schemes (from expo-image-picker or local cache)
  if (
    trimmed.startsWith('file://') ||
    trimmed.startsWith('content://') ||
    trimmed.startsWith('ph://')
  ) {
    return trimmed;
  }

  // Rewrite localhost or 127.0.0.1 to production host
  if (trimmed.includes('localhost:8000') || trimmed.includes('127.0.0.1:8000')) {
    return trimmed.replace(
      /https?:\/\/(localhost|127\.0\.0\.1):8000/,
      'https://hencedelivery.com'
    );
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Relative path (e.g. /static/avatars/... or static/avatars/...)
  return `https://hencedelivery.com${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

/**
 * Returns user initials derived strictly from real full name, first+last name, or email.
 * Never hardcodes dummy names ("EW", "JW", etc.).
 */
export const getUserInitials = (
  userOrName?: any,
  fallbackEmail?: string | null,
  isDriver: boolean = false
): string => {
  let name = '';
  let email = fallbackEmail || '';

  if (typeof userOrName === 'object' && userOrName !== null) {
    const u = userOrName.user || userOrName;
    const combinedFirstLast =
      u.first_name || u.last_name
        ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
        : '';

    name =
      u.full_name ||
      u.fullName ||
      (combinedFirstLast.length > 0 ? combinedFirstLast : '') ||
      u.name ||
      u.username ||
      '';

    if (!email) email = u.email || '';
  } else if (typeof userOrName === 'string') {
    name = userOrName;
  }

  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length === 1) {
      return parts[0].toUpperCase();
    }
  }

  if (email && email.trim()) {
    const cleanEmail = email.trim().replace(/^mailto:/i, '');
    const userPart = cleanEmail.split('@')[0] || '';
    const cleanUser = userPart.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanUser.length >= 2) {
      return cleanUser.slice(0, 2).toUpperCase();
    }
    if (cleanUser.length === 1) {
      return cleanUser.toUpperCase();
    }
  }

  return isDriver ? 'DR' : 'CU';
};

/**
 * Returns user display name from real data.
 * Never hardcodes "Emma Walsh" or "James Walsh".
 */
export const getUserDisplayName = (user?: any, isDriver: boolean = false): string => {
  if (!user) return isDriver ? 'Hence Driver' : 'Hence Customer';
  const u = user.user || user;
  const firstName = u.first_name || '';
  const lastName = u.last_name || '';
  const combined = `${firstName} ${lastName}`.trim();

  const fullName =
    u.full_name ||
    u.fullName ||
    (combined.length > 0 ? combined : null) ||
    u.name ||
    u.username;

  if (fullName && fullName.trim()) return fullName.trim();

  if (u.email && u.email.trim()) {
    const cleanEmail = u.email.trim().replace(/^mailto:/i, '');
    const userPart = cleanEmail.split('@')[0] || '';
    if (userPart) {
      return userPart.charAt(0).toUpperCase() + userPart.slice(1);
    }
  }

  return isDriver ? 'Hence Driver' : 'Hence Customer';
};

export interface PickedImageResult {
  uri: string;
  base64?: string | null;
}

/**
 * Launches the device photo library for selecting an avatar.
 * Returns both uri and base64 for instant, offline-resilient rendering.
 */
export const pickImageFromLibrary = async (): Promise<PickedImageResult | null> => {
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
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      return {
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null,
      };
    }
    return null;
  } catch (e: any) {
    console.warn('Image picker error:', e);
    return null;
  }
};
