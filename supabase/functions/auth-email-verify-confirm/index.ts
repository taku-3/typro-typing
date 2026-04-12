import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type RequestBody = {
  token?: string;
};

type VerificationTokenRow = {
  id: string;
  player_id: string;
  email_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  try {
    const body = (await req.json().catch(() => null)) as RequestBody | null;
    if (!body) {
      return json(400, { ok: false, error: "invalid_json" });
    }

    const token = body.token?.trim() ?? "";
    if (!token) {
      return json(400, { ok: false, error: "missing_required_fields" });
    }

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY");
    const tokenSecret = Deno.env.get("PASSWORD_RESET_TOKEN_SECRET");

    if (!supabaseUrl || !supabaseServiceRoleKey || !tokenSecret) {
      console.error("[auth-email-verify-confirm] missing env");
      return json(500, { ok: false, error: "server_misconfigured" });
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const tokenHash = await hmacSha256Hex(tokenSecret, token);

    const tokenRes = await admin
      .from("email_verification_tokens")
      .select("id, player_id, email_id, token_hash, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenRes.error) {
      console.error(
        "[auth-email-verify-confirm] token lookup error",
        tokenRes.error,
      );
      return json(500, { ok: false, error: "server_error" });
    }

    const verificationToken = tokenRes.data as VerificationTokenRow | null;

    if (!verificationToken) {
      return json(400, { ok: false, error: "invalid_or_expired_token" });
    }

    if (verificationToken.used_at) {
      return json(400, { ok: false, error: "invalid_or_expired_token" });
    }

    const now = new Date();
    const expiresAt = new Date(verificationToken.expires_at);

    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= now.getTime()
    ) {
      return json(400, { ok: false, error: "invalid_or_expired_token" });
    }

    const { data: emailRow, error: emailLookupError } = await admin
      .from("emails")
      .select("id, player_id, verified_at")
      .eq("id", verificationToken.email_id)
      .maybeSingle();

    if (emailLookupError) {
      console.error(
        "[auth-email-verify-confirm] email lookup error",
        emailLookupError,
      );
      return json(500, { ok: false, error: "server_error" });
    }

    if (!emailRow) {
      return json(400, { ok: false, error: "invalid_or_expired_token" });
    }

    if (emailRow.verified_at) {
      return json(200, {
        ok: true,
        already_verified: true,
        message: "このメールアドレスはすでに認証済みです。",
      });
    }

    const usedIp = getClientIp(req);
    const usedUserAgent = req.headers.get("user-agent");

    const verifyEmailRes = await admin
      .from("emails")
      .update({
        verified_at: now.toISOString(),
      })
      .eq("id", verificationToken.email_id)
      .is("verified_at", null);

    if (verifyEmailRes.error) {
      console.error(
        "[auth-email-verify-confirm] email verify update error",
        verifyEmailRes.error,
      );
      return json(500, { ok: false, error: "failed_to_verify_email" });
    }

    const markUsedRes = await admin
      .from("email_verification_tokens")
      .update({
        used_at: now.toISOString(),
        used_ip: usedIp,
        used_user_agent: usedUserAgent,
      })
      .eq("id", verificationToken.id)
      .is("used_at", null);

    if (markUsedRes.error) {
      console.error(
        "[auth-email-verify-confirm] mark used error",
        markUsedRes.error,
      );
      return json(500, { ok: false, error: "failed_to_verify_email" });
    }

    const invalidateOthersRes = await admin
      .from("email_verification_tokens")
      .update({
        used_at: now.toISOString(),
      })
      .eq("player_id", verificationToken.player_id)
      .eq("email_id", verificationToken.email_id)
      .is("used_at", null);

    if (invalidateOthersRes.error) {
      console.error(
        "[auth-email-verify-confirm] invalidate others error",
        invalidateOthersRes.error,
      );
      return json(500, { ok: false, error: "failed_to_verify_email" });
    }

    return json(200, {
      ok: true,
      already_verified: false,
      message: "メール認証が完了しました。",
    });
  } catch (error) {
    console.error("[auth-email-verify-confirm] unexpected error", error);
    return json(500, { ok: false, error: "internal_server_error" });
  }
});