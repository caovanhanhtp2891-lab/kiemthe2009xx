import { ElementType, SectId, SkillVfxKind } from './types';
import kimSheetUrl from '../assets/images/vfx_sheet_kim_1795136377820.jpg';
import mocSheetUrl from '../assets/images/vfx_sheet_moc_1795136355206.jpg';
import thuySheetUrl from '../assets/images/vfx_sheet_thuy_1795136351890.jpg';
import hoaSheetUrl from '../assets/images/vfx_sheet_hoa_dark_1795136387536.jpg';
import thoSheetUrl from '../assets/images/vfx_sheet_tho_1795136354608.jpg';
import thienVuongSheetUrl from '../assets/images/vfx_sheet_thien_vuong_1795137087792.jpg';
import nguDocMinhGiaoSheetUrl from '../assets/images/vfx_sheet_ngu_doc_minh_giao_1795137086198.jpg';
import thuyYenDoanThiSheetUrl from '../assets/images/vfx_sheet_thuy_yen_doan_thi_1795137087485.jpg';
import caiBangThienNhanSheetUrl from '../assets/images/vfx_sheet_cai_bang_thien_nhan_1795137089409.jpg';
import voDangConLonSheetUrl from '../assets/images/vfx_sheet_vo_dang_con_lon_1795137090133.jpg';
import projectilesSheetUrl from '../assets/images/vfx_sheet_projectiles_1795137089889.jpg';
import collisionSheetUrl from '../assets/images/vfx_sheet_collision_1795136353314.jpg';
import hitImpactSheetUrl from '../assets/images/vfx_sheet_hit_impact_1795136351845.jpg';
import hitCollisionKimUrl from '../assets/images/vfx_hit_collision_kim_1795137642251.jpg';
import hitCollisionMocUrl from '../assets/images/vfx_hit_collision_moc_1795137642511.jpg';
import hitCollisionThuyUrl from '../assets/images/vfx_hit_collision_thuy_1795137641710.jpg';
import hitCollisionHoaUrl from '../assets/images/vfx_hit_collision_hoa_1795137641003.jpg';
import hitCollisionThoUrl from '../assets/images/vfx_hit_collision_tho_1795137645510.jpg';
import castingKimHoaThoUrl from '../assets/images/vfx_casting_kim_hoa_tho_1795138082025.jpg';
import castingMocThuyUrl from '../assets/images/vfx_casting_moc_thuy_1795138082528.jpg';
import heroCastingPosesUrl from '../assets/images/vfx_hero_casting_poses_1795138083041.jpg';

export type VfxSheetId =
  | 'hero_casting'
  | 'casting_kim_hoa_tho'
  | 'casting_moc_thuy'
  | 'skill_kim'
  | 'skill_thien_vuong'
  | 'skill_moc'
  | 'skill_ngu_doc_minh_giao'
  | 'skill_thuy'
  | 'skill_thuy_yen_doan_thi'
  | 'skill_hoa'
  | 'skill_cai_bang_thien_nhan'
  | 'skill_tho'
  | 'skill_vo_dang_con_lon'
  | 'projectiles'
  | 'hit_collision_kim'
  | 'hit_collision_moc'
  | 'hit_collision_thuy'
  | 'hit_collision_hoa'
  | 'hit_collision_tho'
  | 'collision'
  | 'hit_impact';

export type VfxSheetCategory =
  | 'casting'
  | 'skill'
  | 'projectile'
  | 'hit_collision'
  | 'collision'
  | 'hit';

export interface VfxSheetMeta {
  id: VfxSheetId;
  category: VfxSheetCategory;
  title: string;
  shortTitle: string;
  subtitle: string;
  element?: ElementType;
  accentColor: string;
  src: string;
  cols: 4;
  rows: 4;
  frameCount: 16;
  rowLabels: [string, string, string, string];
  rowNotes: [string, string, string, string];
}

