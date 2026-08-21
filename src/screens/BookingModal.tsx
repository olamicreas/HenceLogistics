// BookingModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppContext } from '../context/AppProvider';
import { BookingIcon } from './BookingIcons';
import { Ionicons } from '@expo/vector-icons';

const VEHICLES = [
  { id: 'large', name: 'Large Van', icon: 'v-large', note: 'Large Van — suitable for large parcels, furniture, appliances, catering and most deliveries up to 1,500 kg.' },
  { id: 'cargo', name: 'Cargo Van', icon: 'v-cargo', note: 'Cargo Van — best for parcels, electronics, fragile items, medical equipment and food up to 800 kg.' },
  { id: 'luton', name: 'Luton Van', icon: 'v-luton', note: 'Luton Van — house removals, large furniture and heavy building materials up to 3,000 kg.' },
  { id: 'dropside', name: 'Dropside', icon: 'v-drop', note: 'Dropside — building materials, scaffolding, garden supplies and oversized flat loads.' },
  { id: 'flatbed', name: 'Flatbed', icon: 'v-flat', note: 'Flatbed — oversized loads, steel, timber and machinery that cannot be enclosed in a van.' },
  { id: 'tow', name: 'Tow Truck', icon: 'v-tow', note: 'Tow Truck — vehicle recovery and towing only. Not suitable for cargo or parcel delivery.' },
] as const;

const CATEGORIES: Array<{ id: string; icon: string; name: string }> = [
  { id: 'parcel', icon: 'cat-parcel', name: 'Parcel' },
  { id: 'home', icon: 'cat-home', name: 'Home & Living' },
  { id: 'food', icon: 'cat-food', name: 'Food & Events' },
  { id: 'build', icon: 'cat-build', name: 'Building' },
  { id: 'elec', icon: 'cat-elec', name: 'Electronics' },
  { id: 'med', icon: 'cat-med', name: 'Medical' },
  { id: 'auto', icon: 'cat-auto', name: 'Auto & Trade Services' },
];

type Service = {
  id: string;
  name: string;
  desc: string;
  price: string;
  base: number;
  svc: number;
  badge: 'bp' | 'be' | 'bs' | 'bm';
  btxt: string;
  ico: string;
  v: string[];
};

const SERVICES: Record<string, Service[]> = {
  parcel: [
    { id: 'p1', name: 'Small Parcel', desc: 'Documents and packages up to 25 kg.', price: 'From €12', base: 12, svc: 0, badge: 'bp', btxt: 'Priority', ico: 'si-01', v: ['large', 'cargo'] },
    { id: 'p2', name: 'Medium Parcel', desc: 'Mid-size goods 25–100 kg.', price: 'From €22', base: 22, svc: 0, badge: 'bp', btxt: 'Priority', ico: 'si-02', v: ['large', 'cargo'] },
    { id: 'p3', name: 'Large Parcel', desc: 'Heavy items 100–500 kg. Tail-lift available.', price: 'From €45', base: 45, svc: 5, badge: 'bp', btxt: 'Priority', ico: 'si-03', v: ['large', 'luton'] },
    { id: 'p4', name: 'Urgent Document', desc: 'Legal and financial documents. 1–2 hr window.', price: 'From €18', base: 18, svc: 8, badge: 'bp', btxt: 'Priority', ico: 'si-04', v: ['large', 'cargo'] },
  ],
  home: [
    { id: 'h1', name: 'Furniture Items', desc: 'Sofas, beds and wardrobes up to 1,500 kg.', price: 'From €55', base: 55, svc: 5, badge: 'bs', btxt: 'Standard', ico: 'si-14', v: ['large', 'luton'] },
    { id: 'h2', name: 'House Removal', desc: 'Full or partial home move, one destination.', price: 'From €180', base: 180, svc: 20, badge: 'bs', btxt: 'Standard', ico: 'si-15', v: ['luton'] },
    { id: 'h3', name: 'Furniture Store Del.', desc: 'Flat-pack and assembled pieces to customer.', price: 'From €45', base: 45, svc: 0, badge: 'bs', btxt: 'Standard', ico: 'si-16', v: ['large', 'luton'] },
    { id: 'h4', name: 'Appliance Delivery', desc: 'White goods. Tail-lift and two-person team.', price: 'From €55', base: 55, svc: 5, badge: 'be', btxt: 'Express', ico: 'si-17', v: ['large', 'luton'] },
  ],
  food: [
    { id: 'f1', name: 'Food Delivery (Cold)', desc: 'Chilled and frozen food, temperature-controlled.', price: 'From €28', base: 28, svc: 6, badge: 'be', btxt: 'Express', ico: 'si-19', v: ['large', 'cargo'] },
    { id: 'f2', name: 'Catering & Events', desc: 'Full event load to a single venue.', price: 'From €60', base: 60, svc: 8, badge: 'be', btxt: 'Express', ico: 'si-20', v: ['large', 'luton'] },
    { id: 'f3', name: 'Wine & Alcohol', desc: 'Licensed delivery. Age verified at door.', price: 'From €16', base: 16, svc: 4, badge: 'bp', btxt: 'Priority', ico: 'si-06', v: ['large', 'cargo'] },
  ],
  build: [
    { id: 'b1', name: 'Construction Materials', desc: 'Heavy materials to one construction site.', price: 'From €110', base: 110, svc: 12, badge: 'bs', btxt: 'Standard', ico: 'si-13', v: ['luton', 'dropside', 'flatbed'] },
    { id: 'b2', name: 'HVAC Equipment', desc: 'Heating and AC units to a single job site.', price: 'From €90', base: 90, svc: 10, badge: 'bs', btxt: 'Standard', ico: 'si-11', v: ['large', 'luton', 'dropside'] },
    { id: 'b3', name: 'Plumbing Supply', desc: 'Pipes, fixtures and tools to a single site.', price: 'From €70', base: 70, svc: 6, badge: 'bs', btxt: 'Standard', ico: 'si-12', v: ['large', 'cargo', 'luton'] },
    { id: 'b4', name: 'Commercial Kitchen Eq.', desc: 'Catering equipment to restaurants.', price: 'From €80', base: 80, svc: 8, badge: 'be', btxt: 'Express', ico: 'si-26', v: ['large', 'luton'] },
    { id: 'b5', name: 'Bulk Distribution', desc: 'Palletised goods to multiple B2B locations.', price: 'From €140', base: 140, svc: 18, badge: 'bm', btxt: 'Multi-Drop', ico: 'si-28', v: ['luton', 'flatbed'] },
  ],
  elec: [
    { id: 'e1', name: 'Electronics', desc: 'Consumer and business electronics, anti-static.', price: 'From €22', base: 22, svc: 4, badge: 'be', btxt: 'Express', ico: 'si-07', v: ['large', 'cargo'] },
    { id: 'e2', name: 'Fragile Items', desc: 'Extra-care. Padded transit, no stacking.', price: 'From €24', base: 24, svc: 6, badge: 'be', btxt: 'Express', ico: 'si-08', v: ['large', 'cargo'] },
    { id: 'e3', name: 'Office Equipment', desc: 'Business machinery delivered to floor.', price: 'From €40', base: 40, svc: 4, badge: 'be', btxt: 'Express', ico: 'si-18', v: ['large', 'cargo'] },
    { id: 'e4', name: 'Art & Antiques', desc: 'White-glove handling of high-value artworks.', price: 'From €70', base: 70, svc: 10, badge: 'bs', btxt: 'Standard', ico: 'si-09', v: ['cargo'] },
    { id: 'e5', name: 'E-Commerce Last Mile', desc: 'High-volume parcels to multiple addresses.', price: 'From €85', base: 85, svc: 10, badge: 'bm', btxt: 'Multi-Drop', ico: 'si-31', v: ['large', 'cargo'] },
  ],
  med: [
    { id: 'm1', name: 'Medical Equipment Del.', desc: 'Beds, wheelchairs, oxygen equipment to one address.', price: 'From €65', base: 65, svc: 8, badge: 'be', btxt: 'Express', ico: 'si-medeq', v: ['large', 'cargo', 'luton'] },
    { id: 'm2', name: 'Clinical Supplies (D2B)', desc: 'Bulk consumables from distributor to GP practices and clinics.', price: 'From €90', base: 90, svc: 10, badge: 'bm', btxt: 'Multi-Drop', ico: 'si-clinsup', v: ['large', 'cargo'] },
    { id: 'm3', name: 'Pharma Distribution', desc: 'Sealed pharmaceutical stock to multiple pharmacy branches.', price: 'From €120', base: 120, svc: 15, badge: 'bm', btxt: 'Multi-Drop', ico: 'si-pharmdb', v: ['large', 'cargo'] },
  ],
  auto: [
    { id: 'a1', name: 'Vehicle Towing', desc: 'Recover and transport a vehicle to garage or home.', price: 'From €90', base: 90, svc: 15, badge: 'bs', btxt: 'Standard', ico: 'si-22', v: ['tow'] },
    { id: 'a2', name: 'Plant & Nursery', desc: 'Plants and garden supplies carefully delivered.', price: 'From €30', base: 30, svc: 4, badge: 'be', btxt: 'Express', ico: 'si-23', v: ['large', 'cargo', 'dropside'] },
    { id: 'a3', name: 'Auto Detailing (Mobile)', desc: 'Full detailing kit brought to your location.', price: 'From €50', base: 50, svc: 5, badge: 'bs', btxt: 'Standard', ico: 'si-25', v: ['cargo'] },
    { id: 'a4', name: 'Retail Stock (D2B)', desc: 'Inventory from warehouse to multiple retail stores.', price: 'From €95', base: 95, svc: 12, badge: 'bm', btxt: 'Multi-Drop', ico: 'si-27', v: ['large'] },
    { id: 'a5', name: 'Produce & Market (D2B)', desc: 'Fresh produce to multiple market stalls.', price: 'From €95', base: 95, svc: 12, badge: 'bm', btxt: 'Multi-Drop', ico: 'si-32', v: ['large', 'cargo'] },
  ],
};

