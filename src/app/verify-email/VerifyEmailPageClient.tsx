"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { postPublicFunction } from "@/lib/supabase-functions";

type VerifyEmailResponse = {
  ok: boolean;
  already_verified?: boolean;
  message?: string;
};

type Status = "loading" | "success" | "already_verified" | "error";

export default function VerifyEmailPageClient() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("メール認証を確認しています...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("認証トークンが見つかりません。");
        return;
      }

      try {
        const res = await postPublicFunction<VerifyEmailResponse>(
          "auth-email-verify-confirm",
          { token },
        );

        if (cancelled) return;

        if (res.already_verified) {
          setStatus("already_verified");
          setMessage("このメールアドレスはすでに認証済みです。");
          return;
        }

        setStatus("success");
        setMessage("メール認証が完了しました。");
      } catch (error) {
        if (cancelled) return;

        const code = error instanceof Error ? error.message : "unknown_error";

        if (code === "invalid_or_expired_token") {
          setStatus("error");
          setMessage(
            "この認証リンクは無効か、有効期限が切れています。認証メールを再送してください。",
          );
        } else {
          setStatus("error");
          setMessage(
            "メール認証に失敗しました。時間をおいて再度お試しください。",
          );
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">メール認証</h1>

        <div
          className={[
            "mt-6 rounded-xl p-4 text-sm leading-6",
            status === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : status === "already_verified"
                ? "border border-sky-200 bg-sky-50 text-sky-700"
                : status === "error"
                  ? "border border-rose-200 bg-rose-50 text-rose-700"
                  : "border border-slate-200 bg-slate-50 text-slate-700",
          ].join(" ")}
        >
          {message}
        </div>

        {status === "success" ? (
          <p className="mt-4 text-sm leading-6 text-slate-600">
            認証状態はマイページで確認できます。ログイン中の場合は、そのままマイページへ戻ってください。
          </p>
        ) : null}

        <div className="mt-6 text-sm space-y-3">
          {status === "success" ? (
            <div>
              <Link
                href="/mypage"
                className="inline-block rounded-xl bg-sky-500 px-4 py-2 font-semibold text-white hover:bg-sky-600 transition"
              >
                マイページで確認する
              </Link>
            </div>
          ) : null}

          <div>
            <Link href="/login" className="text-sky-600 hover:underline">
              ログイン画面へ
            </Link>
          </div>

          <div>
            <Link href="/mypage" className="text-sky-600 hover:underline">
              マイページへ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
