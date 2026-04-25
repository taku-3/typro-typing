export type MatchRoomChannelSubscribeStatus =
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

type BroadcastHandler = (params: { payload: unknown }) => void;
type SubscribeHandler = (status: MatchRoomChannelSubscribeStatus) => void;

type PhoenixMessage = {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
  ref: string;
  join_ref?: string;
};

function toRealtimeWebSocketUrl(params: {
  supabaseUrl: string;
  anonKey: string;
}): string {
  const base = new URL(params.supabaseUrl);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = "/socket/websocket";
  base.searchParams.set("apikey", params.anonKey);
  base.searchParams.set("vsn", "1.0.0");
  return base.toString();
}

export function getRealtimeRequiredEnv(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Realtime環境変数が不足しています。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。",
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

export function buildMatchRoomChannelName(roomCode: string): string {
  return `realtime:typro:match:room:${roomCode}`;
}

export class MatchRoomChannel {
  private readonly topic: string;
  private readonly authToken: string;
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;
  private socket: WebSocket | null = null;
  private joinRef = "1";
  private msgRef = 2;
  private broadcastHandler: BroadcastHandler | null = null;
  private pingIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(params: {
    topic: string;
    authToken: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
  }) {
    this.topic = params.topic;
    this.authToken = params.authToken;
    this.supabaseUrl = params.supabaseUrl;
    this.supabaseAnonKey = params.supabaseAnonKey;
  }

  onBroadcast(handler: BroadcastHandler): void {
    this.broadcastHandler = handler;
  }

  subscribe(handler: SubscribeHandler): void {
    const url = toRealtimeWebSocketUrl({
      supabaseUrl: this.supabaseUrl,
      anonKey: this.supabaseAnonKey,
    });

    console.log("[realtime ws url]", url);

    this.socket = new WebSocket(url);

    const joinTimeoutId = setTimeout(() => {
      handler("TIMED_OUT");
    }, 10000);

    this.socket.onopen = () => {
      console.log("[realtime ws open]", this.topic);

      this.sendRaw({
        topic: this.topic,
        event: "phx_join",
        payload: {
          config: {
            broadcast: { ack: false, self: false },
            presence: { enabled: false },
            private: false,
          },
        },
        ref: this.joinRef,
        join_ref: this.joinRef,
      });

      this.pingIntervalId = setInterval(() => {
        this.sendRaw({
          topic: "phoenix",
          event: "heartbeat",
          payload: {},
          ref: String(this.msgRef++),
          join_ref: this.joinRef,
        });
      }, 30000);
    };

    this.socket.onmessage = (event) => {
      console.log("[realtime raw message]", event.data);

      // ここから下は既存処理のままでOK
    };

    this.socket.onerror = (event) => {
      console.error("[realtime ws error]", event);
      clearTimeout(joinTimeoutId);
      handler("CHANNEL_ERROR");
    };

    this.socket.onclose = (event) => {
      console.warn("[realtime ws close]", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });

      clearTimeout(joinTimeoutId);
      handler("CLOSED");
    };
  }

  send(payload: {
    type: "broadcast";
    event: "match-event";
    payload: unknown;
  }): void {
    this.sendRaw({
      topic: this.topic,
      event: "broadcast",
      payload,
      ref: String(this.msgRef++),
      join_ref: this.joinRef,
    });
  }

  unsubscribe(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendRaw({
        topic: this.topic,
        event: "phx_leave",
        payload: {},
        ref: String(this.msgRef++),
        join_ref: this.joinRef,
      });
    }

    this.socket?.close();
    this.socket = null;
  }

  private sendRaw(message: PhoenixMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }
}

export function createMatchRoomChannel(params: {
  roomCode: string;
  authToken: string;
}): MatchRoomChannel {
  const env = getRealtimeRequiredEnv();

  return new MatchRoomChannel({
    topic: buildMatchRoomChannelName(params.roomCode),
    authToken: params.authToken,
    supabaseUrl: env.supabaseUrl,
    supabaseAnonKey: env.supabaseAnonKey,
  });
}

export function cleanupMatchRoomChannel(channel: MatchRoomChannel): void {
  channel.unsubscribe();
}