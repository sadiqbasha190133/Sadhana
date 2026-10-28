
import mongoose from "mongoose";

import MockTest from "../models/MockTest.js";
import Question from "../models/Question.js";
import TestAttempt from "../models/TestAttempt.js";
import { getAttemptDeadlineState } from "./attemptTimer.service.js";


function createError(message, statusCode = 500) {
  // Support both argument orders.
  if (typeof message === "number") {
    const originalStatusCode = message;
    message = statusCode;
    statusCode = originalStatusCode;
  }

  const error = new Error(String(message));
  error.statusCode = statusCode;
  return error;
}

function toQuestionSnapshot(question) {
  return {
    originalQuestionId: question._id,
    questionText: question.questionText,
    options: question.options.map((option) => ({
      key: option.key,
      text: option.text
    })),
    correctOption: question.correctOption,
    explanation: question.explanation || "",
    subject: question.subject || "",
    topic: question.topic || "",
    difficulty: question.difficulty || "medium"
  };
}

function toPublicQuestion(question) {
  return {
    id: question.originalQuestionId?.toString() ?? null,
    questionText: question.questionText,
    options: question.options.map((option) => ({
      key: option.key,
      text: option.text
    })),
    subject: question.subject,
    topic: question.topic,
    difficulty: question.difficulty
  };
}

function toPublicMockTest(test) {
  return {
    id: test._id.toString(),
    title: test.title,
    exam: test.exam,
    timerMode: test.timerMode,
    overallDurationSeconds: test.overallDurationSeconds,
    sections: test.sections.map((section) => ({
      id: section._id.toString(),
      name: section.name,
      durationSeconds: section.durationSeconds,
      positiveMarks: section.positiveMarks,
      negativeMarks: section.negativeMarks,
      questionCount: section.questions.length,
      questions: section.questions.map(toPublicQuestion)
    })),
    createdAt: test.createdAt,
    updatedAt: test.updatedAt
  };
}

export async function createMockTest(userId, input) {
  const sections = [];
  let totalQuestions = 0;

  for (const sectionInput of input.sections) {
    const questionIds = sectionInput.questionIds;

    const questions = await Question.find({
      _id: { $in: questionIds },
      user: userId
    }).lean();

    if (questions.length !== questionIds.length) {
      throw createError(
        "One or more questions do not exist or do not belong to your account.",
        400
      );
    }

    const questionsById = new Map(
      questions.map((question) => [
        question._id.toString(),
        question
      ])
    );

    const orderedQuestions = questionIds.map((id) =>
      questionsById.get(id)
    );

    for (const question of orderedQuestions) {
      if (question.exam !== input.exam) {
        throw createError(
          `Question "${question.questionText.slice(0, 60)}" belongs to a different exam.`,
          400
        );
      }
    }

    sections.push({
      name: sectionInput.name,
      durationSeconds: sectionInput.durationSeconds ?? null,
      positiveMarks: sectionInput.positiveMarks,
      negativeMarks: sectionInput.negativeMarks,
      questions: orderedQuestions.map(toQuestionSnapshot)
    });

    totalQuestions += orderedQuestions.length;
  }

  if (totalQuestions > 200) {
    throw createError(
      "A mock test can contain at most 200 questions.",
      400
    );
  }

  const mockTest = await MockTest.create({
    createdBy: userId,
    title: input.title,
    exam: input.exam,
    timerMode: input.timerMode,
    overallDurationSeconds: input.overallDurationSeconds ?? null,
    sections
  });

  return toPublicMockTest(mockTest);
}

export async function listMockTests(userId) {
  const tests = await MockTest.find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .lean();

  return tests.map((test) => ({
    id: test._id.toString(),
    title: test.title,
    exam: test.exam,
    timerMode: test.timerMode,
    overallDurationSeconds: test.overallDurationSeconds,
    sectionCount: test.sections.length,
    questionCount: test.sections.reduce(
      (total, section) => total + section.questions.length,
      0
    ),
    createdAt: test.createdAt
  }));
}

