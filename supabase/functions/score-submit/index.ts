import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.2.4/jwt/verify.ts";

async function verifyJwtAndGetSub(jwt: string): Promise<string> {
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) throw new Error("JWT_SECRET is missing");

  const key = new TextEncoder().encode(secret);

  const { payload } = await jwtVerify(jwt, key, {
    algorithms: ["HS256"],
    issuer: "typro",
  });

  const sub = payload.sub;
  if (typeof sub !== "string" || sub.length === 0) {
    throw new Error("sub missing");
  }
  return sub;
}

type Body = {
  theme_id: string;
  level: string;
  case_mode: string;
  duration_sec: number;
  score: number;
  accuracy: number;
  speed_cps: number;
  typed_chars: number;
  mistyped_count: number;
};

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type, authorization",
        "cache-control": "no-store",
      },
    });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const auth = req.headers.get("authorization") ?? "";
  console.log("[score-submit] auth header:", auth);

  if (!auth.toLowerCase().startsWith("bearer ")) {
    return json(401, { ok: false, error: "missing_bearer_token" });
  }

  const jwt = auth.slice("bearer ".length).trim();
  if (!jwt) {
    return json(401, { ok: false, error: "missing_token" });
  }

  const parts = jwt.split(".");
  console.log("[score-submit] jwt parts count:", parts.length);
  if (parts.length !== 3) {
    return json(401, { ok: false, error: "invalid_token_format" });
  }

  let playerId: string;
  try {
    playerId = await verifyJwtAndGetSub(jwt);
    console.log("[score-submit] verified sub:", playerId);
  } catch (e) {
    console.error("[score-submit] verify failed:", e);
    return json(401, { ok: false, error: "invalid_token" });
  }

  const projectUrl = Deno.env.get("PROJECT_URL");
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceKey) {
    return json(500, { ok: false, error: "missing_supabase_env" });
  }

  const supabase = createClient(projectUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let body: Body;
  try {
    console.log("[score-submit] before req.json()");
    body = (await req.json()) as Body;
    console.log("[score-submit] body:", body);
  } catch (e) {
    console.error("[score-submit] invalid json:", e);
    return json(400, { ok: false, error: "invalid_json" });
  }

  console.log("[score-submit] before rpc submit_word_score");
  const { data, error } = await supabase.rpc("submit_word_score", {
    p_player_id: playerId,
    p_theme_id: body.theme_id,
    p_level: body.level,
    p_case_mode: body.case_mode,
    p_duration_sec: body.duration_sec,
    p_score: body.score,
    p_accuracy: body.accuracy,
    p_speed_cps: body.speed_cps,
    p_typed_chars: body.typed_chars,
    p_mistyped_count: body.mistyped_count,
  });
  console.log("[score-submit] after rpc submit_word_score", { data, error });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();

    if (msg.includes("parental_consent_required")) {
      return json(403, { ok: false, error: "parental_consent_required" });
    }

    if (msg.includes("player_mismatch")) {
      return json(403, { ok: false, error: "player_mismatch" });
    }

    return json(500, {
      ok: false,
      error: "rpc_failed",
      detail: error.message,
    });
  }

  return json(200, data ?? { ok: true });
});