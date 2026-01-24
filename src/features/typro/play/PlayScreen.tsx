// src/features/typro/play/PlayScreen.tsx
"use client";

import type { RefObject } from "react";
import { PlayTimer } from "./PlayTimer";
import { WordDisplay } from "./WordDisplay";
import { InputField } from "./InputField";
import { KeyboardGuide } from "@/features/typro/keyboard/KeyboardGuide";

type Accent = "sky" | "emerald";

export type JudgeKind = "good" | "great" | "excellent";

export type Judge = {
  kind: JudgeKind;
  text: string;
  id: number; // アニメ再始動用
};

type Props = {
  accent?: Accent;

  isPlaying: boolean;
  isCountdowning: boolean;

  timeLeft: number;
  totalSeconds: number;

  themeLabel: string;
  levelLabel: string;
  caseLabel?: string;
  isWeakPractice: boolean;

  displayWord: string;
  reading?: string;
  hint?: string;

  input: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;

  onStart: () => void;
  canPlay: boolean;
  hasFinished: boolean;

  // ✅ 次の入力ガイド
  nextChar: string | null;
  expectEnter: boolean;

  showKeyboard?: boolean;

  // ✅ 追加：判定テキスト（GOOD/GREAT/EXCELLENT）
  judge?: Judge | null;
};

function judgeClass(kind: JudgeKind) {
  if (kind === "excellent")
    return "text-amber-300 drop-shadow-[0_6px_18px_rgba(251,191,36,0.35)]";
  if (kind === "great")
    return "text-sky-300 drop-shadow-[0_6px_18px_rgba(56,189,248,0.35)]";
  return "text-emerald-300 drop-shadow-[0_6px_18px_rgba(16,185,129,0.35)]";
}

export function PlayScreen({
  accent = "sky",
  isPlaying,
  isCountdowning,
  timeLeft,
  totalSeconds,
  themeLabel,
  levelLabel,
  caseLabel,
  isWeakPractice,
  displayWord,
  reading,
  hint,
  input,
  inputRef,
  onChange,
  onKeyDown,
  onStart,
  canPlay,
  hasFinished,
  nextChar,
  expectEnter,
  showKeyboard = true,
  judge = null,
}: Props) {
  const accentBtn =
    accent === "emerald"
      ? "bg-emerald-400 hover:bg-emerald-300"
      : "bg-sky-400 hover:bg-sky-300";

  return (
    <section className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
      {/* header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-xs text-slate-300">
          <span>
            ジャンル：{themeLabel}
            {isWeakPractice && (
              <span className="ml-2 text-emerald-200">（弱点）</span>
            )}
            {" / "}レベル：{levelLabel}
            {caseLabel ? (
              <>
                {" / "}ケース：{caseLabel}
              </>
            ) : null}
          </span>
        </div>

        <PlayTimer
          timeLeftSec={timeLeft}
          totalTimeSec={totalSeconds}
          accent={accent}
        />
      </div>

      {judge && (
        <div
          key={judge.id}
          className={[
            "pointer-events-none absolute left-1/2 -top-4 -translate-x-1/2 z-20",
            "px-4 py-2 rounded-full",
            "bg-slate-900/70 border border-slate-500/40",
            "font-extrabold tracking-wide",
            "text-3xl md:text-4xl",
            judgeClass(judge.kind),
            "typro-judge-pop",
            judge.kind === "excellent" ? "typro-judge-sparkle" : "",
          ].join(" ")}
          aria-label={`judge-${judge.kind}`}
        >
          {judge.text}
        </div>
      )}
      {/* word + judge overlay */}
      <div className="relative">
        <WordDisplay word={displayWord} reading={reading} hint={hint} />
      </div>

      {/* input */}
      <InputField
        value={input}
        inputRef={inputRef}
        onChange={onChange}
        onKeyDown={onKeyDown}
        disabled={!isPlaying}
        accent={accent}
      />

      {/* controls */}
      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={onStart}
          className={[
            "px-4 py-2 rounded-xl text-slate-900 font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition",
            accentBtn,
          ].join(" ")}
          disabled={isPlaying || isCountdowning || !canPlay}
        >
          {hasFinished ? "もう一度プレイ" : "プレイ開始"}
        </button>
      </div>

      {/* keyboard + hand guide */}
      {showKeyboard && (
        <KeyboardGuide
          visible={isPlaying || hasFinished}
          accent={accent}
          nextChar={nextChar}
          expectEnter={expectEnter}
        />
      )}

      {/* local animation css */}
      <style jsx>{`
        @keyframes judgePop {
          0% {
            opacity: 0;
            transform: translate(-50%, 12px) scale(0.86);
            filter: blur(0.2px);
          }
          18% {
            opacity: 1;
            transform: translate(-50%, 0px) scale(1.08);
          }
          55% {
            opacity: 1;
            transform: translate(-50%, -8px) scale(1.02);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -22px) scale(0.98);
          }
        }
        .typro-judge-pop {
          animation: judgePop 720ms ease-out both;
        }
        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0.6) rotate(0deg);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(22px, -22px) scale(1.25) rotate(25deg);
          }
        }

        .typro-judge-sparkle::before,
        .typro-judge-sparkle::after {
          content: "✦";
          position: absolute;
          top: -10px;
          right: 14px;
          font-size: 18px;
          opacity: 0;
          animation: sparkle 720ms ease-out both;
        }

        .typro-judge-sparkle::after {
          content: "✧";
          top: 18px;
          right: -4px;
          font-size: 14px;
          animation-delay: 90ms;
        }
      `}</style>
    </section>
  );
}
