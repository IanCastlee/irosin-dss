import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { EvacuationCenterSchema } from "../validators";
import { logAudit } from "../utils/logger";
import { db } from "../config/firebase";
import { ExpoPushService } from "../services/pushNotificationService";
import { AlertController } from "./alertController";
import { emitRealtimeEvent } from "../services/socketService";

const COL = "evacuation_centers";

export class EvacuationCenterController {
  public static async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const barangayId = req.query.barangayId as string;
      const snapshot = await db.collection(COL).get();
      let centers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }));
      if (barangayId) {
        centers = centers.filter((c) => c.barangayId === barangayId);
      }
      centers.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
      return res.json({ evacuationCenters: centers });
    } catch (err: any) {
      console.error("[EvacuationCenterController] Error in getAll:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const doc = await db.collection(COL).doc(req.params.id).get();
      if (!doc.exists)
        return res.status(404).json({ error: "Evacuation center not found" });
      return res.json({ evacuationCenter: { id: doc.id, ...doc.data() } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = EvacuationCenterSchema.parse(req.body);

      // Resolve barangay name from payload or Firestore
      let barangayName = validated.barangayName?.trim() || "Irosin";
      try {
        const brgyDoc = await db
          .collection("barangays")
          .doc(validated.barangayId)
          .get();
        if (brgyDoc.exists)
          barangayName = (brgyDoc.data() as any).name || barangayName;
      } catch {}

      const id = "center-" + Date.now();
      const now = new Date().toISOString();
      const newCenter = {
        id,
        ...validated,
        barangayName,
        createdAt: now,
        updatedAt: now,
        createdBy: req.user?.id,
      };

      await db.collection(COL).doc(id).set(newCenter);
      logAudit(
        "CREATE_EVACUATION_CENTER",
        req.user?.fullName || "Admin",
        req.user?.role || "MDRRMO_ADMIN",
        COL,
        id,
        `Created center ${newCenter.name}`,
      );

      // ⚡ Real-Time WebSocket Push
      emitRealtimeEvent("EVACUATION_CENTER_CREATED", newCenter);
      emitRealtimeEvent("EVACUATION_CENTERS_CHANGED", newCenter);

      return res.status(201).json({
        message: "Evacuation center created",
        evacuationCenter: newCenter,
      });
    } catch (err: any) {
      if (err.name === "ZodError")
        return res
          .status(400)
          .json({ error: "Validation failed", details: err.errors });
      return res.status(500).json({ error: err.message });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists)
        return res.status(404).json({ error: "Evacuation center not found" });

      const validated = EvacuationCenterSchema.partial().parse(req.body);
      const updates: any = {
        ...validated,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.id,
      };

      if (validated.barangayId) {
        try {
          const brgyDoc = await db
            .collection("barangays")
            .doc(validated.barangayId)
            .get();
          if (brgyDoc.exists)
            updates.barangayName = (brgyDoc.data() as any).name;
        } catch {}
      }

      await ref.set(updates, { merge: true });
      const updated = { id: req.params.id, ...existing.data(), ...updates };

      logAudit(
        "UPDATE_EVACUATION_CENTER",
        req.user?.fullName || "Admin",
        req.user?.role || "MDRRMO_ADMIN",
        COL,
        req.params.id,
        `Updated center ${updated.name}`,
      );

      // ⚡ Real-Time WebSocket Push to all connected mobile devices instantly (0ms delay)
      emitRealtimeEvent("EVACUATION_CENTER_UPDATED", updated);
      emitRealtimeEvent("EVACUATION_CENTERS_CHANGED", updated);

      // Automated Push Notification when a Center is marked FULL
      if (
        updated.status === "FULL" ||
        (updated.currentOccupancy >= updated.capacity && updated.capacity > 0)
      ) {
        try {
          const tokens = await AlertController.getRegisteredTokens();
          const pushTitle = `⚠️ PUNO NA: ${updated.name}`;
          const pushBody = `Ang evacuation shelter sa Brgy. ${updated.barangayName || "Irosin"} ay puno na (${updated.currentOccupancy}/${updated.capacity} residente). Mangyaring magtungo sa alternatibong evacuation center.`;

          await ExpoPushService.sendToTokens(tokens, pushTitle, pushBody, {
            type: "EVACUATION_CENTER_FULL",
            centerId: updated.id,
            status: "FULL",
          });
          console.log(
            `[EvacuationCenter] Dispatched FULL center push notification to ${tokens.length} devices.`,
          );
        } catch (pushErr) {
          console.warn(
            "[EvacuationCenter] Push notification warning:",
            pushErr,
          );
        }
      }

      return res.json({
        message: "Evacuation center updated",
        evacuationCenter: updated,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const ref = db.collection(COL).doc(req.params.id);
      const existing = await ref.get();
      if (!existing.exists)
        return res.status(404).json({ error: "Evacuation center not found" });

      const data = existing.data() as any;
      await ref.delete();
      logAudit(
        "DELETE_EVACUATION_CENTER",
        req.user?.fullName || "Admin",
        req.user?.role || "MDRRMO_ADMIN",
        COL,
        req.params.id,
        `Deleted center ${data?.name}`,
      );

      // ⚡ Real-Time WebSocket Push
      emitRealtimeEvent("EVACUATION_CENTER_DELETED", { id: req.params.id });
      emitRealtimeEvent("EVACUATION_CENTERS_CHANGED", { id: req.params.id });

      return res.json({ message: "Evacuation center deleted" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
