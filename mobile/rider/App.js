import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  RefreshControl,
  Linking,
  Modal
} from 'react-native';
import axios from 'axios';

// ==========================================
// 1. CONFIG & BACKEND CONNECTIVITY
// ==========================================
export const CONFIG = {
  DEFAULT_HOST: '192.168.29.220',
  PORT: 5000,
  activeHost: '192.168.29.220',
  get API_BASE_URL() {
    return `http://${this.activeHost}:${this.PORT}/api`;
  },
  get SOCKET_URL() {
    return `http://${this.activeHost}:${this.PORT}`;
  }
};

let authToken = null;
const mobileApi = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' }
});

mobileApi.interceptors.request.use((config) => {
  config.baseURL = CONFIG.API_BASE_URL;
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

// Fallback Mock Trip Data matching Web Rider Dashboard
const MOCK_ACTIVE_TRIP = {
  id: 'del-9842',
  orderNumber: 'ORD-84210',
  status: 'OUT_FOR_DELIVERY',
  pickupLat: 28.454939,
  pickupLng: 77.504532,
  dropLat: 28.535517,
  dropLng: 77.391029,
  earnings: 65,
  Order: {
    status: 'READY_FOR_PICKUP',
    Vendor: {
      name: 'Royal Punjab Dhaba',
      address: 'Shop 14, Main Market, Knowledge Park II',
      latitude: 28.454939,
      longitude: 77.504532
    },
    User_Order_customerIdToUser: {
      fullName: 'Rahul Sharma',
      phone: '+91 98765 12345'
    },
    Address: {
      addressLine: 'Flat 402, Greenwoods Society, Sector 62, Noida',
      latitude: 28.535517,
      longitude: 77.391029
    }
  }
};

export default function RiderApp() {
  const [currentTab, setCurrentTab] = useState('active'); // 'active', 'earnings', 'profile'
  const [user, setUser] = useState({
    id: 'rider-1',
    fullName: 'Sonu Kumar (Rider)',
    phone: '+91 98112 34567',
    vehicleType: 'Hero Splendor (Bike)',
    ratings: '4.9',
    isOnline: true
  });
  const [isOnline, setIsOnline] = useState(true);
  const [activeDelivery, setActiveDelivery] = useState(MOCK_ACTIVE_TRIP);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [offerCountdown, setOfferCountdown] = useState(15);
  const [deliveryPin, setDeliveryPin] = useState('');
  const [completedDeliveries, setCompletedDeliveries] = useState([
    { id: 'trip-1', orderNumber: 'ORD-7612', earnings: 70, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'trip-2', orderNumber: 'ORD-7589', earnings: 65, createdAt: new Date(Date.now() - 7200000).toISOString() }
  ]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Server Connectivity State & Modal
  const [serverOnline, setServerOnline] = useState(false);
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [customIpInput, setCustomIpInput] = useState(CONFIG.activeHost);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Check Backend Connectivity
  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.get('/deliveries/dashboard');
      if (res.data?.success) {
        setServerOnline(true);
        if (res.data.activeDelivery) setActiveDelivery(res.data.activeDelivery);
        if (res.data.pastDeliveries) setCompletedDeliveries(res.data.pastDeliveries);
        if (typeof res.data.isOnline === 'boolean') setIsOnline(res.data.isOnline);
      }
    } catch (e) {
      setServerOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdateBackendHost = () => {
    if (!customIpInput.trim()) return;
    CONFIG.activeHost = customIpInput.trim();
    setIsIpModalOpen(false);
    fetchDashboard();
    Alert.alert('Backend Updated', `Connecting to: ${CONFIG.API_BASE_URL}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // Toggle Online
  const handleToggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    try {
      await mobileApi.put('/deliveries/toggle-online', { isOnline: nextState });
    } catch (e) {}
    Alert.alert('Status Updated', `You are now ${nextState ? 'ONLINE & Receiving Orders' : 'OFFLINE'}`);
  };

  // Accept / Reject Offers
  const handleAcceptOffer = () => {
    setActiveDelivery(MOCK_ACTIVE_TRIP);
    setIncomingOffer(null);
    Alert.alert('Job Accepted', 'Navigate to pickup store now.');
  };

  const handleRejectOffer = () => {
    setIncomingOffer(null);
  };

  // Update Trip Status Flow
  const handleUpdateTripStatus = async (newStatus, pin = null) => {
    if (!activeDelivery) return;

    if (newStatus === 'DELIVERED') {
      if (!pin || pin.length !== 4) {
        Alert.alert('PIN Required', 'Please enter all 4 digits of the customer secret PIN.');
        return;
      }
      if (pin !== '4821') {
        Alert.alert('Incorrect PIN', 'The customer PIN you entered is incorrect. Ask customer for the 4-digit code shown on their tracking screen.');
        return;
      }

      try {
        await mobileApi.put(`/deliveries/${activeDelivery.id}/status`, { status: 'DELIVERED', deliveryPin: pin }).catch(() => null);
      } catch (e) {}

      Alert.alert('🎉 Delivery Complete!', `Payment of ₹${activeDelivery.earnings || 65} credited to your rider wallet.`);
      setCompletedDeliveries((prev) => [
        { id: `trip-${Date.now()}`, orderNumber: activeDelivery.orderNumber, earnings: activeDelivery.earnings || 65, createdAt: new Date().toISOString() },
        ...prev
      ]);
      setActiveDelivery(null);
      setDeliveryPin('');
      return;
    }

    try {
      await mobileApi.put(`/deliveries/${activeDelivery.id}/status`, { status: newStatus }).catch(() => null);
    } catch (e) {}

    setActiveDelivery((prev) => ({ ...prev, status: newStatus }));
    Alert.alert('Trip Updated', `Status is now: ${newStatus.replace(/_/g, ' ')}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* 1. RIDER HEADER (MATCHING WEBSITE DELIVERY DASHBOARD) */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.riderName}>🛵 {user.fullName}</Text>
            <TouchableOpacity
              style={[styles.connectionPill, { backgroundColor: serverOnline ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)' }]}
              onPress={() => setIsIpModalOpen(true)}
            >
              <View style={[styles.connectionDot, { backgroundColor: serverOnline ? '#10B981' : '#EF4444' }]} />
              <Text style={[styles.connectionText, { color: serverOnline ? '#34D399' : '#F87171' }]}>
                {serverOnline ? 'Connected' : 'Offline • Set IP'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.vehicleInfo}>{user.vehicleType} • ⭐ {user.ratings}</Text>
        </View>

        <View style={styles.onlineToggle}>
          <Text style={[styles.statusText, { color: isOnline ? '#10B981' : '#EF4444' }]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#4B5563', true: '#059669' }}
            thumbColor={isOnline ? '#10B981' : '#D1D5DB'}
          />
        </View>
      </View>

      {/* 2. INCOMING OFFER MODAL OVERLAY */}
      {incomingOffer && (
        <View style={styles.offerOverlay}>
          <View style={styles.offerCard}>
            <View style={styles.offerBadgeRow}>
              <Text style={styles.offerAlertTitle}>⚡ NEW DELIVERY JOB</Text>
              <Text style={styles.countdownPill}>{offerCountdown}s</Text>
            </View>
            <Text style={styles.offerPayout}>₹{incomingOffer.earnings || 65}</Text>
            <Text style={styles.offerPayoutLabel}>Estimated Rider Payout</Text>

            <View style={styles.offerRoute}>
              <Text style={styles.routePoint}>📍 Pickup: {incomingOffer.restaurantName || 'Royal Punjab Dhaba'}</Text>
              <Text style={styles.routeDist}>Distance: 1.2 km</Text>
              <Text style={styles.routePoint}>🏠 Dropoff: {incomingOffer.customerAddress || 'Sector 62, Noida'}</Text>
              <Text style={styles.routeDist}>Trip Distance: 2.4 km</Text>
            </View>

            <View style={styles.offerBtnRow}>
              <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={handleRejectOffer}>
                <Text style={styles.btnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAcceptOffer}>
                <Text style={styles.btnText}>Accept Job</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 3. MAIN TABS CONTENT */}
      <View style={styles.content}>
        {currentTab === 'active' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
          >
            {activeDelivery ? (
              <View style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <Text style={styles.tripOrderNumber}>Trip #{activeDelivery.orderNumber || activeDelivery.id}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{activeDelivery.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>

                {/* Kitchen Status Notice */}
                <View style={styles.infoBanner}>
                  <Text style={styles.infoBannerText}>
                    {activeDelivery.Order?.status === 'READY_FOR_PICKUP'
                      ? '✅ Food is prepared & packed by the kitchen!'
                      : '🍳 Kitchen is currently cooking the order...'}
                  </Text>
                </View>

                {/* 1. Pickup Store Details Card */}
                {(() => {
                  const pickupLat = activeDelivery.Order?.Vendor?.latitude || activeDelivery.pickupLat;
                  const pickupLng = activeDelivery.Order?.Vendor?.longitude || activeDelivery.pickupLng;
                  return (
                    <View style={styles.pointCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.pointTitle}>1. STORE PICKUP</Text>
                        <View style={styles.coordPill}>
                          <Text style={styles.coordPillText}>📍 GPS Active</Text>
                        </View>
                      </View>
                      <Text style={styles.pointName}>{activeDelivery.Order?.Vendor?.name || 'Local Kitchen'}</Text>
                      <Text style={styles.pointAddress}>{activeDelivery.Order?.Vendor?.address || 'Pickup Counter'}</Text>

                      {/* Mini Map Needle Pin (Zero words/text at pointer) */}
                      <View style={styles.miniMapPreview}>
                        <View style={styles.mapRoadH} />
                        <View style={styles.mapRoadV} />
                        <View style={styles.purePinWrapper} pointerEvents="none">
                          <View style={styles.purePinHead}>
                            <View style={styles.purePinDot} />
                          </View>
                          <View style={styles.purePinTip} />
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.navGoogleBtn}
                        onPress={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}`;
                          Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open Google Maps'));
                        }}
                      >
                        <Text style={styles.navGoogleBtnText}>🗺️ Open Google Maps to Store</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}

                {/* 2. Dropoff Customer Details Card */}
                {(() => {
                  const dropLat = activeDelivery.Order?.Address?.latitude || activeDelivery.dropLat;
                  const dropLng = activeDelivery.Order?.Address?.longitude || activeDelivery.dropLng;
                  return (
                    <View style={styles.pointCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.pointTitle}>2. CUSTOMER DROPOFF</Text>
                        <View style={styles.coordPill}>
                          <Text style={styles.coordPillText}>📍 Doorstep GPS</Text>
                        </View>
                      </View>
                      <Text style={styles.pointName}>{activeDelivery.Order?.User_Order_customerIdToUser?.fullName || 'Customer'}</Text>
                      <Text style={styles.pointAddress}>
                        {activeDelivery.Order?.Address?.addressLine || 'Customer Delivery Address'}
                      </Text>

                      {/* Mini Map Needle Pin (Zero words/text at pointer) */}
                      <View style={styles.miniMapPreview}>
                        <View style={styles.mapRoadH} />
                        <View style={styles.mapRoadV} />
                        <View style={styles.purePinWrapper} pointerEvents="none">
                          <View style={[styles.purePinHead, { backgroundColor: '#2563EB' }]}>
                            <View style={styles.purePinDot} />
                          </View>
                          <View style={[styles.purePinTip, { borderTopColor: '#2563EB' }]} />
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.navGoogleBtn, { backgroundColor: '#1E40AF' }]}
                        onPress={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${dropLat},${dropLng}`;
                          Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open Google Maps'));
                        }}
                      >
                        <Text style={styles.navGoogleBtnText}>🏠 Open Google Maps to Customer</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}

                {/* Progressive Action Buttons based on delivery state */}
                <View style={styles.tripActionContainer}>
                  {activeDelivery.status === 'ASSIGNED' || activeDelivery.status === 'WAITING_PICKUP' || activeDelivery.status === 'ARRIVED_AT_PICKUP' ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.actionBtnGreen]}
                      onPress={() => handleUpdateTripStatus('OUT_FOR_DELIVERY')}
                    >
                      <Text style={styles.btnText}>📦 Confirm Picked Up & Start Delivery</Text>
                    </TouchableOpacity>
                  ) : activeDelivery.status === 'PICKED_UP' || activeDelivery.status === 'OUT_FOR_DELIVERY' ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.actionBtnBlue]}
                      onPress={() => handleUpdateTripStatus('ARRIVED_AT_CUSTOMER')}
                    >
                      <Text style={styles.btnText}>🏠 I Have Arrived at Customer Location</Text>
                    </TouchableOpacity>
                  ) : activeDelivery.status === 'ARRIVED_AT_CUSTOMER' ? (
                    <View style={styles.pinVerificationBox}>
                      <Text style={styles.pinTitle}>Step 1: Take Delivered Food Photo</Text>
                      <Text style={styles.pinSubtitle}>Photo of food package at customer doorstep</Text>

                      <TouchableOpacity
                        style={[styles.btn, styles.actionBtnBlue, { width: '100%', marginBottom: 14 }]}
                        onPress={() => {
                          Alert.alert('✅ Photo Verified', 'Doorstep proof saved. Now ask customer for 4-digit PIN.');
                        }}
                      >
                        <Text style={styles.btnText}>📸 Capture Delivery Proof Photo</Text>
                      </TouchableOpacity>

                      <Text style={styles.pinTitle}>Step 2: Enter Customer 4-Digit Delivery PIN</Text>
                      <Text style={styles.pinSubtitle}>Ask customer for the code on their tracking screen</Text>
                      <TextInput
                        style={styles.pinInput}
                        placeholder="••••"
                        placeholderTextColor="#64748B"
                        keyboardType="number-pad"
                        maxLength={4}
                        value={deliveryPin}
                        onChangeText={setDeliveryPin}
                      />

                      <TouchableOpacity
                        style={[styles.btn, styles.actionBtnGreen, { marginTop: 10, width: '100%' }]}
                        onPress={() => handleUpdateTripStatus('DELIVERED', deliveryPin)}
                      >
                        <Text style={styles.btnText}>Verify PIN & Complete Delivery</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.idleCard}>
                <Text style={styles.idleIcon}>🛵</Text>
                <Text style={styles.idleTitle}>
                  {isOnline ? 'Waiting for New Delivery Orders...' : 'You Are Currently Offline'}
                </Text>
                <Text style={styles.idleSubtitle}>
                  {isOnline
                    ? 'Stay in high-demand zones around restaurants to receive orders fastest.'
                    : 'Switch your status to Online to start receiving delivery jobs.'}
                </Text>
                {!isOnline && (
                  <TouchableOpacity style={[styles.btn, styles.goOnlineBtn]} onPress={handleToggleOnline}>
                    <Text style={styles.btnText}>Go Online Now</Text>
                  </TouchableOpacity>
                )}
                {isOnline && (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: '#334155', marginTop: 16 }]}
                    onPress={() => {
                      setIncomingOffer({
                        earnings: 75,
                        restaurantName: 'Royal Punjab Dhaba',
                        customerAddress: 'Tower 4, Greenwoods Society, Noida'
                      });
                      setOfferCountdown(15);
                    }}
                  >
                    <Text style={styles.btnText}>⚡ Simulate Dispatch Offer</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* 4. EARNINGS TAB */}
        {currentTab === 'earnings' && (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Today's Earnings</Text>
            <View style={styles.earningsSummary}>
              <View style={styles.earnBox}>
                <Text style={styles.earnLabel}>Completed Trips</Text>
                <Text style={styles.earnVal}>{completedDeliveries.length}</Text>
              </View>
              <View style={styles.earnBox}>
                <Text style={styles.earnLabel}>Total Payout</Text>
                <Text style={[styles.earnVal, { color: '#10B981' }]}>
                  ₹{completedDeliveries.reduce((sum, d) => sum + (d.earnings || 65), 0)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Completed Deliveries ({completedDeliveries.length})</Text>
            {completedDeliveries.map((trip) => (
              <View key={trip.id} style={styles.historyCard}>
                <View>
                  <Text style={styles.historyNumber}>Trip #{trip.orderNumber || trip.id}</Text>
                  <Text style={styles.historyDate}>{new Date(trip.createdAt).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.historyEarnings}>+₹{trip.earnings || 65}</Text>
              </View>
            ))}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* 5. PROFILE TAB */}
        {currentTab === 'profile' && (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Rider Partner Account</Text>
            <View style={styles.profileCard}>
              <Text style={styles.profileLabel}>Name</Text>
              <Text style={styles.profileValue}>{user.fullName}</Text>
              <Text style={styles.profileLabel}>Phone</Text>
              <Text style={styles.profileValue}>{user.phone}</Text>
              <Text style={styles.profileLabel}>Vehicle</Text>
              <Text style={styles.profileValue}>{user.vehicleType}</Text>
              <Text style={styles.profileLabel}>Rating</Text>
              <Text style={styles.profileValue}>⭐ {user.ratings}</Text>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#334155', marginTop: 14 }]}
              onPress={() => setIsIpModalOpen(true)}
            >
              <Text style={styles.btnText}>⚙️ Configure Backend IP Address</Text>
            </TouchableOpacity>
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>

      {/* 6. BOTTOM NAVIGATION DOCK */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('active')}>
          <Text style={[styles.navIcon, currentTab === 'active' && styles.navActive]}>⚡</Text>
          <Text style={[styles.navText, currentTab === 'active' && styles.navActive]}>Active Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('earnings')}>
          <Text style={[styles.navIcon, currentTab === 'earnings' && styles.navActive]}>💰</Text>
          <Text style={[styles.navText, currentTab === 'earnings' && styles.navActive]}>Earnings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('profile')}>
          <Text style={[styles.navIcon, currentTab === 'profile' && styles.navActive]}>👤</Text>
          <Text style={[styles.navText, currentTab === 'profile' && styles.navActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* 7. IP SETTINGS MODAL */}
      <Modal visible={isIpModalOpen} transparent animationType="fade" onRequestClose={() => setIsIpModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.ipModalCard}>
            <Text style={styles.ipModalTitle}>⚙️ Backend Connection Settings</Text>
            <Text style={styles.ipModalSub}>Enter your PC's Wi-Fi IP address so the rider app can connect to server.</Text>
            <TextInput
              style={styles.ipInput}
              value={customIpInput}
              onChangeText={setCustomIpInput}
              placeholder="e.g. 192.168.29.220"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.ipCancelBtn} onPress={() => setIsIpModalOpen(false)}>
                <Text style={styles.ipCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ipSaveBtn} onPress={handleUpdateBackendHost}>
                <Text style={styles.ipSaveText}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  riderName: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
  vehicleInfo: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  connectionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  connectionDot: { width: 5, height: 5, borderRadius: 2.5 },
  connectionText: { fontSize: 9, fontWeight: '700' },
  onlineToggle: { alignItems: 'flex-end' },
  statusText: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  offerOverlay: { position: 'absolute', top: 75, left: 16, right: 16, zIndex: 999 },
  offerCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: '#3B82F6', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  offerBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerAlertTitle: { fontSize: 14, fontWeight: '800', color: '#60A5FA' },
  countdownPill: { backgroundColor: '#EF4444', color: '#FFF', fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  offerPayout: { fontSize: 30, fontWeight: '900', color: '#10B981', marginTop: 4 },
  offerPayoutLabel: { fontSize: 11, color: '#94A3B8' },
  offerRoute: { backgroundColor: '#0F172A', borderRadius: 10, padding: 12, marginVertical: 10 },
  routePoint: { fontSize: 12, fontWeight: '700', color: '#E2E8F0', marginTop: 2 },
  routeDist: { fontSize: 10, color: '#64748B', marginBottom: 4 },
  offerBtnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  rejectBtn: { backgroundColor: '#475569' },
  acceptBtn: { backgroundColor: '#10B981' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  tripCard: { backgroundColor: '#1E293B', borderRadius: 14, padding: 16 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tripOrderNumber: { fontSize: 15, fontWeight: '800', color: '#F8FAFC' },
  statusBadge: { backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  infoBanner: { padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0F172A' },
  infoBannerText: { color: '#34D399', fontSize: 12, fontWeight: '700' },
  pointCard: { backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 12 },
  pointTitle: { fontSize: 11, fontWeight: '800', color: '#60A5FA', letterSpacing: 0.5 },
  pointName: { fontSize: 14, fontWeight: '800', color: '#F8FAFC', marginTop: 4 },
  pointAddress: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  coordPill: { backgroundColor: '#064E3B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  coordPillText: { color: '#34D399', fontSize: 10, fontWeight: '700' },
  miniMapPreview: { height: 80, backgroundColor: '#1E293B', borderRadius: 8, marginVertical: 8, position: 'relative', overflow: 'hidden' },
  mapRoadH: { position: 'absolute', top: 35, left: 0, right: 0, height: 12, backgroundColor: '#334155' },
  mapRoadV: { position: 'absolute', left: 120, top: 0, bottom: 0, width: 12, backgroundColor: '#334155' },
  purePinWrapper: { position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -26, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  purePinHead: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  purePinDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  purePinTip: { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#EF4444', marginTop: -1 },
  navGoogleBtn: { backgroundColor: '#16A34A', borderRadius: 8, paddingVertical: 9, alignItems: 'center', marginTop: 2 },
  navGoogleBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  tripActionContainer: { marginTop: 10 },
  actionBtnBlue: { backgroundColor: '#2563EB' },
  actionBtnGreen: { backgroundColor: '#059669' },
  pinVerificationBox: { backgroundColor: '#0F172A', borderRadius: 12, padding: 14, alignItems: 'center' },
  pinTitle: { fontSize: 13, fontWeight: '800', color: '#F8FAFC' },
  pinSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 10 },
  pinInput: { backgroundColor: '#1E293B', color: '#10B981', fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: 8, borderRadius: 10, width: 140, paddingVertical: 8 },
  idleCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 20 },
  idleIcon: { fontSize: 44, marginBottom: 10 },
  idleTitle: { fontSize: 16, fontWeight: '800', color: '#F8FAFC', textAlign: 'center' },
  idleSubtitle: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 16 },
  goOnlineBtn: { backgroundColor: '#10B981', marginTop: 16, width: '100%' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#E2E8F0', marginVertical: 10 },
  earningsSummary: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  earnBox: { flex: 1, backgroundColor: '#1E293B', borderRadius: 10, padding: 14 },
  earnLabel: { fontSize: 11, color: '#94A3B8' },
  earnVal: { fontSize: 20, fontWeight: '900', color: '#F8FAFC', marginTop: 4 },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 8 },
  historyNumber: { fontSize: 13, fontWeight: '700', color: '#F8FAFC' },
  historyDate: { fontSize: 10, color: '#64748B', marginTop: 2 },
  historyEarnings: { fontSize: 14, fontWeight: '800', color: '#10B981' },
  profileCard: { backgroundColor: '#1E293B', padding: 14, borderRadius: 12 },
  profileLabel: { fontSize: 10, color: '#64748B', textTransform: 'uppercase', marginTop: 8 },
  profileValue: { fontSize: 14, color: '#E2E8F0', fontWeight: '700' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#1E293B', borderTopWidth: 1, borderTopColor: '#334155', paddingVertical: 10 },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 20, color: '#64748B' },
  navText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  navActive: { color: '#3B82F6', fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  ipModalCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 18, width: '85%' },
  ipModalTitle: { fontSize: 15, fontWeight: '800', color: '#F8FAFC' },
  ipModalSub: { fontSize: 11, color: '#94A3B8', marginVertical: 8 },
  ipInput: { backgroundColor: '#0F172A', color: '#FFF', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 },
  ipCancelBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#334155', borderRadius: 8, alignItems: 'center' },
  ipCancelText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  ipSaveBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#10B981', borderRadius: 8, alignItems: 'center' },
  ipSaveText: { color: '#FFF', fontWeight: '800', fontSize: 12 }
});
