
import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Question from "../src/models/Question.js";
import TestAttempt from "../src/models/TestAttempt.js";

import {
  createMockTest,
  startMockTestAttempt,
  submitMockTestAttempt,
  getAttemptResult,
  updateAttemptQuestion,
  getMockTestById,
  getAttemptForTestTaker,
} from "../src/services/mockTest.service.js";

import {
  enforceAttemptDeadline,
} from "../src/services/attemptLifecycle.service.js";

import {
  getQuestionById,
  deleteQuestion,
} from "../src/services/question.service.js";

let mongoServer;
let testUser;
let numericalQuestions;
let reasoningQuestions;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri("sadhana_test");
  await connectDB();

  testUser = await User.create({
    name: "Test Student",
    email: "integration-test@example.com",
    password: "TestPassword123!",
  });

  numericalQuestions = await Question.create([
    {
      user: testUser._id,
      exam: "Test Exam",
      section: "Numerical Ability",
      questionText: "What is 2 + 2?",
      options: [
        { key: "A", text: "2" },
        { key: "B", text: "3" },
        { key: "C", text: "4" },
        { key: "D", text: "5" },
      ],
      correctOption: "C",
      explanation: "2 + 2 = 4.",
      subject: "Mathematics",
      topic: "Addition",
      difficulty: "easy",
      source: "manual",
    },
    {
      user: testUser._id,
      exam: "Test Exam",
      section: "Numerical Ability",
      questionText: "What is 5 × 2?",
      options: [
        { key: "A", text: "7" },
        { key: "B", text: "10" },
        { key: "C", text: "12" },
        { key: "D", text: "15" },
      ],
      correctOption: "B",
      explanation: "5 × 2 = 10.",
      subject: "Mathematics",
      topic: "Multiplication",
      difficulty: "easy",
      source: "manual",
    },
  ]);

  reasoningQuestions = await Question.create([
    {
      user: testUser._id,
      exam: "Test Exam",
      section: "Reasoning",
      questionText: "Which number comes after 2?",
      options: [
        { key: "A", text: "3" },
        { key: "B", text: "4" },
        { key: "C", text: "5" },
        { key: "D", text: "6" },
      ],
      correctOption: "A",
      explanation: "3 comes after 2.",
      subject: "Reasoning",
      topic: "Number Series",
      difficulty: "easy",
      source: "manual",
    },
  ]);
});

test.after(async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = undefined;
  }
});

test("mock test: save answers and calculate result", async () => {
  const mockTest = await createMockTest(testUser._id.toString(), {
    title: "Integration Test",
    exam: "Test Exam",
    timerMode: "overall",
    overallDurationSeconds: 600,
    sections: [
      {
        name: "Numerical Ability",
        questionIds: numericalQuestions.map((q) => q._id.toString()),
        positiveMarks: 1,
        negativeMarks: 0.25,
      },
    ],
  });

  const attemptResponse = await startMockTestAttempt(
    testUser._id.toString(),
    mockTest.id
  );

  const attemptId = attemptResponse.id;
  assert.ok(attemptId, "Attempt ID should be returned");

  const attempt = await TestAttempt.findById(attemptId);
  assert.ok(attempt, "Attempt should be saved in MongoDB");

  attempt.sections[0].questions[0].selectedOption = "C";
  attempt.sections[0].questions[1].selectedOption = "A";
  await attempt.save();

  const result = await submitMockTestAttempt(
    testUser._id.toString(),
    attemptId
  );

  assert.equal(result.status, "submitted");
  assert.equal(result.result.totalQuestions, 2);
  assert.equal(result.result.attempted, 2);
  assert.equal(result.result.correct, 1);
  assert.equal(result.result.incorrect, 1);
  assert.equal(result.result.unanswered, 0);
  assert.equal(result.result.positiveScore, 1);
  assert.equal(result.result.negativeScore, 0.25);
  assert.equal(result.result.score, 0.75);

  const savedAttempt = await TestAttempt.findById(attemptId);
  assert.equal(savedAttempt.status, "submitted");
  assert.equal(savedAttempt.score, 0.75);

  const reviewedResult = await getAttemptResult(
    testUser._id.toString(),
    attemptId
  );

  assert.equal(reviewedResult.status, "submitted");
  assert.equal(reviewedResult.result.score, 0.75);
  assert.equal(reviewedResult.sections.length, 1);
  assert.equal(
    reviewedResult.sections[0].questions[0].correctOption,
    "C"
  );

  await assert.rejects(
    () => submitMockTestAttempt(testUser._id.toString(), attemptId),
    (error) => error.statusCode === 409
  );
});

