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
  RefreshControl
} from 'react-native';
import mobileApi, { setAuthToken } from '../../shared/mobile/api.js';
import { getSocket } from '../../shared/mobile/socket.js';
import { THEME } from '../../shared/mobile/theme.js';
import { API_ENDPOINTS } from '../../shared/api/endpoints.js';

export default function RiderApp() {
  const [currentTab, setCurrentTab] = useState('active'); // 'active', 'offers', 'earnings', 'profile'
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [offerCountdown, setOfferCountdown] = useState(15);
  const [deliveryPin, setDeliveryPin] = useState('');
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Onboarding State
  const [isApplying, setIsApplying] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [dlNumber, setDlNumber] = useState('');

  // Location Interval Ref
  const locationIntervalRef = useRef(null);

  // 1. Rider Login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter rider email and password');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await mobileApi.post(API_ENDPOINTS.AUTH.LOGIN, { email, password, role: 'delivery_partner' });
      if (res.data?.success) {
        setUser(res.data.user);
        setAuthToken(res.data.token);
        setIsOnline(Boolean(res.data.user.isOnline));
        await fetchRiderDashboard();
      }
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Check your credentials or driver role.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. Fetch Dashboard & Active Deliveries
  const fetchRiderDashboard = async () => {
    setLoading(true);
    try {
      const res = await mobileApi.get(API_ENDPOINTS.DELIVERY.DASHBOARD);
      if (res.data?.success) {
        setIsOnline(Boolean(res.data.isOnline));
        setActiveDelivery(res.data.activeDelivery || null);
        setCompletedDeliveries(res.data.pastDeliveries || []);

        if (res.data.activeOffer) {
          setIncomingOffer(res.data.activeOffer);
          setOfferCountdown(res.data.activeOffer.expiresInSeconds || 15);
        }
      }
    } catch (err) {
      console.warn('Rider dashboard fetch warning:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRiderDashboard();
  };

  // 3. Socket Setup for Driver Offers and Location
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    if (socket) {
      // Join driver room
      socket.emit('join_drivers_room', { lat: 28.5355, lng: 77.3910 });

      // Listen for dispatch offers
      socket.off('delivery:new_offer');
      socket.on('delivery:new_offer', (offer) => {
        setIncomingOffer(offer);
        setOfferCountdown(15);
        Alert.alert('⚡ New Delivery Job Offer!', `Payout: ₹${offer.earningsEstimate || offer.payout || 65}\nDistance: ${offer.distanceKm || '1.5'} km`);
      });

      // Listen for cancelled/expired offers
      socket.off('delivery:offer_cancelled');
      socket.on('delivery:offer_cancelled', () => {
        setIncomingOffer(null);
      });

      // Listen for order status updates
      socket.off('order:status_updated');
      socket.on('order:status_updated', ({ orderId, status }) => {
        setActiveDelivery((prev) => {
          if (prev && (prev.orderId === orderId || prev.id === orderId)) {
            return { ...prev, status };
          }
          return prev;
        });
      });
    }

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [user]);

  // Countdown timer for incoming offer
  useEffect(() => {
    if (!incomingOffer) return;
    const timer = setInterval(() => {
      setOfferCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIncomingOffer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingOffer]);

  // 4. GPS Location Broadcast simulation for Active Trips
  useEffect(() => {
    if (activeDelivery && activeDelivery.status !== 'DELIVERED') {
      locationIntervalRef.current = setInterval(() => {
        const socket = getSocket();
        // Shift slightly to simulate movement
        const lat = 28.5355 + (Math.random() - 0.5) * 0.005;
        const lng = 77.3910 + (Math.random() - 0.5) * 0.005;

        // Push via socket
        if (socket) {
          socket.emit('driver:update_location', {
            orderId: activeDelivery.orderId || activeDelivery.id,
            lat,
            lng
          });
        }
        // Also persist via REST endpoint
        mobileApi.post(API_ENDPOINTS.DELIVERY.LOCATION, { latitude: lat, longitude: lng }).catch(() => {});
      }, 5000);
    } else {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    }

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [activeDelivery]);

  // 5. Toggle Online / Offline
  const handleToggleOnline = async () => {
    try {
      const res = await mobileApi.put(API_ENDPOINTS.DELIVERY.TOGGLE_ONLINE);
      if (res.data?.success) {
        setIsOnline(res.data.isOnline);
        const socket = getSocket();
        if (res.data.isOnline && socket) {
          socket.emit('join_drivers_room', { lat: 28.5355, lng: 77.3910 });
        }
        Alert.alert('Status Updated', `You are now ${res.data.isOnline ? 'ONLINE & Receiving Orders' : 'OFFLINE'}`);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update online status');
    }
  };

  // 6. Accept / Reject Delivery Offer
  const handleAcceptOffer = async () => {
    if (!incomingOffer) return;
    try {
      const res = await mobileApi.post(`/deliveries/offers/${incomingOffer.offerId || incomingOffer.id}/accept`);
      if (res.data?.success) {
        Alert.alert('Success', 'Delivery job accepted! Navigate to pickup store.');
        setIncomingOffer(null);
        await fetchRiderDashboard();
      }
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.message || 'Could not accept offer');
    }
  };

  const handleRejectOffer = async () => {
    if (!incomingOffer) return;
    try {
      await mobileApi.post(`/deliveries/offers/${incomingOffer.offerId || incomingOffer.id}/reject`);
      setIncomingOffer(null);
    } catch (err) {
      setIncomingOffer(null);
    }
  };

  // 7. Advance Delivery Trip Status
  const handleUpdateTripStatus = async (newStatus, pinCode = null, dropoffPhoto = null) => {
    if (!activeDelivery) return;
    try {
      const payload = { status: newStatus };
      if (pinCode) payload.deliveryPin = pinCode;
      if (dropoffPhoto) payload.riderDeliveryPhoto = dropoffPhoto;

      const res = await mobileApi.put(`${API_ENDPOINTS.DELIVERY.BASE}/${activeDelivery.id}/status`, payload);
      if (res.data?.success) {
        Alert.alert('Trip Updated', `Trip status: ${newStatus.replace(/_/g, ' ')}${dropoffPhoto ? ' (Delivery Proof Saved)' : ''}`);
        if (newStatus === 'DELIVERED') {
          setActiveDelivery(null);
          setDeliveryPin('');
          await fetchRiderDashboard();
        } else {
          setActiveDelivery((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update delivery status');
    }
  };

  // 8. Submit Rider Application
  const handleSubmitRiderApp = async () => {
    if (!fullName || !phone || !vehicleNumber || !dlNumber) {
      Alert.alert('Required', 'Please fill in name, phone, vehicle number and DL number');
      return;
    }
    try {
      setAuthLoading(true);
      const res = await mobileApi.post('/deliveries/application', {
        fullName,
        phone,
        vehicleType,
        vehicleNumber,
        dlNumber
      });
      if (res.data?.success) {
        Alert.alert('Application Submitted', 'Your rider onboarding application is being reviewed by Admin!');
        setIsApplying(false);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit application');
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth Screen if not logged in
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <View style={styles.authContainer}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandTitle}>🛵 Yenz Rider</Text>
            <Text style={styles.brandSubtitle}>Delivery Partner Field App</Text>
          </View>

          {isApplying ? (
            <ScrollView style={styles.formCard} showsVerticalScrollIndicator={false}>
              <Text style={styles.formTitle}>Join as Delivery Partner</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Legal Name"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
              />
              <TextInput
                style={styles.input}
                placeholder="Mobile Phone Number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
              <TextInput
                style={styles.input}
                placeholder="Vehicle Type (Bike / Scooter / EV)"
                placeholderTextColor="#9CA3AF"
                value={vehicleType}
                onChangeText={setVehicleType}
              />
              <TextInput
                style={styles.input}
                placeholder="Vehicle Registration Number"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
              />
              <TextInput
                style={styles.input}
                placeholder="Driving License (DL) Number"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
                value={dlNumber}
                onChangeText={setDlNumber}
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSubmitRiderApp}
                disabled={authLoading}
              >
                {authLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Submit Rider Application</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.textBtn} onPress={() => setIsApplying(false)}>
                <Text style={styles.textBtnText}>Already have an approved account? Sign In</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Rider Partner Sign In</Text>
              <TextInput
                style={styles.input}
                placeholder="Rider Email Address"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleLogin}
                disabled={authLoading}
              >
                {authLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In as Rider</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.textBtn} onPress={() => setIsApplying(true)}>
                <Text style={styles.textBtnText}>Become a Delivery Partner? Apply Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Rider Status Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.riderName}>🛵 {user.fullName || 'Delivery Partner'}</Text>
          <Text style={styles.vehicleInfo}>{user.vehicleType || 'Bike'} • {user.ratings ? `⭐ ${user.ratings}` : '⭐ 5.0'}</Text>
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

      {/* Floating Incoming Offer Modal Card */}
      {incomingOffer && (
        <View style={styles.offerOverlay}>
          <View style={styles.offerCard}>
            <View style={styles.offerBadgeRow}>
              <Text style={styles.offerAlertTitle}>⚡ DELIVERY OFFER</Text>
              <Text style={styles.countdownPill}>{offerCountdown}s</Text>
            </View>
            <Text style={styles.offerPayout}>₹{incomingOffer.earningsEstimate || incomingOffer.payout || 65}</Text>
            <Text style={styles.offerPayoutLabel}>Estimated Rider Payout</Text>

            <View style={styles.offerRoute}>
              <Text style={styles.routePoint}>📍 Pickup: {incomingOffer.restaurantName || 'Partner Store'}</Text>
              <Text style={styles.routeDist}>Distance to Store: {incomingOffer.pickupDistanceKm || '1.2'} km</Text>
              <Text style={styles.routePoint}>🏠 Dropoff: {incomingOffer.customerAddress || 'Customer Address'}</Text>
              <Text style={styles.routeDist}>Trip Distance: {incomingOffer.customerDistanceKm || '2.4'} km</Text>
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

      {/* Main Content Tabs */}
      <View style={styles.content}>
        {currentTab === 'active' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
          >
            {activeDelivery ? (
              <View style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <Text style={styles.tripOrderNumber}>Trip #{activeDelivery.orderNumber || activeDelivery.id.slice(0, 8)}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{activeDelivery.status.replace(/_/g, ' ')}</Text>
                  </View>
                </View>

                {/* Kitchen Preparation Notice */}
                {activeDelivery.status === 'ASSIGNED' || activeDelivery.status === 'WAITING_PICKUP' || activeDelivery.status === 'ARRIVED_AT_PICKUP' ? (
                  <View style={[styles.infoBanner, { backgroundColor: '#1E293B' }]}>
                    <Text style={styles.infoBannerText}>
                      {activeDelivery.Order?.status === 'READY_FOR_PICKUP'
                        ? '✅ Food is prepared & packed by the kitchen!'
                        : '🍳 Kitchen is currently preparing the order...'}
                    </Text>
                  </View>
                ) : null}

                {/* Pickup Store Details */}
                <View style={styles.pointCard}>
                  <Text style={styles.pointTitle}>1. STORE PICKUP</Text>
                  <Text style={styles.pointName}>{activeDelivery.Order?.Vendor?.name || 'Local Kitchen'}</Text>
                  <Text style={styles.pointAddress}>{activeDelivery.Order?.Vendor?.address || 'Pickup Counter'}</Text>
                </View>

                {/* Dropoff Customer Details */}
                <View style={styles.pointCard}>
                  <Text style={styles.pointTitle}>2. CUSTOMER DROPOFF</Text>
                  <Text style={styles.pointName}>{activeDelivery.Order?.User_Order_customerIdToUser?.fullName || 'Customer'}</Text>
                  <Text style={styles.pointAddress}>
                    {activeDelivery.Order?.Address?.addressLine || 'Customer Delivery Address'}
                  </Text>
                </View>

                {/* Progressive Action Buttons based on delivery state */}
                <View style={styles.tripActionContainer}>
                  {activeDelivery.status === 'ASSIGNED' || activeDelivery.status === 'WAITING_PICKUP' ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.actionBtnBlue]}
                      onPress={() => handleUpdateTripStatus('ARRIVED_AT_PICKUP')}
                    >
                      <Text style={styles.btnText}>📍 I Have Arrived at Store</Text>
                    </TouchableOpacity>
                  ) : activeDelivery.status === 'ARRIVED_AT_PICKUP' ? (
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
                      <Text style={styles.pinSubtitle}>Live camera photo of food package at customer doorstep</Text>

                      <TouchableOpacity
                        style={[styles.btn, styles.actionBtnBlue, { width: '100%', marginBottom: 16 }]}
                        onPress={() => {
                          Alert.alert(
                            '📸 Camera Shutter',
                            'Opening live device camera to capture delivered package at doorstep.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Click Photo & Confirm',
                                onPress: () => {
                                  const dropoffProof = `data:image/jpeg;base64,camera_dropoff_proof_${Date.now()}`;
                                  Alert.alert('✅ Photo Captured', 'Dropoff photo verified. Now ask customer for 4-digit PIN.');
                                  activeDelivery._capturedDropoffPhoto = dropoffProof;
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <Text style={styles.btnText}>📸 Click Delivery Proof Photo</Text>
                      </TouchableOpacity>

                      <Text style={styles.pinTitle}>Step 2: Enter Customer 4-Digit Delivery PIN</Text>
                      <Text style={styles.pinSubtitle}>Ask customer for the secret code on their app</Text>
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
                        style={[styles.btn, styles.actionBtnGreen, { marginTop: 10 }]}
                        onPress={() => {
                          if (deliveryPin.length !== 4) {
                            Alert.alert('Invalid PIN', 'Please enter all 4 digits of the PIN');
                            return;
                          }
                          const photo = activeDelivery._capturedDropoffPhoto || `data:image/jpeg;base64,camera_dropoff_proof_${Date.now()}`;
                          handleUpdateTripStatus('DELIVERED', deliveryPin, photo);
                        }}
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
                  {isOnline ? 'Waiting for New Delivery Offers...' : 'You Are Currently Offline'}
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
              </View>
            )}
          </ScrollView>
        )}

        {/* Earnings & Past Deliveries Tab */}
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
                  <Text style={styles.historyNumber}>Trip #{trip.orderNumber || trip.id.slice(0, 8)}</Text>
                  <Text style={styles.historyDate}>{new Date(trip.createdAt || Date.now()).toLocaleTimeString()}</Text>
                </View>
                <Text style={styles.historyEarnings}>+₹{trip.earnings || 65}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Profile Tab */}
        {currentTab === 'profile' && (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Rider Account</Text>
            <View style={styles.profileCard}>
              <Text style={styles.profileLabel}>Name</Text>
              <Text style={styles.profileValue}>{user.fullName}</Text>
              <Text style={styles.profileLabel}>Phone</Text>
              <Text style={styles.profileValue}>{user.phone || 'Not linked'}</Text>
              <Text style={styles.profileLabel}>Vehicle</Text>
              <Text style={styles.profileValue}>{user.vehicleType || 'Motorbike'}</Text>
              <Text style={styles.profileLabel}>Rating</Text>
              <Text style={styles.profileValue}>⭐ {user.ratings || '5.0'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.btn, styles.logoutBtn]}
              onPress={() => {
                setUser(null);
                setAuthToken(null);
              }}
            >
              <Text style={styles.btnText}>Sign Out</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Bottom Tabs Navigation */}
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
          <Text style={[styles.navText, currentTab === 'profile' && styles.navActive]}>Rider Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0F172A'
  },
  brandBadge: {
    alignItems: 'center',
    marginBottom: 24
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: 0.5
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16
  },
  input: {
    backgroundColor: '#334155',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15
  },
  primaryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15
  },
  textBtn: {
    marginTop: 16,
    alignItems: 'center'
  },
  textBtnText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  riderName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  vehicleInfo: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  onlineToggle: {
    alignItems: 'flex-end'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2
  },
  offerOverlay: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    zIndex: 999
  },
  offerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: '#3B82F6',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10
  },
  offerBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  offerAlertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#60A5FA'
  },
  countdownPill: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  offerPayout: {
    fontSize: 32,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 6
  },
  offerPayoutLabel: {
    fontSize: 12,
    color: '#94A3B8'
  },
  offerRoute: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12
  },
  routePoint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 4
  },
  routeDist: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4
  },
  offerBtnRow: {
    flexDirection: 'row',
    gap: 12
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center'
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  },
  rejectBtn: {
    backgroundColor: '#475569'
  },
  acceptBtn: {
    backgroundColor: '#10B981'
  },
  content: {
    flex: 1
  },
  tabContent: {
    padding: 16
  },
  tripCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  tripOrderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  statusBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  infoBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  infoBannerText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '600'
  },
  pointCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },
  pointTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: 0.5
  },
  pointName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 4
  },
  pointAddress: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  tripActionContainer: {
    marginTop: 14
  },
  actionBtnBlue: {
    backgroundColor: '#2563EB'
  },
  actionBtnGreen: {
    backgroundColor: '#059669'
  },
  pinVerificationBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  pinTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  pinSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 12
  },
  pinInput: {
    backgroundColor: '#1E293B',
    color: '#10B981',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
    borderRadius: 10,
    width: 140,
    paddingVertical: 10
  },
  idleCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginTop: 24
  },
  idleIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  idleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center'
  },
  idleSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18
  },
  goOnlineBtn: {
    backgroundColor: '#10B981',
    marginTop: 18,
    width: '100%'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
    marginVertical: 12
  },
  earningsSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  earnBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16
  },
  earnLabel: {
    fontSize: 12,
    color: '#94A3B8'
  },
  earnVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8
  },
  historyNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC'
  },
  historyDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2
  },
  historyEarnings: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981'
  },
  profileCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12
  },
  profileLabel: {
    fontSize: 11,
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 8
  },
  profileValue: {
    fontSize: 15,
    color: '#E2E8F0',
    fontWeight: '600'
  },
  logoutBtn: {
    backgroundColor: '#DC2626',
    marginTop: 20
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 10
  },
  navItem: {
    flex: 1,
    alignItems: 'center'
  },
  navIcon: {
    fontSize: 20,
    color: '#64748B'
  },
  navText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4
  },
  navActive: {
    color: '#3B82F6',
    fontWeight: '700'
  }
});
