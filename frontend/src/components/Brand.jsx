import { BookOpenCheck } from "lucide-react";

export default function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-on-brand shadow-sm">
        <BookOpenCheck size={22} strokeWidth={1.8} />
      </div>

      <div>
        <p className="text-lg font-bold leading-tight tracking-tight text-ink">
          Sadhana
        </p>
        <p className="text-xs text-muted">Your study space</p>
      </div>
    </div>
  );
}
