"use client";

import {
  Keyboard,
  JIS_FULL_LAYOUT,
  charToKeyJis,
} from "@/features/typro/keyboard";
import type { KeyCap } from "./types";

type KeyId = KeyCap["id"];
type Accent = "sky" | "emerald";

type Props = {
  visible?: boolean;
  accent?: Accent;
  nextChar: string | null;
  expectEnter?: boolean;
};

type Finger =
  | "LP"
  | "LR"
  | "LM"
  | "LI"
  | "LT"
  | "RT"
  | "RI"
  | "RM"
  | "RR"
  | "RP";

const fingerLabel: Record<Finger, string> = {
  LP: "左小指",
  LR: "左薬指",
  LM: "左中指",
  LI: "左人差し指",
  LT: "左親指",
  RT: "右親指",
  RI: "右人差し指",
  RM: "右中指",
  RR: "右薬指",
  RP: "右小指",
};

function isLeftFinger(f: Finger) {
  return f.startsWith("L");
}

function keyToFinger(id: KeyId): Finger {
  if (
    id === "Backquote" ||
    id === "Tab" ||
    id === "CapsLock" ||
    id === "ShiftLeft" ||
    id === "ControlLeft" ||
    id === "NonConvert"
  )
    return "LP";

  if (id === "Digit1" || id === "KeyQ" || id === "KeyA" || id === "KeyZ")
    return "LP";
  if (id === "Digit2" || id === "KeyW" || id === "KeyS" || id === "KeyX")
    return "LR";
  if (id === "Digit3" || id === "KeyE" || id === "KeyD" || id === "KeyC")
    return "LM";

  if (
    id === "Digit4" ||
    id === "Digit5" ||
    id === "KeyR" ||
    id === "KeyT" ||
    id === "KeyF" ||
    id === "KeyG" ||
    id === "KeyV" ||
    id === "KeyB"
  )
    return "LI";

  if (
    id === "Digit6" ||
    id === "Digit7" ||
    id === "KeyY" ||
    id === "KeyU" ||
    id === "KeyH" ||
    id === "KeyJ" ||
    id === "KeyN" ||
    id === "KeyM"
  )
    return "RI";

  if (id === "Digit8" || id === "KeyI" || id === "KeyK" || id === "Comma")
    return "RM";
  if (id === "Digit9" || id === "KeyO" || id === "KeyL" || id === "Period")
    return "RR";

  if (
    id === "Digit0" ||
    id === "Minus" ||
    id === "Equal" ||
    id === "IntlYen" ||
    id === "Backspace" ||
    id === "BracketLeft" ||
    id === "BracketRight" ||
    id === "Backslash" ||
    id === "Semicolon" ||
    id === "Quote" ||
    id === "Enter" ||
    id === "Slash" ||
    id === "IntlRo" ||
    id === "ShiftRight" ||
    id === "ControlRight" ||
    id === "Convert" ||
    id === "KanaMode"
  )
    return "RP";

  if (id === "Space") return "LT";
  return "RI";
}

type Digit = "Pinky" | "Ring" | "Middle" | "Index" | "Thumb";

function fingerToDigit(f: Finger): Digit {
  if (f === "LP" || f === "RP") return "Pinky";
  if (f === "LR" || f === "RR") return "Ring";
  if (f === "LM" || f === "RM") return "Middle";
  if (f === "LI" || f === "RI") return "Index";
  return "Thumb";
}

