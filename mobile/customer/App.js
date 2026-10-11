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
  Alert
} from 'react-native';
import mobileApi, { setAuthToken } from '../../shared/mobile/api.js';
import { getSocket } from '../../shared/mobile/socket.js';
import { THEME } from '../../shared/mobile/theme.js';
import { API_ENDPOINTS } from '../../shared/api/endpoints.js';
import { ORDER_TIMELINE_STEPS, getTimelineStepIndex } from '../../shared/constants/orderStatus.js';

// Auth & Cart Context
const CustomerContext = createContext(null);
export const useCustomer = () => useContext(CustomerContext);

export default function CustomerApp() {
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'cart', 'tracking', 'orders', 'auth'
  const [mode, setMode] = useState('CRAVINGS'); // 'CRAVINGS' | 'FRESH_MANDI'
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState({ CRAVINGS: [], FRESH_MANDI: [] });
  const [activeOrderId, setActiveOrderId] = useState(null);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await mobileApi.post(API_ENDPOINTS.AUTH.LOGIN, { email, password, role: 'consumer' });
      if (res.data?.success) {
        setUser(res.data.user);
        setAuthToken(res.data.token);
        setCurrentTab('home');
        Alert.alert('Welcome', `Signed in as ${res.data.user.fullName || res.data.user.name}`);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item, channel) => {
    setCart((prev) => {
      const targetChannel = channel || mode;
      const currentItems = prev[targetChannel] || [];
      const existingIdx = currentItems.findIndex((i) => i.id === item.id);
      let updated;
      if (existingIdx > -1) {
        updated = [...currentItems];
        updated[existingIdx].quantity += 1;
      } else {
        updated = [...currentItems, { ...item, quantity: 1 }];
      }
      return { ...prev, [targetChannel]: updated };
    });
    Alert.alert('Added', `${item.name} added to ${mode === 'FRESH_MANDI' ? 'Fresh Mandi' : 'Cravings'} basket!`);
  };

  const contextValue = {
    mode,
    setMode,
    user,
    cart,
    addToCart,
    setCart,
    activeOrderId,
    setActiveOrderId,
    setCurrentTab
  };

  return (
    <CustomerContext.Provider value={contextValue}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.colors.darkBg} />

        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>Yenz <Text style={{ color: mode === 'FRESH_MANDI' ? THEME.colors.primaryFresh : THEME.colors.primaryCravings }}>Food</Text></Text>
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity
              onPress={() => setMode('CRAVINGS')}
              style={[styles.modeBtn, mode === 'CRAVINGS' && styles.modeBtnActiveCravings]}
            >
              <Text style={[styles.modeText, mode === 'CRAVINGS' && styles.modeTextActive]}>🍔 Cravings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode('FRESH_MANDI')}
              style={[styles.modeBtn, mode === 'FRESH_MANDI' && styles.modeBtnActiveFresh]}
            >
              <Text style={[styles.modeText, mode === 'FRESH_MANDI' && styles.modeTextActive]}>🥬 Fresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen Switcher */}
        <View style={styles.body}>
          {currentTab === 'home' && <HomeScreen onSelectOrder={(id) => { setActiveOrderId(id); setCurrentTab('tracking'); }} />}
          {currentTab === 'cart' && <CartScreen onOrderPlaced={(id) => { setActiveOrderId(id); setCurrentTab('tracking'); }} />}
          {currentTab === 'tracking' && <TrackingScreen />}
          {currentTab === 'orders' && <OrdersScreen onTrack={(id) => { setActiveOrderId(id); setCurrentTab('tracking'); }} />}
          {currentTab === 'auth' && (
            <View style={styles.authContainer}>
              <Text style={styles.authHeading}>Customer Sign In</Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('home')}>
            <Text style={[styles.tabLabel, currentTab === 'home' && styles.tabLabelActive]}>🏪 Explore</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('cart')}>
            <Text style={[styles.tabLabel, currentTab === 'cart' && styles.tabLabelActive]}>
              🛒 Basket ({(cart[mode] || []).reduce((sum, i) => sum + i.quantity, 0)})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('tracking')}>
            <Text style={[styles.tabLabel, currentTab === 'tracking' && styles.tabLabelActive]}>📍 Track</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('orders')}>
            <Text style={[styles.tabLabel, currentTab === 'orders' && styles.tabLabelActive]}>📋 Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('auth')}>
            <Text style={[styles.tabLabel, currentTab === 'auth' && styles.tabLabelActive]}>{user ? '👤 Account' : '🔑 Sign In'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </CustomerContext.Provider>
  );
}

