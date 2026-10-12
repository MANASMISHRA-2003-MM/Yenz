import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import axios from 'axios';

const { width } = Dimensions.get('window');

// ==========================================
// 1. DESIGN TOKENS (MIRRORING WEBSITE index.css)
// ==========================================
export const THEME = {
  // Backgrounds & Neutrals
  pageBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  textMain: '#001E2B',
  textMuted: '#5C6C75',
  textSubtle: '#889397',

  // Cravings Shopping Channel (Vibrant Coral / Crimson)
  cravings: {
    primary: 'rgb(229, 27, 75)',
    primaryHex: '#E51B4B',
    softBg: '#FFF0F3',
    softBorder: '#FFC4CF',
    dark: '#B90F38'
  },

  // Fresh Mandi Shopping Channel (Deep Farm Emerald)
  fresh: {
    primary: 'rgb(22, 138, 91)',
    primaryHex: '#168A5B',
    softBg: '#ECF8F1',
    softBorder: '#A7F3D0',
    dark: '#0F6945'
  },

  // Shared accents
  gold: '#F59E0B',
  greenVeg: '#16A34A',
  redNonVeg: '#E11D48'
};

// ==========================================
// 2. CONFIG & BACKEND CONNECTIVITY
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

// Reverse Geocoding Helper
async function reverseGeocode(lat, lng) {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'YenzMobileCustomerApp/1.0' }, timeout: 4000 }
    );
    if (res.data && res.data.address) {
      const a = res.data.address;
      const street = a.road || a.suburb || a.neighbourhood || a.quarter || 'Sector 62';
      const city = a.city || a.town || a.county || 'Noida';
      const state = a.state || 'Uttar Pradesh';
      const pincode = a.postcode || '201301';
      return { street, city, state, pincode, full: `${street}, ${city}` };
    }
  } catch (e) {}
  return { street: 'Sector 62 Main Market', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', full: 'Sector 62 Main Market, Noida' };
}

// Fallback Mock Data matching Web Database Schema exactly
const MOCK_RESTAURANTS = [
  {
    id: 'res-1',
    name: 'Royal Punjab Dhaba',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80',
    cuisine: ['North Indian', 'Tandoori', 'Biryani'],
    rating: 4.8,
    deliveryTime: '20–25 min',
    distance: '1.4 km',
    vendorType: 'CRAVINGS',
    isOpen: true,
    hasDeals: true
  },
  {
    id: 'res-2',
    name: 'Bikaner Sweets & Chaat',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    cuisine: ['Street Food', 'Snacks', 'Desserts'],
    rating: 4.6,
    deliveryTime: '15–20 min',
    distance: '0.8 km',
    vendorType: 'CRAVINGS',
    isOpen: true,
    hasDeals: false
  },
  {
    id: 'res-3',
    name: 'Kisan Fresh Sabzi Mandi',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
    cuisine: ['Organic Farm', 'Vegetables', 'Daily Mandi'],
    rating: 4.9,
    deliveryTime: '10–15 min',
    distance: '1.1 km',
    vendorType: 'FRESH_MANDI',
    isOpen: true,
    hasDeals: true
  },
  {
    id: 'res-4',
    name: 'Green Orchard Organic Store',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80',
    cuisine: ['Fresh Fruits', 'Exotics', 'Farm Produce'],
    rating: 4.7,
    deliveryTime: '15–25 min',
    distance: '1.8 km',
    vendorType: 'FRESH_MANDI',
    isOpen: true,
    hasDeals: true
  }
];

const MOCK_FOODS = [
  {
    id: 'food-1',
    name: 'Paneer Butter Masala',
    description: 'Cottage cheese simmered in rich creamy tomato and butter gravy',
    price: 240,
    isVeg: true,
    rating: 4.8,
    category: 'North Indian',
    prepTime: '20 min',
    mode: 'CRAVINGS',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'food-2',
    name: 'Dum Hyderabadi Biryani',
    description: 'Fragrant basmati rice layered with spiced paneer, saffron and herbs',
    price: 260,
    isVeg: true,
    rating: 4.9,
    category: 'Biryani',
    prepTime: '25 min',
    mode: 'CRAVINGS',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'food-3',
    name: 'Crispy Veg Burger Meal',
    description: 'Crunchy herb potato patty with lettuce, tomatoes and cheese slice',
    price: 149,
    isVeg: true,
    rating: 4.5,
    category: 'Burger',
    prepTime: '15 min',
    mode: 'CRAVINGS',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'food-4',
    name: 'Farm Fresh Tomatoes (Desi)',
    description: 'Directly sourced juicy red tomatoes from local organic farms',
    price: 38,
    isVeg: true,
    rating: 4.9,
    category: 'Vegetable',
    prepTime: '1 kg',
    mode: 'FRESH_MANDI',
    weightOptions: [
      { weightLabel: '500g', price: 20 },
      { weightLabel: '1 kg', price: 38 },
      { weightLabel: '2 kg', price: 74 }
    ],
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'food-5',
    name: 'Shimla Green Capsicum',
    description: 'Crisp green bell peppers rich in vitamins, harvest fresh',
    price: 45,
    isVeg: true,
    rating: 4.7,
    category: 'Vegetable',
    prepTime: '500g',
    mode: 'FRESH_MANDI',
    weightOptions: [
      { weightLabel: '250g', price: 24 },
      { weightLabel: '500g', price: 45 },
      { weightLabel: '1 kg', price: 85 }
    ],
    image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'food-6',
    name: 'Fresh Cow Milk (A2 Gir)',
    description: 'Pasteurized pure full cream cow milk pouches delivered cold',
    price: 66,
    isVeg: true,
    rating: 5.0,
    category: 'Dairy',
    prepTime: '1 Litre',
    mode: 'FRESH_MANDI',
    weightOptions: [
      { weightLabel: '500 ml', price: 34 },
      { weightLabel: '1 Litre', price: 66 },
      { weightLabel: '2 Litre', price: 130 }
    ],
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'food-7',
    name: 'Crispy Steamed Momos',
    description: 'Delicate stuffed vegetable dumplings with spicy red garlic dip',
    price: 120,
    isVeg: true,
    rating: 4.8,
    category: 'Momos',
    prepTime: '15 min',
    mode: 'CRAVINGS',
    image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'food-8',
    name: 'Alphonso Ratnagiri Mangoes',
    description: 'Naturally ripened carbide-free sweet golden Alphonso mangoes',
    price: 180,
    isVeg: true,
    rating: 4.9,
    category: 'Fruit',
    prepTime: '1 kg',
    mode: 'FRESH_MANDI',
    weightOptions: [
      { weightLabel: '1 kg', price: 180 },
      { weightLabel: '2 kg', price: 350 }
    ],
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&auto=format&fit=crop&q=80'
  }
];

