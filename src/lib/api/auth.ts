// src/lib/api/auth.ts
export type LoginResponse = {
  ok: boolean;
  token?: string;
  player?: {
    id: string;
    displayName: string;
    iconUrl: string | null;
  };
  error?: string;
  detail?: string;
};

export type SignupResponse = {
  ok: boolean;
  playerId?: string;
  emailSaved?: boolean;
  error?: string;
  detail?: string;
};

export type SignupPayload = {
  username: string;
  password: string;
  displayName?: string;
  birthYear?: number;
  birthMonth?: number;
  parentalConsent: boolean;
  iconUrl?: string;
  email?: string;
};

const FUNCTIONS_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL ??
  "http://127.0.0.1:54321/functions/v1";

export async function loginWithUsernamePassword(params: {
  username: string;
  password: string;
}): Promise<LoginResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/auth-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as LoginResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? `auth-login failed (${res.status})`,
      detail: data?.detail,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}

export async function signupWithUsernamePassword(
  params: SignupPayload,
): Promise<SignupResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/auth-signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as SignupResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? `auth-signup failed (${res.status})`,
      detail: data?.detail,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}