// src/lib/auth-storage.ts
export const TOKEN_KEY = "typro-auth-token";
export const PLAYER_KEY = "typro-player";
export const AUTH_CHANGED_EVENT = "typro-auth-changed";

export type StoredPlayer = {
  id: string;
  displayName: string;
  iconUrl: string | null;
};

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredPlayer(): StoredPlayer | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(PLAYER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredPlayer;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getAuthToken();
}

function notifyAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function saveAuthSession(params: {
  token: string;
  player?: StoredPlayer | null;
}) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(TOKEN_KEY, params.token);

  if (params.player) {
    window.localStorage.setItem(PLAYER_KEY, JSON.stringify(params.player));
  } else {
    window.localStorage.removeItem(PLAYER_KEY);
  }

  notifyAuthChanged();
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(PLAYER_KEY);

  notifyAuthChanged();
}
