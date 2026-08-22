import { db } from '../config/firebase';
import { mockStore } from '../utils/mockStore';
import { DisasterAlert, AlertLevel } from '../types';
import { ExpoPushService } from './pushNotificationService';
import { emitRealtimeEvent } from './socketService';
import { AlertController } from '../controllers/alertController';
import { logAudit } from '../utils/logger';

// Irosin, Sorsogon coordinates
const IROSIN_LAT = 12.7042;
const IROSIN_LNG = 124.0371;
const MONITOR_RADIUS_KM = 250;
const MIN_MAGNITUDE = 3.5;
const CHECK_INTERVAL_MS = 150000; // 2.5 minutes

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// In-memory cache of processed event IDs to prevent duplicate alerts
const processedEventIds = new Set<string>();

export class EarthquakeMonitorService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start the periodic background monitoring job
   */
  public static start() {
    console.log(`[EarthquakeMonitor] Service started. Monitoring earthquakes within ${MONITOR_RADIUS_KM}km of Irosin, Sorsogon (M${MIN_MAGNITUDE}+)...`);
    
    // Initial check on boot
    this.checkForEarthquakes();

    // Periodic check every 2.5 minutes
    if (!this.timer) {
      this.timer = setInterval(() => {
        this.checkForEarthquakes();
      }, CHECK_INTERVAL_MS);
    }
  }

  public static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Fetch from USGS API and evaluate new seismic events
   */
  public static async checkForEarthquakes(): Promise<{ newEventsCount: number; events: any[] }> {
    if (this.isRunning) {
      return { newEventsCount: 0, events: [] };
    }
    this.isRunning = true;

    const newAlertsCreated: any[] = [];

    try {
      // Look back for events in the last 6 hours
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${IROSIN_LAT}&longitude=${IROSIN_LNG}&maxradiuskm=${MONITOR_RADIUS_KM}&minmagnitude=${MIN_MAGNITUDE}&starttime=${sixHoursAgo}&limit=10`;

      const response = await fetch(usgsUrl, { headers: { 'User-Agent': 'Irosin-DSS-Disaster-Monitor/1.0' } });
      if (!response.ok) {
        console.warn(`[EarthquakeMonitor] USGS API returned status: ${response.status}`);
        return { newEventsCount: 0, events: [] };
      }

      const data: any = await response.json();
      const features: any[] = data?.features || [];

      for (const feature of features) {
        const eventId = feature.id;
        const props = feature.properties || {};
        const geom = feature.geometry || {};
        const coords = geom.coordinates || [0, 0, 0]; // [lng, lat, depth]
        const lng = coords[0];
        const lat = coords[1];
        const depthKm = coords[2];
        const mag = props.mag || 0;
        const place = props.place || 'Bicol / Samar Region';
        const eventTime = props.time ? new Date(props.time) : new Date();

        // 1. Check if event was already processed in memory
        if (processedEventIds.has(eventId)) {
          continue;
        }

        // 2. Check if event was already recorded in Firestore
        if (db) {
          try {
            const existingDoc = await db.collection('earthquake_events').doc(eventId).get();
            if (existingDoc.exists) {
              processedEventIds.add(eventId);
              continue;
            }
          } catch (e) {
            console.warn('[EarthquakeMonitor] Firestore check warning:', e);
          }
        }

        // Mark as processed
        processedEventIds.add(eventId);

        // Calculate distance from Irosin
        const distKm = calculateDistanceKm(IROSIN_LAT, IROSIN_LNG, lat, lng);

        // Determine Alert Level based on magnitude and proximity
        let alertLevel: AlertLevel = 'ADVISORY';
        if (mag >= 6.0 || (mag >= 5.0 && distKm <= 60)) {
          alertLevel = 'EVACUATION_ORDER';
        } else if (mag >= 4.5 || (mag >= 4.0 && distKm <= 50)) {
          alertLevel = 'WARNING';
        }

        const formattedTime = eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const nowIso = new Date().toISOString();
        const expiresAtIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const newAlertId = `quake-alert-${Date.now()}-${eventId.substring(0, 6)}`;
        const alertTitle = `🚨 LINDOL: M${mag.toFixed(1)} sa ${place}`;
        const alertMessage = `Naiulat ang isang lindol na may lakas na Magnitude ${mag.toFixed(1)} sa ${place} (Lalim: ${Math.round(depthKm)} km) kaninang ${formattedTime}. Tinatayang ${Math.round(distKm)} km ang layo sa sentro ng Irosin, Sorsogon.`;
        const actionGuidance = alertLevel === 'EVACUATION_ORDER'
          ? 'Maging alerto sa matinding aftershocks. Isagawa ang DUCK, COVER, AND HOLD. Kung may pinsala sa tahanan o gusali, lumikas agad sa pinakamalapit na Evacuation Center.'
          : 'Maging mapagmatyag sa mga posibleng aftershocks. Isagawa ang DUCK, COVER, AND HOLD kung muling yumugyog. I-check ang kaligtasan ng pamilya at kuryente.';

        const alertDoc: DisasterAlert = {
          id: newAlertId,
          title: alertTitle,
          message: alertMessage,
          alertLevel,
          disasterType: 'EARTHQUAKE',
          affectedBarangayIds: [], // empty array means ALL barangays in Irosin
          recommendedAction: actionGuidance,
          issuingAuthority: 'PHIVOLCS / USGS Seismological Network',
          startTime: nowIso,
          status: 'ACTIVE',
          expiresAt: expiresAtIso,
          createdAt: nowIso,
          updatedAt: nowIso,
          createdBy: 'AUTO_USGS_SEISMIC_MONITOR'
        };

        // Save to Firestore & MockStore
        if (db) {
          try {
            await db.collection('alerts').doc(newAlertId).set(alertDoc);
            await db.collection('earthquake_events').doc(eventId).set({
              id: eventId,
              magnitude: mag,
              place,
              depthKm,
              coordinates: [lng, lat],
              distanceKm: distKm,
              eventTime: eventTime.toISOString(),
              alertId: newAlertId,
              createdAt: nowIso
            });
          } catch (err) {
            console.warn('[EarthquakeMonitor] Firestore alert save warning:', err);
          }
        }
        mockStore.alerts.unshift(alertDoc);

        logAudit(
          'AUTO_EARTHQUAKE_ALERT',
          'Automated Seismic Monitor (USGS)',
          'MDRRMO_ADMIN',
          'alerts',
          newAlertId,
          `Auto-dispatched Earthquake Alert M${mag.toFixed(1)} - ${place}`
        );

        // 3. Dispatch Live Real-Time WebSocket Push (0ms latency to all online users)
        emitRealtimeEvent('ALERT_CREATED', alertDoc);

        // 4. Dispatch Instant Push Notifications to all citizen devices
        try {
          const tokens = await AlertController.getRegisteredTokens();
          const pushTitle = `🚨 [${alertLevel}] LINDOL M${mag.toFixed(1)} - ${place}`;
          const pushBody = `${alertMessage}\n\n🛡️ Payo: ${actionGuidance}`;

          await ExpoPushService.sendToTokens(tokens, pushTitle, pushBody, {
            type: 'EARTHQUAKE_ALERT',
            alertId: newAlertId,
            magnitude: mag,
            distanceKm: distKm
          });
          console.log(`[EarthquakeMonitor] Dispatched automated quake push alert to ${tokens.length} devices.`);
        } catch (pushErr) {
          console.warn('[EarthquakeMonitor] Push dispatch warning:', pushErr);
        }

        newAlertsCreated.push(alertDoc);
      }
    } catch (err: any) {
      console.error('[EarthquakeMonitor] Error checking earthquakes:', err?.message || err);
    } finally {
      this.isRunning = false;
    }

    return {
      newEventsCount: newAlertsCreated.length,
      events: newAlertsCreated
    };
  }
}
