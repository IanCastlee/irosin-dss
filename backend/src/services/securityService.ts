import { db } from '../config/firebase';
import { logAudit } from '../utils/logger';
import { emitRealtimeEvent } from './socketService';

const BLOCKED_IPS_COL = 'blocked_ips';
const THREATS_COL = 'security_threats';

export interface SecurityThreat {
  id: string;
  ip: string;
  threatType: 'DDOS_BURST' | 'BRUTE_FORCE' | 'SPAM_REGISTRATION' | 'INJECTION_ATTEMPT';
  details: string;
  endpoint: string;
  attemptCount: number;
  isBlocked: boolean;
  firstDetectedAt: string;
  lastDetectedAt: string;
}

export interface BlockedIpRecord {
  ip: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
}

class SecurityService {
  private blockedIps = new Set<string>();
  private initialized = false;

  public async init() {
    if (this.initialized) return;
    try {
      const snap = await db.collection(BLOCKED_IPS_COL).get();
      snap.docs.forEach(doc => {
        const data = doc.data() as BlockedIpRecord;
        if (data.ip) this.blockedIps.add(data.ip);
      });
      this.initialized = true;
      console.log(`[Security Firewall] Initialized. Loaded ${this.blockedIps.size} blocked IPs into active memory.`);
    } catch (err) {
      console.warn('[Security Firewall] Error initializing blocked IPs:', err);
    }
  }

  public isIpBlocked(ip: string): boolean {
    const cleanIp = this.cleanIp(ip);
    return this.blockedIps.has(cleanIp);
  }

  public cleanIp(rawIp: string): string {
    if (!rawIp) return 'unknown';
    // Remove IPv6 prefix if present (e.g. ::ffff:192.168.1.1)
    let ip = rawIp.replace(/^::ffff:/, '');
    if (ip === '::1') ip = '127.0.0.1';
    return ip.trim();
  }

  public async recordThreat(
    rawIp: string,
    threatType: 'DDOS_BURST' | 'BRUTE_FORCE' | 'SPAM_REGISTRATION' | 'INJECTION_ATTEMPT',
    details: string,
    endpoint: string = ''
  ) {
    const ip = this.cleanIp(rawIp);
    const now = new Date().toISOString();
    const docId = `threat-${ip.replace(/[^a-zA-Z0-9]/g, '_')}-${threatType.toLowerCase()}`;

    try {
      const docRef = db.collection(THREATS_COL).doc(docId);
      const existing = await docRef.get();

      let threatData: SecurityThreat;

      if (existing.exists) {
        const data = existing.data() as SecurityThreat;
        threatData = {
          ...data,
          attemptCount: (data.attemptCount || 1) + 1,
          details,
          endpoint,
          isBlocked: this.isIpBlocked(ip),
          lastDetectedAt: now
        };
      } else {
        threatData = {
          id: docId,
          ip,
          threatType,
          details,
          endpoint,
          attemptCount: 1,
          isBlocked: this.isIpBlocked(ip),
          firstDetectedAt: now,
          lastDetectedAt: now
        };
      }

      await docRef.set(threatData, { merge: true });

      logAudit('SECURITY_THREAT', 'SYSTEM_FIREWALL', 'MDRRMO_ADMIN', THREATS_COL, docId, `[${threatType}] from IP: ${ip} (${details})`);

      // Realtime alert to admin dashboard via WebSocket
      emitRealtimeEvent('SECURITY_THREAT_DETECTED', threatData);
    } catch (err) {
      console.warn('[Security Firewall] Error recording threat:', err);
    }
  }

  public async blockIp(rawIp: string, reason: string, blockedBy: string): Promise<BlockedIpRecord> {
    const ip = this.cleanIp(rawIp);
    const now = new Date().toISOString();
    const record: BlockedIpRecord = {
      ip,
      reason: reason || 'Malicious attack / suspicious activity detected',
      blockedBy: blockedBy || 'MDRRMO Admin',
      blockedAt: now
    };

    this.blockedIps.add(ip);

    // Save to Firestore
    await db.collection(BLOCKED_IPS_COL).doc(ip.replace(/[^a-zA-Z0-9]/g, '_')).set(record);

    // Update threat records with this IP
    const threatSnaps = await db.collection(THREATS_COL).where('ip', '==', ip).get();
    const batch = db.batch();
    threatSnaps.docs.forEach(d => {
      batch.update(d.ref, { isBlocked: true, updatedAt: now });
    });
    await batch.commit().catch(() => {});

    logAudit('IP_BLOCKED', blockedBy, 'MDRRMO_ADMIN', BLOCKED_IPS_COL, ip, `Blocked IP: ${ip} (${reason})`);
    emitRealtimeEvent('IP_BLOCKED', record);

    return record;
  }

  public async unblockIp(rawIp: string, unblockedBy: string): Promise<void> {
    const ip = this.cleanIp(rawIp);
    this.blockedIps.delete(ip);

    const docId = ip.replace(/[^a-zA-Z0-9]/g, '_');
    await db.collection(BLOCKED_IPS_COL).doc(docId).delete().catch(() => {});

    // Update threat records with this IP
    const threatSnaps = await db.collection(THREATS_COL).where('ip', '==', ip).get();
    const batch = db.batch();
    threatSnaps.docs.forEach(d => {
      batch.update(d.ref, { isBlocked: false, updatedAt: new Date().toISOString() });
    });
    await batch.commit().catch(() => {});

    logAudit('IP_UNBLOCKED', unblockedBy, 'MDRRMO_ADMIN', BLOCKED_IPS_COL, ip, `Unblocked IP: ${ip}`);
    emitRealtimeEvent('IP_UNBLOCKED', { ip });
  }

  public async getThreats(): Promise<SecurityThreat[]> {
    const snap = await db.collection(THREATS_COL).get();
    const threats = snap.docs.map(d => ({ id: d.id, ...d.data() } as SecurityThreat));
    threats.sort((a, b) => new Date(b.lastDetectedAt || 0).getTime() - new Date(a.lastDetectedAt || 0).getTime());
    return threats;
  }

  public async getBlockedIps(): Promise<BlockedIpRecord[]> {
    const snap = await db.collection(BLOCKED_IPS_COL).get();
    const records = snap.docs.map(d => d.data() as BlockedIpRecord);
    records.sort((a, b) => new Date(b.blockedAt || 0).getTime() - new Date(a.blockedAt || 0).getTime());
    return records;
  }
}

export const securityService = new SecurityService();
