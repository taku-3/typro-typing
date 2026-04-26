import type { MatchPlayerRole } from "@/features/typro/match/types";

export type MatchRealtimeEvent =
  | {
      type: "presence:join";
      playerId: string;
      role: MatchPlayerRole;
      sentAt: number;
    }
  | {
      type: "presence:leave";
      playerId: string;
      role: MatchPlayerRole;
      sentAt: number;
    }
  | {
      type: "player:ready";
      playerId: string;
      role: MatchPlayerRole;
      ready: boolean;
      sentAt: number;
    }
  | {
      type: "heartbeat";
      playerId: string;
      role: MatchPlayerRole;
      sentAt: number;
    };

export type MatchRealtimeConnectionStatus = "connected" | "disconnected" | "unknown";

export type MatchRealtimeMemberState = {
  playerId: string | null;
  ready: boolean;
  hasJoinedRealtime: boolean;
  connectionStatus: MatchRealtimeConnectionStatus;
  lastHeartbeatAt: number | null;
};

export type MatchRealtimeChannelStatus =
  | "idle"
  | "subscribing"
  | "subscribed"
  | "closed"
  | "error";

export type MatchRoomRealtimeState = {
  channelStatus: MatchRealtimeChannelStatus;
  myPlayerId: string;
  myRole: MatchPlayerRole | null;
  selfReady: boolean;
  host: MatchRealtimeMemberState;
  guest: MatchRealtimeMemberState;
  errorMessage: string;
};

export type MatchRoomRealtimeAction =
  | {
      type: "set-channel-status";
      status: MatchRealtimeChannelStatus;
    }
  | {
      type: "set-error-message";
      message: string;
    }
  | {
      type: "init-members";
      myPlayerId: string;
      myRole: MatchPlayerRole;
      hostPlayerId: string;
      guestPlayerId: string | null;
      hostReady?: boolean;
      guestReady?: boolean;
    }
  | {
      type: "apply-event";
      event: MatchRealtimeEvent;
    }
  | {
      type: "set-self-ready";
      ready: boolean;
    }
  | {
      type: "heartbeat-timeout-check";
      now: number;
      timeoutMs: number;
    };