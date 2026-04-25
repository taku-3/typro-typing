declare module "@supabase/supabase-js" {
  export type RealtimeSubscribeStatus =
    | "SUBSCRIBED"
    | "TIMED_OUT"
    | "CHANNEL_ERROR"
    | "CLOSED";

  export type RealtimeChannel = {
    on: (
      type: "broadcast",
      filter: { event: string },
      callback: (payload: { payload: unknown }) => void,
    ) => RealtimeChannel;
    subscribe: (callback: (status: RealtimeSubscribeStatus) => void) => RealtimeChannel;
    send: (payload: { type: "broadcast"; event: string; payload: unknown }) => Promise<unknown>;
  };

  export type SupabaseClient = {
    realtime: {
      setAuth: (token: string) => void;
    };
    channel: (
      topic: string,
      params?: { config?: { broadcast?: { self?: boolean } } },
    ) => RealtimeChannel;
    removeChannel: (channel: RealtimeChannel) => Promise<unknown>;
  };

  export function createClient(
    url: string,
    key: string,
    options?: {
      auth?: {
        persistSession?: boolean;
        autoRefreshToken?: boolean;
      };
    },
  ): SupabaseClient;
}