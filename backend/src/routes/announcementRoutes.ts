import { Router } from "express";
import { AnnouncementController } from "../controllers/announcementController";
import { authenticateToken, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", AnnouncementController.getAll);
router.get("/media-library", AnnouncementController.getMediaLibrary);
router.post("/:id/noted", AnnouncementController.toggleNoted);
router.post(
  "/",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN", "ADMIN" as any, "SUPER_ADMIN" as any]),
  AnnouncementController.create,
);
router.put(
  "/:id",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN", "ADMIN" as any, "SUPER_ADMIN" as any]),
  AnnouncementController.update,
);
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["MDRRMO_ADMIN", "ADMIN" as any, "SUPER_ADMIN" as any]),
  AnnouncementController.delete,
);

export default router;
