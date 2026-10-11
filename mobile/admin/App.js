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
  RefreshControl
} from 'react-native';
import mobileApi, { setAuthToken } from '../../shared/mobile/api.js';
import { API_ENDPOINTS } from '../../shared/api/endpoints.js';

export default function AdminApp() {
  const [currentTab, setCurrentTab] = useState('metrics'); // 'metrics', 'vendors', 'riders', 'users'
  const [user, setUser] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [vendorApps, setVendorApps] = useState([]);
  const [riderApps, setRiderApps] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Private Admin Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // 1. Private Admin Login
  const handleAdminLogin = async () => {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter admin credentials');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await mobileApi.post(API_ENDPOINTS.AUTH.LOGIN, { email, password, role: 'admin' });
      if (res.data?.success) {
        const loggedUser = res.data.user;
        const role = (loggedUser?.role || '').toUpperCase();
        if (role !== 'ADMIN') {
          Alert.alert('Access Denied', 'This terminal is strictly reserved for platform administrators.');
          return;
        }
        setUser(loggedUser);
        setAuthToken(res.data.token);
        await fetchAdminData();
      }
    } catch (err) {
      Alert.alert('Authentication Failed', err.response?.data?.message || 'Invalid administrator credentials');
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. Fetch Admin Metrics and Application queues
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Metrics
      const mRes = await mobileApi.get(API_ENDPOINTS.ADMIN.METRICS);
      if (mRes.data?.success) {
        setMetrics(mRes.data.metrics || mRes.data);
      }

      // Vendor KYC Applications
      const vRes = await mobileApi.get(API_ENDPOINTS.ADMIN.VENDOR_APPS);
      if (vRes.data?.success) {
        setVendorApps(vRes.data.applications || []);
      }

      // Rider KYC Applications
      const rRes = await mobileApi.get(API_ENDPOINTS.ADMIN.RIDER_APPS);
      if (rRes.data?.success) {
        setRiderApps(rRes.data.applications || []);
      }

      // Users
      const uRes = await mobileApi.get(API_ENDPOINTS.ADMIN.USERS);
      if (uRes.data?.success) {
        setUserList(uRes.data.users || []);
      }
    } catch (err) {
      console.warn('Admin fetch warning:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminData();
  };

  // 3. Approve / Reject Vendor Application
  const handleVendorAppStatus = async (appId, newStatus) => {
    try {
      const res = await mobileApi.put(`${API_ENDPOINTS.ADMIN.VENDOR_APPS}/${appId}/status`, { status: newStatus });
      if (res.data?.success) {
        Alert.alert('Application Updated', `Vendor marked as ${newStatus}`);
        setVendorApps((prev) => prev.filter((a) => a.id !== appId));
        fetchAdminData();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update vendor application');
    }
  };

  // 4. Approve / Reject Rider Application
  const handleRiderAppStatus = async (appId, newStatus) => {
    try {
      const res = await mobileApi.put(`${API_ENDPOINTS.ADMIN.RIDER_APPS}/${appId}/status`, { status: newStatus });
      if (res.data?.success) {
        Alert.alert('Application Updated', `Rider marked as ${newStatus}`);
        setRiderApps((prev) => prev.filter((a) => a.id !== appId));
        fetchAdminData();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update rider application');
    }
  };

  // Private Admin Screen if not signed in
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0B132B" />
        <View style={styles.authContainer}>
          <View style={styles.shieldBadge}>
            <Text style={styles.shieldIcon}>🛡️</Text>
            <Text style={styles.adminTitle}>Private Admin Terminal</Text>
            <Text style={styles.adminSubtitle}>Restricted to Authorized Platform Staff</Text>
          </View>

          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Admin Email"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Root Password"
              placeholderTextColor="#64748B"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleAdminLogin}
              disabled={authLoading}
            >
              {authLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Authenticate Staff Access</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const pendingVendors = vendorApps.filter((a) => a.status === 'PENDING');
  const pendingRiders = riderApps.filter((a) => a.status === 'PENDING');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" />

      {/* Admin Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>🛡️ Yenz HQ Admin</Text>
          <Text style={styles.adminUser}>{user.fullName || 'Admin User'}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutPill}
          onPress={() => {
            setUser(null);
            setAuthToken(null);
          }}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tab Area */}
      <View style={styles.content}>
        {/* 1. Metrics & Overview */}
        {currentTab === 'metrics' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
          >
            <Text style={styles.sectionTitle}>Platform Pulse</Text>
            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Orders</Text>
                <Text style={styles.metricVal}>{metrics?.totalOrders || metrics?.orderCount || 0}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Gross Platform GMV</Text>
                <Text style={[styles.metricVal, { color: '#10B981' }]}>
                  ₹{metrics?.totalGMV || metrics?.totalRevenue || 0}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Active Trips</Text>
                <Text style={[styles.metricVal, { color: '#F59E0B' }]}>
                  {metrics?.activeDeliveries || metrics?.activeTrips || 0}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Riders Online</Text>
                <Text style={[styles.metricVal, { color: '#38BDF8' }]}>
                  {metrics?.onlineRiders || metrics?.activeRiders || 0}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Review Queues</Text>
            <View style={styles.queueRow}>
              <TouchableOpacity style={styles.queueCard} onPress={() => setCurrentTab('vendors')}>
                <Text style={styles.queueNum}>{pendingVendors.length}</Text>
                <Text style={styles.queueLabel}>Pending Vendor KYC</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.queueCard} onPress={() => setCurrentTab('riders')}>
                <Text style={styles.queueNum}>{pendingRiders.length}</Text>
                <Text style={styles.queueLabel}>Pending Rider KYC</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* 2. Vendor KYC Queue */}
        {currentTab === 'vendors' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
          >
            <Text style={styles.sectionTitle}>Pending Vendor Applications ({pendingVendors.length})</Text>
            {pendingVendors.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No pending vendor applications</Text></View>
            ) : (
              pendingVendors.map((app) => (
                <View key={app.id} style={styles.appCard}>
                  <Text style={styles.appName}>{app.restaurantName || app.name || 'Vendor Applicant'}</Text>
                  <Text style={styles.appDetail}>📍 {app.address || 'Address provided'}</Text>
                  <Text style={styles.appDetail}>📞 {app.phone || 'Phone'}</Text>
                  {app.fssaiLicense ? <Text style={styles.appDetail}>📜 FSSAI: {app.fssaiLicense}</Text> : null}

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.rejectBtn]}
                      onPress={() => handleVendorAppStatus(app.id, 'REJECTED')}
                    >
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.approveBtn]}
                      onPress={() => handleVendorAppStatus(app.id, 'APPROVED')}
                    >
                      <Text style={styles.btnText}>Approve Store</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* 3. Rider KYC Queue */}
        {currentTab === 'riders' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
          >
            <Text style={styles.sectionTitle}>Pending Delivery Applications ({pendingRiders.length})</Text>
            {pendingRiders.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No pending rider applications</Text></View>
            ) : (
              pendingRiders.map((app) => (
                <View key={app.id} style={styles.appCard}>
                  <Text style={styles.appName}>{app.fullName || 'Rider Applicant'}</Text>
                  <Text style={styles.appDetail}>🛵 {app.vehicleType || 'Bike'} • {app.vehicleNumber || 'No plate'}</Text>
                  <Text style={styles.appDetail}>📞 {app.phone || 'Phone'}</Text>
                  <Text style={styles.appDetail}>🪪 DL: {app.dlNumber || 'Pending verification'}</Text>

                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.rejectBtn]}
                      onPress={() => handleRiderAppStatus(app.id, 'REJECTED')}
                    >
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.approveBtn]}
                      onPress={() => handleRiderAppStatus(app.id, 'APPROVED')}
                    >
                      <Text style={styles.btnText}>Approve Driver</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* 4. Platform Users List */}
        {currentTab === 'users' && (
          <ScrollView
            style={styles.tabContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />}
          >
            <Text style={styles.sectionTitle}>Platform Users ({userList.length})</Text>
            {userList.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View>
                  <Text style={styles.userName}>{u.fullName || u.email}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                </View>
                <View style={styles.userRoleBadge}>
                  <Text style={styles.userRoleText}>{u.role}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Admin Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('metrics')}>
          <Text style={[styles.navIcon, currentTab === 'metrics' && styles.navActive]}>📊</Text>
          <Text style={[styles.navText, currentTab === 'metrics' && styles.navActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('vendors')}>
          <Text style={[styles.navIcon, currentTab === 'vendors' && styles.navActive]}>🏪</Text>
          <Text style={[styles.navText, currentTab === 'vendors' && styles.navActive]}>Vendors</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('riders')}>
          <Text style={[styles.navIcon, currentTab === 'riders' && styles.navActive]}>🛵</Text>
          <Text style={[styles.navText, currentTab === 'riders' && styles.navActive]}>Riders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('users')}>
          <Text style={[styles.navIcon, currentTab === 'users' && styles.navActive]}>👥</Text>
          <Text style={[styles.navText, currentTab === 'users' && styles.navActive]}>Users</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D'
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0A0F1D'
  },
  shieldBadge: {
    alignItems: 'center',
    marginBottom: 24
  },
  shieldIcon: {
    fontSize: 48,
    marginBottom: 8
  },
  adminTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC'
  },
  adminSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4
  },
  formCard: {
    backgroundColor: '#151D30',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  input: {
    backgroundColor: '#0A0F1D',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  loginBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#151D30',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#38BDF8'
  },
  adminUser: {
    fontSize: 12,
    color: '#94A3B8'
  },
  logoutPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600'
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#151D30',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8'
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 6
  },
  queueRow: {
    flexDirection: 'row',
    gap: 12
  },
  queueCard: {
    flex: 1,
    backgroundColor: '#151D30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  queueNum: {
    fontSize: 28,
    fontWeight: '800',
    color: '#38BDF8'
  },
  queueLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center'
  },
  emptyCard: {
    backgroundColor: '#151D30',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center'
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14
  },
  appCard: {
    backgroundColor: '#151D30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  appDetail: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
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
  approveBtn: {
    backgroundColor: '#10B981'
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#151D30',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC'
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2
  },
  userRoleBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  userRoleText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700'
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#151D30',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
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
    color: '#38BDF8',
    fontWeight: '700'
  }
});