export const VFX_SHEET_REGISTRY: readonly VfxSheetMeta[] = [
  {
    id: 'hero_casting',
    category: 'casting',
    title: 'Động Tác Nhân Vật Thi Triển Chiêu Thức',
    shortTitle: 'Nhân Vật Thi Triển',
    subtitle: '4 chuỗi tư thế thi triển tách biệt khỏi đòn trúng: Tụ Khí · Xuất Chưởng · Ngự Kiếm · Khởi Thức Đao Kiếm',
    accentColor: '#FDE047',
    src: heroCastingPosesUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Chuỗi 1: Tụ Khí Nội Công (Thu Khí -> Bộc Phát Song Chưởng)',
      'Chuỗi 2: Kết Ấn Xuất Chưởng (Vặn Mình -> Tụ Cầu -> Đẩy Chưởng)',
      'Chuỗi 3: Ngự Kiếm Trận Pháp (Giơ Kiếm -> Thái Cực Ấn -> Chỉ Kiếm)',
      'Chuỗi 4: Khởi Thức Đao / Kiếm (Hạ Tấn -> Vung Tụ Lực -> Chém -> Thu Thế)',
    ],
    rowNotes: [
      '4 khung tư thế nhân vật tụ nội công quanh ngực rồi bung chưởng lực',
      '4 khung chuyển động xoay thân, tụ quang cầu giữa hai tay và phát chưởng',
      '4 khung giơ trường kiếm triệu hồi ấn Thái Cực và điều khiển phi kiếm',
      '4 khung rút kiếm hạ tấn, tích lực đỉnh đầu, chém vòng cung và thu chiêu',
    ],
  },
  {
    id: 'casting_kim_hoa_tho',
    category: 'casting',
    title: 'Thi Triển Chiêu Thức · Kim · Hỏa · Thổ',
    shortTitle: 'Thi Triển Kim/Hỏa/Thổ',
    subtitle: 'Tụ khí & khởi thức tại vị trí nhân vật — tách biệt hoàn toàn với hiệu ứng đánh trúng trên quái',
    accentColor: '#F59E0B',
    src: castingKimHoaThoUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Hệ Kim: Tụ Vòng Kim Khí & Khởi Ấn Phật Quang',
      'Hệ Hỏa: Xoáy Tụ Long Hỏa & Bộc Phát Xuất Chưởng',
      'Hệ Thổ: Trận Đồ Bát Quái Dưới Chân & Dẫn Kiếm Lôi',
      'Khởi Thức Ngoại Công: Sóng Khí Phản Lực Phóng Chiêu',
    ],
    rowNotes: [
      '4 khung tụ vòng khí vàng kim nén thành ấn liên hoa tại người xuất chiêu',
      '4 khung xoáy lửa hội tụ vào tâm rồi lóe sáng đẩy chiêu về phía trước',
      '4 khung vòng Bát Quái phát sáng dưới chân nhân vật kèm phi kiếm & tia sét',
      '4 khung sóng khí trắng vàng hình bán nguyệt đẩy lực xuất chiêu mượt mà',
    ],
  },
  {
    id: 'casting_moc_thuy',
    category: 'casting',
    title: 'Thi Triển Chiêu Thức · Mộc · Thủy',
    shortTitle: 'Thi Triển Mộc/Thủy',
    subtitle: 'Kết ấn độc, cơ quan, Thánh Hỏa, Liên Hoa & Lục Mạch ngay tại tư thế xuất chiêu của nhân vật',
    accentColor: '#38BDF8',
    src: castingMocThuyUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Hệ Mộc (Đường Môn / Ngũ Độc): Tụ Độc Sương & Ấn Cơ Quan',
      'Hệ Mộc (Minh Giáo): Xoáy Tụ Thánh Hỏa Lục Mang Tinh',
      'Hệ Thủy (Nga Mi / Thúy Yên): Tụ Cánh Sen Băng & Hoa Tuyết',
      'Hệ Thủy (Đoàn Thị): Tụ Chỉ Lực Lục Mạch Thần Kiếm',
    ],
    rowNotes: [
      '4 khung khí độc xanh tím kết tụ thành vòng ấn bánh răng cơ quan',
      '4 khung ngọn lửa ngọc-vàng cuộn lên thành vòng lục giác Thánh Hỏa',
      '4 khung cánh hoa sen băng và tinh thể tuyết xoay tụ quanh nhân vật',
      '4 khung tụ điểm sáng xanh lam ở đầu ngón tay rồi phóng chùm chỉ kiếm',
    ],
  },
  {
    id: 'skill_kim',
    category: 'skill',
    title: 'Sheet Thiếu Lâm · Hệ Kim',
    shortTitle: 'Thiếu Lâm (Kim)',
    subtitle: 'Đao Thiếu Lâm & Côn Thiếu Lâm — Phục Ma, Phật Chưởng, Thất Tinh, Kim Chung',
    element: 'kim',
    accentColor: '#E8B84B',
    src: kimSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Đao Khí Bán Nguyệt (Phục Ma / Thiên Trúc)',
      'Phật Chưởng Liên Hoa Ấn (Phật Nộ Trảm Thiên)',
      'Vòng Côn Sao Vàng (Thất Tinh / Mạn Đà La)',
      'Xung Kích Thương & Kim Chung Tráo Hộ Thể',
    ],
    rowNotes: [
      '4 khung vệt đao cong vàng kim lõi trắng bạc',
      '4 khung Phật ấn nở hoa sen vàng tăng dần',
      '4 khung vòng xoáy côn khí kèm điểm sao sáng',
      '4 khung mũi thương xung kích và chuông năng lượng hộ thân',
    ],
  },
  {
    id: 'skill_thien_vuong',
    category: 'skill',
    title: 'Sheet Thiên Vương · Thương & Chùy',
    shortTitle: 'Thiên Vương (Kim)',
    subtitle: 'Thương Thiên Vương & Chùy Thiên Vương — Đoạn Hồn, Bôn Lôi, Trảm Long, Kim Chung',
    element: 'kim',
    accentColor: '#F59E0B',
    src: thienVuongSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Đoạn Hồn Thích & Truy Tinh Trục Nguyệt',
      'Bôn Lôi Toàn Long Thương (Lốc Thương Rồng Sét)',
      'Thừa Long Quyết & Trảm Long Quyết (Song Chùy Nứt Đất)',
      'Kim Chung Tráo & Hoàng Kim Chiến Giáp',
    ],
    rowNotes: [
      '4 khung mũi thương bạc vàng lao thẳng nổ dấu chữ thập',
      '4 khung cơn lốc thương khí vàng đồng quấn tia sét trắng',
      '4 khung chùy giáng nứt đất dung nham cam đồng tóe lửa',
      '4 khung chuông vàng hộ thể thu thành vòng phù chú',
    ],
  },
  {
    id: 'skill_moc',
    category: 'skill',
    title: 'Sheet Đường Môn · Tụ Tiễn & Hãm Tĩnh',
    shortTitle: 'Đường Môn (Mộc)',
    subtitle: 'Tụ Tiễn Đường Môn & Hãm Tĩnh Đường Môn — Bạo Vũ Lê Hoa, Cửu Cung, Cơ Quan',
    element: 'moc',
    accentColor: '#38A96B',
    src: mocSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Bạo Vũ Lê Hoa / Thiên La Địa Võng (Tụ Tiễn)',
      'Độc Sa Chưởng & Sương Độc Lan Tỏa',
      'Độc Thích Cốt & Cửu Cung Hãm Tĩnh (Bẫy Cơ Quan)',
      'Thánh Hỏa Lục Mang Tinh',
    ],
    rowNotes: [
      '4 khung loạt ám khí xanh ngọc xuyên phá tốc độ cao',
      '4 khung sóng độc lục tím cuộn sương kịch độc',
      '4 khung bánh răng đồng-ngọc bung gai và khói độc',
      '4 khung ấn lục giác Thánh Hỏa nở hoa lửa ngọc',
    ],
  },
  {
    id: 'skill_ngu_doc_minh_giao',
    category: 'skill',
    title: 'Sheet Ngũ Độc & Minh Giáo · Hệ Mộc',
    shortTitle: 'Ngũ Độc · Minh Giáo',
    subtitle: 'Độc Sa Chưởng, Huyền Âm Trảm, Chu Cáp, Thiên Chu Vạn Độc & Thánh Hỏa Liêu Nguyên',
    element: 'moc',
    accentColor: '#A855F7',
    src: nguDocMinhGiaoSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Độc Sa Chưởng & Hóa Cốt Miên Chưởng (Xoáy Kịch Độc)',
      'Bách Độc Xuyên Tâm & Huyền Âm Trảm (Song Đao Tím Lục)',
      'Chu Cáp Thanh Minh & Thiên Chu Vạn Độc (Cóc Độc · Mạng Nhện)',
      'Thánh Hỏa Liêu Nguyên & Càn Khôn Đại Na Di (Lục Mang Thánh Hỏa)',
    ],
    rowNotes: [
      '4 khung xoáy độc tím lục bung giọt độc phát sáng',
      '3 khung song lưỡi đao khí tím lạnh viền xanh độc chém chéo',
      '4 khung ấn cóc độc phát quang và lưới nhện độc bung rộng',
      '4 khung lục mang tinh Thánh Hỏa bùng cháy ngọn lửa xanh vàng',
    ],
  },
  {
    id: 'skill_thuy',
    category: 'skill',
    title: 'Sheet Nga Mi · Chưởng & Phụ Trợ Thủy',
    shortTitle: 'Nga Mi (Thủy)',
    subtitle: 'Chưởng Nga Mi & Phụ Trợ Nga Mi — Từ Hàng Phổ Độ, Liên Hoa, Phật Quang, Băng Tung',
    element: 'thuy',
    accentColor: '#58B8F0',
    src: thuySheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Liên Hoa Tịnh Độ & Từ Hàng Phổ Độ (Nga Mi)',
      'Băng Kiếm Trận & Hoa Tuyết Bung Nở',
      'Lục Mạch Thần Kiếm Xuyên Phá',
      'Lụa Nước & Đao Khí Băng Sương',
    ],
    rowNotes: [
      '4 khung nụ sen băng trắng lam nở rộ hồi phục',
      '4 khung kiếm băng kết tụ và nổ mảnh tuyết',
      '4 khung tia kiếm khí thanh lam phóng thẳng',
      '4 khung dải lụa nước uốn lượn và vệt chém băng',
    ],
  },
  {
    id: 'skill_thuy_yen_doan_thi',
    category: 'skill',
    title: 'Sheet Thúy Yên & Đoàn Thị · Hệ Thủy',
    shortTitle: 'Thúy Yên · Đoàn Thị',
    subtitle: 'Băng Tung Vô Ảnh, Huyền Băng Cửu Kiếm, Lục Mạch Thần Kiếm & Lăng Ba Vi Bộ',
    element: 'thuy',
    accentColor: '#38BDF8',
    src: thuyYenDoanThiSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Băng Tung Vô Ảnh & Ngự Tuyết Ẩn (Hoa Anh Đào Tuyết)',
      'Băng Tâm Tiên Tử & Huyền Băng Cửu Kiếm (Mưa Băng Kiếm)',
      'Nhất Dương Chỉ & Lục Mạch Thần Kiếm (Kiếm Khí Lam Vàng)',
      'Lăng Ba Vi Bộ & Khô Vinh Thiền Công (Sóng Nước Liên Hoàn)',
    ],
    rowNotes: [
      '3 khung sương băng xanh lam cuốn cánh hoa đào tuyết',
      '4 khung kiếm băng rơi dày rồi nổ thành đóa sen băng tinh',
      '4 khung linh kiếm xanh lam gắn ấn vàng xuyên thẳng mục tiêu',
      '4 khung gợn sóng nước đồng tâm xanh ngọc dưới chân',
    ],
  },
  {
    id: 'skill_hoa',
    category: 'skill',
    title: 'Sheet Hệ Hỏa · Cột Lửa & Long Thương',
    shortTitle: 'Hệ Hỏa (Tổng Hợp)',
    subtitle: 'Hàng Long Chưởng, Hồng Liên Địa Ngục, Huyết Long Thương & Trụ Lửa Xoáy',
    element: 'hoa',
    accentColor: '#F05828',
    src: hoaSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Hàng Long Thập Bát Chưởng (Đầu Rồng Lửa)',
      'Hồng Liên Địa Ngục (Hỏa Liên Bùng Xoáy)',
      'Huyết Long Thương Quét Lửa Đỏ Thẫm',
      'Trụ Lửa Xoáy & Vòng Nổ Tàn Tro',
    ],
    rowNotes: [
      '4 khung đầu rồng lửa vàng cam lao tới gầm thét',
      '4 khung hoa sen lửa nở thành cột xoáy địa ngục',
      '4 khung mũi thương rực lửa quét vòng cung huyết hỏa',
      '4 khung cột lửa xoắn ốc và vòng tàn lửa lan mặt đất',
    ],
  },
  {
    id: 'skill_cai_bang_thien_nhan',
    category: 'skill',
    title: 'Sheet Cái Bang & Thiên Nhẫn · Hệ Hỏa',
    shortTitle: 'Cái Bang · Thiên Nhẫn',
    subtitle: 'Kháng Long Hữu Hối, Thiên Hạ Vô Cẩu, Thiên Ngoại Lưu Tinh & Hỏa Liên Phần Hoa',
    element: 'hoa',
    accentColor: '#EF4444',
    src: caiBangThienNhanSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Kháng Long Hữu Hối & Phi Long Tại Thiên (Kim Long Phun Lửa)',
      'Thiên Hạ Vô Cẩu & Bổng Đả Ác Cẩu (Đả Cẩu Bổng Trận)',
      'Thiên Ngoại Lưu Tinh (Thiên Thạch Giáng Nổ Dung Nham)',
      'Hỏa Liên Phần Hoa & Nhiếp Hồn (Hắc Hồng Liên Cháy Rực)',
    ],
    rowNotes: [
      '4 khung rồng lửa vàng rực uốn lượn phun luồng hỏa diễm',
      '4 khung gậy trúc ngọc xoay tạo bão gió xanh vàng kèm sao',
      '4 khung thiên thạch lửa lao xuống nổ thành hố dung nham',
      '3 khung hắc hỏa liên bung cánh đỏ thẫm thiêu rụi',
    ],
  },
  {
    id: 'skill_tho',
    category: 'skill',
    title: 'Sheet Hệ Thổ · Thái Cực & Lôi Chấn',
    shortTitle: 'Hệ Thổ (Tổng Hợp)',
    subtitle: 'Võ Đang & Côn Lôn — Trận Đồ Thái Cực, Thiên Lôi Tím Vàng, Phong Lôi & Địa Chấn',
    element: 'tho',
    accentColor: '#D8A848',
    src: thoSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Thái Cực Kiếm Trận Bát Quái (Võ Đang)',
      'Thiên Lôi Giáng Đỉnh Tím Vàng (Côn Lôn)',
      'Phong Lôi Tuyền Qua Lốc Xoáy Phù Chú',
      'Địa Chấn Nứt Đất & Vòng Phi Kiếm',
    ],
    rowNotes: [
      '4 khung trận đồ Thái Cực Âm Dương xoay sáng',
      '4 khung tia sét tím lõi vàng giáng nổ mặt đất',
      '4 khung lốc xoáy phong lôi quấn phù ấn phát sáng',
      '4 khung chấn địa nứt vàng và vòng kiếm khí phóng lên',
    ],
  },
  {
    id: 'skill_vo_dang_con_lon',
    category: 'skill',
    title: 'Sheet Võ Đang & Côn Lôn · Hệ Thổ',
    shortTitle: 'Võ Đang · Côn Lôn',
    subtitle: 'Vạn Kiếm Quy Tông, Thái Cực Bát Quái, Lôi Động Cửu Thiên & Ngạo Tuyết Tiêu Phong',
    element: 'tho',
    accentColor: '#EAB308',
    src: voDangConLonSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Nhân Kiếm Hợp Nhất & Vạn Kiếm Quy Tông (Phi Kiếm Bùng Nổ)',
      'Thái Cực Kiếm Pháp & Tọa Vọng Vô Ngã (Bát Quái Kim Quang)',
      'Cuồng Lôi Chấn Địa & Lôi Động Cửu Thiên (Thiên Lôi Điện Lam)',
      'Ngạo Tuyết Tiêu Phong & Túy Tiên Thác Cốt (Phong Lôi Lốc Xoáy)',
    ],
    rowNotes: [
      '4 khung phi kiếm tụ trận rồi bung tỏa mưa kiếm vàng trắng',
      '4 khung vòng Bát Quái Thái Cực tỏa hào quang hộ mệnh',
      '4 khung tia thiên lôi lam trắng giáng xuống tạo vòng điện',
      '4 khung lốc xoáy phong nhận xanh ngọc quấn tia sét vàng',
    ],
  },
  {
    id: 'projectiles',
    category: 'projectile',
    title: 'Sheet Đạn Khí & Bay Chiêu Ngũ Hành',
    shortTitle: 'Đạn Khí Bay Chiêu',
    subtitle: '16 luồng chiêu bay định hướng từ nhân vật lao thẳng vào quái (Kim · Mộc · Thủy · Hỏa · Thổ)',
    accentColor: '#FDE047',
    src: projectilesSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Kim & Hỏa: Đao Khí Vàng · Đầu Rồng Lửa · Thương Hỏa · Mũi Thương Bạc',
      'Mộc: Tam Phi Tiêu Ngọc · Chưởng Độc Xoáy · Đao Độc Tím · Cầu Thánh Hỏa',
      'Thủy: Thương Băng Tinh · Cánh Hoa Tuyết · Lục Mạch Kiếm · Sóng Sen Lam',
      'Thổ: Phi Kiếm Võ Đang · Mũi Sét Thiên Lôi · Đao Gió Ngọc · Đĩa Thái Cực',
    ],
    rowNotes: [
      '4 đạn khí bay ngang cho Thiếu Lâm, Thiên Vương, Cái Bang, Thiên Nhẫn',
      '4 đạn khí bay ngang cho Đường Môn, Ngũ Độc, Minh Giáo',
      '4 đạn khí bay ngang cho Thúy Yên, Đoàn Thị, Nga Mi',
      '4 đạn khí bay ngang cho Võ Đang và Côn Lôn',
    ],
  },
  {
    id: 'hit_collision_kim',
    category: 'hit_collision',
    title: 'Đánh Trúng & Va Chạm · Hệ Kim',
    shortTitle: 'Trúng/Va Chạm Kim',
    subtitle: 'Thiếu Lâm · Thiên Vương — Vết chém vàng, Chí mạng hoàng kim, Giao binh Kim Chung, Sóng chấn địa',
    element: 'kim',
    accentColor: '#F5C451',
    src: hitCollisionKimUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Đánh Trúng Thường Hệ Kim (Chém Chữ Thập Vàng Bạc)',
      'Đánh Trúng Chí Mạng Hệ Kim (Bộc Phát Hoàng Kim)',
      'Va Chạm Giao Binh & Khiên Kim Chung Tráo',
      'Va Chạm Sóng Chấn Địa & Đẩy Lùi Vàng Đồng',
    ],
    rowNotes: [
      '4 khung vệt chém X ánh kim tóe tia lửa trên thân quái',
      '4 khung sao nổ chí mạng hoàng kim lõi trắng rực rỡ',
      '4 khung binh khí giao nhau tóe lửa và vòng khiên phù chú',
      '4 khung vòng sóng xung kích đồng tâm kèm bụi khí lan tỏa',
    ],
  },
  {
    id: 'hit_collision_moc',
    category: 'hit_collision',
    title: 'Đánh Trúng & Va Chạm · Hệ Mộc',
    shortTitle: 'Trúng/Va Chạm Mộc',
    subtitle: 'Đường Môn · Ngũ Độc · Minh Giáo — Châm độc bắn tóe, Nổ kịch độc, Va chạm cơ quan, Sóng độc',
    element: 'moc',
    accentColor: '#4ADE80',
    src: hitCollisionMocUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Đánh Trúng Thường Hệ Mộc (Đâm Phi Tiêu & Bắn Độc Tím Lục)',
      'Đánh Trúng Chí Mạng Hệ Mộc (Bộc Phát Kịch Độc & Thánh Hỏa)',
      'Va Chạm Bánh Răng Cơ Quan & Khiên Gai Ngọc',
      'Va Chạm Sóng Xung Kích Độc Sương Đẩy Lùi',
    ],
    rowNotes: [
      '4 khung ám khí xuyên mục tiêu bung giọt độc xanh tím',
      '4 khung vụ nổ chí mạng tím lục pha lửa vàng Thánh Hỏa',
      '4 khung va chạm bánh răng cơ quan tóe lửa và chắn gai ngọc',
      '4 khung vòng sóng độc xanh tím đẩy lùi kèm khói độc',
    ],
  },
  {
    id: 'hit_collision_thuy',
    category: 'hit_collision',
    title: 'Đánh Trúng & Va Chạm · Hệ Thủy',
    shortTitle: 'Trúng/Va Chạm Thủy',
    subtitle: 'Nga Mi · Thúy Yên · Đoàn Thị — Băng kiếm giọt thủy, Chí mạng hoa tuyết, Vỡ băng khiên, Sóng băng',
    element: 'thuy',
    accentColor: '#38BDF8',
    src: hitCollisionThuyUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Đánh Trúng Thường Hệ Thủy (Kiếm Băng & Giọt Thủy Khí)',
      'Đánh Trúng Chí Mạng Hệ Thủy (Bùng Nổ Hoa Tuyết & Lục Mạch)',
      'Va Chạm Vỡ Khiên Băng Tinh & Gợn Sóng Nước',
      'Va Chạm Vòng Sóng Thủy Triều & Gai Băng Bùng Tỏa',
    ],
    rowNotes: [
      '4 khung nhát chém kiếm băng kết hợp giọt nước linh khí',
      '4 khung bông tuyết tinh thể nổ thành chùm tia lam trắng',
      '4 khung khiên băng nứt vỡ mảnh tinh thể tạo sóng nước',
      '4 khung vòng thủy triều bung gai băng sắc bén khi va chạm',
    ],
  },
  {
    id: 'hit_collision_hoa',
    category: 'hit_collision',
    title: 'Đánh Trúng & Va Chạm · Hệ Hỏa',
    shortTitle: 'Trúng/Va Chạm Hỏa',
    subtitle: 'Cái Bang · Thiên Nhẫn — Trảm hỏa cháy xém, Chí mạng Long Hỏa, Giao binh lửa, Sóng nhiệt dung nham',
    element: 'hoa',
    accentColor: '#FB7185',
    src: hitCollisionHoaUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Đánh Trúng Thường Hệ Hỏa (Vết Chém Lửa & Tia Lửa Đỏ)',
      'Đánh Trúng Chí Mạng Hệ Hỏa (Bộc Phát Long Hỏa Rực Cháy)',
      'Va Chạm Giao Binh Rực Lửa & Sóng Khiên Hỏa Diệm',
      'Va Chạm Vòng Sóng Nhiệt Dung Nham & Tàn Tro',
    ],
    rowNotes: [
      '4 khung đòn lửa thiêu đốt tóe tia sáng vàng đỏ trên quái',
      '4 khung vụ nổ chí mạng hỏa cầu vàng cam tia lửa dữ dội',
      '4 khung giao binh tóe lửa mạnh và vòng chắn hỏa diệm',
      '4 khung vòng sóng nhiệt đỏ cam lan rộng kèm tàn tro bay',
    ],
  },
  {
    id: 'hit_collision_tho',
    category: 'hit_collision',
    title: 'Đánh Trúng & Va Chạm · Hệ Thổ',
    shortTitle: 'Trúng/Va Chạm Thổ',
    subtitle: 'Võ Đang · Côn Lôn — Kiếm chữ thập lôi điện, Chí mạng Thái Cực Sét, Khiên Bát Quái, Sóng Phong Lôi',
    element: 'tho',
    accentColor: '#FACC15',
    src: hitCollisionThoUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Đánh Trúng Thường Hệ Thổ (Chém Kiếm X & Tia Sét Lam Vàng)',
      'Đánh Trúng Chí Mạng Hệ Thổ (Thái Cực Bộc Phát Thiên Lôi)',
      'Va Chạm Kiếm Khí & Khiên Bát Quái Võ Đang',
      'Va Chạm Sóng Địa Chấn & Vòng Điện Phong Lôi',
    ],
    rowNotes: [
      '4 khung vết chém chữ thập ánh vàng kèm tia điện lôi',
      '4 khung ấn Thái Cực bùng nổ tia sét lam vàng khắp xung quanh',
      '4 khung chắn Bát Quái hấp thụ đòn chém tóe kim quang',
      '4 khung vòng chấn địa ánh vàng quấn hồ quang điện lam',
    ],
  },
  {
    id: 'collision',
    category: 'collision',
    title: 'Sheet Hiệu Ứng Va Chạm Chung',
    shortTitle: 'Va Chạm Chung',
    subtitle: 'Giao binh đỡ đòn · Sóng xung kích · Khiên hấp thụ · Chấn địa đẩy lùi',
    accentColor: '#67E8F9',
    src: collisionSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Giao Binh / Đỡ Đòn Tóe Lửa Kim Loại',
      'Sóng Xung Kích Nội Công Va Chạm',
      'Khiên Hộ Thể Hấp Thụ & Vỡ Mảnh Lục Giác',
      'Chấn Động Mặt Đất & Lực Đẩy Lùi',
    ],
    rowNotes: [
      '4 khung tia lửa va chạm vũ khí khi né tránh hoặc đỡ đòn',
      '4 khung vòng sóng nội công đồng tâm khi đạn/chiêu chạm mục tiêu',
      '4 khung màng chắn năng lượng lục giác gợn sóng rồi vỡ mảnh',
      '4 khung bụi đất và vòng lực bung tỏa khi đánh lùi / chấn địa',
    ],
  },
  {
    id: 'hit_impact',
    category: 'hit',
    title: 'Sheet Hiệu Ứng Đánh Trúng & Trạng Thái',
    shortTitle: 'Đánh Trúng Chung',
    subtitle: 'Vết chém trúng · Bộc phát Chí Mạng · Va đập nội lực · Trạng thái Ngũ Hành',
    accentColor: '#F87171',
    src: hitImpactSheetUrl,
    cols: 4,
    rows: 4,
    frameCount: 16,
    rowLabels: [
      'Vết Chém Chữ Thập Đánh Trúng (Ngoại Công)',
      'Bộc Phát Chí Mạng Tia Sáng Vàng Đỏ',
      'Va Đập Chấn Động & Vòng Tỏa Tia Lửa',
      'Hiệu Ứng Trúng Trạng Thái (Độc · Băng · Hỏa · Lôi)',
    ],
    rowNotes: [
      '4 khung vết chém chữ thập trắng đỏ sắc lẹm trên thân địch',
      '4 khung sao nổ chí mạng tỏa tia sáng vàng cam rực rỡ',
      '4 khung điểm nổ chấn động kèm vòng tròn xung lực đồng tâm',
      '4 khung bùng độc xanh, vỡ băng tinh, bén lửa hỏa, giật điện lôi',
    ],
  },
] as const;

