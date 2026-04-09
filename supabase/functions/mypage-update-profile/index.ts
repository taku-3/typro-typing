import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.2.4/jwt/verify.ts";

type Body = {
  displayName?: string;
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

async function verifyJwtAndGetSub(jwt: string): Promise<string> {
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) throw new Error("missing_jwt_secret");

  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(jwt, key, { issuer: "typro" });

  const sub = payload.sub;
  if (!sub || typeof sub !== "string") {
    throw new Error("invalid_sub");
  }

  return sub;
}

function sanitizeDisplayName(name: string) {
  const trimmed = name.trim();

  if (trimmed.length < 1 || trimmed.length > 16) {
    throw new Error("Invalid display name.");
  }

  if (
    /[^\p{L}\p{N}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}_\-\s]/u.test(
      trimmed,
    )
  ) {
    throw new Error("Invalid display name.");
  }

  return trimmed;
}

serve(async (req: Request) => {
  try {
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

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) {
      return json(400, { ok: false, error: "invalid_json" });
    }

    if (typeof body.displayName !== "string") {
      return json(400, { ok: false, error: "display_name_required" });
    }

    let displayName: string;
    try {
      displayName = sanitizeDisplayName(body.displayName);
    } catch (e) {
      return json(400, {
        ok: false,
        error: "invalid_display_name",
        detail: e instanceof Error ? e.message : String(e),
      });
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json(500, { ok: false, error: "missing_env" });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await admin
      .from("players")
      .update({
        display_name: displayName,
      })
      .eq("id", playerId)
      .select("id, display_name, icon_url")
      .single();

    if (error || !data) {
      console.error("[mypage-update-profile] update error:", error);
      return json(500, { ok: false, error: "update_failed" });
    }

    return json(200, {
      ok: true,
      profile: {
        player_id: data.id,
        display_name: data.display_name,
        icon_url: data.icon_url,
      },
    });
  } catch (e) {
    return json(400, {
      ok: false,
      error: "bad_request",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});