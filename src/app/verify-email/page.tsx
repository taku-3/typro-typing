import { Suspense } from "react";
import VerifyEmailPageClient from "./VerifyEmailPageClient";

function VerifyEmailFallback() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">読み込み中...</p>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailPageClient />
    </Suspense>
  );
}