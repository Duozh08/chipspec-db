/**
 * 游戏本补充芯片方案：用户在详情页手动提交的处理器/显卡型号（本地持久化）
 *
 * 作用：
 * 1. 站内芯片库已有该芯片但游戏本方案缺失 → 直接加入本地补充，详情页显示
 * 2. 站内芯片库也没有 → 触发 AI 补录，详情页同样显示（无 New 标记）
 * 该存储与站内静态数据（src/data/laptops.ts）互补，仅在当前浏览器生效，
 * 后续可由站长核对后合并进正式数据。
 */

const KEY = 'chipspec-laptop-chip-additions';

export interface LaptopChipAdditions {
  [laptopId: string]: {
    /** 补充的处理器型号（原始输入，trim 后） */
    cpus: string[];
    /** 补充的显卡型号（原始输入，trim 后） */
    gpus: string[];
  };
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
}

function load(): LaptopChipAdditions {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as LaptopChipAdditions;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function save(data: LaptopChipAdditions) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** 获取某游戏本的补充方案 */
export function getLaptopChipAdditions(laptopId: string): { cpus: string[]; gpus: string[] } {
  const all = load();
  const item = all[laptopId];
  return {
    cpus: item?.cpus ?? [],
    gpus: item?.gpus ?? [],
  };
}

/** 添加一条补充方案（按名称去重，忽略大小写），返回是否新增 */
export function addLaptopChipAddition(laptopId: string, type: 'cpu' | 'gpu', name: string): boolean {
  const clean = name.trim();
  if (!clean) return false;
  const all = load();
  const item = all[laptopId] ?? { cpus: [], gpus: [] };
  const list = type === 'cpu' ? item.cpus : item.gpus;
  if (list.some((x) => norm(x) === norm(clean))) return false;
  list.push(clean);
  all[laptopId] = item;
  save(all);
  return true;
}

/** 移除一条补充方案 */
export function removeLaptopChipAddition(laptopId: string, type: 'cpu' | 'gpu', name: string) {
  const all = load();
  const item = all[laptopId];
  if (!item) return;
  item[type === 'cpu' ? 'cpus' : 'gpus'] = (type === 'cpu' ? item.cpus : item.gpus).filter(
    (x) => norm(x) !== norm(name)
  );
  all[laptopId] = item;
  save(all);
}

/** 通知详情页补充方案已变化 */
export function notifyChipAdditionsChanged() {
  try {
    window.dispatchEvent(new Event('chipspec-laptop-chip-additions'));
  } catch {
    /* ignore */
  }
}
