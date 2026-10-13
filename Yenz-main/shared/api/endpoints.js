/**
 * Shared API Endpoints Contract across Web and Mobile Applications
 */
export const API_ENDPOINTS = {
  // Authentication & Profile
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    UPDATE_PROFILE: '/auth/profile'
  },

  // Customer / Consumer
  CUSTOMER: {
    RESTAURANTS: '/restaurants',
    FOODS: '/foods',
    CATEGORIES: '/categories',
    CART: '/cart',
    CART_ITEMS: '/cart/items',
    CHECKOUT: '/orders',
    MY_ORDERS: '/orders',
    ORDER_BY_ID: (id) => `/orders/${id}`,
    ADDRESSES: '/addresses'
  },

  // Vendor
  VENDOR: {
    DASHBOARD_ME: '/restaurants/vendor/me',
    TOGGLE_STATUS: '/restaurants/vendor/toggle-status',
    ORDERS: '/orders',
    UPDATE_ORDER_STATUS: (orderId) => `/orders/${orderId}/status`,
    PRODUCTS: (vendorId) => `/foods?vendorId=${vendorId}&availableOnly=false`,
    TOGGLE_PRODUCT_AVAILABILITY: (productId) => `/foods/${productId}`,
    APPLICATION: '/restaurants/application'
  },

  // Delivery Partner / Rider
  RIDER: {
    DASHBOARD: '/deliveries/dashboard',
    TOGGLE_ONLINE: '/deliveries/toggle-online',
    ACCEPT_OFFER: (offerId) => `/deliveries/offers/${offerId}/accept`,
    REJECT_OFFER: (offerId) => `/deliveries/offers/${offerId}/reject`,
    UPDATE_STATUS: (deliveryId) => `/deliveries/${deliveryId}/status`,
    UPDATE_LOCATION: '/deliveries/location',
    APPLICATION: '/deliveries/application'
  },

  // Private Administrative Portal (Server-side role protected)
  ADMIN: {
    METRICS: '/admin/metrics',
    USERS: '/admin/users',
    VENDOR_APPLICATIONS: '/admin/vendors/applications',
    UPDATE_VENDOR_APPLICATION: (id) => `/admin/vendors/applications/${id}/status`,
    RIDER_APPLICATIONS: '/admin/delivery-partners/applications',
    UPDATE_RIDER_APPLICATION: (id) => `/admin/delivery-partners/applications/${id}/status`,
    DISPUTES: (orderId) => `/admin/disputes/${orderId}`
  }
};
