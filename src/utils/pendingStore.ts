/** 图片识别 → 待收录清单（localStorage 持久化）
 * 未收录的型号经用户确认后存入此清单，供站长核对后补充进数据库。
 */

const KEY = 'chipspec-pending-items';

export interface PendingItem {
  id: string;
  /** 识别出的名称/型号 */
  name: string;
  /** chip / laptop / unknown */
  category: 'chip' | 'laptop' | 'unknown';
  /** 品牌猜测（若有） */
  brand: string;
  /** 用户补充说明 */
  note: string;
  createdAt: string;
}

export function loadPendingItems(): PendingItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as PendingItem[];
    }
  } catch {
    /* ignore */
  }
  return [];
}

function save(items: PendingItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/** 通知各组件待收录清单已变化（同页自定义事件 + 跨页 storage 事件） */
export function notifyPendingChanged() {
  try {
    window.dispatchEvent(new Event('chipspec-pending-updated'));
  } catch {
    /* ignore */
  }
}

export function addPendingItem(item: Omit<PendingItem, 'id' | 'createdAt'>): PendingItem {
  const full: PendingItem = { ...item, id: `pend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() };
  const items = loadPendingItems();
  // 名称去重（忽略大小写）
  if (!items.some((i) => i.name.toLowerCase() === full.name.toLowerCase())) {
    items.unshift(full);
    save(items);
  }
  notifyPendingChanged();
  return full;
}

export function removePendingItem(id: string) {
  save(loadPendingItems().filter((i) => i.id !== id));
  notifyPendingChanged();
}

/** 品牌猜测：从文本识别常见品牌关键词 */
export function guessBrand(text: string): string {
  const t = text.toLowerCase();
  const map: [RegExp, string][] = [
    [/intel|酷睿|i\d-\d{4,5}/, 'intel'],
    [/amd|锐龙|ryzen/, 'amd'],
    [/nvidia|geforce|rtx|gtx/, 'nvidia'],
    [/lenovo|联想|拯救者/, 'lenovo'],
    [/asus|华硕|rog|天选|枪神|魔霸/, 'asus'],
    [/hp|惠普|暗影精灵|光影精灵/, 'hp'],
    [/dell|戴尔|外星人|alienware/, 'dell'],
    [/msi|微星|泰坦|绝影/, 'msi'],
    [/acer|宏碁|掠夺者/, 'acer'],
    [/mechrevo|机械革命|蛟龙|极光|旷世/, 'mechrevo'],
    [/hasee|神舟|战神/, 'hasee'],
    [/razer|雷蛇|灵刃/, 'razer'],
    [/colorful|七彩虹/, 'colorful'],
    [/thunderobot|雷神/, 'thunderobot'],
    [/machenike|机械师/, 'machenike'],
    [/gigabyte|技嘉/, 'gigabyte'],
  ];
  for (const [re, brand] of map) {
    if (re.test(t)) return brand;
  }
  return '';
}
