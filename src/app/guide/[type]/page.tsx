import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { GameType } from "@/types/game";
import { GUIDES } from "@/content/guides";
import { GAME_CATALOG, isGameSupported } from "@/lib/games";
import { CreateRoomButton } from "@/components/CreateRoomButton";

export function generateStaticParams() {
  return GAME_CATALOG.map((g) => ({ type: g.type }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const meta = GAME_CATALOG.find((g) => g.type === type);
  return {
    title: meta ? `Luật ${meta.name} — BànCờ` : "Hướng dẫn — BànCờ",
    description: meta ? GUIDES[meta.type]?.intro : undefined,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const meta = GAME_CATALOG.find((g) => g.type === type);
  const guide = GUIDES[type as GameType];
  if (!meta || !guide) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-4">
      <div className="mb-3 flex items-center justify-between pr-12">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Trang chủ
        </Link>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          {meta.boardCols}×{meta.boardRows}
        </span>
      </div>

      <header className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h1 className="text-3xl font-bold">{meta.name}</h1>
        <p className="mt-1 text-emerald-600 dark:text-emerald-400">{guide.tagline}</p>
        <p className="mt-3 text-slate-600 dark:text-slate-300">{guide.intro}</p>
        {isGameSupported(meta.type) && (
          <div className="mt-5 max-w-xs">
            <CreateRoomButton gameType={meta.type} />
          </div>
        )}
      </header>

      <Section title="Cách chơi">
        <ol className="list-decimal space-y-2 pl-5 text-slate-700 dark:text-slate-300">
          {guide.howToPlay.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </Section>

      <Section title="Luật chơi">
        <ul className="list-disc space-y-2 pl-5 text-slate-700 dark:text-slate-300">
          {guide.rules.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Section>

      {guide.pieces && (
        <Section title="Quân cờ & cách di chuyển">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {guide.pieces.map((p) => (
              <div
                key={p.name}
                className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl dark:bg-slate-700">
                  {p.symbol}
                </span>
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{p.move}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Điều kiện thắng">
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-500/50 dark:bg-amber-950 dark:text-amber-300">
          🏆 {guide.win}
        </p>
      </Section>

      {guide.tips && (
        <Section title="Mẹo">
          <ul className="list-disc space-y-2 pl-5 text-slate-700 dark:text-slate-300">
            {guide.tips.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm dark:border-slate-700">
        <span className="text-slate-500 dark:text-slate-400">Xem luật cờ khác:</span>
        {GAME_CATALOG.filter((g) => g.type !== meta.type).map((g) => (
          <Link
            key={g.type}
            href={`/guide/${g.type}`}
            className="text-emerald-600 hover:underline dark:text-emerald-400"
          >
            {g.name}
          </Link>
        ))}
      </div>
    </main>
  );
}
