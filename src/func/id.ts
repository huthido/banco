import { customAlphabet } from "nanoid";

// Bảng chữ dễ đọc (bỏ ký tự dễ nhầm: 0/O, 1/l/I) cho mã phòng.
const roomAlphabet = "23456789abcdefghijkmnpqrstuvwxyz";
const nanoRoom = customAlphabet(roomAlphabet, 6);
const nanoToken = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  16
);

/** Sinh mã phòng ngắn 6 ký tự, vd "k7m2pq". */
export function genRoomId(): string {
  return nanoRoom();
}

/** Sinh token mời đối thủ (khó đoán). */
export function genToken(): string {
  return nanoToken();
}

/** Sinh id ổn định cho 1 người chơi (lưu localStorage để reconnect). */
export function genPlayerId(): string {
  return nanoToken();
}
