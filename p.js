const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Safe React Native Patcher...\n');

function patchFile(filepath, rules) {
    if (!fs.existsSync(filepath)) {
        console.log(`❌ Skipping ${filepath} (Not found)`);
        return;
    }
    
    // Create backup
    fs.copyFileSync(filepath, `${filepath}.bak`);
    let code = fs.readFileSync(filepath, 'utf8');
    let patched = false;

    rules.forEach((rule, index) => {
        if (code.includes(rule.idempotency)) {
            console.log(`   ⏭️  Skipping rule ${index+1} for ${path.basename(filepath)} (Already applied)`);
            return;
        }
        const originalCode = code;
        code = code.replace(rule.find, rule.replace);
        if (originalCode !== code) {
            patched = true;
            console.log(`   ✅ Applied rule ${index+1} to ${path.basename(filepath)}`);
        } else {
            console.log(`   ⚠️  Rule ${index+1} failed to match in ${path.basename(filepath)}. Check formatting.`);
        }
    });

    if (patched) {
        fs.writeFileSync(filepath, code);
        console.log(`🟢 Saved ${filepath}\n`);
    }
}

// ==========================================
// 1. GENERATE BEAUTIFUL WELCOME SCREEN
// ==========================================
const welcomeScreenPath = 'src/screens/WelcomeScreen.tsx';
const welcomeScreenCode = `import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

export default function WelcomeScreen({ onSelectRole, selectedRole }: any) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F4F8F6', padding: 24, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: 60 }}>
        <Text style={{ fontSize: 32, fontWeight: '800', color: '#0F1A14' }}>Hence</Text>
        <Text style={{ fontSize: 16, color: '#7A9080', marginTop: 8 }}>Logistics & Deliveries</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F1A14', marginBottom: 24, textAlign: 'center' }}>How would you like to use Hence?</Text>
      
      <View style={styles.roleRow}>
        {/* CUSTOMER */}
        <TouchableOpacity
          style={[styles.roleBox, selectedRole === 'customer' && styles.roleBoxActive]}
          onPress={() => onSelectRole('customer')}
          activeOpacity={0.8}
        >
          <View style={styles.roleIco}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              <Path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#1A7A4A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx="12" cy="7" r="4" stroke="#1A7A4A" strokeWidth={2} />
            </Svg>
          </View>
          <Text style={styles.roleTextName}>I need a delivery</Text>
        </TouchableOpacity>

        {/* DRIVER */}
        <TouchableOpacity
          style={[styles.roleBox, selectedRole === 'driver' && styles.roleBoxActive]}
          onPress={() => onSelectRole('driver')}
          activeOpacity={0.8}
        >
          <View style={styles.roleIco}>
            <Svg width={27} height={25} viewBox="0 0 56 32">
              <Rect x="1" y="5" width="50" height="20" rx="3" fill="#B0C4B8"/>
              <Path d="M35 5h13a2 2 0 012 2v10H35V5z" fill="#7A9080"/>
              <Rect x="3" y="7" width="14" height="10" rx="1.5" fill="#D4E8DC"/>
              <Rect x="20" y="7" width="12" height="10" rx="1.5" fill="#D4E8DC"/>
              <Rect x="36" y="7" width="10" height="8" rx="1" fill="#D4E8DC" opacity="0.6"/>
              <Line x1="14" y1="6" x2="14" y2="24" stroke="white" strokeWidth="1" opacity="0.4"/>
              <Line x1="33" y1="6" x2="33" y2="24" stroke="white" strokeWidth="1" opacity="0.4"/>
              <Rect x="46" y="12" width="4" height="4" rx="1" fill="white" opacity="0.9"/>
              <Rect x="1" y="12" width="3" height="4" rx="0.8" fill="#E74C3C" opacity="0.8"/>
              <Rect x="3" y="24" width="48" height="3" rx="1" fill="#7A9080"/>
              <Circle cx="12" cy="27.5" r="4.5" fill="#3D5046"/>
              <Circle cx="12" cy="27.5" r="2" fill="#B0C4B8"/>
              <Circle cx="42" cy="27.5" r="4.5" fill="#3D5046"/>
              <Circle cx="42" cy="27.5" r="2" fill="#B0C4B8"/>
            </Svg>
          </View>
          <Text style={styles.roleTextName}>I am a driver</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  roleRow: { flexDirection: 'column', gap: 16 },
  roleBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#D4E2DA', elevation: 2 },
  roleBoxActive: { borderColor: '#1A7A4A', backgroundColor: '#E8F5EE' },
  roleIco: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F4F8F6', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  roleTextName: { fontSize: 18, fontWeight: '700', color: '#0F1A14' }
});`;

if (!fs.existsSync(welcomeScreenPath)) {
    // Ensure directory exists just in case
    if (!fs.existsSync('src/screens')) fs.mkdirSync('src/screens', { recursive: true });
    fs.writeFileSync(welcomeScreenPath, welcomeScreenCode);
    console.log(`✅ Generated ${welcomeScreenPath}\n`);
}

