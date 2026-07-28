import type { Chip, Source } from '../types';

const TPU: Source = { label: 'TechPowerUp GPU Database', url: 'https://www.techpowerup.com/gpu-specs/' };

/** GPU BGA 封装物理尺寸普遍无公开数据 → 走"估算封装"示意模式 */
const GPU_PKG = { type: 'FCBGA', style: 'bga' as const, lengthMm: null, widthMm: null };

const die = (name: string, process: string, areaMm2: number, transistorsMillions: number) => [
  {
    name,
    role: 'graphics' as const,
    process,
    areaMm2,
    lengthMm: null,
    widthMm: null,
    transistorsMillions,
    note: 'TechPowerUp 收录面积；长宽无公开数据，示意图按正方形近似',
  },
];

/** 快速构造 NV 单 Die 显卡条目 */
function nv(
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
    brand: 'nvidia' as const,
    category: 'gpu' as const, formFactor: 'desktop' as const,
    model,
    codename,
    generation,
    process,
    release,
    package: { ...GPU_PKG },
    dies: die(dieName, process, areaMm2, transistorsMillions),
    transistorsMillions,
    notes,

    tdp: tdpVal,

    loadTempRange: tempVal,
    dataQuality: 'measured' as const,
    sources: [TPU],
  };
}

