import { Router } from "express";
import { BarangayController } from "../controllers/barangayController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", BarangayController.getAll);
router.get("/:id", BarangayController.getById);

router.post(
  "/",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN"]),
  BarangayController.create,
);
router.put(
  "/:id",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN"]),
  BarangayController.update,
);
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN"]),
  BarangayController.delete,
);

export default router;