export const VFX_SHEET_BY_ID: Record<VfxSheetId, VfxSheetMeta> = VFX_SHEET_REGISTRY.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<VfxSheetId, VfxSheetMeta>
);

// ---------------------------------------------------------------------------
// LUMINANCE-KEYED ALPHA SHEET CACHE (Zero black halo on bright daylight maps)
// ---------------------------------------------------------------------------
interface LoadedSheetEntry {
  img: HTMLImageElement;
  alphaCanvas: HTMLCanvasElement | null;
  ready: boolean;
  failed: boolean;
}

const sheetCache: Partial<Record<VfxSheetId, LoadedSheetEntry>> = {};
const listeners = new Set<() => void>();

export function subscribeVfxSheetsLoaded(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function buildAlphaKeyedCanvas(img: HTMLImageElement): HTMLCanvasElement | null {
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d', { willReadFrequently: true });
    if (!c) return null;
    c.drawImage(img, 0, 0, w, h);
    const imgData = c.getImageData(0, 0, w, h);
    const data = imgData.data;
    // Soft luminance key removes pure pitch-black void cleanly while preserving crisp cores & rich hues
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const maxCh = r > g ? (r > b ? r : b) : g > b ? g : b;
      if (maxCh <= 18) {
        data[i + 3] = 0;
      } else if (maxCh < 92) {
        const t = (maxCh - 18) / 74;
        data[i + 3] = Math.round(t * t * 255);
      } else {
        data[i + 3] = 255;
      }
    }
    c.putImageData(imgData, 0, 0);
    return canvas;
  } catch {
    return null;
  }
}

