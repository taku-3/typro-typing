"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { caseLabel, levelLabel, WORD_THEMES, type WordThemeKey } from "@/features/typro/word/words";
import { getAuthToken, getStoredPlayer } from "@/lib/auth-storage";
import { getMatchRoom } from "@/lib/api/match";
import type { MatchRealtimeConnectionStatus, MatchRealtimeMemberState } from "@/features/typro/match/realtime/types";
import type { MatchRoomDetail } from "@/features/typro/match/types";
import { useMatchRoomRealtime } from "@/features/typro/match/realtime/useMatchRoomRealtime";

function connectionStatusLabel(status: MatchRealtimeConnectionStatus): string {
  if (status === "connected") return "接続中";
  if (status === "disconnected") return "切断";
  return "未接続";
}

function memberConnectionLabel(member: MatchRealtimeMemberState): string {
  if (!member.hasJoinedRealtime) {
    return "未接続（未参加）";
  }

  return connectionStatusLabel(member.connectionStatus);
}

function readyLabel(ready: boolean): string {
  return ready ? "READY" : "未準備";
}

export default function MatchRoomPage() {
  const params = useParams<{ roomCode: string }>();
  const roomCode = useMemo(() => (params?.roomCode ?? "").toUpperCase(), [params?.roomCode]);
  const isValidRoomCode = /^[A-Z0-9]{6}$/.test(roomCode);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [detail, setDetail] = useState<MatchRoomDetail | null>(null);

  const authToken = useMemo(() => getAuthToken(), []);
  const storedPlayer = useMemo(() => getStoredPlayer(), []);

  const myPlayerId = useMemo(() => {
    if (!detail) return storedPlayer?.id ?? "";
    if (detail.viewerRole === "host" || detail.viewerRole === "guest") {
      const selfFromRoom = detail.room.players.find((player) => player.role === detail.viewerRole);
      if (selfFromRoom?.playerId) {
        return selfFromRoom.playerId;
      }
    }

    return storedPlayer?.id ?? "";
  }, [detail, storedPlayer?.id]);

  const { state: realtimeState, toggleReady, startMatch, canStart, canSubscribe } = useMatchRoomRealtime({
    authToken,
    detail,
    myPlayerId,
  });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (realtimeState.startStatus !== "starting") {
      return;
    }

    setNow(Date.now());
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 200);

    return () => {
      clearInterval(intervalId);
    };
  }, [realtimeState.startStatus]);

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
  const countdownSec =
    realtimeState.startStatus === "starting" && realtimeState.startedAt
      ? Math.max(0, Math.ceil((realtimeState.startedAt - now) / 1000))
      : null;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">対戦ルーム</h1>
            <p className="text-sm text-slate-300 mt-1">Phase2-B: START同期</p>
          </div>
          <Link
            href="/match"
            className="text-sm text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            ルーム一覧へ戻る
          </Link>
        </header>

        {isValidRoomCode && loading ? <p className="text-sm text-slate-300">読み込み中...</p> : null}
        {!isValidRoomCode ? <p className="text-sm text-rose-300">roomCode が不正です。</p> : null}
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
                <span className="text-slate-400">guest:</span> {guest?.displayName || guest?.playerId || "参加待ち"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3 text-sm">
              <p>
                <span className="text-slate-400">自分のrole:</span> {realtimeState.myRole ?? detail.viewerRole}
              </p>
              <p>
                <span className="text-slate-400">host 接続状態:</span>{" "}
                {memberConnectionLabel(realtimeState.host)}
              </p>
              <p>
                <span className="text-slate-400">host READY:</span> {readyLabel(realtimeState.host.ready)}
              </p>
              <p>
                <span className="text-slate-400">guest 接続状態:</span>{" "}
                {memberConnectionLabel(realtimeState.guest)}
              </p>
              <p>
                <span className="text-slate-400">guest READY:</span> {readyLabel(realtimeState.guest.ready)}
              </p>
              {realtimeState.errorMessage ? (
                <p className="text-rose-300">Realtime: {realtimeState.errorMessage}</p>
              ) : null}
              {realtimeState.startErrorMessage ? (
                <p className="text-rose-300">Start: {realtimeState.startErrorMessage}</p>
              ) : null}
              {!canSubscribe ? (
                <p className="text-amber-300">outsider のためRealtime購読は行いません。</p>
              ) : (
                <p>
                  <span className="text-slate-400">channel:</span> {realtimeState.channelStatus}
                </p>
              )}
            </div>

            {(detail.viewerRole === "host" || detail.viewerRole === "guest") && canSubscribe ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={toggleReady}
                  className="rounded-lg px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
                >
                  {realtimeState.selfReady ? "Ready解除" : "Readyにする"}
                </button>
                {detail.viewerRole === "host" ? (
                  <button
                    type="button"
                    onClick={startMatch}
                    disabled={!canStart}
                    className="rounded-lg px-4 py-2 bg-indigo-600 enabled:hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-300 text-white text-sm disabled:cursor-not-allowed"
                  >
                    対戦開始
                  </button>
                ) : (
                  <p className="self-center text-sm text-slate-300">hostの開始待ち</p>
                )}
              </div>
            ) : null}

            {realtimeState.startStatus === "starting" ? (
              <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-4 text-sm">
                <p className="text-indigo-200 font-semibold">対戦開始まで: {countdownSec ?? 0}</p>
              </div>
            ) : null}
            {realtimeState.startStatus === "started" ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
                <p className="text-emerald-200 font-semibold">START! 次PRでPlayScreenへ接続します。</p>
              </div>
            ) : null}

            <div className="text-sm text-slate-300 space-y-1">
              <p>canJoin: {detail.canJoin ? "true" : "false"}</p>
              <p>isFull: {detail.isFull ? "true" : "false"}</p>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}