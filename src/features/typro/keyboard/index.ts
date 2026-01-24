export * from "./Keyboard";
export * from "./layout-jis";
export * from "./types";

export function charToKeyJis(ch: string): { keyId: string; needsShift: boolean } | null {
  if (!ch) return null;

  // Enter
  if (ch === "\n") return { keyId: "Enter", needsShift: false };

  // Space
  if (ch === " ") return { keyId: "Space", needsShift: false };

  // a-z / A-Z
  if (ch >= "a" && ch <= "z") return { keyId: `Key${ch.toUpperCase()}`, needsShift: false };
  if (ch >= "A" && ch <= "Z") return { keyId: `Key${ch}`, needsShift: true };

  // 0-9
  if (ch >= "0" && ch <= "9") return { keyId: `Digit${ch}`, needsShift: false };

  // JIS記号マップ（layout-jis.ts の定義に合わせる）
  const map: Record<string, { keyId: string; needsShift: boolean }> = {
    "!": { keyId: "Digit1", needsShift: true },
    '"': { keyId: "Digit2", needsShift: true },
    "#": { keyId: "Digit3", needsShift: true },
    $: { keyId: "Digit4", needsShift: true },
    "%": { keyId: "Digit5", needsShift: true },
    "&": { keyId: "Digit6", needsShift: true },
    "'": { keyId: "Digit7", needsShift: true },
    "(": { keyId: "Digit8", needsShift: true },
    ")": { keyId: "Digit9", needsShift: true },

    "-": { keyId: "Minus", needsShift: false },
    "=": { keyId: "Minus", needsShift: true },

    "^": { keyId: "Equal", needsShift: false },
    "~": { keyId: "Equal", needsShift: true },

    "¥": { keyId: "IntlYen", needsShift: false },
    "|": { keyId: "IntlYen", needsShift: true },

    "@": { keyId: "BracketLeft", needsShift: false },
    "`": { keyId: "BracketLeft", needsShift: true },

    "[": { keyId: "BracketRight", needsShift: false },
    "{": { keyId: "BracketRight", needsShift: true },

    "]": { keyId: "Backslash", needsShift: false },
    "}": { keyId: "Backslash", needsShift: true },

    ";": { keyId: "Semicolon", needsShift: false },
    "+": { keyId: "Semicolon", needsShift: true },

    ":": { keyId: "Quote", needsShift: false },
    "*": { keyId: "Quote", needsShift: true },

    ",": { keyId: "Comma", needsShift: false },
    "<": { keyId: "Comma", needsShift: true },

    ".": { keyId: "Period", needsShift: false },
    ">": { keyId: "Period", needsShift: true },

    "/": { keyId: "Slash", needsShift: false },
    "?": { keyId: "Slash", needsShift: true },

    "\\": { keyId: "IntlRo", needsShift: false },
    _: { keyId: "IntlRo", needsShift: true },
  };

  return map[ch] ?? null;
}
