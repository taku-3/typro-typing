import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  username: string;
  password: string;
  displayName?: string;
  birthYear?: number;
  birthMonth?: number;
  parentalConsent: boolean;
  iconUrl?: string;
  email?: string;
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

function validateEmail(email: string) {
  if (email.length > 254) throw new Error("Invalid email.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email.");
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

function b64(bytes: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function randomSaltBytes(len = 16) {
  const salt = new Uint8Array(len);
  crypto.getRandomValues(salt);
  return salt;
}

async function hashPasswordPbkdf2(plain: string) {
  const iterations = 210_000;
  const salt = randomSaltBytes(16);

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
    256,
  );

  const saltB64 = b64(salt.buffer);
  const hashB64 = b64(bits);

  return `pbkdf2_sha256$${iterations}$${saltB64}$${hashB64}`;
}

serve(async (req: Request) => {
  console.log("auth-signup invoked");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }

    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { ok: false, error: "Server misconfigured" });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return json(400, { ok: false, error: "Invalid JSON" });

    // username は一意運用前提なので小文字化して扱う
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    const requestedParentalConsent = !!body.parentalConsent;
    const email = (body.email ?? "").trim().toLowerCase();

    validateUsername(username);
    validatePassword(password);

    if (email) {
      validateEmail(email);
    }

    const displayName = body.displayName
      ? sanitizeDisplayName(body.displayName)
      : username;

    const birthYear = body.birthYear ?? null;
    const birthMonth = body.birthMonth ?? null;

    if (birthYear !== null && (birthYear < 1900 || birthYear > 2100)) {
      return json(400, { ok: false, error: "Invalid birth year." });
    }

    if (birthMonth !== null && (birthMonth < 1 || birthMonth > 12)) {
      return json(400, { ok: false, error: "Invalid birth month." });
    }

    // ✅ 送信時の最終的な生年月から成人判定
    const isAdult = isAdultFromBirthYearMonth(birthYear, birthMonth);

    // ✅ 未成年のみ保護者同意必須
    if (!isAdult && !requestedParentalConsent) {
      return json(400, { ok: false, error: "Parental consent required." });
    }

    // ✅ 保存する値はサーバー側で最終決定
    const parentalConsent = isAdult ? false : true;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1) username 重複チェック
    const { data: existingCred, error: existingCredErr } = await admin
      .from("credentials")
      .select("player_id")
      .eq("username", username)
      .maybeSingle();

    if (existingCredErr) {
      console.error("credentials duplicate check error:", existingCredErr);
      return json(500, { ok: false, error: "Server error" });
    }

    if (existingCred) {
      return json(409, { ok: false, error: "username_already_taken" });
    }

    // 2) players 作成
    const { data: player, error: playerErr } = await admin
      .from("players")
      .insert({
        kind: "registered",
        display_name: displayName,
        icon_url: body.iconUrl ?? null,
      })
      .select("id")
      .single();

    if (playerErr) {
      console.error("players insert error:", playerErr);
      return json(500, {
        ok: false,
        error: `players_insert_failed: ${playerErr.message}`,
        detail: playerErr,
      });
    }

    if (!player) {
      console.error("players insert: player is null");
      return json(500, { ok: false, error: "Failed to create user." });
    }

    // 3) credentials 作成
    const passwordHash = await hashPasswordPbkdf2(password);

    const { error: credErr } = await admin.from("credentials").insert({
      player_id: player.id,
      username,
      password_hash: passwordHash,
      birth_year: birthYear,
      birth_month: birthMonth,
    });

    if (credErr) {
      console.error("credentials insert error:", credErr);

      await admin.from("players").delete().eq("id", player.id);

      if (credErr.code === "23505") {
        return json(409, { ok: false, error: "username_already_taken" });
      }

      return json(500, {
        ok: false,
        error: `credentials_insert_failed: ${credErr.message}`,
        detail: credErr,
      });
    }

    // 4) consents 作成
    const nowIso = new Date().toISOString();

    const { error: consentErr } = await admin.from("consents").insert({
      player_id: player.id,
      terms_version: 1,
      privacy_version: 1,
      terms_accepted_at: nowIso,
      privacy_accepted_at: nowIso,
      parental_consent: parentalConsent,
      parental_consent_at: parentalConsent ? nowIso : null,
      updated_at: nowIso,
    });

    if (consentErr) {
      console.error("consents insert error:", consentErr);

      await admin.from("credentials").delete().eq("player_id", player.id);
      await admin.from("players").delete().eq("id", player.id);

      return json(500, {
        ok: false,
        error: `consents_insert_failed: ${consentErr.message}`,
        detail: consentErr,
      });
    }

    // 5) email があれば emails に保存
    if (email) {
      const { error: emailErr } = await admin.from("emails").insert({
        player_id: player.id,
        email,
        is_primary: true,
        created_at: nowIso,
      });

      if (emailErr) {
        console.error("emails insert error:", emailErr);

        await admin.from("consents").delete().eq("player_id", player.id);
        await admin.from("credentials").delete().eq("player_id", player.id);
        await admin.from("players").delete().eq("id", player.id);

        return json(500, {
          ok: false,
          error: `emails_insert_failed: ${emailErr.message}`,
          detail: emailErr,
        });
      }
    }

    return json(201, {
      ok: true,
      playerId: player.id,
      emailSaved: !!email,
      isAdult,
    });
  } catch (e) {
    console.error("auth-signup uncaught error:", e);
    return json(400, {
      ok: false,
      error: "Bad Request",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});
