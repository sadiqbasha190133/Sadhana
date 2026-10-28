// Helpers shared by the Dashboard, Mock Tests and Take Test pages.

// Turn any axios/validation error into one readable sentence.
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;

  if (typeof data?.message === "string") return data.message;

  const issues = data?.errors ?? data?.issues;

  if (Array.isArray(issues) && issues.length > 0) {
    return issues
      .map((issue) => {
        const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
        return path ? `${path}: ${issue.message}` : issue.message;
      })
      .join(" | ");
  }

  return error?.message || fallback;
}

// The API may return an attempt directly or wrapped in
// { attempt }, { data: { attempt } } or { data }. Always hand back the attempt.
export function normalizeAttemptPayload(payload) {
  let candidate = payload;

  for (let depth = 0; depth < 4 && candidate; depth += 1) {
    if (Array.isArray(candidate.sections)) return candidate;

    if (candidate.attempt) candidate = candidate.attempt;
    else if (candidate.data?.attempt) candidate = candidate.data.attempt;
    else if (candidate.data) candidate = candidate.data;
    else break;
  }

  return candidate ?? null;
}

export function getId(item) {
  return item?.id ?? item?._id ?? item?.questionId ?? "";
}

// Total questions in a test, whichever field the API provides.
export function getTestQuestionCount(test) {
  if (Number.isFinite(test?.questionCount)) return test.questionCount;

  return (test?.sections ?? []).reduce(
    (total, section) => total + (section.questionIds?.length ?? section.questions?.length ?? 0),
    0
  );
}

// "60 min", "1 hr 30 min" or "Sectional timer".
export function getTestDurationLabel(test) {
  if (test?.timerMode === "sectional") return "Sectional";

  const minutes = Math.round((test?.overallDurationSeconds ?? 0) / 60);
  if (!minutes) return "Timed";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

// Score can be a number, a string or an object depending on the endpoint.
export function getAttemptScore(attempt) {
  const score = attempt?.score;

  if (typeof score === "number" || typeof score === "string") return score;

  if (score && typeof score === "object") {
    return score.obtained ?? score.totalScore ?? score.marksObtained ?? score.value ?? null;
  }

  const summary = attempt?.summary ?? attempt?.resultSummary;

  if (summary && typeof summary === "object") {
    return summary.score ?? summary.totalScore ?? summary.marksObtained ?? null;
  }

  return null;
}

// Local calendar day as "YYYY-MM-DD" (so a streak follows the user's own midnight).
export function toDayKey(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Consecutive practice days, ending today (or yesterday, so the streak is
// still alive until the user's day is over).
export function calculateStreak(dayKeys) {
  const days = new Set(dayKeys.filter(Boolean));
  const cursor = new Date();

  if (!days.has(toDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (days.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
