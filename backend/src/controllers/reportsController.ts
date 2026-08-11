import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { mockStore } from '../utils/mockStore';

export class ReportsController {
  public static async getSummary(req: AuthenticatedRequest, res: Response) {
    const totalBarangays = mockStore.barangays.length;
    const totalCenters = mockStore.evacuationCenters.length;
    const openCenters = mockStore.evacuationCenters.filter(c => c.status === 'OPEN').length;
    const totalCapacity = mockStore.evacuationCenters.reduce((acc, c) => acc + c.capacity, 0);
    const currentOccupancy = mockStore.evacuationCenters.reduce((acc, c) => acc + c.currentOccupancy, 0);
    
    const activeHazardZones = mockStore.hazardZones.filter(h => h.status === 'ACTIVE').length;
    const activeAlerts = mockStore.alerts.filter(a => a.status === 'ACTIVE').length;
    const totalResidents = mockStore.users.filter(u => u.role === 'RESIDENT').length;
    const pendingReports = mockStore.disasterReports.filter(r => r.status === 'PENDING').length;
    const totalReports = mockStore.disasterReports.length;

    return res.json({
      summary: {
        totalBarangays,
        totalCenters,
        openCenters,
        totalCapacity,
        currentOccupancy,
        activeHazardZones,
        activeAlerts,
        totalResidents,
        pendingReports,
        totalReports
      }
    });
  }

  public static async exportCsv(req: AuthenticatedRequest, res: Response) {
    const type = (req.query.type as string) || 'centers';
    let csvString = '';

    if (type === 'centers') {
      csvString = 'ID,Name,Barangay,Capacity,CurrentOccupancy,Status,ContactPerson,ContactPhone\n';
      mockStore.evacuationCenters.forEach(c => {
        csvString += `"${c.id}","${c.name}","${c.barangayName}",${c.capacity},${c.currentOccupancy},"${c.status}","${c.contactPerson}","${c.contactPhone}"\n`;
      });
    } else if (type === 'hazards') {
      csvString = 'ID,Name,Type,Severity,Status,Source\n';
      mockStore.hazardZones.forEach(h => {
        csvString += `"${h.id}","${h.name}","${h.hazardType}","${h.severity}","${h.status}","${h.source}"\n`;
      });
    } else if (type === 'reports') {
      csvString = 'ID,Type,Description,Barangay,ReporterName,ReporterRole,Status,CreatedAt\n';
      mockStore.disasterReports.forEach(r => {
        csvString += `"${r.id}","${r.reportType}","${r.description.replace(/"/g, '""')}","${r.barangayName}","${r.reporterName}","${r.reporterRole}","${r.status}","${r.createdAt}"\n`;
      });
    } else {
      return res.status(400).json({ error: 'Invalid export type. Supported: centers, hazards, reports' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="irosin_${type}_report_${Date.now()}.csv"`);
    return res.send(csvString);
  }
}
