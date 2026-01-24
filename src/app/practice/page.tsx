// src/app/practice/page.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEventHandler,
  type KeyboardEventHandler,
} from "react";

import { getReading } from "@/features/typro/reading";
import {
  calculateTyproScore,
  getBadgeVisual,
  getHabitGrade,
  getSessionBadge,
  type BadgeRank,
  type SessionBadge,
} from "@/features/typro/score";
import {
  DEFAULT_STATS,
  loadLastResultByTheme,
  loadStats,
  saveLastResultByTheme,
  saveStats,
  type StatsSummary,
  type ThemeKey,
} from "@/features/typro/storage";

import { resetAllTyproStorage } from "@/features/typro/storageReset";

import { PlayScreen } from "@/features/typro/play/PlayScreen";
import { ResultModal } from "@/features/typro/play/ResultModal";
import { useGameSound } from "@/features/typro/sound/useGameSound";

/**
 * 練習モードのテーマ定義
 */
const THEMES = {
  home_position_upper: {
    label: "ホームポジション練習（a〜l & A〜L混在）",
    words: [
      "a",
      "s",
      "d",
      "f",
      "g",
      "h",
      "j",
      "k",
      "l",
      "A",
      "S",
      "D",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
    ],
  },
  alphabet_lower: {
    label: "アルファベット小文字（a〜z）",
    words: "abcdefghijklmnopqrstuvwxyz".split(""),
  },
  alphabet_upper: {
    label: "アルファベット大文字（A〜Z）",
    words: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  },
  romaji_upper: {
    label: "ローマ字（大文字入力：あ〜ん）",
    words: [
      "A",
      "I",
      "U",
      "E",
      "O",
      "KA",
      "KI",
      "KU",
      "KE",
      "KO",
      "SA",
      "SHI",
      "SU",
      "SE",
      "SO",
      "TA",
      "CHI",
      "TSU",
      "TE",
      "TO",
      "NA",
      "NI",
      "NU",
      "NE",
      "NO",
      "HA",
      "HI",
      "FU",
      "HE",
      "HO",
      "MA",
      "MI",
      "MU",
      "ME",
      "MO",
      "YA",
      "YU",
      "YO",
      "RA",
      "RI",
      "RU",
      "RE",
      "RO",
      "WA",
      "WO",
      "N",
    ],
  },
  romaji_lower: {
    label: "ローマ字（小文字入力：あ〜ん）",
    words: [
      "a",
      "i",
      "u",
      "e",
      "o",
      "ka",
      "ki",
      "ku",
      "ke",
      "ko",
      "sa",
      "shi",
      "su",
      "se",
      "so",
      "ta",
      "chi",
      "tsu",
      "te",
      "to",
      "na",
      "ni",
      "nu",
      "ne",
      "no",
      "ha",
      "hi",
      "fu",
      "he",
      "ho",
      "ma",
      "mi",
      "mu",
      "me",
      "mo",
      "ya",
      "yu",
      "yo",
      "ra",
      "ri",
      "ru",
      "re",
      "ro",
      "wa",
      "wo",
      "n",
    ],
  },
  special_romaji_1: {
    label: "特殊ローマ字1（Shift含む大文字+小文字）",
    words: [
      "A",
      "I",
      "U",
      "E",
      "O",
      "Ka",
      "Ki",
      "Ku",
      "Ke",
      "Ko",
      "Sa",
      "Shi",
      "Su",
      "Se",
      "So",
      "Ta",
      "Chi",
      "Tsu",
      "Te",
      "To",
      "Na",
      "Ni",
      "Nu",
      "Ne",
      "No",
      "Ha",
      "Hi",
      "Fu",
      "He",
      "Ho",
      "Ma",
      "Mi",
      "Mu",
      "Me",
      "Mo",
      "Ya",
      "Yu",
      "Yo",
      "Ra",
      "Ri",
      "Ru",
      "Re",
      "Ro",
      "Wa",
      "Wo",
      "N",
    ],
  },
  special_romaji_2: {
    label: "特殊ローマ字2（拗音・濁音・半濁音・小さい文字）",
    words: [
      "kya",
      "kyu",
      "kyo",
      "gya",
      "gyu",
      "gyo",
      "sha",
      "shu",
      "sho",
      "ja",
      "ju",
      "jo",
      "nya",
      "nyu",
      "nyo",
      "hya",
      "hyu",
      "hyo",
      "pya",
      "pyu",
      "pyo",
      "xtsu",
      "xya",
      "xyu",
      "xyo",
    ],
  },
  programming_symbols: {
    label: "プログラミングでよく使う記号",
    words: [
      "<",
      ">",
      "<=",
      ">=",
      "==",
      "!=",
      "&&",
      "||",
      "{",
      "}",
      "(",
      ")",
      "[",
      "]",
      ";",
      ":",
      ",",
      ".",
      "/",
      "\\",
      "+",
      "++",
      "-",
      "--",
      "*",
      "%",
      "@",
      "#",
      "$",
      "_",
      "=>",
      "->",
      '"',
      "'",
      "`",
    ],
  },
} as const;

