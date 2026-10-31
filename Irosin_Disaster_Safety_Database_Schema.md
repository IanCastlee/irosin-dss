# IROSIN DISASTER SAFETY SYSTEM — FIRESTORE DATABASE SCHEMA

**System Name:** Irosin Disaster Safety System (Decision Support & Early Warning System)  
**Target Authority:** Municipal Disaster Risk Reduction and Management Office (MDRRMO) — Irosin, Sorsogon  
**Database Architecture:** Google Firebase Cloud Firestore (NoSQL Document Store)  
**Document Version:** 1.0 (Official Technical Release)  

---

## Executive Summary
This document provides the official technical database schema specifications for the **Irosin Disaster Safety System**. It details the primary operational domain collections, document field definitions, data types, entity relationships, and role-based security access control policies designed in compliance with the **Data Privacy Act of 2012 (RA 10173)**.

---

## Core Domain Collections

### 1. `users` (User Accounts & Responders)
- **Purpose:** Central user registry managing identity, authentication, role-based access control (MDRRMO Admin, Official BDRRMC Responder, Barangay Official, Resident), hashed credentials, and territorial jurisdiction.
- **Document Fields & Data Types:**
  - `id`: `string` — Unique user document identifier (Firebase UID / Generated ID).
  - `username`: `string` *(optional)* — Unique alphanumeric login username (no whitespace).
  - `email`: `string` *(optional)* — Administrative email address.
  - `password`: `string` — Securely hashed password using Bcrypt (10 salt rounds).
  - `fullName`: `string` — Full legal name of the user or officer.
  - `phone`: `string` — Contact mobile number (`09XXXXXXXXX`).
  - `role`: `string (enum)` — `'MDRRMO_ADMIN'` | `'RESPONDER'` | `'BARANGAY_OFFICIAL'` | `'RESIDENT'`.
  - `roleTitle`: `string` *(optional)* — Official designation (e.g., *"Barangay Tanod"*, *"BDRRMC Officer"*).
  - `barangayId`: `string` — Foreign reference to `barangays.id` (or `'all'` for municipal-wide MDRRMO HQ).
  - `barangayName`: `string` *(optional)* — Name of the assigned barangay.
  - `isMunicipalWide`: `boolean` *(optional)* — Flag indicating municipality-wide jurisdiction.
  - `status`: `string (enum)` — `'ACTIVE'` | `'PENDING_APPROVAL'` | `'REJECTED'` | `'INACTIVE'`.
  - `fcmToken`: `string` *(optional)* — Mobile push notification device token.
  - `adminNotes`: `string` *(optional)* — Administrative approval remarks or password reset notes.
  - `createdAt` / `updatedAt`: `timestamp (ISO 8601)` — Timestamps of account creation and update.
- **Relationships:**
  - `1:N` with `barangays` (`barangayId` ➔ `barangays.id`)
  - `1:N` with `disaster_reports` (`reportedBy`, `verifiedBy` ➔ `users.id`)
  - `1:N` with `chats` (`participantIds` ➔ `users.id`)
  - `1:N` with `audit_logs` (`performedBy` ➔ `users.id`)
- **Security Rules:**
  - *Read:* Authenticated users can view their own profile; Active Responders can view fellow active responders for internal chat directories; `MDRRMO_ADMIN` can read all records.
  - *Write:* Users can modify their own basic profile details; Only `MDRRMO_ADMIN` can modify `role`, update account `status`, or reset credentials.

---

### 2. `barangays` (Administrative Master & GIS Boundaries)
- **Purpose:** Master catalog of the 28 administrative barangays of Irosin and 24 barangays of Bulusan, storing centroid coordinates, demographic population baselines, and boundary polygon vectors for risk mapping.
- **Document Fields & Data Types:**
  - `id`: `string` — Primary Key (e.g., `"brgy-irosin-1"`, `"brgy-1"`).
  - `name`: `string` — Official barangay title (e.g., `"San Julian"`, `"Gabao"`, `"Bacolod"`).
  - `municipality`: `string` — Municipality jurisdiction (`"Irosin"` or `"Bulusan"`).
  - `province`: `string` — Province name (`"Sorsogon"`).
  - `latitude` / `longitude`: `number (float)` — Geographic centroid GPS coordinates.
  - `population`: `number (int)` *(optional)* — Registered community population.
  - `boundaryJson`: `string (GeoJSON)` *(optional)* — GeoJSON polygon coordinate string for boundary rendering.
  - `status`: `string (enum)` — `'ACTIVE'` | `'INACTIVE'`.
  - `createdAt` / `updatedAt`: `timestamp (ISO 8601)`.
