import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppProvider';

const COLORS = {
  primary: '#1A7A4A',
  inactive: '#B8CEC3',
  ink: '#0F1A14',
  soft: '#7A9080',
};

export default function BottomNav() {
  const {
    user,
    bottomTab,
    setBottomTab,
    setCurrentScreen,
    driverScreenIndex,
    setDriverScreenIndex,
  } = useAppContext();

  const insets = useSafeAreaInsets();
  // Guarantee exact safe area padding for iOS home indicator and Android navigation bars
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 14 : 8);

  const isDriver = user?.role === 'driver' || user?.role?.value === 'driver';

  if (isDriver) {
    // ── DRIVER TAB BAR: Dashboard · Jobs · Earnings ──
    const DRIVER_TABS = [
      { label: 'Dashboard', icon: 'speedometer-outline', target: 0 },
      { label: 'Jobs', icon: 'cube-outline', target: 2 },
      { label: 'Earnings', icon: 'wallet-outline', target: 3 },
    ];

    return (
      <View style={[styles.tabbar, { paddingBottom: bottomPadding }]}>
        {DRIVER_TABS.map((tab) => {
          const isActive = driverScreenIndex === tab.target;
          return (
            <TouchableOpacity
              key={tab.label}
              style={styles.tab}
              onPress={() => {
                setCurrentScreen('home'); // ensures DriverDashboard is mounted
                setDriverScreenIndex(tab.target);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.tabIcoWrap}>
                <Ionicons
                  name={tab.icon as any}
                  size={20}
                  color={isActive ? COLORS.primary : COLORS.inactive}
                />
              </View>
              <Text style={[styles.tabLbl, isActive && styles.tabLblOn]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── CUSTOMER TAB BAR: Home · Orders · Track ──
  const CUSTOMER_TABS = [
    { label: 'Home', tab: 'home' as const, icon: 'home-outline' },
    { label: 'Orders', tab: 'rides' as const, icon: 'document-text-outline' },
    { label: 'Track', tab: 'track' as const, icon: 'navigate-outline' },
  ];

  return (
    <View style={[styles.tabbar, { paddingBottom: bottomPadding }]}>
      {CUSTOMER_TABS.map((item) => {
        const isActive = bottomTab === item.tab;
        return (
          <TouchableOpacity
            key={item.label}
            style={styles.tab}
            onPress={() => {
              setBottomTab(item.tab);
              setCurrentScreen('home');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.tabIcoWrap}>
              <Ionicons
                name={item.icon as any}
                size={21}
                color={isActive ? COLORS.primary : COLORS.inactive}
              />
            </View>
            <Text style={[styles.tabLbl, isActive && styles.tabLblOn]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabbar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderTopColor: '#D4E2DA',
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#0F1A14',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  tabIcoWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLbl: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.inactive,
    letterSpacing: 0.2,
  },
  tabLblOn: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
