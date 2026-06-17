import { NextResponse } from "next/server";
import type { GameType, Side } from "@/types/game";
import { createRoom, listPublicRooms } from "@/lib/server/rooms";
import { isGameSupported } from "@/lib/games";

// Đọc kho phòng in-memory mỗi lần gọi — không cache.
export const dynamic = "force-dynamic";

/** GET /api/rooms -> { rooms } : danh sách phòng công khai đang chờ đối thủ. */
export async function GET() {
  return NextResponse.json({ rooms: listPublicRooms() });
}

/** POST /api/rooms { gameType, hostSide, isPublic } -> { roomId, inviteToken } */
export async function POST(req: Request) {
  let body: { gameType?: GameType; hostSide?: Side; isPublic?: boolean };
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
  const isPublic = body.isPublic === true;

  const room = createRoom(gameType, hostSide, isPublic);
  return NextResponse.json({ roomId: room.id, inviteToken: room.inviteToken });
}
