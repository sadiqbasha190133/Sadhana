import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startMockTestAttempt } from "../services/mockTestService";
import { getErrorMessage, normalizeAttemptPayload } from "../utils/attempt";

// One place that knows how to start a test and open the test screen.
// Used by the Dashboard and the Mock Tests page.
export default function useStartAttempt() {
  const navigate = useNavigate();
  const [startingId, setStartingId] = useState("");
  const [startError, setStartError] = useState("");

  const startAttempt = useCallback(
    async (testId) => {
      if (!testId) return;

      setStartError("");
      setStartingId(testId);

      try {
        const response = await startMockTestAttempt(testId);
        const attempt = normalizeAttemptPayload(response);
        const attemptId = attempt?.id ?? attempt?._id ?? attempt?.attemptId;

        if (!attemptId || !Array.isArray(attempt?.sections)) {
          throw new Error(
            "The server response did not contain a valid attempt and its sections."
          );
        }

        navigate(`/mock-tests/attempts/${attemptId}`, { state: { attempt } });
      } catch (error) {
        setStartError(
          getErrorMessage(error, "Unable to start the test. Please try again.")
        );
      } finally {
        setStartingId("");
      }
    },
    [navigate]
  );

  return { startAttempt, startingId, startError, clearStartError: () => setStartError("") };
}
