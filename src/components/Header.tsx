import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAppContext } from '../context/AppProvider';
import { styles } from '../styles';

export default function Header() {
  const {
    token,
    user,
    menuVisible,
    setMenuVisible,
    setCurrentScreen,
    setBottomTab,
    logout,
    setDriverScreenIndex
  } = useAppContext();

  if (!token) return null;

  const isDriver = user?.role === 'driver';

  return (
    <>
      {/* 🛡️ YOUR EXACT ORIGINAL HEADER UI - 100% UNTOUCHED */}
      <View 
        style={[
          styles.header, 
          { 
            backgroundColor: '#0F1A14', 
            paddingVertical: 12, 
            borderBottomWidth: 0,
            borderBottomColor: '#E4EBE7', 
          }
        ]}
      >
        
        {/* LOGO - Text based with green dot */}
        <View style={{ paddingHorizontal: 4, justifyContent: 'center' }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 }}>
            HENCE<Text style={{ color: '#1A7A4A' }}>.</Text>
          </Text>
        </View>

        {/* MENU BUTTON - ONLY VISIBLE TO DRIVERS NOW */}
        {isDriver && (
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={{
              width: 38,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: '#F8FBF9', 
              borderWidth: 1,
              borderColor: '#E4EBE7',
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="menu-outline" size={24} color="#0F1A14" />
          </TouchableOpacity>
        )}
      </View>

      {/* 🚀 MODAL MENU - STRICTLY FOR DRIVERS */}
      {isDriver && (
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.3)', 
              justifyContent: 'flex-start',
            }}
            onPress={() => setMenuVisible(false)}
          >
            <BlurView
              intensity={80}
              tint="light"
              style={{
                width: 260, 
                alignSelf: 'flex-end',
                marginTop: 62,
                marginRight: 12,
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.6)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.28,
                shadowRadius: 32,
              }}
            >
              <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', padding: 6 }}>
                
                <TouchableOpacity style={ddStyles.item} onPress={() => { setMenuVisible(false); setCurrentScreen('profile'); setBottomTab('account'); }}>
                  <Ionicons name="person-outline" size={18} color="#1A7A4A" style={ddStyles.icon} />
                  <Text style={ddStyles.text}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity style={ddStyles.item} onPress={() => { setMenuVisible(false); setBottomTab('rides'); setDriverScreenIndex(3); }}>
                  <Ionicons name="wallet-outline" size={18} color="#2563EB" style={ddStyles.icon} />
                  <Text style={ddStyles.text}>View Earnings</Text>
                </TouchableOpacity>

                <TouchableOpacity style={ddStyles.item} onPress={() => { setMenuVisible(false); setBottomTab('rides'); setDriverScreenIndex(6); }}>
                  <Ionicons name="document-text-outline" size={18} color="#8B5CF6" style={ddStyles.icon} />
                  <Text style={ddStyles.text}>Verification Docs</Text>
                </TouchableOpacity>

                <TouchableOpacity style={ddStyles.item} onPress={() => { setMenuVisible(false); setCurrentScreen('subscription'); }}>
                  <Ionicons name="star-outline" size={18} color="#F59E0B" style={ddStyles.icon} />
                  <Text style={ddStyles.text}>Upgrade</Text>
                </TouchableOpacity>

                <View style={ddStyles.divider} />

                {/* LOGOUT BUTTON */}
                <TouchableOpacity style={ddStyles.item} onPress={() => { setMenuVisible(false); logout(); }}>
                  <Ionicons name="log-out-outline" size={18} color="#1A7A4A" style={ddStyles.icon} />
                  <Text style={[ddStyles.text, { color: '#0F1A14' }]}>Log Out</Text>
                </TouchableOpacity>
                
              </View>
            </BlurView>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const ddStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, borderRadius: 9 },
  icon: { marginRight: 11 },
  text: { fontSize: 13, fontWeight: '700', color: '#0F1A14' },
  divider: { height: 1, backgroundColor: '#D4E2DA', marginVertical: 4, marginHorizontal: 4 }
});