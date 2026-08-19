import { customAlphabet } from "nanoid";

// Mã phòng là số ngẫu nhiên 6 chữ số — dễ đọc, dễ nhớ hơn chữ lẫn số.
const nanoRoom = customAlphabet("0123456789", 6);
const nanoToken = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  16
);

/** Sinh mã phòng số ngẫu nhiên 6 chữ số, vd "482913". */
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
