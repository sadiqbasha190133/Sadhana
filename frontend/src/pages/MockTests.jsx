import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ClipboardList,
  Layers,
  ListChecks,
  Plus,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatusMessage from "../components/StatusMessage";
import useStartAttempt from "../hooks/useStartAttempt";
import { getQuestions } from "../services/questionService";
import {
  createMockTest,
  deleteMockTest,
  getMockTests,
} from "../services/mockTestService";
import {
  getErrorMessage,
  getId,
  getTestDurationLabel,
  getTestQuestionCount,
} from "../utils/attempt";

function getQuestionText(question) {
  return (
    question?.questionText ??
    question?.text ??
    question?.question ??
    question?.title ??
    "Question text unavailable"
  );
}

function createSection(name) {
  return {
    name,
    questionIds: [],
    positiveMarks: "1",
    negativeMarks: "0.25",
    durationMinutes: "15",
  };
}

function TestCard({ test, starting, anyStarting, deleting, onStart, onDelete }) {
  const id = getId(test);
  const sectionCount = test.sectionCount ?? test.sections?.length ?? 0;

  return (
    <article className="card group flex flex-col p-5 transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        {test.exam ? (
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
            {test.exam}
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={() => onDelete(test)}
          disabled={deleting}
          aria-label={`Delete ${test.title}`}
          title="Delete test"
          className="-mr-1 -mt-1 rounded-lg p-2 text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-300"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-ink">
        {test.title}
      </h3>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-soft px-2 py-2.5">
          <dt className="sr-only">Questions</dt>
          <dd className="text-base font-bold text-ink">
            {getTestQuestionCount(test)}
          </dd>
          <p className="text-[11px] text-muted">Questions</p>
        </div>
        <div className="rounded-lg bg-soft px-2 py-2.5">
          <dt className="sr-only">Sections</dt>
          <dd className="text-base font-bold text-ink">{sectionCount}</dd>
          <p className="text-[11px] text-muted">Sections</p>
        </div>
        <div className="rounded-lg bg-soft px-2 py-2.5">
          <dt className="sr-only">Duration</dt>
          <dd className="text-sm font-bold leading-6 text-ink">
            {getTestDurationLabel(test)}
          </dd>
          <p className="text-[11px] text-muted">Time</p>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => onStart(id)}
        disabled={anyStarting}
        className="btn-primary mt-5 w-full py-3"
      >
        <Play size={16} fill="currentColor" aria-hidden="true" />
        {starting ? "Starting..." : "Start test"}
      </button>
    </article>
  );
}

