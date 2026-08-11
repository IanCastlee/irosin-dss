import { mockStore } from './mockStore';
import { UserRole } from '../types';

export function logAudit(
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

  mockStore.auditLogs.unshift(logEntry);
  console.log(`[AUDIT LOG] [${performedByRole}] ${performedBy}: ${action} on ${targetCollection}/${targetId} - ${details}`);
}
