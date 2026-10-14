import React, { useState, useEffect } from 'react';
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

// Fallback Mock Data matching Web Vendor Dashboard
const MOCK_RESTAURANT = {
  id: 'rest-royal-1',
  name: 'Royal Punjab Dhaba',
  address: 'Shop 14, Main Market, Knowledge Park II, Greater Noida',
  phone: '+91 98765 43210',
  isOpen: true,
  rating: 4.8,
  latitude: 28.454939,
  longitude: 77.504532
};

const MOCK_VENDOR_ORDERS = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-9812',
    totalAmount: 490,
    status: 'PLACED',
    customerName: 'Aarav Patel',
    items: [{ name: 'Paneer Butter Masala', quantity: 2, price: 240 }]
  },
  {
    id: 'ord-102',
    orderNumber: 'ORD-9808',
    totalAmount: 260,
    status: 'PREPARING',
    customerName: 'Priya Verma',
    items: [{ name: 'Dum Hyderabadi Biryani', quantity: 1, price: 260 }]
  },
  {
    id: 'ord-103',
    orderNumber: 'ORD-9799',
    totalAmount: 320,
    status: 'READY_FOR_PICKUP',
    customerName: 'Kunal Singh',
    assignedRider: 'Sonu Kumar (Rider 🛵)',
    items: [{ name: 'Crispy Veg Burger Meal', quantity: 2, price: 160 }]
  }
];

const MOCK_MENU = [
  { id: 'item-1', name: 'Paneer Butter Masala', price: 240, isAvailable: true, category: 'Curry' },
  { id: 'item-2', name: 'Dum Hyderabadi Biryani', price: 260, isAvailable: true, category: 'Biryani' },
  { id: 'item-3', name: 'Tandoori Butter Roti', price: 25, isAvailable: true, category: 'Breads' },
  { id: 'item-4', name: 'Dal Makhani Special', price: 210, isAvailable: false, category: 'Curry' }
];

