import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WelcomeScreenProps {
  onSelectRole: (role: 'customer' | 'driver', autoMode?: 'login' | 'signup') => void;
  onSignIn?: () => void;
  onSkip?: () => void;
  selectedRole?: 'customer' | 'driver' | null;
}

export default function WelcomeScreen({
  onSelectRole,
  onSignIn,
  onSkip,
}: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const logoWidth = Math.min(SCREEN_WIDTH * 0.66, 290);
  const logoHeight = logoWidth * (327 / 1194);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E8B57" />
      <LinearGradient
        colors={['#2E8B57', '#3A9A66', '#2A8452']}
        locations={[0, 0.52, 1]}
        style={styles.gradient}
      >
        {/* HERO SECTION */}
        <View
          style={[
            styles.hero,
            {
              paddingTop: Math.max(insets.top + 40, 56),
            },
          ]}
        >
          <Image
            source={require('../../assets/welcome_logo.png')}
            style={{ width: logoWidth, height: logoHeight }}
            resizeMode="contain"
          />
        </View>

        {/* BOTTOM SECTION */}
        <View
          style={[
            styles.bottom,
            {
              paddingBottom: Math.max(insets.bottom + 24, 34),
            },
          ]}
        >
          <View style={styles.cards}>
            {/* BOOK A DELIVERY */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelectRole('customer', 'signup')}
              activeOpacity={0.88}
            >
              <Text style={styles.cardText}>Book a delivery</Text>
            </TouchableOpacity>

            {/* DRIVE WITH HENCE */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelectRole('driver', 'signup')}
              activeOpacity={0.88}
            >
              <Text style={styles.cardText}>Drive with Hence</Text>
            </TouchableOpacity>
          </View>

          {/* FOOT NAVIGATION */}
          <View style={styles.foot}>
            <TouchableOpacity
              onPress={() => {
                if (onSkip) {
                  onSkip();
                } else {
                  onSelectRole('customer', 'login');
                }
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Text style={styles.footSkip}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (onSignIn) {
                  onSignIn();
                } else {
                  onSelectRole('customer', 'login');
                }
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Text style={styles.footSignIn}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E8B57',
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    minHeight: 240,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cards: {
    gap: 12,
  },
  card: {
    minHeight: 60,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F2D20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  cardText: {
    color: '#146319',
    fontWeight: '700',
    fontSize: 19,
    letterSpacing: -0.1,
  },
  foot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    paddingHorizontal: 6,
  },
  footSkip: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
  },
  footSignIn: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
  },
});
