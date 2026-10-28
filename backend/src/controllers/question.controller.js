import { parseQuestionFile } from "../services/questionImport.service.js";

import {
  importQuestions,
  listQuestions,
  getQuestionById,
  deleteQuestion
} from "../services/question.service.js";

export async function uploadQuestions(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a JSON or CSV file."
      });
    }

    const questions = parseQuestionFile(req.file);

    const savedQuestions = await importQuestions(
      req.user.id,
      questions
    );

    return res.status(201).json({
      success: true,
      message: "Questions imported successfully.",
      data: {
        importedCount: savedQuestions.length
      }
    });
  } catch (error) {
    if (error.details) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.details
      });
    }

    next(error);
  }
}

export async function getQuestions(req, res, next) {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 100."
      });
    }

    const result = await listQuestions(
      req.user.id,
      {
        exam: req.query.exam,
        section: req.query.section,
        subject: req.query.subject,
        topic: req.query.topic,
        difficulty: req.query.difficulty
      },
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuestion(req, res, next) {
  try {
    const question = await getQuestionById(
      req.user.id,
      req.params.id
    );

    return res.status(200).json({
      success: true,
      data: { question }
    });
  } catch (error) {
    next(error);
  }
}

export async function removeQuestion(req, res, next) {
  try {
    await deleteQuestion(req.user.id, req.params.id);

    return res.status(200).json({
      success: true,
      message: "Question deleted successfully."
    });
  } catch (error) {
    next(error);
  }
}