export default function VendorApp() {
  const [currentTab, setCurrentTab] = useState('orders'); // 'orders', 'menu', 'metrics', 'profile'
  const [restaurant, setRestaurant] = useState(MOCK_RESTAURANT);
  const [orders, setOrders] = useState(MOCK_VENDOR_ORDERS);
  const [menuItems, setMenuItems] = useState(MOCK_MENU);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Store GPS Location State
  const [storeLat, setStoreLat] = useState(28.454939);
  const [storeLng, setStoreLng] = useState(77.504532);
  const [locatingStore, setLocatingStore] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // Server Connectivity State & Modal
  const [serverOnline, setServerOnline] = useState(false);
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [customIpInput, setCustomIpInput] = useState(CONFIG.activeHost);

  useEffect(() => {
    fetchVendorData();
  }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.get('/restaurants/vendor-me');
      if (res.data?.success && res.data.restaurant) {
        setRestaurant(res.data.restaurant);
        if (res.data.restaurant.latitude) setStoreLat(Number(res.data.restaurant.latitude));
        if (res.data.restaurant.longitude) setStoreLng(Number(res.data.restaurant.longitude));
        setServerOnline(true);
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
    fetchVendorData();
    Alert.alert('Backend Updated', `Connecting to: ${CONFIG.API_BASE_URL}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVendorData();
  };

  // Toggle Store Status
  const handleToggleStoreStatus = async () => {
    const nextStatus = !restaurant.isOpen;
    setRestaurant((prev) => ({ ...prev, isOpen: nextStatus }));
    try {
      await mobileApi.put('/restaurants/toggle-status', { isOpen: nextStatus });
    } catch (e) {}
    Alert.alert('Store Updated', `Store is now ${nextStatus ? 'OPEN & Accepting Orders' : 'CLOSED'}`);
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await mobileApi.put(`/orders/${orderId}/status`, { status: newStatus }).catch(() => null);
    } catch (e) {}

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    Alert.alert('Order Updated', `Status changed to: ${newStatus.replace(/_/g, ' ')}`);
  };

  // Toggle Stock
  const handleToggleItemStock = (itemId) => {
    setMenuItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i))
    );
  };

  // GPS Pin Handlers
  const handleFetchStoreGPS = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setLocatingStore(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setStoreLat(lat);
          setStoreLng(lng);
          setLocatingStore(false);
          Alert.alert('GPS Located', `Store coordinates fetched:\nLat: ${lat}, Lng: ${lng}`);
        },
        () => {
          setLocatingStore(false);
          Alert.alert('Notice', 'Unable to fetch precise device GPS, using current pin.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      Alert.alert('Notice', 'Geolocation is not available on this device.');
    }
  };

  const handleUpdateStoreCoordinates = async () => {
    setSavingLocation(true);
    try {
      await mobileApi.put(`/restaurants/${restaurant.id}`, {
        latitude: storeLat,
        longitude: storeLng
      }).catch(() => null);

      setRestaurant((prev) => ({ ...prev, latitude: storeLat, longitude: storeLng }));
      Alert.alert('Success', 'Storefront GPS pin saved! All driver navigation, customer maps, and dispatch will use this exact location.');
    } finally {
      setSavingLocation(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'PLACED');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY_FOR_PICKUP');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

      {/* 1. TOP STORE HEADER (MATCHING WEB VENDOR DASHBOARD) */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.storeName}>{restaurant.name}</Text>
          </View>
          <Text style={styles.storeAddress} numberOfLines={1}>{restaurant.address}</Text>
        </View>

        <View style={styles.storeStatusToggle}>
          <Text style={[styles.statusLabel, { color: restaurant.isOpen ? '#10B981' : '#EF4444' }]}>
            {restaurant.isOpen ? 'STORE OPEN' : 'STORE CLOSED'}
          </Text>
          <Switch
            value={restaurant.isOpen}
            onValueChange={handleToggleStoreStatus}
            trackColor={{ false: '#4B5563', true: '#059669' }}
            thumbColor={restaurant.isOpen ? '#10B981' : '#D1D5DB'}
          />
        </View>
      </View>

      {/* 2. MAIN TABS CONTENT */}
      <View style={styles.content}>
        {currentTab === 'orders' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
          >
            {/* Incoming Orders Section */}
            <Text style={styles.sectionTitle}>🔔 Incoming Orders ({pendingOrders.length})</Text>
            {pendingOrders.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No pending order requests</Text></View>
            ) : (
              pendingOrders.map((ord) => (
                <View key={ord.id} style={[styles.orderCard, { borderColor: '#F59E0B', borderWidth: 1.5 }]}>
                  <View style={styles.orderCardHeader}>
                    <Text style={styles.orderIdText}>#{ord.orderNumber}</Text>
                    <Text style={styles.orderAmount}>₹{ord.totalAmount}</Text>
                  </View>
                  <Text style={styles.customerName}>Customer: {ord.customerName}</Text>
                  <View style={styles.orderItemsList}>
                    {ord.items.map((i, idx) => (
                      <Text key={idx} style={styles.itemRow}>• {i.quantity}x {i.name}</Text>
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
                      onPress={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                    >
                      <Text style={styles.btnText}>Accept Order</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Kitchen Preparing Section */}
            <Text style={styles.sectionTitle}>🍳 In Kitchen ({preparingOrders.length})</Text>
            {preparingOrders.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>Kitchen is all clear</Text></View>
            ) : (
              preparingOrders.map((ord) => (
                <View key={ord.id} style={styles.orderCard}>
                  <View style={styles.orderCardHeader}>
                    <Text style={styles.orderIdText}>#{ord.orderNumber}</Text>
                    <View style={styles.badgePreparing}><Text style={styles.badgeText}>COOKING</Text></View>
                  </View>
                  <View style={styles.orderItemsList}>
                    {ord.items.map((i, idx) => (
                      <Text key={idx} style={styles.itemRow}>• {i.quantity}x {i.name}</Text>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.btn, styles.readyBtn]}
                    onPress={() => handleUpdateOrderStatus(ord.id, 'READY_FOR_PICKUP')}
                  >
                    <Text style={styles.btnText}>Mark Food Prepared & Packed</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Ready for Pickup Section */}
            <Text style={styles.sectionTitle}>📦 Ready for Pickup ({readyOrders.length})</Text>
            {readyOrders.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No packages waiting</Text></View>
            ) : (
              readyOrders.map((ord) => (
                <View key={ord.id} style={[styles.orderCard, { borderColor: '#10B981', borderWidth: 1.5 }]}>
                  <View style={styles.orderCardHeader}>
                    <Text style={styles.orderIdText}>#{ord.orderNumber}</Text>
                    <View style={styles.badgeReady}><Text style={styles.badgeText}>PACKED</Text></View>
                  </View>
                  <Text style={styles.assignedRiderText}>Rider: {ord.assignedRider || 'Sonu Kumar (Rider 🛵)'}</Text>
                  <TouchableOpacity
                    style={[styles.btn, styles.handoverBtn]}
                    onPress={() => {
                      Alert.alert('✅ Package Handover Verified', 'Food package successfully handed over to rider!');
                      handleUpdateOrderStatus(ord.id, 'DELIVERED');
                    }}
                  >
                    <Text style={styles.btnText}>Confirm Handover to Rider</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* Menu & Stock Tab */}
        {currentTab === 'menu' && (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Menu Items Stock Management</Text>
            {menuItems.map((item) => (
              <View key={item.id} style={styles.menuItemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₹{item.price} • {item.category}</Text>
                  <Text style={[styles.stockStatus, { color: item.isAvailable ? '#10B981' : '#EF4444' }]}>
                    {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                  </Text>
                </View>
                <Switch
                  value={item.isAvailable}
                  onValueChange={() => handleToggleItemStock(item.id)}
                  trackColor={{ false: '#4B5563', true: '#059669' }}
                  thumbColor={item.isAvailable ? '#10B981' : '#D1D5DB'}
                />
              </View>
            ))}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* Insights Tab */}
        {currentTab === 'metrics' && (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Performance & Gross Sales</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Orders</Text>
                <Text style={styles.metricValue}>{orders.length + 18}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Today's Gross</Text>
                <Text style={styles.metricValue}>₹4,820</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Active Items</Text>
                <Text style={styles.metricValue}>{menuItems.filter((i) => i.isAvailable).length}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Store Rating</Text>
                <Text style={styles.metricValue}>⭐ {restaurant.rating}</Text>
              </View>
            </View>
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* Profile & GPS Coordinates Tab */}
        {currentTab === 'profile' && (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Store Profile Details</Text>
            <View style={styles.profileCard}>
              <Text style={styles.profileLabel}>Outlet Name</Text>
              <Text style={styles.profileValue}>{restaurant.name}</Text>
              <Text style={styles.profileLabel}>Address</Text>
              <Text style={styles.profileValue}>{restaurant.address}</Text>
              <Text style={styles.profileLabel}>Phone</Text>
              <Text style={styles.profileValue}>{restaurant.phone}</Text>
            </View>

            {/* Storefront GPS Coordinates & Map Pin */}
            <View style={styles.storeGpsCard}>
              <View style={styles.storeGpsHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.storeGpsTitle}>📍 Storefront GPS Coordinates</Text>
                  <Text style={styles.storeGpsSub}>Pickup coordinates for drivers and customer maps</Text>
                </View>
                <TouchableOpacity
                  style={styles.gpsFetchBtn}
                  onPress={handleFetchStoreGPS}
                  disabled={locatingStore}
                >
                  {locatingStore ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.gpsFetchBtnText}>📡 Fetch GPS</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.coordDisplayRow}>
                <View style={styles.coordBox}>
                  <Text style={styles.coordLabel}>Latitude</Text>
                  <Text style={styles.coordVal}>{storeLat.toFixed(6)}</Text>
                </View>
                <View style={styles.coordBox}>
                  <Text style={styles.coordLabel}>Longitude</Text>
                  <Text style={styles.coordVal}>{storeLng.toFixed(6)}</Text>
                </View>
              </View>

              {/* Map Pinpoint with Pure Needle Pin (Zero words/text at pointer) */}
              <View style={styles.mapContainer}>
                <View style={styles.mapGridBackground}>
                  <View style={styles.mapRoadH} />
                  <View style={styles.mapRoadV} />
                  <View style={styles.mapBlock1} />
                  <View style={styles.mapBlock2} />
                </View>

                {/* Pure Pinpoint Needle */}
                <View style={styles.purePinWrapper} pointerEvents="none">
                  <View style={styles.purePinHead}>
                    <View style={styles.purePinDot} />
                  </View>
                  <View style={styles.purePinTip} />
                </View>

                {/* Nudge Controls */}
                <View style={styles.nudgeControls}>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => setStoreLat((p) => Number((p + 0.0003).toFixed(6)))}>
                    <Text style={styles.nudgeArrow}>▲</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <TouchableOpacity style={styles.nudgeBtn} onPress={() => setStoreLng((p) => Number((p - 0.0003).toFixed(6)))}>
                      <Text style={styles.nudgeArrow}>◀</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nudgeBtn} onPress={() => setStoreLng((p) => Number((p + 0.0003).toFixed(6)))}>
                      <Text style={styles.nudgeArrow}>▶</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => setStoreLat((p) => Number((p - 0.0003).toFixed(6)))}>
                    <Text style={styles.nudgeArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveGpsBtn}
                onPress={handleUpdateStoreCoordinates}
                disabled={savingLocation}
              >
                {savingLocation ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveGpsBtnText}>Save Storefront GPS Pin</Text>
                )}
              </TouchableOpacity>
            </View>


            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>

      {/* 3. BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('orders')}>
          <Text style={[styles.navIcon, currentTab === 'orders' && styles.navActive]}>📋</Text>
          <Text style={[styles.navText, currentTab === 'orders' && styles.navActive]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('menu')}>
          <Text style={[styles.navIcon, currentTab === 'menu' && styles.navActive]}>🍲</Text>
          <Text style={[styles.navText, currentTab === 'menu' && styles.navActive]}>Menu</Text>
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
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  storeName: { fontSize: 16, fontWeight: '800', color: '#F9FAFB' },
  storeAddress: { fontSize: 11, color: '#9CA3AF', maxWidth: 200, marginTop: 1 },
  connectionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  connectionDot: { width: 5, height: 5, borderRadius: 2.5 },
  connectionText: { fontSize: 9, fontWeight: '700' },
  storeStatusToggle: { alignItems: 'flex-end' },
  statusLabel: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#E2E8F0', marginVertical: 10 },
  emptyCard: { backgroundColor: '#1E293B', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  emptyText: { color: '#64748B', fontSize: 13 },
  orderCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 12 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderIdText: { fontSize: 14, fontWeight: '800', color: '#F3F4F6' },
  orderAmount: { fontSize: 15, fontWeight: '900', color: '#10B981' },
  customerName: { fontSize: 12, color: '#9CA3AF', marginBottom: 6 },
  orderItemsList: { backgroundColor: '#0F172A', borderRadius: 8, padding: 10, marginBottom: 10 },
  itemRow: { color: '#E2E8F0', fontSize: 12, marginVertical: 1 },
  actionRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  rejectBtn: { backgroundColor: '#475569' },
  acceptBtn: { backgroundColor: '#10B981' },
  badgePreparing: { backgroundColor: '#D97706', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeReady: { backgroundColor: '#059669', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  readyBtn: { backgroundColor: '#2563EB', marginTop: 4 },
  assignedRiderText: { color: '#60A5FA', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  handoverBtn: { backgroundColor: '#059669' },
  menuItemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 14, borderRadius: 12, marginBottom: 10 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#F8FAFC' },
  itemPrice: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  stockStatus: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', backgroundColor: '#1E293B', padding: 14, borderRadius: 12 },
  metricLabel: { fontSize: 11, color: '#94A3B8' },
  metricValue: { fontSize: 20, fontWeight: '900', color: '#34D399', marginTop: 4 },
  profileCard: { backgroundColor: '#1E293B', padding: 14, borderRadius: 12 },
  profileLabel: { fontSize: 10, color: '#64748B', textTransform: 'uppercase', marginTop: 8 },
  profileValue: { fontSize: 14, color: '#E2E8F0', fontWeight: '700' },
  storeGpsCard: { backgroundColor: '#1E293B', borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 1, borderColor: '#334155' },
  storeGpsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  storeGpsTitle: { fontSize: 13, fontWeight: '800', color: '#F8FAFC' },
  storeGpsSub: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  gpsFetchBtn: { backgroundColor: '#059669', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  gpsFetchBtnText: { color: '#FFF', fontWeight: '700', fontSize: 10 },
  coordDisplayRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  coordBox: { flex: 1, backgroundColor: '#0F172A', borderRadius: 6, padding: 8, borderWidth: 1, borderColor: '#334155' },
  coordLabel: { fontSize: 9, color: '#94A3B8' },
  coordVal: { fontSize: 12, color: '#34D399', fontWeight: '700', marginTop: 2 },
  mapContainer: { height: 140, borderRadius: 10, overflow: 'hidden', position: 'relative', backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', marginBottom: 10 },
  mapGridBackground: { flex: 1, backgroundColor: '#0F172A' },
  mapRoadH: { position: 'absolute', top: 60, left: 0, right: 0, height: 16, backgroundColor: '#1E293B' },
  mapRoadV: { position: 'absolute', left: 140, top: 0, bottom: 0, width: 16, backgroundColor: '#1E293B' },
  mapBlock1: { position: 'absolute', top: 12, left: 20, width: 70, height: 35, backgroundColor: '#334155', borderRadius: 6 },
  mapBlock2: { position: 'absolute', bottom: 12, right: 30, width: 75, height: 35, backgroundColor: '#334155', borderRadius: 6 },
  purePinWrapper: { position: 'absolute', top: '50%', left: '50%', marginLeft: -12, marginTop: -28, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  purePinHead: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  purePinDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  purePinTip: { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#10B981', marginTop: -1 },
  nudgeControls: { position: 'absolute', bottom: 4, right: 4, alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.9)', borderRadius: 6, padding: 2, zIndex: 20 },
  nudgeBtn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', borderRadius: 4 },
  nudgeArrow: { fontSize: 9, color: '#FFF', fontWeight: '900' },
  saveGpsBtn: { backgroundColor: '#059669', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  saveGpsBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#1E293B', borderTopWidth: 1, borderTopColor: '#334155', paddingVertical: 10 },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 20, color: '#64748B' },
  navText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  navActive: { color: '#10B981', fontWeight: '800' },
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
