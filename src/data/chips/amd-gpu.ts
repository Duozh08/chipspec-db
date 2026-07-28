import type { Chip, Source } from '../types';

const TPU: Source = { label: 'TechPowerUp GPU Database', url: 'https://www.techpowerup.com/gpu-specs/' };
const AMD_RADEON: Source = { label: 'AMD Radeon 官方规格', url: 'https://www.amd.com/en/products/graphics.html' };

/** GPU BGA 封装物理尺寸普遍无公开数据 → 走"估算封装"示意模式 */
const GPU_PKG = { type: 'FCBGA', style: 'bga' as const, lengthMm: null, widthMm: null };

/** 单 Die A卡快速构造 */
function amdMono(
  id: string,
  model: string,
  codename: string,
  generation: string,
  process: string,
  release: string,
  dieName: string,
  areaMm2: number,
  transistorsMillions: number,
  notes: string,
  tdpVal: number | null = null,
  tempVal: string | null = null,
) {
  return {
    id,
    brand: 'amd' as const,
    category: 'gpu' as const, formFactor: 'desktop' as const,
    model,
    codename,
    generation,
    process,
    release,
    package: { ...GPU_PKG },
    dies: [
      {
        name: dieName,
        role: 'graphics' as const,
        process,
        areaMm2,
        lengthMm: null,
        widthMm: null,
        transistorsMillions,
        note: 'TechPowerUp 收录面积；长宽无公开数据，示意图按正方形近似',
      },
    ],
    transistorsMillions,
    notes,

    tdp: tdpVal,

    loadTempRange: tempVal,
    dataQuality: 'measured' as const,
    sources: [TPU, AMD_RADEON],
  };
}

/** Navi 3x MCD（缓存 Die，Navi 31/32 通用设计） */
const MCD = (name: string, layout: { x: number; y: number }) => ({
  name,
  role: 'cache' as const,
  process: 'TSMC N6',
  areaMm2: 37,
  lengthMm: null,
  widthMm: null,
  transistorsMillions: 2050,
  layout,
  note: 'TechPowerUp：MCD 单颗约 37 mm² / 20.5 亿晶体管',
});

const MCD_POSITIONS_6 = [
  { x: 0.12, y: 0.24 }, { x: 0.12, y: 0.5 }, { x: 0.12, y: 0.76 },
  { x: 0.88, y: 0.24 }, { x: 0.88, y: 0.5 }, { x: 0.88, y: 0.76 },
];
const MCD_POSITIONS_5 = [
  { x: 0.13, y: 0.24 }, { x: 0.13, y: 0.5 }, { x: 0.13, y: 0.76 },
  { x: 0.87, y: 0.33 }, { x: 0.87, y: 0.67 },
];
const MCD_POSITIONS_4 = [
  { x: 0.14, y: 0.3 }, { x: 0.14, y: 0.7 }, { x: 0.86, y: 0.3 }, { x: 0.86, y: 0.7 },
];
const MCD_POSITIONS_3 = [{ x: 0.14, y: 0.3 }, { x: 0.14, y: 0.7 }, { x: 0.86, y: 0.5 }];

const NAVI31_GCD = {
  name: 'GCD（图形计算 Die）',
  role: 'graphics' as const,
  process: 'TSMC N5',
  areaMm2: 300,
  lengthMm: null,
  widthMm: null,
  transistorsMillions: 45400,
  layout: { x: 0.5, y: 0.5 },
  note: 'TechPowerUp：GCD 约 300 mm² / 454 亿晶体管',
};
const NAVI32_GCD = {
  name: 'GCD（图形计算 Die）',
  role: 'graphics' as const,
  process: 'TSMC N5',
  areaMm2: 200,
  lengthMm: null,
  widthMm: null,
  transistorsMillions: null,
  layout: { x: 0.5, y: 0.5 },
  note: 'TechPowerUp：GCD 约 200 mm²；晶体管含于整芯片 281 亿总数',
};

