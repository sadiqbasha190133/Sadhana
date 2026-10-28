
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleX,
  ClipboardList,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return `0${suffix}`;
  }

  return `${value}${suffix}`;
}

function StatCard({ label, value, hint, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    red: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
    purple:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-300",
    slate:
      "border-line bg-soft text-ink",
  };

  const valueColors = {
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-emerald-600 dark:text-emerald-300",
    red: "text-rose-600 dark:text-rose-300",
    amber: "text-amber-600 dark:text-amber-300",
    purple: "text-violet-600 dark:text-violet-300",
    slate: "text-ink",
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm transition-colors duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted sm:text-sm">
            {label}
          </p>

          <p
            className={`mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl ${
              valueColors[tone] || valueColors.blue
            }`}
          >
            {value ?? 0}
          </p>

          {hint && (
            <p className="mt-1 text-xs text-muted">
              {hint}
            </p>
          )}
        </div>

        <div
          className={`rounded-lg border p-2 ${
            tones[tone] || tones.blue
          }`}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function SectionMetric({ label, value, tone = "slate" }) {
  const toneClasses = {
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    red: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    slate: "bg-soft text-ink",
  };

  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        toneClasses[tone] || toneClasses.slate
      }`}
    >
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value ?? 0}</p>
    </div>
  );
}

export default function AttemptResult() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const resultData = location.state?.result;

  if (!resultData?.result) {
    return (
      <main className="animate-fade-up text-ink">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-surface p-6 shadow-sm transition-colors duration-200 dark:border-amber-800/60 sm:p-8">
          <div className="mb-4 inline-flex rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <ClipboardList size={25} />
          </div>

          <h1 className="text-xl font-bold text-ink">
            Result not loaded
          </h1>

          <p className="mt-2 text-sm leading-6 text-muted">
            Return to Mock Tests. If the test has ended, its result can be
            loaded again from the result API.
          </p>

          <button
            onClick={() => navigate("/mock-tests")}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-on-brand transition hover:bg-blue-700"
          >
            <ArrowLeft size={16} />
            Back to Mock Tests
          </button>
        </div>
      </main>
    );
  }

  const summary = resultData.result;

  const stats = [
    {
      label: "Total questions",
      value: summary.totalQuestions,
      hint: "Questions in this test",
      icon: ClipboardList,
      tone: "blue",
    },
    {
      label: "Attempted",
      value: summary.attempted,
      hint: "Questions answered",
      icon: BookOpen,
      tone: "purple",
    },
    {
      label: "Correct answers",
      value: summary.correct,
      hint: "Marks earned",
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "Incorrect answers",
      value: summary.incorrect,
      hint: "Negative marks may apply",
      icon: CircleX,
      tone: "red",
    },
    {
      label: "Unanswered",
      value: summary.unanswered,
      hint: "Questions left blank",
      icon: ClipboardList,
      tone: "slate",
    },
    {
      label: "Accuracy",
      value: formatValue(summary.accuracy, "%"),
      hint: "Correct answers vs attempted",
      icon: Target,
      tone: "amber",
    },
  ];

  return (
    <main className="animate-fade-up text-ink">
      <div className="mx-auto max-w-6xl">
        {/* Page header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
              Performance summary
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Test Result
            </h1>

            <p className="mt-1 text-xs text-muted sm:text-sm">
              Attempt ID:{" "}
              <span className="break-all font-mono">{attemptId}</span>
            </p>

            <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              Status: {resultData.status || "Completed"}
            </span>
          </div>

          <button
            onClick={() => navigate("/mock-tests")}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand shadow-sm transition hover:bg-brand-dark"
          >
            <ArrowLeft size={16} />
            Back to Mock Tests
          </button>
        </header>

        {/* Overall score banner */}
        <section className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-green-800 via-emerald-700 to-teal-700 p-5 text-white shadow-md sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-ink">
                <Trophy size={20} />
                <p className="text-sm font-semibold">Overall performance</p>
              </div>

              <p className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                {formatValue(summary.score)}
                <span className="ml-2 text-base font-medium text-ink">
                  marks
                </span>
              </p>

              <p className="mt-2 max-w-xl text-sm text-ink">
                Review your score, accuracy, and section-wise performance
                below.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-56">
              <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                <p className="text-xs text-ink">Positive marks</p>
                <p className="mt-1 text-2xl font-bold text-emerald-200">
                  +{formatValue(summary.positiveScore)}
                </p>
              </div>

              <div className="rounded-xl border border-white/20 bg-white/10 p-3">
                <p className="text-xs text-ink">Negative marks</p>
                <p className="mt-1 text-2xl font-bold text-rose-200">
                  −{formatValue(summary.negativeScore)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Overall performance cards */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="text-blue-600 dark:text-blue-300" size={19} />
            <h2 className="text-lg font-bold text-ink">
              Overall performance
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((stat) => (
              <StatCard key={stat.label} {...stat} />
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-surface p-4 shadow-sm transition-colors duration-200 dark:border-emerald-900/60">
              <div>
                <p className="text-sm font-medium text-muted">
                  Positive marks earned
                </p>
                <p className="mt-1 text-xs text-muted">
                  Marks added for correct answers
                </p>
              </div>

              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">
                +{formatValue(summary.positiveScore)}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-surface p-4 shadow-sm transition-colors duration-200 dark:border-rose-900/60">
              <div>
                <p className="text-sm font-medium text-muted">
                  Negative marks deducted
                </p>
                <p className="mt-1 text-xs text-muted">
                  Penalty for incorrect answers
                </p>
              </div>

              <p className="text-2xl font-bold text-rose-600 dark:text-rose-300">
                −{formatValue(summary.negativeScore)}
              </p>
            </div>
          </div>
        </section>

        {/* Section-wise performance */}
        {summary.sectionResults?.length > 0 && (
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="text-violet-600 dark:text-violet-300" size={19} />
              <h2 className="text-lg font-bold text-ink">
                Section-wise performance
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {summary.sectionResults.map((section, index) => (
                <article
                  key={section.name}
                  className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-colors duration-200"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-line bg-soft/60 p-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Section {index + 1}
                      </p>

                      <h3 className="mt-1 break-words text-base font-bold text-ink">
                        {section.name}
                      </h3>
                    </div>

                    <div className="shrink-0 rounded-xl bg-blue-100 px-3 py-2 text-right text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                      <p className="text-xs font-medium">Section score</p>
                      <p className="text-xl font-extrabold">
                        {section.score ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
                    <SectionMetric label="Correct" value={section.correct} tone="green" />
                    <SectionMetric label="Incorrect" value={section.incorrect} tone="red" />
                    <SectionMetric label="Unanswered" value={section.unanswered} tone="slate" />
                    <SectionMetric label="Positive Score" value={section.positiveScore} tone="blue" />
                    <SectionMetric label="Negative Score" value={section.negativeScore} tone="amber" />
                    <SectionMetric label="Accuracy" value={formatValue(section.accuracy, "%")} tone="green" />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Answer review */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-ink">
                Answer review
              </h2>
              <p className="mt-1 text-sm text-muted">
                Correct answers are green; your incorrect answers are red.
              </p>
            </div>
          </div>

          {resultData.sections?.length ? (
            resultData.sections.map((section, sectionIndex) => (
              <div
                key={`${section.name}-${sectionIndex}`}
                className="mb-5 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-colors duration-200"
              >
                <div className="flex items-center justify-between gap-3 border-b border-line bg-soft px-4 py-3 sm:px-5">
                  <h3 className="font-bold text-ink">
                    {section.name}
                  </h3>

                  <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line">
                    {section.questions?.length ?? 0} questions
                  </span>
                </div>

                <div className="divide-y divide-line">
                  {section.questions?.map((question, index) => {
                    const selected = question.selectedOption;
                    const correct = question.correctOption;

                    return (
                      <article
                        key={question.id ?? `${section.name}-${index}`}
                        className="p-4 transition-colors duration-200 hover:bg-soft/70 sm:p-5"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-soft text-xs font-bold text-ink">
                            {index + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="whitespace-pre-wrap text-sm font-semibold leading-6 text-ink sm:text-base">
                              {question.questionText}
                            </p>

                            <div className="mt-3 grid gap-2">
                              {question.options?.map((option) => {
                                const key =
                                  typeof option === "string" ? option : option.key;
                                const text =
                                  typeof option === "string" ? option : option.text;
                                const isCorrect = key === correct;
                                const isSelected = key === selected;

                                let optionStyle =
                                  "border-line bg-field text-ink";

                                if (isCorrect) {
                                  optionStyle =
                                    "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200";
                                } else if (isSelected) {
                                  optionStyle =
                                    "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200";
                                }

                                return (
                                  <div
                                    key={key}
                                    className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-200 ${optionStyle}`}
                                  >
                                    <span className="font-bold">{key}.</span>

                                    <span className="min-w-0 flex-1">
                                      {text}
                                    </span>

                                    {isCorrect && (
                                      <span className="shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                        Correct answer
                                      </span>
                                    )}

                                    {isSelected && !isCorrect && (
                                      <span className="shrink-0 text-xs font-semibold text-rose-700 dark:text-rose-300">
                                        Your answer
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {!selected && (
                              <p className="mt-2 inline-flex rounded-md bg-soft px-2 py-1 text-xs font-medium text-muted">
                                You did not answer this question.
                              </p>
                            )}

                            {question.explanation && (
                              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
                                <span className="font-bold">Explanation: </span>
                                {question.explanation}
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-line bg-surface p-5 text-sm text-muted transition-colors duration-200">
              Answer review details are not available for this result.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
