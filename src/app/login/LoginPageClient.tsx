"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginWithUsernamePassword } from "@/lib/api/auth";
import { saveAuthSession } from "@/lib/auth-storage";

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  const resetDone = searchParams.get("reset") === "done";

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorText("");

    const res = await loginWithUsernamePassword({
      username: username.trim(),
      password,
    });

    setSubmitting(false);

    if (!res.ok || !res.token) {
      setErrorText(res.error ?? "ログインに失敗しました");
      return;
    }

    saveAuthSession({
      token: res.token,
      player: res.player ?? null,
    });

    const redirectTo = searchParams.get("redirect") || "/";
    router.push(redirectTo);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">ログイン</h1>

        {resetDone ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            パスワードを更新しました。新しいパスワードでログインしてください。
          </div>
        ) : null}

        <p className="text-sm text-slate-300 text-center mb-6">
          ユーザー名とパスワードでログイン
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="testuser"
              autoComplete="username"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {errorText ? (
            <p className="text-sm text-rose-300">{errorText}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !username.trim() || !password}
            className="w-full rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-900 font-semibold py-3 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "ログイン中..." : "ログイン"}
          </button>

          <div className="mt-3 text-right text-sm">
            <Link
              href="/forgot-password"
              className="text-sky-600 hover:underline"
            >
              パスワードを忘れた方
            </Link>
          </div>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link
            href="/"
            className="text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            タイトルへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}