export function getLoadedVfxSheet(id: VfxSheetId): LoadedSheetEntry {
  const existing = sheetCache[id];
  if (existing) return existing;

  const meta = VFX_SHEET_BY_ID[id];
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const entry: LoadedSheetEntry = {
    img,
    alphaCanvas: null,
    ready: false,
    failed: false,
  };
  sheetCache[id] = entry;

  img.onload = () => {
    entry.alphaCanvas = buildAlphaKeyedCanvas(img);
    entry.ready = true;
    listeners.forEach((fn) => fn());
  };
  img.onerror = () => {
    entry.failed = true;
  };
  img.src = meta.src;
  return entry;
}

export function preloadAllVfxSheets(): void {
  for (const meta of VFX_SHEET_REGISTRY) {
    getLoadedVfxSheet(meta.id);
  }
}

/**
 * Draw a single frame (row 0..3, col 0..3) from one of the 13 VFX sprite sheets
 * with smooth alpha transparency + optional additive glow pass.
 */
export function drawVfxSheetFrame(
  ctx: CanvasRenderingContext2D,
  sheetId: VfxSheetId,
  row: number,
  col: number,
  x: number,
  y: number,
  drawSize: number,
  angle = 0,
  alpha = 1,
  additive = false,
  scaleY = 1
): boolean {
  const entry = getLoadedVfxSheet(sheetId);
  if (!entry.ready) return false;
  const source: CanvasImageSource = entry.alphaCanvas || entry.img;
  const sw = entry.alphaCanvas ? entry.alphaCanvas.width : entry.img.naturalWidth;
  const sh = entry.alphaCanvas ? entry.alphaCanvas.height : entry.img.naturalHeight;
  if (!sw || !sh) return false;

  const cellW = sw / 4;
  const cellH = sh / 4;
  const safeRow = Math.max(0, Math.min(3, row));
  const safeCol = Math.max(0, Math.min(3, col));
  // 3.5% cell inset cleanly strips any outer divider pixel or neighbor bleed
  const padX = cellW * 0.035;
  const padY = cellH * 0.035;

  ctx.save();
  ctx.translate(x, y);
  if (angle !== 0) ctx.rotate(angle);
  if (scaleY !== 1) ctx.scale(1, scaleY);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  if (additive || !entry.alphaCanvas) {
    ctx.globalCompositeOperation = 'lighter';
  }
  ctx.drawImage(
    source,
    safeCol * cellW + padX,
    safeRow * cellH + padY,
    cellW - padX * 2,
    cellH - padY * 2,
    -drawSize * 0.5,
    -drawSize * 0.5,
    drawSize,
    drawSize
  );
  ctx.restore();
  return true;
}

