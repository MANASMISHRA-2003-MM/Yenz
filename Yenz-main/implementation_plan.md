# Unified Krawing Architecture & PostgreSQL Migration Plan

## 1. Executive Summary & Architecture Overview

The Krawing Hyperlocal Platform has been redesigned and migrated to a **Unified Modular Monolith Architecture** using **PostgreSQL** and **Prisma ORM**. 

Consumer, Vendor, Delivery, and Central Admin interfaces are unified into **ONE system**:
- **ONE PostgreSQL Database** (`krawing_db`)
- **ONE Prisma Schema** (`server/prisma/schema.prisma`)
- **ONE Express Backend API Engine** (`server/server.js`)
- **ONE Centralized JWT Authentication & Role-Based Access System**
- **ONE Real-Time Event Architecture (Socket.IO)**
- **ONE Authoritative Order & Payment Ledger**

```
                         KRAWING UNIFIED SYSTEM
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                    Web Application     Android Client
                         │                   │
               ┌─────────┼─────────┐         │
               │         │         │         │
           Customer    Vendor    Admin    Delivery
               │         │         │         │
               └─────────┴─────────┴─────────┘
                         │                   │
                         └─────────┬─────────┘
                                   │
                            KRAWING BACKEND
                         (Node.js + Express)
                                   │
                         ┌─────────┴─────────┐
                         │                   │
                      Prisma             Socket.IO
                         │                   │
                         ▼                   │
                    PostgreSQL               │
                                             │
                                   Real-time communication
```

---

## 2. PostgreSQL + Prisma Database Model

The database schema (`server/prisma/schema.prisma`) uses explicit relational modeling:
- **Precision Data Types**: All financial values use `Decimal(10, 2)` (never float). Geographic coordinates use `Decimal(10, 7)`.
- **Primary Keys**: Internal String UUIDs (`@default(uuid())`).
- **Domain Enums**:
  - `UserRole`: `CUSTOMER`, `VENDOR`, `DELIVERY_PARTNER`, `ADMIN`
  - `VendorType`: `CRAVINGS` (Food/Restaurants), `FRESH` (Groceries/Mandi)
  - `ProductType`: `FOOD`, `VEGETABLE`, `FRUIT`, `GROCERY`
  - `OrderStatus`: `PENDING`, `CONFIRMED`, `PREPARING`, `READY_FOR_PICKUP`, `ASSIGNED`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`
  - `PaymentMethod`: `COD`, `ONLINE`
  - `PaymentStatus`: `PENDING`, `PAID`, `FAILED`, `REFUNDED`
  - `RefundStatus`: `PENDING`, `PROCESSED`, `FAILED`
  - `DeliveryStatus`: `ASSIGNED`, `WAITING_PICKUP`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`

### Financial Ledger & COD Reconciliation
- `Order`: Stores total order financials (`subtotal`, `deliveryFee`, `tax`, `discount`, `totalAmount`).
- `Payment`: Linked 1-to-1 with `Order`. Manages COD collection (`collectedBy`, `paidAt`, `status`).
- `Refund`: Dedicated relation model to support full or partial refunds with audit trails.

### Delivery & GPS Snapshotting
- `Delivery`: Manages driver assignment, trip distance (`distanceKm`), driver earnings, estimated time, and live coordinates (`currentLat`, `currentLng`).
- `DeliveryLocation`: Audit log of sampled GPS coordinates for historical route tracking.

---

## 3. Data Integration & Backup SQL Export

1. **Backup Data Integration**: Processed `server/prisma/kraywing_backup.sql` containing real vendor, category, product, user, and order records.
2. **Local Vendor Expansion**: Merged 7 Lakkarpur/Shiv Durga Vihar food outlets & Wholesale Sabzi Mandi vendors.
3. **Production Export File**: Created `server/prisma/Kraywing_data.sql` as a standalone production-ready PostgreSQL dump.

---

## 4. End-to-End Real-Time Order Lifecycle

1. **Placement**: Customer places COD order (`POST /api/orders`). System creates `Order`, `Payment` (COD), and `OrderItem` records.
2. **Vendor Alert**: Socket.IO emits `order:created` to room `vendor_{vendorId}`. Vendor receives audio alert & modal.
3. **Vendor Accept**: Vendor marks `CONFIRMED` & `PREPARING`. Socket broadcasts `delivery:new_job_available` to online drivers.
4. **Driver Job Acceptance**: Driver accepts assignment (`POST /api/orders/:id/accept-job`). Status updates to `COURIER_ASSIGNED`.
5. **Live GPS Tracking**: Driver app sends `driver:update_location` over Socket.IO. Backend calculates Haversine distance & broadcasts `courier:location_update` to customer room `order_{orderId}`.
6. **Delivery & COD Settlement**: Driver marks `DELIVERED`. `Payment.status` transitions to `PAID`, updating driver earnings and platform cash reconciliation.

---

## 5. Deployment Instructions

### Local PostgreSQL Docker Container
To run PostgreSQL in Docker locally:
```bash
cd server
npm run docker:up
# Or: docker-compose up -d
```

### Prisma Commands
```bash
# Generate Prisma Client
npm run prisma:generate

# Push schema to PostgreSQL database
npm run db:push

# Seed unified dataset into database
npm run db:seed
```

### Server Startup
```bash
cd server
npm run dev
```