export const amdGpus = [
  /* ===== RX 5000（RDNA, TSMC N7） ===== */
  amdMono('amd-radeon-rx-5700-xt', 'Radeon RX 5700 XT', 'Navi 10 (RDNA)', 'RX 5000', 'TSMC N7 (7nm)', '2019-07',
    'Navi 10 Monolithic Die', 251, 10300, 'Navi 10 面积 251 mm²、103 亿晶体管（TechPowerUp）；RDNA 首代产品。', 225, '75-90°C'),
  amdMono('amd-radeon-rx-5600-xt', 'Radeon RX 5600 XT', 'Navi 10 (RDNA)', 'RX 5000', 'TSMC N7 (7nm)', '2020-01',
    'Navi 10 Monolithic Die', 251, 10300, 'Navi 10 面积 251 mm²、103 亿晶体管（TechPowerUp）；5600 XT 为部分屏蔽版本。', 150, '65-80°C'),
  amdMono('amd-radeon-rx-5500-xt', 'Radeon RX 5500 XT', 'Navi 14 (RDNA)', 'RX 5000', 'TSMC N7 (7nm)', '2019-12',
    'Navi 14 Monolithic Die', 158, 6400, 'Navi 14 面积 158 mm²、64 亿晶体管（TechPowerUp）。', 130, '65-80°C'),
  /* ===== RX 6000（RDNA 2, TSMC N7/N6） ===== */
  amdMono('amd-radeon-rx-6950-xt', 'Radeon RX 6950 XT', 'Navi 21 (RDNA 2)', 'RX 6000', 'TSMC N7 (7nm)', '2022-05',
    'Navi 21 Monolithic Die', 520, 26800, 'Navi 21 面积约 520 mm²、268 亿晶体管（TechPowerUp）。', 335, '75-90°C'),
  amdMono('amd-radeon-rx-6900-xt', 'Radeon RX 6900 XT', 'Navi 21 (RDNA 2)', 'RX 6000', 'TSMC N7 (7nm)', '2020-12',
    'Navi 21 Monolithic Die', 520, 26800, 'Navi 21 面积约 520 mm²、268 亿晶体管（TechPowerUp）。', 300, '75-90°C'),
  amdMono('amd-radeon-rx-6800-xt', 'Radeon RX 6800 XT', 'Navi 21 (RDNA 2)', 'RX 6000', 'TSMC N7 (7nm)', '2020-11',
    'Navi 21 Monolithic Die', 520, 26800, 'Navi 21 面积约 520 mm²、268 亿晶体管（TechPowerUp）；RDNA 2 旗舰大核心，单片设计。', 300, '75-90°C'),
  amdMono('amd-radeon-rx-6800', 'Radeon RX 6800', 'Navi 21 (RDNA 2)', 'RX 6000', 'TSMC N7 (7nm)', '2020-11',
    'Navi 21 Monolithic Die', 520, 26800, 'Navi 21 面积约 520 mm²、268 亿晶体管（TechPowerUp）；6800 为部分屏蔽版本。', 250, '70-85°C'),
  amdMono('amd-radeon-rx-6750-xt', 'Radeon RX 6750 XT', 'Navi 22 (RDNA 2)', 'RX 6000', 'TSMC N7 (7nm)', '2022-05',
    'Navi 22 Monolithic Die', 336, 17200, 'Navi 22 面积约 336 mm²、172 亿晶体管（TechPowerUp）。', 250, '70-85°C'),
  amdMono('amd-radeon-rx-6700-xt', 'Radeon RX 6700 XT', 'Navi 22 (RDNA 2)', 'RX 6000', 'TSMC N7 (7nm)', '2021-03',
    'Navi 22 Monolithic Die', 336, 17200, 'Navi 22 面积约 336 mm²、172 亿晶体管（TechPowerUp）。', 230, '70-85°C'),
  amdMono('amd-radeon-rx-6650-xt', 'Radeon RX 6650 XT', 'Navi 23 (RDNA 2)', 'RX 6000', 'TSMC N7 (7nm)', '2022-05',
    'Navi 23 Monolithic Die', 237, 11060, 'Navi 23 面积 237 mm²、110.6 亿晶体管（TechPowerUp）。', 180, '65-80°C'),
  amdMono('amd-radeon-rx-6600-xt', 'Radeon RX 6600 XT', 'Navi 23 (RDNA 2)', 'RX 6000', 'TSMC N7 (7nm)', '2021-08',
    'Navi 23 Monolithic Die', 237, 11060, 'Navi 23 面积 237 mm²、110.6 亿晶体管（TechPowerUp）。', 160, '65-80°C'),
  amdMono('amd-radeon-rx-6500-xt', 'Radeon RX 6500 XT', 'Navi 24 (RDNA 2)', 'RX 6000', 'TSMC N6 (6nm)', '2022-01',
    'Navi 24 Monolithic Die', 107, 5400, 'Navi 24 面积 107 mm²、54 亿晶体管（TechPowerUp）。', 107, '55-70°C'),
  amdMono('amd-radeon-rx-6400', 'Radeon RX 6400', 'Navi 24 (RDNA 2)', 'RX 6000', 'TSMC N6 (6nm)', '2022-01',
    'Navi 24 Monolithic Die', 107, 5400, 'Navi 24 面积 107 mm²、54 亿晶体管（TechPowerUp）；6400 为部分屏蔽版本。', 53, '50-65°C'),
  /* ===== RX 7000（RDNA 3, Chiplet） ===== */
  {
    id: 'amd-radeon-rx-7900-xtx',
    brand: 'amd', category: 'gpu', formFactor: 'desktop' as const,
    model: 'Radeon RX 7900 XTX',
    codename: 'Navi 31 (RDNA 3)',
    generation: 'RX 7000',
    process: 'TSMC N5（GCD）+ N6（MCD）',
    release: '2022-12',
    package: { ...GPU_PKG },
    dies: [
      { ...NAVI31_GCD },
      ...MCD_POSITIONS_6.map((pos, i) => MCD(`MCD${i}`, pos)),
    ],
    transistorsMillions: 57700,
    notes: '全球首款 Chiplet 游戏 GPU：1 颗 GCD + 6 颗 MCD（Infinity Cache + 显存控制器），合计约 577 亿晶体管。',
    tdp: 355,
    loadTempRange: '75-89°C',
    dataQuality: 'measured',
    sources: [TPU, AMD_RADEON],
  },
  {
    id: 'amd-radeon-rx-7900-xt',
    brand: 'amd', category: 'gpu', formFactor: 'desktop' as const,
    model: 'Radeon RX 7900 XT',
    codename: 'Navi 31 (RDNA 3)',
    generation: 'RX 7000',
    process: 'TSMC N5（GCD）+ N6（MCD）',
    release: '2022-12',
    package: { ...GPU_PKG },
    dies: [
      { ...NAVI31_GCD, name: 'GCD（图形计算 Die，部分屏蔽）' },
      ...MCD_POSITIONS_5.map((pos, i) => MCD(`MCD${i}`, pos)),
    ],
    transistorsMillions: 57700,
    notes: 'GCD 部分 CU 屏蔽；320-bit 显存总线对应 5 颗启用 MCD（第 6 个 MCD 位置为占位/屏蔽 Die，未在此画出）。',
    tdp: 315,
    loadTempRange: '72-85°C',
    dataQuality: 'measured',
    sources: [TPU, AMD_RADEON],
  },
  {
    id: 'amd-radeon-rx-7900-gre',
    brand: 'amd', category: 'gpu', formFactor: 'desktop' as const,
    model: 'Radeon RX 7900 GRE',
    codename: 'Navi 31 (RDNA 3)',
    generation: 'RX 7000',
    process: 'TSMC N5（GCD）+ N6（MCD）',
    release: '2023-07',
    package: { ...GPU_PKG },
    dies: [
      { ...NAVI31_GCD, name: 'GCD（图形计算 Die，部分屏蔽）' },
      ...MCD_POSITIONS_4.map((pos, i) => MCD(`MCD${i}`, pos)),
    ],
    transistorsMillions: 57700,
    notes: '256-bit 显存总线按 4 颗启用 MCD 绘制（推算值）；该型号最初面向中国市场，后全球发售。',
    tdp: 260,
    loadTempRange: '68-80°C',
    dataQuality: 'measured',
    sources: [TPU, AMD_RADEON],
  },
  {
    id: 'amd-radeon-rx-7800-xt',
    brand: 'amd', category: 'gpu', formFactor: 'desktop' as const,
    model: 'Radeon RX 7800 XT',
    codename: 'Navi 32 (RDNA 3)',
    generation: 'RX 7000',
    process: 'TSMC N5（GCD）+ N6（MCD）',
    release: '2023-09',
    package: { ...GPU_PKG },
    dies: [
      { ...NAVI32_GCD },
      ...MCD_POSITIONS_4.map((pos, i) => MCD(`MCD${i}`, pos)),
    ],
    transistorsMillions: 28100,
    notes: 'Navi 32：1 颗约 200 mm² GCD + 4 颗 MCD（与 Navi 31 相同的 MCD 设计），整芯片约 281 亿晶体管。',
    tdp: 263,
    loadTempRange: '68-80°C',
    dataQuality: 'measured',
    sources: [TPU, AMD_RADEON],
  },
  {
    id: 'amd-radeon-rx-7700-xt',
    brand: 'amd', category: 'gpu', formFactor: 'desktop' as const,
    model: 'Radeon RX 7700 XT',
    codename: 'Navi 32 (RDNA 3)',
    generation: 'RX 7000',
    process: 'TSMC N5（GCD）+ N6（MCD）',
    release: '2023-09',
    package: { ...GPU_PKG },
    dies: [
      { ...NAVI32_GCD, name: 'GCD（图形计算 Die，部分屏蔽）' },
      ...MCD_POSITIONS_3.map((pos, i) => MCD(`MCD${i}`, pos)),
    ],
    transistorsMillions: 28100,
    notes: '192-bit 显存总线按 3 颗启用 MCD 绘制（推算值，第 4 个 MCD 位置为占位/屏蔽）。',
    tdp: 245,
    loadTempRange: '68-80°C',
    dataQuality: 'measured',
    sources: [TPU, AMD_RADEON],
  },
  amdMono('amd-radeon-rx-7600-xt', 'Radeon RX 7600 XT', 'Navi 33 (RDNA 3)', 'RX 7000', 'TSMC N6 (6nm)', '2024-01',
    'Navi 33 Monolithic Die', 204, 13300, 'Navi 33 面积 204 mm²、133 亿晶体管（TechPowerUp）；RDNA 3 入门核心回归单片。', 190, '65-78°C'),
  amdMono('amd-radeon-rx-7600', 'Radeon RX 7600', 'Navi 33 (RDNA 3)', 'RX 7000', 'TSMC N6 (6nm)', '2023-05',
    'Navi 33 Monolithic Die', 204, 13300, 'Navi 33 面积 204 mm²、133 亿晶体管（TechPowerUp）。', 165, '60-75°C'),
  /* ===== RX 9000（RDNA 4） ===== */
  amdMono('amd-radeon-rx-9070-xt', 'Radeon RX 9070 XT', 'Navi 48 (RDNA 4)', 'RX 9000', 'TSMC N4P (4nm 级)', '2025-03',
    'Navi 48 Monolithic Die', 356.5, 53900, 'Navi 48 面积约 356.5 mm²、539 亿晶体管（TechPowerUp）；RDNA 4 回归单片设计。', null, null),
  amdMono('amd-radeon-rx-9070', 'Radeon RX 9070', 'Navi 48 (RDNA 4)', 'RX 9000', 'TSMC N4P (4nm 级)', '2025-03',
    'Navi 48 Monolithic Die', 356.5, 53900, 'Navi 48 面积约 356.5 mm²、539 亿晶体管（TechPowerUp）；9070 为部分屏蔽版本。', null, null),
  amdMono('amd-radeon-rx-9060-xt', 'Radeon RX 9060 XT', 'Navi 44 (RDNA 4)', 'RX 9000', 'TSMC N4P (4nm 级)', '2025-06',
    'Navi 44 Monolithic Die', 199, 29700, 'Navi 44 面积约 199 mm²、297 亿晶体管（TechPowerUp）。', 190, '65-78°C'),
] satisfies Chip[];
