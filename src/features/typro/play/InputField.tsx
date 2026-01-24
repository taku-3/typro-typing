// src/features/typro/play/InputField.tsx
"use client";

import type { RefObject } from "react";

type Accent = "sky" | "emerald";

type Props = {
  value: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  disabled: boolean;
  accent?: Accent;
};

export function InputField({
  value,
  inputRef,
  onChange,
  onKeyDown,
  disabled,
  accent = "sky",
}: Props) {
  const ringClass =
    accent === "emerald"
      ? "focus:ring-emerald-400"
      : "focus:ring-sky-400";

  return (
    <div className="mt-6">
      <label className="block text-sm text-slate-300 mb-2">
        単語を正確に入力して Enter で確定
      </label>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={[
          "w-full rounded-xl bg-slate-900 border border-slate-600 px-4 py-3 text-lg font-mono outline-none focus:ring-2",
          ringClass,
        ].join(" ")}
        placeholder="ここにタイピング..."
        disabled={disabled}
      />

      {disabled && (
        <p className="mt-2 text-xs text-slate-500">
          ※カウントダウンが終わるまで入力はできません
        </p>
      )}
    </div>
  );
}