- **Relationships:**
  - Foundational geographic entity referenced by `users`, `evacuation_centers`, `evacuation_routes`, `disaster_reports`, and `alerts`.
- **Security Rules:**
  - *Read:* Publicly readable without authentication to allow client map rendering and registration.
  - *Write:* Restricted strictly to `MDRRMO_ADMIN`.

---

### 3. `disaster_reports` (Citizen & Responder Incident Triage)
- **Purpose:** Field incident reports submitted by citizens and ground responders (flooding, road blockages, landslides, structural damage) for verification and emergency dispatch.
- **Document Fields & Data Types:**
  - `id`: `string` — Unique incident report identifier.
  - `reportType`: `string (enum)` — `'FLOODING'` | `'BLOCKED_ROAD'` | `'DAMAGED_ROAD'` | `'LANDSLIDE'` | `'DAMAGED_EVACUATION_CENTER'` | `'UNSAFE_ROUTE'` | `'OTHER'`.
  - `description`: `string` — Detailed incident narrative.
  - `latitude` / `longitude`: `number (float)` — Precise GPS location of the reported hazard.
  - `locationDescription`: `string` — Landmark, street, or community location.
  - `barangayId` / `barangayName`: `string` — Jurisdiction of the incident.
  - `reportedBy`: `string` — User ID or guest session identifier.
  - `reporterName` / `reporterPhone`: `string` — Contact information of the reporting individual.
  - `reporterRole`: `string (enum)` — `'RESIDENT'` | `'RESPONDER'` | `'BARANGAY_OFFICIAL'`.
  - `photoUrl` / `photos`: `string / array<string>` *(optional)* — Firebase Storage image URLs.
  - `status`: `string (enum)` — `'PENDING'` | `'VERIFIED'` | `'UNDER_CLEARING'` | `'RESOLVED'` | `'REJECTED'`.
  - `adminNotes`: `string` *(optional)* — Action log from MDRRMO or field response units.
  - `verifiedBy`: `string` *(optional)* — Name of the responder or administrator who validated the report.
  - `createdAt` / `updatedAt`: `timestamp (ISO 8601)`.
- **Relationships:**
  - Foreign references to `barangays.id` (`barangayId`) and `users.id` (`reportedBy`, `verifiedBy`).
- **Security Rules:**
  - *Create:* Open to all residents and field responders.
  - *Read:* Public mobile safety map displays only `VERIFIED` and `UNDER_CLEARING` reports; Responders and Admins can view all reports including `PENDING`.
  - *Update:* Only authorized BDRRMC Responders in their jurisdiction and `MDRRMO_ADMIN` can verify reports, update status, and attach operational notes.

---

### 4. `evacuation_centers` (Designated Evacuation Centers & Capacity)
- **Purpose:** Real-time occupancy tracking, capacity management, and amenities directory for all officially designated municipal evacuation sites.
- **Document Fields & Data Types:**
  - `id`: `string` — Primary Key (e.g., `"evac-gym"`, `"evac-1"`).
  - `name`: `string` — Official facility title (e.g., `"Irosin Municipal Gymnasium"`).
  - `barangayId` / `barangayName`: `string` — Barangay where the facility is situated.
  - `address`: `string` — Complete physical street address.
  - `latitude` / `longitude`: `number (float)` — GPS coordinates for turn-by-turn navigation.
  - `contactPerson` / `contactPhone`: `string` — Assigned Camp Manager and emergency telephone hotline.
  - `capacity`: `number (int)` — Maximum evacuee capacity headcount.
  - `currentOccupancy`: `number (int)` — Number of currently sheltered evacuees.
  - `status`: `string (enum)` — `'OPEN'` | `'CLOSED'` | `'FULL'` | `'STANDBY'` | `'TEMPORARILY_UNAVAILABLE'`.
  - `facilities`: `map (object)` — `{ water: bool, food: bool, medical: bool, restrooms: bool, electricity: bool, sleepingArea: bool, pwdAccessible: bool }`.
  - `description`: `string` *(optional)* — Additional site instructions or notes.
  - `createdAt` / `updatedAt`: `timestamp (ISO 8601)`.
