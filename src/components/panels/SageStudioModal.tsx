import React, { useState } from 'react';
import { BookOpen, Image as ImageIcon, Loader2, Send, Sparkles, UserCheck, X } from 'lucide-react';
import { MANTLES, MOUNTS, MOUNT_ILLUSIONS, SECTS } from '../../game/data';
import { ComputedStats, GuildInfo, PlayerState } from '../../game/types';

interface SageStudioModalProps {
  player: PlayerState;
  stats: ComputedStats;
  guild: GuildInfo | null;
  onClose: () => void;
  onApplyAvatar: (imageUrl: string) => void;
}

const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'] as const;
const IMAGE_SIZES = ['1K', '2K', '4K'] as const;

export const SageStudioModal: React.FC<SageStudioModalProps> = ({
  player,
  stats,
  guild,
  onClose,
  onApplyAvatar,
}) => {
  const [tab, setTab] = useState<'advisor' | 'studio'>('advisor');

  // Bách Hiểu Sinh (Gemini Intelligence)
  const [advisorMode, setAdvisorMode] = useState<'fast' | 'general' | 'tactical' | 'deep'>('general');
  const [question, setQuestion] = useState('');
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorReply, setAdvisorReply] = useState<string | null>(null);
  const [advisorModelUsed, setAdvisorModelUsed] = useState<string | null>(null);
  const [advisorError, setAdvisorError] = useState<string | null>(null);

  // Tàng Kinh Họa Các (Gemini Image Studio)
  const sect = SECTS[player.sect];
  const mantle = MANTLES.find((m) => m.id === player.mantleId) || MANTLES[0];
  const [artPrompt, setArtPrompt] = useState(
    `Chân dung đại hiệp phái ${sect.name} cầm ${sect.weaponType}, mặc chiến bào cổ trang hào quang ${mantle.name}, đứng giữa mây mù đỉnh Hoa Sơn`
  );
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIOS)[number]>('1:1');
  const [imageSize, setImageSize] = useState<(typeof IMAGE_SIZES)[number]>('1K');
  const [imageModel, setImageModel] = useState<'gemini-3-pro-image-preview' | 'gemini-nano-banana-2.1'>(
    'gemini-3-pro-image-preview'
  );
  const [artLoading, setArtLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [artError, setArtError] = useState<string | null>(null);

  const askAdvisor = async (customPrompt?: string) => {
    const q = (customPrompt ?? question).trim();
    if (!q || advisorLoading) return;
    setAdvisorLoading(true);
    setAdvisorError(null);

    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          mode: advisorMode,
          characterSummary: {
            ten: player.name,
            monPhai: sect.name,
            nguHanh: sect.elementName,
            capDo: player.level,
            lucChien: stats.power,
            cong: stats.atk,
            thu: stats.def,
            sinhLuc: stats.maxHp,
            chiMang: `${stats.crit}%`,
            tocDiChuyen: `+${stats.moveSpeedPct}%`,
            khangTatCa: `+${stats.allResist}%`,
            thuCuoi:
              MOUNTS.find((m) => m.id === player.activeMountId)?.name ?? 'Chưa có',
            huyenHoaThuCuoi: player.activeMountIllusionId
              ? `${
                  MOUNT_ILLUSIONS.find((x) => x.id === player.activeMountIllusionId)?.name ?? ''
                } (${player.mountIllusions?.[player.activeMountIllusionId] || 1}★)`
              : 'Chưa kích hoạt',
            quanHam: mantle.name,
            bangHoi: guild?.name ?? 'Chưa gia nhập',
            hangLoiDai: player.arenaRank,
            bac: player.silver,
            daCuongHoa: player.enhanceStones,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdvisorError(data.error || 'Không thể kết nối Bách Hiểu Sinh.');
      } else {
        setAdvisorReply(data.answer);
        setAdvisorModelUsed(data.model);
      }
    } catch {
      setAdvisorError('Lỗi kết nối tới máy chủ. Vui lòng thử lại.');
    } finally {
      setAdvisorLoading(false);
    }
  };

  const generateArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artPrompt.trim() || artLoading) return;
    setArtLoading(true);
    setArtError(null);

    try {
      const res = await fetch('/api/gemini/generate-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: artPrompt.trim(),
          aspectRatio,
          imageSize,
          modelChoice: imageModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setArtError(data.error || 'Không thể vẽ bức họa lúc này.');
      } else {
        setGeneratedImage(data.imageUrl);
      }
    } catch {
      setArtError('Lỗi kết nối máy chủ khi tạo ảnh.');
    } finally {
      setArtLoading(false);
    }
  };

  const quickQuestions = [
    'Phân tích chỉ số hiện tại của ta và gợi ý cách tăng Lực Chiến nhanh nhất.',
    `Phái ${sect.name} nên ưu tiên đánh đối thủ nào trên Lôi Đài để tận dụng Ngũ Hành?`,
    'Chiến thuật công phá Cổng Thành và chiếm Long Trụ Biện Kinh hiệu quả nhất?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="kt-window flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden text-[#F4E8CD]">
        <div className="kt-titlebar flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-[#F7DA85]" />
            <h2 className="font-wuxia text-2xl font-bold text-[#F7DA85]">
              Bách Hiểu Sinh &amp; Tàng Kinh Họa Các
            </h2>
          </div>
          <button
            onClick={onClose}
            className="kt-btn-bronze p-1.5 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-[#5B4323] bg-[#16100B] px-5 py-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTab('advisor')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'advisor' ? 'kt-btn-crimson' : 'kt-btn-bronze'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Bách Hiểu Sinh (Cố Vấn Võ Học)</span>
            </button>
            <button
              onClick={() => setTab('studio')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'studio' ? 'kt-btn-crimson' : 'kt-btn-bronze'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Tàng Kinh Họa Các (Vẽ Chân Dung 1K–4K)</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'advisor' ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#34271B] bg-[#18130F] px-4 py-3 text-xs">
                <span className="text-[#C7B89E]">
                  Chọn cảnh giới suy luận của Bách Hiểu Sinh:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'fast', label: 'Phản hồi nhanh (Flash Lite)' },
                    { id: 'general', label: 'Toàn diện (Hydrogen)' },
                    { id: 'tactical', label: 'Chiến thuật (Neon)' },
                    { id: 'deep', label: 'Chuyên sâu (Carbon)' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setAdvisorMode(m.id as 'fast' | 'general' | 'tactical' | 'deep')}
                      className={`rounded px-2.5 py-1 text-xs cursor-pointer whitespace-nowrap ${
                        advisorMode === m.id
                          ? 'bg-[#6B4A1E] text-[#FEF3C7]'
                          : 'bg-[#120E0B] text-[#A89B86] hover:text-[#FEF3C7]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setQuestion(q);
                      askAdvisor(q);
                    }}
                    className="rounded border border-[#3C2D1F] bg-[#19130F] px-3 py-2 text-left text-xs text-[#DFD3BE] hover:border-[#D4AF37] hover:text-[#F5D061] cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  askAdvisor();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Hỏi Bách Hiểu Sinh về build trang bị, Ngũ Hành, Phó Bản hoặc Công Thành..."
                  className="flex-1 rounded border border-[#443322] bg-[#0F0B09] px-3.5 py-2.5 text-sm text-[#FEF3C7] placeholder-[#6E604E] focus:border-[#D4AF37] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={advisorLoading || !question.trim()}
                  className="flex items-center gap-2 rounded bg-[#8F1D1D] px-5 py-2.5 text-xs font-semibold text-[#FEF3C7] hover:bg-[#A62121] disabled:opacity-45 cursor-pointer whitespace-nowrap"
                >
                  {advisorLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span>Thỉnh Giáo</span>
                </button>
              </form>

              {advisorError && (
                <div className="rounded border border-[#7F1D1D] bg-[#291212] p-4 text-xs text-[#FCA5A5]">
                  {advisorError}
                </div>
              )}

              {advisorReply && (
                <div className="rounded border border-[#5B4528] bg-[#1A140F] p-5">
                  <div className="mb-2 flex items-center justify-between text-xs text-[#C9A86A]">
                    <span>Lời Khuyên Từ Bách Hiểu Sinh</span>
                    {advisorModelUsed && <span className="font-mono">{advisorModelUsed}</span>}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#F3EAD8]">
                    {advisorReply}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <form onSubmit={generateArtwork} className="space-y-4 lg:col-span-6">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#C9A86A]">
                    Mô Tả Bức Họa Kiếm Hiệp (Chân dung / Thần Binh / Danh Sơn)
                  </label>
                  <textarea
                    rows={3}
                    value={artPrompt}
                    onChange={(e) => setArtPrompt(e.target.value)}
                    className="w-full rounded border border-[#443322] bg-[#0F0B09] p-3 text-sm text-[#FEF3C7] focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                {/* Image Resolution 1K / 2K / 4K */}
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-[#C9A86A]">
                    Độ Phân Giải (Image Size)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {IMAGE_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setImageSize(sz)}
                        className={`rounded border py-2 font-mono text-xs font-semibold cursor-pointer ${
                          imageSize === sz
                            ? 'border-[#D4AF37] bg-[#2C1F10] text-[#F5D061]'
                            : 'border-[#33251A] bg-[#16110E] text-[#B5A68E]'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio selector (all 8 required ratios) */}
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-[#C9A86A]">
                    Tỷ Lệ Khung Hình (Aspect Ratio)
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAspectRatio(ratio)}
                        className={`rounded border py-1.5 font-mono text-xs cursor-pointer ${
                          aspectRatio === ratio
                            ? 'border-[#D4AF37] bg-[#2C1F10] text-[#F5D061]'
                            : 'border-[#33251A] bg-[#16110E] text-[#B5A68E]'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model choice */}
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-[#C9A86A]">
                    Họa Sĩ (Model)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImageModel('gemini-3-pro-image-preview')}
                      className={`rounded border px-3 py-2 text-xs cursor-pointer ${
                        imageModel === 'gemini-3-pro-image-preview'
                          ? 'border-[#D4AF37] bg-[#2C1F10] text-[#F5D061]'
                          : 'border-[#33251A] bg-[#16110E] text-[#B5A68E]'
                      }`}
                    >
                      Pro Studio (gemini-3-pro-image-preview)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageModel('gemini-nano-banana-2.1')}
                      className={`rounded border px-3 py-2 text-xs cursor-pointer ${
                        imageModel === 'gemini-nano-banana-2.1'
                          ? 'border-[#D4AF37] bg-[#2C1F10] text-[#F5D061]'
                          : 'border-[#33251A] bg-[#16110E] text-[#B5A68E]'
                      }`}
                    >
                      Đa Năng (gemini-nano-banana-2.1)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={artLoading || !artPrompt.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded border border-[#E5B95C]/80 bg-gradient-to-b from-[#991B1B] to-[#6B1212] py-3 text-xs font-semibold text-[#FEF3C7] hover:brightness-110 disabled:opacity-45 cursor-pointer"
                >
                  {artLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  <span>
                    {artLoading
                      ? 'Đang Khai Bút Vẽ Tranh...'
                      : `Khai Bút Tạo Tác (${imageSize} · ${aspectRatio})`}
                  </span>
                </button>

                {artError && (
                  <div className="rounded border border-[#7F1D1D] bg-[#291212] p-3 text-xs text-[#FCA5A5]">
                    {artError}
                  </div>
                )}
              </form>

              <div className="flex flex-col items-center justify-center rounded border border-[#3A2B1D] bg-[#16110E] p-4 lg:col-span-6">
                {generatedImage ? (
                  <div className="flex w-full flex-col items-center gap-3">
                    <img
                      src={generatedImage}
                      alt="Họa Phẩm Võ Lâm"
                      referrerPolicy="no-referrer"
                      className="max-h-72 w-auto rounded border border-[#6E4F28] object-contain"
                    />
                    <button
                      onClick={() => onApplyAvatar(generatedImage)}
                      className="flex items-center gap-2 rounded bg-[#2B5933] px-4 py-2 text-xs font-semibold text-[#DCFCE7] hover:brightness-110 cursor-pointer"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Đặt Làm Chân Dung Nhân Vật</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-xs text-[#8E806D]">
                    <ImageIcon className="mx-auto mb-2 h-8 w-8 text-[#5A4630]" />
                    <p>Họa phẩm kiếm hiệp chất lượng 1K / 2K / 4K sẽ hiển thị tại đây.</p>
                    <p className="mt-1">
                      Bạn có thể đặt làm ảnh đại diện nhân vật trực tiếp trên thanh thông tin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
