// src/app/word/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type KeyboardEventHandler,
} from "react";

import {
  calculateTyproScore,
  getSessionBadge,
  getHabitGrade,
  getBadgeVisual,
  type BadgeRank,
  type SessionBadge,
} from "@/features/typro/score";

import {
  WORD_THEMES,
  buildWordPool,
  getRandomIndex,
  levelLabel,
  makeQuestion,
  caseLabel,
  type CaseMode,
  type WordLevel,
  type WordThemeKey,
} from "@/features/typro/word/words";

import {
  DEFAULT_WORD_STATS,
  initCareerRankByTheme,
  loadWordLastResult,
  loadWordStats,
  saveWordLastResult,
  saveWordStats,
  type WordStatsSummary,
} from "@/features/typro/word/storage";

import { resetAllTyproStorage } from "@/features/typro/storageReset";

import { PlayScreen } from "@/features/typro/play/PlayScreen";
import { ResultModal } from "@/features/typro/play/ResultModal";
import { useGameSound } from "@/features/typro/sound/useGameSound";
import { submitWordScore } from "@/lib/api/ranking";
import { AUTH_CHANGED_EVENT, isLoggedIn } from "@/lib/auth-storage";

const TIME_OPTIONS = [30, 60, 90] as const;

// 🔊 localStorage key（固定）
const SOUND_KEY = "typro-sound-enabled";

type ResultSummary = {
  completedChars: number;
  completedWords: number;
  mistypedCount: number;
  accuracy: number;
  speed: number; // chars / sec
  score: number;
};

