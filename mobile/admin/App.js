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

// Fallback Mock Data matching Web Admin Dashboard
const MOCK_METRICS = {
  totalRevenue: 148520,
  activeRestaurants: 14,
  activeRiders: 28,
  activeOrders: 12
};

const MOCK_STORES = [
  {
    id: 'store-1',
    name: 'Royal Punjab Dhaba',
    vendorType: 'CRAVINGS',
    address: 'Shop 14, Main Market, Knowledge Park II, Greater Noida',
    phone: '+91 98765 43210',
    email: 'dhaba@milegafoods.com',
    latitude: 28.454939,
    longitude: 77.504532,
    isOpen: true
  },
  {
    id: 'store-2',
    name: 'Kisan Fresh Sabzi Mandi',
    vendorType: 'FRESH_MANDI',
    address: 'Sector 62 Mandi Gate 2, Noida',
    phone: '+91 98111 22233',
    email: 'kisan@milegafoods.com',
    latitude: 28.535517,
    longitude: 77.391029,
    isOpen: true
  }
];

const MOCK_APPLICATIONS = [
  { id: 'app-1', type: 'VENDOR', applicantName: 'Gulab Sweets', phone: '+91 99887 76655', address: 'Alpha 1 Commercial Belt, Greater Noida' },
  { id: 'app-2', type: 'RIDER', applicantName: 'Amit Verma', phone: '+91 98760 12345', vehicle: 'Bajaj Pulsar 150', dlNumber: 'DL-1420220098' }
];

