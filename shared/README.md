# Shared Architecture Package

This package contains shared business contracts, API endpoint definitions, role definitions, order lifecycle state mappings, and Socket.IO events reused across:
1. `client/` (Existing React/Vite web application)
2. `server/` (Existing Node/Express backend)
3. `mobile/` (Future mobile application modules: Customer, Vendor, Rider, Admin)

## Modules
- `constants/roles.js`: System roles and public onboarding constraints.
- `constants/orderStatus.js`: Unified order and delivery progression sequence.
- `constants/socketEvents.js`: Real-time socket event contracts for live notifications and GPS tracking.
- `api/endpoints.js`: Centralized endpoint contract ensuring consistency across web and mobile.
