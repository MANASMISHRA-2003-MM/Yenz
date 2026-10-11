# Yenz Mobile Application Layer

This directory holds the mobile applications for the Yenz Hyperlocal Platform:

```
mobile/
├── customer/     # Yenz Consumer App (Cravings & Fresh Mandi)
├── vendor/       # Yenz Store & Kitchen Manager App
├── rider/        # Yenz Delivery Partner App
└── admin/        # Yenz Private Administrator App
```

## Shared Principles
- **Single Backend**: All 4 apps communicate with the central Express backend (`/server`).
- **No Direct Database Access**: All operations use REST endpoints and Socket.IO real-time channels.
- **Shared Contracts**: Contracts and event constants are imported from `/shared`.
- **Role-Based Security**: Access control is enforced server-side using JWT and user roles (`CUSTOMER`, `VENDOR`, `DELIVERY_PARTNER`, `ADMIN`).
