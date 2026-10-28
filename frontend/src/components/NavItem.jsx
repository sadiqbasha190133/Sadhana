import { NavLink } from "react-router-dom";

export default function NavItem({ to, icon: Icon, children, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-brand-soft text-brand"
            : "text-muted hover:bg-soft hover:text-ink",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand"
            />
          )}
          <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
          <span>{children}</span>
        </>
      )}
    </NavLink>
  );
}
