import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppProvider';
import {
  getUserDisplayName,
  pickImageFromLibrary,
} from '../utils/avatar';
import UserAvatar from './UserAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Header() {
  const {
    token,
    user,
    menuVisible,
    setMenuVisible,
    setCurrentScreen,
    setBottomTab,
    logout,
    setDriverScreenIndex,
    uploadAvatar,
  } = useAppContext();

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const insets = useSafeAreaInsets();
  if (!token) return null;

  const isDriver = user?.role === 'driver' || user?.role?.value === 'driver';

  // Derived real dynamic profile values — NEVER hardcoded dummy names
  const displayName = getUserDisplayName(user, isDriver);
  const userEmail = user?.email || '';

  const handlePickPhoto = async () => {
    try {
      const result = await pickImageFromLibrary();
      if (!result) return;
      setUploadingAvatar(true);
      if (uploadAvatar) {
        await uploadAvatar(result);
      }
    } catch (e) {
      console.warn('Pick photo error:', e);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const closeAndNavigate = (action: () => void) => {
    setMenuVisible(false);
    // Allow drawer animation to start smoothly before navigation
    setTimeout(() => {
      action();
    }, 150);
  };

  return (
    <>
      {/* ── TOP HEADER BAR ── */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Math.max(insets.top, 10),
          },
        ]}
      >
        {/* LOGO */}
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>
            HENCE<Text style={styles.logoDot}>.</Text>
          </Text>
        </View>

        {/* RIGHT ACTION ROW: Bell + Pill Button */}
        <View style={styles.headerRightRow}>
          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => {
              if (isDriver) {
                setDriverScreenIndex(1);
              } else {
                setBottomTab('rides');
                setCurrentScreen('home');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={18} color="#B8CEC3" />
            <View style={styles.bellBadge} />
          </TouchableOpacity>

          {/* MENU PILL BUTTON (TRIGGER) */}
          <TouchableOpacity
            style={styles.menuPill}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.85}
          >
            <UserAvatar
              user={user}
              size={26}
              isDriver={isDriver}
              bgColor="#0F2D20"
              textColor="#C8F135"
            />
            <View style={styles.pillLines}>
              <View style={[styles.pillLine, { width: 14 }]} />
              <View style={[styles.pillLine, { width: 14 }]} />
              <View style={[styles.pillLine, { width: 10 }]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── SLIDE-IN MENU DRAWER ── */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          {/* Backdrop Tap Closes Drawer */}
          <Pressable style={styles.drawerBackdrop} onPress={() => setMenuVisible(false)} />

          {/* Drawer Container Panel */}
          <View style={[styles.drawerPanel, { paddingTop: Math.max(insets.top, 16) }]}>
            {/* Drawer Header Banner */}
            <View style={[styles.drawerHeader, { backgroundColor: isDriver ? '#0F2D20' : '#0F1A14' }]}>
              <View style={styles.drawerHeaderTop}>
                <Text style={styles.drawerMenuLabel}>MENU</Text>
                <TouchableOpacity
                  style={styles.drawerCloseBtn}
                  onPress={() => setMenuVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              </View>

              {/* User Avatar + Details */}
              <View style={styles.drawerUserRow}>
                <UserAvatar
                  user={user}
                  size={52}
                  isDriver={isDriver}
                  onPress={handlePickPhoto}
                  showCameraBadge
                  uploading={uploadingAvatar}
                  bgColor={isDriver ? '#0A2016' : '#0F1A14'}
                  textColor="#C8F135"
                />

                <View style={styles.drawerUserInfo}>
                  <Text style={styles.drawerUserName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  {userEmail ? (
                    <Text style={styles.drawerUserEmail} numberOfLines={1}>
                      {userEmail}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Menu Items List */}
            <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuScrollContent}>
              {isDriver ? (
                /* ── DRIVER MENU ITEMS ── */
                <>
                  {/* 1. Profile Settings */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => closeAndNavigate(() => setCurrentScreen('profile'))}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }]}>
                      <Ionicons name="person-outline" size={18} color="#1A7A4A" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemLabel}>Profile Settings</Text>
                      <Text style={styles.menuItemSub}>Name, photo, contact details</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
                  </TouchableOpacity>

                  {/* 2. Performance & Reviews */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() =>
                      closeAndNavigate(() => {
                        setCurrentScreen('home');
                        setDriverScreenIndex(4);
                      })
                    }
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }]}>
                      <Ionicons name="star-outline" size={18} color="#1A7A4A" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemLabel}>Performance & Reviews</Text>
                      <Text style={styles.menuItemSub}>Ratings, feedback & trust score</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
                  </TouchableOpacity>

                  {/* 4. Subscription */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => closeAndNavigate(() => setCurrentScreen('subscription'))}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#EAF2FB', borderColor: '#c4ddf5' }]}>
                      <Ionicons name="flash-outline" size={18} color="#1E6BB8" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemLabel}>Subscription</Text>
                      <Text style={styles.menuItemSub}>Plan, billing & upgrades</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
                  </TouchableOpacity>

                  {/* 5. Help & Support */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => closeAndNavigate(() => setCurrentScreen('support'))}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#EAF2FB', borderColor: '#c4ddf5' }]}>
                      <Ionicons name="help-circle-outline" size={18} color="#1E6BB8" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemLabel}>Help & Support</Text>
                      <Text style={styles.menuItemSub}>FAQs and contact us</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
                  </TouchableOpacity>
                </>
              ) : (
                /* ── CUSTOMER MENU ITEMS ── */
                <>
                  {/* 1. New Booking */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() =>
                      closeAndNavigate(() => {
                        setBottomTab('home');
                        setCurrentScreen('home');
                      })
                    }
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }]}>
                      <Ionicons name="car-outline" size={18} color="#1A7A4A" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemLabel}>New Booking</Text>
                      <Text style={styles.menuItemSub}>Start a delivery or collection</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
                  </TouchableOpacity>

                  {/* 2. My Account */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => closeAndNavigate(() => setCurrentScreen('account-hub'))}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }]}>
                      <Ionicons name="person-outline" size={18} color="#1A7A4A" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemLabel}>My Account</Text>
                      <Text style={styles.menuItemSub}>Profile, addresses, settings</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
                  </TouchableOpacity>

                  {/* 3. My Orders */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() =>
                      closeAndNavigate(() => {
                        setBottomTab('rides');
                        setCurrentScreen('home');
                      })
                    }
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#0F2D20', borderColor: '#0F2D20' }]}>
                      <Ionicons name="document-text-outline" size={18} color="#C8F135" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemLabel}>My Orders</Text>
                      <Text style={styles.menuItemSub}>View booking history</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
                  </TouchableOpacity>

                  {/* 4. Payment Methods */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => closeAndNavigate(() => setCurrentScreen('payment'))}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#EAF2FB', borderColor: '#c4ddf5' }]}>
                      <Ionicons name="card-outline" size={18} color="#1E6BB8" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemLabel}>Payment Methods</Text>
                      <Text style={styles.menuItemSub}>Cards and billing</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
                  </TouchableOpacity>

                  {/* 5. Help & Support */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => closeAndNavigate(() => setCurrentScreen('support'))}
                  >
                    <View style={[styles.menuItemIcon, { backgroundColor: '#EAF2FB', borderColor: '#c4ddf5' }]}>
                      <Ionicons name="chatbubbles-outline" size={18} color="#1E6BB8" />
                    </View>
                    <View style={styles.menuItemTextCol}>
                      <Text style={styles.menuItemLabel}>Help & Support</Text>
                      <Text style={styles.menuItemSub}>FAQs and contact us</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#B8CEC3" />
                  </TouchableOpacity>
                </>
              )}

              {/* Thin Divider */}
              <View style={styles.menuDivider} />

              {/* 6. Log Out Button */}
              <TouchableOpacity
                style={styles.menuItemDanger}
                onPress={() => closeAndNavigate(() => logout())}
              >
                <View style={[styles.menuItemIcon, { backgroundColor: '#FEE8E6', borderColor: '#f0c0c0' }]}>
                  <Ionicons name="log-out-outline" size={18} color="#C0392B" />
                </View>
                <View style={styles.menuItemTextCol}>
                  <Text style={[styles.menuItemLabel, { color: '#C0392B' }]}>Log Out</Text>
                  <Text style={[styles.menuItemSub, { color: 'rgba(192,57,43,0.6)' }]}>Sign out of your account</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    backgroundColor: '#0F1A14',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#172B21',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  logoDot: {
    color: '#1A7A4A',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E74C3C',
    borderWidth: 1,
    borderColor: '#0F1A14',
  },
  menuPill: {
    height: 36,
    borderRadius: 22,
    backgroundColor: '#0F1A14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 10,
    gap: 7,
  },
  pillAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#C8F135',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillAvatarImg: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  pillAvatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F2D20',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pillLines: {
    flexDirection: 'column',
    gap: 3.5,
  },
  pillLine: {
    height: 1.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15,26,20,0.5)',
  },
  drawerBackdrop: {
    flex: 1,
  },
  drawerPanel: {
    width: Math.min(SCREEN_WIDTH * 0.85, 310),
    backgroundColor: '#FFFFFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 12,
  },
  drawerHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  drawerMenuLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  drawerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerAvatarWrap: {
    position: 'relative',
  },
  drawerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  drawerAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  drawerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C8F135',
    borderWidth: 2,
    borderColor: '#0F2D20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerUserInfo: {
    flex: 1,
  },
  drawerUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  drawerUserEmail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F1A14',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#7A9080',
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#D4E2DA',
    marginHorizontal: 16,
    marginVertical: 6,
  },
});
