import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function periodStart(periodType: string, now = new Date()): string {
  // DB側の period_start(date) とズレないよう UTC 基準で作成
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yyyy = d.getUTCFullYear();
  const mm = d.getUTCMonth();
  const dd = d.getUTCDate();

  switch (periodType) {
    case "daily":
      return new Date(Date.UTC(yyyy, mm, dd)).toISOString().slice(0, 10);

    case "weekly": {
      // ISO week (Mon start)
      const day = d.getUTCDay(); // 0=Sun..6=Sat
      const isoDow = day === 0 ? 7 : day; // 1=Mon..7=Sun
      const monday = new Date(d);
      monday.setUTCDate(dd - (isoDow - 1));
      return monday.toISOString().slice(0, 10);
    }

    case "monthly":
      return new Date(Date.UTC(yyyy, mm, 1)).toISOString().slice(0, 10);

    case "yearly":
      return new Date(Date.UTC(yyyy, 0, 1)).toISOString().slice(0, 10);

    case "alltime":
      return "1970-01-01";

    default:
      throw new Error("invalid period_type");
  }
}

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "content-type, authorization",
          "cache-control": "no-store",
        },
      });
    }

    if (req.method !== "GET") return json(405, { ok: false, error: "method_not_allowed" });

    const url = new URL(req.url);

    const period_type = (url.searchParams.get("period_type") ?? "daily").trim();
    const theme_id = (url.searchParams.get("theme_id") ?? "").trim();
    const level = (url.searchParams.get("level") ?? "").trim();
    const case_mode = (url.searchParams.get("case_mode") ?? "").trim();
    const duration_sec = Number(url.searchParams.get("duration_sec") ?? "0");
    const limitRaw = Number(url.searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

    if (!theme_id) return json(400, { ok: false, error: "theme_id_required" });
    if (!level) return json(400, { ok: false, error: "level_required" });
    if (!case_mode) return json(400, { ok: false, error: "case_mode_required" });
    if (!Number.isInteger(duration_sec) || duration_sec <= 0) {
      return json(400, { ok: false, error: "duration_sec_invalid" });
    }

    const period_start = periodStart(period_type);

    // NOTE: functions serve は SUPABASE_ env を弾くので PROJECT_URL / SERVICE_ROLE_KEY を使う
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json(500, { ok: false, error: "missing_env" });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await admin
      .from("leaderboard_public_view")
      .select(
        [
          "period_type",
          "period_start",
          "mode",
          "theme_id",
          "level",
          "case_mode",
          "duration_sec",
          "player_id",
          "best_score",
          "first_achieved_at",
          "display_name",
          "icon_url",
        ].join(","),
      )
      .eq("period_type", period_type)
      .eq("period_start", period_start)
      .eq("mode", "word")
      .eq("theme_id", theme_id)
      .eq("level", level)
      .eq("case_mode", case_mode)
      .eq("duration_sec", duration_sec)
      .order("best_score", { ascending: false })
      .order("first_achieved_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[leaderboard-get] query error:", error);
      return json(500, { ok: false, error: "query_failed" });
    }

    return json(200, {
      ok: true,
      period_type,
      period_start,
      mode: "word",
      theme_id,
      level,
      case_mode,
      duration_sec,
      items: data ?? [],
    });
  } catch (e) {
    return json(400, {
      ok: false,
      error: "bad_request",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});