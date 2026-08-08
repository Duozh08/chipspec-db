/**
 * CloudBase 后端 API 客户端（可选）
 *
 * 配置方法：在 CloudBase 控制台创建环境后，把环境 ID 填到下方 CLOUDBASE_ENV_ID。
 * 未配置 / 调用失败时，前端自动降级为本地收录（localStorage），网站功能不受影响。
 */

/** CloudBase 环境 ID（duozhu08-tengfei） */
const CLOUDBASE_ENV_ID = 'duozhu08-tengfei-d1eqlp0bae59452';

export const cloudbaseEnabled = CLOUDBASE_ENV_ID.length > 0;

function call(name: string, data: Record<string, unknown>, timeoutMs = 30000) {
  if (!cloudbaseEnabled) throw new Error('CloudBase 未配置');
  const url = `https://${CLOUDBASE_ENV_ID}.service.tcloudbase.com/${name}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || `API ${name} failed`);
      }
      return json;
    })
    .finally(() => clearTimeout(timer));
}

/** 提交收录（后端自动 AI 补全）；未配置后端时抛错由调用方降级本地 */
export function apiCollect(name: string, category: 'chip' | 'laptop', brand: string) {
  return call('collect', { name, category, brand }, 15000);
}

/** 查询后端收录/补全结果（供前端轮询显示已补全状态） */
export interface CatalogRecord {
  _id: string;
  name: string;
  category: 'chip' | 'laptop';
  brand: string;
  status: 'pending' | 'filled';
  spec: Record<string, unknown> | null;
  createdAt: number;
  filledAt?: number;
}

export async function apiList(status?: 'pending' | 'filled', limit = 100): Promise<CatalogRecord[]> {
  const json = await call('list', { status, limit });
  return Array.isArray(json.items) ? (json.items as CatalogRecord[]) : [];
}

/** 首页行业快讯条目（来自 news 云函数抓取的 RSS） */
export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate?: string;
}

/**
 * 拉取行业新闻（news 云函数：抓取 IT之家/爱范儿/雷峰网 RSS 并过滤硬件相关）。
 * 网关路由建在 app 域名下（service 域名不映射新路由），失败时尝试备用域名；
 * 全部失败返回空数组，由调用方降级为站内信息轮播。
 */
export async function apiNews(timeoutMs = 10000): Promise<NewsItem[]> {
  if (!cloudbaseEnabled) return [];
  const urls = [
    `https://${CLOUDBASE_ENV_ID}.service.tcloudbase.com/news`,
    `https://${CLOUDBASE_ENV_ID}-1452185409.ap-shanghai.app.tcloudbase.com/news`,
  ];
  for (const url of urls) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok === true && Array.isArray(json.items)) {
        return json.items as NewsItem[];
      }
    } catch {
      /* 尝试下一个域名 */
    }
  }
  return [];
}
