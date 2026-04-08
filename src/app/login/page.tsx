import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

function LoginPageFallback() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">ログイン</h1>
        <p className="text-sm text-slate-300 text-center">
          読み込み中...
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}