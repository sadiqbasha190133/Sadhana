
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";
import PageHeader from "../components/PageHeader";

const pageDetails = {
  "/questions": {
    title: "Question Bank",
    description:
      "Import, organize, browse, and manage your personal question collection.",
    next: "Question import and browsing",
  },
  "/mock-tests": {
    title: "Mock Tests",
    description:
      "Create custom tests with your own questions, sections, marks, and timers.",
    next: "Mock-test creation and test settings",
  },
  "/results": {
    title: "Results",
    description:
      "Review your completed attempts, scores, selected answers, and explanations.",
    next: "Results and performance review",
  },
};

export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const page = pageDetails[pathname] ?? {
    title: "Page not found",
    description: "The page you're looking for doesn't exist.",
    next: "Application navigation",
  };

  return (
    <div>
      <PageHeader
        eyebrow="Your workspace"
        title={page.title}
        description={page.description}
      />

      <div className="max-w-2xl rounded-2xl border border-line bg-white p-6 sm:p-8">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas text-brand">
          <Construction size={22} />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-ink">
          Let's build this section next.
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          This page is a placeholder, not a completed feature. Our next
          implementation step is {page.next.toLowerCase()}, connected to
          the existing Sadhana backend.
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-canvas"
        >
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
