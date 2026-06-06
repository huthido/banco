import { io } from "socket.io-client";

const BASE = "http://localhost:3113";
const connect = () => io(BASE, { transports: ["websocket"], forceNew: true });
const join = (s, p) =>
  new Promise((res, rej) => s.emit("room:join", p, (r) => (r.ok ? res(r.snapshot) : rej(new Error(r.error)))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failures++; };
const gx = (x, y) => y * 19 + x;
const emptyGrid = () => new Array(361).fill(null);

function baseState(grid, extra = {}) {
  return {
    grid, cols: 19, rows: 19, turn: "first", last: null,
    koPoint: null, passes: 0, captures: { first: 0, second: 0 }, ...extra,
  };
}
async function restoreRoom(roomId, token, state) {
  const red = connect(); await new Promise((r) => red.on("connect", r));
  await join(red, {
    roomId, role: "player", name: "Đen", playerId: roomId + "a", inviteToken: token,
    restore: { gameType: "go", inviteToken: token, state, moveHistory: [], turn: state.turn, status: "playing", yourSide: "first" },
  });
  const white = connect(); await new Promise((r) => white.on("connect", r));
  await join(white, { roomId, role: "player", name: "Trắng", playerId: roomId + "b", inviteToken: token });
  return { red, white };
}

async function main() {
  // ===== A: đặt quân cơ bản =====
  {
    const { roomId, inviteToken } = await fetch(`${BASE}/api/rooms`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType: "go", hostSide: "first" }),
    }).then((r) => r.json());
    const black = connect(); await new Promise((r) => black.on("connect", r));
    const rs = await join(black, { roomId, role: "player", name: "Đen", playerId: "ga", inviteToken });
    const white = connect(); await new Promise((r) => white.on("connect", r));
    await join(white, { roomId, role: "player", name: "Trắng", playerId: "gb", inviteToken });
    check(rs.you.side === "first", "Đen = first (đi trước)");
    let snap = rs;
    black.on("room:state", (s) => (snap = s));
    black.emit("move:make", { roomId, data: { x: 3, y: 3 } });
    await sleep(200);
    check(snap.state.grid[gx(3, 3)] === "first", "Đen đặt quân hợp lệ");
    black.close(); white.close();
  }

  // ===== B: bắt quân =====
  {
    const grid = emptyGrid();
    grid[gx(0, 0)] = "second"; // Trắng sắp bị bắt
    grid[gx(1, 0)] = "first";
    const { red, white } = await restoreRoom("gocap01", "go-t1", baseState(grid));
    let snap = null;
    red.on("room:state", (s) => (snap = s));
    red.emit("move:make", { roomId: "gocap01", data: { x: 0, y: 1 } }); // bịt khí cuối
    await sleep(250);
    check(snap && snap.state.grid[gx(0, 0)] === null, "Bắt được quân Trắng (0,0)");
    check(snap && snap.state.captures.first === 1, "Đếm 1 quân bị bắt cho Đen");
    red.close(); white.close();
  }

  // ===== C: cấm tự sát =====
  {
    const grid = emptyGrid();
    grid[gx(1, 0)] = "second";
    grid[gx(0, 1)] = "second"; // (0,0) bị vây bởi Trắng
    const { red, white } = await restoreRoom("gosui01", "go-t2", baseState(grid));
    let err = false;
    red.once("error", (e) => { if (e.code === "INVALID_MOVE") err = true; });
    red.emit("move:make", { roomId: "gosui01", data: { x: 0, y: 0 } });
    await sleep(200);
    check(err, "Cấm tự sát (đặt vào ô hết khí, không bắt được ai)");
    red.close(); white.close();
  }

  // ===== D: luật ko =====
  {
    const grid = emptyGrid();
    const { red, white } = await restoreRoom("goko01", "go-t3", baseState(grid, { koPoint: { x: 5, y: 5 } }));
    let err = false;
    red.once("error", (e) => { if (e.code === "INVALID_MOVE") err = true; });
    red.emit("move:make", { roomId: "goko01", data: { x: 5, y: 5 } });
    await sleep(200);
    check(err, "Cấm đánh vào điểm ko");
    red.close(); white.close();
  }

  // ===== E: pass×2 -> tính điểm =====
  {
    const grid = emptyGrid();
    // Tường Đen quây góc 3×3 -> Đen có đất + nhiều quân, không có quân Trắng.
    [[3, 0], [3, 1], [3, 2], [3, 3], [0, 3], [1, 3], [2, 3]].forEach(([x, y]) => (grid[gx(x, y)] = "first"));
    const { red, white } = await restoreRoom("goscore01", "go-t4", baseState(grid, { passes: 1 }));
    let result = null;
    red.on("game:over", (r) => (result = r));
    red.emit("move:make", { roomId: "goscore01", data: { pass: true } }); // pass thứ 2 -> kết thúc
    await sleep(250);
    check(result && result.winner === "first", "Pass×2 -> tính điểm, Đen thắng");
    check(result && /komi/.test(result.reason), `Điểm có komi (${result && result.reason})`);
    red.close(); white.close();
  }

  console.log(failures === 0 ? "\n✅ GO PASS" : `\n❌ ${failures} thất bại`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
