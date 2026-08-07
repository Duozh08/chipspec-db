/**
 * CloudBase 后端 API 客户端（可选）
 *
 * 配置方法：在 CloudBase 控制台创建环境后，把环境 ID 填到下方 CLOUDBASE_ENV_ID。
 * 未配置 / 调用失败时，前端自动降级为本地收录（localStorage），网站功能不受影响。
 */

/** CloudBase 环境 ID（duozhu08-tengfei） */
const CLOUDBASE_ENV_ID = 'duozhu08-tengfei-d1eqlp0bae59452';

export const cloudbaseEnabled = CLOUDBASE_ENV_ID.length > 0;

function call(name: string, data: Record<string, unknown>) {
  if (!cloudbaseEnabled) throw new Error('CloudBase 未配置');
  const url = `https://${CLOUDBASE_ENV_ID}.service.tcloudbase.com/${name}`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(async (res) => {
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || `API ${name} failed`);
    }
    return json;
  });
}

/** 提交收录（后端自动 AI 补全）；未配置后端时抛错由调用方降级本地 */
export function apiCollect(name: string, category: 'chip' | 'laptop', brand: string) {
  return call('collect', { name, category, brand });
}
