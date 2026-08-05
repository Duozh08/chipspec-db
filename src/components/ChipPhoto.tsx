import { useId, useRef, useState } from 'react';
import type { Chip } from '../data/types';
import { totalDieArea } from '../data/types';

const PHOTO_STORAGE_KEY = 'chipspec-chip-photos';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function readPhoto(chipId: string): string | null {
  try {
    const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data[chipId] ?? null;
  } catch {
    return null;
  }
}

export function writePhoto(chipId: string, dataUrl: string | null) {
  try {
    const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (dataUrl) data[chipId] = dataUrl;
    else delete data[chipId];
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * 芯片实物风格顶视图（纯 SVG 绘制，非照片）：
 * - CPU（LGA/PGA）：基板 + 金属散热顶盖（IHS）+ 刻字
 * - GPU（BGA）：深色基板 + 中央镜面裸 Die + 四周贴片电容
 *
 * 支持通过 `photo` prop 传入已上传的图片 DataURL 覆盖默认示意图。
 */
export default function ChipPhoto({
  chip,
  className,
  photo,
}: {
  chip: Chip;
  className?: string;
  photo?: string | null;
}) {
  const uid = useId().replace(/[:]/g, '');

  if (photo) {
    return <img src={photo} alt={`${chip.model} 实物图`} className={className} />;
  }
  if (chip.package.style === 'bga') {
    return <GpuPhoto chip={chip} uid={uid} className={className} />;
  }
  return <CpuPhoto chip={chip} uid={uid} className={className} />;
}

/**
 * 独立的图片上传控制（编辑 + 删除按钮）。
 * 必须放在 Link 元素之外使用，避免点击触发页面跳转。
 */
export function ChipPhotoUpload({ chip, onChanged }: { chip: Chip; onChanged?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hasPhoto, setHasPhoto] = useState<boolean>(() => !!readPhoto(chip.id));
  const [error, setError] = useState('');

  const handleFile = (file: File) => {
    setError('');
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('仅支持 JPG / PNG / WebP 格式');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('图片大小不能超过 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      writePhoto(chip.id, reader.result as string);
      setHasPhoto(true);
      onChanged?.();
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    writePhoto(chip.id, null);
    setHasPhoto(false);
    if (fileRef.current) fileRef.current.value = '';
    onChanged?.();
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          title={hasPhoto ? '更换图片' : '上传图片'}
          onClick={() => fileRef.current?.click()}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow ring-1 ring-slate-200 transition hover:bg-blue-500 hover:text-white hover:ring-blue-500"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 2.5a1.8 1.8 0 0 1 2.5 2.5L5.5 13.5 2 14.5l1-3.5 8.5-8.5z" />
          </svg>
        </button>
        {hasPhoto && (
          <button
            type="button"
            title="删除图片"
            onClick={handleRemove}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-red-500 shadow ring-1 ring-slate-200 transition hover:bg-red-500 hover:text-white hover:ring-red-500"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.5 4.5h11M6.5 2.5h3M5 4.5l.6 9h4.8l.6-9M6.8 7v4M9.2 7v4" />
            </svg>
          </button>
        )}
      </div>
      {error && <div className="absolute bottom-8 right-1 text-[10px] font-medium text-red-500">{error}</div>}
    </>
  );
}

function CpuPhoto({ chip, uid, className }: { chip: Chip; uid: string; className?: string }) {
  const pkgL = chip.package.lengthMm ?? 40;
  const pkgW = chip.package.widthMm ?? 40;
  const W = 200;
  const H = Math.round((200 * pkgW) / pkgL);
  const ihsW = W * 0.84;
  const ihsH = H * 0.86;
  const ihsX = (W - ihsW) / 2;
  const ihsY = (H - ihsH) / 2;
  const brandText = chip.brand === 'intel' ? 'INTEL' : chip.brand === 'amd' ? 'AMD' : 'NVIDIA';
  const modelSize = chip.model.length > 15 ? 10.5 : chip.model.length > 11 ? 12 : 14;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${chip.model} 实物风格示意图`}
    >
      <defs>
        <linearGradient id={`sub-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9dfc5" />
          <stop offset="1" stopColor="#d5c8a4" />
        </linearGradient>
        <linearGradient id={`ihs-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2f4f6" />
          <stop offset="0.45" stopColor="#c9ced5" />
          <stop offset="0.75" stopColor="#a9b0b9" />
          <stop offset="1" stopColor="#dde1e6" />
        </linearGradient>
      </defs>

      {/* 基板 */}
      <rect x={1} y={1} width={W - 2} height={H - 2} rx={10} fill={`url(#sub-${uid})`} stroke="#b3a67f" strokeWidth={1.5} />
      {/* 防呆缺口 */}
      {[0.35, 0.65].map((f) => (
        <g key={f}>
          <circle cx={1} cy={H * f} r={5} fill="#f6f7f9" stroke="#b3a67f" strokeWidth={1} />
          <circle cx={W - 1} cy={H * f} r={5} fill="#f6f7f9" stroke="#b3a67f" strokeWidth={1} />
        </g>
      ))}
      {/* 顶盖外贴片元件 */}
      {Array.from({ length: 7 }).map((_, i) => (
        <circle key={i} cx={W / 2 - 36 + i * 12} cy={ihsY / 2 + 1} r={2} fill="#b3a67f" opacity={0.85} />
      ))}
      {/* 金属散热顶盖（IHS） */}
      <rect x={ihsX} y={ihsY} width={ihsW} height={ihsH} rx={8} fill={`url(#ihs-${uid})`} stroke="#969da6" strokeWidth={1.5} />
      <rect x={ihsX + 5} y={ihsY + 5} width={ihsW - 10} height={ihsH - 10} rx={5} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1} />
      {/* 顶盖刻字 */}
      <text x={W / 2} y={H / 2 - 20} textAnchor="middle" fontSize={10} letterSpacing={3} fill="#8a9199">
        {brandText}
      </text>
      <text x={W / 2} y={H / 2 + 3} textAnchor="middle" fontSize={modelSize} fontWeight={600} fill="#737a82">
        {chip.model}
      </text>
      <text x={W / 2} y={H / 2 + 21} textAnchor="middle" fontSize={8} letterSpacing={1.5} fill="#9aa1a9">
        {chip.codename.toUpperCase()}
      </text>
    </svg>
  );
}

function GpuPhoto({ chip, uid, className }: { chip: Chip; uid: string; className?: string }) {
  const W = 200;
  const H = 200;
  const area = totalDieArea(chip) ?? 100;
  const dieSideMm = Math.sqrt(area);
  const die = W * (dieSideMm / (dieSideMm + 6));
  const d0 = (W - die) / 2;
  const d1 = d0 + die;

  const dots: { x: number; y: number }[] = [];
  for (let x = d0 - 2; x <= d1 + 2; x += 8) {
    if (d0 - 12 > 6) dots.push({ x, y: d0 - 9 });
    if (d1 + 12 < W - 4) dots.push({ x, y: d1 + 9 });
  }
  for (let y = d0 + 6; y <= d1 - 6; y += 8) {
    if (d0 - 12 > 6) dots.push({ x: d0 - 9, y });
    if (d1 + 12 < W - 4) dots.push({ x: d1 + 9, y });
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${chip.model} 实物风格示意图`}
    >
      <defs>
        <linearGradient id={`gdie-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef1f4" />
          <stop offset="0.5" stopColor="#c3cbd3" />
          <stop offset="1" stopColor="#e6eaee" />
        </linearGradient>
      </defs>

      <rect x={3} y={3} width={W - 6} height={H - 6} rx={5} fill="#16261d" stroke="#0b1712" strokeWidth={2} />
      {[
        [13, 13],
        [W - 13, 13],
        [13, H - 13],
        [W - 13, H - 13],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 3} y={y - 3} width={6} height={6} fill="#22392e" />
      ))}
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.2} fill={i % 3 === 0 ? '#8d969e' : '#b59a6a'} opacity={0.9} />
      ))}
      <rect x={d0} y={d0} width={die} height={die} rx={1.5} fill={`url(#gdie-${uid})`} stroke="#8f99a2" strokeWidth={1.5} />
      <polygon points={`${d0},${d1} ${d0},${d0 + die * 0.45} ${d0 + die * 0.55},${d0}`} fill="#ffffff" opacity={0.28} />
      <text x={W / 2} y={H / 2 - 2} textAnchor="middle" fontSize={8.5} letterSpacing={1} fill="#8a949d">
        {chip.codename.toUpperCase()}
      </text>
      <text x={W / 2} y={H / 2 + 10} textAnchor="middle" fontSize={7.5} fill="#9aa3ab">
        {area} mm²
      </text>
    </svg>
  );
}