test("sectional attempt advances after expiry and submits after the final section", async () => {
  const mockTest = await createMockTest(testUser._id.toString(), {
    title: "Section Timer Integration Test",
    exam: "Test Exam",
    timerMode: "sectional",
    sections: [
      {
        name: "Numerical Ability",
        questionIds: [numericalQuestions[0]._id.toString()],
        durationSeconds: 60,
        positiveMarks: 1,
        negativeMarks: 0.25,
      },
      {
        name: "Reasoning",
        questionIds: [reasoningQuestions[0]._id.toString()],
        durationSeconds: 60,
        positiveMarks: 1,
        negativeMarks: 0.25,
      },
    ],
  });

  const attemptResponse = await startMockTestAttempt(
    testUser._id.toString(),
    mockTest.id
  );

  const attemptId = attemptResponse.id;
  assert.ok(attemptId, "Attempt ID should be returned");

  // Simulate the first section's timer having expired.
  let attempt = await TestAttempt.findById(attemptId);
  attempt.sections[0].deadlineAt = new Date(Date.now() - 1000);
  await attempt.save();

  const firstExpiry = await enforceAttemptDeadline(
    testUser._id.toString(),
    attemptId
  );

  assert.equal(firstExpiry.action, "section_advanced");

  attempt = await TestAttempt.findById(attemptId);
  assert.equal(attempt.status, "in_progress");
  assert.equal(attempt.currentSectionIndex, 1);
  assert.ok(attempt.sections[1].startedAt);
  assert.ok(attempt.sections[1].deadlineAt);
  assert.ok(attempt.sections[1].deadlineAt > new Date());

  // Simulate the final section's timer having expired.
  attempt.sections[1].deadlineAt = new Date(Date.now() - 1000);
  await attempt.save();

  const finalExpiry = await enforceAttemptDeadline(
    testUser._id.toString(),
    attemptId
  );

  assert.equal(finalExpiry.action, "submitted");

  attempt = await TestAttempt.findById(attemptId);
  assert.equal(attempt.status, "expired");
  assert.ok(attempt.resultSummary);
  assert.equal(attempt.resultSummary.totalQuestions, 2);

  // Expired attempts must not accept answer updates.
  await assert.rejects(
    () =>
      submitMockTestAttempt(testUser._id.toString(), attemptId),
    (error) => error.statusCode === 409
  );
});


test("answer updates: save answers, review flags, and reject invalid updates", async () => {
  const mockTest = await createMockTest(testUser._id.toString(), {
    title: "Answer Update Test",
    exam: "Test Exam",
    timerMode: "overall",
    overallDurationSeconds: 600,
    sections: [
      {
        name: "Numerical Ability",
        questionIds: numericalQuestions.map((q) => q._id.toString()),
        positiveMarks: 1,
        negativeMarks: 0.25,
      },
    ],
  });

  const attempt = await startMockTestAttempt(
    testUser._id.toString(),
    mockTest.id
  );

  const attemptId = attempt.id;
  const questionId = attempt.sections[0].questions[0].id;
  const userId = testUser._id.toString();

  // Save an answer and mark the question for review.
  const updatedAttempt = await updateAttemptQuestion(
    userId,
    attemptId,
    questionId,
    {
      selectedOption: "C",
      markedForReview: true,
      visited: true,
    }
  );

  assert.equal(
    updatedAttempt.sections[0].questions[0].selectedOption,
    "C"
  );
  assert.equal(
    updatedAttempt.sections[0].questions[0].markedForReview,
    true
  );
  assert.equal(
    updatedAttempt.sections[0].questions[0].visited,
    true
  );

  // Invalid answer options must be rejected.
  await assert.rejects(
    () =>
      updateAttemptQuestion(userId, attemptId, questionId, {
        selectedOption: "Z",
      }),
    (error) => error.statusCode === 400
  );

  // Unknown update fields must be rejected.
  await assert.rejects(
    () =>
      updateAttemptQuestion(userId, attemptId, questionId, {
        correctOption: "A",
      }),
    (error) => error.statusCode === 400
  );

  // Submit the attempt.
  await submitMockTestAttempt(userId, attemptId);

  // A completed attempt must not accept further updates.
  await assert.rejects(
    () =>
      updateAttemptQuestion(userId, attemptId, questionId, {
        selectedOption: "A",
      }),
    (error) => error.statusCode === 409
  );
});