// ==========================================
// 2. PATCH APP PROVIDER (Auth Barrier)
// ==========================================
patchFile('src/context/AppProvider.tsx', [
    {
        idempotency: 'THE STRICT BARRIER',
        find: /(const serverRole = res\.data\.user\.role;\s*)/,
        replace: `$1\n        // 🔥 THE STRICT BARRIER: Prevent cross-login!
        const requestedRole = selectedRole === 'customer' ? 'individual' : 'driver';
        if (selectedRole && serverRole !== requestedRole) {
           throw new Error(\`Access Denied: You selected \${selectedRole}, but this account is registered as a \${serverRole}.\`);
        }\n`
    }
]);

// ==========================================
// 3. PATCH AUTH SCREEN (Labels & DOB)
// ==========================================
patchFile('src/screens/AuthScreen.tsx', [
    {
        idempotency: '>Plate Number<',
        find: /<Text style=\{styles\.label\}>Plate<\/Text>/g,
        replace: `<Text style={styles.label}>Plate Number</Text>`
    },
    {
        idempotency: 'Date of Birth',
        find: /(value=\{plateNum\} onChangeText=\{setPlateNum\}.*?\/>)/,
        replace: `$1\n\n        <Text style={styles.label}>Date of Birth</Text>\n        <TextInput style={styles.input} placeholder="DD/MM/YYYY" value={dob} onChangeText={setDob} keyboardType="numbers-and-punctuation" />`
    }
]);

// ==========================================
// 4. PATCH HOME SCREEN (Customer Dashboard)
// ==========================================
patchFile('src/screens/HomeScreen.tsx', [
    {
        idempotency: 'hiddenHistoryIds',
        find: /const \[step, setStep\] = useState<number>\(1\);/,
        replace: `const [step, setStep] = useState<number>(1);\n  const [hiddenHistoryIds, setHiddenHistoryIds] = useState<number[]>([]);`
    },
    {
        idempotency: '!hiddenHistoryIds.includes(ride.id)',
        find: /(ride\.status \|\| ''\)\.toLowerCase\(\) !== 'escalated')/g,
        replace: `$1 && !hiddenHistoryIds.includes(ride.id)`
    },
    {
        idempotency: 'Delete Order',
        find: /(<View key=\{ride\.id\} style=\{globalStyles\.rideCard\}>)/,
        replace: `<View key={ride.id} style={[globalStyles.rideCard, { position: 'relative' }]}>\n                <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, padding: 8, zIndex: 10 }} onPress={() => { Alert.alert("Delete Order", "Remove this order from your history?", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => setHiddenHistoryIds(prev => [...prev, ride.id]) }]); }}><Ionicons name="trash-outline" size={20} color={COLORS.danger} /></TouchableOpacity>`
    },
    {
        idempotency: 'isHeadingToPickup',
        find: /const getLiveETA = \(\) => \{[\s\S]*?return timeMins < 1 \? 'Less than a minute' : `\$\{timeMins\} mins`;\s*\};/,
        replace: `const getLiveETA = () => {\n    if (!driverLocation || !activeBooking) return '...';\n    const status = String(activeBooking.status || '').toLowerCase();\n    const isHeadingToPickup = ['pending', 'assigned', 'accepted'].includes(status);\n    const targetLat = isHeadingToPickup ? activeBooking.pickup_lat : activeBooking.dropoff_lat;\n    const targetLon = isHeadingToPickup ? activeBooking.pickup_lon : activeBooking.dropoff_lon;\n    if (!targetLat || !targetLon) return '...';\n    const R = 6371;\n    const dLat = (targetLat - driverLocation.lat) * (Math.PI / 180);\n    const dLon = (targetLon - driverLocation.lon) * (Math.PI / 180);\n    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(driverLocation.lat * (Math.PI / 180)) * Math.cos(targetLat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);\n    const distanceKm = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));\n    const timeMins = Math.round((distanceKm / 35) * 60);\n    return timeMins < 1 ? 'Less than a minute' : \`\$\{timeMins\} min\`;\n  };`
    },
    {
        idempotency: 'arrived_pickup',
        find: /\{?\['pending', 'awaiting_payment'\]\.includes\(activeBooking\?\.status\?\.toLowerCase\(\)\) \? 'Looking for a driver\.\.\.' : 'Driver on the way'\}?/,
        replace: `{(() => { const s = String(activeBooking?.status || '').toLowerCase(); if (['pending', 'awaiting_payment'].includes(s)) return 'Looking for a driver...'; if (s === 'accepted') return 'Driver heading to pickup'; if (s === 'arrived_pickup') return 'Driver arrived at pickup'; if (s === 'in_transit') return 'Driver en route to delivery'; if (s === 'arrived_dropoff') return 'Driver arrived at delivery'; return 'Driver is nearby'; })()}`
    },
    {
        idempotency: 'Waiting outside',
        find: /Arriving in \{getLiveETA\(\) \|\| '\.\.\.'\}/,
        replace: `{['arrived_pickup', 'arrived_dropoff'].includes(String(activeBooking?.status).toLowerCase()) ? 'Waiting outside' : \`Arriving in \$\{getLiveETA()\}\`}`
    },
    {
        idempotency: 'setActiveBooking(null)',
        find: /(setRatingBookingContext\(null\);\n\s*\}\})/g,
        replace: `setRatingBookingContext(null);\n          setActiveBooking(null);\n        }}`
    }
]);