export async function getMockTestById(userId, testId) {
  if (!mongoose.isValidObjectId(testId)) {
    throw createError("Invalid mock-test ID.", 400);
  }

  const test = await MockTest.findOne({
    _id: testId,
    createdBy: userId
  }).lean();

  if (!test) {
    throw createError("Mock test not found.", 404);
  }

  return toPublicMockTest(test);
}

export async function startMockTestAttempt(userId, testId) {
  if (!mongoose.isValidObjectId(testId)) {
    throw createError("Invalid mock-test ID.", 400);
  }

  const test = await MockTest.findOne({
    _id: testId,
    createdBy: userId
  }).lean();

  if (!test) {
    throw createError("Mock test not found.", 404);
  }

  const startedAt = new Date();

  const deadlineAt =
    test.timerMode === "overall"
      ? new Date(
          startedAt.getTime() +
            test.overallDurationSeconds * 1000
        )
      : null;

  const attemptSections = test.sections.map((section, index) => {
    const sectionStartedAt =
      test.timerMode === "sectional" && index === 0
        ? startedAt
        : null;

    const sectionDeadlineAt =
      sectionStartedAt && section.durationSeconds
        ? new Date(
            sectionStartedAt.getTime() +
              section.durationSeconds * 1000
          )
        : null;

    return {
      name: section.name,
      durationSeconds: section.durationSeconds,
      positiveMarks: section.positiveMarks,
      negativeMarks: section.negativeMarks,
      startedAt: sectionStartedAt,
      deadlineAt: sectionDeadlineAt,
      questions: section.questions.map((question) => ({
        ...question,
        selectedOption: null,
        markedForReview: false,
        visited: false,
        answeredAt: null
      }))
    };
  });

  const attempt = await TestAttempt.create({
    user: userId,
    mockTest: test._id,
    timerMode: test.timerMode,
    overallDurationSeconds: test.overallDurationSeconds,
    startedAt,
    deadlineAt,
    sections: attemptSections
  });

  return getAttemptForTestTaker(userId, attempt._id.toString());
}

export async function getAttemptForTestTaker(userId, attemptId) {
  if (!mongoose.isValidObjectId(attemptId)) {
    throw createError("Invalid attempt ID.", 400);
  }

  const attempt = await TestAttempt.findOne({
    _id: attemptId,
    user: userId
  }).lean();

  if (!attempt) {
    throw createError("Test attempt not found.", 404);
  }

  return {
    id: attempt._id.toString(),
    mockTestId: attempt.mockTest.toString(),
    status: attempt.status,
    timerMode: attempt.timerMode,
    overallDurationSeconds: attempt.overallDurationSeconds,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    currentSectionIndex: attempt.currentSectionIndex,
    sections: attempt.sections.map((section) => ({
      id: section._id.toString(),
      name: section.name,
      durationSeconds: section.durationSeconds,
      startedAt: section.startedAt,
      deadlineAt: section.deadlineAt,
      questions: section.questions.map((question, index) => ({
        index,
        id: question._id.toString(),
        originalQuestionId:
          question.originalQuestionId?.toString() ?? null,
        questionText: question.questionText,
        options: question.options,
        selectedOption: question.selectedOption,
        markedForReview: question.markedForReview,
        visited: question.visited
      }))
    }))
  };
}


