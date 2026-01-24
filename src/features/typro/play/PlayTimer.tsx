// src/features/typro/play/PlayTimer.tsx
"use client";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Accent = "sky" | "emerald";

export function PlayTimer({
  timeLeftSec,
  totalTimeSec,
  accent = "sky",
}: {
  timeLeftSec: number;
  totalTimeSec: number;
  accent?: Accent;
}) {
  const ratio = totalTimeSec > 0 ? clamp(timeLeftSec / totalTimeSec, 0, 1) : 0;

  const barClass =
    accent === "emerald"
      ? "bg-emerald-400"
      : "bg-sky-400";

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-slate-200">
        残り <span className="font-bold">{timeLeftSec}</span>s
      </div>

      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full ${barClass} transition-[width] duration-200`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
