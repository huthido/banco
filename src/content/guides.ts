import type { GameType } from "@/types/game";

export type PieceGuide = { symbol: string; name: string; move: string };

export type Guide = {
  type: GameType;
  tagline: string;
  intro: string;
  /** Các bước cơ bản để chơi. */
  howToPlay: string[];
  /** Luật chính. */
  rules: string[];
  /** Cách di chuyển/hành động từng quân (nếu có nhiều loại quân). */
  pieces?: PieceGuide[];
  /** Điều kiện thắng. */
  win: string;
  /** Mẹo/lưu ý. */
  tips?: string[];
};

export const GUIDES: Record<GameType, Guide> = {
  gomoku: {
    type: "gomoku",
    tagline: "Năm quân thẳng hàng là thắng",
    intro:
      "Cờ caro (Gomoku) là trò chơi hai người trên bàn 15×15. Hai bên lần lượt đặt quân của mình lên các giao điểm trống; ai tạo được năm quân liên tiếp trước sẽ thắng. Luật đơn giản nhưng đòi hỏi tính toán tấn công và phòng thủ.",
    howToPlay: [
      "Quân Đen đi trước, sau đó hai bên luân phiên mỗi lượt đặt một quân.",
      "Bấm vào một giao điểm trống để đặt quân của bạn.",
      "Quân đã đặt nằm cố định, không di chuyển hay bị ăn.",
      "Vừa tìm cách tạo hàng 5 của mình, vừa chặn hàng của đối thủ.",
    ],
    rules: [
      "Bàn cờ 15×15 giao điểm; mỗi ô trống chỉ đặt được một quân.",
      "Thắng khi có đúng 5 quân (trở lên) liên tiếp theo hàng ngang, dọc hoặc chéo.",
      "Nếu kín bàn mà chưa ai đủ 5 quân thì hòa.",
    ],
    pieces: [
      { symbol: "●", name: "Quân Đen", move: "Đặt cố định vào giao điểm trống, đi trước." },
      { symbol: "○", name: "Quân Trắng", move: "Đặt cố định vào giao điểm trống, đi sau." },
    ],
    win: "Tạo được 5 quân cùng màu liên tiếp theo hàng ngang, dọc hoặc đường chéo.",
    tips: [
      "Chú ý các thế “4 mở” (bốn quân hai đầu thông) vì đối thủ buộc phải chặn.",
      "Ưu tiên chặn sớm khi đối thủ có 3 quân liên tiếp hai đầu thông.",
    ],
  },

  chess: {
    type: "chess",
    tagline: "Chiếu hết Vua đối phương",
    intro:
      "Cờ vua là môn cờ quốc tế trên bàn 8×8. Mỗi bên có 16 quân với cách đi riêng. Mục tiêu là dồn Vua đối phương vào thế bị chiếu mà không có cách thoát (chiếu hết).",
    howToPlay: [
      "Bên Trắng đi trước, sau đó luân phiên mỗi lượt đi một quân.",
      "Bấm vào quân của bạn để xem các ô đi hợp lệ (chấm gợi ý), rồi bấm ô đích.",
      "Bàn tự xoay theo phe của bạn; ô Vua bị chiếu được tô đỏ.",
      "Tốt đi đến hàng cuối sẽ tự phong thành Hậu.",
    ],
    rules: [
      "Không được để Vua của mình bị chiếu sau nước đi của mình.",
      "Nhập thành: Vua và Xe cùng di chuyển khi đủ điều kiện (Vua đi 2 ô về phía Xe).",
      "Bắt Tốt qua đường (en passant) và phong cấp Tốt được áp dụng.",
      "Hết nước đi mà Vua không bị chiếu là hòa (stalemate).",
    ],
    pieces: [
      { symbol: "♔", name: "Vua", move: "Đi 1 ô theo mọi hướng (ngang, dọc, chéo). Quân quan trọng nhất." },
      { symbol: "♕", name: "Hậu", move: "Đi xa tùy ý theo hàng ngang, dọc và đường chéo." },
      { symbol: "♖", name: "Xe", move: "Đi xa tùy ý theo hàng ngang hoặc dọc." },
      { symbol: "♗", name: "Tượng", move: "Đi xa tùy ý theo đường chéo (giữ nguyên màu ô)." },
      { symbol: "♘", name: "Mã", move: "Đi hình chữ L (2+1 ô); là quân duy nhất nhảy qua quân khác." },
      { symbol: "♙", name: "Tốt", move: "Tiến thẳng 1 ô (2 ô ở nước đầu), ăn chéo 1 ô; tới hàng cuối thì phong cấp." },
    ],
    win: "Chiếu hết (Vua đối phương bị chiếu và không còn nước thoát).",
    tips: [
      "Kiểm soát trung tâm và phát triển Mã, Tượng sớm.",
      "Nhập thành sớm để Vua an toàn.",
    ],
  },

  xiangqi: {
    type: "xiangqi",
    tagline: "Bắt được Tướng đối phương",
    intro:
      "Cờ tướng (Xiangqi) là cờ truyền thống Trung Hoa trên bàn 9×10, có “sông” chia đôi và “cung” cho mỗi bên. Quân đặt trên giao điểm. Đỏ đi trước. Mục tiêu là bắt được Tướng đối phương.",
    howToPlay: [
      "Bên Đỏ đi trước, sau đó luân phiên mỗi lượt đi một quân.",
      "Bấm vào quân của bạn để xem các ô đi hợp lệ rồi bấm ô đích.",
      "Bàn xoay theo phe của bạn để dễ quan sát.",
    ],
    rules: [
      "Cung là vùng 3×3 có gạch chéo; Tướng và Sĩ không được ra khỏi cung.",
      "Sông nằm giữa bàn: Tượng không qua sông; Tốt qua sông mới được đi ngang.",
      "Hai Tướng không được “đối mặt” trực tiếp trên cùng một cột khi giữa không có quân nào.",
    ],
    pieces: [
      { symbol: "帥", name: "Tướng (Soái)", move: "Đi 1 ô thẳng (ngang/dọc), chỉ trong cung." },
      { symbol: "仕", name: "Sĩ", move: "Đi 1 ô chéo, chỉ trong cung; bảo vệ Tướng." },
      { symbol: "相", name: "Tượng", move: "Đi chéo đúng 2 ô; không qua sông; bị chặn nếu giữa (mắt Tượng) có quân." },
      { symbol: "傌", name: "Mã", move: "Đi hình chữ nhật 2+1; bị “cản Mã” nếu ô kề sát theo hướng đi có quân." },
      { symbol: "俥", name: "Xe", move: "Đi xa tùy ý theo hàng ngang/dọc, không nhảy qua quân." },
      { symbol: "炮", name: "Pháo", move: "Đi như Xe khi không ăn; muốn ăn phải nhảy qua đúng 1 quân làm ngòi." },
      { symbol: "兵", name: "Tốt", move: "Tiến 1 ô; sau khi qua sông được tiến hoặc đi ngang 1 ô, không lùi." },
    ],
    win: "Bắt được Tướng đối phương (hoặc đối phương hết đường cứu Tướng).",
    tips: [
      "Pháo mạnh ở đầu ván khi bàn còn nhiều quân làm ngòi.",
      "Tận dụng luật Tướng đối mặt để ghim hoặc chiếu bí.",
    ],
  },

  checkers: {
    type: "checkers",
    tagline: "Ăn hết quân đối phương",
    intro:
      "Cờ đam (Checkers/Draughts) chơi trên bàn 8×8, quân chỉ đi trên các ô màu sẫm theo đường chéo. Ăn quân bằng cách nhảy qua. Bên nào hết quân hoặc hết nước đi sẽ thua.",
    howToPlay: [
      "Bên Đỏ đi trước, sau đó luân phiên mỗi lượt.",
      "Bấm quân rồi bấm ô chéo trống để đi; muốn ăn thì bấm ô đáp sau quân địch.",
      "Nếu ăn được nhiều lần liên tiếp, bấm tiếp các ô đáp để nối hết chuỗi ăn.",
    ],
    rules: [
      "Bắt buộc ăn khi có nước ăn; nếu đang ăn mà còn nhảy tiếp được thì phải nhảy hết.",
      "Quân thường chỉ đi/ăn về phía trước; tới hàng cuối thì phong Hậu.",
      "Hậu đi và ăn chéo theo cả bốn hướng (1 bước mỗi lần).",
    ],
    pieces: [
      { symbol: "●", name: "Quân thường", move: "Đi chéo tiến 1 ô; ăn bằng cách nhảy qua quân địch kề sát tới ô trống phía sau." },
      { symbol: "♚", name: "Hậu (Quân phong)", move: "Đi/ăn chéo cả 4 hướng (tiến và lùi), mỗi lần 1 bước nhảy." },
    ],
    win: "Đối phương hết quân, hoặc đến lượt mà không còn nước đi hợp lệ.",
    tips: [
      "Đừng tham ăn — cân nhắc chuỗi ăn trả đũa của đối thủ.",
      "Giữ hàng cuối để cản đối thủ phong Hậu.",
    ],
  },

  go: {
    type: "go",
    tagline: "Vây đất và bắt quân",
    intro:
      "Cờ vây (Go) chơi trên bàn 19×19 giao điểm. Hai bên lần lượt đặt quân để vây “đất” và bắt quân đối phương. Kết thúc bằng hai lần bỏ lượt liên tiếp, rồi tính điểm; bên nhiều điểm hơn thắng.",
    howToPlay: [
      "Bên Đen đi trước, sau đó luân phiên đặt quân lên giao điểm trống.",
      "Có thể bấm “Bỏ lượt” thay vì đặt quân.",
      "Khi cả hai cùng bỏ lượt liên tiếp, ván kết thúc và hệ thống tính điểm.",
    ],
    rules: [
      "“Khí” là các giao điểm trống kề một quân/nhóm quân. Nhóm hết khí sẽ bị bắt và nhấc khỏi bàn.",
      "Cấm tự sát: không được đặt quân vào nơi khiến chính nhóm của mình hết khí (trừ khi nước đó bắt được quân địch).",
      "Luật ko: không được đánh lại ngay khiến thế cờ lặp lại như trước đó.",
      "Tính điểm theo vùng: số quân trên bàn cộng số đất vây kín bởi một màu; Trắng được cộng komi 6,5.",
    ],
    pieces: [
      { symbol: "●", name: "Quân Đen", move: "Đặt cố định vào giao điểm trống, đi trước; không cộng komi." },
      { symbol: "○", name: "Quân Trắng", move: "Đặt cố định vào giao điểm trống; được cộng 6,5 điểm komi." },
    ],
    win: "Sau khi hai bên bỏ lượt, bên có tổng điểm (quân + đất, cộng komi cho Trắng) cao hơn sẽ thắng.",
    tips: [
      "Trước khi bỏ lượt, hãy bắt hết các quân chết — hệ thống không tự nhận diện quân chết.",
      "Chiếm góc và biên trước, sau đó mới tranh trung tâm.",
    ],
  },
};
