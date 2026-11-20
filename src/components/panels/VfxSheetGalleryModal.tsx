import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Grid, Pause, Play, Sparkles, Sun, Moon, X } from 'lucide-react';
import {
  drawVfxSheetFrame,
  getLoadedVfxSheet,
  preloadAllVfxSheets,
  subscribeVfxSheetsLoaded,
  VFX_SHEET_BY_ID,
  VFX_SHEET_REGISTRY,
  VfxSheetCategory,
  VfxSheetId,
} from '../../game/vfxSpriteSheetEngine';

interface VfxSheetGalleryModalProps {
  onClose: () => void;
  initialSheetId?: VfxSheetId;
}

type FilterMode = 'all' | VfxSheetCategory;

export const VfxSheetGalleryModal: React.FC<VfxSheetGalleryModalProps> = ({
  onClose,
  initialSheetId = 'skill_kim',
}) => {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedId, setSelectedId] = useState<VfxSheetId>(initialSheetId);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [playing, setPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(8);
  const [frameIdx, setFrameIdx] = useState<number>(0);
  const [lightBackdrop, setLightBackdrop] = useState<boolean>(false);
  const [playAll16, setPlayAll16] = useState<boolean>(false);
  const [, setLoadedVersion] = useState<number>(0);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    preloadAllVfxSheets();
    return subscribeVfxSheetsLoaded(() => setLoadedVersion((v) => v + 1));
  }, []);

  const filteredSheets = useMemo(
    () =>
      filter === 'all'
        ? VFX_SHEET_REGISTRY
        : VFX_SHEET_REGISTRY.filter((s) => s.category === filter),
    [filter]
  );

  const activeSheet = VFX_SHEET_BY_ID[selectedId] || VFX_SHEET_REGISTRY[0];
  const totalSteps = playAll16 ? 16 : 4;

  // Frame animation timer
  useEffect(() => {
    if (!playing) return;
    const ms = Math.max(35, Math.round(1000 / fps));
    const timer = window.setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % totalSteps);
    }, ms);
    return () => window.clearInterval(timer);
  }, [playing, fps, totalSteps]);

  // Render live animated preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (lightBackdrop) {
      // Bright Kiếm Thế daylight arena tiles preview so user sees alpha-keyed transparency over daylight map
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#729E63');
      grad.addColorStop(1, '#5B8751');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      for (let gx = -h; gx < w + h; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx + h, h);
        ctx.stroke();
      }
      // Target ground shadow oval
      ctx.fillStyle = 'rgba(12, 24, 14, 0.32)';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + 44, 46, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#070B0E';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 24; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 24; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    const row = playAll16 ? Math.floor((frameIdx % 16) / 4) : selectedRow;
    const col = playAll16 ? frameIdx % 4 : frameIdx % 4;
    drawVfxSheetFrame(
      ctx,
      activeSheet.id,
      row,
      col,
      w / 2,
      h / 2,
      196,
      0,
      1,
      false,
      1
    );
  }, [activeSheet.id, selectedRow, frameIdx, lightBackdrop, playAll16]);

  const handleDownloadSheet = (transparentPng: boolean) => {
    const entry = getLoadedVfxSheet(activeSheet.id);
    if (transparentPng && entry.alphaCanvas) {
      const link = document.createElement('a');
      link.download = `${activeSheet.id}_transparent_4x4.png`;
      link.href = entry.alphaCanvas.toDataURL('image/png');
      link.click();
      return;
    }
    const link = document.createElement('a');
    link.download = `${activeSheet.id}_4x4.jpg`;
    link.href = activeSheet.src;
    link.click();
  };

  const currentRowForDisplay = playAll16 ? Math.floor((frameIdx % 16) / 4) : selectedRow;
  const currentColForDisplay = frameIdx % 4;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/78 p-2 sm:p-4 backdrop-blur-[2px] select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="kt-window flex h-[92dvh] max-h-[820px] w-full max-w-[1260px] flex-col overflow-hidden text-[#E2ECEF]"
      >
        {/* Titlebar */}
        <div className="kt-titlebar flex shrink-0 items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 shrink-0 text-[#F5D061]" />
            <span className="font-wuxia truncate text-sm font-bold text-[#FEF3C7]">
              Bộ Sheet Hình Ảnh Hiệu Ứng Võ Học · Va Chạm · Đánh Trúng
            </span>
            <span className="hidden font-mono text-[10px] text-[#A8BDC6] sm:inline whitespace-nowrap">
              {VFX_SHEET_REGISTRY.length} Bảng · {VFX_SHEET_REGISTRY.length * 16} Khung Hình 4×4
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Kho Sheet VFX"
            className="flex h-6 w-6 items-center justify-center rounded-[2px] border border-[#8A9EA8]/70 bg-[#1B2B28] text-[#DCE6EA] hover:bg-[#7F1D1D] hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Filter Bar + Actions */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#46565E] bg-[#12181C] px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: 'all', label: `Tất cả (${VFX_SHEET_REGISTRY.length})` },
                { id: 'casting', label: 'Thi Triển / Casting (3)' },
                { id: 'hit_collision', label: 'Đánh Trúng & Va Chạm 12 Phái (5)' },
                { id: 'skill', label: 'Kỹ năng 12 Phái (10)' },
                { id: 'projectile', label: 'Đạn Khí Bay (1)' },
                { id: 'collision', label: 'Va chạm Chung (1)' },
                { id: 'hit', label: 'Đánh trúng Chung (1)' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setFilter(t.id);
                  const nextList =
                    t.id === 'all'
                      ? VFX_SHEET_REGISTRY
                      : VFX_SHEET_REGISTRY.filter((s) => s.category === t.id);
                  if (!nextList.some((s) => s.id === selectedId) && nextList[0]) {
                    setSelectedId(nextList[0].id);
                    setSelectedRow(0);
                    setFrameIdx(0);
                  }
                }}
                className={`rounded-[2px] border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  filter === t.id
                    ? 'border-[#F5D061] bg-[#282213] text-[#FEF3C7]'
                    : 'border-[#394850] bg-[#171F24] text-[#9EB2BC] hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowGrid((v) => !v)}
              className={`flex items-center gap-1 rounded-[2px] border px-2.5 py-1 text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                showGrid
                  ? 'border-[#86EFAC] bg-[#153126] text-[#D1FAE5]'
                  : 'border-[#3E4E56] bg-[#161E22] text-[#A4B8C2]'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Lưới 4×4</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadSheet(true)}
              className="flex items-center gap-1 rounded-[2px] border border-[#5B876D] bg-[#193A2B] px-2.5 py-1 text-[11px] font-semibold text-[#D1FAE5] hover:brightness-110 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải PNG Trong Suốt</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadSheet(false)}
              className="flex items-center gap-1 rounded-[2px] border border-[#7A6A3A] bg-[#241E11] px-2.5 py-1 text-[11px] font-semibold text-[#FEF08A] hover:brightness-110 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải Sheet Gốc</span>
            </button>
          </div>
        </div>

        {/* 3-Column Body: Sheet Selector | Full 4x4 Sheet Canvas | Live Animation Inspector */}
        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px] overflow-hidden">
          {/* LEFT: 7 Sheets List */}
          <aside className="flex flex-row gap-1.5 overflow-x-auto border-b border-[#3A4850] bg-[#0F1417] p-2 lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0">
            {filteredSheets.map((sheet) => {
              const isSel = sheet.id === activeSheet.id;
              return (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(sheet.id);
                    setSelectedRow(0);
                    setFrameIdx(0);
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-[2px] border p-1.5 text-left transition-colors cursor-pointer lg:w-full ${
                    isSel
                      ? 'border-[#F5D061] bg-[#242014]'
                      : 'border-[#334148] bg-[#141B1F] hover:border-[#6A818C]'
                  }`}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[2px] border border-[#495A63] bg-black">
                    <img
                      src={sheet.src}
                      alt={sheet.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="truncate text-[11.5px] font-bold"
                      style={{ color: isSel ? '#FEF3C7' : sheet.accentColor }}
                    >
                      {sheet.title}
                    </div>
                    <div className="mt-0.5 truncate text-[9.5px] text-[#9BB0BA]">
                      {sheet.subtitle}
                    </div>
                    <div className="mt-0.5 font-mono text-[8.5px] text-[#7F95A0] tabular-nums">
                      4×4 · 16 khung hình
                    </div>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* CENTER: Full 4×4 Sprite Sheet Display with Clickable Frame Grid */}
          <main className="flex min-h-0 flex-col items-center justify-center overflow-auto bg-[#090D10] p-3">
            <div className="mb-2 flex w-full max-w-[560px] items-center justify-between text-[11px]">
              <span className="font-bold" style={{ color: activeSheet.accentColor }}>
                {activeSheet.title}
              </span>
              <span className="font-mono text-[10px] text-[#9BB0BA] tabular-nums">
                Nhấn vào từng ô để xem khung hình · Ô đang chọn: H{currentRowForDisplay + 1}-C
                {currentColForDisplay + 1}
              </span>
            </div>

            <div className="relative aspect-square w-full max-w-[540px] overflow-hidden rounded-[2px] border border-[#4E616B] bg-black shadow-[0_12px_36px_rgba(0,0,0,0.75)]">
              <img
                src={activeSheet.src}
                alt={activeSheet.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain"
              />

              {/* Interactive 4x4 Frame Overlay */}
              <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
                {Array.from({ length: 16 }).map((_, cellIdx) => {
                  const r = Math.floor(cellIdx / 4);
                  const c = cellIdx % 4;
                  const isActiveCell =
                    r === currentRowForDisplay && c === currentColForDisplay;
                  const isActiveRow = !playAll16 && r === selectedRow;
                  return (
                    <button
                      key={cellIdx}
                      type="button"
                      onClick={() => {
                        setPlayAll16(false);
                        setSelectedRow(r);
                        setFrameIdx(c);
                      }}
                      title={`Hàng ${r + 1} (${activeSheet.rowLabels[r]}) · Khung ${c + 1}`}
                      className={`relative transition-colors cursor-pointer ${
                        showGrid ? 'border border-white/15' : 'border border-transparent'
                      } ${
                        isActiveCell
                          ? 'ring-2 ring-inset ring-[#F5D061] bg-[#F5D061]/10'
                          : isActiveRow && showGrid
                          ? 'bg-white/[0.03]'
                          : 'hover:bg-white/[0.06]'
                      }`}
                    >
                      {showGrid && (
                        <span
                          className={`absolute top-1 left-1 rounded-[1px] px-1 font-mono text-[9px] font-bold tabular-nums ${
                            isActiveCell
                              ? 'bg-[#F5D061] text-[#111518]'
                              : 'bg-black/75 text-[#CBD5E1]'
                          }`}
                        >
                          {String(cellIdx + 1).padStart(2, '0')}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </main>

          {/* RIGHT: Live Frame-by-Frame Animator & Row Breakdown */}
          <aside className="flex min-h-0 flex-col gap-2.5 overflow-y-auto border-t border-[#3A4850] bg-[#10161A] p-3 lg:border-t-0 lg:border-l">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#FEF3C7]">
                Xem Chuyển Động Trực Tiếp
              </span>
              <button
                type="button"
                onClick={() => setLightBackdrop((v) => !v)}
                className="flex items-center gap-1 rounded-[2px] border border-[#44545E] bg-[#172026] px-2 py-0.5 text-[10px] text-[#C6D6DE] hover:text-white cursor-pointer whitespace-nowrap"
              >
                {lightBackdrop ? <Sun className="h-3 w-3 text-[#FDE047]" /> : <Moon className="h-3 w-3 text-[#93C5FD]" />}
                <span>{lightBackdrop ? 'Nền Bản Đồ' : 'Nền Tối'}</span>
              </button>
            </div>

            {/* Live Canvas Preview */}
            <div className="relative mx-auto aspect-square w-full max-w-[236px] overflow-hidden rounded-[2px] border border-[#4D606A] bg-[#070B0E]">
              <canvas
                ref={previewCanvasRef}
                width={240}
                height={240}
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute right-1.5 bottom-1 rounded-[1px] bg-black/75 px-1.5 py-0.5 font-mono text-[9px] text-[#F5D061] tabular-nums">
                Khung {String(currentRowForDisplay * 4 + currentColForDisplay + 1).padStart(2, '0')} / 16
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => setPlaying((v) => !v)}
                className="flex items-center gap-1 rounded-[2px] border border-[#5B876D] bg-[#173527] px-2.5 py-1 text-[10.5px] font-bold text-[#D1FAE5] hover:brightness-110 cursor-pointer whitespace-nowrap"
              >
                {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                <span>{playing ? 'Tạm dừng' : 'Phát'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlayAll16((v) => !v);
                  setFrameIdx(0);
                }}
                className={`rounded-[2px] border px-2 py-1 text-[10px] font-semibold cursor-pointer whitespace-nowrap ${
                  playAll16
                    ? 'border-[#F5D061] bg-[#282213] text-[#FEF3C7]'
                    : 'border-[#3E4E56] bg-[#161E22] text-[#A4B8C2]'
                }`}
              >
                {playAll16 ? 'Chạy cả 16 ô' : 'Chạy theo hàng'}
              </button>

              <div className="flex items-center gap-0.5">
                {[6, 10, 16].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFps(val)}
                    className={`rounded-[2px] border px-1.5 py-1 font-mono text-[9.5px] tabular-nums cursor-pointer ${
                      fps === val
                        ? 'border-[#F5D061] bg-[#282213] text-[#FEF3C7]'
                        : 'border-[#38464E] bg-[#151D21] text-[#9BB0BA]'
                    }`}
                  >
                    {val}f
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Row Selector Breakdown */}
            <div className="space-y-1.5 border-t border-[#2E3B42] pt-2">
              <div className="text-[10px] font-bold text-[#B8CAD2]">
                4 Dãy Hiệu Ứng Trong Sheet (4 khung/hàng)
              </div>
              {activeSheet.rowLabels.map((label, rIdx) => {
                const isSelRow = !playAll16 && selectedRow === rIdx;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setPlayAll16(false);
                      setSelectedRow(rIdx);
                      setFrameIdx(0);
                    }}
                    className={`w-full rounded-[2px] border p-1.5 text-left transition-colors cursor-pointer ${
                      isSelRow
                        ? 'border-[#F5D061] bg-[#231F13]'
                        : 'border-[#313F47] bg-[#131A1E] hover:border-[#627984]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[10px] font-bold text-[#F3EAD8]">
                        Hàng {rIdx + 1}: {label}
                      </span>
                      <span className="shrink-0 font-mono text-[8.5px] text-[#9BB0BA] tabular-nums">
                        {String(rIdx * 4 + 1).padStart(2, '0')}–{String(rIdx * 4 + 4).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[9px] leading-snug text-[#9FB3BD]">
                      {activeSheet.rowNotes[rIdx]}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