export const nvidiaGpus = [
  /* ===== GTX 10（Pascal, TSMC 16nm） ===== */
  nv('nvidia-geforce-gtx-1080-ti', 'GeForce GTX 1080 Ti', 'GP102 (Pascal)', 'GTX 10', 'TSMC 16nm FF', '2017-03',
    'GP102 Monolithic Die', 471, 11800, 'GP102 面积 471 mm²、118 亿晶体管（TechPowerUp）。', 250, '70-84°C'),
  nv('nvidia-geforce-gtx-1080', 'GeForce GTX 1080', 'GP104 (Pascal)', 'GTX 10', 'TSMC 16nm FF', '2016-05',
    'GP104 Monolithic Die', 314, 7200, 'GP104 面积 314 mm²、72 亿晶体管（TechPowerUp）。', 180, '65-82°C'),
  nv('nvidia-geforce-gtx-1070', 'GeForce GTX 1070', 'GP104 (Pascal)', 'GTX 10', 'TSMC 16nm FF', '2016-06',
    'GP104 Monolithic Die', 314, 7200, 'GP104 面积 314 mm²、72 亿晶体管（TechPowerUp）；GTX 1070 为部分屏蔽版本。', 150, '65-80°C'),
  nv('nvidia-geforce-gtx-1060-6gb', 'GeForce GTX 1060 6GB', 'GP106 (Pascal)', 'GTX 10', 'TSMC 16nm FF', '2016-07',
    'GP106 Monolithic Die', 200, 4400, 'GP106 面积 200 mm²、44 亿晶体管（TechPowerUp）。', 120, '60-75°C'),
  /* ===== GTX 16（Turing 小核心，无光追） ===== */
  nv('nvidia-geforce-gtx-1660-ti', 'GeForce GTX 1660 Ti', 'TU116 (Turing)', 'GTX 16', 'TSMC 12nm FFN', '2019-02',
    'TU116 Monolithic Die', 284, 6600, 'TU116 面积 284 mm²、66 亿晶体管（TechPowerUp）；不含 RT/Tensor Core 的 Turing。', 120, '60-75°C'),
  nv('nvidia-geforce-gtx-1660-super', 'GeForce GTX 1660 Super', 'TU116 (Turing)', 'GTX 16', 'TSMC 12nm FFN', '2019-10',
    'TU116 Monolithic Die', 284, 6600, 'TU116 面积 284 mm²、66 亿晶体管（TechPowerUp）。', 125, '60-75°C'),
  nv('nvidia-geforce-gtx-1650', 'GeForce GTX 1650', 'TU117 (Turing)', 'GTX 16', 'TSMC 12nm FFN', '2019-04',
    'TU117 Monolithic Die', 200, 4700, 'TU117 面积 200 mm²、47 亿晶体管（TechPowerUp）。', 75, '55-70°C'),
  /* ===== RTX 20（Turing, TSMC 12nm） ===== */
  nv('nvidia-geforce-rtx-2080-ti', 'GeForce RTX 2080 Ti', 'TU102 (Turing)', 'RTX 20', 'TSMC 12nm FFN', '2018-09',
    'TU102 Monolithic Die', 754, 18600, 'TU102 面积 754 mm²、186 亿晶体管（TechPowerUp）；曾是消费级最大 Die 之一。', 250, '70-84°C'),
  nv('nvidia-geforce-rtx-2080-super', 'GeForce RTX 2080 Super', 'TU104 (Turing)', 'RTX 20', 'TSMC 12nm FFN', '2019-07',
    'TU104 Monolithic Die', 545, 13600, 'TU104 面积 545 mm²、136 亿晶体管（TechPowerUp）。', 250, '70-84°C'),
  nv('nvidia-geforce-rtx-2080', 'GeForce RTX 2080', 'TU104 (Turing)', 'RTX 20', 'TSMC 12nm FFN', '2018-09',
    'TU104 Monolithic Die', 545, 13600, 'TU104 面积 545 mm²、136 亿晶体管（TechPowerUp）；RTX 2080 为部分屏蔽版本。', 215, '65-80°C'),
  nv('nvidia-geforce-rtx-2070-super', 'GeForce RTX 2070 Super', 'TU104 (Turing)', 'RTX 20', 'TSMC 12nm FFN', '2019-07',
    'TU104 Monolithic Die', 545, 13600, 'TU104 面积 545 mm²、136 亿晶体管（TechPowerUp）。', 215, '65-80°C'),
  nv('nvidia-geforce-rtx-2070', 'GeForce RTX 2070', 'TU106 (Turing)', 'RTX 20', 'TSMC 12nm FFN', '2018-10',
    'TU106 Monolithic Die', 445, 10800, 'TU106 面积 445 mm²、108 亿晶体管（TechPowerUp）。', 175, '65-80°C'),
  nv('nvidia-geforce-rtx-2060-super', 'GeForce RTX 2060 Super', 'TU106 (Turing)', 'RTX 20', 'TSMC 12nm FFN', '2019-07',
    'TU106 Monolithic Die', 445, 10800, 'TU106 面积 445 mm²、108 亿晶体管（TechPowerUp）。', 175, '65-80°C'),
  nv('nvidia-geforce-rtx-2060', 'GeForce RTX 2060', 'TU106 (Turing)', 'RTX 20', 'TSMC 12nm FFN', '2019-01',
    'TU106 Monolithic Die', 445, 10800, 'TU106 面积 445 mm²、108 亿晶体管（TechPowerUp）；RTX 2060 为部分屏蔽版本。', 160, '65-80°C'),
  /* ===== RTX 30（Ampere, Samsung 8nm） ===== */
  nv('nvidia-geforce-rtx-3090-ti', 'GeForce RTX 3090 Ti', 'GA102 (Ampere)', 'RTX 30', 'Samsung 8N (8nm)', '2022-03',
    'GA102 Monolithic Die', 628.4, 28300, 'GA102 面积 628.4 mm²、283 亿晶体管（TechPowerUp）；3090 Ti 为满血版。', 450, '72-83°C'),
  nv('nvidia-geforce-rtx-3090', 'GeForce RTX 3090', 'GA102 (Ampere)', 'RTX 30', 'Samsung 8N (8nm)', '2020-09',
    'GA102 Monolithic Die', 628.4, 28300, 'GA102 面积 628.4 mm²、283 亿晶体管（TechPowerUp）。', 350, '72-83°C'),
  nv('nvidia-geforce-rtx-3080-ti', 'GeForce RTX 3080 Ti', 'GA102 (Ampere)', 'RTX 30', 'Samsung 8N (8nm)', '2021-06',
    'GA102 Monolithic Die', 628.4, 28300, 'GA102 面积 628.4 mm²、283 亿晶体管（TechPowerUp）。', 350, '72-83°C'),
  nv('nvidia-geforce-rtx-3080', 'GeForce RTX 3080', 'GA102 (Ampere)', 'RTX 30', 'Samsung 8N (8nm)', '2020-09',
    'GA102 Monolithic Die', 628.4, 28300, 'GA102 面积 628.4 mm²、283 亿晶体管（TechPowerUp）；RTX 3080 为部分屏蔽版本。', 320, '72-83°C'),
  nv('nvidia-geforce-rtx-3070-ti', 'GeForce RTX 3070 Ti', 'GA104 (Ampere)', 'RTX 30', 'Samsung 8N (8nm)', '2021-06',
    'GA104 Monolithic Die', 392.5, 17400, 'GA104 面积 392.5 mm²、174 亿晶体管（TechPowerUp）。', 290, '70-83°C'),
  nv('nvidia-geforce-rtx-3070', 'GeForce RTX 3070', 'GA104 (Ampere)', 'RTX 30', 'Samsung 8N (8nm)', '2020-10',
    'GA104 Monolithic Die', 392.5, 17400, 'GA104 面积 392.5 mm²、174 亿晶体管（TechPowerUp）；RTX 3070 为部分屏蔽版本。', 220, '70-83°C'),
  nv('nvidia-geforce-rtx-3060-ti', 'GeForce RTX 3060 Ti', 'GA104 (Ampere)', 'RTX 30', 'Samsung 8N (8nm)', '2020-12',
    'GA104 Monolithic Die', 392.5, 17400, 'GA104 面积 392.5 mm²、174 亿晶体管（TechPowerUp）。', 200, '65-80°C'),
  nv('nvidia-geforce-rtx-3060', 'GeForce RTX 3060 12GB', 'GA106 (Ampere)', 'RTX 30', 'Samsung 8N (8nm)', '2021-02',
    'GA106 Monolithic Die', 276, 13250, 'GA106 面积 276 mm²、132.5 亿晶体管（TechPowerUp）。', 170, '65-80°C'),
  nv('nvidia-geforce-rtx-3050', 'GeForce RTX 3050', 'GA107 (Ampere)', 'RTX 30', 'Samsung 8N (8nm)', '2022-01',
    'GA107 Monolithic Die', 200, 8700, 'GA107 面积约 200 mm²、87 亿晶体管（TechPowerUp）。', 130, '60-73°C'),
  /* ===== RTX 40（Ada Lovelace, TSMC 4N） ===== */
  nv('nvidia-geforce-rtx-4090', 'GeForce RTX 4090', 'AD102 (Ada Lovelace)', 'RTX 40', 'TSMC 4N (5nm 级)', '2022-10',
    'AD102 Monolithic Die', 608.4, 76300, 'AD102 面积 608.4 mm²、763 亿晶体管（TechPowerUp）。', 450, '70-80°C'),
  nv('nvidia-geforce-rtx-4080-super', 'GeForce RTX 4080 Super', 'AD103 (Ada Lovelace)', 'RTX 40', 'TSMC 4N (5nm 级)', '2024-01',
    'AD103 Monolithic Die', 378.6, 45900, 'AD103 面积 378.6 mm²、459 亿晶体管（TechPowerUp）。', 320, '70-80°C'),
  nv('nvidia-geforce-rtx-4080', 'GeForce RTX 4080', 'AD103 (Ada Lovelace)', 'RTX 40', 'TSMC 4N (5nm 级)', '2022-11',
    'AD103 Monolithic Die', 378.6, 45900, 'AD103 面积 378.6 mm²、459 亿晶体管（TechPowerUp）；RTX 4080 为部分屏蔽版本。', 320, '70-80°C'),
  nv('nvidia-geforce-rtx-4070-ti-super', 'GeForce RTX 4070 Ti Super', 'AD103 (Ada Lovelace)', 'RTX 40', 'TSMC 4N (5nm 级)', '2024-01',
    'AD103 Monolithic Die', 378.6, 45900, 'AD103 面积 378.6 mm²、459 亿晶体管（TechPowerUp）。', 285, '70-80°C'),
  nv('nvidia-geforce-rtx-4070-ti', 'GeForce RTX 4070 Ti', 'AD104 (Ada Lovelace)', 'RTX 40', 'TSMC 4N (5nm 级)', '2023-01',
    'AD104 Monolithic Die', 294.5, 35800, 'AD104 面积 294.5 mm²、358 亿晶体管（TechPowerUp）；4070 Ti 为满血 AD104。', 285, '70-80°C'),
  nv('nvidia-geforce-rtx-4070-super', 'GeForce RTX 4070 Super', 'AD104 (Ada Lovelace)', 'RTX 40', 'TSMC 4N (5nm 级)', '2024-01',
    'AD104 Monolithic Die', 294.5, 35800, 'AD104 面积 294.5 mm²、358 亿晶体管（TechPowerUp）。', 220, '65-78°C'),
  nv('nvidia-geforce-rtx-4070', 'GeForce RTX 4070', 'AD104 (Ada Lovelace)', 'RTX 40', 'TSMC 4N (5nm 级)', '2023-04',
    'AD104 Monolithic Die', 294.5, 35800, 'AD104 面积 294.5 mm²、358 亿晶体管（TechPowerUp）；RTX 4070 为部分屏蔽版本。', 200, '65-75°C'),
  nv('nvidia-geforce-rtx-4060-ti', 'GeForce RTX 4060 Ti', 'AD106 (Ada Lovelace)', 'RTX 40', 'TSMC 4N (5nm 级)', '2023-05',
    'AD106 Monolithic Die', 187.8, 22900, 'AD106 面积 187.8 mm²、229 亿晶体管（TechPowerUp）。', 160, '65-75°C'),
  nv('nvidia-geforce-rtx-4060', 'GeForce RTX 4060', 'AD107 (Ada Lovelace)', 'RTX 40', 'TSMC 4N (5nm 级)', '2023-06',
    'AD107 Monolithic Die', 158.7, 18900, 'AD107 面积 158.7 mm²、189 亿晶体管（TechPowerUp）。', 115, '60-73°C'),
  /* ===== RTX 50（Blackwell, TSMC 4NP） ===== */
  nv('nvidia-geforce-rtx-5090', 'GeForce RTX 5090', 'GB202 (Blackwell)', 'RTX 50', 'TSMC 4NP (5nm 级)', '2025-01',
    'GB202 Monolithic Die', 761.56, 92200, 'GB202 面积约 761.56 mm²、922 亿晶体管（TechPowerUp）；单片设计，消费级 Blackwell 未采用双 Die。', 575, '72-82°C'),
  nv('nvidia-geforce-rtx-5080', 'GeForce RTX 5080', 'GB203 (Blackwell)', 'RTX 50', 'TSMC 4NP (5nm 级)', '2025-01',
    'GB203 Monolithic Die', 378, 45600, 'GB203 面积 378 mm²、456 亿晶体管（TechPowerUp）；RTX 5080 为满血 GB203。', 360, '70-80°C'),
  nv('nvidia-geforce-rtx-5070-ti', 'GeForce RTX 5070 Ti', 'GB203 (Blackwell)', 'RTX 50', 'TSMC 4NP (5nm 级)', '2025-02',
    'GB203 Monolithic Die', 378, 45600, 'GB203 面积 378 mm²、456 亿晶体管（TechPowerUp）；5070 Ti 为部分屏蔽版本。', 300, '68-78°C'),
  nv('nvidia-geforce-rtx-5070', 'GeForce RTX 5070', 'GB205 (Blackwell)', 'RTX 50', 'TSMC 4NP (5nm 级)', '2025-03',
    'GB205 Monolithic Die', 263, 31100, 'GB205 面积 263 mm²、311 亿晶体管（TechPowerUp）。', 250, '65-75°C'),
  nv('nvidia-geforce-rtx-5060-ti', 'GeForce RTX 5060 Ti', 'GB206 (Blackwell)', 'RTX 50', 'TSMC 4NP (5nm 级)', '2025-04',
    'GB206 Monolithic Die', 181, 21900, 'GB206 面积 181 mm²、219 亿晶体管（TechPowerUp）。', 180, '65-75°C'),
  nv('nvidia-geforce-rtx-5060', 'GeForce RTX 5060', 'GB206 (Blackwell)', 'RTX 50', 'TSMC 4NP (5nm 级)', '2025-05',
    'GB206 Monolithic Die', 181, 21900, 'GB206 面积 181 mm²、219 亿晶体管（TechPowerUp）；RTX 5060 为部分屏蔽版本。', 150, '60-73°C'),
] satisfies Chip[];