export default function BookingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const {
    pickupAddr, setPickupAddr, stops, addStop, removeStop, updateStop,
    bookingMode, isScheduled, setIsScheduled, scheduleTime, setScheduleTime,
    openQuoteFlow, activeSearchIndex, setActiveSearchIndex, scheduleSearch,
    pickupSuggestions, dropoffSuggestions, selectSearchResult,
    manService, setManService, followDriver, setFollowDriver, setMapPickTarget,
    vanType, setVanType
  } = useAppContext();

  const [step, setStep] = useState<1 | 2>(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expandedStopIdx, setExpandedStopIdx] = useState<number | null>(0);
  const [localVanType, setLocalVanType] = useState(vanType || 'large');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStopServices, setSelectedStopServices] = useState<Record<number, Service | null>>({});

  const isMulti = bookingMode === 'multi';
  const selectedVehicle = VEHICLES.find(v => v.id === localVanType) || VEHICLES[0];

  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setShowDatePicker(false);
    setExpandedStopIdx(0);
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedStopServices({});
  }, [visible]);

  useEffect(() => {
    setLocalVanType(vanType || 'large');
  }, [vanType]);

  useEffect(() => {
    stops.forEach((stop: any, idx: number) => {
      if (!stop.items || stop.items.length === 0) {
        updateStop(idx, 'items', [{ description: '', qty: '1', weight: '', ref: '' }]);
      }
      if (stop.weight === undefined) {
        updateStop(idx, 'weight', 45);
      }
    });
  }, [stops.length, updateStop]);

  const visibleServices = useMemo(() => {
    if (!selectedCategory) return [];
    return (SERVICES[selectedCategory] || []).filter(s => s.v.includes(localVanType));
  }, [selectedCategory, localVanType]);

  const canContinue = isMulti || !!selectedService;

  const handleDateChange = (e: any, d?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (e.type === 'dismissed') return;
    }
    if (d) {
      setScheduleTime(d);
      setIsScheduled(true);
    }
  };

  const handleMapPick = (index: number) => {
    onClose();
    setMapPickTarget(index);
  };

  const selectVehicle = (id: string) => {
    setLocalVanType(id);
    setVanType?.(id);
    if (selectedService && !selectedService.v.includes(id)) {
      setSelectedService(null);
    }
  };

  const selectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedService(null);
  };

  const selectService = (svc: Service) => {
    setSelectedService(svc);
  };

  const handleAddStopItem = (stopIdx: number) => {
    const stop = stops[stopIdx] || {};
    const items = stop.items ? [...stop.items] : [];
    items.push({ description: '', qty: '1', weight: '', ref: '' });
    updateStop(stopIdx, 'items', items);
  };

  const updateStopItem = (stopIdx: number, itemIdx: number, field: string, value: string) => {
    const stop = stops[stopIdx] || {};
    const items = stop.items ? [...stop.items] : [];
    if (!items[itemIdx]) items[itemIdx] = { description: '', qty: '1', weight: '', ref: '' };
    items[itemIdx][field] = value;
    updateStop(stopIdx, 'items', items);
  };

  const handleRemoveStopItem = (stopIdx: number, itemIdx: number) => {
    const stop = stops[stopIdx] || {};
    const items = stop.items ? [...stop.items] : [];
    if (items.length > 1) {
      items.splice(itemIdx, 1);
      updateStop(stopIdx, 'items', items);
    }
  };

  const adjustWeight = (stopIdx: number, amount: number) => {
    const current = Number(stops[stopIdx]?.weight || 0);
    updateStop(stopIdx, 'weight', Math.max(0, current + amount));
  };

  const renderSuggestions = (idx: number) => {
    const list = idx === -1 ? pickupSuggestions : dropoffSuggestions;
    if (!list.length) return null;

    return (
      <View style={styles.suggestionBox}>
        {list.map((item: any, i: number) => (
          <TouchableOpacity
            key={i}
            style={styles.suggestionItem}
            onPress={() => selectSearchResult(idx, item)}
          >
            <Ionicons name="location-outline" size={18} color="#2563EB" />
            <Text style={styles.suggestionText}>{item.display_name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };




  const renderItemsTable = (idx: number) => {
    const stop = stops[idx] || {};
    const items = stop.items || [{ description: '', qty: '1', weight: '', ref: '' }];

    return (
      <View style={styles.itemsSec}>
        <View style={styles.itemsHdr}>
          <Text style={styles.itemsLbl}>Items{isMulti ? ' for this stop' : ''}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHdrRow}>
            <Text style={[styles.th, { flex: 2 }]}>Description</Text>
            <Text style={[styles.th, { width: 40, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Weight</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>PO/Ref</Text>
            <View style={{ width: 24 }} />
          </View>

          {items.map((item: any, i: number) => (
            <View key={i} style={styles.tr}>
              <TextInput
                style={[styles.tdInput, { flex: 2 }]}
                placeholder="Item desc"
                value={item.description}
                onChangeText={(t) => updateStopItem(idx, i, 'description', t)}
              />
              <TextInput
                style={[styles.tdInput, { width: 40, textAlign: 'center' }]}
                keyboardType="numeric"
                value={item.qty}
                onChangeText={(t) => updateStopItem(idx, i, 'qty', t)}
              />
              <TextInput
                style={[styles.tdInput, { flex: 1.2 }]}
                placeholder="0 kg"
                value={item.weight}
                onChangeText={(t) => updateStopItem(idx, i, 'weight', t)}
              />
              <TextInput
                style={[styles.tdInput, { flex: 1.5 }]}
                placeholder="Ref/PO"
                value={item.ref}
                onChangeText={(t) => updateStopItem(idx, i, 'ref', t)}
              />
              <TouchableOpacity style={styles.tdDel} onPress={() => handleRemoveStopItem(idx, i)}>
                <Ionicons name="close" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.addItemBtn} onPress={() => handleAddStopItem(idx)}>
          <Text style={styles.addItemBtnText}>＋ Add item</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleContinue = () => {
    if (!canContinue) return;
    setStep(2);
  };

  const handleGetPrice = () => {
    if (!pickupAddr) {
      Alert.alert('Missing Info', 'Please enter pickup location');
      return;
    }
    if (stops.some((s: any) => !s.address)) {
      Alert.alert('Missing Info', 'Please enter all drop-off locations');
      return;
    }

    const extraData = {
      vanType: localVanType,
      mode: bookingMode,
      service: selectedService,
      stops: stops.map((s: any, idx: number) => ({
        address: s.address,
        recipient: s.recipient,
        phone: s.phone,
        instructions: s.instructions,
        items: s.items || [],
        weight: s.weight || 0,
        categoryId: s.categoryId,
        service: selectedStopServices[idx] || null,
      })),
    };

    onClose();
    openQuoteFlow(extraData);
  };




  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => (step === 2 ? setStep(1) : onClose())}
              style={styles.closeBtn}
            >
              <BookingIcon name={step === 2 ? 'ic-back' : 'ic-x'} size={18} color="#111827" />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={styles.headerTitle}>
                {step === 1 ? 'New Booking' : 'Location & Details'}
              </Text>
              <Text style={styles.headerSub}>
                {step === 1 ? 'Vehicle & Service' : 'Pickup, drop-off and recipient details'}
              </Text>
            </View>

            <View style={{ width: 36 }} />
          </View>

          <View style={styles.steps}>
            <View style={step === 1 ? styles.stepActive : styles.stepDone}>
              <Text style={styles.stepCircle}>{step === 1 ? '1' : '✓'}</Text>
              <Text style={styles.stepLabel}>Vehicle & Service</Text>
            </View>
            <View style={step === 1 ? styles.stepLinePending : styles.stepLineDone} />
            <View style={step === 2 ? styles.stepActive : styles.stepPending}>
              <Text style={styles.stepCircle}>2</Text>
              <Text style={styles.stepLabel}>Location & Details</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {step === 1 && (
              <>
                <View style={styles.modeLabel}>
                  <Text style={styles.modeLabelText}>
                    {isMulti ? 'Multi Drop Booking' : 'Single Drop Booking'}
                  </Text>
                </View>

                <View style={styles.schedToggle}>
                  <TouchableOpacity
                    style={[styles.schedBtn, !isScheduled && styles.schedBtnOn]}
                    onPress={() => setIsScheduled(false)}
                  >
                    <Text style={[styles.schedText, !isScheduled && styles.schedTextOn]}>Pick up now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.schedBtn, isScheduled && styles.schedBtnOn]}
                    onPress={() => {
                      setIsScheduled(true);
                      setShowDatePicker(true);
                      if (!scheduleTime) setScheduleTime(new Date());
                    }}
                  >
                    <BookingIcon name="ic-clock" size={14} color={isScheduled ? '#FFF' : '#7A9080'} />
                    <Text style={[styles.schedText, isScheduled && styles.schedTextOn]}>
                      {isScheduled && scheduleTime
                        ? scheduleTime.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                        : 'Schedule for later'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isScheduled && showDatePicker && (
                  <View style={styles.datePickerCard}>
                    <DateTimePicker
                      value={scheduleTime || new Date()}
                      mode="datetime"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      textColor="#111827"
                      themeVariant="light"
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity style={styles.dateConfirmBtn} onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.dateConfirmText}>Confirm Time</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Vehicle</Text>
                      <Text style={styles.cardSub}>Select the vehicle for your delivery</Text>
                    </View>
                    <Text style={styles.autoBadge}>AUTO</Text>
                  </View>

                  <View style={styles.cardBody}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleScroll}>
                      {VEHICLES.map((v) => {
                        const active = localVanType === v.id;
                        return (
                          <TouchableOpacity
                            key={v.id}
                            style={[styles.vehicleChip, active && styles.vehicleChipOn]}
                            onPress={() => selectVehicle(v.id)}
                          >
                            <BookingIcon name={v.icon} size={34} color={active ? '#2563EB' : '#6B7280'} />
                            <Text style={[styles.vehicleName, active && styles.vehicleNameOn]}>{v.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    <View style={styles.noteBox}>
                      <Text style={styles.noteText}>{selectedVehicle.note}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>What are you moving?</Text>
                      <Text style={styles.cardSub}>Select a category — filtered for your chosen vehicle</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.catGrid}>
                      {CATEGORIES.map((cat) => {
                        const compatible = (SERVICES[cat.id] || []).some(s => s.v.includes(localVanType));
                        const active = selectedCategory === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            style={[
                              styles.catChip,
                              active && styles.catChipOn,
                              !compatible && styles.catChipDim,
                            ]}
                            onPress={() => compatible && selectCategory(cat.id)}
                            disabled={!compatible}
                          >
                            <BookingIcon name={cat.icon} size={28} color={active ? '#2563EB' : '#6B7280'} />
                            <Text style={[styles.catName, active && styles.catNameOn]}>{cat.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {selectedCategory && (
                      <>
                        <View style={styles.serviceListHeader}>
                          <Text style={styles.sectionDivider}>{selectedCategory.toUpperCase()}</Text>
                          <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                            <Text style={styles.backLink}>← Categories</Text>
                          </TouchableOpacity>
                        </View>

                        {visibleServices.length === 0 ? (
                          <Text style={styles.emptyText}>
                            No services available for this vehicle in this category.
                          </Text>
                        ) : (
                          <View style={styles.serviceList}>
                            {visibleServices.map((svc) => {
                              const active = selectedService?.id === svc.id;
                              return (
                                <TouchableOpacity
                                  key={svc.id}
                                  style={[styles.serviceItem, active && styles.serviceItemOn]}
                                  onPress={() => selectService(svc)}
                                >
                                  <BookingIcon name={svc.ico} size={28} color={active ? '#2563EB' : '#6B7280'} />
                                  <View style={styles.serviceInfo}>
                                    <Text style={styles.serviceName}>{svc.name}</Text>
                                    <Text style={styles.serviceDesc}>{svc.desc}</Text>
                                  </View>
                                  <View style={styles.serviceRight}>
                                    <Text style={styles.servicePrice}>{svc.price}</Text>
                                    <Text style={styles.serviceBadge}>{svc.btxt}</Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </>
                    )}

                    {selectedService && (
                      <>
                        <View style={styles.selectedPill}>
                          <BookingIcon name={selectedService.ico} size={22} color="#2563EB" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.selectedPillName}>{selectedService.name}</Text>
                            <Text style={styles.selectedPillPrice}>{selectedService.price}</Text>
                          </View>
                          <TouchableOpacity onPress={() => setSelectedService(null)}>
                            <Text style={styles.changeLink}>Change</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.sdivRow}>
                          <Text style={styles.sectionDivider}>Items</Text>
                        </View>
                        {renderItemsTable(0)}

                        <View style={styles.sdivRow}>
                          <Text style={styles.sectionDivider}>Total Weight (Approx)</Text>
                        </View>
                        <View style={styles.weightRow}>
                          <Text style={styles.weightLbl}>Weight</Text>
                          <TouchableOpacity onPress={() => adjustWeight(0, -5)} style={styles.stepperBtn}>
                            <Ionicons name="remove" size={18} color="#2563EB" />
                          </TouchableOpacity>
                          <Text style={styles.weightVal}>{Number(stops[0]?.weight || 0)} kg</Text>
                          <TouchableOpacity onPress={() => adjustWeight(0, 5)} style={styles.stepperBtn}>
                            <Ionicons name="add" size={18} color="#2563EB" />
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </>
            )}

            {step === 2 && !isMulti && (
              <>
                <View style={styles.serviceBanner}>
                  <BookingIcon name={selectedService?.ico || 'si-01'} size={18} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceBannerName}>
                      {selectedVehicle.name}{selectedService ? ` · ${selectedService.name}` : ' · Service'}
                    </Text>
                    <Text style={styles.serviceBannerSub}>Booking details</Text>
                  </View>
                  <TouchableOpacity onPress={() => setStep(1)}>
                    <Text style={styles.serviceBannerChange}>Change</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Pickup & Drop-off</Text>
                      <Text style={styles.cardSub}>Tap to pin exact location</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <TouchableOpacity style={styles.mapStrip} onPress={() => handleMapPick(-1)} activeOpacity={0.9}>
                      <View style={styles.mapBgReal}>
                        <View style={styles.mapGrid} />

                        <View style={styles.mapWater} />
                        <View style={styles.mapPark} />

                        <View style={styles.mapBuilding1} />
                        <View style={styles.mapBuilding2} />
                        <View style={styles.mapBuilding3} />
                        <View style={styles.mapBuilding4} />

                        <View style={styles.mapRoadMain} />
                        <View style={styles.mapRoadSide1} />
                        <View style={styles.mapRoadSide2} />

                        <View style={styles.mapRouteLine} />

                        <View style={styles.mapPinsWrap}>
                          <View style={styles.mapPinGroup}>
                            <View style={[styles.mapPinDotReal, styles.mapPinPickup]}>
                              <Text style={styles.mapPinLetter}>P</Text>
                            </View>
                            <Text style={styles.mapPinTag}>Pickup</Text>
                          </View>

                          {stops.map((_, idx: number) => (
                            <View key={idx} style={styles.mapPinGroup}>
                              <View style={[styles.mapPinDotReal, styles.mapPinStop]}>
                                <Text style={styles.mapPinLetter}>{idx + 1}</Text>
                              </View>
                              <Text style={styles.mapPinTag}>Stop {idx + 1}</Text>
                            </View>
                          ))}

                          <View style={styles.mapPinGroup}>
                            <View style={[styles.mapPinDotReal, styles.mapPinDropoff]}>
                              <Text style={styles.mapPinLetter}>D</Text>
                            </View>
                            <Text style={styles.mapPinTag}>Drop-off</Text>
                          </View>
                        </View>

                        <View style={styles.mapRoadLabel1}>
                          <Text style={styles.mapRoadLabelText}>N4</Text>
                        </View>
                        <View style={styles.mapRoadLabel2}>
                          <Text style={styles.mapRoadLabelText}>R110</Text>
                        </View>

                        <View style={styles.mapNeighborhoodLabel}>
                          <Text style={styles.mapNeighborhoodText}>Greenogue Business Park</Text>
                        </View>
                      </View>

                      <View style={styles.mapEditBtn}>
                        <Ionicons name="map-outline" size={12} color="#2563EB" />
                        <Text style={styles.mapEditText}>Edit map</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.locRowPick} onPress={() => handleMapPick(-1)}>
                      <View style={styles.locDotG} />
                      <View style={styles.locInfo}>
                        <Text style={styles.locLblG}>Pickup</Text>
                        <TextInput
                          style={styles.locInput}
                          placeholder="Search address or Eircode"
                          placeholderTextColor="#6B7280"
                          value={pickupAddr}
                          onChangeText={(t) => {
                            setPickupAddr(t);
                            scheduleSearch(t, -1);
                          }}
                          onFocus={() => setActiveSearchIndex(-1)}
                        />
                      </View>
                      <View style={styles.locPinBtn}>
                        <Ionicons name="location-outline" size={16} color="#2563EB" />
                      </View>
                    </TouchableOpacity>

                    {activeSearchIndex === -1 && renderSuggestions(-1)}

                    <View style={styles.connectorLine} />

                    <TouchableOpacity style={styles.locRowDrop} onPress={() => handleMapPick(0)}>
                      <View style={styles.locDotR} />
                      <View style={styles.locInfo}>
                        <Text style={styles.locLblR}>Drop-off</Text>
                        <TextInput
                          style={styles.locInput}
                          placeholder="Drop-off address or Eircode"
                          placeholderTextColor="#9CA3AF"
                          value={stops[0]?.address || ''}
                          onChangeText={(t) => {
                            updateStop(0, 'address', t);
                            scheduleSearch(t, 0);
                          }}
                          onFocus={() => setActiveSearchIndex(0)}
                        />
                      </View>
                      <View style={styles.locPinBtnRed}>
                        <Ionicons name="location-outline" size={16} color="#EF4444" />
                      </View>
                    </TouchableOpacity>

                    {activeSearchIndex === 0 && renderSuggestions(0)}
                  </View>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Recipient Details</Text>
                      <Text style={styles.cardSub}>Who is receiving this delivery?</Text>
                    </View>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.row2}>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.fieldLabel}>Name</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="Full name"
                          value={stops[0]?.recipient || ''}
                          onChangeText={(t) => updateStop(0, 'recipient', t)}
                        />
                      </View>
                      <View style={styles.fieldHalf}>
                        <Text style={styles.fieldLabel}>Phone</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="+353..."
                          keyboardType="phone-pad"
                          value={stops[0]?.phone || ''}
                          onChangeText={(t) => updateStop(0, 'phone', t)}
                        />
                      </View>
                    </View>

                    <View style={styles.fieldFull}>
                      <Text style={styles.fieldLabel}>Delivery Instructions</Text>
                      <TextInput
                        style={[styles.fieldInput, { minHeight: 60, textAlignVertical: 'top' }]}
                        placeholder="e.g. Leave at reception..."
                        multiline
                        value={stops[0]?.instructions || ''}
                        onChangeText={(t) => updateStop(0, 'instructions', t)}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}

            {step === 2 && isMulti && (
              <>
                <View style={styles.serviceBanner}>
                  <BookingIcon name={selectedService?.ico || 'si-01'} size={18} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceBannerName}>
                      {selectedVehicle.name}{selectedService ? ` · ${selectedService.name}` : ' · Service'}
                    </Text>
                    <Text style={styles.serviceBannerSub}>Multiple stops booking</Text>
                  </View>
                  <TouchableOpacity onPress={() => setStep(1)}>
                    <Text style={styles.serviceBannerChange}>Change</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Stops</Text>
                      <Text style={styles.cardSub}>Each stop can have different items and services</Text>
                    </View>
                    <Text style={styles.stopCount}>{stops.length} stops</Text>
                  </View>

                  <View style={styles.cardBody}>
                    <TouchableOpacity style={styles.mapStrip} onPress={() => handleMapPick(-1)} activeOpacity={0.9}>
                      <View style={styles.mapBgReal}>
                        <View style={styles.mapGrid} />

                        <View style={styles.mapWater} />
                        <View style={styles.mapPark} />

                        <View style={styles.mapBuilding1} />
                        <View style={styles.mapBuilding2} />
                        <View style={styles.mapBuilding3} />
                        <View style={styles.mapBuilding4} />

                        <View style={styles.mapRoadMain} />
                        <View style={styles.mapRoadSide1} />
                        <View style={styles.mapRoadSide2} />

                        <View style={styles.mapRouteLine} />

                        <View style={styles.mapPinsWrap}>
                          <View style={styles.mapPinGroup}>
                            <View style={[styles.mapPinDotReal, styles.mapPinPickup]}>
                              <Text style={styles.mapPinLetter}>P</Text>
                            </View>
                            <Text style={styles.mapPinTag}>Pickup</Text>
                          </View>

                          {stops.map((_, idx: number) => (
                            <View key={idx} style={styles.mapPinGroup}>
                              <View style={[styles.mapPinDotReal, styles.mapPinStop]}>
                                <Text style={styles.mapPinLetter}>{idx + 1}</Text>
                              </View>
                              <Text style={styles.mapPinTag}>Stop {idx + 1}</Text>
                            </View>
                          ))}

                          <View style={styles.mapPinGroup}>
                            <View style={[styles.mapPinDotReal, styles.mapPinDropoff]}>
                              <Text style={styles.mapPinLetter}>D</Text>
                            </View>
                            <Text style={styles.mapPinTag}>Drop-off</Text>
                          </View>
                        </View>

                        <View style={styles.mapRoadLabel1}>
                          <Text style={styles.mapRoadLabelText}>N4</Text>
                        </View>
                        <View style={styles.mapRoadLabel2}>
                          <Text style={styles.mapRoadLabelText}>R110</Text>
                        </View>

                        <View style={styles.mapNeighborhoodLabel}>
                          <Text style={styles.mapNeighborhoodText}>Greenogue Business Park</Text>
                        </View>
                      </View>

                      <View style={styles.mapEditBtn}>
                        <Ionicons name="map-outline" size={12} color="#2563EB" />
                        <Text style={styles.mapEditText}>Edit map</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.locRowPick} onPress={() => handleMapPick(-1)}>
                      <View style={styles.locDotG} />
                      <View style={styles.locInfo}>
                        <Text style={styles.locLblG}>Collection</Text>
                        <TextInput
                          style={styles.locInput}
                          placeholder="Search address or Eircode"
                          placeholderTextColor="#7A9080"
                          value={pickupAddr}
                          onChangeText={(t) => {
                            setPickupAddr(t);
                            scheduleSearch(t, -1);
                          }}
                          onFocus={() => setActiveSearchIndex(-1)}
                        />
                      </View>
                      <View style={styles.locPinBtn}>
                        <Ionicons name="location-outline" size={16} color="#2563EB" />
                      </View>
                    </TouchableOpacity>

                    {activeSearchIndex === -1 && renderSuggestions(-1)}

                    <View style={styles.stopsWrap}>
                      {stops.map((stop: any, idx: number) => {
                        const expanded = expandedStopIdx === idx;
                        const itemsCount = stop.items?.length || 0;
                        const chosenSvc = selectedStopServices[idx];

                        return (
                          <View key={idx} style={[styles.stopCard, expanded && styles.stopCardExp]}>
                            <TouchableOpacity
                              style={styles.stopHdr}
                              onPress={() => setExpandedStopIdx(expanded ? null : idx)}
                            >
                              <View style={[styles.stopNum, expanded && styles.stopNumActive]}>
                                <Text style={styles.stopNumText}>{idx + 1}</Text>
                              </View>

                              <View style={styles.stopPrev}>
                                <Text style={[styles.stopAddr, !stop.address && styles.stopAddrPh]} numberOfLines={1}>
                                  {stop.address || 'Enter delivery address...'}
                                </Text>
                                <Text style={styles.stopMeta}>
                                  {itemsCount} item{itemsCount !== 1 ? 's' : ''}{chosenSvc ? ` · ${chosenSvc.name}` : ' · no service selected'}
                                </Text>
                              </View>

                              <View style={styles.stopRight}>
                                <TouchableOpacity style={styles.stopPinBtn} onPress={() => handleMapPick(idx)}>
                                  <Ionicons name="location-outline" size={14} color="#2563EB" />
                                </TouchableOpacity>
                                {idx > 0 && (
                                  <TouchableOpacity style={styles.delBtn} onPress={() => removeStop(idx)}>
                                    <Ionicons name="close" size={16} color="#EF4444" />
                                  </TouchableOpacity>
                                )}
                                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
                              </View>
                            </TouchableOpacity>

                            {expanded && (
                              <View style={styles.stopBody}>
                                <View style={styles.row2}>
                                  <View style={styles.fieldHalf}>
                                    <Text style={styles.fieldLabel}>Recipient</Text>
                                    <TextInput
                                      style={styles.fieldInput}
                                      placeholder="e.g. Client Ltd"
                                      value={stop.recipient || ''}
                                      onChangeText={(t) => updateStop(idx, 'recipient', t)}
                                    />
                                  </View>
                                  <View style={styles.fieldHalf}>
                                    <Text style={styles.fieldLabel}>Phone</Text>
                                    <TextInput
                                      style={styles.fieldInput}
                                      placeholder="+353..."
                                      keyboardType="phone-pad"
                                      value={stop.phone || ''}
                                      onChangeText={(t) => updateStop(idx, 'phone', t)}
                                    />
                                  </View>
                                </View>

                                <View style={styles.fieldFull}>
                                  <Text style={styles.fieldLabel}>Address</Text>
                                  <View style={styles.addrWrap}>
                                    <TextInput
                                      style={[styles.fieldInput, { paddingRight: 36 }]}
                                      placeholder="Full address with Eircode"
                                      value={stop.address || ''}
                                      onChangeText={(t) => {
                                        updateStop(idx, 'address', t);
                                        scheduleSearch(t, idx);
                                      }}
                                      onFocus={() => setActiveSearchIndex(idx)}
                                    />
                                    <TouchableOpacity style={styles.addrPin} onPress={() => handleMapPick(idx)}>
                                      <Ionicons name="location-outline" size={16} color="#2563EB" />
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                {activeSearchIndex === idx && renderSuggestions(idx)}

                                <View style={styles.stopSvcSel}>
                                  <Text style={styles.stopSvcLbl}>Service for this stop</Text>

                                  {chosenSvc ? (
                                    <TouchableOpacity
                                      style={styles.stopSvcChosen}
                                      onPress={() => {
                                        const updated = { ...selectedStopServices };
                                        delete updated[idx];
                                        setSelectedStopServices(updated);
                                      }}
                                    >
                                      <BookingIcon name={chosenSvc.ico} size={18} color="#2563EB" />
                                      <Text style={styles.stopSvcChosenName}>{chosenSvc.name}</Text>
                                      <Text style={styles.stopSvcChosenChange}>Change</Text>
                                    </TouchableOpacity>
                                  ) : (
                                    <View style={styles.stopCatsGrid}>
                                      {CATEGORIES.map((cat) => {
                                        const compatible = (SERVICES[cat.id] || []).some(s => s.v.includes(localVanType));
                                        return (
                                          <TouchableOpacity
                                            key={cat.id}
                                            style={[styles.stopCatBtn, !compatible && styles.stopCatBtnDim]}
                                            disabled={!compatible}
                                            onPress={() => {
                                              const firstSvc = (SERVICES[cat.id] || []).find(s => s.v.includes(localVanType));
                                              if (firstSvc) {
                                                setSelectedStopServices(prev => ({ ...prev, [idx]: firstSvc }));
                                              }
                                            }}
                                          >
                                            <Text style={styles.stopCatBtnText}>{cat.name.split(' ')[0]}</Text>
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  )}
                                </View>

                                {renderItemsTable(idx)}

                                <View style={styles.fieldFull}>
                                  <Text style={styles.fieldLabel}>Delivery Instructions</Text>
                                  <TextInput
                                    style={[styles.fieldInput, { minHeight: 60, textAlignVertical: 'top' }]}
                                    placeholder="e.g. Ring buzzer..."
                                    multiline
                                    value={stop.instructions || ''}
                                    onChangeText={(t) => updateStop(idx, 'instructions', t)}
                                  />
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>

                    <TouchableOpacity style={styles.addStopBtn} onPress={addStop}>
                      <Ionicons name="add" size={16} color="#6B7280" />
                      <Text style={styles.addStopBtnText}>Add another drop-off stop</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.bottomCta}>
            {step === 1 ? (
              <TouchableOpacity
                style={[styles.ctaBtn, !canContinue && styles.ctaBtnDim]}
                onPress={handleContinue}
                disabled={!canContinue}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaBtnText}>Continue to Location & Details</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.ctaBtnGreen} onPress={handleGetPrice} activeOpacity={0.85}>
                <Text style={styles.ctaBtnText}>Confirm & Book</Text>
                <Ionicons name="checkmark" size={18} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8F6' },
  scrollContent: { padding: 16, paddingBottom: 110 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    padding: 10,
    backgroundColor: '#111827',
    flexShrink: 0,
  },
  stepActive: { flex: 1, alignItems: 'center' },
  stepDone: { flex: 1, alignItems: 'center' },
  stepPending: { flex: 1, alignItems: 'center' },
  stepCircle: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', textAlignVertical: 'center', fontSize: 9, fontWeight: '700', color: '#FFF' },
  stepLabel: { fontSize: 8, fontWeight: '600', color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  stepLineDone: { width: 40, height: 2, backgroundColor: '#2563EB', marginHorizontal: 4 },
  stepLinePending: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 4 },

  modeLabel: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  modeLabelText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },

  schedToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  schedBtn: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  schedBtnOn: { backgroundColor: '#111827' },
  schedText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  schedTextOn: { color: '#FFF' },

  datePickerCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  dateConfirmBtn: { backgroundColor: '#2563EB', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  dateConfirmText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  card: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeader: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  cardBody: { padding: 14 },
  autoBadge: { fontSize: 9, color: '#2563EB', fontWeight: '700', backgroundColor: '#EFF6FF', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12, overflow: 'hidden', letterSpacing: 0.5 },

  vehicleScroll: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  vehicleChip: { width: 84, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FFF', flexShrink: 0 },
  vehicleChipOn: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  vehicleName: { fontSize: 9, fontWeight: '600', color: '#6B7280', textAlign: 'center', marginTop: 4 },
  vehicleNameOn: { color: '#2563EB' },
  noteBox: { marginTop: 10, padding: 8, backgroundColor: '#F4F8F6', borderRadius: 7, borderWidth: 1, borderColor: '#E5E7EB' },
  noteText: { fontSize: 10, color: '#6B7280', lineHeight: 15 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  catChip: { width: '31%', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FFF', marginBottom: 6 },
  catChipOn: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  catChipDim: { opacity: 0.28 },
  catName: { fontSize: 9, fontWeight: '600', color: '#6B7280', marginTop: 4, textAlign: 'center' },
  catNameOn: { color: '#2563EB' },

  serviceListHeader: { marginTop: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionDivider: { fontSize: 11, fontWeight: '700', color: '#111827', textTransform: 'uppercase', letterSpacing: 0.5 },
  backLink: { fontSize: 10, color: '#2563EB', fontWeight: '600' },
  emptyText: { fontSize: 11, color: '#6B7280', textAlign: 'center', paddingVertical: 14 },

  serviceList: { gap: 6 },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, backgroundColor: '#FFF' },
  serviceItemOn: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 12, fontWeight: '600', color: '#111827' },
  serviceDesc: { fontSize: 10, color: '#6B7280', marginTop: 2, lineHeight: 14 },
  serviceRight: { alignItems: 'flex-end' },
  servicePrice: { fontSize: 11, fontWeight: '500', color: '#3D5046' },
  serviceBadge: { fontSize: 8, fontWeight: '700', marginTop: 3, color: '#2563EB', backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },

  selectedPill: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#2563EB', marginTop: 10 },
  selectedPillName: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  selectedPillPrice: { fontSize: 11, color: '#3D5046', marginTop: 2 },
  changeLink: { fontSize: 10, color: '#2563EB', textDecorationLine: 'underline', fontWeight: '600' },

  sdivRow: { marginTop: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },

  itemsSec: { marginTop: 2 },
  itemsHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemsLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#6B7280', letterSpacing: 0.5 },
  addItemBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#EFF6FF', borderRadius: 6, marginTop: 4 },
  addItemBtnText: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
  table: { width: '100%' },
  tableHdrRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 6, marginBottom: 6 },
  th: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingVertical: 4 },
  tdInput: { fontSize: 12, color: '#111827', paddingVertical: 6, paddingHorizontal: 2 },
  tdDel: { width: 24, alignItems: 'center', justifyContent: 'center' },

  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weightLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#6B7280', letterSpacing: 0.5 },
  stepperBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, borderWidth: 1, borderColor: '#BFDBFE' },
  weightVal: { fontSize: 14, fontWeight: '700', color: '#111827', width: 64, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  mapStrip: { width: '100%', height: 90, borderRadius: 8, overflow: 'hidden', position: 'relative', marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  mapBg: { width: '100%', height: '100%', backgroundColor: '#BFDDF6', position: 'relative' },
  mapRoad: { position: 'absolute', top: '42%', left: 0, right: 0, height: 7, backgroundColor: 'rgba(255,255,255,0.55)' },
  mapRoute: { position: 'absolute', top: '39%', left: '10%', right: '10%', height: 2, borderBottomWidth: 2, borderBottomColor: '#2563EB', borderStyle: 'dashed', zIndex: 2 },
  mapPinsRow: { position: 'absolute', inset: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: '15%' },
  mapPin: { alignItems: 'center' },
  mapPinText: { fontSize: 7, fontWeight: '700', color: '#FFF', backgroundColor: '#2563EB', width: 16, height: 16, borderRadius: 8, textAlign: 'center', textAlignVertical: 'center' },
  mapPinLbl: { fontSize: 8, backgroundColor: '#FFF', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, marginTop: 3, color: '#111827' },
  mapEditBtn: { position: 'absolute', bottom: 6, right: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapEditText: { fontSize: 9, fontWeight: '600', color: '#2563EB' },

  locRowPick: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', marginBottom: 8 },
  locRowDrop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', marginBottom: 8 },
  locDotG: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  locDotR: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  locInfo: { flex: 1, justifyContent: 'center' },
  locLblG: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, color: '#2563EB' },
  locLblR: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, color: '#EF4444' },
  locInput: { fontSize: 13, fontWeight: '600', color: '#111827', padding: 0, margin: 0 },
  locPinBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  locPinBtnRed: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  connectorLine: { width: 2, height: 12, marginLeft: 16, borderLeftWidth: 2, borderLeftColor: '#D1D5DB', borderStyle: 'dashed' },

  row2: { flexDirection: 'row', gap: 7, marginTop: 8 },
  fieldHalf: { flex: 1 },
  fieldFull: { marginTop: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  fieldInput: { width: '100%', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 7, fontSize: 11, color: '#111827', backgroundColor: '#FFF' },

  stopsWrap: { position: 'relative', marginTop: 4, paddingLeft: 18 },
  stopsWrapBefore: {},
  stopCard: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8, overflow: 'hidden', position: 'relative' },
  stopCardExp: { borderColor: '#2563EB' },
  stopHdr: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  stopNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stopNumActive: { backgroundColor: '#2563EB' },
  stopNumText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  stopPrev: { flex: 1 },
  stopAddr: { fontSize: 13, fontWeight: '600', color: '#111827' },
  stopAddrPh: { color: '#9CA3AF', fontWeight: '400' },
  stopMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  stopRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stopPinBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  stopBody: { padding: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FAFCFB' },

  stopSvcSel: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  stopSvcLbl: { fontSize: 10, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  stopSvcChosen: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 7, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 7, marginBottom: 6 },
  stopSvcChosenName: { flex: 1, fontSize: 11, fontWeight: '600', color: '#2563EB' },
  stopSvcChosenChange: { fontSize: 9, color: '#2563EB', textDecorationLine: 'underline' },
  stopCatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  stopCatBtn: { width: '32.5%', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 6, paddingVertical: 6, alignItems: 'center', backgroundColor: '#FFF' },
  stopCatBtnDim: { opacity: 0.3 },
  stopCatBtnText: { fontSize: 9, fontWeight: '600', color: '#6B7280' },

  addStopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#E5E7EB', borderRadius: 8, marginTop: 10 },
  addStopBtnText: { fontSize: 11, fontWeight: '500', color: '#6B7280' },
  stopCount: { fontSize: 10, color: '#6B7280', fontWeight: '500' },

  suggestionBox: { backgroundColor: '#FFF', borderRadius: 8, marginTop: 4, paddingHorizontal: 4, paddingBottom: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, zIndex: 10 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionText: { marginLeft: 8, fontSize: 13, color: '#374151' },

  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, gap: 8 },
  ctaBtnGreen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, gap: 8 },
  ctaBtnDim: { backgroundColor: '#B8CEC3' },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  serviceBanner: { backgroundColor: '#2563EB', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  serviceBannerName: { fontSize: 11, color: '#FFF', fontWeight: '600', whiteSpace: 'nowrap' },
  serviceBannerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  serviceBannerChange: { fontSize: 10, color: 'rgba(255,255,255,0.75)', textDecorationLine: 'underline' },
  mapBgReal: {
  flex: 1,
  backgroundColor: '#CFE8D8',
  position: 'relative',
  overflow: 'hidden',
},

mapGrid: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'transparent',
  opacity: 0.35,
  backgroundImage: undefined,
  borderWidth: 0,
  borderColor: 'transparent',
},

mapWater: {
  position: 'absolute',
  right: -10,
  top: 8,
  width: 92,
  height: 48,
  borderRadius: 24,
  backgroundColor: '#BFDDF6',
  opacity: 0.85,
  transform: [{ rotate: '-10deg' }],
},

mapPark: {
  position: 'absolute',
  left: 12,
  bottom: 12,
  width: 110,
  height: 42,
  borderRadius: 20,
  backgroundColor: '#B9DDC1',
  opacity: 0.9,
},

mapBuilding1: {
  position: 'absolute',
  left: 18,
  top: 18,
  width: 28,
  height: 18,
  borderRadius: 4,
  backgroundColor: '#A9C5B1',
  opacity: 0.95,
},
mapBuilding2: {
  position: 'absolute',
  left: 56,
  top: 20,
  width: 36,
  height: 22,
  borderRadius: 4,
  backgroundColor: '#8FA898',
  opacity: 0.95,
},
mapBuilding3: {
  position: 'absolute',
  right: 20,
  bottom: 22,
  width: 32,
  height: 20,
  borderRadius: 4,
  backgroundColor: '#A9C5B1',
  opacity: 0.95,
},
mapBuilding4: {
  position: 'absolute',
  right: 62,
  bottom: 16,
  width: 24,
  height: 16,
  borderRadius: 4,
  backgroundColor: '#8FA898',
  opacity: 0.95,
},

mapRoadMain: {
  position: 'absolute',
  left: -10,
  right: -10,
  top: '44%',
  height: 10,
  backgroundColor: 'rgba(255,255,255,0.68)',
  transform: [{ rotate: '-2deg' }],
},
mapRoadSide1: {
  position: 'absolute',
  left: '12%',
  top: '18%',
  width: '76%',
  height: 7,
  backgroundColor: 'rgba(255,255,255,0.42)',
  transform: [{ rotate: '18deg' }],
},
mapRoadSide2: {
  position: 'absolute',
  left: '8%',
  bottom: '18%',
  width: '84%',
  height: 6,
  backgroundColor: 'rgba(255,255,255,0.32)',
  transform: [{ rotate: '-18deg' }],
},

mapRouteLine: {
  position: 'absolute',
  left: '18%',
  right: '18%',
  top: '43.5%',
  height: 3,
  borderRadius: 2,
  borderBottomWidth: 3,
  borderBottomColor: '#2563EB',
  borderStyle: 'dashed',
},

mapPinsWrap: {
  ...StyleSheet.absoluteFillObject,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-around',
  paddingHorizontal: '10%',
  zIndex: 4,
},

mapPinGroup: {
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
},

mapPinDotReal: {
  width: 18,
  height: 18,
  borderRadius: 9,
  borderWidth: 2,
  borderColor: '#FFF',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 3,
  elevation: 2,
},

mapPinPickup: {
  backgroundColor: '#2563EB',
},
mapPinStop: {
  backgroundColor: '#111827',
},
mapPinDropoff: {
  backgroundColor: '#EF4444',
},

mapPinLetter: {
  color: '#FFF',
  fontSize: 8,
  fontWeight: '700',
  lineHeight: 9,
},

mapPinTag: {
  fontSize: 8,
  fontWeight: '600',
  color: '#111827',
  backgroundColor: 'rgba(255,255,255,0.95)',
  paddingHorizontal: 5,
  paddingVertical: 1,
  borderRadius: 3,
  overflow: 'hidden',
},

mapRoadLabel1: {
  position: 'absolute',
  left: 12,
  top: 38,
  backgroundColor: 'rgba(255,255,255,0.9)',
  paddingHorizontal: 5,
  paddingVertical: 2,
  borderRadius: 4,
  zIndex: 3,
},
mapRoadLabel2: {
  position: 'absolute',
  right: 14,
  bottom: 34,
  backgroundColor: 'rgba(255,255,255,0.9)',
  paddingHorizontal: 5,
  paddingVertical: 2,
  borderRadius: 4,
  zIndex: 3,
},
mapRoadLabelText: {
  fontSize: 8,
  fontWeight: '700',
  color: '#2563EB',
},

mapNeighborhoodLabel: {
  position: 'absolute',
  left: 14,
  bottom: 8,
  backgroundColor: 'rgba(17,24,39,0.72)',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 10,
  zIndex: 3,
},
mapNeighborhoodText: {
  fontSize: 8,
  fontWeight: '600',
  color: '#FFF',
},
});