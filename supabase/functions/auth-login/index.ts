import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  username: string;
  password: string;
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

function validateUsername(username: string) {
  if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
    throw new Error("Invalid username.");
  }
}

function validatePassword(pw: string) {
  if (pw.length < 8 || pw.length > 64) {
    throw new Error("Invalid password.");
  }
}

function isAdultFromBirthYearMonth(
  birthYear: number | null | undefined,
  birthMonth: number | null | undefined,
  now = new Date(),
) {
  if (!birthYear || !birthMonth) return false;

  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1;

  let age = todayYear - birthYear;
  if (todayMonth < birthMonth) age -= 1;

  return age >= 18;
}

function base64UrlEncode(bytes: Uint8Array) {
  // btoa expects "binary string"
  const str = String.fromCharCode(...bytes);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeJson(obj: unknown) {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)));
}

function base64DecodeToUint8Array(b64: string) {
  // base64url -> base64 変換
  let s = b64.replace(/-/g, "+").replace(/_/g, "/");

  // パディング復元（atob は base64 の長さが 4 の倍数必要）
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

async function verifyPasswordPbkdf2(plain: string, stored: string) {
  // stored: pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>
  const parts = stored.split("$");
  if (parts.length !== 4) return false;
  const [alg, iterStr, saltB64, hashB64] = parts;
  if (alg !== "pbkdf2_sha256") return false;

  const iterations = Number(iterStr);
  if (
    !Number.isFinite(iterations) ||
    iterations < 50_000 ||
    iterations > 5_000_000
  )
    return false;

  const salt = base64DecodeToUint8Array(saltB64);
  const expected = base64DecodeToUint8Array(hashB64);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(plain),
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

async function signJwtHS256(payload: Record<string, unknown>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const headerB64 = base64UrlEncodeJson(header);
  const payloadB64 = base64UrlEncodeJson(payload);
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  const sigB64 = base64UrlEncode(new Uint8Array(sig));
  return `${data}.${sigB64}`;
}

serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST")
      return json(405, { ok: false, error: "Method Not Allowed" });

    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const jwtSecret = Deno.env.get("JWT_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !jwtSecret) {
      return json(500, { ok: false, error: "Server misconfigured" });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return json(400, { ok: false, error: "Invalid JSON" });

    const username = (body.username ?? "").trim();
    const password = body.password ?? "";

    validateUsername(username);
    validatePassword(password);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // credentials 取得
    const { data: cred, error: credErr } = await admin
      .from("credentials")
      .select("player_id, password_hash, birth_year, birth_month")
      .eq("username", username)
      .maybeSingle();

    if (credErr) {
      console.error("credentials select error:", credErr);
      return json(500, { ok: false, error: "Server error" });
    }
    if (!cred) {
      // ユーザー名存在しない
      return json(401, { ok: false, error: "Invalid credentials." });
    }

    const ok = await verifyPasswordPbkdf2(password, cred.password_hash);
    if (!ok) {
      return json(401, { ok: false, error: "Invalid credentials." });
    }

    // parental consent チェック（必須方針）
    const isAdult = isAdultFromBirthYearMonth(
      cred.birth_year,
      cred.birth_month,
    );

    const { data: consent, error: consentErr } = await admin
      .from("consents")
      .select("parental_consent")
      .eq("player_id", cred.player_id)
      .maybeSingle();

    if (consentErr) {
      console.error("consents select error:", consentErr);
      return json(500, { ok: false, error: "Server error" });
    }

    const hasRequiredConsent = isAdult || !!consent?.parental_consent;
    if (!hasRequiredConsent) {
      return json(403, { ok: false, error: "Parental consent required." });
    }

    // player 情報（表示用）
    const { data: player, error: playerErr } = await admin
      .from("players")
      .select("id, display_name, icon_url")
      .eq("id", cred.player_id)
      .maybeSingle();

    if (playerErr) {
      console.error("players select error:", playerErr);
      return json(500, { ok: false, error: "Server error" });
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24 * 7; // 7日（好みで調整OK）

    // Typro独自JWT（ゲームサーバ用）
    const token = await signJwtHS256(
      {
        iss: "typro",
        sub: cred.player_id,
        username,
        iat: now,
        exp,
      },
      jwtSecret,
    );

    return json(200, {
      ok: true,
      token,
      player: {
        id: cred.player_id,
        displayName: player?.display_name ?? username,
        iconUrl: player?.icon_url ?? null,
      },
    });
  } catch (e) {
    console.error("auth-login error:", e);
    return json(400, {
      ok: false,
      error: "Bad Request",
      detail: e instanceof Error ? e.message : String(e), // ローカルデバッグ用
    });
  }
});
