export type MatchLevel = "easy" | "normal" | "hard";

export type MatchCaseMode = "lower" | "title" | "upper" | "mixed";

export type MatchRoomStatus = "waiting" | "canceled" | "playing" | "finished";

export type MatchPlayerRole = "host" | "guest";

export type MatchViewerRole = MatchPlayerRole | "outsider";

export type MatchPlayerSummary = {
  playerId: string;
  role: MatchPlayerRole;
  joinedAt: string;
  displayName: string | null;
  iconUrl: string | null;
};

export type MatchRoomSettings = {
  themeId: string;
  level: MatchLevel;
  caseMode: MatchCaseMode;
  durationSec: 60;
};

export type MatchRoomSummary = {
  id: string;
  roomCode: string;
  hostPlayerId: string;
  settings: MatchRoomSettings;
  status: MatchRoomStatus;
  createdAt: string;
  players: MatchPlayerSummary[];
};

export type MatchRoomDetail = {
  room: MatchRoomSummary;
  viewerRole: MatchViewerRole;
  canJoin: boolean;
  isFull: boolean;
};

export type CreateMatchRoomRequest = {
  themeId: string;
  level: MatchLevel;
  caseMode: MatchCaseMode;
};

export type CreateMatchRoomResponse =
  | {
      ok: true;
      room: MatchRoomSummary;
    }
  | {
      ok: false;
      error: string;
    };

export type JoinMatchRoomRequest = {
  roomCode: string;
};

export type JoinMatchRoomResponse =
  | {
      ok: true;
      room: MatchRoomSummary;
    }
  | {
      ok: false;
      error: string;
    };

export type GetMatchRoomParams = {
  roomCode: string;
};

export type GetMatchRoomResponse =
  | {
      ok: true;
      room: MatchRoomSummary;
      viewerRole: MatchViewerRole;
      canJoin: boolean;
      isFull: boolean;
    }
  | {
      ok: false;
      error: string;
    };
