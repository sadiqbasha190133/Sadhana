import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Play,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import Brand from "../components/Brand";
import NavItem from "../components/NavItem";
import ThemeToggle from "../components/ThemeToggle";

const navigation = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Question Bank", to: "/questions", icon: LibraryBig },
  { label: "Mock Tests", to: "/mock-tests", icon: ClipboardList },
  { label: "Results", to: "/results", icon: ChartNoAxesCombined },
];

function getDisplayName(user) {
  return user?.name || user?.fullName || "Student";
}

function getInitial(user) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || "S";
}

function SidebarContent({ onNavigate, onLogout, user }) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-line px-5 py-5">
        <Brand />
      </div>

      <div className="px-4 pt-6">
        {/* Always-visible nudge to practise */}
        <Link
          to="/mock-tests"
          onClick={onNavigate}
          className="btn-primary mb-6 flex w-full justify-center py-3"
        >
          <Play size={16} fill="currentColor" aria-hidden="true" />
          Take a mock test
        </Link>

        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Workspace
        </p>

        <nav className="space-y-1" aria-label="Main">
          {navigation.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={item.icon}
              onClick={onNavigate}
            >
              {item.label}
            </NavItem>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-line p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-soft p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand ring-1 ring-brand/20">
            {getInitial(user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {getDisplayName(user)}
            </p>
            <p className="truncate text-xs text-muted">
              {user?.email || "Study account"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300"
        >
          <LogOut size={18} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  // Close the mobile menu with Escape and stop the page scrolling behind it.
  useEffect(() => {
    if (!mobileOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-line lg:block">
        <SidebarContent user={user} onLogout={handleLogout} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute inset-y-0 left-0 w-[280px] border-r border-line shadow-lift animate-fade-up">
            <div className="absolute right-3 top-4 z-10">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-soft hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <SidebarContent
              user={user}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-muted hover:bg-soft hover:text-ink lg:hidden"
            >
              <Menu size={21} />
            </button>

            <span className="text-sm font-semibold text-ink lg:hidden">
              Sadhana
            </span>

            <span className="hidden text-sm text-muted lg:inline">
              Your progress, one step at a time.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle showLabel />
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-brand-soft text-sm font-semibold text-brand"
              title={getDisplayName(user)}
            >
              {getInitial(user)}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
