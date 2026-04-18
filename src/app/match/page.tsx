"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { WORD_THEMES, caseLabel, levelLabel, type WordThemeKey } from "@/features/typro/word/words";
import { createMatchRoom, joinMatchRoom } from "@/lib/api/match";
import { getAuthToken } from "@/lib/auth-storage";
import type { MatchCaseMode, MatchLevel } from "@/features/typro/match/types";

export default function MatchPage() {
  const router = useRouter();
  const themeKeys = useMemo(() => Object.keys(WORD_THEMES) as WordThemeKey[], []);

  const [themeId, setThemeId] = useState<WordThemeKey>(themeKeys[0] ?? "english_colors");
  const [level, setLevel] = useState<MatchLevel>("easy");
  const [caseMode, setCaseMode] = useState<MatchCaseMode>("lower");
  const [joinCode, setJoinCode] = useState("");

  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const selectedTheme = WORD_THEMES[themeId];

  async function onCreateRoom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");

    const token = getAuthToken();
    if (!token) {
      setCreateError("ログインが必要です。");
      return;
    }

    setIsCreating(true);
    const res = await createMatchRoom(token, {
      themeId,
      level,
      caseMode,
    });
    setIsCreating(false);

    if (!res.ok) {
      setCreateError(`ルーム作成に失敗しました: ${res.error}`);
      return;
    }

    router.push(`/match/room/${res.room.roomCode}`);
  }

  async function onJoinRoom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJoinError("");

    const token = getAuthToken();
    if (!token) {
      setJoinError("ログインが必要です。");
      return;
    }

    const normalized = joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      setJoinError("roomCode は6桁の英数字大文字で入力してください。");
      return;
    }

    setIsJoining(true);
    const res = await joinMatchRoom(token, { roomCode: normalized });
    setIsJoining(false);

    if (!res.ok) {
      setJoinError(`参加に失敗しました: ${res.error}`);
      return;
    }

    router.push(`/match/room/${res.room.roomCode}`);
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">オンライン対戦（Phase1 / PR1）</h1>
            <p className="text-sm text-slate-300 mt-1">ルーム作成・参加のみ対応（Realtime未対応）</p>
          </div>
          <Link
            href="/"
            className="text-sm text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            タイトルへ戻る
          </Link>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <form
            onSubmit={onCreateRoom}
            className="rounded-2xl border border-slate-700 bg-slate-800 p-5 space-y-4"
          >
            <h2 className="text-lg font-semibold">ホスト: ルーム作成</h2>

            <div>
              <label className="block text-sm text-slate-300 mb-2">テーマ</label>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value as WordThemeKey)}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
              >
                {themeKeys.map((key) => (
                  <option key={key} value={key}>
                    {WORD_THEMES[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">レベル</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as MatchLevel)}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
              >
                {(["easy", "normal", "hard"] as const).map((lv) => (
                  <option key={lv} value={lv}>
                    {levelLabel(lv)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">ケース</label>
              <select
                value={caseMode}
                onChange={(e) => setCaseMode(e.target.value as MatchCaseMode)}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm"
              >
                {(["lower", "title", "upper", "mixed"] as const).map((mode) => (
                  <option
                    key={mode}
                    value={mode}
                    disabled={!selectedTheme?.caseApplicable && mode !== "lower"}
                  >
                    {caseLabel(mode)}
                  </option>
                ))}
              </select>
              {!selectedTheme?.caseApplicable ? (
                <p className="mt-2 text-xs text-amber-300">
                  このテーマは lower 推奨です（単語辞書の設定により）。
                </p>
              ) : null}
            </div>

            <p className="text-sm text-slate-300">制限時間: 60秒（固定）</p>

            {createError ? <p className="text-sm text-rose-300">{createError}</p> : null}

            <button
              type="submit"
              disabled={isCreating}
              className="w-full rounded-xl bg-sky-500 text-white font-semibold py-2.5 disabled:opacity-60"
            >
              {isCreating ? "作成中..." : "ルームを作成"}
            </button>
          </form>

          <form
            onSubmit={onJoinRoom}
            className="rounded-2xl border border-slate-700 bg-slate-800 p-5 space-y-4"
          >
            <h2 className="text-lg font-semibold">ゲスト: ルーム参加</h2>

            <div>
              <label className="block text-sm text-slate-300 mb-2">roomCode</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="例: A1B2C3"
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm tracking-widest uppercase"
              />
            </div>

            {joinError ? <p className="text-sm text-rose-300">{joinError}</p> : null}

            <button
              type="submit"
              disabled={isJoining}
              className="w-full rounded-xl bg-emerald-500 text-white font-semibold py-2.5 disabled:opacity-60"
            >
              {isJoining ? "参加中..." : "ルームに参加"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}