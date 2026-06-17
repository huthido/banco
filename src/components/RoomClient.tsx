"use client";

import { useState } from "react";
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
import { GAME_CATALOG } from "@/lib/games";
import type { GomokuState } from "@/lib/games/gomoku";
import type { ChessState } from "@/lib/games/chess";
import type { XiangqiState } from "@/lib/games/xiangqi";
import type { CheckersState } from "@/lib/games/checkers";
import type { GoState } from "@/lib/games/go";
import { formatResult, isMyTurn } from "@/func";

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
    <main className="mx-auto flex max-w-6xl flex-col px-4 py-3 lg:h-screen lg:overflow-hidden">
      <div className="mb-2 flex items-center justify-between pr-12">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Trang chủ
        </Link>
        <span className="truncate text-sm text-slate-400 dark:text-slate-500">Phòng: {roomId}</span>
      </div>

      <div className="flex flex-col gap-8 lg:min-h-0 lg:flex-1 lg:flex-row">
        {/* Bàn cờ + điều khiển. Dùng m-auto (không align-center) để khi nội dung
            cao hơn khung vẫn cuộn lên xem được phần trên, không bị cắt. */}
        <div className="flex-1 lg:flex lg:overflow-auto lg:py-2">
          <div className="flex flex-col items-center lg:m-auto">
            {/* Bàn cờ + lớp phủ emoji bay lên */}
            <div className="relative">
              {snapshot.gameType === "gomoku" && (
                <GomokuBoard
                  state={snapshot.state as GomokuState}
                  canPlay={youCanPlay}
                  onPlace={(x, y) => room.makeMove({ x, y })}
                />
              )}
              {snapshot.gameType === "chess" && (
                <ChessBoard
                  state={snapshot.state as ChessState}
                  canPlay={youCanPlay}
                  orientation={snapshot.you.side}
                  onMove={(from, to) => room.makeMove({ from, to })}
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
                />
              )}
              {snapshot.gameType === "checkers" && (
                <CheckersBoard
                  state={snapshot.state as CheckersState}
                  canPlay={youCanPlay}
                  mySide={snapshot.you.side}
                  onMove={(move) => room.makeMove(move)}
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
            </div>

            {/* Tin nhắn nhanh hiện trên bàn — chỉ người chơi */}
            {snapshot.you.role === "player" && <BoardSay onSend={room.sendBoardMessage} />}

            {/* Thả cảm xúc — cả người chơi và người xem đều dùng được */}
            <ReactionBar onReact={room.sendReaction} />

            {!youCanPlay && snapshot.status === "playing" && snapshot.you.role === "player" && (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Đang chờ đối thủ đi…</p>
            )}

            {/* Nút điều khiển cho người chơi */}
            {snapshot.you.role === "player" && (
              <div className="mt-4 flex gap-3">
                {snapshot.status === "playing" && (
                  <button
                    onClick={room.resign}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Xin thua
                  </button>
                )}
                {snapshot.status === "finished" && (
                  <button
                    onClick={room.rematch}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                  >
                    Đánh lại{" "}
                    {snapshot.rematch.first || snapshot.rematch.second
                      ? `(${(snapshot.rematch.first ? 1 : 0) + (snapshot.rematch.second ? 1 : 0)}/2)`
                      : ""}
                  </button>
                )}
              </div>
            )}

            {/* Kết quả */}
            {result && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-6 py-3 text-center font-semibold text-amber-800 dark:border-amber-500/60 dark:bg-amber-950 dark:text-amber-300">
                🏁 {formatResult(result, meta.sides)}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — chỉ vùng này cuộn ở màn lớn */}
        <div className="space-y-5 lg:h-full lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:pr-1">
          <RoomSidebar snapshot={snapshot} meta={meta} inviteToken={inviteToken} />
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <MoveHistory moves={snapshot.moveHistory} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <Chat messages={room.messages} onSend={room.sendChat} />
          </div>
        </div>
      </div>

      {/* Thông báo nổi */}
      <div className="fixed bottom-4 right-4 space-y-2">
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
