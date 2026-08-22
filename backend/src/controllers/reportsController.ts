import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../config/firebase';

export class ReportsController {
  public static async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      // Fetch all counts from Firestore in parallel
      const [
        barangaysSnap,
        centersSnap,
        alertsSnap,
        reportsSnap,
        usersSnap
      ] = await Promise.all([
        db.collection('barangays').get(),
        db.collection('evacuation_centers').get(),
        db.collection('alerts').where('status', '==', 'ACTIVE').get(),
        db.collection('disaster_reports').get(),
        db.collection('push_tokens').get()
      ]);

      const centers = centersSnap.docs.map(d => d.data());
      const reports = reportsSnap.docs.map(d => d.data());

      const totalCenters = centers.length;
      const openCenters = centers.filter(c => c.status === 'OPEN').length;
      const totalCapacity = centers.reduce((acc, c) => acc + (c.capacity || 0), 0);
      const currentOccupancy = centers.reduce((acc, c) => acc + (c.currentOccupancy || 0), 0);
      const pendingReports = reports.filter(r => r.status === 'PENDING').length;
      const verifiedReports = reports.filter(r => r.status === 'VERIFIED' || r.status === 'UNDER_CLEARING').length;

      return res.json({
        summary: {
          totalBarangays: barangaysSnap.size,
          totalCenters,
          openCenters,
          totalCapacity,
          currentOccupancy,
          verifiedReports,
          activeAlerts: alertsSnap.size,
          registeredDevices: usersSnap.size,
          pendingReports,
          totalReports: reports.length
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async exportCsv(req: AuthenticatedRequest, res: Response) {
    try {
      const type = (req.query.type as string) || 'centers';
      let csvString = '';

      if (type === 'centers') {
        const snap = await db.collection('evacuation_centers').get();
        csvString = 'ID,Name,Barangay,Capacity,CurrentOccupancy,Status,ContactPerson,ContactPhone\n';
        snap.docs.forEach(doc => {
          const c = doc.data();
          csvString += `"${c.id}","${c.name}","${c.barangayName}",${c.capacity},${c.currentOccupancy},"${c.status}","${c.contactPerson}","${c.contactPhone}"\n`;
        });
      } else if (type === 'reports') {
        const snap = await db.collection('disaster_reports').orderBy('createdAt', 'desc').get();
        csvString = 'ID,Type,Description,Barangay,ReporterName,ReporterRole,Status,CreatedAt\n';
        snap.docs.forEach(doc => {
          const r = doc.data();
          csvString += `"${r.id}","${r.reportType}","${(r.description || '').replace(/"/g, '""')}","${r.barangayName}","${r.reporterName}","${r.reporterRole}","${r.status}","${r.createdAt}"\n`;
        });
      } else if (type === 'contacts') {
        const snap = await db.collection('emergency_contacts').get();
        csvString = 'ID,Organization,ContactPerson,Phone,Category,Address\n';
        snap.docs.forEach(doc => {
          const c = doc.data();
          csvString += `"${c.id}","${c.organization}","${c.contactPerson}","${c.phone}","${c.category}","${c.address || ''}"\n`;
        });
      } else {
        return res.status(400).json({ error: 'Invalid export type. Supported: centers, reports, contacts' });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="irosin_${type}_report_${Date.now()}.csv"`);
      return res.send(csvString);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