function HandSvg({
  side,
  activeFingers,
}: {
  side: "left" | "right";
  activeFingers: Finger[];
}) {
  const mirror = side === "right";

  const activeDigits = new Set<Digit>();
  for (const f of activeFingers) {
    if (side === "left" && isLeftFinger(f)) activeDigits.add(fingerToDigit(f));
    if (side === "right" && !isLeftFinger(f))
      activeDigits.add(fingerToDigit(f));
  }

  const fill = "rgba(148, 163, 184, 0.32)";
  const stroke = "rgba(148, 163, 184, 0.42)";

  const glowFill = "rgba(16,185,129,0.28)";
  const glowStroke = "rgba(16,185,129,0.75)";

  const fingers = {
  Pinky:  { x: 58,  w: 26, h: 62,  rx: 13 },
  Ring:   { x: 86,  w: 28, h: 94,  rx: 14 },
  Middle: { x: 116, w: 30, h: 102, rx: 15 },
  Index:  { x: 148, w: 28, h: 90,  rx: 14 },
} as const;

  const baseY = 120;
  const sink = 18.5;

  const palmDown = 15;
  const palmShiftX = side === "left" ? -14 : -14;
  const palmTransform = `translate(${palmShiftX} ${palmDown})`;

  return (
    <svg
      viewBox="0 0 220 260"
      className="h-[260px] w-[260px] md:h-80 md:w-100"
      aria-hidden="true"
    >
      <defs>
        <filter
          id={`handGlow-${side}`}
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
        >
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform={mirror ? "translate(220,0) scale(-1,1)" : undefined}>
        {/* 親指 */}
        <g transform="translate(158 158) rotate(180)">
          <rect
            x="-50"
            y="-30"
            width="34"
            height="75"
            rx="18"
            fill={fill}
            stroke={stroke}
            strokeWidth="6"
          />
          {activeDigits.has("Thumb") && (
            <rect
              x="-54"
              y="-24"
              width="42"
              height="100"
              rx="21"
              fill={glowFill}
              stroke={glowStroke}
              strokeWidth="2"
              filter={`url(#handGlow-${side})`}
              className="animate-pulse"
            />
          )}
        </g>

        {/* ✅ 手の甲（下端直線 + 少し上に縮める） */}
        <g transform={palmTransform}>
          <path
            d={`
              M78 ${baseY + 4}
              C84 ${baseY - 1}, 98 ${baseY - 2}, 114 ${baseY - 2}
              C128 ${baseY + 1}, 144 ${baseY + 1}, 158 ${baseY + 2}
              C176 ${baseY - 10}, 188 ${baseY + 10}, 188 ${baseY + 34}

              L188 182
              C188 204, 172 222, 148 230
              C128 236, 104 236, 88 228
              C72 222, 66 210, 66 196

              L66 ${baseY + 46}
              C66 ${baseY + 3}, 70 ${baseY + 10}, 78 ${baseY + 1}
              Z
            `}
            fill={fill}
            stroke={stroke}
            strokeWidth="6"
          />

          {/* 影も浅く（直線底辺の雰囲気に寄せる） */}
          <path
            d={`
              M76 194
              C96 212, 128 218, 160 206
              C146 224, 108 230, 86 220
              C78 214, 74 204, 76 194
              Z
            `}
            fill="rgba(148,163,184,0.10)"
          />
        </g>

        {/* 指 */}
        {(
          [
            ["Pinky", fingers.Pinky],
            ["Ring", fingers.Ring],
            ["Middle", fingers.Middle],
            ["Index", fingers.Index],
          ] as const
        ).map(([name, f]) => {
          const d = name as Exclude<Digit, "Thumb">;
          const y = baseY - f.h;
          const isActive = activeDigits.has(d);

          return (
            <g key={name}>
              <rect
                x={f.x}
                y={y}
                width={f.w}
                height={f.h + sink}
                rx={f.rx}
                fill={fill}
              />
              <rect
                x={f.x}
                y={y}
                width={f.w}
                height={f.h + sink}
                rx={f.rx}
                fill="none"
                stroke={stroke}
                strokeWidth="6"
                opacity={0.85}
              />

              {isActive && (
                <rect
                  x={f.x - 2}
                  y={y - 2}
                  width={f.w + 4}
                  height={f.h + sink + 4}
                  rx={f.rx + 2}
                  fill={glowFill}
                  stroke={glowStroke}
                  strokeWidth="2"
                  filter={`url(#handGlow-${side})`}
                  className="animate-pulse"
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function KeyboardGuide({
  visible = true,
  accent = "sky",
  nextChar,
  expectEnter = false,
}: Props) {
  if (!visible) return null;

  const target = expectEnter
    ? { keyId: "Enter" as KeyId, needsShift: false }
    : nextChar
    ? charToKeyJis(nextChar)
    : null;

  const targetKeyId = (target?.keyId ?? null) as KeyId | null;
  const needsShift = target?.needsShift ?? false;

  const mainFinger: Finger | null = targetKeyId ? keyToFinger(targetKeyId) : null;

  const activeFingers: Finger[] = [];
  if (mainFinger) activeFingers.push(mainFinger);

  if (targetKeyId === "Space") {
    activeFingers.length = 0;
    activeFingers.push("LT", "RT");
  }

  let shiftKeyId: KeyId | null = null;
  if (needsShift && mainFinger) {
    if (isLeftFinger(mainFinger)) {
      activeFingers.push("RP");
      shiftKeyId = "ShiftRight" as KeyId;
    } else {
      activeFingers.push("LP");
      shiftKeyId = "ShiftLeft" as KeyId;
    }
  }

  const activeCodes: string[] = [];
  if (targetKeyId) activeCodes.push(targetKeyId);
  if (shiftKeyId) activeCodes.push(shiftKeyId);

  const border =
    accent === "emerald" ? "border-emerald-400/60" : "border-sky-400/60";

  const fingerText =
    activeFingers.length === 0
      ? null
      : activeFingers.map((f) => fingerLabel[f]).join(" / ");

  return (
    <div className="relative mt-4">
      <div className="pointer-events-none absolute left-0 top-1/2 -translate-x-[95%] -translate-y-1/2 opacity-55">
        <HandSvg side="left" activeFingers={activeFingers} />
      </div>

      <div className="pointer-events-none absolute right-0 top-1/2 translate-x-[95%] -translate-y-1/2 opacity-55">
        <HandSvg side="right" activeFingers={activeFingers} />
      </div>

      <div
        className={["rounded-2xl border bg-slate-900/40 p-4", border].join(" ")}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            <span className="font-semibold">キーガイド（JIS）</span>
            {targetKeyId ? (
              <>
                <span className="mx-2 text-slate-500">/</span>
                <span className="text-slate-200">
                  次：{expectEnter ? "Enter" : nextChar}
                </span>
                {needsShift && (
                  <span className="ml-2 rounded-lg border border-slate-600 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">
                    Shiftも押す
                  </span>
                )}
              </>
            ) : (
              <span className="ml-2 text-slate-500">（プレイ開始で表示）</span>
            )}
          </div>

          <div className="text-xs text-slate-300">
            {fingerText ? (
              <span className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1">
                指：
                <span className="font-semibold text-slate-100">{fingerText}</span>
              </span>
            ) : (
              <span className="text-slate-500">指ガイド</span>
            )}
          </div>
        </div>

        <Keyboard
          layout={JIS_FULL_LAYOUT}
          activeCodes={activeCodes}
          shiftOn={needsShift}
          unitPx={27}
          gapPx={8}
        />
      </div>
    </div>
  );
}