- **Relationships:**
  - Referenced by `evacuation_routes.destinationCenterId`; Linked to `barangays.id`.
- **Security Rules:**
  - *Read:* Publicly accessible to enable citizens to check facility availability and open status.
  - *Write:* Restricted to `MDRRMO_ADMIN` and authorized Camp Managers.

---

### 5. `evacuation_routes` (Safe Evacuation Paths)
- **Purpose:** Stores pre-planned and field-inspected safe evacuation routes linking vulnerable residential zones to designated evacuation centers with waypoint vectors and hazard warnings.
- **Document Fields & Data Types:**
  - `id`: `string` — Primary Key.
  - `routeName`: `string` — Descriptive route title (e.g., `"Gabao to Central School Gym"`).
  - `originDescription`: `string` — Community pickup point or starting zone.
  - `destinationCenterId`: `string` — Foreign reference to `evacuation_centers.id`.
  - `barangayId` / `barangayName`: `string` — Origin barangay jurisdiction.
  - `waypoints`: `array<map>` — Ordered GPS coordinates: `[{ lat: number, lng: number }, ...]`.
  - `status`: `string (enum)` — `'ACTIVE'` | `'TEMPORARILY_CLOSED'` | `'UNDER_REVIEW'`.
  - `instructions`: `string` — Turn-by-turn navigation instructions.
  - `hazardWarnings`: `array<string>` — Route warnings (e.g., *"Cadacan riverbank prone to high water"*).
  - `distanceKm`: `number (float)` — Total route distance in kilometers.
  - `estimatedMinutes`: `number (int)` — Estimated travel time on foot or vehicle.
  - `createdAt` / `updatedAt`: `timestamp (ISO 8601)`.
- **Relationships:**
  - References `evacuation_centers.id` (destination) and `barangays.id` (origin).
- **Security Rules:**
  - *Read:* Publicly readable.
  - *Write:* Restricted strictly to `MDRRMO_ADMIN`.

---

### 6. `alerts` (Early Warnings & Evacuation Orders)
- **Purpose:** Official emergency alert bulletins, weather warnings, volcanic advisories, and mandatory evacuation orders broadcast across the municipality.
- **Document Fields & Data Types:**
  - `id`: `string` — Primary Key (e.g., `"alert-1728..."`).
  - `title`: `string` — Official headline (e.g., `"🔴 PRE-EMPTIVE EVACUATION ORDER"`).
  - `message`: `string` — Directive and detailed safety bulletin text.
  - `disasterType`: `string (enum)` — `'TYPHOON'` | `'FLOOD'` | `'EARTHQUAKE'` | `'VOLCANIC_ERUPTION'` | `'LANDSLIDE'` | `'GENERAL'`.
  - `alertLevel`: `string (enum)` — `'INFORMATION'` | `'ADVISORY'` | `'WARNING'` | `'EVACUATION_ORDER'`.
  - `affectedBarangayIds`: `array<string>` — Target barangay IDs (empty array indicates municipality-wide).
  - `recommendedAction`: `string` — Safety protocols for citizens.
  - `issuingAuthority`: `string` — Issuing body (e.g., `"MDRRMO Irosin EOC"`).
  - `startTime` / `expiresAt`: `timestamp (ISO 8601)` — Validity window.
  - `status`: `string (enum)` — `'ACTIVE'` | `'EXPIRED'` | `'CANCELLED'`.
  - `createdAt` / `updatedAt`: `timestamp (ISO 8601)`.
- **Relationships:**
  - References `barangays.id` via `affectedBarangayIds`.
- **Security Rules:**
  - *Read:* Publicly readable for real-time mobile banner and broadcast alerts.
  - *Write:* Restricted to `MDRRMO_ADMIN` and automated backend seismic monitoring engines.

---

### 7. `announcements` (Official 5W1H Public Advisories)
- **Purpose:** Structured public advisories following the 5W1H standard (Who, What, When, Where, Why, How), covering utility schedules, class suspensions, and relief distributions.
- **Document Fields & Data Types:**
  - `id`: `string` — Primary Key.
  - `title`: `string` — Advisory headline.
  - `category`: `string (enum)` — `'POWER'` | `'WATER'` | `'CLASS_SUSPENSION'` | `'RELIEF_ASSISTANCE'` | `'HEALTH_MEDICAL'` | `'TRAFFIC_ROAD'` | `'GENERAL'`.
  - `content`: `string` — 5W1H structured advisory body.
  - `eventDate`: `string` *(optional)* — Date of the scheduled activity or suspension.
  - `startTime` / `endTime`: `string` *(optional)* — Scheduled operational time window.
  - `affectedBarangays`: `array<string>` — List of covered barangays or utility feeders.
  - `imageUrl`: `string` *(optional)* — Official banner image link.
  - `isPinned`: `boolean` *(optional)* — Sticky priority flag for public feed.
  - `status`: `string` — `'ACTIVE'` | `'ARCHIVED'`.
  - `createdAt` / `updatedAt`: `timestamp (ISO 8601)`.
