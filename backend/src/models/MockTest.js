
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
      trim: true
    }
  },
  { _id: false }
);

const questionSnapshotSchema = new mongoose.Schema({
  originalQuestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    default: null
  },

  questionText: {
    type: String,
    required: true
  },

  options: {
    type: [optionSchema],
    required: true
  },

  // Private fields: never return these during an active test.
  correctOption: {
    type: String,
    enum: ["A", "B", "C", "D"],
    required: true
  },

  explanation: {
    type: String,
    default: ""
  },

  subject: {
    type: String,
    default: ""
  },

  topic: {
    type: String,
    default: ""
  },

  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium"
  }
});

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    durationSeconds: {
      type: Number,
      min: 1,
      default: null
    },

    positiveMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    negativeMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },

    questions: {
      type: [questionSnapshotSchema],
      validate: {
        validator(questions) {
          return questions.length > 0;
        },
        message: "Every section must contain at least one question."
      }
    }
  },
  { _id: true }
);

const mockTestSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    exam: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    timerMode: {
      type: String,
      enum: ["overall", "sectional"],
      required: true
    },

    overallDurationSeconds: {
      type: Number,
      min: 1,
      default: null
    },

    sections: {
      type: [sectionSchema],
      validate: {
        validator(sections) {
          return sections.length > 0;
        },
        message: "A mock test must contain at least one section."
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

mockTestSchema.index({ createdBy: 1, createdAt: -1 });

const MockTest = mongoose.model("MockTest", mockTestSchema);

export default MockTest;
