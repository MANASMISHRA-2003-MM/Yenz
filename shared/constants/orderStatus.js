/**
 * Unified Order & Delivery Lifecycle Statuses across Web, Mobile, and Backend
 */
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  PACKING: 'PACKING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  ASSIGNED: 'ASSIGNED',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

export const DELIVERY_STATUS = {
  ASSIGNED: 'ASSIGNED',
  WAITING_PICKUP: 'WAITING_PICKUP',
  ARRIVED_AT_PICKUP: 'ARRIVED_AT_PICKUP',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  ARRIVED_AT_CUSTOMER: 'ARRIVED_AT_CUSTOMER',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED'
};

export const ORDER_TIMELINE_STEPS = [
  { key: ORDER_STATUS.PENDING, label: 'Order placed', sublabel: 'We received your order' },
  { key: ORDER_STATUS.CONFIRMED, label: 'Store accepted', sublabel: 'Store accepted & cooking' },
  { key: ORDER_STATUS.READY_FOR_PICKUP, label: 'Food prepared', sublabel: 'Ready for rider pickup' },
  { key: ORDER_STATUS.OUT_FOR_DELIVERY, label: 'Out for delivery', sublabel: 'Rider on the way' },
  { key: ORDER_STATUS.DELIVERED, label: 'Delivered', sublabel: 'PIN verified & handed over' }
];

export const getTimelineStepIndex = (orderStatus, deliveryStatus) => {
  if (orderStatus === ORDER_STATUS.DELIVERED || deliveryStatus === DELIVERY_STATUS.DELIVERED) return 4;
  if (
    orderStatus === ORDER_STATUS.OUT_FOR_DELIVERY ||
    orderStatus === ORDER_STATUS.PICKED_UP ||
    deliveryStatus === DELIVERY_STATUS.OUT_FOR_DELIVERY ||
    deliveryStatus === DELIVERY_STATUS.PICKED_UP ||
    deliveryStatus === DELIVERY_STATUS.ARRIVED_AT_CUSTOMER
  ) {
    return 3;
  }
  if (
    orderStatus === ORDER_STATUS.READY_FOR_PICKUP ||
    orderStatus === ORDER_STATUS.PREPARING ||
    orderStatus === ORDER_STATUS.PACKING ||
    deliveryStatus === DELIVERY_STATUS.WAITING_PICKUP ||
    deliveryStatus === DELIVERY_STATUS.ARRIVED_AT_PICKUP
  ) {
    return 2;
  }
  if (
    orderStatus === ORDER_STATUS.CONFIRMED ||
    orderStatus === ORDER_STATUS.ASSIGNED ||
    deliveryStatus === DELIVERY_STATUS.ASSIGNED
  ) {
    return 1;
  }
  return 0;
};
