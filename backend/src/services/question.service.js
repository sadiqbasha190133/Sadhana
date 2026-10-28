
import mongoose from "mongoose";
import Question from "../models/Question.js";

export async function importQuestions(userId, questions) {
  const documents = questions.map((question) => ({
    ...question,
    user: userId
  }));

  return Question.insertMany(documents, { ordered: true });
}

export async function listQuestions(userId, filters, page, limit) {
  const query = { user: userId };

  for (const field of ["exam", "section", "subject", "topic", "difficulty"]) {
    if (filters[field]) {
      query[field] = filters[field];
    }
  }

  const [questions, total] = await Promise.all([
    Question.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    Question.countDocuments(query)
  ]);

  return {
    questions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getQuestionById(userId, questionId) {
  if (!mongoose.isValidObjectId(questionId)) {
    const error = new Error("Invalid question ID.");
    error.statusCode = 400;
    throw error;
  }

  const question = await Question.findOne({
    _id: questionId,
    user: userId
  }).lean();

  if (!question) {
    const error = new Error("Question not found.");
    error.statusCode = 404;
    throw error;
  }

  return question;
}

export async function deleteQuestion(userId, questionId) {
  if (!mongoose.isValidObjectId(questionId)) {
    const error = new Error("Invalid question ID.");
    error.statusCode = 400;
    throw error;
  }

  const question = await Question.findOneAndDelete({
    _id: questionId,
    user: userId
  });

  if (!question) {
    const error = new Error("Question not found.");
    error.statusCode = 404;
    throw error;
  }
}
