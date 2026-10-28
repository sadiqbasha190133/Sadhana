
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import healthRoutes from "./routes/health.routes.js";
import {
  notFoundHandler,
  errorHandler
} from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.routes.js";
import questionRoutes from "./routes/question.routes.js";
import mockTestRoutes from "./routes/mockTest.routes.js";
import resultsRouts from "./routes/results.routes.js"

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the Sadhana API."
  });
});

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/mock-tests", mockTestRoutes);
app.use("/api/v1/results", resultsRouts);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