export async function updateAttemptQuestion(
  userId,
  attemptId,
  questionId,
  updates
) {
  if (
    !mongoose.isValidObjectId(attemptId) ||
    !mongoose.isValidObjectId(questionId)
  ) {
    throw createError(400, "Invalid attempt ID or question ID");
  }

  const allowedFields = [
    "selectedOption",
    "markedForReview",
    "visited",
  ];

  const updateKeys = Object.keys(updates);

  if (
    updateKeys.length === 0 ||
    updateKeys.some((key) => !allowedFields.includes(key))
  ) {
    throw createError(400, "Invalid question update fields");
  }

  if (
    "selectedOption" in updates &&
    updates.selectedOption !== null &&
    !["A", "B", "C", "D"].includes(updates.selectedOption)
  ) {
    throw createError(
      400,
      "selectedOption must be A, B, C, D, or null"
    );
  }

  for (const field of ["markedForReview", "visited"]) {
    if (
      field in updates &&
      typeof updates[field] !== "boolean"
    ) {
      throw createError(400, `${field} must be a boolean`);
    }
  }

  const attempt = await TestAttempt.findOne({
    _id: attemptId,
    user: userId,
  });

  if (!attempt) {
    throw createError(404, "Test attempt not found");
  }

  // Do not allow changes to completed attempts.
  if (attempt.status !== "in_progress") {
    throw createError(
      409,
      "This test attempt is no longer active"
    );
  }

  // Check the overall or active-section deadline.
  const deadlineState = getAttemptDeadlineState(attempt);

  if (deadlineState.expired) {
    throw createError(
      409,
      deadlineState.reason === "overall"
        ? "The overall test deadline has passed"
        : "The current section deadline has passed"
    );
  }

  const now = new Date();

  // Find the requested question in this attempt.
  let targetQuestion = null;
  let targetSectionIndex = -1;

  attempt.sections.forEach((section, sectionIndex) => {
    const question = section.questions.id(questionId);

    if (question) {
      targetQuestion = question;
      targetSectionIndex = sectionIndex;
    }
  });

  if (!targetQuestion) {
    throw createError(
      404,
      "Question not found in this test attempt"
    );
  }

  // Only the active section can be updated in sectional mode.
  if (attempt.timerMode === "sectional") {
    if (
      targetSectionIndex !== attempt.currentSectionIndex
    ) {
      throw createError(
        409,
        "You can only update questions in the active section"
      );
    }
  }

  // Save the student's answer.
  if ("selectedOption" in updates) {
    targetQuestion.selectedOption = updates.selectedOption;
    targetQuestion.answeredAt =
      updates.selectedOption === null ? null : now;
  }

  if ("markedForReview" in updates) {
    targetQuestion.markedForReview =
      updates.markedForReview;
  }

  if ("visited" in updates) {
    targetQuestion.visited = updates.visited;
  }

  await attempt.save();

  // Return safe test-taker data without the answer key.
  return getAttemptForTestTaker(
    userId,
    attemptId
  );
}

export async function submitMockTestAttempt(userId, attemptId) {
  if (!mongoose.isValidObjectId(attemptId)) {
    throw createError(400, "Invalid attempt ID");
  }

  const attempt = await TestAttempt.findOne({
    _id: attemptId,
    user: userId,
  });

  if (!attempt) {
    throw createError(404, "Test attempt not found");
  }

  // Do not calculate or submit the same attempt twice.
  if (attempt.status !== "in_progress") {
    throw createError(409, "This attempt has already ended");
  }

  const now = new Date();

  const overallDeadlinePassed =
    attempt.timerMode === "overall" &&
    attempt.deadlineAt &&
    now >= attempt.deadlineAt;

  const currentSection =
    attempt.sections[attempt.currentSectionIndex];

  const sectionalDeadlinePassed =
    attempt.timerMode === "sectional" &&
    currentSection?.deadlineAt &&
    now >= currentSection.deadlineAt;

  let totalQuestions = 0;
  let attemptedQuestions = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let unansweredQuestions = 0;
  let totalPositiveMarks = 0;
  let totalNegativeMarks = 0;
  let totalScore = 0;

  const sectionResults = attempt.sections.map((section) => {
    let sectionAttempted = 0;
    let sectionCorrect = 0;
    let sectionIncorrect = 0;
    let sectionUnanswered = 0;
    let sectionPositiveScore = 0;
    let sectionNegativeScore = 0;

    for (const question of section.questions) {
      totalQuestions++;

      if (!question.selectedOption) {
        unansweredQuestions++;
        sectionUnanswered++;
        continue;
      }

      attemptedQuestions++;
      sectionAttempted++;

      if (question.selectedOption === question.correctOption) {
        correctAnswers++;
        sectionCorrect++;
        sectionPositiveScore += section.positiveMarks;
      } else {
        incorrectAnswers++;
        sectionIncorrect++;
        sectionNegativeScore += section.negativeMarks;
      }
    }

    const sectionScore =
      sectionPositiveScore - sectionNegativeScore;

    totalPositiveMarks += sectionPositiveScore;
    totalNegativeMarks += sectionNegativeScore;
    totalScore += sectionScore;

    return {
      name: section.name,
      totalQuestions: section.questions.length,
      attempted: sectionAttempted,
      correct: sectionCorrect,
      incorrect: sectionIncorrect,
      unanswered: sectionUnanswered,
      positiveScore: sectionPositiveScore,
      negativeScore: sectionNegativeScore,
      score: sectionScore,
      accuracy:
        sectionAttempted > 0
          ? Number(
              ((sectionCorrect / sectionAttempted) * 100).toFixed(2)
            )
          : 0,
    };
  });

  attempt.status =
    overallDeadlinePassed || sectionalDeadlinePassed
      ? "expired"
      : "submitted";

  attempt.submittedAt = now;
  attempt.score = Number(totalScore.toFixed(2));

  attempt.resultSummary = {
    totalQuestions,
    attempted: attemptedQuestions,
    correct: correctAnswers,
    incorrect: incorrectAnswers,
    unanswered: unansweredQuestions,
    positiveScore: Number(totalPositiveMarks.toFixed(2)),
    negativeScore: Number(totalNegativeMarks.toFixed(2)),
    score: Number(totalScore.toFixed(2)),
    accuracy:
      attemptedQuestions > 0
        ? Number(
            ((correctAnswers / attemptedQuestions) * 100).toFixed(2)
          )
        : 0,
    sectionResults,
  };

  await attempt.save();

  return {
    attemptId: attempt._id,
    status: attempt.status,
    submittedAt: attempt.submittedAt,
    result: attempt.resultSummary,
  };
}


