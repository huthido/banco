import { io } from "socket.io-client";

const BASE = "http://localhost:3108";
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
  await join(host, { roomId, role: "player", name: "An", playerId: "ph", inviteToken });
  const opp = connect(); await new Promise((r) => opp.on("connect", r));
  await join(opp, { roomId, role: "player", name: "Bình", playerId: "po", inviteToken });
  const spec = connect(); await new Promise((r) => spec.on("connect", r));
  await join(spec, { roomId, role: "spectator", name: "Khán", playerId: "ps" });

  const got = { host: [], opp: [], spec: [] };
  host.on("board:message", (m) => got.host.push(m));
  opp.on("board:message", (m) => got.opp.push(m));
  spec.on("board:message", (m) => got.spec.push(m));

  // 1) Host (first) nhắn -> cả 3 nhận, side='first'
  host.emit("board:say", { roomId, text: "Chiếu!" });
  await sleep(200);
  check(got.spec.length === 1 && got.spec[0].side === "first" && got.spec[0].text === "Chiếu!",
    "Tin của host (first) tới mọi người, đúng phe + nội dung");
  check(got.spec[0].name === "An", "Kèm đúng tên người chơi");

  // 2) Opp (second) nhắn -> side='second'
  opp.emit("board:say", { roomId, text: "Để xem" });
  await sleep(200);
  check(got.host.length === 2 && got.host[1].side === "second", "Tin của đối thủ gắn phe 'second'");

  // 3) Người xem KHÔNG nhắn được lên bàn
  let specErr = false;
  spec.once("error", (e) => { if (e.code === "NOT_PLAYER") specErr = true; });
  spec.emit("board:say", { roomId, text: "tôi xem thôi" });
  await sleep(200);
  check(specErr, "Người xem bị chặn nhắn lên bàn (NOT_PLAYER)");
  check(got.host.length === 2, "Không phát tin của người xem");

  host.close(); opp.close(); spec.close();
  console.log(failures === 0 ? "\n✅ BOARD-SAY PASS" : `\n❌ ${failures} thất bại`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
