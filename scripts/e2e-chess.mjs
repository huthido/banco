import { io } from "socket.io-client";

const BASE = "http://localhost:3110";
const connect = () => io(BASE, { transports: ["websocket"], forceNew: true });
const join = (s, p) =>
  new Promise((res, rej) => s.emit("room:join", p, (r) => (r.ok ? res(r.snapshot) : rej(new Error(r.error)))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failures++; };

async function main() {
  const { roomId, inviteToken } = await fetch(`${BASE}/api/rooms`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameType: "chess", hostSide: "first" }),
  }).then((r) => r.json());

  const white = connect(); await new Promise((r) => white.on("connect", r));
  const ws = await join(white, { roomId, role: "player", name: "Trắng", playerId: "pw", inviteToken });
  const black = connect(); await new Promise((r) => black.on("connect", r));
  const bs = await join(black, { roomId, role: "player", name: "Đen", playerId: "pb", inviteToken });
  check(ws.you.side === "first" && bs.you.side === "second", "Trắng=first, Đen=second");
  check(bs.status === "playing" && bs.turn === "first", "Bắt đầu chơi, lượt Trắng");

  // Theo dõi snapshot mới nhất
  let snap = bs;
  let result = null;
  white.on("room:state", (s) => (snap = s));
  black.on("room:state", (s) => (snap = s));
  white.on("game:over", (r) => (result = r));

  const waitMoves = async (n) => { while (snap.moveHistory.length < n) await sleep(20); };

  // Fool's mate: 1.f3 e5 2.g4 Qh4#
  white.emit("move:make", { roomId, data: { from: "f2", to: "f3" } });
  await waitMoves(1);
  black.emit("move:make", { roomId, data: { from: "e7", to: "e5" } });
  await waitMoves(2);

  // Chặn sai lượt: Trắng thử đi khi đang lượt... thực ra giờ lượt Trắng. Test sai lượt: Đen đi khi lượt Trắng.
  let turnErr = false;
  black.once("error", (e) => { if (e.code === "NOT_YOUR_TURN") turnErr = true; });
  black.emit("move:make", { roomId, data: { from: "d8", to: "h4" } });
  await sleep(150);
  check(turnErr, "Chặn đi sai lượt (Đen đi khi lượt Trắng)");

  // Chặn nước sai luật: Trắng đi quân không hợp lệ
  let illegalErr = false;
  white.once("error", (e) => { if (e.code === "INVALID_MOVE") illegalErr = true; });
  white.emit("move:make", { roomId, data: { from: "e1", to: "e3" } }); // Vua nhảy 2 ô: sai
  await sleep(150);
  check(illegalErr, "Chặn nước sai luật (Vua đi bậy)");
  check(snap.moveHistory.length === 2, "State không đổi sau nước sai");

  // 2.g4
  white.emit("move:make", { roomId, data: { from: "g2", to: "g4" } });
  await waitMoves(3);
  // 2...Qh4# chiếu hết
  black.emit("move:make", { roomId, data: { from: "d8", to: "h4" } });
  await sleep(250);

  check(result && result.winner === "second", `Chiếu hết: Đen thắng (${result && result.reason})`);
  check(snap.status === "finished", "Ván kết thúc");

  white.close(); black.close();
  console.log(failures === 0 ? "\n✅ CHESS PASS" : `\n❌ ${failures} thất bại`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
