import type { Chip, Source } from '../types';

const TPU: Source = { label: 'TechPowerUp GPU Database', url: 'https://www.techpowerup.com/gpu-specs/' };
const INTEL_ARC: Source = { label: 'Intel Arc 官方页面', url: 'https://www.intel.com/content/www/us/en/products/details/discrete-gpus/arc.html' };

const GPU_PKG = { type: 'FCBGA', style: 'bga' as const, lengthMm: null, widthMm: null };

function arc(
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
    brand: 'intel' as const,
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
    sources: [TPU, INTEL_ARC],
  };
}

export const intelGpus = [
  arc('intel-arc-a770', 'Arc A770', 'ACM-G10 (Alchemist)', 'Arc A', 'TSMC N6 (6nm)', '2022-10',
    'ACM-G10 Monolithic Die', 406, 21700, 'ACM-G10 面积约 406 mm²、217 亿晶体管；Intel 重返消费级独显的首款旗舰核心。', 225, '65-80°C'),
  arc('intel-arc-a750', 'Arc A750', 'ACM-G10 (Alchemist)', 'Arc A', 'TSMC N6 (6nm)', '2022-10',
    'ACM-G10 Monolithic Die', 406, 21700, 'ACM-G10 面积约 406 mm²、217 亿晶体管；A750 为部分屏蔽版本。', 225, '65-80°C'),
  arc('intel-arc-a580', 'Arc A580', 'ACM-G10 (Alchemist)', 'Arc A', 'TSMC N6 (6nm)', '2023-10',
    'ACM-G10 Monolithic Die', 406, 21700, 'ACM-G10 面积约 406 mm²、217 亿晶体管；A580 屏蔽更多 Xe 核心。', 185, '60-75°C'),
  arc('intel-arc-a380', 'Arc A380', 'ACM-G11 (Alchemist)', 'Arc A', 'TSMC N6 (6nm)', '2022-06',
    'ACM-G11 Monolithic Die', 103, 7200, 'ACM-G11 面积约 103 mm²、72 亿晶体管；入门级小核心。', 75, '50-65°C'),
  arc('intel-arc-a310', 'Arc A310', 'ACM-G11 (Alchemist)', 'Arc A', 'TSMC N6 (6nm)', '2022-10',
    'ACM-G11 Monolithic Die', 103, 7200, 'ACM-G11 面积约 103 mm²、72 亿晶体管；A310 为部分屏蔽版本。', 75, '50-65°C'),
  arc('intel-arc-b580', 'Arc B580', 'BMG-G21 (Battlemage)', 'Arc B', 'TSMC N5 (5nm 级)', '2024-12',
    'BMG-G21 Monolithic Die', 272, 19600, 'BMG-G21 面积约 272 mm²、196 亿晶体管；第二代 Arc（Battlemage）主力型号。', 190, '60-75°C'),
  arc('intel-arc-b570', 'Arc B570', 'BMG-G21 (Battlemage)', 'Arc B', 'TSMC N5 (5nm 级)', '2025-01',
    'BMG-G21 Monolithic Die', 272, 19600, 'BMG-G21 面积约 272 mm²、196 亿晶体管；B570 为部分屏蔽版本。', 150, '55-70°C'),
] satisfies Chip[];
