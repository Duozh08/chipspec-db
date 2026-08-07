/**
 * 本地自动收录库：点击「立即收录」后自动生成符合站内格式的数据条目，
 * 立即在芯片/游戏本列表显示（New 标记 24 小时），规格字段缺失部分为 null（显示"暂无数据"）。
 *
 * 自动信息获取：尝试从维基百科 API 拉取简介（best-effort，失败不阻塞）；
 * AI 深度补全（Die 尺寸/TDP 等）通过导出清单管道在数据更新时合并。
 */

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

/** 导出本地收录（与待补全清单合并供 AI 管道使用） */
export function localCatalogToRequests(): { name: string; category: 'chip' | 'laptop'; brand: string; note: string }[] {
  return loadLocalCatalog().map((i) => ({
    name: i.name,
    category: i.category,
    brand: i.brand,
    note: `自动收录 ${i.status === 'filled' ? '（已补全）' : '（AI 补全中）'}`,
  }));
}
