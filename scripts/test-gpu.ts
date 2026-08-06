import { allChips } from '../src/data';
import { allLaptops } from '../src/data/laptops';
import type { Chip } from '../src/data/types';

function normModel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function matchGpu(query: string): Chip | undefined {
  const lower = query.toLowerCase();
  const m = lower.match(/(rtx\s*\d+)/) ?? lower.match(/(gtx\s*\d+)/) ?? lower.match(/(rx\s*\d+)/);
  if (!m) return undefined;
  const key = m[1].replace(/\s+/g, '');
  return allChips.find((c) => c.category === 'gpu' && c.formFactor === 'mobile' && normModel(c.model).includes(key));
}

// 提取所有不重复的 GPU 方案
const gpus = new Set<string>();
allLaptops.forEach((l) => l.gpuOptions.forEach((g) => gpus.add(g)));
const list = [...gpus];
let hit = 0;
const missed: string[] = [];
for (const g of list) {
  const r = matchGpu(g);
  if (r) hit += 1;
  else missed.push(g);
}
console.log(`共 ${list.length} 种 GPU 方案，匹配成功 ${hit}，失败 ${missed.length}`);
console.log('未匹配：', missed.join(' | '));
