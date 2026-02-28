import { Router } from "express";
import { hintController } from "../controllers/hint.controller";
import { identityMiddleware } from "../middleware/identity.middleware";

const router = Router();

router.use(identityMiddleware);

router.post("/", hintController.getHint);
router.get("/history", hintController.getHintHistory);

export default router;
