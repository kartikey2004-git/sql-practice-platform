import { Router } from "express";
import { SandboxController } from "../controllers/sandbox.controller";
import { identityMiddleware } from "../middleware/identity.middleware";

const router = Router();

router.use(identityMiddleware);
router.post("/init", SandboxController.initSandbox);

export default router;
