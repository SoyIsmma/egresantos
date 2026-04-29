import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mpRouter from "./mp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mpRouter);

export default router;
