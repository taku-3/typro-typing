// src/features/typro/play/WordDisplay.tsx
"use client";

type Props = {
  word: string;
  reading?: string;
  hint?: string;
};

export function WordDisplay({ word, reading, hint }: Props) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-mono font-extrabold tracking-wide text-slate-100">
        {word}
      </div>

      <div className="mt-3 space-y-1">
        {reading ? (
          <p className="text-sm text-slate-200">
            読み：<span className="font-semibold">{reading}</span>
          </p>
        ) : (
          <p className="text-sm text-slate-500">読み：—</p>
        )}

        {hint ? (
          <p className="text-sm text-slate-200">
            ヒント：<span className="font-semibold">{hint}</span>
          </p>
        ) : (
          <p className="text-sm text-slate-500">ヒント：—</p>
        )}
      </div>
    </div>
  );
}
