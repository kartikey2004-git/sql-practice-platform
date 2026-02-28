import { Router } from "express";
import { SandboxController } from "../controllers/sandbox.controller";
import { executionController } from "../controllers/execution.controller";
import { identityMiddleware } from "../middleware/identity.middleware";

const router = Router();

router.use(identityMiddleware);
router.post("/init", SandboxController.initSandbox);
router.post("/execute", executionController.executeQuery);

export default router;
