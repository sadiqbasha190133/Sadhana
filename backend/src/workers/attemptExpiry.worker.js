
import { processExpiredAttempts } from "../services/attemptLifecycle.service.js";

const INTERVAL_MS = 10_000; // Check every 10 seconds.

let intervalId;
let isRunning = false;

async function runExpiryCheck() {
  if (isRunning) return;

  isRunning = true;

  try {
    const result = await processExpiredAttempts();

    if (result.processed > 0 || result.failed > 0) {
      console.log("[Attempt expiry worker]", result);
    }
  } catch (error) {
    console.error(
      "[Attempt expiry worker] Check failed:",
      error.message
    );
  } finally {
    isRunning = false;
  }
}

export function startAttemptExpiryWorker() {
  if (intervalId) return;

  console.log("[Attempt expiry worker] Started");

  // Check immediately, then every 10 seconds.
  void runExpiryCheck();

  intervalId = setInterval(() => {
    void runExpiryCheck();
  }, INTERVAL_MS);

  intervalId.unref();
}

export function stopAttemptExpiryWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
}
