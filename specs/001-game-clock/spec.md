# Feature Specification: Đồng hồ cờ (Time Control)

**Feature Branch**: `001-game-clock`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Đồng hồ cờ (time control): mỗi người chơi có quỹ thời gian, hết giờ là thua, hỗ trợ cho mọi loại cờ"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Đếm giờ theo lượt và thua khi hết giờ (Priority: P1)

Hai người chơi vào một bàn cờ có bật giới hạn thời gian. Mỗi người có một quỹ thời gian riêng;
đồng hồ của người đang tới lượt chạy lùi, người kia dừng. Khi một người đi quân, đồng hồ của họ
dừng và đồng hồ đối thủ bắt đầu chạy. Nếu quỹ thời gian của một người về 0, ván kết thúc ngay,
người đó **thua do hết giờ**, đối thủ thắng.

**Why this priority**: Đây là giá trị cốt lõi của tính năng — không có nó thì "đồng hồ cờ" vô nghĩa.
Một mình story này đã là một MVP dùng được.

**Independent Test**: Tạo bàn có thời gian ngắn (vd 30 giây/người), để một bên không đi cho tới khi
hết giờ → ván phải tự kết thúc với kết quả thua-do-hết-giờ cho bên đó, hiển thị cho cả hai và người xem.

**Acceptance Scenarios**:

1. **Given** bàn cờ bật thời gian và đang tới lượt một bên (vd Trắng ở cờ vua, tức `first`),
   **When** bên đó đi một nước hợp lệ, **Then** đồng hồ của họ dừng và đồng hồ đối thủ (`second`)
   bắt đầu chạy.
2. **Given** đồng hồ của một người chơi về 00:00, **When** thời gian chạm 0, **Then** ván kết thúc
   ngay, người đó thua (lý do "hết giờ"), kết quả đẩy realtime tới cả hai người chơi và người xem.
3. **Given** ván đã kết thúc (chiếu hết/hết giờ/hòa/xin thua), **When** bất kỳ đồng hồ nào, **Then**
   mọi đồng hồ dừng.

---

### User Story 2 - Chọn cấu hình thời gian khi tạo bàn (Priority: P2)

Người tạo bàn chọn chế độ thời gian trước khi mời đối thủ: hoặc **không giới hạn** (như hiện nay),
hoặc một mốc thời gian cơ bản cho mỗi người (vd 1, 3, 5, 10 phút), kèm tùy chọn **cộng giây mỗi nước
đi** (increment, vd +0/+2/+5 giây).

**Why this priority**: Cần để người dùng bật/điều chỉnh tính năng; nhưng pipeline đếm giờ (P1) mới là
phần lõi, nên đây là P2.

**Independent Test**: Ở màn tạo bàn, chọn "5 phút + 3 giây/nước" → bàn tạo ra cho thấy mỗi người bắt
đầu với 5:00, và sau mỗi nước đi quỹ thời gian của người vừa đi tăng thêm 3 giây.

**Acceptance Scenarios**:

1. **Given** màn tạo bàn, **When** chọn "Không giới hạn", **Then** bàn hoạt động đúng như hiện tại,
   không hiển thị đồng hồ.
2. **Given** chọn "3 phút + 2 giây/nước", **When** một người đi xong một nước, **Then** quỹ thời gian
   của người đó được cộng 2 giây.

---

### User Story 3 - Hiển thị đồng hồ realtime cho mọi người (Priority: P3)

Đồng hồ của cả hai bên hiển thị trực quan trên bàn cờ, cập nhật realtime cho cả người chơi lẫn người
xem; đồng hồ của bên đang tới lượt được làm nổi bật; thời gian sắp hết (vd dưới 10 giây) chuyển màu
cảnh báo.

**Why this priority**: Tăng trải nghiệm nhưng không bắt buộc để luật hết-giờ hoạt động; có thể bổ sung
sau P1/P2.

**Independent Test**: Mở bàn ở một cửa sổ người chơi và một cửa sổ người xem → cả hai thấy cùng giá trị
đồng hồ, lệch nhau không quá ~1 giây, và bên tới lượt được highlight.

**Acceptance Scenarios**:

1. **Given** một người xem mở bàn, **When** người chơi đi quân, **Then** người xem thấy đồng hồ đổi bên
   chạy gần như tức thời.

---

### Edge Cases

- **Mất kết nối tạm thời**: Khi một người chơi rớt mạng rồi vào lại (giữ ghế qua `playerId`), đồng hồ
  phải phản ánh đúng thời gian đã trôi trong lúc họ vắng (server là nguồn chân lý, vẫn đếm).
- **Server restart (in-memory)**: Khi khôi phục ván từ snapshot client, thời gian còn lại của mỗi bên
  phải được khôi phục hợp lý (xem Assumptions về độ chính xác sau restart).
