import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppProvider';
import { styles } from '../styles';

const COLORS = {
  primary: '#1A7A4A',
  inactive: '#B8CEC3',
  ink: '#0F1A14',
  soft: '#7A9080',
};

// Driver Icon Helper mapped directly from Ionicons to avoid missing asset errors
const DriverIcon = ({ name, size, color }: any) => {
  let iconName = 'ellipse';
  if (name === 'ic-home') iconName = 'home-outline';
  if (name === 'ic-map') iconName = 'map-outline';
  if (name === 'ic-hist') iconName = 'time-outline';
  if (name === 'ic-sup') iconName = 'chatbubble-ellipses-outline';
  return <Ionicons name={iconName as any} size={size} color={color} />;
};

export default function BottomNav() {
  const { user, bottomTab, setBottomTab, setCurrentScreen, driverScreenIndex, setDriverScreenIndex } = useAppContext();
  const pb = Platform.OS === 'android' ? 20 : 0;
  
  const isDriver = user?.role === 'driver' || user?.role?.value === 'driver';

  if (isDriver) {
    const TABS = [
      { label: 'Home', icon: 'ic-home', target: 0 },
      { label: 'Active', icon: 'ic-map', target: 2 }, 
      { label: 'History', icon: 'ic-hist', target: 5 },
      { label: 'Support', icon: 'ic-sup', target: 7 },
    ];

    return (
      <View style={[localStyles.tabbar, Platform.OS === 'android' ? { paddingBottom: pb } : {}]}>
        {TABS.map((tab) => (
          <TouchableOpacity 
            key={tab.label} 
            style={localStyles.tab} 
            onPress={() => {
              setCurrentScreen('home'); // ensures DriverDashboard is mounted
              setDriverScreenIndex(tab.target);
            }}
          >
            <View style={localStyles.tabIcoWrap}>
              <DriverIcon
                name={tab.icon}
                size={18}
                color={driverScreenIndex === tab.target ? COLORS.primary : COLORS.inactive}
              />
            </View>
            <Text style={[localStyles.tabLbl, driverScreenIndex === tab.target && localStyles.tabLblOn]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // CUSTOMER BOTTOM NAV
  const renderItem = (tab: string, label: string, icon: any) => {
    const isActive = bottomTab === tab;

    return (
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => {
          setBottomTab(tab);
          if (tab === 'home') setCurrentScreen('home');
        }}
        activeOpacity={0.8}
      >
        <Ionicons
          name={icon}
          size={22} 
          color={isActive ? '#0F766E' : COLORS.inactive}
        />
        <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.bottomNav, Platform.OS === 'android' ? { paddingBottom: pb } : {}]}>
      {renderItem('home', 'Home', 'home-outline')}
      {renderItem('rides', 'Orders', 'car-outline')}
      {renderItem('account', 'Menu', 'grid-outline')}
    </View>
  );
}

const localStyles = StyleSheet.create({
  tabbar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#D4E2DA',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcoWrap: {
    marginBottom: 4,
  },
  tabLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inactive,
  },
  tabLblOn: {
    color: COLORS.primary,
  }
});
