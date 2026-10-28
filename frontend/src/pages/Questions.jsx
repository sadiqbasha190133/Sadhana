
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileUp,
  Filter,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusMessage from "../components/StatusMessage";
import {
  getQuestions,
  getQuestionById,
  importQuestions,
  deleteQuestion,
} from "../services/questionService";

function getQuestionId(question) {
  return question.id ?? question._id ?? question.questionId;
}

function getOptions(question) {
  if (Array.isArray(question.options)) {
    return question.options;
  }

  return [
    { key: "A", text: question.optionA },
    { key: "B", text: question.optionB },
    { key: "C", text: question.optionC },
    { key: "D", text: question.optionD },
  ].filter((option) => option.text);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-line bg-surface shadow-xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-muted hover:bg-canvas hover:text-ink"
          >
            <X size={19} />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const [showImport, setShowImport] = useState(false);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [deletingId, setDeletingId] = useState("");
  const [pageError, setPageError] = useState("");
  const fileInputRef = useRef(null);

  async function loadQuestions() {
    setLoading(true);
    setLoadError("");

    try {
      const data = await getQuestions();
      setQuestions(data);
    } catch (error) {
      setLoadError(
        error.response?.data?.message ||
          "Couldn't load your questions. Check the backend connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  const exams = useMemo(
    () =>
      [...new Set(questions.map((q) => q.exam).filter(Boolean))].sort(),
    [questions]
  );

  const sections = useMemo(
    () =>
      [
        ...new Set(
          questions
            .filter((q) => examFilter === "all" || q.exam === examFilter)
            .map((q) => q.section)
            .filter(Boolean)
        ),
      ].sort(),
    [questions, examFilter]
  );

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return questions.filter((question) => {
      const searchable = [
        question.questionText,
        question.exam,
        question.section,
        question.subject,
        question.topic,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!term || searchable.includes(term)) &&
        (examFilter === "all" || question.exam === examFilter) &&
        (sectionFilter === "all" || question.section === sectionFilter) &&
        (difficultyFilter === "all" ||
          (question.difficulty || "medium").toLowerCase() === difficultyFilter)
      );
    });
  }, [questions, search, examFilter, sectionFilter, difficultyFilter]);

  function openImport() {
    setFile(null);
    setImportError("");
    setImportSuccess("");
    setShowImport(true);
  }

  async function handleImport(event) {
    event.preventDefault();

    if (!file) {
      setImportError("Choose a CSV or JSON file first.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["csv", "json"].includes(extension)) {
      setImportError("Only CSV and JSON files are supported.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setImportError("The file must be 2 MB or smaller.");
      return;
    }

    setImporting(true);
    setImportError("");
    setImportSuccess("");

    try {
      const response = await importQuestions(file);
      const message =
        response?.message || "Import request completed successfully.";

      setImportSuccess(message);
      setFile(null);

      if (fileInputRef.current) fileInputRef.current.value = "";

      await loadQuestions();
    } catch (error) {
      setImportError(
        error.response?.data?.message ||
          "Import failed. Check your file format and try again."
      );
    } finally {
      setImporting(false);
    }
  }

  async function openDetails(question) {
    const id = getQuestionId(question);

    if (!id) {
      setDetailError("This question does not have a usable ID.");
      setSelectedQuestion(question);
      return;
    }

    setSelectedQuestion(question);
    setDetailError("");
    setDetailLoading(true);

    try {
      const detail = await getQuestionById(id);
      setSelectedQuestion(detail);
    } catch (error) {
      setDetailError(
        error.response?.data?.message ||
          "Couldn't load full question details."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(question) {
    const id = getQuestionId(question);

    if (!id) {
      setPageError("This question does not have a usable ID.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this question from your question bank? This cannot be undone."
    );

    if (!confirmed) return;

    setDeletingId(id);
    setPageError("");

    try {
      await deleteQuestion(id);
      setQuestions((current) =>
        current.filter((item) => getQuestionId(item) !== id)
      );

      if (getQuestionId(selectedQuestion || {}) === id) {
        setSelectedQuestion(null);
      }
    } catch (error) {
      setPageError(
        error.response?.data?.message ||
          "Couldn't delete this question. Please try again."
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Your study material"
        title="Question Bank"
        description="Keep your practice questions organized by exam, section, and topic."
        action={
          <button
            type="button"
            onClick={openImport}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-dark"
          >
            <Plus size={18} />
            Import questions
          </button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Total questions</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {loading ? "—" : questions.length}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Exams covered</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {loading ? "—" : exams.length}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">Currently shown</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {loading ? "—" : filteredQuestions.length}
          </p>
        </div>
      </div>

      {pageError && (
        <div className="mb-5">
          <StatusMessage type="error">{pageError}</StatusMessage>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search question, exam, subject, or topic..."
                className="w-full rounded-lg border border-line bg-surface py-3 pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="relative">
                <span className="sr-only">Filter by exam</span>
                <select
                  value={examFilter}
                  onChange={(event) => {
                    setExamFilter(event.target.value);
                    setSectionFilter("all");
                  }}
                  className="max-w-full appearance-none rounded-lg border border-line bg-surface py-3 pl-3 pr-9 text-sm text-ink outline-none focus:border-brand"
                >
                  <option value="all">All exams</option>
                  {exams.map((exam) => (
                    <option key={exam} value={exam}>{exam}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              </label>

              <label className="relative">
                <span className="sr-only">Filter by section</span>
                <select
                  value={sectionFilter}
                  onChange={(event) => setSectionFilter(event.target.value)}
                  className="max-w-full appearance-none rounded-lg border border-line bg-surface py-3 pl-3 pr-9 text-sm text-ink outline-none focus:border-brand"
                >
                  <option value="all">All sections</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              </label>

              <label className="relative">
                <span className="sr-only">Filter by difficulty</span>
                <select
                  value={difficultyFilter}
                  onChange={(event) => setDifficultyFilter(event.target.value)}
                  className="max-w-full appearance-none rounded-lg border border-line bg-surface py-3 pl-3 pr-9 text-sm text-ink outline-none focus:border-brand"
                >
                  <option value="all">All levels</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              </label>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {loading
                ? "Loading your questions..."
                : `${filteredQuestions.length} question${filteredQuestions.length === 1 ? "" : "s"} found`}
            </p>
            <button
              type="button"
              onClick={loadQuestions}
              disabled={loading}
              className="text-xs font-semibold text-brand hover:text-brand-dark disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {loadError && (
          <div className="p-5">
            <StatusMessage type="error">{loadError}</StatusMessage>
            <button
              type="button"
              onClick={loadQuestions}
              className="mt-4 rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-canvas"
            >
              Try again
            </button>
          </div>
        )}

        {!loadError && loading && (
          <div className="flex items-center justify-center gap-3 p-12 text-sm text-muted">
            <LoaderCircle size={19} className="animate-spin" />
            Loading question bank...
          </div>
        )}

        {!loading && !loadError && filteredQuestions.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-canvas text-brand">
              <BookOpen size={24} />
            </div>
            <h2 className="mt-4 text-base font-semibold text-ink">
              {questions.length === 0
                ? "Your question bank is empty"
                : "No matching questions"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              {questions.length === 0
                ? "Import a CSV or JSON file to add your first questions."
                : "Try a different search term or change the filters."}
            </p>
            {questions.length === 0 && (
              <button
                type="button"
                onClick={openImport}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-on-brand hover:bg-brand-dark"
              >
                <Upload size={17} />
                Import questions
              </button>
            )}
          </div>
        )}

        {!loading && !loadError && filteredQuestions.length > 0 && (
          <div className="divide-y divide-line">
            {filteredQuestions.map((question, index) => {
              const id = getQuestionId(question);
              const options = getOptions(question);

              return (
                <article
                  key={id || `${question.questionText}-${index}`}
                  className="p-4 transition hover:bg-soft sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-sm font-semibold text-muted sm:flex">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {question.exam && (
                          <span className="rounded-md bg-soft px-2 py-1 text-xs font-medium text-brand">
                            {question.exam}
                          </span>
                        )}
                        {question.section && (
                          <span className="rounded-md bg-canvas px-2 py-1 text-xs text-muted">
                            {question.section}
                          </span>
                        )}
                        {question.difficulty && (
                          <span className="rounded-md border border-line px-2 py-1 text-xs capitalize text-muted">
                            {question.difficulty}
                          </span>
                        )}
                      </div>

                      <h3 className="whitespace-pre-wrap text-sm font-medium leading-6 text-ink">
                        {question.questionText || "Question text unavailable"}
                      </h3>

                      {options.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {options.slice(0, 4).map((option) => (
                            <div
                              key={option.key}
                              className="flex min-w-0 gap-2 rounded-lg border border-line bg-field px-3 py-2 text-xs leading-5 text-muted"
                            >
                              <span className="font-semibold text-ink">
                                {option.key}.
                              </span>
                              <span className="whitespace-pre-wrap">
                                {option.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(question.subject || question.topic) && (
                        <p className="mt-3 text-xs text-muted">
                          {[question.subject, question.topic].filter(Boolean).join(" · ")}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openDetails(question)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-dark"
                        >
                          <Eye size={15} />
                          View details
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(question)}
                          disabled={deletingId === id}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
                        >
                          {deletingId === id ? (
                            <LoaderCircle size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showImport && (
        <Modal title="Import questions" onClose={() => !importing && setShowImport(false)}>
          <p className="mb-5 text-sm leading-6 text-muted">
            Upload a CSV or JSON file containing your questions. The backend
            validates the contents before saving them.
          </p>

          {importError && (
            <div className="mb-4">
              <StatusMessage type="error">{importError}</StatusMessage>
            </div>
          )}

          {importSuccess && (
            <div className="mb-4">
              <StatusMessage type="success">{importSuccess}</StatusMessage>
            </div>
          )}

          <form onSubmit={handleImport}>
            <label
              htmlFor="question-file"
              className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-line bg-canvas px-5 py-8 text-center transition hover:bg-soft"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-brand">
                <FileUp size={22} />
              </div>
              <span className="mt-3 text-sm font-semibold text-ink">
                {file ? file.name : "Choose a question file"}
              </span>
              <span className="mt-1 text-xs text-muted">
                CSV or JSON · Maximum 2 MB
              </span>
              <input
                ref={fileInputRef}
                id="question-file"
                type="file"
                accept=".csv,.json,application/json,text/csv"
                className="sr-only"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setImportError("");
                  setImportSuccess("");
                }}
              />
            </label>

            <div className="mt-4 rounded-lg border border-line p-4">
              <p className="text-xs font-semibold text-ink">
                CSV column headers
              </p>
              <p className="mt-2 break-words text-xs leading-5 text-muted">
                exam, section, questionText, optionA, optionB, optionC,
                optionD, correctOption, explanation, subject, topic,
                difficulty, positiveMarks, negativeMarks
              </p>
              <p className="mt-3 text-xs leading-5 text-muted">
                JSON may contain a question array or an object with exam,
                section, and questions.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowImport(false)}
                disabled={importing}
                className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!file || importing}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {importing ? "Importing..." : "Import file"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedQuestion && (
        <Modal
          title="Question details"
          onClose={() => {
            setSelectedQuestion(null);
            setDetailError("");
          }}
          wide
        >
          {detailLoading ? (
            <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted">
              <LoaderCircle size={18} className="animate-spin" />
              Loading question details...
            </div>
          ) : (
            <div>
              {detailError && (
                <div className="mb-4">
                  <StatusMessage type="error">{detailError}</StatusMessage>
                </div>
              )}

              <div className="mb-4 flex flex-wrap gap-2">
                {[selectedQuestion.exam, selectedQuestion.section, selectedQuestion.subject, selectedQuestion.topic]
                  .filter(Boolean)
                  .map((value) => (
                    <span
                      key={value}
                      className="rounded-md bg-canvas px-2.5 py-1.5 text-xs text-muted"
                    >
                      {value}
                    </span>
                  ))}
              </div>

              <p className="whitespace-pre-wrap text-sm font-medium leading-7 text-ink">
                {selectedQuestion.questionText || "Question text unavailable"}
              </p>

              <div className="mt-5 space-y-2">
                {getOptions(selectedQuestion).map((option) => (
                  <div
                    key={option.key}
                    className="flex gap-3 rounded-lg border border-line p-3 text-sm leading-6"
                  >
                    <span className="font-semibold text-ink">{option.key}.</span>
                    <span className="whitespace-pre-wrap text-muted">{option.text}</span>
                  </div>
                ))}
              </div>

              {selectedQuestion.correctOption && (
                <div className="mt-5 rounded-lg border border-line dark:border-emerald-800/60 bg-soft dark:bg-emerald-950/40 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-brand">
                    <CheckCircle2 size={17} />
                    Correct answer: {selectedQuestion.correctOption}
                  </p>
                  {selectedQuestion.explanation && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                      {selectedQuestion.explanation}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-line p-3">
                  <p className="text-xs text-muted">Difficulty</p>
                  <p className="mt-1 text-sm font-medium capitalize text-ink">
                    {selectedQuestion.difficulty || "Not specified"}
                  </p>
                </div>
                <div className="rounded-lg border border-line p-3">
                  <p className="text-xs text-muted">Created</p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {formatDate(selectedQuestion.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
