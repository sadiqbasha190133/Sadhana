
import mongoose from "mongoose";
import TestAttempt from "../models/TestAttempt.js";
import {
  submitMockTestAttempt,
  advanceMockTestSection,
} from "./mockTest.service.js";
import { getAttemptDeadlineState } from "./attemptTimer.service.js";

export async function enforceAttemptDeadline(userId, attemptId) {
  if (!mongoose.isValidObjectId(attemptId)) {
    const error = new Error("Invalid attempt ID");
    error.statusCode = 400;
    throw error;
  }

  const attempt = await TestAttempt.findOne({
    _id: attemptId,
    user: userId,
  });

  if (!attempt) {
    const error = new Error("Test attempt not found");
    error.statusCode = 404;
    throw error;
  }

  if (attempt.status !== "in_progress") {
    return {
      expired: false,
      status: attempt.status,
      message: "Attempt is already finished",
    };
  }

  const deadline = getAttemptDeadlineState(attempt);

  if (!deadline.expired) {
    return {
      expired: false,
      status: attempt.status,
      message: "Attempt is still active",
    };
  }

  if (deadline.reason === "overall") {
    const result = await submitMockTestAttempt(
      userId,
      attemptId
    );

    return {
      expired: true,
      action: "submitted",
      ...result,
    };
  }

  // Section deadline reached.
  const isLastSection =
    attempt.currentSectionIndex >= attempt.sections.length - 1;

  if (isLastSection) {
    const result = await submitMockTestAttempt(
      userId,
      attemptId
    );

    return {
      expired: true,
      action: "submitted",
      ...result,
    };
  }

  const result = await advanceMockTestSection(
    userId,
    attemptId,
    attempt.currentSectionIndex
  );

  return {
    expired: true,
    action: "section_advanced",
    ...result,
  };
}


export async function processExpiredAttempts() {
  const now = new Date();

  // Find active attempts that may have reached a deadline.
  const attempts = await TestAttempt.find({
    status: "in_progress",
    $or: [
      {
        timerMode: "overall",
        deadlineAt: { $lte: now },
      },
      {
        timerMode: "sectional",
      },
    ],
  })
    .select("_id user timerMode deadlineAt currentSectionIndex sections")
    .limit(200)
    .lean();

  let processed = 0;
  let failed = 0;

  for (const attempt of attempts) {
    const deadline = getAttemptDeadlineState(attempt, now);

    if (!deadline.expired) {
      continue;
    }

    try {
      await enforceAttemptDeadline(
        attempt.user.toString(),
        attempt._id.toString()
      );

      processed++;
    } catch (error) {
      failed++;
      console.error(
        `Failed to process expired attempt ${attempt._id}:`,
        error.message
      );
    }
  }

  return { checked: attempts.length, processed, failed };
}
