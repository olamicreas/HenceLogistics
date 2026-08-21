import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

export default function WelcomeScreen({ onSelectRole, selectedRole }: any) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F8F6', padding: 24, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 60 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#0F1A14' }}>Hence</Text>
        <Text style={{ fontSize: 16, color: '#7A9080', marginTop: 8 }}>Logistics & Deliveries</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F1A14', marginBottom: 24, textAlign: 'center' }}>How would you like to use Hence?</Text>
      
      <View style={styles.roleRow}>
        {/* CUSTOMER */}
        <TouchableOpacity
          style={[styles.roleBox, selectedRole === 'customer' && styles.roleBoxActive]}
          onPress={() => onSelectRole('customer')}
          activeOpacity={0.8}
        >
          <View style={styles.roleIco}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#1A7A4A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx="12" cy="7" r="4" stroke="#1A7A4A" strokeWidth={2} />
            </Svg>
          </View>
          <Text style={styles.roleTextName}>I need a delivery</Text>
        </TouchableOpacity>

        {/* DRIVER */}
        <TouchableOpacity
          style={[styles.roleBox, selectedRole === 'driver' && styles.roleBoxActive]}
          onPress={() => onSelectRole('driver')}
          activeOpacity={0.8}
        >
          <View style={styles.roleIco}>
            <Svg width={27} height={25} viewBox="0 0 56 32">
              <Rect x="1" y="5" width="50" height="20" rx="3" fill="#B0C4B8"/>
              <Path d="M35 5h13a2 2 0 012 2v10H35V5z" fill="#7A9080"/>
              <Rect x="3" y="7" width="14" height="10" rx="1.5" fill="#D4E8DC"/>
              <Rect x="20" y="7" width="12" height="10" rx="1.5" fill="#D4E8DC"/>
              <Rect x="36" y="7" width="10" height="8" rx="1" fill="#D4E8DC" opacity="0.6"/>
              <Line x1="14" y1="6" x2="14" y2="24" stroke="white" strokeWidth="1" opacity="0.4"/>
              <Line x1="33" y1="6" x2="33" y2="24" stroke="white" strokeWidth="1" opacity="0.4"/>
              <Rect x="46" y="12" width="4" height="4" rx="1" fill="white" opacity="0.9"/>
              <Rect x="1" y="12" width="3" height="4" rx="0.8" fill="#E74C3C" opacity="0.8"/>
              <Rect x="3" y="24" width="48" height="3" rx="1" fill="#7A9080"/>
              <Circle cx="12" cy="27.5" r="4.5" fill="#3D5046"/>
              <Circle cx="12" cy="27.5" r="2" fill="#B0C4B8"/>
              <Circle cx="42" cy="27.5" r="4.5" fill="#3D5046"/>
              <Circle cx="42" cy="27.5" r="2" fill="#B0C4B8"/>
            </Svg>
          </View>
          <Text style={styles.roleTextName}>I am a driver</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  roleRow: { flexDirection: 'column', gap: 16 },
  roleBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#D4E2DA', elevation: 2 },
  roleBoxActive: { borderColor: '#1A7A4A', backgroundColor: '#E8F5EE' },
  roleIco: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F4F8F6', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  roleTextName: { fontSize: 18, fontWeight: '700', color: '#0F1A14' }
});