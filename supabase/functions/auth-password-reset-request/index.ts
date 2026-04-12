import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type RequestBody = {
  username?: string;
  email?: string;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return username.trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 32;
}

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }
  const realIp = req.headers.get("x-real-ip");
  return realIp?.trim() ?? null;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
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
    new TextEncoder().encode(message),
  );

  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildResetMailHtml(resetUrl: string, username: string): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
      <h2 style="margin-bottom: 16px;">Typro パスワード再設定</h2>
      <p>${username} さん</p>
      <p>パスワード再設定のリクエストを受け付けました。</p>
      <p>下のボタンから、新しいパスワードを設定してください。</p>
      <p style="margin: 24px 0;">
        <a
          href="${resetUrl}"
          style="
            display:inline-block;
            padding:12px 20px;
            background:#38bdf8;
            color:#0f172a;
            text-decoration:none;
            border-radius:12px;
            font-weight:bold;
          "
        >
          パスワードを再設定する
        </a>
      </p>
      <p>このリンクの有効期限は60分です。</p>
      <p>心当たりがない場合は、このメールを無視してください。</p>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  try {
    const SUPABASE_URL = Deno.env.get("PROJECT_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
    const PASSWORD_RESET_URL_BASE = Deno.env.get("PASSWORD_RESET_URL_BASE");
    const PASSWORD_RESET_TOKEN_SECRET = Deno.env.get(
      "PASSWORD_RESET_TOKEN_SECRET",
    );

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !RESEND_API_KEY ||
      !RESEND_FROM_EMAIL ||
      !PASSWORD_RESET_URL_BASE ||
      !PASSWORD_RESET_TOKEN_SECRET
    ) {
      console.error("[auth-password-reset-request] missing env");
      return json(500, { ok: false, error: "server_misconfigured" });
    }

    const body = (await req.json()) as RequestBody;
    const username = normalizeUsername(body.username ?? "");
    const email = normalizeEmail(body.email ?? "");

    if (!isValidUsername(username) || !isValidEmail(email)) {
      // 存在有無を漏らさないため、ここも成功っぽく返す
      return json(200, {
        ok: true,
        message:
          "該当するアカウントが存在する場合、再設定メールを送信しました。",
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(RESEND_API_KEY);

    const { data: credentialRow, error: credentialError } = await supabase
      .from("credentials")
      .select("player_id, username")
      .eq("username", username)
      .maybeSingle();

    if (credentialError) {
      console.error(
        "[auth-password-reset-request] credential lookup error",
        credentialError,
      );
      return json(500, { ok: false, error: "credential_lookup_failed" });
    }

    if (!credentialRow) {
      return json(200, {
        ok: true,
        message:
          "該当するアカウントが存在する場合、再設定メールを送信しました。",
      });
    }

    const { data: emailRow, error: emailError } = await supabase
      .from("emails")
      .select("id, email, is_primary, player_id")
      .eq("player_id", credentialRow.player_id)
      .eq("is_primary", true)
      .eq("email", email)
      .maybeSingle();

    if (emailError) {
      console.error(
        "[auth-password-reset-request] email lookup error",
        emailError,
      );
      return json(500, { ok: false, error: "email_lookup_failed" });
    }

    if (!emailRow) {
      return json(200, {
        ok: true,
        message:
          "該当するアカウントが存在する場合、再設定メールを送信しました。",
      });
    }

    const rawToken = generateRawToken();
    const tokenHash = await hmacSha256Hex(
      PASSWORD_RESET_TOKEN_SECRET,
      rawToken,
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const requestedIp = getClientIp(req);
    const requestedUserAgent = req.headers.get("user-agent");

    // 先に同一 player の未使用 token を失効
    const { error: invalidateError } = await supabase
      .from("password_reset_tokens")
      .update({ used_at: now.toISOString() })
      .eq("player_id", credentialRow.player_id)
      .is("used_at", null);

    if (invalidateError) {
      console.error(
        "[auth-password-reset-request] invalidate old tokens failed",
        invalidateError,
      );
      return json(500, { ok: false, error: "invalidate_old_tokens_failed" });
    }

    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        player_id: credentialRow.player_id,
        email_id: emailRow.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        requested_ip: requestedIp,
        requested_user_agent: requestedUserAgent,
      });

    if (insertError) {
      console.error(
        "[auth-password-reset-request] token insert failed",
        insertError,
      );
      return json(500, { ok: false, error: "token_insert_failed" });
    }

    const resetUrl = `${PASSWORD_RESET_URL_BASE}?token=${encodeURIComponent(
      rawToken,
    )}`;

    const { error: mailError } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: emailRow.email,
      subject: "【Typro】パスワード再設定のご案内",
      html: buildResetMailHtml(resetUrl, credentialRow.username),
    });

    if (mailError) {
      console.error("[auth-password-reset-request] resend failed", mailError);
      return json(500, { ok: false, error: "mail_send_failed" });
    }

    return json(200, {
      ok: true,
      message: "該当するアカウントが存在する場合、再設定メールを送信しました。",
    });
  } catch (error) {
    console.error("[auth-password-reset-request] unexpected error", error);
    return json(500, { ok: false, error: "internal_server_error" });
  }
});
