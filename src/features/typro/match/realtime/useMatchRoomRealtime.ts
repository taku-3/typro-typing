import { useEffect, useMemo, useReducer, useRef } from "react";
import type { MatchRoomDetail } from "@/features/typro/match/types";
import {
  cleanupMatchRoomChannel,
  createMatchRoomChannel,
  type MatchRoomChannel,
} from "./channel";
import {
  initialMatchRoomRealtimeState,
  matchRoomRealtimeReducer,
} from "./reducer";
import type { MatchRealtimeEvent } from "./types";

const HEARTBEAT_INTERVAL_MS = 3000;
const HEARTBEAT_TIMEOUT_MS = 10000;

type UseMatchRoomRealtimeParams = {
  authToken: string | null;
  detail: MatchRoomDetail | null;
  myPlayerId: string;
};

function isRealtimeEvent(payload: unknown): payload is MatchRealtimeEvent {
  if (!payload || typeof payload !== "object") return false;

  const data = payload as Partial<MatchRealtimeEvent>;

  if (data.type === "player:ready") {
    return (
      typeof data.playerId === "string" &&
      (data.role === "host" || data.role === "guest") &&
      typeof data.sentAt === "number" &&
      typeof data.ready === "boolean"
    );
  }

  return (
    (data.type === "presence:join" ||
      data.type === "presence:leave" ||
      data.type === "heartbeat") &&
    typeof data.playerId === "string" &&
    (data.role === "host" || data.role === "guest") &&
    typeof data.sentAt === "number"
  );
}

function isParticipantMatchedEvent(
  event: MatchRealtimeEvent,
  identities: { hostPlayerId: string; guestPlayerId: string | null },
): boolean {
  if (event.role === "host") {
    return event.playerId === identities.hostPlayerId;
  }

  return (
    !!identities.guestPlayerId && event.playerId === identities.guestPlayerId
  );
}

