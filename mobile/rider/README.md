# Yenz Rider App (`mobile/rider`)

## Scope & Capabilities
1. **Online / Offline Toggle**: Registers rider in active dispatch pool with live location.
2. **15-Second Delivery Offers**: Private room alerts with shop distance, payout, and accept/reject actions.
3. **Turn-by-Turn Pickup & Delivery Navigation**: Google Maps / external navigation intent.
4. **Live Background GPS Location**: Pushes throttled coordinates to `driver:update_location` socket for customer map tracking.
5. **4-Digit Delivery PIN Verification**: 350m geofence verification and rate-limited PIN entry for handover completion.

## Backend Connection
Reuses existing endpoints: `/api/deliveries/dashboard`, `/api/deliveries/toggle-online`, `/api/deliveries/offers/:id/accept`, `/api/deliveries/:id/status`, `/api/deliveries/location`.
Listens on `driver_<riderId>` Socket.IO room.
