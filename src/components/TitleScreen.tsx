import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Sword } from 'lucide-react';
import { ASSET_PATHS, SECTS } from '../game/data';
import { formatNumber } from '../game/engine';
import { SavePayload } from '../game/types';

interface TitleScreenProps {
  savedGame: SavePayload | null;
  onContinue: () => void;
  onStartNew: () => void;
}

const CLASSIC_SERVERS = [
  { id: 'bach_kiem', name: 'Bạch Kiếm', cluster: 'Kiếm Thế 2009 · Cụm 1', status: 'Đông đúc', color: '#F5D061' },
  { id: 'hoa_kiem', name: 'Hỏa Kiếm', cluster: 'Kiếm Thế 2009 · Cụm 1', status: 'Ổn định', color: '#F97316' },
  { id: 'thuy_kiem', name: 'Thủy Kiếm', cluster: 'Kiếm Thế 2009 · Cụm 2', status: 'Mượt mà', color: '#38BDF8' },
  { id: 'moc_kiem', name: 'Mộc Kiếm', cluster: 'Kiếm Thế 2009 · Cụm 2', status: 'Ổn định', color: '#4ADE80' },
  { id: 'tho_kiem', name: 'Thổ Kiếm', cluster: 'Kiếm Thế 2009 · Cụm 3', status: 'Mới mở', color: '#EAB308' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  savedGame,
  onContinue,
  onStartNew,
}) => {
  const [selectedServer, setSelectedServer] = useState<string>(() => {
    try {
      return localStorage.getItem('vlkt_server_id') || 'bach_kiem';
    } catch {
      return 'bach_kiem';
    }
  });

  const handleSelectServer = (id: string) => {
    setSelectedServer(id);
    try {
      localStorage.setItem('vlkt_server_id', id);
    } catch {
      // ignore storage quota errors
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (savedGame) onContinue();
        else onStartNew();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [savedGame, onContinue, onStartNew]);

  const savedSect = savedGame ? SECTS[savedGame.player.sect] : null;
  const activeServer =
    CLASSIC_SERVERS.find((s) => s.id === selectedServer) || CLASSIC_SERVERS[0];

  return (
    <div className="relative flex h-dvh w-screen flex-col justify-between overflow-hidden bg-[#0B0907] text-[#F4E8CD]">
      {/* Generated Key Art Backdrop */}
      <img
        src={ASSET_PATHS.titleBackdrop}
        alt="Võ Lâm Kiếm Thế 2009"
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover object-center opacity-88"
      />
      {/* Warm antique lacquer atmospheric vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0806]/72 via-[#0D0A08]/45 to-[#080604]/92" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(8,6,4,0.82)_100%)]" />

      {/* Top classic Kiếm Thế 2009 bronze ribbon */}
      <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-[#7A5B2A]/60 bg-[#120D09]/80 px-6 py-2 text-xs text-[#DFCA9A]">
        <div className="flex items-center gap-3">
          <span className="font-wuxia text-base font-bold tracking-wider text-[#F5D061]">
            KIẾM THẾ · TÌNH NGHĨA GIANG HỒ
          </span>
          <span className="hidden text-[#7D6542] sm:inline" aria-hidden="true">
            |
          </span>
          <span className="hidden text-[#CBB78E] sm:inline">
            Ngũ Hành Tương Khắc · Boss Hoàng Kim · Công Thành Chiến
          </span>
        </div>
        <div className="font-mono text-[11px] text-[#C9A86A] tabular-nums">
          Máy Chủ: <strong className="text-[#FDE68A]">{activeServer.name}</strong>
        </div>
      </div>

      {/* Center Emblem + Classic 2009 Login Panel */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto px-4 py-3 sm:px-6">
        {/* Ornate Calligraphy Crest */}
        <svg
          viewBox="0 0 600 165"
          className="mb-3 max-h-[115px] w-full max-w-[500px] shrink-0 drop-shadow-[0_12px_28px_rgba(0,0,0,0.9)] sm:mb-4 sm:max-h-[145px]"
          role="img"
          aria-label="Võ Lâm Kiếm Thế"
        >
          <defs>
            <linearGradient id="ktGoldTitle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFF7D6" />
              <stop offset="45%" stopColor="#E6BA53" />
              <stop offset="100%" stopColor="#9A6C1F" />
            </linearGradient>
            <linearGradient id="ktJadeLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#B88E3D" stopOpacity="0" />
              <stop offset="25%" stopColor="#E5BA58" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#FFF2B8" stopOpacity="1" />
              <stop offset="75%" stopColor="#E5BA58" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#B88E3D" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Traditional crimson seal stamp */}
          <rect
            x="492"
            y="24"
            width="46"
            height="68"
            rx="2"
            fill="#861613"
            stroke="#E5BA58"
            strokeWidth="1.8"
          />
          <rect
            x="496"
            y="28"
            width="38"
            height="60"
            rx="1"
            fill="none"
            stroke="#FDE68A"
            strokeOpacity="0.45"
            strokeWidth="0.9"
          />
          <text
            x="515"
            y="54"
            textAnchor="middle"
            fill="#FEF3C7"
            fontSize="15"
            fontFamily="Cormorant Garamond, serif"
            fontWeight="700"
          >
            KIẾM
          </text>
          <text
            x="515"
            y="78"
            textAnchor="middle"
            fill="#FEF3C7"
            fontSize="15"
            fontFamily="Cormorant Garamond, serif"
            fontWeight="700"
          >
            THẾ
          </text>

          {/* Main gold engraved calligraphy */}
          <text
            x="275"
            y="84"
            textAnchor="middle"
            fill="url(#ktGoldTitle)"
            fontSize="74"
            fontFamily="Cormorant Garamond, serif"
            fontWeight="700"
            letterSpacing="4"
          >
            VÕ LÂM KIẾM THẾ
          </text>

          {/* Engraved sword divider */}
          <path d="M 48 106 L 552 106 L 520 110 L 80 110 Z" fill="url(#ktJadeLine)" />

          <text
            x="300"
            y="144"
            textAnchor="middle"
            fill="#F4E8CD"
            fontSize="26"
            fontFamily="Cormorant Garamond, serif"
            fontWeight="600"
            letterSpacing="9"
          >
            GIANG HỒ PHÂN TRANH · HỒI ỨC 2009
          </text>
        </svg>

        {/* Classic Kiếm Thế 2009 Beveled Bronze Login Box */}
        <div className="kt-window w-full max-w-2xl overflow-hidden">
          <div className="kt-titlebar flex items-center justify-between px-4 py-2">
            <span className="font-wuxia text-lg font-bold tracking-wide text-[#F7DA85]">
              Chọn Cụm Máy Chủ &amp; Đăng Nhập Giang Hồ
            </span>
            <span className="text-[11px] text-[#C7B38A]">{activeServer.cluster}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-12">
            {/* Left: Server list (classic 2009 Ngũ Hành Kiếm servers) */}
            <div className="space-y-1.5 md:col-span-5">
              <div className="mb-1 text-[11px] font-semibold text-[#C9A86A]">
                Danh Sách Máy Chủ
              </div>
              <div className="space-y-1">
                {CLASSIC_SERVERS.map((srv) => {
                  const active = srv.id === selectedServer;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => handleSelectServer(srv.id)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer ${
                        active
                          ? 'kt-btn-jade font-semibold text-[#FEF3C7]'
                          : 'kt-slot text-[#D8C7A4] hover:text-[#FEF3C7]'
                      }`}
                    >
                      <span style={{ color: active ? '#FEF3C7' : srv.color }}>{srv.name}</span>
                      <span className="text-[10px] text-[#C9BA9B]">{srv.status}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Saved character info + Enter buttons */}
            <div className="flex flex-col justify-between gap-4 border-t border-[#4B361D] pt-4 md:col-span-7 md:border-t-0 md:border-l md:pt-0 md:pl-5">
              <div>
                <div className="mb-2 text-[11px] font-semibold text-[#C9A86A]">
                  Hiệp Khách Lưu Trữ Trên Máy
                </div>

                {savedGame && savedSect ? (
                  <div className="kt-slot space-y-1.5 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-wuxia text-xl font-bold text-[#F5D061]">
                        {savedGame.player.name}
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#4ADE80] tabular-nums">
                        Cấp {savedGame.player.level}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#DFD1B4]">
                      <span style={{ color: savedSect.color }}>{savedSect.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>Hệ {savedSect.elementName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#F5D061] tabular-nums">
                        {formatNumber(savedGame.player.silver)} Bạc
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A89779]">
                      Tiến trình đã được bảo lưu tự động trên trình duyệt.
                    </div>
                  </div>
                ) : (
                  <div className="kt-slot p-4 text-xs leading-relaxed text-[#D7C7A8]">
                    Chưa có nhân vật tại máy chủ{' '}
                    <strong className="text-[#F5D061]">{activeServer.name}</strong>. Chọn một trong
                    Thập Nhị Đại Môn Phái (72 tuyệt học song hệ) và bắt đầu hành tẩu giang hồ.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 sm:flex-row">
                {savedGame ? (
                  <>
                    <button
                      onClick={onContinue}
                      className="kt-btn-crimson flex flex-1 items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold whitespace-nowrap cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>Vào Giang Hồ</span>
                    </button>
                    <button
                      onClick={onStartNew}
                      className="kt-btn-bronze flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Tạo Nhân Vật Mới</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onStartNew}
                    className="kt-btn-crimson flex flex-1 items-center justify-center gap-2 px-6 py-3 text-sm font-semibold whitespace-nowrap cursor-pointer"
                  >
                    <Sword className="h-4 w-4" />
                    <span>Khởi Tạo Nhân Vật</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Classic 2009 Control Strip */}
      <div className="relative z-10 border-t border-[#6D5024]/60 bg-[#100B08]/88 px-6 py-2 text-center text-[11px] text-[#C6B38F]">
        Enter / Space Vào game · WASD hoặc Click Di chuyển · 1–6 Tuyệt học · Q Kim Sang Dược · Space
        Khinh Công · R Lên/Xuống Ngựa · K Auto · P Đồ Sát · F1–F8 Tính năng
      </div>
    </div>
  );
};
