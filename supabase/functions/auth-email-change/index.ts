import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  new_email?: string;
  current_password?: string;
};

type JwtPayload = {
  iss?: string;
  sub?: string;
  username?: string;
  iat?: number;
  exp?: number;
};

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
  });
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function base64UrlEncode(bytes: Uint8Array) {
  const str = String.fromCharCode(...bytes);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeJson(obj: unknown) {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)));
}

function base64DecodeToUint8Array(b64: string) {
  let s = b64.replace(/-/g, "+").replace(/_/g, "/");

  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad !== 0) throw new Error("Failed to decode base64");

  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyJwtHS256(
  token: string,
  secret: string,
): Promise<JwtPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [headerB64, payloadB64, sigB64] = parts;
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sig = base64DecodeToUint8Array(sigB64);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sig,
    new TextEncoder().encode(data),
  );

  if (!ok) {
    throw new Error("Invalid token signature");
  }

  const payloadJson = new TextDecoder().decode(
    base64DecodeToUint8Array(payloadB64),
  );
  const payload = JSON.parse(payloadJson) as JwtPayload;

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token payload");
  }

  if (payload.exp && Date.now() / 1000 >= payload.exp) {
    throw new Error("Token expired");
  }

  return payload;
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function validateEmail(email: string) {
  if (email.length < 5 || email.length > 254) {
    throw new Error("Invalid email.");
  }

  // まずは実用的な最小バリデーション
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!ok) {
    throw new Error("Invalid email.");
  }
}

function validatePassword(password: string) {
  if (password.length < 8 || password.length > 64) {
    throw new Error("Invalid password.");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const jwtSecret = Deno.env.get("JWT_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
      return json(500, { ok: false, error: "Server misconfigured" });
    }

    const token = getBearerToken(req);
    if (!token) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    let payload: JwtPayload;
    try {
      payload = await verifyJwtHS256(token, jwtSecret);
    } catch {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const playerId = payload.sub;
    if (!playerId) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) {
      return json(400, { ok: false, error: "Invalid JSON" });
    }

    const newEmail = normalizeEmail(body.new_email ?? "");
    const currentPassword = body.current_password ?? "";

    validateEmail(newEmail);
    validatePassword(currentPassword);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 現在の primary メール取得
    const { data: currentPrimary, error: currentPrimaryErr } = await admin
      .from("emails")
      .select("id, email")
      .eq("player_id", playerId)
      .eq("is_primary", true)
      .maybeSingle();

    if (currentPrimaryErr) {
      console.error("emails current primary select error:", currentPrimaryErr);
      return json(500, { ok: false, error: "Server error" });
    }

    const isFirstEmail = !currentPrimary;

    if (!isFirstEmail && normalizeEmail(currentPrimary.email) === newEmail) {
      return json(400, { ok: false, error: "Email is unchanged" });
    }

    // 現在パスワード確認
    const { data: cred, error: credErr } = await admin
      .from("credentials")
      .select("player_id, password_hash")
      .eq("player_id", playerId)
      .maybeSingle();

    if (credErr) {
      console.error("credentials select error:", credErr);
      return json(500, { ok: false, error: "Server error" });
    }

    if (!cred) {
      return json(404, { ok: false, error: "Credential not found" });
    }

    const passwordOk = await verifyPasswordPbkdf2(
      currentPassword,
      cred.password_hash,
    );
    if (!passwordOk) {
      return json(401, { ok: false, error: "Current password is incorrect" });
    }

    // 初回メール登録（primary メール未登録）
    if (isFirstEmail) {
      const { error: insertErr } = await admin.from("emails").insert({
        player_id: playerId,
        email: newEmail,
        is_primary: true,
        verified_at: null,
      });

      if (insertErr) {
        console.error("emails first insert error:", insertErr);
        return json(500, { ok: false, error: "Failed to register email" });
      }

      return json(200, {
        ok: true,
        email: newEmail,
        is_primary: true,
        is_new: true,
      });
    }

    // 既存メールあり → primary 切替
    const { data: switched, error: switchErr } = await admin.rpc(
      "set_primary_email_for_player",
      {
        p_player_id: playerId,
        p_email: newEmail,
      },
    );

    if (switchErr) {
      console.error("set_primary_email_for_player error:", switchErr);
      return json(500, { ok: false, error: "Failed to update email" });
    }

    const updated = Array.isArray(switched) ? switched[0] : switched;

    return json(200, {
      ok: true,
      email: updated?.out_email ?? updated?.email ?? newEmail,
      is_primary: true,
      is_new: false,
    });
  } catch (e) {
    console.error("auth-email-change error:", e);
    return json(400, {
      ok: false,
      error: "Bad Request",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});
