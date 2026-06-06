import { NextResponse } from "next/server";
import type { GameType, Side } from "@/types/game";
import { createRoom } from "@/lib/server/rooms";
import { isGameSupported } from "@/lib/games";

/** POST /api/rooms { gameType, hostSide } -> { roomId, inviteToken } */
export async function POST(req: Request) {
  let body: { gameType?: GameType; hostSide?: Side };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const gameType = body.gameType;
  if (!gameType || !isGameSupported(gameType)) {
    return NextResponse.json({ error: "Loại cờ chưa được hỗ trợ." }, { status: 400 });
  }
  const hostSide: Side = body.hostSide === "second" ? "second" : "first";

  const room = createRoom(gameType, hostSide);
  return NextResponse.json({ roomId: room.id, inviteToken: room.inviteToken });
}
