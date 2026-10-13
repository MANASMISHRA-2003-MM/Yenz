# Yenz Customer App (`mobile/customer`)

## Scope & Capabilities
1. **Browse Restaurants & Fresh Mandi**: Channel switcher between Cravings and Fresh Mandi produce.
2. **Dual Cart Management**: Separate baskets for Fresh Mandi and restaurant cravings with isolated checkout.
3. **Checkout & COD/Online Payment**: Multiple delivery addresses, promo codes, and secret 4-digit PIN generation.
4. **Live Order Tracking**: Map-based real-time courier GPS route tracking, status progress, and driver details.

## Backend Connection
Connects directly to the existing Express backend API (`/api/restaurants`, `/api/foods`, `/api/cart`, `/api/orders`, `/api/addresses`).
Reuses Socket.IO events (`order:status_updated`, `order:driver_assigned`, `courier:location_update`).
Never connects directly to PostgreSQL.