// Categories matching Web CategoryRail 1:1
const CRAVING_CATEGORIES = [
  { id: 'ALL', label: 'All Dishes', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=300' },
  { id: 'Biryani', label: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=300' },
  { id: 'Pizza', label: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=300' },
  { id: 'Burger', label: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=300' },
  { id: 'Momos', label: 'Momos & Dimsum', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=300' },
  { id: 'North Indian', label: 'North Indian', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=300' },
  { id: 'Sweets', label: 'Sweets & Desserts', image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=300' },
  { id: 'Healthy', label: 'Salads & Healthy', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=300' }
];

const FRESH_CATEGORIES = [
  { id: 'ALL', label: 'All Mandi', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=300' },
  { id: 'Vegetable', label: 'Vegetables', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300' },
  { id: 'Fruit', label: 'Fresh Fruits', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=80&w=300' },
  { id: 'Atta', label: 'Atta & Rice', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=300' },
  { id: 'Dairy', label: 'Dairy & Eggs', image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&q=80&w=300' },
  { id: 'Oil', label: 'Oil & Spices', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=300' },
  { id: 'Snacks', label: 'Munchies', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&q=80&w=300' },
  { id: 'GROCERY_ESSENTIALS', label: 'Essentials', image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=300' }
];

// ==========================================
// 3. CONTEXT & STATE MANAGEMENT
// ==========================================
const CustomerContext = createContext(null);
export const useCustomer = () => useContext(CustomerContext);

export default function CustomerApp() {
  const [currentTab, setCurrentTab] = useState('home'); // 'home', 'search', 'cart', 'orders', 'profile'
  const [mode, setMode] = useState('CRAVINGS'); // 'CRAVINGS' | 'FRESH_MANDI'
  const [cart, setCart] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);

  // Server Status & Host Modal
  const [serverOnline, setServerOnline] = useState(false);
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [customIpInput, setCustomIpInput] = useState(CONFIG.activeHost);

  // Address State
  const [currentAddress, setCurrentAddress] = useState({
    id: 'addr-default-1',
    title: 'Home',
    street: 'Sector 62, Main Market',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    phone: '+91 98765 43210',
    latitude: 28.535517,
    longitude: 77.391029
  });
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Database Data State
  const [foods, setFoods] = useState(MOCK_FOODS);
  const [restaurants, setRestaurants] = useState(MOCK_RESTAURANTS);
  const [loading, setLoading] = useState(false);

  // Filters State matching Web
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [pureVegOnly, setPureVegOnly] = useState(false);
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false);
  const [ratingFourPlus, setRatingFourPlus] = useState(false);
  const [under250Only, setUnder250Only] = useState(false);

  const isFresh = mode === 'FRESH_MANDI';
  const activeColor = isFresh ? THEME.fresh.primaryHex : THEME.cravings.primaryHex;
  const activeSoftBg = isFresh ? THEME.fresh.softBg : THEME.cravings.softBg;

  // Connectivity check on mount and mode change
  useEffect(() => {
    checkConnectionAndFetch();
  }, [mode]);

  const checkConnectionAndFetch = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.get('/foods?radius=50');
      if (res.data?.success && res.data.foods?.length > 0) {
        setFoods(res.data.foods);
        setServerOnline(true);
      } else {
        setFoods(MOCK_FOODS);
        setServerOnline(true);
      }

      const restRes = await mobileApi.get('/restaurants?radius=50');
      if (restRes.data?.success && restRes.data.restaurants?.length > 0) {
        setRestaurants(restRes.data.restaurants);
      }
    } catch (err) {
      setServerOnline(false);
      setFoods(MOCK_FOODS);
      setRestaurants(MOCK_RESTAURANTS);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBackendHost = () => {
    if (!customIpInput.trim()) return;
    CONFIG.activeHost = customIpInput.trim();
    setIsIpModalOpen(false);
    checkConnectionAndFetch();
    Alert.alert('Backend Updated', `Connecting to: ${CONFIG.API_BASE_URL}`);
  };

  // Cart Management
  const addToCart = (product, weightVariant = null) => {
    const itemKey = weightVariant ? `${product.id}-${weightVariant}` : product.id;
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.cartKey === itemKey);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      const itemPrice = weightVariant
        ? (product.weightOptions?.find((w) => w.weightLabel === weightVariant)?.price || product.price)
        : product.price;

      return [
        ...prev,
        {
          ...product,
          cartKey: itemKey,
          quantity: 1,
          selectedWeight: weightVariant,
          price: itemPrice
        }
      ];
    });
  };

  const removeFromCart = (product, weightVariant = null) => {
    const itemKey = weightVariant ? `${product.id}-${weightVariant}` : product.id;
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.cartKey === itemKey);
      if (idx > -1) {
        if (prev[idx].quantity > 1) {
          const updated = [...prev];
          updated[idx].quantity -= 1;
          return updated;
        }
        return prev.filter((item) => item.cartKey !== itemKey);
      }
      return prev;
    });
  };

  const cartItemCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);

  const contextValue = {
    mode,
    setMode,
    isFresh,
    activeColor,
    activeSoftBg,
    cart,
    addToCart,
    removeFromCart,
    cartItemCount,
    cartSubtotal,
    currentAddress,
    setCurrentAddress,
    currentTab,
    setCurrentTab,
    openAddressModal: () => setIsAddressModalOpen(true),
    activeOrder,
    setActiveOrder
  };

  return (
    <CustomerContext.Provider value={contextValue}>
      <SafeAreaView style={styles.appContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* ============================================================== */}
        {/* TOP MOBILE NAVBAR (MATCHING WEBSITE Navbar.jsx MOBILE 1:1)     */}
        {/* ============================================================== */}
        <View style={styles.navbarHeader}>
          {/* Brand Row */}
          <View style={styles.brandRow}>
            <View style={styles.brandLeft}>
              <Text style={styles.brandLogo}>
                Yenz<Text style={{ color: activeColor }}>.</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.statusBadge,
                  { backgroundColor: serverOnline ? '#ECFDF5' : '#FEF2F2', borderColor: serverOnline ? '#A7F3D0' : '#FECACA' }
                ]}
                onPress={() => setIsIpModalOpen(true)}
              >
                <View style={[styles.statusDot, { backgroundColor: serverOnline ? '#10B981' : '#EF4444' }]} />
                <Text style={[styles.statusText, { color: serverOnline ? '#065F46' : '#991B1B' }]}>
                  {serverOnline ? 'Connected' : 'Offline • Set IP'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.brandRight}>
              {/* Veg Only Toggle Switch */}
              <TouchableOpacity
                style={[styles.vegToggleBtn, pureVegOnly && styles.vegToggleBtnActive]}
                onPress={() => setPureVegOnly(!pureVegOnly)}
              >
                <View style={[styles.vegSquareIcon, { borderColor: THEME.greenVeg }]}>
                  <View style={[styles.vegDotIcon, { backgroundColor: pureVegOnly ? THEME.greenVeg : 'transparent' }]} />
                </View>
                <Text style={[styles.vegToggleText, pureVegOnly && { color: THEME.greenVeg, fontWeight: '700' }]}>
                  VEG
                </Text>
              </TouchableOpacity>

              {/* Profile Avatar */}
              <TouchableOpacity style={styles.avatarCircle} onPress={() => setCurrentTab('profile')}>
                <Text style={styles.avatarInitials}>SC</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Delivery Location Bar */}
          <TouchableOpacity style={styles.locationBar} onPress={() => setIsAddressModalOpen(true)}>
            <Text style={styles.locationPinIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationTitle} numberOfLines={1}>
                Deliver to: <Text style={{ fontWeight: '700', color: THEME.textMain }}>{currentAddress.title} - {currentAddress.street}</Text>
              </Text>
              <Text style={styles.locationSubtitle} numberOfLines={1}>
                {currentAddress.city} - {currentAddress.pincode}
              </Text>
            </View>
            <Text style={styles.locationChevron}>▾</Text>
          </TouchableOpacity>

          {/* Shopping Experience Mode Switcher (Matching ModeSwitcher.jsx) */}
          <View style={styles.modeSwitchRow}>
            <View style={styles.modeSwitcherContainer}>
              <TouchableOpacity
                style={[styles.modeTab, !isFresh && styles.modeTabActiveCravings]}
                onPress={() => setMode('CRAVINGS')}
              >
                <Text style={[styles.modeTabText, !isFresh && styles.modeTabTextActive]}>
                  🍴 Cravings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, isFresh && styles.modeTabActiveFresh]}
                onPress={() => setMode('FRESH_MANDI')}
              >
                <Text style={[styles.modeTabText, isFresh && styles.modeTabTextActive]}>
                  🍃 Fresh Mandi
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Input Bar (Matching Web fc-input) */}
          <View style={styles.searchBarContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchTextInput}
              placeholder={isFresh ? 'Search fresh vegetables, fruits, groceries...' : 'Search restaurants, biryani, burgers, desserts...'}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ============================================================== */}
        {/* ACTIVE SCREEN SWITCHER                                         */}
        {/* ============================================================== */}
        <View style={styles.screenContainer}>
          {currentTab === 'home' && (
            <HomeScreen
              foods={foods}
              restaurants={restaurants}
              mode={mode}
              isFresh={isFresh}
              activeColor={activeColor}
              activeSoftBg={activeSoftBg}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              searchQuery={searchQuery}
              pureVegOnly={pureVegOnly}
              setPureVegOnly={setPureVegOnly}
              fastDeliveryOnly={fastDeliveryOnly}
              setFastDeliveryOnly={setFastDeliveryOnly}
              ratingFourPlus={ratingFourPlus}
              setRatingFourPlus={setRatingFourPlus}
              under250Only={under250Only}
              setUnder250Only={setUnder250Only}
            />
          )}

          {currentTab === 'search' && (
            <SearchScreen
              foods={foods}
              restaurants={restaurants}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeColor={activeColor}
            />
          )}

          {currentTab === 'cart' && <CartScreen />}

          {currentTab === 'orders' && <OrdersScreen />}

          {currentTab === 'profile' && <ProfileScreen onOpenIpModal={() => setIsIpModalOpen(true)} />}
        </View>

        {/* ============================================================== */}
        {/* FLOATING STICKY BASKET BAR (Matching Web StickyBasketBar.jsx)  */}
        {/* ============================================================== */}
        {cartItemCount > 0 && currentTab !== 'cart' && (
          <View style={styles.stickyBasketWrapper}>
            <TouchableOpacity
              style={[styles.stickyBasketBar, { backgroundColor: activeColor }]}
              onPress={() => setCurrentTab('cart')}
              activeOpacity={0.9}
            >
              <View style={styles.stickyBasketLeft}>
                <Text style={styles.stickyBasketCount}>
                  🛍️ {cartItemCount} item{cartItemCount !== 1 ? 's' : ''} · ₹{cartSubtotal}
                </Text>
              </View>
              <View style={styles.stickyBasketRight}>
                <Text style={styles.stickyBasketActionText}>View basket →</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================================== */}
        {/* FIXED BOTTOM NAVIGATION DOCK (Matching MobileBottomNavigation) */}
        {/* ============================================================== */}
        <View style={styles.bottomDockContainer}>
          <TouchableOpacity style={styles.dockItem} onPress={() => setCurrentTab('home')}>
            <Text style={[styles.dockIcon, currentTab === 'home' && { color: activeColor }]}>🏠</Text>
            <Text style={[styles.dockLabel, currentTab === 'home' && { color: activeColor, fontWeight: '700' }]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dockItem} onPress={() => setCurrentTab('search')}>
            <Text style={[styles.dockIcon, currentTab === 'search' && { color: activeColor }]}>🔍</Text>
            <Text style={[styles.dockLabel, currentTab === 'search' && { color: activeColor, fontWeight: '700' }]}>Shop</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dockItem} onPress={() => setCurrentTab('orders')}>
            <Text style={[styles.dockIcon, currentTab === 'orders' && { color: activeColor }]}>⏱️</Text>
            <Text style={[styles.dockLabel, currentTab === 'orders' && { color: activeColor, fontWeight: '700' }]}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dockItem} onPress={() => setCurrentTab('profile')}>
            <Text style={[styles.dockIcon, currentTab === 'profile' && { color: activeColor }]}>👤</Text>
            <Text style={[styles.dockLabel, currentTab === 'profile' && { color: activeColor, fontWeight: '700' }]}>Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dockItem} onPress={() => setCurrentTab('cart')}>
            <View style={{ position: 'relative' }}>
              <Text style={[styles.dockIcon, currentTab === 'cart' && { color: activeColor }]}>🛍️</Text>
              {cartItemCount > 0 && (
                <View style={[styles.dockBadge, { backgroundColor: activeColor }]}>
                  <Text style={styles.dockBadgeText}>{cartItemCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.dockLabel, currentTab === 'cart' && { color: activeColor, fontWeight: '700' }]}>Cart</Text>
          </TouchableOpacity>
        </View>

        {/* Address Selection Modal */}
        <MobileAddressModal visible={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />

        {/* Backend IP Settings Modal */}
        <Modal visible={isIpModalOpen} transparent animationType="fade" onRequestClose={() => setIsIpModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.ipModalCard}>
              <Text style={styles.ipModalTitle}>⚙️ Backend Host Settings</Text>
              <Text style={styles.ipModalDesc}>
                Set the Wi-Fi IP address of your computer running the Yenz backend server:
              </Text>

              <TextInput
                style={styles.ipInputField}
                value={customIpInput}
                onChangeText={setCustomIpInput}
                placeholder="192.168.29.220"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              <View style={styles.ipActionsRow}>
                <TouchableOpacity style={styles.ipCancelBtn} onPress={() => setIsIpModalOpen(false)}>
                  <Text style={styles.ipCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ipSaveBtn, { backgroundColor: activeColor }]} onPress={handleUpdateBackendHost}>
                  <Text style={styles.ipSaveText}>Connect & Sync</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </CustomerContext.Provider>
  );
}

