
import { Router } from "express";
import multer from "multer";

import { authenticate } from "../middleware/authenticate.js";

import {
  uploadQuestions,
  getQuestions,
  getQuestion,
  removeQuestion
} from "../controllers/question.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1
  },
  fileFilter(req, file, callback) {
    const extension = file.originalname.split(".").pop().toLowerCase();

    if (!["json", "csv"].includes(extension)) {
        return callback(
            Object.assign(
                new Error("Only JSON and CSV files are supported."),
                { statusCode: 400 }
            )
        );
    }

    callback(null, true);
  }
});

router.use(authenticate);

router.post("/import", upload.single("file"), uploadQuestions);
router.get("/", getQuestions);
router.get("/:id", getQuestion);
router.delete("/:id", removeQuestion);

export default router;
