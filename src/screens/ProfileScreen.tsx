// ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
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
  Image,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../context/AppProvider';
import { styles as globalStyles } from '../styles';

// 🔥 HELPER: Fixes broken image links if the backend returns a relative URL (e.g. "/uploads/img.jpg")
const getFullUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://hencedelivery.com${url.startsWith('/') ? '' : '/'}${url}`;
};

// Local helpers for rendering inputs neatly
const InputGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={localStyles.inputGroup}>
    <Text style={localStyles.label}>{label}</Text>
    {children}
  </View>
);

const SectionHeader = ({ title, icon }: { title: string; icon?: any }) => (
  <View style={localStyles.sectionHeader}>
    {icon && (
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color="#6B7280"
        style={localStyles.sectionIcon}
      />
    )}
    <Text style={localStyles.sectionTitleText}>{title}</Text>
  </View>
);

export default function ProfileScreen() {
  const {
    user,
    setUser,
    token,
    profileDraft,
    setProfileDraft,
    loading,
    saveProfile,
    setCurrentScreen,
    setBottomTab,
    isPremium,
    subscriptionLoading,
    checkSubscriptionStatus,
    logout,
  } = useAppContext();

  const isDriver = user?.role === 'driver';
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    console.log("=== PROFILE DEBUG ===");
    console.log("User Object from AppProvider:", JSON.stringify(user, null, 2));
  }, [user]);

  // Strict Sync: Force the draft to perfectly match the logged-in user when not editing.
  useEffect(() => {
    if (user && !isEditing && setProfileDraft) {
      setProfileDraft({ ...user });
    }
  }, [user, isEditing]);

  const handleSave = async () => {
    await saveProfile();
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (setProfileDraft && user) {
      setProfileDraft({ ...user });
    }
    setIsEditing(false);
  };

  const handlePickAvatar = async () => {
    if (!isEditing) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      uploadAvatar(uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || `avatar_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', { uri, name: filename, type } as any);

      const response = await axios.post('https://hencedelivery.com/auth/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });

      const newAvatarUrl = response.data.url;

      setProfileDraft({ ...profileDraft, avatar_url: newAvatarUrl });
      if (setUser) setUser({ ...user, avatar_url: newAvatarUrl });

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (e: any) {
      console.warn("Avatar Upload Error:", e?.response?.data || e?.message);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 🔥 HELPER: Dynamically switch input styles based on edit mode
  const getInputStyle = (editable: boolean) => [
    localStyles.inputBase,
    editable ? localStyles.inputEditable : localStyles.inputReadOnly
  ];

  const safeAvatarUrl = getFullUrl(profileDraft?.avatar_url);

  return (
    <SafeAreaView style={globalStyles.container}>
      <View style={localStyles.header}>
        {/* 🔥 FIXED ROUTING: Takes user back to account hub */}
        <TouchableOpacity
          onPress={() => {
            setCurrentScreen('account-hub');
            setBottomTab('account');
          }}
          style={localStyles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <Text style={localStyles.headerTitle}>{isEditing ? 'EDIT PROFILE' : 'MY PROFILE'}</Text>

        <View style={localStyles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={localStyles.flex}
      >
        <ScrollView contentContainerStyle={localStyles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar / Role Badge */}
          <View style={localStyles.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} disabled={!isEditing} activeOpacity={0.8}>
              <View style={localStyles.avatarContainer}>
                {safeAvatarUrl ? (
                  <Image source={{ uri: safeAvatarUrl }} style={localStyles.avatarImage} />
                ) : (
                  <Text style={localStyles.avatarInitials}>
                    {profileDraft?.full_name
                      ? profileDraft.full_name.substring(0, 2).toUpperCase()
                      : 'US'}
                  </Text>
                )}

                {isEditing && (
                  <View style={localStyles.editAvatarBadge}>
                    {uploadingAvatar ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="camera" size={14} color="#fff" />
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <Text style={localStyles.userName}>{profileDraft?.full_name || 'User Name'}</Text>
            <Text style={localStyles.userEmail}>{profileDraft?.email || 'No email'}</Text>

            <View
              style={[
                localStyles.roleBadge,
                isDriver ? localStyles.roleBadgeDriver : localStyles.roleBadgeUser,
              ]}
            >
              <Text
                style={[
                  localStyles.roleText,
                  isDriver ? localStyles.roleTextDriver : localStyles.roleTextUser,
                ]}
              >
                {isDriver ? 'Driver Account' : 'Individual Account'}
              </Text>
            </View>

            {isEditing && (
              <View style={localStyles.editingBanner}>
                <Ionicons name="pencil" size={14} color="#1A7A4A" style={{ marginRight: 6 }} />
                <Text style={localStyles.editingBannerText}>You are currently editing your profile</Text>
              </View>
            )}
          </View>

          {/* PERSONAL INFO */}
          <SectionHeader title="Personal Details" icon="account-outline" />
          <View style={localStyles.card}>
            <InputGroup label="Full Name">
              <TextInput
                style={getInputStyle(isEditing)}
                value={profileDraft?.full_name}
                editable={isEditing}
                onChangeText={(v) => setProfileDraft({ ...profileDraft, full_name: v })}
                placeholder="e.g. John Doe"
                placeholderTextColor="#9CA3AF"
              />
            </InputGroup>

            <InputGroup label="Email Address">
              {/* Email is permanently read-only */}
              <TextInput
                style={getInputStyle(false)}
                value={profileDraft?.email}
                editable={false}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </InputGroup>

            <View style={localStyles.row}>
              <View style={localStyles.col}>
                <InputGroup label="Phone">
                  <TextInput
                    style={getInputStyle(isEditing)}
                    value={profileDraft?.phone}
                    editable={isEditing}
                    onChangeText={(v) => setProfileDraft({ ...profileDraft, phone: v })}
                    keyboardType="phone-pad"
                    placeholder="+353..."
                    placeholderTextColor="#9CA3AF"
                  />
                </InputGroup>
              </View>

              <View style={localStyles.col}>
                <InputGroup label="Date of Birth">
                  <TextInput
                    style={getInputStyle(isEditing)}
                    value={profileDraft?.dob}
                    editable={isEditing}
                    onChangeText={(v) => setProfileDraft({ ...profileDraft, dob: v })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </InputGroup>
              </View>
            </View>

            <InputGroup label="Address">
              <TextInput
                style={getInputStyle(isEditing)}
                value={profileDraft?.address}
                editable={isEditing}
                onChangeText={(v) => setProfileDraft({ ...profileDraft, address: v })}
                placeholder="Street Address"
                placeholderTextColor="#9CA3AF"
              />
            </InputGroup>

            <View style={localStyles.row}>
              <View style={localStyles.col}>
                <InputGroup label="County">
                  <TextInput
                    style={getInputStyle(isEditing)}
                    value={profileDraft?.city}
                    editable={isEditing}
                    onChangeText={(v) => setProfileDraft({ ...profileDraft, city: v })}
                    placeholder="e.g. Dublin"
                    placeholderTextColor="#9CA3AF"
                  />
                </InputGroup>
              </View>

              <View style={localStyles.colSmall}>
                <InputGroup label="Eircode">
                  <TextInput
                    style={getInputStyle(isEditing)}
                    value={profileDraft?.postal_code}
                    editable={isEditing}
                    onChangeText={(v) => setProfileDraft({ ...profileDraft, postal_code: v })}
                    placeholder="D24..."
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                  />
                </InputGroup>
              </View>
            </View>
          </View>

          {/* DRIVER SPECIFIC SECTION */}
          {isDriver && (
            <>
              <SectionHeader title="Vehicle & Driver Info" icon="car-outline" />
              <View style={localStyles.card}>
                <InputGroup label="Driver License & Plate">
                  <View style={localStyles.row}>
                    <TextInput
                      style={[getInputStyle(isEditing), localStyles.flexInput]}
                      value={profileDraft?.license_number}
                      editable={isEditing}
                      onChangeText={(v) => setProfileDraft({ ...profileDraft, license_number: v })}
                      placeholder="License #"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      style={[getInputStyle(isEditing), localStyles.flexInput]}
                      value={profileDraft?.vehicle_plate}
                      editable={isEditing}
                      onChangeText={(v) => setProfileDraft({ ...profileDraft, vehicle_plate: v })}
                      placeholder="Plate #"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                    />
                  </View>
                </InputGroup>

                <InputGroup label="Vehicle Details">
                  <View style={localStyles.row}>
                    <TextInput
                      style={[getInputStyle(isEditing), localStyles.flexInput]}
                      value={profileDraft?.vehicle_make}
                      editable={isEditing}
                      onChangeText={(v) => setProfileDraft({ ...profileDraft, vehicle_make: v })}
                      placeholder="Make/Model"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      style={[getInputStyle(isEditing), localStyles.flexInput]}
                      value={profileDraft?.vehicle_color}
                      editable={isEditing}
                      onChangeText={(v) => setProfileDraft({ ...profileDraft, vehicle_color: v })}
                      placeholder="Color"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </InputGroup>

                <InputGroup label="Bank Info (Last 4 digits)">
                  <TextInput
                    style={getInputStyle(isEditing)}
                    value={profileDraft?.bank_account_last4}
                    editable={isEditing}
                    onChangeText={(v) => setProfileDraft({ ...profileDraft, bank_account_last4: v })}
                    keyboardType="numeric"
                    maxLength={4}
                    placeholder="****"
                    placeholderTextColor="#9CA3AF"
                  />
                </InputGroup>

                <InputGroup label="Bio">
                  <TextInput
                    style={[getInputStyle(isEditing), localStyles.textArea]}
                    value={profileDraft?.bio}
                    editable={isEditing}
                    onChangeText={(v) => setProfileDraft({ ...profileDraft, bio: v })}
                    multiline
                    placeholder="Tell us a bit about yourself..."
                    placeholderTextColor="#9CA3AF"
                  />
                </InputGroup>
              </View>
            </>
          )}

          {/* DRIVER VERIFICATION SUMMARY */}
          {isDriver && (
            <>
              <SectionHeader title="Verification" icon="shield-check-outline" />
              <View style={localStyles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={localStyles.statusText}>Account Status:</Text>
                  <View style={[localStyles.statusBadge, profileDraft?.driver_verified ? localStyles.statusBadgeVerified : localStyles.statusBadgePending]}>
                    <Text style={[localStyles.statusBadgeText, profileDraft?.driver_verified ? localStyles.statusTextVerified : localStyles.statusTextPending]}>
                      {profileDraft?.driver_verified ? 'VERIFIED' : profileDraft?.verification_docs ? 'PENDING REVIEW' : 'NOT SUBMITTED'}
                    </Text>
                  </View>
                </View>

                <Text style={localStyles.statusSubtext}>
                  {profileDraft?.driver_verified
                    ? 'Your documents have been successfully verified.'
                    : 'Upload required documents from the Driver Dashboard to start verification.'}
                </Text>

                {/* 🚀 FIX: Displaying Full URLs for Thumbnails */}
                <View style={localStyles.docsRow}>
                  {profileDraft?.verification_docs?.reg && (
                    <TouchableOpacity style={localStyles.docItem} onPress={() => Linking.openURL(getFullUrl(profileDraft.verification_docs.reg)!)}>
                      <Image source={{ uri: getFullUrl(profileDraft.verification_docs.reg)! }} style={localStyles.docImage} />
                      <Text style={localStyles.docLabel}>Registration</Text>
                    </TouchableOpacity>
                  )}

                  {profileDraft?.verification_docs?.insurance && (
                    <TouchableOpacity style={localStyles.docItem} onPress={() => Linking.openURL(getFullUrl(profileDraft.verification_docs.insurance)!)}>
                      <Image source={{ uri: getFullUrl(profileDraft.verification_docs.insurance)! }} style={localStyles.docImage} />
                      <Text style={localStyles.docLabel}>Insurance</Text>
                    </TouchableOpacity>
                  )}

                  {profileDraft?.verification_docs?.id && (
                    <TouchableOpacity style={localStyles.docItem} onPress={() => Linking.openURL(getFullUrl(profileDraft.verification_docs.id)!)}>
                      <Image source={{ uri: getFullUrl(profileDraft.verification_docs.id)! }} style={localStyles.docImage} />
                      <Text style={localStyles.docLabel}>ID</Text>
                    </TouchableOpacity>
                  )}

                  {profileDraft?.verification_docs?.license && (
                    <TouchableOpacity style={localStyles.docItem} onPress={() => Linking.openURL(getFullUrl(profileDraft.verification_docs.license)!)}>
                      <Image source={{ uri: getFullUrl(profileDraft.verification_docs.license)! }} style={localStyles.docImage} />
                      <Text style={localStyles.docLabel}>License</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}

          {/* EMERGENCY CONTACT */}
          <SectionHeader title="Emergency Contact" icon="alert-circle-outline" />
          <View style={localStyles.card}>
            <View style={localStyles.row}>
              <View style={localStyles.col}>
                <InputGroup label="Contact Name">
                  <TextInput
                    style={getInputStyle(isEditing)}
                    value={profileDraft?.emergency_contact_name}
                    editable={isEditing}
                    onChangeText={(v) => setProfileDraft({ ...profileDraft, emergency_contact_name: v })}
                    placeholder="Full Name"
                    placeholderTextColor="#9CA3AF"
                  />
                </InputGroup>
              </View>

              <View style={localStyles.col}>
                <InputGroup label="Contact Phone">
                  <TextInput
                    style={getInputStyle(isEditing)}
                    value={profileDraft?.emergency_contact_phone}
                    editable={isEditing}
                    onChangeText={(v) => setProfileDraft({ ...profileDraft, emergency_contact_phone: v })}
                    placeholder="+353..."
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </InputGroup>
              </View>
            </View>
          </View>

          {/* SUBSCRIPTION - ONLY VISIBLE IN READ MODE */}
          {isDriver && !isEditing && (
            <>
              <SectionHeader title="Subscription" icon="card-account-details-outline" />
              <View style={localStyles.card}>
                <View style={localStyles.subscriptionRow}>
                  <View style={localStyles.subscriptionInfo}>
                    <Text style={localStyles.subscriptionTitle}>
                      {isPremium ? 'Premium Plan' : 'Standard Plan'}
                    </Text>
                    <Text style={localStyles.subscriptionSubtitle}>
                      {isPremium ? 'Active and recurring' : 'Basic features only'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      if (isPremium) Alert.alert('Premium', 'Subscription active.');
                      else setCurrentScreen('subscription');
                    }}
                    disabled={subscriptionLoading}
                    style={[
                      localStyles.smallBtn,
                      isPremium ? localStyles.smallBtnActive : localStyles.smallBtnUpgrade,
                    ]}
                  >
                    {subscriptionLoading ? (
                      <ActivityIndicator size="small" color={isPremium ? '#1A7A4A' : '#fff'} />
                    ) : (
                      <Text style={[localStyles.smallBtnText, isPremium ? localStyles.smallBtnTextActive : localStyles.smallBtnTextUpgrade]}>
                        {isPremium ? 'Active' : 'Upgrade'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => checkSubscriptionStatus().catch(() => {})}>
                  <Text style={localStyles.checkStatusText}>Check subscription status</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ACTIONS */}
          <View style={localStyles.actionsWrap}>
            {isEditing ? (
              <>
                <TouchableOpacity style={localStyles.saveButton} onPress={handleSave} disabled={loading} activeOpacity={0.8}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={localStyles.saveButtonText}>Save Changes</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={localStyles.cancelButton} onPress={handleCancel} activeOpacity={0.8}>
                  <Text style={localStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={localStyles.editButton} onPress={() => setIsEditing(true)} activeOpacity={0.8}>
                  <Text style={localStyles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={localStyles.logoutButton}
                  onPress={() => {
                    Alert.alert('Logout', 'Are you sure you want to log out?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Logout', style: 'destructive', onPress: logout },
                    ]);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={localStyles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerSpacer: {
    width: 32,
  },
  backButton: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 44,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C5E8D4',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A7A4A',
    letterSpacing: -0.5,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1A7A4A',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  roleBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeDriver: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  roleBadgeUser: {
    backgroundColor: '#E8F5EE',
    borderColor: '#C5E8D4',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  roleTextDriver: {
    color: '#2563EB',
  },
  roleTextUser: {
    color: '#1A7A4A',
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#C5E8D4',
  },
  editingBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A7A4A',
  },

  // Sections & Cards
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    marginRight: 6,
  },
  sectionTitleText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },

  // Inputs
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputBase: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputEditable: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1A7A4A', // Green border to show it's active
    color: '#111827',
  },
  inputReadOnly: {
    backgroundColor: '#F9FAFB', // Soft gray background to look like a locked form
    borderColor: '#E5E7EB',
    color: '#4B5563',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Layout rows
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  colSmall: {
    flex: 0.8,
  },
  flexInput: {
    flex: 1,
  },

  // Verification
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeVerified: {
    backgroundColor: '#ECFCCB',
    borderColor: '#99F6E4',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3E2',
    borderColor: '#FCD34D',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextVerified: {
    color: '#0D9488',
  },
  statusTextPending: {
    color: '#D4860A',
  },
  statusSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 16,
    fontWeight: '500',
  },
  docsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 10,
  },
  docItem: {
    width: 80,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docImage: {
    width: 66,
    height: 48,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: '#E5E7EB',
  },
  docLabel: {
    fontSize: 9,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Subscription
  subscriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  subscriptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  subscriptionSubtitle: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  smallBtnActive: {
    backgroundColor: '#E8F5EE',
    borderWidth: 1.5,
    borderColor: '#C5E8D4',
  },
  smallBtnUpgrade: {
    backgroundColor: '#1A7A4A',
  },
  smallBtnText: {
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  smallBtnTextActive: {
    color: '#1A7A4A',
  },
  smallBtnTextUpgrade: {
    color: '#FFFFFF',
  },
  checkStatusText: {
    color: '#1A7A4A',
    fontSize: 11,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textDecorationLine: 'underline',
  },

  // Actions
  actionsWrap: {
    marginTop: 20,
    gap: 12,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1A7A4A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#1A7A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  editButtonText: {
    color: '#1A7A4A',
    fontWeight: '600', // 🔥 FIXED
    fontSize: 14,      // 🔥 FIXED
  },
  saveButton: {
    backgroundColor: '#1A7A4A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#1A7A4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600', // 🔥 FIXED
    fontSize: 14,      // 🔥 FIXED
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: '600', // 🔥 FIXED
    fontSize: 14,      // 🔥 FIXED
  },
  logoutButton: {
    backgroundColor: '#FDEDEC',
    borderWidth: 1.5,
    borderColor: '#F5C6C2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#C0392B',
    fontWeight: '600', // 🔥 FIXED
    fontSize: 14,      // 🔥 FIXED
  },
});
