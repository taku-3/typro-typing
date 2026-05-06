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
  startStatus: "idle",
  startedAt: null,
  startErrorMessage: null,
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

    case "set-start-error-message":
      return {
        ...state,
        startErrorMessage: action.message,
      };

    case "init-members": {
      return {
        ...state,
        myPlayerId: action.myPlayerId,
        myRole: action.myRole,
        selfReady:
          action.myRole === "host" ? !!action.hostReady : !!action.guestReady,
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
        startStatus: "idle",
        startedAt: null,
        startErrorMessage: null,
      };
    }

    case "apply-event": {
      const event = action.event;
      if (event.type === "match:start") {
        if (event.role !== "host") return state;
        if (!state.host.playerId || event.playerId !== state.host.playerId) return state;
        if (!Number.isFinite(event.startedAt)) return state;
        if (state.startStatus !== "idle") return state;

        return {
          ...state,
          startStatus: "starting",
          startedAt: event.startedAt,
          startErrorMessage: null,
        };
      }

      const targetMember = event.role === "host" ? state.host : state.guest;

      // 既に別playerIdが入っている場合は、なりすまし/別参加者のイベントとして無視する。
      if (targetMember.playerId && targetMember.playerId !== event.playerId) {
        return state;
      }

      // hostは必ずDB/detail由来で初期化されている前提。
      // host playerId が無い状態でhostイベントを受け入れると危険なので無視する。
      if (event.role === "host" && !targetMember.playerId) {
        return state;
      }

      const next = updateMemberByRole(state, event.role, (member) => {
        if (event.type === "player:ready") {
          return {
            ...member,
            playerId: event.playerId,
            ready: event.ready,
            hasJoinedRealtime: true,
            connectionStatus: "connected",
            lastHeartbeatAt: event.sentAt,
          };
        }

        if (event.type === "presence:leave") {
          return {
            ...member,
            playerId: event.playerId,
            hasJoinedRealtime: true,
            connectionStatus: "disconnected",
            lastHeartbeatAt: event.sentAt,
          };
        }

        return {
          ...member,
          playerId: event.playerId,
          hasJoinedRealtime: true,
          connectionStatus: "connected",
          lastHeartbeatAt: event.sentAt,
        };
      });

      if (
        event.playerId === state.myPlayerId &&
        event.type === "player:ready"
      ) {
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
        playerId: state.myPlayerId || member.playerId,
        ready: action.ready,
      }));

      return {
        ...next,
        selfReady: action.ready,
      };
    }

    case "mark-started": {
      if (state.startStatus !== "starting") return state;

      return {
        ...state,
        startStatus: "started",
      };
    }

    case "heartbeat-timeout-check": {
      const check = (
        member: MatchRealtimeMemberState,
      ): MatchRealtimeMemberState => {
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