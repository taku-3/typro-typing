import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  buildPasswordResetMail,
  buildPasswordResetUrl,
  generatePasswordResetToken,
  getPasswordResetExpiresMinutes,
  getPasswordResetExpiryDate,
  sha256Hex,
} from "../_shared/password-reset.ts";

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

type AccountRow = {
  player_id: string;
  username: string;
  email_id: string;
  email: string;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  try {
    const body = (await req.json()) as RequestBody;
    const username = body.username?.trim() ?? "";
    const email = body.email?.trim() ?? "";

    if (!username || !email) {
      return successResponse();
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[auth-password-reset-request] Missing Supabase env");
      return json(500, { ok: false, error: "server_misconfigured" });
    }

    if (!resendApiKey || !resendFromEmail) {
      console.error("[auth-password-reset-request] Missing Resend env");
      return json(500, { ok: false, error: "server_misconfigured" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const account = await findAccountByUsernameAndPrimaryEmail(
      supabase,
      username,
      email,
    );

    if (!account) {
      return successResponse();
    }

    const plainToken = generatePasswordResetToken();
    const tokenHash = await sha256Hex(plainToken);
    const expiresAt = getPasswordResetExpiryDate();
    const expiresMinutes = getPasswordResetExpiresMinutes();
    const resetUrl = buildPasswordResetUrl(plainToken);

    const requestedIp = getClientIp(req);
    const userAgent = req.headers.get("user-agent");

    const invalidateRes = await supabase
      .from("password_reset_tokens")
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("player_id", account.player_id)
      .is("used_at", null);

    if (invalidateRes.error) {
      console.error(
        "[auth-password-reset-request] failed to invalidate old tokens",
        invalidateRes.error,
      );
      return json(500, { ok: false, error: "failed_to_prepare_reset" });
    }

    const insertRes = await supabase.from("password_reset_tokens").insert({
      player_id: account.player_id,
      email_id: account.email_id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      requested_ip: requestedIp,
      user_agent: userAgent,
    });

    if (insertRes.error) {
      console.error(
        "[auth-password-reset-request] failed to insert token",
        insertRes.error,
      );
      return json(500, { ok: false, error: "failed_to_prepare_reset" });
    }

    const mail = buildPasswordResetMail({
      username: account.username,
      resetUrl,
      expiresMinutes,
    });

    const idempotencyKey = `password-reset-request:${account.player_id}:${tokenHash}`;

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [account.email],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });

    if (!sendRes.ok) {
      const resendErrorText = await sendRes.text();
      console.error(
        "[auth-password-reset-request] resend send failed",
        sendRes.status,
        resendErrorText,
      );
      return json(500, { ok: false, error: "failed_to_send_reset_email" });
    }

    return successResponse();
  } catch (error) {
    console.error("[auth-password-reset-request] unexpected error", error);
    return json(500, { ok: false, error: "internal_server_error" });
  }
});

async function findAccountByUsernameAndPrimaryEmail(
  supabase: ReturnType<typeof createClient>,
  username: string,
  email: string,
): Promise<AccountRow | null> {
  const credentialRes = await supabase
    .from("credentials")
    .select("player_id, username")
    .eq("username", username)
    .maybeSingle();

  if (credentialRes.error) {
    console.error(
      "[auth-password-reset-request] credential lookup error",
      credentialRes.error,
    );
    return null;
  }

  if (!credentialRes.data) {
    return null;
  }

  const emailRes = await supabase
    .from("emails")
    .select("id, email, is_primary, player_id")
    .eq("player_id", credentialRes.data.player_id)
    .eq("email", email)
    .eq("is_primary", true)
    .maybeSingle();

  if (emailRes.error) {
    console.error(
      "[auth-password-reset-request] email lookup error",
      emailRes.error,
    );
    return null;
  }

  if (!emailRes.data) {
    return null;
  }

  return {
    player_id: credentialRes.data.player_id,
    username: credentialRes.data.username,
    email_id: emailRes.data.id,
    email: emailRes.data.email,
  };
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

function successResponse() {
  return json(200, {
    ok: true,
    message:
      "If the account information is valid, a password reset email has been sent.",
  });
}
