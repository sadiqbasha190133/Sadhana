
import "dotenv/config";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { startAttemptExpiryWorker } from "./workers/attemptExpiry.worker.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    startAttemptExpiryWorker()

    const server = app.listen(PORT, () => {
      console.log(`Sadhana API running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        await import("mongoose").then(({ default: mongoose }) =>
          mongoose.disconnect()
        );

        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start Sadhana API:", error.message);
    process.exit(1);
  }
}

startServer();
