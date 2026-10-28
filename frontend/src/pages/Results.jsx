
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllMockTestResults } from "../services/mockTestService";
import { getAttemptResult } from "../services/attemptService";

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
  const score = attempt.score;

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

  const summary = attempt.summary ?? attempt.resultSummary;

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
  if (Number.isFinite(attempt.totalQuestions)) {
    return attempt.totalQuestions;
  }

  return (attempt.sections ?? []).reduce(
    (total, section) =>
      total +
      (section.totalQuestions ??
        section.questions?.length ??
        0),
    0
  );
}

function getSummaryValue(attempt, keys) {
  const summary = attempt.summary ?? attempt.resultSummary;

  if (!summary || typeof summary !== "object") return "—";

  for (const key of keys) {
    if (summary[key] !== undefined && summary[key] !== null) {
      return summary[key];
    }
  }

  return "—";
}

function StatusBadge({ status }) {
  const styles = {
    submitted: "bg-brand-soft text-brand ring-brand/25",
    expired: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 ring-amber-600/20 dark:ring-amber-400/20",
    in_progress: "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 ring-blue-600/20 dark:ring-blue-400/20",
  };

  const labels = {
    submitted: "Submitted",
    expired: "Expired",
    in_progress: "In progress",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] || "bg-soft text-muted ring-line"
      }`}
    >
      {labels[status] || status || "Unknown"}
    </span>
  );
}

function StatCard({ icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">
          {label}
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-xl">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold text-brand">
        {value}
      </p>

      <p className="mt-1 text-xs text-muted">{description}</p>
    </div>
  );
}

function SectionSummary({ sections }) {
  const [expanded, setExpanded] = useState(false);

  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        className="text-sm font-semibold text-brand hover:text-ink"
      >
        {expanded ? "Hide section details ↑" : "View section details ↓"}
      </button>

      {expanded && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {sections.map((section, index) => {
            const summary = section.resultSummary;
            const sectionScore =
              section.score ??
              summary?.score ??
              summary?.totalScore ??
              null;

            return (
              <div
                key={section.sectionId || section._id || index}
                className="rounded-xl border border-line bg-brand-soft/60 p-4"
              >
                <p className="font-semibold text-ink">
                  {section.title ||
                    section.name ||
                    `Section ${index + 1}`}
                </p>

                <p className="mt-1 text-sm text-muted">
                  {section.totalQuestions ??
                    section.questions?.length ??
                    0}{" "}
                  questions
                </p>

                <p className="mt-1 text-sm font-medium text-brand">
                  Score: {sectionScore ?? "—"}
                </p>
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

  const totalQuestions =
    data?.totalQuestions ?? summary?.totalQuestions;

  const correct =
    summary?.correctAnswers ??
    summary?.correct ??
    summary?.correctCount;

  const incorrect =
    summary?.incorrectAnswers ??
    summary?.wrongAnswers ??
    summary?.incorrect;

  const skipped =
    summary?.unanswered ??
    summary?.skipped ??
    summary?.unattempted;

  return (
    <div className="mt-5 space-y-5 border-t border-line pt-5">
      <h4 className="text-lg font-bold text-ink">
        Detailed Test Report
      </h4>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Score", value: score },
          { label: "Total Questions", value: totalQuestions },
          { label: "Correct Answers", value: correct },
          { label: "Incorrect Answers", value: incorrect },
          { label: "Skipped Questions", value: skipped },
        ]
          .filter((item) => item.value !== undefined)
          .map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-line bg-brand-soft p-4"
            >
              <p className="text-xs text-brand">{item.label}</p>
              <p className="mt-2 text-xl font-bold text-ink">
                {item.value ?? "—"}
              </p>
            </div>
          ))}
      </div>

      {Array.isArray(sections) && sections.length > 0 && (
        <div>
          <h5 className="mb-3 font-semibold text-ink">
            Section-wise Performance
          </h5>

          <div className="space-y-3">
            {sections.map((section, index) => {
              const sectionSummary =
                section.resultSummary ?? section.summary ?? {};

              return (
                <div
                  key={section.sectionId || section._id || index}
                  className="rounded-xl border border-line p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h6 className="font-semibold text-ink">
                      {section.title ||
                        section.name ||
                        `Section ${index + 1}`}
                    </h6>

                    <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
                      Score:{" "}
                      {section.score ??
                        sectionSummary.score ??
                        sectionSummary.totalScore ??
                        "—"}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-muted">
                    Questions:{" "}
                    {section.totalQuestions ??
                      section.questions?.length ??
                      "—"}
                  </p>

                  {section.questions?.length > 0 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-brand">
                        Review questions ({section.questions.length})
                      </summary>

                      <div className="mt-3 space-y-3">
                        {section.questions.map((question, questionIndex) => (
                          <div
                            key={question._id || question.id || questionIndex}
                            className="rounded-lg bg-soft p-3"
                          >
                            <p className="font-medium text-ink">
                              Q{questionIndex + 1}.{" "}
                              {question.questionText ||
                                question.question ||
                                question.text ||
                                "Question details"}
                            </p>

                            {question.selectedAnswer !== undefined && (
                              <p className="mt-2 text-sm text-muted">
                                Your answer: {String(question.selectedAnswer)}
                              </p>
                            )}

                            {question.correctAnswer !== undefined && (
                              <p className="mt-1 text-sm text-brand">
                                Correct answer:{" "}
                                {String(question.correctAnswer)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!sections.length && !Object.keys(summary).length && (
        <p className="text-sm text-muted">
          The result was fetched successfully, but its summary fields may use
          a different structure.
        </p>
      )}
    </div>
  );
}



function ResultCard({ attempt }) {
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
        throw new Error(
          response.message || "Unable to load detailed result."
        );
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

    // Avoid fetching the same result repeatedly.
    if (details === null) loadDetails();
  };

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-line hover:shadow-md sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={attempt.status} />

            {attempt.exam && (
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
                {attempt.exam}
              </span>
            )}
          </div>

          <h3 className="break-words text-lg font-bold text-ink">
            {attempt.testTitle || attempt.mockTest?.title || "Mock Test"}
          </h3>

          <p className="mt-2 text-sm text-muted">
            {attempt.submittedAt
              ? `Completed on ${formatDate(attempt.submittedAt)}`
              : `Started on ${formatDate(
                  attempt.startedAt || attempt.createdAt
                )}`}
          </p>
        </div>

        <div className="rounded-xl bg-brand-soft px-5 py-3 sm:min-w-28 sm:text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-brand">
            Score
          </p>
          <p className="mt-1 text-3xl font-extrabold text-brand">
            {score}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Questions" value={questionCount} />
        <Metric label="Correct" value={correct} color="text-brand" />
        <Metric label="Incorrect" value={incorrect} color="text-red-600 dark:text-red-300" />
        <Metric label="Skipped" value={skipped} color="text-amber-700 dark:text-amber-300" />
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <button
          type="button"
          onClick={handleToggleDetails}
          disabled={detailsLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        >
          {detailsLoading
            ? "Loading details..."
            : showDetails
              ? "Hide detailed result"
              : "View detailed result"}

          {!detailsLoading && (
            <span>{showDetails ? "↑" : "↓"}</span>
          )}
        </button>
      </div>

      {showDetails && detailsLoading && (
        <div className="mt-5 rounded-xl bg-brand-soft p-5 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-line border-t-green-700" />
          <p className="mt-3 text-sm font-medium text-brand">
            Fetching your detailed result...
          </p>
        </div>
      )}

      {showDetails && detailsError && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 p-4"
        >
          <p className="text-sm text-red-700 dark:text-red-300">{detailsError}</p>

          <button
            type="button"
            onClick={loadDetails}
            className="mt-3 text-sm font-semibold text-brand underline"
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


function Metric({ label, value, color = "text-ink" }) {
  return (
    <div className="rounded-xl border border-line bg-soft p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
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

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Axios service returns response.data directly.
      const payload = await getAllMockTestResults({
        status,
        page,
        limit: PAGE_SIZE,
      });

      if (payload?.success === false) {
        throw new Error(payload.message || "Unable to load results.");
      }

      // Supports either { data: [...], pagination: {...} }
      // or { results: [...], pagination: {...} }.
      const resultData = Array.isArray(payload)
        ? payload
        : payload?.data ?? payload?.results ?? [];

      if (!Array.isArray(resultData)) {
        throw new Error(
          "Unexpected API response. Expected an array of results."
        );
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

  // refreshKey lets the "Refresh" button re-run the fetch.
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

  return (
    <main className="animate-fade-up">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-green-800 to-emerald-700 p-6 text-white shadow-lg sm:p-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">
                Sadhana · Performance
              </p>

              <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                My Results
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-ink sm:text-base">
                Track your mock tests, review your performance, and identify
                areas where you can improve.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60 sm:self-auto"
            >
              <span aria-hidden="true">↻</span>
              Refresh results
            </button>
          </div>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon="📝"
            label="Total attempts"
            value={totalAttempts}
            description="Matching the selected filter"
          />
          <StatCard
            icon="✅"
            label="Completed"
            value={completedCount}
            description="On the current page"
          />
          <StatCard
            icon="🎯"
            label="Submitted"
            value={submittedCount}
            description="On the current page"
          />
          <StatCard
            icon="📈"
            label="Average score"
            value={averageScore}
            description="Scored attempts on this page"
          />
        </section>

        <section className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-ink">
              Test history
            </h2>
            <p className="mt-1 text-sm text-muted">
              {totalAttempts} attempt{totalAttempts === 1 ? "" : "s"} found
            </p>
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-ink">
            Filter
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-line bg-surface text-ink px-4 py-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        {loading && (
          <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-line border-t-green-700" />
            <p className="mt-4 font-semibold text-brand">
              Loading your results...
            </p>
            <p className="mt-1 text-sm text-muted">
              Fetching your mock-test history.
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-surface p-6 shadow-sm"
          >
            <h3 className="font-bold text-red-700 dark:text-red-300">
              Could not load results
            </h3>
            <p className="mt-2 break-words text-sm text-muted">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="mt-4 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-brand hover:bg-brand-dark"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && attempts.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-3xl">
              📚
            </div>

            <h3 className="mt-5 text-xl font-bold text-ink">
              No results found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              No attempts match this filter yet. Complete a mock test and
              return here to review your performance.
            </p>

            <Link
              to="/mock-tests"
              className="mt-6 inline-flex rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
            >
              Explore mock tests →
            </Link>
          </div>
        )}

        {!loading && !error && attempts.length > 0 && (
          <>
            <div className="space-y-4">
              {attempts.map((attempt, index) => (
                <ResultCard
                  key={attempt.attemptId || attempt._id || index}
                  attempt={attempt}
                />
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:flex-row">
              <p className="text-sm text-muted">
                Page {pagination.page || page} of{" "}
                {Math.max(1, pagination.totalPages || 1)}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  disabled={page <= 1 || loading}
                  className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        pagination.totalPages || 1,
                        current + 1
                      )
                    )
                  }
                  disabled={
                    page >= (pagination.totalPages || 1) || loading
                  }
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
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
