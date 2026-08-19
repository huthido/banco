import Link from "next/link";
import { GAME_CATALOG } from "@/lib/games";
import { CreateRoomButton } from "@/components/CreateRoomButton";
import { PublicLobby } from "@/components/PublicLobby";
import { SavedBoards } from "@/components/SavedBoards";
import { GameHistory } from "@/components/GameHistory";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">♟️ BànCờ</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Tạo bàn cờ, mời đối thủ và người xem chỉ bằng một đường link.
        </p>
      </header>

      <PublicLobby />

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_CATALOG.map((g) => (
          <div
            key={g.type}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{g.name}</h2>
              <span className="text-sm text-slate-400 dark:text-slate-500">
                {g.boardCols}×{g.boardRows}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm text-slate-600 dark:text-slate-300">{g.description}</p>
            <div className="mt-5">
              {g.available ? (
                <CreateRoomButton gameType={g.type} />
              ) : (
                <span className="inline-block rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-400 dark:bg-slate-700 dark:text-slate-400">
                  Sắp ra mắt
                </span>
              )}
            </div>
            <Link
              href={`/guide/${g.type}`}
              className="mt-3 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Luật chơi & hướng dẫn →
            </Link>
          </div>
        ))}
      </section>

      <SavedBoards />

      <GameHistory />

      <footer className="mt-12 text-center text-sm text-slate-400 dark:text-slate-500">
        Không cần đăng nhập — chỉ cần nhập tên và chia sẻ link.
      </footer>
    </main>
  );
}
