"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRoom } from "@/lib/client/useRoom";
import { NameDialog } from "./NameDialog";
import { RoomSidebar } from "./RoomSidebar";
import { GomokuBoard } from "./boards/GomokuBoard";
import { ChessBoard } from "./boards/ChessBoard";
import { XiangqiBoard } from "./boards/XiangqiBoard";
import { CheckersBoard } from "./boards/CheckersBoard";
import { GoBoard } from "./boards/GoBoard";
import { ReactionBar } from "./ReactionBar";
import { ReactionOverlay } from "./ReactionOverlay";
import { BoardMessageOverlay } from "./BoardMessageOverlay";
import { BoardSay } from "./BoardSay";
import { MoveHistory } from "./MoveHistory";
import { Chat } from "./Chat";
import { GameClock } from "./GameClock";
import { GAME_CATALOG } from "@/lib/games";
import type { GomokuState } from "@/lib/games/gomoku";
import type { ChessState } from "@/lib/games/chess";
import type { XiangqiState } from "@/lib/games/xiangqi";
import type { CheckersState } from "@/lib/games/checkers";
import type { GoState } from "@/lib/games/go";
import { formatResult, isMyTurn, sideLabel } from "@/func";

export function RoomClient({
  roomId,
  inviteToken,
  wantPlay,
}: {
  roomId: string;
  inviteToken?: string;
  wantPlay?: boolean;
}) {
  const [name, setName] = useState("");
  const room = useRoom(roomId, name, inviteToken, wantPlay);
  const { snapshot, result, notices, joinError } = room;

  // Nước gợi ý từ nút "💡 Gợi ý" (chơi với máy) — reset mỗi khi thế cờ đổi.
  const [hint, setHint] = useState<unknown>(null);
  useEffect(() => setHint(null), [snapshot]);

  // Đo vùng bàn cờ để co bàn cờ vừa chiều cao (mobile: bàn luôn hiện, phần dưới scroll).
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = boardAreaRef.current;
    if (!el || !snapshot) return;
    const meta = GAME_CATALOG.find((g) => g.type === snapshot.gameType)!;
    const aspect = meta.boardCols / meta.boardRows;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        const pad = 24; // padding nội bộ của board (p-2/p-3)
        setBoardWidth(Math.max(0, Math.min(w, (h - pad) * aspect + pad)));
      } else setBoardWidth(null);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [snapshot?.gameType, snapshot?.status, snapshot?.you.side]);

  if (!name) return <NameDialog onSubmit={setName} />;

  if (joinError) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Không vào được phòng</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{joinError}</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-white">
          Về trang chủ
        </Link>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500 dark:text-slate-400">
        Đang kết nối tới phòng…
      </main>
    );
  }

  const meta = GAME_CATALOG.find((g) => g.type === snapshot.gameType)!;
  const youCanPlay =
    snapshot.you.role === "player" &&
    snapshot.status === "playing" &&
    isMyTurn(snapshot.turn, snapshot.you.side);

  return (
    // h-dvh + overflow-hidden: trên mobile bàn cờ luôn hiện phía trên, vùng nội dung
    // phía dưới scroll riêng (không cuộn cả trang); desktop giữ bố cục 2 cột như cũ.
    <main className="mx-auto flex h-dvh max-w-6xl flex-col overflow-hidden px-2 py-3 sm:px-4">
      <div className="mb-2 flex items-center justify-between pr-12">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Trang chủ
        </Link>
        <span className="truncate text-sm text-slate-400 dark:text-slate-500">Phòng: {roomId}</span>
      </div>

      {!room.connected && (
        <div className="mb-2 rounded-lg bg-amber-100 px-3 py-1.5 text-center text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          ⚠️ Mất kết nối — đang thử kết nối lại…
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-8">
        {/* Bàn cờ + điều khiển — luôn hiện (mobile: chiếm phần lớn màn hình) */}
        <div className="flex w-full min-h-0 flex-[2.5] flex-col items-center lg:flex-1 lg:overflow-auto lg:py-2">
          <div className="flex w-full min-h-0 flex-1 flex-col items-center lg:m-auto lg:flex-none">
            {/* Đồng hồ cờ — chỉ hiện khi bàn bật giới hạn thời gian */}
            {room.liveClock && (
              <div className="mb-2 flex items-center gap-3">
                <GameClock
                  label={meta.sides[0]}
                  name={snapshot.players.first?.name}
                  ms={room.liveClock.remainingMs.first}
                  active={room.liveClock.running === "first" && snapshot.status === "playing"}
                />
                <GameClock
                  label={meta.sides[1]}
                  name={snapshot.players.second?.name}
                  ms={room.liveClock.remainingMs.second}
                  active={room.liveClock.running === "second" && snapshot.status === "playing"}
                />
              </div>
            )}

            {/* Vùng bàn cờ: co theo chiều cao khả dụng (mobile) / kích thước tự nhiên (desktop) */}
            <div ref={boardAreaRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
              <div
                className="relative flex w-full justify-center"
                style={boardWidth !== null ? { width: boardWidth } : undefined}
              >
                {snapshot.gameType === "gomoku" && (
                  <GomokuBoard
                    state={snapshot.state as GomokuState}
                    canPlay={youCanPlay}
                    onPlace={(x, y) => room.makeMove({ x, y })}
                    hint={hint as { x: number; y: number } | null}
                  />
                )}
                {snapshot.gameType === "chess" && (
                  <ChessBoard
                    state={snapshot.state as ChessState}
                    canPlay={youCanPlay}
                    orientation={snapshot.you.side}
                    onMove={(from, to) => room.makeMove({ from, to })}
                    hint={hint as { from: string; to: string } | null}
                  />
                )}
                {snapshot.gameType === "xiangqi" && (
                  <XiangqiBoard
                    state={snapshot.state as XiangqiState}
                    canPlay={youCanPlay}
                    mySide={snapshot.you.side}
                    onMove={(from, to) =>
                      room.makeMove({ fx: from.x, fy: from.y, tx: to.x, ty: to.y })
                    }
                    hint={hint as { fx: number; fy: number; tx: number; ty: number } | null}
                  />
                )}
                {snapshot.gameType === "checkers" && (
                  <CheckersBoard
                    state={snapshot.state as CheckersState}
                    canPlay={youCanPlay}
                    mySide={snapshot.you.side}
                    onMove={(move) => room.makeMove(move)}
                    hint={hint as { path: { x: number; y: number }[] } | null}
                  />
                )}
                {snapshot.gameType === "go" && (
                  <GoBoard
                    state={snapshot.state as GoState}
                    canPlay={youCanPlay}
                    onMove={(move) => room.makeMove(move)}
                  />
                )}
                <ReactionOverlay reactions={room.reactions} />
                <BoardMessageOverlay messages={room.boardMessages} />

                {/* Cảnh báo Chiếu (loại cờ có khái niệm chiếu — vd cờ tướng) */}
                {snapshot.check && snapshot.status === "playing" && (
                  <div className="check-alert pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-600 px-4 py-1.5 text-sm font-bold text-white shadow-lg ring-2 ring-red-300 dark:ring-red-500/60">
                    ⚡ Chiếu!{" "}
                    <span className="font-medium opacity-90">
                      ({sideLabel(snapshot.check, meta.sides)})
                    </span>
                  </div>
                )}

                {/* Chiếu bí -> chiến thắng (cờ tướng) */}
                {snapshot.gameType === "xiangqi" && result?.reason === "chiếu bí" && (
                  <div className="checkmate-pop pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                    <div className="rounded-2xl bg-red-600/95 px-8 py-5 text-center text-white shadow-2xl">
                      <div className="text-3xl font-extrabold">🏆 Chiếu bí!</div>
                      <div className="mt-1 text-lg font-semibold">
                        {formatResult(result, meta.sides)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tin nhắn nhanh hiện trên bàn — chỉ người chơi */}
            {snapshot.you.role === "player" && <BoardSay onSend={room.sendBoardMessage} />}

            {!youCanPlay && snapshot.status === "playing" && snapshot.you.role === "player" && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Đang chờ đối thủ đi…</p>
            )}

            {/* Nút điều khiển cho người chơi */}
            {snapshot.you.role === "player" && (
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {snapshot.status === "playing" && (
                  <button
                    onClick={room.resign}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Xin thua
                  </button>
                )}
                {/* Gợi ý nước đi — chỉ khi chơi với máy và tới lượt mình */}
                {snapshot.bot && snapshot.status === "playing" && youCanPlay && (
                  <button
                    onClick={async () => {
                      const r = await room.requestHint();
                      if (r.ok) setHint(r.move);
                      else room.pushNotice(r.error ?? "Không gợi ý được.", "error");
                    }}
                    className="rounded-lg border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-500/60 dark:bg-cyan-950 dark:text-cyan-300 dark:hover:bg-cyan-900"
                  >
                    💡 Gợi ý
                  </button>
                )}
                {snapshot.status === "finished" && (
                  <button
                    onClick={room.rematch}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                  >
                    Đánh lại{" "}
                    {snapshot.bot
                      ? ""
                      : snapshot.rematch.first || snapshot.rematch.second
                        ? `(${(snapshot.rematch.first ? 1 : 0) + (snapshot.rematch.second ? 1 : 0)}/2)`
                        : ""}
                  </button>
                )}
              </div>
            )}

            {/* Kết quả */}
            {result && (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-6 py-3 text-center font-semibold text-amber-800 dark:border-amber-500/60 dark:bg-amber-950 dark:text-amber-300">
                🏁 {formatResult(result, meta.sides)}
              </div>
            )}
          </div>
        </div>

        {/* Vùng nội dung phía dưới — mobile: scroll riêng; desktop: sidebar cột phải */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto lg:h-full lg:w-80 lg:shrink-0 lg:pr-1">
          {/* Thả cảm xúc — cả người chơi và người xem đều dùng được */}
          <ReactionBar onReact={room.sendReaction} />
          <RoomSidebar snapshot={snapshot} meta={meta} inviteToken={inviteToken} />
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <MoveHistory moves={snapshot.moveHistory} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <Chat messages={room.messages} onSend={room.sendChat} />
          </div>
        </div>
      </div>

      {/* Thông báo nổi — chỉ hiển thị, không chặn click */}
      <div className="pointer-events-none fixed bottom-4 right-4 space-y-2">
        {notices.slice(-3).map((n) => (
          <div
            key={n.id}
            className={`rounded-lg px-4 py-2 text-sm text-white shadow-lg ${
              n.kind === "error" ? "bg-red-500" : "bg-slate-700"
            }`}
          >
            {n.text}
          </div>
        ))}
      </div>
    </main>
  );
}
