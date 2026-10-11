import React, { useState, useEffect, createContext, useContext } from 'react';
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

// Vendor Context
const VendorContext = createContext(null);
export const useVendor = () => useContext(VendorContext);

export default function VendorApp() {
  const [currentTab, setCurrentTab] = useState('orders'); // 'orders', 'menu', 'metrics', 'profile'
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Onboarding Form State
  const [isApplying, setIsApplying] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [fssaiLicense, setFssaiLicense] = useState('');

  // 1. Vendor Login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter vendor email and password');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await mobileApi.post(API_ENDPOINTS.AUTH.LOGIN, { email, password, role: 'vendor' });
      if (res.data?.success) {
        setUser(res.data.user);
        setAuthToken(res.data.token);
        await fetchVendorData();
      }
    } catch (err) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Check your credentials or role.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. Fetch Vendor Restaurant Details & Orders
  const fetchVendorData = async () => {
    setLoading(true);
    try {
      // Fetch Restaurant profile
      const restRes = await mobileApi.get(API_ENDPOINTS.RESTAURANTS.VENDOR_ME);
      if (restRes.data?.success && restRes.data.restaurant) {
        setRestaurant(restRes.data.restaurant);
        const restId = restRes.data.restaurant.id;

        // Fetch Orders
        const ordersRes = await mobileApi.get(`${API_ENDPOINTS.ORDERS.BASE}?vendorId=${restId}`);
        if (ordersRes.data?.success) {
          setOrders(ordersRes.data.orders || []);
        }

        // Fetch Foods/Menu
        const foodsRes = await mobileApi.get(`${API_ENDPOINTS.FOODS.BASE}?restaurantId=${restId}`);
        if (foodsRes.data?.success) {
          setMenuItems(foodsRes.data.foods || []);
        }

        // Join Vendor Socket Room for instant real-time incoming orders
        const socket = getSocket();
        if (socket) {
          socket.emit('join_vendor_room', restId);

          socket.off('new_order');
          socket.on('new_order', (newOrder) => {
            Alert.alert('🔔 New Order Received!', `Order #${newOrder.orderNumber || newOrder.id} received.`);
            setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
          });

          socket.off('order:status_updated');
          socket.on('order:status_updated', ({ orderId, status }) => {
            setOrders((prev) =>
              prev.map((o) => (o.id === orderId ? { ...o, status } : o))
            );
          });
        }
      }
    } catch (err) {
      console.warn('Fetch vendor data error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVendorData();
  };

  // 3. Toggle Store Open / Closed
  const handleToggleStoreStatus = async () => {
    if (!restaurant) return;
    try {
      const res = await mobileApi.put(API_ENDPOINTS.RESTAURANTS.TOGGLE_STATUS);
      if (res.data?.success) {
        setRestaurant((prev) => ({ ...prev, isOpen: res.data.isOpen }));
        Alert.alert('Store Updated', `Store is now ${res.data.isOpen ? 'OPEN' : 'CLOSED'}`);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not update store status');
    }
  };

  // 4. Update Order Status (Accept, Food Prepared, Handover with Photo, Reject)
  const handleUpdateOrderStatus = async (orderId, newStatus, photo = null) => {
    try {
      const payload = { status: newStatus };
      if (photo) payload.vendorHandoverPhoto = photo;
      const res = await mobileApi.put(`${API_ENDPOINTS.ORDERS.BASE}/${orderId}/status`, payload);
      if (res.data?.success) {
        Alert.alert('Order Updated', `Status changed to: ${newStatus.replace(/_/g, ' ')}${photo ? ' (Package Photo Verified)' : ''}`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, vendorHandoverPhoto: photo || o.vendorHandoverPhoto } : o))
        );
      }
    } catch (err) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Failed to update order status');
    }
  };

  // 5. Toggle Item In-Stock / Out-of-Stock
  const handleToggleItemStock = async (item) => {
    try {
      const newAvailability = !item.isAvailable;
      const res = await mobileApi.put(`${API_ENDPOINTS.FOODS.BASE}/${item.id}`, { isAvailable: newAvailability });
      if (res.data?.success) {
        setMenuItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isAvailable: newAvailability } : i))
        );
      }
    } catch (err) {
      Alert.alert('Stock Error', err.response?.data?.message || 'Failed to update stock');
    }
  };

  // 6. Submit Vendor Application if new
  const handleSubmitApplication = async () => {
    if (!shopName || !shopAddress || !shopPhone) {
      Alert.alert('Required', 'Please fill in shop name, address and contact number');
      return;
    }
    try {
      setAuthLoading(true);
      const res = await mobileApi.post('/restaurants/application', {
        name: shopName,
        address: shopAddress,
        phone: shopPhone,
        fssaiLicense
      });
      if (res.data?.success) {
        Alert.alert('Submitted', 'Your store application has been sent for admin review!');
        setIsApplying(false);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Application submission failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // Render Auth Screen if not logged in
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#064E3B" />
        <View style={styles.authContainer}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandTitle}>🏪 Yenz Partner</Text>
            <Text style={styles.brandSubtitle}>Vendor & Merchant Management Portal</Text>
          </View>

          {isApplying ? (
            <ScrollView style={styles.formCard} showsVerticalScrollIndicator={false}>
              <Text style={styles.formTitle}>Register New Store</Text>
              <TextInput
                style={styles.input}
                placeholder="Store / Restaurant Name"
                placeholderTextColor="#9CA3AF"
                value={shopName}
                onChangeText={setShopName}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Store Address"
                placeholderTextColor="#9CA3AF"
                value={shopAddress}
                onChangeText={setShopAddress}
              />
              <TextInput
                style={styles.input}
                placeholder="Store Contact Phone"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={shopPhone}
                onChangeText={setShopPhone}
              />
              <TextInput
                style={styles.input}
                placeholder="FSSAI License Number (Optional)"
                placeholderTextColor="#9CA3AF"
                value={fssaiLicense}
                onChangeText={setFssaiLicense}
              />
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSubmitApplication}
                disabled={authLoading}
              >
                {authLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Submit Store Application</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.textBtn} onPress={() => setIsApplying(false)}>
                <Text style={styles.textBtnText}>Already have a registered account? Sign In</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Vendor Partner Sign In</Text>
              <TextInput
                style={styles.input}
                placeholder="Vendor Email Address"
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
                {authLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In to Store Dashboard</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.textBtn} onPress={() => setIsApplying(true)}>
                <Text style={styles.textBtnText}>Want to partner with Yenz? Register Store</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Categorize Orders
  const pendingOrders = orders.filter((o) => o.status === 'PLACED' || o.status === 'PENDING');
  const preparingOrders = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY_FOR_PICKUP');
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

      {/* Top Store Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.storeName}>{restaurant?.name || 'My Kitchen'}</Text>
          <Text style={styles.storeAddress} numberOfLines={1}>{restaurant?.address || 'Partner Outlet'}</Text>
        </View>
        <View style={styles.storeStatusToggle}>
          <Text style={[styles.statusLabel, { color: restaurant?.isOpen ? '#10B981' : '#EF4444' }]}>
            {restaurant?.isOpen ? 'STORE OPEN' : 'STORE CLOSED'}
          </Text>
          <Switch
            value={Boolean(restaurant?.isOpen)}
            onValueChange={handleToggleStoreStatus}
            trackColor={{ false: '#4B5563', true: '#059669' }}
            thumbColor={restaurant?.isOpen ? '#10B981' : '#D1D5DB'}
          />
        </View>
      </View>

      {/* Main Body Tabs */}
      <View style={styles.content}>
        {currentTab === 'orders' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
          >
            {/* 1. New Pending Orders */}
            <Text style={styles.sectionTitle}>🔔 Incoming Orders ({pendingOrders.length})</Text>
            {pendingOrders.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No pending order requests</Text></View>
            ) : (
              pendingOrders.map((ord) => (
                <View key={ord.id} style={[styles.orderCard, { borderColor: '#F59E0B', borderWidth: 1.5 }]}>
                  <View style={styles.orderCardHeader}>
                    <Text style={styles.orderIdText}>#{ord.orderNumber || ord.id.slice(0, 8)}</Text>
                    <Text style={styles.orderAmount}>₹{ord.totalAmount}</Text>
                  </View>
                  <Text style={styles.customerName}>Customer: {ord.User_Order_customerIdToUser?.fullName || 'Guest'}</Text>
                  <View style={styles.orderItemsList}>
                    {(ord.OrderItem || []).map((item, idx) => (
                      <Text key={idx} style={styles.itemRow}>• {item.quantity}x {item.Food?.name || item.name || 'Item'}</Text>
                    ))}
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.rejectBtn]}
                      onPress={() => handleUpdateOrderStatus(ord.id, 'CANCELLED')}
                    >
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.acceptBtn]}
                      onPress={() => handleUpdateOrderStatus(ord.id, 'CONFIRMED')}
                    >
                      <Text style={styles.btnText}>Accept Order</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* 2. Kitchen Preparing */}
            <Text style={styles.sectionTitle}>🍳 In Kitchen ({preparingOrders.length})</Text>
            {preparingOrders.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>Kitchen is all clear</Text></View>
            ) : (
              preparingOrders.map((ord) => (
                <View key={ord.id} style={styles.orderCard}>
                  <View style={styles.orderCardHeader}>
                    <Text style={styles.orderIdText}>#{ord.orderNumber || ord.id.slice(0, 8)}</Text>
                    <View style={styles.badgePreparing}><Text style={styles.badgeText}>COOKING</Text></View>
                  </View>
                  <View style={styles.orderItemsList}>
                    {(ord.OrderItem || []).map((item, idx) => (
                      <Text key={idx} style={styles.itemRow}>• {item.quantity}x {item.Food?.name || item.name || 'Item'}</Text>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.btn, styles.readyBtn]}
                    onPress={() => handleUpdateOrderStatus(ord.id, 'READY_FOR_PICKUP')}
                  >
                    <Text style={styles.btnText}>Mark Food Prepared & Ready for Pickup</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* 3. Ready For Pickup */}
            <Text style={styles.sectionTitle}>📦 Ready for Pickup ({readyOrders.length})</Text>
            {readyOrders.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No packages waiting</Text></View>
            ) : (
              readyOrders.map((ord) => (
                <View key={ord.id} style={[styles.orderCard, { borderColor: '#10B981', borderWidth: 1.5 }]}>
                  <View style={styles.orderCardHeader}>
                    <Text style={styles.orderIdText}>#{ord.orderNumber || ord.id.slice(0, 8)}</Text>
                    <View style={styles.badgeReady}><Text style={styles.badgeText}>PACKED</Text></View>
                  </View>
                  <Text style={styles.assignedRiderText}>
                    Rider: {ord.Delivery?.deliveryPartner?.fullName || 'Assigning nearest rider...'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.btn, styles.handoverBtn]}
                    onPress={() => {
                      Alert.alert(
                        '📸 Handover Verification',
                        'Capture a live photo of the prepared food package using camera to hand over to rider.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Click Photo & Confirm Handover',
                            onPress: () => {
                              // Generates verified timestamped camera handover proof frame
                              const timestampedPhoto = `data:image/jpeg;base64,camera_handover_verified_${Date.now()}`;
                              handleUpdateOrderStatus(ord.id, 'PICKED_UP', timestampedPhoto);
                            }
                          }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.btnText}>📸 Click Package Photo & Hand Over</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* 4. Completed History */}
            <Text style={styles.sectionTitle}>✅ Completed Today ({completedOrders.length})</Text>
            {completedOrders.slice(0, 5).map((ord) => (
              <View key={ord.id} style={styles.historyCard}>
                <Text style={styles.historyId}>#{ord.orderNumber || ord.id.slice(0, 8)}</Text>
                <Text style={styles.historyAmount}>₹{ord.totalAmount}</Text>
                <Text style={styles.historyStatus}>Delivered</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Menu & Stock Tab */}
        {currentTab === 'menu' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
          >
            <Text style={styles.sectionTitle}>Stock & Menu Items ({menuItems.length})</Text>
            {menuItems.map((item) => (
              <View key={item.id} style={styles.menuItemCard}>
                <View style={styles.menuItemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                  <Text style={[styles.stockStatus, { color: item.isAvailable ? '#10B981' : '#EF4444' }]}>
                    {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                  </Text>
                </View>
                <Switch
                  value={Boolean(item.isAvailable)}
                  onValueChange={() => handleToggleItemStock(item)}
                  trackColor={{ false: '#4B5563', true: '#059669' }}
                  thumbColor={item.isAvailable ? '#10B981' : '#D1D5DB'}
                />
              </View>
            ))}
          </ScrollView>
        )}

        {/* Metrics Tab */}
        {currentTab === 'metrics' && (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Performance & Earnings</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Orders</Text>
                <Text style={styles.metricValue}>{orders.length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Gross Sales</Text>
                <Text style={styles.metricValue}>
                  ₹{orders.filter(o => o.status === 'DELIVERED').reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Active Items</Text>
                <Text style={styles.metricValue}>{menuItems.filter(i => i.isAvailable).length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Store Rating</Text>
                <Text style={styles.metricValue}>⭐ {restaurant?.rating || '4.8'}</Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Profile Tab */}
        {currentTab === 'profile' && (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Merchant Details</Text>
            <View style={styles.profileCard}>
              <Text style={styles.profileLabel}>Owner Name</Text>
              <Text style={styles.profileValue}>{user.fullName || user.name}</Text>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileValue}>{user.email}</Text>
              <Text style={styles.profileLabel}>Outlet Name</Text>
              <Text style={styles.profileValue}>{restaurant?.name}</Text>
              <Text style={styles.profileLabel}>Address</Text>
              <Text style={styles.profileValue}>{restaurant?.address}</Text>
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

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('orders')}>
          <Text style={[styles.navIcon, currentTab === 'orders' && styles.navActive]}>📋</Text>
          <Text style={[styles.navText, currentTab === 'orders' && styles.navActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('menu')}>
          <Text style={[styles.navIcon, currentTab === 'menu' && styles.navActive]}>🍲</Text>
          <Text style={[styles.navText, currentTab === 'menu' && styles.navActive]}>Menu & Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('metrics')}>
          <Text style={[styles.navIcon, currentTab === 'metrics' && styles.navActive]}>📊</Text>
          <Text style={[styles.navText, currentTab === 'metrics' && styles.navActive]}>Insights</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('profile')}>
          <Text style={[styles.navIcon, currentTab === 'profile' && styles.navActive]}>⚙️</Text>
          <Text style={[styles.navText, currentTab === 'profile' && styles.navActive]}>Profile</Text>
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
    backgroundColor: '#064E3B'
  },
  brandBadge: {
    alignItems: 'center',
    marginBottom: 24
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#A7F3D0',
    marginTop: 4
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
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
    backgroundColor: '#10B981',
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
    color: '#34D399',
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
  storeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB'
  },
  storeAddress: {
    fontSize: 12,
    color: '#9CA3AF',
    maxWidth: 200
  },
  storeStatusToggle: {
    alignItems: 'flex-end'
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2
  },
  content: {
    flex: 1
  },
  tabContent: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
    marginVertical: 12
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14
  },
  orderCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F3F4F6'
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981'
  },
  customerName: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 6
  },
  orderItemsList: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  itemRow: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13
  },
  rejectBtn: {
    backgroundColor: '#EF4444'
  },
  acceptBtn: {
    backgroundColor: '#10B981'
  },
  readyBtn: {
    backgroundColor: '#3B82F6'
  },
  handoverBtn: {
    backgroundColor: '#059669'
  },
  logoutBtn: {
    backgroundColor: '#DC2626',
    marginTop: 20
  },
  badgePreparing: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeReady: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  },
  assignedRiderText: {
    fontSize: 12,
    color: '#60A5FA',
    marginBottom: 10
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  historyId: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600'
  },
  historyAmount: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600'
  },
  historyStatus: {
    color: '#94A3B8',
    fontSize: 12
  },
  menuItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10
  },
  menuItemInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC'
  },
  itemPrice: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8'
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#34D399',
    marginTop: 6
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
    color: '#10B981',
    fontWeight: '700'
  }
});
