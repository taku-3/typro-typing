// src/features/typro/reading.ts
export type ThemeKey =
  | "home_position_upper"
  | "alphabet_lower"
  | "alphabet_upper"
  | "romaji_upper"
  | "romaji_lower"
  | "special_romaji_1"
  | "special_romaji_2"
  | "programming_symbols";

/**
 * 読み方辞書
 */

// アルファベット読み
const ALPHABET_READING: Record<string, string> = {
  A: "エー",
  B: "ビー",
  C: "シー",
  D: "ディー",
  E: "イー",
  F: "エフ",
  G: "ジー",
  H: "エイチ",
  I: "アイ",
  J: "ジェイ",
  K: "ケー",
  L: "エル",
  M: "エム",
  N: "エヌ",
  O: "オー",
  P: "ピー",
  Q: "キュー",
  R: "アール",
  S: "エス",
  T: "ティー",
  U: "ユー",
  V: "ブイ",
  W: "ダブリュー",
  X: "エックス",
  Y: "ワイ",
  Z: "ズィー",
};

// ローマ字読み
const ROMAJI_READING: Record<string, string> = {
  A: "あ",
  I: "い",
  U: "う",
  E: "え",
  O: "お",
  KA: "か",
  KI: "き",
  KU: "く",
  KE: "け",
  KO: "こ",
  SA: "さ",
  SHI: "し",
  SU: "す",
  SE: "せ",
  SO: "そ",
  TA: "た",
  CHI: "ち",
  TSU: "つ",
  TE: "て",
  TO: "と",
  NA: "な",
  NI: "に",
  NU: "ぬ",
  NE: "ね",
  NO: "の",
  HA: "は",
  HI: "ひ",
  FU: "ふ",
  HE: "へ",
  HO: "ほ",
  MA: "ま",
  MI: "み",
  MU: "む",
  ME: "め",
  MO: "も",
  YA: "や",
  YU: "ゆ",
  YO: "よ",
  RA: "ら",
  RI: "り",
  RU: "る",
  RE: "れ",
  RO: "ろ",
  WA: "わ",
  WO: "を",
  N: "ん",
  // 拗音系
  KYA: "きゃ",
  KYU: "きゅ",
  KYO: "きょ",
  GYA: "ぎゃ",
  GYU: "ぎゅ",
  GYO: "ぎょ",
  SHA: "しゃ",
  SHU: "しゅ",
  SHO: "しょ",
  JA: "じゃ",
  JU: "じゅ",
  JO: "じょ",
  NYA: "にゃ",
  NYU: "にゅ",
  NYO: "にょ",
  HYA: "ひゃ",
  HYU: "ひゅ",
  HYO: "ひょ",
  PYA: "ぴゃ",
  PYU: "ぴゅ",
  PYO: "ぴょ",
  XTSU: "っ",
  XYA: "ゃ",
  XYU: "ゅ",
  XYO: "ょ",
};

// 記号読み
const SYMBOL_READING: Record<string, string> = {
  "<": "小なり",
  ">": "大なり",
  "<=": "小なりイコール",
  ">=": "大なりイコール",
  "==": "イコールイコール",
  "!=": "ノットイコール",
  "&&": "アンド",
  "||": "オア",
  "{": "波かっこ",
  "}": "波かっこ閉じ",
  "(": "かっこ",
  ")": "かっこ閉じ",
  "[": "角かっこ",
  "]": "角かっこ閉じ",
  ";": "セミコロン",
  ":": "コロン",
  ",": "カンマ",
  ".": "ドット",
  "/": "スラッシュ",
  "\\": "バックスラッシュ",
  "+": "プラス",
  "++": "インクリメント",
  "-": "マイナス",
  "--": "デクリメント",
  "*": "アスタリスク",
  "%": "パーセント",
  "@": "アットマーク",
  "#": "シャープ",
  $: "ドル",
  _: "アンダーバー",
  "=>": "アロー",
  "->": "矢印",
  '"': "ダブルクオート",
  "'": "シングルクオート",
  "`": "バッククオート",
};

// 将来、英単語読みも追加できる余地（今は空）
const ENGLISH_WORD_READING: Record<string, string> = {};

/**
 * 読み方取得
 */
export function getReading(theme: ThemeKey, word: string): string {
  if (theme === "alphabet_lower" || theme === "alphabet_upper") {
    const upper = word.toUpperCase();
    return ALPHABET_READING[upper] ?? "";
  }

  if (
    theme === "romaji_upper" ||
    theme === "romaji_lower" ||
    theme === "special_romaji_1" ||
    theme === "special_romaji_2"
  ) {
    const key = word.toUpperCase();
    return ROMAJI_READING[key] ?? "";
  }

  if (theme === "programming_symbols") {
    return SYMBOL_READING[word] ?? "";
  }

  const lower = word.toLowerCase();
  return ENGLISH_WORD_READING[lower] ?? "";
}
