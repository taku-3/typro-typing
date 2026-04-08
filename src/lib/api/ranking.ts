// src/lib/api/ranking.ts
export type ScoreSubmitPayload = {
  theme_id: string;
  level: "easy" | "normal" | "hard";
  case_mode: "lower" | "title" | "upper" | "mixed";
  duration_sec: number;
  score: number;
  accuracy: number;
  speed_cps: number;
  typed_chars: number;
  mistyped_count: number;
};

export type ScoreSubmitResponse = {
  ok: boolean;
  rank_status?: "ranked" | "needs_review";
  error?: string;
};

export type LeaderboardItem = {
  period_type: string;
  period_start: string;
  mode: "word";
  theme_id: string;
  level: string;
  case_mode: string;
  duration_sec: number;
  player_id: string;
  best_score: number;
  first_achieved_at: string;
  display_name: string;
  icon_url: string | null;
};

export type LeaderboardResponse = {
  ok: boolean;
  period_type: string;
  period_start: string;
  mode: "word";
  theme_id: string;
  level: string;
  case_mode: string;
  duration_sec: number;
  items: LeaderboardItem[];
  error?: string;
};

const FUNCTIONS_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL ??
  "http://127.0.0.1:54321/functions/v1";

export async function submitWordScore(
  token: string,
  payload: ScoreSubmitPayload,
): Promise<ScoreSubmitResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/score-submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as ScoreSubmitResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error: data?.error ?? `score-submit failed (${res.status})`,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}

export async function getLeaderboard(params: {
  period_type: "daily" | "weekly" | "monthly" | "yearly" | "alltime";
  theme_id: string;
  level: "easy" | "normal" | "hard";
  case_mode: "lower" | "title" | "upper" | "mixed";
  duration_sec: number;
  limit?: number;
}): Promise<LeaderboardResponse> {
  const qs = new URLSearchParams({
    period_type: params.period_type,
    theme_id: params.theme_id,
    level: params.level,
    case_mode: params.case_mode,
    duration_sec: String(params.duration_sec),
    limit: String(params.limit ?? 10),
  });

  const res = await fetch(`${FUNCTIONS_BASE}/leaderboard-get?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as LeaderboardResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      period_type: params.period_type,
      period_start: "",
      mode: "word",
      theme_id: params.theme_id,
      level: params.level,
      case_mode: params.case_mode,
      duration_sec: params.duration_sec,
      items: [],
      error: data?.error ?? `leaderboard-get failed (${res.status})`,
    };
  }

  return (
    data ?? {
      ok: false,
      period_type: params.period_type,
      period_start: "",
      mode: "word",
      theme_id: params.theme_id,
      level: params.level,
      case_mode: params.case_mode,
      duration_sec: params.duration_sec,
      items: [],
      error: "invalid_response",
    }
  );
}