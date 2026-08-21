import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppProvider';
import { styles } from '../styles';

const COLORS = {
  primary: '#0F766E',
  inactive: '#B8CEC3',
};

export default function BottomNav() {
  const { bottomTab, setBottomTab, setCurrentScreen } = useAppContext();

  const renderItem = (tab: string, label: string, icon: any) => {
    const isActive = bottomTab === tab;

    return (
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => {
          setBottomTab(tab);
          // If they click 'account', we actually want to show the 'accountHub'
          // We will handle the routing logic inside HomeScreen.tsx
          if (tab === 'home') setCurrentScreen('home');
        }}
        activeOpacity={0.8}
      >
        <Ionicons
          name={icon}
          size={22} 
          color={isActive ? COLORS.primary : COLORS.inactive}
        />

        <Text
          style={[
            styles.navLabel,
            isActive && styles.navLabelActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.bottomNav}>
      {renderItem('home', 'Home', 'home-outline')}
      {renderItem('rides', 'Orders', 'car-outline')}
      {/* 🚀 Changed to "Menu" to act as a hub */}
      {renderItem('account', 'Menu', 'grid-outline')}
    </View>
  );
}