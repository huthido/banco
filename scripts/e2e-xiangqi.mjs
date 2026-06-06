import { io } from "socket.io-client";

const BASE = "http://localhost:3111";
const connect = () => io(BASE, { transports: ["websocket"], forceNew: true });
const join = (s, p) =>
  new Promise((res, rej) => s.emit("room:join", p, (r) => (r.ok ? res(r.snapshot) : rej(new Error(r.error)))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failures++; };
const idx = (x, y) => y * 9 + x;

async function newRoom() {
  return fetch(`${BASE}/api/rooms`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameType: "xiangqi", hostSide: "first" }),
  }).then((r) => r.json());
}

async function main() {
  // ===== Phần A: luật trên bàn khởi tạo =====
  {
    const { roomId, inviteToken } = await newRoom();
    const red = connect(); await new Promise((r) => red.on("connect", r));
    const rs = await join(red, { roomId, role: "player", name: "Đỏ", playerId: "pr", inviteToken });
    const black = connect(); await new Promise((r) => black.on("connect", r));
    await join(black, { roomId, role: "player", name: "Đen", playerId: "pb", inviteToken });
    check(rs.you.side === "first", "Đỏ = first (đi trước)");

    let snap = rs;
    red.on("room:state", (s) => (snap = s));
    black.on("room:state", (s) => (snap = s));

    // Đỏ đi Xe (0,9)->(0,8): hợp lệ
    red.emit("move:make", { roomId, data: { fx: 0, fy: 9, tx: 0, ty: 8 } });
    await sleep(200);
    check(snap.moveHistory.length === 1, "Xe đi 1 ô hợp lệ");

    // Sai lượt: Đỏ đi tiếp khi tới lượt Đen
    let turnErr = false;
    red.once("error", (e) => { if (e.code === "NOT_YOUR_TURN") turnErr = true; });
    red.emit("move:make", { roomId, data: { fx: 1, fy: 9, tx: 2, ty: 7 } });
    await sleep(150);
    check(turnErr, "Chặn đi sai lượt");

    // Đen đi Xe (0,0)->(0,1) hợp lệ
    black.emit("move:make", { roomId, data: { fx: 0, fy: 0, tx: 0, ty: 1 } });
    await sleep(200);
    check(snap.moveHistory.length === 2, "Đen đi hợp lệ, tới lượt Đỏ");

    // Sai luật: Xe (0,8)->(0,5) bị chắn bởi Tốt ở (0,6)
    let illErr = false;
    red.once("error", (e) => { if (e.code === "INVALID_MOVE") illErr = true; });
    red.emit("move:make", { roomId, data: { fx: 0, fy: 8, tx: 0, ty: 5 } });
    await sleep(150);
    check(illErr, "Chặn nước sai luật (Xe bị chắn)");

    red.close(); black.close();
  }

  // ===== Phần B: bắt Tướng = thắng (dựng thế bằng restore) =====
  {
    const roomId = "xqwin01";
    const token = "xq-token-1";
    const grid = new Array(90).fill(null);
    grid[idx(4, 0)] = { side: "second", type: "general" }; // Tướng Đen
    grid[idx(4, 5)] = { side: "first", type: "chariot" }; // Xe Đỏ cùng cột, không vướng
    grid[idx(3, 9)] = { side: "first", type: "general" }; // Tướng Đỏ (khác cột)
    const restore = {
      gameType: "xiangqi", inviteToken: token,
      state: { grid, cols: 9, rows: 10, last: null },
      moveHistory: [], turn: "first", status: "playing", yourSide: "first",
    };
    const red = connect(); await new Promise((r) => red.on("connect", r));
    const rs = await join(red, { roomId, role: "player", name: "Đỏ", playerId: "r2", inviteToken: token, restore });
    check(rs.you.side === "first" && rs.state.grid[idx(4, 0)]?.type === "general", "Khôi phục thế cờ tướng");
    const black = connect(); await new Promise((r) => black.on("connect", r));
    await join(black, { roomId, role: "player", name: "Đen", playerId: "b2", inviteToken: token });

    let result = null;
    red.on("game:over", (r) => (result = r));
    // Xe Đỏ (4,5)->(4,0) bắt Tướng Đen
    red.emit("move:make", { roomId, data: { fx: 4, fy: 5, tx: 4, ty: 0 } });
    await sleep(250);
    check(result && result.winner === "first", `Bắt Tướng -> Đỏ thắng (${result && result.reason})`);

    red.close(); black.close();
  }

  console.log(failures === 0 ? "\n✅ XIANGQI PASS" : `\n❌ ${failures} thất bại`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
