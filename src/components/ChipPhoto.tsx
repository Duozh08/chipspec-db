import { useId } from 'react';
import type { Chip } from '../data/types';
import { totalDieArea } from '../data/types';

/**
 * 实物风格顶视图（非照片，纯 SVG 绘制）：
 * - CPU（LGA/PGA）：基板 + 金属散热顶盖（IHS）+ 刻字，还原真实 CPU 外观
 * - GPU（BGA）：深色基板 + 中央镜面裸 Die + 四周贴片电容，还原真实 GPU 核心外观
 * 尺寸比例与真实封装/Die 面积一致。
 */
export default function ChipPhoto({ chip, className }: { chip: Chip; className?: string }) {
  const uid = useId().replace(/[:]/g, '');
  if (chip.package.style === 'bga') return <GpuPhoto chip={chip} uid={uid} className={className} />;
  return <CpuPhoto chip={chip} uid={uid} className={className} />;
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
  // 估算封装边长 = Die 边长 + 两侧各 3mm 基板边距，与示意图口径一致
  const die = W * (dieSideMm / (dieSideMm + 6));
  const d0 = (W - die) / 2;
  const d1 = d0 + die;

  // Die 四周贴片电容（示意排布）
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

      {/* 深色基板 */}
      <rect x={3} y={3} width={W - 6} height={H - 6} rx={5} fill="#16261d" stroke="#0b1712" strokeWidth={2} />
      {/* 四角定位焊盘 */}
      {[
        [13, 13],
        [W - 13, 13],
        [13, H - 13],
        [W - 13, H - 13],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 3} y={y - 3} width={6} height={6} fill="#22392e" />
      ))}
      {/* 贴片电容 */}
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.2} fill={i % 3 === 0 ? '#8d969e' : '#b59a6a'} opacity={0.9} />
      ))}
      {/* 镜面裸 Die */}
      <rect x={d0} y={d0} width={die} height={die} rx={1.5} fill={`url(#gdie-${uid})`} stroke="#8f99a2" strokeWidth={1.5} />
      {/* 对角高光 */}
      <polygon points={`${d0},${d1} ${d0},${d0 + die * 0.45} ${d0 + die * 0.55},${d0}`} fill="#ffffff" opacity={0.28} />
      {/* Die 激光刻字 */}
      <text x={W / 2} y={H / 2 - 2} textAnchor="middle" fontSize={8.5} letterSpacing={1} fill="#8a949d">
        {chip.codename.toUpperCase()}
      </text>
      <text x={W / 2} y={H / 2 + 10} textAnchor="middle" fontSize={7.5} fill="#9aa3ab">
        {area} mm²
      </text>
    </svg>
  );
}
