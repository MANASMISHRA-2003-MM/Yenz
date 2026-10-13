# 🛍️ Milega Food — Customer Android App (Capacitor)

Yeh aapka **Separate Dedicated Customer App** hai jo exclusively aapke customers ke liye banaya gaya hai. Isme Vendor Dashboard, Rider Dashboard aur Admin Panel ke saare routes aur buttons hata diye gaye hain taaki customers ko sirf unka food & grocery shopping experience mile.

---

## 📱 Features Included in Customer App
1. **Home Feed (`/home`, `/`)**:
   - Cravings Mode (Dishes, Restaurants, Fast Food)
   - Fresh Mandi Mode (Sabzi Mandi, Fruits, Grocery essentials)
   - Live location selector & delivery ETA
   - Category carousels & promotional banners
2. **Search & Discovery (`/search`)**:
   - Dishes, restaurants, fresh produce search
   - Pure Veg filter toggle
3. **Restaurant & Product Detail (`/restaurant/:id`)**:
   - Menu categories, dish options & customization modal
   - Add to Cart with live quantity badge
4. **Cart & Checkout (`/cart`, `/checkout`)**:
   - Cravings & Fresh Mandi split baskets
   - Saved Address selection & GPS Pin map modal
   - Cash on Delivery (COD) & Online UPI options
5. **Real-time Order Tracking (`/order-tracking/:id`)**:
   - Live GPS Driver map tracking (Leaflet OSM)
   - Status steps: Order Placed ➔ Confirmed ➔ Preparing ➔ Out for Delivery ➔ Delivered
   - Socket.IO real-time event updates
6. **Order History (`/orders`, `/history`)**:
   - Past orders list, item details & reordering
7. **Customer Account & Profile (`/profile`)**:
   - Customer details & address book management
   - **Live Backend Server Connection Status** (Ping test & dynamic URL switcher directly inside the app!)
8. **Auth (`/login`, `/register`)**:
   - Customer login and signup

---

## ⚙️ Capacitor & Android Setup Details

| Property | Value |
|---|---|
| **App Name** | Milega Food |
| **Package ID / Application ID** | `com.milega.customer` |
| **Framework** | React 18 + Vite + Tailwind CSS |
| **Native Wrapper** | Capacitor 6 (`@capacitor/android`, `@capacitor/core`, `@capacitor/cli`) |
| **Web Build Directory** | `dist` |
| **Android Project Path** | `customer-app/android/` |
| **Cleartext Traffic (HTTP)** | Enabled (`android:usesCleartextTraffic="true"` in AndroidManifest.xml) |
| **Permissions** | `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` |

---

## 🔌 Backend Connectivity (Kaise Connect Hoga?)

Aapke phone ka app backend se 3 tarike se connect ho sakta hai bina kisi pareshani ke:

### 1. Physical Phone par Local Backend (Same Wi-Fi)
- Jab aapka phone aur laptop/PC **same Wi-Fi** se connected honge:
- App automatically aapke PC ke LAN IP (`http://192.168.1.7:5000`) se connect karega.
- Yeh setting `.env` file me already saved hai:
  ```env
  VITE_API_URL=http://192.168.1.7:5000
  ```

### 2. Live Cloud / Render Backend (Production)
- Jab aapka backend Render par live ho:
- `.env` me URL badal dijiye:
  ```env
  VITE_API_URL=https://krawing-backend.onrender.com
  ```
- Ya fir **seedhe mobile app ke andar**:
  - App open kijiye ➔ **Account (Profile)** me jaiye
  - **Backend Server Connection** card dekhiye
  - **"Edit Server URL / IP"** par tap karke apna Render URL daaliye aur Save kar dijiye!
  - App turant bina rebuild kiye naye backend se connect ho jayega!

---

## 🚀 Quick Commands

Sabhi commands `customer-app` folder ke andar run karein:

```bash
# 1. Web dev server start karein (Browser me dekhne ke liye):
npm run dev

# 2. Frontend build karein aur Android project me sync karein:
npm run build:android

# 3. Android Studio open karein:
npm run cap:open

# 4. Sab kuch 1-command me karein (Build + Sync + Open Android Studio):
npm run android
```

---

## 📲 Phone par Run & APK Generate Karne ka Step-by-Step Tarika

1. **Android Studio Open Karein**:
   ```bash
   cd customer-app
   npm run cap:open
   ```
   *(Ya Android Studio open karke `customer-app/android` folder ko "Open Project" karein)*

2. **Physical Phone Connect Karein**:
   - Phone ki Settings me jakar **Developer Options** enable karein.
   - **USB Debugging** ON karein.
   - Phone ko USB cable se PC me connect karein.

3. **App Run Karein**:
   - Android Studio ke top bar me apna phone select karein.
   - Green **Run (Play ▶)** button par click karein.
   - App aapke phone me install ho kar live start ho jayegi!

4. **Standalone APK Generate Karein (Customers ko share karne ke liye)**:
   - Android Studio me top menu me jaiye:
     `Build` ➔ `Build Bundle(s) / APK(s)` ➔ `Build APK(s)`
   - 1-2 minute me APK generate ho jayegi:
     `customer-app/android/app/build/outputs/apk/debug/app-debug.apk`
   - Is APK file ko aap kisi bhi Android phone ya customer ko WhatsApp/Drive ke zariye send kar sakte hain!
