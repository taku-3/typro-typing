"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardLayout, KeyCap } from "./types";
import { JIS_FULL_LAYOUT } from "./layout-jis";

type Props = {
  layout?: KeyboardLayout;
  className?: string;

  /** 単一ハイライト */
  activeCode?: string | null;

  /** 複数ハイライト（Shift同時など） */
  activeCodes?: string[];

  /** 表示ラベルをShift側に切り替える（例：? や ! のとき） */
  shiftOn?: boolean;

  /** 1u のピクセル（デフォルト: 44） */
  unitPx?: number;

  /** Grid の gap（デフォルト: 8） */
  gapPx?: number;
};

function keyText(key: KeyCap, shiftOn?: boolean) {
  if (!shiftOn) return key.label.normal;
  return key.label.shift ?? key.label.normal;
}

export function Keyboard({
  layout = JIS_FULL_LAYOUT,
  className = "",
  activeCode = null,
  activeCodes,
  shiftOn = false,
  unitPx = 44,
  gapPx = 8,
}: Props) {
  const columnsUsed = useMemo(() => {
    const max = layout.keys.reduce((m, k) => {
      const end = k.col + (k.colSpan ?? 1) - 1;
      return Math.max(m, end);
    }, 1);
    // layout.columns は「上限」扱い。実使用列の方が小さければ縮める
    return Math.min(layout.columns, max);
  }, [layout.columns, layout.keys]);

  const gridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${columnsUsed}, ${unitPx}px)`,
      gridAutoRows: `${unitPx}px`,
      gap: `${gapPx}px`,
    }),
    [columnsUsed, unitPx, gapPx]
  );

  const outerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const gridWidth = useMemo(() => {
    // columnsUsed はあなたの実装のままでOK（いまは20になる）
    return columnsUsed * unitPx + (columnsUsed - 1) * gapPx;
  }, [columnsUsed, unitPx, gapPx]);

  useEffect(() => {
    if (!outerRef.current) return;

    const el = outerRef.current;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? gridWidth;
      // 余白ぶん少し引く（見切れ防止）
      const next = Math.max(0.92, Math.min(1, (w - 8) / gridWidth));
      setScale(Number.isFinite(next) ? next : 1);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [gridWidth]);

  const isActiveKey = (id: string) => {
    if (activeCodes && activeCodes.length > 0) return activeCodes.includes(id);
    return activeCode === id;
  };

  return (
    <section className={["w-full", className].join(" ")} aria-label="keyboard">
      <div className="mb-3 text-xs text-slate-400">
        キーボード（{layout.name}）
      </div>

      <div ref={outerRef} className="w-full overflow-hidden">
        <div
          className="origin-top-left mx-auto"
          style={{
            width: gridWidth,
            transform: `scale(${scale})`,
          }}
        >
          {/* 収まるときだけ中央寄せしたいなら mx-auto を付ける */}
          <div className="mx-auto">
            <div className="grid" style={gridStyle}>
              {layout.keys.map((k) => {
                const colSpan = k.colSpan ?? 1;
                const rowSpan = k.rowSpan ?? 1;
                const active = isActiveKey(k.id);

                return (
                  <div
                    key={k.id}
                    className="relative"
                    style={{
                      gridColumnStart: k.col,
                      gridColumnEnd: `span ${colSpan}`,
                      gridRowStart: k.row,
                      gridRowEnd: `span ${rowSpan}`,
                    }}
                    title={k.id}
                  >
                    <div
                      className={[
                        "absolute inset-0 rounded-xl border transition",
                        active
                          ? "border-emerald-400 bg-emerald-500/20 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]"
                          : "border-slate-700 bg-slate-800/60",
                      ].join(" ")}
                    />

                    <div
                      className={[
                        "relative z-10 flex h-full w-full items-center justify-center",
                        "rounded-xl select-none font-semibold",
                        "text-[11px] md:text-xs",
                        active ? "text-emerald-100" : "text-slate-100",
                        "px-1",
                      ].join(" ")}
                    >
                      <div className="flex flex-col items-center leading-tight">
                        <div className="truncate max-w-full">
                          {keyText(k, shiftOn)}
                        </div>
                        {k.label.shift && (
                          <div className="text-[10px] opacity-70">
                            {shiftOn ? k.label.normal : k.label.shift}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
