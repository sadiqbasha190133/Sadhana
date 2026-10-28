
export function getAttemptDeadlineState(attempt, now = new Date()) {
  if (attempt.status !== "in_progress") {
    return {
      expired: false,
      reason: null,
    };
  }

  if (
    attempt.timerMode === "overall" &&
    attempt.deadlineAt &&
    now >= new Date(attempt.deadlineAt)
  ) {
    return {
      expired: true,
      reason: "overall",
    };
  }

  if (attempt.timerMode === "sectional") {
    const section = attempt.sections[attempt.currentSectionIndex];

    if (
      section?.deadlineAt &&
      now >= new Date(section.deadlineAt)
    ) {
      return {
        expired: true,
        reason: "section",
      };
    }
  }

  return {
    expired: false,
    reason: null,
  };
}