// =========================================================================
// 4. HOME SCREEN (MIRRORING Home.jsx 1:1)
// =========================================================================
function HomeScreen({
  foods,
  restaurants,
  mode,
  isFresh,
  activeColor,
  activeSoftBg,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  pureVegOnly,
  setPureVegOnly,
  fastDeliveryOnly,
  setFastDeliveryOnly,
  ratingFourPlus,
  setRatingFourPlus,
  under250Only,
  setUnder250Only
}) {
  const { setMode, addToCart, removeFromCart, cart } = useCustomer();
  const categories = isFresh ? FRESH_CATEGORIES : CRAVING_CATEGORIES;

  // Food Filter Logic
  const filteredFoods = useMemo(() => {
    return foods.filter((f) => {
      if (isFresh && f.mode !== 'FRESH_MANDI') return false;
      if (!isFresh && f.mode === 'FRESH_MANDI') return false;
      if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;
      if (pureVegOnly && !f.isVeg) return false;
      if (ratingFourPlus && (f.rating || 0) < 4.0) return false;
      if (under250Only && f.price > 250) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q));
      }
      return true;
    });
  }, [foods, isFresh, selectedCategory, pureVegOnly, ratingFourPlus, under250Only, searchQuery]);

  // Restaurant Filter Logic
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchMode = isFresh ? r.vendorType === 'FRESH_MANDI' : r.vendorType === 'CRAVINGS';
      if (!matchMode) return false;
      if (ratingFourPlus && (r.rating || 0) < 4.0) return false;
      return true;
    });
  }, [restaurants, isFresh, ratingFourPlus]);

  return (
    <ScrollView style={styles.pageScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

      {/* 1. Shopping Channel Banner Card (Matching Web fc-card) */}
      <View style={styles.channelWelcomeCard}>
        <View style={styles.channelWelcomeLeft}>
          <View style={[styles.channelIconBox, { backgroundColor: activeSoftBg }]}>
            <Text style={styles.channelIconText}>{isFresh ? '🍃' : '🍴'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.channelEyebrow}>Shopping channel</Text>
            <Text style={styles.channelTitle}>{isFresh ? 'Fresh Mandi' : 'Cravings'}</Text>
            <Text style={styles.channelDesc}>
              {isFresh ? 'Daily produce, fruits & grocery essentials' : 'Restaurants, dishes & meals around you'}
            </Text>
          </View>
        </View>

        <View style={styles.channelActionRow}>
          <TouchableOpacity
            style={[styles.channelSwitchBtn, !isFresh && { backgroundColor: THEME.cravings.primaryHex }]}
            onPress={() => setMode('CRAVINGS')}
          >
            <Text style={[styles.channelSwitchBtnText, !isFresh && { color: '#FFFFFF' }]}>Cravings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.channelSwitchBtn, isFresh && { backgroundColor: THEME.fresh.primaryHex }]}
            onPress={() => setMode('FRESH_MANDI')}
          >
            <Text style={[styles.channelSwitchBtnText, isFresh && { color: '#FFFFFF' }]}>Fresh Mandi</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Promotion Carousel (Matching PromotionCarousel.jsx) */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoCarouselRail}>
        {/* Slide 1 */}
        <View style={[styles.promoCard, { backgroundColor: isFresh ? '#065F46' : '#BE123C' }]}>
          <View style={styles.promoBadgePill}>
            <Text style={styles.promoBadgeText}>LIMITED OFFER</Text>
          </View>
          <Text style={styles.promoHeading}>
            {isFresh ? 'Farm Fresh Mandi Wholesale' : 'Flat 50% OFF Cravings'}
          </Text>
          <Text style={styles.promoSub}>
            {isFresh ? 'Crisp daily harvest at zero middlemen rates.' : 'Enjoy delicious restaurant meals in 20 mins.'}
          </Text>
          <Text style={styles.promoCode}>Use Code: <Text style={{ fontWeight: '800' }}>YENZ50</Text></Text>
        </View>

        {/* Slide 2 */}
        <View style={[styles.promoCard, { backgroundColor: '#1E293B' }]}>
          <View style={[styles.promoBadgePill, { backgroundColor: '#0284C7' }]}>
            <Text style={styles.promoBadgeText}>EXPRESS SPEED</Text>
          </View>
          <Text style={styles.promoHeading}>15–20 Mins Hyperlocal Delivery</Text>
          <Text style={styles.promoSub}>Dedicated rider fleet delivering hot and fresh at your doorstep.</Text>
          <Text style={styles.promoCode}>Doorstep Dropoff • GPS Tracked</Text>
        </View>
      </ScrollView>

      {/* 3. Featured Categories (Matching CategoryRail.jsx) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Categories</Text>
        <TouchableOpacity onPress={() => setSelectedCategory('ALL')}>
          <Text style={[styles.sectionLink, { color: activeColor }]}>View all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRail}>
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, isSelected && { borderColor: activeColor, borderWidth: 1.5 }]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Image source={{ uri: cat.image }} style={styles.categoryThumbnail} />
              <Text style={[styles.categoryLabel, isSelected && { color: activeColor, fontWeight: '700' }]} numberOfLines={1}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 4. Refine Your Selection Filters (Matching FilterRail.jsx) */}
      <View style={styles.filterSectionHeader}>
        <Text style={styles.sectionTitle}>Refine your selection</Text>
        <Text style={styles.sectionSubtitle}>Filter stores and products from the database.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRail}>
        <TouchableOpacity
          style={[styles.filterChip, fastDeliveryOnly && { backgroundColor: activeSoftBg, borderColor: activeColor }]}
          onPress={() => setFastDeliveryOnly(!fastDeliveryOnly)}
        >
          <Text style={[styles.filterChipText, fastDeliveryOnly && { color: activeColor, fontWeight: '700' }]}>
            ⚡ Fast Delivery
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, ratingFourPlus && { backgroundColor: activeSoftBg, borderColor: activeColor }]}
          onPress={() => setRatingFourPlus(!ratingFourPlus)}
        >
          <Text style={[styles.filterChipText, ratingFourPlus && { color: activeColor, fontWeight: '700' }]}>
            ⭐ Rating 4.0+
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, pureVegOnly && { backgroundColor: '#ECFDF5', borderColor: THEME.greenVeg }]}
          onPress={() => setPureVegOnly(!pureVegOnly)}
        >
          <Text style={[styles.filterChipText, pureVegOnly && { color: THEME.greenVeg, fontWeight: '700' }]}>
            🥗 Pure Veg
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, under250Only && { backgroundColor: activeSoftBg, borderColor: activeColor }]}
          onPress={() => setUnder250Only(!under250Only)}
        >
          <Text style={[styles.filterChipText, under250Only && { color: activeColor, fontWeight: '700' }]}>
            🏷️ Under ₹250
          </Text>
        </TouchableOpacity>

        {(fastDeliveryOnly || ratingFourPlus || pureVegOnly || under250Only || selectedCategory !== 'ALL') && (
          <TouchableOpacity
            style={styles.filterResetChip}
            onPress={() => {
              setFastDeliveryOnly(false);
              setRatingFourPlus(false);
              setPureVegOnly(false);
              setUnder250Only(false);
              setSelectedCategory('ALL');
            }}
          >
            <Text style={styles.filterResetText}>✕ Reset</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 5. Quick Basket Builder (Matching Web BuildBasketWidget in Fresh Mandi) */}
      {isFresh && (
        <View style={styles.bundleWidgetCard}>
          <View style={styles.bundleHeaderRow}>
            <Text style={styles.bundleTitle}>🧺 1-Click Mandi Bundles</Text>
            <Text style={styles.bundleSub}>Pre-weighed kitchen combos</Text>
          </View>
          <View style={styles.bundleItemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bundleItemName}>🥔 Daily Sabzi Trio (Potato + Tomato + Onion)</Text>
              <Text style={styles.bundleItemDesc}>1 kg each fresh harvest · ₹89 total</Text>
            </View>
            <TouchableOpacity
              style={[styles.bundleAddBtn, { backgroundColor: THEME.fresh.primaryHex }]}
              onPress={() => {
                addToCart(foods[3] || MOCK_FOODS[3]);
                Alert.alert('Bundle Added', 'Daily Sabzi Trio added to your fresh basket!');
              }}
            >
              <Text style={styles.bundleAddBtnText}>+ Add Bundle</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 6. Top Picks Near You (Matching RestaurantCard.jsx) */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            {isFresh ? 'Top fresh stores near you' : 'Top picks near you'}
          </Text>
          <Text style={styles.sectionSubtitle}>Verified stores and outlets.</Text>
        </View>
        <TouchableOpacity>
          <Text style={[styles.sectionLink, { color: activeColor }]}>View all →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.restaurantsRail}>
        {filteredRestaurants.map((store) => (
          <View key={store.id} style={styles.storeCard}>
            <View style={styles.storeImageContainer}>
              <Image source={{ uri: store.image }} style={styles.storeBannerImg} />
              <View style={[styles.storeTypeBadge, { backgroundColor: isFresh ? THEME.fresh.primaryHex : THEME.cravings.primaryHex }]}>
                <Text style={styles.storeTypeBadgeText}>{isFresh ? 'FRESH MANDI' : 'RESTAURANT'}</Text>
              </View>
              {store.hasDeals && (
                <View style={styles.storeDealsBadge}>
                  <Text style={styles.storeDealsBadgeText}>🏷️ Deals available</Text>
                </View>
              )}
            </View>

            <View style={styles.storeBody}>
              <View style={styles.storeTitleRow}>
                <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                <View style={styles.storeRatingPill}>
                  <Text style={styles.storeRatingText}>⭐ {store.rating}</Text>
                </View>
              </View>
              <Text style={styles.storeCuisine} numberOfLines={1}>{store.cuisine?.join(' · ')}</Text>
              <View style={styles.storeMetaRow}>
                <Text style={styles.storeMetaItem}>🕒 {store.deliveryTime}</Text>
                <Text style={styles.storeMetaItem}>📍 {store.distance}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 7. Popular Dishes / Fresh Produce Grid (Matching FoodCard / FreshProductCard) */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            {isFresh ? 'Fresh produce & everyday essentials' : 'Popular dishes & meals'}
          </Text>
          <Text style={styles.sectionSubtitle}>Products fetched directly from database.</Text>
        </View>
        <Text style={styles.sectionCountBadge}>{filteredFoods.length} items</Text>
      </View>

      <View style={styles.productsGrid}>
        {filteredFoods.map((item) => {
          const cartItem = cart.find((c) => c.id === item.id);
          const quantity = cartItem?.quantity || 0;

          return (
            <View key={item.id} style={styles.productCard}>
              <View style={styles.productImgContainer}>
                <Image source={{ uri: item.image }} style={styles.productImg} resizeMode="contain" />
                
                {/* Indicator Badge: Veg/Non-Veg or Leaf */}
                {isFresh ? (
                  <View style={styles.freshBadge}>
                    <Text style={styles.freshBadgeText}>🍃 Fresh today</Text>
                  </View>
                ) : (
                  <View style={styles.vegIndicatorPill}>
                    <View style={[styles.vegSquareIcon, { borderColor: item.isVeg ? THEME.greenVeg : THEME.redNonVeg }]}>
                      <View style={[styles.vegDotIcon, { backgroundColor: item.isVeg ? THEME.greenVeg : THEME.redNonVeg }]} />
                    </View>
                    <Text style={styles.vegIndicatorLabel}>{item.isVeg ? 'VEG' : 'NON-VEG'}</Text>
                  </View>
                )}

                {item.rating && (
                  <View style={styles.ratingBadgeTop}>
                    <Text style={styles.ratingBadgeTopText}>⭐ {item.rating}</Text>
                  </View>
                )}
              </View>

              <View style={styles.productContent}>
                <Text style={styles.productTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>

                {/* Weight Variant Buttons if Fresh Produce */}
                {isFresh && item.weightOptions?.length > 0 && (
                  <View style={styles.weightPillRow}>
                    {item.weightOptions.map((w, idx) => (
                      <View key={idx} style={styles.weightChip}>
                        <Text style={styles.weightChipText}>{w.weightLabel}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.productFooterRow}>
                  <View>
                    <Text style={styles.productPrice}>₹{item.price}</Text>
                    {item.prepTime && <Text style={styles.productPrepTime}>{item.prepTime}</Text>}
                  </View>

                  {quantity > 0 ? (
                    <View style={[styles.qtyStepper, { backgroundColor: activeColor }]}>
                      <TouchableOpacity style={styles.stepperActionBtn} onPress={() => removeFromCart(item)}>
                        <Text style={styles.stepperActionBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperCountText}>{quantity}</Text>
                      <TouchableOpacity style={styles.stepperActionBtn} onPress={() => addToCart(item)}>
                        <Text style={styles.stepperActionBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addBtn, { borderColor: isFresh ? THEME.fresh.softBorder : THEME.cravings.softBorder, backgroundColor: activeSoftBg }]}
                      onPress={() => addToCart(item)}
                    >
                      <Text style={[styles.addBtnLabel, { color: activeColor }]}>+ ADD</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* 8. Channel Switch Bottom Promo */}
      <View style={styles.channelBottomCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.channelBottomTitle}>
            {isFresh ? 'Craving a hot restaurant meal?' : 'Need fresh vegetables or groceries?'}
          </Text>
          <Text style={styles.channelBottomDesc}>
            Switch between shopping channels without losing your saved cart architecture.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.channelBottomBtn, { backgroundColor: isFresh ? THEME.cravings.primaryHex : THEME.fresh.primaryHex }]}
          onPress={() => setMode(isFresh ? 'CRAVINGS' : 'FRESH_MANDI')}
        >
          <Text style={styles.channelBottomBtnText}>
            {isFresh ? 'Explore Cravings →' : 'Explore Fresh Mandi →'}
          </Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// =========================================================================
// 5. SEARCH SCREEN (MIRRORING SearchPage.jsx)
// =========================================================================
function SearchScreen({ foods, restaurants, searchQuery, setSearchQuery, activeColor }) {
  const { addToCart, cart } = useCustomer();

  const results = useMemo(() => {
    if (!searchQuery.trim()) return foods;
    const q = searchQuery.toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q) || (f.category && f.category.toLowerCase().includes(q)));
  }, [foods, searchQuery]);

  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={styles.pageTitleHeading}>
        {searchQuery ? `Results for "${searchQuery}" (${results.length})` : 'All Products & Dishes'}
      </Text>

      <View style={{ gap: 12, marginTop: 8 }}>
        {results.map((item) => {
          const inCart = cart.find((c) => c.id === item.id);
          return (
            <View key={item.id} style={styles.searchItemCard}>
              <Image source={{ uri: item.image }} style={styles.searchItemThumb} />
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={styles.searchItemName}>{item.name}</Text>
                <Text style={styles.searchItemDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.searchItemPrice}>₹{item.price}</Text>
              </View>
              <TouchableOpacity
                style={[styles.searchAddBtn, { backgroundColor: inCart ? activeColor : '#F1F5F9' }]}
                onPress={() => addToCart(item)}
              >
                <Text style={[styles.searchAddBtnText, { color: inCart ? '#FFFFFF' : THEME.textMain }]}>
                  {inCart ? `In Cart (${inCart.quantity})` : '+ Add'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// =========================================================================
// 6. CART / CHECKOUT SCREEN (MIRRORING CartPage.jsx & CheckoutPage.jsx)
// =========================================================================
function CartScreen() {
  const { cart, cartSubtotal, addToCart, removeFromCart, currentAddress, openAddressModal, setActiveOrder, setCurrentTab, activeColor } = useCustomer();
  const [ordering, setOrdering] = useState(false);
  const deliveryFee = 35;
  const grandTotal = cartSubtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before placing order.');
      return;
    }

    setOrdering(true);
    try {
      const payload = {
        items: cart.map((i) => ({ foodId: i.id, quantity: i.quantity, price: i.price })),
        deliveryAddress: `${currentAddress.street}, ${currentAddress.city} - ${currentAddress.pincode}`,
        dropLat: currentAddress.latitude,
        dropLng: currentAddress.longitude,
        totalAmount: grandTotal,
        paymentMethod: 'CASH_ON_DELIVERY'
      };

      const res = await mobileApi.post('/orders', payload).catch(() => null);
      const orderId = res?.data?.order?.id || `ORD-${Date.now().toString().slice(-6)}`;

      setActiveOrder({
        id: orderId,
        items: cart,
        total: grandTotal,
        address: payload.deliveryAddress,
        status: 'CONFIRMED',
        pin: '4821',
        createdAt: new Date().toLocaleTimeString()
      });

      Alert.alert(
        '🎉 Order Confirmed!',
        `Order #${orderId} placed successfully. Delivery Partner PIN: 4821.`
      );
      setCurrentTab('orders');
    } finally {
      setOrdering(false);
    }
  };

  if (cart.length === 0) {
    return (
      <View style={styles.emptyView}>
        <Text style={styles.emptyEmoji}>🛍️</Text>
        <Text style={styles.emptyTitle}>Your Basket is Empty</Text>
        <Text style={styles.emptySub}>Add fresh vegetables or tasty restaurant dishes to continue.</Text>
        <TouchableOpacity style={[styles.emptyActionBtn, { backgroundColor: activeColor }]} onPress={() => setCurrentTab('home')}>
          <Text style={styles.emptyActionBtnText}>Explore Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <Text style={styles.pageTitleHeading}>Review Basket ({cart.length} items)</Text>

      {/* Cart Items List */}
      <View style={styles.cardContainer}>
        {cart.map((item) => (
          <View key={item.cartKey || item.id} style={styles.cartRow}>
            <Image source={{ uri: item.image }} style={styles.cartThumb} />
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={styles.cartItemName}>{item.name}</Text>
              {item.selectedWeight && <Text style={styles.cartItemWeight}>{item.selectedWeight}</Text>}
              <Text style={styles.cartItemPrice}>₹{item.price} each</Text>
            </View>

            <View style={[styles.qtyStepper, { backgroundColor: activeColor }]}>
              <TouchableOpacity style={styles.stepperActionBtn} onPress={() => removeFromCart(item, item.selectedWeight)}>
                <Text style={styles.stepperActionBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperCountText}>{item.quantity}</Text>
              <TouchableOpacity style={styles.stepperActionBtn} onPress={() => addToCart(item, item.selectedWeight)}>
                <Text style={styles.stepperActionBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cartItemRowTotal}>₹{item.price * item.quantity}</Text>
          </View>
        ))}
      </View>

      {/* Delivery Address Review */}
      <View style={styles.cardContainer}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardSectionTitle}>📍 Delivery Address</Text>
          <TouchableOpacity onPress={openAddressModal}>
            <Text style={[styles.cardActionLink, { color: activeColor }]}>Change</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.addressLinePrimary}>{currentAddress.title} - {currentAddress.street}</Text>
        <Text style={styles.addressLineSecondary}>{currentAddress.city} - {currentAddress.pincode}</Text>
        <View style={styles.pinLockedBadge}>
          <Text style={styles.pinLockedText}>✓ Doorstep GPS Needle Pin Locked</Text>
        </View>
      </View>

      {/* Bill Breakdown (Matching CheckoutPage.jsx) */}
      <View style={styles.cardContainer}>
        <Text style={styles.cardSectionTitle}>Bill Details</Text>
        <View style={styles.billRow}><Text style={styles.billLabel}>Item Total</Text><Text style={styles.billValue}>₹{cartSubtotal}</Text></View>
        <View style={styles.billRow}><Text style={styles.billLabel}>Delivery Partner Fee</Text><Text style={styles.billValue}>₹{deliveryFee}</Text></View>
        <View style={styles.billRow}><Text style={styles.billLabel}>Platform Fee</Text><Text style={[styles.billValue, { color: THEME.greenVeg }]}>FREE</Text></View>
        <View style={styles.billRow}><Text style={styles.billLabel}>Govt Taxes & Packaging</Text><Text style={[styles.billValue, { color: THEME.greenVeg }]}>FREE</Text></View>
        <View style={[styles.billRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>To Pay</Text>
          <Text style={[styles.grandTotalValue, { color: activeColor }]}>₹{grandTotal}</Text>
        </View>
      </View>

      {/* Place Order CTA Button */}
      <TouchableOpacity
        style={[styles.checkoutBtn, { backgroundColor: activeColor }]}
        onPress={handlePlaceOrder}
        disabled={ordering}
      >
        {ordering ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.checkoutBtnText}>Place Order • ₹{grandTotal}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// =========================================================================
// 7. ORDERS SCREEN (MIRRORING OrderTracking.jsx & OrderHistory.jsx)
// =========================================================================
function OrdersScreen() {
  const { activeOrder, activeColor } = useCustomer();

  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={styles.pageTitleHeading}>My Orders & Live Tracking</Text>

      {activeOrder ? (
        <View style={styles.orderCard}>
          <View style={styles.orderCardHeader}>
            <View>
              <Text style={styles.orderIdText}>Order #{activeOrder.id}</Text>
              <Text style={styles.orderTimeText}>Placed at {activeOrder.createdAt}</Text>
            </View>
            <View style={styles.orderStatusBadge}>
              <Text style={styles.orderStatusBadgeText}>OUT FOR DELIVERY</Text>
            </View>
          </View>

          {/* Customer Delivery PIN Box */}
          <View style={styles.deliveryPinCard}>
            <Text style={styles.deliveryPinTitle}>Customer Delivery Security PIN</Text>
            <Text style={styles.deliveryPinValue}>{activeOrder.pin || '4821'}</Text>
            <Text style={styles.deliveryPinHint}>Give this PIN to the delivery rider at your doorstep.</Text>
          </View>

          {/* 4-Step Visual Timeline (Matching Web DeliveryTimeline.jsx) */}
          <View style={styles.timelineBox}>
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, styles.timelineDotDone]} />
              <Text style={styles.timelineLabel}>1. Order Placed</Text>
            </View>
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, styles.timelineDotDone]} />
              <Text style={styles.timelineLabel}>2. Prepared & Packed</Text>
            </View>
            <View style={styles.timelineStep}>
              <View style={[styles.timelineDot, { backgroundColor: THEME.greenVeg }]} />
              <Text style={[styles.timelineLabel, { color: THEME.greenVeg, fontWeight: '700' }]}>3. Rider on the way</Text>
            </View>
            <View style={styles.timelineStep}>
              <View style={styles.timelineDot} />
              <Text style={styles.timelineLabel}>4. Delivered</Text>
            </View>
          </View>

          {/* Doorstep Map Needle Pin Preview */}
          <View style={styles.mapCanvas}>
            <View style={styles.mapGridLineH} />
            <View style={styles.mapGridLineV} />
            <View style={styles.needlePinWrapper} pointerEvents="none">
              <View style={[styles.needlePinHead, { backgroundColor: activeColor }]}>
                <View style={styles.needlePinInnerDot} />
              </View>
              <View style={[styles.needlePinStem, { borderTopColor: activeColor }]} />
            </View>
          </View>
          <Text style={styles.mapCaption}>Live GPS Doorstep Pin</Text>
        </View>
      ) : (
        <View style={styles.emptyView}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>No Active Orders</Text>
          <Text style={styles.emptySub}>When you place an order, live GPS tracking and delivery PIN appear here.</Text>
        </View>
      )}
    </ScrollView>
  );
}

// =========================================================================
// 8. PROFILE SCREEN (MIRRORING Profile.jsx)
// =========================================================================
function ProfileScreen({ onOpenIpModal }) {
  const { currentAddress, openAddressModal, activeColor } = useCustomer();

  return (
    <ScrollView style={styles.pageScroll} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={styles.pageTitleHeading}>My Account</Text>

      <View style={styles.cardContainer}>
        <View style={styles.userProfileRow}>
          <View style={[styles.largeAvatarCircle, { backgroundColor: THEME.pageBg }]}>
            <Text style={styles.largeAvatarText}>👤</Text>
          </View>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text style={styles.profileUserName}>Shikhar Customer</Text>
            <Text style={styles.profileUserPhone}>+91 98765 43210</Text>
            <Text style={styles.profileUserEmail}>shikhar@yenz.in</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardContainer}>
        <TouchableOpacity style={styles.profileMenuRow} onPress={openAddressModal}>
          <Text style={styles.profileMenuIcon}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileMenuTitle}>Saved Doorstep Addresses</Text>
            <Text style={styles.profileMenuSub}>{currentAddress.street}, {currentAddress.city}</Text>
          </View>
          <Text style={styles.profileMenuChevron}>›</Text>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity style={styles.profileMenuRow} onPress={onOpenIpModal}>
          <Text style={styles.profileMenuIcon}>⚙️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileMenuTitle}>Backend Server Configuration</Text>
            <Text style={styles.profileMenuSub}>IP: {CONFIG.activeHost}:{CONFIG.PORT}</Text>
          </View>
          <Text style={styles.profileMenuChevron}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// =========================================================================
// 9. ADDRESS MODAL WITH INTERACTIVE NEEDLE PIN
// =========================================================================
function MobileAddressModal({ visible, onClose }) {
  const { currentAddress, setCurrentAddress } = useCustomer();
  const [street, setStreet] = useState(currentAddress.street);
  const [city, setCity] = useState(currentAddress.city);
  const [pincode, setPincode] = useState(currentAddress.pincode);
  const [locating, setLocating] = useState(false);

  const handleUseLiveGPS = async () => {
    setLocating(true);
    try {
      const geo = await reverseGeocode(28.535517, 77.391029);
      setStreet(geo.street);
      setCity(geo.city);
      setPincode(geo.pincode);
    } finally {
      setLocating(false);
    }
  };

  const handleSave = () => {
    setCurrentAddress({
      ...currentAddress,
      street,
      city,
      pincode
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.addressSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>📍 Select Delivery Doorstep</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ fontSize: 16, color: THEME.textMuted, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive Needle Pin Map simulation */}
          <View style={styles.mapCanvas}>
            <View style={styles.mapGridLineH} />
            <View style={styles.mapGridLineV} />
            <View style={styles.needlePinWrapper} pointerEvents="none">
              <View style={[styles.needlePinHead, { backgroundColor: THEME.cravings.primaryHex }]}>
                <View style={styles.needlePinInnerDot} />
              </View>
              <View style={[styles.needlePinStem, { borderTopColor: THEME.cravings.primaryHex }]} />
            </View>
          </View>

          <TouchableOpacity style={styles.gpsDetectBtn} onPress={handleUseLiveGPS} disabled={locating}>
            <Text style={styles.gpsDetectBtnText}>
              {locating ? 'Detecting GPS...' : '🎯 Pin Current Device Location'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>House / Flat / Street Name:</Text>
          <TextInput style={styles.inputField} value={street} onChangeText={setStreet} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>City:</Text>
              <TextInput style={styles.inputField} value={city} onChangeText={setCity} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Pincode:</Text>
              <TextInput style={styles.inputField} value={pincode} onChangeText={setPincode} keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity style={styles.saveAddressBtn} onPress={handleSave}>
            <Text style={styles.saveAddressBtnText}>Confirm Doorstep Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// =========================================================================
// 10. STYLES (MATCHING WEBSITE FRESHCART & KRAWING DESIGN SYSTEM)
// =========================================================================
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  screenContainer: {
    flex: 1,
    backgroundColor: THEME.pageBg
  },
  pageScroll: {
    flex: 1,
    backgroundColor: THEME.pageBg
  },

  // Navbar Header
  navbarHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 8
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  brandLogo: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.textMain,
    letterSpacing: -0.5
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700'
  },
  brandRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  vegToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border
  },
  vegToggleBtnActive: {
    borderColor: THEME.greenVeg,
    backgroundColor: '#ECFDF5'
  },
  vegSquareIcon: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  vegDotIcon: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  vegToggleText: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textMuted
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border
  },
  avatarInitials: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMain
  },

  // Location Bar
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
    gap: 6
  },
  locationPinIcon: {
    fontSize: 14
  },
  locationTitle: {
    fontSize: 12,
    color: THEME.textMuted
  },
  locationSubtitle: {
    fontSize: 11,
    color: THEME.textSubtle
  },
  locationChevron: {
    fontSize: 12,
    color: THEME.textMuted
  },

  // Mode Switcher (Matching ModeSwitcher.jsx)
  modeSwitchRow: {
    marginBottom: 8
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.pageBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 3
  },
  modeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6
  },
  modeTabActiveCravings: {
    backgroundColor: THEME.cravings.primaryHex
  },
  modeTabActiveFresh: {
    backgroundColor: THEME.fresh.primaryHex
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMuted
  },
  modeTabTextActive: {
    color: '#FFFFFF'
  },

  // Search Input Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.pageBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 6
  },
  searchTextInput: {
    flex: 1,
    fontSize: 12,
    color: THEME.textMain,
    paddingVertical: 0
  },

  // Channel Welcome Card (fc-card)
  channelWelcomeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 12
  },
  channelWelcomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  channelIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  channelIconText: {
    fontSize: 20
  },
  channelEyebrow: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '800',
    color: THEME.textSubtle,
    letterSpacing: 0.5
  },
  channelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.textMain
  },
  channelDesc: {
    fontSize: 11,
    color: THEME.textMuted
  },
  channelActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight
  },
  channelSwitchBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  channelSwitchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMain
  },

  // Promotional Banner Carousel
  promoCarouselRail: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12
  },
  promoCard: {
    width: width - 36,
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center'
  },
  promoBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6
  },
  promoBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5
  },
  promoHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4
  },
  promoSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 6
  },
  promoCode: {
    fontSize: 11,
    color: '#FFFFFF'
  },

  // Category Rail
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginTop: 12,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textMain
  },
  sectionSubtitle: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 1
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700'
  },
  sectionCountBadge: {
    fontSize: 11,
    color: THEME.textMuted,
    fontWeight: '600'
  },
  categoriesRail: {
    paddingHorizontal: 14,
    gap: 10
  },
  categoryCard: {
    width: 80,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center'
  },
  categoryThumbnail: {
    width: 66,
    height: 52,
    borderRadius: 6,
    marginBottom: 6
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textMain,
    textAlign: 'center'
  },

  // Filter Chips Rail
  filterSectionHeader: {
    paddingHorizontal: 14,
    marginTop: 14,
    marginBottom: 6
  },
  filtersRail: {
    paddingHorizontal: 14,
    gap: 8,
    paddingBottom: 6
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted
  },
  filterResetChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  filterResetText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted
  },

  // Bundle Widget
  bundleWidgetCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.fresh.softBorder,
    borderRadius: 10,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 12
  },
  bundleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  bundleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.fresh.dark
  },
  bundleSub: {
    fontSize: 10,
    color: THEME.textMuted
  },
  bundleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  bundleItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMain
  },
  bundleItemDesc: {
    fontSize: 11,
    color: THEME.textMuted
  },
  bundleAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6
  },
  bundleAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },

  // Top Stores Rail (RestaurantCard)
  restaurantsRail: {
    paddingHorizontal: 14,
    gap: 12
  },
  storeCard: {
    width: 250,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    overflow: 'hidden'
  },
  storeImageContainer: {
    height: 125,
    backgroundColor: '#F1F5F9',
    position: 'relative'
  },
  storeBannerImg: {
    width: '100%',
    height: '100%'
  },
  storeTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  storeTypeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  storeDealsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  storeDealsBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.textMain
  },
  storeBody: {
    padding: 10
  },
  storeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  storeName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: THEME.textMain
  },
  storeRatingPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4
  },
  storeRatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E'
  },
  storeCuisine: {
    fontSize: 11,
    color: THEME.textMuted,
    marginVertical: 4
  },
  storeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4
  },
  storeMetaItem: {
    fontSize: 10,
    color: THEME.textSubtle
  },

  // Products Grid (FoodCard & FreshProductCard)
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 12,
    marginTop: 4
  },
  productCard: {
    width: (width - 40) / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    overflow: 'hidden'
  },
  productImgContainer: {
    height: 120,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 6
  },
  productImg: {
    width: '100%',
    height: '100%'
  },
  freshBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: THEME.fresh.primaryHex,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4
  },
  freshBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  vegIndicatorPill: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 3
  },
  vegIndicatorLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: THEME.textMain
  },
  ratingBadgeTop: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4
  },
  ratingBadgeTopText: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.textMain
  },
  productContent: {
    padding: 8
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textMain
  },
  productDesc: {
    fontSize: 10,
    color: THEME.textMuted,
    marginVertical: 3,
    minHeight: 24
  },
  weightPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6
  },
  weightChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4
  },
  weightChipText: {
    fontSize: 8,
    fontWeight: '700',
    color: THEME.textMuted
  },
  productFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    paddingTop: 6,
    marginTop: 2
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.textMain
  },
  productPrepTime: {
    fontSize: 9,
    color: THEME.textSubtle
  },
  addBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  addBtnLabel: {
    fontSize: 10,
    fontWeight: '800'
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    overflow: 'hidden'
  },
  stepperActionBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4
  },
  stepperActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  stepperCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 2
  },

  // Bottom Channel Explore Card
  channelBottomCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    marginHorizontal: 14,
    marginTop: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  channelBottomTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textMain
  },
  channelBottomDesc: {
    fontSize: 10,
    color: THEME.textMuted,
    marginTop: 2
  },
  channelBottomBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6
  },
  channelBottomBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },

  // Sticky Floating Basket Bar (Matching StickyBasketBar.jsx)
  stickyBasketWrapper: {
    position: 'absolute',
    bottom: 66,
    left: 14,
    right: 14,
    zIndex: 50
  },
  stickyBasketBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6
  },
  stickyBasketLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stickyBasketCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  stickyBasketRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stickyBasketActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },

  // Bottom Navigation Dock (Matching MobileBottomNavigation.jsx)
  bottomDockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 58,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 40
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  dockIcon: {
    fontSize: 18,
    color: THEME.textSubtle
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.textMuted
  },
  dockBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  dockBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800'
  },

  // Generic Card Containers
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },
  pageTitleHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textMain,
    marginBottom: 10
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.textMain
  },
  cardActionLink: {
    fontSize: 11,
    fontWeight: '700'
  },
  addressLinePrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMain
  },
  addressLineSecondary: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2
  },
  pinLockedBadge: {
    marginTop: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start'
  },
  pinLockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46'
  },

  // Bill Rows
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  billLabel: {
    fontSize: 12,
    color: THEME.textMuted
  },
  billValue: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textMain
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    paddingTop: 8,
    marginTop: 4
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.textMain
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '900'
  },
  checkoutBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },

  // Cart Rows
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight
  },
  cartThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#F1F5F9'
  },
  cartItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMain
  },
  cartItemWeight: {
    fontSize: 10,
    color: THEME.textSubtle
  },
  cartItemPrice: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 1
  },
  cartItemRowTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textMain,
    width: 45,
    textAlign: 'right'
  },

  // Search Results Cards
  searchItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 8
  },
  searchItemThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F1F5F9'
  },
  searchItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMain
  },
  searchItemDesc: {
    fontSize: 10,
    color: THEME.textMuted
  },
  searchItemPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.textMain,
    marginTop: 2
  },
  searchAddBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6
  },
  searchAddBtnText: {
    fontSize: 11,
    fontWeight: '700'
  },

  // Orders Screen Elements
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 12
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
    paddingBottom: 8
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.textMain
  },
  orderTimeText: {
    fontSize: 10,
    color: THEME.textSubtle
  },
  orderStatusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4
  },
  orderStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46'
  },
  deliveryPinCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginVertical: 10
  },
  deliveryPinTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E'
  },
  deliveryPinValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 6,
    color: '#78350F',
    marginVertical: 2
  },
  deliveryPinHint: {
    fontSize: 9,
    color: '#92400E',
    textAlign: 'center'
  },
  timelineBox: {
    gap: 8,
    paddingVertical: 6
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CBD5E1'
  },
  timelineDotDone: {
    backgroundColor: THEME.greenVeg
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textMuted
  },

  // Simulated Needle Pin Map Canvas
  mapCanvas: {
    height: 120,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8
  },
  mapGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#CBD5E1'
  },
  mapGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#CBD5E1'
  },
  needlePinWrapper: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  needlePinHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  needlePinInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF'
  },
  needlePinStem: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2
  },
  mapCaption: {
    fontSize: 10,
    color: THEME.textSubtle,
    textAlign: 'center'
  },

  // Profile Screen Rows
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  largeAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  largeAvatarText: {
    fontSize: 22
  },
  profileUserName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.textMain
  },
  profileUserPhone: {
    fontSize: 11,
    color: THEME.textMuted
  },
  profileUserEmail: {
    fontSize: 10,
    color: THEME.textSubtle
  },
  profileMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10
  },
  profileMenuIcon: {
    fontSize: 16
  },
  profileMenuTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMain
  },
  profileMenuSub: {
    fontSize: 10,
    color: THEME.textSubtle
  },
  profileMenuChevron: {
    fontSize: 14,
    color: THEME.textSubtle
  },
  menuDivider: {
    height: 1,
    backgroundColor: THEME.borderLight
  },

  // Empty View
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.textMain
  },
  emptySub: {
    fontSize: 12,
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  emptyActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },

  // Modal Backdrops & Sheets
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end'
  },
  addressSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '90%'
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.textMain
  },
  gpsDetectBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10
  },
  gpsDetectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMain
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    marginTop: 6,
    marginBottom: 3
  },
  inputField: {
    backgroundColor: THEME.pageBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: THEME.textMain
  },
  saveAddressBtn: {
    backgroundColor: THEME.cravings.primaryHex,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14
  },
  saveAddressBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800'
  },

  // IP Settings Modal
  ipModalCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border
  },
  ipModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.textMain
  },
  ipModalDesc: {
    fontSize: 11,
    color: THEME.textMuted,
    marginVertical: 8
  },
  ipInputField: {
    backgroundColor: THEME.pageBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: THEME.textMain
  },
  ipActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14
  },
  ipCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  ipCancelText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '600'
  },
  ipSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6
  },
  ipSaveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  }
});
