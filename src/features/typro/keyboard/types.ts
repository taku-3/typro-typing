// src/features/typro/keyboard/types.ts

export type KeyShape = "normal";

export type KeyCap = {
  /** KeyboardEvent.code と一致 */
  id: string;
  label: { normal: string; shift?: string };

  /** Grid 座標（1始まり） */
  col: number;
  row: number;

  colSpan?: number;
  rowSpan?: number;
};

export type KeyboardLayout = {
  name: string;

  /** Grid の総列数（例: 30） */
  columns: number;

  /** フラットなキー配列（row配列は使わない） */
  keys: KeyCap[];
};