// ==========================================
// 5. PATCH DRIVER DASHBOARD
// ==========================================
patchFile('src/screens/DriverDashboard.tsx', [
    {
        idempotency: 'dirflg=d',
        find: /http:\/\/googleusercontent\.com\/maps\.google\.com\/0\{lat\},\{lon\}&travelmode=driving/g,
        replace: `https://www.google.com/maps/dir/?api=1&destination=\${lat},\${lon}&travelmode=driving`
    },
    {
        idempotency: 'updateJobStatus',
        find: /(const renderActiveJob = \(\) => \{)/,
        replace: `$1\n    const updateJobStatus = async (newStatus: string) => {\n      try {\n        await axios.patch(\`\$\{BASE_URL\}/driver/jobs/\$\{activeJob.id\}/status\`, { status: newStatus }, { headers: { Authorization: \`Bearer \$\{token\}\` } });\n        await refreshDriverJobs();\n      } catch (e) { Alert.alert('Error', 'Could not update status'); }\n    };\n`
    },
    {
        idempotency: 'Scan QR Button',
        find: /(<View style=\{styles\.actGrid\}>[\s\S]*?)<TouchableOpacity style=\{styles\.btnGreen\} onPress=\{startPickupProcess\}>/g,
        replace: `<View style={styles.actGrid}>\n            <TouchableOpacity style={styles.actionBox} onPress={() => handleUploadProof(activeJob.id)}>\n              <DriverIcon name="ic-cam" size={18} color={COLORS.success} />\n              <Text style={styles.actionText}>Photo Proof</Text>\n            </TouchableOpacity>\n            <TouchableOpacity style={styles.actionBox} onPress={() => {\n              const hasPickedUp = ['in_transit', 'picked_up'].includes(activeJobStatus);\n              if (!hasPickedUp) openSmartNav(Number(activeJob.pickup_lat), Number(activeJob.pickup_lon));\n              else if (nextStop) openSmartNav(Number(nextStop.lat), Number(nextStop.lon));\n              else openSmartNav(Number(activeJob.dropoff_lat), Number(activeJob.dropoff_lon));\n            }}>\n              <DriverIcon name="ic-map" size={18} color={COLORS.mid} />\n              <Text style={styles.actionText}>Smart Nav</Text>\n            </TouchableOpacity>\n            <TouchableOpacity style={styles.actionBox} onPress={startPickupProcess}>\n              <View style={{ backgroundColor: COLORS.ink, padding: 6, borderRadius: 8, marginBottom: 4 }}><Ionicons name="qr-code" size={14} color="#fff" /></View>\n              <Text style={[styles.actionText, { color: COLORS.ink }]}>Scan QR</Text>\n            </TouchableOpacity>\n          </View>\n\n          {activeJobStatus === 'accepted' && (\n            <TouchableOpacity style={[styles.btnGreen, { backgroundColor: COLORS.ink }]} onPress={() => updateJobStatus('arrived_pickup')}>\n              <Text style={styles.btnText}>I've Arrived at Pickup</Text>\n            </TouchableOpacity>\n          )}`
    },
    {
        idempotency: 'Confirm Collection & Start Route',
        find: /\{inTransit && nextStop && \(/,
        replace: `{activeJobStatus === 'arrived_pickup' && (\n            <TouchableOpacity style={styles.btnGreen} onPress={() => updateJobStatus('in_transit')}>\n              <Text style={styles.btnText}>Confirm Collection & Start Route</Text>\n            </TouchableOpacity>\n          )}\n\n          {activeJobStatus === 'in_transit' && !nextStop && (\n            <TouchableOpacity style={[styles.btnGreen, { backgroundColor: COLORS.ink }]} onPress={() => updateJobStatus('arrived_dropoff')}>\n              <Text style={styles.btnText}>I've Arrived at Drop-off</Text>\n            </TouchableOpacity>\n          )}\n\n          {activeJobStatus === 'in_transit' && nextStop && (`
    },
    {
        idempotency: 'activeJobStatus === \'arrived_dropoff\'',
        find: /\{canFinishJob && \(/,
        replace: `{activeJobStatus === 'arrived_dropoff' && (`
    },
    {
        idempotency: 'arrived_dropoff',
        find: /\['in_transit', 'delivered', 'completed', 'paid'\]\.includes\(activeJobStatus\)/g,
        replace: `['in_transit', 'arrived_dropoff', 'delivered', 'completed', 'paid'].includes(activeJobStatus)`
    },
    {
        idempotency: 'cumulativeTotal',
        find: /(const renderHistory = \(\) => \{)/,
        replace: `$1\n    const cumulativeTotal = filteredHistory.reduce((sum: number, r: any) => { const status = String(r.status || '').toLowerCase(); if (['completed', 'paid', 'delivered'].includes(status)) return sum + Number(r.driver_payout || r.final_price || 0); return sum; }, 0);`
    }
]);

console.log('🎉 Execution complete! Check your simulator.');
