import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock3,
  FileUp,
  Flame,
  LibraryBig,
  Play,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import StatusMessage from "../components/StatusMessage";
import { useAuth } from "../context/AuthContext";
import useStartAttempt from "../hooks/useStartAttempt";
import { getQuestions } from "../services/questionService";
import {
  getAllMockTestResults,
  getMockTests,
} from "../services/mockTestService";
import {
  calculateStreak,
  getAttemptScore,
  getId,
  getTestDurationLabel,
  getTestQuestionCount,
  toDayKey,
} from "../utils/attempt";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatShortDate(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// The last seven days, oldest first, each flagged if the user practised.
function buildWeek(dayKeys) {
  const days = new Set(dayKeys);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    return {
      key: toDayKey(date),
      label: WEEKDAY_LABELS[date.getDay()],
      isToday: index === 6,
      practised: days.has(toDayKey(date)),
    };
  });
}

function StatCard({ icon: Icon, label, value, hint, loading }) {
  return (
    <div className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
        </span>
      </div>

      {loading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded-md bg-soft" />
      ) : (
        <p className="mt-3 text-3xl font-bold tracking-tight text-ink">
          {value}
        </p>
      )}

      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { startAttempt, startingId, startError } = useStartAttempt();

  const [tests, setTests] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [results, setResults] = useState([]);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      // allSettled: one failing request must not blank the whole dashboard.
      const [testsResult, questionsResult, resultsResult] =
        await Promise.allSettled([
          getMockTests(),
          getQuestions(),
          getAllMockTestResults({ status: "completed", page: 1, limit: 50 }),
        ]);

      if (!active) return;

      if (testsResult.status === "fulfilled") setTests(testsResult.value);
      if (questionsResult.status === "fulfilled") {
        setQuestionCount(questionsResult.value.length);
      }

      if (resultsResult.status === "fulfilled") {
        const payload = resultsResult.value;
        const list = Array.isArray(payload)
          ? payload
          : payload?.data ?? payload?.results ?? [];

        const safeList = Array.isArray(list) ? list : [];
        setResults(safeList);
        setTotalAttempts(payload?.pagination?.total ?? safeList.length);
      }

      setLoadFailed(
        [testsResult, questionsResult, resultsResult].some(
          (item) => item.status === "rejected"
        )
      );
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const dayKeys = useMemo(
    () =>
      results.map((attempt) =>
        toDayKey(attempt.submittedAt ?? attempt.startedAt ?? attempt.createdAt)
      ),
    [results]
  );

  const streak = useMemo(() => calculateStreak(dayKeys), [dayKeys]);
  const week = useMemo(() => buildWeek(dayKeys), [dayKeys]);
  const practisedThisWeek = week.filter((day) => day.practised).length;
  const practisedToday = week[6].practised;

  const lastAttempt = results[0];
  const lastScore = lastAttempt ? getAttemptScore(lastAttempt) : null;

  const numericScores = results
    .map((attempt) => Number(getAttemptScore(attempt)))
    .filter(Number.isFinite);
  const bestScore = numericScores.length ? Math.max(...numericScores) : null;

  const featuredTest = tests[0];
  const featuredId = getId(featuredTest);
  const quickStartTests = tests.slice(0, 3);

  const firstName = (user?.name || user?.fullName || "").trim().split(" ")[0];

  const steps = [
    {
      title: "Add questions to your bank",
      description: "Import a JSON or CSV file of your own questions.",
      to: "/questions",
      cta: "Import questions",
      icon: FileUp,
      done: questionCount > 0,
    },
    {
      title: "Create a mock test",
      description: "Pick sections, marks and a timer that match your exam.",
      to: "/mock-tests",
      cta: "Create a test",
      icon: ClipboardList,
      done: tests.length > 0,
    },
    {
      title: "Take your first attempt",
      description: "Practise under real exam conditions and see where you stand.",
      to: "/mock-tests",
      cta: "Start practising",
      icon: Target,
      done: totalAttempts > 0,
    },
  ];

  const allStepsDone = steps.every((step) => step.done);

  // The hero call-to-action adapts to where the user is in their journey.
  let heroAction;
  if (featuredTest) {
    heroAction = (
      <button
        type="button"
        onClick={() => startAttempt(featuredId)}
        disabled={Boolean(startingId)}
        className="btn-primary px-5 py-3 text-base"
      >
        <Play size={18} fill="currentColor" aria-hidden="true" />
        {startingId === featuredId ? "Starting..." : "Start practising now"}
      </button>
    );
  } else if (questionCount > 0) {
    heroAction = (
      <Link to="/mock-tests" className="btn-primary px-5 py-3 text-base">
        Create your first mock test
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    );
  } else {
    heroAction = (
      <Link to="/questions" className="btn-primary px-5 py-3 text-base">
        Import your questions
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {loadFailed && (
        <StatusMessage type="error">
          Some of your data could not be loaded. Check that the backend is
          running, then refresh the page.
        </StatusMessage>
      )}

      {startError && <StatusMessage type="error">{startError}</StatusMessage>}

      {/* Hero */}
      <section className="card relative overflow-hidden bg-gradient-to-br from-brand-soft via-surface to-surface p-6 sm:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/10 blur-3xl"
        />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-surface/70 px-3 py-1.5 text-xs font-semibold text-brand">
              <Sparkles size={14} aria-hidden="true" />
              {getGreeting()}
              {firstName ? `, ${firstName}` : ""}
            </p>

            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
              {practisedToday
                ? "Great work today. One more test?"
                : "Ready for today's practice?"}
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
              {featuredTest
                ? "Timed tests build speed and confidence. Every attempt shows you exactly what to improve next."
                : "Add your questions, turn them into a timed mock test and start learning from every attempt."}
            </p>

            {featuredTest && (
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className="font-semibold text-ink">
                  {featuredTest.title}
                </span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span>{getTestQuestionCount(featuredTest)} questions</span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 size={14} aria-hidden="true" />
                  {getTestDurationLabel(featuredTest)}
                </span>
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {heroAction}

              {featuredTest && (
                <Link to="/mock-tests" className="btn-secondary px-5 py-3">
                  All mock tests
                </Link>
              )}
            </div>
          </div>

          {/* Streak card */}
          <div className="rounded-2xl border border-line bg-surface/80 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  streak > 0
                    ? "bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300"
                    : "bg-soft text-muted"
                }`}
              >
                <Flame size={22} aria-hidden="true" />
              </span>
              <div>
                {loading ? (
                  <div className="h-7 w-24 animate-pulse rounded-md bg-soft" />
                ) : (
                  <p className="text-2xl font-bold leading-none text-ink">
                    {streak} day{streak === 1 ? "" : "s"}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">Practice streak</p>
              </div>
            </div>

            <div
              className="mt-5 flex justify-between"
              role="img"
              aria-label={`You practised on ${practisedThisWeek} of the last 7 days`}
            >
              {week.map((day) => (
                <div key={day.key} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                      day.practised
                        ? "bg-brand text-on-brand"
                        : day.isToday
                          ? "border-2 border-dashed border-brand text-brand"
                          : "bg-soft text-muted"
                    }`}
                  >
                    {day.practised ? (
                      <CheckCircle2 size={16} aria-hidden="true" />
                    ) : (
                      ""
                    )}
                  </span>
                  <span className="text-[11px] font-medium text-muted">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-muted">
              {streak > 0 && !practisedToday
                ? "Take a test today to keep your streak alive."
                : `${practisedThisWeek} of 7 days practised this week`}
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        aria-label="Your progress"
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <StatCard
          icon={LibraryBig}
          label="Questions"
          value={questionCount}
          hint="In your question bank"
          loading={loading}
        />
        <StatCard
          icon={ClipboardList}
          label="Mock tests"
          value={tests.length}
          hint="Ready to attempt"
          loading={loading}
        />
        <StatCard
          icon={Target}
          label="Attempts"
          value={totalAttempts}
          hint={
            lastAttempt
              ? `Last: ${formatShortDate(
                  lastAttempt.submittedAt ?? lastAttempt.startedAt
                )}${lastScore !== null ? ` · score ${lastScore}` : ""}`
              : "Complete a test to see this"
          }
          loading={loading}
        />
        <StatCard
          icon={Trophy}
          label="Best score"
          value={bestScore ?? "—"}
          hint="Across your recent attempts"
          loading={loading}
        />
      </section>

      {/* Quick start list */}
      {quickStartTests.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink">Jump back in</h2>
              <p className="mt-1 text-sm text-muted">
                Pick a test and start in one click.
              </p>
            </div>
            <Link
              to="/mock-tests"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark"
            >
              View all <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quickStartTests.map((test) => {
              const id = getId(test);
              const starting = startingId === id;

              return (
                <article
                  key={id}
                  className="card group flex flex-col p-5 transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-lift"
                >
                  {test.exam && (
                    <span className="w-fit rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
                      {test.exam}
                    </span>
                  )}

                  <h3 className="mt-3 line-clamp-2 text-base font-semibold text-ink">
                    {test.title}
                  </h3>

                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span>{getTestQuestionCount(test)} questions</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={14} aria-hidden="true" />
                      {getTestDurationLabel(test)}
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={() => startAttempt(id)}
                    disabled={Boolean(startingId)}
                    className="btn-primary mt-5 w-full"
                  >
                    <Play size={15} fill="currentColor" aria-hidden="true" />
                    {starting ? "Starting..." : "Start test"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Getting started checklist - hidden once the user has done it all */}
      {!allStepsDone && (
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-ink">
            Get set up in three steps
          </h2>
          <p className="mt-1 text-sm text-muted">
            {steps.filter((step) => step.done).length} of {steps.length}{" "}
            completed
          </p>

          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <li
                  key={step.title}
                  className={`flex flex-col rounded-xl border p-4 transition ${
                    step.done
                      ? "border-brand/30 bg-brand-soft/60"
                      : "border-line bg-soft/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-brand shadow-sm">
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    {step.done ? (
                      <CheckCircle2
                        size={20}
                        className="text-brand"
                        aria-label="Completed"
                      />
                    ) : (
                      <Circle size={20} className="text-muted" aria-hidden="true" />
                    )}
                  </div>

                  <p className="mt-4 text-xs font-semibold tracking-wide text-muted">
                    STEP {index + 1}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1 flex-1 text-sm leading-6 text-muted">
                    {step.description}
                  </p>

                  {!step.done && (
                    <Link
                      to={step.to}
                      className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark"
                    >
                      {step.cta} <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}
