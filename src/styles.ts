// styles/index.ts
import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  primary: '#0F766E',
  primarySoft: '#CCFBF1',
  primaryBorder: '#5EEAD4',
  bg: '#F4F8F6',
  white: '#FFFFFF',
  ink: '#111827',
  mid: '#3D5046',
  soft: '#6B7280',
  mute: '#B8CEC3',
  border: '#E5E7EB',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  warningSoft: '#FEF3DC',
  successSoft: '#D1FAE5',
  dangerSoft: '#FEF2F2',
  blue: '#2563EB',
  blueSoft: '#EFF6FF',
};

function shadow(color: string) {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  } as const;
}

export const styles = StyleSheet.create({
  // --- LAYOUT ---
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // --- AUTH ---
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.bg,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.soft,
    marginBottom: 32,
    fontWeight: '500',
    textAlign: 'center',
  },
  authCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow('rgba(15,26,20,0.07)'),
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: COLORS.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    color: COLORS.ink,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  switchAuth: {
    marginTop: 12,
    alignItems: 'center',
  },
  switchText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  roleField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 8,
    minHeight: 46,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  roleText: {
    fontSize: 12,
    color: COLORS.soft,
    fontWeight: '500',
  },

  // --- COMMON HEADERS ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.ink,
    marginBottom: 12,
    marginTop: 14,
    marginLeft: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.soft,
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // --- CARDS & LISTS ---
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow('rgba(15,26,20,0.07)'),
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow('rgba(15,26,20,0.07)'),
  },
  jobTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    color: COLORS.ink,
  },
  jobPayout: {
    fontSize: 13,
    color: COLORS.success,
    fontWeight: '700',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  acceptButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  acceptText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },

  rideCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rideTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    color: COLORS.ink,
  },
  rideDetail: {
    fontSize: 11,
    color: COLORS.soft,
    marginBottom: 6,
    lineHeight: 16,
  },
  ridePrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.success,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rideStatus: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  emptyText: {
    textAlign: 'center',
    color: COLORS.soft,
    fontSize: 12,
    marginTop: 40,
    fontWeight: '500',
  },

  // --- PROFILE ---
  profileCard: {
    padding: 16,
    alignItems: 'center',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    color: COLORS.ink,
  },
  profileEmail: {
    fontSize: 11,
    color: COLORS.soft,
    marginBottom: 8,
    fontWeight: '500',
  },
  profileRole: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // --- ACTIONS ---
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    color: COLORS.ink,
  },
  actionDesc: {
    fontSize: 11,
    color: COLORS.soft,
    lineHeight: 16,
  },

  // --- NAVIGATION ---
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  navLabel: {
    fontSize: 9,
    marginTop: 4,
    color: COLORS.mute,
    fontWeight: '600',
  },
  navLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

// --- Modal Specific Styles ---
export const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '15%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: COLORS.ink,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.soft,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
});

export const ratingStyles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: COLORS.ink,
  },
  subtitle: {
    color: COLORS.soft,
    marginTop: 4,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 12,
    marginTop: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 12,
    color: COLORS.ink,
    backgroundColor: COLORS.white,
  },
});

export const promoStyles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 48,
    marginRight: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow('rgba(15,26,20,0.07)'),
  },
  title: {
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 4,
    color: COLORS.ink,
  },
  subtitle: {
    color: COLORS.soft,
    fontSize: 11,
    lineHeight: 16,
  },
  learnBtn: {
    backgroundColor: COLORS.blueSoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  learnText: {
    color: COLORS.blue,
    fontWeight: '700',
    fontSize: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: COLORS.blue,
    width: 18,
  },
});

// --- New Home / Bolt-Style Styles ---
export const homeStyles = StyleSheet.create({
  mapBackground: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
  },
  modeText: {
    fontWeight: '600',
    color: COLORS.soft,
    fontSize: 11,
  },
  modeTextActive: {
    color: COLORS.ink,
    fontWeight: '700',
  },

  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  serviceCard: {
    width: (SCREEN_WIDTH - 60) / 3,
    height: 90,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  serviceLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.mid,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 16,
  },
  placeholderText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    color: COLORS.ink,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timeTagText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    color: COLORS.ink,
  },

  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentTitle: {
    fontWeight: '600',
    fontSize: 12,
    color: COLORS.ink,
  },
  recentSub: {
    color: COLORS.soft,
    fontSize: 10,
    marginTop: 2,
  },

  // Idle card for drivers
  idleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
  },
});

export const walletStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.ink,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  label: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  amount: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  iconContainer: {
    backgroundColor: '#374151',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const localStyles = StyleSheet.create({
  proofThumb: {
    width: 140,
    height: 90,
    borderRadius: 8,
    resizeMode: 'cover' as any,
  },
});