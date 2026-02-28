import { Router } from "express";
import { SandboxController } from "../controllers/sandbox.controller";
import { executionController } from "../controllers/execution.controller";
import { gradeSubmission } from "../controllers/grading.controller";
import { identityMiddleware } from "../middleware/identity.middleware";

const router = Router();

router.use(identityMiddleware);
router.post("/init", SandboxController.initSandbox);
router.post("/execute", executionController.executeQuery);
router.post("/grade", gradeSubmission);

export default router;
