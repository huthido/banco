import { io } from "socket.io-client";

const BASE = "http://localhost:3103";
const connect = () => io(BASE, { transports: ["websocket"], forceNew: true });

function join(sock, payload) {
  return new Promise((resolve, reject) => {
    sock.emit("room:join", payload, (res) => (res.ok ? resolve(res.snapshot) : reject(new Error(res.error))));
  });
}
const nextState = (s) => new Promise((r) => s.once("room:state", r));

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? "✓" : "✗"} ${msg}`); if (!cond) failures++; };

// Dựng state gomoku dở dang: đen (0,0),(1,0); trắng (0,1). Tới lượt đen.
function buildState() {
  const cols = 15, rows = 15;
  const grid = new Array(cols * rows).fill(null);
  grid[0 * cols + 0] = "first";
  grid[0 * cols + 1] = "first";
  grid[1 * cols + 0] = "second";
  return { grid, cols, rows, last: { x: 1, y: 0 } };
}

async function main() {
  const roomId = "rstunit01"; // phòng KHÔNG được tạo qua API -> phải khôi phục
  const token = "tok-restore-123";
  const restore = {
    gameType: "gomoku",
    inviteToken: token,
    state: buildState(),
    moveHistory: [
      { side: "first", data: { x: 0, y: 0 }, label: "Đen A1", at: 1 },
      { side: "second", data: { x: 0, y: 1 }, label: "Trắng A2", at: 2 },
      { side: "first", data: { x: 1, y: 0 }, label: "Đen B1", at: 3 },
    ],
    turn: "first",
    status: "playing",
    yourSide: "first",
  };

  // 1) Host mở lại phòng đã mất -> kèm restore
  const host = connect();
  await new Promise((r) => host.on("connect", r));
  const hs = await join(host, {
    roomId, role: "player", name: "Host", playerId: "p-host", inviteToken: token, restore,
  });
  check(hs.you.side === "first", "Khôi phục: host ngồi đúng phe đã lưu (first)");
  check(hs.moveHistory.length === 3, "Khôi phục: giữ nguyên 3 nước lịch sử");
  check(hs.state.grid[0] === "first" && hs.state.grid[1 * 15] === "second", "Khôi phục: bàn cờ đúng vị trí quân");
  check(hs.status === "waiting", "Khôi phục ván dở -> 'waiting' chờ đối thủ nối lại");

  // 2) Đối thủ vào lại bằng cùng link mời -> nối lại, resume playing
  const opp = connect();
  await new Promise((r) => opp.on("connect", r));
  const hostResume = nextState(host);
  const os = await join(opp, {
    roomId, role: "player", name: "Opp", playerId: "p-opp", inviteToken: token,
  });
  check(os.you.side === "second", "Đối thủ ngồi phe còn lại (second)");
  check(os.status === "playing", "Đủ 2 người -> resume 'playing'");
  check(os.turn === "first", "Giữ đúng lượt đã lưu (first)");
  await hostResume;

  // 3) Host (first) đi tiếp được trên bàn đã khôi phục
  let updated = null;
  host.on("room:state", (s) => (updated = s));
  host.emit("move:make", { roomId, data: { x: 2, y: 0 } });
  await new Promise((r) => setTimeout(r, 200));
  check(updated && updated.moveHistory.length === 4, "Đi tiếp được sau khôi phục (4 nước)");

  // 4) Khôi phục KHÔNG ghi đè nếu phòng đã tồn tại (token sai vẫn vào nhưng không phá state)
  const intruder = connect();
  await new Promise((r) => intruder.on("connect", r));
  const is = await join(intruder, {
    roomId, role: "player", name: "X", playerId: "p-x", inviteToken: "sai",
    restore: { ...restore, state: buildState(), moveHistory: [] },
  });
  check(is.moveHistory.length === 4, "Phòng đang sống: restore bị bỏ qua, state không bị reset");
  check(is.you.role === "spectator", "Người vào token sai -> spectator");

  host.close(); opp.close(); intruder.close();
  console.log(failures === 0 ? "\n✅ RESTORE PASS" : `\n❌ ${failures} thất bại`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
