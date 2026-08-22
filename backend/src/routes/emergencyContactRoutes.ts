import { Router } from "express";
import { EmergencyContactController } from "../controllers/emergencyContactController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", EmergencyContactController.getAll);
router.get("/:id", EmergencyContactController.getById);

router.post(
  "/",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN"]),
  EmergencyContactController.create,
);
router.put(
  "/:id",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN"]),
  EmergencyContactController.update,
);
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN"]),
  EmergencyContactController.delete,
);

export default router;
