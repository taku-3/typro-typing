"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getAuthToken,
  saveAuthSession,
  getStoredPlayer,
  clearAuthSession,
} from "@/lib/auth-storage";
import {
  getMyPage,
  updateMyProfile,
  type MyPageProfile,
  type RecentPlay,
} from "@/lib/api/mypage";
import {
  WORD_THEMES,
  levelLabel,
  caseLabel,
  type WordThemeKey,
  type WordLevel,
  type CaseMode,
} from "@/features/typro/word/words";

import {
  changePrimaryEmail,
  changePassword,
  deleteAccount,
  sendVerifyEmail,
} from "@/lib/api/account";

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [profile, setProfile] = useState<MyPageProfile | null>(null);
  const [recentPlays, setRecentPlays] = useState<RecentPlay[]>([]);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaveMessage, setEmailSaveMessage] = useState("");
  const [emailSaveError, setEmailSaveError] = useState("");
  const [sendingVerifyEmail, setSendingVerifyEmail] = useState(false);
  const [verifyEmailMessage, setVerifyEmailMessage] = useState("");
  const [verifyEmailError, setVerifyEmailError] = useState("");
  const [passwordCurrentInput, setPasswordCurrentInput] = useState("");
  const [passwordNewInput, setPasswordNewInput] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaveMessage, setPasswordSaveMessage] = useState("");
  const [passwordSaveError, setPasswordSaveError] = useState("");
  const [deletePasswordInput, setDeletePasswordInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountMessage, setDeleteAccountMessage] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        setErrorText("ログイン情報が見つかりません。再ログインしてください。");
        return;
      }

      const res = await getMyPage(token);
      if (cancelled) return;

      setLoading(false);

      if (!res.ok || !res.profile) {
        if (res.error === "invalid_token") {
          setErrorText("ログイン状態が切れています。再ログインしてください。");
        } else {
          setErrorText(res.error ?? "マイページ情報の取得に失敗しました。");
        }
        return;
      }

      setProfile(res.profile);
      setRecentPlays(res.recent_plays ?? []);
      setDisplayNameInput(res.profile.display_name ?? "");
      setEmailInput(res.profile.email ?? "");
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveDisplayName = async () => {
    const token = getAuthToken();
    if (!token || !profile) {
      setSaveError("ログイン情報を確認できませんでした。");
      return;
    }

    setSavingDisplayName(true);
    setSaveError("");
    setSaveMessage("");

    const res = await updateMyProfile(token, {
      displayName: displayNameInput,
    });

    setSavingDisplayName(false);

    if (!res.ok || !res.profile) {
      setSaveError(res.error ?? "表示名の更新に失敗しました。");
      return;
    }

    const nextProfile: MyPageProfile = {
      ...profile,
      display_name: res.profile.display_name,
      icon_url: res.profile.icon_url,
    };

    setProfile(nextProfile);
    setDisplayNameInput(res.profile.display_name);
    setSaveMessage("表示名を更新しました。");

    // 右上表示用の localStorage も同期
    const storedPlayer = getStoredPlayer();
    const tokenNow = getAuthToken();

    if (tokenNow) {
      saveAuthSession({
        token: tokenNow,
        player: storedPlayer
          ? {
              ...storedPlayer,
              displayName: res.profile.display_name,
              iconUrl: res.profile.icon_url,
            }
          : {
              id: nextProfile.player_id,
              displayName: res.profile.display_name,
              iconUrl: res.profile.icon_url,
            },
      });
    }
  };

  const handleChangeEmail = async () => {
    const token = getAuthToken();
    if (!token || !profile) {
      setEmailSaveError("ログイン情報を確認できませんでした。");
      return;
    }

    const normalizedEmail = emailInput.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailSaveError("新しいメールアドレスを入力してください。");
      return;
    }

    if (!currentPasswordInput) {
      setEmailSaveError("現在のパスワードを入力してください。");
      return;
    }

    if ((profile.email ?? "").trim().toLowerCase() === normalizedEmail) {
      setEmailSaveError("現在と同じメールアドレスです。");
      return;
    }

    setSavingEmail(true);
    setEmailSaveError("");
    setEmailSaveMessage("");

    const res = await changePrimaryEmail(token, {
      newEmail: normalizedEmail,
      currentPassword: currentPasswordInput,
    });

    setSavingEmail(false);

    if (!res.ok || !res.email) {
      setEmailSaveError(res.error ?? "メールアドレスの変更に失敗しました。");
      return;
    }

    setProfile({
      ...profile,
      email: res.email,
      email_verified: false,
    });

    setEmailInput(res.email);
    setCurrentPasswordInput("");
    setEmailSaveMessage(
      res.is_new
        ? "メールアドレスを登録しました。認証メールを送信して認証を完了してください。"
        : "メールアドレスを変更しました。新しいメールアドレスで再認証してください。",
    );
  };

  const handleSendVerifyEmail = async () => {
    const token = getAuthToken();
    if (!token || !profile) {
      setVerifyEmailError("ログイン情報を確認できませんでした。");
      return;
    }

    if (!profile.email) {
      setVerifyEmailError("メールアドレスが登録されていません。");
      return;
    }

    if (profile.email_verified) {
      setVerifyEmailMessage("このメールアドレスはすでに認証済みです。");
      setVerifyEmailError("");
      return;
    }

    setSendingVerifyEmail(true);
    setVerifyEmailError("");
    setVerifyEmailMessage("");

    const res = await sendVerifyEmail(token);

    setSendingVerifyEmail(false);

    if (!res.ok) {
      switch (res.error) {
        case "missing_authorization":
        case "invalid_token":
          setVerifyEmailError(
            "ログイン状態が切れています。再ログインしてください。",
          );
          return;
        case "primary_email_not_found":
          setVerifyEmailError("認証対象のメールアドレスが見つかりません。");
          return;
        default:
          setVerifyEmailError(res.error ?? "認証メールの送信に失敗しました。");
          return;
      }
    }

    if (res.already_verified) {
      setVerifyEmailMessage("このメールアドレスはすでに認証済みです。");
      setVerifyEmailError("");
      setProfile({
        ...profile,
        email_verified: true,
      });
      return;
    }

    setVerifyEmailMessage("認証メールを送信しました。受信箱をご確認ください。");
    setVerifyEmailError("");
  };

  const handleChangePassword = async () => {
    const token = getAuthToken();
    if (!token || !profile) {
      setPasswordSaveError("ログイン情報を確認できませんでした。");
      return;
    }

    if (!passwordCurrentInput.trim()) {
      setPasswordSaveError("現在のパスワードを入力してください。");
      return;
    }

    if (!passwordNewInput.trim()) {
      setPasswordSaveError("新しいパスワードを入力してください。");
      return;
    }

    if (passwordCurrentInput === passwordNewInput) {
      setPasswordSaveError("新しいパスワードは現在のものと別にしてください。");
      return;
    }

    setSavingPassword(true);
    setPasswordSaveError("");
    setPasswordSaveMessage("");

    const res = await changePassword(token, {
      currentPassword: passwordCurrentInput,
      newPassword: passwordNewInput,
    });

    setSavingPassword(false);

    if (!res.ok) {
      switch (res.error) {
        case "current_password_invalid":
          setPasswordSaveError("現在のパスワードが正しくありません。");
          return;
        case "new_password_required":
          setPasswordSaveError("新しいパスワードを入力してください。");
          return;
        case "new_password_too_short":
          setPasswordSaveError(
            "新しいパスワードは8文字以上で入力してください。",
          );
          return;
        case "new_password_too_long":
          setPasswordSaveError("新しいパスワードが長すぎます。");
          return;
        case "new_password_same_as_current":
          setPasswordSaveError(
            "新しいパスワードは現在のものと別にしてください。",
          );
          return;
        case "missing_authorization_header":
        case "invalid_token":
          setPasswordSaveError(
            "ログイン状態が切れています。再ログインしてください。",
          );
          return;
        default:
          setPasswordSaveError(res.error ?? "パスワードの変更に失敗しました。");
          return;
      }
    }

    setPasswordCurrentInput("");
    setPasswordNewInput("");
    setPasswordSaveMessage("パスワードを変更しました。");
  };

  const handleDeleteAccount = async () => {
    const token = getAuthToken();
    if (!token || !profile) {
      setDeleteAccountError("ログイン情報を確認できませんでした。");
      return;
    }

    if (!deletePasswordInput.trim()) {
      setDeleteAccountError("現在のパスワードを入力してください。");
      return;
    }

    const confirmed = window.confirm(
      "アカウントを削除すると、プロフィール・メールアドレス・スコアなどの関連データが削除されます。本当に削除しますか？",
    );

    if (!confirmed) {
      return;
    }

    setDeletingAccount(true);
    setDeleteAccountError("");
    setDeleteAccountMessage("");

    const res = await deleteAccount(token, {
      currentPassword: deletePasswordInput,
    });

    setDeletingAccount(false);

    if (!res.ok) {
      switch (res.error) {
        case "current_password_required":
          setDeleteAccountError("現在のパスワードを入力してください。");
          return;
        case "current_password_invalid":
          setDeleteAccountError("現在のパスワードが正しくありません。");
          return;
        case "missing_authorization_header":
        case "invalid_token":
          setDeleteAccountError(
            "ログイン状態が切れています。再ログインしてください。",
          );
          return;
        default:
          setDeleteAccountError(res.error ?? "アカウント削除に失敗しました。");
          return;
      }
    }

    setDeleteAccountMessage("アカウントを削除しました。");
    setDeletePasswordInput("");

    clearAuthSession();

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">マイページ</h1>
            <p className="text-sm text-slate-300 mt-1">
              アカウント情報と最近のプレイ記録
            </p>
          </div>

          <Link
            href="/"
            className="text-sm text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            タイトルへ戻る
          </Link>
        </header>

        {loading ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <p className="text-sm text-slate-300">読み込み中...</p>
          </section>
        ) : errorText ? (
          <section className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6">
            <p className="text-sm text-rose-200">{errorText}</p>
            <div className="mt-4">
              <Link
                href="/login"
                className="inline-block rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-300 transition"
              >
                ログインへ
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">プロフィール</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-4">
                  <p className="text-xs text-slate-400 mb-1">ユーザーネーム</p>
                  <p className="text-base font-semibold">
                    {profile?.username || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-700 p-4">
                  <p className="text-xs text-slate-400 mb-2">表示名</p>

                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-600 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                      placeholder="ランキングに表示される名前"
                      disabled={savingDisplayName}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleSaveDisplayName}
                        disabled={savingDisplayName || !displayNameInput.trim()}
                        className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingDisplayName ? "保存中..." : "表示名を保存"}
                      </button>

                      {saveMessage ? (
                        <span className="text-xs text-emerald-300">
                          {saveMessage}
                        </span>
                      ) : null}

                      {saveError ? (
                        <span className="text-xs text-rose-300">
                          {saveError}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 md:col-span-2">
                  <p className="text-xs text-slate-400 mb-2">メールアドレス</p>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <p className="text-base font-semibold">
                      {profile?.email || "メール未登録"}
                    </p>
                    {profile?.email ? (
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          profile.email_verified
                            ? "bg-emerald-400 text-slate-900"
                            : "bg-amber-400 text-slate-900",
                        ].join(" ")}
                      >
                        {profile.email_verified ? "認証済み" : "未認証"}
                      </span>
                    ) : null}
                  </div>

                  {profile?.email && !profile.email_verified ? (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleSendVerifyEmail}
                        disabled={sendingVerifyEmail}
                        className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {sendingVerifyEmail
                          ? "送信中..."
                          : "認証メールを再送する"}
                      </button>
                      {profile?.email && !profile.email_verified ? (
                        <p className="mt-2 text-xs text-amber-200">
                          メールアドレスを変更した場合は、再度メール認証が必要です。
                        </p>
                      ) : null}

                      {verifyEmailMessage ? (
                        <span className="text-xs text-emerald-300">
                          {verifyEmailMessage}
                        </span>
                      ) : null}

                      {verifyEmailError ? (
                        <span className="text-xs text-rose-300">
                          {verifyEmailError}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-400">
                        新しいメールアドレス
                      </label>
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-600 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="example@example.com"
                        autoComplete="email"
                        disabled={savingEmail}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-400">
                        現在のパスワード
                      </label>
                      <input
                        type="password"
                        value={currentPasswordInput}
                        onChange={(e) =>
                          setCurrentPasswordInput(e.target.value)
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-600 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="現在のパスワード"
                        autoComplete="current-password"
                        disabled={savingEmail}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleChangeEmail}
                      disabled={
                        savingEmail ||
                        !emailInput.trim() ||
                        !currentPasswordInput.trim()
                      }
                      className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingEmail ? "変更中..." : "メールアドレスを変更"}
                    </button>

                    {emailSaveMessage ? (
                      <span className="text-xs text-emerald-300">
                        {emailSaveMessage}
                      </span>
                    ) : null}

                    {emailSaveError ? (
                      <span className="text-xs text-rose-300">
                        {emailSaveError}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    セキュリティのため、変更時は現在のパスワード入力が必要です。
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-4">
                  <p className="text-xs text-slate-400 mb-2">パスワード変更</p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-400">
                        現在のパスワード
                      </label>
                      <input
                        type="password"
                        value={passwordCurrentInput}
                        onChange={(e) =>
                          setPasswordCurrentInput(e.target.value)
                        }
                        className="w-full rounded-xl bg-slate-950 border border-slate-600 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="現在のパスワード"
                        autoComplete="current-password"
                        disabled={savingPassword}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-slate-400">
                        新しいパスワード
                      </label>
                      <input
                        type="password"
                        value={passwordNewInput}
                        onChange={(e) => setPasswordNewInput(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-600 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="新しいパスワード"
                        autoComplete="new-password"
                        disabled={savingPassword}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleChangePassword}
                      disabled={
                        savingPassword ||
                        !passwordCurrentInput.trim() ||
                        !passwordNewInput.trim()
                      }
                      className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-sky-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingPassword ? "変更中..." : "パスワードを変更"}
                    </button>

                    {passwordSaveMessage ? (
                      <span className="text-xs text-emerald-300">
                        {passwordSaveMessage}
                      </span>
                    ) : null}

                    {passwordSaveError ? (
                      <span className="text-xs text-rose-300">
                        {passwordSaveError}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    セキュリティのため、現在のパスワード確認が必要です。
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
                    <p className="text-xs text-rose-200 mb-2">アカウント削除</p>

                    <p className="text-xs text-rose-100/80 mb-3 leading-6">
                      アカウントを削除すると、プロフィール、メールアドレス、スコアなどの関連データが削除されます。
                      この操作は元に戻せません。
                    </p>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-rose-100/80">
                        現在のパスワード
                      </label>
                      <input
                        type="password"
                        value={deletePasswordInput}
                        onChange={(e) => setDeletePasswordInput(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-rose-300/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-300"
                        placeholder="現在のパスワード"
                        autoComplete="current-password"
                        disabled={deletingAccount}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={
                          deletingAccount || !deletePasswordInput.trim()
                        }
                        className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {deletingAccount ? "削除中..." : "アカウントを削除する"}
                      </button>

                      {deleteAccountMessage ? (
                        <span className="text-xs text-emerald-300">
                          {deleteAccountMessage}
                        </span>
                      ) : null}

                      {deleteAccountError ? (
                        <span className="text-xs text-rose-200">
                          {deleteAccountError}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="text-lg font-semibold mb-4">直近のプレイ記録</h2>

              {recentPlays.length === 0 ? (
                <p className="text-sm text-slate-400">
                  まだプレイ記録がありません。
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-300">
                        <th className="text-left py-3 pr-3">テーマ</th>
                        <th className="text-left py-3 pr-3">レベル</th>
                        <th className="text-left py-3 pr-3">ケース</th>
                        <th className="text-right py-3 pr-3">秒数</th>
                        <th className="text-right py-3 pr-3">スコア</th>
                        <th className="text-right py-3 pr-3">精度</th>
                        <th className="text-right py-3 pr-3">速度</th>
                        <th className="text-left py-3">日時</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPlays.map((play) => {
                        const themeKey = play.theme_id as WordThemeKey;
                        const themeLabel =
                          WORD_THEMES[themeKey]?.label ?? play.theme_id;

                        return (
                          <tr
                            key={`${play.ended_at}-${play.score}-${play.theme_id}`}
                            className="border-b border-slate-800"
                          >
                            <td className="py-3 pr-3">{themeLabel}</td>
                            <td className="py-3 pr-3">
                              {levelLabel(play.level as WordLevel)}
                            </td>
                            <td className="py-3 pr-3">
                              {caseLabel(play.case_mode as CaseMode)}
                            </td>
                            <td className="py-3 pr-3 text-right">
                              {play.duration_sec}
                            </td>
                            <td className="py-3 pr-3 text-right font-mono">
                              {play.score}
                            </td>
                            <td className="py-3 pr-3 text-right">
                              {play.accuracy}%
                            </td>
                            <td className="py-3 pr-3 text-right">
                              {play.speed_cps.toFixed(2)}
                            </td>
                            <td className="py-3 text-slate-300">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>
                                  {new Date(play.ended_at).toLocaleString(
                                    "ja-JP",
                                  )}
                                </span>
                                {play.rank_status === "needs_review" ? (
                                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                                    確認中
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
