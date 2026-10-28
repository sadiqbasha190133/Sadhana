import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllMockTestResults } from "../services/mockTestService";
import { getAttemptResult } from "../services/attemptService";
import { deleteMockTestResult } from "../services/attemptService";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "completed", label: "All completed" },
  { value: "submitted", label: "Submitted" },
  { value: "expired", label: "Expired" },
  { value: "in_progress", label: "In progress" },
];

function formatDate(date) {
  if (!date) return "Date unavailable";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Date unavailable";

  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScore(attempt) {
  const score = attempt?.score;

  if (typeof score === "number" || typeof score === "string") {
    return score;
  }

  if (score && typeof score === "object") {
    return (
      score.obtained ??
      score.totalScore ??
      score.marksObtained ??
      score.value ??
      "—"
    );
  }

  const summary = attempt?.summary ?? attempt?.resultSummary;
  if (summary && typeof summary === "object") {
    return (
      summary.score ??
      summary.totalScore ??
      summary.marksObtained ??
      "—"
    );
  }

  return "—";
}

function getQuestionsCount(attempt) {
  if (Number.isFinite(attempt?.totalQuestions)) return attempt.totalQuestions;

  return (attempt?.sections ?? []).reduce(
    (total, section) =>
      total + (section.totalQuestions ?? section.questions?.length ?? 0),
    0
  );
}

function getSummaryValue(attempt, keys) {
  const summary = attempt?.summary ?? attempt?.resultSummary;
  if (!summary || typeof summary !== "object") return "—";

  for (const key of keys) {
    if (summary[key] !== undefined && summary[key] !== null) {
      return summary[key];
    }
  }

  return "—";
}

function StatusBadge({ status }) {
  const config = {
    submitted: {
      label: "Submitted",
      classes:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    expired: {
      label: "Expired",
      classes:
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    in_progress: {
      label: "In progress",
      classes:
        "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    },
  };

  const item = config[status] ?? {
    label: status || "Unknown",
    classes: "border-line bg-soft text-muted",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.classes}`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {item.label}
    </span>
  );
}

function StatCard({ icon, label, value, description, tone = "green" }) {
  const tones = {
    green: "text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    blue: "text-blue-600 dark:text-blue-300 border-blue-500/30",
    violet: "text-violet-600 dark:text-violet-300 border-violet-500/30",
    amber: "text-amber-600 dark:text-amber-300 border-amber-500/30",
  };

  return (
    <div
      className={`rounded-xl border border-line bg-surface px-4 py-3 transition-colors ${tones[tone]}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className="text-lg" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-[11px] text-muted">{description}</p>
    </div>
  );
}

function SectionSummary({ sections }) {
  const [expanded, setExpanded] = useState(false);

  if (!Array.isArray(sections) || sections.length === 0) return null;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        className="text-xs font-semibold text-brand transition hover:opacity-80"
      >
        {expanded ? "Hide section details ↑" : "View section details ↓"}
      </button>

      {expanded && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {sections.map((section, index) => {
            const summary = section.resultSummary;
            const sectionScore =
              section.score ?? summary?.score ?? summary?.totalScore ?? null;

            return (
              <div
                key={section.sectionId || section._id || index}
                className="rounded-lg border border-line bg-soft p-3"
              >
                <p className="text-sm font-semibold text-ink">
                  {section.title || section.name || `Section ${index + 1}`}
                </p>
                <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted">
                    {section.totalQuestions ?? section.questions?.length ?? 0}{" "}
                    questions
                  </span>
                  <span className="font-semibold text-brand">
                    Score: {sectionScore ?? "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function DetailedResult({ result }) {
  const data = result?.data ?? result?.result ?? result;
  const summary = data?.resultSummary ?? data?.summary ?? {};
  const sections = data?.sections ?? data?.sectionResults ?? [];

  const score =
    data?.score ??
    summary?.score ??
    summary?.totalScore ??
    summary?.marksObtained;

  const totalQuestions = data?.totalQuestions ?? summary?.totalQuestions;
  const correct =
    summary?.correctAnswers ?? summary?.correct ?? summary?.correctCount;
  const incorrect =
    summary?.incorrectAnswers ??
    summary?.wrongAnswers ??
    summary?.incorrect;
  const skipped =
    summary?.unanswered ?? summary?.skipped ?? summary?.unattempted;

  const metrics = [
    {
      label: "Score",
      value: score,
      tone: "text-emerald-600 dark:text-emerald-300",
    },
    {
      label: "Questions",
      value: totalQuestions,
      tone: "text-blue-600 dark:text-blue-300",
    },
    {
      label: "Correct",
      value: correct,
      tone: "text-emerald-600 dark:text-emerald-300",
    },
    {
      label: "Incorrect",
      value: incorrect,
      tone: "text-red-600 dark:text-red-300",
    },
    {
      label: "Skipped",
      value: skipped,
      tone: "text-amber-600 dark:text-amber-300",
    },
  ].filter((item) => item.value !== undefined && item.value !== null);

  return (
    <div className="mt-4 border-t border-line pt-4">
      {/* Report heading */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-ink">
            Detailed test report
          </h4>
          <p className="mt-0.5 text-xs text-muted">
            Review your performance and section-wise answers
          </p>
        </div>

        <span className="rounded-full border border-line bg-soft px-2.5 py-1 text-[10px] font-semibold text-muted">
          {sections.length} {sections.length === 1 ? "section" : "sections"}
        </span>
      </div>

      {/* Compact metrics table */}
      {metrics.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="grid grid-cols-2 divide-x divide-y divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="min-w-0 px-3 py-3 transition-colors hover:bg-soft"
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  {item.label}
                </p>
                <p className={`mt-1 truncate text-lg font-bold ${item.tone}`}>
                  {item.value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section-wise table */}
      {Array.isArray(sections) && sections.length > 0 && (
        <div className="mt-4">
          <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
            Section-wise performance
          </h5>

          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead className="bg-soft">
                  <tr>
                    <th className="w-10 px-3 py-3 text-center font-semibold text-muted">
                      #
                    </th>
                    <th className="px-3 py-3 font-semibold text-muted">
                      Section
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-muted">
                      Questions
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-muted">
                      Score
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-muted">
                      Review
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-line">
                  {sections.map((section, index) => {
                    const sectionSummary =
                      section.resultSummary ?? section.summary ?? {};
                    const sectionQuestions = section.questions ?? [];

                    const sectionName =
                      section.title ||
                      section.name ||
                      `Section ${index + 1}`;

                    const sectionScore =
                      section.score ??
                      sectionSummary.score ??
                      sectionSummary.totalScore;

                    const questionCount =
                      section.totalQuestions ?? sectionQuestions.length;

                    console.log("Detailed result data:", data);
                    console.log(
                      "Section question data:",
                      sections.map((section) => ({
                        name: section.name || section.title,
                        questionCount: section.questions?.length ?? 0,
                        availableKeys: Object.keys(section),
                      }))
                    );

                    return (
                      <tr
                        key={section.sectionId || section._id || index}
                        className="transition-colors hover:bg-soft/70"
                      >
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-soft text-[10px] font-bold text-muted">
                            {index + 1}
                          </span>
                        </td>

                        <td className="px-3 py-3">
                          <span className="font-semibold text-ink">
                            {sectionName}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-right tabular-nums text-muted">
                          {questionCount ?? "—"}
                        </td>

                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-1 font-bold tabular-nums text-emerald-600 dark:text-emerald-300">
                            {sectionScore ?? "—"}
                          </span>
                        </td>

                        <td className="px-3 py-3 text-right">
                          {sectionQuestions.length > 0 ? (
                            <details className="group inline-block text-left">
                              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-2 font-semibold text-brand transition hover:border-emerald-500/40 hover:bg-soft [&::-webkit-details-marker]:hidden">
                                <span>Review</span>
                                <span className="text-[10px] transition-transform group-open:rotate-180">
                                  ↓
                                </span>
                              </summary>

                              <div className="mt-2 w-[min(82vw,520px)] max-w-full rounded-xl border border-line bg-surface p-3 shadow-lg">
                                <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2">
                                  <p className="text-xs font-bold text-ink">
                                    {sectionName} · Questions
                                  </p>
                                  <span className="text-[10px] text-muted">
                                    {sectionQuestions.length} total
                                  </span>
                                </div>

                                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                                  {sectionQuestions.map(
                                    (question, questionIndex) => {
                                      const questionText =
                                        question.questionText ||
                                        question.question ||
                                        question.text ||
                                        "Question details unavailable";

                                      const selectedAnswer =
                                        question.selectedAnswer ??
                                        question.selectedOption;

                                      const correctAnswer =
                                        question.correctAnswer ??
                                        question.correctOption;

                                      return (
                                        <div
                                          key={
                                            question._id ||
                                            question.id ||
                                            questionIndex
                                          }
                                          className="rounded-lg border border-line bg-soft p-3"
                                        >
                                          <p className="text-xs font-semibold leading-5 text-ink">
                                            <span className="mr-1.5 text-muted">
                                              Q{questionIndex + 1}.
                                            </span>
                                            {questionText}
                                          </p>

                                          {selectedAnswer !== undefined && (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                              <span className="text-[10px] text-muted">
                                                Your answer
                                              </span>
                                              <span
                                                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                                                  correctAnswer !== undefined &&
                                                  String(selectedAnswer) ===
                                                    String(correctAnswer)
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                                    : "bg-red-500/10 text-red-600 dark:text-red-300"
                                                }`}
                                              >
                                                {String(selectedAnswer)}
                                              </span>
                                            </div>
                                          )}

                                          {correctAnswer !== undefined && (
                                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                              <span className="text-[10px] text-muted">
                                                Correct answer
                                              </span>
                                              <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                                                {String(correctAnswer)}
                                              </span>
                                            </div>
                                          )}

                                          {question.explanation && (
                                            <p className="mt-2 border-t border-line pt-2 text-[11px] leading-5 text-muted">
                                              <span className="font-semibold text-ink">
                                                Explanation:{" "}
                                              </span>
                                              {question.explanation}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            </details>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!sections.length && !Object.keys(summary).length && (
        <p className="mt-3 rounded-lg border border-line bg-soft p-3 text-xs text-muted">
          The result loaded, but its summary uses a different structure.
        </p>
      )}
    </div>
  );
}


function Metric({ label, value, color = "text-ink" }) {
  return (
    <div className="rounded-lg border border-line bg-soft px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-0.5 text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ResultCard({ attempt, onDelete }) {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const attemptId = attempt.attemptId || attempt._id;
  const score = getScore(attempt);
  const questionCount = getQuestionsCount(attempt);
  const correct = getSummaryValue(attempt, [
    "correctAnswers",
    "correct",
    "correctCount",
  ]);
  const incorrect = getSummaryValue(attempt, [
    "incorrectAnswers",
    "wrongAnswers",
    "incorrect",
    "wrong",
  ]);
  const skipped = getSummaryValue(attempt, [
    "unanswered",
    "skipped",
    "unattempted",
  ]);
  
  const loadDetails = async () => {
    if (!attemptId) {
      setDetailsError("Attempt ID is missing.");
      return;
    }

    setDetailsLoading(true);
    setDetailsError("");

    try {
      const response = await getAttemptResult(attemptId);
      if (response?.success === false) {
        throw new Error(response.message || "Unable to load detailed result.");
      }
      setDetails(response);
    } catch (error) {
      setDetailsError(
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch detailed result."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleDetails = () => {
    if (showDetails) {
      setShowDetails(false);
      return;
    }

    setShowDetails(true);
    if (details === null) loadDetails();
  };

  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-line bg-surface p-3 transition-colors hover:border-brand/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={attempt.status} />
            {attempt.exam && (
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                {attempt.exam}
              </span>
            )}
          </div>

          <h3 className="break-words text-sm font-bold text-ink sm:text-base">
            {attempt.testTitle || attempt.mockTest?.title || "Mock Test"}
          </h3>
          <p className="mt-1 text-[11px] text-muted">
            {attempt.submittedAt
              ? `Completed ${formatDate(attempt.submittedAt)}`
              : `Started ${formatDate(attempt.startedAt || attempt.createdAt)}`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="min-w-[76px] rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Score
            </p>
            <p className="text-xl font-extrabold text-brand">{score}</p>
          </div>

          <button
            type="button"
            onClick={() => onDelete(attempt)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
            aria-label={`Delete result for ${attempt.testTitle || attempt.mockTest?.title || "Mock Test"}`}
          >
            <span aria-hidden="true">🗑</span>
            Delete
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Questions" value={questionCount} />
        <Metric label="Correct" value={correct} color="text-success" />
        <Metric label="Incorrect" value={incorrect} color="text-error" />
        <Metric label="Skipped" value={skipped} color="text-warning" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={handleToggleDetails}
          disabled={detailsLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        >
          {detailsLoading
            ? "Loading..."
            : showDetails
              ? "Hide details ↑"
              : "View details ↓"}
        </button>

        <SectionSummary sections={attempt.sections} />
      </div>

      {showDetails && detailsLoading && (
        <div className="mt-3 rounded-lg border border-line bg-soft p-4 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-line border-t-emerald-500" />
          <p className="mt-2 text-xs font-medium text-brand">
            Fetching detailed result...
          </p>
        </div>
      )}

      {showDetails && detailsError && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-500/40 bg-red-500/5 p-3"
        >
          <p className="text-xs text-error">{detailsError}</p>
          <button
            type="button"
            onClick={loadDetails}
            className="mt-2 text-xs font-semibold text-brand underline"
          >
            Try again
          </button>
        </div>
      )}

      {showDetails && !detailsLoading && details !== null && (
        <DetailedResult result={details} />
      )}
    </article>
  );
}

export default function Results() {
  const [attempts, setAttempts] = useState([]);
  const [status, setStatus] = useState("completed");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletingId, setDeletingId] = useState("");
  const [deleteNotice, setDeleteNotice] = useState("");

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError("");
    setDeleteNotice("");

    try {
      const payload = await getAllMockTestResults({
        status,
        page,
        limit: PAGE_SIZE,
      });

      if (payload?.success === false) {
        throw new Error(payload.message || "Unable to load results.");
      }

      const resultData = Array.isArray(payload)
        ? payload
        : payload?.data ?? payload?.results ?? [];

      if (!Array.isArray(resultData)) {
        throw new Error("Unexpected API response. Expected an array of results.");
      }

      setAttempts(resultData);
      setPagination(
        payload?.pagination || {
          total: resultData.length,
          page,
          limit: PAGE_SIZE,
          totalPages: resultData.length > 0 ? 1 : 0,
        }
      );
    } catch (err) {
      setAttempts([]);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load results. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const totalAttempts = pagination.total ?? attempts.length;

  const completedCount = attempts.filter(
    (attempt) =>
      attempt.status === "submitted" || attempt.status === "expired"
  ).length;

  const submittedCount = attempts.filter(
    (attempt) => attempt.status === "submitted"
  ).length;

  const scoredAttempts = attempts
    .map((attempt) => Number(getScore(attempt)))
    .filter(Number.isFinite);

  const averageScore =
    scoredAttempts.length > 0
      ? (
          scoredAttempts.reduce((total, score) => total + score, 0) /
          scoredAttempts.length
        ).toFixed(2)
      : "—";

  const handleDeleteRequest = async (attempt) => {
    const attemptId = attempt.attemptId || attempt._id;

    const title =
      attempt.testTitle ||
      attempt.mockTest?.title ||
      "Mock Test";

    if (!attemptId) {
      setDeleteNotice("Cannot delete result: attempt ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Delete the result for "${title}"?\n\nThis will permanently delete this result. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(attemptId);
    setDeleteNotice("");

    try {
      await deleteMockTestResult(attemptId);

      // Update the results list after successful deletion.
      setAttempts((previous) =>
        previous.filter(
          (item) =>
            (item.attemptId || item._id) !== attemptId
        )
      );

      setPagination((previous) => ({
        ...previous,
        total: Math.max(0, previous.total - 1),
      }));

      setDeleteNotice("Result deleted successfully.");
    } catch (error) {
      setDeleteNotice(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete the result."
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="animate-fade-up">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                Sadhana · Performance
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
                My Results
              </h1>
              <p className="mt-1 max-w-xl text-xs leading-5 text-muted sm:text-sm">
                Review your mock tests, track your scores, and identify areas
                where you can improve.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60 sm:self-auto"
            >
              <span aria-hidden="true">↻</span>
              Refresh
            </button>
          </div>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <StatCard
            icon="📝"
            label="Total attempts"
            value={totalAttempts}
            description="Matching selected filter"
            tone="green"
          />
          <StatCard
            icon="✓"
            label="Completed"
            value={completedCount}
            description="On this page"
            tone="blue"
          />
          <StatCard
            icon="🎯"
            label="Submitted"
            value={submittedCount}
            description="On this page"
            tone="violet"
          />
          <StatCard
            icon="↗"
            label="Average score"
            value={averageScore}
            description="Scored attempts on page"
            tone="amber"
          />
        </section>

        <section className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold text-ink">Test history</h2>
            <p className="mt-0.5 text-xs text-muted">
              {totalAttempts} attempt{totalAttempts === 1 ? "" : "s"} found
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-ink">
            Filter
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {deleteNotice && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-warning"
          >
            {deleteNotice}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-line bg-surface p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-line border-t-emerald-500" />
            <p className="mt-3 text-sm font-semibold text-brand">
              Loading your results...
            </p>
            <p className="mt-1 text-xs text-muted">
              Fetching your mock-test history.
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-surface p-5"
          >
            <h3 className="text-sm font-bold text-error">
              Could not load results
            </h3>
            <p className="mt-2 break-words text-xs text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="mt-3 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-on-brand hover:bg-brand-dark"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && attempts.length === 0 && (
          <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-soft text-2xl">
              📚
            </div>
            <h3 className="mt-4 text-lg font-bold text-ink">No results found</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted">
              No attempts match this filter yet. Complete a mock test and
              return here to review your performance.
            </p>
            <Link
              to="/mock-tests"
              className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2.5 text-xs font-semibold text-on-brand transition hover:bg-brand-dark"
            >
              Explore mock tests →
            </Link>
          </div>
        )}

        {!loading && !error && attempts.length > 0 && (
          <>
            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {attempts.map((attempt, index) => (
                <ResultCard
                  key={attempt.attemptId || attempt._id || index}
                  attempt={attempt}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row">
              <p className="text-xs text-muted">
                Page {pagination.page || page} of{" "}
                {Math.max(1, pagination.totalPages || 1)}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages || 1, current + 1)
                    )
                  }
                  disabled={
                    page >= (pagination.totalPages || 1) || loading
                  }
                  className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-on-brand transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
