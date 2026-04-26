export const MATCH_EVENT_NAME = "match-event";

export function buildMatchRoomChannelName(roomCode: string): string {
  return `typro:match:room:${roomCode}`;
}