# Disaster Preparedness & Safe Evacuation Mapping System
## Irosin, Sorsogon, Philippines — MDRRMO LGU System

A full-stack, production-architecture disaster preparedness and safe evacuation mapping system for selected barangays in Irosin, Sorsogon.

---

## ⚠️ DEMO MODE NOTICE
All disaster data in this system (barangays, evacuation centers, hazard zones, routes, emergency contacts, alerts) is **DEMO DATA** clearly labeled as such. No official disaster information has been fabricated. Replace with official LGU/MDRRMO data when going live.

---

## Project Structure

```
disaster-safety-system/
├── mobile/         # React Native + Expo — Resident Android App
├── admin/          # React + Vite + Tailwind CSS — MDRRMO Admin Dashboard
├── backend/        # Node.js + Express + TypeScript — REST API
├── .gitignore
└── README.md
```

---

## Quick Start

### 1. Start the Backend API
```bash
cd backend
npm install
npm run dev
# API: http://localhost:5000
# Health: http://localhost:5000/health
```

### 2. Start the Admin Dashboard
```bash
cd admin
npm install
npm run dev
# Dashboard: http://localhost:3000
```

**Admin Demo Login:**
- Email: `mdrmo.admin@irosin.gov.ph`
- Password: `admin123`

### 3. Start the Mobile App
```bash
cd mobile
npm install
npx expo start
# Scan QR with Expo Go app on Android phone
# OR: npx expo run:android (for USB debugging)
```

---

## Required Credentials (for Production)

| Credential | File | Purpose |
|---|---|---|
| `FIREBASE_PROJECT_ID` | `backend/.env` | Firestore database |
| `FIREBASE_CLIENT_EMAIL` | `backend/.env` | Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | `backend/.env` | Firebase Admin SDK |
| `SMS_API_KEY` | `backend/.env` | Semaphore SMS (Philippines) |
| `SMS_SENDER_NAME` | `backend/.env` | Semaphore sender name |
| `GOOGLE_MAPS_API_KEY` | `backend/.env` | Geocoding/Directions |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | `mobile/.env` | Mobile map display |
| Official MDRRMO Data | Replace DEMO DATA | Barangays, centers, routes, hazards |

> **Security:** Never expose Firebase Admin, JWT secret, or SMS API keys to the mobile app or admin browser. All sensitive credentials MUST stay in `backend/.env`.

---

## Architecture Overview

```
Android Mobile App (Expo)
    ↓ REST API (HTTPS)
Backend API (Node.js + Express)
    ├── Firebase Firestore (Database)
    ├── Firebase Cloud Messaging (Push Notifications)
    └── Semaphore SMS Gateway (Emergency SMS)
MDRRMO Admin Dashboard (React)
    ↓ REST API (HTTPS)
Same Backend API
```

---

## Features Implemented

### ✅ Resident Mobile App
- Home screen with Emergency Status Banner
- Interactive Map (evacuation centers, hazard zones, official routes)
- Evacuation Center listing with full details and facilities
- Official Evacuation Routes (admin-verified only)
- Preparedness Guides (Before/During/After + by hazard type)
- Emergency Contacts with tap-to-call
- Disaster Alerts feed
- Disaster Report submission
- Offline caching with clear "Offline" indicators

### ✅ MDRRMO Admin Dashboard
- Professional dark-mode command dashboard
- Barangay management (CRUD)
- Hazard Zone management (CRUD + polygon coordinates)
- Evacuation Center management (CRUD + facilities + occupancy)
- Evacuation Route management (CRUD + waypoints)
- Preparedness Guide management (CRUD + publish/unpublish)
- Emergency Contacts management (CRUD)
- Emergency Alert Composer with mandatory confirmation modal
- Push notification + SMS dispatch (mock mode without API keys)
- Disaster Report review + verification workflow
- Analytics & CSV export
- User role management overview
- Audit log viewer
- System settings & integration status

### ✅ Backend API
- JWT authentication with RBAC (RESIDENT / BARANGAY_OFFICIAL / MDRRMO_ADMIN)
- Rate limiting (API + auth endpoints)
- Zod input validation on all endpoints
- Helmet security headers
- Firebase Admin SDK with mock store fallback
- FCM push notifications (mock mode without key)
- Semaphore SMS integration (mock mode without key)
- Audit logging of all admin actions
- CSV export endpoint
- Never trusts role claims from client alone

---

## Development Phases Status

| Phase | Description | Status |
|---|---|---|
| 1 | Project setup, auth, database schema | ✅ Complete |
| 2 | Admin dashboard CRUD | ✅ Complete |
| 3 | Mobile map module | ✅ Complete |
| 4 | Mobile information modules | ✅ Complete |
| 5 | Push + SMS notifications | ✅ Architecture done (mock mode) |
| 6 | Reports, audit logs | ✅ Complete |
| 7 | Offline caching, security hardening | ✅ Implemented |

---

## MDRRMO Irosin — Official Data Replacement Checklist

When official data is ready, replace the following `[DEMO DATA]` records:

- [ ] Barangays in Irosin, Sorsogon (official boundaries, populations)
- [ ] Evacuation centers (official addresses, capacities, contacts)
- [ ] Hazard zones (official MDRRMO / PHIVOLCS / MGB polygons)
- [ ] Evacuation routes (official MDRRMO-verified routes and waypoints)
- [ ] Emergency contacts (official hotlines and personnel)
- [ ] Preparedness guides (official MDRRMO preparedness content)
- [ ] Google Maps API key (configured with Maps SDK for Android, enabled APIs)
- [ ] Firebase project (Firestore, Cloud Messaging, Auth)
- [ ] Semaphore SMS API key

---

*System developed for LGU Irosin MDRRMO Capstone Project — Irosin, Sorsogon, Philippines*
