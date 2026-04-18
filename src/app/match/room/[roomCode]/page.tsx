
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { caseLabel, levelLabel, WORD_THEMES, type WordThemeKey } from "@/features/typro/word/words";
import { getAuthToken } from "@/lib/auth-storage";
import { getMatchRoom } from "@/lib/api/match";
import type { MatchRoomDetail } from "@/features/typro/match/types";

export default function MatchRoomPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = useMemo(() => (params?.roomCode ?? "").toUpperCase(), [params?.roomCode]);
  const isValidRoomCode = /^[A-Z0-9]{6}$/.test(roomCode);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [detail, setDetail] = useState<MatchRoomDetail | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErrorText("");

      const token = getAuthToken();
      if (!token) {
        if (!cancelled) {
          setLoading(false);
          setErrorText("ログインが必要です。");
        }
        return;
      }

      const res = await getMatchRoom(token, { roomCode });
      if (cancelled) return;

      setLoading(false);
      if (!res.ok) {
        setDetail(null);
        setErrorText(`ルーム情報の取得に失敗しました: ${res.error}`);
        return;
      }

      setDetail({
        room: res.room,
        viewerRole: res.viewerRole,
        canJoin: res.canJoin,
        isFull: res.isFull,
      });
    }

    if (!isValidRoomCode) {
      return;
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [isValidRoomCode, roomCode]);

  const host = detail?.room.players.find((p) => p.role === "host") ?? null;
  const guest = detail?.room.players.find((p) => p.role === "guest") ?? null;
  const themeLabel = detail
    ? WORD_THEMES[detail.room.settings.themeId as WordThemeKey]?.label ?? detail.room.settings.themeId
    : "-";

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">対戦ルーム</h1>
            <p className="text-sm text-slate-300 mt-1">PR1: 参加情報表示のみ（Realtime未対応）</p>
          </div>
          <Link
            href="/match"
            className="text-sm text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            ルーム一覧へ戻る
          </Link>
        </header>

        {isValidRoomCode && loading ? <p className="text-sm text-slate-300">読み込み中...</p> : null}
        {!isValidRoomCode ? (
          <p className="text-sm text-rose-300">roomCode が不正です。</p>
        ) : null}
        {!loading && errorText ? <p className="text-sm text-rose-300">{errorText}</p> : null}

        {isValidRoomCode && !loading && !errorText && detail ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5 space-y-5">
            <div>
              <p className="text-xs text-slate-400">roomCode</p>
              <p className="text-2xl font-bold tracking-widest">{detail.room.roomCode}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <p>
                <span className="text-slate-400">テーマ:</span> {themeLabel}
              </p>
              <p>
                <span className="text-slate-400">レベル:</span> {levelLabel(detail.room.settings.level)}
              </p>
              <p>
                <span className="text-slate-400">ケース:</span> {caseLabel(detail.room.settings.caseMode)}
              </p>
              <p>
                <span className="text-slate-400">制限時間:</span> {detail.room.settings.durationSec}秒（固定）
              </p>
              <p>
                <span className="text-slate-400">状態:</span> {detail.room.status}
              </p>
              <p>
                <span className="text-slate-400">あなたのロール:</span> {detail.viewerRole}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-2 text-sm">
              <p>
                <span className="text-slate-400">host:</span> {host?.displayName || host?.playerId || "-"}
              </p>
              <p>
                <span className="text-slate-400">guest:</span>{" "}
                {guest?.displayName || guest?.playerId || "参加待ち"}
              </p>
            </div>

            <div className="text-sm text-slate-300 space-y-1">
              <p>canJoin: {detail.canJoin ? "true" : "false"}</p>
              <p>isFull: {detail.isFull ? "true" : "false"}</p>
              <p>PR1 では waiting 表示のみ対応しています。</p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}