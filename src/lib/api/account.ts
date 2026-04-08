export type ChangeEmailResponse = {
  ok: boolean;
  email?: string;
  is_primary?: boolean;
  error?: string;
  is_new?: boolean;
  detail?: string;
};

const FUNCTIONS_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL ??
  "http://127.0.0.1:54321/functions/v1";

export async function changePrimaryEmail(
  token: string,
  payload: {
    newEmail: string;
    currentPassword: string;
  },
): Promise<ChangeEmailResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/auth-email-change`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      new_email: payload.newEmail,
      current_password: payload.currentPassword,
    }),
    cache: "no-store",
  });

  const data = (await res
    .json()
    .catch(() => null)) as ChangeEmailResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? `auth-email-change failed (${res.status})`,
      detail: data?.detail,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}

export type ChangePasswordResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

export async function changePassword(
  token: string,
  payload: {
    currentPassword: string;
    newPassword: string;
  },
): Promise<ChangePasswordResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/auth-password-change`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
    }),
    cache: "no-store",
  });

  const data = (await res
    .json()
    .catch(() => null)) as ChangePasswordResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? `auth-password-change failed (${res.status})`,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}

export type DeleteAccountResponse = {
  ok: boolean;
  message?: string;
  error?: string;
};

export async function deleteAccount(
  token: string,
  payload: {
    currentPassword: string;
  },
): Promise<DeleteAccountResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/auth-account-delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: payload.currentPassword,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as
    | DeleteAccountResponse
    | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? `auth-account-delete failed (${res.status})`,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}
