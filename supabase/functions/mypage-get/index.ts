import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.2.4/jwt/verify.ts";

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

async function verifyJwtAndGetSub(jwt: string): Promise<string> {
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) throw new Error("missing_jwt_secret");

  const key = new TextEncoder().encode(secret);

  const { payload } = await jwtVerify(jwt, key, {
    issuer: "typro",
  });

  const sub = payload.sub;
  if (!sub || typeof sub !== "string") {
    throw new Error("invalid_sub");
  }

  return sub;
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

    if (req.method !== "GET") {
      return json(405, { ok: false, error: "method_not_allowed" });
    }

    const auth = req.headers.get("authorization") ?? "";
    if (!auth.toLowerCase().startsWith("bearer ")) {
      return json(401, { ok: false, error: "missing_bearer_token" });
    }

    const token = auth.slice("bearer ".length).trim();
    if (!token) {
      return json(401, { ok: false, error: "missing_token" });
    }

    let playerId: string;
    try {
      playerId = await verifyJwtAndGetSub(token);
    } catch {
      return json(401, { ok: false, error: "invalid_token" });
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json(500, { ok: false, error: "missing_env" });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const [
      { data: player, error: playerErr },
      { data: cred, error: credErr },
      { data: email, error: emailErr },
    ] = await Promise.all([
      admin
        .from("players")
        .select("id, display_name, icon_url")
        .eq("id", playerId)
        .maybeSingle(),
      admin
        .from("credentials")
        .select("username")
        .eq("player_id", playerId)
        .maybeSingle(),
      admin
        .from("emails")
        .select("email, is_primary, verified_at")
        .eq("player_id", playerId)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

    if (playerErr || credErr || emailErr) {
      console.error("[mypage-get] profile query error:", {
        playerErr,
        credErr,
        emailErr,
      });
      return json(500, { ok: false, error: "query_failed" });
    }

    let recentScores: {
      theme_id: string;
      level: string;
      case_mode: string;
      duration_sec: number;
      score: number;
      accuracy: number;
      speed_cps: number;
      ended_at: string;
      rank_status: string | null;
    }[] = [];

    const { data: scoresData, error: scoresErr } = await admin
      .from("scores")
      .select(
        "theme_id, level, case_mode, duration_sec, score, accuracy, speed_cps, ended_at, rank_status",
      )
      .eq("player_id", playerId)
      .eq("mode", "word")
      .order("ended_at", { ascending: false })
      .limit(5);

    if (scoresErr) {
      console.warn("[mypage-get] scores query skipped:", scoresErr);
    } else {
      recentScores = scoresData ?? [];
    }

    return json(200, {
      ok: true,
      profile: {
        player_id: playerId,
        username: cred?.username ?? "",
        display_name: player?.display_name ?? "",
        icon_url: player?.icon_url ?? null,
        email: email?.email ?? null,
        email_verified: !!email?.verified_at,
      },
      recent_plays: recentScores ?? [],
    });
  } catch (e) {
    return json(400, {
      ok: false,
      error: "bad_request",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});