- **Security Rules:**
  - *Read:* Public.
  - *Write:* `MDRRMO_ADMIN` only.

---

### 8. `emergency_contacts` (Official Hotline Directory)
- **Purpose:** Verified directory of local emergency response agencies (MDRRMO, BFP, PNP, Rural Health Unit, ambulance, utilities) cached on mobile devices for offline capability.
- **Document Fields & Data Types:**
  - `id`: `string` — Primary Key.
  - `organization`: `string` — Agency title (e.g., `"BFP Irosin Fire Station"`).
  - `contactPerson`: `string` *(optional)* — Focal officer or chief.
  - `phone`: `string` — Telephone or mobile hotline number.
  - `email` / `address`: `string` *(optional)* — Contact email and physical station address.
  - `category`: `string (enum)` — `'MDRRMO'` | `'POLICE'` | `'FIRE_STATION'` | `'HOSPITAL'` | `'RESCUE_TEAM'` | `'BARANGAY_OFFICE'` | `'GOVERNMENT'` | `'OTHER'`.
  - `priority`: `number (int)` — Display sorting priority integer (1 = top priority).
  - `status`: `string (enum)` — `'ACTIVE'` | `'INACTIVE'`.
- **Security Rules:**
  - *Read:* Publicly accessible and cached locally for offline emergency dialing.
  - *Write:* Restricted to `MDRRMO_ADMIN`.

---

### 9. `preparedness_guides` (Safety & Go-Bag Guides)
- **Purpose:** Interactive disaster preparedness checklists, Go-Bag equipment inventories, and phased safety manuals (Before, During, and After hazard events).
- **Document Fields & Data Types:**
  - `id`: `string` — Primary Key.
  - `title`: `string` — Guide title.
  - `hazardType`: `string (enum)` — `'TYPHOON'` | `'FLOOD'` | `'EARTHQUAKE'` | `'VOLCANIC_ERUPTION'` | `'LANDSLIDE'` | `'FIRE'` | `'GENERAL'`.
  - `category`: `string (enum)` — Phase: `'BEFORE'` | `'DURING'` | `'AFTER'`.
  - `introduction`: `string` — Educational narrative.
  - `checklist`: `array<string>` — Emergency Go-Bag checklist items.
  - `emergencyActions`: `array<string>` — Immediate life-preservation steps.
  - `warnings`: `array<string>` — Critical hazards to avoid.
  - `isPublished`: `boolean` — Public visibility flag.
- **Security Rules:**
  - *Read:* Public.
  - *Write:* `MDRRMO_ADMIN` only.

---

### 10. `user_feedbacks` (Citizen Feedback & Suggestions)
- **Purpose:** Two-way feedback mechanism enabling citizens to submit suggestions, inquiries, complaints, and commendations directly to the MDRRMO Command Center.
- **Document Fields & Data Types:**
  - `id`: `string` — Primary Key.
  - `name`: `string` — Citizen full name.
  - `message`: `string` — Narrative text of the feedback or inquiry.
  - `contactNumber`: `string` *(optional)* — Contact phone number for administrative follow-up.
  - `barangayName`: `string` — Citizen residence barangay.
  - `category`: `string (enum)` — `'SUGGESTION'` | `'COMPLAINT'` | `'INQUIRY'` | `'COMMENDATION'` | `'OTHER'`.
  - `status`: `string (enum)` — `'NEW'` | `'REVIEWED'` | `'RESOLVED'`.
  - `createdAt` / `updatedAt`: `timestamp (ISO 8601)`.
- **Security Rules:**
  - *Create:* Open to all citizens without requiring login.
  - *Read & Update:* Restricted strictly to `MDRRMO_ADMIN`.

---
*© 2026 MDRRMO Irosin Disaster Safety System • Official Technical Reference*