export function useMatchRoomRealtime({
  authToken,
  detail,
  myPlayerId,
}: UseMatchRoomRealtimeParams) {
  const [state, dispatch] = useReducer(
    matchRoomRealtimeReducer,
    initialMatchRoomRealtimeState,
  );
  const channelRef = useRef<MatchRoomChannel | null>(null);

  const participantIdentities = useMemo(() => {
    if (!detail) {
      return null;
    }

    const host = detail.room.players.find((player) => player.role === "host");
    const guest = detail.room.players.find((player) => player.role === "guest");
    if (!host) {
      return null;
    }

    return {
      hostPlayerId: host.playerId,
      guestPlayerId: guest?.playerId ?? null,
    };
  }, [detail]);

  useEffect(() => {
    if (!detail || !myPlayerId) return;
    if (detail.viewerRole !== "host" && detail.viewerRole !== "guest") return;
    if (!participantIdentities) {
      dispatch({
        type: "set-error-message",
        message: "host情報が見つかりません。",
      });
      return;
    }

    dispatch({
      type: "init-members",
      myPlayerId,
      myRole: detail.viewerRole,
      hostPlayerId: participantIdentities.hostPlayerId,
      guestPlayerId: participantIdentities.guestPlayerId,
    });
  }, [detail, myPlayerId, participantIdentities]);

  useEffect(() => {
    if (!detail || !authToken || !myPlayerId || !participantIdentities) return;
    if (detail.viewerRole !== "host" && detail.viewerRole !== "guest") return;

    const myRole = detail.viewerRole;

    let disposed = false;
    let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutCheckIntervalId: ReturnType<typeof setInterval> | null = null;

    const broadcastEvent = (event: MatchRealtimeEvent) => {
      const channel = channelRef.current;
      if (!channel) return;

      channel.send({
        type: "broadcast",
        event: "match-event",
        payload: event,
      });
    };

    const sendHeartbeat = () => {
      const heartbeat: MatchRealtimeEvent = {
        type: "heartbeat",
        playerId: myPlayerId,
        role: myRole,
        sentAt: Date.now(),
      };
      dispatch({ type: "apply-event", event: heartbeat });
      broadcastEvent(heartbeat);
    };

    dispatch({ type: "set-channel-status", status: "subscribing" });
    dispatch({ type: "set-error-message", message: "" });

    try {
      channelRef.current = createMatchRoomChannel({
        roomCode: detail.room.roomCode,
        authToken,
      });
    } catch (error) {
      dispatch({ type: "set-channel-status", status: "error" });
      dispatch({
        type: "set-error-message",
        message:
          error instanceof Error
            ? error.message
            : "realtime初期化に失敗しました。",
      });
      return;
    }

    channelRef.current.onBroadcast(({ payload }) => {
      if (!isRealtimeEvent(payload)) {
        return;
      }

      if (!isParticipantMatchedEvent(payload, participantIdentities)) {
        console.warn("Ignored realtime event by participant mismatch", {
          role: payload.role,
          playerId: payload.playerId,
        });
        return;
      }

      dispatch({ type: "apply-event", event: payload });
    });

    channelRef.current.subscribe((status) => {
      if (disposed) return;

      if (status === "SUBSCRIBED") {
        dispatch({ type: "set-channel-status", status: "subscribed" });

        const joinEvent: MatchRealtimeEvent = {
          type: "presence:join",
          playerId: myPlayerId,
          role: myRole,
          sentAt: Date.now(),
        };

        dispatch({ type: "apply-event", event: joinEvent });
        broadcastEvent(joinEvent);

        sendHeartbeat();

        heartbeatIntervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

        timeoutCheckIntervalId = setInterval(() => {
          dispatch({
            type: "heartbeat-timeout-check",
            now: Date.now(),
            timeoutMs: HEARTBEAT_TIMEOUT_MS,
          });
        }, 1000);
        return;
      }

      if (
        status === "TIMED_OUT" ||
        status === "CHANNEL_ERROR" ||
        status === "CLOSED"
      ) {
        dispatch({
          type: "set-channel-status",
          status: status === "CLOSED" ? "closed" : "error",
        });

        if (status !== "CLOSED") {
          dispatch({
            type: "set-error-message",
            message: `Realtime接続エラー: ${status}`,
          });
        }
      }
    });

    return () => {
      disposed = true;

      if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
      if (timeoutCheckIntervalId) clearInterval(timeoutCheckIntervalId);

      const channel = channelRef.current;
      channelRef.current = null;

      if (channel) {
        const leaveEvent: MatchRealtimeEvent = {
          type: "presence:leave",
          playerId: myPlayerId,
          role: myRole,
          sentAt: Date.now(),
        };

        channel.send({
          type: "broadcast",
          event: "match-event",
          payload: leaveEvent,
        });

        cleanupMatchRoomChannel(channel);
      }

      dispatch({ type: "set-channel-status", status: "closed" });
    };
  }, [authToken, detail, myPlayerId, participantIdentities]);

  const toggleReady = () => {
    if (state.myRole !== "host" && state.myRole !== "guest") return;

    const nextReady = !state.selfReady;
    const event: MatchRealtimeEvent = {
      type: "player:ready",
      playerId: state.myPlayerId,
      role: state.myRole,
      ready: nextReady,
      sentAt: Date.now(),
    };

    dispatch({ type: "set-self-ready", ready: nextReady });
    dispatch({ type: "apply-event", event });

    const channel = channelRef.current;
    if (!channel) {
      dispatch({
        type: "set-error-message",
        message: "Realtime未接続のためReady同期できません。",
      });
      return;
    }

    channel.send({
      type: "broadcast",
      event: "match-event",
      payload: event,
    });
  };

  return {
    state,
    toggleReady,
    canSubscribe:
      !!detail &&
      (detail.viewerRole === "host" || detail.viewerRole === "guest"),
  };
}