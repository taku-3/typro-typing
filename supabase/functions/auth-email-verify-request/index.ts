import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type JwtPayload = {
  sub?: string;
  username?: string;
  exp?: number;
};

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
  });
}

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return null;
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  const [scheme, token] = auth.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");

    const jsonText = atob(payload);
    return JSON.parse(jsonText) as JwtPayload;
  } catch {
    return null;
  }
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

function buildVerifyUrl(baseUrl: string, token: string): string {
  const url = new URL("/verify-email", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function buildVerifyMailHtml(verifyUrl: string, username: string): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
      <h2 style="margin-bottom: 16px;">Typro メール認証</h2>
      <p>${username} さん</p>
      <p>メールアドレス認証のリクエストを受け付けました。</p>
      <p>下のボタンからメール認証を完了してください。</p>
      <p style="margin: 24px 0;">
        <a
          href="${verifyUrl}"
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
          メールアドレスを認証する
        </a>
      </p>
      <p>このリンクの有効期限は24時間です。</p>
      <p>心当たりがない場合は、このメールを無視してください。</p>
    </div>
  `;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const appBaseUrl =
      Deno.env.get("APP_BASE_URL") ?? "http://localhost:3000";
    const tokenSecret = Deno.env.get("PASSWORD_RESET_TOKEN_SECRET");

    if (
      !supabaseUrl ||
      !supabaseServiceRoleKey ||
      !resendApiKey ||
      !resendFromEmail ||
      !tokenSecret
    ) {
      console.error("[auth-email-verify-request] missing env");
      return json(500, { ok: false, error: "server_misconfigured" });
    }

    const bearerToken = getBearerToken(req);
    if (!bearerToken) {
      return json(401, { ok: false, error: "missing_authorization" });
    }

    const jwtPayload = decodeJwtPayload(bearerToken);
    const playerId = jwtPayload?.sub?.trim() ?? "";

    if (!playerId) {
      return json(401, { ok: false, error: "invalid_token" });
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const resend = new Resend(resendApiKey);

    const { data: credentialRow, error: credentialError } = await admin
      .from("credentials")
      .select("player_id, username")
      .eq("player_id", playerId)
      .maybeSingle();

    if (credentialError) {
      console.error(
        "[auth-email-verify-request] credential lookup error",
        credentialError,
      );
      return json(500, { ok: false, error: "credential_lookup_failed" });
    }

    if (!credentialRow) {
      return json(404, { ok: false, error: "player_not_found" });
    }

    const { data: emailRow, error: emailError } = await admin
      .from("emails")
      .select("id, email, is_primary, verified_at")
      .eq("player_id", playerId)
      .eq("is_primary", true)
      .maybeSingle();

    if (emailError) {
      console.error(
        "[auth-email-verify-request] email lookup error",
        emailError,
      );
      return json(500, { ok: false, error: "email_lookup_failed" });
    }

    if (!emailRow) {
      return json(400, { ok: false, error: "primary_email_not_found" });
    }

    if (emailRow.verified_at) {
      return json(200, {
        ok: true,
        already_verified: true,
        message: "このメールアドレスはすでに認証済みです。",
      });
    }

    const now = new Date();
    const requestedIp = getClientIp(req);
    const requestedUserAgent = req.headers.get("user-agent");

    const rawToken = generateRawToken();
    const tokenHash = await hmacSha256Hex(tokenSecret, rawToken);
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { error: invalidateError } = await admin
      .from("email_verification_tokens")
      .update({ used_at: now.toISOString() })
      .eq("player_id", playerId)
      .eq("email_id", emailRow.id)
      .is("used_at", null);

    if (invalidateError) {
      console.error(
        "[auth-email-verify-request] invalidate old tokens failed",
        invalidateError,
      );
      return json(500, { ok: false, error: "invalidate_old_tokens_failed" });
    }

    const { error: insertError } = await admin
      .from("email_verification_tokens")
      .insert({
        player_id: playerId,
        email_id: emailRow.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        requested_ip: requestedIp,
        requested_user_agent: requestedUserAgent,
      });

    if (insertError) {
      console.error(
        "[auth-email-verify-request] token insert failed",
        insertError,
      );
      return json(500, { ok: false, error: "token_insert_failed" });
    }

    const verifyUrl = buildVerifyUrl(appBaseUrl, rawToken);

    const { error: mailError } = await resend.emails.send({
      from: resendFromEmail,
      to: emailRow.email,
      subject: "【Typro】メール認証のご案内",
      html: buildVerifyMailHtml(verifyUrl, credentialRow.username),
    });

    if (mailError) {
      console.error("[auth-email-verify-request] resend failed", mailError);
      return json(500, { ok: false, error: "mail_send_failed" });
    }

    return json(200, {
      ok: true,
      already_verified: false,
      message: "認証メールを送信しました。",
    });
  } catch (error) {
    console.error("[auth-email-verify-request] unexpected error", error);
    return json(500, { ok: false, error: "internal_server_error" });
  }
});