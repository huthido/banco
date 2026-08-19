// E2E: chơi với máy — tạo phòng bot, host join, bot đi nước, gợi ý hint.
// Cần server đang chạy ở cổng 3100.
import { io } from "socket.io-client";

const BASE = "http://localhost:3100";
const connect = () => io(BASE, { transports: ["websocket"], forceNew: true });
const join = (s, p) =>
  new Promise((res, rej) => s.emit("room:join", p, (r) => (r.ok ? res(r.snapshot) : rej(new Error(r.error)))));
const nextState = (s) => new Promise((res) => s.once("room:state", res));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Chờ tới khi nhận được snapshot thoả điều kiện (có timeout). */
function waitFor(sock, pred, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      sock.off("room:state", on);
      reject(new Error(`hết giờ chờ ${label}`));
    }, timeoutMs);
    const on = (snap) => {
      console.log(`  [room:state] moves=${snap.moveHistory.length} status=${snap.status}`);
      if (pred(snap)) {
        clearTimeout(t);
        sock.off("room:state", on);
        resolve(snap);
      }
    };
    sock.on("room:state", on);
  });
}

let failures = 0;
const check = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failures++; };

async function main() {
  // 1) Tạo phòng bot: host ngồi "second", bot (Cấp 4) ngồi "first" và đi trước.
  const { roomId, inviteToken } = await fetch(`${BASE}/api/rooms`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameType: "gomoku", hostSide: "second", botLevel: 4 }),
  }).then((r) => r.json());
  check(typeof roomId === "string", `Tạo phòng bot OK: ${roomId}`);

  const host = connect(); await new Promise((r) => host.on("connect", r));
  const snap = await join(host, { roomId, role: "player", name: "An", playerId: "ph", inviteToken });
  check(snap.status === "playing", "Đủ người -> ván bắt đầu ngay");
  check(snap.bot?.level === 4, "Snapshot có thông tin bot (level 4)");
  check(snap.you.side === "second", "Host ngồi phe second");
  check(snap.players.first?.name.includes("Máy"), `Ghế bot có tên máy: "${snap.players.first?.name}"`);

  // 2) Bot (first) phải tự đi nước đầu tiên trong ~2s.
  const after = await waitFor(host, (s) => s.moveHistory.length >= 1, 8000, "nước đi của bot");
  check(after.moveHistory.length >= 1, `Bot đã đi nước đầu (${after.moveHistory.length} nước)`);

  // 3) Host đi nước -> bot trả lời nước thứ 2.
  const before = after.moveHistory.length;
  const st = after.state;
  // Tìm ô trống bất kỳ để đi (không cần thông minh — chỉ test luồng).
  const grid = st.grid;
  let placed = false;
  outer: for (let y = 0; y < st.rows; y++)
    for (let x = 0; x < st.cols; x++)
      if (grid[y * st.cols + x] === null) {
        host.emit("move:make", { roomId, data: { x, y } });
        placed = true;
        break outer;
      }
  check(placed, "Host đã gửi nước đi");
  const after2 = await waitFor(host, (s) => s.moveHistory.length >= before + 2, 8000, "bot trả lời");
  check(after2.moveHistory.length >= before + 2, `Bot trả lời nước thứ 2 (${after2.moveHistory.length} nước)`);

  // 4) Gợi ý: host yêu cầu hint -> server trả nước + hợp lệ theo luật (ô trống).
  const hint = await new Promise((res) => host.emit("hint:request", { roomId }, res));
  check(hint.ok === true && hint.move && typeof hint.move.x === "number", "Gợi ý trả về nước đi");
  if (hint.ok) {
    const gi = after2.state.grid;
    const idx = hint.move.y * after2.state.cols + hint.move.x;
    check(gi[idx] === null, "Ô gợi ý đang trống");
  }

  host.close();
  console.log(failures === 0 ? "\n✅ BOT E2E PASS" : `\n❌ ${failures} thất bại`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
