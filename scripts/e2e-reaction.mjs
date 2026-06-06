import { io } from "socket.io-client";

const BASE = "http://localhost:3107";
const connect = () => io(BASE, { transports: ["websocket"], forceNew: true });
const join = (s, p) =>
  new Promise((res, rej) => s.emit("room:join", p, (r) => (r.ok ? res(r.snapshot) : rej(new Error(r.error)))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (c, m) => { console.log(`${c ? "✓" : "✗"} ${m}`); if (!c) failures++; };

async function main() {
  const { roomId, inviteToken } = await fetch(`${BASE}/api/rooms`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameType: "gomoku", hostSide: "first" }),
  }).then((r) => r.json());

  const host = connect(); await new Promise((r) => host.on("connect", r));
  await join(host, { roomId, role: "player", name: "Host", playerId: "ph", inviteToken });
  const opp = connect(); await new Promise((r) => opp.on("connect", r));
  await join(opp, { roomId, role: "player", name: "Opp", playerId: "po", inviteToken });
  const spec = connect(); await new Promise((r) => spec.on("connect", r));
  await join(spec, { roomId, role: "spectator", name: "Watcher", playerId: "ps" });

  // Thu các burst nhận được ở mỗi client
  const got = { host: [], opp: [], spec: [] };
  host.on("reaction:burst", (b) => got.host.push(b));
  opp.on("reaction:burst", (b) => got.opp.push(b));
  spec.on("reaction:burst", (b) => got.spec.push(b));

  // 1) Người XEM thả 🔥 -> cả 3 nhận được
  spec.emit("reaction:send", { roomId, emoji: "🔥" });
  await sleep(200);
  check(got.host.length === 1 && got.host[0].emoji === "🔥", "Host nhận 🔥 từ người xem");
  check(got.opp.length === 1 && got.opp[0].emoji === "🔥", "Đối thủ nhận 🔥");
  check(got.spec.length === 1 && got.spec[0].emoji === "🔥", "Người gửi cũng nhận lại 🔥");
  check(got.spec[0].name === "Watcher", "Kèm đúng tên người gửi");

  // 2) Người CHƠI thả 👍 -> cả 3 nhận
  host.emit("reaction:send", { roomId, emoji: "👍" });
  await sleep(200);
  check(got.spec.length === 2 && got.spec[1].emoji === "👍", "Người xem nhận 👍 từ người chơi");

  // 3) Emoji NGOÀI danh sách bị chặn
  host.emit("reaction:send", { roomId, emoji: "💩" });
  await sleep(200);
  check(got.host.length === 2, "Emoji ngoài danh sách bị chặn (không phát)");

  host.close(); opp.close(); spec.close();
  console.log(failures === 0 ? "\n✅ REACTION PASS" : `\n❌ ${failures} thất bại`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
