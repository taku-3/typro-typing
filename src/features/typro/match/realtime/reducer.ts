import type { MatchPlayerRole } from "@/features/typro/match/types";
import type {
  MatchRealtimeMemberState,
  MatchRoomRealtimeAction,
  MatchRoomRealtimeState,
} from "./types";

const defaultMemberState: MatchRealtimeMemberState = {
  playerId: null,
  ready: false,
  hasJoinedRealtime: false,
  connectionStatus: "unknown",
  lastHeartbeatAt: null,
};

export const initialMatchRoomRealtimeState: MatchRoomRealtimeState = {
  channelStatus: "idle",
  myPlayerId: "",
  myRole: null,
  selfReady: false,
  host: { ...defaultMemberState },
  guest: { ...defaultMemberState },
  errorMessage: "",
};

function updateMemberByRole(
  state: MatchRoomRealtimeState,
  role: MatchPlayerRole,
  updater: (member: MatchRealtimeMemberState) => MatchRealtimeMemberState,
): MatchRoomRealtimeState {
  if (role === "host") {
    return { ...state, host: updater(state.host) };
  }

  return { ...state, guest: updater(state.guest) };
}

export function matchRoomRealtimeReducer(
  state: MatchRoomRealtimeState,
  action: MatchRoomRealtimeAction,
): MatchRoomRealtimeState {
  switch (action.type) {
    case "set-channel-status":
      return {
        ...state,
        channelStatus: action.status,
      };
    case "set-error-message":
      return {
        ...state,
        errorMessage: action.message,
      };
    case "init-members": {
      return {
        ...state,
        myPlayerId: action.myPlayerId,
        myRole: action.myRole,
        selfReady: action.myRole === "host" ? !!action.hostReady : !!action.guestReady,
        host: {
          ...defaultMemberState,
          playerId: action.hostPlayerId,
          ready: !!action.hostReady,
        },
        guest: {
          ...defaultMemberState,
          playerId: action.guestPlayerId,
          ready: !!action.guestReady,
        },
        errorMessage: "",
      };
    }
    case "apply-event": {
      const event = action.event;
      const targetMember = event.role === "host" ? state.host : state.guest;
      if (!targetMember.playerId || targetMember.playerId !== event.playerId) {
        return state;
      }

      const next = updateMemberByRole(state, event.role, (member) => {
        if (event.type === "player:ready") {
          return {
            ...member,
            ready: event.ready,
            hasJoinedRealtime: true,
            connectionStatus: "connected",
            lastHeartbeatAt: event.sentAt,
          };
        }

        if (event.type === "presence:leave") {
          return {
            ...member,
            hasJoinedRealtime: true,
            connectionStatus: "disconnected",
            lastHeartbeatAt: event.sentAt,
          };
        }

        return {
          ...member,
          hasJoinedRealtime: true,
          connectionStatus: "connected",
          lastHeartbeatAt: event.sentAt,
        };
      });

      if (event.playerId === state.myPlayerId && event.type === "player:ready") {
        return {
          ...next,
          selfReady: event.ready,
        };
      }

      return next;
    }
    case "set-self-ready": {
      if (!state.myRole) return state;

      const next = updateMemberByRole(state, state.myRole, (member) => ({
        ...member,
        ready: action.ready,
      }));

      return {
        ...next,
        selfReady: action.ready,
      };
    }
    case "heartbeat-timeout-check": {
      const check = (member: MatchRealtimeMemberState): MatchRealtimeMemberState => {
        if (!member.hasJoinedRealtime || !member.lastHeartbeatAt) {
          return member;
        }

        if (action.now - member.lastHeartbeatAt >= action.timeoutMs) {
          return {
            ...member,
            connectionStatus: "disconnected",
          };
        }

        return member;
      };

      return {
        ...state,
        host: check(state.host),
        guest: check(state.guest),
      };
    }
    default:
      return state;
  }
}