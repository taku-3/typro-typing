import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.2.4/jwt/verify.ts";

type MatchLevel = "easy" | "normal" | "hard";
type MatchCaseMode = "lower" | "title" | "upper" | "mixed";
type MatchPlayerRole = "host" | "guest";
type ViewerRole = MatchPlayerRole | "outsider";
type MatchStatus = "waiting" | "canceled" | "playing" | "finished";

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

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== "GET") {
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

  const roomCode = new URL(req.url).searchParams.get("room_code")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
    return json(400, { ok: false, error: "invalid_room_code" });
  }

  const projectUrl = Deno.env.get("PROJECT_URL");
  const serviceKey = Deno.env.get("SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceKey) {
    return json(500, { ok: false, error: "missing_env" });
  }

  const admin = createClient(projectUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: room, error: roomErr } = await admin
    .from("matches")
    .select(
      "id, room_code, host_player_id, theme_id, level, case_mode, duration_sec, status, created_at",
    )
    .eq("room_code", roomCode)
    .maybeSingle<MatchRow>();

  if (roomErr) {
    console.error("[match-room-get] room lookup failed", roomErr);
    return json(500, { ok: false, error: "match_lookup_failed" });
  }

  if (!room) {
    return json(404, { ok: false, error: "room_not_found" });
  }

  const { data: members, error: membersErr } = await admin
    .from("match_players")
    .select("player_id, role, joined_at")
    .eq("match_id", room.id)
    .order("joined_at", { ascending: true });

  if (membersErr) {
    console.error("[match-room-get] member lookup failed", membersErr);
    return json(500, { ok: false, error: "member_lookup_failed" });
  }

  const memberRows = (members ?? []) as MatchPlayerRow[];
  const playerIds = [...new Set(memberRows.map((m) => m.player_id))];
  const playersById = new Map<
    string,
    { id: string; display_name: string | null; icon_url: string | null }
  >();

  if (playerIds.length > 0) {
    const { data: players, error: playersErr } = await admin
      .from("players")
      .select("id, display_name, icon_url")
      .in("id", playerIds);

    if (playersErr) {
      console.error("[match-room-get] player profile lookup failed", playersErr);
      return json(500, { ok: false, error: "player_lookup_failed" });
    }

    for (const player of players ?? []) {
      playersById.set(player.id, player);
    }
  }

  const playerEntry = memberRows.find((m) => m.player_id === playerId);
  const viewerRole: ViewerRole = playerEntry?.role ?? "outsider";
  const isFull = memberRows.length >= 2;
  const canJoin = room.status === "waiting" && !isFull && viewerRole === "outsider";

  return json(200, {
    ok: true,
    room: {
      id: room.id,
      roomCode: room.room_code,
      hostPlayerId: room.host_player_id,
      settings: {
        themeId: room.theme_id,
        level: room.level,
        caseMode: room.case_mode,
        durationSec: room.duration_sec,
      },
      status: room.status,
      createdAt: room.created_at,
      players: memberRows.map((member) => {
        const profile = playersById.get(member.player_id);
        return {
          playerId: member.player_id,
          role: member.role,
          joinedAt: member.joined_at,
          displayName: profile?.display_name ?? null,
          iconUrl: profile?.icon_url ?? null,
        };
      }),
    },
    viewerRole,
    isFull,
    canJoin,
  });
});
