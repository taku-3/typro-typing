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
      const message =
        error instanceof Error ? error.message : "不明なエラーです。";

      if (message === "invalid_or_expired_token") {
        setErrorMessage(
          "この再設定リンクは無効か、有効期限が切れています。もう一度やり直してください。",
        );
      } else if (message === "invalid_password") {
        setErrorMessage("パスワードは8〜64文字で入力してください。");
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
      {/* ← JSXはそのままでOK */}
    </main>
  );
}