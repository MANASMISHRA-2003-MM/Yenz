/**
 * ARCHITECTURE TEST SUITE — Socket.IO Vendor Isolation & Event Routing
 * 
 * Tests that:
 * 1. order:created events go ONLY to the correct vendor (not all vendors)
 * 2. Customers do NOT receive order:created for other customers' orders
 * 3. Riders do NOT receive order:created events
 * 4. delivery:new_job_available goes ONLY to drivers_pool
 * 5. Order room events only go to authorized participants
 * 6. Vendor room auto-join works correctly
 * 7. Cross-vendor isolation — 2 vendors, 1 customer, verify only correct vendor gets notified
 * 
 * Run: node tests/e2e/architecture-tests.cjs
 */

const http = require('http');
const { io: ioClient } = require('socket.io-client');

const API_BASE = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:5000';

const report = { stages: [], socketEvents: {}, failedRequests: [] };

function logStage(name, status, expected, actual, details) {
  const entry = { name, status, expected, actual, details, timestamp: new Date().toISOString() };
  report.stages.push(entry);
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${name}] ${status}`);
  console.log(`   expected: ${expected}`);
  console.log(`   actual:   ${actual}`);
  if (details) console.log(`   └─ ${details}`);
}

function apiRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function createTrackedSocket(token, label) {
  const s = ioClient(SOCKET_URL, { auth: { token }, transports: ['websocket'], forceNew: true });
  const events = [];
  const evtNames = ['order:created', 'order:status_updated', 'order:driver_assigned',
    'delivery:new_job_available', 'courier:location_update',
    'error:unauthorized', 'error:forbidden', 'error:not_found'];
  evtNames.forEach(evt => {
    s.on(evt, (data) => {
      events.push({ event: evt, data, ts: Date.now() });
      console.log(`  📡 [${label}] ${evt}${data?.order?.orderNumber ? ' #' + data.order.orderNumber : ''}`);
    });
  });
  report.socketEvents[label] = events;
  return { socket: s, events };
}

async function runTests() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('  ARCHITECTURE TEST SUITE — Vendor Isolation & Event Routing');
  console.log('══════════════════════════════════════════════════════════\n');

  // ── Login all accounts ──
  const customerResp = await apiRequest('POST', '/api/auth/login', null, { email: 'rahul@gmail.com', password: 'password123', requestedRole: 'consumer' });
  const vendorFoodHubResp = await apiRequest('POST', '/api/auth/login', null, { email: 'foodhub@gmail.com', password: 'password123', requestedRole: 'vendor' });
  const vendorMandiResp = await apiRequest('POST', '/api/auth/login', null, { email: 'mandi@krawing.com', password: 'password123', requestedRole: 'vendor' });
  const riderResp = await apiRequest('POST', '/api/auth/login', null, { email: 'driver.arjun@krawing.com', password: 'password123', requestedRole: 'delivery_partner' });

  const customerToken = customerResp.body?.token;
  const vendorFoodHubToken = vendorFoodHubResp.body?.token;
  const vendorMandiToken = vendorMandiResp.body?.token;
  const riderToken = riderResp.body?.token;

  logStage('All Accounts Login', customerToken && vendorFoodHubToken && vendorMandiToken && riderToken ? 'PASS' : 'FAIL',
    '4 tokens', `customer=${!!customerToken}, foodhub=${!!vendorFoodHubToken}, mandi=${!!vendorMandiToken}, rider=${!!riderToken}`);

  if (!customerToken || !vendorFoodHubToken || !riderToken) {
    console.error('FATAL: Missing tokens. Cannot proceed.');
    return printReport();
  }

  // ── Connect all sockets ──
  console.log('\n── Connecting 4+ sockets simultaneously ──');

  const customer1 = createTrackedSocket(customerToken, 'customer1');
  const vendorFoodHub = createTrackedSocket(vendorFoodHubToken, 'vendorFoodHub');
  const vendorMandi = vendorMandiToken ? createTrackedSocket(vendorMandiToken, 'vendorMandi') : null;
  const rider1 = createTrackedSocket(riderToken, 'rider1');

  // Also create a second "bystander" customer to verify they don't get other orders
  // We'll use the admin account acting as a different customer
  const adminResp = await apiRequest('POST', '/api/auth/login', null, { email: 'admin@krawing.com', password: 'password123', requestedRole: 'admin' });
  const adminToken = adminResp.body?.token;
  const adminSocket = adminToken ? createTrackedSocket(adminToken, 'admin_bystander') : null;

  await sleep(3000); // Wait for connections + vendor auto-join

  logStage('Customer Socket Connected', customer1.socket.connected ? 'PASS' : 'FAIL', 'true', String(customer1.socket.connected));
  logStage('FoodHub Vendor Socket Connected', vendorFoodHub.socket.connected ? 'PASS' : 'FAIL', 'true', String(vendorFoodHub.socket.connected));
  if (vendorMandi) logStage('Mandi Vendor Socket Connected', vendorMandi.socket.connected ? 'PASS' : 'FAIL', 'true', String(vendorMandi.socket.connected));
  logStage('Rider Socket Connected', rider1.socket.connected ? 'PASS' : 'FAIL', 'true', String(rider1.socket.connected));

  // Rider joins driver pool
  rider1.socket.emit('join_drivers_room', { lat: 28.46, lng: 77.04 });
  await sleep(500);

  // ══════════════════════════════════════════════════════════
  // TEST 1: Vendor Isolation — order to FoodHub should NOT notify Mandi
  // ══════════════════════════════════════════════════════════
  console.log('\n══ TEST 1: Vendor Isolation — Order to FoodHub ══');

  // Clear event arrays
  customer1.events.length = 0;
  vendorFoodHub.events.length = 0;
  if (vendorMandi) vendorMandi.events.length = 0;
  rider1.events.length = 0;
  if (adminSocket) adminSocket.events.length = 0;

  // Add item from FoodHub vendor and place order
  await apiRequest('POST', '/api/cart/add', customerToken, {
    productId: 'prd-pizza-01', quantity: 1, cartType: 'CRAVINGS', vendorId: 'vnd-foodhub-01'
  });

  const order1Resp = await apiRequest('POST', '/api/orders', customerToken, {
    paymentMethod: 'COD', shoppingMode: 'CRAVINGS'
  });
  const order1 = order1Resp.body?.order;
  const order1Id = order1?.id;

  logStage('Order 1 Created (FoodHub)', order1Resp.status === 201 ? 'PASS' : 'FAIL',
    'HTTP 201', `HTTP ${order1Resp.status}`, `orderNumber=${order1?.orderNumber}`);

  await sleep(3000); // Wait for socket propagation

  // ── CRITICAL CHECKS ──

  // FoodHub vendor SHOULD get order:created
  const foodHubGotOrder = vendorFoodHub.events.some(e => e.event === 'order:created');
  logStage('FoodHub Vendor RECEIVES order:created', foodHubGotOrder ? 'PASS' : 'FAIL',
    'true (this is their order)', String(foodHubGotOrder),
    'The target vendor MUST be notified');

  // Mandi vendor should NOT get order:created
  if (vendorMandi) {
    const mandiGotOrder = vendorMandi.events.some(e => e.event === 'order:created');
    logStage('Mandi Vendor does NOT receive order:created', !mandiGotOrder ? 'PASS' : 'FAIL',
      'false (not their order)', String(mandiGotOrder),
      mandiGotOrder ? '🚨 CROSS-VENDOR LEAKAGE! Mandi got FoodHub order notification!' : 'Correctly isolated');
  }

  // Customer should NOT get order:created (they're not in the order room yet)
  const customerGotCreated = customer1.events.some(e => e.event === 'order:created');
  logStage('Customer does NOT receive spurious order:created', !customerGotCreated ? 'PASS' : 'FAIL',
    'false (not in order room)', String(customerGotCreated),
    customerGotCreated ? '🚨 CUSTOMER LEAKAGE! Customer got socket event for own order before joining room' : 'Correctly scoped');

  // Rider should NOT get order:created
  const riderGotCreated = rider1.events.some(e => e.event === 'order:created');
  logStage('Rider does NOT receive order:created', !riderGotCreated ? 'PASS' : 'FAIL',
    'false (riders get delivery:new_job_available only)', String(riderGotCreated),
    riderGotCreated ? '🚨 RIDER LEAKAGE! Rider got order:created' : 'Correctly scoped');

  // Admin/bystander should NOT get order:created  
  if (adminSocket) {
    const adminGotCreated = adminSocket.events.some(e => e.event === 'order:created');
    logStage('Bystander Admin does NOT receive order:created', !adminGotCreated ? 'PASS' : 'FAIL',
      'false (bystander should not see other orders)', String(adminGotCreated),
      adminGotCreated ? '🚨 BYSTANDER LEAKAGE!' : 'Correctly isolated');
  }

  // ══════════════════════════════════════════════════════════
  // TEST 2: Vendor Preparing triggers delivery:new_job_available ONLY to drivers_pool
  // ══════════════════════════════════════════════════════════
  console.log('\n══ TEST 2: Delivery Job Notification Isolation ══');

  // Clear events
  customer1.events.length = 0;
  vendorFoodHub.events.length = 0;
  if (vendorMandi) vendorMandi.events.length = 0;
  rider1.events.length = 0;

  // Customer joins order room
  customer1.socket.emit('join_order', order1Id);
  await sleep(500);

  // Vendor sets PREPARING → triggers broadcastNewDeliveryJob
  await apiRequest('PUT', `/api/orders/${order1Id}/status`, vendorFoodHubToken, {
    status: 'CONFIRMED'
  });
  await apiRequest('PUT', `/api/orders/${order1Id}/status`, vendorFoodHubToken, {
    status: 'PREPARING'
  });
  await sleep(2000);

  // Rider should get delivery:new_job_available
  const riderGotJob = rider1.events.some(e => e.event === 'delivery:new_job_available');
  logStage('Rider RECEIVES delivery:new_job_available', riderGotJob ? 'PASS' : 'FAIL',
    'true', String(riderGotJob));

  // Customer should NOT get delivery:new_job_available
  const customerGotJob = customer1.events.some(e => e.event === 'delivery:new_job_available');
  logStage('Customer does NOT receive delivery:new_job_available', !customerGotJob ? 'PASS' : 'FAIL',
    'false', String(customerGotJob),
    customerGotJob ? '🚨 CUSTOMER GOT DRIVER-ONLY EVENT!' : 'Correctly scoped');

  // Mandi vendor should NOT get delivery:new_job_available
  if (vendorMandi) {
    const mandiGotJob = vendorMandi.events.some(e => e.event === 'delivery:new_job_available');
    logStage('Mandi Vendor does NOT receive delivery:new_job_available', !mandiGotJob ? 'PASS' : 'FAIL',
      'false', String(mandiGotJob));
  }

  // Customer SHOULD get order:status_updated (they joined the order room)
  const customerGotStatus = customer1.events.some(e => e.event === 'order:status_updated');
  logStage('Customer RECEIVES order:status_updated', customerGotStatus ? 'PASS' : 'FAIL',
    'true', String(customerGotStatus));

  // ══════════════════════════════════════════════════════════
  // TEST 3: Order room authorization — unauthorized user cannot join
  // ══════════════════════════════════════════════════════════
  console.log('\n══ TEST 3: Order Room Authorization ══');

  if (vendorMandi) {
    vendorMandi.events.length = 0;
    vendorMandi.socket.emit('join_order', order1Id);
    await sleep(1500);

    const mandiForbidden = vendorMandi.events.some(e => e.event === 'error:forbidden');
    logStage('Unauthorized Vendor Rejected from Order Room', mandiForbidden ? 'PASS' : 'FAIL',
      'error:forbidden event', String(mandiForbidden),
      mandiForbidden ? 'Mandi correctly denied access to FoodHub order' : '🚨 UNAUTHORIZED ACCESS ALLOWED!');
  }

  // ══════════════════════════════════════════════════════════
  // TEST 4: Complete delivery and verify room cleanup behavior
  // ══════════════════════════════════════════════════════════
  console.log('\n══ TEST 4: Order Completion & Room Behavior ══');

  // Quick path: accept job, pickup, deliver
  await apiRequest('PUT', `/api/orders/${order1Id}/status`, vendorFoodHubToken, { status: 'READY_FOR_PICKUP' });
  await apiRequest('PUT', `/api/orders/${order1Id}/accept-job`, riderToken);
  rider1.socket.emit('join_order', order1Id);
  await sleep(500);

  await apiRequest('PUT', `/api/orders/${order1Id}/status`, riderToken, { status: 'PICKED_UP' });
  await apiRequest('PUT', `/api/orders/${order1Id}/status`, riderToken, { status: 'OUT_FOR_DELIVERY' });
  await sleep(500);

  // Get PIN from customer view
  const custOrderResp = await apiRequest('GET', `/api/orders/${order1Id}`, customerToken);
  const pin = custOrderResp.body?.order?.deliveryPin;

  // Deliver with correct PIN
  const deliverResp = await apiRequest('PUT', `/api/orders/${order1Id}/status`, riderToken, {
    status: 'DELIVERED', deliveryPin: pin, skipGeofence: true
  });
  logStage('Order Delivered', deliverResp.status === 200 ? 'PASS' : 'FAIL',
    'HTTP 200', `HTTP ${deliverResp.status}`);

  await sleep(1000);

  // After delivery, location updates should be ignored (terminal state)
  customer1.events.length = 0;
  rider1.socket.emit('driver:update_location', { orderId: order1Id, lat: 28.50, lng: 77.30 });
  await sleep(2000);

  const locationAfterDelivery = customer1.events.some(e => e.event === 'courier:location_update');
  logStage('No Location Updates After Delivery', !locationAfterDelivery ? 'PASS' : 'FAIL',
    'false (terminal state)', String(locationAfterDelivery),
    locationAfterDelivery ? '🚨 LOCATION LEAK after order completed!' : 'Correctly ignored');

  // ══════════════════════════════════════════════════════════
  // TEST 5: PIN Security — only customer can see PIN
  // ══════════════════════════════════════════════════════════
  console.log('\n══ TEST 5: PIN Security Verification ══');

  // Create another order for PIN test
  await apiRequest('POST', '/api/cart/add', customerToken, {
    productId: 'prd-pizza-01', quantity: 1, cartType: 'CRAVINGS', vendorId: 'vnd-foodhub-01'
  });
  const order2Resp = await apiRequest('POST', '/api/orders', customerToken, { paymentMethod: 'COD', shoppingMode: 'CRAVINGS' });
  const order2Id = order2Resp.body?.order?.id;
  const order2Pin = order2Resp.body?.order?.deliveryPin;

  if (order2Id) {
    // Customer sees PIN
    const custView = await apiRequest('GET', `/api/orders/${order2Id}`, customerToken);
    logStage('Customer CAN See PIN', custView.body?.order?.deliveryPin === order2Pin ? 'PASS' : 'FAIL',
      order2Pin, String(custView.body?.order?.deliveryPin));

    // Vendor CANNOT see PIN
    const vendView = await apiRequest('GET', `/api/orders/${order2Id}`, vendorFoodHubToken);
    logStage('Vendor CANNOT See PIN', vendView.body?.order?.deliveryPin === null ? 'PASS' : 'FAIL',
      'null', String(vendView.body?.order?.deliveryPin),
      vendView.body?.order?.deliveryPin !== null ? '🚨 SECURITY: Vendor can see delivery PIN!' : 'Correctly hidden');

    // Rider CANNOT see PIN
    // Accept job first so rider has access
    await apiRequest('PUT', `/api/orders/${order2Id}/status`, vendorFoodHubToken, { status: 'CONFIRMED' });
    await apiRequest('PUT', `/api/orders/${order2Id}/status`, vendorFoodHubToken, { status: 'PREPARING' });
    await apiRequest('PUT', `/api/orders/${order2Id}/accept-job`, riderToken);
    const riderView = await apiRequest('GET', `/api/orders/${order2Id}`, riderToken);
    logStage('Rider CANNOT See PIN', riderView.body?.order?.deliveryPin === null ? 'PASS' : 'FAIL',
      'null', String(riderView.body?.order?.deliveryPin),
      riderView.body?.order?.deliveryPin !== null ? '🚨 SECURITY: Rider can see delivery PIN!' : 'Correctly hidden');

    // Cancel this test order
    await apiRequest('PUT', `/api/orders/${order2Id}/status`, vendorFoodHubToken, { status: 'CANCELLED' });
  }

  // ══════════════════════════════════════════════════════════
  // TEST 6: Reconnection — socket re-auth and room re-join
  // ══════════════════════════════════════════════════════════
  console.log('\n══ TEST 6: Socket Reconnection ══');

  vendorFoodHub.socket.disconnect();
  await sleep(1000);
  logStage('Vendor Disconnected', !vendorFoodHub.socket.connected ? 'PASS' : 'FAIL',
    'disconnected', String(vendorFoodHub.socket.connected));

  vendorFoodHub.socket.connect();
  await sleep(3000); // Wait for reconnect + auto-join

  logStage('Vendor Reconnected', vendorFoodHub.socket.connected ? 'PASS' : 'FAIL',
    'connected', String(vendorFoodHub.socket.connected));

  // Test that vendor still gets order:created after reconnect
  vendorFoodHub.events.length = 0;
  await apiRequest('POST', '/api/cart/add', customerToken, {
    productId: 'prd-pizza-01', quantity: 1, cartType: 'CRAVINGS', vendorId: 'vnd-foodhub-01'
  });
  const order3Resp = await apiRequest('POST', '/api/orders', customerToken, { paymentMethod: 'COD', shoppingMode: 'CRAVINGS' });
  await sleep(2000);

  const vendorGotOrderAfterReconnect = vendorFoodHub.events.some(e => e.event === 'order:created');
  logStage('Vendor Gets Orders After Reconnect', vendorGotOrderAfterReconnect ? 'PASS' : 'FAIL',
    'true (auto-rejoin vendor room)', String(vendorGotOrderAfterReconnect),
    vendorGotOrderAfterReconnect ? 'Auto-join vendor room works after reconnect' : '🚨 Vendor lost room after reconnect!');

  // Cancel test order
  if (order3Resp.body?.order?.id) {
    await apiRequest('PUT', `/api/orders/${order3Resp.body.order.id}/status`, vendorFoodHubToken, { status: 'CANCELLED' });
  }

  // ══════════════════════════════════════════════════════════
  // TEST 7: Invalid status transitions
  // ══════════════════════════════════════════════════════════
  console.log('\n══ TEST 7: Status Machine Validation ══');

  const invalidResp = await apiRequest('PUT', `/api/orders/${order1Id}/status`, vendorFoodHubToken, { status: 'PREPARING' });
  logStage('Cannot Update DELIVERED Order', invalidResp.status === 400 ? 'PASS' : 'FAIL',
    'HTTP 400', `HTTP ${invalidResp.status}`, invalidResp.body?.message);

  const bogusResp = await apiRequest('PUT', `/api/orders/${order1Id}/status`, vendorFoodHubToken, { status: 'FLYING' });
  logStage('Invalid Status Name Rejected', bogusResp.status === 400 ? 'PASS' : 'FAIL',
    'HTTP 400', `HTTP ${bogusResp.status}`, bogusResp.body?.message);

  // ══════════════════════════════════════════════════════════
  // TEST 8: Driver Job Rejection (Decline & Do Not Ring Again)
  // ══════════════════════════════════════════════════════════
  console.log('\n══ TEST 8: Driver Job Rejection & Ring Suppression ══');

  // Place a new test order for driver test
  await apiRequest('POST', '/api/cart/add', customerToken, {
    productId: 'prd-pizza-01', quantity: 1, cartType: 'CRAVINGS', vendorId: 'vnd-foodhub-01'
  });
  const order4Resp = await apiRequest('POST', '/api/orders', customerToken, { paymentMethod: 'COD', shoppingMode: 'CRAVINGS' });
  const order4Id = order4Resp.body?.order?.id;

  if (order4Id) {
    // Vendor prepares order, broadcasting job to drivers
    await apiRequest('PUT', `/api/orders/${order4Id}/status`, vendorFoodHubToken, { status: 'CONFIRMED' });
    await apiRequest('PUT', `/api/orders/${order4Id}/status`, vendorFoodHubToken, { status: 'PREPARING' });
    await sleep(1500);

    // Driver rejects the job
    const rejectResp = await apiRequest('PUT', `/api/orders/${order4Id}/reject-job`, riderToken);
    logStage('Driver Rejects Job Successfully', rejectResp.status === 200 && rejectResp.body?.success ? 'PASS' : 'FAIL',
      'HTTP 200 success: true', `HTTP ${rejectResp.status}`, rejectResp.body?.message);

    // Cancel order4
    await apiRequest('PUT', `/api/orders/${order4Id}/status`, vendorFoodHubToken, { status: 'CANCELLED' });
  }

  // ── Cleanup ──
  console.log('\n── CLEANUP ──');
  [customer1, vendorFoodHub, vendorMandi, rider1, adminSocket].forEach(s => {
    if (s?.socket?.connected) s.socket.disconnect();
  });

  printReport();
}

function printReport() {
  console.log('\n\n══════════════════════════════════════════════════════════');
  console.log('  ARCHITECTURE TEST REPORT');
  console.log('══════════════════════════════════════════════════════════\n');

  const passed = report.stages.filter(s => s.status === 'PASS').length;
  const failed = report.stages.filter(s => s.status === 'FAIL').length;
  const total = report.stages.length;

  console.log(`  Total Tests:  ${total}`);
  console.log(`  ✅ Passed:    ${passed}`);
  console.log(`  ❌ Failed:    ${failed}`);
  console.log(`  Pass Rate:    ${total > 0 ? Math.round((passed / total) * 100) : 0}%\n`);

  if (failed > 0) {
    console.log('── FAILED TESTS ──');
    report.stages.filter(s => s.status === 'FAIL').forEach(s => {
      console.log(`  ❌ ${s.name}`);
      console.log(`     expected: ${s.expected}`);
      console.log(`     actual:   ${s.actual}`);
      if (s.details) console.log(`     └─ ${s.details}`);
    });
  }

  console.log('\n── Socket Event Counts ──');
  Object.entries(report.socketEvents).forEach(([label, events]) => {
    console.log(`  ${label}: ${events.length} events`);
    const byType = {};
    events.forEach(e => { byType[e.event] = (byType[e.event] || 0) + 1; });
    Object.entries(byType).forEach(([evt, count]) => console.log(`    📡 ${evt}: ${count}x`));
  });

  const fs = require('fs');
  const reportPath = require('path').join(__dirname, 'architecture-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  📄 Report: ${reportPath}`);
  console.log('\n══════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => { console.error('FATAL:', err); process.exit(1); });
