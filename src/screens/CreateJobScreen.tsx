// CreateJobScreen.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Switch,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppProvider';
import { styles } from '../styles';
import { Animated } from 'react-native';

// ---------- helper: haversine distance (km) ----------
function haversineKm(a?: { latitude: number; longitude: number }, b?: { latitude: number; longitude: number }) {
  if (!a || !b) return 0;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const aa = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return Math.max(0, R * c);
}

// ---------- Job types structure (grouped by tier) ----------
// NOTE: item.id values MUST match backend JOB_TYPE_TABLE keys (e.g. 'parcel_small', 'furniture_items', ...)
const JOB_TIERS = [
  {
    id: 'tier1',
    title: ' Parcel & Document Delivery',
    items: [
      { id: 'parcel_small', label: 'Small Parcel' },
      { id: 'parcel_medium', label: 'Medium Parcel' },
      { id: 'parcel_large', label: 'Large Parcel' },
      { id: 'urgent_document', label: 'Urgent Document' },
    ],
  },
  {
    id: 'tier2',
    title: 'Furniture & Appliances',
    items: [
      { id: 'furniture_items', label: 'Furniture Items' },
      { id: 'furniture_store', label: 'Furniture Store Delivery' },
      { id: 'appliance', label: 'Appliance Delivery' },
      { id: 'office_equipment', label: 'Office Equipment' },
      { id: 'commercial_kitchen', label: 'Commercial Kitchen' },
    ],
  },
  {
    id: 'tier3',
    title: 'Food & Beverage',
    items: [
      { id: 'food_cold', label: 'Food (Cold)' },
      { id: 'wine', label: 'Wine / Alcohol' },
      { id: 'flowers', label: 'Flowers' },
      { id: 'catering', label: 'Catering & Events' },
    ],
  },
  {
    id: 'tier4',
    title: 'Electronics & Fragile',
    items: [
      { id: 'electronics', label: 'Electronics' },
      { id: 'computer_b2b', label: 'Computer / Servers' },
      { id: 'fragile', label: 'Fragile Items' },
      { id: 'art', label: 'Art & Antiques' },
    ],
  },
  {
    id: 'tier5',
    title: 'Construction & Supplies',
    items: [
      { id: 'construction', label: 'Construction Materials' },
      { id: 'hvac', label: 'HVAC Equipment' },
      { id: 'plumbing', label: 'Plumbing Supplies' },
      { id: 'plants', label: 'Plants & Nursery' },
    ],
  },
  {
    id: 'tier6',
    title: 'Retail & E-commerce',
    items: [
      { id: 'retail_stock', label: 'Retail Stock (B2B)' },
      { id: 'same_day', label: 'Same-Day E-Commerce' },
      { id: 'bulk_wholesale', label: 'Bulk / Wholesale' },
      { id: 'laundry', label: 'Laundry / Dry Cleaning' },
    ],
  },
  {
    id: 'tier7',
    title: 'Medical & Specialized',
    items: [
      { id: 'medical_cold', label: 'Medical / Pharma (Cold)' },
      { id: 'medical_freeze', label: 'Medical (Frozen)' },
      { id: 'medical_room', label: 'Medical (Room temp)' },
    ],
  },
  {
    id: 'tier8',
    title: 'Mobile Services',
    items: [
      { id: 'auto_detail', label: 'Auto Detailing' },
      { id: 'pet_groom', label: 'Pet Grooming' },
    ],
  },
  {
    id: 'tier9',
    title: 'Bulk & Removal',
    items: [
      { id: 'house_removal', label: 'House Removal / Full Move' },
    ],
  },
  {
    id: 'tier10',
    title: 'Specialty Services',
    items: [
      { id: 'vehicle_towing', label: 'Vehicle Towing / Recovery' },
    ],
  },
];

// ---------- man service options ----------
const MAN_SERVICE_OPTIONS = [
  { id: 1, label: 'One man service' },
  { id: 2, label: 'Two man service' },
  { id: 3, label: 'Three man service' },
];

