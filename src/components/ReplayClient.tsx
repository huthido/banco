"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getRecord, type GameRecord } from "@/lib/client/savedBoards";
import { getEngine, GAME_CATALOG } from "@/lib/games";
import { GomokuBoard } from "./boards/GomokuBoard";
import { ChessBoard } from "./boards/ChessBoard";
import { XiangqiBoard } from "./boards/XiangqiBoard";
import { CheckersBoard } from "./boards/CheckersBoard";
import { GoBoard } from "./boards/GoBoard";
import type { GomokuState } from "@/lib/games/gomoku";
import type { ChessState } from "@/lib/games/chess";
import type { XiangqiState } from "@/lib/games/xiangqi";
import type { CheckersState } from "@/lib/games/checkers";
import type { GoState } from "@/lib/games/go";
import { formatResult } from "@/func";

/** Dựng lại chuỗi thế cờ qua từng nước từ lịch sử (fold qua engine). */
function buildStates(rec: GameRecord): unknown[] {
  const engine = getEngine(rec.gameType);
  const states: unknown[] = [engine.createInitialState()];
  let cur = states[0];
  for (const mv of rec.moveHistory) {
    cur = engine.applyMove(cur, mv.data, mv.side);
    states.push(cur);
  }
  return states;
}

export function ReplayClient({ recordId }: { recordId: string }) {
  const [rec, setRec] = useState<GameRecord | null | undefined>(undefined);
  const [index, setIndex] = useState(0); // 0 = bàn trống, n = sau nước thứ n

  useEffect(() => {
    getRecord(recordId).then((r) => {
      setRec(r);
      setIndex(r ? r.moveHistory.length : 0); // mặc định xem thế cờ cuối
    });
  }, [recordId]);

  const states = useMemo(() => (rec ? buildStates(rec) : []), [rec]);

  if (rec === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-500 dark:text-slate-400">
        Đang tải…
      </main>
    );
  }
  if (rec === null) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Không tìm thấy ván đấu</h1>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-white">
          Về trang chủ
        </Link>
      </main>
    );
  }

  const meta = GAME_CATALOG.find((g) => g.type === rec.gameType);
  const total = rec.moveHistory.length;
  const curMove = index > 0 ? rec.moveHistory[index - 1] : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-4">
      <div className="mb-2 flex items-center justify-between pr-12">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Trang chủ
        </Link>
        <span className="text-sm text-slate-400 dark:text-slate-500">Xem lại ván đấu</span>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex w-full flex-col items-center lg:flex-1">
          {rec.gameType === "gomoku" && (
            <GomokuBoard state={states[index] as GomokuState} canPlay={false} onPlace={() => {}} />
          )}
          {rec.gameType === "chess" && (
            <ChessBoard
              state={states[index] as ChessState}
              canPlay={false}
              orientation={rec.side}
              onMove={() => {}}
            />
          )}
          {rec.gameType === "xiangqi" && (
            <XiangqiBoard
              state={states[index] as XiangqiState}
              canPlay={false}
              mySide={rec.side}
              onMove={() => {}}
            />
          )}
          {rec.gameType === "checkers" && (
            <CheckersBoard
              state={states[index] as CheckersState}
              canPlay={false}
              mySide={rec.side}
              onMove={() => {}}
            />
          )}
          {rec.gameType === "go" && (
            <GoBoard state={states[index] as GoState} canPlay={false} onMove={() => {}} />
          )}

          {/* Thanh điều khiển tua */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setIndex(0)}
              disabled={index === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600"
            >
              ⏮
            </button>
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600"
            >
              ◀
            </button>
            <span className="min-w-[5rem] text-center text-sm text-slate-500 dark:text-slate-400">
              {index} / {total}
            </span>
            <button
              onClick={() => setIndex((i) => Math.min(total, i + 1))}
              disabled={index === total}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600"
            >
              ▶
            </button>
            <button
              onClick={() => setIndex(total)}
              disabled={index === total}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-slate-600"
            >
              ⏭
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={total}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            className="mt-3 w-64 max-w-full"
          />
        </div>

        {/* Thông tin + danh sách nước */}
        <aside className="w-full space-y-4 lg:w-72">
          <div>
            <h2 className="text-lg font-semibold">{meta?.name ?? rec.gameType}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {(rec.players.first ?? "?")} vs {(rec.players.second ?? "?")}
            </p>
            <p className="mt-1 font-medium text-amber-700 dark:text-amber-400">
              🏁 {meta ? formatResult(rec.result, meta.sides) : rec.result.reason}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-2 text-sm font-semibold">Các nước đi</h3>
            <ol className="max-h-72 space-y-1 overflow-y-auto text-xs">
              {rec.moveHistory.map((m, i) => (
                <li key={i}>
                  <button
                    onClick={() => setIndex(i + 1)}
                    className={`flex w-full gap-2 rounded px-1 py-0.5 text-left ${
                      index === i + 1
                        ? "bg-emerald-100 dark:bg-emerald-950"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="w-6 text-right text-slate-400">{i + 1}.</span>
                    <span>{m.label ?? JSON.stringify(m.data)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          {curMove && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Đang xem sau nước: {curMove.label}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
