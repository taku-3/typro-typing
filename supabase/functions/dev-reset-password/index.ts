// supabase/functions/dev-reset-password/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Body = {
  username: string;
  password: string;
  // 任意：true のとき parental_consent を true に更新（テスト用）
  set_parental_consent_true?: boolean;
};

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function base64UrlEncode(bytes: Uint8Array) {
  const str = String.fromCharCode(...bytes);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hashPasswordPbkdf2(plain: string, iterations = 150_000) {
  // auth-login が期待する stored 形式:
  // pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>
  if (!Number.isFinite(iterations) || iterations < 50_000 || iterations > 5_000_000) {
    throw new Error("iterations out of range");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));

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
    32 * 8, // 32 bytes
  );

  const hash = new Uint8Array(bits);

  const saltB64 = base64UrlEncode(salt);
  const hashB64 = base64UrlEncode(hash);

  return `pbkdf2_sha256$${iterations}$${saltB64}$${hashB64}`;
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

serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type, x-admin-secret",
          "cache-control": "no-store",
        },
      });
    }

    if (req.method !== "POST") return json(405, { ok: false, error: "Method Not Allowed" });

    // ✅ ローカル専用ガード：本番で誤って動かさない
    const typroEnv = Deno.env.get("TYPRO_ENV") ?? "local";
    if (typroEnv !== "local") return json(403, { ok: false, error: "forbidden" });

    // ✅ 管理用ヘッダ（簡易認証）
    const expectedAdminSecret = Deno.env.get("DEV_ADMIN_SECRET") ?? "";
    const provided = req.headers.get("x-admin-secret") ?? "";
    if (!expectedAdminSecret || provided !== expectedAdminSecret) {
      return json(403, { ok: false, error: "forbidden" });
    }

    // ✅ Supabase接続（SUPABASE_ で始まる env は functions serve が弾くのでこの名前を使う）
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { ok: false, error: "missing_env" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return json(400, { ok: false, error: "Invalid JSON" });

    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    const setConsent = body.set_parental_consent_true ?? false;

    validateUsername(username);
    validatePassword(password);

    // まず credentials が存在するか確認（なければ 404）
    const { data: cred, error: credErr } = await admin
      .from("credentials")
      .select("player_id")
      .eq("username", username)
      .maybeSingle();

    if (credErr) {
      console.error("credentials select error:", credErr);
      return json(500, { ok: false, error: "Server error" });
    }
    if (!cred) {
      return json(404, { ok: false, error: "User not found" });
    }

    const password_hash = await hashPasswordPbkdf2(password, 150_000);

    // password_hash 更新
    const { error: updErr } = await admin
      .from("credentials")
      .update({ password_hash })
      .eq("username", username);

    if (updErr) {
      console.error("credentials update error:", updErr);
      return json(500, { ok: false, error: "update_failed" });
    }

    // 任意：consents を true に（ランキング検証が楽）
    if (setConsent) {
      const { error: consentErr } = await admin
        .from("consents")
        .upsert(
          { player_id: cred.player_id, parental_consent: true, consented_at: new Date().toISOString() },
          { onConflict: "player_id" },
        );

      if (consentErr) {
        console.error("consents upsert error:", consentErr);
        return json(500, { ok: false, error: "consent_update_failed" });
      }
    }

    return json(200, {
      ok: true,
      username,
      player_id: cred.player_id,
      updated_password_hash_format: "pbkdf2_sha256$<iterations>$<salt_b64>$<hash_b64>",
      parental_consent_set_true: setConsent,
    });
  } catch (e) {
    console.error("dev-reset-password error:", e);
    return json(400, {
      ok: false,
      error: "Bad Request",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});