import { createClient } from "jsr:@supabase/supabase-js@2";
import { jwtVerify } from "npm:jose";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type AccountDeleteBody = {
  current_password?: string;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function verifyJwtAndGetPlayerId(
  token: string,
  jwtSecret: string,
): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);

  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });

  const sub = payload.sub;
  if (!sub || typeof sub !== "string") {
    throw new Error("invalid_token_sub");
  }

  return sub;
}

function base64UrlEncode(bytes: Uint8Array) {
  const str = String.fromCharCode(...bytes);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64DecodeToUint8Array(b64: string) {
  let s = b64.replace(/-/g, "+").replace(/_/g, "/");

  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad !== 0) throw new Error("Failed to decode base64");

  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyPasswordPbkdf2(plain: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 4) return false;

  const [alg, iterStr, saltB64, hashB64] = parts;
  if (alg !== "pbkdf2_sha256") return false;

  const iterations = Number(iterStr);
  if (
    !Number.isFinite(iterations) ||
    iterations < 50_000 ||
    iterations > 5_000_000
  ) {
    return false;
  }

  const salt = base64DecodeToUint8Array(saltB64);
  const expected = base64DecodeToUint8Array(hashB64);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(plain),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    expected.length * 8,
  );

  const actual = new Uint8Array(bits);
  return timingSafeEqual(actual, expected);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      ok: false,
      error: "method_not_allowed",
    });
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse(401, {
        ok: false,
        error: "missing_authorization_header",
      });
    }

    let body: AccountDeleteBody;

    try {
      body = (await req.json()) as AccountDeleteBody;
    } catch {
      return jsonResponse(400, {
        ok: false,
        error: "invalid_json",
      });
    }

    const currentPassword = body.current_password?.trim();

    if (!currentPassword) {
      return jsonResponse(400, {
        ok: false,
        error: "current_password_required",
      });
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
    const jwtSecret = Deno.env.get("JWT_SECRET") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
      return jsonResponse(500, {
        ok: false,
        error: "missing_env",
      });
    }

    const playerId = await verifyJwtAndGetPlayerId(token, jwtSecret);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: credential, error: credentialError } = await supabase
      .from("credentials")
      .select("player_id, password_hash")
      .eq("player_id", playerId)
      .single();

    if (credentialError) {
      console.error(
        "[auth-account-delete] credentials fetch error:",
        credentialError,
      );

      return jsonResponse(500, {
        ok: false,
        error: "credentials_fetch_failed",
      });
    }

    if (!credential) {
      return jsonResponse(404, {
        ok: false,
        error: "credentials_not_found",
      });
    }

    const passwordMatched = await verifyPasswordPbkdf2(
      currentPassword,
      credential.password_hash,
    );

    if (!passwordMatched) {
      return jsonResponse(401, {
        ok: false,
        error: "current_password_invalid",
      });
    }

    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);

    if (deleteError) {
      console.error("[auth-account-delete] player delete error:", deleteError);

      return jsonResponse(500, {
        ok: false,
        error: "account_delete_failed",
      });
    }

    return jsonResponse(200, {
      ok: true,
      message: "account_deleted",
    });
  } catch (error) {
    console.error("[auth-account-delete] unexpected error:", error);

    const message = error instanceof Error ? error.message : "unexpected_error";

    if (
      message === "invalid_token_sub" ||
      message === "ERR_JWS_INVALID" ||
      message === "ERR_JWT_EXPIRED" ||
      message === "ERR_JWT_CLAIM_VALIDATION_FAILED"
    ) {
      return jsonResponse(401, {
        ok: false,
        error: "invalid_token",
      });
    }

    return jsonResponse(500, {
      ok: false,
      error: "unexpected_error",
    });
  }
});
