import type { Brand, Category, Chip } from './types';
import { intelCpus } from './chips/intel-cpu';
import { amdCpus } from './chips/amd-cpu';
import { intelGpus } from './chips/intel-gpu';
import { amdGpus } from './chips/amd-gpu';
import { nvidiaGpus } from './chips/nvidia-gpu';

import { mobileChips } from './chips/mobile-chips';

export const allChips: Chip[] = [...intelCpus, ...amdCpus, ...intelGpus, ...amdGpus, ...nvidiaGpus, ...mobileChips];

export function getChipById(id: string): Chip | undefined {
  return allChips.find((c) => c.id === id);
}

/** 按品牌+类别分组的代际列表（用于筛选器，保持数据文件中的出现顺序） */
export function generationsFor(brand: Brand | null, category: Category | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of allChips) {
    if (brand && c.brand !== brand) continue;
    if (category && c.category !== category) continue;
    if (!seen.has(c.generation)) {
      seen.add(c.generation);
      out.push(c.generation);
    }
  }
  return out;
}

export * from './types';
