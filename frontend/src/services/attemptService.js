
import api from "./api";

function unwrap(response) {
  const body = response.data;
  return body?.data ?? body;
}

// Save an answer, review flag, or visited status.
export async function updateAttemptQuestion(
  attemptId,
  questionId,
  updates
) {
  const response = await api.patch(
    `/mock-tests/attempts/${attemptId}/questions/${questionId}`,
    updates
  );

  return unwrap(response);
}

// Submit the current test.
export async function submitAttempt(attemptId) {
  const response = await api.post(
    `/mock-tests/attempts/${attemptId}/submit`
  );

  return unwrap(response);
}

// Move to the next section in a sectional test.

export async function nextAttemptSection(
  attemptId,
  currentSectionIndex
) {
  const response = await api.post(
    `/mock-tests/attempts/${attemptId}/next-section`,
    { currentSectionIndex }
  );

  return unwrap(response);
}

// Get the result after the test has ended.
export async function getAttemptResult(attemptId) {
  const response = await api.get(
    `/mock-tests/attempts/${attemptId}/result`
  );

  return unwrap(response);
}


export async function deleteMockTestResult(attemptId) {
  const response = await api.delete(
    `/results/delete-results/${attemptId}`
  );

  return response.data;
}
