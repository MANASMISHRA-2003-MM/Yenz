-- =====================================================================================
-- KRAWING UNIFIED HYPERLOCAL COMMERCE PLATFORM - PRODUCTION POSTGRESQL DATABASE DUMP
-- =====================================================================================
-- System Architecture: ONE UNIFIED MONOLITH DATABASE (Consumer + Vendor + Admin + Delivery)
-- Database Engine: PostgreSQL 14+ / 16+
-- Schema ORM: Prisma Client
-- Primary Key Strategy: UUID / String 36-char
-- Currency Data Type: DECIMAL(10, 2) [Strict Financial Decimal]
-- Coordinates Data Type: DECIMAL(10, 7) [High Precision GPS]
-- Dump File: Kraywing_data.sql
-- Description: Complete schema definitions, domain enums, index definitions, foreign key constraints,
--              and production initial seed records (including 7 Lakkarpur food outlets, Mandi fresh market,
--              customers, delivery riders, system admins, orders, COD payments, and reviews).
-- =====================================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- =====================================================================================
-- TABLE OF CONTENTS (TOC INDEX)
-- =====================================================================================
-- SECTION 1: CUSTOM DOMAIN ENUMS (8 Enums)
--   - UserRole            : Defines user authorization scope (CUSTOMER, VENDOR, DELIVERY_PARTNER, ADMIN)
--   - VendorType          : Platform mode switch (CRAVINGS - Food, FRESH - Groceries/Mandi)
--   - ProductType         : Inventory categorization (FOOD, VEGETABLE, FRUIT, GROCERY)
--   - OrderStatus         : State machine for order lifecycle (PENDING -> DELIVERED / CANCELLED)
--   - PaymentMethod       : Supported payment methods (COD, ONLINE)
--   - PaymentStatus       : Financial transaction status (PENDING, PAID, FAILED, REFUNDED)
--   - RefundStatus        : Refund audit trail state (PENDING, PROCESSED, FAILED)
--   - DeliveryStatus      : Driver dispatch & GPS status (ASSIGNED -> DELIVERED / CANCELLED)
--
-- SECTION 2: TABLE DEFINITIONS & CONSTRAINTS (16 Tables)
--   [TOC Entry 101] Table "User"             : Unified Account Directory (Consumers, Vendors, Drivers, Admins)
--   [TOC Entry 102] Table "Address"          : Saved Customer Delivery Locations with Geocoding
--   [TOC Entry 103] Table "Vendor"           : Restaurants & Fresh Market Outlets (Owner Relational FK)
--   [TOC Entry 104] Table "VendorHours"      : Weekly Operating Hours per Vendor
--   [TOC Entry 105] Table "Category"         : Global Product & Cuisine Categories
--   [TOC Entry 106] Table "Product"          : Food Dishes & Fresh Produce Items with Weight/Stock Options
--   [TOC Entry 107] Table "Cart" & "CartItem": Active Customer Shopping Baskets
--   [TOC Entry 108] Table "Coupon"           : Promo Codes, Flat/Percentage Discounts, Min Order Limits
--   [TOC Entry 109] Table "Order"            : Central Master Order Ledger (KR-YYYYMMDD-XXXXXX)
--   [TOC Entry 110] Table "OrderItem"        : Line Items Snapshot per Order
--   [TOC Entry 111] Table "OrderTimeline"   : Audit Log of Status State Machine Transitions
--   [TOC Entry 112] Table "Payment"          : Financial Payment Ledger (COD Cash Collection Tracking)
--   [TOC Entry 113] Table "Refund"           : Partial & Full Order Refund Ledger
--   [TOC Entry 114] Table "Delivery"         : Driver Assignments, Trip Distance, & Earnings
--   [TOC Entry 115] Table "DeliveryLocation" : Sampled GPS Coordinate Snapshot History
--   [TOC Entry 116] Table "Review"           : Ratings & Comments for Vendors and Delivery Partners
--   [TOC Entry 117] Table "Notification"     : User App In-App Alerts & Push Event Log
--
-- SECTION 3: PRODUCTION SEED DATA INSERTS
--   - Users (Admins, Customers, Vendor Owners, Delivery Drivers)
--   - Addresses (Saved Geocoded Locations)
--   - Categories (Pizza, Momos, North Indian, Thalis, Vegetables, Fruits)
--   - Vendors (Food Hub, Spice Villa, Rediwala Junction, Jai Bharat, Makhna Di Rasoi, The Pizza Wala, Sabzi Mandi)
--   - Products (Dishes, Thalis, Momos, Fresh Produce)
--   - Coupons (WELCOME50, SAVE20)
--   - Orders, Line Items, Financial Payments, & Driver Deliveries
-- =====================================================================================


-- =====================================================================================
-- SECTION 1: DOMAIN ENUM DEFINITIONS
-- =====================================================================================

