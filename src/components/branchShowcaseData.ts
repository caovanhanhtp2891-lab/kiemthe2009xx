import branchBayImg from '../assets/images/branch_style_bay_1795079635117.jpg';
import branchChuongImg from '../assets/images/branch_style_chuong_1795079635304.jpg';
import branchChuyImg from '../assets/images/branch_style_chuy_1795079634155.jpg';
import branchConImg from '../assets/images/branch_style_con_1795079634879.jpg';
import branchDaoImg from '../assets/images/branch_style_dao_1795079635543.jpg';
import branchKiemImg from '../assets/images/branch_style_kiem_1795079634515.jpg';
import branchThuongImg from '../assets/images/branch_style_thuong_1795079635067.jpg';
import branchTuTienImg from '../assets/images/branch_style_tutien_1795079635117.jpg';
import { SectId } from '../game/types';

export interface BranchShowcaseProfile {
  image: string;
  imageAlt: string;
  weaponLabel: string;
  rangeLabel: 'Cận chiến' | 'Tầm trung' | 'Tầm xa';
  roleLabel: string;
  styleSummary: string;
  /** Subtle elemental wash harmonizing the painted weapon scene with each sect's Ngũ Hành aura */
  tintColor: string;
}

const BRANCH_ART_BY_WEAPON: Record<string, string> = {
  'Đao': branchDaoImg,
  'Côn': branchConImg,
  'Bổng': branchConImg,
  'Thương': branchThuongImg,
  'Chùy': branchChuyImg,
  'Tụ Tiễn': branchTuTienImg,
  'Bẫy': branchBayImg,
  'Hãm Tĩnh': branchBayImg,
  'Chưởng': branchChuongImg,
  'Chỉ': branchChuongImg,
  'Kiếm': branchKiemImg,
  'Khí': branchKiemImg,
};

