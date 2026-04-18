import type {
  CreateMatchRoomRequest,
  CreateMatchRoomResponse,
  GetMatchRoomParams,
  GetMatchRoomResponse,
  JoinMatchRoomRequest,
  JoinMatchRoomResponse,
} from "@/features/typro/match/types";

const FUNCTIONS_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL ??
  "http://127.0.0.1:54321/functions/v1";

export async function createMatchRoom(
  token: string,
  payload: CreateMatchRoomRequest,
): Promise<CreateMatchRoomResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/match-room-create`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as CreateMatchRoomResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error:
        data && data.ok === false
          ? data.error
          : `match-room-create failed (${res.status})`,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}

export async function joinMatchRoom(
  token: string,
  payload: JoinMatchRoomRequest,
): Promise<JoinMatchRoomResponse> {
  const res = await fetch(`${FUNCTIONS_BASE}/match-room-join`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as JoinMatchRoomResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error:
        data && data.ok === false
          ? data.error
          : `match-room-join failed (${res.status})`,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}

export async function getMatchRoom(
  token: string,
  params: GetMatchRoomParams,
): Promise<GetMatchRoomResponse> {
  const query = new URLSearchParams({
    room_code: params.roomCode,
  });

  const res = await fetch(`${FUNCTIONS_BASE}/match-room-get?${query.toString()}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as GetMatchRoomResponse | null;

  if (!res.ok) {
    return {
      ok: false,
      error:
        data && data.ok === false
          ? data.error
          : `match-room-get failed (${res.status})`,
    };
  }

  return data ?? { ok: false, error: "invalid_response" };
}