/**
 * Maps any skill element + SkillVfxKind to a directional flying bolt cell (row, col)
 * on the dedicated `projectiles` sprite sheet (all bolts point straight right -> 0 rad).
 */
export function resolveProjectileCell(
  element: ElementType,
  vfxKind: SkillVfxKind
): { row: number; col: number; spin?: boolean } {
  switch (element) {
    case 'kim': {
      if (
        vfxKind === 'spear_charge' ||
        vfxKind === 'spear_flurry' ||
        vfxKind === 'spear_tether_pull' ||
        vfxKind === 'cavalry_spear_ult'
      ) {
        return { row: 0, col: 3 }; // Silver-gold spear streak
      }
      return { row: 0, col: 0 }; // Golden crescent blade-qi wave
    }
    case 'moc': {
      if (vfxKind === 'needle_barrage' || vfxKind === 'shadow_blink' || vfxKind === 'poison_trap') {
        return { row: 1, col: 0 }; // Emerald-silver flying needles
      }
      if (
        vfxKind === 'blade_arc' ||
        vfxKind === 'blade_wave_line' ||
        vfxKind === 'slash' ||
        vfxKind === 'slash_single'
      ) {
        return { row: 1, col: 2 }; // Cold-purple poison blade crescent
      }
      if (
        vfxKind === 'sacred_fire_rain' ||
        vfxKind === 'sacred_fire_hex_ult' ||
        vfxKind === 'dispel_seal' ||
        vfxKind === 'soul_drain'
      ) {
        return { row: 1, col: 3 }; // Emerald-amber sacred flame orb
      }
      return { row: 1, col: 1 }; // Swirling violet-green venom palm wave
    }
    case 'thuy': {
      if (
        vfxKind === 'six_swords' ||
        vfxKind === 'six_meridian_ult' ||
        vfxKind === 'finger_seal' ||
        vfxKind === 'four_palms'
      ) {
        return { row: 2, col: 2 }; // Radiant sapphire-gold spirit sword beam
      }
      if (
        vfxKind === 'frost_stealth' ||
        vfxKind === 'water_steps' ||
        vfxKind === 'ocean_wave'
      ) {
        return { row: 2, col: 1 }; // Frosty pink-cyan snow petal wave
      }
      if (
        vfxKind === 'lotus_heal' ||
        vfxKind === 'lotus_sanctuary_ult' ||
        vfxKind === 'lotus' ||
        vfxKind === 'buddha_aegis'
      ) {
        return { row: 2, col: 3 }; // Pearlescent blue water lotus wave
      }
      return { row: 2, col: 0 }; // Sharp crystal ice lance
    }
    case 'hoa': {
      if (
        vfxKind === 'crimson_spear_dash' ||
        vfxKind === 'blood_dragon_ult' ||
        vfxKind === 'spear_charge' ||
        vfxKind === 'staff_sweep' ||
        vfxKind === 'staff_array'
      ) {
        return { row: 0, col: 2 }; // Crimson flame spear bolt
      }
      return { row: 0, col: 1 }; // Blazing fire-dragon head fireball
    }
    case 'tho':
    default: {
      if (
        vfxKind === 'thunder_strike' ||
        vfxKind === 'thunder_cluster' ||
        vfxKind === 'thunder_array_ult'
      ) {
        return { row: 3, col: 1 }; // Jagged white-gold lightning spear bolt
      }
      if (
        vfxKind === 'wind_lightning' ||
        vfxKind === 'wind_thunder_vortex_ult' ||
        vfxKind === 'yin_wind' ||
        vfxKind === 'cleanse_dash'
      ) {
        return { row: 3, col: 2 }; // Sharp jade-gold wind blade crescent
      }
      if (vfxKind === 'taiji_domain' || vfxKind === 'taiji_sword_array_ult') {
        return { row: 3, col: 3, spin: true }; // Spinning golden Taiji energy disc
      }
      return { row: 3, col: 0 }; // Gleaming amber-white flying Taoist sword
    }
  }
}

/**
 * Maps any sect + element + SkillVfxKind to its exact dedicated painted sprite sheet & row (0..3).
 */
