/**
 * 本地自动收录库：点击「立即收录」后自动生成符合站内格式的数据条目，
 * 立即在芯片/游戏本列表显示（New 标记 24 小时），规格字段缺失部分为 null（显示"暂无数据"）。
 *
 * 自动信息获取：尝试从维基百科 API 拉取简介（best-effort，失败不阻塞）；
 * AI 深度补全（Die 尺寸/TDP 等）通过导出清单管道在数据更新时合并。
 */

import type { Brand, Chip } from '../data/types';
import type { Laptop, LaptopBrand } from '../data/types';
import { guessBrand } from './pendingStore';

const KEY = 'chipspec-local-catalog';
/** New 标记存活时长：24 小时 */
export const NEW_BADGE_MS = 24 * 60 * 60 * 1000;

export interface LocalCatalogItem {
  id: string;
  /** 型号名称（如 RTX 5070、拯救者Y9000P 2025） */
  name: string;
  category: 'chip' | 'laptop';
  /** 品牌猜测 */
  brand: string;
  /** 自动获取的简介（wiki best-effort） */
  desc: string;
  /** 补全状态：pending=AI 补全中 / filled=已补全 */
  status: 'pending' | 'filled';
  /** 后端 AI 补全的完整规格（CloudBase catalog.spec），未补全为 undefined */
  spec?: Record<string, unknown>;
  createdAt: string;
}

export function loadLocalCatalog(): LocalCatalogItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as LocalCatalogItem[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function save(items: LocalCatalogItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    // 同标签页内组件即时刷新（storage 事件只在跨标签页时触发）
    window.dispatchEvent(new Event('chipspec-local-catalog'));
  } catch {
    /* ignore */
  }
}

/** 是否为新收录（24 小时内显示 New 徽章） */
export function isNewItem(item: LocalCatalogItem): boolean {
  try {
    return Date.now() - new Date(item.createdAt).getTime() < NEW_BADGE_MS;
  } catch {
    return false;
  }
}

