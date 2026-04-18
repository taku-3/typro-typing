import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v5.2.4/jwt/verify.ts";

type MatchLevel = "easy" | "normal" | "hard";
type MatchCaseMode = "lower" | "title" | "upper" | "mixed";
type MatchPlayerRole = "host" | "guest";
type MatchStatus = "waiting" | "canceled" | "playing" | "finished";

type JoinBody = {
  roomCode?: unknown;
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

async function loadRoomDetail(
  admin: ReturnType<typeof createClient>,
  roomCode: string,
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
    .eq("room_code", roomCode)
    .maybeSingle<MatchRow>();

  if (roomError || !room) return null;

  const { data: memberRows, error: memberError } = await admin
    .from("match_players")
    .select("player_id, role, joined_at")
    .eq("match_id", room.id)
    .order("joined_at", { ascending: true });

  if (memberError) return null;

  const playerIds = [...new Set((memberRows ?? []).map((m) => m.player_id))];
  const playersById = new Map<
    string,
    { id: string; display_name: string | null; icon_url: string | null }
  >();

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

  let body: JoinBody;
  try {
    body = (await req.json()) as JoinBody;
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const roomCode = typeof body.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";
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

  const { data: player, error: playerErr } = await admin
    .from("players")
    .select("id")
    .eq("id", playerId)
    .maybeSingle<{ id: string }>();

  if (playerErr) {
    console.error("[match-room-join] player lookup failed", playerErr);
    return json(500, { ok: false, error: "player_lookup_failed" });
  }

  if (!player) {
    return json(404, { ok: false, error: "player_not_found" });
  }

  const { data: room, error: roomError } = await admin
    .from("matches")
    .select(
      "id, room_code, host_player_id, theme_id, level, case_mode, duration_sec, status, created_at",
    )
    .eq("room_code", roomCode)
    .maybeSingle<MatchRow>();

  if (roomError) {
    console.error("[match-room-join] room lookup failed", roomError);
    return json(500, { ok: false, error: "match_lookup_failed" });
  }

  if (!room) {
    return json(404, { ok: false, error: "room_not_found" });
  }

  if (room.status !== "waiting") {
    return json(409, { ok: false, error: "room_not_waiting" });
  }

  const { data: existingMember, error: existingErr } = await admin
    .from("match_players")
    .select("id")
    .eq("match_id", room.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existingErr) {
    console.error("[match-room-join] existing member check failed", existingErr);
    return json(500, { ok: false, error: "member_lookup_failed" });
  }

  if (!existingMember) {
    const { count, error: countErr } = await admin
      .from("match_players")
      .select("id", { head: true, count: "exact" })
      .eq("match_id", room.id);

    if (countErr) {
      console.error("[match-room-join] member count failed", countErr);
      return json(500, { ok: false, error: "member_count_failed" });
    }

    if ((count ?? 0) >= 2) {
      return json(409, { ok: false, error: "room_full" });
    }

    const { error: joinError } = await admin.from("match_players").insert({
      match_id: room.id,
      player_id: playerId,
      role: "guest",
    });

    if (joinError) {
      if (joinError.code === "23505") {
        // 23505 は「同一 player の重複参加」または「guest 枠(role=guest)の競合」の可能性がある。
        // まず同一 player 再参加かを確認し、違う場合は room_full として扱う。
        const { data: alreadyJoined } = await admin
          .from("match_players")
          .select("id")
          .eq("match_id", room.id)
          .eq("player_id", playerId)
          .maybeSingle();

        if (!alreadyJoined) {
          console.warn("[match-room-join] guest slot conflict; room_full", {
            matchId: room.id,
            playerId,
          });
          return json(409, { ok: false, error: "room_full" });
        }
      } else {
        console.error("[match-room-join] join insert failed", joinError);
        return json(500, { ok: false, error: "guest_insert_failed" });
      }
    }
  }

  const detail = await loadRoomDetail(admin, roomCode);
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
