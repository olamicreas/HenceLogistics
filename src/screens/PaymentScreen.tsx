import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../context/AppProvider';

interface PaymentScreenProps {
  onBack?: () => void;
}

export interface SavedCard {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'card';
  last4: string;
  expMonth: string;
  expYear: string;
  cardholderName: string;
  isDefault: boolean;
}

export default function PaymentScreen({ onBack }: PaymentScreenProps) {
  const { user, setCurrentScreen, rideHistory } = useAppContext();

  const storageKey = `@hence_saved_cards_${user?.id || user?.email || 'default'}`;

  const [cards, setCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State for Adding Card
  const [cardholderName, setCardholderName] = useState(
    user?.full_name || user?.name || ''
  );
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [formError, setFormError] = useState('');

  // Load saved cards from physical storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed: SavedCard[] = JSON.parse(stored);
          setCards(parsed);
          const def = parsed.find((c) => c.isDefault) || parsed[0];
          if (def) setSelectedCardId(def.id);
        }
      } catch (e) {
        console.warn('Failed to load saved cards', e);
      }
    })();
  }, [storageKey]);

  // Persist cards helper
  const persistCards = async (newCards: SavedCard[]) => {
    setCards(newCards);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newCards));
    } catch (e) {
      console.warn('Failed to persist cards', e);
    }
  };

  // Detect card brand from number
  const detectBrand = (num: string): SavedCard['brand'] => {
    const clean = num.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    if (/^6(011|5)/.test(clean)) return 'discover';
    return 'card';
  };

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, 16);
    const parts = clean.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(' ') : clean);
    setFormError('');
  };

  // Format expiry MM/YY
  const handleExpiryChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, 4);
    if (clean.length >= 3) {
      setExpiry(`${clean.slice(0, 2)}/${clean.slice(2, 4)}`);
    } else {
      setExpiry(clean);
    }
    setFormError('');
  };

  const handleOpenAddCard = () => {
    setCardholderName(user?.full_name || user?.name || '');
    setCardNumber('');
    setExpiry('');
    setCvc('');
    setSetAsDefault(cards.length === 0);
    setFormError('');
    setModalVisible(true);
  };

  const handleSaveCard = async () => {
    const rawNumber = cardNumber.replace(/\s+/g, '');
    if (rawNumber.length < 15) {
      setFormError('Please enter a valid 15 or 16 digit card number.');
      return;
    }

    const expParts = expiry.split('/');
    if (expParts.length !== 2 || expParts[0].length !== 2 || expParts[1].length !== 2) {
      setFormError('Please enter a valid expiration date (MM/YY).');
      return;
    }

    const month = parseInt(expParts[0], 10);
    if (month < 1 || month > 12) {
      setFormError('Expiration month must be between 01 and 12.');
      return;
    }

    if (cvc.trim().length < 3) {
      setFormError('Please enter a valid CVC code.');
      return;
    }

    if (!cardholderName.trim()) {
      setFormError('Please enter the name on the card.');
      return;
    }

    const brand = detectBrand(rawNumber);
    const last4 = rawNumber.slice(-4);
    const newCardId = `card_${Date.now()}`;

    const newCard: SavedCard = {
      id: newCardId,
      brand,
      last4,
      expMonth: expParts[0],
      expYear: expParts[1],
      cardholderName: cardholderName.trim(),
      isDefault: setAsDefault || cards.length === 0,
    };

    let updatedCards = [...cards];
    if (newCard.isDefault) {
      updatedCards = updatedCards.map((c) => ({ ...c, isDefault: false }));
    }
    updatedCards.push(newCard);

    await persistCards(updatedCards);
    setSelectedCardId(newCardId);
    setModalVisible(false);
    Alert.alert('Card Added', `Your ${brand.toUpperCase()} ending in ${last4} has been saved.`);
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert('Remove Card', 'Are you sure you want to remove this saved card?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const filtered = cards.filter((c) => c.id !== cardId);
          if (filtered.length > 0 && !filtered.some((c) => c.isDefault)) {
            filtered[0].isDefault = true;
          }
          await persistCards(filtered);
          if (selectedCardId === cardId) {
            setSelectedCardId(filtered[0]?.id || null);
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (cardId: string) => {
    const updated = cards.map((c) => ({
      ...c,
      isDefault: c.id === cardId,
    }));
    await persistCards(updated);
    setSelectedCardId(cardId);
  };

  // Active / Selected card for the gradient display
  const activeCard =
    cards.find((c) => c.id === selectedCardId) ||
    cards.find((c) => c.isDefault) ||
    cards[0] ||
    null;

  // Real completed / paid orders
  const completedRides = (rideHistory || []).filter((r: any) =>
    ['completed', 'paid', 'delivered'].includes((r.status || '').toLowerCase())
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
          onPress={handleOpenAddCard}
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
          <View style={styles.cardCircle1} />
          <View style={styles.cardCircle2} />

          {/* EMV Chip */}
          <View style={styles.emvChip}>
            <View style={styles.chipLine1} />
            <View style={styles.chipLine2} />
          </View>

          {/* Card Number */}
          <Text style={styles.cardNumber}>
            {activeCard
              ? `••••  ••••  ••••  ${activeCard.last4}`
              : '••••  ••••  ••••  ••••'}
          </Text>

          <View style={styles.cardBottomRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.cardHolderName} numberOfLines={1}>
                {activeCard
                  ? activeCard.cardholderName.toUpperCase()
                  : user?.full_name?.toUpperCase() || user?.name?.toUpperCase() || 'NO CARD ATTACHED'}
              </Text>
              <Text style={styles.cardExpiry}>
                {activeCard
                  ? `EXPIRES ${activeCard.expMonth}/${activeCard.expYear}`
                  : 'ATTACH CARD BELOW'}
              </Text>
            </View>

            {/* Card Brand Badge */}
            <View style={styles.networkCircles}>
              {activeCard?.brand === 'mastercard' ? (
                <>
                  <View style={[styles.netCircle, { backgroundColor: '#EB001B', zIndex: 1 }]} />
                  <View style={[styles.netCircle, { backgroundColor: '#F79E1B', marginLeft: -12, zIndex: 2 }]} />
                </>
              ) : activeCard?.brand === 'visa' ? (
                <View style={styles.visaBadge}>
                  <Text style={styles.visaText}>VISA</Text>
                </View>
              ) : (
                <View style={styles.genericCardBadge}>
                  <Ionicons name="card" size={22} color="#C8F135" />
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Saved Cards Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>SAVED CARDS</Text>
          <TouchableOpacity onPress={handleOpenAddCard} activeOpacity={0.7}>
            <Text style={styles.sectionAction}>+ Add new</Text>
          </TouchableOpacity>
        </View>

        {/* Real Saved Cards List */}
        <View style={styles.cardList}>
          {cards.length > 0 ? (
            cards.map((card, idx) => {
              const isSelected = card.id === (activeCard?.id || selectedCardId);
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.cardRow,
                    idx === cards.length - 1 && { borderBottomWidth: 0 },
                    isSelected && { backgroundColor: '#F0FAF4' },
                  ]}
                  onPress={() => handleSetDefault(card.id)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.cardRowIcon,
                      isSelected
                        ? { backgroundColor: '#E8F5EE', borderColor: '#C5E8D4' }
                        : { backgroundColor: '#F4F8F6' },
                    ]}
                  >
                    <Ionicons
                      name="card-outline"
                      size={18}
                      color={isSelected ? '#1A7A4A' : '#7A9080'}
                    />
                  </View>
                  <View style={styles.cardRowInfo}>
                    <Text style={styles.cardRowTitle}>
                      {card.brand.toUpperCase()} •••• {card.last4}
                    </Text>
                    <Text style={styles.cardRowSub}>
                      Expires {card.expMonth}/{card.expYear} · {card.cardholderName}
                    </Text>
                  </View>

                  {card.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => handleDeleteCard(card.id)}
                    style={styles.deleteCardBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#C0392B" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCardBox}>
              <Ionicons name="card-outline" size={32} color="#B8CEC3" />
              <Text style={styles.emptyCardTitle}>No payment cards saved</Text>
              <Text style={styles.emptyCardSub}>
                Add your real credit or debit card for seamless checkout.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={handleOpenAddCard}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#0F2D20" />
                <Text style={styles.emptyAddBtnText}>Add Card</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Real Billing History */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>BILLING HISTORY</Text>
        </View>

        <View style={styles.cardList}>
          {completedRides.length > 0 ? (
            completedRides.slice(0, 10).map((ride: any, index: number) => (
              <View
                key={ride.id || index}
                style={[
                  styles.billRow,
                  index === completedRides.slice(0, 10).length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.billOrderTitle}>
                    Order #{ride.id ? `HEN-${ride.id}` : 'HEN-ORDER'}
                  </Text>
                  <Text style={styles.billOrderSub}>
                    {ride.created_at
                      ? new Date(ride.created_at).toLocaleDateString()
                      : 'Completed'}{' '}
                    · {ride.vehicle_type ? ride.vehicle_type.replace('_', ' ') : 'Standard'}
                  </Text>
                </View>
                <Text style={styles.billAmount}>
                  €{parseFloat(ride.final_price || 0).toFixed(2)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyHistoryBox}>
              <Ionicons name="receipt-outline" size={30} color="#B8CEC3" />
              <Text style={styles.emptyHistoryTitle}>No billing history yet</Text>
              <Text style={styles.emptyHistorySub}>
                Invoices and payment receipts will appear here once your orders are completed.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── REAL CARD ENTRY MODAL ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Card</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#0F1A14" />
              </TouchableOpacity>
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Cardholder Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#B8CEC3"
                  value={cardholderName}
                  onChangeText={setCardholderName}
                />
              </View>

              {/* Card Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CARD NUMBER</Text>
                <View style={styles.cardInputWrapper}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                    placeholder="4000 1234 5678 9010"
                    placeholderTextColor="#B8CEC3"
                    keyboardType="number-pad"
                    value={cardNumber}
                    onChangeText={handleCardNumberChange}
                    maxLength={19}
                  />
                  <View style={styles.brandIconBox}>
                    <Ionicons
                      name="card"
                      size={20}
                      color={
                        detectBrand(cardNumber) === 'visa'
                          ? '#1A7A4A'
                          : detectBrand(cardNumber) === 'mastercard'
                          ? '#F79E1B'
                          : '#7A9080'
                      }
                    />
                  </View>
                </View>
              </View>

              {/* Expiry and CVC Row */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>EXPIRY (MM/YY)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    placeholderTextColor="#B8CEC3"
                    keyboardType="number-pad"
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>CVC / CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    placeholderTextColor="#B8CEC3"
                    keyboardType="number-pad"
                    value={cvc}
                    onChangeText={(t) => setCvc(t.slice(0, 4))}
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Set Default Toggle */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Set as default payment card</Text>
                  <Text style={styles.switchSub}>Use this card for instant delivery bookings</Text>
                </View>
                <Switch
                  value={setAsDefault}
                  onValueChange={setSetAsDefault}
                  trackColor={{ true: '#1A7A4A', false: '#D4E2DA' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveCardBtn}
                onPress={handleSaveCard}
                activeOpacity={0.85}
              >
                <Ionicons name="lock-closed" size={16} color="#0F2D20" style={{ marginRight: 6 }} />
                <Text style={styles.saveCardBtnText}>Save Card Securely</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  visaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  visaText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1.5,
    fontStyle: 'italic',
  },
  genericCardBadge: {
    width: 30,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  deleteCardBtn: {
    padding: 6,
  },
  emptyCardBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F1A14',
    marginTop: 8,
  },
  emptyCardSub: {
    fontSize: 11,
    color: '#7A9080',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    maxWidth: 240,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C8F135',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F2D20',
    marginLeft: 4,
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
  emptyHistoryBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F1A14',
    marginTop: 6,
  },
  emptyHistorySub: {
    fontSize: 11,
    color: '#7A9080',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1A14',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#C0392B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7A9080',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F4F8F6',
    borderWidth: 1,
    borderColor: '#D4E2DA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F1A14',
  },
  cardInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconBox: {
    backgroundColor: '#F4F8F6',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#D4E2DA',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 42,
    justifyContent: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F4F8F6',
    marginBottom: 16,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F1A14',
  },
  switchSub: {
    fontSize: 10,
    color: '#7A9080',
    marginTop: 2,
  },
  saveCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C8F135',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  saveCardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2D20',
  },
});
