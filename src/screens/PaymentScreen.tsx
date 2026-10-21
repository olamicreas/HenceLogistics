import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../context/AppProvider';

interface PaymentScreenProps {
  onBack?: () => void;
}

export default function PaymentScreen({ onBack }: PaymentScreenProps) {
  const { user, setCurrentScreen, rideHistory } = useAppContext();
  const [selectedCard, setSelectedCard] = useState('card_default');

  const completedRides = (rideHistory || []).filter(
    (r: any) => ['completed', 'paid', 'delivered'].includes((r.status || '').toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (onBack) onBack();
            else setCurrentScreen('home');
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#0F1A14" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Add Card', 'Stripe card onboarding will open here.')}
          style={styles.addBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color="#1A7A4A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Primary Payment Card */}
        <LinearGradient
          colors={['#0F2D20', '#1A7A4A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.payCard}
        >
          {/* Decorative shapes */}
          <View style={styles.cardCircle1} />
          <View style={styles.cardCircle2} />

          {/* EMV Chip */}
          <View style={styles.emvChip}>
            <View style={styles.chipLine1} />
            <View style={styles.chipLine2} />
          </View>

          {/* Card Number */}
          <Text style={styles.cardNumber}>••••  ••••  ••••  4821</Text>

          <View style={styles.cardBottomRow}>
            <View>
              <Text style={styles.cardHolderName}>{user?.name?.toUpperCase() || 'HENCE CUSTOMER'}</Text>
              <Text style={styles.cardExpiry}>EXPIRES 09/28</Text>
            </View>

            {/* Interlocking Card Network Circles */}
            <View style={styles.networkCircles}>
              <View style={[styles.netCircle, { backgroundColor: '#EB001B', zIndex: 1 }]} />
              <View style={[styles.netCircle, { backgroundColor: '#F79E1B', marginLeft: -12, zIndex: 2 }]} />
            </View>
          </View>
        </LinearGradient>

        {/* Saved Cards */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>SAVED CARDS</Text>
          <TouchableOpacity onPress={() => Alert.alert('Add Card', 'Opening secure card entry...')}>
            <Text style={styles.sectionAction}>+ Add new</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardList}>
          {/* Card 1 */}
          <TouchableOpacity
            style={styles.cardRow}
            onPress={() => setSelectedCard('card_default')}
            activeOpacity={0.8}
          >
            <View style={[styles.cardRowIcon, { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }]}>
              <Ionicons name="card-outline" size={18} color="#1A7A4A" />
            </View>
            <View style={styles.cardRowInfo}>
              <Text style={styles.cardRowTitle}>Visa •••• 4821</Text>
              <Text style={styles.cardRowSub}>Default · Expires 09/28</Text>
            </View>
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2 */}
          <TouchableOpacity
            style={[styles.cardRow, { borderBottomWidth: 0 }]}
            onPress={() => setSelectedCard('card_secondary')}
            activeOpacity={0.8}
          >
            <View style={[styles.cardRowIcon, { backgroundColor: '#F4F8F6' }]}>
              <Ionicons name="card-outline" size={18} color="#7A9080" />
            </View>
            <View style={styles.cardRowInfo}>
              <Text style={styles.cardRowTitle}>Mastercard •••• 9034</Text>
              <Text style={styles.cardRowSub}>Expires 03/26</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#B8CEC3" />
          </TouchableOpacity>
        </View>

        {/* Billing History */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>BILLING HISTORY</Text>
        </View>

        <View style={styles.cardList}>
          {completedRides.length > 0 ? (
            completedRides.slice(0, 5).map((ride: any, index: number) => (
              <View
                key={ride.id || index}
                style={[
                  styles.billRow,
                  index === completedRides.slice(0, 5).length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.billOrderTitle}>Order #{ride.id ? `HEN-${ride.id}` : 'HEN-8821'}</Text>
                  <Text style={styles.billOrderSub}>
                    {ride.created_at ? new Date(ride.created_at).toLocaleDateString() : 'Recent'} · {ride.vehicle_type || 'Cargo Van'}
                  </Text>
                </View>
                <Text style={styles.billAmount}>
                  €{parseFloat(ride.final_price || 27).toFixed(2)}
                </Text>
              </View>
            ))
          ) : (
            <>
              <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billOrderTitle}>Order #HEN-8821</Text>
                  <Text style={styles.billOrderSub}>Today · Large Van</Text>
                </View>
                <Text style={styles.billAmount}>€27.00</Text>
              </View>
              <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billOrderTitle}>Order #HEN-8802</Text>
                  <Text style={styles.billOrderSub}>15 Oct · Cargo Van</Text>
                </View>
                <Text style={styles.billAmount}>€31.50</Text>
              </View>
              <View style={[styles.billRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.billOrderTitle}>Order #HEN-8787</Text>
                  <Text style={styles.billOrderSub}>12 Oct · Large Van</Text>
                </View>
                <Text style={styles.billAmount}>€44.00</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#D4E2DA',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F4F8F6',
    borderWidth: 1,
    borderColor: '#D4E2DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#C5E8D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1A14',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  payCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F2D20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  cardCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(200, 241, 53, 0.08)',
  },
  cardCircle2: {
    position: 'absolute',
    bottom: -30,
    left: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  emvChip: {
    width: 34,
    height: 26,
    backgroundColor: '#D4AF37',
    borderRadius: 5,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E5AB',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  chipLine1: {
    height: 1,
    backgroundColor: '#A67C00',
  },
  chipLine2: {
    height: 1,
    backgroundColor: '#A67C00',
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 2.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 18,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardHolderName: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.8,
  },
  cardExpiry: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  networkCircles: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  netCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#7A9080',
    textTransform: 'uppercase',
  },
  sectionAction: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A7A4A',
  },
  cardList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4E2DA',
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D4E2DA',
    gap: 12,
  },
  cardRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D4E2DA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRowInfo: {
    flex: 1,
  },
  cardRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F1A14',
  },
  cardRowSub: {
    fontSize: 11,
    color: '#7A9080',
    marginTop: 2,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#C5E8D4',
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A7A4A',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#D4E2DA',
  },
  billOrderTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F1A14',
  },
  billOrderSub: {
    fontSize: 10,
    color: '#7A9080',
    marginTop: 2,
  },
  billAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F1A14',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