export default function MockTests() {
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [exam, setExam] = useState("");
  const [timerMode, setTimerMode] = useState("overall");
  const [overallMinutes, setOverallMinutes] = useState("60");
  const [sections, setSections] = useState([]);

  const { startAttempt, startingId, startError, clearStartError } =
    useStartAttempt();

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [testData, questionData] = await Promise.all([
        getMockTests(),
        getQuestions(),
      ]);

      setTests(testData);
      setQuestions(questionData);

      return testData;
    } catch (err) {
      setError(getErrorMessage(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    loadPage().then((loadedTests) => {
      // New users land on the form; returning users land on their tests.
      if (active && loadedTests.length === 0) setShowCreate(true);
    });

    return () => {
      active = false;
    };
  }, [loadPage]);

  const examOptions = useMemo(
    () =>
      [...new Set(questions.map((q) => q.exam).filter(Boolean))].sort(),
    [questions]
  );

  const availableSectionNames = useMemo(
    () =>
      [
        ...new Set(
          questions
            .filter((q) => q.exam === exam)
            .map((q) => q.section)
            .filter(Boolean)
        ),
      ].sort(),
    [questions, exam]
  );

  function clearMessages() {
    setError("");
    setSuccess("");
    clearStartError();
  }

  function handleExamChange(value) {
    setExam(value);
    setSections([]);
    clearMessages();
  }

  function addSection() {
    const unusedNames = availableSectionNames.filter(
      (name) => !sections.some((section) => section.name === name)
    );

    if (!exam) {
      setError("Select an exam before adding a section.");
      return;
    }

    if (unusedNames.length === 0) {
      setError(
        "No more sections are available for this exam. Import questions for another section if needed."
      );
      return;
    }

    setSections((current) => [...current, createSection(unusedNames[0])]);
    clearMessages();
  }

  function removeSection(index) {
    setSections((current) => current.filter((_, i) => i !== index));
  }

  function updateSection(index, field, value) {
    setSections((current) =>
      current.map((section, i) => {
        if (i !== index) return section;

        const updated = { ...section, [field]: value };
        // Changing the section name invalidates the chosen questions.
        if (field === "name") updated.questionIds = [];

        return updated;
      })
    );
    setError("");
  }

  function toggleQuestion(sectionIndex, questionId, checked) {
    setSections((current) =>
      current.map((section, i) => {
        if (i !== sectionIndex) return section;

        const questionIds = checked
          ? [...section.questionIds, questionId]
          : section.questionIds.filter((id) => id !== questionId);

        return { ...section, questionIds };
      })
    );
    setError("");
  }

  function setAllQuestions(sectionIndex, ids) {
    setSections((current) =>
      current.map((section, i) =>
        i === sectionIndex ? { ...section, questionIds: ids } : section
      )
    );
    setError("");
  }

  async function handleDelete(test) {
    const testId = getId(test);

    const confirmed = window.confirm(
      `Delete "${test.title}"?\n\nIts saved attempts and results will also be deleted. This cannot be undone.`
    );

    if (!confirmed) return;

    clearMessages();
    setDeletingId(testId);

    try {
      await deleteMockTest(testId);
      setTests((current) => current.filter((item) => getId(item) !== testId));
      setSuccess("Mock test deleted successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  }

  async function handleCreateTest(event) {
    event.preventDefault();
    clearMessages();

    if (!title.trim()) return setError("Enter a mock test title.");
    if (!exam) return setError("Select an exam.");
    if (sections.length === 0) return setError("Add at least one section.");

    for (const section of sections) {
      if (section.questionIds.length === 0) {
        return setError(
          `Select at least one question for the "${section.name}" section.`
        );
      }

      const positive = Number(section.positiveMarks);
      const negative = Number(section.negativeMarks);

      if (
        !Number.isFinite(positive) ||
        positive < 0 ||
        !Number.isFinite(negative) ||
        negative < 0
      ) {
        return setError(`Enter valid marks for the "${section.name}" section.`);
      }

      if (
        timerMode === "sectional" &&
        (!Number.isInteger(Number(section.durationMinutes)) ||
          Number(section.durationMinutes) < 1)
      ) {
        return setError(
          `Enter a valid duration for the "${section.name}" section.`
        );
      }
    }

    if (
      timerMode === "overall" &&
      (!Number.isInteger(Number(overallMinutes)) || Number(overallMinutes) < 1)
    ) {
      return setError("Enter a valid overall duration in minutes.");
    }

    const payload = {
      title: title.trim(),
      exam,
      timerMode,
      ...(timerMode === "overall"
        ? { overallDurationSeconds: Number(overallMinutes) * 60 }
        : {}),
      sections: sections.map((section) => ({
        name: section.name,
        questionIds: section.questionIds,
        positiveMarks: Number(section.positiveMarks),
        negativeMarks: Number(section.negativeMarks),
        ...(timerMode === "sectional"
          ? { durationSeconds: Number(section.durationMinutes) * 60 }
          : {}),
      })),
    };

    setCreating(true);

    try {
      await createMockTest(payload);

      setSuccess("Mock test created. You can start it right away!");
      setTitle("");
      setExam("");
      setSections([]);
      setTimerMode("overall");
      setOverallMinutes("60");
      setShowCreate(false);

      await loadPage();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  const anyStarting = Boolean(startingId);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Practice"
        title="Mock Tests"
        description="Pick a test and start practising under real exam conditions, or build a new one from your question bank."
        action={
          <button
            type="button"
            onClick={() => setShowCreate((open) => !open)}
            aria-expanded={showCreate}
            aria-controls="create-test-panel"
            className={showCreate ? "btn-secondary" : "btn-primary"}
          >
            <Plus size={17} aria-hidden="true" />
            {showCreate ? "Hide form" : "Create a test"}
          </button>
        }
      />

      {error && <StatusMessage type="error">{error}</StatusMessage>}
      {startError && <StatusMessage type="error">{startError}</StatusMessage>}
      {success && <StatusMessage type="success">{success}</StatusMessage>}

      {/* Your tests - the main event */}
      <section aria-labelledby="your-tests-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="your-tests-heading"
              className="text-lg font-semibold text-ink"
            >
              Your mock tests
            </h2>
            <p className="mt-1 text-sm text-muted">
              {loading
                ? "Loading your tests..."
                : `${tests.length} test${tests.length === 1 ? "" : "s"} ready to attempt`}
            </p>
          </div>

          <button
            type="button"
            onClick={loadPage}
            disabled={loading}
            className="btn-secondary px-3 py-2"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>

        {loading && tests.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="card h-56 animate-pulse bg-soft" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <ClipboardList size={28} aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-ink">
              Your first mock test is one form away
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted">
              Choose an exam, add sections and pick questions. Then you can
              practise against the clock and see exactly where to improve.
            </p>
            {!showCreate && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="btn-primary mt-6"
              >
                <Plus size={17} aria-hidden="true" />
                Create a test
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tests.map((test) => {
              const id = getId(test);

              return (
                <TestCard
                  key={id}
                  test={test}
                  starting={startingId === id}
                  anyStarting={anyStarting}
                  deleting={deletingId === id}
                  onStart={startAttempt}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Create form */}
      {showCreate && (
        <section
          id="create-test-panel"
          className="card p-5 sm:p-6 animate-fade-up"
          aria-labelledby="create-test-heading"
        >
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Plus size={19} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="create-test-heading"
                className="text-base font-semibold text-ink"
              >
                Create a mock test
              </h2>
              <p className="text-sm text-muted">
                Combine multiple sections in one test.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateTest} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="test-title" className="label">
                  Mock test title
                </label>
                <input
                  id="test-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. IBPS RRB Clerk Mock Test 1"
                  className="field"
                  required
                />
              </div>

              <div>
                <label htmlFor="test-exam" className="label">
                  Exam
                </label>
                <div className="relative">
                  <select
                    id="test-exam"
                    value={exam}
                    onChange={(event) => handleExamChange(event.target.value)}
                    className="field appearance-none pr-10"
                    required
                  >
                    <option value="">Select exam</option>
                    {examOptions.map((examName) => (
                      <option key={examName} value={examName}>
                        {examName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                </div>
                {examOptions.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
                    Import questions first to choose an exam.
                  </p>
                )}
              </div>
            </div>

            <fieldset>
              <legend className="label">Timer mode</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    value: "overall",
                    title: "Overall timer",
                    text: "One countdown for the whole test.",
                  },
                  {
                    value: "sectional",
                    title: "Sectional timer",
                    text: "Each section has its own time limit.",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5 transition hover:bg-soft has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                  >
                    <input
                      type="radio"
                      name="timerMode"
                      value={option.value}
                      checked={timerMode === option.value}
                      onChange={() => setTimerMode(option.value)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {option.title}
                      </span>
                      <span className="block text-xs text-muted">
                        {option.text}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {timerMode === "overall" && (
              <div className="max-w-xs">
                <label htmlFor="overall-minutes" className="label">
                  Total duration (minutes)
                </label>
                <input
                  id="overall-minutes"
                  type="number"
                  min="1"
                  step="1"
                  value={overallMinutes}
                  onChange={(event) => setOverallMinutes(event.target.value)}
                  className="field"
                  required
                />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">Test sections</h3>
                  <p className="text-sm text-muted">
                    Add each section and select its questions separately.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addSection}
                  disabled={!exam}
                  className="btn-secondary"
                >
                  <Plus size={16} aria-hidden="true" />
                  Add section
                </button>
              </div>

              {sections.length === 0 && (
                <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
                  <Layers
                    size={22}
                    className="mx-auto mb-2 text-muted"
                    aria-hidden="true"
                  />
                  Select an exam, then click{" "}
                  <strong className="text-ink">Add section</strong>.
                </div>
              )}

              {sections.map((section, index) => {
                const sectionQuestions = questions.filter(
                  (question) =>
                    question.exam === exam && question.section === section.name
                );

                const selectedOtherNames = sections
                  .filter((_, otherIndex) => otherIndex !== index)
                  .map((item) => item.name);

                const allSelected =
                  sectionQuestions.length > 0 &&
                  sectionQuestions.every((question) =>
                    section.questionIds.includes(getId(question))
                  );

                return (
                  <div
                    key={`${section.name}-${index}`}
                    className="space-y-4 rounded-xl border border-line bg-soft/40 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-ink">
                          Section {index + 1}
                        </h4>
                        <p className="text-xs text-muted">
                          {section.questionIds.length} of{" "}
                          {sectionQuestions.length} questions selected
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor={`section-name-${index}`}
                          className="label"
                        >
                          Section name
                        </label>
                        <div className="relative">
                          <select
                            id={`section-name-${index}`}
                            value={section.name}
                            onChange={(event) =>
                              updateSection(index, "name", event.target.value)
                            }
                            className="field appearance-none pr-10"
                          >
                            {availableSectionNames
                              .filter(
                                (name) =>
                                  name === section.name ||
                                  !selectedOtherNames.includes(name)
                              )
                              .map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                          </select>
                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`positive-${index}`}
                          className="label"
                        >
                          Correct (+)
                        </label>
                        <input
                          id={`positive-${index}`}
                          type="number"
                          min="0"
                          step="0.25"
                          value={section.positiveMarks}
                          onChange={(event) =>
                            updateSection(index, "positiveMarks", event.target.value)
                          }
                          className="field"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`negative-${index}`}
                          className="label"
                        >
                          Wrong (−)
                        </label>
                        <input
                          id={`negative-${index}`}
                          type="number"
                          min="0"
                          step="0.25"
                          value={section.negativeMarks}
                          onChange={(event) =>
                            updateSection(index, "negativeMarks", event.target.value)
                          }
                          className="field"
                        />
                      </div>

                      {timerMode === "sectional" && (
                        <div>
                          <label
                            htmlFor={`duration-${index}`}
                            className="label"
                          >
                            Minutes
                          </label>
                          <input
                            id={`duration-${index}`}
                            type="number"
                            min="1"
                            step="1"
                            value={section.durationMinutes}
                            onChange={(event) =>
                              updateSection(index, "durationMinutes", event.target.value)
                            }
                            className="field"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h5 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                          <ListChecks
                            size={16}
                            className="text-brand"
                            aria-hidden="true"
                          />
                          Choose questions
                        </h5>

                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(event) =>
                              setAllQuestions(
                                index,
                                event.target.checked
                                  ? sectionQuestions.map(getId)
                                  : []
                              )
                            }
                          />
                          Select all
                        </label>
                      </div>

                      {sectionQuestions.length === 0 ? (
                        <StatusMessage type="info">
                          No questions found for this exam and section. Import
                          questions with the matching exam and section names.
                        </StatusMessage>
                      ) : (
                        <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-line bg-surface p-2">
                          {sectionQuestions.map((question) => {
                            const questionId = getId(question);
                            const checked =
                              section.questionIds.includes(questionId);

                            return (
                              <label
                                key={questionId}
                                className="flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 transition hover:bg-soft has-[:checked]:bg-brand-soft/70"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) =>
                                    toggleQuestion(
                                      index,
                                      questionId,
                                      event.target.checked
                                    )
                                  }
                                  className="mt-1"
                                />
                                <span className="text-sm leading-5 text-ink">
                                  {getQuestionText(question)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-line pt-5">
              <button
                type="submit"
                disabled={creating || !exam || sections.length === 0}
                className="btn-primary"
              >
                <Plus size={17} aria-hidden="true" />
                {creating ? "Creating test..." : "Create mock test"}
              </button>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
