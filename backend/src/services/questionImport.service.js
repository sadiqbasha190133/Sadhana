
import { parse } from "csv-parse/sync";

import { questionSchema } from "../validators/question.validator.js";

const MAX_QUESTIONS = 200;

function normalizeCsvRow(row) {
    return {
        exam: row.exam,
        section: row.section,
        questionText: row.questionText,

        options: [
            { key: "A", text: row.optionA },
            { key: "B", text: row.optionB },
            { key: "C", text: row.optionC },
            { key: "D", text: row.optionD }
        ],

        correctOption: row.correctOption,
        explanation: row.explanation || "",
        subject: row.subject || "",
        topic: row.topic || "",
        difficulty: row.difficulty || "medium",

        marks: {
            positive: row.positiveMarks === "" || row.positiveMarks == null
                ? 1
                : Number(row.positiveMarks),

            negative: row.negativeMarks === "" || row.negativeMarks == null
                ? 0.25
                : Number(row.negativeMarks)
        },

        source: "file"
    };
}

export function parseQuestionFile(file) {
    const extension = file.originalname.split(".").pop().toLowerCase();
    let rows;

    if (extension === "json") {
        let parsed;

        try {
            parsed = JSON.parse(file.buffer.toString("utf8"));
        } catch {
            throw Object.assign(new Error("The JSON file is invalid."), {
                statusCode: 400
            });
        }

        if (Array.isArray(parsed)) {
            rows = parsed;
        } else if (parsed && Array.isArray(parsed.questions)) {
            rows = parsed.questions.map((question) => ({
                ...question,
                exam: question.exam ?? parsed.exam,
                section: question.section ?? parsed.section
            }));
        } else {
            throw Object.assign(
                new Error("JSON must be an array or contain a questions array."),
                { statusCode: 400 }
            );
        }
    } else if (extension === "csv") {
        try {
            const records = parse(file.buffer.toString("utf8"), {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                bom: true
            });

            rows = records.map(normalizeCsvRow);
        } catch {
            throw Object.assign(new Error("The CSV file could not be parsed."), {
                statusCode: 400
            });
        }
    } else {
        throw Object.assign(
            new Error("Only JSON and CSV files are supported."),
            { statusCode: 400 }
        );
    }

    if (rows.length === 0) {
        throw Object.assign(new Error("The file contains no questions."), {
            statusCode: 400
        });
    }

    if (rows.length > MAX_QUESTIONS) {
        throw Object.assign(
            new Error(`A maximum of ${MAX_QUESTIONS} questions can be imported at once.`),
            { statusCode: 400 }
        );
    }

    const questions = [];
    const errors = [];

    rows.forEach((row, index) => {
        const result = questionSchema.safeParse(row);

        if (!result.success) {
            errors.push({
                questionNumber: index + 1,
                errors: result.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message
                }))
            });
        } else {
            questions.push(result.data);
        }
    });

    if (errors.length > 0) {
        throw Object.assign(
            new Error("Import rejected. Fix the invalid questions and try again."),
            {
                statusCode: 400,
                details: errors
            }
        );
    }

    return questions;
}