type Growth = {
  charsDiff: number;
  wordsDiff: number;
  mistypedDiff: number; // ＋は改善（前回 - 今回）
  accuracyDiff: number;
  speedDiff: number;
  scoreDiff: number;
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isAsciiSingleChar(ch: string): boolean {
  if (ch.length !== 1) return false;
  const code = ch.charCodeAt(0);
  return code >= 0x20 && code <= 0x7e;
}

function formatDiffInt(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "±0";
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return "±0";
}
function formatDiffFloat(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "±0.00";
  if (value > 0) return `+${value.toFixed(2)}`;
  if (value < 0) return value.toFixed(2);
  return "±0.00";
}

/**
 * ✅ 判定（出やすめに調整済み）
 * - speed は chars/sec（実測）
 * - accuracy は %（0-100）
 *
 * 体感として「Excellentが出にくい」を潰すために
 * ・Excellent: 高精度 or 高速のどちらかを満たしやすく
 * ・Great: Goodより明確に上が出るように
 */
function judgePerformance(accuracy: number, speedCps: number) {
  // Excellent（出やすめ）
  const excellent =
    (accuracy >= 96 && speedCps >= 2.8) || (accuracy >= 98 && speedCps >= 2.4);

  // Great（Goodよりしっかり出る）
  const great =
    (accuracy >= 93 && speedCps >= 2.3) || (accuracy >= 95 && speedCps >= 2.0);

  if (excellent) return "EXCELLENT" as const;
  if (great) return "GREAT" as const;
  return "GOOD" as const;
}

type PerfLabel = "GOOD" | "GREAT" | "EXCELLENT";
type PerfFx = { label: PerfLabel; nonce: number } | null;

export default function WordModePage() {
  const themeKeys = useMemo(
    () => Object.keys(WORD_THEMES) as WordThemeKey[],
    [],
  );
  const router = useRouter();

  const [isHydrated, setIsHydrated] = useState(false);

  // 🔊 サウンド設定（localStorage）
  const [soundEnabled, setSoundEnabled] = useState(true);

  // サウンド本体
  const { unlock, playSfx, startBgm, stopBgm } = useGameSound({
    enabled: soundEnabled,
    bgmVolume: 0.22,
    sfxVolume: 0.7,
  });

  // 設定
  const [selectedTheme, setSelectedTheme] =
    useState<WordThemeKey>("english_colors");
  const [selectedLevel, setSelectedLevel] = useState<WordLevel>("easy");
  const [selectedSeconds, setSelectedSeconds] = useState<number>(30);

  // ✅ ケース（英/ローマ字のみ適用）: デフォルトは小文字
  const [selectedCase, setSelectedCase] = useState<CaseMode>("lower");

  // ゲーム状態
  const [timeLeft, setTimeLeft] = useState(selectedSeconds);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [countdown, setCountdown] = useState<number | "START" | null>(null);

  // 出題
  const [currentWord, setCurrentWord] = useState<string>("—");
  const [currentHint, setCurrentHint] = useState<string | undefined>(undefined);
  const [currentReading, setCurrentReading] = useState<string | undefined>(
    undefined,
  );

  // 弱点専用練習（単語モード）
  type WeakWord = { answer: string; hint?: string; reading?: string };
  const [weakWordsPool, setWeakWordsPool] = useState<WeakWord[] | null>(null);

  // 「ミスした単語」→「ヒント」「読み」
  const [weakHintMap, setWeakHintMap] = useState<
    Record<string, string | undefined>
  >({});
  const [weakReadingMap, setWeakReadingMap] = useState<
    Record<string, string | undefined>
  >({});

  const [input, setInput] = useState("");

  // 記録
  const [completedChars, setCompletedChars] = useState(0);
  const [completedWords, setCompletedWords] = useState(0);
  const [mistypedCount, setMistypedCount] = useState(0);
  const [mistypedMap, setMistypedMap] = useState<Record<string, number>>({});
  const [mistypedWordsMap, setMistypedWordsMap] = useState<
    Record<string, number>
  >({});

  // 総合評価
  const [typroScore, setTyproScore] = useState(0);
  const [sessionBadge, setSessionBadge] = useState<SessionBadge | null>(null);
  const [habitLabel, setHabitLabel] = useState("");

  // 前回比
  const [previousResult, setPreviousResult] = useState<ResultSummary | null>(
    null,
  );
  const [growth, setGrowth] = useState<Growth | null>(null);

  // stats（単語モード用）
  const [stats, setStats] = useState<WordStatsSummary>(() => ({
    ...DEFAULT_WORD_STATS,
    careerRankByTheme: initCareerRankByTheme(themeKeys),
  }));
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevInputRef = useRef<string>("");
  const playThemeRef = useRef<WordThemeKey>(selectedTheme);
  const lastWordIndexRef = useRef<number | undefined>(undefined);

  const isCountdowning = countdown !== null;

  // ✅ ResultModal の開閉（終了後に自動表示）
  const [showResult, setShowResult] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "review" | "error" | null;
    text: string;
  }>({
    type: null,
    text: "",
  });
  useEffect(() => {
    if (hasFinished) setShowResult(true);
  }, [hasFinished]);

  // ✅ 前回比が混ざらないよう、保存キーは theme+level+case
  const buildResultId = (
    theme: WordThemeKey,
    level: WordLevel,
    mode: CaseMode,
  ) => `${theme}:${level}:${mode}`;

  const {
    label: themeLabel,
    caseApplicable,
    items,
  } = useMemo(() => {
    return buildWordPool(selectedTheme, selectedLevel);
  }, [selectedTheme, selectedLevel]);

  // プログラミング系に切替えたらケースをデフォルトへ戻す
  useEffect(() => {
    if (!caseApplicable) {
      setSelectedCase("lower");
    }
  }, [caseApplicable]);

  const shouldShowWord = isPlaying || hasFinished;
  const displayWord = shouldShowWord ? currentWord : "—";

  // 🔊 localStorage から soundEnabled 読み込み（初回だけ）
  useEffect(() => {
    const t = setTimeout(() => {
      const raw = window.localStorage.getItem(SOUND_KEY);
      if (raw === "0") setSoundEnabled(false);
      if (raw === "1") setSoundEnabled(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // hydration + load
  useEffect(() => {
    const t = setTimeout(() => {
      const loadedStats = loadWordStats(themeKeys);
      if (loadedStats) {
        setStats(loadedStats);
        statsRef.current = loadedStats;
        setHabitLabel(getHabitGrade(loadedStats.streakDays));
      }

      // ✅ 前回結果（theme+level+case）
      const id = buildResultId(selectedTheme, selectedLevel, selectedCase);
      const loadedPrev = loadWordLastResult<ResultSummary>(id);
      setPreviousResult(loadedPrev);

      setIsHydrated(true);
    }, 0);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKeys]);

  useEffect(() => {
    if (!isHydrated) return;

    const syncLoggedIn = () => {
      setLoggedIn(isLoggedIn());
    };

    syncLoggedIn();

    window.addEventListener(AUTH_CHANGED_EVENT, syncLoggedIn);
    window.addEventListener("storage", syncLoggedIn);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncLoggedIn);
      window.removeEventListener("storage", syncLoggedIn);
    };
  }, [isHydrated]);

  const prepareNextWord = () => {
    // 1) 弱点モード優先
    if (weakWordsPool && weakWordsPool.length > 0) {
      const idx = getRandomIndex(
        weakWordsPool.length,
        lastWordIndexRef.current,
      );
      lastWordIndexRef.current = idx;

      const w = weakWordsPool[idx];
      setCurrentWord(w.answer);
      setCurrentHint(w.hint);
      setCurrentReading(w.reading);
      return;
    }

    // 2) 通常モード
    if (items.length === 0) {
      setCurrentWord("no-words");
      setCurrentHint("この条件（レベル）に合う単語がありません");
      setCurrentReading(undefined);
      return;
    }

    const idx = getRandomIndex(items.length, lastWordIndexRef.current);
    lastWordIndexRef.current = idx;

    const q = makeQuestion(items[idx], caseApplicable, selectedCase);
    setCurrentWord(q.answer);
    setCurrentHint(q.hint);
    setCurrentReading(q.reading);
  };

  // ✅ Good/Great/Excellent 表示（コンテナ外・上中央）
  const [perfFx, setPerfFx] = useState<PerfFx>(null);
  const perfNonceRef = useRef(0);
  const triggerPerfFx = (label: PerfLabel) => {
    perfNonceRef.current += 1;
    setPerfFx({ label, nonce: perfNonceRef.current });
  };
  useEffect(() => {
    if (!perfFx) return;
    const id = window.setTimeout(() => setPerfFx(null), 650);
    return () => window.clearTimeout(id);
  }, [perfFx]);

  // ✅ 「結果モーダルが表示されたら +1」用（重複加算防止）
  const countedPlayRef = useRef(false);
  const lastSubmittedScoreKeyRef = useRef<string | null>(null);
  const [pendingResult, setPendingResult] = useState<ResultSummary | null>(
    null,
  );

  function getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("typro-auth-token");
  }

  // start
  const handleStart = () => {
    unlock();

    playThemeRef.current = selectedTheme;

    setTimeLeft(selectedSeconds);
    setIsPlaying(false);
    setHasFinished(false);
    setShowResult(false);

    // ✅ playカウント関連リセット
    countedPlayRef.current = false;
    setPendingResult(null);
    lastSubmittedScoreKeyRef.current = null;

    setCompletedChars(0);
    setCompletedWords(0);
    setMistypedCount(0);
    setMistypedMap({});
    setMistypedWordsMap({});

    setTyproScore(0);
    setSessionBadge(null);
    setGrowth(null);
    setSubmitMessage({ type: null, text: "" });

    setInput("");
    prevInputRef.current = "";

    lastWordIndexRef.current = undefined;
    prepareNextWord();
    setCountdown(3);
  };

  // countdown
  useEffect(() => {
    if (countdown === null) return;

    const id = setTimeout(
      () => {
        setCountdown((current) => {
          if (current === null) return current;

          if (current === "START") {
            setIsPlaying(true);
            setTimeout(() => inputRef.current?.focus(), 0);
            return null;
          }

          if (current <= 1) return "START";
          return current - 1;
        });
      },
      countdown === "START" ? 500 : 800,
    );

    return () => clearTimeout(id);
  }, [countdown]);

  // timer
  useEffect(() => {
    if (!isPlaying) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          setIsPlaying(false);
          setHasFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isPlaying]);

  // 🔊 BGM start/stop
  const prevPlayingRef = useRef(false);
  useEffect(() => {
    const was = prevPlayingRef.current;
    prevPlayingRef.current = isPlaying;

    if (!was && isPlaying) startBgm();
    if (was && !isPlaying) stopBgm();
  }, [isPlaying, startBgm, stopBgm]);

  // 🔊 終了音（1回だけ）
  const finishPlayedRef = useRef(false);
  useEffect(() => {
    if (!hasFinished) return;
    if (finishPlayedRef.current) return;

    finishPlayedRef.current = true;
    playSfx("finish");
    stopBgm();
  }, [hasFinished, playSfx, stopBgm]);

  // 新規プレイ開始時は終了音フラグを戻す
  useEffect(() => {
    if (!hasFinished && !isPlaying && countdown !== null) {
      finishPlayedRef.current = false;
    }
  }, [hasFinished, isPlaying, countdown]);

  // input
  const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const newValue = e.target.value;

    if (isPlaying) {
      const prevValue = prevInputRef.current;

      if (newValue.length > prevValue.length) {
        playSfx("tap");

        const index = newValue.length - 1;
        const addedChar = newValue[index];
        const targetChar = currentWord[index];

        const isMistype = targetChar === undefined || addedChar !== targetChar;
        if (addedChar && isMistype) {
          setMistypedCount((p) => p + 1);
          if (isAsciiSingleChar(addedChar)) {
            setMistypedMap((prev) => {
              const next = { ...prev };
              next[addedChar] = (next[addedChar] || 0) + 1;
              return next;
            });
          }
        }
      }

      prevInputRef.current = newValue;
    } else {
      prevInputRef.current = newValue;
    }

    setInput(newValue);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!isPlaying) return;
    if (e.key !== "Enter") return;

    e.preventDefault();

    const typed = input.trim();
    if (!typed) return;

    if (typed === currentWord) {
      playSfx("correct");

      // ✅ 判定（このEnter時点の“到達値”で判定）
      const elapsedSeconds = Math.max(1, selectedSeconds - timeLeft);
      const nextCompletedChars = completedChars + currentWord.length;
      const totalKeystrokes = nextCompletedChars + mistypedCount;
      const accuracy =
        totalKeystrokes === 0
          ? 0
          : Math.round((nextCompletedChars / totalKeystrokes) * 100);
      const speedCps = nextCompletedChars / elapsedSeconds;

      triggerPerfFx(judgePerformance(accuracy, speedCps));

      setCompletedWords((p) => p + 1);
      setCompletedChars((p) => p + currentWord.length);

      prepareNextWord();

      setInput("");
      prevInputRef.current = "";
    } else {
      playSfx("wrong");

      setMistypedWordsMap((prev) => {
        const next = { ...prev };
        next[currentWord] = (next[currentWord] || 0) + 1;
        return next;
      });

      setWeakHintMap((prev) => {
        if (Object.prototype.hasOwnProperty.call(prev, currentWord))
          return prev;
        return { ...prev, [currentWord]: currentHint };
      });

      setWeakReadingMap((prev) => {
        if (Object.prototype.hasOwnProperty.call(prev, currentWord))
          return prev;
        return { ...prev, [currentWord]: currentReading };
      });

      setInput("");
      prevInputRef.current = "";
    }
  };

  const topMistypedKeys = useMemo(
    () =>
      Object.entries(mistypedMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [mistypedMap],
  );
  const topMistypedWords = useMemo(
    () =>
      Object.entries(mistypedWordsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [mistypedWordsMap],
  );

  const handlePracticeWeakWords = () => {
    unlock();

    const words = Object.entries(mistypedWordsMap)
      .sort((a, b) => b[1] - a[1])
      .map(([w]) => w);

    if (words.length === 0) return;

    const pool: WeakWord[] = words.map((w) => ({
      answer: w,
      hint: weakHintMap[w],
      reading: weakReadingMap[w],
    }));

    setWeakWordsPool(pool);

    lastWordIndexRef.current = undefined;

    setHasFinished(false);
    setShowResult(false);
    setIsPlaying(false);
    setCountdown(null);

    // ✅ playカウント関連リセット（弱点練習は前回比混乱しやすい）
    countedPlayRef.current = false;
    setPendingResult(null);
    lastSubmittedScoreKeyRef.current = null;

    setInput("");
    prevInputRef.current = "";

    const firstIdx = getRandomIndex(pool.length, undefined);
    lastWordIndexRef.current = firstIdx;
    setCurrentWord(pool[firstIdx].answer);
    setCurrentHint(pool[firstIdx].hint);
    setCurrentReading(pool[firstIdx].reading);

    setGrowth(null);
    setPreviousResult(null);
  };

  // ✅ finish calc（ここでは pendingResult まで。統計+保存は「結果モーダル表示」で行う）
  useEffect(() => {
    if (!hasFinished) return;
    if (!isHydrated) return;

    const id = setTimeout(() => {
      const elapsedSeconds = Math.max(1, selectedSeconds - timeLeft);
      const totalKeystrokes = completedChars + mistypedCount;

      const accuracy =
        totalKeystrokes === 0
          ? 0
          : Math.round((completedChars / totalKeystrokes) * 100);

      const speed = completedChars / elapsedSeconds;

      const score = calculateTyproScore(
        completedChars,
        mistypedCount,
        accuracy,
        speed,
        selectedSeconds,
      );

      const current: ResultSummary = {
        completedChars,
        completedWords,
        mistypedCount,
        accuracy,
        speed,
        score,
      };

      setTyproScore(score);
      setPendingResult(current);
    }, 0);

    return () => clearTimeout(id);
  }, [
    hasFinished,
    isHydrated,
    selectedSeconds,
    timeLeft,
    completedChars,
    completedWords,
    mistypedCount,
  ]);

  /**
   * ✅ 結果モーダルが表示された瞬間に
   * - 総プレイ数 +1
   * - 習慣更新
   * - セッションバッジ更新
   * - 前回比計算＆保存
   * を実行する（※重複加算防止）
   */
  useEffect(() => {
    if (!showResult) return;
    if (!pendingResult) return;
    if (!isHydrated) return;
    if (countedPlayRef.current) return;

    countedPlayRef.current = true;

    const token = getAuthToken();

    // ✅ 同じ結果を二重送信しないためのキー
    const submitKey = [
      token ?? "guest",
      selectedTheme,
      selectedLevel,
      caseApplicable ? selectedCase : "lower",
      selectedSeconds,
      pendingResult.score,
      pendingResult.accuracy,
      pendingResult.speed,
      pendingResult.completedChars,
      pendingResult.mistypedCount,
      pendingResult.completedWords,
    ].join("|");

    if (lastSubmittedScoreKeyRef.current === submitKey) {
      console.warn("[word] score-submit skipped (duplicate):", submitKey);
    } else if (token) {
      lastSubmittedScoreKeyRef.current = submitKey;

      void submitWordScore(token, {
        theme_id: selectedTheme,
        level: selectedLevel,
        case_mode: caseApplicable ? selectedCase : "lower",
        duration_sec: selectedSeconds,
        score: pendingResult.score,
        accuracy: pendingResult.accuracy,
        speed_cps: pendingResult.speed,
        typed_chars: pendingResult.completedChars,
        mistyped_count: pendingResult.mistypedCount,
      }).then((res) => {
        if (!res.ok) {
          if (res.error === "parental_consent_required") {
            setSubmitMessage({
              type: "review",
              text: "未成年アカウントは保護者同意後にランキング保存できます。",
            });
            return;
          }

          console.error("[word] score-submit failed:", res.error);
          setSubmitMessage({
            type: "error",
            text: "ランキング保存に失敗しました。",
          });
          return;
        }

        if (res.rank_status === "needs_review") {
          console.warn("[word] score marked as needs_review");
          setSubmitMessage({
            type: "review",
            text: "記録は送信されました。確認後に反映される場合があります。",
          });
          return;
        }

        setSubmitMessage({
          type: "success",
          text: "ランキングに記録されました！",
        });
      });
    } else {
      console.warn("[word] auth token not found, skip score-submit");
      setSubmitMessage({ type: null, text: "" });
    }

    const prevStats = statsRef.current;
    const today = todayISO();
    const isSameDay = prevStats.lastPlayedDate === today;

    let streakDays = prevStats.streakDays;
    let lastPlayedDate: string | null = prevStats.lastPlayedDate;

    if (!isSameDay) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yISO = `${yesterday.getFullYear()}-${String(
        yesterday.getMonth() + 1,
      ).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

      if (prevStats.lastPlayedDate === yISO) streakDays = streakDays + 1;
      else streakDays = 1;

      lastPlayedDate = today;
    }

    const nextStats: WordStatsSummary = {
      ...prevStats,
      totalPlays: prevStats.totalPlays + 1,
      totalChars: prevStats.totalChars + pendingResult.completedChars,
      totalMistypes: prevStats.totalMistypes + pendingResult.mistypedCount,
      bestScore: Math.max(prevStats.bestScore, pendingResult.score),
      lastPlayedDate,
      streakDays,
    };

    setStats(nextStats);
    statsRef.current = nextStats;
    saveWordStats(nextStats);
    setHabitLabel(getHabitGrade(nextStats.streakDays));

    const badge = getSessionBadge(pendingResult.score, pendingResult.accuracy, {
      totalPlays: nextStats.totalPlays,
      streakDays: nextStats.streakDays,
    });
    setSessionBadge(badge);

    const themeForThisPlay = playThemeRef.current;
    const resultId = buildResultId(
      themeForThisPlay,
      selectedLevel,
      selectedCase,
    );
    const prev = loadWordLastResult<ResultSummary>(resultId);

    if (prev) {
      const g: Growth = {
        charsDiff: pendingResult.completedChars - prev.completedChars,
        wordsDiff: pendingResult.completedWords - prev.completedWords,
        mistypedDiff: prev.mistypedCount - pendingResult.mistypedCount,
        accuracyDiff: pendingResult.accuracy - prev.accuracy,
        speedDiff: pendingResult.speed - prev.speed,
        scoreDiff: pendingResult.score - prev.score,
      };
      setGrowth(g);
    } else {
      setGrowth(null);
    }

    saveWordLastResult(resultId, pendingResult);
    setPreviousResult(pendingResult);
  }, [
    showResult,
    pendingResult,
    isHydrated,
    selectedTheme,
    selectedLevel,
    selectedCase,
    selectedSeconds,
    caseApplicable,
  ]);

  const careerRankForTheme: BadgeRank =
    stats.careerRankByTheme[selectedTheme] ?? "GREEN";
  const careerVisual = getBadgeVisual(careerRankForTheme);

  const canPlay =
    (weakWordsPool && weakWordsPool.length > 0) || items.length > 0;
  const isWeakPractice = !!(weakWordsPool && weakWordsPool.length > 0);

  // ✅ Step3-1：設定や統計は“プレイ中は隠す”
  const showLobbyUI = !isPlaying && !isCountdowning;

  // 🔊 ON/OFF 切り替え（保存）
  const handleToggleSound = (next: boolean) => {
    setSoundEnabled(next);
    window.localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    if (!next) stopBgm();
  };

  const handleGoToLoginWithRedirect = () => {
    const qs = new URLSearchParams({
      redirect: window.location.pathname + window.location.search,
    });

    router.push(`/login?${qs.toString()}`);
  };

  const handleGoToCurrentRanking = () => {
    const qs = new URLSearchParams({
      period_type: "weekly",
      theme_id: selectedTheme,
      level: selectedLevel,
      case_mode: caseApplicable ? selectedCase : "lower",
      duration_sec: String(selectedSeconds),
    });

    router.push(`/ranking?${qs.toString()}`);
  };

  // ✅ 両モード共通リセット（typro- を全削除、音だけ残す）
  const handleResetAll = () => {
    const confirmMessage = loggedIn
      ? "このPCに保存されている練習記録・前回比・弱点練習データをリセットします。\nアカウントに保存されたランキング記録は消えません。"
      : "このPCに保存されている練習記録・前回比・弱点練習データをリセットします。よろしいですか？";
    if (!window.confirm(confirmMessage)) return;
    resetAllTyproStorage();

    const resetStats: WordStatsSummary = {
      ...DEFAULT_WORD_STATS,
      careerRankByTheme: initCareerRankByTheme(themeKeys),
    };

    setStats(resetStats);
    statsRef.current = resetStats;

    setPreviousResult(null);
    setGrowth(null);
    setTyproScore(0);
    setSessionBadge(null);
    setHabitLabel("");

    setHasFinished(false);
    setShowResult(false);
    setIsPlaying(false);
    setCountdown(null);

    countedPlayRef.current = false;
    setPendingResult(null);
    lastSubmittedScoreKeyRef.current = null;

    setCompletedChars(0);
    setCompletedWords(0);
    setMistypedCount(0);
    setMistypedMap({});
    setMistypedWordsMap({});

    setWeakWordsPool(null);
    setWeakHintMap({});
    setWeakReadingMap({});
    setInput("");
    prevInputRef.current = "";

    setTimeLeft(selectedSeconds);
    lastWordIndexRef.current = undefined;
    setCurrentHint(undefined);
    setCurrentReading(undefined);
    prepareNextWord();
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-10 relative">
      {/* ✅ Perf FX（画面上部中央 / コンテナ外） */}
      {perfFx && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-60">
          <div
            key={perfFx.nonce}
            className={[
              "typro-perf-fx select-none",
              perfFx.label === "EXCELLENT"
                ? "typro-perf-excellent"
                : perfFx.label === "GREAT"
                  ? "typro-perf-great"
                  : "typro-perf-good",
            ].join(" ")}
          >
            <span className="relative inline-block">
              {perfFx.label}
              {perfFx.label === "EXCELLENT" && (
                <>
                  <span className="typro-sparkle typro-sparkle-a">✦</span>
                  <span className="typro-sparkle typro-sparkle-b">✦</span>
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {isCountdowning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="text-center">
            <div className="text-6xl md:text-7xl font-extrabold animate-pulse">
              {countdown}
            </div>
            <p className="mt-3 text-slate-200 text-sm">
              {countdown === "START" ? "スタート！" : "準備してね…"}
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-3xl px-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">単語モード</h1>
          <Link
            href="/mode"
            onClick={() => stopBgm()}
            className="text-sm text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            モード選択へ戻る
          </Link>
        </header>

        {/* ✅ Lobby UI（プレイ中は隠す） */}
        {showLobbyUI && (
          <>
            <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6">
              {!caseApplicable && (
                <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2">
                  <p className="text-xs text-amber-200">
                    ※プログラミング系ジャンルは大小文字を含めた表記が学習要素のため、ケース変換は行いません。
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    ジャンル
                  </label>
                  <select
                    value={selectedTheme}
                    onChange={(e) => {
                      const nextTheme = e.target.value as WordThemeKey;

                      setWeakWordsPool(null);
                      setWeakHintMap({});
                      setWeakReadingMap({});

                      playThemeRef.current = nextTheme;
                      setSelectedTheme(nextTheme);
                      lastWordIndexRef.current = undefined;

                      setCurrentReading(undefined);

                      if (isHydrated) {
                        const id = buildResultId(
                          nextTheme,
                          selectedLevel,
                          selectedCase,
                        );
                        const loadedPrev =
                          loadWordLastResult<ResultSummary>(id);
                        setPreviousResult(loadedPrev);
                        setGrowth(null);
                      }

                      setHasFinished(false);
                      setShowResult(false);
                      setSessionBadge(null);
                      setTyproScore(0);

                      countedPlayRef.current = false;
                      setPendingResult(null);
                      lastSubmittedScoreKeyRef.current = null;
                    }}
                    disabled={isPlaying || isCountdowning}
                    className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60"
                  >
                    {themeKeys.map((k) => (
                      <option key={k} value={k}>
                        {WORD_THEMES[k].label}
                      </option>
                    ))}
                  </select>

                  {weakWordsPool && weakWordsPool.length > 0 && (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        弱点単語プール：{weakWordsPool.length} 件
                      </p>

                      <button
                        onClick={() => {
                          setWeakWordsPool(null);

                          lastWordIndexRef.current = undefined;
                          setCurrentHint(undefined);
                          setCurrentReading(undefined);

                          setHasFinished(false);
                          setShowResult(false);
                          setSessionBadge(null);
                          setTyproScore(0);

                          countedPlayRef.current = false;
                          setPendingResult(null);
                          lastSubmittedScoreKeyRef.current = null;

                          prepareNextWord();
                        }}
                        disabled={isPlaying || isCountdowning}
                        className="text-xs underline underline-offset-2 text-slate-200 hover:text-white disabled:opacity-60"
                      >
                        テーマの単語へ戻す
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">
                    レベル（文字数）
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(["easy", "normal", "hard"] as const).map((lv) => (
                      <button
                        key={lv}
                        disabled={isPlaying || isCountdowning}
                        onClick={() => {
                          setWeakWordsPool(null);
                          setWeakHintMap({});
                          setWeakReadingMap({});
                          lastWordIndexRef.current = undefined;

                          setSelectedLevel(lv);
                          setCurrentReading(undefined);

                          countedPlayRef.current = false;
                          setPendingResult(null);
                          lastSubmittedScoreKeyRef.current = null;

                          if (isHydrated) {
                            const id = buildResultId(
                              selectedTheme,
                              lv,
                              selectedCase,
                            );
                            setPreviousResult(
                              loadWordLastResult<ResultSummary>(id),
                            );
                            setGrowth(null);
                          }

                          setHasFinished(false);
                          setShowResult(false);
                          setSessionBadge(null);
                          setTyproScore(0);
                        }}
                        className={[
                          "px-3 py-2 rounded-xl border text-sm transition",
                          lv === selectedLevel
                            ? "bg-sky-400 text-slate-900 border-sky-300 font-semibold"
                            : "bg-slate-900 text-slate-100 border border-slate-600 hover:bg-slate-700",
                          isPlaying || isCountdowning
                            ? "opacity-60 cursor-not-allowed"
                            : "",
                        ].join(" ")}
                      >
                        {levelLabel(lv)}
                      </button>
                    ))}
                  </div>

                  {items.length === 0 && (
                    <p className="mt-2 text-xs text-amber-300">
                      このジャンルは現在のレベル条件に合う単語がありません（データ追加
                      or レベル変更してね）
                    </p>
                  )}
                </div>
              </div>

              {/* ✅ ケース選択（英/ローマ字のみ） */}
              {caseApplicable && (
                <div className="mt-4">
                  <label className="block text-sm text-slate-300 mb-2">
                    ケース（英/ローマ字のみ）
                  </label>

                  <div className="flex gap-2 flex-wrap">
                    {(["lower", "title", "upper", "mixed"] as const).map(
                      (cm) => (
                        <button
                          key={cm}
                          disabled={isPlaying || isCountdowning}
                          onClick={() => {
                            setWeakWordsPool(null);
                            setWeakHintMap({});
                            setWeakReadingMap({});
                            lastWordIndexRef.current = undefined;

                            setSelectedCase(cm);
                            setCurrentReading(undefined);

                            countedPlayRef.current = false;
                            setPendingResult(null);
                            lastSubmittedScoreKeyRef.current = null;

                            if (isHydrated) {
                              const id = buildResultId(
                                selectedTheme,
                                selectedLevel,
                                cm,
                              );
                              setPreviousResult(
                                loadWordLastResult<ResultSummary>(id),
                              );
                              setGrowth(null);
                            }

                            setHasFinished(false);
                            setShowResult(false);
                            setSessionBadge(null);
                            setTyproScore(0);
                          }}
                          className={[
                            "px-3 py-2 rounded-xl border text-sm transition",
                            cm === selectedCase
                              ? "bg-sky-400 text-slate-900 border-sky-300 font-semibold"
                              : "bg-slate-900 text-slate-100 border-slate-600 hover:bg-slate-700",
                            isPlaying || isCountdowning
                              ? "opacity-60 cursor-not-allowed"
                              : "",
                          ].join(" ")}
                        >
                          {caseLabel(cm)}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm text-slate-300 mb-2">
                  制限時間
                </label>
                <div className="flex gap-2 flex-wrap">
                  {TIME_OPTIONS.map((sec) => (
                    <button
                      key={sec}
                      disabled={isPlaying || isCountdowning}
                      onClick={() => {
                        setSelectedSeconds(sec);
                        setTimeLeft(sec);
                      }}
                      className={[
                        "px-3 py-2 rounded-xl border text-sm transition",
                        sec === selectedSeconds
                          ? "bg-sky-400 text-slate-900 border-sky-300 font-semibold"
                          : "bg-slate-900 text-slate-100 border-slate-600 hover:bg-slate-700",
                        isPlaying || isCountdowning
                          ? "opacity-60 cursor-not-allowed"
                          : "",
                      ].join(" ")}
                    >
                      {sec}秒
                    </button>
                  ))}
                </div>
              </div>

              {/* ステータス */}
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-3">
                  <p className="text-xs text-slate-400 mb-1">
                    総プレイ数（単語）
                  </p>
                  <p className="text-lg font-semibold">{stats.totalPlays} 回</p>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-3">
                  <p className="text-xs text-slate-400 mb-1">
                    習慣（連続日数）
                  </p>
                  <p className="text-lg font-semibold">{stats.streakDays} 日</p>
                  <p className="text-xs text-slate-400 mt-1">{habitLabel}</p>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-3">
                  <p className="text-xs text-slate-400 mb-1">
                    キャリアランク（参考）
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "px-2 py-1 rounded-lg text-xs font-semibold",
                        careerVisual.colorClass,
                      ].join(" ")}
                    >
                      {careerVisual.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      ※今は表示のみ
                    </span>
                  </div>
                </div>
              </div>

              {/* ✅ 両モード共通リセット */}
              <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <button
                  onClick={handleResetAll}
                  className="text-xs text-slate-300 underline underline-offset-2 hover:text-white"
                  disabled={isPlaying || isCountdowning}
                >
                  このPCの練習記録をリセット
                </button>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>
                    ※練習モード / 単語モードのローカル記録がリセットされます
                  </p>

                  {loggedIn ? (
                    <p className="text-emerald-300">
                      ※アカウントに保存されたランキング記録やスコア履歴は消えません
                    </p>
                  ) : (
                    <p>※未ログイン時は、このPC内の記録のみが保存対象です</p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ✅ プレイ画面 */}
        <PlayScreen
          accent="sky"
          isPlaying={isPlaying}
          isCountdowning={isCountdowning}
          timeLeft={timeLeft}
          totalSeconds={selectedSeconds}
          themeLabel={themeLabel}
          levelLabel={levelLabel(selectedLevel)}
          caseLabel={caseApplicable ? caseLabel(selectedCase) : undefined}
          isWeakPractice={isWeakPractice}
          displayWord={displayWord}
          reading={shouldShowWord ? currentReading : undefined}
          hint={shouldShowWord ? currentHint : undefined}
          input={input}
          inputRef={inputRef}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onStart={handleStart}
          canPlay={canPlay}
          hasFinished={hasFinished}
          nextChar={isPlaying ? (currentWord[input.length] ?? null) : null}
          expectEnter={isPlaying && input.length >= currentWord.length}
          showKeyboard={true}
        />

        {/* ✅ 結果はモーダルで表示 */}
        <ResultModal
          open={showResult}
          onClose={() => setShowResult(false)}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          sessionBadge={sessionBadge}
          typroScore={typroScore}
          topMistypedKeys={topMistypedKeys}
          topMistypedWords={topMistypedWords}
          previousExists={!!previousResult}
          growth={growth}
          onPracticeWeakWords={() => {
            setShowResult(false);
            handlePracticeWeakWords();
          }}
          canPracticeWeakWords={
            Object.keys(mistypedWordsMap).length > 0 &&
            !isPlaying &&
            !isCountdowning
          }
          formatDiffInt={formatDiffInt}
          formatDiffFloat={formatDiffFloat}
        />

        {/* ✅ モーダルを閉じた後の導線 */}
        {!isPlaying && !isCountdowning && hasFinished && !showResult && (
          <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-300">結果まとめを閉じました。</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setShowResult(true)}
                  className="px-4 py-2 rounded-xl border border-slate-600 bg-slate-900 hover:bg-slate-700 text-sm font-semibold transition"
                >
                  結果を見る
                </button>

                <button
                  onClick={handleGoToCurrentRanking}
                  className="px-4 py-2 rounded-xl border border-slate-600 bg-slate-900 hover:bg-slate-700 text-sm font-semibold transition"
                >
                  この条件のランキングを見る
                </button>

                <button
                  onClick={handleStart}
                  className="px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-900 text-sm font-semibold transition"
                >
                  もう一度プレイ
                </button>
              </div>
            </div>

            {loggedIn && submitMessage.type ? (
              <div
                className={[
                  "mt-4 rounded-xl px-4 py-3 border",
                  submitMessage.type === "success"
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : submitMessage.type === "review"
                      ? "border-amber-400/40 bg-amber-500/10"
                      : "border-rose-400/40 bg-rose-500/10",
                ].join(" ")}
              >
                <p
                  className={[
                    "text-sm font-semibold",
                    submitMessage.type === "success"
                      ? "text-emerald-200"
                      : submitMessage.type === "review"
                        ? "text-amber-200"
                        : "text-rose-200",
                  ].join(" ")}
                >
                  {submitMessage.text}
                </p>
              </div>
            ) : null}

            {!loggedIn ? (
              <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-amber-200">
                  ログインするとランキングに記録できます！
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  今回のプレイ自体はできますが、ランキング保存にはログインが必要です。
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={handleGoToLoginWithRedirect}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-sm font-semibold transition"
                  >
                    ログインしてランキングに参加
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ✅ FX用CSS（Excellentだけキラッ） */}
      <style jsx global>{`
        .typro-perf-fx {
          font-weight: 900;
          letter-spacing: 0.06em;
          font-size: clamp(22px, 2.8vw, 34px);
          padding: 10px 18px;
          border-radius: 9999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.65);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          transform-origin: center;
          animation: typro-pop 650ms ease forwards;
        }

        .typro-perf-good {
          color: rgba(148, 163, 184, 1);
        }
        .typro-perf-great {
          color: rgba(125, 211, 252, 1);
          border-color: rgba(125, 211, 252, 0.45);
        }
        .typro-perf-excellent {
          color: rgba(252, 211, 77, 1);
          border-color: rgba(252, 211, 77, 0.55);
        }

        @keyframes typro-pop {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.92);
            filter: blur(2px);
          }
          35% {
            opacity: 1;
            transform: translateY(0px) scale(1.04);
            filter: blur(0px);
          }
          100% {
            opacity: 0;
            transform: translateY(-12px) scale(1);
          }
        }

        .typro-sparkle {
          position: absolute;
          font-size: 18px;
          color: rgba(253, 230, 138, 1);
          text-shadow: 0 0 12px rgba(253, 230, 138, 0.75);
          animation: typro-spark 520ms ease-out forwards;
          opacity: 0;
        }

        .typro-sparkle-a {
          left: -14px;
          top: -12px;
        }
        .typro-sparkle-b {
          right: -16px;
          bottom: -10px;
          animation-delay: 70ms;
        }

        @keyframes typro-spark {
          0% {
            opacity: 0;
            transform: scale(0.5) rotate(0deg);
          }
          35% {
            opacity: 1;
            transform: scale(1.25) rotate(12deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.9) rotate(24deg);
          }
        }
      `}</style>
    </main>
  );
}
