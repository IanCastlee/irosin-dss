import { Router } from "express";
import { AuditLogController } from "../controllers/auditLogController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN"]),
  AuditLogController.getAll,
);

export default router;
