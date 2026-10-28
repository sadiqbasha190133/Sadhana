
import { z } from "zod";

const objectIdSchema = z.string().regex(
  /^[a-f\d]{24}$/i,
  "A valid MongoDB question ID is required."
);

const sectionSchema = z.object({
  name: z.string().trim().min(1).max(100),

  questionIds: z.array(objectIdSchema).min(1).max(200),

  durationSeconds: z.number().int().min(1).max(86400).optional(),

  positiveMarks: z.number().finite().min(0).max(100),

  negativeMarks: z.number().finite().min(0).max(100)
});

export const createMockTestSchema = z.object({
  title: z.string().trim().min(1).max(150),

  exam: z.string().trim().min(1).max(150),

  timerMode: z.enum(["overall", "sectional"]),

  overallDurationSeconds: z.number()
    .int()
    .min(1)
    .max(86400)
    .optional(),

  sections: z.array(sectionSchema).min(1).max(20)
}).superRefine((data, ctx) => {
  if (
    data.timerMode === "overall" &&
    data.overallDurationSeconds == null
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["overallDurationSeconds"],
      message: "Overall timer mode requires a duration."
    });
  }

  if (data.timerMode === "sectional") {
    data.sections.forEach((section, index) => {
      if (section.durationSeconds == null) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", index, "durationSeconds"],
          message: "Every section requires a duration in sectional mode."
        });
      }
    });
  }

  const questionIds = data.sections.flatMap(
    (section) => section.questionIds
  );

  if (new Set(questionIds).size !== questionIds.length) {
    ctx.addIssue({
      code: "custom",
      path: ["sections"],
      message: "A question cannot appear more than once in the same mock test."
    });
  }

  if (
    data.timerMode === "sectional" &&
    data.sections.some((section) => section.durationSeconds == null)
  ) {
    // The detailed per-section issues above explain the problem.
  }
});
