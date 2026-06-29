import { NextResponse } from "next/server";
import type { GameType, Side } from "@/types/game";
import type { TimeControl } from "@/types/room";
import { createRoom, listPublicRooms } from "@/lib/server/rooms";
import { isGameSupported } from "@/lib/games";

/** Chuẩn hóa timeControl từ body (mặc định không giới hạn nếu thiếu/không hợp lệ). */
function parseTimeControl(input: unknown): TimeControl {
  if (!input || typeof input !== "object") return { mode: "unlimited" };
  const tc = input as { mode?: string; baseMs?: number; incrementMs?: number };
  if (tc.mode !== "limited") return { mode: "unlimited" };
  const baseMs = Number(tc.baseMs);
  if (!Number.isFinite(baseMs) || baseMs <= 0) return { mode: "unlimited" };
  const incrementMs = Number.isFinite(Number(tc.incrementMs)) ? Math.max(0, Number(tc.incrementMs)) : 0;
  return { mode: "limited", baseMs, incrementMs };
}

// Đọc kho phòng in-memory mỗi lần gọi — không cache.
export const dynamic = "force-dynamic";

/** GET /api/rooms -> { rooms } : danh sách phòng công khai đang chờ đối thủ. */
export async function GET() {
  return NextResponse.json({ rooms: listPublicRooms() });
}

/** POST /api/rooms { gameType, hostSide, isPublic } -> { roomId, inviteToken } */
export async function POST(req: Request) {
  let body: { gameType?: GameType; hostSide?: Side; isPublic?: boolean; timeControl?: unknown };
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
  const timeControl = parseTimeControl(body.timeControl);

  const room = createRoom(gameType, hostSide, isPublic, timeControl);
  return NextResponse.json({ roomId: room.id, inviteToken: room.inviteToken });
}
