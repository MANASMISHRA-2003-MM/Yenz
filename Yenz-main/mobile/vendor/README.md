# Yenz Vendor App (`mobile/vendor`)

## Scope & Capabilities
1. **Ringing Inbound Order Alerts**: Continuous audio and push alerts until vendor responds.
2. **Accept / Reject Orders**: Two-tap order decision with automated dispatch trigger to nearby riders on accept.
3. **Food Preparation Status**: *"Mark Food Prepared"* action to notify both the rider and the customer in real time.
4. **Product & Stock Management**: Instant toggle of product availability (Available vs Out of Stock).
5. **Store Open / Close Slider**: Real-time control of store operational state.

## Backend Connection
Reuses existing endpoints: `/api/restaurants/vendor/me`, `/api/restaurants/vendor/toggle-status`, `/api/orders`, `/api/orders/:id/status`, `/api/foods`.
Listens on `vendor_<vendorId>` Socket.IO room for new incoming orders and assigned driver updates.
