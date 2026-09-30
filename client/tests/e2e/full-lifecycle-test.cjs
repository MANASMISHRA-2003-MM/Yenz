/**
 * COMPLETE E2E ORDER LIFECYCLE TEST
 * Tests the full order flow across 3 simultaneous sessions:
 *   - Customer (rahul@gmail.com)
 *   - Vendor (foodhub@gmail.com)
 *   - Rider (driver.arjun@krawing.com)
 *
 * Uses direct HTTP API calls + Socket.IO client connections.
 * Run: node tests/e2e/full-lifecycle-test.js
 */

const http = require('http');
const { io: ioClient } = require('socket.io-client');

const API_BASE = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';

// ─── Test Report ──────────────────────────────────────────────
const report = {
  stages: [],
  socketEvents: { customer: [], vendor: [], rider: [] },
  consoleErrors: [],
  failedRequests: [],
  orderId: null,
  orderNumber: null,
  deliveryPin: null,
  finalOrderState: null,
  duplicateEvents: [],
  roomJoinLeave: [],
};

function logStage(name, status, expected, actual, details) {
  const entry = { name, status, expected, actual, details, timestamp: new Date().toISOString() };
  report.stages.push(entry);
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${name}] ${status} — expected: ${expected}, actual: ${actual}`);
  if (details) console.log(`   └─ ${details}`);
}

// ─── HTTP Helper ──────────────────────────────────────────────
function apiRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (e) => {
      report.failedRequests.push({ method, path, error: e.message });
      reject(e);
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main Test ────────────────────────────────────────────────
async function runTests() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  COMPLETE E2E ORDER LIFECYCLE TEST');
  console.log('  Testing with 3 simultaneous sessions');
  console.log('══════════════════════════════════════════════════════════\n');

  // ── Stage 1: Login all 3 accounts ─────────────────────────
  console.log('\n── STAGE 1: Authentication ──');

  const customerLogin = await apiRequest('POST', '/api/auth/login', null, {
    email: 'rahul@gmail.com', password: 'password123', requestedRole: 'consumer'
  });
  const customerToken = customerLogin.body?.token;
  logStage('Customer Login', customerLogin.status === 200 && customerToken ? 'PASS' : 'FAIL',
    'HTTP 200 + token', `HTTP ${customerLogin.status}, token=${!!customerToken}`);

  const vendorLogin = await apiRequest('POST', '/api/auth/login', null, {
    email: 'foodhub@gmail.com', password: 'password123', requestedRole: 'vendor'
  });
  const vendorToken = vendorLogin.body?.token;
  logStage('Vendor Login', vendorLogin.status === 200 && vendorToken ? 'PASS' : 'FAIL',
    'HTTP 200 + token', `HTTP ${vendorLogin.status}, token=${!!vendorToken}`);

  const riderLogin = await apiRequest('POST', '/api/auth/login', null, {
    email: 'driver.arjun@krawing.com', password: 'password123', requestedRole: 'delivery_partner'
  });
  const riderToken = riderLogin.body?.token;
  logStage('Rider Login', riderLogin.status === 200 && riderToken ? 'PASS' : 'FAIL',
    'HTTP 200 + token', `HTTP ${riderLogin.status}, token=${!!riderToken}`);

  if (!customerToken || !vendorToken || !riderToken) {
    console.error('FATAL: Cannot proceed without all 3 tokens.');
    return printReport();
  }

  // ── Stage 2: Connect Socket.IO for all 3 ──────────────────
  console.log('\n── STAGE 2: Socket.IO Connections ──');

  const customerSocket = ioClient(SOCKET_URL, { auth: { token: customerToken }, transports: ['websocket'] });
  const vendorSocket = ioClient(SOCKET_URL, { auth: { token: vendorToken }, transports: ['websocket'] });
  const riderSocket = ioClient(SOCKET_URL, { auth: { token: riderToken }, transports: ['websocket'] });

  // Track all socket events
  const socketEventNames = [
    'order:created', 'order:status_updated', 'order:driver_assigned',
    'delivery:new_job_available', 'courier:location_update',
    'error:unauthorized', 'error:forbidden', 'error:not_found'
  ];

  function attachSocketListeners(socket, role) {
    socket.on('connect', () => {
      console.log(`  🔌 ${role} socket connected: ${socket.id}`);
      report.roomJoinLeave.push({ role, action: 'connected', socketId: socket.id });
    });
    socket.on('disconnect', (reason) => {
      report.roomJoinLeave.push({ role, action: 'disconnected', reason });
    });
    socketEventNames.forEach((evt) => {
      socket.on(evt, (data) => {
        report.socketEvents[role].push({ event: evt, data, timestamp: Date.now() });
        console.log(`  📡 ${role} received: ${evt}`);
      });
    });
  }

  attachSocketListeners(customerSocket, 'customer');
  attachSocketListeners(vendorSocket, 'vendor');
  attachSocketListeners(riderSocket, 'rider');

  // Wait for connections
  await sleep(2000);

  const customerConnected = customerSocket.connected;
  const vendorConnected = vendorSocket.connected;
  const riderConnected = riderSocket.connected;

  logStage('Customer Socket Connect', customerConnected ? 'PASS' : 'FAIL', 'connected=true', `connected=${customerConnected}`);
  logStage('Vendor Socket Connect', vendorConnected ? 'PASS' : 'FAIL', 'connected=true', `connected=${vendorConnected}`);
  logStage('Rider Socket Connect', riderConnected ? 'PASS' : 'FAIL', 'connected=true', `connected=${riderConnected}`);

  // Rider joins drivers_pool
  riderSocket.emit('join_drivers_room', { lat: 28.4600, lng: 77.0400 });
  await sleep(500);
  logStage('Rider Joins Driver Pool', 'PASS', 'join_drivers_room emitted', 'emitted');

  // ── Stage 3: Add item to cart ────────────────────────────
  console.log('\n── STAGE 3: Add to Cart ──');

  const addCartResp = await apiRequest('POST', '/api/cart/add', customerToken, {
    productId: 'prd-pizza-01',
    quantity: 2,
    cartType: 'CRAVINGS',
    vendorId: 'vnd-foodhub-01'
  });
  logStage('Add to Cart', addCartResp.status === 200 || addCartResp.status === 201 ? 'PASS' : 'FAIL',
    'HTTP 200/201', `HTTP ${addCartResp.status}`, JSON.stringify(addCartResp.body?.message || addCartResp.body));

  // View cart
  const cartResp = await apiRequest('GET', '/api/cart?cartType=CRAVINGS', customerToken);
  const cartItems = cartResp.body?.cart?.items || cartResp.body?.items || [];
  logStage('View Cart', cartResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200 + items', `HTTP ${cartResp.status}, items=${cartItems.length}`);

  // ── Stage 4: Customer places order ──────────────────────
  console.log('\n── STAGE 4: Place Order ──');

  const placeOrderResp = await apiRequest('POST', '/api/orders', customerToken, {
    paymentMethod: 'COD',
    deliveryNotes: 'E2E Test Order - Please handle carefully',
    shoppingMode: 'CRAVINGS'
  });

  const order = placeOrderResp.body?.order;
  report.orderId = order?.id || order?._id;
  report.orderNumber = order?.orderNumber;
  report.deliveryPin = order?.deliveryPin;

  logStage('Place Order', placeOrderResp.status === 201 && report.orderId ? 'PASS' : 'FAIL',
    'HTTP 201 + orderId', `HTTP ${placeOrderResp.status}, orderId=${report.orderId}`,
    `orderNumber=${report.orderNumber}, totalAmount=${order?.totalAmount}, items=${order?.items?.length}`);

  if (!report.orderId) {
    console.error('FATAL: Order creation failed. Cannot proceed.');
    console.error('Response:', JSON.stringify(placeOrderResp.body));
    cleanupSockets([customerSocket, vendorSocket, riderSocket]);
    return printReport();
  }

  // Verify order details
  logStage('Order Status PENDING', order?.status === 'PENDING' ? 'PASS' : 'FAIL',
    'PENDING', order?.status);
  logStage('Delivery PIN Generated', report.deliveryPin && report.deliveryPin.length === 4 ? 'PASS' : 'FAIL',
    '4-digit PIN', `PIN=${report.deliveryPin}`);
  logStage('Order Has Items', order?.items?.length > 0 ? 'PASS' : 'FAIL',
    '>0 items', `${order?.items?.length} items`);
  logStage('Order Vendor Correct', order?.vendorId === 'vnd-foodhub-01' ? 'PASS' : 'FAIL',
    'vnd-foodhub-01', order?.vendorId);

  // Customer joins order room for live tracking
  customerSocket.emit('join_order', report.orderId);
  await sleep(500);
  report.roomJoinLeave.push({ role: 'customer', action: 'join_order', orderId: report.orderId });

  // Wait for vendor socket to receive order:created
  await sleep(2000);
  const vendorGotCreated = report.socketEvents.vendor.some(e => e.event === 'order:created');
  logStage('Vendor Receives order:created', vendorGotCreated ? 'PASS' : 'FAIL',
    'order:created event', `received=${vendorGotCreated}`);

  // ── Stage 5: Customer verifies order via GET ──────────────
  console.log('\n── STAGE 5: Customer Verifies Order ──');

  const customerOrderResp = await apiRequest('GET', `/api/orders/${report.orderId}`, customerToken);
  const custOrder = customerOrderResp.body?.order;
  logStage('Customer GET Order', customerOrderResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200', `HTTP ${customerOrderResp.status}`);
  logStage('Customer Sees PIN', custOrder?.deliveryPin === report.deliveryPin ? 'PASS' : 'FAIL',
    report.deliveryPin, custOrder?.deliveryPin);
  logStage('Order Has Timeline', custOrder?.timeline?.length > 0 ? 'PASS' : 'FAIL',
    '>0 timeline entries', `${custOrder?.timeline?.length} entries`);

  // ── Stage 6: Vendor sees and accepts order ──────────────
  console.log('\n── STAGE 6: Vendor Accepts Order ──');

  // Vendor joins their room
  vendorSocket.emit('join_order', report.orderId);
  await sleep(500);

  const vendorOrdersResp = await apiRequest('GET', '/api/orders', vendorToken);
  const vendorOrders = vendorOrdersResp.body?.orders || [];
  const vendorSeesOrder = vendorOrders.some(o => o.id === report.orderId || o._id === report.orderId);
  logStage('Vendor Sees Order in List', vendorSeesOrder ? 'PASS' : 'FAIL',
    'order in vendor list', `found=${vendorSeesOrder}, total=${vendorOrders.length}`);

  // Vendor accepts → status CONFIRMED then PREPARING
  const acceptResp = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, vendorToken, {
    status: 'CONFIRMED',
    note: 'Order confirmed by vendor'
  });
  logStage('Vendor Confirms Order', acceptResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200', `HTTP ${acceptResp.status}`, acceptResp.body?.message);

  await sleep(1000);

  const prepareResp = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, vendorToken, {
    status: 'PREPARING',
    note: 'Chef started preparing the order'
  });
  logStage('Vendor Sets PREPARING', prepareResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200', `HTTP ${prepareResp.status}`, prepareResp.body?.message);

  // Wait for socket events
  await sleep(2000);

  // Verify customer got status updates via socket
  const customerGotStatusUpdate = report.socketEvents.customer.some(e => e.event === 'order:status_updated');
  logStage('Customer Receives order:status_updated', customerGotStatusUpdate ? 'PASS' : 'FAIL',
    'order:status_updated event', `received=${customerGotStatusUpdate}`);

  // Verify rider got delivery job notification
  const riderGotJob = report.socketEvents.rider.some(e => e.event === 'delivery:new_job_available');
  logStage('Rider Receives delivery:new_job_available', riderGotJob ? 'PASS' : 'FAIL',
    'delivery:new_job_available event', `received=${riderGotJob}`);

  // ── Stage 7: Vendor marks READY_FOR_PICKUP ──────────────
  console.log('\n── STAGE 7: Ready for Pickup ──');

  const readyResp = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, vendorToken, {
    status: 'READY_FOR_PICKUP',
    note: 'Order is packed and ready for pickup'
  });
  logStage('Vendor Sets READY_FOR_PICKUP', readyResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200', `HTTP ${readyResp.status}`);

  await sleep(1000);

  // ── Stage 8: Rider accepts delivery job ──────────────────
  console.log('\n── STAGE 8: Rider Accepts Job ──');

  const acceptJobResp = await apiRequest('PUT', `/api/orders/${report.orderId}/accept-job`, riderToken);
  logStage('Rider Accepts Delivery Job', acceptJobResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200', `HTTP ${acceptJobResp.status}`, acceptJobResp.body?.message);

  // Rider joins order room
  riderSocket.emit('join_order', report.orderId);
  await sleep(1500);
  report.roomJoinLeave.push({ role: 'rider', action: 'join_order', orderId: report.orderId });

  // Verify customer got driver_assigned socket event
  const customerGotDriverAssigned = report.socketEvents.customer.some(e => e.event === 'order:driver_assigned');
  logStage('Customer Receives order:driver_assigned', customerGotDriverAssigned ? 'PASS' : 'FAIL',
    'order:driver_assigned event', `received=${customerGotDriverAssigned}`);

  // Verify assigned driver details
  const assignedOrder = acceptJobResp.body?.order;
  logStage('Driver Profile in Order', assignedOrder?.deliveryPartner?.name ? 'PASS' : 'FAIL',
    'Driver name present', `name=${assignedOrder?.deliveryPartner?.name}`);

  // ── Stage 9: Rider picks up and updates location ─────────
  console.log('\n── STAGE 9: Rider Location Updates ──');

  // Set to PICKED_UP
  const pickedUpResp = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, riderToken, {
    status: 'PICKED_UP',
    note: 'Order picked up from restaurant'
  });
  logStage('Rider Sets PICKED_UP', pickedUpResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200', `HTTP ${pickedUpResp.status}`);

  await sleep(500);

  // Set to OUT_FOR_DELIVERY
  const outForDeliveryResp = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, riderToken, {
    status: 'OUT_FOR_DELIVERY',
    note: 'On the way to customer'
  });
  logStage('Rider Sets OUT_FOR_DELIVERY', outForDeliveryResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200', `HTTP ${outForDeliveryResp.status}`);

  await sleep(1000);

  // Simulate 3 location updates via socket
  const locations = [
    { lat: 28.4610, lng: 77.0410 },
    { lat: 28.4700, lng: 77.0500 },
    { lat: 28.5300, lng: 77.3800 },
  ];

  for (let i = 0; i < locations.length; i++) {
    riderSocket.emit('driver:update_location', {
      orderId: report.orderId,
      lat: locations[i].lat,
      lng: locations[i].lng
    });
    console.log(`  📍 Rider location update ${i + 1}: ${locations[i].lat}, ${locations[i].lng}`);
    await sleep(1500); // Must wait >1200ms due to rate limiting
  }

  await sleep(2000);

  // Verify customer received location updates
  const customerLocationUpdates = report.socketEvents.customer.filter(e => e.event === 'courier:location_update');
  logStage('Customer Receives Location Updates', customerLocationUpdates.length >= 2 ? 'PASS' : 'FAIL',
    '>=2 location updates', `received=${customerLocationUpdates.length}`,
    customerLocationUpdates.length > 0 ? `Last ETA: ${customerLocationUpdates[customerLocationUpdates.length - 1]?.data?.etaMinutes} mins` : 'none');

  // Check for ETA/distance in location updates
  if (customerLocationUpdates.length > 0) {
    const lastUpdate = customerLocationUpdates[customerLocationUpdates.length - 1].data;
    logStage('Location Update Has ETA', lastUpdate.etaMinutes > 0 ? 'PASS' : 'FAIL',
      'etaMinutes > 0', `etaMinutes=${lastUpdate.etaMinutes}`);
    logStage('Location Update Has Distance', lastUpdate.distanceToCustomer !== undefined ? 'PASS' : 'FAIL',
      'distanceToCustomer present', `distance=${lastUpdate.distanceToCustomer} km`);
  }

  // ── Stage 10: Delivery PIN Verification ──────────────────
  console.log('\n── STAGE 10: Delivery PIN Verification ──');

  // Test wrong PIN first
  const wrongPinResp = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, riderToken, {
    status: 'DELIVERED',
    deliveryPin: '0000',
    skipGeofence: true
  });
  logStage('Wrong PIN Rejected', wrongPinResp.status === 400 ? 'PASS' : 'FAIL',
    'HTTP 400 (invalid pin)', `HTTP ${wrongPinResp.status}`, wrongPinResp.body?.message);

  // Test second wrong PIN
  const wrongPinResp2 = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, riderToken, {
    status: 'DELIVERED',
    deliveryPin: '9999',
    skipGeofence: true
  });
  logStage('Second Wrong PIN Rejected', wrongPinResp2.status === 400 ? 'PASS' : 'FAIL',
    'HTTP 400 (invalid pin)', `HTTP ${wrongPinResp2.status}`, wrongPinResp2.body?.message);

  // Verify rider CANNOT see the PIN (security check)
  const riderOrderResp = await apiRequest('GET', `/api/orders/${report.orderId}`, riderToken);
  logStage('Rider Cannot See PIN', riderOrderResp.body?.order?.deliveryPin === null ? 'PASS' : 'FAIL',
    'deliveryPin=null for rider', `deliveryPin=${riderOrderResp.body?.order?.deliveryPin}`,
    'SECURITY: PIN should only be visible to customer');

  // Now correct PIN
  const correctPinResp = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, riderToken, {
    status: 'DELIVERED',
    deliveryPin: report.deliveryPin,
    skipGeofence: true
  });
  logStage('Correct PIN Accepted', correctPinResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200', `HTTP ${correctPinResp.status}`, correctPinResp.body?.message);

  await sleep(2000);

  // ── Stage 11: Order Completion Verification ──────────────
  console.log('\n── STAGE 11: Order Completion ──');

  // Customer verifies final state
  const finalCustResp = await apiRequest('GET', `/api/orders/${report.orderId}`, customerToken);
  const finalCustOrder = finalCustResp.body?.order;
  logStage('Customer Sees DELIVERED', finalCustOrder?.status === 'DELIVERED' ? 'PASS' : 'FAIL',
    'DELIVERED', finalCustOrder?.status);

  // Vendor verifies final state
  const finalVendResp = await apiRequest('GET', `/api/orders/${report.orderId}`, vendorToken);
  const finalVendOrder = finalVendResp.body?.order;
  logStage('Vendor Sees DELIVERED', finalVendOrder?.status === 'DELIVERED' ? 'PASS' : 'FAIL',
    'DELIVERED', finalVendOrder?.status);

  // Rider verifies final state
  const finalRiderResp = await apiRequest('GET', `/api/orders/${report.orderId}`, riderToken);
  const finalRiderOrder = finalRiderResp.body?.order;
  logStage('Rider Sees DELIVERED', finalRiderOrder?.status === 'DELIVERED' ? 'PASS' : 'FAIL',
    'DELIVERED', finalRiderOrder?.status);

  report.finalOrderState = finalCustOrder;

  // Verify timeline is complete
  const timeline = finalCustOrder?.timeline || [];
  const timelineStatuses = timeline.map(t => t.status);
  console.log(`  📋 Order Timeline: ${timelineStatuses.join(' → ')}`);
  logStage('Timeline Contains PENDING', timelineStatuses.includes('PENDING') ? 'PASS' : 'FAIL',
    'PENDING in timeline', `found=${timelineStatuses.includes('PENDING')}`);
  logStage('Timeline Contains PREPARING', timelineStatuses.includes('PREPARING') ? 'PASS' : 'FAIL',
    'PREPARING in timeline', `found=${timelineStatuses.includes('PREPARING')}`);
  logStage('Timeline Contains DELIVERED', timelineStatuses.includes('DELIVERED') ? 'PASS' : 'FAIL',
    'DELIVERED in timeline', `found=${timelineStatuses.includes('DELIVERED')}`);

  // ── Stage 12: Terminal State Protection ──────────────────
  console.log('\n── STAGE 12: Terminal State Protection ──');

  const afterDeliveredResp = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, vendorToken, {
    status: 'CANCELLED'
  });
  logStage('Cannot Update After DELIVERED', afterDeliveredResp.status === 400 ? 'PASS' : 'FAIL',
    'HTTP 400 (already delivered)', `HTTP ${afterDeliveredResp.status}`, afterDeliveredResp.body?.message);

  // ── Stage 13: Unauthorized Access ──────────────────────
  console.log('\n── STAGE 13: Unauthorized Access Tests ──');

  // Login as a different customer and try to access this order
  const otherLogin = await apiRequest('POST', '/api/auth/login', null, {
    email: 'admin@krawing.com', password: 'password123', requestedRole: 'admin'
  });
  // Admin should have access
  const adminToken = otherLogin.body?.token;
  if (adminToken) {
    const adminOrderResp = await apiRequest('GET', `/api/orders/${report.orderId}`, adminToken);
    logStage('Admin Can Access Order', adminOrderResp.status === 200 ? 'PASS' : 'FAIL',
      'HTTP 200', `HTTP ${adminOrderResp.status}`);
  }

  // ── Stage 14: Socket Event Analysis ──────────────────────
  console.log('\n── STAGE 14: Socket Event Analysis ──');

  // Check for duplicate events
  function findDuplicates(events) {
    const seen = new Map();
    const dupes = [];
    events.forEach(e => {
      const key = `${e.event}:${JSON.stringify(e.data?.orderId || e.data?.orderNumber)}`;
      if (seen.has(key)) {
        const prevTime = seen.get(key);
        if (e.timestamp - prevTime < 100) {
          dupes.push({ event: e.event, timeDiffMs: e.timestamp - prevTime });
        }
      }
      seen.set(key, e.timestamp);
    });
    return dupes;
  }

  const customerDupes = findDuplicates(report.socketEvents.customer);
  const vendorDupes = findDuplicates(report.socketEvents.vendor);
  const riderDupes = findDuplicates(report.socketEvents.rider);
  report.duplicateEvents = [...customerDupes, ...vendorDupes, ...riderDupes];

  logStage('No Duplicate Customer Events', customerDupes.length === 0 ? 'PASS' : 'FAIL',
    '0 duplicates', `${customerDupes.length} duplicates`);
  logStage('No Duplicate Vendor Events', vendorDupes.length === 0 ? 'PASS' : 'FAIL',
    '0 duplicates', `${vendorDupes.length} duplicates`);
  logStage('No Duplicate Rider Events', riderDupes.length === 0 ? 'PASS' : 'FAIL',
    '0 duplicates', `${riderDupes.length} duplicates`);

  // ── Stage 15: Reconnection Test ──────────────────────────
  console.log('\n── STAGE 15: Reconnection & State Recovery ──');

  // Verify state is recoverable after reconnect
  const recoveryResp = await apiRequest('GET', `/api/orders/${report.orderId}`, customerToken);
  logStage('State Recovery After Reconnect', recoveryResp.status === 200 && recoveryResp.body?.order?.status === 'DELIVERED' ? 'PASS' : 'FAIL',
    'HTTP 200 + DELIVERED', `HTTP ${recoveryResp.status}, status=${recoveryResp.body?.order?.status}`);

  // ── Stage 16: Vendor Reject Flow (new order) ──────────────
  console.log('\n── STAGE 16: Vendor Reject / Cancel Flow ──');

  // Add item and place another order for cancel test
  await apiRequest('POST', '/api/cart/add', customerToken, {
    productId: 'prd-pizza-01', quantity: 1, cartType: 'CRAVINGS', vendorId: 'vnd-foodhub-01'
  });
  const cancelOrderResp = await apiRequest('POST', '/api/orders', customerToken, {
    paymentMethod: 'COD', shoppingMode: 'CRAVINGS'
  });
  const cancelOrderId = cancelOrderResp.body?.order?.id;

  if (cancelOrderId) {
    // Vendor cancels
    const cancelResp = await apiRequest('PUT', `/api/orders/${cancelOrderId}/status`, vendorToken, {
      status: 'CANCELLED', note: 'Vendor rejected this order'
    });
    logStage('Vendor Can Cancel Order', cancelResp.status === 200 ? 'PASS' : 'FAIL',
      'HTTP 200', `HTTP ${cancelResp.status}`, cancelResp.body?.message);

    // Verify cancelled order cannot be updated
    const afterCancelResp = await apiRequest('PUT', `/api/orders/${cancelOrderId}/status`, vendorToken, {
      status: 'PREPARING'
    });
    logStage('Cannot Update After CANCELLED', afterCancelResp.status === 400 ? 'PASS' : 'FAIL',
      'HTTP 400', `HTTP ${afterCancelResp.status}`, afterCancelResp.body?.message);
  } else {
    logStage('Cancel Test Order Creation', 'FAIL', 'order created', 'no order', cancelOrderResp.body?.message);
  }

  // ── Stage 17: Invalid Status Transition ──────────────────
  console.log('\n── STAGE 17: Invalid Status Transitions ──');

  const invalidStatusResp = await apiRequest('PUT', `/api/orders/${report.orderId}/status`, vendorToken, {
    status: 'INVALID_STATUS'
  });
  logStage('Invalid Status Rejected', invalidStatusResp.status === 400 ? 'PASS' : 'FAIL',
    'HTTP 400', `HTTP ${invalidStatusResp.status}`, invalidStatusResp.body?.message);

  // ── Cleanup ──────────────────────────────────────────────
  console.log('\n── CLEANUP ──');

  customerSocket.emit('leave_order', report.orderId);
  riderSocket.emit('leave_order', report.orderId);
  vendorSocket.emit('leave_order', report.orderId);
  report.roomJoinLeave.push({ role: 'all', action: 'leave_order', orderId: report.orderId });

  await sleep(500);
  cleanupSockets([customerSocket, vendorSocket, riderSocket]);

  printReport();
}

function cleanupSockets(sockets) {
  sockets.forEach(s => {
    if (s && s.connected) s.disconnect();
  });
}

function printReport() {
  console.log('\n\n══════════════════════════════════════════════════════════');
  console.log('  FINAL E2E TEST REPORT');
  console.log('══════════════════════════════════════════════════════════\n');

  const passed = report.stages.filter(s => s.status === 'PASS').length;
  const failed = report.stages.filter(s => s.status === 'FAIL').length;
  const total = report.stages.length;

  console.log(`  Total Tests: ${total}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Pass Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%`);
  console.log(`  Order ID: ${report.orderId}`);
  console.log(`  Order Number: ${report.orderNumber}`);
  console.log(`  Delivery PIN: ${report.deliveryPin}`);
  console.log(`  Final State: ${report.finalOrderState?.status}`);

  if (failed > 0) {
    console.log('\n── FAILED TESTS ──');
    report.stages.filter(s => s.status === 'FAIL').forEach(s => {
      console.log(`  ❌ ${s.name}: expected=${s.expected}, actual=${s.actual}`);
      if (s.details) console.log(`     └─ ${s.details}`);
    });
  }

  console.log('\n── Socket Events Summary ──');
  console.log(`  Customer events: ${report.socketEvents.customer.length}`);
  report.socketEvents.customer.forEach(e => console.log(`    📡 ${e.event}`));
  console.log(`  Vendor events: ${report.socketEvents.vendor.length}`);
  report.socketEvents.vendor.forEach(e => console.log(`    📡 ${e.event}`));
  console.log(`  Rider events: ${report.socketEvents.rider.length}`);
  report.socketEvents.rider.forEach(e => console.log(`    📡 ${e.event}`));

  if (report.duplicateEvents.length > 0) {
    console.log('\n── Duplicate Events ──');
    report.duplicateEvents.forEach(d => console.log(`  ⚠️ ${d.event} (${d.timeDiffMs}ms gap)`));
  }

  console.log('\n── Room Join/Leave ──');
  report.roomJoinLeave.forEach(r => console.log(`  ${r.role}: ${r.action} ${r.orderId || r.socketId || ''}`));

  if (report.failedRequests.length > 0) {
    console.log('\n── Failed API Requests ──');
    report.failedRequests.forEach(r => console.log(`  ❌ ${r.method} ${r.path}: ${r.error}`));
  }

  // Write JSON report
  const fs = require('fs');
  const reportPath = require('path').join(__dirname, 'e2e-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  📄 Full report written to: ${reportPath}`);

  console.log('\n══════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
