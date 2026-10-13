// tests/e2e/order-lifecycle.spec.ts
import { test, expect, chromium } from '@playwright/test';

// Test accounts
const accounts = {
  customer: { email: 'rahul@gmail.com', password: 'password123' },
  vendor: { email: 'foodhub@gmail.com', password: 'password123' },
  rider: { email: 'driver.arjun@krawing.com', password: 'password123' },
};

// Utility to login and return the page context
async function login(page, role) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', accounts[role].email);
  await page.fill('[data-testid="password-input"]', accounts[role].password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

// Helper to record console errors and failed requests
function attachDebugListeners(page, context) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      context.errors.push({ type: 'console', text: msg.text() });
    }
  });
  page.on('requestfailed', request => {
    context.errors.push({ type: 'request', url: request.url(), errorText: request.failure()?.errorText });
  });
}

test.describe('Complete Order Lifecycle E2E', () => {
  const shared = { orderId: null as string | null, errors: [] as any[] };
  let customerContext, vendorContext, riderContext;
  let customerPage, vendorPage, riderPage;

  test.beforeAll(async () => {
    const browser = await chromium.launch();
    customerContext = await browser.newContext();
    vendorContext = await browser.newContext();
    riderContext = await browser.newContext();

    customerPage = await customerContext.newPage();
    vendorPage = await vendorContext.newPage();
    riderPage = await riderContext.newPage();

    attachDebugListeners(customerPage, shared);
    attachDebugListeners(vendorPage, shared);
    attachDebugListeners(riderPage, shared);

    await login(customerPage, 'customer');
    await login(vendorPage, 'vendor');
    await login(riderPage, 'rider');
  });

  test('Customer places an order', async () => {
    await customerPage.click('[data-testid="address-select"]');
    await customerPage.click('[data-testid="address-item-0"]');
    await customerPage.goto('/menu');
    await customerPage.click('[data-testid="add-to-cart-0"]');
    await customerPage.click('[data-testid="cart-button"]');
    await customerPage.click('[data-testid="checkout-button"]');

    const [response] = await Promise.all([
      customerPage.waitForResponse(r => r.url().includes('/api/orders') && r.status() === 201),
      customerPage.click('[data-testid="place-order-button"]'),
    ]);
    const orderData = await response.json();
    shared.orderId = orderData.id;
    expect(shared.orderId).toBeTruthy();
    await expect(customerPage.locator('[data-testid="order-confirmation"]')).toContainText('Order placed');
  });

  test('Vendor receives and accepts order', async () => {
    await vendorPage.waitForSelector(`[data-testid="order-${shared.orderId}"]`, { timeout: 10000 });
    await vendorPage.click(`[data-testid="accept-order-${shared.orderId}"]`);
    await expect(vendorPage.locator(`[data-testid="order-status-${shared.orderId}"]`)).toContainText('Accepted');
  });

  test('Rider receives assignment and accepts', async () => {
    await riderPage.waitForSelector(`[data-testid="assigned-order-${shared.orderId}"]`, { timeout: 10000 });
    await riderPage.click(`[data-testid="accept-delivery-${shared.orderId}"]`);
    await expect(riderPage.locator(`[data-testid="delivery-status-${shared.orderId}"]`)).toContainText('Accepted');
  });

  test('Rider location updates and customer sees them', async () => {
    const locations = [
      { lat: 12.9716, lng: 77.5946 },
      { lat: 12.9720, lng: 77.5950 },
      { lat: 12.9725, lng: 77.5955 },
    ];
    for (const loc of locations) {
      await riderPage.evaluate(({ lat, lng }) => {
        // @ts-ignore – replace with actual method used by app
        window.updateRiderLocation(lat, lng);
      }, loc);
      await customerPage.waitForTimeout(1000);
      const marker = customerPage.locator(`[data-testid="rider-marker-${shared.orderId}"]`);
      await expect(marker).toBeVisible();
    }
  });

  test('Delivery code verification', async () => {
    await riderPage.waitForSelector('[data-testid="delivery-code"]', { timeout: 10000 });
    const code = await riderPage.textContent('[data-testid="delivery-code"]');
    await customerPage.fill('[data-testid="delivery-code-input"]', '0000');
    await customerPage.click('[data-testid="verify-code-button"]');
    await expect(customerPage.locator('[data-testid="code-error"]')).toContainText('Invalid code');
    await customerPage.fill('[data-testid="delivery-code-input"]', code ?? '');
    await customerPage.click('[data-testid="verify-code-button"]');
    await expect(customerPage.locator('[data-testid="code-success"]')).toContainText('Code verified');
  });

  test('Order completion verification', async () => {
    await expect(customerPage.locator(`[data-testid="order-status-${shared.orderId}"]`)).toContainText('Completed');
    await expect(vendorPage.locator(`[data-testid="order-status-${shared.orderId}"]`)).toContainText('Completed');
    await expect(riderPage.locator(`[data-testid="order-status-${shared.orderId}"]`)).toContainText('Completed');
  });

  test.afterAll(async () => {
    await customerContext.close();
    await vendorContext.close();
    await riderContext.close();
    const fs = require('fs');
    const report = { orderId: shared.orderId, errors: shared.errors };
    fs.writeFileSync('e2e-report.json', JSON.stringify(report, null, 2));
  });
});