test("sectional attempt: questions in inactive sections cannot be updated", async () => {
  const mockTest = await createMockTest(testUser._id.toString(), {
    title: "Inactive Section Update Test",
    exam: "Test Exam",
    timerMode: "sectional",
    sections: [
      {
        name: "Numerical Ability",
        questionIds: [numericalQuestions[0]._id.toString()],
        durationSeconds: 60,
        positiveMarks: 1,
        negativeMarks: 0.25,
      },
      {
        name: "Reasoning",
        questionIds: [reasoningQuestions[0]._id.toString()],
        durationSeconds: 60,
        positiveMarks: 1,
        negativeMarks: 0.25,
      },
    ],
  });

  const attempt = await startMockTestAttempt(
    testUser._id.toString(),
    mockTest.id
  );

  const inactiveQuestionId = attempt.sections[1].questions[0].id;

  await assert.rejects(
    () =>
      updateAttemptQuestion(
        testUser._id.toString(),
        attempt.id,
        inactiveQuestionId,
        { selectedOption: "A" }
      ),
    (error) => error.statusCode === 409
  );
});


test("authorization: one user cannot access another user's resources", async () => {
  const ownerId = testUser._id.toString();

  // Create a second, unrelated user.
  const otherUser = await User.create({
    name: "Another Student",
    email: "another-student@example.com",
    password: "AnotherPassword123!",
  });

  const otherUserId = otherUser._id.toString();
  const questionId = numericalQuestions[0]._id.toString();

  // Create a mock test and attempt owned by the first user.
  const mockTest = await createMockTest(ownerId, {
    title: "Private Ownership Test",
    exam: "Test Exam",
    timerMode: "overall",
    overallDurationSeconds: 600,
    sections: [
      {
        name: "Numerical Ability",
        questionIds: [questionId],
        positiveMarks: 1,
        negativeMarks: 0.25,
      },
    ],
  });

  const attempt = await startMockTestAttempt(ownerId, mockTest.id);
  const attemptId = attempt.id;
  const attemptQuestionId = attempt.sections[0].questions[0].id;

  // Another user cannot read or delete the owner's question.
  await assert.rejects(
    () => getQuestionById(otherUserId, questionId),
    (error) => error.statusCode === 404
  );

  await assert.rejects(
    () => deleteQuestion(otherUserId, questionId),
    (error) => error.statusCode === 404
  );

  // Confirm the original question still exists.
  assert.ok(await Question.findById(questionId));

  // Another user cannot view or start the owner's mock test.
  await assert.rejects(
    () => getMockTestById(otherUserId, mockTest.id),
    (error) => error.statusCode === 404
  );

  await assert.rejects(
    () => startMockTestAttempt(otherUserId, mockTest.id),
    (error) => error.statusCode === 404
  );

  // Another user cannot view, modify, submit, or review the attempt.
  await assert.rejects(
    () => getAttemptForTestTaker(otherUserId, attemptId),
    (error) => error.statusCode === 404
  );

  await assert.rejects(
    () =>
      updateAttemptQuestion(
        otherUserId,
        attemptId,
        attemptQuestionId,
        { selectedOption: "A" }
      ),
    (error) => error.statusCode === 404
  );

  const attemptBeforeSubmit = await TestAttempt.findById(attemptId);

  await assert.rejects(
    () => submitMockTestAttempt(otherUserId, attemptId),
    (error) => error.statusCode === 404
  );

  await assert.rejects(
    () => getAttemptResult(otherUserId, attemptId),
    (error) => error.statusCode === 404
  );

  // The real owner must still be able to access the attempt.
  const ownerAttempt = await getAttemptForTestTaker(
    ownerId,
    attemptId
  );

  assert.equal(ownerAttempt.id, attemptId);
  assert.equal(ownerAttempt.status, "in_progress");
});

