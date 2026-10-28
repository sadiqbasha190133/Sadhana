
import { z } from "zod";

const optionSchema = z.object({
  key: z.enum(["A", "B", "C", "D"]),
  text: z.string().trim().min(1).max(2000)
});

export const questionSchema = z.object({
  exam: z.string().trim().min(1).max(150),
  section: z.string().trim().min(1).max(100),
  questionText: z.string().trim().min(1).max(5000),

  options: z.array(optionSchema).length(4).refine(
    (options) =>
      new Set(options.map((option) => option.key)).size === 4 &&
      ["A", "B", "C", "D"].every((key) =>
        options.some((option) => option.key === key)
      ),
    { message: "Options must contain A, B, C and D exactly once." }
  ),

  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().max(5000).optional().default(""),
  subject: z.string().max(100).optional().default(""),
  topic: z.string().max(150).optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),

  marks: z.object({
    positive: z.number().finite().min(0).max(100).default(1),
    negative: z.number().finite().min(0).max(100).default(0.25)
  }).optional().default({ positive: 1, negative: 0.25 }),

  source: z.enum(["manual", "ai", "file"]).optional().default("file")
});