export default function CreateJobScreen() {
  const {
    mapRef,
    mapFormExpanded,
    setMapFormExpanded,
    pickupAddr,
    setPickupAddr,
    dropoffAddr,
    setDropoffAddr,
    setDropoffCoord,
    pickupSuggestions,
    dropoffSuggestions,
    setDropoffSuggestions,
    searchingWhich,
    setSearchingWhich,
    scheduleSearch,
    useMyLocation,
    selectSearchResult,
    loading,
    openQuoteFlow,
    quoteModalVisible,
    setQuoteModalVisible,
    quoteData,
    creatingBooking,
    confirmAndPayAndCreateBooking,
    pickupCoord,
    dropoffCoord,
    progressAnim,
    etaSeconds,
    user,
    activeJobs,
    reverseGeocode,
    pendingVanType, // <-- make sure pendingVanType matches: courier|cargo|large|refrigerated|fleet|tow
  } = useAppContext();

  // Local selection state
  const [jobTypeModalVisible, setJobTypeModalVisible] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<{ id: string; label: string } | null>(null);

  const [manModalVisible, setManModalVisible] = useState(false);
  const [selectedManService, setSelectedManService] = useState<number>(1);

  const [followDriver, setFollowDriver] = useState<boolean>(false);

  // small UI helpers
  const [localNotes, setLocalNotes] = useState<string>('');

  const approxDistanceKm = useMemo(() => {
    if (!pickupCoord || !dropoffCoord) return 0;
    return Number(haversineKm(pickupCoord, dropoffCoord).toFixed(2));
  }, [pickupCoord, dropoffCoord]);

  // When requesting quote, send full payload including van type, job type, man service, follow driver and distance
  const handleOpenQuote = async () => {
    if (!pickupCoord || !dropoffCoord) {
      Alert.alert('Missing locations', 'Please select both pickup and dropoff locations.');
      return;
    }
    if (!selectedJobType) {
      Alert.alert('Choose job type', 'Please select a job type (e.g. Furniture, Parcel).');
      return;
    }

    const payload = {
      pickup_lat: pickupCoord.latitude,
      pickup_lon: pickupCoord.longitude,
      dropoff_lat: dropoffCoord.latitude,
      dropoff_lon: dropoffCoord.longitude,
      pickup_address: pickupAddr,
      dropoff_address: dropoffAddr,
      van_type: pendingVanType || 'cargo',
      job_type: selectedJobType.id,
      man_service: selectedManService,
      follow_driver: followDriver,
      distance: approxDistanceKm, // helpful hint for server; server will calculate authoritative route
    };

    try {
      await openQuoteFlow(payload);
    } catch (e) {
      console.warn('openQuoteFlow failed', e);
      Alert.alert('Error', 'Could not fetch quote. Try again.');
    }
  };

  // Confirm & Book handler — pass same payload to provider so it can create payment & booking
  const handleConfirmAndBook = async () => {
    if (!selectedJobType) {
      Alert.alert('Choose job type', 'Please select a job type before booking.');
      return;
    }
    if (!pickupCoord || !dropoffCoord) {
      Alert.alert('Missing locations', 'Please select both pickup and dropoff locations.');
      return;
    }

    const payload = {
      pickup_lat: pickupCoord.latitude,
      pickup_lon: pickupCoord.longitude,
      dropoff_lat: dropoffCoord.latitude,
      dropoff_lon: dropoffCoord.longitude,
      pickup_address: pickupAddr,
      dropoff_address: dropoffAddr,
      van_type: pendingVanType || 'cargo',
      job_type: selectedJobType.id,
      man_service: selectedManService,
      follow_driver: followDriver,
      notes: localNotes,
      distance: approxDistanceKm,
    };

    try {
      await confirmAndPayAndCreateBooking(payload);
    } catch (e) {
      console.warn('confirmAndPayAndCreateBooking error', e);
      Alert.alert('Booking failed', 'Could not complete booking.');
    }
  };

  // Render row for job tier modal list — show only friendly label
  const renderJobItem = ({ item }: { item: { id: string; label: string } }) => (
    <TouchableOpacity
      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
      onPress={() => {
        setSelectedJobType({ id: item.id, label: item.label });
        setJobTypeModalVisible(false);
      }}
    >
      <Text style={{ fontWeight: '700' }}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1, marginBottom: 110 }}
        initialRegion={{
          latitude: pickupCoord?.latitude ?? 0,
          longitude: pickupCoord?.longitude ?? 0,
          latitudeDelta: 0.06,
          longitudeDelta: 0.03,
        }}
        onPress={async (e) => {
          try {
            const coords = e.nativeEvent.coordinate;
            setDropoffCoord(coords);
            const display = await reverseGeocode(coords.latitude, coords.longitude);
            setDropoffAddr(display);
            setDropoffSuggestions([{ display_name: display, lat: coords.latitude, lon: coords.longitude } as any]);
            setSearchingWhich(null);
          } catch (err) {
            console.warn('Map tap handling failed', err);
          }
        }}
      >
        {pickupCoord && <Marker coordinate={pickupCoord} title="Pickup" pinColor="blue" />}
        {dropoffCoord && <Marker coordinate={dropoffCoord} title="Dropoff" pinColor="red" />}
      </MapView>

      {/* Progress & ETA overlay */}
      <View style={{ position: 'absolute', left: 12, right: 12, top: 12 }}>
        <View
          style={{
            backgroundColor: '#fff',
            padding: 8,
            borderRadius: 10,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            elevation: 6,
          }}
        >
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>
            {user?.role === 'driver' ? 'Drive progress' : 'Trip progress'}
          </Text>
          <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <Animated.View
              style={{
                height: 8,
                backgroundColor: '#3b82f6',
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }}
            />
          </View>
          {etaSeconds !== null && (
            <Text style={{ marginTop: 6, color: '#6b7280' }}>
              ETA: {Math.floor((etaSeconds || 0) / 60)}m {Math.round((etaSeconds || 0) % 60)}s
            </Text>
          )}
        </View>
      </View>

      {mapFormExpanded ? (
        <View style={[styles.mapFormContainer, { bottom: 80 }]}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text style={{ fontWeight: '700' }}>Pickup & Dropoff</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setMapFormExpanded(false)} style={{ marginRight: 12 }}>
                <Ionicons name="chevron-down-outline" size={22} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPickupAddr('');
                  setDropoffAddr('');
                  setDropoffCoord(null);
                }}
                style={{ padding: 6 }}
              >
                <Ionicons name="close-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* Pickup */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setSearchingWhich('pickup')}>
                <TextInput
                  style={styles.input}
                  placeholder="Pickup Address"
                  value={pickupAddr}
                  onChangeText={(v) => {
                    setPickupAddr(v);
                    scheduleSearch(v, 'pickup');
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => useMyLocation('pickup')} style={{ padding: 10 }}>
                <Ionicons name="locate-outline" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            {pickupSuggestions.length > 0 && searchingWhich === 'pickup' && (
              <View style={{ backgroundColor: 'white', borderRadius: 10, maxHeight: 180, marginBottom: 6 }}>
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={pickupSuggestions}
                  keyExtractor={(i, idx) => `${i.place_id || i.lat}-${idx}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                      onPress={() => selectSearchResult('pickup', item)}
                    >
                      <Text numberOfLines={2}>{item.display_name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Dropoff */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setSearchingWhich('dropoff')}>
                <TextInput
                  style={styles.input}
                  placeholder="Dropoff Address"
                  value={dropoffAddr}
                  onChangeText={(v) => {
                    setDropoffAddr(v);
                    scheduleSearch(v, 'dropoff');
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => useMyLocation('dropoff')} style={{ padding: 10 }}>
                <Ionicons name="locate-outline" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            {dropoffSuggestions.length > 0 && searchingWhich === 'dropoff' && (
              <View style={{ backgroundColor: 'white', borderRadius: 10, maxHeight: 180, marginBottom: 6 }}>
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={dropoffSuggestions}
                  keyExtractor={(i, idx) => `${i.place_id || i.lat}-${idx}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                      onPress={() => selectSearchResult('dropoff', item)}
                    >
                      <Text numberOfLines={2}>{item.display_name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Job type selector */}
            <TouchableOpacity
              style={[styles.input, { justifyContent: 'center' }]}
              onPress={() => setJobTypeModalVisible(true)}
            >
              <Text style={{ color: selectedJobType ? '#111827' : '#9ca3af' }}>
                {selectedJobType ? selectedJobType.label : 'Select job type'}
              </Text>
            </TouchableOpacity>

            {/* Man service selector */}
            <TouchableOpacity
              style={[styles.input, { justifyContent: 'center', marginTop: 8 }]}
              onPress={() => setManModalVisible(true)}
            >
              <Text style={{ color: '#111827' }}>{selectedManService} person(s) service</Text>
            </TouchableOpacity>

            {/* Follow driver toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 6 }}>
              <Text style={{ flex: 1 }}>Follow driver (show driver on map)</Text>
              <Switch value={followDriver} onValueChange={setFollowDriver} />
            </View>

            {/* Notes */}
            <TextInput
              style={[styles.input, { height: 80, marginTop: 8 }]}
              placeholder="Notes (optional)"
              multiline
              value={localNotes}
              onChangeText={setLocalNotes}
            />

            {/* Approx distance hint */}
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: '#6b7280' }}>Approx. distance: {approxDistanceKm} km</Text>
            </View>

            {/* Quote and Book Buttons */}
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 12 }]}
              onPress={handleOpenQuote}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get Quote</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#e5e7eb', marginTop: 8 }]}
              onPress={() => setMapFormExpanded(false)}
            >
              <Text style={[styles.buttonText, { color: '#1f2937' }]}>Minimize</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setMapFormExpanded(true)}
          style={[styles.compactBar, { bottom: 100 }]}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontWeight: '700' }}>
                {pickupAddr ? pickupAddr : 'Select pickup'}
              </Text>
              <Text numberOfLines={1} style={{ color: '#6b7280' }}>
                {dropoffAddr ? `→ ${dropoffAddr}` : 'Select dropoff'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => {
                  setPickupAddr('');
                  setDropoffAddr('');
                  setDropoffCoord(null);
                }}
                style={{ padding: 8 }}
              >
                <Ionicons name="close-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMapFormExpanded(true)} style={{ padding: 8 }}>
                <Ionicons name="chevron-up-outline" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Quote confirmation modal */}
      <Modal
        visible={quoteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuoteModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '70%',
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
              Confirm Booking
            </Text>

            {quoteData ? (
              <>
                <Text style={{ color: '#6b7280', marginBottom: 6 }}>
                  Distance: {quoteData.distance_km ?? approxDistanceKm} km
                </Text>
                <Text style={{ color: '#6b7280', marginBottom: 6 }}>
                  ETA: {quoteData.duration_min ?? '--'} min
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 12 }}>
                  €{quoteData.final_price ?? quoteData.price ?? '--'}
                </Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleConfirmAndBook}
                  disabled={creatingBooking}
                >
                  {creatingBooking ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Confirm Booking</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#e5e7eb', marginTop: 8 }]}
                  onPress={() => setQuoteModalVisible(false)}
                >
                  <Text style={[styles.buttonText, { color: '#1f2937' }]}>Back</Text>
                </TouchableOpacity>
              </>
            ) : (
              <ActivityIndicator />
            )}
          </View>
        </View>
      </Modal>

      {/* Job type modal */}
      <Modal visible={jobTypeModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', maxHeight: '70%', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontWeight: '800' }}>Select job type</Text>
            </View>
            <FlatList
              data={JOB_TIERS}
              keyExtractor={(t) => t.id}
              renderItem={({ item: tier }) => (
                <View>
                  <View style={{ padding: 12, backgroundColor: '#f8fafc' }}>
                    <Text style={{ fontWeight: '700' }}>{tier.title}</Text>
                  </View>
                  <FlatList
                    data={tier.items}
                    keyExtractor={(i) => `${tier.id}_${i.id}`}
                    renderItem={renderJobItem}
                  />
                </View>
              )}
            />
            <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={() => setJobTypeModalVisible(false)}>
              <Text style={{ color: '#2563eb', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Man service modal */}
      <Modal visible={manModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontWeight: '800' }}>Select number of crew</Text>
            </View>
            <FlatList
              data={MAN_SERVICE_OPTIONS}
              keyExtractor={(i) => `${i.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}
                  onPress={() => {
                    setSelectedManService(item.id);
                    setManModalVisible(false);
                  }}
                >
                  <Text style={{ fontWeight: '700' }}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={() => setManModalVisible(false)}>
              <Text style={{ color: '#2563eb', fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}