export function resolveSkillSheetRow(
  element: ElementType,
  vfxKind: SkillVfxKind,
  sectId?: SectId
): {
  sheetId: VfxSheetId;
  row: number;
  maxFrames: number;
  rotateToAngle: boolean;
  isoFlatten: boolean;
} {
  // Dedicated per-sect routing first for maximum visual identity across all 12 sects
  if (sectId === 'thien_vuong') {
    if (
      vfxKind === 'hammer_heavy' ||
      vfxKind === 'tiger_hammer' ||
      vfxKind === 'ground_shatter'
    ) {
      return {
        sheetId: 'skill_thien_vuong',
        row: 2,
        maxFrames: 4,
        rotateToAngle: false,
        isoFlatten: false,
      };
    }
    if (
      vfxKind === 'golden_bell' ||
      vfxKind === 'guard_shield_140' ||
      vfxKind === 'shield'
    ) {
      return {
        sheetId: 'skill_thien_vuong',
        row: 3,
        maxFrames: 4,
        rotateToAngle: false,
        isoFlatten: false,
      };
    }
    if (
      vfxKind === 'spear_whirl_shield' ||
      vfxKind === 'cavalry_spear_ult' ||
      vfxKind === 'vortex_pull'
    ) {
      return {
        sheetId: 'skill_thien_vuong',
        row: 1,
        maxFrames: 4,
        rotateToAngle: false,
        isoFlatten: false,
      };
    }
    return {
      sheetId: 'skill_thien_vuong',
      row: 0,
      maxFrames: 4,
      rotateToAngle: true,
      isoFlatten: false,
    };
  }

  if (sectId === 'ngu_doc') {
    if (
      vfxKind === 'blade_arc' ||
      vfxKind === 'blade_wave_line' ||
      vfxKind === 'slash' ||
      vfxKind === 'slash_single'
    ) {
      return {
        sheetId: 'skill_ngu_doc_minh_giao',
        row: 1,
        maxFrames: 3,
        rotateToAngle: true,
        isoFlatten: false,
      };
    }
    if (vfxKind === 'toad_curse' || vfxKind === 'spider_venom_ult' || vfxKind === 'poison_trap') {
      return {
        sheetId: 'skill_ngu_doc_minh_giao',
        row: 2,
        maxFrames: 4,
        rotateToAngle: false,
        isoFlatten: false,
      };
    }
    return {
      sheetId: 'skill_ngu_doc_minh_giao',
      row: 0,
      maxFrames: 4,
      rotateToAngle: false,
      isoFlatten: false,
    };
  }

  if (sectId === 'minh_giao') {
    if (
      vfxKind === 'blade_arc' ||
      vfxKind === 'blade_wave_line' ||
      vfxKind === 'slash' ||
      vfxKind === 'slash_single'
    ) {
      return {
        sheetId: 'skill_ngu_doc_minh_giao',
        row: 1,
        maxFrames: 3,
        rotateToAngle: true,
        isoFlatten: false,
      };
    }
    return {
      sheetId: 'skill_ngu_doc_minh_giao',
      row: 3,
      maxFrames: 4,
      rotateToAngle: false,
      isoFlatten: false,
    };
  }

  if (sectId === 'thuy_yen') {
    if (
      vfxKind === 'frost_stealth' ||
      vfxKind === 'water_steps' ||
      vfxKind === 'evasion_ring' ||
      vfxKind === 'ocean_wave'
    ) {
      return {
        sheetId: 'skill_thuy_yen_doan_thi',
        row: 0,
        maxFrames: 3,
        rotateToAngle: false,
        isoFlatten: false,
      };
    }
    return {
      sheetId: 'skill_thuy_yen_doan_thi',
      row: 1,
      maxFrames: 4,
      rotateToAngle: false,
      isoFlatten: false,
    };
  }

  if (sectId === 'doan_thi') {
    if (
      vfxKind === 'water_steps' ||
      vfxKind === 'north_shield' ||
      vfxKind === 'guard_shield_140' ||
      vfxKind === 'evasion_ring' ||
      vfxKind === 'shield'
    ) {
      return {
        sheetId: 'skill_thuy_yen_doan_thi',
        row: 3,
        maxFrames: 4,
        rotateToAngle: false,
        isoFlatten: true,
      };
    }
    return {
      sheetId: 'skill_thuy_yen_doan_thi',
      row: 2,
      maxFrames: 4,
      rotateToAngle: true,
      isoFlatten: false,
    };
  }

  if (sectId === 'cai_bang') {
    if (
      vfxKind === 'staff_sweep' ||
      vfxKind === 'staff_array' ||
      vfxKind === 'star_staff_spin' ||
      vfxKind === 'staff_mandala_ult'
    ) {
      return {
        sheetId: 'skill_cai_bang_thien_nhan',
        row: 1,
        maxFrames: 4,
        rotateToAngle: false,
        isoFlatten: true,
      };
    }
    return {
      sheetId: 'skill_cai_bang_thien_nhan',
      row: 0,
      maxFrames: 4,
      rotateToAngle: false,
      isoFlatten: false,
    };
  }

  if (sectId === 'thien_nhan') {
    if (vfxKind === 'fire_lotus_pull' || vfxKind === 'hellfire_lotus_ult') {
      return {
        sheetId: 'skill_cai_bang_thien_nhan',
        row: 3,
        maxFrames: 3,
        rotateToAngle: false,
        isoFlatten: false,
      };
    }
    if (vfxKind === 'crimson_spear_dash' || vfxKind === 'blood_dragon_ult') {
      return {
        sheetId: 'skill_hoa',
        row: 2,
        maxFrames: 4,
        rotateToAngle: true,
        isoFlatten: false,
      };
    }
    return {
      sheetId: 'skill_cai_bang_thien_nhan',
      row: 2,
      maxFrames: 4,
      rotateToAngle: false,
      isoFlatten: false,
    };
  }

  if (sectId === 'vo_dang') {
    if (
      vfxKind === 'taiji_domain' ||
      vfxKind === 'taiji_sword_array_ult' ||
      vfxKind === 'guard_shield_140' ||
      vfxKind === 'shield'
    ) {
      return {
        sheetId: 'skill_vo_dang_con_lon',
        row: 1,
        maxFrames: 4,
        rotateToAngle: false,
        isoFlatten: true,
      };
    }
    return {
      sheetId: 'skill_vo_dang_con_lon',
      row: 0,
      maxFrames: 4,
      rotateToAngle: false,
      isoFlatten: false,
    };
  }

  if (sectId === 'con_lon') {
    if (
      vfxKind === 'wind_lightning' ||
      vfxKind === 'wind_thunder_vortex_ult' ||
      vfxKind === 'yin_wind' ||
      vfxKind === 'cleanse_dash'
    ) {
      return {
        sheetId: 'skill_vo_dang_con_lon',
        row: 3,
        maxFrames: 4,
        rotateToAngle: false,
        isoFlatten: false,
      };
    }
    return {
      sheetId: 'skill_vo_dang_con_lon',
      row: 2,
      maxFrames: 4,
      rotateToAngle: false,
      isoFlatten: false,
    };
  }

  // Fallback & core Ngũ Hành routing (Thiếu Lâm, Đường Môn, Nga Mi, and enemy/boss casts)
  switch (element) {
    case 'kim': {
      if (vfxKind === 'buddha_palm_ult' || vfxKind === 'lion_roar' || vfxKind === 'buddha_aegis') {
        return { sheetId: 'skill_kim', row: 1, maxFrames: 4, rotateToAngle: false, isoFlatten: false };
      }
      if (
        vfxKind === 'star_staff_spin' ||
        vfxKind === 'vortex_pull' ||
        vfxKind === 'staff_mandala_ult'
      ) {
        return { sheetId: 'skill_kim', row: 2, maxFrames: 4, rotateToAngle: false, isoFlatten: true };
      }
      if (vfxKind === 'hammer_heavy' || vfxKind === 'tiger_hammer' || vfxKind === 'ground_shatter') {
        return {
          sheetId: 'skill_thien_vuong',
          row: 2,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      if (
        vfxKind === 'spear_charge' ||
        vfxKind === 'spear_flurry' ||
        vfxKind === 'spear_whirl_shield' ||
        vfxKind === 'spear_tether_pull' ||
        vfxKind === 'cavalry_spear_ult' ||
        vfxKind === 'golden_bell' ||
        vfxKind === 'guard_shield_140' ||
        vfxKind === 'shield'
      ) {
        return {
          sheetId: 'skill_thien_vuong',
          row: vfxKind === 'golden_bell' || vfxKind === 'guard_shield_140' || vfxKind === 'shield' ? 3 : 0,
          maxFrames: 4,
          rotateToAngle:
            vfxKind === 'spear_charge' ||
            vfxKind === 'spear_flurry' ||
            vfxKind === 'spear_tether_pull',
          isoFlatten: false,
        };
      }
      return { sheetId: 'skill_kim', row: 0, maxFrames: 4, rotateToAngle: true, isoFlatten: false };
    }
    case 'moc': {
      if (vfxKind === 'needle_barrage' || vfxKind === 'shadow_blink') {
        return { sheetId: 'skill_moc', row: 0, maxFrames: 4, rotateToAngle: true, isoFlatten: false };
      }
      if (
        vfxKind === 'poison_trap' ||
        vfxKind === 'gear_aura' ||
        vfxKind === 'knockback_ring' ||
        vfxKind === 'nine_palace_trap_ult'
      ) {
        return { sheetId: 'skill_moc', row: 2, maxFrames: 4, rotateToAngle: false, isoFlatten: true };
      }
      if (
        vfxKind === 'sacred_fire_rain' ||
        vfxKind === 'sacred_fire_hex_ult' ||
        vfxKind === 'dispel_seal' ||
        vfxKind === 'soul_drain'
      ) {
        return {
          sheetId: 'skill_ngu_doc_minh_giao',
          row: 3,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      if (vfxKind === 'toad_curse' || vfxKind === 'spider_venom_ult') {
        return {
          sheetId: 'skill_ngu_doc_minh_giao',
          row: 2,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      return {
        sheetId: 'skill_ngu_doc_minh_giao',
        row: 0,
        maxFrames: 4,
        rotateToAngle: false,
        isoFlatten: false,
      };
    }
    case 'thuy': {
      if (
        vfxKind === 'lotus_heal' ||
        vfxKind === 'lotus_sanctuary_ult' ||
        vfxKind === 'lotus' ||
        vfxKind === 'buddha_aegis' ||
        vfxKind === 'north_shield' ||
        vfxKind === 'guard_shield_140' ||
        vfxKind === 'shield'
      ) {
        return { sheetId: 'skill_thuy', row: 0, maxFrames: 4, rotateToAngle: false, isoFlatten: false };
      }
      if (
        vfxKind === 'frost_shatter' ||
        vfxKind === 'frost_stealth' ||
        vfxKind === 'ice_pillars' ||
        vfxKind === 'frost_beam' ||
        vfxKind === 'ice_needles' ||
        vfxKind === 'glacier_swords_ult'
      ) {
        return {
          sheetId: 'skill_thuy_yen_doan_thi',
          row: 1,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      if (
        vfxKind === 'six_swords' ||
        vfxKind === 'six_meridian_ult' ||
        vfxKind === 'finger_seal' ||
        vfxKind === 'four_palms'
      ) {
        return {
          sheetId: 'skill_thuy_yen_doan_thi',
          row: 2,
          maxFrames: 4,
          rotateToAngle: true,
          isoFlatten: false,
        };
      }
      return { sheetId: 'skill_thuy', row: 3, maxFrames: 4, rotateToAngle: true, isoFlatten: false };
    }
    case 'hoa': {
      if (vfxKind === 'dragon_palm' || vfxKind === 'dragon_storm_ult' || vfxKind === 'dragon') {
        return {
          sheetId: 'skill_cai_bang_thien_nhan',
          row: 0,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      if (vfxKind === 'fire_lotus_pull' || vfxKind === 'hellfire_lotus_ult') {
        return {
          sheetId: 'skill_cai_bang_thien_nhan',
          row: 3,
          maxFrames: 3,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      if (vfxKind === 'meteor_strike' || vfxKind === 'fire_wall') {
        return {
          sheetId: 'skill_cai_bang_thien_nhan',
          row: 2,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      if (vfxKind === 'staff_sweep' || vfxKind === 'staff_array') {
        return {
          sheetId: 'skill_cai_bang_thien_nhan',
          row: 1,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: true,
        };
      }
      if (vfxKind === 'crimson_spear_dash' || vfxKind === 'blood_dragon_ult' || vfxKind === 'blade_arc') {
        return { sheetId: 'skill_hoa', row: 2, maxFrames: 4, rotateToAngle: true, isoFlatten: false };
      }
      return { sheetId: 'skill_hoa', row: 3, maxFrames: 4, rotateToAngle: false, isoFlatten: false };
    }
    case 'tho':
    default: {
      if (vfxKind === 'taiji_domain' || vfxKind === 'taiji_sword_array_ult') {
        return {
          sheetId: 'skill_vo_dang_con_lon',
          row: 1,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: true,
        };
      }
      if (
        vfxKind === 'sword_converge' ||
        vfxKind === 'sword_rain' ||
        vfxKind === 'sword_triple' ||
        vfxKind === 'sword_dash_triple' ||
        vfxKind === 'twin_spirit_swords' ||
        vfxKind === 'giant_sword_push' ||
        vfxKind === 'swords'
      ) {
        return {
          sheetId: 'skill_vo_dang_con_lon',
          row: 0,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      if (
        vfxKind === 'thunder_strike' ||
        vfxKind === 'thunder_cluster' ||
        vfxKind === 'thunder_array_ult'
      ) {
        return {
          sheetId: 'skill_vo_dang_con_lon',
          row: 2,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      if (
        vfxKind === 'wind_lightning' ||
        vfxKind === 'wind_thunder_vortex_ult' ||
        vfxKind === 'yin_wind' ||
        vfxKind === 'cleanse_dash'
      ) {
        return {
          sheetId: 'skill_vo_dang_con_lon',
          row: 3,
          maxFrames: 4,
          rotateToAngle: false,
          isoFlatten: false,
        };
      }
      return { sheetId: 'skill_tho', row: 3, maxFrames: 4, rotateToAngle: false, isoFlatten: true };
    }
  }
}

// ---------------------------------------------------------------------------
// ZERO-GC POOLED SPRITE SHEET VFX ENGINE (Skill / Travel / Collision / Hit)
// ---------------------------------------------------------------------------
export interface SpriteVfxBurst {
  active: boolean;
  sheetId: VfxSheetId;
  row: number;
  maxFrames: number;
  fixedCol: number; // -1 = animate across 0..(maxFrames-1), >=0 = hold specific cell
  x: number;
  y: number;
  size: number;
  angle: number;
  scaleY: number;
  life: number;
  maxLife: number;
  alpha: number;
  additive: boolean;
  layer: 'ground' | 'impact';
}

export interface TravelingSkillMissile {
  active: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  elapsed: number;
  duration: number;
  projRow: number;
  projCol: number;
  spin: boolean;
  boltSize: number;
  // Payload detonated ON arrival at (toX, toY) — right on the monster!
  element: ElementType;
  vfxKind: SkillVfxKind;
  sectId?: SectId;
  impactRadius: number;
  impactDuration: number;
}

export class SpriteVfxPool {
  readonly items: SpriteVfxBurst[];
  readonly missiles: TravelingSkillMissile[];
  private cursor = 0;
  private missileCursor = 0;

  constructor(capacity = 128, missileCapacity = 48) {
    this.items = Array.from({ length: capacity }, () => ({
      active: false,
      sheetId: 'hit_impact',
      row: 0,
      maxFrames: 4,
      fixedCol: -1,
      x: 0,
      y: 0,
      size: 64,
      angle: 0,
      scaleY: 1,
      life: 0,
      maxLife: 0.3,
      alpha: 1,
      additive: false,
      layer: 'impact',
    }));
    this.missiles = Array.from({ length: missileCapacity }, () => ({
      active: false,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
      elapsed: 0,
      duration: 0.2,
      projRow: 0,
      projCol: 0,
      spin: false,
      boltSize: 64,
      element: 'kim',
      vfxKind: 'ring',
      sectId: undefined,
      impactRadius: 80,
      impactDuration: 0.55,
    }));
  }

  private alloc(): SpriteVfxBurst {
    for (let i = 0; i < this.items.length; i++) {
      const idx = (this.cursor + i) % this.items.length;
      if (!this.items[idx].active) {
        this.cursor = (idx + 1) % this.items.length;
        return this.items[idx];
      }
    }
    const recycled = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    return recycled;
  }

  private allocMissile(): TravelingSkillMissile {
    for (let i = 0; i < this.missiles.length; i++) {
      const idx = (this.missileCursor + i) % this.missiles.length;
      if (!this.missiles[idx].active) {
        this.missileCursor = (idx + 1) % this.missiles.length;
        return this.missiles[idx];
      }
    }
    const recycled = this.missiles[this.missileCursor];
    this.missileCursor = (this.missileCursor + 1) % this.missiles.length;
    return recycled;
  }

  spawnSkillBurst(
    element: ElementType,
    vfxKind: SkillVfxKind,
    x: number,
    y: number,
    radius: number,
    angle: number,
    durationSec = 0.56,
    sectId?: SectId
  ) {
    const resolved = resolveSkillSheetRow(element, vfxKind, sectId);
    const b = this.alloc();
    b.active = true;
    b.sheetId = resolved.sheetId;
    b.row = resolved.row;
    b.maxFrames = resolved.maxFrames;
    b.fixedCol = -1;
    b.x = x;
    b.y = y;
    b.size = Math.max(82, Math.min(255, radius * 1.85));
    b.angle = resolved.rotateToAngle ? angle : 0;
    b.scaleY = resolved.isoFlatten ? 0.68 : 1;
    b.life = durationSec;
    b.maxLife = durationSec;
    b.alpha = 0.94;
    b.additive = false;
    b.layer = resolved.isoFlatten ? 'ground' : 'impact';
  }

  /**
   * Launches a visible painted martial-arts skill bolt from the caster to the monster,
   * then detonates the full skill sprite sheet + shockwave right ON the monster upon impact.
   */
  spawnTravelingSkill(
    element: ElementType,
    vfxKind: SkillVfxKind,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    impactRadius: number,
    impactDuration = 0.58,
    sectId?: SectId
  ) {
    const dist = Math.hypot(toX - fromX, toY - fromY);
    if (dist < 42) {
      this.spawnSkillBurst(
        element,
        vfxKind,
        toX,
        toY,
        impactRadius,
        Math.atan2(toY - fromY, toX - fromX),
        impactDuration,
        sectId
      );
      return;
    }
    const cell = resolveProjectileCell(element, vfxKind);
    const m = this.allocMissile();
    m.active = true;
    m.fromX = fromX;
    m.fromY = fromY;
    m.toX = toX;
    m.toY = toY;
    m.elapsed = 0;
    m.duration = Math.max(0.11, Math.min(0.28, dist / 980));
    m.projRow = cell.row;
    m.projCol = cell.col;
    m.spin = Boolean(cell.spin);
    m.boltSize = Math.max(58, Math.min(112, impactRadius * 0.78));
    m.element = element;
    m.vfxKind = vfxKind;
    m.sectId = sectId;
    m.impactRadius = impactRadius;
    m.impactDuration = impactDuration;
  }

  /**
   * Dedicated CHARACTER CASTING (Thi Triển Chiêu Thức) burst anchored cleanly at the caster's position,
   * completely separated from Hit & Collision effects (which spawn strictly at the struck monster).
   */
  spawnCastingBurst(
    element: ElementType,
    x: number,
    y: number,
    angle: number,
    size = 84,
    sectId?: SectId,
    isWeaponPropulsion = false
  ) {
    // 1. Elemental gathering / hand-seal casting sigil at caster
    const b = this.alloc();
    b.active = true;
    b.maxFrames = 4;
    b.fixedCol = -1;
    b.x = x;
    b.y = y;
    b.angle = 0;
    b.life = 0.34;
    b.maxLife = 0.34;
    b.alpha = 0.92;
    b.additive = false;

    if (element === 'kim') {
      b.sheetId = 'casting_kim_hoa_tho';
      b.row = 0;
      b.size = size;
      b.scaleY = 0.78;
      b.layer = 'ground';
    } else if (element === 'hoa') {
      b.sheetId = 'casting_kim_hoa_tho';
      b.row = 1;
      b.size = size;
      b.scaleY = 0.88;
      b.layer = 'impact';
    } else if (element === 'tho') {
      b.sheetId = 'casting_kim_hoa_tho';
      b.row = 2;
      b.size = size * 1.15;
      b.scaleY = 0.72;
      b.y = y + 8;
      b.layer = 'ground';
    } else if (element === 'moc') {
      b.sheetId = 'casting_moc_thuy';
      b.row = sectId === 'minh_giao' ? 1 : 0;
      b.size = size;
      b.scaleY = 0.84;
      b.layer = 'ground';
    } else {
      // Thủy: Đoàn Thị uses Row 3 (Six-Meridian finger-sword charge); Nga Mi / Thúy Yên use Row 2 (Lotus/Frost)
      b.sheetId = 'casting_moc_thuy';
      b.row = sectId === 'doan_thi' ? 3 : 2;
      b.size = size;
      b.angle = sectId === 'doan_thi' ? angle : 0;
      b.scaleY = sectId === 'doan_thi' ? 1 : 0.76;
      b.layer = sectId === 'doan_thi' ? 'impact' : 'ground';
    }

    // 2. Forward launch propulsion recoil wave (Row 4 of casting_kim_hoa_tho) for crisp release feel
    if (isWeaponPropulsion) {
      const w = this.alloc();
      w.active = true;
      w.sheetId = 'casting_kim_hoa_tho';
      w.row = 3;
      w.maxFrames = 4;
      w.fixedCol = -1;
      w.x = x + Math.cos(angle) * 20;
      w.y = y + Math.sin(angle) * 20;
      w.size = Math.max(54, size * 0.72);
      w.angle = angle;
      w.scaleY = 1;
      w.life = 0.24;
      w.maxLife = 0.24;
      w.alpha = 0.88;
      w.additive = true;
      w.layer = 'impact';
    }
  }

  private resolveElementHitCollisionSheet(element?: ElementType): VfxSheetId | null {
    switch (element) {
      case 'kim':
        return 'hit_collision_kim';
      case 'moc':
        return 'hit_collision_moc';
      case 'thuy':
        return 'hit_collision_thuy';
      case 'hoa':
        return 'hit_collision_hoa';
      case 'tho':
        return 'hit_collision_tho';
      default:
        return null;
    }
  }

  spawnCollisionBurst(
    kind: 'parry' | 'shockwave' | 'shield_hit' | 'ground_push',
    x: number,
    y: number,
    size = 72,
    angle = 0,
    element?: ElementType
  ) {
    const elemSheet = this.resolveElementHitCollisionSheet(element);
    const b = this.alloc();
    b.active = true;
    if (elemSheet) {
      // Dedicated per-element/per-sect Hit & Collision sheets:
      // Row 2 = Parry / Weapon Clash / Shield Barrier Collision
      // Row 3 = Kinetic Shockwave / Ground Pushback Collision
      b.sheetId = elemSheet;
      b.row = kind === 'parry' || kind === 'shield_hit' ? 2 : 3;
    } else {
      b.sheetId = 'collision';
      b.row = kind === 'parry' ? 0 : kind === 'shockwave' ? 1 : kind === 'shield_hit' ? 2 : 3;
    }
    b.maxFrames = 4;
    b.fixedCol = -1;
    b.x = x;
    b.y = y;
    b.size = size;
    b.angle = kind === 'parry' ? angle * 0.25 : 0;
    b.scaleY = kind === 'shockwave' || kind === 'ground_push' ? 0.72 : 1;
    b.life = kind === 'shield_hit' ? 0.38 : 0.32;
    b.maxLife = b.life;
    b.alpha = 0.96;
    b.additive = kind === 'parry' || kind === 'shockwave';
    b.layer = kind === 'ground_push' ? 'ground' : 'impact';
  }

  spawnHitImpactBurst(
    kind: 'slash' | 'crit' | 'blunt' | 'status_element',
    x: number,
    y: number,
    size = 64,
    angle = 0,
    element?: ElementType
  ) {
    const elemSheet = kind === 'status_element' ? null : this.resolveElementHitCollisionSheet(element);
    const b = this.alloc();
    b.active = true;
    if (elemSheet) {
      // Dedicated per-element/per-sect Hit & Collision sheets:
      // Row 0 = Normal Elemental Hit Impact on monster
      // Row 1 = Explosive Elemental Critical Hit Starburst on monster
      b.sheetId = elemSheet;
      b.row = kind === 'crit' ? 1 : 0;
      b.fixedCol = -1;
    } else {
      b.sheetId = 'hit_impact';
      b.row = kind === 'slash' ? 0 : kind === 'crit' ? 1 : kind === 'blunt' ? 2 : 3;
      if (kind === 'status_element') {
        // Row 3 columns: 0 = Moc venom, 1 = Thuy ice, 2 = Hoa fire, 3 = Tho lightning
        b.fixedCol =
          element === 'moc' ? 0 : element === 'thuy' ? 1 : element === 'hoa' ? 2 : 3;
      } else {
        b.fixedCol = -1;
      }
    }
    b.maxFrames = 4;
    b.x = x;
    b.y = y;
    b.size = size;
    b.angle = kind === 'slash' ? angle + (-0.35 + Math.random() * 0.7) : 0;
    b.scaleY = 1;
    b.life = kind === 'crit' ? 0.36 : 0.28;
    b.maxLife = b.life;
    b.alpha = kind === 'crit' ? 1.0 : 0.94;
    b.additive = kind === 'crit' || (kind === 'slash' && element !== 'moc' && element !== 'thuy');
    b.layer = 'impact';
  }

  update(dt: number) {
    for (let i = 0; i < this.items.length; i++) {
      const b = this.items[i];
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) {
        b.active = false;
      }
    }
    for (let i = 0; i < this.missiles.length; i++) {
      const m = this.missiles[i];
      if (!m.active) continue;
      m.elapsed += dt;
      if (m.elapsed >= m.duration) {
        m.active = false;
        const ang = Math.atan2(m.toY - m.fromY, m.toX - m.fromX);
        this.spawnSkillBurst(
          m.element,
          m.vfxKind,
          m.toX,
          m.toY,
          m.impactRadius,
          ang,
          m.impactDuration,
          m.sectId
        );
        this.spawnCollisionBurst(
          'shockwave',
          m.toX,
          m.toY,
          Math.max(72, Math.min(126, m.impactRadius * 0.95)),
          ang,
          m.element
        );
      }
    }
  }

  renderLayer(ctx: CanvasRenderingContext2D, layer: 'ground' | 'impact') {
    for (let i = 0; i < this.items.length; i++) {
      const b = this.items[i];
      if (!b.active || b.layer !== layer) continue;
      const t = Math.max(0, Math.min(0.999, 1 - b.life / b.maxLife));
      const col = b.fixedCol >= 0 ? b.fixedCol : Math.min(b.maxFrames - 1, Math.floor(t * b.maxFrames));
      const fadeOut = t > 0.72 ? (1 - t) / 0.28 : 1;
      const popScale = b.fixedCol >= 0 ? 0.72 + t * 0.42 : 0.88 + t * 0.22;
      drawVfxSheetFrame(
        ctx,
        b.sheetId,
        b.row,
        col,
        b.x,
        b.y,
        b.size * popScale,
        b.angle,
        b.alpha * fadeOut,
        b.additive,
        b.scaleY
      );
    }

    if (layer === 'impact') {
      for (let i = 0; i < this.missiles.length; i++) {
        const m = this.missiles[i];
        if (!m.active) continue;
        const t = Math.max(0, Math.min(1, m.elapsed / m.duration));
        const x = m.fromX + (m.toX - m.fromX) * t;
        const y = m.fromY + (m.toY - m.fromY) * t;
        const ang = m.spin ? t * Math.PI * 5 : Math.atan2(m.toY - m.fromY, m.toX - m.fromX);
        // Subtle afterimage trail behind traveling bolt
        if (t > 0.12) {
          const prevT = Math.max(0, t - 0.14);
          const px = m.fromX + (m.toX - m.fromX) * prevT;
          const py = m.fromY + (m.toY - m.fromY) * prevT;
          drawVfxSheetFrame(
            ctx,
            'projectiles',
            m.projRow,
            m.projCol,
            px,
            py,
            m.boltSize * 0.82,
            ang,
            0.42,
            true,
            1
          );
        }
        drawVfxSheetFrame(
          ctx,
          'projectiles',
          m.projRow,
          m.projCol,
          x,
          y,
          m.boltSize * (0.95 + t * 0.18),
          ang,
          0.98,
          false,
          1
        );
      }
    }
  }
}
