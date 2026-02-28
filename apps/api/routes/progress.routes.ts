import { Router } from "express";
import { progressController } from "../controllers/progress.controller";
import { identityMiddleware } from "../middleware/identity.middleware";

const router = Router();

router.use(identityMiddleware);

router.get("/all", progressController.getAllProgress);
router.get("/:assignmentId", progressController.getProgress);
router.put("/:assignmentId", progressController.updateProgress);

export default router;
