
import { Router } from "express";

import { authenticate } from "../middleware/authenticate.js";

import {
  createMockTest,
  listMockTests,
  getMockTestById,
  startMockTestAttempt,
  updateAttemptQuestionController,
  submitMockTestAttemptController,
  advanceMockTestSectionController,
  getAttemptResultController,
  deleteMockTestController,
  getAllResults,
} from "../controllers/mockTest.controller.js";


const router = Router();

router.use(authenticate);

router.get("/results", getAllResults)

router.post("/", createMockTest);
router.get("/", listMockTests);
router.get("/:id", getMockTestById);

router.post("/:id/attempts", startMockTestAttempt);
router.patch(
  "/attempts/:attemptId/questions/:questionId",
  updateAttemptQuestionController
);
router.post(
  "/attempts/:attemptId/submit",
  submitMockTestAttemptController
);
router.post(
  "/attempts/:attemptId/next-section",
  advanceMockTestSectionController
);
router.get(
  "/attempts/:attemptId/result",
  getAttemptResultController
);


router.delete("/:id", deleteMockTestController);

export default router;