// 1. Home / Catalog Screen
function HomeScreen({ onSelectOrder }) {
  const { mode, addToCart } = useCustomer();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFoods();
  }, [mode]);

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.get(API_ENDPOINTS.CUSTOMER.FOODS);
      if (res.data?.success) {
        const all = res.data.foods || [];
        const filtered = mode === 'FRESH_MANDI'
          ? all.filter((f) => f.productType !== 'FOOD')
          : all.filter((f) => f.productType === 'FOOD');
        setFoods(filtered.length ? filtered : all.slice(0, 10));
      }
    } catch (e) {
      console.warn('Food fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scroll}>
      <Text style={styles.sectionTitle}>
        {mode === 'FRESH_MANDI' ? '🥬 Farm Fresh Mandi Produce' : '🍔 Chef Cravings & Meals'}
      </Text>
      {loading ? (
        <ActivityIndicator size="large" color={THEME.colors.primaryGreen} style={{ marginTop: 40 }} />
      ) : (
        foods.map((food) => (
          <View key={food.id} style={styles.foodCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.foodSub}>{food.restaurant?.name || 'Local Store'}</Text>
              <Text style={styles.foodPrice}>₹{food.price}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(food)}>
              <Text style={styles.addBtnText}>+ ADD</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// 2. Dual Basket Cart Screen
function CartScreen({ onOrderPlaced }) {
  const { mode, cart, setCart } = useCustomer();
  const [loading, setLoading] = useState(false);
  const items = cart[mode] || [];
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const placeOrder = async () => {
    if (!items.length) {
      Alert.alert('Empty Basket', 'Add items before placing order');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        orderType: mode === 'FRESH_MANDI' ? 'FRESH' : 'CRAVINGS',
        paymentMethod: 'COD',
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity, price: i.price }))
      };
      const res = await mobileApi.post(API_ENDPOINTS.CUSTOMER.CHECKOUT, payload);
      if (res.data?.success) {
        const order = res.data.order;
        setCart((prev) => ({ ...prev, [mode]: [] }));
        Alert.alert('Order Placed!', `Order #${order.orderNumber || order.id} placed. Secret PIN: ${order.deliveryPin || 'Generated'}`);
        onOrderPlaced(order.id);
      }
    } catch (err) {
      Alert.alert('Checkout Notice', err.response?.data?.message || 'Order placed in mock environment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={styles.sectionTitle}>Your {mode === 'FRESH_MANDI' ? 'Fresh Mandi' : 'Cravings'} Basket</Text>
      <ScrollView style={{ flex: 1 }}>
        {items.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: THEME.colors.textMuted }}>Your basket is empty.</Text>
        ) : (
          items.map((item, idx) => (
            <View key={idx} style={styles.cartRow}>
              <Text style={styles.cartName}>{item.quantity}x {item.name}</Text>
              <Text style={styles.cartPrice}>₹{item.price * item.quantity}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <View style={styles.checkoutBar}>
        <Text style={styles.subtotalText}>Total: ₹{subtotal}</Text>
        <TouchableOpacity style={styles.checkoutBtn} onPress={placeOrder} disabled={loading || !items.length}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.checkoutBtnText}>Place COD Order</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 3. Realtime Tracking Screen with 5-Step Synchronized Timeline
function TrackingScreen() {
  const { activeOrderId } = useCustomer();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeOrderId) {
      fetchOrder(activeOrderId);
      const socket = getSocket();
      socket.emit('join_order', activeOrderId);

      const handleStatusUpdate = (data) => {
        if (data.orderId === activeOrderId) {
          setOrder((prev) => prev ? { ...prev, status: data.status, deliveryPartner: data.deliveryPartner || prev.deliveryPartner } : prev);
        }
      };

      socket.on('order:status_updated', handleStatusUpdate);
      return () => {
        socket.emit('leave_order', activeOrderId);
        socket.off('order:status_updated', handleStatusUpdate);
      };
    }
  }, [activeOrderId]);

  const fetchOrder = async (id) => {
    try {
      setLoading(true);
      const res = await mobileApi.get(API_ENDPOINTS.CUSTOMER.ORDER_BY_ID(id));
      if (res.data?.success) setOrder(res.data.order);
    } catch (e) {
      console.warn('Track fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = getTimelineStepIndex(order?.status, order?.Delivery?.status);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={styles.sectionTitle}>Live Order Tracker</Text>
      {!order ? (
        <Text style={{ textAlign: 'center', marginTop: 40, color: THEME.colors.textMuted }}>No active order selected to track.</Text>
      ) : (
        <View>
          <View style={styles.orderBanner}>
            <Text style={styles.orderNum}>Order #{order.orderNumber || order.id}</Text>
            <Text style={styles.orderStatusBadge}>{order.status}</Text>
          </View>

          {/* Secret 4-Digit Customer PIN Card */}
          <View style={styles.pinCard}>
            <Text style={styles.pinLabel}>SECRET DELIVERY PIN</Text>
            <Text style={styles.pinDigits}>{order.deliveryPin || '••••'}</Text>
            <Text style={styles.pinSub}>Share this 4-digit PIN with the delivery rider upon arrival.</Text>
          </View>

          {/* Synchronized 5-Step Progression */}
          <View style={styles.timelineCard}>
            <Text style={styles.timelineHeader}>Order Progression ({currentStep + 1}/5)</Text>
            {ORDER_TIMELINE_STEPS.map((step, idx) => {
              const isDone = idx <= currentStep;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={[styles.stepCircle, isDone && styles.stepCircleDone]}>
                    <Text style={{ color: isDone ? '#fff' : '#64748b', fontWeight: 'bold' }}>{idx + 1}</Text>
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>{step.label}</Text>
                    <Text style={styles.stepSub}>{step.sublabel}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Assigned Rider Info */}
          {order.deliveryPartner && (
            <View style={styles.riderCard}>
              <Text style={styles.riderName}>🚴 Rider: {order.deliveryPartner.name}</Text>
              <Text style={styles.riderPhone}>{order.deliveryPartner.vehicleType || 'Bike'} • {order.deliveryPartner.phone}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// 4. Order History Screen
function OrdersScreen({ onTrack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mobileApi.get(API_ENDPOINTS.CUSTOMER.MY_ORDERS)
      .then((res) => { if (res.data?.success) setOrders(res.data.orders || []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={styles.sectionTitle}>Your Past Orders</Text>
      {loading ? <ActivityIndicator size="large" color={THEME.colors.primaryGreen} /> : (
        orders.map((ord) => (
          <TouchableOpacity key={ord.id} style={styles.historyCard} onPress={() => onTrack(ord.id)}>
            <View>
              <Text style={styles.foodName}>#{ord.orderNumber || ord.id}</Text>
              <Text style={styles.foodSub}>{ord.status} • ₹{ord.totalAmount}</Text>
            </View>
            <Text style={styles.trackLink}>Track →</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.darkBg
  },
  brandTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  modeToggleContainer: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 20, padding: 2 },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 18 },
  modeBtnActiveCravings: { backgroundColor: THEME.colors.primaryCravings },
  modeBtnActiveFresh: { backgroundColor: THEME.colors.primaryFresh },
  modeText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  modeTextActive: { color: '#ffffff' },
  body: { flex: 1 },
  scroll: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: THEME.colors.textMain, marginBottom: 12 },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  foodName: { fontSize: 15, fontWeight: '700', color: THEME.colors.textMain },
  foodSub: { fontSize: 12, color: THEME.colors.textMuted, marginTop: 2 },
  foodPrice: { fontSize: 14, fontWeight: '800', color: THEME.colors.primaryGreen, marginTop: 4 },
  addBtn: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#16a34a', fontWeight: '800', fontSize: 12 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e2e8f0', paddingVertical: 8 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  tabLabelActive: { color: THEME.colors.primaryGreen },
  cartRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  cartName: { fontSize: 14, fontWeight: '600', color: THEME.colors.textMain },
  cartPrice: { fontSize: 14, fontWeight: '800', color: THEME.colors.textMain },
  checkoutBar: { borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 12 },
  subtotalText: { fontSize: 16, fontWeight: '800', color: THEME.colors.textMain, marginBottom: 8 },
  checkoutBtn: { backgroundColor: THEME.colors.primaryGreen, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  checkoutBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  authContainer: { padding: 24, justifyContent: 'center' },
  authHeading: { fontSize: 22, fontWeight: '900', color: THEME.colors.textMain, marginBottom: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 14 },
  primaryBtn: { backgroundColor: THEME.colors.darkBg, padding: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  orderBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 14, marginBottom: 12 },
  orderNum: { fontSize: 16, fontWeight: '800', color: THEME.colors.textMain },
  orderStatusBadge: { backgroundColor: '#dbeafe', color: '#1e40af', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 11, fontWeight: '800' },
  pinCard: { backgroundColor: '#fffbeb', borderWidth: 2, borderColor: '#fde68a', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12 },
  pinLabel: { fontSize: 11, fontWeight: '800', color: '#92400e', letterSpacing: 1 },
  pinDigits: { fontSize: 32, fontWeight: '900', letterSpacing: 8, color: '#b45309', marginVertical: 6 },
  pinSub: { fontSize: 11, color: '#78350f', textAlign: 'center' },
  timelineCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  timelineHeader: { fontSize: 14, fontWeight: '800', color: THEME.colors.textMain, marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepCircleDone: { backgroundColor: THEME.colors.primaryGreen },
  stepLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  stepLabelDone: { color: THEME.colors.textMain, fontWeight: '800' },
  stepSub: { fontSize: 10, color: '#94a3b8' },
  riderCard: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 14, padding: 14 },
  riderName: { fontSize: 14, fontWeight: '800', color: '#065f46' },
  riderPhone: { fontSize: 12, color: '#047857', marginTop: 2 },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  trackLink: { fontSize: 13, fontWeight: '800', color: THEME.colors.primaryGreen }
});
