"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents, ChatMessage } from "@/types/events";
import type { RoomSnapshot, Role } from "@/types/room";
import type { GameResult, Side } from "@/types/game";
import { genPlayerId } from "@/func";
import { getBoard, putBoard, toRestorePayload, addHistory } from "./savedBoards";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Lấy (hoặc tạo) playerId ổn định lưu localStorage để reconnect giữ slot. */
function getPlayerId(): string {
  const KEY = "banco:playerId";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = genPlayerId();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export type Notice = { id: string; text: string; kind: "info" | "error" };

/** Đồng hồ đã nội suy phía client để hiển thị mượt (đếm lùi giữa các snapshot). */
export type LiveClock = {
  remainingMs: { first: number; second: number };
  running: Side | null;
} | null;

export type UseRoom = {
  connected: boolean;
  snapshot: RoomSnapshot | null;
  liveClock: LiveClock;
  messages: ChatMessage[];
  notices: Notice[];
  result: GameResult | null;
  joinError: string | null;
  reactions: { id: string; emoji: string }[];
  /** Tin nhắn bong bóng mới nhất theo từng phe (tự ẩn sau vài giây). */
  boardMessages: BoardMessages;
  makeMove: (data: unknown) => void;
  resign: () => void;
  rematch: () => void;
  sendChat: (text: string) => void;
  sendReaction: (emoji: string) => void;
  sendBoardMessage: (text: string) => void;
};

type BoardSay = { id: number; name: string; text: string };
export type BoardMessages = { first?: BoardSay; second?: BoardSay };

export function useRoom(
  roomId: string,
  name: string,
  inviteToken?: string,
  wantPlay = false
): UseRoom {
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [boardMessages, setBoardMessages] = useState<BoardMessages>({});
  const [clockTick, setClockTick] = useState(0);
  const clockRecvAt = useRef(0);
  const saySeq = useRef(0);
  const socketRef = useRef<AppSocket | null>(null);
  const noticeSeq = useRef(0);
  const recordedRef = useRef<Set<string>>(new Set());

  const pushNotice = useCallback((text: string, kind: Notice["kind"]) => {
    const id = `n${noticeSeq.current++}`;
    setNotices((prev) => [...prev.slice(-4), { id, text, kind }]);
    // Tự ẩn sau vài giây — tránh che phủ vùng click (nhất là trên mobile).
    setTimeout(() => {
      setNotices((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    if (!name) return; // chưa nhập tên thì chưa kết nối
    const playerId = getPlayerId();
    // role: có token (link mời) hoặc vào từ sảnh công khai => xin làm player;
    // còn lại => spectator.
    const role: Role = inviteToken || wantPlay ? "player" : "spectator";

    const socket: AppSocket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // Nếu là người chơi (có token) và có bản lưu, đính kèm để server khôi phục
      // phòng nếu nó đã mất (server restart).
      const buildRestore = inviteToken
        ? getBoard(roomId).then((b) => (b ? toRestorePayload(b) : undefined))
        : Promise.resolve(undefined);

      buildRestore.then((restore) => {
        socket.emit(
          "room:join",
          { roomId, role, name, playerId, inviteToken, restore },
          (res) => {
            if (res.ok) {
              clockRecvAt.current = Date.now();
              setSnapshot(res.snapshot);
            } else setJoinError(res.error);
          }
        );
      });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("room:state", (snap) => {
      clockRecvAt.current = Date.now();
      setSnapshot(snap);
      if (snap.result) setResult(snap.result);
      else setResult(null);
    });
    socket.on("game:over", (r) => setResult(r));
    socket.on("clock:sync", (c) => {
      if (c.roomId !== roomId) return;
      clockRecvAt.current = Date.now();
      setSnapshot((prev) =>
        prev && prev.clock
          ? { ...prev, clock: { remainingMs: c.remainingMs, running: c.running, serverNow: c.serverNow } }
          : prev
      );
    });
    socket.on("chat:message", (m) => setMessages((prev) => [...prev, m]));
    socket.on("reaction:burst", (r) => {
      setReactions((prev) => [...prev.slice(-40), { id: r.id, emoji: r.emoji }]);
      // Tự gỡ sau khi animation bay lên kết thúc.
      setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== r.id)), 2600);
    });
    socket.on("board:message", (m) => {
      const id = ++saySeq.current;
      setBoardMessages((prev) => ({ ...prev, [m.side]: { id, name: m.name, text: m.text } }));
      // Tự ẩn sau 6s nếu chưa bị tin mới hơn của cùng phe thay thế.
      setTimeout(() => {
        setBoardMessages((prev) =>
          prev[m.side as Side]?.id === id ? { ...prev, [m.side]: undefined } : prev
        );
      }, 6000);
    });
    socket.on("peer:joined", (i) =>
      pushNotice(`${i.name} đã vào phòng (${i.role === "player" ? "người chơi" : "người xem"})`, "info")
    );
    socket.on("peer:left", (i) => pushNotice(`${i.name} đã rời phòng`, "info"));
    socket.on("error", (e) => pushNotice(e.message, "error"));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, name, inviteToken, wantPlay, pushNotice]);

  // Nhịp đếm lùi phía client (250ms) khi có đồng hồ đang chạy.
  const clockRunning = snapshot?.clock?.running ?? null;
  const isPlaying = snapshot?.status === "playing";
  useEffect(() => {
    if (!clockRunning || !isPlaying) return;
    const t = setInterval(() => setClockTick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [clockRunning, isPlaying]);

  // Đồng hồ nội suy: trừ thời gian đã trôi kể từ snapshot gần nhất cho bên đang chạy.
  const liveClock: LiveClock = useMemo(() => {
    const c = snapshot?.clock;
    if (!c) return null;
    const elapsed = c.running ? Math.max(0, Date.now() - clockRecvAt.current) : 0;
    return {
      running: c.running,
      remainingMs: {
        first: c.running === "first" ? Math.max(0, c.remainingMs.first - elapsed) : c.remainingMs.first,
        second:
          c.running === "second" ? Math.max(0, c.remainingMs.second - elapsed) : c.remainingMs.second,
      },
    };
    // clockTick: ép tính lại mỗi nhịp; snapshot: cập nhật khi có dữ liệu mới (clockRecvAt là ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, clockTick]);

  // Tự lưu bàn cờ vào IndexedDB mỗi khi trạng thái đổi (để mở lại / mời lại sau).
  useEffect(() => {
    if (!snapshot || !name) return;
    putBoard({
      id: roomId,
      gameType: snapshot.gameType,
      inviteToken,
      role: snapshot.you.role,
      side: snapshot.you.side,
      name,
      state: snapshot.state,
      moveHistory: snapshot.moveHistory,
      turn: snapshot.turn,
      status: snapshot.status,
      result: snapshot.result,
      players: {
        first: snapshot.players.first?.name ?? null,
        second: snapshot.players.second?.name ?? null,
      },
      updatedAt: Date.now(),
    });
  }, [snapshot, roomId, inviteToken, name]);

  // Ghi vào lịch sử khi ván kết thúc (idempotent theo id ổn định).
  useEffect(() => {
    if (!snapshot || snapshot.status !== "finished" || !snapshot.result) return;
    const id = `${roomId}:${snapshot.moveHistory.length}:${snapshot.result.winner}`;
    if (recordedRef.current.has(id)) return;
    recordedRef.current.add(id);
    addHistory({
      id,
      roomId,
      gameType: snapshot.gameType,
      result: snapshot.result,
      side: snapshot.you.side,
      players: {
        first: snapshot.players.first?.name ?? null,
        second: snapshot.players.second?.name ?? null,
      },
      moveHistory: snapshot.moveHistory,
      finalState: snapshot.state,
      finishedAt: Date.now(),
    });
  }, [snapshot, roomId]);

  const makeMove = useCallback(
    (data: unknown) => socketRef.current?.emit("move:make", { roomId, data }),
    [roomId]
  );
  const resign = useCallback(() => socketRef.current?.emit("game:resign", { roomId }), [roomId]);
  const rematch = useCallback(() => socketRef.current?.emit("game:rematch", { roomId }), [roomId]);
  const sendChat = useCallback(
    (text: string) => socketRef.current?.emit("chat:send", { roomId, text }),
    [roomId]
  );
  const sendReaction = useCallback(
    (emoji: string) => socketRef.current?.emit("reaction:send", { roomId, emoji }),
    [roomId]
  );
  const sendBoardMessage = useCallback(
    (text: string) => socketRef.current?.emit("board:say", { roomId, text }),
    [roomId]
  );

  return {
    connected,
    snapshot,
    liveClock,
    messages,
    notices,
    result,
    joinError,
    reactions,
    boardMessages,
    makeMove,
    resign,
    rematch,
    sendChat,
    sendReaction,
    sendBoardMessage,
  };
}
