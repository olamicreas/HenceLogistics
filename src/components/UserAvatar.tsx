import React, { useState, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getFullAvatarUrl, getUserInitials } from '../utils/avatar';

interface UserAvatarProps {
  user?: any;
  size?: number; // e.g. 26 (pill), 52 (drawer/hub), 84 (profile)
  isDriver?: boolean;
  onPress?: () => void;
  showCameraBadge?: boolean;
  uploading?: boolean;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  style?: any;
}

function UserAvatar({
  user,
  size = 40,
  isDriver = false,
  onPress,
  showCameraBadge = false,
  uploading = false,
  bgColor,
  textColor,
  borderColor,
  style,
}: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [cachedFallback, setCachedFallback] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const rawAvatarUrl = user?.avatar_url || user?.avatar || user?.photo;
  const avatarUrl = getFullAvatarUrl(rawAvatarUrl);
  const initials = getUserInitials(user, user?.email, isDriver);

  const prevAvatarUrlRef = useRef<string | null>(avatarUrl);
  const userId = user?.id || user?.email;

  // Sync with persistent local avatar if available - strictly keyed to this specific user ID
  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setCachedFallback(null);
      return;
    }
    const userKey = `user_avatar_cached_${userId}`;
    AsyncStorage.getItem(userKey).then((c) => {
      if (mounted) {
        setCachedFallback(c || null);
      }
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Reset failedUrl ONLY if the actual avatar url string changes
  useEffect(() => {
    if (prevAvatarUrlRef.current !== avatarUrl) {
      prevAvatarUrlRef.current = avatarUrl;
      setFailedUrl(null);
    }
  }, [avatarUrl]);

  // Prioritize primary avatarUrl; if it fails to load, gracefully fall back to local cached image
  let displayImageUri: string | null = null;
  if (avatarUrl && avatarUrl !== failedUrl) {
    displayImageUri = avatarUrl;
  } else if (cachedFallback && cachedFallback !== failedUrl) {
    displayImageUri = cachedFallback;
  }

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [displayImageUri]);

  const defaultBg = bgColor || (isDriver ? '#236D44' : '#2E8B57');
  const defaultText = textColor || (isDriver ? '#C8F135' : '#FFFFFF');

  const badgeSize = Math.max(Math.round(size * 0.34), 18);
  const hasImage = !!displayImageUri && !imageError;

  const avatarCircle = (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: defaultBg,
          borderColor: borderColor || 'transparent',
          borderWidth: borderColor ? 2 : 0,
        },
        style,
      ]}
    >
      {/* 1. Underlying initials text: only rendered when there is no image, or while image is loading */}
      {(!hasImage || !imageLoaded) && (
        <Text
          style={[
            styles.initialsText,
            {
              color: defaultText,
              fontSize: Math.round(size * 0.38),
            },
          ]}
          numberOfLines={1}
        >
          {initials}
        </Text>
      )}

      {/* 2. Real Image: Perfectly fitted to the circle */}
      {hasImage ? (
        <Image
          source={{ uri: displayImageUri }}
          style={[
            styles.avatarImage,
            {
              borderRadius: size / 2,
            },
          ]}
          resizeMode="cover"
          fadeDuration={0}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            console.warn('Avatar image failed to load, stopping retry:', displayImageUri);
            setImageError(true);
            setFailedUrl(displayImageUri);
          }}
        />
      ) : null}
    </View>
  );

  const cameraBadgeElement = showCameraBadge ? (
    <View
      style={[
        styles.cameraBadge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          borderColor: isDriver ? '#236D44' : '#2E8B57',
          backgroundColor: '#C8F135',
        },
      ]}
    >
      {uploading ? (
        <ActivityIndicator size="small" color="#0F2D20" />
      ) : (
        <Ionicons
          name="camera"
          size={Math.max(Math.round(size * 0.18), 10)}
          color="#0F2D20"
        />
      )}
    </View>
  ) : null;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.pressableWrap, { width: size, height: size }]}
      >
        {avatarCircle}
        {cameraBadgeElement}
      </TouchableOpacity>
    );
  }

  if (showCameraBadge) {
    return (
      <View style={[styles.pressableWrap, { width: size, height: size }]}>
        {avatarCircle}
        {cameraBadgeElement}
      </View>
    );
  }

  return avatarCircle;
}

export default memo(UserAvatar);

const styles = StyleSheet.create({
  pressableWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  initialsText: {
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});