const TIME_OPTIONS = [30, 60, 90] as const;

// 🔊 localStorage key（固定）
const SOUND_KEY = "typro-sound-enabled";

type ResultSummary = {
  completedChars: number;
  completedWords: number;
  mistypedCount: number;
  accuracy: number;
  speed: number; // chars/sec
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

type JudgeKind = "good" | "great" | "excellent";
type Judge = { kind: JudgeKind; text: string; id: number };

function judgeText(kind: JudgeKind) {
  if (kind === "excellent") return "EXCELLENT!";
  if (kind === "great") return "GREAT!";
  return "GOOD!";
}

// ✅ Excellent 出やすい版（単語ごと）
function judgeByWord(
  cps: number,
  acc: number,
  mistakesInWord: number,
): JudgeKind {
  if (mistakesInWord === 0 && acc >= 95 && cps >= 2.2) return "excellent";
  if (acc >= 90 && cps >= 1.7) return "great";
  return "good";
}

function getRandomWord(words: readonly string[], prev?: string) {
  if (words.length === 0) return "";
  if (words.length === 1) return words[0];
  let next = prev;
  while (next === prev) {
    next = words[Math.floor(Math.random() * words.length)];
  }
  return next!;
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

export default function PracticePage() {
  const themeKeys = useMemo(() => Object.keys(THEMES) as ThemeKey[], []);

  // ✅ Hydration対策
  const [isHydrated, setIsHydrated] = useState(false);

  // 🔊 サウンド設定（localStorage）
  const [soundEnabled, setSoundEnabled] = useState(true);

  // サウンド本体
  const { unlock, playSfx, startBgm, stopBgm } = useGameSound({
    enabled: soundEnabled,
    bgmVolume: 0.2,
    sfxVolume: 0.7,
  });

  // 選択状態
  const [selectedTheme, setSelectedTheme] =
    useState<ThemeKey>("alphabet_lower");
  const [selectedSeconds, setSelectedSeconds] = useState<number>(30);

  // ゲーム状態
  const [timeLeft, setTimeLeft] = useState(selectedSeconds);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [countdown, setCountdown] = useState<number | "START" | null>(null);

  const [currentWord, setCurrentWord] = useState<string>(
    THEMES[selectedTheme].words[0],
  );
  const [input, setInput] = useState("");

  // 弱点専用練習
  const [weakWordsPool, setWeakWordsPool] = useState<string[] | null>(null);

  // スコア
  const [completedChars, setCompletedChars] = useState(0);
  const [completedWords, setCompletedWords] = useState(0);
  const [mistypedCount, setMistypedCount] = useState(0);
  const [mistypedMap, setMistypedMap] = useState<Record<string, number>>({});
  const [mistypedWordsMap, setMistypedWordsMap] = useState<
    Record<string, number>
  >({});

  // ✅ 判定表示（Good/Great/Excellent）
  const [judge, setJudge] = useState<Judge | null>(null);
  const judgeTimerRef = useRef<number | null>(null);
  const wordStartTsRef = useRef<number>(0);
  const wordMistypeBaseRef = useRef<number>(0);

  // 総合評価
  const [typroScore, setTyproScore] = useState(0);
  const [sessionBadge, setSessionBadge] = useState<SessionBadge | null>(null);
  const [habitLabel, setHabitLabel] = useState("");

  // 前回比
  const [previousResult, setPreviousResult] = useState<ResultSummary | null>(
    null,
  );
  const [growth, setGrowth] = useState<Growth | null>(null);
  const playThemeRef = useRef<ThemeKey>(selectedTheme);

  // stats
  const [stats, setStats] = useState<StatsSummary>(() => ({
    ...DEFAULT_STATS,
    careerRankByTheme: Object.fromEntries(
      themeKeys.map((k) => [k, "GREEN"]),
    ) as StatsSummary["careerRankByTheme"],
  }));
  const statsRef = useRef<StatsSummary>(stats);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // ✅ 「結果モーダル表示で +1」ガード
  const countedPlayRef = useRef(false);
  const [pendingResult, setPendingResult] = useState<ResultSummary | null>(
    null,
  );

  // refs
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevInputRef = useRef<string>("");

  const isCountdowning = countdown !== null;

  // ✅ ResultModal 開閉（終了後に自動表示）
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    if (hasFinished) setShowResult(true);
  }, [hasFinished]);

  // 🔊 localStorage から soundEnabled 読み込み（初回だけ）
  useEffect(() => {
    const t = setTimeout(() => {
      const raw = window.localStorage.getItem(SOUND_KEY);
      if (raw === "0") setSoundEnabled(false);
      if (raw === "1") setSoundEnabled(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // ✅ localStorage 読み込み
  useEffect(() => {
    const id = setTimeout(() => {
      // 旧キー削除（残してるなら）
      window.localStorage.removeItem("typro-practice-last-result");

      const loadedStats = loadStats(themeKeys);
      if (loadedStats) {
        setStats(loadedStats);
        statsRef.current = loadedStats;
        setHabitLabel(getHabitGrade(loadedStats.streakDays));
      }

      // 初期テーマの前回結果
      const loadedPrev = loadLastResultByTheme<ResultSummary>(selectedTheme);
      setPreviousResult(loadedPrev);

      setIsHydrated(true);
    }, 0);

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKeys]);

  // pool
  const poolWords = useMemo<readonly string[]>(() => {
    if (weakWordsPool && weakWordsPool.length > 0) return weakWordsPool;
    return THEMES[selectedTheme].words;
  }, [selectedTheme, weakWordsPool]);

  const reading = useMemo(() => {
    return getReading(selectedTheme, currentWord);
  }, [selectedTheme, currentWord]);

  // ✅ 開始前は単語を隠す
  const shouldShowWord = isPlaying || hasFinished;
  const displayWord = shouldShowWord ? currentWord : "—";

  const canPlay = poolWords.length > 0;

  // ✅ 単語が切り替わったら計測開始
  useEffect(() => {
    if (!isPlaying) return;
    wordStartTsRef.current = performance.now();
    wordMistypeBaseRef.current = mistypedCount;
  }, [currentWord, isPlaying, mistypedCount]);

  // プレイ開始
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

    // ✅ judgeリセット
    setJudge(null);
    if (judgeTimerRef.current) {
      window.clearTimeout(judgeTimerRef.current);
      judgeTimerRef.current = null;
    }

    setCompletedChars(0);
    setCompletedWords(0);
    setMistypedCount(0);
    setMistypedMap({});
    setMistypedWordsMap({});

    setTyproScore(0);
    setSessionBadge(null);
    setGrowth(null);

    setInput("");
    prevInputRef.current = "";

    const first = getRandomWord(poolWords);
    setCurrentWord(first);

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

    if (!was && isPlaying) {
      startBgm();
    }
    if (was && !isPlaying) {
      stopBgm();
    }
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

      // ✅ 単語ごとの判定（Good/Great/Excellent）
      const now = performance.now();
      const durSec = Math.max(0.05, (now - wordStartTsRef.current) / 1000);
      const mistakesInWord = Math.max(
        0,
        mistypedCount - wordMistypeBaseRef.current,
      );
      const effectiveLen = Math.max(2, currentWord.length); // ブレ対策
      const cps = effectiveLen / durSec;
      const acc = Math.round(
        (currentWord.length / (currentWord.length + mistakesInWord)) * 100,
      );

      const kind = judgeByWord(cps, acc, mistakesInWord);
      setJudge({ kind, text: judgeText(kind), id: Date.now() });

      if (judgeTimerRef.current) window.clearTimeout(judgeTimerRef.current);
      judgeTimerRef.current = window.setTimeout(() => {
        setJudge(null);
        judgeTimerRef.current = null;
      }, 760);

      setCompletedWords((p) => p + 1);
      setCompletedChars((p) => p + currentWord.length);

      const next = getRandomWord(poolWords, currentWord);
      setCurrentWord(next);

      setInput("");
      prevInputRef.current = "";
    } else {
      playSfx("wrong");

      setMistypedWordsMap((prev) => {
        const next = { ...prev };
        next[currentWord] = (next[currentWord] || 0) + 1;
        return next;
      });

      setInput("");
      prevInputRef.current = "";
    }
  };

  // 上位
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

    setWeakWordsPool(words);

    const first = getRandomWord(words);
    setCurrentWord(first);

    setHasFinished(false);
    setShowResult(false);
    setIsPlaying(false);
    setCountdown(null);

    countedPlayRef.current = false;
    setPendingResult(null);

    // ✅ judgeリセット
    setJudge(null);
    if (judgeTimerRef.current) {
      window.clearTimeout(judgeTimerRef.current);
      judgeTimerRef.current = null;
    }

    setInput("");
    prevInputRef.current = "";

    setGrowth(null);
    setPreviousResult(null);
  };

  const handleBackToThemePool = () => setWeakWordsPool(null);

  // ✅ 両モード共通リセット（typro- を全削除、音だけ残す）
  const handleResetAll = () => {
    resetAllTyproStorage();

    const resetStats: StatsSummary = {
      ...DEFAULT_STATS,
      careerRankByTheme: Object.fromEntries(
        themeKeys.map((k) => [k, "GREEN"]),
      ) as StatsSummary["careerRankByTheme"],
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

    // ✅ judgeリセット
    setJudge(null);
    if (judgeTimerRef.current) {
      window.clearTimeout(judgeTimerRef.current);
      judgeTimerRef.current = null;
    }

    setCompletedChars(0);
    setCompletedWords(0);
    setMistypedCount(0);
    setMistypedMap({});
    setMistypedWordsMap({});

    setWeakWordsPool(null);
    setInput("");
    prevInputRef.current = "";

    setTimeLeft(selectedSeconds);
    setCurrentWord(THEMES[selectedTheme].words[0]);
  };

  const currentThemeLabel = useMemo(() => {
    const base = THEMES[selectedTheme].label;
    if (weakWordsPool && weakWordsPool.length > 0)
      return `${base}（弱点単語練習）`;
    return base;
  }, [selectedTheme, weakWordsPool]);

  // キャリア（練習モードでは更新しないが表示はする）
  const careerRankForTheme: BadgeRank =
    stats.careerRankByTheme[selectedTheme] ?? "GREEN";
  const careerVisual = getBadgeVisual(careerRankForTheme);

  /**
   * ✅ finish calc：ここでは「結果（pendingResult）」まで作る
   * （統計や保存・総プレイ数+1は ResultModal 表示で確定）
   */
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
   * ✅ ResultModal が表示された瞬間に “1回だけ” 確定更新
   * - 総プレイ数 +1
   * - streak 更新
   * - sessionBadge
   * - 前回比＆保存
   */
  useEffect(() => {
    if (!showResult) return;
    if (!pendingResult) return;
    if (!isHydrated) return;
    if (countedPlayRef.current) return;

    countedPlayRef.current = true;

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

    const nextStats: StatsSummary = {
      ...prevStats,
      totalPlays: prevStats.totalPlays + 1, // ✅ ここで +1
      totalChars: prevStats.totalChars + pendingResult.completedChars,
      totalMistypes: prevStats.totalMistypes + pendingResult.mistypedCount,
      bestScore: Math.max(prevStats.bestScore, pendingResult.score),
      lastPlayedDate,
      streakDays,
    };

    setStats(nextStats);
    statsRef.current = nextStats;
    saveStats(nextStats);
    setHabitLabel(getHabitGrade(nextStats.streakDays));

    const badge = getSessionBadge(pendingResult.score, pendingResult.accuracy, {
      totalPlays: nextStats.totalPlays,
      streakDays: nextStats.streakDays,
    });
    setSessionBadge(badge);

    const themeForThisPlay = playThemeRef.current;
    const prev = loadLastResultByTheme<ResultSummary>(themeForThisPlay);

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

    saveLastResultByTheme(themeForThisPlay, pendingResult);
    setPreviousResult(pendingResult);
  }, [showResult, pendingResult, isHydrated]);

  // ✅ Step3-1：設定/統計はプレイ中は隠す
  const showLobbyUI = !isPlaying && !isCountdowning;

  // 🔊 ON/OFF 切り替え（保存）
  const handleToggleSound = (next: boolean) => {
    setSoundEnabled(next);
    window.localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    if (!next) stopBgm();
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-10 relative">
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
          <h1 className="text-2xl md:text-3xl font-bold">練習モード</h1>
          <Link
            href="/mode"
            onClick={() => stopBgm()}
            className="text-sm text-slate-300 underline underline-offset-2 hover:text-slate-100"
          >
            モード選択へ戻る
          </Link>
        </header>

        {/* Lobby UI */}
        {showLobbyUI && (
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  テーマ（練習内容）
                </label>
                <select
                  value={selectedTheme}
                  onChange={(e) => {
                    const nextTheme = e.target.value as ThemeKey;
                    setSelectedTheme(nextTheme);
                    playThemeRef.current = nextTheme;

                    setWeakWordsPool(null);
                    setCurrentWord(THEMES[nextTheme].words[0]);

                    if (isHydrated) {
                      const loadedPrev =
                        loadLastResultByTheme<ResultSummary>(nextTheme);
                      setPreviousResult(loadedPrev);
                      setGrowth(null);
                    }

                    setHasFinished(false);
                    setShowResult(false);
                    setSessionBadge(null);
                    setTyproScore(0);

                    countedPlayRef.current = false;
                    setPendingResult(null);

                    setJudge(null);
                    if (judgeTimerRef.current) {
                      window.clearTimeout(judgeTimerRef.current);
                      judgeTimerRef.current = null;
                    }
                  }}
                  disabled={isPlaying || isCountdowning}
                  className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
                >
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <option key={key} value={key}>
                      {theme.label}
                    </option>
                  ))}
                </select>

                {weakWordsPool && weakWordsPool.length > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      弱点単語プール：{weakWordsPool.length} 件
                    </p>
                    <button
                      onClick={handleBackToThemePool}
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
                          ? "bg-emerald-400 text-slate-900 border-emerald-300 font-semibold"
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
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <div className="rounded-xl bg-slate-900 border border-slate-700 p-3">
                <p className="text-xs text-slate-400 mb-1">総プレイ数</p>
                <p className="text-lg font-semibold">{stats.totalPlays} 回</p>
              </div>
              <div className="rounded-xl bg-slate-900 border border-slate-700 p-3">
                <p className="text-xs text-slate-400 mb-1">習慣（連続日数）</p>
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
                    ※練習モードでは更新しません
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={handleResetAll}
                className="text-xs text-slate-300 underline underline-offset-2 hover:text-white"
                disabled={isPlaying || isCountdowning}
              >
                このPCの記録をリセット
              </button>
              <p className="text-xs text-slate-500">
                ※練習モード/単語モード両方の記録が消えます
              </p>
            </div>
          </section>
        )}

        {/* Play UI */}
        <PlayScreen
          accent="emerald"
          isPlaying={isPlaying}
          isCountdowning={isCountdowning}
          timeLeft={timeLeft}
          totalSeconds={selectedSeconds}
          themeLabel={currentThemeLabel}
          levelLabel={"—"} // 練習モードはレベル概念なし
          caseLabel={undefined}
          isWeakPractice={!!(weakWordsPool && weakWordsPool.length > 0)}
          displayWord={displayWord}
          reading={shouldShowWord ? reading : undefined}
          hint={undefined}
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
          judge={judge}
        />

        {/* Result Modal */}
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

        {/* 結果モーダルを閉じた後の導線 */}
        {!isPlaying && !isCountdowning && hasFinished && !showResult && (
          <div className="mb-8 rounded-2xl border border-slate-700 bg-slate-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-300">結果まとめを閉じました。</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResult(true)}
                  className="px-4 py-2 rounded-xl border border-slate-600 bg-slate-900 hover:bg-slate-700 text-sm font-semibold transition"
                >
                  結果を見る
                </button>
                <button
                  onClick={handleStart}
                  className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-900 text-sm font-semibold transition"
                >
                  もう一度プレイ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
