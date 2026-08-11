import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';
import { DisasterReportSchema } from '../validators';
import { logAudit } from '../utils/logger';

export class DisasterReportController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    const barangayId = req.query.barangayId as string;
    const status = req.query.status as string;

    let reports = mockStore.disasterReports;
    if (barangayId) reports = reports.filter(r => r.barangayId === barangayId);
    if (status) reports = reports.filter(r => r.status === status);

    return res.json({ disasterReports: reports });
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    const report = mockStore.disasterReports.find(r => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    return res.json({ disasterReport: report });
  }

  public static async submit(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = DisasterReportSchema.parse(req.body);
      const user = req.user!;
      const barangay = mockStore.barangays.find(b => b.id === validated.barangayId);

      const newReport = {
        id: 'report-' + Date.now(),
        ...validated,
        barangayName: barangay ? barangay.name : 'Unknown Barangay',
        reportedBy: user.id,
        reporterName: user.fullName,
        reporterPhone: user.phone,
        reporterRole: user.role,
        status: 'PENDING' as const, // ALWAYS PENDING - never automatically verified!
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockStore.disasterReports.unshift(newReport);

      logAudit('SUBMIT_REPORT', user.fullName, user.role, 'disaster_reports', newReport.id, `Submitted report of type ${newReport.reportType}`);

      return res.status(201).json({
        message: 'Disaster report submitted successfully. It will be reviewed by MDRRMO personnel.',
        disasterReport: newReport
      });
    } catch (err: any) {
      if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async verifyOrUpdateStatus(req: AuthenticatedRequest, res: Response) {
    const report = mockStore.disasterReports.find(r => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const { status, adminNotes } = req.body;
    if (!['VERIFIED', 'REJECTED', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be VERIFIED, REJECTED, or RESOLVED' });
    }

    report.status = status;
    if (adminNotes) report.adminNotes = adminNotes;
    report.verifiedBy = req.user?.id;
    report.updatedAt = new Date().toISOString();

    logAudit('VERIFY_REPORT', req.user?.fullName || 'Admin', req.user?.role || 'MDRRMO_ADMIN', 'disaster_reports', report.id, `Status updated to ${status}`);

    return res.json({ message: `Report status updated to ${status}`, disasterReport: report });
  }
}
