import { io } from "socket.io-client";

const BASE = "http://localhost:3100";

function connect() {
  return io(BASE, { transports: ["websocket"], forceNew: true });
}

function join(sock, roomId, role, name, playerId, inviteToken) {
  return new Promise((resolve, reject) => {
    sock.emit("room:join", { roomId, role, name, playerId, inviteToken }, (res) => {
      if (res.ok) resolve(res.snapshot);
      else reject(new Error(res.error));
    });
  });
}

function nextState(sock) {
  return new Promise((resolve) => sock.once("room:state", resolve));
}

const log = (...a) => console.log(...a);
let failures = 0;
function check(cond, msg) {
  log(`${cond ? "✓" : "✗"} ${msg}`);
  if (!cond) failures++;
}

async function main() {
  // 1) Tạo phòng
  const created = await fetch(`${BASE}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameType: "gomoku", hostSide: "first" }),
  }).then((r) => r.json());
  const { roomId, inviteToken } = created;
  log("Room:", roomId);

  // 2) Host join (player, có token)
  const host = connect();
  await new Promise((r) => host.on("connect", r));
  const hostSnap = await join(host, roomId, "player", "Host", "pid-host", inviteToken);
  check(hostSnap.you.side === "first", "Host ngồi phe first");
  check(hostSnap.status === "waiting", "Phòng đang chờ (mới 1 người)");

  // 3) Đối thủ join qua link mời (player, token đúng)
  const opp = connect();
  await new Promise((r) => opp.on("connect", r));
  const oppStatePromise = nextState(host);
  const oppSnap = await join(opp, roomId, "player", "Opponent", "pid-opp", inviteToken);
  check(oppSnap.you.side === "second", "Đối thủ ngồi phe second");
  check(oppSnap.status === "playing", "Đủ 2 người -> đang chơi");
  const hostAfterOpp = await oppStatePromise;
  check(hostAfterOpp.status === "playing", "Host nhận broadcast trạng thái playing");

  // 4) Người xem join (không token) -> spectator
  const spec = connect();
  await new Promise((r) => spec.on("connect", r));
  const specSnap = await join(spec, roomId, "spectator", "Watcher", "pid-spec");
  check(specSnap.you.role === "spectator", "Người xem có vai spectator");
  check(specSnap.you.side === null, "Người xem không có phe");

  // 5) Đánh sai lượt: opponent (second) đi trước khi tới lượt -> nhận error
  let gotTurnError = false;
  opp.once("error", (e) => { if (e.code === "NOT_YOUR_TURN") gotTurnError = true; });
  opp.emit("move:make", { roomId, data: { x: 0, y: 0 } });
  await new Promise((r) => setTimeout(r, 150));
  check(gotTurnError, "Chặn đi sai lượt (NOT_YOUR_TURN)");

  // 6) Host thắng bằng 5 quân ngang: (0..4, 0). Opponent đi hàng khác.
  // Theo dõi snapshot mới nhất + chờ tới đúng lượt mong muốn (tránh race của test).
  let over = null;
  let snap = oppSnap; // trạng thái khởi điểm đang playing, lượt = first
  host.on("game:over", (r) => (over = r));
  host.on("room:state", (s) => (snap = s));
  const waitTurn = (side) =>
    new Promise((resolve) => {
      const tick = () => {
        if (snap.status !== "playing" || snap.turn === side) return resolve();
        setTimeout(tick, 10);
      };
      tick();
    });

  for (let i = 0; i < 5; i++) {
    await waitTurn("first");
    host.emit("move:make", { roomId, data: { x: i, y: 0 } });
    if (i < 4) {
      await waitTurn("second");
      opp.emit("move:make", { roomId, data: { x: i, y: 5 } });
    }
  }
  await new Promise((r) => setTimeout(r, 200));
  const firstCount = snap.state.grid.filter((c) => c === "first").length;
  log(`  debug: firstStones=${firstCount} status=${snap.status}`);
  check(over && over.winner === "first", `Host thắng 5 quân (${over && over.reason})`);

  // 7) Người xem không đi được quân
  let specBlocked = false;
  spec.once("error", (e) => { if (e.code === "NOT_PLAYER") specBlocked = true; });
  spec.emit("move:make", { roomId, data: { x: 10, y: 10 } });
  await new Promise((r) => setTimeout(r, 150));
  check(specBlocked, "Người xem bị chặn đi quân (NOT_PLAYER)");

  // 8) Chat broadcast
  let chatOk = false;
  spec.once("chat:message", (m) => { if (m.text === "gg") chatOk = true; });
  host.emit("chat:send", { roomId, text: "gg" });
  await new Promise((r) => setTimeout(r, 150));
  check(chatOk, "Chat broadcast tới mọi người");

  host.close(); opp.close(); spec.close();
  log(failures === 0 ? "\n✅ TẤT CẢ PASS" : `\n❌ ${failures} kiểm thử thất bại`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
