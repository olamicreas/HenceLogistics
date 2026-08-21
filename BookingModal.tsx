// BookingModal.tsx
import React, { useState } from 'react';
import { 
  Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, 
  Dimensions, Image, Platform, Alert, KeyboardAvoidingView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppContext } from '../context/AppProvider';
import { styles as globalStyles } from '../styles';

const JOB_TYPES = [
  { id: 'furniture', label: 'Furniture' },
  { id: 'fragile', label: 'Fragile / Glass' },
  { id: 'construction', label: 'Construction' },
  { id: 'food_cold', label: 'Refrigerated' },
  { id: 'tow_vehicle', label: 'Vehicle Towing' },
];

export default function BookingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { 
    pickupAddr, setPickupAddr, stops, addStop, removeStop, updateStop,
    bookingMode, isScheduled, setIsScheduled, scheduleTime, setScheduleTime,
    packagePhotos, setPackagePhotos, openQuoteFlow, setJobType,
    setActiveSearchIndex, scheduleSearch, pickupSuggestions, dropoffSuggestions, selectSearchResult
  } = useAppContext();

  const [localJobSearch, setLocalJobSearch] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const filteredJobs = JOB_TYPES.filter(j => j.label.toLowerCase().includes(localJobSearch.toLowerCase()));

  const handlePhotoPick = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission', 'Camera needed');
    const res = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!res.canceled && res.assets[0]) setPackagePhotos([...packagePhotos, res.assets[0].uri]);
  };

  const handleDateChange = (e: any, d?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (d) { setScheduleTime(d); setIsScheduled(true); }
  };

  const renderSuggestions = (idx: number) => {
    const list = idx === -1 ? pickupSuggestions : dropoffSuggestions;
    if (list.length === 0) return null;
    return (
        <View style={localStyles.suggestionBox}>
            {list.map((item: any, i: number) => (
                <TouchableOpacity key={i} style={localStyles.suggestionItem} onPress={() => selectSearchResult(idx, item)}>
                    <Ionicons name="location-outline" size={18} color="#4B5563" />
                    <Text style={{ marginLeft: 8 }}>{item.display_name}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <View style={localStyles.container}>
        <View style={localStyles.header}>
          <TouchableOpacity onPress={onClose} style={localStyles.closeBtn}><Ionicons name="close" size={24} /></TouchableOpacity>
          <View style={localStyles.scheduleToggle}>
            <TouchableOpacity style={[localStyles.schBtn, !isScheduled && localStyles.schBtnActive]} onPress={() => setIsScheduled(false)}>
              <Text style={[localStyles.schText, !isScheduled && localStyles.schTextActive]}>Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[localStyles.schBtn, isScheduled && localStyles.schBtnActive]} onPress={() => setShowDatePicker(true)}>
              <Text style={[localStyles.schText, isScheduled && localStyles.schTextActive]}>
                {isScheduled && scheduleTime ? scheduleTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : 'Schedule'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && <DateTimePicker value={scheduleTime || new Date()} mode="datetime" display="default" onChange={handleDateChange} />}

        <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}>
          <View style={globalStyles.card}>
            <View style={localStyles.inputRow}>
              <View style={localStyles.dotGreen} />
              <TextInput style={globalStyles.input} placeholder="Pickup Location" value={pickupAddr} onChangeText={(t) => { setPickupAddr(t); scheduleSearch(t, -1); }} onFocus={() => setActiveSearchIndex(-1)} />
              <Ionicons name="map" size={20} color="#6b7280" />
            </View>
            {renderSuggestions(-1)}
            <View style={localStyles.connector} />
            {stops.map((stop, idx) => (
              <View key={stop.id}>
                <View style={localStyles.inputRow}>
                  <View style={localStyles.dotRed} />
                  <TextInput style={globalStyles.input} placeholder={`Drop-off ${bookingMode === 'multi' ? idx+1 : ''}`} value={stop.address} onChangeText={(t) => { updateStop(idx, 'address', t); scheduleSearch(t, idx); }} onFocus={() => setActiveSearchIndex(idx)} />
                  {bookingMode === 'multi' && idx > 0 && <TouchableOpacity onPress={() => removeStop(idx)}><Ionicons name="close-circle" size={20} color="#9ca3af" /></TouchableOpacity>}
                </View>
                {idx < stops.length - 1 && <View style={localStyles.connector} />}
                {renderSuggestions(idx)}
              </View>
            ))}
            {bookingMode === 'multi' && (
              <TouchableOpacity style={localStyles.addStopBtn} onPress={addStop}>
                <Ionicons name="add" size={20} color="#2563eb" />
                <Text style={localStyles.addStopText}>Add stop</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={globalStyles.sectionTitle}>What are you moving?</Text>
          <View style={globalStyles.card}>
            <View style={localStyles.searchBox}>
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput placeholder="Search job type..." style={localStyles.searchInput} value={localJobSearch} onChangeText={setLocalJobSearch} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {filteredJobs.map((job) => (
                <TouchableOpacity key={job.id} style={localStyles.jobChip} onPress={() => { setJobType(job.id); setLocalJobSearch(job.label); }}>
                  <Text style={localStyles.jobChipText}>{job.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={globalStyles.sectionTitle}>Photos (Required)</Text>
          <View style={globalStyles.card}>
            <ScrollView horizontal>
              {packagePhotos.map((uri, i) => <Image key={i} source={{ uri }} style={localStyles.thumb} />)}
              <TouchableOpacity style={localStyles.uploadBtn} onPress={handlePhotoPick}>
                <Ionicons name="camera" size={24} color="#6b7280" />
                <Text style={localStyles.uploadText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </ScrollView>

        <View style={localStyles.footer}>
          <TouchableOpacity style={globalStyles.primaryButton} onPress={() => { onClose(); openQuoteFlow(); }}>
            <Text style={globalStyles.buttonText}>Confirm Booking</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: Platform.OS === 'ios' ? 40 : 10 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, justifyContent: 'space-between' },
  closeBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 20 },
  scheduleToggle: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 20, padding: 3 },
  schBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 18 },
  schBtnActive: { backgroundColor: '#fff', elevation: 1 },
  schText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  schTextActive: { color: '#111827' },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginRight: 12 },
  dotRed: { width: 10, height: 10, backgroundColor: '#EF4444', marginRight: 12 },
  connector: { width: 2, height: 20, backgroundColor: '#E5E7EB', marginLeft: 4, marginVertical: -4 },
  addStopBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingLeft: 4 },
  addStopText: { color: '#2563eb', fontWeight: '600', marginLeft: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8 },
  searchInput: { marginLeft: 8, flex: 1 },
  jobChip: { backgroundColor: '#EFF6FF', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  jobChipText: { color: '#1E40AF', fontWeight: '600', fontSize: 13 },
  thumb: { width: 70, height: 70, borderRadius: 8, marginRight: 10 },
  uploadBtn: { width: 70, height: 70, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  uploadText: { fontSize: 10, color: '#6B7280', marginTop: 4 },
  suggestionBox: { maxHeight: 150, backgroundColor: '#f9fafb', borderRadius: 8, marginTop: 4 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  footer: { position: 'absolute', bottom: 0, width: '100%', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
});