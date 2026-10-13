/**
 * Shared Socket.IO Event Names across Web, Mobile apps, and Backend
 */
export const SOCKET_EVENTS = {
  // Connection & Room Management
  JOIN_ORDER: 'join_order',
  LEAVE_ORDER: 'leave_order',
  JOIN_VENDOR_ROOM: 'join_vendor_room',
  JOIN_DRIVER_ROOM: 'join_driver_room',

  // Order Lifecycle Events
  ORDER_CREATED: 'order:created',
  ORDER_NEW: 'order:new',
  ORDER_STATUS_UPDATED: 'order:status_updated',
  ORDER_DRIVER_ASSIGNED: 'order:driver_assigned',
  ORDER_DELIVERED: 'order:delivered',

  // Dispatch & Offer Events
  DELIVERY_OFFER: 'delivery:offer',
  DELIVERY_OFFER_CANCELLED: 'delivery:offer_cancelled',
  DELIVERY_NO_RIDERS: 'delivery:no_riders_available',

  // Real-time GPS Tracking
  DRIVER_UPDATE_LOCATION: 'driver:update_location',
  DRIVER_ONLINE_LOCATION: 'driver:online_location',
  COURIER_LOCATION_UPDATE: 'courier:location_update'
};
