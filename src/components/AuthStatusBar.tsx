"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AUTH_CHANGED_EVENT,
  clearAuthSession,
  getStoredPlayer,
  isLoggedIn,
  type StoredPlayer,
} from "@/lib/auth-storage";

export function AuthStatusBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [hydrated, setHydrated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [player, setPlayer] = useState<StoredPlayer | null>(null);

  useEffect(() => {
    const sync = () => {
      setLoggedIn(isLoggedIn());
      setPlayer(getStoredPlayer());
      setHydrated(true);
    };

    sync();

    const onStorage = () => sync();
    const onAuthChanged = () => sync();

    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    router.refresh();
  };

  if (!hydrated) {
    return (
      <div className="fixed right-4 top-4 z-50 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-300 shadow-lg backdrop-blur">
        認証状態を確認中...
      </div>
    );
  }

  return (
    <div className="fixed right-4 top-4 z-50 rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 shadow-xl backdrop-blur">
      {loggedIn ? (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">ログイン中</p>
            <p className="font-semibold">
              {player?.displayName ?? "ユーザー"} さん
            </p>
          </div>

          <Link
            href="/mypage"
            className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 transition"
          >
            マイページ
          </Link>

          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 transition"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400">未ログイン</p>

          <Link
            href={`/login?redirect=${encodeURIComponent(pathname)}`}
            className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 transition"
          >
            ログイン
          </Link>

          <Link
            href="/signup"
            className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400 transition"
          >
            新規登録
          </Link>
        </div>
      )}
    </div>
  );
}
