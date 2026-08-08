/**
 * CloudBase 云函数：collect
 * 接收前端"立即收录"请求 → 写入云数据库 catalog 集合 → 异步触发 autoFill 补全
 *
 * 调用：POST https://<domain>.app.tcloudbase.com/collect
 * body: { name: string, category: 'chip' | 'laptop', brand: string }
 */
const cloud = require('@cloudbase/node-sdk');

exports.main = async (event) => {
  const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV });
  const db = app.database();
  const coll = db.collection('catalog');

  const params = parseParams(event);
  const name = String(params.name || '').trim();
  const category = params.category === 'laptop' ? 'laptop' : 'chip';
  const brand = String(params.brand || '').trim();

  if (!name) return { ok: false, error: 'name required' };

  // 按名称去重（忽略大小写）
  const dup = await coll.where({ name: db.RegExp({ regexp: `^${escapeReg(name)}$`, options: 'i' }) }).limit(1).get();
  if (dup.data.length > 0) {
    return { ok: true, dup: true, id: dup.data[0]._id };
  }

  const addRes = await coll.add({
    name,
    category,
    brand,
    status: 'pending',
    spec: null,
    note: '截图识别自动收录',
    createdAt: Date.now(),
  });

  // 异步触发 AI 补全（fire-and-forget，不阻塞响应，collect 秒回；
  // 补全结果由前端主动快轮询拉取，实现最快的"收录→补全→显示"闭环）
  app
    .callFunction({
      name: 'autoFill',
      data: { id: addRes.id, name, category, brand },
    })
    .catch((err) => console.error('trigger autoFill failed', err));

  return { ok: true, id: addRes.id };
};

/** 兼容 HTTP 网关（event.body 为 JSON 字符串）与内部 callFunction（参数平铺） */
function parseParams(event) {
  if (!event) return {};
  if (typeof event === 'string') {
    try { return JSON.parse(event); } catch { return {}; }
  }
  // HTTP 网关包装：{ body, httpMethod, headers, ... }
  if (typeof event.body === 'string') {
    try { return { ...JSON.parse(event.body) }; } catch { return {}; }
  }
  if (event.body && typeof event.body === 'object') return event.body;
  return event;
}

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
