import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import {
  hashPasswordPbkdf2,
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
  token?: string;
  new_password?: string;
};

type ResetTokenRow = {
  id: string;
  player_id: string;
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

function validatePassword(pw: string) {
  if (pw.length < 8 || pw.length > 64) {
    throw new Error("Invalid password.");
  }
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
    const newPassword = body.new_password ?? "";

    if (!token || !newPassword) {
      return json(400, { ok: false, error: "missing_required_fields" });
    }

    try {
      validatePassword(newPassword);
    } catch {
      return json(400, { ok: false, error: "invalid_password" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("[auth-password-reset-confirm] Missing Supabase env");
      return json(500, { ok: false, error: "server_misconfigured" });
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const tokenHash = await sha256Hex(token);

    const tokenRes = await admin
      .from("password_reset_tokens")
      .select("id, player_id, token_hash, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenRes.error) {
      console.error(
        "[auth-password-reset-confirm] token lookup error",
        tokenRes.error,
      );
      return json(500, { ok: false, error: "server_error" });
    }

    const resetToken = tokenRes.data as ResetTokenRow | null;

    if (!resetToken) {
      return json(400, { ok: false, error: "invalid_or_expired_token" });
    }

    if (resetToken.used_at) {
      return json(400, { ok: false, error: "invalid_or_expired_token" });
    }

    const now = new Date();
    const expiresAt = new Date(resetToken.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
      return json(400, { ok: false, error: "invalid_or_expired_token" });
    }

    const passwordHash = await hashPasswordPbkdf2(newPassword);
    const usedIp = getClientIp(req);

    const updatePasswordRes = await admin
      .from("credentials")
      .update({
        password_hash: passwordHash,
      })
      .eq("player_id", resetToken.player_id);

    if (updatePasswordRes.error) {
      console.error(
        "[auth-password-reset-confirm] password update error",
        updatePasswordRes.error,
      );
      return json(500, { ok: false, error: "failed_to_reset_password" });
    }

    const markUsedRes = await admin
      .from("password_reset_tokens")
      .update({
        used_at: now.toISOString(),
        used_ip: usedIp,
      })
      .eq("id", resetToken.id)
      .is("used_at", null);

    if (markUsedRes.error) {
      console.error(
        "[auth-password-reset-confirm] mark used error",
        markUsedRes.error,
      );
      return json(500, { ok: false, error: "failed_to_reset_password" });
    }

    const invalidateOthersRes = await admin
      .from("password_reset_tokens")
      .update({
        used_at: now.toISOString(),
      })
      .eq("player_id", resetToken.player_id)
      .is("used_at", null);

    if (invalidateOthersRes.error) {
      console.error(
        "[auth-password-reset-confirm] invalidate others error",
        invalidateOthersRes.error,
      );
      return json(500, { ok: false, error: "failed_to_reset_password" });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error("[auth-password-reset-confirm] unexpected error", error);
    return json(500, { ok: false, error: "internal_server_error" });
  }
});

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