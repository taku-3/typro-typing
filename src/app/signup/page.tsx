"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { signupWithUsernamePassword } from "@/lib/api/auth";

function currentYear() {
  return new Date().getFullYear();
}

function isAdultByBirthYear(birthYear: string) {
  if (!birthYear) return false;
  const yearNum = Number(birthYear);
  if (!Number.isFinite(yearNum)) return false;
  return currentYear() - yearNum >= 18;
}

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [email, setEmail] = useState("");
  const [parentalConsent, setParentalConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  const years = useMemo(() => {
    const y = currentYear();
    const arr: number[] = [];
    for (let i = y; i >= 2000; i--) arr.push(i);
    return arr;
  }, []);

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const isAdult = isAdultByBirthYear(birthYear);
  const needsParentalConsent = !isAdult;

  const canSubmit =
    username.trim().length > 0 &&
    password.length > 0 &&
    (needsParentalConsent ? parentalConsent : true) &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorText("");
    setSuccessText("");

    const res = await signupWithUsernamePassword({
      username: username.trim(),
      password,
      displayName: displayName.trim() || undefined,
      birthYear: birthYear ? Number(birthYear) : undefined,
      birthMonth: birthMonth ? Number(birthMonth) : undefined,
      parentalConsent: needsParentalConsent ? parentalConsent : false,
      email: email.trim() || undefined,
    });

    setSubmitting(false);

    if (!res.ok) {
      if (res.error === "username_already_taken") {
        setErrorText("このユーザー名は既に使われています");
        return;
      }

      setErrorText(res.error ?? "新規登録に失敗しました");
      return;
    }

    setSuccessText("新規登録が完了しました。ログイン画面へ移動します。");

    setTimeout(() => {
      router.push("/login");
    }, 800);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">新規登録</h1>
        <p className="text-sm text-slate-300 text-center mb-6">
          ランキング参加や記録保存のためのアカウントを作成します
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="4〜20文字（英数字・_）"
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
              placeholder="8〜64文字"
              autoComplete="new-password"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">表示名</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="ランキングに表示される名前"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-300 mb-2">生年</label>
              <select
                value={birthYear}
                onChange={(e) => {
                  setBirthYear(e.target.value);
                  setParentalConsent(false);
                }}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                disabled={submitting}
              >
                <option value="">未選択</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">生月</label>
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
                disabled={submitting}
              >
                <option value="">未選択</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              メールアドレス（任意）
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-600 px-4 py-3 outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="将来のパスワード再設定に利用予定"
              autoComplete="email"
              disabled={submitting}
            />
            <p className="mt-2 text-xs text-slate-400">
              ※現時点では任意です。今後、パスワード再設定などに使う予定です。
            </p>
          </div>

          {needsParentalConsent ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={parentalConsent}
                  onChange={(e) => setParentalConsent(e.target.checked)}
                  className="mt-1"
                  disabled={submitting}
                />
                <span className="text-sm text-slate-200 leading-relaxed">
                  保護者の同意を得たうえで登録します
                </span>
              </label>
              <p className="mt-2 text-xs text-slate-300">
                ※18歳未満の方は保護者同意が必要です
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm text-emerald-200">
                18歳以上のため、保護者同意チェックは不要です。
              </p>
            </div>
          )}

          {errorText ? (
            <p className="text-sm text-rose-300">{errorText}</p>
          ) : null}

          {successText ? (
            <p className="text-sm text-emerald-300">{successText}</p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold py-3 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "登録中..." : "新規登録する"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link
            href="/login"
            className="text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            すでに登録済みの方はこちら
          </Link>

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