- **Hết giờ đúng lúc đang đi nước thắng**: Nếu thời gian về 0 trước khi nước đi được server ghi nhận,
  ưu tiên kết quả "hết giờ".
- **Cả hai gần hết giờ / lệch đồng hồ client-server**: Quyết định thắng-thua do hết giờ MUST dựa trên
  đồng hồ phía server, không dựa trên đồng hồ hiển thị ở client.
- **Người xem đông**: Cập nhật đồng hồ không được gây ngập sự kiện (không gửi mỗi 100ms cho mọi người).
- **Đánh lại / hoán phe**: Ván mới phải đặt lại quỹ thời gian theo cấu hình ban đầu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cho phép người tạo bàn chọn chế độ thời gian: không giới hạn, hoặc thời gian
  cơ bản mỗi người, có/không cộng giây mỗi nước (increment).
- **FR-002**: Hệ thống MUST đếm lùi thời gian của **chỉ** người đang tới lượt; đồng hồ người kia dừng.
- **FR-003**: Khi một người hoàn tất một nước đi hợp lệ, hệ thống MUST dừng đồng hồ của họ (và cộng
  increment nếu có) rồi khởi động đồng hồ đối thủ.
- **FR-004**: Khi quỹ thời gian của một người về 0, hệ thống MUST kết thúc ván ngay với kết quả người
  đó **thua do hết giờ**, và đẩy kết quả realtime tới mọi người chơi và người xem.
- **FR-005**: Quyết định hết-giờ MUST căn cứ đồng hồ phía **server** (nguồn chân lý), không phải đồng hồ
  hiển thị ở client.
- **FR-006**: Hệ thống MUST đẩy trạng thái đồng hồ tới client đủ để hiển thị mượt mà mà KHÔNG gây ngập
  sự kiện (đồng bộ định kỳ + nội suy phía client là chấp nhận được).
- **FR-007**: Khi người chơi reconnect, hệ thống MUST trả về thời gian còn lại đúng theo trạng thái server.
- **FR-008**: Khi đánh lại / hoán phe, hệ thống MUST đặt lại quỹ thời gian theo cấu hình ban đầu của bàn.
- **FR-009**: Chế độ "không giới hạn" MUST giữ hành vi hiện tại (không đồng hồ, không thua do hết giờ).
- **FR-010**: Tính năng MUST áp dụng cho **mọi loại cờ** hiện có (caro, vua, tướng, đam, vây) vì nó độc
  lập với luật từng loại cờ.

### Key Entities *(include if feature involves data)*

- **Cấu hình thời gian (TimeControl)**: thuộc về một bàn cờ — gồm thời gian cơ bản mỗi người (giây) và
  increment mỗi nước (giây); giá trị đặc biệt "không giới hạn".
- **Trạng thái đồng hồ (ClockState)**: cho mỗi ván — thời gian còn lại của từng bên, bên nào đang chạy,
  và mốc thời điểm server bắt đầu tính cho lượt hiện tại (để suy ra thời gian đã trôi).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Khi một bên để hết giờ, ván kết thúc và mọi client (2 người chơi + người xem) thấy kết quả
  trong vòng **≤ 1 giây**.
- **SC-002**: Sai lệch giữa đồng hồ hiển thị ở client và đồng hồ server **≤ 1 giây** trong điều kiện mạng
  bình thường.
- **SC-003**: Người chơi reconnect sau khi rớt mạng thấy thời gian còn lại đúng (sai lệch ≤ 1 giây so với
  server) trong **100%** trường hợp thử.
- **SC-004**: Bật/điều chỉnh thời gian khi tạo bàn không làm tăng thời gian tạo bàn quá **10%** so với hiện tại.
- **SC-005**: Tính năng hoạt động đồng nhất trên cả **5/5** loại cờ.

## Assumptions

- Chế độ mặc định vẫn là **không giới hạn** để không phá trải nghiệm hiện có; đồng hồ là tùy chọn opt-in.
- Trạng thái đồng hồ sống cùng trạng thái ván **in-memory** trên server (theo Hiến pháp — đơn giản trước,
  chưa cần DB).
- Sau khi **server restart** và khôi phục từ snapshot client, thời gian còn lại được khôi phục ở mức "đủ
  tốt cho chơi giải trí" (chấp nhận sai lệch nhỏ); độ chính xác tuyệt đối sau restart **ngoài phạm vi v1**.
- Mốc tham chiếu thời gian là đồng hồ server; lệch giờ giữa các client là chuyện hiển thị, không ảnh hưởng
  luật.
- Giao diện và bản địa hóa (tiếng Việt) theo chuẩn sẵn có của dự án; chi tiết hiển thị thuộc bước plan/design.
