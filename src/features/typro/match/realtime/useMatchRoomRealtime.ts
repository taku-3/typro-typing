import { useEffect, useMemo, useReducer, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { MatchRoomDetail } from "@/features/typro/match/types";
import { getRealtimeClient } from "@/lib/supabase/realtime-client";
import { MATCH_EVENT_NAME, buildMatchRoomChannelName } from "./channel";
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

  if (data.type === "match:start") {
    return (
      typeof data.playerId === "string" &&
      data.role === "host" &&
      typeof data.sentAt === "number" &&
      typeof data.startedAt === "number" &&
      Number.isFinite(data.startedAt)
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

  if (identities.guestPlayerId) {
    return event.playerId === identities.guestPlayerId;
  }

  // host側では、ルーム作成直後の detail に guest がまだ存在しない。
  // そのため guestPlayerId が null の場合は、初回の guest event を受け入れて reducer 側で guest を登録する。
  return event.playerId !== identities.hostPlayerId;
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

  const stateRef = useRef(state);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const participantIdentities = useMemo(() => {
    if (!detail) return null;

    const host = detail.room.players.find((player) => player.role === "host");
    const guest = detail.room.players.find((player) => player.role === "guest");

    if (!host) return null;

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

    const client = getRealtimeClient();
    const myRole = detail.viewerRole;

    let disposed = false;
    let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutCheckIntervalId: ReturnType<typeof setInterval> | null = null;

    dispatch({ type: "set-channel-status", status: "subscribing" });
    dispatch({ type: "set-error-message", message: "" });

    const channel = client.channel(
      buildMatchRoomChannelName(detail.room.roomCode),
      {
        config: {
          broadcast: {
            self: false,
          },
        },
      },
    );

    channelRef.current = channel;

    const broadcastEvent = (event: MatchRealtimeEvent) => {
      void channel.send({
        type: "broadcast",
        event: MATCH_EVENT_NAME,
        payload: event,
      });
    };

    const sendHeartbeat = () => {
      const heartbeatEvent: MatchRealtimeEvent = {
        type: "heartbeat",
        playerId: myPlayerId,
        role: myRole,
        sentAt: Date.now(),
      };

      dispatch({ type: "apply-event", event: heartbeatEvent });
      broadcastEvent(heartbeatEvent);
    };

    channel.on("broadcast", { event: MATCH_EVENT_NAME }, ({ payload }) => {
      if (!isRealtimeEvent(payload)) return;

      if (!isParticipantMatchedEvent(payload, participantIdentities)) {
        console.warn("Ignored realtime event by participant mismatch", {
          role: payload.role,
          playerId: payload.playerId,
        });
        return;
      }

      if (payload.type === "match:start") {
        const currentState = stateRef.current;
        const hostPlayerId = participantIdentities.hostPlayerId;
        const isValidStartEvent =
          payload.role === "host" &&
          payload.playerId === hostPlayerId &&
          currentState.startStatus === "idle" &&
          Number.isFinite(payload.startedAt);

        if (!isValidStartEvent) {
          console.warn("Ignored invalid match:start event", {
            role: payload.role,
            playerId: payload.playerId,
            startedAt: payload.startedAt,
            startStatus: currentState.startStatus,
          });
          return;
        }
      }

      dispatch({ type: "apply-event", event: payload });

      // 後から入ってきた相手に、自分の現在Ready状態を再送する。
      // broadcastは過去イベントを再生しないため、guestが後入りした場合に必要。
      if (payload.type === "presence:join" && payload.playerId !== myPlayerId) {
        const currentState = stateRef.current;
        const currentRole = currentState.myRole ?? myRole;
        const currentPlayerId = currentState.myPlayerId || myPlayerId;

        if (!currentRole || !currentPlayerId) return;

        const readySyncEvent: MatchRealtimeEvent = {
          type: "player:ready",
          playerId: currentPlayerId,
          role: currentRole,
          ready: currentState.selfReady,
          sentAt: Date.now(),
        };

        dispatch({ type: "apply-event", event: readySyncEvent });
        broadcastEvent(readySyncEvent);
      }
    });

    channel.subscribe((status) => {
      console.log("[match realtime subscribe status]", status);

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

      const currentChannel = channelRef.current;
      channelRef.current = null;

      if (currentChannel) {
        const leaveEvent: MatchRealtimeEvent = {
          type: "presence:leave",
          playerId: myPlayerId,
          role: myRole,
          sentAt: Date.now(),
        };

        void currentChannel.send({
          type: "broadcast",
          event: MATCH_EVENT_NAME,
          payload: leaveEvent,
        });

        void client.removeChannel(currentChannel);
      }

      dispatch({ type: "set-channel-status", status: "closed" });
    };
  }, [authToken, detail, myPlayerId, participantIdentities]);

  const toggleReady = () => {
    const role =
      state.myRole ??
      (detail?.viewerRole === "host" || detail?.viewerRole === "guest"
        ? detail.viewerRole
        : null);

    const playerId = state.myPlayerId || myPlayerId;

    if (!role || !playerId) return;

    const nextReady = !state.selfReady;

    const readyEvent: MatchRealtimeEvent = {
      type: "player:ready",
      playerId,
      role,
      ready: nextReady,
      sentAt: Date.now(),
    };

    dispatch({ type: "set-self-ready", ready: nextReady });
    dispatch({ type: "apply-event", event: readyEvent });

    if (!channelRef.current) {
      dispatch({
        type: "set-error-message",
        message: "Realtime未接続のためReady同期できません。",
      });
      return;
    }

    void channelRef.current.send({
      type: "broadcast",
      event: MATCH_EVENT_NAME,
      payload: readyEvent,
    });
  };

  const canStart =
    state.myRole === "host" &&
    state.host.playerId === myPlayerId &&
    state.host.ready &&
    state.guest.ready &&
    state.host.connectionStatus === "connected" &&
    state.guest.connectionStatus === "connected" &&
    state.startStatus === "idle" &&
    state.channelStatus === "subscribed";

  useEffect(() => {
    if (state.startStatus !== "starting" || state.startedAt === null) {
      return;
    }

    const delayMs = state.startedAt - Date.now();
    if (delayMs <= 0) {
      dispatch({ type: "mark-started" });
      return;
    }

    const timeoutId = setTimeout(() => {
      dispatch({ type: "mark-started" });
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [state.startStatus, state.startedAt]);

  const startMatch = () => {
    if (state.myRole !== "host") {
      dispatch({
        type: "set-start-error-message",
        message: "hostのみ開始できます。",
      });
      return;
    }

    if (!canStart) {
      dispatch({
        type: "set-start-error-message",
        message: "開始条件を満たしていません。",
      });
      return;
    }

    const channel = channelRef.current;
    if (!channel) {
      dispatch({
        type: "set-start-error-message",
        message: "Realtime未接続のため開始同期できません。",
      });
      return;
    }

    const startedAt = Date.now() + 3000;

    if (!state.host.playerId || state.host.playerId !== myPlayerId) {
      dispatch({
        type: "set-start-error-message",
        message: "host情報を確認できないため開始できません。",
      });
      return;
    }

    const startEvent: MatchRealtimeEvent = {
      type: "match:start",
      playerId: state.host.playerId,
      role: "host",
      sentAt: Date.now(),
      startedAt,
    };

    dispatch({ type: "apply-event", event: startEvent });
    dispatch({ type: "set-start-error-message", message: null });

    void channel.send({
      type: "broadcast",
      event: MATCH_EVENT_NAME,
      payload: startEvent,
    });
  };

  return {
    state,
    toggleReady,
    startMatch,
    canStart,
    canSubscribe:
      !!detail &&
      (detail.viewerRole === "host" || detail.viewerRole === "guest"),
  };
}
