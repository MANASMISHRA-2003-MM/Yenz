# Milega Vendor Android App 🏪

Dedicated Android and Web application for Milega / Yenz store partners, restaurants, and grocery merchants. Built with **React 18**, **Vite**, **Tailwind CSS**, and **Capacitor 6** for native Android APK generation.

---

## 🎯 Architecture & Features

1. **Vendor Authentication & Onboarding**:
   - Dedicated vendor login (`/login`) with instant 1-tap demo testing.
   - New store partner registration (`/register`) with role `vendor`.
   - Comprehensive onboarding & legal compliance status (`/vendor/onboarding`) querying existing `/api/restaurants/application/me` and submitting `/api/restaurants/application`.

2. **Real-Time Live Orders Pipeline**:
   - Synchronized with customer and delivery partner apps via **Socket.IO** (`join_vendor_room`, `order:created`, `order:status_updated`, `delivery:status_updated`).
   - Loud repeating cash register chime & phone vibration alarms for new incoming orders until accepted or rejected.
   - Itemized order preview decision modal (`Accept Order` / `Reject Order`).
   - Kitchen workflow: Mark Food Prepared (`READY_FOR_PICKUP`).
   - Camera handover verification: Click live photo of food package before handing to delivery rider (`PICKED_UP`).
   - Direct click-to-call assigned delivery partner (`tel:`).

3. **Store Management & Master Menu**:
   - Interactive Open/Closed store status slider (`PUT /api/restaurants/vendor/toggle-status`).
   - Real-time product availability toggle (Available / Out of Stock) via `PUT /api/foods/:id`.
   - Master Menu Sticky Bar & Price Booklet modal for quick price adjustments.
   - High-res Master Menu Card photo upload (direct base64 to DB via `PUT /api/restaurants/:id`) and lightbox viewer.

4. **Order History & Store Settings**:
   - Order history archive with search and status filtering (`/orders`).
   - In-app backend connection tester & IP override (`/settings`) allowing testing on any Wi-Fi network without rebuilding the APK.

---

## 📱 Android APK Details

- **Package ID**: `com.milega.vendor`
- **App Name**: `Milega Vendor`
- **Permissions**: `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`, `VIBRATE`
- **Network Traffic**: `android:usesCleartextTraffic="true"` configured to allow connecting to HTTP local server (`http://192.168.1.7:5000`).
- **Debug APK Location**:
  `vendor-app/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🚀 Running & Building

### 1. Run Web Dev Server (Port 5174)
```bash
cd vendor-app
npm run dev
```

### 2. Build Web Bundle
```bash
cd vendor-app
npm run build
```

### 3. Sync to Android Native Project
```bash
cd vendor-app
npm run cap:sync
```

### 4. Build Android Debug APK
```bash
cd vendor-app
npm run build:apk
```

Or directly inside the `android/` directory:
```bash
cd vendor-app/android
$env:JAVA_HOME = "C:\Users\Ankit\.jdks\jbr-17.0.14"
.\gradlew.bat assembleDebug
```

### 5. Install on Physical Android Phone or Emulator
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🌐 Network Configuration for Android Devices

When running on an Android phone, `localhost` refers to the phone itself.
- Default configured LAN IP: `http://192.168.1.7:5000` (in `vendor-app/.env` and `src/services/api.js`).
- If your laptop's Wi-Fi IP changes, open **Settings** inside the app to test the connection and update the IP instantly without reinstalling the APK.
