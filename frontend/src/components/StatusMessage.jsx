import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const styles = {
  error: {
    container:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
    icon: AlertCircle,
  },
  success: {
    container:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200",
    icon: CheckCircle2,
  },
  info: {
    container:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
    icon: Info,
  },
};

export default function StatusMessage({ type = "info", children }) {
  const style = styles[type] || styles.info;
  const Icon = style.icon;

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${style.container}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="leading-6">{children}</div>
    </div>
  );
}
