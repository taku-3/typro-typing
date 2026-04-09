const FUNCTIONS_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL ??
  "http://127.0.0.1:54321/functions/v1";

export type MyPageProfile = {
  player_id: string;
  username: string;
  display_name: string;
  icon_url: string | null;
  email: string | null;
  email_verified: boolean;
};

export type RecentPlay = {
  theme_id: string;
  level: string;
  case_mode: string;
  duration_sec: number;
  score: number;
  accuracy: number;
  speed_cps: number;
  ended_at: string;
  rank_status: "ranked" | "needs_review";
};

export type MyPageResponse = {
  ok: boolean;
  profile?: MyPageProfile;
  recent_plays?: RecentPlay[];
  error?: string;
  detail?: string;
};

export async function getMyPage(token: string): Promise<MyPageResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/mypage-get`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as MyPageResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? `mypage-get failed (${res.status})`,
      detail: data?.detail,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}

export type UpdateProfileResponse = {
  ok: boolean;
  profile?: {
    player_id: string;
    display_name: string;
    icon_url: string | null;
  };
  error?: string;
  detail?: string;
};

export async function updateMyProfile(
  token: string,
  params: { displayName: string },
): Promise<UpdateProfileResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/mypage-update-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as UpdateProfileResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? `mypage-update-profile failed (${res.status})`,
      detail: data?.detail,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}