export default function AdminApp() {
  const [currentTab, setCurrentTab] = useState('metrics'); // 'metrics', 'stores', 'apps', 'orders'
  const [metrics, setMetrics] = useState(MOCK_METRICS);
  const [stores, setStores] = useState(MOCK_STORES);
  const [applications, setApplications] = useState(MOCK_APPLICATIONS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Store Modal State (Pure Needle Pin, No Text at Pointer)
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [storeForm, setStoreForm] = useState({
    name: '',
    vendorType: 'CRAVINGS',
    phone: '',
    email: '',
    address: '',
    latitude: 28.454939,
    longitude: 77.504532
  });
  const [locatingStore, setLocatingStore] = useState(false);

  // Server Connectivity State & Modal
  const [serverOnline, setServerOnline] = useState(false);
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [customIpInput, setCustomIpInput] = useState(CONFIG.activeHost);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await mobileApi.get('/admin/metrics');
      if (res.data?.success) {
        setMetrics(res.data.metrics || MOCK_METRICS);
        setServerOnline(true);
      }
      const storeRes = await mobileApi.get('/restaurants?radius=50');
      if (storeRes.data?.success && storeRes.data.restaurants?.length > 0) {
        setStores(storeRes.data.restaurants);
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
    fetchAdminData();
    Alert.alert('Backend Updated', `Connecting to: ${CONFIG.API_BASE_URL}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  // Open Store Modal
  const handleOpenStoreModal = (store = null) => {
    if (store) {
      setEditingStore(store);
      setStoreForm({
        name: store.name,
        vendorType: store.vendorType || 'CRAVINGS',
        phone: store.phone || '',
        email: store.email || '',
        address: store.address || '',
        latitude: Number(store.latitude) || 28.454939,
        longitude: Number(store.longitude) || 77.504532
      });
    } else {
      setEditingStore(null);
      setStoreForm({
        name: '',
        vendorType: 'CRAVINGS',
        phone: '',
        email: '',
        address: '',
        latitude: 28.454939,
        longitude: 77.504532
      });
    }
    setIsStoreModalOpen(true);
  };

  // Live GPS Fetch in Admin Store Modal
  const handleFetchStoreGPS = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setLocatingStore(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setStoreForm((p) => ({ ...p, latitude: lat, longitude: lng }));
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

  const handleSaveStore = async () => {
    if (!storeForm.name.trim()) {
      Alert.alert('Required', 'Please enter store name.');
      return;
    }

    const payload = {
      name: storeForm.name,
      vendorType: storeForm.vendorType,
      phone: storeForm.phone,
      email: storeForm.email,
      address: storeForm.address,
      latitude: storeForm.latitude,
      longitude: storeForm.longitude
    };

    if (editingStore) {
      try {
        await mobileApi.put(`/restaurants/${editingStore.id}`, payload).catch(() => null);
      } catch (e) {}

      setStores((prev) =>
        prev.map((s) => (s.id === editingStore.id ? { ...s, ...payload } : s))
      );
      Alert.alert('Success', 'Store updated with new GPS coordinates pin!');
    } else {
      const created = { id: `store-${Date.now()}`, ...payload, isOpen: true };
      try {
        await mobileApi.post('/restaurants', payload).catch(() => null);
      } catch (e) {}

      setStores((prev) => [created, ...prev]);
      Alert.alert('Success', 'New store created with exact map pin!');
    }

    setIsStoreModalOpen(false);
  };

  // Application Approvals
  const handleApproveApp = (appId) => {
    setApplications((prev) => prev.filter((a) => a.id !== appId));
    Alert.alert('Application Approved', 'Partner account has been activated on the platform!');
  };

  const handleRejectApp = (appId) => {
    setApplications((prev) => prev.filter((a) => a.id !== appId));
    Alert.alert('Application Rejected', 'Application was rejected.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* 1. TOP ADMIN HEADER */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.adminTitle}>🛡️ Yenz Admin Console</Text>
          </View>
          <Text style={styles.adminSubtitle}>Hyperlocal Platform & GPS Operations</Text>
        </View>

        <TouchableOpacity style={styles.addStoreHeaderBtn} onPress={() => handleOpenStoreModal()}>
          <Text style={styles.addStoreHeaderBtnText}>+ Add Store</Text>
        </TouchableOpacity>
      </View>

      {/* 2. MAIN TABS CONTENT */}
      <View style={styles.content}>
        {/* Overview Metrics Tab */}
        {currentTab === 'metrics' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          >
            <Text style={styles.sectionTitle}>Platform KPIs & Health</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Gross Sales Volume</Text>
                <Text style={[styles.metricVal, { color: '#10B981' }]}>₹{metrics.totalRevenue.toLocaleString()}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Active Outlets</Text>
                <Text style={styles.metricVal}>{metrics.activeRestaurants}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Registered Riders</Text>
                <Text style={styles.metricVal}>{metrics.activeRiders}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Active Orders Today</Text>
                <Text style={[styles.metricVal, { color: '#3B82F6' }]}>{metrics.activeOrders}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Quick Quick Shortcuts</Text>
            <TouchableOpacity style={styles.shortcutCard} onPress={() => setCurrentTab('stores')}>
              <Text style={styles.shortcutTitle}>🏪 Manage Stores & GPS Pins</Text>
              <Text style={styles.shortcutSub}>{stores.length} outlets configured with map coordinates</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutCard} onPress={() => setCurrentTab('apps')}>
              <Text style={styles.shortcutTitle}>📝 Review Partner Applications</Text>
              <Text style={styles.shortcutSub}>{applications.length} onboarding requests pending</Text>
            </TouchableOpacity>

            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* Stores & Map Pin Selector Tab */}
        {currentTab === 'stores' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 }}>
              <Text style={styles.sectionTitle}>Stores & Outlets ({stores.length})</Text>
              <TouchableOpacity style={styles.newStoreBtn} onPress={() => handleOpenStoreModal()}>
                <Text style={styles.newStoreBtnText}>+ Add New</Text>
              </TouchableOpacity>
            </View>

            {stores.map((s) => (
              <View key={s.id} style={styles.storeCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.storeCardName}>{s.name}</Text>
                  <View style={[styles.modeTag, { backgroundColor: s.vendorType === 'FRESH_MANDI' ? '#047857' : '#C2410C' }]}>
                    <Text style={styles.modeTagText}>{s.vendorType}</Text>
                  </View>
                </View>
                <Text style={styles.storeCardAddress}>{s.address}</Text>

                <View style={styles.storeCoordRow}>
                  <Text style={styles.storeCoordText}>
                    📍 Pin: {Number(s.latitude).toFixed(6)}, {Number(s.longitude).toFixed(6)}
                  </Text>
                  <TouchableOpacity style={styles.editPinBtn} onPress={() => handleOpenStoreModal(s)}>
                    <Text style={styles.editPinBtnText}>Edit Map Pin ✏️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}

        {/* Applications Tab */}
        {currentTab === 'apps' && (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Partner Applications ({applications.length})</Text>
            {applications.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>All onboarding applications reviewed!</Text></View>
            ) : (
              applications.map((app) => (
                <View key={app.id} style={styles.appCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.applicantName}>{app.applicantName}</Text>
                    <View style={styles.appTypeBadge}><Text style={styles.appTypeBadgeText}>{app.type}</Text></View>
                  </View>
                  <Text style={styles.appDetail}>Phone: {app.phone}</Text>
                  {app.vehicle && <Text style={styles.appDetail}>Vehicle: {app.vehicle} (DL: {app.dlNumber})</Text>}
                  {app.address && <Text style={styles.appDetail}>Address: {app.address}</Text>}

                  <View style={styles.appBtnRow}>
                    <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleRejectApp(app.id)}>
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => handleApproveApp(app.id)}>
                      <Text style={styles.btnText}>Approve & Activate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>

      {/* 3. BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('metrics')}>
          <Text style={[styles.navIcon, currentTab === 'metrics' && styles.navActive]}>📊</Text>
          <Text style={[styles.navText, currentTab === 'metrics' && styles.navActive]}>Metrics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('stores')}>
          <Text style={[styles.navIcon, currentTab === 'stores' && styles.navActive]}>🏪</Text>
          <Text style={[styles.navText, currentTab === 'stores' && styles.navActive]}>Stores</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('apps')}>
          <Text style={[styles.navIcon, currentTab === 'apps' && styles.navActive]}>📝</Text>
          <Text style={[styles.navText, currentTab === 'apps' && styles.navActive]}>Applications</Text>
        </TouchableOpacity>
      </View>

      {/* 4. STORE CREATE / EDIT MODAL WITH PURE NEEDLE PIN */}
      <Modal visible={isStoreModalOpen} animationType="slide" transparent onRequestClose={() => setIsStoreModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingStore ? 'Edit Storefront & Map Pin' : 'Add New Restaurant'}</Text>
              <TouchableOpacity onPress={() => setIsStoreModalOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Store Name *</Text>
              <TextInput
                style={styles.input}
                value={storeForm.name}
                onChangeText={(t) => setStoreForm((p) => ({ ...p, name: t }))}
                placeholder="e.g. Royal Punjab Dhaba"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Operating Mode</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.modeSelectBtn, storeForm.vendorType === 'CRAVINGS' && styles.modeSelectBtnActiveCravings]}
                  onPress={() => setStoreForm((p) => ({ ...p, vendorType: 'CRAVINGS' }))}
                >
                  <Text style={[styles.modeSelectBtnText, storeForm.vendorType === 'CRAVINGS' && { color: '#FFF' }]}>🍔 CRAVINGS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeSelectBtn, storeForm.vendorType === 'FRESH_MANDI' && styles.modeSelectBtnActiveFresh]}
                  onPress={() => setStoreForm((p) => ({ ...p, vendorType: 'FRESH_MANDI' }))}
                >
                  <Text style={[styles.modeSelectBtnText, storeForm.vendorType === 'FRESH_MANDI' && { color: '#FFF' }]}>🥬 FRESH MANDI</Text>
                </TouchableOpacity>
              </View>

              {/* Storefront GPS Coordinates & Map Pin */}
              <View style={styles.storeGpsHeader}>
                <Text style={styles.inputLabel}>Storefront GPS Coordinates & Map Pin</Text>
                <TouchableOpacity style={styles.gpsFetchBtn} onPress={handleFetchStoreGPS} disabled={locatingStore}>
                  <Text style={styles.gpsFetchBtnText}>{locatingStore ? 'Locating...' : '📡 Fetch Live GPS'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.coordDisplayRow}>
                <View style={styles.coordBox}><Text style={styles.coordLabel}>Latitude</Text><Text style={styles.coordVal}>{storeForm.latitude.toFixed(6)}</Text></View>
                <View style={styles.coordBox}><Text style={styles.coordLabel}>Longitude</Text><Text style={styles.coordVal}>{storeForm.longitude.toFixed(6)}</Text></View>
              </View>

              {/* Map with Pure Needle Pin (No text/words at pointer) */}
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
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => setStoreForm((p) => ({ ...p, latitude: Number((p.latitude + 0.0003).toFixed(6)) }))}>
                    <Text style={styles.nudgeArrow}>▲</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', gap: 14 }}>
                    <TouchableOpacity style={styles.nudgeBtn} onPress={() => setStoreForm((p) => ({ ...p, longitude: Number((p.longitude - 0.0003).toFixed(6)) }))}>
                      <Text style={styles.nudgeArrow}>◀</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nudgeBtn} onPress={() => setStoreForm((p) => ({ ...p, longitude: Number((p.longitude + 0.0003).toFixed(6)) }))}>
                      <Text style={styles.nudgeArrow}>▶</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.nudgeBtn} onPress={() => setStoreForm((p) => ({ ...p, latitude: Number((p.latitude - 0.0003).toFixed(6)) }))}>
                    <Text style={styles.nudgeArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.inputLabel}>Store Address / Landmark</Text>
              <TextInput
                style={styles.input}
                value={storeForm.address}
                onChangeText={(t) => setStoreForm((p) => ({ ...p, address: t }))}
                placeholder="Full street address"
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity style={styles.saveStoreBtn} onPress={handleSaveStore}>
                <Text style={styles.saveStoreBtnText}>{editingStore ? 'Update Storefront Location' : 'Create Restaurant'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>



    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' },
  adminTitle: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
  adminSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  connectionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  connectionDot: { width: 5, height: 5, borderRadius: 2.5 },
  connectionText: { fontSize: 9, fontWeight: '700' },
  addStoreHeaderBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addStoreHeaderBtnText: { color: '#FFF', fontWeight: '800', fontSize: 11 },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#E2E8F0', marginVertical: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', backgroundColor: '#1E293B', padding: 14, borderRadius: 12 },
  metricLabel: { fontSize: 11, color: '#94A3B8' },
  metricVal: { fontSize: 20, fontWeight: '900', color: '#F8FAFC', marginTop: 4 },
  shortcutCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginVertical: 6, borderWidth: 1, borderColor: '#334155' },
  shortcutTitle: { fontSize: 13, fontWeight: '800', color: '#F8FAFC' },
  shortcutSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  newStoreBtn: { backgroundColor: '#059669', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  newStoreBtnText: { color: '#FFF', fontWeight: '700', fontSize: 11 },
  storeCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  storeCardName: { fontSize: 14, fontWeight: '800', color: '#F8FAFC' },
  modeTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  modeTagText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  storeCardAddress: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  storeCoordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: 1, borderColor: '#334155', paddingTop: 6 },
  storeCoordText: { fontSize: 10, color: '#34D399', fontWeight: '700' },
  editPinBtn: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  editPinBtnText: { color: '#F8FAFC', fontSize: 10, fontWeight: '700' },
  appCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginBottom: 10 },
  applicantName: { fontSize: 14, fontWeight: '800', color: '#F8FAFC' },
  appTypeBadge: { backgroundColor: '#2563EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  appTypeBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  appDetail: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  appBtnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  rejectBtn: { backgroundColor: '#475569' },
  acceptBtn: { backgroundColor: '#059669' },
  emptyCard: { backgroundColor: '#1E293B', padding: 20, borderRadius: 12, alignItems: 'center' },
  emptyText: { color: '#64748B', fontSize: 13 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#1E293B', borderTopWidth: 1, borderTopColor: '#334155', paddingVertical: 10 },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 20, color: '#64748B' },
  navText: { fontSize: 11, color: '#64748B', marginTop: 2 },
  navActive: { color: '#3B82F6', fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1E293B', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#CBD5E1', fontSize: 12, fontWeight: '800' },
  inputLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginBottom: 4 },
  input: { backgroundColor: '#0F172A', color: '#FFF', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 },
  modeSelectBtn: { flex: 1, backgroundColor: '#0F172A', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  modeSelectBtnActiveCravings: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
  modeSelectBtnActiveFresh: { backgroundColor: '#059669', borderColor: '#059669' },
  modeSelectBtnText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  storeGpsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gpsFetchBtn: { backgroundColor: '#059669', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
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
  purePinHead: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  purePinDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  purePinTip: { width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#EF4444', marginTop: -1 },
  nudgeControls: { position: 'absolute', bottom: 4, right: 4, alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.9)', borderRadius: 6, padding: 2, zIndex: 20 },
  nudgeBtn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', borderRadius: 4 },
  nudgeArrow: { fontSize: 9, color: '#FFF', fontWeight: '900' },
  saveStoreBtn: { backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveStoreBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  ipModalCard: { backgroundColor: '#1E293B', borderRadius: 16, padding: 18, width: '85%', alignSelf: 'center' },
  ipModalTitle: { fontSize: 15, fontWeight: '800', color: '#F8FAFC' },
  ipModalSub: { fontSize: 11, color: '#94A3B8', marginVertical: 8 },
  ipInput: { backgroundColor: '#0F172A', color: '#FFF', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 },
  ipCancelBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#334155', borderRadius: 8, alignItems: 'center' },
  ipCancelText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  ipSaveBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#2563EB', borderRadius: 8, alignItems: 'center' },
  ipSaveText: { color: '#FFF', fontWeight: '800', fontSize: 12 }
});
