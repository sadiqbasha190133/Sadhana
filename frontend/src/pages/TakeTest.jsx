
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  LoaderCircle,
  Send,
} from "lucide-react";
import {
  getAttemptResult,
  nextAttemptSection,
  submitAttempt,
  updateAttemptQuestion,
} from "../services/attemptService";
import ThemeToggle from "../components/ThemeToggle";
import { getErrorMessage, normalizeAttemptPayload } from "../utils/attempt";

function formatTime(totalSeconds) {
  const seconds = Math.max(0, totalSeconds || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getRemainingSeconds(deadlineAt) {
  if (!deadlineAt) return 0;
  return Math.max(
    0,
    Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000)
  );
}

// Seconds left on whichever timer applies to this attempt right now.
function getInitialRemainingSeconds(attempt) {
  if (!attempt) return 0;

  const deadline =
    attempt.timerMode === "sectional"
      ? attempt.sections?.[attempt.currentSectionIndex ?? 0]?.deadlineAt
      : attempt.deadlineAt;

  return getRemainingSeconds(deadline);
}

export default function TakeTest() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(() =>
    normalizeAttemptPayload(location.state?.attempt ?? null)
  );
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getInitialRemainingSeconds(
      normalizeAttemptPayload(location.state?.attempt ?? null)
    )
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const currentSectionIndex = attempt?.currentSectionIndex ?? 0;
  const sections = useMemo(() => attempt?.sections ?? [], [attempt?.sections]);
  const currentSection = sections[currentSectionIndex];
  const questions = currentSection?.questions ?? [];
  const currentQuestion = questions[activeQuestionIndex];

  const isSectional = attempt?.timerMode === "sectional";

  const autoTransitionStartedForSection = useRef(null);

  const totalQuestions = useMemo(
    () => sections.reduce(
      (total, section) => total + (section.questions?.length ?? 0),
      0
    ),
    [sections]
  );

  const answeredCount = useMemo(
    () => sections.reduce(
      (total, section) =>
        total +
        (section.questions ?? []).filter(
          (question) => question.selectedOption
        ).length,
      0
    ),
    [sections]
  );
  

  const [sectionTransition, setSectionTransition] = useState(false);

  const sectionAdvanceLock = useRef(false);
  const submissionLock = useRef(false);

  // The backend currently has no GET active-attempt endpoint.
  // If the page is refreshed, show a clear message instead of losing context.

// Keep the visible timer aligned with the server-provided deadline.
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;

    const deadline = isSectional
      ? currentSection?.deadlineAt
      : attempt.deadlineAt;

    if (!deadline) return;

    const updateTimer = () => {
      setRemainingSeconds(getRemainingSeconds(deadline));
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [
    attempt,
    isSectional,
    currentSection?.deadlineAt,
    attempt?.deadlineAt,
  ]);

  // Refreshing loses the attempt screen (there is no "resume" endpoint yet),
  // so ask the browser to confirm before the tab is closed or reloaded.
  useEffect(() => {
    if (attempt?.status !== "in_progress") return undefined;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [attempt?.status]);

  const handleExit = () => {
    const confirmed = window.confirm(
      "Leave this test? Your timer keeps running and you will not be able to resume this attempt."
    );

    if (confirmed) navigate("/mock-tests");
  };

  const loadResult = useCallback(async () => {
    setPageLoading(true);
    setError("");

    try {
      const result = await getAttemptResult(attemptId);
      navigate(`/mock-tests/attempts/${attemptId}/result`, {
        replace: true,
        state: { result },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPageLoading(false);
    }
  }, [attemptId, navigate]);

    const finishTest = useCallback(async (automatic = false) => {
        if (!attemptId || submissionLock.current) return;

        submissionLock.current = true;
        setSubmitting(true);
        setError("");
        setNotice(automatic ? "Time is up. Submitting your test…" : "");

        try {
            await submitAttempt(attemptId);
        } catch {
            // The backend may have already submitted or expired the attempt.
            // Try fetching the result before showing an error.
        }

        try {
            const result = await getAttemptResult(attemptId);

            navigate(`/mock-tests/attempts/${attemptId}/result`, {
                replace: true,
                state: { result },
            });
        } catch (err) {
            submissionLock.current = false;
            setError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    }, [attemptId, navigate]);

  // Overall timer expiry submits the attempt.
  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "in_progress" ||
      isSectional ||
      !attempt.deadlineAt ||
      remainingSeconds > 0 ||
      submitting
    ) {
      return;
    }

    // The timer state can briefly read 0 before it syncs with the server
    // deadline. Only auto-submit once the real deadline has actually passed.
    if (getRemainingSeconds(attempt.deadlineAt) > 0) return;

    finishTest(true);
  }, [
    attempt,
    isSectional,
    remainingSeconds,
    submitting,
    finishTest,
  ]);

  const saveQuestionUpdate = async (updates) => {
    if (!currentQuestion || !attemptId || saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await updateAttemptQuestion(
        attemptId,
        currentQuestion.id,
        updates
      );

      setAttempt((previous) => {
        if (!previous) return previous;

        const updatedSections = previous.sections.map(
          (section, sectionIndex) => {
            if (sectionIndex !== currentSectionIndex) return section;

            return {
              ...section,
              questions: section.questions.map((question, index) =>
                index === activeQuestionIndex
                  ? { ...question, ...updates }
                  : question
              ),
            };
          }
        );

        return { ...previous, sections: updatedSections };
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const chooseOption = (optionKey) => {
    saveQuestionUpdate({ selectedOption: optionKey });
  };

  const clearAnswer = () => {
    saveQuestionUpdate({ selectedOption: null });
  };

  const toggleReview = () => {
    if (!currentQuestion) return;
    saveQuestionUpdate({
      markedForReview: !currentQuestion.markedForReview,
    });
  };

  const goToQuestion = async (index) => {
    if (index < 0 || index >= questions.length) return;

    const target = questions[index];

    setActiveQuestionIndex(index);
    setError("");
    setNotice("");

    if (!target.visited) {
      try {
        await updateAttemptQuestion(attemptId, target.id, {
          visited: true,
        });

        setAttempt((previous) => {
          if (!previous) return previous;

          return {
            ...previous,
            sections: previous.sections.map((section, sectionIndex) =>
              sectionIndex !== currentSectionIndex
                ? section
                : {
                    ...section,
                    questions: section.questions.map((question) =>
                      question.id === target.id
                        ? { ...question, visited: true }
                        : question
                    ),
                  }
            ),
          };
        });
      } catch (err) {
        setError(getErrorMessage(err));
      }
    }
  };

    const advanceSection = useCallback(async (automatic = false) => {
        if (
            !attempt ||
            !attemptId ||
            submitting ||
            sectionAdvanceLock.current ||
            submissionLock.current
        ) {
            return;
        }

        const isLastSection = currentSectionIndex >= sections.length - 1;

        // Manual navigation requires confirmation.
        // Automatic timer expiry never asks for confirmation.
        if (!automatic) {
            if (isLastSection) {
                await finishTest(false);
                return;
            }

            const confirmed = window.confirm(
                "Move to the next section? You may not be able to return to this section."
            );

            if (!confirmed) return;
        }

        sectionAdvanceLock.current = true;
        setPageLoading(true);
        setError("");
        setNotice("");

        try {
            // Lock the UI while the backend resolves the transition.
            // Do not delay the request: the backend expiry worker may already
            // have advanced the section. The expected index sent below makes
            // this request safe if that happens.
            if (automatic) {
                setSectionTransition(true);
            }

            const response = await nextAttemptSection(
                attemptId,
                currentSectionIndex
            );

            // The final section may cause the backend to submit the attempt.
            if (
                response?.result ||
                response?.status === "submitted" ||
                response?.status === "expired"
            ) {
                const result = await getAttemptResult(attemptId);

                navigate(`/mock-tests/attempts/${attemptId}/result`, {
                    replace: true,
                    state: { result },
                });

                return;
            }

            const nextIndex = response?.currentSectionIndex;

            if (!Number.isInteger(nextIndex) || nextIndex >= sections.length) {
                throw new Error("The server did not return a valid next section.");
            }

            setAttempt((previous) => {
                if (!previous) return previous;

                return {
                    ...previous,
                    currentSectionIndex: nextIndex,
                    sections: previous.sections.map((section, index) => {
                        if (index !== nextIndex) return section;

                        return {
                            ...section,
                            startedAt: response.startedAt ?? section.startedAt,
                            deadlineAt: response.deadlineAt ?? section.deadlineAt,
                        };
                    }),
                };
            });

            setActiveQuestionIndex(0);

            // Immediately reset the displayed timer for the new section.
            // This prevents the expiry effect from reusing the previous section's 0.
            setRemainingSeconds(
                Number.isFinite(response.remainingSeconds)
                    ? response.remainingSeconds
                    : getRemainingSeconds(response.deadlineAt)
            );

            setNotice(`Now starting section ${nextIndex + 1}.`);
        } catch (err) {
            
            // If the server already ended the attempt, open its result instead
            // of leaving the test page stuck on an expired attempt.
            if (err?.response?.status === 409) {
                try {
                    const result = await getAttemptResult(attemptId);
                    navigate(`/mock-tests/attempts/${attemptId}/result`, {
                        replace: true,
                        state: { result },
                    });
                    return;
                } catch (resultError) {
                    // A 409 can also mean the next section was already started.
                    // In that case, show a useful message rather than crashing.
                    setError(
                        getErrorMessage(resultError) ||
                        "The section state changed on the server. Please return to Mock Tests and reopen the attempt."
                    );
                }
            } else {
                setError(getErrorMessage(err));
            }
        } finally {
            setSectionTransition(false);
            setPageLoading(false);
            sectionAdvanceLock.current = false;
        }
    }, [
        attempt,
        attemptId,
        currentSectionIndex,
        sections.length,
        submitting,
        finishTest,
        navigate,
    ]);

    useEffect(() => {
        if (
            !attempt ||
            attempt.status !== "in_progress" ||
            !isSectional ||
            !currentSection?.deadlineAt ||
            remainingSeconds > 0 ||
            submitting ||
            sectionTransition ||
            pageLoading
        ) {
            return;
        }


      // Check the actual section deadline, not just the React timer state.
      const actualRemainingSeconds = getRemainingSeconds(
        currentSection.deadlineAt
      );

      // The timer may still be initializing on the first render.
      // Do not advance until the actual deadline has expired.
      if (actualRemainingSeconds > 0) {
        return;
      }

      // Prevent duplicate automatic transitions for the same section.
      if (
        autoTransitionStartedForSection.current === currentSectionIndex
      ) {
        return;
      }

      autoTransitionStartedForSection.current = currentSectionIndex;
      advanceSection(true);

    }, [
        attempt,
        currentSectionIndex,
        isSectional,
        currentSection?.deadlineAt,
        remainingSeconds,
        submitting,
        sectionTransition,
        pageLoading,
        advanceSection,
    ]);

  // Automatically advance when a sectional timer reaches zero.
  // Declared after advanceSection to prevent a temporal-dead-zone error.

  if (!attempt) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-10">
        <div className="mx-auto max-w-xl">
          <button
            type="button"
            onClick={() => navigate("/mock-tests")}
            className="btn-ghost mb-5 px-3"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to Mock Tests
          </button>

          <div
            role="alert"
            className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            {error ||
              "This test session is no longer available. Attempts can't be resumed after a refresh, so please start the test again from Mock Tests."}
          </div>
        </div>
      </div>
    );
  }

  if (attempt.status !== "in_progress") {
    return (
      <div className="min-h-screen bg-canvas px-4 py-10">
        <div className="card mx-auto max-w-xl p-6">
          <h1 className="text-xl font-bold text-ink">This attempt has ended</h1>
          <p className="mt-1.5 text-sm text-muted">
            Open the result to review your performance.
          </p>
          <button
            type="button"
            onClick={loadResult}
            disabled={pageLoading}
            className="btn-primary mt-5"
          >
            View result
          </button>
        </div>
      </div>
    );
  }

  if (!currentSection || !currentQuestion) {
    return (
      <div className="min-h-screen bg-canvas px-4 py-10">
        <div className="card mx-auto max-w-xl p-6">
          <p className="text-sm text-ink">
            No questions are available in this section.
          </p>
          <button
            type="button"
            onClick={() => finishTest(false)}
            className="btn-primary mt-4"
          >
            Submit test
          </button>
        </div>
      </div>
    );
  }

  const questionStatus = (question) => {
    if (question.markedForReview && question.selectedOption) {
      return "bg-purple-600 text-white dark:bg-purple-500";
    }
    if (question.markedForReview) {
      return "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200";
    }
    if (question.selectedOption) return "bg-brand text-on-brand";
    if (question.visited) return "bg-soft text-ink";
    return "border border-line bg-surface text-muted";
  };

  const progressPercent = totalQuestions
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;

  // Turn the timer red for the last five minutes so it can't be missed.
  const timeIsLow = remainingSeconds > 0 && remainingSeconds <= 300;
  const busy = saving || sectionTransition || submitting;

  return (
    <div className="min-h-screen bg-canvas px-3 py-3 text-sm text-ink sm:px-5">
      <div className="mx-auto max-w-7xl">
        <header className="sticky top-3 z-30 mb-4 rounded-2xl border border-line bg-surface/95 p-3 shadow-soft backdrop-blur sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={handleExit}
                className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-ink"
              >
                <ArrowLeft size={14} aria-hidden="true" /> Exit test
              </button>
              <h1 className="text-base font-bold text-ink">Mock Test</h1>
              <p className="mt-0.5 truncate text-xs text-muted">
                Section {currentSectionIndex + 1} of {sections.length}:{" "}
                <span className="font-medium text-ink">{currentSection.name}</span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <div
                className={`flex items-center gap-3 rounded-xl px-4 py-2 transition-colors ${
                  timeIsLow
                    ? "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60"
                    : "bg-brand-soft text-brand"
                }`}
              >
                <Clock3
                  size={20}
                  className={timeIsLow ? "animate-pulse" : ""}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-[11px] font-medium opacity-80">
                    Time remaining
                  </p>
                  <p
                    className="font-mono text-xl font-bold leading-tight tabular-nums"
                    role="timer"
                  >
                    {formatTime(remainingSeconds)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Overall progress */}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] font-medium text-muted">
              <span>
                {answeredCount} of {totalQuestions} answered
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-soft"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-label="Questions answered"
            >
              <div
                className="h-full rounded-full bg-brand transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {notice && !error && (
          <div
            role="status"
            className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
          >
            {notice}
          </div>
        )}

        {sectionTransition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="card w-full max-w-sm p-6 text-center shadow-lift">
              <LoaderCircle
                className="mx-auto mb-3 animate-spin text-brand"
                size={32}
                aria-hidden="true"
              />
              <h2 className="text-lg font-bold text-ink">Section completed</h2>
              <p className="mt-1.5 text-sm text-muted">
                Preparing the next section...
              </p>
              <p className="mt-3 text-xs text-muted">
                Please wait. Do not refresh the page.
              </p>
            </div>
          </div>
        )}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <main className="card min-w-0 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="rounded-full bg-soft px-3 py-1 text-xs font-semibold text-ink">
                Question {activeQuestionIndex + 1} of {questions.length}
              </p>

              <button
                type="button"
                onClick={toggleReview}
                disabled={busy}
                aria-pressed={Boolean(currentQuestion.markedForReview)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                  currentQuestion.markedForReview
                    ? "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-200"
                    : "border-line text-muted hover:bg-soft hover:text-ink"
                }`}
              >
                <Flag size={15} aria-hidden="true" />
                {currentQuestion.markedForReview
                  ? "Marked for review"
                  : "Mark for review"}
              </button>
            </div>

            <h2 className="whitespace-pre-wrap text-base font-semibold leading-7 text-ink sm:text-lg">
              {currentQuestion.questionText}
            </h2>

            <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="Answer options">
              {(currentQuestion.options ?? []).map((option) => {
                const key = typeof option === "string" ? option : option.key;
                const text = typeof option === "string" ? option : option.text;
                const selected = currentQuestion.selectedOption === key;

                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => chooseOption(key)}
                    disabled={saving}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-6 transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? "border-brand bg-brand-soft ring-1 ring-brand"
                        : "border-line bg-surface hover:border-brand/50 hover:bg-soft"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                        selected
                          ? "border-brand bg-brand text-on-brand"
                          : "border-line text-muted"
                      }`}
                    >
                      {key}
                    </span>
                    <span className="pt-0.5 text-ink">{text}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={clearAnswer}
                disabled={saving || !currentQuestion.selectedOption}
                className="btn-secondary px-3 py-2 text-xs"
              >
                Clear answer
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => goToQuestion(activeQuestionIndex - 1)}
                  disabled={activeQuestionIndex === 0 || saving}
                  className="btn-secondary px-3 py-2 text-xs"
                >
                  <ArrowLeft size={15} aria-hidden="true" /> Previous
                </button>

                {activeQuestionIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => goToQuestion(activeQuestionIndex + 1)}
                    disabled={saving}
                    className="btn-primary px-4 py-2 text-xs"
                  >
                    Save &amp; Next <ArrowRight size={15} aria-hidden="true" />
                  </button>
                ) : isSectional && currentSectionIndex < sections.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => advanceSection(false)}
                    disabled={pageLoading || saving}
                    className="btn-primary px-4 py-2 text-xs"
                  >
                    Next section <ArrowRight size={15} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => finishTest(false)}
                    disabled={submitting || saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-400"
                  >
                    <Send size={15} aria-hidden="true" />
                    {submitting ? "Submitting..." : "Submit test"}
                  </button>
                )}
              </div>
            </div>
          </main>

          <aside className="card h-fit p-4 lg:sticky lg:top-[8.5rem] lg:max-h-[calc(100vh-9.5rem)] lg:overflow-y-auto">
            <h3 className="text-sm font-bold text-ink">Question palette</h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              {saving ? (
                <>
                  <LoaderCircle className="animate-spin" size={13} aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} className="text-brand" aria-hidden="true" />
                  All changes saved
                </>
              )}
            </p>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => goToQuestion(index)}
                  title={`Question ${index + 1}`}
                  aria-label={`Go to question ${index + 1}`}
                  aria-current={activeQuestionIndex === index ? "true" : undefined}
                  className={`h-9 rounded-lg text-xs font-semibold transition hover:opacity-80 ${questionStatus(
                    question
                  )} ${
                    activeQuestionIndex === index
                      ? "ring-2 ring-brand ring-offset-2 ring-offset-surface"
                      : ""
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <ul className="mt-4 space-y-2 text-[11px] text-muted">
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-brand" aria-hidden="true" /> Answered
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-soft ring-1 ring-line" aria-hidden="true" /> Visited, unanswered
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-purple-100 ring-1 ring-purple-300 dark:bg-purple-950/60 dark:ring-purple-700" aria-hidden="true" /> Marked for review
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-line bg-surface" aria-hidden="true" /> Not visited
              </li>
            </ul>

            <button
              type="button"
              onClick={() => finishTest(false)}
              disabled={submitting || saving}
              className="mt-5 w-full rounded-lg bg-red-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-400"
            >
              {submitting ? "Submitting..." : "Submit test"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
