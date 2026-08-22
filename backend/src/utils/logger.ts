import { db } from '../config/firebase';
import { UserRole } from '../types';

/**
 * Persist audit log to Firestore and log to console.
 * Production-safe: never throws — failure is non-blocking.
 */
export async function logAudit(
  action: string,
  performedBy: string,
  performedByRole: UserRole,
  targetCollection: string,
  targetId: string,
  details: string
) {
  const logEntry = {
    id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    action,
    performedBy,
    performedByRole,
    targetCollection,
    targetId,
    details,
    timestamp: new Date().toISOString()
  };

  // Persist to Firestore (non-blocking)
  if (db) {
    db.collection('audit_logs').doc(logEntry.id).set(logEntry).catch(err => {
      console.warn('[AuditLog] Firestore write failed (non-blocking):', err?.message);
    });
  }

  console.log(`[AUDIT] [${performedByRole}] ${performedBy}: ${action} → ${targetCollection}/${targetId}`);
}
