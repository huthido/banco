// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act } from "react";

// Mock các module Next cần router/link để render ngoài App Router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: ReactNode }) => (
    // eslint-disable-next-line jsx-a11y/anchor-is-valid
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

import { ThemeToggle } from "@/components/ThemeToggle";
import { PublicLobby } from "@/components/PublicLobby";
import { CreateRoomButton } from "@/components/CreateRoomButton";
import { SavedBoards } from "@/components/SavedBoards";
import { GameHistory } from "@/components/GameHistory";
import { ReactionBar } from "@/components/ReactionBar";
import { BoardSay } from "@/components/BoardSay";
import { GameClock } from "@/components/GameClock";
import { MoveHistory } from "@/components/MoveHistory";
import { NameDialog } from "@/components/NameDialog";
import { Chat } from "@/components/Chat";

/**
 * Tái hiện đúng luồng hydration: render server (react-dom/server) -> gắn vào
 * jsdom -> hydrate client (react-dom/client). Bắt console.error của React —
 * nếu có "did not match"/"Hydration failed" nghĩa là component lệch server/client.
 */
function expectHydrates(name: string, node: ReactNode) {
  const html = renderToString(node);
  document.body.innerHTML = `<div id="root">${html}</div>`;
  const errors: string[] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });
  try {
    act(() => {
      hydrateRoot(document.getElementById("root") as HTMLElement, node);
    });
  } finally {
    spy.mockRestore();
  }
  const bad = errors.filter(
    (e) =>
      e.includes("did not match") ||
      e.includes("Hydration failed") ||
      e.includes("server rendered HTML")
  );
  expect(bad, `${name} — hydration errors:\n${errors.join("\n")}`).toEqual([]);
}

describe("hydration — các client component (trang chủ & phòng)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // jsdom chưa implement một số API — chỉ để effect không crash (không liên quan hydration).
    (Element.prototype as unknown as { scrollIntoView: () => void }).scrollIntoView = () => {};
    (HTMLInputElement.prototype as unknown as { select: () => void }).select = () => {};
    window.matchMedia = window.matchMedia ?? (() => ({ matches: false })) as never;
  });

  it("ThemeToggle hydrate sạch", () => {
    expectHydrates("ThemeToggle", <ThemeToggle />);
  });

  it("PublicLobby hydrate sạch", () => {
    expectHydrates("PublicLobby", <PublicLobby />);
  });

  it("CreateRoomButton hydrate sạch (select/checkbox)", () => {
    expectHydrates("CreateRoomButton", <CreateRoomButton gameType="gomoku" />);
  });

  it("SavedBoards hydrate sạch (rỗng lúc đầu)", () => {
    expectHydrates("SavedBoards", <SavedBoards />);
  });

  it("GameHistory hydrate sạch (rỗng lúc đầu)", () => {
    expectHydrates("GameHistory", <GameHistory />);
  });

  it("NameDialog hydrate sạch (input autofocus)", () => {
    expectHydrates("NameDialog", <NameDialog onSubmit={() => {}} />);
  });

  it("ReactionBar hydrate sạch", () => {
    expectHydrates("ReactionBar", <ReactionBar onReact={() => {}} />);
  });

  it("BoardSay hydrate sạch (input)", () => {
    expectHydrates("BoardSay", <BoardSay onSend={() => {}} />);
  });

  it("GameClock hydrate sạch", () => {
    expectHydrates(
      "GameClock",
      <GameClock label="Quân đen" name="A" ms={60000} active={true} />
    );
  });

  it("MoveHistory hydrate sạch", () => {
    expectHydrates("MoveHistory", <MoveHistory moves={[]} />);
  });

  it("Chat hydrate sạch (input)", () => {
    expectHydrates("Chat", <Chat messages={[]} onSend={() => {}} />);
  });
});
