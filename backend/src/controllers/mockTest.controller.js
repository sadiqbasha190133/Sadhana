
import {
  createMockTest as createMockTestService,
  listMockTests as listMockTestsService,
  getMockTestById as getMockTestByIdService,
  startMockTestAttempt as startMockTestAttemptService,
  updateAttemptQuestion,
  submitMockTestAttempt,
  advanceMockTestSection,
  getAttemptResult,
  deleteMockTest as deleteMockTestService,
} from "../services/mockTest.service.js";

import { createMockTestSchema } from "../validators/mockTest.validator.js";

import {
  enforceAttemptDeadline,
} from "../services/attemptLifecycle.service.js";


export async function createMockTest(req, res, next) {
  try {
    const validation = createMockTestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid mock-test configuration.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    const mockTest = await createMockTestService(
      req.user.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Mock test prepared successfully.",
      data: { mockTest }
    });
  } catch (error) {
    next(error);
  }
}

export async function listMockTests(req, res, next) {
  try {
    const mockTests = await listMockTestsService(req.user.id);

    return res.status(200).json({
      success: true,
      data: { mockTests }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMockTestById(req, res, next) {
  try {
    const mockTest = await getMockTestByIdService(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      data: { mockTest }
    });
  } catch (error) {
    next(error);
  }
}

export async function startMockTestAttempt(req, res, next) {
  try {
    const attempt = await startMockTestAttemptService(
      req.user.id,
      req.params.id
    );

    return res.status(201).json({
      success: true,
      message: "Mock-test attempt started successfully.",
      data: { attempt }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAttemptQuestionController(req, res, next) {
  try {
    const allowedFields = [
      "selectedOption",
      "markedForReview",
      "visited",
    ];

    if (
      !req.body ||
      typeof req.body !== "object" ||
      Array.isArray(req.body) ||
      Object.keys(req.body).length === 0 ||
      Object.keys(req.body).some(
        (key) => !allowedFields.includes(key)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request body",
      });
    }

    // First, enforce the server-side deadline.
    const lifecycle = await enforceAttemptDeadline(
      req.user.id,
      req.params.attemptId
    );

    if (lifecycle.expired) {
      return res.status(409).json({
        success: false,
        message:
          lifecycle.action === "section_advanced"
            ? "Section time expired. The next section has started."
            : "Test time expired. The attempt has ended.",
        data: lifecycle,
      });
    }

    // Only update answers if the attempt is still active.
    const attempt = await updateAttemptQuestion(
      req.user.id,
      req.params.attemptId,
      req.params.questionId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitMockTestAttemptController(req, res, next) {
  try {
    const result = await submitMockTestAttempt(
      req.user.id,
      req.params.attemptId
    );

    return res.status(200).json({
      success: true,
      message: "Mock test submitted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function advanceMockTestSectionController(
  req,
  res,
  next
) {
  try {
    const result = await advanceMockTestSection(
      req.user.id,
      req.params.attemptId,
      req.body?.currentSectionIndex
    );

    return res.status(200).json({
      success: true,
      message: result.message || "Section advanced successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttemptResultController(req, res, next) {
  try {
    const result = await getAttemptResult(
      req.user.id,
      req.params.attemptId
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteMockTestController(req, res, next) {
  try {
    const result = await deleteMockTestService(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: "Mock test deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

