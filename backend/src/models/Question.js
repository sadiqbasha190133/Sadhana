
import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    }
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    exam: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    section: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    questionText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000
    },

    options: {
      type: [optionSchema],
      required: true,
      validate: {
        validator(options) {
          return (
            options.length === 4 &&
            new Set(options.map((option) => option.key)).size === 4 &&
            ["A", "B", "C", "D"].every((key) =>
              options.some((option) => option.key === key)
            )
          );
        },
        message: "Exactly four unique options (A, B, C, D) are required."
      }
    },

    correctOption: {
      type: String,
      enum: ["A", "B", "C", "D"],
      required: true
    },

    explanation: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ""
    },

    subject: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },

    topic: {
      type: String,
      trim: true,
      maxlength: 150,
      default: ""
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },

    marks: {
      positive: {
        type: Number,
        min: 0,
        default: 1
      },
      negative: {
        type: Number,
        min: 0,
        default: 0.25
      }
    },

    source: {
      type: String,
      enum: ["manual", "ai", "file"],
      default: "file"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

questionSchema.index({ user: 1, exam: 1, section: 1 });

const Question = mongoose.model("Question", questionSchema);

export default Question;
