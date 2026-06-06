import { io } from "socket.io-client";

const BASE = "http://localhost:3112";
const connect = () => io(BASE, { transports: ["websocket"], forceNew: true });
const join = (s, p) =>
  new Promise((res, rej) => s.emit("room:join", p, (r) => (r.ok ? res(r.snapshot) : rej(new Error(r.error)))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failures++; };
const idx = (x, y) => y * 8 + x;
const P = (...pts) => ({ path: pts.map(([x, y]) => ({ x, y })) });

async function main() {
  // ===== Phần A: luật cơ bản =====
  {
    const { roomId, inviteToken } = await fetch(`${BASE}/api/rooms`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType: "checkers", hostSide: "first" }),
    }).then((r) => r.json());
    const red = connect(); await new Promise((r) => red.on("connect", r));
    const rs = await join(red, { roomId, role: "player", name: "Đỏ", playerId: "cr", inviteToken });
    const black = connect(); await new Promise((r) => black.on("connect", r));
    await join(black, { roomId, role: "player", name: "Đen", playerId: "cb", inviteToken });
    check(rs.you.side === "first", "Đỏ = first");

    let snap = rs;
    red.on("room:state", (s) => (snap = s));
    black.on("room:state", (s) => (snap = s));

    let illErr = false;
    red.once("error", (e) => { if (e.code === "INVALID_MOVE") illErr = true; });
    red.emit("move:make", { roomId, data: P([2, 5], [2, 3]) }); // không phải đi chéo
    await sleep(150);
    check(illErr, "Chặn nước sai luật (không đi chéo)");

    red.emit("move:make", { roomId, data: P([2, 5], [3, 4]) }); // đi chéo tiến hợp lệ
    await sleep(200);
    check(snap.moveHistory.length === 1, "Đỏ đi chéo tiến hợp lệ");

    black.emit("move:make", { roomId, data: P([1, 2], [2, 3]) });
    await sleep(200);
    check(snap.moveHistory.length === 2, "Đen đi hợp lệ");

    red.close(); black.close();
  }

  // ===== Phần B: ăn liên hoàn bắt buộc + thắng (restore) =====
  {
    const roomId = "ckwin01";
    const token = "ck-token-1";
    const grid = new Array(64).fill(null);
    grid[idx(2, 5)] = { side: "first", king: false };
    grid[idx(3, 4)] = { side: "second", king: false };
    grid[idx(3, 2)] = { side: "second", king: false };
    const restore = {
      gameType: "checkers", inviteToken: token,
      state: { grid, cols: 8, rows: 8, turn: "first", last: null },
      moveHistory: [], turn: "first", status: "playing", yourSide: "first",
    };
    const red = connect(); await new Promise((r) => red.on("connect", r));
    await join(red, { roomId, role: "player", name: "Đỏ", playerId: "cr2", inviteToken: token, restore });
    const black = connect(); await new Promise((r) => black.on("connect", r));
    await join(black, { roomId, role: "player", name: "Đen", playerId: "cb2", inviteToken: token });

    // Nước ăn DỞ (mới nhảy 1 lần) phải bị chặn — phải ăn nối hết.
    let partialErr = false;
    red.once("error", (e) => { if (e.code === "INVALID_MOVE") partialErr = true; });
    red.emit("move:make", { roomId, data: P([2, 5], [4, 3]) });
    await sleep(150);
    check(partialErr, "Chặn ăn dở (bắt buộc nối hết chuỗi ăn)");

    // Ăn nối đủ 2 quân -> Đen hết quân -> Đỏ thắng
    let result = null;
    red.on("game:over", (r) => (result = r));
    red.emit("move:make", { roomId, data: P([2, 5], [4, 3], [2, 1]) });
    await sleep(250);
    check(result && result.winner === "first", `Ăn hết quân -> Đỏ thắng (${result && result.reason})`);

    red.close(); black.close();
  }

  console.log(failures === 0 ? "\n✅ CHECKERS PASS" : `\n❌ ${failures} thất bại`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
