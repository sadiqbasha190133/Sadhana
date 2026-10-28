
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
      required: true
    }
  },
  { _id: false }
);

const attemptQuestionSchema = new mongoose.Schema({
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

  // Retained for server-side scoring; omit from active-test responses.
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
  },

  selectedOption: {
    type: String,
    enum: ["A", "B", "C", "D"],
    default: null
  },

  markedForReview: {
    type: Boolean,
    default: false
  },

  visited: {
    type: Boolean,
    default: false
  },

  answeredAt: {
    type: Date,
    default: null
  }
});

const attemptSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    durationSeconds: {
      type: Number,
      default: null
    },

    positiveMarks: {
      type: Number,
      required: true,
      min: 0
    },

    negativeMarks: {
      type: Number,
      required: true,
      min: 0
    },

    startedAt: {
      type: Date,
      default: null
    },

    deadlineAt: {
      type: Date,
      default: null
    },

    questions: {
      type: [attemptQuestionSchema],
      required: true
    }
  },
  { _id: true }
);

const testAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    mockTest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MockTest",
      required: true
    },

    status: {
      type: String,
      enum: ["in_progress", "submitted", "expired"],
      default: "in_progress",
      index: true
    },

    timerMode: {
      type: String,
      enum: ["overall", "sectional"],
      required: true
    },

    overallDurationSeconds: {
      type: Number,
      default: null
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },

    deadlineAt: {
      type: Date,
      default: null
    },

    currentSectionIndex: {
      type: Number,
      min: 0,
      default: 0
    },

    sections: {
      type: [attemptSectionSchema],
      required: true
    },

    submittedAt: {
      type: Date,
      default: null
    },

    score: {
      type: Number,
      default: null
    },

    resultSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

testAttemptSchema.index({ user: 1, createdAt: -1 });
testAttemptSchema.index({ user: 1, mockTest: 1, status: 1 });

const TestAttempt = mongoose.model("TestAttempt", testAttemptSchema);

export default TestAttempt;
