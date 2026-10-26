import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Modal,
  Switch,
  Share,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppProvider';
import { styles as globalStyles } from '../styles';
import { getUserDisplayName, pickImageFromLibrary } from '../utils/avatar';
import UserAvatar from '../components/UserAvatar';

type EditFieldType = 'full_name' | 'email' | 'phone' | 'vehicle_type' | 'registration_plate';

export default function ProfileScreen() {
  const {
    user,
    setUser,
    token,
    profileDraft,
    setProfileDraft,
    loading,
    saveProfile,
    uploadAvatar: contextUploadAvatar,
    setCurrentScreen,
    setBottomTab,
    isPremium,
    logout,
  } = useAppContext();

  const isDriver = (user?.role?.value || user?.role) === 'driver';

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Edit Sheet State
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<EditFieldType | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editInputType, setEditInputType] = useState<'default' | 'email-address' | 'phone-pad'>('default');
  const [savingEdit, setSavingEdit] = useState(false);

  // Secondary Sheets State
  const [notifSheetVisible, setNotifSheetVisible] = useState(false);
  const [privacySheetVisible, setPrivacySheetVisible] = useState(false);
  const [verifSheetVisible, setVerifSheetVisible] = useState(false);

  // Notification toggles
  const [notifJobAlerts, setNotifJobAlerts] = useState(true);
  const [notifSurgeAlerts, setNotifSurgeAlerts] = useState(true);
  const [notifEarningsSummary, setNotifEarningsSummary] = useState(true);

  // Strict Sync: populate draft from user on mount
  useEffect(() => {
    if (user && setProfileDraft) {
      const derivedFullName =
        user.full_name ||
        user.fullName ||
        (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '') ||
        user.name ||
        '';
      setProfileDraft((prev: any) => ({
        ...user,
        ...(prev || {}),
        full_name: (prev?.full_name || derivedFullName || '').trim(),
      }));
    }
  }, [user]);

  const handlePickAvatar = async () => {
    try {
      const result = await pickImageFromLibrary();
      if (!result) return;

      setUploadingAvatar(true);
      const chosen = result.base64 || result.uri;
      setProfileDraft((prev: any) => ({ ...(prev || {}), avatar_url: chosen }));
      if (setUser) setUser((prev: any) => ({ ...(prev || {}), avatar_url: chosen }));

      if (contextUploadAvatar) {
        await contextUploadAvatar(result);
      }
    } catch (e: any) {
      console.warn('Avatar Upload Error:', e?.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const userObj = profileDraft || user;
  const displayName = getUserDisplayName(userObj, isDriver) || 'Driver';
  const driverId = userObj?.driver_id || userObj?.id ? `HEN-DRV-${userObj?.id || '7841'}` : 'HEN-DRV-7841';

  const currentFullName = userObj?.full_name || displayName;
  const currentEmail = userObj?.email || 'driver@hence.ie';
  const currentPhone = userObj?.phone || '+353 87 234 5678';
  const currentVehicleType = userObj?.vehicle_type || userObj?.vehicle_make || 'Large Van · 2021 Ford Transit';
  const currentPlate = userObj?.registration_plate || userObj?.reg_plate || userObj?.vehicle_plate || '21-D-12345';

  const openEditSheet = (field: EditFieldType, label: string, initialVal: string, keyboard: 'default' | 'email-address' | 'phone-pad' = 'default') => {
    setEditTarget(field);
    setEditLabel(label);
    setEditValue(initialVal);
    setEditInputType(keyboard);
    setEditSheetVisible(true);
  };

  const handleSaveEditSheet = async () => {
    if (!editTarget) return;
    const trimmed = editValue.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a valid value.');
      return;
    }

    try {
      setSavingEdit(true);

      const updatedDraft = { ...(profileDraft || user || {}) };

      if (editTarget === 'full_name') {
        updatedDraft.full_name = trimmed;
      } else if (editTarget === 'email') {
        updatedDraft.email = trimmed;
      } else if (editTarget === 'phone') {
        updatedDraft.phone = trimmed;
      } else if (editTarget === 'vehicle_type') {
        updatedDraft.vehicle_type = trimmed;
        updatedDraft.vehicle_make = trimmed;
      } else if (editTarget === 'registration_plate') {
        updatedDraft.registration_plate = trimmed;
        updatedDraft.reg_plate = trimmed;
        updatedDraft.vehicle_plate = trimmed;
      }

      setProfileDraft(updatedDraft);

      // Save to server
      if (saveProfile) {
        await saveProfile();
      }

      if (setUser) {
        setUser((prev: any) => ({ ...(prev || {}), ...updatedDraft }));
      }

      setEditSheetVisible(false);
      setEditTarget(null);
      Alert.alert('Success', `${editLabel} updated successfully!`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const getNotifSummary = () => {
    const active = [];
    if (notifJobAlerts) active.push('Job alerts');
    if (notifSurgeAlerts) active.push('Surge alerts');
    if (notifEarningsSummary) active.push('Earnings');
    if (active.length === 0) return 'All off';
    return `${active.slice(0, 2).join(', ')} on`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            setCurrentScreen('driver-dashboard');
            setBottomTab('dashboard');
          }}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0F1A14" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Profile Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Hero */}
          <View style={styles.heroBanner}>
            <View style={styles.avatarWrap}>
              <UserAvatar
                user={userObj}
                size={74}
                isDriver={isDriver}
                onPress={handlePickAvatar}
                showCameraBadge
                uploading={uploadingAvatar}
                bgColor="rgba(200,241,53,0.2)"
                textColor="#C8F135"
                borderColor="rgba(200,241,53,0.5)"
              />
            </View>
            <Text style={styles.heroName}>{currentFullName}</Text>
            <Text style={styles.heroDriverId}>{driverId}</Text>
          </View>

          <View style={styles.padContent}>
            {/* CARD 1: Personal Details */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Personal Details</Text>
              </View>

              {/* Full Name */}
              <View style={styles.supRow}>
                <View style={[styles.supIconWrap, { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }]}>
                  <Ionicons name="person-outline" size={18} color="#1A7A4A" />
                </View>
                <View style={styles.supInfo}>
                  <Text style={styles.supTitle}>Full Name</Text>
                  <Text style={styles.supSub}>{currentFullName}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openEditSheet('full_name', 'Full Name', currentFullName, 'default')}
                  style={styles.editPill}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editPillText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Email */}
              <View style={styles.supRow}>
                <View style={[styles.supIconWrap, { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }]}>
                  <Ionicons name="mail-outline" size={18} color="#1A7A4A" />
                </View>
                <View style={styles.supInfo}>
                  <Text style={styles.supTitle}>Email</Text>
                  <Text style={styles.supSub}>{currentEmail}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openEditSheet('email', 'Email address', currentEmail, 'email-address')}
                  style={styles.editPill}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editPillText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Phone */}
              <View style={[styles.supRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.supIconWrap, { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }]}>
                  <Ionicons name="call-outline" size={18} color="#1A7A4A" />
                </View>
                <View style={styles.supInfo}>
                  <Text style={styles.supTitle}>Phone</Text>
                  <Text style={styles.supSub}>{currentPhone}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openEditSheet('phone', 'Phone number', currentPhone, 'phone-pad')}
                  style={styles.editPill}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editPillText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CARD 2: Vehicle */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Vehicle</Text>
              </View>

              {/* Vehicle Type */}
              <View style={styles.supRow}>
                <View style={[styles.supIconWrap, { backgroundColor: '#0F2D20', borderColor: '#0F2D20' }]}>
                  <MaterialCommunityIcons name="van-utility" size={19} color="#C8F135" />
                </View>
                <View style={styles.supInfo}>
                  <Text style={styles.supTitle}>Vehicle Type</Text>
                  <Text style={styles.supSub}>{currentVehicleType}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openEditSheet('vehicle_type', 'Vehicle type', currentVehicleType, 'default')}
                  style={styles.editPill}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editPillText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Reg Plate */}
              <View style={[styles.supRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.supIconWrap, { backgroundColor: '#EAF2FB', borderColor: '#C4DDF5' }]}>
                  <Ionicons name="card-outline" size={18} color="#2980B9" />
                </View>
                <View style={styles.supInfo}>
                  <Text style={styles.supTitle}>Reg Plate</Text>
                  <Text style={styles.supSub}>{currentPlate}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => openEditSheet('registration_plate', 'Registration plate', currentPlate, 'default')}
                  style={styles.editPill}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editPillText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* CARD 3: Account */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Account</Text>
              </View>

              {/* Subscription */}
              <TouchableOpacity
                onPress={() => setCurrentScreen('subscription')}
                style={styles.supRow}
                activeOpacity={0.7}
              >
                <View style={[styles.supIconWrap, { backgroundColor: '#FEF3DC', borderColor: '#E8C87A' }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#C47A0A" />
                </View>
                <View style={styles.supInfo}>
                  <Text style={styles.supTitle}>Subscription</Text>
                  <Text style={styles.supSub}>
                    {isPremium ? 'Professional · Renews 1 May 2027' : 'Basic Plan · Active'}
                  </Text>
                </View>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>{isPremium ? 'PRO' : 'BASIC'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A3B8AD" />
              </TouchableOpacity>

              {/* Notifications */}
              <TouchableOpacity
                onPress={() => setNotifSheetVisible(true)}
                style={styles.supRow}
                activeOpacity={0.7}
              >
                <View style={[styles.supIconWrap, { backgroundColor: '#F4F8F6', borderColor: '#D4E2DA' }]}>
                  <Ionicons name="notifications-outline" size={18} color="#688275" />
                </View>
                <View style={styles.supInfo}>
                  <Text style={styles.supTitle}>Notifications</Text>
                  <Text style={styles.supSub}>{getNotifSummary()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A3B8AD" />
              </TouchableOpacity>

              {/* Privacy & Data */}
              <TouchableOpacity
                onPress={() => setPrivacySheetVisible(true)}
                style={styles.supRow}
                activeOpacity={0.7}
              >
                <View style={[styles.supIconWrap, { backgroundColor: '#F4F8F6', borderColor: '#D4E2DA' }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="#688275" />
                </View>
                <View style={styles.supInfo}>
                  <Text style={styles.supTitle}>Privacy & Data</Text>
                  <Text style={styles.supSub}>Download, manage or delete</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A3B8AD" />
              </TouchableOpacity>

              {/* Verification */}
              <TouchableOpacity
                onPress={() => setVerifSheetVisible(true)}
                style={[styles.supRow, { borderBottomWidth: 0 }]}
                activeOpacity={0.7}
              >
                <View style={[styles.supIconWrap, { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#1A7A4A" />
                </View>
                <View style={styles.supInfo}>
                  <Text style={styles.supTitle}>Verification</Text>
                  <Text style={styles.supSub}>All documents approved</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A3B8AD" />
              </TouchableOpacity>
            </View>

            {/* LOG OUT BUTTON */}
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Log Out', 'Are you sure you want to log out of your driver account?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Out', style: 'destructive', onPress: logout },
                ]);
              }}
              style={styles.logoutButton}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── EDIT SHEET MODAL (Prototype exact #editSheet) ── */}
      <Modal
        visible={editSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setEditSheetVisible(false)}
        >
          <TouchableOpacity
            style={styles.editSheetContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dragHandle} />
            <Text style={styles.editSheetLabel}>{editLabel}</Text>
            <TextInput
              style={styles.editSheetInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType={editInputType}
              autoCapitalize={editTarget === 'registration_plate' ? 'characters' : 'words'}
              autoFocus
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.editSheetButtonsRow}>
              <TouchableOpacity
                onPress={() => setEditSheetVisible(false)}
                style={styles.cancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveEditSheet}
                style={styles.saveBtn}
                activeOpacity={0.8}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── NOTIFICATIONS SHEET ── */}
      <Modal
        visible={notifSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setNotifSheetVisible(false)}
        >
          <View style={styles.secondarySheetContainer}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetHeaderTitle}>Notifications</Text>
            <Text style={styles.sheetHeaderSub}>Manage push & sms notifications</Text>

            <View style={styles.notifRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifRowTitle}>Job alerts</Text>
                <Text style={styles.notifRowSub}>Instant push when dispatch assigns offers</Text>
              </View>
              <Switch
                value={notifJobAlerts}
                onValueChange={setNotifJobAlerts}
                trackColor={{ false: '#D4E2DA', true: '#1A7A4A' }}
              />
            </View>

            <View style={styles.notifRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifRowTitle}>Surge zone alerts</Text>
                <Text style={styles.notifRowSub}>High-demand live zone alerts near your location</Text>
              </View>
              <Switch
                value={notifSurgeAlerts}
                onValueChange={setNotifSurgeAlerts}
                trackColor={{ false: '#D4E2DA', true: '#1A7A4A' }}
              />
            </View>

            <View style={[styles.notifRow, { borderBottomWidth: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifRowTitle}>Weekly earnings report</Text>
                <Text style={styles.notifRowSub}>Summary breakdown every Monday morning</Text>
              </View>
              <Switch
                value={notifEarningsSummary}
                onValueChange={setNotifEarningsSummary}
                trackColor={{ false: '#D4E2DA', true: '#1A7A4A' }}
              />
            </View>

            <TouchableOpacity
              onPress={() => setNotifSheetVisible(false)}
              style={styles.sheetDoneBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.sheetDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── PRIVACY SHEET ── */}
      <Modal
        visible={privacySheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrivacySheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPrivacySheetVisible(false)}
        >
          <View style={styles.secondarySheetContainer}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetHeaderTitle}>Privacy & Data</Text>
            <Text style={styles.sheetHeaderSub}>Manage your data, export records, or request deletion</Text>

            <TouchableOpacity
              onPress={() => {
                setPrivacySheetVisible(false);
                Alert.alert(
                  'Data Export Requested',
                  'Your data export package has been requested. A download link will be emailed within 24 hours.'
                );
              }}
              style={styles.privacyActionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={18} color="#1A7A4A" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyActionTitle}>Download my data</Text>
                <Text style={styles.privacyActionSub}>CSV of jobs, earnings and ride logs</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#A3B8AD" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPrivacySheetVisible(false);
                Alert.alert(
                  'Account Deletion',
                  'To delete your driver profile and remove data, please contact driver-support@hence.ie. We process all requests in compliance with GDPR.'
                );
              }}
              style={[styles.privacyActionBtn, { borderColor: '#F5C6C2', backgroundColor: '#FDEDEC', marginTop: 10 }]}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color="#C0392B" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.privacyActionTitle, { color: '#C0392B' }]}>Request account deletion</Text>
                <Text style={styles.privacyActionSub}>Permanently delete account and credentials</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPrivacySheetVisible(false)}
              style={[styles.sheetDoneBtn, { marginTop: 18 }]}
              activeOpacity={0.8}
            >
              <Text style={styles.sheetDoneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── VERIFICATION SHEET ── */}
      <Modal
        visible={verifSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setVerifSheetVisible(false)}
        >
          <View style={styles.secondarySheetContainer}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetHeaderTitle}>Driver Verification</Text>
            <Text style={styles.sheetHeaderSub}>Status of regulatory credentials on file</Text>

            {[
              { doc: 'Driving License', status: 'Approved', valid: 'Valid to Dec 2028' },
              { doc: 'Vehicle Insurance', status: 'Approved', valid: 'Valid to Nov 2026' },
              { doc: 'NCT / Roadworthiness', status: 'Approved', valid: 'Valid to Sep 2027' },
              { doc: 'Commercial Tax', status: 'Approved', valid: 'Valid to Aug 2027' },
            ].map((d, i) => (
              <View key={d.doc} style={[styles.verifDocRow, i === 3 && { borderBottomWidth: 0 }]}>
                <Ionicons name="checkmark-circle" size={20} color="#1A7A4A" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifDocName}>{d.doc}</Text>
                  <Text style={styles.verifDocMeta}>{d.valid}</Text>
                </View>
                <View style={styles.verifBadgePill}>
                  <Text style={styles.verifBadgeText}>{d.status}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setVerifSheetVisible(false)}
              style={styles.sheetDoneBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.sheetDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F8F6',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D4E2DA',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F1A14',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  heroBanner: {
    backgroundColor: '#1A7A4A',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    marginBottom: 12,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  heroDriverId: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  padContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4E2DA',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#0F1A14',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F2',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F1A14',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  supRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F8F6',
  },
  supIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  supInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  supTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#688275',
    marginBottom: 2,
  },
  supSub: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F1A14',
  },
  editPill: {
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#C5E8D4',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A7A4A',
  },
  proBadge: {
    backgroundColor: '#FEF3DC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8C87A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 6,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C47A0A',
  },
  verifiedBadge: {
    backgroundColor: '#E8F5EE',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C5E8D4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A7A4A',
  },
  logoutButton: {
    backgroundColor: '#FDEDEC',
    borderWidth: 1.5,
    borderColor: '#F5C6C2',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  logoutButtonText: {
    color: '#C0392B',
    fontWeight: '800',
    fontSize: 14,
  },

  // Modal Sheet Common
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 26, 20, 0.45)',
    justifyContent: 'flex-end',
  },
  dragHandle: {
    width: 38,
    height: 4,
    backgroundColor: '#D4E2DA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  editSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  editSheetLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#688275',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  editSheetInput: {
    width: '100%',
    backgroundColor: '#F4F8F6',
    borderWidth: 1.5,
    borderColor: '#1A7A4A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F1A14',
    marginBottom: 16,
  },
  editSheetButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#F4F8F6',
    borderWidth: 1.5,
    borderColor: '#D4E2DA',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A5245',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    backgroundColor: '#1A7A4A',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Secondary Sheets
  secondarySheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  sheetHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F1A14',
    marginBottom: 2,
  },
  sheetHeaderSub: {
    fontSize: 12,
    color: '#688275',
    marginBottom: 16,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F8F6',
  },
  notifRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F1A14',
    marginBottom: 2,
  },
  notifRowSub: {
    fontSize: 11,
    color: '#688275',
  },
  sheetDoneBtn: {
    backgroundColor: '#1A7A4A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  sheetDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  privacyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F8F6',
    borderWidth: 1,
    borderColor: '#D4E2DA',
    borderRadius: 10,
    padding: 14,
  },
  privacyActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1A14',
  },
  privacyActionSub: {
    fontSize: 11,
    color: '#688275',
    marginTop: 2,
  },
  verifDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F8F6',
  },
  verifDocName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1A14',
  },
  verifDocMeta: {
    fontSize: 11,
    color: '#688275',
    marginTop: 1,
  },
  verifBadgePill: {
    backgroundColor: '#E8F5EE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  verifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1A7A4A',
  },
});