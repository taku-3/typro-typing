import Link from "next/link";

// src/app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full px-6 py-8 rounded-2xl bg-slate-800 shadow-lg border border-slate-700">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6">
          タイプロ（仮）
        </h1>

        <p className="text-center text-sm md:text-base text-slate-300 mb-8 leading-relaxed">
          小学生からパソコン初心者まで、
          <br />
          プログラミングを見据えたタイピングゲームを
          <span className="hidden md:inline">、</span>
          気軽に体験できるWebサービス。
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <Link
            href="/mode"
            className="block w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-center transition"
          >
            モード選択へ
          </Link>

          <button className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 transition">
            ランキング
          </button>

          <button className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 transition">
            チュートリアル
          </button>
        </div>

        <div className="flex justify-between items-center text-xs md:text-sm text-slate-400">
          <button className="underline underline-offset-2 hover:text-slate-200 transition">
            設定
          </button>

          <button className="underline underline-offset-2 hover:text-slate-200 transition">
            ログイン / 新規登録
          </button>
        </div>
      </div>
    </main>
  );
}
