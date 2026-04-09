import { Suspense } from "react";
import RankingPageClient from "./RankingPageClient";

function RankingPageFallback() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 px-6 py-10 flex items-center justify-center">
      <div className="text-sm text-slate-300">読み込み中...</div>
    </main>
  );
}

export default function RankingPage() {
  return (
    <Suspense fallback={<RankingPageFallback />}>
      <RankingPageClient />
    </Suspense>
  );
}