/** 自动信息获取：维基百科 REST API（best-effort，跨域失败/无条目时返回空串） */
async function fetchWikiSummary(name: string): Promise<string> {
  try {
    const title = encodeURIComponent(name);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const resp = await fetch(`https://zh.wikipedia.org/api/rest_v1/page/summary/${title}`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return '';
    const data = await resp.json();
    return typeof data?.extract === 'string' ? data.extract.slice(0, 200) : '';
  } catch {
    return '';
  }
}

/** 立即收录（全自动）：生成本地条目 + 尝试 wiki 获取简介 */
export async function addLocalCatalogItem(
  name: string,
  category: 'chip' | 'laptop',
  brand: string
): Promise<LocalCatalogItem> {
  const items = loadLocalCatalog();
  const existing = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  const desc = await fetchWikiSummary(name);
  const item: LocalCatalogItem = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    category,
    brand,
    desc,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  items.unshift(item);
  save(items);
  return item;
}

export function removeLocalCatalogItem(id: string) {
  save(loadLocalCatalog().filter((i) => i.id !== id));
}

export function updateLocalCatalogStatus(id: string, status: 'pending' | 'filled') {
  save(loadLocalCatalog().map((i) => (i.id === id ? { ...i, status } : i)));
}

/** 按名称（忽略大小写）更新补全状态，返回是否命中 */
export function saveLocalCatalogStatusByName(name: string, status: 'pending' | 'filled'): boolean {
  const items = loadLocalCatalog();
  let hit = false;
  const next = items.map((i) => {
    if (i.name.toLowerCase() === name.toLowerCase() && i.status !== status) {
      hit = true;
      return { ...i, status };
    }
    return i;
  });
  if (hit) save(next);
  return hit;
}

/** 按名称保存后端 AI 补全的完整规格（spec）并标记已补全，返回是否命中。
 *  这样本地收录的条目就能显示后端补全的处理器/显卡等硬件参数。 */
export function saveLocalCatalogFilled(name: string, spec: Record<string, unknown> | null, filledAt?: number): boolean {
  const items = loadLocalCatalog();
  let hit = false;
  const next = items.map((i) => {
    if (i.name.toLowerCase() === name.toLowerCase()) {
      hit = true;
      return { ...i, status: 'filled' as const, spec: spec ?? i.spec, filledAt };
    }
    return i;
  });
  if (hit) save(next);
  return hit;
}

/** 导出本地收录（与待补全清单合并供 AI 管道使用） */
export function localCatalogToRequests(): { name: string; category: 'chip' | 'laptop'; brand: string; note: string }[] {
  return loadLocalCatalog().map((i) => ({
    name: i.name,
    category: i.category,
    brand: i.brand,
    note: `自动收录 ${i.status === 'filled' ? '（已补全）' : '（AI 补全中）'}`,
  }));
}

/* ================================================================
 * 本地条目 → 站内数据视图（供列表页合并显示、详情页访问）
 * 规格字段缺失置空/null，release 用收录日期（保证新收录排最前）
 * ================================================================ */

/** 猜测 AI 收录芯片的类别（含显卡关键词 → gpu，否则 cpu） */
export function guessChipCategory(name: string): 'cpu' | 'gpu' {
  const s = name.toLowerCase();
  if (/rtx|gtx|rx\s?\d{3,}|geforce|radeon|udna|arc\s?b?\d{3}/.test(s)) return 'gpu';
  return 'cpu';
}

function guessChipBrand(name: string): Brand {
  const n = name.toLowerCase();
  if (/intel|酷睿|core|ultra|arc/i.test(n)) return 'intel';
  if (/amd|锐龙|ryzen|radeon/i.test(n)) return 'amd';
  if (/nvidia|rtx|gtx|geforce|ti\b/i.test(n)) return 'nvidia';
  return 'intel';
}

const LAPTOP_BRAND_KEYS: LaptopBrand[] = [
  'lenovo', 'asus', 'hp', 'dell', 'acer', 'msi', 'razer', 'colorful',
  'mechrevo', 'hasee', 'xiaomi', 'honor', 'gigabyte', 'huawei', 'machenike', 'thunderobot',
];

function toLaptopBrand(item: LocalCatalogItem): LaptopBrand {
  if (LAPTOP_BRAND_KEYS.includes(item.brand as LaptopBrand)) return item.brand as LaptopBrand;
  const gb = guessBrand(item.name);
  if (LAPTOP_BRAND_KEYS.includes(gb as LaptopBrand)) return gb as LaptopBrand;
  return 'lenovo';
}

/** 本地收录条目 → 芯片视图对象（优先使用后端 AI 补全的 spec，缺失字段置空） */
export function localItemToChip(item: LocalCatalogItem): Chip {
  const s = (item.spec ?? {}) as Record<string, unknown>;
  const brand: Brand =
    s.brand === 'intel' || s.brand === 'amd' || s.brand === 'nvidia'
      ? (s.brand as Brand)
      : item.brand === 'intel' || item.brand === 'amd' || item.brand === 'nvidia'
        ? (item.brand as Brand)
        : guessChipBrand(item.name);
  const category: 'cpu' | 'gpu' =
    s.category === 'gpu' || s.category === 'cpu'
      ? (s.category as 'cpu' | 'gpu')
      : guessChipCategory(item.name);
  const formFactor: 'desktop' | 'mobile' = s.formFactor === 'desktop' ? 'desktop' : 'mobile';
  const release = typeof s.release === 'string' && s.release ? s.release : item.createdAt.slice(0, 10);
  const pkg = (typeof s.package === 'object' && s.package !== null ? s.package : {}) as Record<string, unknown>;
  return {
    id: item.id,
    brand,
    category,
    formFactor,
    model: typeof s.model === 'string' && s.model ? s.model : item.name,
    codename: typeof s.codename === 'string' && s.codename ? s.codename : 'AI 自动收录',
    generation: typeof s.generation === 'string' ? s.generation : '',
    process: typeof s.process === 'string' ? s.process : '',
    release,
    package: {
      type: typeof pkg.type === 'string' ? (pkg.type as string) : '',
      style: pkg.style === 'lga' ? 'lga' : 'bga',
      lengthMm: null,
      widthMm: null,
    },
    dies: Array.isArray(s.dies) ? (s.dies as Chip['dies']) : [],
    transistorsMillions: typeof s.transistorsMillions === 'number' ? s.transistorsMillions : null,
    notes: item.desc
      ? `AI 自动收录（${item.status === 'filled' ? '已补全' : 'AI 补全中'}）· ${item.desc}`
      : `AI 自动收录（${item.status === 'filled' ? '已补全' : 'AI 补全中'}）`,
    tdp: typeof s.tdp === 'number' ? s.tdp : null,
    loadTempRange: typeof s.loadTempRange === 'string' ? s.loadTempRange : null,
    dataQuality: s.dataQuality === 'official' ? 'official' : 'estimated',
    sources: Array.isArray(s.sources) ? (s.sources as Chip['sources']) : [],
  };
}

/** 本地收录条目 → 游戏本视图对象（优先使用后端 AI 补全的 spec，缺失字段置空） */
export function localItemToLaptop(item: LocalCatalogItem): Laptop {
  const s = (item.spec ?? {}) as Record<string, unknown>;
  const cpuArr = Array.isArray(s.cpuOptions) ? s.cpuOptions.filter((x): x is string => typeof x === 'string') : [];
  const gpuArr = Array.isArray(s.gpuOptions) ? s.gpuOptions.filter((x): x is string => typeof x === 'string') : [];
  const release = typeof s.release === 'string' && s.release ? s.release : item.createdAt.slice(0, 10);
  const brand: LaptopBrand =
    typeof s.brand === 'string' && LAPTOP_BRAND_KEYS.includes(s.brand as LaptopBrand)
      ? (s.brand as LaptopBrand)
      : toLaptopBrand(item);
  return {
    id: item.id,
    brand,
    series: typeof s.series === 'string' ? s.series : '',
    displayName: typeof s.displayName === 'string' && s.displayName ? s.displayName : item.name,
    model: typeof s.model === 'string' && s.model ? s.model : item.name,
    release,
    cpuOptions: cpuArr,
    gpuOptions: gpuArr,
    ram: typeof s.ram === 'string' ? s.ram : '',
    storage: typeof s.storage === 'string' ? s.storage : '',
    display: typeof s.display === 'string' ? s.display : '',
    weightKg: typeof s.weightKg === 'number' ? s.weightKg : null,
    sources: Array.isArray(s.sources) ? (s.sources as Laptop['sources']) : [],
  };
}

/** 本地收录芯片（转成站内 Chip 视图） */
export function loadLocalChips(): Chip[] {
  return loadLocalCatalog().filter((i) => i.category === 'chip').map(localItemToChip);
}

/** 本地收录游戏本（转成站内 Laptop 视图） */
export function loadLocalLaptops(): Laptop[] {
  return loadLocalCatalog().filter((i) => i.category === 'laptop').map(localItemToLaptop);
}

/** 判断条目是否为本地 AI 收录（id 前缀 local-） */
export function isLocalId(id: string): boolean {
  return id.startsWith('local-');
}
