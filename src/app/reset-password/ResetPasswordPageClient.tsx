"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postPublicFunction } from "@/lib/supabase-functions";

type PasswordResetConfirmResponse = {
  ok: boolean;
};

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!token) {
      setErrorMessage("再設定トークンが見つかりません。");
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 64) {
      setErrorMessage("パスワードは8〜64文字で入力してください。");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("確認用パスワードが一致しません。");
      return;
    }

    setSubmitting(true);

    try {
      await postPublicFunction<PasswordResetConfirmResponse>(
        "auth-password-reset-confirm",
        {
          token,
          new_password: newPassword,
        },
      );

      setSuccess(true);

      window.setTimeout(() => {
        router.push("/login?reset=done");
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";

      if (message === "invalid_or_expired_token") {
        setErrorMessage(
          "この再設定リンクは無効か、有効期限が切れています。もう一度やり直してください。",
        );
      } else if (message === "invalid_password") {
        setErrorMessage("パスワードは8〜64文字で入力してください。");
      } else if (message === "same_password_not_allowed") {
        setErrorMessage("現在と同じパスワードは使用できません。");
      } else {
        setErrorMessage(
          "パスワードの再設定に失敗しました。時間をおいて再度お試しください。",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          新しいパスワードを設定
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          メールに記載されたリンクからアクセスしている場合のみ、再設定できます。
        </p>

        {success ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
            パスワードを更新しました。ログイン画面へ移動します。
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                新しいパスワード
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none ring-0 transition focus:border-sky-500"
                placeholder="8〜64文字"
                autoComplete="new-password"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1 block text-sm font-medium text-slate-800"
              >
                新しいパスワード（確認）
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none ring-0 transition focus:border-sky-500"
                placeholder="もう一度入力"
                autoComplete="new-password"
                required
                disabled={submitting}
              />
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                submitting || !token || !newPassword || !confirmPassword
              }
              className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "更新中..." : "パスワードを更新する"}
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
