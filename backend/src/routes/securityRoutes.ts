import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { securityService } from '../services/securityService';

const router = Router();

// 1. Get all recorded security threats (Admin only)
router.get('/threats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const threats = await securityService.getThreats();
    return res.json({ threats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Get all currently blocked IPs
router.get('/blocked-ips', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const blockedIps = await securityService.getBlockedIps();
    return res.json({ blockedIps });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Block an Attacker IP (Admin only)
router.post('/block-ip', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP address is required' });

    const blockedBy = req.user?.fullName || 'MDRRMO Admin';
    const record = await securityService.blockIp(ip, reason, blockedBy);

    return res.json({
      success: true,
      message: `Matagumpay na na-block ang IP address: ${ip}`,
      record
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Unblock an IP (Admin only)
router.post('/unblock-ip', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP address is required' });

    const unblockedBy = req.user?.fullName || 'MDRRMO Admin';
    await securityService.unblockIp(ip, unblockedBy);

    return res.json({
      success: true,
      message: `Na-unblock na ang IP address: ${ip}`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