const BRANCH_PROFILES: Record<SectId, Record<string, BranchShowcaseProfile>> = {
  thieu_lam: {
    'Đao': {
      image: branchDaoImg,
      imageAlt: 'Minh họa phong cách Thiếu Lâm Đao chém đao khí vàng kim',
      weaponLabel: 'Giới Đao Thiếu Lâm',
      rangeLabel: 'Tầm trung',
      roleLabel: 'Đao khí tuyến thẳng · Đánh hai nhịp',
      styleSummary:
        'Tung đao khí vàng kim bay sát mặt đất theo đường thẳng, vừa giữ khoảng cách an toàn vừa áp đảo nhiều mục tiêu liên tiếp.',
      tintColor: 'rgba(245, 208, 97, 0.16)',
    },
    'Côn': {
      image: branchConImg,
      imageAlt: 'Minh họa phong cách Thiếu Lâm Côn xoay trường côn vàng đồng',
      weaponLabel: 'Phục Ma Thiền Côn',
      rangeLabel: 'Cận chiến',
      roleLabel: 'Hút gom địch · Khống chế diện rộng',
      styleSummary:
        'Xông pha tuyến đầu bằng Sư Tử Hống làm bất động, hút kẻ địch vào tâm rồi xoay côn quét sạch vòng vây.',
      tintColor: 'rgba(245, 190, 75, 0.16)',
    },
  },
  thien_vuong: {
    'Thương': {
      image: branchThuongImg,
      imageAlt: 'Minh họa phong cách Thiên Vương Thương xung kích bạch kim',
      weaponLabel: 'Trường Thương Bạch Kim',
      rangeLabel: 'Cận chiến',
      roleLabel: 'Xung kích bất động · Liên kích tốc độ cao',
      styleSummary:
        'Lao thẳng vào mục tiêu bằng Đoạn Hồn Thích, dồn mũi thương tốc độ cao và xoay thương hộ thể chống khống chế.',
      tintColor: 'rgba(251, 191, 36, 0.14)',
    },
    'Chùy': {
      image: branchChuyImg,
      imageAlt: 'Minh họa phong cách Thiên Vương Chùy Kim Chung Tráo hộ thân',
      weaponLabel: 'Song Chùy Thiết Giáp',
      rangeLabel: 'Cận chiến',
      roleLabel: 'Trâu bò hộ thể · Bộc phát chấn địa',
      styleSummary:
        'Bật Kim Chung Tráo tăng công thủ cho bản thân và đồng đội, sau đó áp sát giáng những cú chùy nổ chấn động diện rộng.',
      tintColor: 'rgba(245, 158, 11, 0.16)',
    },
  },
  duong_mon: {
    'Tụ Tiễn': {
      image: branchTuTienImg,
      imageAlt: 'Minh họa phong cách Đường Môn Tụ Tiễn phóng mưa ám khí xanh ngọc',
      weaponLabel: 'Liên Châu Tụ Tiễn',
      rangeLabel: 'Tầm xa',
      roleLabel: 'Cơ động thả diều · Mưa ám khí liên hoàn',
      styleSummary:
        'Lướt bóng Mê Ảnh Tung giữ cự ly hoàn hảo, liên tục trút bão phi tiêu xanh lục chí mạng cao vào kẻ địch từ xa.',
      tintColor: 'rgba(74, 222, 128, 0.15)',
    },
    'Hãm Tĩnh': {
      image: branchBayImg,
      imageAlt: 'Minh họa phong cách Đường Môn Hãm Tĩnh gài cơ quan độc gai',
      weaponLabel: 'Cơ Quan Hãm Tĩnh',
      rangeLabel: 'Tầm trung',
      roleLabel: 'Kiểm soát địa hình · Đẩy lùi phản công',
      styleSummary:
        'Giăng trận cơ quan và gai độc dưới chân đối thủ, kết hợp Cửu Cung Kỳ Môn Trận đẩy lùi kẻ áp sát và kích nổ liên hoàn.',
      tintColor: 'rgba(34, 197, 94, 0.18)',
    },
    'Bẫy': {
      image: branchBayImg,
      imageAlt: 'Minh họa phong cách Đường Môn Bẫy gài cơ quan độc gai',
      weaponLabel: 'Cơ Quan Độc Bẫy',
      rangeLabel: 'Tầm trung',
      roleLabel: 'Kiểm soát địa hình · Đẩy lùi phản công',
      styleSummary:
        'Giăng trận gai độc dưới chân đối thủ, kết hợp Cơ Quan Bí Thuật đẩy lùi kẻ áp sát và kích nổ liên hoàn.',
      tintColor: 'rgba(34, 197, 94, 0.18)',
    },
  },
  ngu_doc: {
    'Chưởng': {
      image: branchChuongImg,
      imageAlt: 'Minh họa phong cách Ngũ Độc Chưởng tụ độc khí lục tím',
      weaponLabel: 'Vạn Độc Chưởng Pháp',
      rangeLabel: 'Tầm xa',
      roleLabel: 'Sát thương độc kéo dài · Làm chậm diện rộng',
      styleSummary:
        'Phóng chưởng độc và đám mây khói lục bào mòn sinh lực địch theo thời gian, vừa làm chậm vừa phá vỡ đội hình đông người.',
      tintColor: 'rgba(74, 222, 128, 0.22)',
    },
    'Đao': {
      image: branchDaoImg,
      imageAlt: 'Minh họa phong cách Ngũ Độc Đao chém đao khí tẩm kịch độc',
      weaponLabel: 'Độc Huyết Loan Đao',
      rangeLabel: 'Tầm trung',
      roleLabel: 'Bộc phát kịch độc · Phá giáp đánh nhanh',
      styleSummary:
        'Chém loạt đao khí tẩm kịch độc tốc độ cao, chồng tầng độc sát và kết liễu mục tiêu bằng lưỡi đao cắt ngang sắc lẹm.',
      tintColor: 'rgba(34, 197, 94, 0.24)',
    },
  },
  minh_giao: {
    'Kiếm': {
      image: branchKiemImg,
      imageAlt: 'Minh họa phong cách Minh Giáo Kiếm điều khiển kiếm khí lục hỏa',
      weaponLabel: 'Thánh Hỏa Kiếm',
      rangeLabel: 'Tầm xa',
      roleLabel: 'Vạn vật quy nguyên · Rút nội lực & diện rộng',
      styleSummary:
        'Phóng kiếm khí xanh lục theo từng đợt, bào mòn nội lực đối phương và triệu hồi trận hỏa lục bao trùm chiến trường.',
      tintColor: 'rgba(52, 211, 153, 0.2)',
    },
    'Chùy': {
      image: branchChuyImg,
      imageAlt: 'Minh họa phong cách Minh Giáo Chùy xung phong hỏa lực',
      weaponLabel: 'Phá Thiên Chiến Chùy',
      rangeLabel: 'Cận chiến',
      roleLabel: 'Áp sát tốc độ cao · Bộc phát chí mạng',
      styleSummary:
        'Lướt nhanh tiếp cận mục tiêu, tung liên hoàn chùy nặng rực lửa xanh lục gây bộc phát sát thương đơn mục tiêu cực mạnh.',
      tintColor: 'rgba(74, 222, 128, 0.2)',
    },
  },
  nga_mi: {
    'Kiếm': {
      image: branchKiemImg,
      imageAlt: 'Minh họa phong cách Nga Mi Kiếm trợ chiến hồi sinh lực',
      weaponLabel: 'Phật Quang Thần Kiếm',
      rangeLabel: 'Tầm trung',
      roleLabel: 'Hồi phục sinh lực · Khống chế băng sương',
      styleSummary:
        'Kết hợp kiếm khí băng thanh với Từ Hàng Phổ Độ hồi máu và tăng kháng, là chỗ dựa không thể thiếu khi săn Boss hay công thành.',
      tintColor: 'rgba(56, 189, 248, 0.18)',
    },
    'Chưởng': {
      image: branchChuongImg,
      imageAlt: 'Minh họa phong cách Nga Mi Chưởng tỏa băng hoa liên hoàn',
      weaponLabel: 'Tứ Tượng Băng Chưởng',
      rangeLabel: 'Tầm xa',
      roleLabel: 'Làm chậm diện rộng · Sát thương băng bền bỉ',
      styleSummary:
        'Phóng Tứ Tượng Đồng Quy và Phong Sương Toái Ảnh trải băng tuyết khắp chiến trường, vừa giữ khoảng cách vừa đóng băng kẻ địch.',
      tintColor: 'rgba(56, 189, 248, 0.22)',
    },
  },
  thuy_yen: {
    'Kiếm': {
      image: branchKiemImg,
      imageAlt: 'Minh họa phong cách Thúy Yên Kiếm phóng bông tuyết băng kiếm',
      weaponLabel: 'Ngự Tuyết Hàn Kiếm',
      rangeLabel: 'Tầm xa',
      roleLabel: 'Đóng băng khống chế · Bão tuyết diện rộng',
      styleSummary:
        'Điều khiển kiếm khí kết tinh thành mưa hoa tuyết làm chậm và đóng băng nhiều kẻ địch cùng lúc trên phạm vi rộng.',
      tintColor: 'rgba(103, 232, 249, 0.2)',
    },
    'Đao': {
      image: branchDaoImg,
      imageAlt: 'Minh họa phong cách Thúy Yên Đao ẩn thân xuất kích băng giá',
      weaponLabel: 'Ẩn Ảnh Hàn Đao',
      rangeLabel: 'Cận chiến',
      roleLabel: 'Tàng hình ám sát · Bộc phát chí mạng',
      styleSummary:
        'Ẩn thân vào màn sương tuyết tiếp cận bất ngờ, tung nhát Băng Tâm Tiên Tử bộc phát sát thương cực lớn rồi rút lui nhanh chóng.',
      tintColor: 'rgba(56, 189, 248, 0.24)',
    },
  },
  doan_thi: {
    'Kiếm': {
      image: branchKiemImg,
      imageAlt: 'Minh họa phong cách Đoàn Thị Kiếm phóng Lục Mạch Thần Kiếm',
      weaponLabel: 'Lục Mạch Thần Kiếm',
      rangeLabel: 'Tầm xa',
      roleLabel: 'Kiếm khí liên xạ · Đẩy lùi giữ cự ly',
      styleSummary:
        'Phóng từng luồng kiếm khí xanh ngọc xuyên thẳng hàng ngũ địch, kết hợp đẩy lùi để duy trì thế chủ động hoàn toàn từ xa.',
      tintColor: 'rgba(56, 189, 248, 0.18)',
    },
    'Chỉ': {
      image: branchChuongImg,
      imageAlt: 'Minh họa phong cách Đoàn Thị Chỉ thi triển Nhất Dương Chỉ',
      weaponLabel: 'Nhất Dương Thần Chỉ',
      rangeLabel: 'Tầm trung',
      roleLabel: 'Điểm huyệt khống chế · Đột kích chính xác',
      styleSummary:
        'Lướt nhanh điểm huyệt khiến đối thủ tê liệt bất động, rồi dồn kình lực Nhất Dương Chỉ xuyên giáp hạ gục mục tiêu trọng yếu.',
      tintColor: 'rgba(96, 165, 250, 0.2)',
    },
  },
  cai_bang: {
    'Chưởng': {
      image: branchChuongImg,
      imageAlt: 'Minh họa phong cách Cái Bang Chưởng tung Hàng Long Thập Bát Chưởng',
      weaponLabel: 'Hàng Long Hỏa Chưởng',
      rangeLabel: 'Tầm trung',
      roleLabel: 'Rồng lửa diện rộng · Bộc phát hỏa sát',
      styleSummary:
        'Tung Phi Long Tại Thiên và Kháng Long Hữu Hối phóng đàn rồng lửa thiêu đốt diện rộng, uy lực áp đảo trong giao tranh đông người.',
      tintColor: 'rgba(249, 115, 22, 0.24)',
    },
    'Bổng': {
      image: branchConImg,
      imageAlt: 'Minh họa phong cách Cái Bang Bổng thi triển Đả Cẩu Bổng Pháp',
      weaponLabel: 'Đả Cẩu Bổng Pháp',
      rangeLabel: 'Tầm trung',
      roleLabel: 'Linh hoạt cơ động · Bổng ảnh liên hoàn',
      styleSummary:
        'Quét bổng hỏa ảnh tốc độ cao bám đuổi mục tiêu không rời, dễ vừa di chuyển vừa gây sát thương thiêu đốt liên tục.',
      tintColor: 'rgba(239, 68, 68, 0.22)',
    },
  },
  thien_nhan: {
    'Đao': {
      image: branchDaoImg,
      imageAlt: 'Minh họa phong cách Thiên Nhẫn Đao triệu hồi hỏa hải diện rộng',
      weaponLabel: 'Hỏa Liên Ma Đao',
      rangeLabel: 'Tầm xa',
      roleLabel: 'Biển lửa diện rộng · Thiêu đốt liên tục',
      styleSummary:
        'Triệu hồi Hỏa Liên Phần Hoa và Thôi Sơn Điền Hải phủ kín mặt đất bằng biển lửa, cực mạnh khi luyện công và thủ thành.',
      tintColor: 'rgba(239, 68, 68, 0.24)',
    },
    'Thương': {
      image: branchThuongImg,
      imageAlt: 'Minh họa phong cách Thiên Nhẫn Thương tung Vân Long Kích rực lửa',
      weaponLabel: 'Vân Long Hỏa Thương',
      rangeLabel: 'Cận chiến',
      roleLabel: 'Áp sát hỗn loạn · Hút sinh lực & bộc phát',
      styleSummary:
        'Lao vào địch trận gây hỗn loạn, liên tục đâm Vân Long Kích bùng lửa đỏ rực kèm khả năng bám trụ bền bỉ.',
      tintColor: 'rgba(248, 113, 113, 0.24)',
    },
  },
  vo_dang: {
    'Khí': {
      image: branchKiemImg,
      imageAlt: 'Minh họa phong cách Võ Đang Khí ngự Thái Cực Kiếm Khí',
      weaponLabel: 'Thái Cực Khí Kiếm',
      rangeLabel: 'Tầm xa',
      roleLabel: 'Nội công hộ thể · Mưa kiếm khí choáng',
      styleSummary:
        'Lấy nội lực hóa khiên Tọa Vọng Vô Ngã cực bền, triệu hồi Vạn Kiếm Quy Tông phủ kiếm khí từ trên cao gây choáng liên tục.',
      tintColor: 'rgba(217, 160, 91, 0.2)',
    },
    'Kiếm': {
      image: branchKiemImg,
      imageAlt: 'Minh họa phong cách Võ Đang Kiếm xuất Nhân Kiếm Hợp Nhất',
      weaponLabel: 'Thái Cực Thần Kiếm',
      rangeLabel: 'Cận chiến',
      roleLabel: 'Liên kích gây choáng · Áp sát linh hoạt',
      styleSummary:
        'Xuất kiếm nhanh như chớp với Nhân Kiếm Hợp Nhất, giữ nhịp gây choáng liên hoàn khiến đối thủ khó lòng phản công.',
      tintColor: 'rgba(234, 179, 8, 0.22)',
    },
  },
  con_lon: {
    'Kiếm': {
      image: branchKiemImg,
      imageAlt: 'Minh họa phong cách Côn Lôn Kiếm gọi thiên lôi giáng đỉnh',
      weaponLabel: 'Ngự Lôi Pháp Kiếm',
      rangeLabel: 'Tầm xa',
      roleLabel: 'Thiên lôi gây choáng · Sát thương điểm nổ',
      styleSummary:
        'Dẫn sấm sét giáng thẳng xuống vị trí địch bằng Lôi Động Cửu Thiên, phạm vi rộng và liên tục ngắt chiêu đối phương.',
      tintColor: 'rgba(245, 198, 92, 0.22)',
    },
    'Đao': {
      image: branchDaoImg,
      imageAlt: 'Minh họa phong cách Côn Lôn Đao cuốn cuồng phong bão cát',
      weaponLabel: 'Cuồng Phong Bảo Đao',
      rangeLabel: 'Tầm trung',
      roleLabel: 'Lốc xoáy cơ động · Tăng tốc & khống chế',
      styleSummary:
        'Phóng lốc xoáy gió vàng truy đuổi đối thủ, tăng tốc độ di chuyển và xuất chiêu cực nhanh để chiếm ưu thế chiến trường.',
      tintColor: 'rgba(217, 160, 91, 0.22)',
    },
  },
};

export function getBranchShowcaseProfile(
  sectId: SectId,
  branchName: string
): BranchShowcaseProfile {
  const exact = BRANCH_PROFILES[sectId]?.[branchName];
  if (exact) return exact;

  const fallbackImg = BRANCH_ART_BY_WEAPON[branchName] || branchKiemImg;
  return {
    image: fallbackImg,
    imageAlt: `Minh họa phong cách chiến đấu hướng ${branchName}`,
    weaponLabel: `Hệ ${branchName}`,
    rangeLabel: 'Tầm trung',
    roleLabel: `Chuyên tinh võ học ${branchName}`,
    styleSummary: `Phong cách chiến đấu đặc trưng sử dụng ${branchName}, tối ưu bộ tuyệt học chính trên phím 1–3.`,
    tintColor: 'rgba(245, 208, 97, 0.14)',
  };
}