export async function advanceMockTestSection(
  userId,
  attemptId,
  expectedCurrentSectionIndex
) {
  if (!mongoose.isValidObjectId(attemptId)) {
    throw createError(400, "Invalid attempt ID");
  }

  const attempt = await TestAttempt.findOne({
    _id: attemptId,
    user: userId,
  });

  if (!attempt) {
    throw createError(404, "Test attempt not found");
  }

  if (attempt.status !== "in_progress") {
    throw createError(409, "This test attempt has already ended");
  }

  if (attempt.timerMode !== "sectional") {
    throw createError(
      409,
      "Section transitions are only available for sectional tests"
    );
  }

  const now = new Date();

  if (attempt.deadlineAt && now >= attempt.deadlineAt) {
    const result = await submitMockTestAttempt(userId, attemptId);

    return {
      ...result,
      message: "Overall test time expired",
    };
  }

  const currentIndex = attempt.currentSectionIndex;
  const currentSection = attempt.sections[currentIndex];

  if (!currentSection) {
    throw createError(409, "Current section was not found");
  }

  // A worker or another request may already have advanced the section.
  // Return the server's current state instead of advancing it again.
  if (
    Number.isInteger(expectedCurrentSectionIndex) &&
    currentIndex !== expectedCurrentSectionIndex
  ) {
    return {
      attemptId: attempt._id,
      status: attempt.status,
      currentSectionIndex: currentIndex,
      currentSection: currentSection.name,
      startedAt: currentSection.startedAt,
      deadlineAt: currentSection.deadlineAt,
      remainingSeconds: currentSection.deadlineAt
        ? Math.max(
            0,
            Math.ceil(
              (currentSection.deadlineAt.getTime() - now.getTime()) /
                1000
            )
          )
        : 0,
      message: "Section already advanced; current state returned",
    };
  }

  const nextIndex = currentIndex + 1;
  const nextSection = attempt.sections[nextIndex];

  if (!nextSection) {
    const result = await submitMockTestAttempt(userId, attemptId);

    return {
      ...result,
      message: "Final section completed",
    };
  }

  if (nextSection.startedAt) {
    throw createError(409, "The next section has already started");
  }

  nextSection.startedAt = now;
  nextSection.deadlineAt = new Date(
    now.getTime() + nextSection.durationSeconds * 1000
  );

  attempt.currentSectionIndex = nextIndex;

  await attempt.save();

  return {
    attemptId: attempt._id,
    status: attempt.status,
    currentSectionIndex: nextIndex,
    currentSection: nextSection.name,
    startedAt: nextSection.startedAt,
    deadlineAt: nextSection.deadlineAt,
    remainingSeconds: nextSection.durationSeconds,
  };
}


