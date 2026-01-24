// src/app/mode/page.tsx
import Link from "next/link";

export default function ModeSelectPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-xl w-full rounded-2xl bg-slate-800 shadow-lg border border-slate-700 p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
          モード選択
        </h1>
        <p className="text-center text-sm text-slate-300 mb-6">
          目的に合わせて選んでね
        </p>

        <div className="grid gap-3">
          <Link
            href="/practice"
            className="block w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-center transition"
          >
            練習モード（キー/記号/ローマ字）
          </Link>

          <Link
            href="/word"
            className="block w-full py-3 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-900 font-semibold text-center transition"
          >
            単語モード（英単語/ローマ字単語/プログラミング）
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            タイトルへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
