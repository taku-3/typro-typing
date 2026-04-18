import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.2.4/jwt/verify.ts";

type MatchLevel = "easy" | "normal" | "hard";
type MatchCaseMode = "lower" | "title" | "upper" | "mixed";
type MatchPlayerRole = "host" | "guest";
type MatchStatus = "waiting" | "canceled" | "playing" | "finished";

type CreateBody = {
  themeId?: unknown;
  level?: unknown;
  caseMode?: unknown;
};

type MatchRow = {
  id: string;
  room_code: string;
  host_player_id: string;
  theme_id: string;
  level: MatchLevel;
  case_mode: MatchCaseMode;
  duration_sec: number;
  status: MatchStatus;
  created_at: string;
};

type MatchPlayerRow = {
  player_id: string;
  role: MatchPlayerRole;
  joined_at: string;
};

type PlayerRow = {
  id: string;
  display_name: string | null;
  icon_url: string | null;
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization",
  "cache-control": "no-store",
};

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
    },
  });
}

async function verifyJwtAndGetSub(token: string): Promise<string> {
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) throw new Error("missing_jwt_secret");

  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key, {
    algorithms: ["HS256"],
    issuer: "typro",
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("invalid_sub");
  }

  return payload.sub;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function parseAndValidateBody(raw: CreateBody): {
  themeId: string;
  level: MatchLevel;
  caseMode: MatchCaseMode;
} | null {
  const themeId = typeof raw.themeId === "string" ? raw.themeId.trim() : "";
  const level = raw.level;
  const caseMode = raw.caseMode;

  if (!themeId) return null;
  if (level !== "easy" && level !== "normal" && level !== "hard") return null;
  if (
    caseMode !== "lower" &&
    caseMode !== "title" &&
    caseMode !== "upper" &&
    caseMode !== "mixed"
  ) {
    return null;
  }

  return { themeId, level, caseMode };
}

async function loadRoomDetail(
  admin: ReturnType<typeof createClient>,
  matchId: string,
): Promise<
  | {
      room: MatchRow;
      players: Array<{
        playerId: string;
        role: MatchPlayerRole;
        joinedAt: string;
        displayName: string | null;
        iconUrl: string | null;
      }>;
    }
  | null
> {
  const { data: room, error: roomError } = await admin
    .from("matches")
    .select(
      "id, room_code, host_player_id, theme_id, level, case_mode, duration_sec, status, created_at",
    )
    .eq("id", matchId)
    .maybeSingle<MatchRow>();

  if (roomError || !room) return null;

  const { data: memberRows, error: memberError } = await admin
    .from("match_players")
    .select("player_id, role, joined_at")
    .eq("match_id", room.id)
    .order("joined_at", { ascending: true });

  if (memberError) return null;

  const playerIds = [...new Set((memberRows ?? []).map((m) => m.player_id))];
  const playersById = new Map<string, PlayerRow>();

  if (playerIds.length > 0) {
    const { data: playerRows, error: playerError } = await admin
      .from("players")
      .select("id, display_name, icon_url")
      .in("id", playerIds);

    if (playerError) return null;

    for (const player of playerRows ?? []) {
      playersById.set(player.id, player);
    }
  }

  return {
    room,
    players: (memberRows ?? []).map((member: MatchPlayerRow) => {
      const profile = playersById.get(member.player_id);
      return {
        playerId: member.player_id,
        role: member.role,
        joinedAt: member.joined_at,
        displayName: profile?.display_name ?? null,
        iconUrl: profile?.icon_url ?? null,
      };
    }),
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    return json(401, { ok: false, error: "missing_bearer_token" });
  }

  const token = auth.slice("bearer ".length).trim();
  if (!token) {
    return json(401, { ok: false, error: "missing_token" });
  }

  let playerId = "";
  try {
    playerId = await verifyJwtAndGetSub(token);
  } catch {
    return json(401, { ok: false, error: "invalid_token" });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const parsed = parseAndValidateBody(body);
  if (!parsed) {
    return json(400, { ok: false, error: "invalid_payload" });
  }

  const projectUrl = Deno.env.get("PROJECT_URL");
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceKey) {
    return json(500, { ok: false, error: "missing_env" });
  }

  const admin = createClient(projectUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: player, error: playerErr } = await admin
    .from("players")
    .select("id")
    .eq("id", playerId)
    .maybeSingle<{ id: string }>();

  if (playerErr) {
    console.error("[match-room-create] player lookup failed", playerErr);
    return json(500, { ok: false, error: "player_lookup_failed" });
  }

  if (!player) {
    return json(404, { ok: false, error: "player_not_found" });
  }

  let createdMatch: MatchRow | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = generateRoomCode();
    const { data, error } = await admin
      .from("matches")
      .insert({
        room_code: roomCode,
        host_player_id: playerId,
        theme_id: parsed.themeId,
        level: parsed.level,
        case_mode: parsed.caseMode,
        duration_sec: 60,
        status: "waiting",
      })
      .select(
        "id, room_code, host_player_id, theme_id, level, case_mode, duration_sec, status, created_at",
      )
      .single<MatchRow>();

    if (!error && data) {
      createdMatch = data;
      break;
    }

    const isRoomCodeUniqueConflict =
      error?.code === "23505" &&
      (error?.constraint === "matches_room_code_key" ||
        (error?.message ?? "").includes("room_code"));

    // room_code unique 衝突のみ再試行対象にする。
    if (!isRoomCodeUniqueConflict) {
      console.error("[match-room-create] matches insert failed", error);
      return json(500, { ok: false, error: "match_insert_failed" });
    }

    console.warn("[match-room-create] room_code unique conflict; retrying", {
      attempt: attempt + 1,
      constraint: error?.constraint,
    });
  }

  if (!createdMatch) {
    return json(409, { ok: false, error: "room_code_generation_failed" });
  }

  const { error: hostInsertError } = await admin.from("match_players").insert({
    match_id: createdMatch.id,
    player_id: playerId,
    role: "host",
  });

  if (hostInsertError) {
    console.error("[match-room-create] host player insert failed", hostInsertError);
    await admin.from("matches").delete().eq("id", createdMatch.id);
    return json(500, { ok: false, error: "host_insert_failed" });
  }

  const detail = await loadRoomDetail(admin, createdMatch.id);
  if (!detail) {
    return json(500, { ok: false, error: "room_summary_failed" });
  }

  return json(200, {
    ok: true,
    room: {
      id: detail.room.id,
      roomCode: detail.room.room_code,
      hostPlayerId: detail.room.host_player_id,
      settings: {
        themeId: detail.room.theme_id,
        level: detail.room.level,
        caseMode: detail.room.case_mode,
        durationSec: detail.room.duration_sec,
      },
      status: detail.room.status,
      createdAt: detail.room.created_at,
      players: detail.players,
    },
  });
});