DROP TYPE IF EXISTS "UserRole" CASCADE;
CREATE TYPE "UserRole" AS ENUM (
    'CUSTOMER',           -- Standard Consumer placing orders
    'VENDOR',             -- Shop owner / Restaurant manager
    'DELIVERY_PARTNER',   -- Delivery rider operating Android app
    'ADMIN'              -- Krawing central system administrator
);

DROP TYPE IF EXISTS "VendorType" CASCADE;
CREATE TYPE "VendorType" AS ENUM (
    'CRAVINGS',           -- Ready-to-eat Food & Restaurant mode
    'FRESH'               -- Fresh vegetables, fruits, and grocery mode
);

DROP TYPE IF EXISTS "ProductType" CASCADE;
CREATE TYPE "ProductType" AS ENUM (
    'FOOD',               -- Prepared restaurant dishes
    'VEGETABLE',          -- Farm fresh vegetables (sold by kg/g)
    'FRUIT',              -- Fresh fruits (sold by kg/g/piece)
    'GROCERY'             -- Packaged grocery items
);

DROP TYPE IF EXISTS "OrderStatus" CASCADE;
CREATE TYPE "OrderStatus" AS ENUM (
    'PENDING',            -- Order placed by customer, awaiting vendor acceptance
    'CONFIRMED',          -- Vendor accepted order
    'PREPARING',          -- Food/order being prepared/packed
    'READY_FOR_PICKUP',   -- Order ready for driver pickup
    'ASSIGNED',           -- Delivery partner assigned
    'PICKED_UP',          -- Driver picked up order from vendor
    'OUT_FOR_DELIVERY',   -- Driver en route to customer location
    'DELIVERED',          -- Order successfully handed to customer
    'CANCELLED'           -- Order cancelled
);

DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
CREATE TYPE "PaymentMethod" AS ENUM (
    'COD',                -- Cash on Delivery (Primary launch method)
    'ONLINE'              -- Online Payment Gateway (UPI/Card/NetBanking)
);

DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
CREATE TYPE "PaymentStatus" AS ENUM (
    'PENDING',            -- Payment expected upon delivery (COD)
    'PAID',               -- Cash collected or online txn successful
    'FAILED',             -- Transaction failed
    'REFUNDED'            -- Payment refunded to customer
);

DROP TYPE IF EXISTS "RefundStatus" CASCADE;
CREATE TYPE "RefundStatus" AS ENUM (
    'PENDING',            -- Refund requested / queued
    'PROCESSED',          -- Refund successfully transferred
    'FAILED'              -- Refund processing failed
);

DROP TYPE IF EXISTS "DeliveryStatus" CASCADE;
CREATE TYPE "DeliveryStatus" AS ENUM (
    'ASSIGNED',           -- Driver notified of assignment
    'WAITING_PICKUP',     -- Driver waiting at vendor location
    'PICKED_UP',          -- Order collected from vendor
    'OUT_FOR_DELIVERY',   -- Driver navigating to customer
    'DELIVERED',          -- Trip complete, COD collected
    'CANCELLED'           -- Delivery trip cancelled
);