export async function getAttemptResult(userId, attemptId) {
  if (!mongoose.isValidObjectId(attemptId)) {
    throw createError(400, "Invalid attempt ID");
  }

  const attempt = await TestAttempt.findOne({
    _id: attemptId,
    user: userId,
  }).lean();

  if (!attempt) {
    throw createError(404, "Test attempt not found");
  }

  if (
    !["submitted", "expired"].includes(attempt.status) ||
    !attempt.resultSummary
  ) {
    throw createError(
      409,
      "Results are available only after the test ends"
    );
  }

  return {
    attemptId: attempt._id,
    mockTestId: attempt.mockTest,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    result: attempt.resultSummary,
    sections: attempt.sections.map((section) => ({
      name: section.name,
      questions: section.questions.map((question) => ({
        id: question._id,
        questionText: question.questionText,
        options: question.options,
        selectedOption: question.selectedOption,
        correctOption: question.correctOption,
        explanation: question.explanation,
        markedForReview: question.markedForReview,
      })),
    })),
  };
}


export async function deleteMockTest(userId, testId) {
  if (!mongoose.isValidObjectId(testId)) {
    throw createError("Invalid mock-test ID.", 400);
  }

  const test = await MockTest.findOne({
    _id: testId,
    createdBy: userId,
  });

  if (!test) {
    throw createError("Mock test not found.", 404);
  }

  // Remove attempts belonging to this user's mock test.
  await TestAttempt.deleteMany({
    mockTest: test._id,
    user: userId,
  });

  await MockTest.deleteOne({
    _id: test._id,
    createdBy: userId,
  });

  return { id: test._id.toString() };
}

// services/attemptHistory.service.js

export const getAttemptHistoryService = async ({
  userId,
  status = "completed",
  page = 1,
  limit = 10,
}) => {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (currentPage - 1) * pageSize;

  const filter = { user: userId };

  // By default, show submitted and expired attempts.
  // "completed" is a convenient filter for both statuses.
  if (status === "completed") {
    filter.status = { $in: ["submitted", "expired"] };
  } else if (["submitted", "expired", "in_progress"].includes(status)) {
    filter.status = status;
  }

  const [attempts, total] = await Promise.all([
    TestAttempt.find(filter)
      .populate("mockTest", "title exam")
      .sort({ submittedAt: -1, updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),

    TestAttempt.countDocuments(filter),
  ]);

  const results = attempts.map((attempt) => {
    const sections = Array.isArray(attempt.sections)
      ? attempt.sections
      : [];

    const totalQuestions = sections.reduce(
      (total, section) =>
        total +
        (Array.isArray(section.questions) ? section.questions.length : 0),
      0
    );

    return {
      attemptId: attempt._id,
      testId: attempt.mockTest?._id ?? attempt.mockTest ?? null,
      testTitle: attempt.mockTest?.title ?? "Mock Test",
      exam: attempt.mockTest?.exam ?? null,
      status: attempt.status,
      timerMode: attempt.timerMode ?? null,
      startedAt: attempt.startedAt ?? null,
      submittedAt: attempt.submittedAt ?? null,
      createdAt: attempt.createdAt ?? null,
      totalQuestions,
      score: attempt.score ?? null,
      summary: attempt.resultSummary ?? null,
      sections: sections.map((section) => ({
        sectionId: section._id ?? null,
        title: section.title ?? section.name ?? "Section",
        totalQuestions: Array.isArray(section.questions)
          ? section.questions.length
          : 0,
        score: section.score ?? null,
        resultSummary: section.resultSummary ?? null,
      })),
    };
  });

  return {
    results,
    pagination: {
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};