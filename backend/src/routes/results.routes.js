import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getAllResults, deleteMockTestResultController } from "../controllers/results.controller.js";

const router = Router();
router.use(authenticate);

router.get("/all-mockTest-results", getAllResults)
router.delete(
  "/delete-results/:attemptId",
  deleteMockTestResultController
);


export default router;