-- =====================================================================================
-- SECTION 2: TABLE SCHEMA DEFINITIONS
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- [TOC Entry 101] TABLE: public."User"
-- Purpose: Unified user account store for all platform roles.
-- Size/Columns: 13 columns.
-- Primary Key: id (VARCHAR 36 / UUID)
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "User" CASCADE;
CREATE TABLE "User" (
    "id"           VARCHAR(36)  NOT NULL PRIMARY KEY,            -- Internal Unique UUID
    "fullName"     VARCHAR(120) NOT NULL,                        -- User full display name
    "email"        VARCHAR(150) NOT NULL UNIQUE,                 -- Unique email address
    "phone"        VARCHAR(20)  NOT NULL UNIQUE,                 -- Unique mobile phone number
    "passwordHash" VARCHAR(255) NOT NULL,                        -- Bcrypt hashed password
    "role"         "UserRole"   NOT NULL DEFAULT 'CUSTOMER',     -- Role (CUSTOMER, VENDOR, DELIVERY_PARTNER, ADMIN)
    "status"       VARCHAR(20)  NOT NULL DEFAULT 'active',       -- Account status (active, blocked, inactive)
    "isOnline"     BOOLEAN      NOT NULL DEFAULT true,           -- Driver/Vendor real-time online status
    "avatar"       TEXT         DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    "vehicleType"  VARCHAR(30)  DEFAULT 'Bike',                  -- Vehicle type for delivery partners (Bike, Scooter)
    "ratings"      DOUBLE PRECISION DEFAULT 4.8,                  -- Driver/Vendor average rating
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_user_role" ON "User"("role");
CREATE INDEX "idx_user_status" ON "User"("status");


-- -------------------------------------------------------------------------------------
-- [TOC Entry 102] TABLE: public."Address"
-- Purpose: Customer delivery locations with high precision GPS lat/long.
-- Size/Columns: 11 columns.
-- Foreign Keys: userId -> User(id) ON DELETE CASCADE
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Address" CASCADE;
CREATE TABLE "Address" (
    "id"          VARCHAR(36)  NOT NULL PRIMARY KEY,
    "userId"      VARCHAR(36)  NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "label"       VARCHAR(30)  DEFAULT 'Home',                   -- Home, Work, Other
    "addressLine" VARCHAR(255) NOT NULL,                        -- House/Flat number, Street
    "city"        VARCHAR(100) NOT NULL,                        -- City name
    "state"       VARCHAR(100) NOT NULL,                        -- State name
    "pincode"     VARCHAR(10)  NOT NULL,                        -- Postal Code
    "latitude"    DECIMAL(10, 7),                               -- GPS Latitude
    "longitude"   DECIMAL(10, 7),                               -- GPS Longitude
    "isDefault"   BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_address_user" ON "Address"("userId");


-- -------------------------------------------------------------------------------------
-- [TOC Entry 103] TABLE: public."Vendor"
-- Purpose: Outlets for both Cravings (Restaurants) & Fresh (Sabzi Mandi / Grocery).
-- Size/Columns: 23 columns.
-- Foreign Keys: ownerUserId -> User(id) ON DELETE CASCADE
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Vendor" CASCADE;
CREATE TABLE "Vendor" (
    "id"           VARCHAR(36)   NOT NULL PRIMARY KEY,
    "ownerUserId"  VARCHAR(36)   NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "vendorType"   "VendorType"  NOT NULL DEFAULT 'CRAVINGS',    -- CRAVINGS or FRESH
    "name"         VARCHAR(150)  NOT NULL,                       -- Vendor / Restaurant Name
    "phone"        VARCHAR(20)   NOT NULL UNIQUE,                -- Outlet contact phone
    "email"        VARCHAR(150)  UNIQUE,                         -- Outlet contact email
    "address"      VARCHAR(255)  NOT NULL,                       -- Physical address
    "city"         VARCHAR(100)  NOT NULL,                       -- City
    "state"        VARCHAR(100)  DEFAULT 'Haryana',              -- State
    "pincode"      VARCHAR(10)   DEFAULT '121009',               -- Pincode
    "latitude"     DECIMAL(10, 7),                              -- GPS Latitude
    "longitude"    DECIMAL(10, 7),                              -- GPS Longitude
    "rating"       DECIMAL(2, 1) NOT NULL DEFAULT 4.5,            -- Rating (0.0 - 5.0)
    "numRatings"   INTEGER       NOT NULL DEFAULT 100,            -- Rating count
    "deliveryTime" VARCHAR(30)   DEFAULT '25-35 min',            -- Estimated turnaround time
    "deliveryFee"  DECIMAL(10, 2) NOT NULL DEFAULT 30.00,          -- Base delivery fee
    "priceRange"   VARCHAR(10)   DEFAULT '₹₹',                   -- Budget indicator
    "isVegOnly"    BOOLEAN       NOT NULL DEFAULT false,         -- Pure Veg indicator
    "status"       VARCHAR(20)   NOT NULL DEFAULT 'open',        -- open, closed, inactive
    "image"        TEXT          NOT NULL,                       -- Display card image URL
    "bannerImage"  TEXT,                                         -- Cover banner image URL
    "offers"       TEXT[],                                       -- Array of active promotional banners
    "freshTagline" TEXT,                                         -- Special tagline for Fresh Mandi stores
    "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_vendor_type" ON "Vendor"("vendorType");
CREATE INDEX "idx_vendor_status" ON "Vendor"("status");


-- -------------------------------------------------------------------------------------
-- [TOC Entry 104] TABLE: public."VendorHours"
-- Purpose: Opening & Closing schedule per vendor.
-- Size/Columns: 6 columns.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "VendorHours" CASCADE;
CREATE TABLE "VendorHours" (
    "id"        VARCHAR(36) NOT NULL PRIMARY KEY,
    "vendorId"  VARCHAR(36) NOT NULL REFERENCES "Vendor"("id") ON DELETE CASCADE,
    "dayOfWeek" INTEGER     NOT NULL,                            -- 0 (Sunday) to 6 (Saturday)
    "openTime"  VARCHAR(10) DEFAULT '09:00',                     -- HH:MM format
    "closeTime" VARCHAR(10) DEFAULT '23:00',                     -- HH:MM format
    "isClosed"  BOOLEAN     NOT NULL DEFAULT false,
    CONSTRAINT "uniq_vendor_day" UNIQUE ("vendorId", "dayOfWeek")
);


-- -------------------------------------------------------------------------------------
-- [TOC Entry 105] TABLE: public."Category"
-- Purpose: Master catalog categories for food dishes & fresh produce.
-- Size/Columns: 7 columns.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Category" CASCADE;
CREATE TABLE "Category" (
    "id"        VARCHAR(36)  NOT NULL PRIMARY KEY,
    "name"      VARCHAR(100) NOT NULL,                        -- Display Name (e.g., Pizza, Momos)
    "slug"      VARCHAR(120) NOT NULL UNIQUE,                 -- URL Friendly slug (e.g., pizza)
    "icon"      VARCHAR(50)  NOT NULL DEFAULT 'Utensils',     -- Lucide icon name
    "image"     TEXT         DEFAULT '',                      -- Category banner image
    "isActive"  BOOLEAN      NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- -------------------------------------------------------------------------------------
-- [TOC Entry 106] TABLE: public."Product"
-- Purpose: Menu items (Dishes) or Fresh Produce (Vegetables/Fruits).
-- Size/Columns: 19 columns.
-- Foreign Keys: vendorId -> Vendor(id), categoryId -> Category(id)
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Product" CASCADE;
CREATE TABLE "Product" (
    "id"             VARCHAR(36)   NOT NULL PRIMARY KEY,
    "vendorId"       VARCHAR(36)   NOT NULL REFERENCES "Vendor"("id") ON DELETE CASCADE,
    "categoryId"     VARCHAR(36)   NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT,
    "productType"    "ProductType" NOT NULL DEFAULT 'FOOD',       -- FOOD, VEGETABLE, FRUIT, GROCERY
    "name"           VARCHAR(150)  NOT NULL,                      -- Item Name
    "description"    TEXT,                                        -- Detailed description / ingredients
    "price"          DECIMAL(10, 2) NOT NULL,                     -- Standard Base Price (₹)
    "discountPrice"  DECIMAL(10, 2),                              -- Discounted Offer Price (₹)
    "unit"           VARCHAR(20)   NOT NULL DEFAULT 'portion',    -- Unit of measure (portion, kg, g, pc)
    "weightOptions"  JSONB,                                       -- Weight breakdown for Fresh mode [250g, 500g, 1kg]
    "isVeg"          BOOLEAN       NOT NULL DEFAULT true,         -- Vegetarian flag
    "isAvailable"    BOOLEAN       NOT NULL DEFAULT true,         -- In stock toggle
    "image"          TEXT          NOT NULL,                      -- High quality product photo URL
    "rating"         DECIMAL(2, 1) NOT NULL DEFAULT 4.5,           -- Average product rating
    "prepTime"       VARCHAR(20)   DEFAULT '15-20 min',           -- Preparation time
    "freshnessBadge" VARCHAR(50),                                 -- E.g., 'Arrived 6 AM Today'
    "stockKg"        DECIMAL(10, 2) DEFAULT 100.00,                -- Stock quantity in Kg for Fresh items
    "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_product_vendor" ON "Product"("vendorId");
CREATE INDEX "idx_product_category" ON "Product"("categoryId");
CREATE INDEX "idx_product_type" ON "Product"("productType");


-- -------------------------------------------------------------------------------------
-- [TOC Entry 107] TABLE: public."Cart" & "CartItem"
-- Purpose: Shopping cart active state management per user.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "CartItem" CASCADE;
DROP TABLE IF EXISTS "Cart" CASCADE;

CREATE TABLE "Cart" (
    "id"         VARCHAR(36)   NOT NULL PRIMARY KEY,
    "userId"     VARCHAR(36)   NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
    "vendorId"   VARCHAR(36)   REFERENCES "Vendor"("id") ON DELETE SET NULL,
    "cartType"   "VendorType"  NOT NULL DEFAULT 'CRAVINGS',
    "couponCode" VARCHAR(50),
    "discount"   DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CartItem" (
    "id"             VARCHAR(36)   NOT NULL PRIMARY KEY,
    "cartId"         VARCHAR(36)   NOT NULL REFERENCES "Cart"("id") ON DELETE CASCADE,
    "productId"      VARCHAR(36)   NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
    "name"           VARCHAR(150)  NOT NULL,
    "price"          DECIMAL(10, 2) NOT NULL,
    "selectedWeight" VARCHAR(50),
    "quantity"       INTEGER       NOT NULL DEFAULT 1,
    "isVeg"          BOOLEAN       NOT NULL DEFAULT true,
    "image"          TEXT
);


-- -------------------------------------------------------------------------------------
-- [TOC Entry 108] TABLE: public."Coupon"
-- Purpose: Promotional vouchers and discount rules.
-- Size/Columns: 11 columns.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Coupon" CASCADE;
CREATE TABLE "Coupon" (
    "id"            VARCHAR(36)   NOT NULL PRIMARY KEY,
    "code"          VARCHAR(50)   NOT NULL UNIQUE,                -- Coupon Code (e.g. WELCOME50)
    "title"         VARCHAR(100)  NOT NULL,                       -- Display Title
    "discountType"  VARCHAR(20)   NOT NULL DEFAULT 'PERCENTAGE',  -- FLAT or PERCENTAGE
    "discountValue" DECIMAL(10, 2) NOT NULL,                      -- Value (e.g., 50.00 or 20%)
    "minOrderValue" DECIMAL(10, 2) NOT NULL DEFAULT 199.00,       -- Minimum subtotal requirement
    "maxDiscount"   DECIMAL(10, 2) DEFAULT 120.00,                -- Cap for percentage discounts
    "validFrom"     TIMESTAMP(3),
    "validTo"       TIMESTAMP(3),
    "isActive"      BOOLEAN       NOT NULL DEFAULT true,
    "usageLimit"    INTEGER       NOT NULL DEFAULT 1000,
    "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- -------------------------------------------------------------------------------------
-- [TOC Entry 109] TABLE: public."Order"
-- Purpose: Master Authoritative Order Ledger.
-- Size/Columns: 18 columns.
-- Format: Order Number format: KR-YYYYMMDD-XXXXXX
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Order" CASCADE;
CREATE TABLE "Order" (
    "id"            VARCHAR(36)   NOT NULL PRIMARY KEY,
    "orderNumber"   VARCHAR(50)   NOT NULL UNIQUE,               -- Server generated KR-20260924-000123
    "orderType"     "VendorType"  NOT NULL DEFAULT 'CRAVINGS',
    "customerId"    VARCHAR(36)   NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "vendorId"      VARCHAR(36)   NOT NULL REFERENCES "Vendor"("id") ON DELETE RESTRICT,
    "vendorUserId"  VARCHAR(36)   REFERENCES "User"("id") ON DELETE SET NULL,
    "addressId"     VARCHAR(36)   REFERENCES "Address"("id") ON DELETE SET NULL,
    "couponId"      VARCHAR(36)   REFERENCES "Coupon"("id") ON DELETE SET NULL,
    "subtotal"      DECIMAL(10, 2) NOT NULL,                    -- Items total amount
    "deliveryFee"   DECIMAL(10, 2) NOT NULL DEFAULT 30.00,       -- Calculated delivery fee
    "tax"           DECIMAL(10, 2) NOT NULL DEFAULT 0.00,        -- Applicable GST / Tax
    "discount"      DECIMAL(10, 2) NOT NULL DEFAULT 0.00,        -- Applied coupon discount
    "totalAmount"   DECIMAL(10, 2) NOT NULL,                    -- Final Payable Amount (₹)
    "status"        "OrderStatus" NOT NULL DEFAULT 'PENDING',    -- Current lifecycle state
    "deliveryNotes" TEXT,                                        -- Delivery instructions
    "placedAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_order_customer" ON "Order"("customerId");
CREATE INDEX "idx_order_vendor" ON "Order"("vendorId");
CREATE INDEX "idx_order_status" ON "Order"("status");


-- -------------------------------------------------------------------------------------
-- [TOC Entry 110] TABLE: public."OrderItem"
-- Purpose: Order line item snapshots.
-- Size/Columns: 9 columns.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "OrderItem" CASCADE;
CREATE TABLE "OrderItem" (
    "id"             VARCHAR(36)   NOT NULL PRIMARY KEY,
    "orderId"        VARCHAR(36)   NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "productId"      VARCHAR(36)   NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT,
    "name"           VARCHAR(150)  NOT NULL,                      -- Item snapshot name
    "unitPrice"      DECIMAL(10, 2) NOT NULL,                     -- Price per unit at purchase time
    "lineTotal"      DECIMAL(10, 2) NOT NULL,                     -- unitPrice * quantity
    "quantity"       INTEGER       NOT NULL,                      -- Quantity ordered
    "selectedWeight" VARCHAR(50),                                 -- Selected weight option for Fresh
    "isVeg"          BOOLEAN       NOT NULL DEFAULT true
);

CREATE INDEX "idx_order_item_order" ON "OrderItem"("orderId");


-- -------------------------------------------------------------------------------------
-- [TOC Entry 111] TABLE: public."OrderTimeline"
-- Purpose: Audit history of status state transitions.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "OrderTimeline" CASCADE;
CREATE TABLE "OrderTimeline" (
    "id"        VARCHAR(36)  NOT NULL PRIMARY KEY,
    "orderId"   VARCHAR(36)  NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "status"    "OrderStatus" NOT NULL,
    "note"      TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- -------------------------------------------------------------------------------------
-- [TOC Entry 112] TABLE: public."Payment"
-- Purpose: Financial transaction ledger & COD cash collection accounting.
-- Size/Columns: 10 columns.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Payment" CASCADE;
CREATE TABLE "Payment" (
    "id"            VARCHAR(36)   NOT NULL PRIMARY KEY,
    "orderId"       VARCHAR(36)   NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE CASCADE,
    "transactionId" VARCHAR(100)  UNIQUE,                        -- External Txn ID / COD Ref ID
    "provider"      VARCHAR(50)   DEFAULT 'COD',                 -- COD, Razorpay, PayTM
    "method"        "PaymentMethod" NOT NULL DEFAULT 'COD',      -- COD or ONLINE
    "amount"        DECIMAL(10, 2) NOT NULL,                     -- Total collected amount
    "status"        "PaymentStatus" NOT NULL DEFAULT 'PENDING',  -- PENDING, PAID, FAILED, REFUNDED
    "collectedBy"   VARCHAR(36),                                 -- Delivery Partner User ID
    "paidAt"        TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_payment_status" ON "Payment"("status");


-- -------------------------------------------------------------------------------------
-- [TOC Entry 113] TABLE: public."Refund"
-- Purpose: Dedicated ledger for recording order refunds.
-- Size/Columns: 9 columns.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Refund" CASCADE;
CREATE TABLE "Refund" (
    "id"           VARCHAR(36)   NOT NULL PRIMARY KEY,
    "orderId"      VARCHAR(36)   NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "paymentId"    VARCHAR(36)   NOT NULL REFERENCES "Payment"("id") ON DELETE CASCADE,
    "refundAmount" DECIMAL(10, 2) NOT NULL,                     -- Amount refunded (₹)
    "reason"       TEXT,                                        -- Cancellation / Complaint reason
    "status"       "RefundStatus" NOT NULL DEFAULT 'PENDING',   -- PENDING, PROCESSED, FAILED
    "gatewayTxnId" VARCHAR(100),
    "processedAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- -------------------------------------------------------------------------------------
-- [TOC Entry 114] TABLE: public."Delivery"
-- Purpose: Driver assignment, route coordinates, and trip earnings.
-- Size/Columns: 17 columns.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Delivery" CASCADE;
CREATE TABLE "Delivery" (
    "id"                VARCHAR(36)    NOT NULL PRIMARY KEY,
    "orderId"           VARCHAR(36)    NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE CASCADE,
    "deliveryPartnerId" VARCHAR(36)    NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "status"            "DeliveryStatus" NOT NULL DEFAULT 'ASSIGNED',
    "pickupLat"         DECIMAL(10, 7),                           -- Vendor Pickup Latitude
    "pickupLng"         DECIMAL(10, 7),                           -- Vendor Pickup Longitude
    "dropLat"           DECIMAL(10, 7),                           -- Customer Drop Latitude
    "dropLng"           DECIMAL(10, 7),                           -- Customer Drop Longitude
    "currentLat"        DECIMAL(10, 7),                           -- Driver Current GPS Latitude
    "currentLng"        DECIMAL(10, 7),                           -- Driver Current GPS Longitude
    "earnings"          DECIMAL(10, 2) NOT NULL DEFAULT 65.00,    -- Driver Trip Earnings (₹)
    "distanceKm"        DECIMAL(5, 2)  NOT NULL DEFAULT 3.40,     -- Calculated Trip Distance
    "estimatedMinutes"  INTEGER        NOT NULL DEFAULT 20,       -- Estimated delivery duration
    "pickupAt"          TIMESTAMP(3),
    "deliveredAt"       TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "idx_delivery_driver" ON "Delivery"("deliveryPartnerId");
CREATE INDEX "idx_delivery_status" ON "Delivery"("status");


-- -------------------------------------------------------------------------------------
-- [TOC Entry 115] TABLE: public."DeliveryLocation"
-- Purpose: Historical GPS breadcrumbs log for active deliveries.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "DeliveryLocation" CASCADE;
CREATE TABLE "DeliveryLocation" (
    "id"         VARCHAR(36)  NOT NULL PRIMARY KEY,
    "deliveryId" VARCHAR(36)  NOT NULL REFERENCES "Delivery"("id") ON DELETE CASCADE,
    "latitude"   DECIMAL(10, 7) NOT NULL,
    "longitude"  DECIMAL(10, 7) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- -------------------------------------------------------------------------------------
-- [TOC Entry 116] TABLE: public."Review"
-- Purpose: Customer ratings & feedback for vendors and delivery partners.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Review" CASCADE;
CREATE TABLE "Review" (
    "id"                VARCHAR(36) NOT NULL PRIMARY KEY,
    "userId"            VARCHAR(36) NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "vendorId"          VARCHAR(36) NOT NULL REFERENCES "Vendor"("id") ON DELETE CASCADE,
    "orderId"           VARCHAR(36) NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE CASCADE,
    "deliveryPartnerId" VARCHAR(36) REFERENCES "User"("id") ON DELETE SET NULL,
    "rating"            INTEGER     NOT NULL,                     -- Star rating (1 - 5)
    "comment"           TEXT,                                     -- Customer review feedback
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- -------------------------------------------------------------------------------------
-- [TOC Entry 117] TABLE: public."Notification"
-- Purpose: In-app user notifications and background alert events.
-- -------------------------------------------------------------------------------------
DROP TABLE IF EXISTS "Notification" CASCADE;
CREATE TABLE "Notification" (
    "id"        VARCHAR(36)  NOT NULL PRIMARY KEY,
    "userId"    VARCHAR(36)  NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "title"     VARCHAR(150) NOT NULL,
    "message"   TEXT         NOT NULL,
    "type"      VARCHAR(50)  NOT NULL DEFAULT 'ORDER_UPDATE',
    "isRead"    BOOLEAN      NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================================================
-- SECTION 3: PRODUCTION DATA INSERTS
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 3.1 USERS INVENTORY (Admins, Consumers, Vendor Owners, Delivery Partners)
-- Password for all seed users: "password123" (Bcrypt Hashed)
-- -------------------------------------------------------------------------------------
INSERT INTO "User" ("id", "fullName", "email", "phone", "passwordHash", "role", "status", "avatar", "vehicleType") VALUES
('usr-admin-01',   'Super Admin - Ankit',      'admin@krawing.com',         '+919000000001', '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'ADMIN',            'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', 'Car'),
('usr-rahul-01',   'Rahul Sharma',            'rahul@gmail.com',           '9876543210',    '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'CUSTOMER',         'active', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200', NULL),
('usr-aman-02',    'Aman Verma',              'aman@gmail.com',            '9876543211',    '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'CUSTOMER',         'active', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=200', NULL),
('usr-priya-03',   'Priya Singh',             'priya@gmail.com',           '9876543212',    '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'CUSTOMER',         'active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', NULL),
('usr-driver-01',  'Arjun Delivery Partner',  'driver.arjun@krawing.com',  '9000000002',    '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'DELIVERY_PARTNER', 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', 'Bike'),
('usr-driver-02',  'Deepak Delivery Partner', 'driver.deepak@krawing.com', '9000000003',    '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'DELIVERY_PARTNER', 'active', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200', 'Scooter'),
('usr-vendor-01',  'Vikas Mehta (Food Hub)',  'foodhub@gmail.com',         '9811111111',    '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'VENDOR',           'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', NULL),
('usr-vendor-02',  'Rediwala Outlet Owner',   'rediwala@krawing.com',      '8383892804',    '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'VENDOR',           'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', NULL),
('usr-vendor-03',  'Jai Bharat Owner',        'jaibharat@krawing.com',     '9811122233',    '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'VENDOR',           'active', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200', NULL),
('usr-vendor-04',  'Ram Kumar (Mandi Owner)', 'mandi@krawing.com',         '9444455555',    '$2a$10$wT0E.T0R7/8F7B5pB4K17eTz3/t7A6f2.', 'VENDOR',           'active', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200', NULL);


-- -------------------------------------------------------------------------------------
-- 3.2 ADDRESSES INVENTORY
-- -------------------------------------------------------------------------------------
INSERT INTO "Address" ("id", "userId", "label", "addressLine", "city", "state", "pincode", "latitude", "longitude", "isDefault") VALUES
('addr-01', 'usr-rahul-01', 'Home', 'H.No 142, Sector 15',      'Gurugram',  'Haryana', '122001', 28.4595000, 77.0266000, true),
('addr-02', 'usr-aman-02',  'Home', 'Flat 402, Sector 21',     'Noida',     'Uttar Pradesh', '201301', 28.5823000, 77.3540000, true),
('addr-03', 'usr-priya-03', 'Work', 'Tower B, Connaught Place', 'New Delhi', 'Delhi',   '110001', 28.6315000, 77.2167000, true);


-- -------------------------------------------------------------------------------------
-- 3.3 CATEGORIES CATALOG
-- -------------------------------------------------------------------------------------
INSERT INTO "Category" ("id", "name", "slug", "icon", "image") VALUES
('cat-pizza-01', 'Pizza',            'pizza',            'Pizza',    'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&q=80&w=300'),
('cat-momos-02', 'Momos',            'momos',            'Utensils', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=300'),
('cat-north-03', 'North Indian',     'north-indian',     'Utensils', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=300'),
('cat-veg-04',   'Daily Vegetables', 'daily-vegetables', 'Leaf',     'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300');


-- -------------------------------------------------------------------------------------
-- 3.4 VENDORS INVENTORY (Food Outlets + Sabzi Mandi)
-- -------------------------------------------------------------------------------------
INSERT INTO "Vendor" ("id", "ownerUserId", "vendorType", "name", "phone", "email", "address", "city", "latitude", "longitude", "rating", "numRatings", "deliveryFee", "isVegOnly", "status", "image", "bannerImage", "freshTagline") VALUES
('vnd-foodhub-01',  'usr-vendor-01', 'CRAVINGS', 'Food Hub',                   '9811111111', 'foodhub@gmail.com',    'Sector 14',                    'Gurugram',  28.4590000, 77.0390000, 4.5, 120, 30.00, false, 'open', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1200', NULL),
('vnd-rediwala-02', 'usr-vendor-02', 'CRAVINGS', 'Rediwala fastfood junction',  '8383892804', 'rediwala@krawing.com', 'Lakkarpur, Shiv Durga Vihar', 'Faridabad', 28.4866000, 77.2918000, 4.8,  45, 25.00, true,  'open', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&q=80&w=1200', NULL),
('vnd-jaibharat-03','usr-vendor-03', 'CRAVINGS', 'Jai Bharat Restaurant',      '9811122233', 'jaibharat@krawing.com','D2/10, Dayal Bagh Rd',        'Faridabad', 28.4866000, 77.2918000, 5.0,  60, 30.00, true,  'open', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=1200', NULL),
('vnd-mandi-04',    'usr-vendor-04', 'FRESH',    'Lakkarpur Wholesale Sabzi Mandi', '9444455555', 'mandi@krawing.com',  'Wholesale Mandi Market',       'Faridabad', 28.4866000, 77.2918000, 4.9, 180, 15.00, true,  'open', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?auto=format&fit=crop&q=80&w=1200', 'Wholesale Price Guarantee • Handpicked Fresh Daily');


-- -------------------------------------------------------------------------------------
-- 3.5 PRODUCTS CATALOG
-- -------------------------------------------------------------------------------------
INSERT INTO "Product" ("id", "vendorId", "categoryId", "productType", "name", "description", "price", "discountPrice", "unit", "weightOptions", "isVeg", "isAvailable", "image", "rating", "freshnessBadge") VALUES
('prd-pizza-01',    'vnd-foodhub-01',  'cat-pizza-01', 'FOOD',      'Farmhouse Pizza',                'Loaded with fresh mushrooms, capsicum, tomatoes & mozzarella.',                399.00, 349.00, 'portion', NULL, true, true, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&q=80&w=400', 4.5, NULL),
('prd-momos-02',    'vnd-rediwala-02', 'cat-momos-02', 'FOOD',      'Steamed Veg Momos (10 Pcs)',     'Classic steamed dumplings filled with cabbage, carrots, and ginger.',           90.00,  90.00, 'portion', NULL, true, true, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=400', 4.8, NULL),
('prd-thali-03',    'vnd-jaibharat-03','cat-north-03', 'FOOD',      'Special Shahi Thali',            'Complete meal with Paneer Butter Masala, Dal Makhani, Mix Veg, Rice & 3 Roti.',220.00, 220.00, 'portion', NULL, true, true, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=400', 5.0, NULL),
('prd-tomatoes-04', 'vnd-mandi-04',    'cat-veg-04',   'VEGETABLE', 'Fresh Desi Tomatoes (Tamatar)',   'Juicy red tomatoes freshly plucked from local farms this morning.',              38.00,  38.00, 'kg',      '[{"weightLabel":"250g","price":10},{"weightLabel":"500g","price":19},{"weightLabel":"1kg","price":38}]'::jsonb, true, true, 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400', 4.9, 'Arrived 6 AM Today');


-- -------------------------------------------------------------------------------------
-- 3.6 COUPONS INVENTORY
-- -------------------------------------------------------------------------------------
INSERT INTO "Coupon" ("id", "code", "title", "discountType", "discountValue", "minOrderValue", "maxDiscount") VALUES
('cpn-welcome50', 'WELCOME50', 'FLAT ₹50 OFF',          'FLAT',       50.00, 199.00, 50.00),
('cpn-save20',    'SAVE20',    '20% OFF on Cravings',   'PERCENTAGE', 20.00, 299.00, 100.00);


-- -------------------------------------------------------------------------------------
-- 3.7 SAMPLE ORDERS, LINE ITEMS, PAYMENTS & DRIVER DELIVERIES
-- -------------------------------------------------------------------------------------
INSERT INTO "Order" ("id", "orderNumber", "orderType", "customerId", "vendorId", "addressId", "couponId", "subtotal", "deliveryFee", "tax", "discount", "totalAmount", "status", "deliveryNotes") VALUES
('ord-001', 'KR-20260924-000101', 'CRAVINGS', 'usr-rahul-01', 'vnd-foodhub-01', 'addr-01', 'cpn-welcome50', 349.00, 30.00, 17.45, 50.00, 346.45, 'DELIVERED', 'Please ring doorbell');

INSERT INTO "OrderItem" ("id", "orderId", "productId", "name", "unitPrice", "lineTotal", "quantity", "isVeg") VALUES
('item-001', 'ord-001', 'prd-pizza-01', 'Farmhouse Pizza', 349.00, 349.00, 1, true);

INSERT INTO "Payment" ("id", "orderId", "transactionId", "provider", "method", "amount", "status", "collectedBy", "paidAt") VALUES
('pay-001', 'ord-001', 'TXN-COD-10001', 'COD', 'COD', 346.45, 'PAID', 'usr-driver-01', CURRENT_TIMESTAMP);

INSERT INTO "Delivery" ("id", "orderId", "deliveryPartnerId", "status", "pickupLat", "pickupLng", "dropLat", "dropLng", "currentLat", "currentLng", "earnings", "distanceKm", "estimatedMinutes", "deliveredAt") VALUES
('del-001', 'ord-001', 'usr-driver-01', 'DELIVERED', 28.4590000, 77.0390000, 28.4595000, 77.0266000, 28.4595000, 77.0266000, 65.00, 2.40, 18, CURRENT_TIMESTAMP);

INSERT INTO "Review" ("id", "userId", "vendorId", "orderId", "deliveryPartnerId", "rating", "comment") VALUES
('rev-001', 'usr-rahul-01', 'vnd-foodhub-01', 'ord-001', 'usr-driver-01', 5, 'Super fast delivery and delicious pizza!');


-- =====================================================================================
-- KRAWING UNIFIED DATABASE DUMP COMPLETE & VERIFIED
-- =====================================================================================
