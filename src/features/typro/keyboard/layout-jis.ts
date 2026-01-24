// src/features/typro/keyboard/layout-jis.ts
import type { KeyboardLayout } from "./types";

/**
 * JIS配列（日本語配列）フル・実機寄せ
 * - Grid 座標指定方式（Enter 縦対応）
 * - 1u = 1列
 * - columns = 30
 *
 * row:
 * 1 = 数字行
 * 2 = Tab 行
 * 3 = Caps 行
 * 4 = Shift 行
 * 5 = Space 行
 */

export const JIS_FULL_LAYOUT: KeyboardLayout = {
  name: "JIS（日本語）フル",
  columns: 30,
  keys: [
    /* =====================
     * Row 1 : 数字行
     * ===================== */
    { id: "Backquote", label: { normal: "半/全" }, col: 1, row: 1, colSpan: 2 },
    { id: "Digit1", label: { normal: "1", shift: "!" }, col: 3, row: 1 },
    { id: "Digit2", label: { normal: "2", shift: `"` }, col: 4, row: 1 },
    { id: "Digit3", label: { normal: "3", shift: "#" }, col: 5, row: 1 },
    { id: "Digit4", label: { normal: "4", shift: "$" }, col: 6, row: 1 },
    { id: "Digit5", label: { normal: "5", shift: "%" }, col: 7, row: 1 },
    { id: "Digit6", label: { normal: "6", shift: "&" }, col: 8, row: 1 },
    { id: "Digit7", label: { normal: "7", shift: "'" }, col: 9, row: 1 },
    { id: "Digit8", label: { normal: "8", shift: "(" }, col: 10, row: 1 },
    { id: "Digit9", label: { normal: "9", shift: ")" }, col: 11, row: 1 },
    { id: "Digit0", label: { normal: "0" }, col: 12, row: 1 },
    { id: "Minus", label: { normal: "-", shift: "=" }, col: 13, row: 1 },
    { id: "Equal", label: { normal: "^", shift: "~" }, col: 14, row: 1 },
    { id: "IntlYen", label: { normal: "¥", shift: "|" }, col: 15, row: 1 },
    {
      id: "Backspace",
      label: { normal: "Backspace" },
      col: 16,
      row: 1,
      colSpan: 5,
    },

    /* =====================
     * Row 2 : Tab 行
     * ===================== */
    { id: "Tab", label: { normal: "Tab" }, col: 1, row: 2, colSpan: 3 },
    { id: "KeyQ", label: { normal: "Q" }, col: 4, row: 2 },
    { id: "KeyW", label: { normal: "W" }, col: 5, row: 2 },
    { id: "KeyE", label: { normal: "E" }, col: 6, row: 2 },
    { id: "KeyR", label: { normal: "R" }, col: 7, row: 2 },
    { id: "KeyT", label: { normal: "T" }, col: 8, row: 2 },
    { id: "KeyY", label: { normal: "Y" }, col: 9, row: 2 },
    { id: "KeyU", label: { normal: "U" }, col: 10, row: 2 },
    { id: "KeyI", label: { normal: "I" }, col: 11, row: 2 },
    { id: "KeyO", label: { normal: "O" }, col: 12, row: 2 },
    { id: "KeyP", label: { normal: "P" }, col: 13, row: 2 },
    { id: "BracketLeft", label: { normal: "@", shift: "`" }, col: 14, row: 2 },
    { id: "BracketRight", label: { normal: "[", shift: "{" }, col: 15, row: 2 },

    // ⬇️ 縦 Enter（Tab 行 → Caps 行）
    {
      id: "Enter",
      label: { normal: "Enter" },
      col: 16,
      row: 2,
      colSpan: 5,
      rowSpan: 2,
    },

    /* =====================
     * Row 3 : Caps 行
     * ===================== */
    { id: "CapsLock", label: { normal: "Caps" }, col: 1, row: 3, colSpan: 4 },
    { id: "KeyA", label: { normal: "A" }, col: 5, row: 3 },
    { id: "KeyS", label: { normal: "S" }, col: 6, row: 3 },
    { id: "KeyD", label: { normal: "D" }, col: 7, row: 3 },
    { id: "KeyF", label: { normal: "F" }, col: 8, row: 3 },
    { id: "KeyG", label: { normal: "G" }, col: 9, row: 3 },
    { id: "KeyH", label: { normal: "H" }, col: 10, row: 3 },
    { id: "KeyJ", label: { normal: "J" }, col: 11, row: 3 },
    { id: "KeyK", label: { normal: "K" }, col: 12, row: 3 },
    { id: "KeyL", label: { normal: "L" }, col: 13, row: 3 },
    { id: "Semicolon", label: { normal: ";", shift: "+" }, col: 14, row: 3 },
    { id: "Quote", label: { normal: ":", shift: "*" }, col: 15, row: 3 },
    { id: "Backslash", label: { normal: "]", shift: "}" }, col: 16, row: 3 },

    /* =====================
     * Row 4 : Shift 行
     * ===================== */
    { id: "ShiftLeft", label: { normal: "Shift" }, col: 1, row: 4, colSpan: 5 },
    { id: "KeyZ", label: { normal: "Z" }, col: 6, row: 4 },
    { id: "KeyX", label: { normal: "X" }, col: 7, row: 4 },
    { id: "KeyC", label: { normal: "C" }, col: 8, row: 4 },
    { id: "KeyV", label: { normal: "V" }, col: 9, row: 4 },
    { id: "KeyB", label: { normal: "B" }, col: 10, row: 4 },
    { id: "KeyN", label: { normal: "N" }, col: 11, row: 4 },
    { id: "KeyM", label: { normal: "M" }, col: 12, row: 4 },
    { id: "Comma", label: { normal: ",", shift: "<" }, col: 13, row: 4 },
    { id: "Period", label: { normal: ".", shift: ">" }, col: 14, row: 4 },
    { id: "Slash", label: { normal: "/", shift: "?" }, col: 15, row: 4 },
    { id: "IntlRo", label: { normal: "\\", shift: "_" }, col: 16, row: 4 },
    { id: "ShiftRight", label: { normal: "Shift" }, col: 17, row: 4, colSpan: 4 },

  /* =====================
 * Row 5 : Space 行（Enter右端=col20に収める）
 * 合計20列になるように圧縮
 * ===================== */
{ id: "ControlLeft", label: { normal: "Ctrl" }, col: 1, row: 5, colSpan: 2 },   // 1-2
{ id: "MetaLeft",    label: { normal: "Win" },  col: 3, row: 5, colSpan: 2 },   // 3-4
{ id: "AltLeft",     label: { normal: "Alt" },  col: 5, row: 5, colSpan: 2 },   // 5-6
{ id: "NonConvert",  label: { normal: "無変換" }, col: 7, row: 5, colSpan: 2 }, // 7-8
{ id: "Space",       label: { normal: "Space" }, col: 9, row: 5, colSpan: 7 },  // 9-15
{ id: "Convert",     label: { normal: "変換" }, col: 16, row: 5, colSpan: 2 },  // 16-17
{ id: "KanaMode",    label: { normal: "かな" }, col: 18, row: 5, colSpan: 1 },  // 18
{ id: "AltRight",    label: { normal: "Alt" }, col: 19, row: 5, colSpan: 1 },   // 19
{ id: "ControlRight",label: { normal: "Ctrl" }, col: 20, row: 5, colSpan: 1 },  // 20
  ],
};
