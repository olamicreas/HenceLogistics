import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppProvider';

const COLORS = {
  primary: '#1A7A4A',
  ink: '#0F1A14',
  soft: '#7A9080',
  border: '#D4E2DA',
  white: '#FFFFFF',
  bg: '#F4F8F6',
  danger: '#C0392B',
};

export default function AccountHubScreen() {
  const { user, logout, setCurrentScreen } = useAppContext();

  const renderOption = (icon: any, title: string, subtitle: string, screenTarget: string, isDanger = false) => (
    <TouchableOpacity 
      style={localStyles.optionRow} 
      activeOpacity={0.7}
      onPress={() => {
        if (screenTarget === 'logout') {
          Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: logout }
          ]);
        } else {
          setCurrentScreen(screenTarget);
        }
      }}
    >
      <View style={[localStyles.iconBox, isDanger && { backgroundColor: '#FDEDEC' }]}>
        <Ionicons name={icon} size={20} color={isDanger ? COLORS.danger : COLORS.primary} />
      </View>
      <View style={localStyles.textCol}>
        <Text style={[localStyles.title, isDanger && { color: COLORS.danger }]}>{title}</Text>
        {subtitle ? <Text style={localStyles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.soft} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={localStyles.scroll}>
        
        <View style={localStyles.header}>
          <View style={localStyles.avatar}>
             <Text style={localStyles.avatarText}>{user?.full_name?.charAt(0) || 'U'}</Text>
          </View>
          <View>
            <Text style={localStyles.userName}>{user?.full_name || 'My Account'}</Text>
            <Text style={localStyles.userEmail}>{user?.email || 'Manage your settings'}</Text>
          </View>
        </View>

        <View style={localStyles.card}>
          {renderOption("person-outline", "Profile Details", "View and edit personal info", "profile")}
          <View style={localStyles.divider} />
          {renderOption("settings-outline", "Account Settings", "Notifications and preferences", "settings")}
        </View>

        <View style={localStyles.card}>
          {renderOption("help-buoy-outline", "Help & Support", "Contact us or read FAQs", "support")}
          <View style={localStyles.divider} />
          {renderOption("document-text-outline", "Terms & Policies", "Legal and privacy agreements", "terms")}
        </View>

        <View style={[localStyles.card, { marginTop: 20 }]}>
          {renderOption("log-out-outline", "Log Out", "", "logout")}
          <View style={localStyles.divider} />
          {renderOption("trash-outline", "Delete Account", "Permanently remove your data", "delete", true)}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#C5E8D4', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 20, fontWeight: '600', color: COLORS.primary },
  userName: { fontSize: 18, fontWeight: '600', color: COLORS.ink },
  userEmail: { fontSize: 13, color: COLORS.soft, marginTop: 2, fontWeight: '400' },
  
  card: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#E8F5EE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  textCol: { flex: 1 },
  title: { fontSize: 14, fontWeight: '500', color: COLORS.ink },
  subtitle: { fontSize: 12, color: COLORS.soft, marginTop: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 64 },
});