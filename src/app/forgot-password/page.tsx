"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { postPublicFunction } from "@/lib/supabase-functions";

type PasswordResetRequestResponse = {
  ok: boolean;
  message: string;
};

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      await postPublicFunction<PasswordResetRequestResponse>(
        "auth-password-reset-request",
        {
          username: username.trim(),
          email: email.trim(),
        },
      );

      setSubmitted(true);
    } catch (error) {
      console.error(error);
      setErrorMessage("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">パスワード再設定</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          登録したユーザー名とメールアドレスを入力してください。
          一致する場合、パスワード再設定用メールを送信します。
        </p>

        {submitted ? (
          <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-slate-700">
            入力された情報が登録内容と一致する場合、
            パスワード再設定用メールを送信しました。
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                ユーザー名
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none ring-0 transition focus:border-sky-500"
                placeholder="TakumiTest"
                autoComplete="username"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                登録時と同じ大文字・小文字で入力してください。
              </p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none ring-0 transition focus:border-sky-500"
                placeholder="example@example.com"
                autoComplete="email"
                required
              />
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "送信中..." : "再設定メールを送る"}
            </button>
          </form>
        )}

        <div className="mt-6 text-sm">
          <Link href="/login" className="text-sky-600 hover:underline">
            ログイン画面へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
